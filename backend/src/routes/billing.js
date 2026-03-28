const express = require('express');
const { authenticate, authorize } = require('../middleware/auth');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

const FINANCE_ROLES = ['SUPER_ADMIN', 'ADMIN', 'MANAGER', 'FINANCE'];

// GET /api/ftl/billing/invoices
router.get('/invoices', authenticate, async (req, res, next) => {
  try {
    const { page = 1, limit = 20, status, vendorId } = req.query;
    const skip  = (page - 1) * limit;
    const where = {
      ...(status   && { status }),
      ...(vendorId && { vendorId }),
    };
    if (req.user.role === 'TRANSPORTER') {
      where.vendorId = req.user.companyId;
    }

    const [invoices, total] = await Promise.all([
      prisma.ftlInvoice.findMany({
        where, skip: +skip, take: +limit,
        orderBy: { submittedAt: 'desc' },
        include: {
          trip:   { select: { tripNumber: true, originCity: true, destCity: true } },
          vendor: { select: { name: true } },
        },
      }),
      prisma.ftlInvoice.count({ where }),
    ]);

    // Attach reconciliation flag: reconciled = invoicedAmount matches agreedRate
    const enriched = invoices.map((inv) => ({
      ...inv,
      reconciled: inv.invoicedAmount <= inv.agreedRate,
    }));

    res.json({ data: enriched, total, page: +page, limit: +limit });
  } catch (err) { next(err); }
});

// GET /api/ftl/billing/invoices/:id
router.get('/invoices/:id', authenticate, async (req, res, next) => {
  try {
    const invoice = await prisma.ftlInvoice.findUnique({
      where: { id: req.params.id },
      include: {
        trip:    { include: { driver: true, vehicle: true } },
        vendor:  true,
        settlement: { select: { settlementNumber: true, status: true } },
      },
    });
    if (!invoice) return res.status(404).json({ message: 'Invoice not found' });
    res.json({ ...invoice, reconciled: invoice.invoicedAmount <= invoice.agreedRate });
  } catch (err) { next(err); }
});

// PUT /api/ftl/billing/invoices/:id — update invoiced amount / deductions
router.put('/invoices/:id', authenticate, authorize(...FINANCE_ROLES), async (req, res, next) => {
  try {
    const { invoicedAmount, deductions, deductionNote, gstAmount, notes } = req.body;
    const current = await prisma.ftlInvoice.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Invoice not found' });

    const newInvoiced   = invoicedAmount !== undefined ? +invoicedAmount : current.invoicedAmount;
    const newDeductions = deductions     !== undefined ? +deductions     : current.deductions;
    const newGST        = gstAmount      !== undefined ? +gstAmount      : current.gstAmount;
    const finalAmount   = newInvoiced - newDeductions;

    const invoice = await prisma.ftlInvoice.update({
      where: { id: req.params.id },
      data: {
        invoicedAmount: newInvoiced,
        deductions:     newDeductions,
        deductionNote:  deductionNote || current.deductionNote,
        gstAmount:      newGST,
        finalAmount,
        notes:          notes || current.notes,
        updatedAt:      new Date(),
      },
    });
    res.json({ ...invoice, reconciled: invoice.invoicedAmount <= invoice.agreedRate });
  } catch (err) { next(err); }
});

// PUT /api/ftl/billing/invoices/:id/approve
router.put('/invoices/:id/approve', authenticate, authorize(...FINANCE_ROLES), async (req, res, next) => {
  try {
    const invoice = await prisma.ftlInvoice.update({
      where: { id: req.params.id },
      data: { status: 'APPROVED', approvedAt: new Date(), updatedAt: new Date() },
    });
    res.json(invoice);
  } catch (err) { next(err); }
});

// PUT /api/ftl/billing/invoices/:id/dispute
router.put('/invoices/:id/dispute', authenticate, authorize(...FINANCE_ROLES), async (req, res, next) => {
  try {
    const { disputeReason } = req.body;
    const invoice = await prisma.ftlInvoice.update({
      where: { id: req.params.id },
      data: { status: 'DISPUTED', disputeReason, updatedAt: new Date() },
    });
    res.json(invoice);
  } catch (err) { next(err); }
});

// POST /api/ftl/billing/invoices/:id/resubmit  — vendor resubmits after dispute
router.post('/invoices/:id/resubmit', authenticate, async (req, res, next) => {
  try {
    const { invoicedAmount, notes } = req.body;
    const current = await prisma.ftlInvoice.findUnique({ where: { id: req.params.id } });
    if (!current) return res.status(404).json({ message: 'Invoice not found' });

    const newInvoiced = invoicedAmount ? +invoicedAmount : current.invoicedAmount;
    const invoice = await prisma.ftlInvoice.update({
      where: { id: req.params.id },
      data: {
        invoicedAmount: newInvoiced,
        finalAmount:    newInvoiced - current.deductions,
        status:         'SUBMITTED',
        disputeReason:  null,
        notes:          notes || current.notes,
        updatedAt:      new Date(),
      },
    });
    res.json(invoice);
  } catch (err) { next(err); }
});

// GET /api/ftl/billing/summary  — financial summary for dashboard
router.get('/summary', authenticate, authorize(...FINANCE_ROLES), async (req, res, next) => {
  try {
    const [submitted, approved, disputed, paid] = await Promise.all([
      prisma.ftlInvoice.aggregate({ where: { status: 'SUBMITTED' }, _sum: { invoicedAmount: true }, _count: true }),
      prisma.ftlInvoice.aggregate({ where: { status: 'APPROVED' },  _sum: { finalAmount: true },    _count: true }),
      prisma.ftlInvoice.aggregate({ where: { status: 'DISPUTED' },  _sum: { invoicedAmount: true }, _count: true }),
      prisma.ftlInvoice.aggregate({ where: { status: 'PAID' },      _sum: { finalAmount: true },    _count: true }),
    ]);
    res.json({
      submitted: { amount: submitted._sum.invoicedAmount || 0, count: submitted._count },
      approved:  { amount: approved._sum.finalAmount     || 0, count: approved._count  },
      disputed:  { amount: disputed._sum.invoicedAmount  || 0, count: disputed._count  },
      paid:      { amount: paid._sum.finalAmount         || 0, count: paid._count      },
    });
  } catch (err) { next(err); }
});

module.exports = router;
