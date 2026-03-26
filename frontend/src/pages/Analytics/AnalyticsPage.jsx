import { useState, useEffect } from 'react';
import { BarChart2, TrendingUp, TrendingDown } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, Tooltip, ResponsiveContainer,
  LineChart, Line, CartesianGrid, PieChart, Pie, Cell, Legend,
} from 'recharts';
import { PageHeader, Spinner } from '../../components/common';
import api from '../../api/client';

const COLORS = ['#F59E0B', '#60A5FA', '#A78BFA', '#4ADE80', '#F87171'];

const MOCK = {
  monthlyTrips: [
    { month: 'Oct', trips: 142 }, { month: 'Nov', trips: 168 }, { month: 'Dec', trips: 154 },
    { month: 'Jan', trips: 189 }, { month: 'Feb', trips: 176 }, { month: 'Mar', trips: 201 },
  ],
  onTimeByVendor: [
    { vendor: 'Swift', onTime: 94 }, { vendor: 'Rapid', onTime: 88 },
    { vendor: 'FastMove', onTime: 82 }, { vendor: 'National', onTime: 78 }, { vendor: 'Blue Dart', onTime: 71 },
  ],
  costByLane: [
    { lane: 'MUM-DEL', avgRate: 28500 }, { lane: 'PNE-BLR', avgRate: 14500 },
    { lane: 'DEL-KOL', avgRate: 31200 }, { lane: 'CHN-HYD', avgRate: 18500 }, { lane: 'MUM-AHM', avgRate: 9800 },
  ],
  vendorShare: [
    { name: 'Swift Logistics', value: 34 }, { name: 'Rapid Carriers', value: 28 },
    { name: 'FastMove', value: 18 }, { name: 'National Freight', value: 12 }, { name: 'Others', value: 8 },
  ],
  kpis: { avgTransitHrs: 18.4, onTimeRate: 91, freightSaved: 124000, l1AwardRate: 87 },
};

const TOOLTIP_STYLE = { background: '#18181B', border: '1px solid #3F3F46', borderRadius: '8px', color: '#FAFAFA', fontSize: '12px' };
const AXIS_STYLE = { fill: '#71717A', fontSize: 11 };

export default function AnalyticsPage() {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ftl/analytics')
      .then(r => setData(r.data))
      .catch(() => setData(MOCK))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return <Spinner />;
  const d = data || MOCK;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="FTL Analytics" subtitle="Performance, cost, and operational insights" />

      {/* KPI summary */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: 'Avg Transit Time', value: `${d.kpis.avgTransitHrs}h`, trend: -2, unit: 'vs last month' },
          { label: 'On-Time Rate', value: `${d.kpis.onTimeRate}%`, trend: 3, unit: 'vs last month' },
          { label: 'Freight Savings (L1)', value: `₹${(d.kpis.freightSaved/1000).toFixed(0)}K`, trend: 8, unit: 'vs spot rates' },
          { label: 'L1 Award Rate', value: `${d.kpis.l1AwardRate}%`, trend: 0, unit: 'auto-awarded' },
        ].map(k => (
          <div key={k.label} className="card p-4">
            <p className="text-xs text-zinc-500 uppercase tracking-wider">{k.label}</p>
            <p className="font-display text-2xl font-bold text-zinc-100 mt-1">{k.value}</p>
            {k.trend !== 0 && (
              <div className={`flex items-center gap-1 mt-1 text-xs ${k.trend > 0 ? 'text-green-400' : 'text-red-400'}`}>
                {k.trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
                {Math.abs(k.trend)}% {k.unit}
              </div>
            )}
            {k.trend === 0 && <p className="text-xs text-zinc-500 mt-1">{k.unit}</p>}
          </div>
        ))}
      </div>

      {/* Monthly volume & On-time */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-display font-semibold text-zinc-200 mb-4">Monthly Trip Volume</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.monthlyTrips} barSize={28}>
              <XAxis dataKey="month" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <Tooltip contentStyle={TOOLTIP_STYLE} />
              <Bar dataKey="trips" fill="#F59E0B" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-zinc-200 mb-4">On-Time % by Vendor</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.onTimeByVendor} layout="vertical" barSize={18}>
              <XAxis type="number" domain={[0, 100]} tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis type="category" dataKey="vendor" tick={AXIS_STYLE} axisLine={false} tickLine={false} width={55} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'On-Time']} />
              <Bar dataKey="onTime" fill="#4ADE80" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      </div>

      {/* Cost by lane & Vendor share */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        <div className="card p-5">
          <h3 className="font-display font-semibold text-zinc-200 mb-4">Avg Freight Rate by Lane (₹)</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={d.costByLane} barSize={28}>
              <XAxis dataKey="lane" tick={AXIS_STYLE} axisLine={false} tickLine={false} />
              <YAxis tick={AXIS_STYLE} axisLine={false} tickLine={false} tickFormatter={v => `₹${(v/1000).toFixed(0)}K`} />
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`₹${v.toLocaleString()}`, 'Avg Rate']} />
              <Bar dataKey="avgRate" fill="#A78BFA" radius={[4, 4, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="card p-5">
          <h3 className="font-display font-semibold text-zinc-200 mb-4">Volume Share by Vendor</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={d.vendorShare} cx="50%" cy="50%" innerRadius={55} outerRadius={85} dataKey="value" paddingAngle={3}>
                {d.vendorShare.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip contentStyle={TOOLTIP_STYLE} formatter={(v) => [`${v}%`, 'Share']} />
              <Legend iconType="circle" iconSize={8} wrapperStyle={{ fontSize: '11px', color: '#A1A1AA' }} />
            </PieChart>
          </ResponsiveContainer>
        </div>
      </div>
    </div>
  );
}
