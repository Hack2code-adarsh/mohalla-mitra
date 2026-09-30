import React, { useEffect, useMemo, useState } from 'react';
import {
  LayoutDashboard, Package, Truck, FileText, Wallet, ReceiptText, BookOpen,
  ShoppingCart, CreditCard, Settings, Search, HelpCircle, MessageSquare,
  Bell, ChevronDown, AlertTriangle, Clock, Flag, MoreHorizontal,
  ArrowUpRight, IndianRupee, Calendar, CheckCircle2, XCircle, Filter,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import '../portal.css';

const PRICE_MAP = {
  Electrician: 450, Plumber: 400, Tutor: 600, Tiffin: 1800,
  'Bike Mechanic': 350, Salon: 300, Cleaner: 250, Carpenter: 500,
  Painter: 800, ACRepair: 700,
  Restaurant: 200, Sweets: 350, Cafe: 120, 'Provision Store': 150,
  Stationery: 80, 'Ice Cream': 150, Bakery: 100, Grocery: 50,
  Florist: 250, 'General Store': 100,
};
function estPrice(cat) { return PRICE_MAP[cat] ?? 350; }
function fmtINR(n) { return '₹' + n.toLocaleString('en-IN'); }
function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function StatusPill({ status }) {
  const map = {
    requested: ['gray', 'Pending'], accepted: ['blue', 'Confirmed'],
    in_progress: ['amber', 'In Progress'], completed: ['green', 'Completed'],
    cancelled: ['red', 'Cancelled'], rejected: ['red', 'Rejected'],
  };
  const [cls, label] = map[status] || ['gray', status];
  return <span className={`portal-pill ${cls}`}>{label}</span>;
}

function PortalShell({ user, onLogout, activeNav, navItems, onNav, children }) {
  return (
    <div className="portal-root">
      <header className="portal-topbar">
        <div className="portal-topbar-left">
          <div className="portal-logo">SS</div>
          <div className="portal-brand">
            <span className="name">Service Sphere</span>
            <span className="sub">Customer Portal</span>
          </div>
        </div>
        <div className="portal-topbar-right">
          <button className="portal-icon-btn" aria-label="Search"><Search size={18} /></button>
          <button className="portal-icon-btn" aria-label="Help"><HelpCircle size={18} /></button>
          <button className="portal-icon-btn" aria-label="Messages"><MessageSquare size={18} /></button>
          <button className="portal-icon-btn" aria-label="Notifications"><Bell size={18} /><span className="dot" /></button>
          <div className="portal-user-chip" onClick={onLogout} role="button" tabIndex={0}>
            <div className="portal-avatar">{(user?.name || 'U').charAt(0).toUpperCase()}</div>
            <div className="portal-user-meta">
              <span className="nm">{user?.name || 'Customer'}</span>
              <span className="rl">{user?.city || ''} • Customer</span>
            </div>
            <ChevronDown size={15} color="var(--portal-muted)" />
          </div>
        </div>
      </header>
      <div className="portal-body">
        <aside className="portal-sidebar">
          {navItems.map((g, gi) => (
            <div className="portal-nav-group" key={gi}>
              {g.label && <div className="portal-nav-label">{g.label}</div>}
              {g.items.map((it) => {
                const Icon = it.icon;
                const on = activeNav === it.key;
                return (
                  <button key={it.key} className={`portal-nav-item ${on ? 'active' : ''}`} onClick={() => onNav(it.key)}>
                    <Icon size={18} /> {it.label}
                  </button>
                );
              })}
            </div>
          ))}
          <div className="portal-nav-divider" />
          <div className="portal-nav-group">
            <button className="portal-nav-item" onClick={() => onNav('settings')}>
              <Settings size={18} /> Settings
            </button>
          </div>
        </aside>
        <main className="portal-main">{children}</main>
      </div>
    </div>
  );
}

function ReviewModal({ booking, onClose, onSubmitted }) {
  const [rating, setRating] = useState(5);
  const [comment, setComment] = useState('');
  const [error, setError] = useState('');
  async function submit(e) {
    e.preventDefault(); setError('');
    try { await api.createReview({ booking_id: booking.id, rating, comment }); onSubmitted(); }
    catch (err) { setError(err.message); }
  }
  return (
    <div className="portal-modal-backdrop" onClick={onClose}>
      <div className="portal-modal" onClick={(e) => e.stopPropagation()}>
        <h2>Rate {booking.vendor_name}</h2>
        <p className="sub">{booking.service_category} • {booking.city}</p>
        {error && <div className="portal-alert err">{error}</div>}
        <div className="portal-stars">
          {[1,2,3,4,5].map((n) => (
            <button type="button" key={n} className={`portal-star ${n <= rating ? 'on' : ''}`} onClick={() => setRating(n)} aria-label={`${n} star`}>★</button>
          ))}
        </div>
        <textarea className="portal-textarea" placeholder="How was the service? (optional)" value={comment} onChange={(e) => setComment(e.target.value)} />
        <div className="portal-btn-row">
          <button className="portal-btn primary" onClick={submit}>Submit review</button>
          <button className="portal-btn" onClick={onClose}>Cancel</button>
        </div>
      </div>
    </div>
  );
}

function Widget({ title, icon, icoClass = '', children, count }) {
  return (
    <div className="portal-widget">
      <div className="portal-widget-head">
        <div className="portal-widget-title">
          <div className={`portal-widget-ico ${icoClass}`}>{icon}</div>
          {title}{count != null && ` (${count})`}
        </div>
        <MoreHorizontal size={18} color="var(--portal-muted)" />
      </div>
      <div className="portal-widget-body">{children}</div>
    </div>
  );
}

function PageHead({ icon, title }) {
  return (
    <div className="portal-page-head">
      <div className="portal-ico">{icon}</div>
      <h1>{title}</h1>
    </div>
  );
}

export default function CustomerDashboard() {
  const { user, logout, navigate } = useAuth();
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(true);
  const [toast, setToast] = useState('');
  const [activeNav, setActiveNav] = useState('dashboard');
  const [reviewing, setReviewing] = useState(null);
  const [reviewedIds, setReviewedIds] = useState(new Set());
  const [statusFilter, setStatusFilter] = useState('all');

  async function load() {
    setLoading(true);
    try { setRows(await api.customerBookings()); } catch (err) { setToast(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  const navItems = [
    { label: 'Overview', items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { key: 'orders', label: 'Orders', icon: Package },
      { key: 'appointments', label: 'Appointments', icon: Truck },
      { key: 'invoices', label: 'Invoices', icon: FileText },
      { key: 'payments', label: 'Payments', icon: Wallet },
      { key: 'creditnotes', label: 'Credit Notes', icon: ReceiptText },
      { key: 'statement', label: 'Statement', icon: BookOpen },
    ]},
    { label: 'Account Management', items: [
      { key: 'pay', label: 'Make a Payment', icon: CreditCard },
      { key: 'order', label: 'Place an Order', icon: ShoppingCart },
    ]},
  ];

  function onNav(key) {
    setActiveNav(key);
    if (key === 'order') navigate('home');
    if (key === 'pay') setActiveNav('payments');
  }
  function showToast(m) { setToast(m); setTimeout(() => setToast(''), 3000); }
  async function cancel(id) { await api.updateBookingStatus(id, 'cancelled'); showToast('Order cancelled.'); load(); }
  function handleReviewSubmitted() { setReviewedIds((p) => new Set(p).add(reviewing.id)); setReviewing(null); showToast('Thanks for your review!'); }

  const stats = useMemo(() => {
    const now = Date.now();
    const pending = rows.filter((r) => ['requested','accepted'].includes(r.status));
    const pastDue = pending.filter((r) => { const d = new Date(r.preferred_time); return !isNaN(d) && d.getTime() < now; });
    const dueSoon = pending.filter((r) => { const d = new Date(r.preferred_time); return !isNaN(d) && d.getTime() >= now; });
    const outstandingAmt = pending.reduce((s, r) => s + estPrice(r.service_category), 0);
    const pastDueAmt = pastDue.reduce((s, r) => s + estPrice(r.service_category), 0);
    const paidAmt = rows.filter(r => r.status === 'completed').reduce((s, r) => s + estPrice(r.service_category), 0);
    const cancelledAmt = rows.filter(r => r.status === 'cancelled').reduce((s, r) => s + estPrice(r.service_category), 0);
    return { pastDue, dueSoon, outstandingAmt, pastDueAmt, count: pending.length, paidAmt, cancelledAmt };
  }, [rows]);

  const filteredRows = useMemo(() => {
    if (statusFilter === 'all') return rows;
    return rows.filter(r => r.status === statusFilter);
  }, [rows, statusFilter]);

  let content = null;

  // ===== DASHBOARD =====
  if (activeNav === 'dashboard') {
    content = (
      <>
        <PageHead icon={<LayoutDashboard size={22} />} title="Dashboard" />
        <div className="portal-action-row">
          <button className="portal-action-card blue" onClick={() => navigate('home')}>
            <div className="portal-action-icon"><ShoppingCart size={24} /></div>
            <div><h3>Place an Order</h3><p>Browse verified local vendors and book a service in seconds.</p></div>
          </button>
          <button className="portal-action-card navy" onClick={() => setActiveNav('payments')}>
            <div className="portal-action-icon"><CreditCard size={24} /></div>
            <div><h3>Make a Payment</h3><p>Clear your pending service dues securely online.</p></div>
          </button>
        </div>
        <div className="portal-stat-row">
          <div className="portal-stat-card warn">
            <div className="portal-stat-head"><AlertTriangle size={15} /> Past Due</div>
            <div className="portal-stat-value">{fmtINR(stats.pastDueAmt)}</div>
            <div className="portal-stat-sub">{stats.pastDue.length} overdue order(s)</div>
          </div>
          <div className="portal-stat-card soon">
            <div className="portal-stat-head"><Clock size={15} /> Due Soon</div>
            <div className="portal-stat-value">{stats.dueSoon.length}</div>
            <div className="portal-stat-sub">upcoming appointments</div>
          </div>
          <div className="portal-stat-card total">
            <div className="portal-stat-head"><Flag size={15} /> Total Outstanding</div>
            <div className="portal-stat-value">{fmtINR(stats.outstandingAmt)}</div>
            <div className="portal-stat-sub">{stats.count} active order(s)</div>
          </div>
        </div>
        <div className="portal-widget-row">
          <Widget title="Last 5 Orders" icon={<Package size={16} />}>
            {loading ? <div className="portal-empty">Loading…</div> :
              rows.length === 0 ? <div className="portal-empty">No orders yet.</div> :
              <table className="portal-table"><thead><tr><th>Order #</th><th>Date</th><th>Status</th></tr></thead>
                <tbody>{rows.slice(0,5).map(r => <tr key={r.id}><td><span className="portal-link">SS-{String(r.id).padStart(5,'0')}</span></td><td>{fmtDate(r.preferred_time)}</td><td><StatusPill status={r.status} /></td></tr>)}</tbody>
              </table>}
          </Widget>
          <Widget title="Next 5 Appointments" icon={<Truck size={16} />} icoClass="amber">
            {loading ? <div className="portal-empty">Loading…</div> :
              rows.filter(r => ['requested','accepted','in_progress'].includes(r.status)).length === 0 ? <div className="portal-empty">No upcoming appointments.</div> :
              <table className="portal-table"><thead><tr><th>Appt #</th><th>Due Date</th><th>Status</th></tr></thead>
                <tbody>{rows.filter(r => ['requested','accepted','in_progress'].includes(r.status)).sort((a,b) => new Date(a.preferred_time)-new Date(b.preferred_time)).slice(0,5).map(r => <tr key={r.id}><td><span className="portal-link">SS-{String(r.id).padStart(5,'0')}</span></td><td>{fmtDate(r.preferred_time)}</td><td><StatusPill status={r.status} /></td></tr>)}</tbody>
              </table>}
          </Widget>
          <Widget title="Outstanding Payments" icon={<Wallet size={16} />} icoClass="green">
            {loading ? <div className="portal-empty">Loading…</div> :
              rows.filter(r => ['requested','accepted','completed'].includes(r.status)).length === 0 ? <div className="portal-empty">No outstanding payments.</div> :
              <table className="portal-table"><thead><tr><th>Invoice #</th><th>Due Date</th><th>Amount</th></tr></thead>
                <tbody>{rows.filter(r => ['requested','accepted','completed'].includes(r.status)).slice(0,5).map(r => <tr key={r.id}><td><span className="portal-link">INV-{String(r.id).padStart(5,'0')}</span></td><td>{fmtDate(r.preferred_time)}</td><td><strong>{fmtINR(estPrice(r.service_category))}</strong></td></tr>)}</tbody>
              </table>}
          </Widget>
        </div>
      </>
    );
  }

  // ===== ORDERS =====
  if (activeNav === 'orders') {
    content = (
      <>
        <PageHead icon={<Package size={22} />} title="Orders" />
        <div style={{ display:'flex',gap:8,marginBottom:18,flexWrap:'wrap' }}>
          {['all','requested','accepted','in_progress','completed','cancelled'].map(s => (
            <button key={s} className={`portal-btn ${statusFilter===s?'primary':''}`} onClick={() => setStatusFilter(s)}>
              {s === 'all' ? 'All' : s.charAt(0).toUpperCase()+s.slice(1).replace('_',' ')}
            </button>
          ))}
        </div>
        <Widget title="All Orders" icon={<Package size={16} />} count={filteredRows.length}>
          {filteredRows.length === 0 ? <div className="portal-empty">No orders found.</div> :
          <table className="portal-table">
            <thead><tr><th>Order #</th><th>Vendor</th><th>Service</th><th>City</th><th>Date</th><th>Status</th><th>Amount</th><th></th></tr></thead>
            <tbody>{filteredRows.map(r => (
              <tr key={r.id}>
                <td><span className="portal-link">SS-{String(r.id).padStart(5,'0')}</span></td>
                <td>{r.vendor_name}<br /><span style={{color:'var(--portal-muted)',fontSize:11}}>{r.vendor_area}</span></td>
                <td>{r.service_category}</td><td>{r.city}</td>
                <td>{fmtDate(r.preferred_time)}</td><td><StatusPill status={r.status} /></td>
                <td><strong>{fmtINR(estPrice(r.service_category))}</strong></td>
                <td>
                  {r.status === 'requested' && <button className="portal-btn danger" onClick={() => cancel(r.id)}>Cancel</button>}
                  {r.status === 'completed' && !reviewedIds.has(r.id) && <button className="portal-btn primary" onClick={() => setReviewing(r)}><ArrowUpRight size={14} /> Review</button>}
                  {r.status === 'completed' && reviewedIds.has(r.id) && <span className="portal-pill green">Reviewed ✓</span>}
                </td>
              </tr>
            ))}</tbody>
          </table>}
        </Widget>
      </>
    );
  }

  // ===== APPOINTMENTS =====
  if (activeNav === 'appointments') {
    const appts = rows.filter(r => ['requested','accepted','in_progress'].includes(r.status)).sort((a,b) => new Date(a.preferred_time)-new Date(b.preferred_time));
    content = (
      <>
        <PageHead icon={<Truck size={22} />} title="Appointments" />
        <div className="portal-stat-row">
          <div className="portal-stat-card soon">
            <div className="portal-stat-head"><Calendar size={15} /> Total Upcoming</div>
            <div className="portal-stat-value">{appts.length}</div>
          </div>
          <div className="portal-stat-card warn">
            <div className="portal-stat-head"><Clock size={15} /> Pending</div>
            <div className="portal-stat-value">{appts.filter(r => r.status==='requested').length}</div>
          </div>
          <div className="portal-stat-card total">
            <div className="portal-stat-head"><CheckCircle2 size={15} /> Confirmed</div>
            <div className="portal-stat-value">{appts.filter(r => r.status==='accepted').length}</div>
          </div>
        </div>
        <Widget title="All Appointments" icon={<Truck size={16} />} icoClass="amber" count={appts.length}>
          {appts.length === 0 ? <div className="portal-empty">No upcoming appointments.</div> :
          <table className="portal-table">
            <thead><tr><th>Appt #</th><th>Vendor</th><th>Service</th><th>Scheduled</th><th>City</th><th>Status</th></tr></thead>
            <tbody>{appts.map(r => (
              <tr key={r.id}>
                <td><span className="portal-link">SS-{String(r.id).padStart(5,'0')}</span></td>
                <td>{r.vendor_name}</td><td>{r.service_category}</td>
                <td>{fmtDate(r.preferred_time)}</td><td>{r.city}</td><td><StatusPill status={r.status} /></td>
              </tr>
            ))}</tbody>
          </table>}
        </Widget>
      </>
    );
  }

  // ===== INVOICES =====
  if (activeNav === 'invoices') {
    const invoices = rows.map(r => ({ ...r, amount: estPrice(r.service_category) }));
    content = (
      <>
        <PageHead icon={<FileText size={22} />} title="Invoices" />
        <Widget title="All Invoices" icon={<FileText size={16} />} count={invoices.length}>
          {invoices.length === 0 ? <div className="portal-empty">No invoices yet.</div> :
          <table className="portal-table">
            <thead><tr><th>Invoice #</th><th>Vendor</th><th>Service</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>{invoices.map(r => (
              <tr key={r.id}>
                <td><span className="portal-link">INV-{String(r.id).padStart(5,'0')}</span></td>
                <td>{r.vendor_name}</td><td>{r.service_category}</td>
                <td>{fmtDate(r.preferred_time)}</td><td><strong>{fmtINR(r.amount)}</strong></td>
                <td><StatusPill status={r.status} /></td>
              </tr>
            ))}</tbody>
          </table>}
        </Widget>
      </>
    );
  }

  // ===== PAYMENTS =====
  if (activeNav === 'payments') {
    const outstanding = rows.filter(r => ['requested','accepted'].includes(r.status)).map(r => ({ ...r, amount: estPrice(r.service_category) }));
    const paid = rows.filter(r => r.status === 'completed').map(r => ({ ...r, amount: estPrice(r.service_category) }));
    content = (
      <>
        <PageHead icon={<Wallet size={22} />} title="Payments" />
        <div className="portal-stat-row">
          <div className="portal-stat-card warn">
            <div className="portal-stat-head"><AlertTriangle size={15} /> Outstanding</div>
            <div className="portal-stat-value">{fmtINR(outstanding.reduce((s,r)=>s+r.amount,0))}</div>
            <div className="portal-stat-sub">{outstanding.length} pending payment(s)</div>
          </div>
          <div className="portal-stat-card soon">
            <div className="portal-stat-head"><CheckCircle2 size={15} /> Paid</div>
            <div className="portal-stat-value">{fmtINR(stats.paidAmt)}</div>
            <div className="portal-stat-sub">{paid.length} completed order(s)</div>
          </div>
          <div className="portal-stat-card total">
            <div className="portal-stat-head"><IndianRupee size={15} /> Total</div>
            <div className="portal-stat-value">{fmtINR(stats.outstandingAmt + stats.paidAmt)}</div>
            <div className="portal-stat-sub">all-time</div>
          </div>
        </div>
        <div className="portal-widget-row">
          <Widget title="Outstanding Payments" icon={<AlertTriangle size={16} />} icoClass="amber" count={outstanding.length}>
            {outstanding.length === 0 ? <div className="portal-empty">No outstanding payments.</div> :
            <table className="portal-table"><thead><tr><th>Invoice #</th><th>Vendor</th><th>Amount</th><th>Action</th></tr></thead>
              <tbody>{outstanding.map(r => (
                <tr key={r.id}><td><span className="portal-link">INV-{String(r.id).padStart(5,'0')}</span></td><td>{r.vendor_name}</td><td><strong>{fmtINR(r.amount)}</strong></td>
                  <td><button className="portal-btn primary" onClick={() => showToast('Payment processing… Demo only.')}>Pay Now</button></td>
                </tr>
              ))}</tbody>
            </table>}
          </Widget>
          <Widget title="Payment History" icon={<CheckCircle2 size={16} />} icoClass="green" count={paid.length}>
            {paid.length === 0 ? <div className="portal-empty">No payments yet.</div> :
            <table className="portal-table"><thead><tr><th>Invoice #</th><th>Vendor</th><th>Amount</th><th>Date</th></tr></thead>
              <tbody>{paid.map(r => (
                <tr key={r.id}><td><span className="portal-link">INV-{String(r.id).padStart(5,'0')}</span></td><td>{r.vendor_name}</td><td><strong>{fmtINR(r.amount)}</strong></td><td>{fmtDate(r.preferred_time)}</td></tr>
              ))}</tbody>
            </table>}
          </Widget>
        </div>
      </>
    );
  }

  // ===== CREDIT NOTES =====
  if (activeNav === 'creditnotes') {
    const credits = rows.filter(r => r.status === 'cancelled').map(r => ({ ...r, amount: estPrice(r.service_category) }));
    content = (
      <>
        <PageHead icon={<ReceiptText size={22} />} title="Credit Notes" />
        <div className="portal-stat-row">
          <div className="portal-stat-card warn">
            <div className="portal-stat-head"><XCircle size={15} /> Cancelled</div>
            <div className="portal-stat-value">{credits.length}</div>
            <div className="portal-stat-sub">cancelled order(s)</div>
          </div>
          <div className="portal-stat-card total">
            <div className="portal-stat-head"><IndianRupee size={15} /> Credit Value</div>
            <div className="portal-stat-value">{fmtINR(stats.cancelledAmt)}</div>
            <div className="portal-stat-sub">total credit issued</div>
          </div>
          <div className="portal-stat-card soon">
            <div className="portal-stat-head"><CheckCircle2 size={15} /> Refundable</div>
            <div className="portal-stat-value">{fmtINR(stats.cancelledAmt)}</div>
            <div className="portal-stat-sub">available for refund</div>
          </div>
        </div>
        <Widget title="Credit Notes" icon={<ReceiptText size={16} />} icoClass="amber" count={credits.length}>
          {credits.length === 0 ? <div className="portal-empty">No credit notes. Cancelled orders will appear here.</div> :
          <table className="portal-table"><thead><tr><th>CN #</th><th>Vendor</th><th>Service</th><th>Date</th><th>Amount</th><th>Reason</th></tr></thead>
            <tbody>{credits.map(r => (
              <tr key={r.id}><td><span className="portal-link">CN-{String(r.id).padStart(5,'0')}</span></td><td>{r.vendor_name}</td><td>{r.service_category}</td><td>{fmtDate(r.preferred_time)}</td><td><strong>{fmtINR(r.amount)}</strong></td><td>Order Cancelled</td></tr>
            ))}</tbody>
          </table>}
        </Widget>
      </>
    );
  }

  // ===== STATEMENT =====
  if (activeNav === 'statement') {
    const totalOrders = rows.length;
    const totalPaid = stats.paidAmt;
    const totalOutstanding = stats.outstandingAmt;
    const totalCancelled = stats.cancelledAmt;
    content = (
      <>
        <PageHead icon={<BookOpen size={22} />} title="Account Statement" />
        <div className="portal-stat-row">
          <div className="portal-stat-card soon">
            <div className="portal-stat-head"><Package size={15} /> Total Orders</div>
            <div className="portal-stat-value">{totalOrders}</div>
          </div>
          <div className="portal-stat-card total">
            <div className="portal-stat-head"><IndianRupee size={15} /> Total Paid</div>
            <div className="portal-stat-value">{fmtINR(totalPaid)}</div>
          </div>
          <div className="portal-stat-card warn">
            <div className="portal-stat-head"><AlertTriangle size={15} /> Outstanding</div>
            <div className="portal-stat-value">{fmtINR(totalOutstanding)}</div>
          </div>
        </div>
        <Widget title="Statement Summary" icon={<BookOpen size={16} />}>
          {rows.length === 0 ? <div className="portal-empty">No transactions yet.</div> :
          <table className="portal-table">
            <thead><tr><th>Ref #</th><th>Date</th><th>Description</th><th>Type</th><th>Amount</th><th>Status</th></tr></thead>
            <tbody>{rows.map(r => (
              <tr key={r.id}>
                <td><span className="portal-link">SS-{String(r.id).padStart(5,'0')}</span></td>
                <td>{fmtDate(r.preferred_time)}</td>
                <td>{r.service_category} — {r.vendor_name}</td>
                <td>{r.status === 'cancelled' ? 'Credit' : 'Debit'}</td>
                <td><strong>{fmtINR(estPrice(r.service_category))}</strong></td>
                <td><StatusPill status={r.status} /></td>
              </tr>
            ))}</tbody>
            <tfoot><tr><td colSpan="4" style={{textAlign:'right',fontWeight:700}}>Net Balance:</td><td colSpan="2"><strong>{fmtINR(totalPaid + totalOutstanding)}</strong></td></tr></tfoot>
          </table>}
        </Widget>
      </>
    );
  }

  // ===== MAKE A PAYMENT =====
  if (activeNav === 'pay') {
    const outstanding = rows.filter(r => ['requested','accepted'].includes(r.status)).map(r => ({ ...r, amount: estPrice(r.service_category) }));
    content = (
      <>
        <PageHead icon={<CreditCard size={22} />} title="Make a Payment" />
        <div className="portal-stat-card total" style={{marginBottom:18}}>
          <div className="portal-stat-head"><IndianRupee size={15} /> Total Due</div>
          <div className="portal-stat-value">{fmtINR(outstanding.reduce((s,r)=>s+r.amount,0))}</div>
          <div className="portal-stat-sub">{outstanding.length} pending invoice(s)</div>
        </div>
        <Widget title="Pending Invoices" icon={<CreditCard size={16} />} icoClass="green" count={outstanding.length}>
          {outstanding.length === 0 ? <div className="portal-empty">No pending payments. You're all caught up! 🎉</div> :
          <table className="portal-table"><thead><tr><th>Invoice #</th><th>Vendor</th><th>Service</th><th>Amount</th><th>Action</th></tr></thead>
            <tbody>{outstanding.map(r => (
              <tr key={r.id}><td><span className="portal-link">INV-{String(r.id).padStart(5,'0')}</span></td><td>{r.vendor_name}</td><td>{r.service_category}</td><td><strong>{fmtINR(r.amount)}</strong></td>
                <td><button className="portal-btn primary" onClick={() => showToast('Payment of ' + fmtINR(r.amount) + ' processing… Demo only.')}>Pay {fmtINR(r.amount)}</button></td>
              </tr>
            ))}</tbody>
          </table>}
        </Widget>
        <div className="portal-btn-row" style={{marginTop:18}}>
          <button className="portal-btn primary" onClick={() => showToast('Payment of ' + fmtINR(outstanding.reduce((s,r)=>s+r.amount,0)) + ' processing… Demo only.')}>Pay All ({fmtINR(outstanding.reduce((s,r)=>s+r.amount,0))})</button>
        </div>
      </>
    );
  }

  // ===== PLACE AN ORDER =====
  if (activeNav === 'order') { content = null; }

  // ===== SETTINGS =====
  if (activeNav === 'settings') {
    content = (
      <>
        <PageHead icon={<Settings size={22} />} title="Settings" />
        <div className="portal-widget-row">
          <Widget title="Profile" icon={<Settings size={16} />}>
            <div style={{padding:'16px 18px'}}>
              <p style={{fontSize:14,margin:'0 0 8px'}}><strong>Name:</strong> {user?.name || '—'}</p>
              <p style={{fontSize:14,margin:'0 0 8px'}}><strong>Email:</strong> {user?.identifier || user?.email || '—'}</p>
              <p style={{fontSize:14,margin:'0 0 8px'}}><strong>City:</strong> {user?.city || '—'}</p>
              <p style={{fontSize:14,margin:'0 0 8px'}}><strong>Role:</strong> Customer</p>
              <div className="portal-btn-row" style={{marginTop:12}}>
                <button className="portal-btn" onClick={() => showToast('Profile editing is not available in demo.')}>Edit Profile</button>
                <button className="portal-btn danger" onClick={logout}>Logout</button>
              </div>
            </div>
          </Widget>
          <Widget title="Notifications" icon={<Bell size={16} />} icoClass="amber">
            <div style={{padding:'16px 18px'}}>
              <p style={{fontSize:13,color:'var(--portal-muted)',margin:0}}>Notification preferences for order updates, appointment reminders, and payment due alerts.</p>
              <div className="portal-btn-row" style={{marginTop:12}}>
                <button className="portal-btn" onClick={() => showToast('Notifications enabled.')}>Enable All</button>
                <button className="portal-btn" onClick={() => showToast('Notifications disabled.')}>Disable</button>
              </div>
            </div>
          </Widget>
          <Widget title="Security" icon={<CheckCircle2 size={16} />} icoClass="green">
            <div style={{padding:'16px 18px'}}>
              <p style={{fontSize:13,color:'var(--portal-muted)',margin:0}}>Your account uses secure authentication. Change your password regularly to keep it safe.</p>
              <div className="portal-btn-row" style={{marginTop:12}}>
                <button className="portal-btn" onClick={() => showToast('Password change is not available in demo.')}>Change Password</button>
              </div>
            </div>
          </Widget>
        </div>
      </>
    );
  }

  return (
    <PortalShell user={user} onLogout={logout} navigate={navigate} activeNav={activeNav} navItems={navItems} onNav={onNav}>
      {content}
      {reviewing && <ReviewModal booking={reviewing} onClose={() => setReviewing(null)} onSubmitted={handleReviewSubmitted} />}
      {toast && <div className="portal-toast">{toast}</div>}
    </PortalShell>
  );
}
