# Architecture Overview

## System Diagram

```
┌─────────────────────────────────────────────────────┐
│                   Browser / Mobile                  │
│              React SPA  (port 3001)                 │
└────────────────────────┬────────────────────────────┘
                         │  HTTP + WebSocket
┌────────────────────────▼────────────────────────────┐
│           Nginx Reverse Proxy (Docker)              │
└──────────┬─────────────────────────┬────────────────┘
           │ /api/*                  │ /
┌──────────▼──────────┐   ┌──────────▼──────────────┐
│   Express API        │   │   Static Frontend        │
│   Node.js 18         │   │   (Vite build)           │
│   port 5001          │   └─────────────────────────┘
│                      │
│   Routes             │
│   ├─ /ftl/indents    │
│   ├─ /ftl/rfqs       │
│   ├─ /ftl/tracking   │
│   ├─ /ftl/exceptions │
│   ├─ /ftl/pod        │
│   ├─ /ftl/billing    │
│   ├─ /ftl/settlement │
│   ├─ /ftl/analytics  │
│   └─ /fleet          │
│                      │
│   Socket.io server   │───── real-time push ──────▶ Browser
└──────────┬───────────┘
           │ Prisma ORM
┌──────────▼───────────┐     ┌────────────────────────┐
│   PostgreSQL 15       │     │   File Storage          │
│   port 5432           │     │   uploads/pods/         │
│                       │     │   (POD images)          │
│   14 models           │     └────────────────────────┘
└───────────────────────┘
```

## Request Lifecycle

1. Browser sends `Authorization: Bearer <jwt>` header with every API request
2. `authenticate` middleware verifies JWT, loads user from DB, attaches to `req.user`
3. Route handler executes business logic via Prisma ORM
4. Real-time side-effects are emitted via Socket.io (`req.app.get('io')`)
5. Errors propagate to `errorHandler` middleware which normalises Prisma and HTTP errors

## L1/L2 Engine Flow

```
POST /ftl/rfqs/:id/bids  (vendor submits bid)
        │
        ▼
VendorBid created in DB (status: PENDING)

POST /ftl/rfqs/:id/award  OR  RFQ window expires on GET
        │
        ▼
rankAndAward(rfqId)
        │
        ├── Filter bids where slaScore >= minSLAScore
        ├── Sort ascending by rateAmount  →  [L1, L2, L3 ...]
        ├── Assign rank field (1, 2, 3...)
        ├── Set L1 status = AWARDED
        ├── Set L2 status = STANDBY
        ├── Set L3+ status = REJECTED
        ├── Update FtlRFQ: status=AWARDED, awardedBidId=L1.id
        └── If awardStrategy=L1_AUTO → create FtlTrip for L1 vendor
```

## Data Model Relationships

```
Indent ──1:1──▶ FtlRFQ ──1:N──▶ VendorBid
                   │
                   └──1:1──▶ FtlTrip ──1:N──▶ TripTrackingEvent
                                  │   ──1:N──▶ TripException
                                  │   ──1:1──▶ TripPOD
                                  └───1:1──▶ FtlInvoice ──N:1──▶ Settlement
```

## Socket.io Rooms

| Room | Joined by | Events received |
|------|-----------|-----------------|
| `trip_<id>` | UI on trip detail page | `trip_update`, `gps_event` |
| `rfq_<id>` | UI on RFQ detail page | `new_bid` |
| `exceptions` | Dashboard, exceptions page | `new_exception`, `exception_updated` |

## GPS Adapter Layer

GPS providers push location data via webhook or polling. The `IGPSAdapter` interface normalises all providers into a single event format that gets written as `TripTrackingEvent` records and emitted via Socket.io.

```
GPS Provider Webhook
        │
        ▼
POST /integrations/gps/webhook/:provider
        │
        ▼
gpsAdapter.normalise(payload) → { tripId, lat, lng, speed, timestamp }
        │
        ▼
TripTrackingEvent.create()
        │
        ▼
io.to(`trip_${tripId}`).emit('gps_event', event)
```
