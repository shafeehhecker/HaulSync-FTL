const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FINANCE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'FINANCE'];

function nextSettlementNumber() {
  return `SETL-${new Date().getFullYear()}-${String(Math.floor(Math.random() * 9000) + 1000)}`;
}

// GET /api/ftl/settlement
router.get('/', authenticate, authorize(...FINANCE_ROLES, 'MANAGER'), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, vendorId } = req.query;
    const skip  = (page - 1) * limit;
    const where = {
      ...(status   && { status }),
      ...(vendorId && { vendorId }),
    };
    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where, skip: +skip, take: +limit,
        orderBy: { createdAt: 'desc' },
        include: {
          vendor:   { select: { name: true, city: true } },
          invoices: { select: { id: true, invoiceNumber: true, finalAmount: true, status: true } },
        },
      }),
      prisma.settlement.count({ where }),
    ]);
    res.json({ data: settlements, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// GET /api/ftl/settlement/:id
router.get('/:id', authenticate, authorize(...FINANCE_ROLES, 'MANAGER'), async (req, res, next) => {
  try {
    const settlement = await prisma.settlement.findUnique({
      where: { id: req.params.id },
      include: {
        vendor:   true,
        invoices: { include: { trip: { select: { tripNumber: true, originCity: true, destCity: true } } } },
      },
    });
    if (!settlement) return res.status(404).json({ message: 'Settlement not found' });
    res.json(settlement);
  } catch (err) { next(err); }
});

// POST /api/ftl/settlement  — bundle approved invoices into a settlement
router.post('/', authenticate, authorize(...FINANCE_ROLES), async (req, res, next) => {
  try {
    const { vendorId, invoiceIds, paymentMethod, notes } = req.body;
    if (!vendorId || !invoiceIds?.length)
      return res.status(400).json({ message: 'vendorId and invoiceIds are required' });

    // Validate all invoices are APPROVED and belong to this vendor
    const invoices = await prisma.ftlInvoice.findMany({
      where: { id: { in: invoiceIds }, vendorId, status: 'APPROVED' },
    });

    if (invoices.length !== invoiceIds.length)
      return res.status(400).json({ message: 'Some invoices are not in APPROVED state or do not belong to this vendor' });

    const totalAmount = invoices.reduce((s, inv) => s + inv.finalAmount, 0);

    const settlement = await prisma.settlement.create({
      data: {
        settlementNumber: nextSettlementNumber(),
        vendorId,
        totalAmount: +totalAmount.toFixed(2),
        paymentMethod: paymentMethod || 'NEFT',
        notes,
        invoices: { connect: invoiceIds.map((id) => ({ id })) },
      },
      include: { vendor: { select: { name: true } }, invoices: true },
    });

    res.status(201).json(settlement);
  } catch (err) { next(err); }
});

// PUT /api/ftl/settlement/:id/initiate  — initiate payment (PENDING → PROCESSING)
router.put('/:id/initiate', authenticate, authorize(...FINANCE_ROLES), async (req, res, next) => {
  try {
    const settlement = await prisma.settlement.update({
      where: { id: req.params.id },
      data: { status: 'PROCESSING', approvedAt: new Date(), updatedAt: new Date() },
    });
    res.json(settlement);
  } catch (err) { next(err); }
});

// PUT /api/ftl/settlement/:id/paid  — mark as paid, record bank ref
router.put('/:id/paid', authenticate, authorize(...FINANCE_ROLES), async (req, res, next) => {
  try {
    const { bankRef } = req.body;
    const settlement = await prisma.settlement.update({
      where: { id: req.params.id },
      data: { status: 'PAID', bankRef, paidAt: new Date(), updatedAt: new Date() },
    });

    // Mark all linked invoices as PAID
    await prisma.ftlInvoice.updateMany({
      where: { settlementId: req.params.id },
      data: { status: 'PAID', updatedAt: new Date() },
    });

    res.json(settlement);
  } catch (err) { next(err); }
});

// PUT /api/ftl/settlement/:id/fail
router.put('/:id/fail', authenticate, authorize(...FINANCE_ROLES), async (req, res, next) => {
  try {
    const settlement = await prisma.settlement.update({
      where: { id: req.params.id },
      data: { status: 'FAILED', updatedAt: new Date() },
    });
    res.json(settlement);
  } catch (err) { next(err); }
});

// GET /api/ftl/settlement/summary  — payment summary
router.get('/summary/overview', authenticate, authorize(...FINANCE_ROLES, 'MANAGER'), async (req, res, next) => {
  try {
    const [pending, processing, paid] = await Promise.all([
      prisma.settlement.aggregate({ where: { status: 'PENDING_PAYMENT' }, _sum: { totalAmount: true }, _count: true }),
      prisma.settlement.aggregate({ where: { status: 'PROCESSING' },      _sum: { totalAmount: true }, _count: true }),
      prisma.settlement.aggregate({ where: { status: 'PAID' },            _sum: { totalAmount: true }, _count: true }),
    ]);
    res.json({
      pending:    { amount: pending._sum.totalAmount    || 0, count: pending._count    },
      processing: { amount: processing._sum.totalAmount || 0, count: processing._count },
      paid:       { amount: paid._sum.totalAmount       || 0, count: paid._count       },
    });
  } catch (err) { next(err); }
});

module.exports = router;
