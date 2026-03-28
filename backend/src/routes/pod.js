const express = require('express');
const multer  = require('multer');
const path    = require('path');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const WRITE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'OPERATOR'];

// ── Multer storage ────────────────────────────────────────────────────────────
const storage = multer.diskStorage({
  destination: (req, file, cb) => cb(null, path.join(__dirname, '../../../uploads/pods')),
  filename:    (req, file, cb) => {
    const ext  = path.extname(file.originalname);
    const name = `pod-${req.params.tripId}-${Date.now()}${ext}`;
    cb(null, name);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // 5 MB
  fileFilter: (req, file, cb) => {
    const allowed = ['.jpg', '.jpeg', '.png', '.webp', '.pdf'];
    if (allowed.includes(path.extname(file.originalname).toLowerCase())) cb(null, true);
    else cb(new Error('Only image/pdf files are allowed'));
  },
});

// GET /api/ftl/pod  — all PODs with pagination
router.get('/', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status } = req.query;
    const skip  = (page - 1) * limit;
    const where = { ...(status && { status }) };

    if (req.user.role === 'TRANSPORTER') {
      where.trip = { vendorId: req.user.companyId };
    }

    const [pods, total] = await Promise.all([
      prisma.tripPOD.findMany({
        where, skip: +skip, take: +limit,
        orderBy: { createdAt: 'desc' },
        include: {
          trip: {
            select: {
              tripNumber: true, originCity: true, destCity: true,
              lrNumber: true, ewayBillNo: true,
              driver:  { select: { name: true } },
              vehicle: { select: { registrationNo: true } },
            },
          },
        },
      }),
      prisma.tripPOD.count({ where }),
    ]);
    res.json({ data: pods, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// GET /api/ftl/pod/:tripId
router.get('/:tripId', authenticate, async (req, res, next) => {
  try {
    const pod = await prisma.tripPOD.findUnique({
      where: { tripId: req.params.tripId },
      include: { trip: { include: { driver: true, vehicle: true } } },
    });
    if (!pod) return res.status(404).json({ message: 'POD not found' });
    res.json(pod);
  } catch (err) { next(err); }
});

// POST /api/ftl/pod/:tripId/capture  — capture POD (with optional image uploads)
router.post('/:tripId/capture', authenticate, authorize(...WRITE_ROLES),
  upload.array('images', 5),
  async (req, res, next) => {
    try {
      const trip = await prisma.ftlTrip.findUnique({ where: { id: req.params.tripId } });
      if (!trip) return res.status(404).json({ message: 'Trip not found' });

      const { receiverName, receiverPhone, lrNumber, ewayBillNo, notes } = req.body;

      // Build image URL array
      const imageUrls = (req.files || []).map(
        (f) => `/uploads/pods/${f.filename}`
      );

      // Fetch existing imageUrls if record exists, then concat new ones
      const existing = await prisma.tripPOD.findUnique({
        where: { tripId: req.params.tripId },
        select: { imageUrls: true },
      });
      const mergedUrls = [...(existing?.imageUrls || []), ...imageUrls];

      const pod = await prisma.tripPOD.upsert({
        where: { tripId: req.params.tripId },
        update: {
          receiverName, receiverPhone,
          lrNumber:   lrNumber   || trip.lrNumber,
          ewayBillNo: ewayBillNo || trip.ewayBillNo,
          imageUrls:  mergedUrls,
          capturedAt: new Date(),
          status:     'CAPTURED',
          notes,
          updatedAt:  new Date(),
        },
        create: {
          tripId: req.params.tripId,
          receiverName, receiverPhone,
          lrNumber:   lrNumber   || trip.lrNumber   || null,
          ewayBillNo: ewayBillNo || trip.ewayBillNo || null,
          imageUrls,
          capturedAt: new Date(),
          status:     'CAPTURED',
          notes,
        },
      });

      // Advance trip status
      await prisma.ftlTrip.update({
        where: { id: req.params.tripId },
        data: { status: 'POD_CAPTURED', actualDelivery: new Date() },
      });

      // Auto-generate invoice from agreedRate
      if (trip.agreedRate && trip.vendorId) {
        const yr  = new Date().getFullYear();
        const seq = String(Math.floor(Math.random() * 90000) + 10000);
        const existing = await prisma.ftlInvoice.findUnique({ where: { tripId: req.params.tripId } });
        if (!existing) {
          await prisma.ftlInvoice.create({
            data: {
              invoiceNumber:  `INV-${yr}-${seq}`,
              tripId:         req.params.tripId,
              vendorId:       trip.vendorId,
              agreedRate:     trip.agreedRate,
              invoicedAmount: trip.agreedRate,
              deductions:     0,
              gstAmount:      +(trip.agreedRate * 0.18).toFixed(2),
              finalAmount:    trip.agreedRate,
              status:         'SUBMITTED',
            },
          });
        }
      }

      res.status(201).json(pod);
    } catch (err) { next(err); }
  }
);

// PUT /api/ftl/pod/:tripId/verify
router.put('/:tripId/verify', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const pod = await prisma.tripPOD.update({
      where: { tripId: req.params.tripId },
      data: { status: 'VERIFIED', verifiedAt: new Date(), updatedAt: new Date() },
    });
    await prisma.ftlTrip.update({ where: { id: req.params.tripId }, data: { status: 'COMPLETED' } });
    res.json(pod);
  } catch (err) { next(err); }
});

// PUT /api/ftl/pod/:tripId/dispute
router.put('/:tripId/dispute', authenticate, authorize('SUPER_ADMIN', 'ADMIN', 'MANAGER'), async (req, res, next) => {
  try {
    const { notes } = req.body;
    const pod = await prisma.tripPOD.update({
      where: { tripId: req.params.tripId },
      data: { status: 'DISPUTED', notes, updatedAt: new Date() },
    });
    res.json(pod);
  } catch (err) { next(err); }
});

module.exports = router;
