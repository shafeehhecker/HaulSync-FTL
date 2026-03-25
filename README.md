# 🚛 HaulSync — Full Truck Load (FTL) Management

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

```
haulsync-tos-ftl/
├── backend/
│   ├── src/
│   │   ├── routes/
│   │   │   ├── indents.js       # Indent creation & management
│   │   │   ├── rfq.js           # RFQ lifecycle, L1/L2 engine
│   │   │   ├── tracking.js      # GPS events, trip status
│   │   │   ├── exceptions.js    # Exception raise/resolve
│   │   │   ├── pod.js           # POD capture, image upload
│   │   │   ├── billing.js       # Invoice & reconciliation
│   │   │   ├── settlement.js    # Payment settlement
│   │   │   ├── analytics.js     # FTL KPIs & charts
│   │   │   ├── fleet.js         # Vehicles & drivers
│   │   │   ├── companies.js     # Vendor/shipper master
│   │   │   ├── users.js         # User management
│   │   │   └── auth.js          # Login, JWT
│   │   ├── integrations/
│   │   │   ├── gps/             # Pluggable GPS adapters
│   │   │   └── eway/            # NIC e-way bill client
│   │   ├── lib/
│   │   │   └── gpsAdapter.js    # GPS provider abstraction
│   │   └── middleware/
│   │       ├── auth.js
│   │       └── errorHandler.js
│   ├── prisma/
│   │   ├── schema.prisma
│   │   └── seed.js
│   ├── uploads/pods/            # POD image storage
│   ├── server.js
│   ├── package.json
│   └── Dockerfile
├── frontend/
│   └── src/
│       ├── pages/
│       │   ├── Dashboard.jsx
│       │   ├── Login.jsx
│       │   ├── Indenting/
│       │   ├── RFQ/
│       │   ├── Tracking/
│       │   ├── Exceptions/
│       │   ├── POD/
│       │   ├── Billing/
│       │   ├── Settlement/
│       │   └── Analytics/
│       ├── components/
│       │   ├── Layout/
│       │   └── common/
│       ├── api/client.js
│       └── context/AuthContext.jsx
├── docs/
│   ├── API.md
│   ├── ARCHITECTURE.md
│   ├── DEPLOYMENT.md
│   ├── GPS_INTEGRATION.md
│   ├── RATE_ENGINE.md
│   └── EWAY_BILL.md
├── docker-compose.yml
├── .env.example
├── CONTRIBUTING.md
└── LICENSE
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

The backend automatically runs migrations and seeds on first boot.

### 4. Access the app

- **Frontend**: http://localhost:3001
- **Backend API**: http://localhost:5001
- **Health check**: http://localhost:5001/health

### Default credentials

| Email | Password | Role |
|-------|----------|------|
| `admin@haulsync.local` | `Admin@1234` | SUPER_ADMIN |
| `manager@haulsync.local` | `Mgr@1234` | MANAGER |
| `finance@haulsync.local` | `Finance@1234` | FINANCE |
| `transporter@haulsync.local` | `Trans@1234` | TRANSPORTER |

---

## 🛠️ Manual Setup (Development)

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

HaulSync TOS FTL ships with a pluggable GPS adapter layer (`backend/src/lib/gpsAdapter.js`). Supported providers out of the box:

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
  "truckType": "TRUCK_32FT_SXL",
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

Award strategies: `L1_AUTO`, `L1_MANUAL_APPROVAL`, `NEGOTIATED`, `CONTRACT_RATE`.

See [L1/L2 Engine Configuration](docs/RATE_ENGINE.md) for full reference.

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

**Integrated mode**: Connects to a running HaulSync core instance to share transporter/broker master data, vehicle and driver registry, route and location masters, and user accounts with RBAC via shared JWT.

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

Contributions are welcome but AI generated PRs are discouraged . Please read [CONTRIBUTING.md](CONTRIBUTING.md) first.

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
