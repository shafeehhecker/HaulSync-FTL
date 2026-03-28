const { PrismaClient } = require("@prisma/client");
const bcrypt = require("bcryptjs");
const prisma = new PrismaClient();

async function main() {
  console.log("🌱 Seeding HaulSync TOS FTL database…");

  // ── Idempotency guard ────────────────────────────────────────────────────────
  // Safe to re-run on every container restart — skips if data already exists.
  const existingUsers = await prisma.user.count();
  if (existingUsers > 0) {
    console.log(`⏭  Seed skipped — ${existingUsers} users already present.`);
    return;
  }

  const hash = (pw) => bcrypt.hash(pw, 10);

  // ── Companies ────────────────────────────────────────────────────────────────
  const shipper = await prisma.company.upsert({
    where: { id: "ftl-shipper-001" },
    update: {},
    create: {
      id: "ftl-shipper-001",
      name: "HaulSync Demo Corp",
      type: "SHIPPER",
      gstin: "29ABCDE1234F1Z5",
      pan: "ABCDE1234F",
      address: "12, Tech Park Road",
      city: "Bangalore",
      state: "Karnataka",
      pincode: "560001",
      phone: "9876543210",
      email: "ops@haulsyncdemo.com",
      contactPerson: "Arjun Nair",
      slaScore: 95,
    },
  });

  const [t1, t2, t3, t4] = await Promise.all([
    prisma.company.upsert({
      where: { id: "ftl-trans-001" },
      update: {},
      create: {
        id: "ftl-trans-001",
        name: "Swift Logistics",
        type: "TRANSPORTER",
        gstin: "27SWIFT1234L1Z1",
        city: "Mumbai",
        state: "Maharashtra",
        phone: "9111100001",
        email: "ops@swiftlogistics.in",
        contactPerson: "Vikram Shah",
        slaScore: 88,
      },
    }),
    prisma.company.upsert({
      where: { id: "ftl-trans-002" },
      update: {},
      create: {
        id: "ftl-trans-002",
        name: "Rapid Carriers",
        type: "TRANSPORTER",
        gstin: "07RAPID5678M1Z2",
        city: "Delhi",
        state: "Delhi",
        phone: "9111100002",
        email: "ops@rapidcarriers.in",
        contactPerson: "Priya Verma",
        slaScore: 82,
      },
    }),
    prisma.company.upsert({
      where: { id: "ftl-trans-003" },
      update: {},
      create: {
        id: "ftl-trans-003",
        name: "FastMove Transport",
        type: "TRANSPORTER",
        gstin: "33FASTM9012N1Z3",
        city: "Chennai",
        state: "Tamil Nadu",
        phone: "9111100003",
        email: "ops@fastmove.in",
        contactPerson: "Senthil Kumar",
        slaScore: 79,
      },
    }),
    prisma.company.upsert({
      where: { id: "ftl-trans-004" },
      update: {},
      create: {
        id: "ftl-trans-004",
        name: "National Freight",
        type: "TRANSPORTER",
        gstin: "36NATFR3456P1Z4",
        city: "Hyderabad",
        state: "Telangana",
        phone: "9111100004",
        email: "ops@nationalfreight.in",
        contactPerson: "Ramesh Babu",
        slaScore: 74,
      },
    }),
  ]);

  // ── Users ────────────────────────────────────────────────────────────────────
  const [adminPw, mgrPw, finPw, transPw] = await Promise.all([
    hash("Admin@1234"),
    hash("Mgr@1234"),
    hash("Finance@1234"),
    hash("Trans@1234"),
  ]);

  const admin = await prisma.user.upsert({
    where: { email: "admin@haulsync.local" },
    update: {},
    create: {
      name: "Super Admin",
      email: "admin@haulsync.local",
      password: adminPw,
      role: "SUPER_ADMIN",
      companyId: shipper.id,
      phone: "9800000001",
    },
  });

  await prisma.user.upsert({
    where: { email: "manager@haulsync.local" },
    update: {},
    create: {
      name: "Ops Manager",
      email: "manager@haulsync.local",
      password: mgrPw,
      role: "MANAGER",
      companyId: shipper.id,
      phone: "9800000002",
    },
  });

  await prisma.user.upsert({
    where: { email: "finance@haulsync.local" },
    update: {},
    create: {
      name: "Finance User",
      email: "finance@haulsync.local",
      password: finPw,
      role: "FINANCE",
      companyId: shipper.id,
      phone: "9800000003",
    },
  });

  const transUser = await prisma.user.upsert({
    where: { email: "transporter@haulsync.local" },
    update: {},
    create: {
      name: "Transport Manager",
      email: "transporter@haulsync.local",
      password: transPw,
      role: "TRANSPORTER",
      companyId: t1.id,
      phone: "9800000004",
    },
  });

  // ── Vehicles ─────────────────────────────────────────────────────────────────
  const [v1, v2, v3, v4] = await Promise.all([
    prisma.vehicle.upsert({
      where: { registrationNo: "MH04AB1234" },
      update: {},
      create: {
        registrationNo: "MH04AB1234",
        type: "TRUCK_32FT_SXL",
        capacityTonnes: 15,
        make: "Tata",
        model: "Prima 3525",
        year: 2021,
        gpsDeviceId: "VAM-001",
        gpsProvider: "Vamosys",
        companyId: t1.id,
        insuranceExpiry: new Date("2026-12-31"),
        pucExpiry: new Date("2025-09-30"),
        fitnessExpiry: new Date("2026-06-30"),
      },
    }),
    prisma.vehicle.upsert({
      where: { registrationNo: "MH12XY5678" },
      update: {},
      create: {
        registrationNo: "MH12XY5678",
        type: "TRUCK_20FT_MXL",
        capacityTonnes: 9,
        make: "Ashok Leyland",
        model: "Dost+",
        year: 2020,
        gpsDeviceId: "LOC-002",
        gpsProvider: "Locus",
        companyId: t2.id,
        insuranceExpiry: new Date("2026-06-30"),
        pucExpiry: new Date("2025-08-31"),
        fitnessExpiry: new Date("2025-12-31"),
      },
    }),
    prisma.vehicle.upsert({
      where: { registrationNo: "DL01CD9012" },
      update: {},
      create: {
        registrationNo: "DL01CD9012",
        type: "TRUCK_32FT_MXL",
        capacityTonnes: 20,
        make: "Tata",
        model: "LPT 2518",
        year: 2022,
        gpsDeviceId: "VAM-003",
        gpsProvider: "Vamosys",
        companyId: t2.id,
        insuranceExpiry: new Date("2027-01-31"),
        pucExpiry: new Date("2025-11-30"),
        fitnessExpiry: new Date("2027-01-31"),
      },
    }),
    prisma.vehicle.upsert({
      where: { registrationNo: "TN01EF3456" },
      update: {},
      create: {
        registrationNo: "TN01EF3456",
        type: "CONTAINER_20FT",
        capacityTonnes: 22,
        make: "BharatBenz",
        model: "3523",
        year: 2023,
        gpsDeviceId: "LOC-004",
        gpsProvider: "Locus",
        companyId: t3.id,
        insuranceExpiry: new Date("2026-09-30"),
        pucExpiry: new Date("2025-07-31"),
        fitnessExpiry: new Date("2026-09-30"),
      },
    }),
  ]);

  // ── Drivers ──────────────────────────────────────────────────────────────────
  const [d1, d2, d3, d4] = await Promise.all([
    prisma.driver.upsert({
      where: { phone: "9500011111" },
      update: {},
      create: {
        name: "Rajan Kumar",
        phone: "9500011111",
        licenseNo: "MH2021001234",
        licenseExpiry: new Date("2028-06-30"),
        address: "22 Dharavi Rd",
        city: "Mumbai",
        emergencyContact: "9500011100",
        rating: 4.8,
        totalTrips: 142,
        companyId: t1.id,
      },
    }),
    prisma.driver.upsert({
      where: { phone: "9500022222" },
      update: {},
      create: {
        name: "Suresh Yadav",
        phone: "9500022222",
        licenseNo: "MH2019005678",
        licenseExpiry: new Date("2027-03-31"),
        address: "7 Pimpri Colony",
        city: "Pune",
        emergencyContact: "9500022200",
        rating: 4.5,
        totalTrips: 98,
        companyId: t1.id,
      },
    }),
    prisma.driver.upsert({
      where: { phone: "9500033333" },
      update: {},
      create: {
        name: "Mohan Singh",
        phone: "9500033333",
        licenseNo: "DL2022009012",
        licenseExpiry: new Date("2029-01-31"),
        address: "14 Rohini Sector 5",
        city: "Delhi",
        emergencyContact: "9500033300",
        rating: 4.2,
        totalTrips: 67,
        companyId: t2.id,
      },
    }),
    prisma.driver.upsert({
      where: { phone: "9500044444" },
      update: {},
      create: {
        name: "Anil Sharma",
        phone: "9500044444",
        licenseNo: "TN2020003456",
        licenseExpiry: new Date("2028-09-30"),
        address: "3 Anna Nagar",
        city: "Chennai",
        emergencyContact: "9500044400",
        rating: 4.7,
        totalTrips: 115,
        companyId: t3.id,
      },
    }),
  ]);

  // ── Indents ──────────────────────────────────────────────────────────────────
  const indent1 = await prisma.indent.upsert({
    where: { indentNumber: "IND-2025-0101" },
    update: {},
    create: {
      indentNumber: "IND-2025-0101",
      originCity: "Mumbai",
      originState: "Maharashtra",
      destCity: "Delhi",
      destState: "Delhi",
      vehicleType: "TRUCK_32FT_SXL",
      quantity: 2,
      weightTonnes: 24,
      contractType: "CONTRACT",
      loadingDate: new Date("2025-03-25"),
      status: "RFQ_PUBLISHED",
      notes: "Fragile electronics — handle with care",
      createdById: admin.id,
    },
  });

  const indent2 = await prisma.indent.upsert({
    where: { indentNumber: "IND-2025-0100" },
    update: {},
    create: {
      indentNumber: "IND-2025-0100",
      originCity: "Pune",
      originState: "Maharashtra",
      destCity: "Bangalore",
      destState: "Karnataka",
      vehicleType: "TRUCK_20FT_MXL",
      quantity: 1,
      weightTonnes: 8,
      contractType: "SPOT",
      loadingDate: new Date("2025-03-24"),
      status: "AWARDED",
      createdById: admin.id,
    },
  });

  const indent3 = await prisma.indent.upsert({
    where: { indentNumber: "IND-2025-0099" },
    update: {},
    create: {
      indentNumber: "IND-2025-0099",
      originCity: "Delhi",
      originState: "Delhi",
      destCity: "Kolkata",
      destState: "West Bengal",
      vehicleType: "TRUCK_32FT_SXL",
      quantity: 1,
      weightTonnes: 18,
      contractType: "CONTRACT",
      loadingDate: new Date("2025-03-23"),
      status: "AWARDED",
      createdById: admin.id,
    },
  });

  // ── RFQs ─────────────────────────────────────────────────────────────────────
  const rfq1 = await prisma.ftlRFQ.upsert({
    where: { rfqNumber: "RFQ-2025-0211" },
    update: {},
    create: {
      rfqNumber: "RFQ-2025-0211",
      indentId: indent1.id,
      originCity: "Mumbai",
      originState: "Maharashtra",
      destCity: "Delhi",
      destState: "Delhi",
      vehicleType: "TRUCK_32FT_SXL",
      quantity: 2,
      loadingDate: new Date("2025-03-25"),
      awardStrategy: "L1_AUTO",
      rfqWindowMinutes: 45,
      minSLAScore: 70,
      status: "OPEN",
      closesAt: new Date(Date.now() + 3 * 60 * 60 * 1000),
      createdById: admin.id,
    },
  });

  // ── Bids ─────────────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.vendorBid.upsert({
      where: { id: "bid-001" },
      update: {},
      create: {
        id: "bid-001",
        rfqId: rfq1.id,
        vendorId: t1.id,
        submittedById: transUser.id,
        rateAmount: 28500,
        rank: 1,
        slaScore: 88,
        status: "PENDING",
        notes: "GPS-tracked. Driver available at 05:00.",
      },
    }),
    prisma.vendorBid.upsert({
      where: { id: "bid-002" },
      update: {},
      create: {
        id: "bid-002",
        rfqId: rfq1.id,
        vendorId: t2.id,
        submittedById: transUser.id,
        rateAmount: 29800,
        rank: 2,
        slaScore: 82,
        status: "PENDING",
      },
    }),
    prisma.vendorBid.upsert({
      where: { id: "bid-003" },
      update: {},
      create: {
        id: "bid-003",
        rfqId: rfq1.id,
        vendorId: t3.id,
        submittedById: transUser.id,
        rateAmount: 31200,
        rank: 3,
        slaScore: 79,
        status: "PENDING",
      },
    }),
    prisma.vendorBid.upsert({
      where: { id: "bid-004" },
      update: {},
      create: {
        id: "bid-004",
        rfqId: rfq1.id,
        vendorId: t4.id,
        submittedById: transUser.id,
        rateAmount: 33000,
        rank: 4,
        slaScore: 74,
        status: "PENDING",
      },
    }),
  ]);

  // ── Trips ─────────────────────────────────────────────────────────────────────
  const trip1 = await prisma.ftlTrip.upsert({
    where: { tripNumber: "TRIP-2025-0841" },
    update: {},
    create: {
      tripNumber: "TRIP-2025-0841",
      originCity: "Mumbai",
      originState: "Maharashtra",
      destCity: "Delhi",
      destState: "Delhi",
      vehicleType: "TRUCK_32FT_SXL",
      vendorId: t1.id,
      vehicleId: v1.id,
      driverId: d1.id,
      agreedRate: 28500,
      weightTonnes: 12,
      lrNumber: "LR-2025-0841",
      ewayBillNo: "EWB-291234567890",
      ewayBillExpiry: new Date("2025-03-27"),
      loadingDate: new Date("2025-03-24"),
      expectedDelivery: new Date("2025-03-26"),
      status: "IN_TRANSIT",
      notes: "Priority shipment — electronics",
      createdById: admin.id,
    },
  });

  const trip2 = await prisma.ftlTrip.upsert({
    where: { tripNumber: "TRIP-2025-0838" },
    update: {},
    create: {
      tripNumber: "TRIP-2025-0838",
      originCity: "Chennai",
      originState: "Tamil Nadu",
      destCity: "Hyderabad",
      destState: "Telangana",
      vehicleType: "CONTAINER_20FT",
      vendorId: t3.id,
      vehicleId: v4.id,
      driverId: d4.id,
      agreedRate: 18500,
      weightTonnes: 18,
      lrNumber: "LR-2025-0838",
      ewayBillNo: "EWB-291234567888",
      ewayBillExpiry: new Date("2025-03-24"),
      loadingDate: new Date("2025-03-22"),
      expectedDelivery: new Date("2025-03-23"),
      actualDelivery: new Date("2025-03-23"),
      status: "COMPLETED",
      createdById: admin.id,
    },
  });

  const trip3 = await prisma.ftlTrip.upsert({
    where: { tripNumber: "TRIP-2025-0839" },
    update: {},
    create: {
      tripNumber: "TRIP-2025-0839",
      originCity: "Delhi",
      originState: "Delhi",
      destCity: "Kolkata",
      destState: "West Bengal",
      vehicleType: "TRUCK_32FT_SXL",
      vendorId: t2.id,
      vehicleId: v3.id,
      driverId: d3.id,
      agreedRate: 31200,
      weightTonnes: 19,
      lrNumber: "LR-2025-0839",
      ewayBillNo: "EWB-291234567880",
      ewayBillExpiry: new Date("2025-03-26"),
      loadingDate: new Date("2025-03-23"),
      expectedDelivery: new Date("2025-03-25"),
      status: "DELAYED",
      createdById: admin.id,
    },
  });

  // ── Tracking Events ───────────────────────────────────────────────────────────
  await Promise.all([
    // Trip 1 — IN_TRANSIT Mumbai → Delhi
    prisma.tripTrackingEvent.upsert({
      where: { id: "evt-001" },
      update: {},
      create: {
        id: "evt-001",
        tripId: trip1.id,
        eventType: "DEPARTED",
        location: "Mumbai Loading Dock, JNPT Road",
        city: "Mumbai",
        state: "Maharashtra",
        latitude: 19.076,
        longitude: 72.877,
        speedKmph: 0,
        gpsProvider: "Vamosys",
        recordedAt: new Date("2025-03-24T06:00:00Z"),
      },
    }),
    prisma.tripTrackingEvent.upsert({
      where: { id: "evt-002" },
      update: {},
      create: {
        id: "evt-002",
        tripId: trip1.id,
        eventType: "CHECKPOINT",
        location: "Nagpur Bypass, NH-44",
        city: "Nagpur",
        state: "Maharashtra",
        latitude: 21.145,
        longitude: 79.088,
        speedKmph: 68,
        gpsProvider: "Vamosys",
        recordedAt: new Date("2025-03-24T14:00:00Z"),
      },
    }),
    prisma.tripTrackingEvent.upsert({
      where: { id: "evt-003" },
      update: {},
      create: {
        id: "evt-003",
        tripId: trip1.id,
        eventType: "CHECKPOINT",
        location: "Bhopal Toll, NH-46",
        city: "Bhopal",
        state: "Madhya Pradesh",
        latitude: 23.259,
        longitude: 77.413,
        speedKmph: 72,
        gpsProvider: "Vamosys",
        recordedAt: new Date("2025-03-24T22:00:00Z"),
      },
    }),
    // Trip 2 — COMPLETED Chennai → Hyderabad
    prisma.tripTrackingEvent.upsert({
      where: { id: "evt-004" },
      update: {},
      create: {
        id: "evt-004",
        tripId: trip2.id,
        eventType: "DEPARTED",
        location: "Chennai Warehouse, GST Road",
        city: "Chennai",
        state: "Tamil Nadu",
        latitude: 12.971,
        longitude: 80.22,
        speedKmph: 0,
        gpsProvider: "Locus",
        recordedAt: new Date("2025-03-22T08:00:00Z"),
      },
    }),
    prisma.tripTrackingEvent.upsert({
      where: { id: "evt-005" },
      update: {},
      create: {
        id: "evt-005",
        tripId: trip2.id,
        eventType: "ARRIVED",
        location: "Hyderabad Distribution Centre, Medchal",
        city: "Hyderabad",
        state: "Telangana",
        latitude: 17.478,
        longitude: 78.491,
        speedKmph: 0,
        gpsProvider: "Locus",
        recordedAt: new Date("2025-03-23T16:00:00Z"),
      },
    }),
    // Trip 3 — DELAYED Delhi → Kolkata
    prisma.tripTrackingEvent.upsert({
      where: { id: "evt-006" },
      update: {},
      create: {
        id: "evt-006",
        tripId: trip3.id,
        eventType: "DEPARTED",
        location: "Delhi ICD, Tughlakabad",
        city: "Delhi",
        state: "Delhi",
        latitude: 28.631,
        longitude: 77.219,
        speedKmph: 0,
        gpsProvider: "Vamosys",
        recordedAt: new Date("2025-03-23T05:30:00Z"),
      },
    }),
    prisma.tripTrackingEvent.upsert({
      where: { id: "evt-007" },
      update: {},
      create: {
        id: "evt-007",
        tripId: trip3.id,
        eventType: "HALT",
        location: "Agra Bypass, NH-19",
        city: "Agra",
        state: "Uttar Pradesh",
        latitude: 27.174,
        longitude: 78.005,
        speedKmph: 0,
        gpsProvider: "Vamosys",
        notes: "Unscheduled halt — driver break",
        recordedAt: new Date("2025-03-23T10:00:00Z"),
      },
    }),
  ]);

  // ── Exceptions ────────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.tripException.upsert({
      where: { id: "exc-001" },
      update: {},
      create: {
        id: "exc-001",
        tripId: trip3.id,
        type: "DELAY",
        severity: "HIGH",
        message: "Truck halted 90+ min at NH-19 near Agra — unscheduled stop",
        location: "Agra Bypass, NH-19",
        status: "OPEN",
      },
    }),
    prisma.tripException.upsert({
      where: { id: "exc-002" },
      update: {},
      create: {
        id: "exc-002",
        tripId: trip1.id,
        type: "GPS_LOSS",
        severity: "MEDIUM",
        message: "GPS signal lost for 22 minutes near Bhopal tunnel",
        location: "Bhopal, MP",
        status: "ACKNOWLEDGED",
      },
    }),
  ]);

  // ── POD ───────────────────────────────────────────────────────────────────────
  await prisma.tripPOD.upsert({
    where: { tripId: trip2.id },
    update: {},
    create: {
      tripId: trip2.id,
      receiverName: "Rajesh Mehta",
      receiverPhone: "9876500001",
      imageUrls: [
        "/uploads/pods/pod-trip-0838-1.jpg",
        "/uploads/pods/pod-trip-0838-2.jpg",
      ],
      lrNumber: "LR-2025-0838",
      ewayBillNo: "EWB-291234567888",
      capturedAt: new Date("2025-03-23T16:30:00Z"),
      verifiedAt: new Date("2025-03-23T17:00:00Z"),
      status: "VERIFIED",
      notes: "All 18 pallets received in good condition",
    },
  });

  // ── Settlement (must exist before invoice references it) ─────────────────────
  const settlement1 = await prisma.settlement.upsert({
    where: { settlementNumber: "SETL-2025-0031" },
    update: {},
    create: {
      settlementNumber: "SETL-2025-0031",
      vendorId: t3.id,
      totalAmount: 18500,
      paymentMethod: "NEFT",
      bankRef: "NEFT2025032400001",
      status: "PAID",
      approvedAt: new Date("2025-03-24T10:00:00Z"),
      paidAt: new Date("2025-03-24T14:00:00Z"),
      notes: "Batch settlement — March W4",
    },
  });

  // ── Invoices ──────────────────────────────────────────────────────────────────
  await prisma.ftlInvoice.upsert({
    where: { invoiceNumber: "INV-2025-0411" },
    update: {},
    create: {
      invoiceNumber: "INV-2025-0411",
      tripId: trip2.id,
      vendorId: t3.id,
      settlementId: settlement1.id,
      agreedRate: 18500,
      invoicedAmount: 18500,
      deductions: 0,
      gstAmount: 3330,
      finalAmount: 18500,
      status: "PAID",
      submittedAt: new Date("2025-03-23T18:00:00Z"),
      approvedAt: new Date("2025-03-24T10:00:00Z"),
    },
  });

  // Invoice for in-progress trip (SUBMITTED, awaiting approval)
  await prisma.ftlInvoice.upsert({
    where: { invoiceNumber: "INV-2025-0412" },
    update: {},
    create: {
      invoiceNumber: "INV-2025-0412",
      tripId: trip3.id,
      vendorId: t2.id,
      agreedRate: 31200,
      invoicedAmount: 31200,
      deductions: 1500,
      deductionNote: "Delay penalty — 6 hrs over SLA",
      gstAmount: 5328,
      finalAmount: 29700,
      status: "SUBMITTED",
      submittedAt: new Date("2025-03-25T09:00:00Z"),
    },
  });

  // ── Activity Log ──────────────────────────────────────────────────────────────
  await Promise.all([
    prisma.activityLog.create({
      data: {
        userId: admin.id,
        action: "CREATE",
        entity: "Indent",
        entityId: indent1.id,
        metadata: { indentNumber: "IND-2025-0101" },
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: admin.id,
        action: "PUBLISH",
        entity: "FtlRFQ",
        entityId: rfq1.id,
        metadata: { rfqNumber: "RFQ-2025-0211", vendors: 4 },
      },
    }),
    prisma.activityLog.create({
      data: {
        userId: admin.id,
        action: "CREATE",
        entity: "FtlTrip",
        entityId: trip1.id,
        metadata: { tripNumber: "TRIP-2025-0841" },
      },
    }),
  ]);

  console.log("\n✅ Seed complete!");
  console.log("   ┌─────────────────────────────────────────────────────────┐");
  console.log("   │  Email                         Password    Role         │");
  console.log("   ├─────────────────────────────────────────────────────────┤");
  console.log("   │  admin@haulsync.local          Admin@1234  SUPER_ADMIN  │");
  console.log("   │  manager@haulsync.local        Mgr@1234    MANAGER      │");
  console.log("   │  finance@haulsync.local        Finance@1234 FINANCE     │");
  console.log("   │  transporter@haulsync.local    Trans@1234  TRANSPORTER  │");
  console.log("   └─────────────────────────────────────────────────────────┘");
}

main()
  .catch((e) => {
    console.error("❌ Seed failed:", e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
