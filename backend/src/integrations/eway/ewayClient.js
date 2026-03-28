/**
 * NIC E-Way Bill API Client
 *
 * Wraps the NIC GST e-way bill portal API.
 * Set EWAY_CLIENT_ID, EWAY_CLIENT_SECRET, EWAY_GSTIN in .env to activate.
 * Falls back to mock/passthrough mode when credentials are absent.
 *
 * NIC Sandbox: https://ewaybillgst.gov.in/apidocs/
 */

const EWAY_BASE_URL = 'https://ewaybillgst.gov.in/api/ewaybill/v1.0';

const config = {
  clientId:     process.env.EWAY_CLIENT_ID,
  clientSecret: process.env.EWAY_CLIENT_SECRET,
  gstin:        process.env.EWAY_GSTIN,
};

const isMockMode = !config.clientId || !config.clientSecret || !config.gstin;

if (isMockMode) {
  console.log('ℹ️  E-way bill running in mock mode (no NIC credentials configured)');
}

// ── Auth token management ─────────────────────────────────────────────────────

let _token     = null;
let _tokenExpiry = 0;

async function getAuthToken() {
  if (_token && Date.now() < _tokenExpiry) return _token;

  const res = await fetch(`${EWAY_BASE_URL}/authenticate`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      action:    'ACCESSTOKEN',
      clientid:  config.clientId,
      clientsecret: config.clientSecret,
      username:  config.gstin,
    }),
  });

  if (!res.ok) throw new Error(`NIC auth failed: ${res.status}`);
  const data = await res.json();
  _token       = data.authtoken;
  _tokenExpiry = Date.now() + (data.tokenExpiry || 6 * 60 * 60 * 1000); // default 6h
  return _token;
}

// ── Public API ────────────────────────────────────────────────────────────────

/**
 * Generate a new e-way bill.
 *
 * @param {object} tripData — { lrNumber, originGstin, destGstin, goodsDesc, hsnCode, totalValue, vehicleNo, vehicleType, transMode }
 * @returns {{ ewayBillNo, ewayBillDate, ewayBillValidUpto }}
 */
async function generateEwayBill(tripData) {
  if (isMockMode) {
    const mock = `EWB-${Date.now().toString().slice(-12)}`;
    console.log(`[MOCK] Generated e-way bill: ${mock}`);
    return {
      ewayBillNo:      mock,
      ewayBillDate:    new Date().toISOString(),
      ewayBillValidUpto: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(),
    };
  }

  const token = await getAuthToken();
  const res   = await fetch(`${EWAY_BASE_URL}/generateewb`, {
    method:  'POST',
    headers: {
      'Content-Type': 'application/json',
      'authtoken':    token,
      'gstin':        config.gstin,
    },
    body: JSON.stringify({
      supplyType:    'O',
      subSupplyType: '1',
      docType:       'INV',
      docNo:         tripData.lrNumber,
      docDate:       new Date().toLocaleDateString('en-IN'),
      fromGstin:     tripData.originGstin  || config.gstin,
      toGstin:       tripData.destGstin    || 'URP',
      transactionType: 1,
      vehicleNo:     (tripData.vehicleNo || '').replace(/\s/g, '').toUpperCase(),
      vehicleType:   tripData.vehicleType || 'R',
      transMode:     tripData.transMode   || '1', // 1 = Road
      itemList: [{
        productName: tripData.goodsDesc  || 'General Cargo',
        hsnCode:     tripData.hsnCode    || '9965',
        quantity:    1,
        qtyUnit:     'NOS',
        cgstRate:    0,
        sgstRate:    0,
        igstRate:    18,
        cessRate:    0,
        taxableAmount: tripData.totalValue || 0,
      }],
      totalValue:      tripData.totalValue || 0,
      cgstValue:       0,
      sgstValue:       0,
      igstValue:       Math.round((tripData.totalValue || 0) * 0.18),
      cessValue:       0,
      totInvValue:     Math.round((tripData.totalValue || 0) * 1.18),
      transporterId:   '',
    }),
  });

  if (!res.ok) throw new Error(`NIC generateewb failed: ${res.status}`);
  const data = await res.json();

  return {
    ewayBillNo:       data.ewayBillNo,
    ewayBillDate:     data.ewayBillDate,
    ewayBillValidUpto: data.validUpto,
  };
}

/**
 * Verify an existing e-way bill number against NIC.
 * @param {string} ewayBillNo
 * @returns {{ valid: boolean, validUpto?: string, status?: string }}
 */
async function verifyEwayBill(ewayBillNo) {
  if (isMockMode) {
    return { valid: true, validUpto: new Date(Date.now() + 24 * 60 * 60 * 1000).toISOString(), status: 'ACTIVE' };
  }

  try {
    const token = await getAuthToken();
    const res   = await fetch(`${EWAY_BASE_URL}/getewbdetails/${ewayBillNo}`, {
      headers: { 'authtoken': token, 'gstin': config.gstin },
    });
    if (!res.ok) return { valid: false };
    const data = await res.json();
    return {
      valid:     true,
      validUpto: data.validUpto,
      status:    data.ewbStatus,
    };
  } catch {
    return { valid: false };
  }
}

/**
 * Cancel an e-way bill (e.g. on trip cancellation).
 * @param {string} ewayBillNo
 * @param {string} cancelReason  — '1'=Duplicate, '2'=OrderCancelled, '3'=DataEntryError, '4'=Others
 */
async function cancelEwayBill(ewayBillNo, cancelReason = '2') {
  if (isMockMode) {
    console.log(`[MOCK] Cancelled e-way bill: ${ewayBillNo}`);
    return { cancelled: true };
  }

  const token = await getAuthToken();
  const res   = await fetch(`${EWAY_BASE_URL}/cancelewb`, {
    method:  'POST',
    headers: { 'Content-Type': 'application/json', 'authtoken': token, 'gstin': config.gstin },
    body: JSON.stringify({ ewbNo: ewayBillNo, cancelRsnCode: cancelReason, cancelRmrk: 'Trip cancelled' }),
  });

  if (!res.ok) throw new Error(`NIC cancelewb failed: ${res.status}`);
  return { cancelled: true };
}

module.exports = { generateEwayBill, verifyEwayBill, cancelEwayBill, isMockMode };
