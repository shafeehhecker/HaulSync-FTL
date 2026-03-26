import { useState, useEffect } from 'react';
import { MapPin, Truck, Clock, Navigation, Wifi, WifiOff } from 'lucide-react';
import { PageHeader, StatusBadge, Spinner } from '../../components/common';
import api from '../../api/client';

const MOCK_TRIPS = [
  { id: '1', tripNumber: 'TRIP-2025-0841', origin: 'Mumbai', dest: 'Delhi', driver: 'Rajan Kumar', vehicle: 'MH-04-AB-1234', status: 'IN_TRANSIT', lat: 21.1458, lng: 79.0882, location: 'Nagpur bypass, NH-44', speed: 68, lastPing: '2 min ago', eta: '2h 30m', distanceKm: 420, totalKm: 1420, gpsProvider: 'Vamosys' },
  { id: '2', tripNumber: 'TRIP-2025-0840', origin: 'Pune', dest: 'Bangalore', driver: 'Suresh Yadav', vehicle: 'MH-12-XY-5678', status: 'AT_PICKUP', lat: 18.5204, lng: 73.8567, location: 'Pune Loading Dock', speed: 0, lastPing: '1 min ago', eta: '—', distanceKm: 0, totalKm: 847, gpsProvider: 'Locus' },
  { id: '3', tripNumber: 'TRIP-2025-0839', origin: 'Delhi', dest: 'Kolkata', status: 'DELAYED', driver: 'Mohan Singh', vehicle: 'DL-01-CD-9012', lat: 25.3176, lng: 82.9739, location: 'Varanasi — extended halt', speed: 0, lastPing: '8 min ago', eta: '5h 10m', distanceKm: 650, totalKm: 1490, gpsProvider: 'Vamosys' },
  { id: '4', tripNumber: 'TRIP-2025-0838', origin: 'Chennai', dest: 'Hyderabad', driver: 'Anil Sharma', vehicle: 'TN-01-EF-3456', status: 'DELIVERED', lat: 17.3850, lng: 78.4867, location: 'Hyderabad Delivery Point', speed: 0, lastPing: '45 min ago', eta: '—', distanceKm: 627, totalKm: 627, gpsProvider: 'Locus' },
];

const statusColor = { IN_TRANSIT: 'bg-blue-400', AT_PICKUP: 'bg-purple-400', AT_DELIVERY: 'bg-amber-400', DELIVERED: 'bg-green-400', DELAYED: 'bg-red-400' };

export default function TrackingPage() {
  const [trips, setTrips] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState(null);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    api.get('/ftl/tracking/active')
      .then(r => { setTrips(r.data); setSelected(r.data[0]); })
      .catch(() => { setTrips(MOCK_TRIPS); setSelected(MOCK_TRIPS[0]); })
      .finally(() => setLoading(false));
  }, []);

  const filters = ['ALL', 'IN_TRANSIT', 'DELAYED', 'AT_PICKUP', 'DELIVERED'];
  const filtered = filter === 'ALL' ? trips : trips.filter(t => t.status === filter);

  if (loading) return <Spinner />;

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Live Tracking" subtitle={`${trips.filter(t => t.status === 'IN_TRANSIT').length} trips in transit · ${trips.filter(t => t.status === 'DELAYED').length} delayed`} />

      <div className="flex gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === f ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'text-zinc-400 border-zinc-700 hover:border-zinc-600'}`}>
            {f === 'ALL' ? `All (${trips.length})` : `${f.replace('_', ' ')} (${trips.filter(t => t.status === f).length})`}
          </button>
        ))}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Trip list */}
        <div className="lg:col-span-1 space-y-2">
          {filtered.map(trip => (
            <div key={trip.id} onClick={() => setSelected(trip)}
              className={`card p-4 cursor-pointer transition-all ${selected?.id === trip.id ? 'border-amber-500/40 bg-amber-500/5' : 'hover:border-zinc-700'}`}>
              <div className="flex items-start justify-between mb-2">
                <span className="font-mono text-xs text-amber-400">{trip.tripNumber}</span>
                <StatusBadge status={trip.status} />
              </div>
              <p className="text-sm font-medium text-zinc-200">{trip.origin} → {trip.dest}</p>
              <p className="text-xs text-zinc-500 mt-1">{trip.driver} · {trip.vehicle}</p>
              <div className="flex items-center gap-3 mt-2">
                <span className="flex items-center gap-1 text-xs text-zinc-500"><MapPin size={10} /> {trip.location}</span>
              </div>
              <div className="flex items-center gap-3 mt-2 pt-2 border-t border-zinc-800/60">
                <span className={`w-1.5 h-1.5 rounded-full ${trip.speed > 0 ? 'bg-green-400' : 'bg-zinc-500'}`} />
                <span className="text-xs text-zinc-500">{trip.speed > 0 ? `${trip.speed} km/h` : 'Halted'}</span>
                <span className="text-xs text-zinc-600 ml-auto">{trip.lastPing}</span>
                {trip.gpsProvider && <span className="text-[10px] bg-zinc-800 text-zinc-500 px-1.5 py-0.5 rounded">{trip.gpsProvider}</span>}
              </div>
            </div>
          ))}
        </div>

        {/* Detail panel */}
        {selected && (
          <div className="lg:col-span-2 space-y-4">
            {/* Map placeholder */}
            <div className="card overflow-hidden">
              <div className="relative bg-zinc-900 h-64 flex items-center justify-center border-b border-zinc-800">
                <div className="absolute inset-0 opacity-5" style={{ backgroundImage: 'linear-gradient(rgba(245,158,11,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(245,158,11,0.3) 1px, transparent 1px)', backgroundSize: '32px 32px' }} />
                <div className="relative text-center">
                  <div className="w-12 h-12 rounded-full bg-amber-500/20 border border-amber-500/30 flex items-center justify-center mx-auto mb-3 pulse-amber">
                    <Truck size={20} className="text-amber-400" />
                  </div>
                  <p className="text-sm font-medium text-zinc-300">{selected.location}</p>
                  <p className="text-xs text-zinc-500 mt-1">GPS · {selected.lat.toFixed(4)}°N, {selected.lng.toFixed(4)}°E</p>
                  <p className="text-[11px] text-zinc-600 mt-0.5">Map integration: set VITE_MAPS_KEY to enable</p>
                </div>
              </div>

              {/* Trip progress */}
              <div className="p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="text-center">
                    <p className="text-xs text-zinc-500">Origin</p>
                    <p className="font-medium text-zinc-200 text-sm">{selected.origin}</p>
                  </div>
                  <div className="flex-1 relative">
                    <div className="h-1 bg-zinc-800 rounded-full">
                      <div className="h-full bg-amber-400 rounded-full transition-all" style={{ width: `${Math.round((selected.distanceKm / selected.totalKm) * 100)}%` }} />
                    </div>
                    <div className="absolute top-1/2 -translate-y-1/2 transition-all" style={{ left: `${Math.round((selected.distanceKm / selected.totalKm) * 100)}%` }}>
                      <div className={`w-3 h-3 rounded-full border-2 border-zinc-900 ${statusColor[selected.status] || 'bg-zinc-400'}`} />
                    </div>
                    <p className="text-center text-[10px] text-zinc-500 mt-2">{selected.distanceKm} / {selected.totalKm} km</p>
                  </div>
                  <div className="text-center">
                    <p className="text-xs text-zinc-500">Destination</p>
                    <p className="font-medium text-zinc-200 text-sm">{selected.dest}</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
              {[
                { label: 'Current Speed', value: selected.speed > 0 ? `${selected.speed} km/h` : 'Halted', icon: Navigation, color: selected.speed > 0 ? 'green' : 'zinc' },
                { label: 'ETA', value: selected.eta, icon: Clock, color: 'amber' },
                { label: 'GPS Signal', value: selected.lastPing, icon: selected.speed > 0 ? Wifi : WifiOff, color: 'blue' },
                { label: 'Progress', value: `${Math.round((selected.distanceKm / selected.totalKm) * 100)}%`, icon: MapPin, color: 'purple' },
              ].map(({ label, value, icon: Icon, color }) => (
                <div key={label} className="card p-3">
                  <p className="text-[11px] text-zinc-500 uppercase tracking-wider">{label}</p>
                  <p className={`font-display font-bold text-lg mt-1 text-${color === 'zinc' ? 'zinc-400' : `${color}-400`}`}>{value}</p>
                </div>
              ))}
            </div>

            {/* Driver & vehicle */}
            <div className="card p-4">
              <h4 className="font-display font-semibold text-zinc-200 mb-3 text-sm">Trip Details</h4>
              <div className="grid grid-cols-2 gap-x-6 gap-y-2 text-sm">
                {[
                  ['Driver', selected.driver],
                  ['Vehicle', selected.vehicle],
                  ['GPS Provider', selected.gpsProvider],
                  ['Trip Number', selected.tripNumber],
                ].map(([k, v]) => (
                  <div key={k} className="flex justify-between border-b border-zinc-800/40 pb-2">
                    <span className="text-zinc-500">{k}</span>
                    <span className="text-zinc-300 font-mono text-xs">{v}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
