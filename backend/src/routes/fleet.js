const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER'];

// ── VEHICLES ──────────────────────────────────────────────────────────────────

router.get('/vehicles', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, type, search, companyId } = req.query;
    const skip  = (page - 1) * limit;
    const where = {
      isActive: true,
      ...(type      && { type }),
      ...(companyId && { companyId }),
      ...(search    && { registrationNo: { contains: search, mode: 'insensitive' } }),
    };
    if (req.user.role === 'TRANSPORTER') where.companyId = req.user.companyId;

    const [vehicles, total] = await Promise.all([
      prisma.vehicle.findMany({
        where, skip: +skip, take: +limit,
        orderBy: { registrationNo: 'asc' },
        include: { company: { select: { name: true } } },
      }),
      prisma.vehicle.count({ where }),
    ]);
    res.json({ data: vehicles, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

router.get('/vehicles/:id', authenticate, async (req, res, next) => {
  try {
    const vehicle = await prisma.vehicle.findUnique({
      where: { id: req.params.id },
      include: {
        company: { select: { name: true } },
        trips: { orderBy: { createdAt: 'desc' }, take: 5, select: { tripNumber: true, status: true, createdAt: true } },
      },
    });
    if (!vehicle) return res.status(404).json({ message: 'Vehicle not found' });
    res.json(vehicle);
  } catch (err) { next(err); }
});

router.post('/vehicles', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    const { insuranceExpiry, pucExpiry, fitnessExpiry, ...rest } = req.body;
    const vehicle = await prisma.vehicle.create({
      data: {
        ...rest,
        insuranceExpiry: insuranceExpiry ? new Date(insuranceExpiry) : null,
        pucExpiry:       pucExpiry       ? new Date(pucExpiry)       : null,
        fitnessExpiry:   fitnessExpiry   ? new Date(fitnessExpiry)   : null,
      },
    });
    res.status(201).json(vehicle);
  } catch (err) { next(err); }
});

router.put('/vehicles/:id', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    const { insuranceExpiry, pucExpiry, fitnessExpiry, ...rest } = req.body;
    const data = { ...rest };
    if (insuranceExpiry) data.insuranceExpiry = new Date(insuranceExpiry);
    if (pucExpiry)       data.pucExpiry       = new Date(pucExpiry);
    if (fitnessExpiry)   data.fitnessExpiry   = new Date(fitnessExpiry);
    const vehicle = await prisma.vehicle.update({ where: { id: req.params.id }, data });
    res.json(vehicle);
  } catch (err) { next(err); }
});

router.delete('/vehicles/:id', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    await prisma.vehicle.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Vehicle deactivated' });
  } catch (err) { next(err); }
});

// ── DRIVERS ───────────────────────────────────────────────────────────────────

router.get('/drivers', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, search, companyId } = req.query;
    const skip  = (page - 1) * limit;
    const where = {
      isActive: true,
      ...(companyId && { companyId }),
      ...(search && {
        OR: [
          { name:  { contains: search, mode: 'insensitive' } },
          { phone: { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    if (req.user.role === 'TRANSPORTER') where.companyId = req.user.companyId;

    const [drivers, total] = await Promise.all([
      prisma.driver.findMany({
        where, skip: +skip, take: +limit,
        orderBy: { name: 'asc' },
        include: { company: { select: { name: true } } },
      }),
      prisma.driver.count({ where }),
    ]);
    res.json({ data: drivers, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

router.get('/drivers/:id', authenticate, async (req, res, next) => {
  try {
    const driver = await prisma.driver.findUnique({
      where: { id: req.params.id },
      include: {
        company: { select: { name: true } },
        trips: { orderBy: { createdAt: 'desc' }, take: 5, select: { tripNumber: true, status: true, createdAt: true } },
      },
    });
    if (!driver) return res.status(404).json({ message: 'Driver not found' });
    res.json(driver);
  } catch (err) { next(err); }
});

router.post('/drivers', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    const { licenseExpiry, ...rest } = req.body;
    const driver = await prisma.driver.create({
      data: { ...rest, licenseExpiry: licenseExpiry ? new Date(licenseExpiry) : null },
    });
    res.status(201).json(driver);
  } catch (err) { next(err); }
});

router.put('/drivers/:id', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    const { licenseExpiry, ...rest } = req.body;
    const data = { ...rest };
    if (licenseExpiry) data.licenseExpiry = new Date(licenseExpiry);
    const driver = await prisma.driver.update({ where: { id: req.params.id }, data });
    res.json(driver);
  } catch (err) { next(err); }
});

router.delete('/drivers/:id', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    await prisma.driver.update({ where: { id: req.params.id }, data: { isActive: false } });
    res.json({ message: 'Driver deactivated' });
  } catch (err) { next(err); }
});

module.exports = router;
