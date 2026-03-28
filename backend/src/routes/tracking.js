const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'];

// GET /api/ftl/tracking/active  — all non-completed trips
router.get('/active', authenticate, async (req, res, next) => {
  try {
    const where = {
      status: { notIn: ['COMPLETED', 'CANCELLED'] },
    };
    if (req.user.role === 'TRANSPORTER') {
      where.vendorId = req.user.companyId;
    }
    const trips = await prisma.ftlTrip.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      include: {
        vehicle: { select: { registrationNo: true, type: true, gpsProvider: true } },
        driver:  { select: { name: true, phone: true } },
        trackingEvents: { orderBy: { recordedAt: 'desc' }, take: 1 },
        exceptions:     { where: { status: 'OPEN' }, take: 3 },
      },
    });
    res.json(trips);
  } catch (err) { next(err); }
});

// GET /api/ftl/tracking/trips  — all trips with pagination
router.get('/trips', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, search } = req.query;
    const skip  = (page - 1) * limit;
    const where = {
      ...(status && { status }),
      ...(search && {
        OR: [
          { tripNumber: { contains: search, mode: 'insensitive' } },
          { originCity:  { contains: search, mode: 'insensitive' } },
          { destCity:    { contains: search, mode: 'insensitive' } },
        ],
      }),
    };
    if (req.user.role === 'TRANSPORTER') where.vendorId = req.user.companyId;

    const [trips, total] = await Promise.all([
      prisma.ftlTrip.findMany({
        where, skip: +skip, take: +limit, orderBy: { createdAt: 'desc' },
        include: {
          vehicle:    { select: { registrationNo: true, type: true } },
          driver:     { select: { name: true, phone: true } },
          exceptions: { where: { status: 'OPEN' }, select: { severity: true } },
        },
      }),
      prisma.ftlTrip.count({ where }),
    ]);
    res.json({ data: trips, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// GET /api/ftl/tracking/trips/:id
router.get('/trips/:id', authenticate, async (req, res, next) => {
  try {
    const trip = await prisma.ftlTrip.findUnique({
      where: { id: req.params.id },
      include: {
        vehicle:       true,
        driver:        true,
        trackingEvents: { orderBy: { recordedAt: 'asc' } },
        exceptions:    true,
        pod:           true,
        invoice:       true,
        rfq:    { select: { rfqNumber: true } },
        indent: { select: { indentNumber: true } },
      },
    });
    if (!trip) return res.status(404).json({ message: 'Trip not found' });
    res.json(trip);
  } catch (err) { next(err); }
});

// POST /api/ftl/tracking/trips  — create trip manually
router.post('/trips', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    const {
      originCity, originState, destCity, destState, vehicleType,
      vehicleId, driverId, vendorId, agreedRate, lrNumber, ewayBillNo,
      ewayBillExpiry, loadingDate, expectedDelivery, weightTonnes, notes,
    } = req.body;

    const yr  = new Date().getFullYear();
    const seq = String(Math.floor(Math.random() * 90000) + 10000);

    const trip = await prisma.ftlTrip.create({
      data: {
        tripNumber: `TRIP-${yr}-${seq}`,
        originCity, originState, destCity, destState, vehicleType,
        vehicleId: vehicleId || null,
        driverId:  driverId  || null,
        vendorId:  vendorId  || null,
        agreedRate: agreedRate ? +agreedRate : null,
        lrNumber: lrNumber || null,
        ewayBillNo: ewayBillNo || null,
        ewayBillExpiry: ewayBillExpiry ? new Date(ewayBillExpiry) : null,
        loadingDate: new Date(loadingDate),
        expectedDelivery: expectedDelivery ? new Date(expectedDelivery) : null,
        weightTonnes: weightTonnes ? +weightTonnes : null,
        notes,
        createdById: req.user.id,
      },
      include: { vehicle: true, driver: true },
    });
    res.status(201).json(trip);
  } catch (err) { next(err); }
});

// PUT /api/ftl/tracking/trips/:id/status  — update trip status
router.put('/trips/:id/status', authenticate, authorize(...WRITE_ROLES), async (req, res, next) => {
  try {
    const { status, location, latitude, longitude, speedKmph, notes } = req.body;

    const trip = await prisma.ftlTrip.update({
      where: { id: req.params.id },
      data: {
        status,
        ...(status === 'DELIVERED' && { actualDelivery: new Date() }),
      },
    });

    // Create tracking event
    if (location) {
      await prisma.tripTrackingEvent.create({
        data: {
          tripId: req.params.id,
          eventType: status,
          location,
          latitude:  latitude  ? +latitude  : null,
          longitude: longitude ? +longitude : null,
          speedKmph: speedKmph ? +speedKmph : null,
          notes,
        },
      });
    }

    // Emit socket update
    const io = req.app.get('io');
    if (io) io.to(`trip_${req.params.id}`).emit('trip_update', { tripId: req.params.id, status, location });

    res.json(trip);
  } catch (err) { next(err); }
});

// POST /api/ftl/tracking/trips/:id/events  — push a raw GPS event
router.post('/trips/:id/events', authenticate, async (req, res, next) => {
  try {
    const { eventType, location, city, state, latitude, longitude, speedKmph, gpsProvider, notes } = req.body;
    const event = await prisma.tripTrackingEvent.create({
      data: {
        tripId: req.params.id,
        eventType, location,
        city: city || null, state: state || null,
        latitude:  latitude  ? +latitude  : null,
        longitude: longitude ? +longitude : null,
        speedKmph: speedKmph ? +speedKmph : null,
        gpsProvider: gpsProvider || null,
        notes,
      },
    });
    const io = req.app.get('io');
    if (io) io.to(`trip_${req.params.id}`).emit('gps_event', event);
    res.status(201).json(event);
  } catch (err) { next(err); }
});

module.exports = router;
