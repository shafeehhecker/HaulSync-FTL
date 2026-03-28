/**
 * GPS Webhook receiver
 * Registered in server.js as /api/integrations/gps
 *
 * GPS providers POST raw payloads here.
 * The adapter normalises them and writes TripTrackingEvents.
 */

const express = require('express');
const gpsAdapter = require('../../lib/gpsAdapter');

const router = express.Router();
const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();

// POST /api/integrations/gps/webhook/:provider
// Called by the GPS provider with raw location data.
router.post('/webhook/:provider', async (req, res) => {
  try {
    // Verify signature
    if (!gpsAdapter.verifySignature(req)) {
      return res.status(401).json({ message: 'Invalid webhook signature' });
    }

    const event = gpsAdapter.normalise(req.body);

    if (!event.deviceId || !event.latitude || !event.longitude) {
      return res.status(400).json({ message: 'Missing required fields: deviceId, latitude, longitude' });
    }

    // Look up the active trip for this GPS device
    const vehicle = await prisma.vehicle.findFirst({
      where: { gpsDeviceId: event.deviceId, isActive: true },
    });

    if (!vehicle) {
      // Unknown device — still return 200 to avoid provider retries
      return res.status(200).json({ message: 'Device not registered', deviceId: event.deviceId });
    }

    // Find the active trip for this vehicle
    const trip = await prisma.ftlTrip.findFirst({
      where: {
        vehicleId: vehicle.id,
        status: { in: ['IN_TRANSIT', 'AT_PICKUP', 'AT_DELIVERY', 'ASSIGNED'] },
      },
    });

    if (!trip) {
      return res.status(200).json({ message: 'No active trip for vehicle', vehicleId: vehicle.id });
    }

    // Write tracking event
    const trackingEvent = await prisma.tripTrackingEvent.create({
      data: {
        tripId:     trip.id,
        eventType:  'GPS_UPDATE',
        location:   `${event.latitude.toFixed(4)},${event.longitude.toFixed(4)}`,
        latitude:   event.latitude,
        longitude:  event.longitude,
        speedKmph:  event.speedKmph || 0,
        gpsProvider: req.params.provider,
        recordedAt: event.timestamp || new Date(),
      },
    });

    // Auto-raise HALT exception if speed = 0 for this event and trip is IN_TRANSIT
    if (event.speedKmph === 0 && trip.status === 'IN_TRANSIT') {
      const recentHalt = await prisma.tripException.findFirst({
        where: { tripId: trip.id, type: 'HALT', status: { in: ['OPEN', 'ACKNOWLEDGED'] } },
      });
      if (!recentHalt) {
        await prisma.tripException.create({
          data: {
            tripId:   trip.id,
            type:     'HALT',
            severity: 'MEDIUM',
            message:  `Vehicle halted — speed 0 km/h reported by ${req.params.provider}`,
            location: `${event.latitude.toFixed(4)}, ${event.longitude.toFixed(4)}`,
            status:   'OPEN',
          },
        });
      }
    }

    // Push to connected clients via Socket.io
    const io = req.app.get('io');
    if (io) {
      io.to(`trip_${trip.id}`).emit('gps_event', trackingEvent);
    }

    res.status(200).json({ received: true, tripId: trip.id });
  } catch (err) {
    console.error('GPS webhook error:', err.message);
    res.status(500).json({ message: 'Internal error processing GPS event' });
  }
});

// GET /api/integrations/gps/status — health check for GPS integration
router.get('/status', (req, res) => {
  res.json({
    provider: gpsAdapter.activeProvider(),
    status: 'active',
    webhookUrl: `/api/integrations/gps/webhook/${gpsAdapter.activeProvider()}`,
  });
});

module.exports = router;
