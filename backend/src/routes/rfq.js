const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

function nextRFQNumber() {
  return `RFQ-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

// ── L1/L2 RANKING ENGINE ──────────────────────────────────────────────────────
async function rankAndAward(rfqId) {
  const rfq = await prisma.ftlRFQ.findUnique({
    where: { id: rfqId },
    include: { bids: { include: { vendor: { select: { slaScore: true } } } } },
  });
  if (!rfq || rfq.status !== 'OPEN') return;

  // Filter eligible bids (SLA score >= minSLAScore), sort by rate ASC
  const eligible = rfq.bids
    .filter((b) => b.status === 'PENDING' && b.slaScore >= rfq.minSLAScore)
    .sort((a, b) => a.rateAmount - b.rateAmount);

  if (!eligible.length) return;

  // Assign ranks
  await Promise.all(
    eligible.map((bid, i) =>
      prisma.vendorBid.update({
        where: { id: bid.id },
        data: {
          rank: i + 1,
          status: i === 0 ? 'AWARDED' : i === 1 ? 'STANDBY' : 'REJECTED',
        },
      })
    )
  );

  const l1 = eligible[0];

  // Update RFQ
  await prisma.ftlRFQ.update({
    where: { id: rfqId },
    data: { status: 'AWARDED', awardedBidId: l1.id },
  });

  // Update linked indent if any
  if (rfq.indentId) {
    await prisma.indent.update({ where: { id: rfq.indentId }, data: { status: 'AWARDED' } });
  }

  // Auto-create trip for L1_AUTO
  if (rfq.awardStrategy === 'L1_AUTO') {
    const yr      = new Date().getFullYear();
    const tripSeq = String(Math.floor(Math.random() * 90000) + 10000);
    const lrSeq   = String(Math.floor(Math.random() * 90000) + 10000);
    await prisma.ftlTrip.create({
      data: {
        tripNumber:  `TRIP-${yr}-${tripSeq}`,
        rfqId:       rfq.id,
        indentId:    rfq.indentId || null,
        vendorId:    l1.vendorId,
        originCity:  rfq.originCity,
        originState: rfq.originState,
        destCity:    rfq.destCity,
        destState:   rfq.destState,
        vehicleType: rfq.vehicleType,
        agreedRate:  l1.rateAmount,
        lrNumber:    `LR-${yr}-${lrSeq}`,
        loadingDate: rfq.loadingDate,
        status:      'CREATED',
        createdById: rfq.createdById,
      },
    });
  }

  return l1;
}

// GET /api/ftl/rfqs
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip  = (page - 1) * limit;
    const where = { ...(status && { status }) };

    // Transporters only see RFQs they have bids on
    if (req.user.role === 'TRANSPORTER') {
      where.bids = { some: { vendorId: req.user.companyId } };
    }

    const [rfqs, total] = await Promise.all([
      prisma.ftlRFQ.findMany({
        where, skip: +skip, take: +limit,
        orderBy: { createdAt: 'desc' },
        include: {
          bids: {
            orderBy: { rank: 'asc' },
            include: { vendor: { select: { name: true, slaScore: true } } },
          },
          awardedBid: { include: { vendor: { select: { name: true } } } },
          createdBy:  { select: { name: true } },
        },
      }),
      prisma.ftlRFQ.count({ where }),
    ]);

    // Auto-close expired OPEN RFQs on read
    const now = new Date();
    for (const rfq of rfqs) {
      if (rfq.status === 'OPEN' && rfq.closesAt <= now) {
        if (rfq.awardStrategy === 'L1_AUTO') {
          await rankAndAward(rfq.id).catch(() => {});
        } else {
          await prisma.ftlRFQ.update({ where: { id: rfq.id }, data: { status: 'CLOSED' } });
        }
      }
    }

    res.json({ data: rfqs, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// GET /api/ftl/rfqs/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const rfq = await prisma.ftlRFQ.findUnique({
      where: { id: req.params.id },
      include: {
        bids: { orderBy: { rank: 'asc' }, include: { vendor: true, submittedBy: { select: { name: true } } } },
        awardedBid: true,
        trip: { select: { id: true, tripNumber: true, status: true } },
        indent: { select: { id: true, indentNumber: true } },
      },
    });
    if (!rfq) return res.status(404).json({ message: 'RFQ not found' });
    res.json(rfq);
  } catch (err) { next(err); }
});

// POST /api/ftl/rfqs  — publish a new RFQ
router.post('/', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    const { indentId, originCity, originState, destCity, destState, vehicleType, quantity, loadingDate, awardStrategy, rfqWindowMinutes, minSLAScore } = req.body;

    const windowMins = +rfqWindowMinutes || 45;
    const closesAt   = new Date(Date.now() + windowMins * 60 * 1000);

    const rfq = await prisma.ftlRFQ.create({
      data: {
        rfqNumber: nextRFQNumber(),
        indentId:  indentId || null,
        originCity, originState, destCity, destState,
        vehicleType, quantity: +quantity || 1,
        loadingDate: new Date(loadingDate),
        awardStrategy: awardStrategy || 'L1_AUTO',
        rfqWindowMinutes: windowMins,
        minSLAScore: +minSLAScore || 70,
        closesAt,
        createdById: req.user.id,
      },
      include: { bids: true },
    });

    // Update indent status if linked
    if (indentId) {
      await prisma.indent.update({ where: { id: indentId }, data: { status: 'RFQ_PUBLISHED' } });
    }

    res.status(201).json(rfq);
  } catch (err) { next(err); }
});

// POST /api/ftl/rfqs/:id/bids  — submit a vendor bid
router.post('/:id/bids', authenticate, async (req, res, next) => {
  try {
    const rfq = await prisma.ftlRFQ.findUnique({ where: { id: req.params.id } });
    if (!rfq || rfq.status !== 'OPEN')
      return res.status(400).json({ message: 'RFQ is not open for bids' });

    const vendorId = req.user.companyId;
    if (!vendorId) return res.status(400).json({ message: 'No company linked to user' });

    const { rateAmount, notes } = req.body;
    const vendor   = await prisma.company.findUnique({ where: { id: vendorId }, select: { slaScore: true } });

    const bid = await prisma.vendorBid.create({
      data: {
        rfqId: req.params.id,
        vendorId,
        submittedById: req.user.id,
        rateAmount: +rateAmount,
        slaScore: vendor?.slaScore || 70,
        notes,
      },
      include: { vendor: { select: { name: true, slaScore: true } } },
    });

    // Update RFQ status to QUOTED
    await prisma.ftlRFQ.update({ where: { id: req.params.id }, data: { status: 'OPEN' } });

    // Emit to socket
    const io = req.app.get('io');
    if (io) io.to(`rfq_${req.params.id}`).emit('new_bid', bid);

    res.status(201).json(bid);
  } catch (err) { next(err); }
});

// POST /api/ftl/rfqs/:id/award  — manual award trigger
router.post('/:id/award', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    const l1 = await rankAndAward(req.params.id);
    if (!l1) return res.status(400).json({ message: 'No eligible bids to rank' });
    res.json({ message: 'RFQ awarded via L1/L2 engine', l1BidId: l1.id });
  } catch (err) { next(err); }
});

// PUT /api/ftl/rfqs/:id/cancel
router.put('/:id/cancel', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    const rfq = await prisma.ftlRFQ.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
    res.json(rfq);
  } catch (err) { next(err); }
});

module.exports = router;
