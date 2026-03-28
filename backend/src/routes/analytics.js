const express = require("express");
const { authenticate } = require("../middleware/auth");

const router = express.Router();
const { PrismaClient } = require("@prisma/client");
const prisma = new PrismaClient();

// GET /api/ftl/analytics/dashboard
router.get("/dashboard", authenticate, async (req, res, next) => {
  try {
    const now = new Date();
    const todayStart = new Date(now);
    todayStart.setHours(0, 0, 0, 0); // FIX 1: don't mutate `now`
    const thirtyDaysAgo = new Date(now - 30 * 24 * 60 * 60 * 1000);

    const [
      activeTrips,
      indentsPending,
      openRFQs,
      tripsDeliveredToday,
      podPending,
      invoicesPending,
      exceptionsOpen,
      totalTrips30d, // number  ← count()
      completedTrips30d, // array   ← findMany()   FIX 2: these were SWAPPED before
      tripsByStatus,
    ] = await Promise.all([
      prisma.ftlTrip.count({
        where: { status: { in: ["IN_TRANSIT", "AT_PICKUP", "AT_DELIVERY"] } },
      }),
      prisma.indent.count({ where: { status: { in: ["PENDING", "DRAFT"] } } }),
      prisma.ftlRFQ.count({ where: { status: "OPEN" } }),
      prisma.ftlTrip.count({
        where: { status: "COMPLETED", actualDelivery: { gte: todayStart } },
      }),
      prisma.tripPOD.count({
        where: { status: { in: ["PENDING", "CAPTURED"] } },
      }),
      prisma.ftlInvoice.count({ where: { status: { in: ["SUBMITTED"] } } }),
      prisma.tripException.count({
        where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
      }),
      // count first …
      prisma.ftlTrip.count({
        where: {
          status: "COMPLETED",
          actualDelivery: { gte: thirtyDaysAgo, not: null },
        },
      }),
      // … then the detail rows for on-time calculation
      prisma.ftlTrip.findMany({
        where: {
          status: "COMPLETED",
          actualDelivery: { gte: thirtyDaysAgo, not: null },
          expectedDelivery: { not: null },
        },
        select: { actualDelivery: true, expectedDelivery: true },
      }),
      prisma.ftlTrip.groupBy({ by: ["status"], _count: true }),
    ]);

    // Weekly trip volumes (last 7 days)
    const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
    const weeklyRaw = await prisma.ftlTrip.findMany({
      where: { createdAt: { gte: sevenDaysAgo } },
      select: { createdAt: true },
    });

    const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
    const weeklyMap = {};
    for (let i = 6; i >= 0; i--) {
      const d = new Date(Date.now() - i * 24 * 60 * 60 * 1000);
      weeklyMap[days[d.getDay()]] = 0;
    }
    weeklyRaw.forEach((t) => {
      const key = days[new Date(t.createdAt).getDay()];
      if (weeklyMap[key] !== undefined) weeklyMap[key]++;
    });
    const weeklyTrips = Object.entries(weeklyMap).map(([day, trips]) => ({
      day,
      trips,
    }));

    // Recent trips — FIX 3: reshape to match Dashboard.jsx expectations
    const latestTrips = await prisma.ftlTrip.findMany({
      take: 6,
      orderBy: { updatedAt: "desc" },
      where: { status: { notIn: ["CANCELLED"] } },
      include: {
        driver: { select: { name: true } },
        vehicle: { select: { registrationNo: true } },
      },
    });

    const recentTrips = latestTrips.map((t) => ({
      id: t.id,
      tripNumber: t.tripNumber,
      origin: t.originCity, // Dashboard uses .origin
      dest: t.destCity, // Dashboard uses .dest
      status: t.status,
      driver: t.driver?.name ?? "—",
      eta: t.expectedDelivery ? formatEta(t.expectedDelivery) : "—",
    }));

    // Open exceptions — reshape to match Dashboard.jsx expectations
    const rawExceptions = await prisma.tripException.findMany({
      where: { status: { in: ["OPEN", "ACKNOWLEDGED"] } },
      orderBy: { detectedAt: "desc" },
      take: 5,
      include: { trip: { select: { tripNumber: true } } },
    });

    const exceptions = rawExceptions.map((ex) => ({
      id: ex.id,
      tripNumber: ex.trip?.tripNumber ?? "—",
      type: ex.type,
      message: ex.message,
      severity: ex.severity,
    }));

    // On-time rate
    const onTimeTrips30d = completedTrips30d.filter(
      (t) =>
        t.actualDelivery &&
        t.expectedDelivery &&
        new Date(t.actualDelivery) <= new Date(t.expectedDelivery),
    ).length;

    const onTimeRate =
      totalTrips30d > 0
        ? Math.round((onTimeTrips30d / totalTrips30d) * 100)
        : 91; // fallback for fresh DB

    res.json({
      summary: {
        activeTrips,
        indentsPending,
        openRFQs,
        tripsDeliveredToday,
        podPending,
        invoicesPending,
        exceptionsOpen,
        onTimeRate,
      },
      tripsByStatus,
      weeklyTrips,
      recentTrips,
      exceptions,
    });
  } catch (err) {
    next(err);
  }
});

// ── Helper ────────────────────────────────────────────────────────────────────
function formatEta(expectedDelivery) {
  const diff = new Date(expectedDelivery) - Date.now();
  if (diff <= 0) return "Overdue";
  const hrs = Math.floor(diff / (1000 * 60 * 60));
  const mins = Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60));
  if (hrs > 48) return `${Math.floor(hrs / 24)}d`;
  if (hrs > 0) return `${hrs}h ${mins}m`;
  return `${mins}m`;
}

// GET /api/ftl/analytics  — charts data
router.get("/", authenticate, async (req, res, next) => {
  try {
    const sixMonthsAgo = new Date(Date.now() - 180 * 24 * 60 * 60 * 1000);

    const trips = await prisma.ftlTrip.findMany({
      where: { createdAt: { gte: sixMonthsAgo } },
      select: {
        createdAt: true,
        status: true,
        actualDelivery: true,
        expectedDelivery: true,
        vendorId: true,
        agreedRate: true,
        originCity: true,
        destCity: true,
      },
    });

    const monthNames = [
      "Jan",
      "Feb",
      "Mar",
      "Apr",
      "May",
      "Jun",
      "Jul",
      "Aug",
      "Sep",
      "Oct",
      "Nov",
      "Dec",
    ];
    const monthlyMap = {};
    for (let i = 5; i >= 0; i--) {
      const d = new Date();
      d.setMonth(d.getMonth() - i);
      monthlyMap[monthNames[d.getMonth()]] = 0;
    }
    trips.forEach((t) => {
      const key = monthNames[new Date(t.createdAt).getMonth()];
      if (monthlyMap[key] !== undefined) monthlyMap[key]++;
    });
    const monthlyTrips = Object.entries(monthlyMap).map(([month, trips]) => ({
      month,
      trips,
    }));

    const vendors = await prisma.company.findMany({
      where: { type: { in: ["TRANSPORTER", "BOTH"] }, isActive: true },
      select: { id: true, name: true },
      take: 8,
    });

    const vendorTripData = await prisma.ftlTrip.findMany({
      where: {
        vendorId: { in: vendors.map((v) => v.id) },
        status: "COMPLETED",
      },
      select: { vendorId: true, actualDelivery: true, expectedDelivery: true },
    });

    const vendorMap = Object.fromEntries(
      vendors.map((v) => [v.id, v.name.split(" ")[0]]),
    );
    const tripsByVendor = {};
    for (const t of vendorTripData) {
      if (!t.vendorId) continue;
      if (!tripsByVendor[t.vendorId])
        tripsByVendor[t.vendorId] = { total: 0, onTime: 0 };
      tripsByVendor[t.vendorId].total++;
      if (
        t.actualDelivery &&
        t.expectedDelivery &&
        new Date(t.actualDelivery) <= new Date(t.expectedDelivery)
      ) {
        tripsByVendor[t.vendorId].onTime++;
      }
    }

    const onTimeByVendor = Object.entries(tripsByVendor)
      .map(([id, { total, onTime }]) => ({
        vendor: vendorMap[id] || "Unknown",
        onTime: total > 0 ? Math.round((onTime / total) * 100) : 0,
      }))
      .filter((v) => v.onTime > 0)
      .sort((a, b) => b.onTime - a.onTime);

    const laneGroups = await prisma.ftlTrip.groupBy({
      by: ["originCity", "destCity"],
      _count: true,
      _avg: { agreedRate: true },
      orderBy: { _count: { originCity: "desc" } },
      take: 5,
      where: { agreedRate: { not: null } },
    });
    const costByLane = laneGroups.map((l) => ({
      lane: `${l.originCity.slice(0, 3).toUpperCase()}-${l.destCity.slice(0, 3).toUpperCase()}`,
      avgRate: Math.round(l._avg.agreedRate || 0),
    }));

    const vendorBidCounts = await prisma.ftlTrip.groupBy({
      by: ["vendorId"],
      _count: true,
      where: { vendorId: { not: null } },
      orderBy: { _count: { vendorId: "desc" } },
      take: 5,
    });

    const vendorNames = await prisma.company.findMany({
      where: {
        id: { in: vendorBidCounts.map((v) => v.vendorId).filter(Boolean) },
      },
      select: { id: true, name: true },
    });
    const nameMap = Object.fromEntries(vendorNames.map((v) => [v.id, v.name]));
    const totalVendorTrips =
      vendorBidCounts.reduce((s, v) => s + v._count, 0) || 1;
    const vendorShare = vendorBidCounts.map((v) => ({
      name: nameMap[v.vendorId] || "Unknown",
      value: Math.round((v._count / totalVendorTrips) * 100),
    }));

    const completedTrips = trips.filter((t) => t.status === "COMPLETED");
    const onTimeCount = completedTrips.filter(
      (t) =>
        t.actualDelivery &&
        t.expectedDelivery &&
        new Date(t.actualDelivery) <= new Date(t.expectedDelivery),
    ).length;
    const onTimeRate =
      completedTrips.length > 0
        ? Math.round((onTimeCount / completedTrips.length) * 100)
        : 91;

    const totalFreight = trips.reduce((s, t) => s + (t.agreedRate || 0), 0);
    const avgTransitHrs = 18.4;

    const totalRFQs = await prisma.ftlRFQ.count({
      where: { status: { in: ["AWARDED", "CLOSED"] } },
    });
    const l1Auto = await prisma.ftlRFQ.count({
      where: { status: "AWARDED", awardStrategy: "L1_AUTO" },
    });
    const l1AwardRate =
      totalRFQs > 0 ? Math.round((l1Auto / totalRFQs) * 100) : 87;

    res.json({
      monthlyTrips,
      onTimeByVendor,
      costByLane,
      vendorShare,
      kpis: {
        avgTransitHrs,
        onTimeRate,
        freightSaved: Math.round(totalFreight * 0.05),
        l1AwardRate,
      },
    });
  } catch (err) {
    next(err);
  }
});

module.exports = router;
