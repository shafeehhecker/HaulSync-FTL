# HaulSync TOS FTL — API Reference

Base URL: `http://localhost:5001/api`

All protected endpoints require `Authorization: Bearer <token>` header.

---

## Auth

### `POST /auth/login`
```json
{ "email": "admin@haulsync.local", "password": "Admin@1234" }
```
Returns `{ token, user }`.

### `GET /auth/me`
Returns current authenticated user.

### `POST /auth/change-password`
```json
{ "currentPassword": "...", "newPassword": "..." }
```

---

## Indents — `/ftl/indents`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/ftl/indents` | All | List indents. Query: `status`, `contractType`, `search`, `page`, `limit` |
| GET | `/ftl/indents/:id` | All | Get single indent with linked RFQ and trip |
| POST | `/ftl/indents` | MANAGER+ | Create indent |
| PUT | `/ftl/indents/:id` | MANAGER+ | Update indent |
| DELETE | `/ftl/indents/:id` | MANAGER+ | Cancel indent (soft) |

**Create body:**
```json
{
  "originCity": "Mumbai", "originState": "Maharashtra",
  "destCity": "Delhi", "destState": "Delhi",
  "vehicleType": "TRUCK_32FT_SXL",
  "quantity": 2, "weightTonnes": 12,
  "contractType": "CONTRACT",
  "loadingDate": "2025-04-01T06:00:00Z",
  "notes": "Handle with care"
}
```

---

## RFQ & Bids — `/ftl/rfqs`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/ftl/rfqs` | All | List RFQs (transporters see only their bids) |
| GET | `/ftl/rfqs/:id` | All | Get RFQ with all bids ranked |
| POST | `/ftl/rfqs` | MANAGER+ | Publish new RFQ |
| POST | `/ftl/rfqs/:id/bids` | TRANSPORTER | Submit a bid |
| POST | `/ftl/rfqs/:id/award` | MANAGER+ | Manually trigger L1/L2 award |
| PUT | `/ftl/rfqs/:id/cancel` | MANAGER+ | Cancel RFQ |

**Publish RFQ body:**
```json
{
  "originCity": "Mumbai", "originState": "Maharashtra",
  "destCity": "Delhi", "destState": "Delhi",
  "vehicleType": "TRUCK_32FT_SXL", "quantity": 1,
  "loadingDate": "2025-04-01T06:00:00Z",
  "awardStrategy": "L1_AUTO",
  "rfqWindowMinutes": 45,
  "minSLAScore": 70,
  "indentId": "<optional>"
}
```

**Submit bid body:**
```json
{ "rateAmount": 28500, "notes": "Can load by 8am" }
```

---

## Tracking — `/ftl/tracking`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/ftl/tracking/active` | All | All non-completed trips with latest GPS event |
| GET | `/ftl/tracking/trips` | All | Paginated trip list. Query: `status`, `search` |
| GET | `/ftl/tracking/trips/:id` | All | Full trip detail with events, exceptions, POD |
| POST | `/ftl/tracking/trips` | OPERATOR+ | Create trip manually |
| PUT | `/ftl/tracking/trips/:id/status` | OPERATOR+ | Update trip status + create tracking event |
| POST | `/ftl/tracking/trips/:id/events` | OPERATOR+ | Push raw GPS event |

**Update status body:**
```json
{
  "status": "IN_TRANSIT",
  "location": "Nagpur bypass, NH-44",
  "latitude": 21.145, "longitude": 79.088,
  "speedKmph": 68
}
```

---

## Exceptions — `/ftl/exceptions`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/ftl/exceptions` | All | List exceptions. Query: `status`, `severity`, `type` |
| GET | `/ftl/exceptions/:id` | All | Get exception detail |
| GET | `/ftl/exceptions/trip/:tripId` | All | All exceptions for a trip |
| POST | `/ftl/exceptions` | OPERATOR+ | Raise exception manually |
| PUT | `/ftl/exceptions/:id/acknowledge` | OPERATOR+ | Acknowledge |
| PUT | `/ftl/exceptions/:id/resolve` | OPERATOR+ | Resolve with note |
| PUT | `/ftl/exceptions/:id/escalate` | MANAGER+ | Escalate |

**Exception types:** `DELAY` `DEVIATION` `SLA_BREACH` `GPS_LOSS` `HALT` `BREAKDOWN` `OTHER`
**Severities:** `LOW` `MEDIUM` `HIGH` `CRITICAL`

---

## POD & Documentation — `/ftl/pod`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/ftl/pod` | All | List PODs. Query: `status` |
| GET | `/ftl/pod/:tripId` | All | Get POD for trip |
| POST | `/ftl/pod/:tripId/capture` | OPERATOR+ | Capture POD (multipart/form-data) |
| PUT | `/ftl/pod/:tripId/verify` | MANAGER+ | Verify POD, completes trip |
| PUT | `/ftl/pod/:tripId/dispute` | MANAGER+ | Dispute POD |

**Capture POD** — `Content-Type: multipart/form-data`:
```
receiverName     string
receiverPhone    string
lrNumber         string
ewayBillNo       string
notes            string
images           file[]   (jpg/png/webp/pdf, max 5MB each, up to 5 files)
```
On capture: trip status → `POD_CAPTURED`, invoice auto-generated at `agreedRate`.

---

## Billing — `/ftl/billing`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/ftl/billing/invoices` | All | List invoices. Query: `status`, `vendorId` |
| GET | `/ftl/billing/invoices/:id` | All | Get invoice with reconciliation flag |
| PUT | `/ftl/billing/invoices/:id` | FINANCE+ | Update amounts / deductions |
| PUT | `/ftl/billing/invoices/:id/approve` | FINANCE+ | Approve invoice |
| PUT | `/ftl/billing/invoices/:id/dispute` | FINANCE+ | Dispute with reason |
| POST | `/ftl/billing/invoices/:id/resubmit` | TRANSPORTER | Resubmit after dispute |
| GET | `/ftl/billing/summary` | FINANCE+ | Aggregate financial summary |

---

## Settlement — `/ftl/settlement`

| Method | Path | Roles | Description |
|--------|------|-------|-------------|
| GET | `/ftl/settlement` | FINANCE+ | List settlements. Query: `status`, `vendorId` |
| GET | `/ftl/settlement/:id` | FINANCE+ | Get settlement with invoices |
| POST | `/ftl/settlement` | FINANCE+ | Bundle approved invoices into settlement |
| PUT | `/ftl/settlement/:id/initiate` | FINANCE+ | Initiate payment (→ PROCESSING) |
| PUT | `/ftl/settlement/:id/paid` | FINANCE+ | Mark paid, record bank ref |
| PUT | `/ftl/settlement/:id/fail` | FINANCE+ | Mark failed |
| GET | `/ftl/settlement/summary/overview` | FINANCE+ | Payment summary aggregates |

**Create settlement body:**
```json
{
  "vendorId": "<uuid>",
  "invoiceIds": ["<uuid>", "<uuid>"],
  "paymentMethod": "RTGS",
  "notes": "March batch payment"
}
```

---

## Analytics — `/ftl/analytics`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/ftl/analytics/dashboard` | Dashboard KPIs + recent trips + open exceptions |
| GET | `/ftl/analytics` | Chart data — monthly volume, on-time by vendor, cost by lane, vendor share |

---

## Fleet — `/fleet`

| Method | Path | Description |
|--------|------|-------------|
| GET | `/fleet/vehicles` | List vehicles. Query: `type`, `companyId`, `search` |
| POST | `/fleet/vehicles` | Create vehicle |
| PUT | `/fleet/vehicles/:id` | Update vehicle |
| DELETE | `/fleet/vehicles/:id` | Deactivate vehicle |
| GET | `/fleet/drivers` | List drivers. Query: `companyId`, `search` |
| POST | `/fleet/drivers` | Create driver |
| PUT | `/fleet/drivers/:id` | Update driver |
| DELETE | `/fleet/drivers/:id` | Deactivate driver |

---

## Socket.io Events

Connect to `http://localhost:5001` with a valid JWT in the auth handshake.

| Event (emit) | Payload | Description |
|---|---|---|
| `join_trip` | `tripId` | Subscribe to live updates for a trip |
| `leave_trip` | `tripId` | Unsubscribe |
| `subscribe_exceptions` | — | Subscribe to all exception events |

| Event (receive) | Payload | Description |
|---|---|---|
| `trip_update` | `{ tripId, status, location }` | Trip status changed |
| `gps_event` | `TripTrackingEvent` | New GPS event recorded |
| `new_bid` | `VendorBid` | New bid submitted on an RFQ |
| `new_exception` | `TripException` | Exception raised |
| `exception_updated` | `TripException` | Exception acknowledged/resolved |
