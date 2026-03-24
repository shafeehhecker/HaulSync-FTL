import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Truck, FileText, Activity, Package, Receipt,
  AlertTriangle, TrendingUp, ArrowRight,
} from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';
import { StatCard, StatusBadge, Spinner } from '../components/common';
import api from '../api/client';

const COLORS = ['#F59E0B', '#60A5FA', '#A78BFA', '#4ADE80', '#F87171', '#94A3B8'];

const MOCK = {
  summary: {
    activeTrips: 34, indentsPending: 12, openRFQs: 8,
    tripsDeliveredToday: 5, podPending: 9, invoicesPending: 14,
    exceptionsOpen: 3, onTimeRate: 91,
  },
  tripsByStatus: [
    { status: 'IN_TRANSIT', _count: 34 }, { status: 'AT_PICKUP', _count: 8 },
    { status: 'AT_DELIVERY', _count: 5 }, { status: 'DELIVERED', _count: 112 },
    { status: 'DELAYED', _count: 3 },
  ],
  weeklyTrips: [
    { day: 'Mon', trips: 18 }, { day: 'Tue', trips: 24 }, { day: 'Wed', trips: 21 },
    { day: 'Thu', trips: 29 }, { day: 'Fri', trips: 26 }, { day: 'Sat', trips: 14 }, { day: 'Sun', trips: 9 },
  ],
  recentTrips: [
    { id: '1', tripNumber: 'TRIP-2025-0841', origin: 'Mumbai', dest: 'Delhi', status: 'IN_TRANSIT', driver: 'Rajan Kumar', eta: '2h 30m' },
    { id: '2', tripNumber: 'TRIP-2025-0840', origin: 'Pune', dest: 'Bangalore', status: 'AT_PICKUP', driver: 'Suresh Yadav', eta: '—' },
    { id: '3', tripNumber: 'TRIP-2025-0839', origin: 'Delhi', dest: 'Kolkata', status: 'DELAYED', driver: 'Mohan Singh', eta: '5h 10m' },
    { id: '4', tripNumber: 'TRIP-2025-0838', origin: 'Chennai', dest: 'Hyderabad', status: 'DELIVERED', driver: 'Anil Sharma', eta: '—' },
  ],
  exceptions: [
    { id: '1', tripNumber: 'TRIP-2025-0839', type: 'DELAY', message: 'Truck halted 90+ min — NH-48 near Vadodara', severity: 'HIGH' },
    { id: '2', tripNumber: 'TRIP-2025-0835', type: 'DEVIATION', message: 'Route deviation detected — Rajkot bypass', severity: 'MEDIUM' },
    { id: '3', tripNumber: 'TRIP-2025-0831', type: 'SLA_BREACH', message: 'Delivery SLA breached by 2h', severity: 'HIGH' },
  ],
};

const severityClass = {
  HIGH:   'text-red-400 bg-red-500/10 border-red-500/25',
  MEDIUM: 'text-amber-400 bg-amber-500/10 border-amber-500/25',
  LOW:    'text-blue-400 bg-blue-500/10 border-blue-500/25',
};

export default function Dashboard() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ftl/analytics/dashboard')
      .then(r => setData(r.data))
      .catch(() => setData(MOCK))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;

  const { summary, tripsByStatus, weeklyTrips, recentTrips, exceptions } = data || MOCK;
  const pieData = (tripsByStatus || []).map(s => ({ name: s.status.replace(/_/g, ' '), value: s._count }));

  return (
    <div className="space-y-6 animate-fade-in">
      <div>
        <h1 className="font-display text-2xl font-bold text-zinc-100">FTL Operations</h1>
        <p className="text-zinc-400 text-sm mt-1">Live transport operating system overview</p>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <StatCard label="Active Trips"      value={summary.activeTrips}        icon={Truck}         color="amber" delta="Currently in transit" />
        <StatCard label="Indents Pending"   value={summary.indentsPending}     icon={FileText}      color="blue"  delta="Awaiting vendor" />
        <StatCard label="Open RFQs"         value={summary.openRFQs}           icon={Activity}      color="purple" delta="Awaiting bids" />
        <StatCard label="Delivered Today"   value={summary.tripsDeliveredToday} icon={Package}      color="green" delta="POD confirmed" />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 stagger">
        <StatCard label="POD Pending"       value={summary.podPending}         icon={Package}       color="amber" />
        <StatCard label="Invoices Pending"  value={summary.invoicesPending}    icon={Receipt}       color="red" />
        <StatCard label="Open Exceptions"  value={summary.exceptionsOpen}     icon={AlertTriangle} color="red"   delta="Needs attention" />
        <StatCard label="On-Time Rate"      value={`${summary.onTimeRate}%`}   icon={TrendingUp}    color="green" delta="Last 30 days" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-display font-semibold text-zinc-200 mb-4">Weekly Trip Volume</h3>
          <ResponsiveContainer width="100%" height={200}>
            <BarChart data={weeklyTrips} barSize={26}>
              <XAxis dataKey="day" tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <YAxis tick={{ fill: '#71717A', fontSize: 11 }} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={{ background: '#18181B', border: '1px solid #3F3F46', borderRadius: '8px', color: '#FAFAFA', fontSize: '12px' }} />
              <Bar dataKey="trips" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
        <div className="card p-5">
          <h3 className="font-display font-semibold text-zinc-200 mb-4">Trip Status Breakdown</h3>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={pieData} cx="50%" cy="50%" innerRadius={50} outerRadius={75} dataKey="value" paddingAngle={3}>
                {pieData.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={{ background: '#18181B', border: '1px solid #3F3F46', borderRadius: '8px', color: '#FAFAFA', fontSize: '12px' }} />
            </PieChart>
          </ResponsiveContainer>
          <div className="flex flex-wrap gap-x-4 gap-y-1.5 mt-2">
            {pieData.map((s, i) => (
              <div key={s.name} className="flex items-center gap-1.5 text-xs text-zinc-400">
                <div className="w-2 h-2 rounded-full" style={{ background: COLORS[i % COLORS.length] }} />
                {s.name} ({s.value})
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Exceptions */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <div className="flex items-center gap-2">
            <h3 className="font-display font-semibold text-zinc-200">Active Exceptions</h3>
            {exceptions?.length > 0 && (
              <span className="w-5 h-5 rounded-full bg-red-500/20 text-red-400 text-[10px] font-bold flex items-center justify-center">
                {exceptions.length}
              </span>
            )}
          </div>
          <Link to="/exceptions" className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1">
            View all <ArrowRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {exceptions.map((ex) => (
            <div key={ex.id} className="flex items-start gap-4 px-5 py-3.5">
              <div className={`mt-0.5 px-1.5 py-0.5 rounded text-[10px] font-bold border ${severityClass[ex.severity]}`}>
                {ex.severity}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm text-zinc-200">{ex.message}</p>
                <p className="text-xs text-zinc-500 mt-0.5 font-mono">{ex.tripNumber} · {ex.type}</p>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Recent Trips */}
      <div className="card">
        <div className="flex items-center justify-between px-5 py-4 border-b border-zinc-800">
          <h3 className="font-display font-semibold text-zinc-200">Recent Trips</h3>
          <Link to="/tracking" className="text-sm text-amber-400 hover:text-amber-300 flex items-center gap-1">
            Live tracking <ArrowRight size={14} />
          </Link>
        </div>
        <div className="divide-y divide-zinc-800/60">
          {recentTrips.map((t) => (
            <div key={t.id} className="flex items-center gap-4 px-5 py-3.5">
              <div className="w-8 h-8 rounded-lg bg-amber-500/10 flex items-center justify-center flex-shrink-0">
                <Truck size={14} className="text-amber-400" />
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-zinc-200 font-mono">{t.tripNumber}</p>
                <p className="text-xs text-zinc-500">{t.origin} → {t.dest}</p>
              </div>
              <div className="text-xs text-zinc-500 hidden sm:block">{t.driver}</div>
              {t.eta !== '—' && <div className="text-xs text-amber-400 font-mono">ETA {t.eta}</div>}
              <StatusBadge status={t.status} />
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
