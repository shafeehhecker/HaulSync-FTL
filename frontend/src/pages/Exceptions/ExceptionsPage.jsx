import { useState, useEffect } from 'react';
import { AlertTriangle, CheckCircle, Clock, Bell } from 'lucide-react';
import { PageHeader, StatusBadge, Spinner, EmptyState, Btn, Table } from '../../components/common';
import api from '../../api/client';

const MOCK = [
  { id: '1', tripNumber: 'TRIP-2025-0839', type: 'DELAY', message: 'Truck halted 90+ min at NH-48 near Vadodara', severity: 'HIGH', status: 'OPEN', detectedAt: '2025-03-24 10:45', driver: 'Mohan Singh', vehicle: 'DL-01-CD-9012' },
  { id: '2', tripNumber: 'TRIP-2025-0835', type: 'DEVIATION', message: 'Route deviation detected — Rajkot bypass instead of NH-27', severity: 'MEDIUM', status: 'OPEN', detectedAt: '2025-03-24 09:12', driver: 'Suresh Yadav', vehicle: 'GJ-15-AB-2233' },
  { id: '3', tripNumber: 'TRIP-2025-0831', type: 'SLA_BREACH', message: 'Delivery SLA breached by 2h 15m', severity: 'HIGH', status: 'ACKNOWLEDGED', detectedAt: '2025-03-23 18:30', driver: 'Rajan Kumar', vehicle: 'MH-04-AB-1234' },
  { id: '4', tripNumber: 'TRIP-2025-0828', type: 'GPS_LOSS', message: 'GPS signal lost for 30+ minutes', severity: 'MEDIUM', status: 'RESOLVED', detectedAt: '2025-03-23 14:00', driver: 'Anil Sharma', vehicle: 'TN-01-EF-3456' },
  { id: '5', tripNumber: 'TRIP-2025-0822', type: 'DELAY', message: 'Loading delay at origin — truck waiting 3h', severity: 'LOW', status: 'RESOLVED', detectedAt: '2025-03-22 08:00', driver: 'Vijay Patil', vehicle: 'MH-12-GH-7890' },
];

const severityStyle = {
  HIGH:   'text-red-400 bg-red-500/10 border-red-500/25',
  MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  LOW:    'text-blue-400 bg-blue-500/10 border-blue-500/25',
};

const typeIcon = { DELAY: '⏱', DEVIATION: '🔀', SLA_BREACH: '⚠', GPS_LOSS: '📡' };

export default function ExceptionsPage() {
  const [exceptions, setExceptions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    api.get('/ftl/exceptions')
      .then(r => setExceptions(r.data))
      .catch(() => setExceptions(MOCK))
      .finally(() => setLoading(false));
  }, []);

  const acknowledge = (id) => setExceptions(p => p.map(e => e.id === id ? { ...e, status: 'ACKNOWLEDGED' } : e));
  const resolve = (id) => setExceptions(p => p.map(e => e.id === id ? { ...e, status: 'RESOLVED' } : e));

  const filters = ['ALL', 'OPEN', 'ACKNOWLEDGED', 'RESOLVED'];
  const filtered = filter === 'ALL' ? exceptions : exceptions.filter(e => e.status === filter);

  const openCount = exceptions.filter(e => e.status === 'OPEN').length;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Exception Management"
        subtitle={`${openCount} open exceptions requiring attention`}
        actions={
          openCount > 0 && (
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg bg-red-500/10 border border-red-500/25">
              <Bell size={13} className="text-red-400" />
              <span className="text-xs text-red-400 font-medium">{openCount} unresolved</span>
            </div>
          )
        }
      />

      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === f ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'text-zinc-400 border-zinc-700 hover:border-zinc-600'}`}>
            {f} ({f === 'ALL' ? exceptions.length : exceptions.filter(e => e.status === f).length})
          </button>
        ))}
      </div>

      {loading ? <Spinner /> : (
        <div className="space-y-3">
          {filtered.length === 0 && (
            <EmptyState icon={CheckCircle} title="No exceptions" description="All trips are running smoothly." />
          )}
          {filtered.map(ex => (
            <div key={ex.id} className={`card p-4 border-l-4 ${ex.severity === 'HIGH' ? 'border-l-red-500' : ex.severity === 'MEDIUM' ? 'border-l-amber-500' : 'border-l-blue-500'}`}>
              <div className="flex items-start gap-4">
                <div className={`mt-0.5 px-2 py-0.5 rounded text-[11px] font-bold border flex-shrink-0 ${severityStyle[ex.severity]}`}>
                  {ex.severity}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2 flex-wrap">
                    <div>
                      <p className="text-sm font-medium text-zinc-200">{ex.message}</p>
                      <div className="flex items-center gap-3 mt-1 flex-wrap">
                        <span className="font-mono text-xs text-amber-400">{ex.tripNumber}</span>
                        <span className="text-xs text-zinc-500 bg-zinc-800 px-1.5 py-0.5 rounded">{typeIcon[ex.type]} {ex.type.replace('_',' ')}</span>
                        <span className="text-xs text-zinc-500">{ex.driver} · {ex.vehicle}</span>
                        <span className="flex items-center gap-1 text-xs text-zinc-600"><Clock size={10} /> {ex.detectedAt}</span>
                      </div>
                    </div>
                    <div className="flex items-center gap-2 flex-shrink-0">
                      <StatusBadge status={ex.status} />
                      {ex.status === 'OPEN' && (
                        <>
                          <Btn size="sm" variant="secondary" onClick={() => acknowledge(ex.id)}>Acknowledge</Btn>
                          <Btn size="sm" variant="danger" onClick={() => resolve(ex.id)}>Resolve</Btn>
                        </>
                      )}
                      {ex.status === 'ACKNOWLEDGED' && (
                        <Btn size="sm" variant="danger" onClick={() => resolve(ex.id)}>Mark Resolved</Btn>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
