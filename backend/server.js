require('dotenv').config();
const express   = require('express');
const cors      = require('cors');
const morgan    = require('morgan');
const http      = require('http');
const { Server} = require('socket.io');
const path      = require('path');

const { errorHandler } = require('./src/middleware/errorHandler');

// Routes
const authRoutes       = require('./src/routes/auth');
const usersRoutes      = require('./src/routes/users');
const companiesRoutes  = require('./src/routes/companies');
const indentRoutes     = require('./src/routes/indents');
const rfqRoutes        = require('./src/routes/rfq');
const trackingRoutes   = require('./src/routes/tracking');
const exceptionsRoutes = require('./src/routes/exceptions');
const podRoutes        = require('./src/routes/pod');
const billingRoutes    = require('./src/routes/billing');
const settlementRoutes = require('./src/routes/settlement');
const analyticsRoutes  = require('./src/routes/analytics');
const fleetRoutes      = require('./src/routes/fleet');
const gpsWebhookRoutes = require('./src/integrations/gps/webhookRouter');

const app    = express();
const server = http.createServer(app);

// ── CORS origins ──────────────────────────────────────────────────────────────
// Accepts comma-separated list: FRONTEND_URL=http://localhost:3001,http://localhost:5174
const rawOrigins = process.env.FRONTEND_URL || 'http://localhost:5174';
const allowedOrigins = rawOrigins.split(',').map((o) => o.trim()).filter(Boolean);

const corsOptions = {
  origin: (origin, callback) => {
    // Allow requests with no origin (curl, Postman, mobile apps)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error(`CORS: origin ${origin} not allowed`));
  },
  credentials: true,
};

const io = new Server(server, {
  cors: { origin: allowedOrigins, methods: ['GET', 'POST'], credentials: true },
});

app.set('io', io);

// ── Middleware ────────────────────────────────────────────────────────────────
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true }));
app.use(morgan('dev'));
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ── Health ────────────────────────────────────────────────────────────────────
app.get('/health', (req, res) =>
  res.json({ status: 'ok', service: 'HaulSync TOS FTL API', version: '1.0.0' })
);

// ── API Routes ────────────────────────────────────────────────────────────────
app.use('/api/auth',       authRoutes);
app.use('/api/users',      usersRoutes);
app.use('/api/companies',  companiesRoutes);
app.use('/api/ftl/indents',    indentRoutes);
app.use('/api/ftl/rfqs',       rfqRoutes);
app.use('/api/ftl/tracking',   trackingRoutes);
app.use('/api/ftl/exceptions', exceptionsRoutes);
app.use('/api/ftl/pod',        podRoutes);
app.use('/api/ftl/billing',    billingRoutes);
app.use('/api/ftl/settlement', settlementRoutes);
app.use('/api/ftl/analytics',  analyticsRoutes);
app.use('/api/fleet',          fleetRoutes);
app.use('/api/integrations/gps', gpsWebhookRoutes);

// ── Socket.io ─────────────────────────────────────────────────────────────────
io.on('connection', (socket) => {
  console.log(`📡 Client connected: ${socket.id}`);

  socket.on('join_trip', (tripId) => {
    socket.join(`trip_${tripId}`);
  });
  socket.on('leave_trip', (tripId) => {
    socket.leave(`trip_${tripId}`);
  });
  socket.on('subscribe_exceptions', () => {
    socket.join('exceptions');
  });
  socket.on('disconnect', () => {
    console.log(`Client disconnected: ${socket.id}`);
  });
});

app.use(errorHandler);

const PORT = process.env.PORT || 5001;
server.listen(PORT, () => {
  console.log(`\n🚛 HaulSync TOS FTL API  →  http://localhost:${PORT}`);
  console.log(`📖 Health check          →  http://localhost:${PORT}/health\n`);
});

module.exports = { app, io };
