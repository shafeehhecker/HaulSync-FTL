# E-Way Bill Integration

## Overview

HaulSync TOS FTL integrates with the NIC (National Informatics Centre) E-Way Bill portal to auto-generate and validate e-way bills at trip closure.

E-way bills are linked to trips and PODs. The `ewayBillNo` and `ewayBillExpiry` fields on `FtlTrip` and `TripPOD` hold the bill details.

---

## Configuration

Set in `.env` / `docker-compose.yml`:

```env
EWAY_CLIENT_ID=your-nic-client-id
EWAY_CLIENT_SECRET=your-nic-client-secret
EWAY_GSTIN=29ABCDE1234F1Z5
```

Get credentials by registering at [https://ewaybillgst.gov.in](https://ewaybillgst.gov.in) under the API section.

---

## How It Works

1. When a trip is created (via indent/RFQ flow or manually), the `ewayBillNo` field can be pre-filled from the indent.
2. On POD capture (`POST /ftl/pod/:tripId/capture`), the e-way bill number is verified against the NIC API.
3. If `ewayBillExpiry` is within 6 hours, the system raises a warning exception automatically.
4. At trip completion, the bill is closed via the NIC API.

---

## Manual Entry (Without NIC Integration)

If NIC credentials are not configured, e-way bill numbers are stored as plain text — no validation is performed. This is the default behaviour in `mock` / development mode.

To enter manually, include `ewayBillNo` in the trip creation or POD capture payload:

```json
{
  "ewayBillNo": "EWB-291234567890",
  "ewayBillExpiry": "2025-04-02T23:59:59Z"
}
```

---

## E-Way Bill in the UI

The POD page displays the e-way bill number alongside the LR number for every trip. Both are included in the auto-generated invoice and visible in the billing module.

---

## Lorry Receipt (LR) Auto-Generation

LR numbers are generated automatically at trip creation:

```
LR-{YEAR}-{TRIP_SEQUENCE}
e.g. LR-2025-0841
```

The LR number is stored on `FtlTrip.lrNumber` and surfaced in POD, billing, and settlement views.
