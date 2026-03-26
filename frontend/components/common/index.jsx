import { Loader2, AlertCircle, X, Info } from 'lucide-react';

// ── Spinner ──────────────────────────────────────────────────────────────────
export function Spinner({ size = 'md' }) {
  const sz = size === 'sm' ? 16 : size === 'lg' ? 40 : 24;
  return (
    <div className="flex items-center justify-center p-12">
      <Loader2 size={sz} className="text-amber-400 animate-spin" />
    </div>
  );
}

// ── StatCard ─────────────────────────────────────────────────────────────────
const colorMap = {
  amber:  { bg: 'bg-amber-500/10',  text: 'text-amber-400',  border: 'border-amber-500/20' },
  blue:   { bg: 'bg-blue-500/10',   text: 'text-blue-400',   border: 'border-blue-500/20' },
  green:  { bg: 'bg-green-500/10',  text: 'text-green-400',  border: 'border-green-500/20' },
  red:    { bg: 'bg-red-500/10',    text: 'text-red-400',    border: 'border-red-500/20' },
  purple: { bg: 'bg-purple-500/10', text: 'text-purple-400', border: 'border-purple-500/20' },
  teal:   { bg: 'bg-teal-500/10',   text: 'text-teal-400',   border: 'border-teal-500/20' },
};

export function StatCard({ label, value, icon: Icon, color = 'amber', delta }) {
  const c = colorMap[color] || colorMap.amber;
  return (
    <div className="card p-4 animate-fade-in">
      <div className="flex items-start justify-between mb-3">
        <p className="text-xs text-zinc-500 font-medium uppercase tracking-wider">{label}</p>
        <div className={`w-8 h-8 rounded-lg ${c.bg} border ${c.border} flex items-center justify-center`}>
          <Icon size={14} className={c.text} />
        </div>
      </div>
      <p className="font-display text-2xl font-bold text-zinc-100">{value}</p>
      {delta && <p className="text-xs text-zinc-500 mt-1">{delta}</p>}
    </div>
  );
}

// ── StatusBadge ───────────────────────────────────────────────────────────────
const statusMap = {
  // Trip / shipment
  CREATED:      'badge-zinc',
  PENDING:      'badge-amber',
  OPEN:         'badge-blue',
  IN_TRANSIT:   'badge-blue',
  INTRANSIT:    'badge-blue',
  DELIVERED:    'badge-green',
  COMPLETED:    'badge-green',
  CANCELLED:    'badge-red',
  DELAYED:      'badge-red',
  AT_PICKUP:    'badge-purple',
  AT_DELIVERY:  'badge-purple',
  // RFQ
  DRAFT:        'badge-zinc',
  PUBLISHED:    'badge-blue',
  AWARDED:      'badge-green',
  CLOSED:       'badge-zinc',
  EXPIRED:      'badge-red',
  // Billing
  DRAFT_INV:    'badge-zinc',
  SUBMITTED:    'badge-amber',
  APPROVED:     'badge-green',
  DISPUTED:     'badge-red',
  PAID:         'badge-green',
  // POD
  PENDING_POD:  'badge-amber',
  CAPTURED:     'badge-green',
  VERIFIED:     'badge-green',
};

export function StatusBadge({ status }) {
  const cls = statusMap[status] || 'badge-zinc';
  const label = (status || '').replace(/_/g, ' ');
  return (
    <span className={`inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium tracking-wide ${cls}`}>
      {label}
    </span>
  );
}

// ── EmptyState ────────────────────────────────────────────────────────────────
export function EmptyState({ icon: Icon, title, description, action }) {
  return (
    <div className="flex flex-col items-center justify-center py-20 text-center px-4">
      {Icon && (
        <div className="w-12 h-12 rounded-xl bg-zinc-800 flex items-center justify-center mb-4">
          <Icon size={22} className="text-zinc-500" />
        </div>
      )}
      <p className="font-display font-semibold text-zinc-300 mb-1">{title}</p>
      {description && <p className="text-sm text-zinc-500 max-w-xs mb-4">{description}</p>}
      {action}
    </div>
  );
}

// ── PageHeader ────────────────────────────────────────────────────────────────
export function PageHeader({ title, subtitle, actions }) {
  return (
    <div className="flex items-start justify-between">
      <div>
        <h1 className="font-display text-2xl font-bold text-zinc-100">{title}</h1>
        {subtitle && <p className="text-zinc-400 text-sm mt-1">{subtitle}</p>}
      </div>
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  );
}

// ── Modal ─────────────────────────────────────────────────────────────────────
export function Modal({ open, onClose, title, children, width = 'max-w-lg' }) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
      <div className="absolute inset-0 bg-zinc-950/80 backdrop-blur-sm" onClick={onClose} />
      <div className={`relative ${width} w-full bg-zinc-900 border border-zinc-800 rounded-2xl shadow-2xl animate-fade-in`}>
        <div className="flex items-center justify-between px-6 py-4 border-b border-zinc-800">
          <h2 className="font-display font-semibold text-zinc-100">{title}</h2>
          <button onClick={onClose} className="w-7 h-7 rounded-lg hover:bg-zinc-800 flex items-center justify-center text-zinc-400 hover:text-zinc-200 transition-colors">
            <X size={16} />
          </button>
        </div>
        <div className="p-6">{children}</div>
      </div>
    </div>
  );
}

// ── InfoBanner ────────────────────────────────────────────────────────────────
export function InfoBanner({ message, type = 'info' }) {
  const styles = {
    info:    'bg-blue-500/10 border-blue-500/30 text-blue-400',
    warning: 'bg-amber-500/10 border-amber-500/30 text-amber-400',
    error:   'bg-red-500/10 border-red-500/30 text-red-400',
    success: 'bg-green-500/10 border-green-500/30 text-green-400',
  };
  return (
    <div className={`flex items-center gap-2 px-4 py-3 rounded-lg border text-sm ${styles[type] || styles.info}`}>
      {type === 'error' ? <AlertCircle size={15} /> : <Info size={15} />}
      {message}
    </div>
  );
}

// ── Table ─────────────────────────────────────────────────────────────────────
export function Table({ columns, rows, onRowClick, emptyState }) {
  if (!rows?.length) return emptyState || null;
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="border-b border-zinc-800">
            {columns.map((col) => (
              <th key={col.key} className="text-left px-4 py-3 text-xs font-medium text-zinc-500 uppercase tracking-wider">
                {col.label}
              </th>
            ))}
          </tr>
        </thead>
        <tbody className="divide-y divide-zinc-800/60">
          {rows.map((row, i) => (
            <tr
              key={row.id || i}
              onClick={() => onRowClick?.(row)}
              className={`${onRowClick ? 'cursor-pointer hover:bg-zinc-900/60' : ''} transition-colors`}
            >
              {columns.map((col) => (
                <td key={col.key} className="px-4 py-3 text-zinc-300">
                  {col.render ? col.render(row) : row[col.key] ?? '—'}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// ── Btn ───────────────────────────────────────────────────────────────────────
export function Btn({ children, onClick, variant = 'primary', size = 'md', disabled, type = 'button', className = '' }) {
  const base = 'inline-flex items-center gap-2 font-medium rounded-lg transition-all duration-150 disabled:opacity-50 disabled:cursor-not-allowed';
  const sizes = { sm: 'px-3 py-1.5 text-xs', md: 'px-4 py-2 text-sm', lg: 'px-5 py-2.5 text-sm' };
  const variants = {
    primary:  'bg-amber-500 text-zinc-950 hover:bg-amber-400 active:bg-amber-600',
    secondary:'bg-zinc-800 text-zinc-200 border border-zinc-700 hover:bg-zinc-700',
    danger:   'bg-red-500/15 text-red-400 border border-red-500/30 hover:bg-red-500/25',
    ghost:    'text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800',
  };
  return (
    <button type={type} onClick={onClick} disabled={disabled}
      className={`${base} ${sizes[size]} ${variants[variant]} ${className}`}>
      {children}
    </button>
  );
}

// ── FormField ─────────────────────────────────────────────────────────────────
export function FormField({ label, required, children, hint }) {
  return (
    <div className="space-y-1.5">
      <label className="block text-sm font-medium text-zinc-300">
        {label}{required && <span className="text-amber-400 ml-1">*</span>}
      </label>
      {children}
      {hint && <p className="text-xs text-zinc-500">{hint}</p>}
    </div>
  );
}
