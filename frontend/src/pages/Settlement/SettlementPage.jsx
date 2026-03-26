import { useState, useEffect } from 'react';
import { DollarSign, CheckCircle, Clock, Send } from 'lucide-react';
import { PageHeader, StatusBadge, Spinner, EmptyState, Btn, Table } from '../../components/common';
import api from '../../api/client';

const MOCK = [
  { id: '1', settlementNumber: 'SETL-2025-0201', vendor: 'FastMove Transport', invoiceCount: 3, totalAmount: 54800, status: 'PENDING_PAYMENT', approvedAt: '2025-03-24', paymentMethod: 'NEFT', bankRef: '—' },
  { id: '2', settlementNumber: 'SETL-2025-0200', vendor: 'Swift Logistics', invoiceCount: 5, totalAmount: 142500, status: 'PAID', approvedAt: '2025-03-23', paymentMethod: 'RTGS', bankRef: 'HDFC0023941' },
  { id: '3', settlementNumber: 'SETL-2025-0199', vendor: 'Rapid Carriers', invoiceCount: 2, totalAmount: 29000, status: 'PROCESSING', approvedAt: '2025-03-23', paymentMethod: 'NEFT', bankRef: '—' },
  { id: '4', settlementNumber: 'SETL-2025-0198', vendor: 'National Freight', invoiceCount: 4, totalAmount: 88000, status: 'PAID', approvedAt: '2025-03-22', paymentMethod: 'RTGS', bankRef: 'ICICI0019283' },
];

export default function SettlementPage() {
  const [settlements, setSettlements] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    api.get('/ftl/settlement')
      .then(r => setSettlements(r.data))
      .catch(() => setSettlements(MOCK))
      .finally(() => setLoading(false));
  }, []);

  const initiatePayment = (id) => setSettlements(p => p.map(s => s.id === id ? { ...s, status: 'PROCESSING' } : s));

  const totalPaid = settlements.filter(s => s.status === 'PAID').reduce((sum, s) => sum + s.totalAmount, 0);
  const totalPending = settlements.filter(s => s.status === 'PENDING_PAYMENT').reduce((sum, s) => sum + s.totalAmount, 0);
  const totalProcessing = settlements.filter(s => s.status === 'PROCESSING').reduce((sum, s) => sum + s.totalAmount, 0);

  const columns = [
    { key: 'settlementNumber', label: 'Settlement #', render: r => <span className="font-mono text-amber-400 text-xs">{r.settlementNumber}</span> },
    { key: 'vendor', label: 'Vendor', render: r => <span className="text-zinc-300">{r.vendor}</span> },
    { key: 'invoiceCount', label: 'Invoices', render: r => <span className="text-zinc-400">{r.invoiceCount}</span> },
    { key: 'totalAmount', label: 'Total (₹)', render: r => <span className="font-mono font-medium text-zinc-200">₹{r.totalAmount.toLocaleString()}</span> },
    { key: 'paymentMethod', label: 'Mode', render: r => <span className="text-xs bg-zinc-800 text-zinc-400 px-2 py-0.5 rounded">{r.paymentMethod}</span> },
    { key: 'bankRef', label: 'Bank Ref', render: r => <span className="font-mono text-xs text-zinc-500">{r.bankRef}</span> },
    { key: 'approvedAt', label: 'Approved', render: r => <span className="text-zinc-500 text-xs">{r.approvedAt}</span> },
    { key: 'status', label: 'Status', render: r => <StatusBadge status={r.status} /> },
    { key: 'actions', label: '', render: r => r.status === 'PENDING_PAYMENT' && (
      <Btn size="sm" onClick={(e) => { e.stopPropagation(); initiatePayment(r.id); }}>
        <Send size={12} /> Pay
      </Btn>
    )},
  ];

  return (
    <div className="space-y-6 animate-fade-in">
      <PageHeader title="Payment Settlement" subtitle="Vendor payment tracking and disbursement" />

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        <div className="card p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Paid This Month</p>
          <p className="font-display text-2xl font-bold text-green-400 mt-1">₹{totalPaid.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Pending Payment</p>
          <p className="font-display text-2xl font-bold text-amber-400 mt-1">₹{totalPending.toLocaleString()}</p>
        </div>
        <div className="card p-4">
          <p className="text-xs text-zinc-500 uppercase tracking-wider">Processing</p>
          <p className="font-display text-2xl font-bold text-blue-400 mt-1">₹{totalProcessing.toLocaleString()}</p>
        </div>
      </div>

      <div className="card overflow-hidden">
        {loading ? <Spinner /> : (
          <Table
            columns={columns}
            rows={settlements}
            emptyState={<EmptyState icon={DollarSign} title="No settlements yet" />}
          />
        )}
      </div>
    </div>
  );
}
