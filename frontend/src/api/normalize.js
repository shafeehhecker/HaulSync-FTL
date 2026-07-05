// ─────────────────────────────────────────────────────────────────────────────
// normalize.js — adapters between the backend API shapes and the flat shapes
// the pages render.
//
// Why this exists:
//   1. Every list endpoint returns a pagination envelope { data, total, page,
//      limit }. Pages hold arrays in state, so we unwrap with listOf().
//   2. The API nests relations (invoice.vendor = { name }, exception.trip =
//      { tripNumber, driver: { name } }), while the pages render flat fields
//      (row.vendor, row.tripNumber). Each map*() flattens defensively so a
//      missing relation can never crash a render (no `undefined.toFixed`,
//      no objects as React children).
// Pure JS on purpose — no JSX — so it can be unit-tested with plain Node.
// ─────────────────────────────────────────────────────────────────────────────

/** Unwrap a list payload: accepts a bare array or a { data: [...] } envelope. */
export function listOf(payload) {
  if (Array.isArray(payload)) return payload;
  if (payload && Array.isArray(payload.data)) return payload.data;
  return [];
}

const DASH = '—';

/** '2026-07-05T09:30:00.000Z' → '2026-07-05' (falls back to DASH). */
export function fmtDate(v) {
  if (!v) return DASH;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return typeof v === 'string' ? v : DASH;
  return d.toISOString().slice(0, 10);
}

/** ISO string → 'YYYY-MM-DD HH:mm' local-ish display. */
export function fmtDateTime(v) {
  if (!v) return DASH;
  const d = new Date(v);
  if (Number.isNaN(d.getTime())) return typeof v === 'string' ? v : DASH;
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

/** ISO string → '3 min ago' style label. */
export function timeAgo(v) {
  if (!v) return DASH;
  const t = new Date(v).getTime();
  if (Number.isNaN(t)) return DASH;
  const mins = Math.max(0, Math.round((Date.now() - t) / 60000));
  if (mins < 1) return 'just now';
  if (mins < 60) return `${mins} min ago`;
  const hrs = Math.round(mins / 60);
  if (hrs < 24) return `${hrs} h ago`;
  return `${Math.round(hrs / 24)} d ago`;
}

/** Enum → display: 'TRUCK_32FT_SXL' → '32FT SXL', 'CONTAINER_20FT' → 'CONTAINER 20FT'. */
export function pretty(v) {
  if (!v) return DASH;
  return String(v).replace(/^TRUCK_/, '').replace(/_/g, ' ');
}

const num = (v, d = 0) => (typeof v === 'number' && Number.isFinite(v) ? v : d);
const str = (v, d = DASH) => (typeof v === 'string' && v.length ? v : d);
/** Relation object → its display name; string passes through. */
const nameOf = (v, d = DASH) =>
  typeof v === 'string' ? str(v, d) : str(v && v.name, d);

// ── Indents ──────────────────────────────────────────────────────────────────
export function mapIndent(i = {}) {
  return {
    ...i,
    id: i.id ?? String(Math.random()),
    indentNumber: str(i.indentNumber),
    lane: i.lane ?? `${str(i.originCity)} → ${str(i.destCity)}`,
    truckType: i.truckType ?? pretty(i.vehicleType),
    quantity: num(i.quantity, 1),
    contractType: str(i.contractType, 'CONTRACT'),
    vendor: nameOf(i.vendor),
    status: str(i.status, 'PENDING'),
    createdAt: fmtDate(i.createdAt),
  };
}

// ── RFQs & bids ──────────────────────────────────────────────────────────────
export function mapBid(b = {}) {
  const vendorObj = b.vendor && typeof b.vendor === 'object' ? b.vendor : null;
  return {
    ...b,
    id: b.id ?? String(Math.random()),
    vendor: nameOf(b.vendor),
    rate: num(b.rate ?? b.rateAmount),
    rank:
      typeof b.rank === 'number' ? `L${b.rank}`
      : typeof b.rank === 'string' && b.rank ? b.rank
      : DASH,
    slaScore: num(b.slaScore ?? (vendorObj ? vendorObj.slaScore : undefined)),
    status: str(b.status, 'PENDING'),
  };
}

export function mapRfq(r = {}) {
  const bids = Array.isArray(r.bids) ? r.bids.map(mapBid) : [];
  return {
    ...r,
    id: r.id ?? String(Math.random()),
    rfqNumber: str(r.rfqNumber),
    lane: r.lane ?? `${str(r.originCity)} → ${str(r.destCity)}`,
    truckType: r.truckType ?? pretty(r.vehicleType),
    closesAt: fmtDateTime(r.closesAt),
    awardStrategy: str(r.awardStrategy, 'L1_AUTO'),
    status: str(r.status, 'OPEN'),
    bids,
    bidsCount: num(r.bidsCount, bids.length),
  };
}

// ── Live tracking ────────────────────────────────────────────────────────────
const PROGRESS_BY_STATUS = {
  CREATED: 2, ASSIGNED: 8, AT_PICKUP: 15, IN_TRANSIT: 55, DELAYED: 55,
  AT_DELIVERY: 90, DELIVERED: 100, POD_PENDING: 100, POD_CAPTURED: 100, COMPLETED: 100,
};

export function mapTrip(t = {}) {
  const ev = Array.isArray(t.trackingEvents) && t.trackingEvents.length ? t.trackingEvents[0] : null;
  const vehicleObj = t.vehicle && typeof t.vehicle === 'object' ? t.vehicle : null;
  const driverObj = t.driver && typeof t.driver === 'object' ? t.driver : null;
  const lat = num(t.lat ?? (ev ? ev.latitude : undefined), NaN);
  const lng = num(t.lng ?? (ev ? ev.longitude : undefined), NaN);
  const status = str(t.status, 'CREATED');
  return {
    ...t,
    id: t.id ?? String(Math.random()),
    tripNumber: str(t.tripNumber),
    origin: t.origin ?? str(t.originCity),
    dest: t.dest ?? str(t.destCity),
    driver: driverObj ? str(driverObj.name) : str(t.driver),
    vehicle: vehicleObj ? str(vehicleObj.registrationNo) : str(t.vehicle),
    gpsProvider:
      t.gpsProvider ??
      (ev && ev.gpsProvider) ??
      (vehicleObj ? vehicleObj.gpsProvider : undefined) ??
      null,
    location: t.location ?? str(ev && ev.location, 'Awaiting first GPS ping'),
    speed: num(t.speed ?? (ev ? ev.speedKmph : undefined)),
    lastPing: t.lastPing ?? (ev ? timeAgo(ev.recordedAt) : DASH),
    eta: t.eta ?? (t.expectedDelivery ? fmtDateTime(t.expectedDelivery) : DASH),
    lat: Number.isFinite(lat) ? lat : null,
    lng: Number.isFinite(lng) ? lng : null,
    status,
    progressPct: num(t.progressPct, PROGRESS_BY_STATUS[status] ?? 0),
  };
}

// ── Exceptions ───────────────────────────────────────────────────────────────
export function mapException(e = {}) {
  const trip = e.trip && typeof e.trip === 'object' ? e.trip : null;
  return {
    ...e,
    id: e.id ?? String(Math.random()),
    tripNumber: e.tripNumber ?? str(trip && trip.tripNumber),
    driver: e.driver ?? str(trip && trip.driver && trip.driver.name),
    vehicle: e.vehicle ?? str(trip && trip.vehicle && trip.vehicle.registrationNo),
    message: str(e.message),
    type: str(e.type, 'OTHER'),
    severity: str(e.severity, 'MEDIUM'),
    status: str(e.status, 'OPEN'),
    detectedAt: fmtDateTime(e.detectedAt),
  };
}

// ── PODs ─────────────────────────────────────────────────────────────────────
export function mapPod(p = {}) {
  const trip = p.trip && typeof p.trip === 'object' ? p.trip : null;
  const rawStatus = str(p.status, 'PENDING');
  return {
    ...p,
    id: p.id ?? String(Math.random()),
    tripNumber: p.tripNumber ?? str(trip && trip.tripNumber),
    origin: p.origin ?? str(trip && trip.originCity),
    dest: p.dest ?? str(trip && trip.destCity),
    driver: p.driver ?? str(trip && trip.driver && trip.driver.name),
    lrNumber: str(p.lrNumber ?? (trip && trip.lrNumber)),
    ewayBill: str(p.ewayBill ?? p.ewayBillNo ?? (trip && trip.ewayBillNo)),
    podImages: num(p.podImages, Array.isArray(p.imageUrls) ? p.imageUrls.length : 0),
    receiverName: str(p.receiverName),
    capturedAt: p.capturedAt ? fmtDateTime(p.capturedAt) : DASH,
    // Backend enum uses PENDING; the page's filters/labels use PENDING_POD.
    status: rawStatus === 'PENDING' ? 'PENDING_POD' : rawStatus,
  };
}

// ── Invoices ─────────────────────────────────────────────────────────────────
export function mapInvoice(i = {}) {
  const trip = i.trip && typeof i.trip === 'object' ? i.trip : null;
  return {
    ...i,
    id: i.id ?? String(Math.random()),
    invoiceNumber: str(i.invoiceNumber),
    tripNumber: i.tripNumber ?? str(trip && trip.tripNumber),
    vendor: nameOf(i.vendor),
    agreedRate: num(i.agreedRate),
    invoicedAmount: num(i.invoicedAmount),
    deductions: num(i.deductions),
    finalAmount: num(i.finalAmount),
    reconciled: Boolean(i.reconciled),
    status: str(i.status, 'SUBMITTED'),
    submittedAt: fmtDate(i.submittedAt),
    disputeReason: i.disputeReason ?? null,
  };
}

// ── Settlements ──────────────────────────────────────────────────────────────
export function mapSettlement(s = {}) {
  return {
    ...s,
    id: s.id ?? String(Math.random()),
    settlementNumber: str(s.settlementNumber),
    vendor: nameOf(s.vendor),
    invoiceCount: num(s.invoiceCount, Array.isArray(s.invoices) ? s.invoices.length : 0),
    totalAmount: num(s.totalAmount),
    paymentMethod: str(s.paymentMethod, 'NEFT'),
    bankRef: str(s.bankRef),
    approvedAt: s.approvedAt ? fmtDate(s.approvedAt) : DASH,
    status: str(s.status, 'PENDING_PAYMENT'),
  };
}

/** Vehicle-type options for create forms: [enumValue, label]. */
export const VEHICLE_TYPE_OPTIONS = [
  ['TRUCK_32FT_SXL', '32FT SXL'],
  ['TRUCK_32FT_MXL', '32FT MXL'],
  ['TRUCK_20FT_SXL', '20FT SXL'],
  ['TRUCK_20FT_MXL', '20FT MXL'],
  ['CONTAINER_20FT', 'Container 20ft'],
  ['CONTAINER_40FT', 'Container 40ft'],
  ['FLATBED', 'Flatbed'],
  ['REFRIGERATED', 'Refrigerated'],
];
