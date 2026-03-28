const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'];

// GET /api/ftl/exceptions
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 50, status, severity, type } = req.query;
    const skip  = (page - 1) * limit;
    const where = {
      ...(status   && { status }),
      ...(severity && { severity }),
      ...(type     && { type }),
    };
    if (req.user.role === 'TRANSPORTER') {
      where.trip = { vendorId: req.user.companyId };
    }
    const [exceptions, total] = await Promise.all([
      prisma.tripException.findMany({
        where, skip: +skip, take: +limit,
        orderBy: { detectedAt: 'desc' },
        include: {
          trip: {
            select: {
              tripNumber: true, originCity: true, destCity: true,
              driver:  { select: { name: true } },
              vehicle: { select: { registrationNo: true } },
            },
          },
        },
      }),
      prisma.tripException.count({ where }),
    ]);
    res.json({ data: exceptions, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// GET /api/ftl/exceptions/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const ex = await prisma.tripException.findUnique({
      where: { id: req.params.id },
      include: { trip: { include: { driver: true, vehicle: true } } },
    });
    if (!ex) return res.status(404).json({ message: 'Exception not found' });
    res.json(ex);
  } catch (err) { next(err); }
});

// POST /api/ftl/exceptions  — raise a manual exception
router.post('/', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    const { tripId, type, severity, message, location } = req.body;
    const ex = await prisma.tripException.create({
      data: {
        tripId, type, severity: severity || 'MEDIUM', message, location,
        status: 'OPEN',
      },
      include: { trip: { select: { tripNumber: true } } },
    });

    // Mark trip as DELAYED for DELAY / SLA_BREACH exceptions
    if (['DELAY', 'SLA_BREACH'].includes(type)) {
      await prisma.ftlTrip.update({ where: { id: tripId }, data: { status: 'DELAYED' } });
    }

    const io = req.app.get('io');
    if (io) io.to('exceptions').emit('new_exception', ex);

    res.status(201).json(ex);
  } catch (err) { next(err); }
});

// PUT /api/ftl/exceptions/:id/acknowledge
router.put('/:id/acknowledge', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    const ex = await prisma.tripException.update({
      where: { id: req.params.id },
      data: { status: 'ACKNOWLEDGED', updatedAt: new Date() },
    });
    const io = req.app.get('io');
    if (io) io.to('exceptions').emit('exception_updated', ex);
    res.json(ex);
  } catch (err) { next(err); }
});

// PUT /api/ftl/exceptions/:id/resolve
router.put('/:id/resolve', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    const { resolvedNote } = req.body;
    const ex = await prisma.tripException.update({
      where: { id: req.params.id },
      data: { status: 'RESOLVED', resolvedAt: new Date(), resolvedNote, updatedAt: new Date() },
    });
    const io = req.app.get('io');
    if (io) io.to('exceptions').emit('exception_updated', ex);
    res.json(ex);
  } catch (err) { next(err); }
});

// PUT /api/ftl/exceptions/:id/escalate
router.put('/:id/escalate', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const ex = await prisma.tripException.update({
      where: { id: req.params.id },
      data: { status: 'ESCALATED', updatedAt: new Date() },
    });
    res.json(ex);
  } catch (err) { next(err); }
});

// GET /api/ftl/exceptions/trip/:tripId  — all exceptions for a trip
router.get('/trip/:tripId', authenticate, async (req, res, next) => {
  try {
    const exceptions = await prisma.tripException.findMany({
      where: { tripId: req.params.tripId },
      orderBy: { detectedAt: 'desc' },
    });
    res.json(exceptions);
  } catch (err) { next(err); }
});

module.exports = router;
