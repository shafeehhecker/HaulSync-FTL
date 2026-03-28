const express = require('express');
const bcrypt  = require('bcryptjs');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const ADMINS = ['SUPER_ADMIN', 'ADMIN'];

router.get('/', authenticate, authorize(...ADMINS), async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search } = req.query;
    const skip  = (page - 1) * limit;
    const where = {
      isActive: true,
      ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { email: { contains: search, mode: 'insensitive' } }] }),
    };
    const [users, total] = await Promise.all([
      prisma.user.findMany({ where, skip: +skip, take: +limit, orderBy: { name: 'asc' }, select: { id: true, name: true, email: true, role: true, phone: true, isActive: true, company: { select: { id: true, name: true } }, createdAt: true } }),
      prisma.user.count({ where }),
    ]);
    res.json({ data: users, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

router.post('/', authenticate, authorize(...ADMINS), async (req, res, next) => {
  try {
    const { password, ...rest } = req.body;
    const hashed = await bcrypt.hash(password, 10);
    const user = await prisma.user.create({ data: { ...rest, password: hashed } });
    const { password: _, ...safe } = user;
    res.status(201).json(safe);
  } catch (err) { next(err); }
});

router.put('/:id', authenticate, authorize(...ADMINS), async (req, res, next) => {
  try {
    const { password, ...rest } = req.body;
    const data = { ...rest };
    if (password) data.password = await bcrypt.hash(password, 10);
    const user = await prisma.user.update({ where: { id: req.params.id }, data, select: { id: true, name: true, email: true, role: true, phone: true, isActive: true } });
    res.json(user);
  } catch (err) { next(err); }
});

router.delete('/:id', authenticate, authorize('SUPER_ADMIN'), async (req, res, next) => {
  try {
    await prisma.user.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'User deactivated' });
  } catch (err) { next(err); }
});

module.exports = router;
