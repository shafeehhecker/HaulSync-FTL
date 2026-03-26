import { useState, useEffect } from 'react';
import { FileText, Plus, Filter } from 'lucide-react';
import { PageHeader, StatusBadge, Spinner, EmptyState, Btn, Modal, FormField, Table } from '../../components/common';
import api from '../../api/client';

const MOCK_INDENTS = [
  { id: '1', indentNumber: 'IND-2025-0101', lane: 'Mumbai → Delhi', truckType: '32FT SXL', quantity: 2, contractType: 'CONTRACT', status: 'PUBLISHED', createdAt: '2025-03-20', vendor: 'Swift Logistics' },
  { id: '2', indentNumber: 'IND-2025-0100', lane: 'Pune → Bangalore', truckType: '20FT MXL', quantity: 1, contractType: 'SPOT', status: 'AWARDED', createdAt: '2025-03-19', vendor: 'Rapid Carriers' },
  { id: '3', indentNumber: 'IND-2025-0099', lane: 'Delhi → Kolkata', truckType: '32FT SXL', quantity: 3, contractType: 'CONTRACT', status: 'PENDING', createdAt: '2025-03-18', vendor: '—' },
  { id: '4', indentNumber: 'IND-2025-0098', lane: 'Chennai → Hyderabad', truckType: '20FT MXL', quantity: 1, contractType: 'SPOT', status: 'COMPLETED', createdAt: '2025-03-17', vendor: 'FastMove Transport' },
];

const TRUCK_TYPES = ['32FT SXL', '32FT MXL', '20FT MXL', '20FT SXL', 'Container 20ft', 'Container 40ft', 'Flatbed', 'Refrigerated'];

export default function IndentingList() {
  const [indents, setIndents] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showCreate, setShowCreate] = useState(false);

  useEffect(() => {
    api.get('/ftl/indents')
      .then(r => setIndents(r.data))
      .catch(() => setIndents(MOCK_INDENTS))
      .finally(() => setLoading(false));
  }, []);

  const columns = [
    { key: 'indentNumber', label: 'Indent #', render: r => <span className="font-mono text-amber-400">{r.indentNumber}</span> },
    { key: 'lane', label: 'Lane' },
    { key: 'truckType', label: 'Truck Type' },
    { key: 'quantity', label: 'Qty', render: r => <span className="text-zinc-300">{r.quantity}</span> },
    { key: 'contractType', label: 'Type', render: r => (
      <span className={`text-xs font-medium px-2 py-0.5 rounded ${r.contractType === 'CONTRACT' ? 'bg-blue-500/10 text-blue-400' : 'bg-purple-500/10 text-purple-400'}`}>
        {r.contractType}
      </span>
    )},
    { key: 'vendor', label: 'Assigned Vendor' },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: 'createdAt', label: 'Created', render: r => <span className="text-zinc-500 text-xs">{r.createdAt}</span> },
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader
        title="Truck Indenting"
        subtitle="Create and manage truck indent requests"
        actions={<Btn onClick={() => setShowCreate(true)}><Plus size={15} /> New Indent</Btn>}
      />

      <div className="card">
        <div className="px-5 py-3 border-b border-zinc-800 flex items-center gap-3">
          <Filter size={14} className="text-zinc-500" />
          <span className="text-xs text-zinc-500">All indents</span>
          <span className="ml-auto text-xs text-zinc-500">{indents.length} records</span>
        </div>
        {loading ? <Spinner /> : (
          <Table
            columns={columns}
            rows={indents}
            emptyState={<EmptyState icon={FileText} title="No indents yet" description="Create your first truck indent to get started." action={<Btn onClick={() => setShowCreate(true)}><Plus size={14} /> New Indent</Btn>} />}
          />
        )}
      </div>

      <CreateIndentModal open={showCreate} onClose={() => setShowCreate(false)} onCreated={i => { setIndents(p => [i, ...p]); setShowCreate(false); }} />
    </div>
  );
}

function CreateIndentModal({ open, onClose, onCreated }) {
  const [form, setForm] = useState({ origin: '', destination: '', truckType: '', quantity: 1, contractType: 'CONTRACT', notes: '' });
  const [loading, setLoading] = useState(false);

  const set = (k, v) => setForm(p => ({ ...p, [k]: v }));

  const handleSubmit = async () => {
    setLoading(true);
    try {
      const { data } = await api.post('/ftl/indents', form);
      onCreated(data);
    } catch {
      // mock success
      onCreated({ id: Date.now().toString(), indentNumber: `IND-2025-${String(Math.floor(Math.random()*1000)).padStart(4,'0')}`, lane: `${form.origin} → ${form.destination}`, ...form, status: 'PENDING', createdAt: new Date().toISOString().slice(0,10), vendor: '—' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="New Truck Indent" width="max-w-xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Origin City" required>
            <input className="input-field" placeholder="e.g. Mumbai" value={form.origin} onChange={e => set('origin', e.target.value)} />
          </FormField>
          <FormField label="Destination City" required>
            <input className="input-field" placeholder="e.g. Delhi" value={form.destination} onChange={e => set('destination', e.target.value)} />
          </FormField>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <FormField label="Truck Type" required>
            <select className="input-field" value={form.truckType} onChange={e => set('truckType', e.target.value)}>
              <option value="">Select type</option>
              {TRUCK_TYPES.map(t => <option key={t}>{t}</option>)}
            </select>
          </FormField>
          <FormField label="Quantity" required>
            <input type="number" min="1" className="input-field" value={form.quantity} onChange={e => set('quantity', Number(e.target.value))} />
          </FormField>
        </div>
        <FormField label="Contract Type">
          <div className="flex gap-3">
            {['CONTRACT', 'SPOT'].map(ct => (
              <button key={ct} onClick={() => set('contractType', ct)}
                className={`flex-1 py-2 rounded-lg border text-sm font-medium transition-all ${form.contractType === ct ? 'bg-amber-500/15 border-amber-500/40 text-amber-400' : 'border-zinc-700 text-zinc-400 hover:border-zinc-600'}`}>
                {ct}
              </button>
            ))}
          </div>
        </FormField>
        <FormField label="Notes">
          <textarea className="input-field resize-none" rows={2} placeholder="Special requirements, loading instructions..." value={form.notes} onChange={e => set('notes', e.target.value)} />
        </FormField>
        <div className="flex justify-end gap-3 pt-2">
          <Btn variant="secondary" onClick={onClose}>Cancel</Btn>
          <Btn onClick={handleSubmit} disabled={loading || !form.origin || !form.destination || !form.truckType}>
            {loading ? 'Creating…' : 'Create Indent'}
          </Btn>
        </div>
      </div>
    </Modal>
  );
}
