import { useState, useEffect } from 'react';
import { Receipt, CheckCircle, AlertCircle, Plus, Filter } from 'lucide-react';
import { PageHeader, StatusBadge, Spinner, EmptyState, Btn, Table } from '../../components/common';
import api from '../../api/client';

const MOCK = [
  { id: '1', invoiceNumber: 'INV-2025-0411', tripNumber: 'TRIP-2025-0838', vendor: 'FastMove Transport', agreedRate: 18500, invoicedAmount: 18500, deductions: 0, finalAmount: 18500, status: 'APPROVED', submittedAt: '2025-03-24', reconciled: true },
  { id: '2', invoiceNumber: 'INV-2025-0410', tripNumber: 'TRIP-2025-0836', vendor: 'Rapid Carriers', agreedRate: 14500, invoicedAmount: 15200, deductions: 700, finalAmount: 14500, status: 'DISPUTED', submittedAt: '2025-03-23', reconciled: false, disputeReason: 'Invoiced amount ₹700 above contract rate' },
  { id: '3', invoiceNumber: 'INV-2025-0409', tripNumber: 'TRIP-2025-0833', vendor: 'Swift Logistics', agreedRate: 28500, invoicedAmount: 28500, deductions: 0, finalAmount: 28500, status: 'SUBMITTED', submittedAt: '2025-03-23', reconciled: true },
  { id: '4', invoiceNumber: 'INV-2025-0408', tripNumber: 'TRIP-2025-0829', vendor: 'National Freight', agreedRate: 22000, invoicedAmount: 21800, deductions: 0, finalAmount: 21800, status: 'PAID', submittedAt: '2025-03-22', reconciled: true },
  { id: '5', invoiceNumber: 'INV-2025-0407', tripNumber: 'TRIP-2025-0827', vendor: 'Blue Dart Freight', agreedRate: 16800, invoicedAmount: 16800, deductions: 500, finalAmount: 16300, status: 'APPROVED', submittedAt: '2025-03-22', reconciled: true },
];

export default function BillingPage() {
  const [invoices, setInvoices] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('ALL');

  useEffect(() => {
    api.get('/ftl/billing/invoices')
      .then(r => setInvoices(r.data))
      .catch(() => setInvoices(MOCK))
      .finally(() => setLoading(false));
  }, []);

  const approve = (id) => setInvoices(p => p.map(i => i.id === id ? { ...i, status: 'APPROVED' } : i));

  const filters = ['ALL', 'SUBMITTED', 'APPROVED', 'DISPUTED', 'PAID'];
  const filtered = filter === 'ALL' ? invoices : invoices.filter(i => i.status === filter);

  const totalApproved = invoices.filter(i => ['APPROVED','PAID'].includes(i.status)).reduce((s, i) => s + i.finalAmount, 0);
  const totalPending = invoices.filter(i => i.status === 'SUBMITTED').reduce((s, i) => s + i.invoicedAmount, 0);
  const totalDisputed = invoices.filter(i => i.status === 'DISPUTED').reduce((s, i) => s + i.invoicedAmount, 0);

  const columns = [
    { key: 'invoiceNumber', label: 'Invoice #', render: r => <span className="font-mono text-amber-400 text-xs">{r.invoiceNumber}</span> },
    { key: 'tripNumber', label: 'Trip #', render: r => <span className="font-mono text-xs text-zinc-400">{r.tripNumber}</span> },
    { key: 'vendor', label: 'Vendor', render: r => <span className="text-zinc-300">{r.vendor}</span> },
    { key: 'agreedRate', label: 'Agreed (₹)', render: r => <span className="font-mono text-zinc-400">₹{r.agreedRate.toLocaleString()}</span> },
    { key: 'invoicedAmount', label: 'Invoiced (₹)', render: r => (
      <span className={`font-mono ${r.invoicedAmount > r.agreedRate ? 'text-red-400' : 'text-zinc-300'}`}>
        ₹{r.invoicedAmount.toLocaleString()}
      </span>
    )},
    { key: 'deductions', label: 'Deductions', render: r => <span className="font-mono text-zinc-500">₹{r.deductions.toLocaleString()}</span> },
    { key: 'finalAmount', label: 'Final (₹)', render: r => <span className="font-mono font-medium text-zinc-200">₹{r.finalAmount.toLocaleString()}</span> },
    { key: 'reconciled', label: 'Reconciled', render: r => r.reconciled
      ? <CheckCircle size={14} className="text-green-400" />
      : <AlertCircle size={14} className="text-red-400" />
    },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', render: r => r.status === 'SUBMITTED' && (
      <Btn size="sm" onClick={(e) => { e.stopPropagation(); approve(r.id); }}>Approve</Btn>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Billing & Reconciliation" subtitle="Freight invoice management and auto-reconciliation" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Approved / Paid</p>
          <p className="font-display text-2xl font-bold text-green-400 mt-1">₹{totalApproved.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Pending Review</p>
          <p className="font-display text-2xl font-bold text-amber-400 mt-1">₹{totalPending.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Disputed</p>
          <p className="font-display text-2xl font-bold text-red-400 mt-1">₹{totalDisputed.toLocaleString()}</p>
        </div>
      </div>

      <div className="flex items-center gap-2 flex-wrap">
        {filters.map(f => (
          <button key={f} onClick={() => setFilter(f)}
            className={`px-3 py-1.5 rounded-lg text-xs font-medium border transition-all ${filter === f ? 'bg-amber-500/15 text-amber-400 border-amber-500/30' : 'text-zinc-400 border-zinc-700 hover:border-zinc-600'}`}>
            {f} ({f === 'ALL' ? invoices.length : invoices.filter(i => i.status === f).length})
          </button>
        ))}
      </div>

      {invoices.find(i => i.status === 'DISPUTED') && (
        <div className="flex items-start gap-3 p-3 rounded-lg bg-red-500/8 border border-red-500/20">
          <AlertCircle size={15} className="text-red-400 mt-0.5 flex-shrink-0" />
          <div className="text-sm text-red-400">
            {invoices.filter(i => i.status === 'DISPUTED').map(i => (
              <p key={i.id}><span className="font-mono">{i.invoiceNumber}</span>: {i.disputeReason}</p>
            ))}
          </div>
        </div>
      )}

      <div className="card overflow-hidden">
        {loading ? <Spinner /> : (
          <Table
            columns={columns}
            rows={filtered}
            emptyState={<EmptyState icon={Receipt} title="No invoices in this state" />}
          />
        )}
      </div>
    </div>
  );
}
