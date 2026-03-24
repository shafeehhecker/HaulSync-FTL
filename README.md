# 🚛 HaulSync TOS — Full Truck Load (FTL) Management

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![Docker](https://img.shields.io/badge/Docker-ready-blue.svg)](https://www.docker.com/)
[![PRs Welcome](https://img.shields.io/badge/PRs-welcome-brightgreen.svg)](CONTRIBUTING.md)
[![Node.js](https://img.shields.io/badge/Node.js-18+-green.svg)](https://nodejs.org/)
[![Part of HaulSync](https://img.shields.io/badge/HaulSync-TOS%20Module-6C47FF)](https://github.com/your-org/haulsync)

> **A self-hostable FTL Transport Operating System — built on the HaulSync platform. Automates the complete Full Truck Load lifecycle: from truck indenting and RFQ bidding to real-time tracking, digital POD, and final settlement.**

HaulSync FTL is a dedicated module in the HaulSync ecosystem, purpose-built for enterprises, 3PLs, and transport companies that need end-to-end automation of full truckload operations. It ships as a standalone service that integrates seamlessly with the core HaulSync platform via shared infrastructure and APIs.

---

## ✨ FTL Module Overview

| Module | Description |
|--------|-------------|
| 📋 **Truck Indenting** | Contract-based auto-indenting with configurable business rules per lane/vendor |
| 🏷️ **RFQ & Bidding** | Multi-vendor RFQ broadcast, bid collection, and auto-closure on deadline |
| ⚖️ **L1/L2 Rate Optimization** | Automatic lowest-rate selection with eligibility filtering and fallback logic |
| 🗺️ **Real-Time Tracking** | 60+ GPS integrations, live ETAs, geofencing, and route deviation detection |
| 🤖 **AI Exception Alerts** | ML-driven anomaly detection for delays, stoppages, and SLA breach risk |
| 📄 **Digital POD** | Mobile-captured proof of delivery with photo, e-signature, and auto-validation |
| 🧾 **LR & E-Way Bill** | Auto-generated Lorry Receipts and e-way bill integration at trip closure |
| 💰 **Freight Billing** | Automated invoice generation from actuals — distance, weight, and agreed rate |
| 🔁 **Reconciliation** | Invoice-vs-contract matching, deduction handling, and dispute flagging |
| 💳 **Payment Automation** | Configurable payment triggers post-reconciliation approval |
| 📊 **FTL Analytics** | Lane-wise cost trends, transporter scorecards, on-time performance dashboards |

---

## 🏗️ Architecture

This repo follows the same monorepo structure as the core HaulSync platform.

```
haulsync-tos-ftl/
├── backend/                    # Node.js + Express + Prisma API
│   ├── src/
│   │   ├── modules/
│   │   │   ├── indenting/      # Indent creation, contract rules engine
│   │   │   ├── rfq/            # RFQ lifecycle, bid management, L1/L2 engine
│   │   │   ├── tracking/       # GPS adapter layer, geofence, ETA engine
│   │   │   ├── exceptions/     # AI alert engine, SLA monitoring
│   │   │   ├── pod/            # POD capture, LR generation, e-way bill
│   │   │   ├── billing/        # Invoice generation, freight reconciliation
│   │   │   └── settlement/     # Payment triggers, ledger management
│   │   ├── integrations/
│   │   │   ├── gps/            # Adapters for 60+ GPS providers
│   │   │   ├── eway/           # NIC e-way bill API integration
│   │   │   └── payments/       # Payment gateway connectors
│   │   └── shared/             # Middleware, utils, base models
│   └── prisma/
│       ├── schema.prisma
│       └── seed.js
├── frontend/                   # React + Vite + Tailwind SPA
│   └── src/
│       ├── pages/
│       │   ├── Indenting/
│       │   ├── RFQ/
│       │   ├── Tracking/
│       │   ├── POD/
│       │   ├── Billing/
│       │   └── Analytics/
│       └── components/
├── docs/                       # Architecture & API documentation
├── docker-compose.yml
└── .env.example
```

**Tech Stack** — identical to the core HaulSync platform:

| Layer | Technology |
|-------|------------|
| **Backend** | Node.js 18, Express.js, Prisma ORM, PostgreSQL 15, Socket.io |
| **Frontend** | React 18, Vite, Tailwind CSS, React Router v6, Recharts |
| **Auth** | JWT + bcrypt (shared session with HaulSync core if co-deployed) |
| **Realtime** | Socket.io for live tracking events and exception push alerts |
| **Infra** | Docker, Docker Compose, Nginx (reverse proxy) |

---

## 🔄 FTL Lifecycle — How It Works

```
Indent Created
      │
      ▼
RFQ Broadcast to Vendors
      │
      ▼
Bids Collected → L1/L2 Engine Ranks & Awards
      │
      ▼
Truck & Driver Assigned → Trip Created
      │
      ▼
Real-Time Tracking (GPS + Geofencing + AI Alerts)
      │
      ▼
Delivery → Digital POD Captured → LR + E-Way Bill Closed
      │
      ▼
Invoice Auto-Generated → Reconciled → Payment Released
```

---

## 🚀 Quick Start (Docker — Recommended)

### Prerequisites
- Docker 24+
- Docker Compose v2+
- *(Optional)* Running HaulSync core instance for shared master data

### 1. Clone the repository

```bash
git clone https://github.com/your-org/haulsync-tos-ftl.git
cd haulsync-tos-ftl
```

### 2. Configure environment

```bash
cp .env.example .env
# Edit .env — set DB credentials, JWT secret, GPS provider keys, e-way bill API keys
nano .env
```

Key environment variables:

```env
# Database
DATABASE_URL=postgresql://user:password@localhost:5432/haulsync_ftl

# Auth (use same JWT_SECRET as HaulSync core for SSO)
JWT_SECRET=your-secret-key

# GPS Integrations
GPS_PROVIDER=vamosys           # or: locus, uffizio, trackpoint, custom
GPS_API_KEY=your-gps-api-key

# E-Way Bill (NIC)
EWAY_CLIENT_ID=your-client-id
EWAY_CLIENT_SECRET=your-client-secret
EWAY_GSTIN=your-gstin

# HaulSync Core (optional — for shared master data)
HAULSYNC_CORE_URL=http://localhost:5000
HAULSYNC_CORE_API_KEY=your-core-api-key
```

### 3. Launch all services

```bash
docker compose up -d
```

### 4. Run database migrations & seed

```bash
docker compose exec backend npx prisma migrate deploy
docker compose exec backend node prisma/seed.js
```

### 5. Access the app

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5001
- **Default login**: `admin@haulsync.local` / `Admin@1234`

---

## 🛠️ Manual Setup (Development)

### Prerequisites
- Node.js 18+
- PostgreSQL 15+
- npm or yarn

### Backend

```bash
cd backend
cp .env.example .env
npm install
npx prisma migrate dev
node prisma/seed.js
npm run dev
# API runs on http://localhost:5001
```

### Frontend

```bash
cd frontend
cp .env.example .env
npm install
npm run dev
# UI runs on http://localhost:5174
```

---

## 🔌 GPS Provider Integrations

HaulSync TOS FTL ships with a pluggable GPS adapter layer. Supported providers out of the box:

| Provider | Status |
|----------|--------|
| Vamosys | ✅ Supported |
| Locus | ✅ Supported |
| Uffizio | ✅ Supported |
| TrackPoint | ✅ Supported |
| Rosmerta | ✅ Supported |
| Rivigo ATOM | ✅ Supported |
| Custom webhook | ✅ Supported |

To add a new GPS provider, implement the `IGPSAdapter` interface in `backend/src/integrations/gps/` and register it in the provider registry. See [GPS Integration Guide](docs/GPS_INTEGRATION.md).

---

## 🧠 L1/L2 Rate Optimization Engine

The rate engine ranks vendor bids and awards automatically. Configuration is per-lane and per-indent-type:

```json
{
  "lane": "MUM-DEL",
  "truckType": "32FT_SXL",
  "eligibilityFilters": {
    "minSLAScore": 75,
    "approvedVendorsOnly": true,
    "truckTypeMatch": true
  },
  "awardStrategy": "L1_AUTO",
  "fallbackStrategy": "L2_AUTO",
  "rfqWindowMinutes": 45
}
```

Award strategies supported: `L1_AUTO`, `L1_MANUAL_APPROVAL`, `NEGOTIATED`, `CONTRACT_RATE`.

---

## 🔐 Default Roles

| Role | Permissions |
|------|-------------|
| `SUPER_ADMIN` | Full access to all FTL modules and configuration |
| `ADMIN` | All operations except user management and rate config |
| `MANAGER` | Create/manage indents, RFQs, approve invoices, view analytics |
| `OPERATOR` | Create trips, update tracking, capture POD |
| `FINANCE` | Invoice review, reconciliation, payment approval |
| `VIEWER` | Read-only access to assigned modules |
| `TRANSPORTER` | View RFQs assigned to them, submit bids, update trip status |

---

## 🔗 Integration with HaulSync Core

HaulSync TOS FTL is designed to run standalone or as part of the broader HaulSync platform.

**Standalone mode**: Uses its own user, vendor, and vehicle master. Fully self-contained.

**Integrated mode**: Connects to a running HaulSync core instance to share:
- Transporter / broker master data
- Vehicle and driver registry
- Route and location masters
- User accounts and RBAC (single sign-on via shared JWT)

Set `HAULSYNC_CORE_URL` in `.env` to enable integrated mode.

---

## 📖 Documentation

- [API Reference](docs/API.md)
- [Deployment Guide](docs/DEPLOYMENT.md)
- [Architecture Overview](docs/ARCHITECTURE.md)
- [GPS Integration Guide](docs/GPS_INTEGRATION.md)
- [L1/L2 Engine Configuration](docs/RATE_ENGINE.md)
- [E-Way Bill Setup](docs/EWAY_BILL.md)
- [Contributing Guide](CONTRIBUTING.md)

---

## 🤝 Contributing

Contributions are welcome! Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

```bash
# Fork the repo, then:
git checkout -b feature/your-feature-name
git commit -m "feat: add your feature"
git push origin feature/your-feature-name
# Open a Pull Request
```

---

## 📜 License

MIT License — see [LICENSE](LICENSE) for details.

---

## 🙏 Acknowledgements

Part of the HaulSync open-source logistics ecosystem. Built with ❤️ for the freight community.
