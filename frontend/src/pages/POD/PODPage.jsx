import { useState, useEffect } from 'react';
import { Package, Camera, CheckCircle } from 'lucide-react';
import { PageHeader, StatusBadge, Spinner, EmptyState, Btn, Table } from '../../components/common';
import api from '../../api/client';

const MOCK = [
  { id: '1', tripNumber: 'TRIP-2025-0838', origin: 'Chennai', dest: 'Hyderabad', driver: 'Anil Sharma', status: 'VERIFIED', capturedAt: '2025-03-24 14:30', lrNumber: 'LR-2025-0838', ewayBill: 'EWB-291234567890', podImages: 2, receiverName: 'Rajesh Mehta' },
  { id: '2', tripNumber: 'TRIP-2025-0836', origin: 'Pune', dest: 'Surat', driver: 'Vijay Patil', status: 'CAPTURED', capturedAt: '2025-03-24 11:00', lrNumber: 'LR-2025-0836', ewayBill: 'EWB-291234567888', podImages: 1, receiverName: 'Sanjay Gupta' },
  { id: '3', tripNumber: 'TRIP-2025-0834', origin: 'Delhi', dest: 'Jaipur', driver: 'Mohan Singh', status: 'PENDING_POD', capturedAt: '—', lrNumber: 'LR-2025-0834', ewayBill: 'EWB-291234567880', podImages: 0, receiverName: '—' },
  { id: '4', tripNumber: 'TRIP-2025-0832', origin: 'Mumbai', dest: 'Ahmedabad', driver: 'Rajan Kumar', status: 'PENDING_POD', capturedAt: '—', lrNumber: 'LR-2025-0832', ewayBill: 'EWB-291234567871', podImages: 0, receiverName: '—' },
];

export default function PODPage() {
  const [pods, setPods] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    api.get('/ftl/pod')
      .then(r => setPods(r.data))
      .catch(() => setPods(MOCK))
      .finally(() => setLoading(false));
  }, []);

  const filters = ['ALL', 'PENDING_POD', 'CAPTURED', 'VERIFIED'];
  const filtered = filter === 'ALL' ? pods : pods.filter(p => p.status === filter);

  const columns = [
    { key: 'tripNumber', label: 'Trip #', render: r => <span className="font-mono text-amber-400 text-xs">{r.tripNumber}</span> },
    { key: 'lane', label: 'Lane', render: r => <span className="text-zinc-300">{r.origin} → {r.dest}</span> },
    { key: 'driver', label: 'Driver' },
    { key: 'lrNumber', label: 'LR Number', render: r => <span className="font-mono text-xs text-blue-400">{r.lrNumber}</span> },
    { key: 'ewayBill', label: 'E-Way Bill', render: r => <span className="font-mono text-xs text-zinc-400">{r.ewayBill}</span> },
    { key: 'podImages', label: 'POD Images', render: r => (
      <div className="flex items-center gap-1.5">
        <Camera size={12} className={r.podImages > 0 ? 'text-green-400' : 'text-zinc-600'} />
        <span className={r.podImages > 0 ? 'text-green-400' : 'text-zinc-500'}>{r.podImages}</span>
      </div>
    )},
    { key: 'capturedAt', label: 'Captured', render: r => <span className="text-zinc-500 text-xs">{r.capturedAt}</span> },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', render: r => r.status === 'CAPTURED' && (
      <Btn size="sm" variant="secondary" onClick={(e) => { e.stopPropagation(); verifyPOD(r.id); }}>Verify</Btn>
    )},
  ];

  const verifyPOD = (id) => setPods(p => p.map(pod => pod.id === id ? { ...pod, status: 'VERIFIED' } : pod));

  const pendingCount = pods.filter(p => p.status === 'PENDING_POD').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="POD & Documentation"
        subtitle={`${pendingCount} trips awaiting proof of delivery`}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'POD Pending', value: pods.filter(p => p.status === 'PENDING_POD').length, color: 'text-amber-400' },
          { label: 'Captured', value: pods.filter(p => p.status === 'CAPTURED').length, color: 'text-blue-400' },
          { label: 'Verified', value: pods.filter(p => p.status === 'VERIFIED').length, color: 'text-green-400' },
          { label: 'Total Trips', value: pods.length, color: 'text-zinc-300' },
        ].map(s => (
          <div key={s.label} className="card p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{s.label}</p>
            <p className={`font-display text-3xl font-bold mt-1 ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === f ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'text-zinc-400 border-zinc-700 hover:border-zinc-600'}`}>
            {f.replace('_',' ')} ({f === 'ALL' ? pods.length : pods.filter(p => p.status === f).length})
          </button>
        ))}
      </div>

      <div className="card">
        {loading ? <Spinner /> : (
          <Table
            columns={columns}
            rows={filtered}
            emptyState={<EmptyState icon={Package} title="No PODs in this state" />}
          />
        )}
      </div>
    </div>
  );
}
