# GPS Integration Guide

## Overview

HaulSync TOS FTL uses a pluggable adapter pattern. All GPS providers are normalised to a common event format before being stored as `TripTrackingEvent` records and pushed to connected clients via Socket.io.

## Supported Providers

| Provider | Type | `GPS_PROVIDER` value |
|----------|------|---------------------|
| Vamosys | Webhook push | `vamosys` |
| Locus | Webhook push | `locus` |
| Uffizio | Polling | `uffizio` |
| TrackPoint | Webhook push | `trackpoint` |
| Rosmerta | Webhook push | `rosmerta` |
| Rivigo ATOM | Webhook push | `rivigo` |
| Custom webhook | Webhook push | `custom` |
| Mock (dev) | Simulated | `mock` |

---

## Configuration

Set in `.env`:

```env
GPS_PROVIDER=vamosys
GPS_API_KEY=your-api-key
GPS_WEBHOOK_SECRET=your-webhook-signing-secret
```

---

## Webhook Endpoint

GPS providers that support push delivery should be configured to send events to:

```
POST https://your-api-domain.com/api/integrations/gps/webhook/{provider}
```

The system validates the `GPS_WEBHOOK_SECRET` from the request signature header (provider-specific header name is handled per-adapter).

---

## Implementing a New Provider

1. Create `backend/src/integrations/gps/<provider>.js`:

```js
// backend/src/integrations/gps/myprovider.js

/**
 * Normalise a raw webhook payload from MyProvider
 * into the standard HaulSync GPS event format.
 *
 * @param {object} payload  Raw webhook body
 * @returns {{ deviceId, latitude, longitude, speedKmph, timestamp, rawPayload }}
 */
function normalise(payload) {
  return {
    deviceId:  payload.device_id,
    latitude:  parseFloat(payload.lat),
    longitude: parseFloat(payload.lng),
    speedKmph: parseFloat(payload.spd_kmh),
    timestamp: new Date(payload.ts * 1000),
    rawPayload: payload,
  };
}

/**
 * Verify the webhook signature from MyProvider.
 * Return true if valid, false to reject.
 */
function verifySignature(req) {
  const sig = req.headers['x-myprovider-signature'];
  return sig === process.env.GPS_WEBHOOK_SECRET;
}

module.exports = { normalise, verifySignature };
```

2. Register it in `backend/src/lib/gpsAdapter.js` — add a case to the provider map.

3. Set `GPS_PROVIDER=myprovider` in `.env`.

---

## Mock Mode

When `GPS_PROVIDER=mock`, the system simulates GPS events for seeded trips. Useful for development and demos without real GPS hardware.

To trigger a mock event manually:

```bash
curl -X POST http://localhost:5001/api/ftl/tracking/trips/<tripId>/events \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{
    "eventType": "CHECKPOINT",
    "location": "Nagpur bypass, NH-44",
    "latitude": 21.145,
    "longitude": 79.088,
    "speedKmph": 68,
    "gpsProvider": "mock"
  }'
```

---

## Geofencing

Geofence triggers fire automatically when a trip's GPS coordinates cross a defined boundary. Configure geofence zones per origin/destination in the trip record. The system emits `GEOFENCE_ENTRY` and `GEOFENCE_EXIT` tracking events and can auto-advance trip status (e.g., `AT_PICKUP` on entry to origin zone, `AT_DELIVERY` on entry to destination zone).

Geofence configuration is managed via the Tracking page in the UI or the trip update API.
