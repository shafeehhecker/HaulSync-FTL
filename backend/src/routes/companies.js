const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ADMINS = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, type } = req.query;
    const skip  = (page - 1) * limit;
    const where = {
      isActive: true,
      ...(search && { name: { contains: search, mode: 'insensitive' } }),
      ...(type   && { type }),
    };
    const [companies, total] = await Promise.all([
      prisma.company.findMany({ where, skip: +skip, take: +limit, orderBy: { name: 'asc' } }),
      prisma.company.count({ where }),
    ]);
    res.json({ data: companies, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

router.get('/:id', authenticate, async (req, res, next) => {
  try {
    const company = await prisma.company.findUnique({
      where: { id: req.params.id },
      include: {
        vehicles: { where: { isActive: true } },
        drivers:  { where: { isActive: true } },
        _count:   { select: { bids: true } },
      },
    });
    if (!company) return res.status(404).json({ message: 'Company not found' });
    res.json(company);
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize(...ADMINS), async (req, res, next) => {
  try {
    const company = await prisma.company.create({ data: req.body });
    res.status(201).json(company);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, authorize(...ADMINS), async (req, res, next) => {
  try {
    const company = await prisma.company.update({ where: { id: req.params.id }, data: req.body });
    res.json(company);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('SUPER_ADMIN', 'ADMIN'), async (req, res, next) => {
  try {
    await prisma.company.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Company deactivated' });
  } catch (err) { next(err); }
});

module.exports = router;
