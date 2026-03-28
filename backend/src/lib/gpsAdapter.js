/**
 * GPS Adapter — provider abstraction layer
 *
 * Normalises raw GPS payloads from any provider into the
 * standard HaulSync tracking event format.
 *
 * Set GPS_PROVIDER in .env to activate a provider.
 * Use GPS_PROVIDER=mock for local development.
 */

const PROVIDER = process.env.GPS_PROVIDER || 'mock';

// ── Provider implementations ──────────────────────────────────────────────────

const providers = {

  mock: {
    normalise: (payload) => payload, // already normalised
    verifySignature: () => true,
  },

  vamosys: {
    normalise: (payload) => ({
      deviceId:  payload.deviceId || payload.device_id,
      latitude:  parseFloat(payload.latitude  || payload.lat),
      longitude: parseFloat(payload.longitude || payload.lng),
      speedKmph: parseFloat(payload.speed     || payload.spd || 0),
      timestamp: payload.timestamp ? new Date(payload.timestamp) : new Date(),
      rawPayload: payload,
    }),
    verifySignature: (req) => {
      return req.headers['x-vamosys-token'] === process.env.GPS_WEBHOOK_SECRET;
    },
  },

  locus: {
    normalise: (payload) => ({
      deviceId:  payload.vehicleId,
      latitude:  parseFloat(payload.location?.lat),
      longitude: parseFloat(payload.location?.lng),
      speedKmph: parseFloat(payload.speedKmph || 0),
      timestamp: payload.recordedAt ? new Date(payload.recordedAt) : new Date(),
      rawPayload: payload,
    }),
    verifySignature: (req) => {
      return req.headers['x-locus-secret'] === process.env.GPS_WEBHOOK_SECRET;
    },
  },

  uffizio: {
    normalise: (payload) => ({
      deviceId:  payload.imei || payload.device_id,
      latitude:  parseFloat(payload.lat),
      longitude: parseFloat(payload.lon),
      speedKmph: parseFloat(payload.speed || 0),
      timestamp: payload.dt_tracker ? new Date(payload.dt_tracker * 1000) : new Date(),
      rawPayload: payload,
    }),
    verifySignature: (req) => {
      return req.query.secret === process.env.GPS_WEBHOOK_SECRET;
    },
  },

  trackpoint: {
    normalise: (payload) => ({
      deviceId:  payload.unit_id,
      latitude:  parseFloat(payload.lat),
      longitude: parseFloat(payload.lon),
      speedKmph: parseFloat(payload.speed || 0),
      timestamp: payload.event_time ? new Date(payload.event_time) : new Date(),
      rawPayload: payload,
    }),
    verifySignature: (req) => {
      return req.headers['x-api-key'] === process.env.GPS_API_KEY;
    },
  },

  rosmerta: {
    normalise: (payload) => ({
      deviceId:  payload.deviceId,
      latitude:  parseFloat(payload.lat),
      longitude: parseFloat(payload.lng),
      speedKmph: parseFloat(payload.speed || 0),
      timestamp: payload.time ? new Date(payload.time) : new Date(),
      rawPayload: payload,
    }),
    verifySignature: () => true, // Rosmerta uses IP whitelisting
  },

  rivigo: {
    normalise: (payload) => ({
      deviceId:  payload.vehicle_number,
      latitude:  parseFloat(payload.latitude),
      longitude: parseFloat(payload.longitude),
      speedKmph: parseFloat(payload.speed || 0),
      timestamp: payload.gps_time ? new Date(payload.gps_time) : new Date(),
      rawPayload: payload,
    }),
    verifySignature: (req) => {
      return req.headers['authorization'] === `Bearer ${process.env.GPS_WEBHOOK_SECRET}`;
    },
  },

  custom: {
    // Expects payload already in normalised format:
    // { deviceId, latitude, longitude, speedKmph, timestamp }
    normalise: (payload) => payload,
    verifySignature: (req) => {
      return req.headers['x-webhook-secret'] === process.env.GPS_WEBHOOK_SECRET;
    },
  },
};

// ── Public interface ──────────────────────────────────────────────────────────

/**
 * Normalise a raw GPS payload from the configured provider.
 * @param {object} rawPayload
 * @returns {{ deviceId, latitude, longitude, speedKmph, timestamp, rawPayload }}
 */
function normalise(rawPayload) {
  const adapter = providers[PROVIDER] || providers.mock;
  return adapter.normalise(rawPayload);
}

/**
 * Verify the webhook signature for the configured provider.
 * @param {Express.Request} req
 * @returns {boolean}
 */
function verifySignature(req) {
  const adapter = providers[PROVIDER] || providers.mock;
  return adapter.verifySignature(req);
}

/**
 * Get the name of the active GPS provider.
 * @returns {string}
 */
function activeProvider() {
  return PROVIDER;
}

module.exports = { normalise, verifySignature, activeProvider };
