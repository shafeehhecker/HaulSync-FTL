import { useState, useEffect } from 'react';
import { Truck, Plus, ChevronDown, ChevronUp, Award, Clock, CheckCircle } from 'lucide-react';
import { PageHeader, StatusBadge, Spinner, EmptyState, Btn, Modal, FormField, Table, InfoBanner } from '../../components/common';
import api from '../../api/client';

const MOCK_RFQS = [
  {
    id: '1', rfqNumber: 'RFQ-2025-0211', lane: 'Mumbai → Delhi', truckType: '32FT SXL',
    status: 'OPEN', closesAt: '2025-03-24 18:00', bidsCount: 4, awardStrategy: 'L1_AUTO',
    bids: [
      { id: 'b1', vendor: 'Swift Logistics', rate: 28500, rank: 'L1', status: 'PENDING', slaScore: 88 },
      { id: 'b2', vendor: 'Rapid Carriers', rate: 29800, rank: 'L2', status: 'PENDING', slaScore: 82 },
      { id: 'b3', vendor: 'FastMove Transport', rate: 31200, rank: 'L3', status: 'PENDING', slaScore: 79 },
      { id: 'b4', vendor: 'National Freight', rate: 33000, rank: 'L4', status: 'PENDING', slaScore: 74 },
    ],
  },
  {
    id: '2', rfqNumber: 'RFQ-2025-0210', lane: 'Pune → Bangalore', truckType: '20FT MXL',
    status: 'AWARDED', closesAt: '2025-03-23 12:00', bidsCount: 3, awardStrategy: 'L1_AUTO',
    bids: [
      { id: 'b5', vendor: 'Rapid Carriers', rate: 14500, rank: 'L1', status: 'AWARDED', slaScore: 82 },
      { id: 'b6', vendor: 'Swift Logistics', rate: 15200, rank: 'L2', status: 'STANDBY', slaScore: 88 },
      { id: 'b7', vendor: 'Blue Dart Freight', rate: 16800, rank: 'L3', status: 'REJECTED', slaScore: 71 },
    ],
  },
  {
    id: '3', rfqNumber: 'RFQ-2025-0209', lane: 'Delhi → Kolkata', truckType: '32FT SXL',
    status: 'CLOSED', closesAt: '2025-03-22 15:00', bidsCount: 2, awardStrategy: 'L1_AUTO',
    bids: [],
  },
];

const rankColors = { L1: 'text-green-400 bg-green-500/10 border-green-500/25', L2: 'text-amber-400 bg-amber-500/10 border-amber-500/25', L3: 'text-zinc-400 bg-zinc-500/10 border-zinc-500/25', L4: 'text-zinc-500 bg-zinc-700/20 border-zinc-700' };
const bidStatusColors = { AWARDED: 'badge-green', STANDBY: 'badge-amber', PENDING: 'badge-blue', REJECTED: 'badge-red' };

function BidsTable({ bids, rfqStatus }) {
  if (!bids?.length) return <p className="text-xs text-zinc-500 py-4 px-5">No bids received yet.</p>;
  return (
    <div className="border-t border-zinc-800/60">
      <div className="px-5 py-2 bg-zinc-900/50 flex items-center gap-2">
        <Award size={12} className="text-amber-400" />
        <span className="text-xs font-medium text-zinc-400">L1/L2 Bid Ranking</span>
      </div>
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800/40">
            {['Rank', 'Vendor', 'Rate (₹)', 'SLA Score', 'Status'].map(h => (
              <th key={h} className="text-left px-5 py-2 text-[11px] font-medium text-zinc-600 uppercase tracking-wider">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {bids.map(bid => (
            <tr key={bid.id} className={`border-b border-zinc-800/30 ${bid.rank === 'L1' ? 'bg-green-500/3' : ''}`}>
              <td className="px-5 py-2.5">
                <span className={`px-1.5 py-0.5 rounded text-[11px] font-bold border ${rankColors[bid.rank] || rankColors.L4}`}>{bid.rank}</span>
              </td>
              <td className="px-5 py-2.5 text-zinc-300">{bid.vendor}</td>
              <td className="px-5 py-2.5 font-mono font-medium text-zinc-200">₹{bid.rate.toLocaleString()}</td>
              <td className="px-5 py-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-1.5 bg-zinc-800 rounded-full max-w-16">
                    <div className="h-full rounded-full bg-amber-400" style={{ width: `${bid.slaScore}%` }} />
                  </div>
                  <span className="text-xs text-zinc-400">{bid.slaScore}</span>
                </div>
              </td>
              <td className="px-5 py-2.5">
                <span className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-medium ${bidStatusColors[bid.status] || 'badge-zinc'}`}>{bid.status}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default function RFQList() {
  const [rfqs, setRfqs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [expanded, setExpanded] = useState(null);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    api.get('/ftl/rfqs')
      .then(r => setRfqs(r.data))
      .catch(() => setRfqs(MOCK_RFQS))
      .finally(() => setLoading(false));
  }, []);

  const toggleExpand = (id) => setExpanded(p => p === id ? null : id);

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="RFQ & Bid Management"
        subtitle="Multi-vendor RFQ with L1/L2 rate optimization"
        actions={<Btn onClick={() => setShowCreate(true)}><Plus size={15} /> New RFQ</Btn>}
      />

      <InfoBanner type="info" message="L1_AUTO strategy: System auto-awards to the lowest qualified bidder when RFQ window closes." />

      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {rfqs.length === 0 && <EmptyState icon={Truck} title="No RFQs yet" description="Publish your first RFQ to start collecting vendor bids." />}
          {rfqs.map(rfq => (
            <div key={rfq.id} className="card overflow-hidden">
              <div className="flex items-center gap-4 px-5 py-4 cursor-pointer hover:bg-zinc-900/40 transition-colors" onClick={() => toggleExpand(rfq.id)}>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-3 flex-wrap">
                    <span className="font-mono text-sm font-medium text-amber-400">{rfq.rfqNumber}</span>
                    <span className="text-zinc-300 text-sm">{rfq.lane}</span>
                    <span className="text-xs text-zinc-500">{rfq.truckType}</span>
                  </div>
                  <div className="flex items-center gap-4 mt-1.5 flex-wrap">
                    <span className="flex items-center gap-1 text-xs text-zinc-500"><Clock size={11} /> Closes {rfq.closesAt}</span>
                    <span className="text-xs text-zinc-500">{rfq.bidsCount} bids</span>
                    <span className="text-xs text-zinc-500 bg-zinc-800 px-2 py-0.5 rounded">{rfq.awardStrategy}</span>
                  </div>
                </div>
                <StatusBadge status={rfq.status} />
                {expanded === rfq.id ? <ChevronUp size={16} className="text-zinc-500" /> : <ChevronDown size={16} className="text-zinc-500" />}
              </div>
              {expanded === rfq.id && <BidsTable bids={rfq.bids} rfqStatus={rfq.status} />}
            </div>
          ))}
        </div>
      )}

      <CreateRFQModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={r => { setRfqs(p => [r, ...p]); setShowCreate(false); }} />
    </div>
  );
}

function CreateRFQModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ origin: '', destination: '', truckType: '', awardStrategy: 'L1_AUTO', rfqWindowMinutes: 45, minSLAScore: 70 });
  const [loading, setLoading] = useState(false);
  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/ftl/rfqs', form);
      onCreated(data);
    } catch {
      onCreated({ id: Date.now().toString(), rfqNumber: `RFQ-2025-${String(Math.floor(Math.random()*1000)).padStart(4,'0')}`, lane: `${form.origin} → ${form.destination}`, ...form, status: 'OPEN', bidsCount: 0, closesAt: 'TBD', bids: [] });
    } finally { setLoading(false); }
  };

  return (
    <Modal open={open} onClose={onClose} title="Publish New RFQ" width="max-w-xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Origin" required><input className="input-field" placeholder="Mumbai" value={form.origin} onChange={e => set('origin', e.target.value)} /></FormField>
          <FormField label="Destination" required><input className="input-field" placeholder="Delhi" value={form.destination} onChange={e => set('destination', e.target.value)} /></FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Truck Type" required>
            <select className="input-field" value={form.truckType} onChange={e => set('truckType', e.target.value)}>
              <option value="">Select</option>
              {['32FT SXL','32FT MXL','20FT MXL','20FT SXL','Container 20ft','Container 40ft'].map(t => <option key={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Award Strategy">
            <select className="input-field" value={form.awardStrategy} onChange={e => set('awardStrategy', e.target.value)}>
              <option value="L1_AUTO">L1 Auto Award</option>
              <option value="L1_MANUAL_APPROVAL">L1 Manual Approval</option>
              <option value="NEGOTIATED">Negotiated</option>
            </select>
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="RFQ Window (minutes)" hint="How long vendors can submit bids">
            <input type="number" min="15" max="1440" className="input-field" value={form.rfqWindowMinutes} onChange={e => set('rfqWindowMinutes', Number(e.target.value))} />
          </FormField>
          <FormField label="Min SLA Score" hint="Vendors below this score are excluded">
            <input type="number" min="0" max="100" className="input-field" value={form.minSLAScore} onChange={e => set('minSLAScore', Number(e.target.value))} />
          </FormField>
        </div>
        <div className="p-3 rounded-lg bg-amber-500/5 border border-amber-500/20 text-xs text-amber-400/80">
          <CheckCircle size={12} className="inline mr-1.5" />
          L1 Auto will award to the lowest qualified bid when window closes. L2 is auto-assigned as fallback if L1 rejects.
        </div>
        <div className="flex justify-end gap-3 pt-2">
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSubmit} disabled={loading || !form.origin || !form.destination || !form.truckType}>
            {loading ? 'Publishing…' : 'Publish RFQ'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
