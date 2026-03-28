const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'];

function nextIndentNumber() {
  const yr  = new Date().getFullYear();
  const seq = String(Math.floor(Math.random() * 9000) + 1000);
  return `IND-${yr}-${seq}`;
}

// GET /api/ftl/indents
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, contractType, search } = req.query;
    const skip  = (page - 1) * limit;
    const where = {
      ...(status       && { status }),
      ...(contractType && { contractType }),
      ...(search       && {
        OR: [
          { indentNumber: { contains: search, mode: 'insensitive' } },
          { originCity:   { contains: search, mode: 'insensitive' } },
          { destCity:     { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    const [indents, total] = await Promise.all([
      prisma.indent.findMany({
        where, skip: +skip, take: +limit,
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { name: true } },
          rfq:  { select: { id: true, rfqNumber: true, status: true } },
          trip: { select: { id: true, tripNumber: true, status: true } },
        },
      }),
      prisma.indent.count({ where }),
    ]);
    res.json({ data: indents, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// GET /api/ftl/indents/:id
router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const indent = await prisma.indent.findUnique({
      where: { id: req.params.id },
      include: {
        createdBy: { select: { name: true } },
        rfq:  true,
        trip: true,
      },
    });
    if (!indent) return res.status(404).json({ message: 'Indent not found' });
    res.json(indent);
  } catch (err) { next(err); }
});

// POST /api/ftl/indents
router.post('/', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    const { originCity, originState, destCity, destState, vehicleType, quantity, weightTonnes, contractType, loadingDate, notes } = req.body;

    const indent = await prisma.indent.create({
      data: {
        indentNumber: nextIndentNumber(),
        originCity, originState, destCity, destState,
        vehicleType, quantity: +quantity || 1,
        weightTonnes: weightTonnes ? +weightTonnes : null,
        contractType: contractType || 'CONTRACT',
        loadingDate: new Date(loadingDate),
        notes,
        createdById: req.user.id,
      },
    });
    res.status(201).json(indent);
  } catch (err) { next(err); }
});

// PUT /api/ftl/indents/:id
router.put('/:id', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    const { loadingDate, ...rest } = req.body;
    const data = { ...rest };
    if (loadingDate) data.loadingDate = new Date(loadingDate);
    const indent = await prisma.indent.update({ where: { id: req.params.id }, data });
    res.json(indent);
  } catch (err) { next(err); }
});

// DELETE /api/ftl/indents/:id  (soft cancel)
router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const indent = await prisma.indent.update({ where: { id: req.params.id }, data: { status: 'CANCELLED' } });
    res.json(indent);
  } catch (err) { next(err); }
});

module.exports = router;
