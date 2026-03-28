-- HaulSync TOS FTL — Initial Migration
-- Generated from prisma/schema.prisma

-- Enums
CREATE TYPE "UserRole"          AS ENUM ('SUPER_ADMIN','ADMIN','MANAGER','OPERATOR','FINANCE','VIEWER','TRANSPORTER');
CREATE TYPE "CompanyType"       AS ENUM ('SHIPPER','TRANSPORTER','BROKER','CONSIGNEE','BOTH');
CREATE TYPE "VehicleType"       AS ENUM ('TRUCK_20FT_SXL','TRUCK_20FT_MXL','TRUCK_32FT_SXL','TRUCK_32FT_MXL','CONTAINER_20FT','CONTAINER_40FT','FLATBED','REFRIGERATED','TANKER','MINI_TRUCK');
CREATE TYPE "IndentStatus"      AS ENUM ('DRAFT','PENDING','RFQ_PUBLISHED','AWARDED','CANCELLED','COMPLETED');
CREATE TYPE "ContractType"      AS ENUM ('CONTRACT','SPOT');
CREATE TYPE "RFQStatus"         AS ENUM ('OPEN','CLOSED','AWARDED','EXPIRED','CANCELLED');
CREATE TYPE "AwardStrategy"     AS ENUM ('L1_AUTO','L1_MANUAL_APPROVAL','NEGOTIATED','CONTRACT_RATE');
CREATE TYPE "BidStatus"         AS ENUM ('PENDING','AWARDED','STANDBY','REJECTED','WITHDRAWN','EXPIRED');
CREATE TYPE "TripStatus"        AS ENUM ('CREATED','ASSIGNED','AT_PICKUP','IN_TRANSIT','AT_DELIVERY','DELIVERED','POD_PENDING','POD_CAPTURED','COMPLETED','CANCELLED','DELAYED');
CREATE TYPE "ExceptionType"     AS ENUM ('DELAY','DEVIATION','SLA_BREACH','GPS_LOSS','HALT','BREAKDOWN','OTHER');
CREATE TYPE "ExceptionSeverity" AS ENUM ('LOW','MEDIUM','HIGH','CRITICAL');
CREATE TYPE "ExceptionStatus"   AS ENUM ('OPEN','ACKNOWLEDGED','RESOLVED','ESCALATED');
CREATE TYPE "PODStatus"         AS ENUM ('PENDING','CAPTURED','VERIFIED','DISPUTED');
CREATE TYPE "InvoiceStatus"     AS ENUM ('DRAFT','SUBMITTED','APPROVED','DISPUTED','PAID','CANCELLED');
CREATE TYPE "SettlementStatus"  AS ENUM ('PENDING_PAYMENT','PROCESSING','PAID','FAILED');
CREATE TYPE "PaymentMethod"     AS ENUM ('NEFT','RTGS','IMPS','CHEQUE','UPI');

-- Tables

CREATE TABLE "companies" (
    "id"            TEXT        NOT NULL,
    "name"          TEXT        NOT NULL,
    "type"          "CompanyType" NOT NULL,
    "gstin"         TEXT,
    "pan"           TEXT,
    "address"       TEXT,
    "city"          TEXT,
    "state"         TEXT,
    "pincode"       TEXT,
    "phone"         TEXT,
    "email"         TEXT,
    "contactPerson" TEXT,
    "slaScore"      DOUBLE PRECISION NOT NULL DEFAULT 80.0,
    "isActive"      BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "companies_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "users" (
    "id"        TEXT        NOT NULL,
    "name"      TEXT        NOT NULL,
    "email"     TEXT        NOT NULL,
    "password"  TEXT        NOT NULL,
    "role"      "UserRole"  NOT NULL DEFAULT 'OPERATOR',
    "phone"     TEXT,
    "isActive"  BOOLEAN     NOT NULL DEFAULT true,
    "companyId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "users_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "users_email_key" ON "users"("email");

CREATE TABLE "vehicles" (
    "id"              TEXT          NOT NULL,
    "registrationNo"  TEXT          NOT NULL,
    "type"            "VehicleType" NOT NULL,
    "capacityTonnes"  DOUBLE PRECISION NOT NULL,
    "make"            TEXT,
    "model"           TEXT,
    "year"            INTEGER,
    "gpsDeviceId"     TEXT,
    "gpsProvider"     TEXT,
    "insuranceExpiry" TIMESTAMP(3),
    "pucExpiry"       TIMESTAMP(3),
    "fitnessExpiry"   TIMESTAMP(3),
    "companyId"       TEXT,
    "isActive"        BOOLEAN     NOT NULL DEFAULT true,
    "createdAt"       TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"       TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vehicles_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "vehicles_registrationNo_key" ON "vehicles"("registrationNo");

CREATE TABLE "drivers" (
    "id"               TEXT    NOT NULL,
    "name"             TEXT    NOT NULL,
    "phone"            TEXT    NOT NULL,
    "licenseNo"        TEXT    NOT NULL,
    "licenseExpiry"    TIMESTAMP(3),
    "address"          TEXT,
    "city"             TEXT,
    "emergencyContact" TEXT,
    "rating"           DOUBLE PRECISION NOT NULL DEFAULT 5.0,
    "totalTrips"       INTEGER NOT NULL DEFAULT 0,
    "companyId"        TEXT,
    "isActive"         BOOLEAN NOT NULL DEFAULT true,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "drivers_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "drivers_phone_key"     ON "drivers"("phone");
CREATE UNIQUE INDEX "drivers_licenseNo_key" ON "drivers"("licenseNo");

CREATE TABLE "indents" (
    "id"           TEXT           NOT NULL,
    "indentNumber" TEXT           NOT NULL,
    "originCity"   TEXT           NOT NULL,
    "originState"  TEXT           NOT NULL,
    "destCity"     TEXT           NOT NULL,
    "destState"    TEXT           NOT NULL,
    "vehicleType"  "VehicleType"  NOT NULL,
    "quantity"     INTEGER        NOT NULL DEFAULT 1,
    "weightTonnes" DOUBLE PRECISION,
    "contractType" "ContractType" NOT NULL DEFAULT 'CONTRACT',
    "loadingDate"  TIMESTAMP(3)   NOT NULL,
    "notes"        TEXT,
    "status"       "IndentStatus" NOT NULL DEFAULT 'PENDING',
    "createdById"  TEXT           NOT NULL,
    "createdAt"    TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)   NOT NULL,
    CONSTRAINT "indents_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "indents_indentNumber_key" ON "indents"("indentNumber");

CREATE TABLE "ftl_rfqs" (
    "id"               TEXT           NOT NULL,
    "rfqNumber"        TEXT           NOT NULL,
    "indentId"         TEXT,
    "originCity"       TEXT           NOT NULL,
    "originState"      TEXT           NOT NULL,
    "destCity"         TEXT           NOT NULL,
    "destState"        TEXT           NOT NULL,
    "vehicleType"      "VehicleType"  NOT NULL,
    "quantity"         INTEGER        NOT NULL DEFAULT 1,
    "loadingDate"      TIMESTAMP(3)   NOT NULL,
    "awardStrategy"    "AwardStrategy" NOT NULL DEFAULT 'L1_AUTO',
    "rfqWindowMinutes" INTEGER        NOT NULL DEFAULT 45,
    "minSLAScore"      DOUBLE PRECISION NOT NULL DEFAULT 70,
    "status"           "RFQStatus"    NOT NULL DEFAULT 'OPEN',
    "closesAt"         TIMESTAMP(3)   NOT NULL,
    "awardedBidId"     TEXT,
    "createdById"      TEXT           NOT NULL,
    "createdAt"        TIMESTAMP(3)   NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3)   NOT NULL,
    CONSTRAINT "ftl_rfqs_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ftl_rfqs_rfqNumber_key"    ON "ftl_rfqs"("rfqNumber");
CREATE UNIQUE INDEX "ftl_rfqs_indentId_key"     ON "ftl_rfqs"("indentId");
CREATE UNIQUE INDEX "ftl_rfqs_awardedBidId_key" ON "ftl_rfqs"("awardedBidId");

CREATE TABLE "vendor_bids" (
    "id"            TEXT       NOT NULL,
    "rfqId"         TEXT       NOT NULL,
    "vendorId"      TEXT       NOT NULL,
    "submittedById" TEXT       NOT NULL,
    "rateAmount"    DOUBLE PRECISION NOT NULL,
    "rank"          INTEGER,
    "slaScore"      DOUBLE PRECISION NOT NULL DEFAULT 80,
    "notes"         TEXT,
    "status"        "BidStatus" NOT NULL DEFAULT 'PENDING',
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "vendor_bids_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "ftl_trips" (
    "id"               TEXT         NOT NULL,
    "tripNumber"       TEXT         NOT NULL,
    "indentId"         TEXT,
    "rfqId"            TEXT,
    "vendorId"         TEXT,
    "vehicleId"        TEXT,
    "driverId"         TEXT,
    "originCity"       TEXT         NOT NULL,
    "originState"      TEXT         NOT NULL,
    "destCity"         TEXT         NOT NULL,
    "destState"        TEXT         NOT NULL,
    "vehicleType"      "VehicleType" NOT NULL,
    "weightTonnes"     DOUBLE PRECISION,
    "agreedRate"       DOUBLE PRECISION,
    "lrNumber"         TEXT,
    "ewayBillNo"       TEXT,
    "ewayBillExpiry"   TIMESTAMP(3),
    "loadingDate"      TIMESTAMP(3) NOT NULL,
    "expectedDelivery" TIMESTAMP(3),
    "actualDelivery"   TIMESTAMP(3),
    "status"           "TripStatus" NOT NULL DEFAULT 'CREATED',
    "notes"            TEXT,
    "createdById"      TEXT         NOT NULL,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "ftl_trips_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ftl_trips_tripNumber_key" ON "ftl_trips"("tripNumber");
CREATE UNIQUE INDEX "ftl_trips_indentId_key"   ON "ftl_trips"("indentId");
CREATE UNIQUE INDEX "ftl_trips_rfqId_key"      ON "ftl_trips"("rfqId");
CREATE UNIQUE INDEX "ftl_trips_lrNumber_key"   ON "ftl_trips"("lrNumber");

CREATE TABLE "trip_tracking_events" (
    "id"          TEXT    NOT NULL,
    "tripId"      TEXT    NOT NULL,
    "eventType"   TEXT    NOT NULL,
    "location"    TEXT    NOT NULL,
    "city"        TEXT,
    "state"       TEXT,
    "latitude"    DOUBLE PRECISION,
    "longitude"   DOUBLE PRECISION,
    "speedKmph"   DOUBLE PRECISION,
    "gpsProvider" TEXT,
    "notes"       TEXT,
    "recordedAt"  TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "trip_tracking_events_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trip_exceptions" (
    "id"           TEXT                NOT NULL,
    "tripId"       TEXT                NOT NULL,
    "type"         "ExceptionType"     NOT NULL,
    "severity"     "ExceptionSeverity" NOT NULL DEFAULT 'MEDIUM',
    "message"      TEXT                NOT NULL,
    "location"     TEXT,
    "status"       "ExceptionStatus"   NOT NULL DEFAULT 'OPEN',
    "resolvedAt"   TIMESTAMP(3),
    "resolvedNote" TEXT,
    "detectedAt"   TIMESTAMP(3)        NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"    TIMESTAMP(3)        NOT NULL,
    CONSTRAINT "trip_exceptions_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "trip_pods" (
    "id"            TEXT       NOT NULL,
    "tripId"        TEXT       NOT NULL,
    "receiverName"  TEXT,
    "receiverPhone" TEXT,
    "eSignatureUrl" TEXT,
    "imageUrls"     TEXT[]     NOT NULL DEFAULT ARRAY[]::TEXT[],
    "lrNumber"      TEXT,
    "ewayBillNo"    TEXT,
    "capturedAt"    TIMESTAMP(3),
    "verifiedAt"    TIMESTAMP(3),
    "status"        "PODStatus" NOT NULL DEFAULT 'PENDING',
    "notes"         TEXT,
    "createdAt"     TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"     TIMESTAMP(3) NOT NULL,
    CONSTRAINT "trip_pods_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "trip_pods_tripId_key" ON "trip_pods"("tripId");

CREATE TABLE "settlements" (
    "id"               TEXT               NOT NULL,
    "settlementNumber" TEXT               NOT NULL,
    "vendorId"         TEXT               NOT NULL,
    "totalAmount"      DOUBLE PRECISION   NOT NULL,
    "paymentMethod"    "PaymentMethod"    NOT NULL DEFAULT 'NEFT',
    "bankRef"          TEXT,
    "status"           "SettlementStatus" NOT NULL DEFAULT 'PENDING_PAYMENT',
    "approvedAt"       TIMESTAMP(3),
    "paidAt"           TIMESTAMP(3),
    "notes"            TEXT,
    "createdAt"        TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"        TIMESTAMP(3) NOT NULL,
    CONSTRAINT "settlements_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "settlements_settlementNumber_key" ON "settlements"("settlementNumber");

CREATE TABLE "ftl_invoices" (
    "id"             TEXT            NOT NULL,
    "invoiceNumber"  TEXT            NOT NULL,
    "tripId"         TEXT            NOT NULL,
    "vendorId"       TEXT            NOT NULL,
    "agreedRate"     DOUBLE PRECISION NOT NULL,
    "invoicedAmount" DOUBLE PRECISION NOT NULL,
    "deductions"     DOUBLE PRECISION NOT NULL DEFAULT 0,
    "deductionNote"  TEXT,
    "gstAmount"      DOUBLE PRECISION NOT NULL DEFAULT 0,
    "finalAmount"    DOUBLE PRECISION NOT NULL,
    "status"         "InvoiceStatus" NOT NULL DEFAULT 'SUBMITTED',
    "submittedAt"    TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "approvedAt"     TIMESTAMP(3),
    "disputeReason"  TEXT,
    "notes"          TEXT,
    "settlementId"   TEXT,
    "createdAt"      TIMESTAMP(3)    NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt"      TIMESTAMP(3)    NOT NULL,
    CONSTRAINT "ftl_invoices_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "ftl_invoices_invoiceNumber_key" ON "ftl_invoices"("invoiceNumber");
CREATE UNIQUE INDEX "ftl_invoices_tripId_key"        ON "ftl_invoices"("tripId");

CREATE TABLE "activity_logs" (
    "id"        TEXT    NOT NULL,
    "userId"    TEXT    NOT NULL,
    "action"    TEXT    NOT NULL,
    "entity"    TEXT    NOT NULL,
    "entityId"  TEXT,
    "metadata"  JSONB,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "activity_logs_pkey" PRIMARY KEY ("id")
);

-- Foreign keys
ALTER TABLE "users"                ADD CONSTRAINT "users_companyId_fkey"                FOREIGN KEY ("companyId")    REFERENCES "companies"("id")     ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vehicles"             ADD CONSTRAINT "vehicles_companyId_fkey"             FOREIGN KEY ("companyId")    REFERENCES "companies"("id")     ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "drivers"              ADD CONSTRAINT "drivers_companyId_fkey"              FOREIGN KEY ("companyId")    REFERENCES "companies"("id")     ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "indents"              ADD CONSTRAINT "indents_createdById_fkey"            FOREIGN KEY ("createdById")  REFERENCES "users"("id")         ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ftl_rfqs"             ADD CONSTRAINT "ftl_rfqs_indentId_fkey"             FOREIGN KEY ("indentId")     REFERENCES "indents"("id")       ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ftl_rfqs"             ADD CONSTRAINT "ftl_rfqs_createdById_fkey"          FOREIGN KEY ("createdById")  REFERENCES "users"("id")         ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ftl_rfqs"             ADD CONSTRAINT "ftl_rfqs_awardedBidId_fkey"         FOREIGN KEY ("awardedBidId") REFERENCES "vendor_bids"("id")   ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "vendor_bids"          ADD CONSTRAINT "vendor_bids_rfqId_fkey"             FOREIGN KEY ("rfqId")        REFERENCES "ftl_rfqs"("id")      ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_bids"          ADD CONSTRAINT "vendor_bids_vendorId_fkey"          FOREIGN KEY ("vendorId")     REFERENCES "companies"("id")     ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "vendor_bids"          ADD CONSTRAINT "vendor_bids_submittedById_fkey"     FOREIGN KEY ("submittedById") REFERENCES "users"("id")        ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ftl_trips"            ADD CONSTRAINT "ftl_trips_indentId_fkey"            FOREIGN KEY ("indentId")     REFERENCES "indents"("id")       ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ftl_trips"            ADD CONSTRAINT "ftl_trips_rfqId_fkey"               FOREIGN KEY ("rfqId")        REFERENCES "ftl_rfqs"("id")      ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ftl_trips"            ADD CONSTRAINT "ftl_trips_vehicleId_fkey"           FOREIGN KEY ("vehicleId")    REFERENCES "vehicles"("id")      ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ftl_trips"            ADD CONSTRAINT "ftl_trips_driverId_fkey"            FOREIGN KEY ("driverId")     REFERENCES "drivers"("id")       ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ftl_trips"            ADD CONSTRAINT "ftl_trips_vendorId_fkey"            FOREIGN KEY ("vendorId")     REFERENCES "companies"("id")     ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "ftl_trips"            ADD CONSTRAINT "ftl_trips_createdById_fkey"         FOREIGN KEY ("createdById")  REFERENCES "users"("id")         ON DELETE RESTRICT ON UPDATE CASCADE;ALTER TABLE "trip_tracking_events" ADD CONSTRAINT "trip_tracking_events_tripId_fkey"   FOREIGN KEY ("tripId")       REFERENCES "ftl_trips"("id")     ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "trip_exceptions"      ADD CONSTRAINT "trip_exceptions_tripId_fkey"        FOREIGN KEY ("tripId")       REFERENCES "ftl_trips"("id")     ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "trip_pods"            ADD CONSTRAINT "trip_pods_tripId_fkey"              FOREIGN KEY ("tripId")       REFERENCES "ftl_trips"("id")     ON DELETE CASCADE  ON UPDATE CASCADE;
ALTER TABLE "ftl_invoices"         ADD CONSTRAINT "ftl_invoices_tripId_fkey"           FOREIGN KEY ("tripId")       REFERENCES "ftl_trips"("id")     ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ftl_invoices"         ADD CONSTRAINT "ftl_invoices_vendorId_fkey"         FOREIGN KEY ("vendorId")     REFERENCES "companies"("id")     ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "ftl_invoices"         ADD CONSTRAINT "ftl_invoices_settlementId_fkey"     FOREIGN KEY ("settlementId") REFERENCES "settlements"("id")   ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "settlements"          ADD CONSTRAINT "settlements_vendorId_fkey"          FOREIGN KEY ("vendorId")     REFERENCES "companies"("id")     ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "activity_logs"        ADD CONSTRAINT "activity_logs_userId_fkey"          FOREIGN KEY ("userId")       REFERENCES "users"("id")         ON DELETE RESTRICT ON UPDATE CASCADE;
