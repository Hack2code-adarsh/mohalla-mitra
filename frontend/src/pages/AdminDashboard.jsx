import React, { useEffect, useState } from 'react';
import {
  LayoutDashboard, Users, Store, Package, Star, Settings as SettingsIcon,
  Menu, Moon, Sun, Bell, Download, Trash2, ShieldCheck, TrendingUp,
  Mail, ShoppingCart, UserPlus, Activity, IndianRupee,
} from 'lucide-react';
import { api, clearToken } from '../api.js';
import { useAuth } from '../App.jsx';
import '../admin.css';

const PRICE_MAP = {
  Electrician: 450, Plumber: 400, Tutor: 600, Tiffin: 1800,
  'Bike Mechanic': 350, Salon: 300, Cleaner: 250, Carpenter: 500,
  Painter: 800, ACRepair: 700,
  Restaurant: 200, Sweets: 350, Cafe: 120, 'Provision Store': 150,
  Stationery: 80, 'Ice Cream': 150, Bakery: 100, Grocery: 50,
  Florist: 250, 'General Store': 100,
};
function estPrice(cat) { return PRICE_MAP[cat] ?? 350; }
function fmtINR(n) { return '₹' + (n || 0).toLocaleString('en-IN'); }
function fmtDate(s) {
  if (!s) return '—';
  const d = new Date(s);
  if (isNaN(d)) return s;
  return d.toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' });
}
function StatusPill({ status }) {
  const map = {
    requested: ['amber', 'New'], accepted: ['blue', 'Accepted'],
    in_progress: ['blue', 'In Progress'], completed: ['green', 'Completed'],
    cancelled: ['gray', 'Cancelled'], rejected: ['red', 'Rejected'],
  };
  const [cls, label] = map[status] || ['gray', status];
  return <span className={`ad-badge ad-badge-${cls}`}>{label}</span>;
}

function ProgressRing({ pct, indigo }) {
  const r = 22;
  const c = 2 * Math.PI * r;
  const offset = c - (pct / 100) * c;
  return (
    <div className="ad-progress-ring">
      <svg width="56" height="56">
        <circle className="ad-progress-ring-bg" cx="28" cy="28" r={r} />
        <circle className={`ad-progress-ring-fg ${indigo ? 'indigo' : ''}`} cx="28" cy="28" r={r}
          strokeDasharray={c} strokeDashoffset={offset} />
      </svg>
      <span className="ad-progress-pct">{pct}%</span>
    </div>
  );
}

function StatCard({ icon, value, label, pct, indigo }) {
  return (
    <div className="ad-stat-card">
      <div className="ad-stat-info">
        <div className="ad-stat-icon">{icon}</div>
        <p className="ad-stat-value">{value}</p>
        <p className="ad-stat-label">{label}</p>
      </div>
      <div className="ad-stat-progress">
        <ProgressRing pct={pct} indigo={indigo} />
      </div>
    </div>
  );
}

function MiniLineChart({ data }) {
  if (!data || data.length === 0) return <div className="ad-empty">No revenue data yet.</div>;
  const w = 600, h = 260, pad = { l: 50, r: 20, t: 20, b: 50 };
  const cw = w - pad.l - pad.r, ch = h - pad.t - pad.b;
  const maxVal = Math.max(...data.map(d => d.value), 100);
  const minVal = 0;
  const xStep = data.length > 1 ? cw / (data.length - 1) : cw;
  const yScale = (v) => pad.t + ch - ((v - minVal) / (maxVal - minVal)) * ch;

  function smoothPath(values) {
    if (values.length === 0) return '';
    let d = `M ${pad.l} ${yScale(values[0])}`;
    for (let i = 1; i < values.length; i++) {
      const x1 = pad.l + (i - 1) * xStep, x2 = pad.l + i * xStep;
      const y1 = yScale(values[i - 1]), y2 = yScale(values[i]);
      const cx1 = x1 + xStep / 2, cx2 = x2 - xStep / 2;
      d += ` C ${cx1} ${y1}, ${cx2} ${y2}, ${x2} ${y2}`;
    }
    return d;
  }

  const values = data.map(d => d.value);
  const yTicks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];

  return (
    <div className="ad-chart">
      <svg viewBox={`0 0 ${w} ${h}`} style={{ width: '100%', height: '100%' }}>
        {yTicks.map((v, i) => (
          <text key={i} x={pad.l - 10} y={yScale(v) + 4} fontSize="10" fill="#6b7280" textAnchor="end">{fmtINR(v)}</text>
        ))}
        {data.map((d, i) => (
          <text key={i} x={pad.l + i * xStep} y={h - 12} fontSize="9" fill="#6b7280" textAnchor="middle"
            transform={`rotate(-30 ${pad.l + i * xStep} ${h - 12})`}>{d.label}</text>
        ))}
        <path d={smoothPath(values)} stroke="#4cceac" strokeWidth="2.5" fill="none" />
        {values.map((v, i) => (
          <circle key={i} cx={pad.l + i * xStep} cy={yScale(v)} r="3" fill="#4cceac" />
        ))}
      </svg>
      <div className="ad-chart-legend">
        <div className="ad-legend-item"><span className="ad-legend-dot" style={{ background: '#4cceac' }} />Revenue</div>
      </div>
    </div>
  );
}

function TransactionList({ bookings }) {
  return (
    <div className="ad-transactions">
      <div className="ad-tx-head">Recent Transactions</div>
      {bookings.length === 0 ? <div className="ad-empty">No transactions yet.</div> :
        bookings.slice(0, 12).map((b, i) => (
          <div key={i} className="ad-tx-row">
            <div>
              <div className="ad-tx-id">SS-{String(b.id).padStart(5, '0')}</div>
              <div className="ad-tx-user">{b.customer_name}</div>
            </div>
            <div className="ad-tx-date">{fmtDate(b.preferred_time)}</div>
            <div className="ad-tx-amount">{fmtINR(estPrice(b.service_category))}</div>
          </div>
        ))
      }
    </div>
  );
}

export default function AdminDashboard() {
  const { navigate } = useAuth();
  const [collapsed, setCollapsed] = useState(false);
  const [dark, setDark] = useState(true);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [stats, setStats] = useState(null);
  const [users, setUsers] = useState([]);
  const [vendors, setVendors] = useState([]);
  const [bookings, setBookings] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [toast, setToast] = useState('');
  const [loading, setLoading] = useState(true);
  const [sectionLoading, setSectionLoading] = useState({});

  function showToast(m) { setToast(m); setTimeout(() => setToast(''), 3000); }
  function logout() { clearToken(); navigate('home'); window.location.reload(); }

  useEffect(() => {
    api.adminStats().then(s => { setStats(s); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  function loadUsers() { setSectionLoading(s => ({...s, users:true})); api.adminUsers().then(setUsers).catch(()=>{}).finally(()=>setSectionLoading(s=>({...s,users:false}))); }
  function loadVendors() { setSectionLoading(s => ({...s, vendors:true})); api.adminVendors().then(setVendors).catch(()=>{}).finally(()=>setSectionLoading(s=>({...s,vendors:false}))); }
  function loadBookings() { setSectionLoading(s => ({...s, bookings:true})); api.adminBookings().then(setBookings).catch(()=>{}).finally(()=>setSectionLoading(s=>({...s,bookings:false}))); }
  function loadReviews() { setSectionLoading(s => ({...s, reviews:true})); api.adminReviews().then(setReviews).catch(()=>{}).finally(()=>setSectionLoading(s=>({...s,reviews:false}))); }

  function onNav(key) { setActiveNav(key); if (key==='users'&&!users.length) loadUsers(); if (key==='vendors'&&!vendors.length) loadVendors(); if (key==='bookings'&&!bookings.length) loadBookings(); if (key==='reviews'&&!reviews.length) loadReviews(); }

  async function verifyVendor(id) { try { await api.adminVerifyVendor(id); showToast('Vendor verified!'); loadVendors(); api.adminStats().then(setStats); } catch(e){showToast(e.message);} }
  async function deleteVendor(id) { if(!confirm('Delete this vendor listing?')) return; try { await api.adminDeleteVendor(id); showToast('Vendor deleted.'); loadVendors(); api.adminStats().then(setStats); } catch(e){showToast(e.message);} }
  async function deleteUser(id) { if(!confirm('Delete this user and all data?')) return; try { await api.adminDeleteUser(id); showToast('User deleted.'); loadUsers(); api.adminStats().then(setStats); } catch(e){showToast(e.message);} }

  // ===== Original sidebar options =====
  const navGroups = [
    { label: '', items: [{ key:'dashboard', label:'Dashboard', icon: LayoutDashboard }] },
    { label: 'Data', items: [
      { key:'users', label:'Users', icon: Users },
      { key:'vendors', label:'Vendors', icon: Store },
      { key:'bookings', label:'Bookings', icon: Package },
      { key:'reviews', label:'Reviews', icon: Star },
    ]},
    { label: 'Settings', items: [
      { key:'settings', label:'Settings', icon: SettingsIcon },
    ]},
  ];

  // Real revenue data from bookings
  const revenueData = bookings.length > 0
    ? bookings.slice(0, 10).reverse().map(b => ({
        label: fmtDate(b.preferred_time),
        value: estPrice(b.service_category),
      }))
    : [];
  const totalRevenue = stats ? (stats.completed_bookings || 0) * 450 + (stats.pending_bookings || 0) * 350 : 0;

  let content = null;

  // DASHBOARD
  if (activeNav === 'dashboard') {
    content = (
      <>
        <div className="ad-page-header">
          <div>
            <h1 className="ad-page-title">DASHBOARD</h1>
            <p className="ad-page-subtitle">Welcome to your dashboard</p>
          </div>
          <button className="ad-report-btn"><Download size={16} /> DOWNLOAD REPORTS</button>
        </div>

        <div className="ad-stat-row">
          <StatCard icon={<Mail size={20} />} value={loading ? '—' : (stats?.total_users || 0).toLocaleString()} label="Total Users" pct={14} />
          <StatCard icon={<ShoppingCart size={20} />} value={loading ? '—' : (stats?.total_vendors || 0).toLocaleString()} label="Total Vendors" pct={21} indigo />
          <StatCard icon={<UserPlus size={20} />} value={loading ? '—' : (stats?.total_bookings || 0).toLocaleString()} label="Total Bookings" pct={5} />
          <StatCard icon={<Activity size={20} />} value={loading ? '—' : (stats?.total_reviews || 0).toLocaleString()} label="Total Reviews" pct={43} indigo />
        </div>

        <div className="ad-grid-2">
          <div className="ad-card">
            <div className="ad-card-head">
              <div>
                <h3 className="ad-card-title">Revenue Generated</h3>
                <p className="ad-card-value">{loading ? '—' : fmtINR(totalRevenue)}</p>
              </div>
              <button className="ad-card-icon-btn"><Download size={18} /></button>
            </div>
            <MiniLineChart data={revenueData} />
          </div>
          <div className="ad-card">
            <TransactionList bookings={bookings.length > 0 ? bookings : []} />
          </div>
        </div>

        {/* Platform Stats */}
        {stats && (
          <div className="ad-grid-2">
            <div className="ad-card">
              <div className="ad-card-head"><div><h3 className="ad-card-title">Users by City</h3></div></div>
              {stats.city_stats.length === 0 ? <div className="ad-empty">No data.</div> :
                <table className="ad-table"><thead><tr><th>City</th><th>Users</th></tr></thead>
                  <tbody>{stats.city_stats.map((c, i) => <tr key={i}><td>{c.city}</td><td style={{ color: 'var(--ad-mint)', fontWeight: 700 }}>{c.c}</td></tr>)}</tbody>
                </table>}
            </div>
            <div className="ad-card">
              <div className="ad-card-head"><div><h3 className="ad-card-title">Vendors by Category</h3></div></div>
              {stats.category_stats.length === 0 ? <div className="ad-empty">No data.</div> :
                <table className="ad-table"><thead><tr><th>Category</th><th>Vendors</th></tr></thead>
                  <tbody>{stats.category_stats.map((c, i) => <tr key={i}><td>{c.category}</td><td style={{ color: 'var(--ad-mint)', fontWeight: 700 }}>{c.c}</td></tr>)}</tbody>
                </table>}
            </div>
          </div>
        )}
      </>
    );
  }

  // USERS
  if (activeNav === 'users') {
    content = (
      <>
        <div className="ad-page-header"><div><h1 className="ad-page-title">USERS</h1><p className="ad-page-subtitle">View and manage all registered users</p></div></div>
        <div className="ad-card">
          {sectionLoading.users ? <div className="ad-empty">Loading…</div> :
            users.length === 0 ? <div className="ad-empty">No users registered yet.</div> :
            <table className="ad-table">
              <thead><tr><th>ID</th><th>Name</th><th>Email</th><th>Username</th><th>Role</th><th>City</th><th>Auth</th><th>Joined</th><th></th></tr></thead>
              <tbody>{users.map(u => (
                <tr key={u.id}>
                  <td>{u.id}</td><td>{u.name}</td><td style={{ fontSize: 13 }}>{u.identifier}</td><td>{u.username || '—'}</td>
                  <td><span className={`ad-badge ad-badge-${u.role === 'vendor' ? 'amber' : 'blue'}`}>{u.role}</span></td>
                  <td>{u.city}</td><td>{u.auth_method}</td><td>{fmtDate(u.created_at)}</td>
                  <td><button className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => deleteUser(u.id)}><Trash2 size={14} /></button></td>
                </tr>
              ))}</tbody>
            </table>}
        </div>
      </>
    );
  }

  // VENDORS
  if (activeNav === 'vendors') {
    content = (
      <>
        <div className="ad-page-header"><div><h1 className="ad-page-title">VENDORS</h1><p className="ad-page-subtitle">Verify, monitor, and manage vendor listings</p></div></div>
        <div className="ad-card">
          {sectionLoading.vendors ? <div className="ad-empty">Loading…</div> :
            vendors.length === 0 ? <div className="ad-empty">No vendor listings yet.</div> :
            <table className="ad-table">
              <thead><tr><th>ID</th><th>Business</th><th>Category</th><th>City</th><th>Area</th><th>Price</th><th>Rating</th><th>Status</th><th>Actions</th></tr></thead>
              <tbody>{vendors.map(v => (
                <tr key={v.id}>
                  <td>{v.id}</td><td>{v.name}<br /><span style={{ fontSize: 11, color: 'var(--ad-dim)' }}>{v.owner_name || 'Seeded'}</span></td>
                  <td>{v.category}</td><td>{v.city}</td><td>{v.area}</td>
                  <td style={{ color: 'var(--ad-mint)', fontWeight: 700 }}>{fmtINR(v.price)}</td>
                  <td>{v.rating} ★</td>
                  <td><span className={`ad-badge ad-badge-${v.verified ? 'green' : 'amber'}`}>{v.verified ? 'Verified' : 'Pending'}</span></td>
                  <td><div className="ad-btn-row">
                    {!v.verified && <button className="ad-btn ad-btn-primary ad-btn-sm" onClick={() => verifyVendor(v.id)}><ShieldCheck size={14} /> Verify</button>}
                    <button className="ad-btn ad-btn-danger ad-btn-sm" onClick={() => deleteVendor(v.id)}><Trash2 size={14} /></button>
                  </div></td>
                </tr>
              ))}</tbody>
            </table>}
        </div>
      </>
    );
  }

  // BOOKINGS
  if (activeNav === 'bookings') {
    content = (
      <>
        <div className="ad-page-header"><div><h1 className="ad-page-title">BOOKINGS</h1><p className="ad-page-subtitle">Monitor all customer bookings across the platform</p></div></div>
        <div className="ad-card">
          {sectionLoading.bookings ? <div className="ad-empty">Loading…</div> :
            bookings.length === 0 ? <div className="ad-empty">No bookings yet.</div> :
            <table className="ad-table">
              <thead><tr><th>ID</th><th>Customer</th><th>Vendor</th><th>Service</th><th>City</th><th>Date</th><th>Amount</th><th>Status</th></tr></thead>
              <tbody>{bookings.map(b => (
                <tr key={b.id}>
                  <td><span className="ad-link">SS-{String(b.id).padStart(5, '0')}</span></td>
                  <td>{b.customer_name}</td><td>{b.vendor_name}</td><td>{b.service_category}</td>
                  <td>{b.city}</td><td>{fmtDate(b.preferred_time)}</td>
                  <td style={{ color: 'var(--ad-mint)', fontWeight: 700 }}>{fmtINR(estPrice(b.service_category))}</td>
                  <td><StatusPill status={b.status} /></td>
                </tr>
              ))}</tbody>
            </table>}
        </div>
      </>
    );
  }

  // REVIEWS
  if (activeNav === 'reviews') {
    content = (
      <>
        <div className="ad-page-header"><div><h1 className="ad-page-title">REVIEWS</h1><p className="ad-page-subtitle">Monitor customer feedback across all vendors</p></div></div>
        <div className="ad-card">
          {sectionLoading.reviews ? <div className="ad-empty">Loading…</div> :
            reviews.length === 0 ? <div className="ad-empty">No reviews yet.</div> :
            <div style={{ padding: '8px 0' }}>
              {reviews.map((rv, i) => (
                <div key={i} style={{ padding: '16px 0', borderBottom: i < reviews.length - 1 ? '1px solid var(--ad-line)' : 'none' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 }}>
                    <div><span style={{ fontWeight: 700, fontSize: 15, color: 'var(--ad-text)' }}>{rv.customer_name}</span>
                      <span style={{ color: 'var(--ad-dim)', fontSize: 13, marginLeft: 8 }}>→ {rv.vendor_name}</span></div>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <span style={{ display: 'flex', gap: 2 }}>{[1, 2, 3, 4, 5].map(n => <span key={n} style={{ color: n <= (rv.rating || 0) ? '#F59E0B' : '#444', fontSize: 16 }}>★</span>)}</span>
                      {rv.sentiment_label && <span className={`ad-badge ad-badge-${rv.sentiment_label === 'positive' ? 'green' : rv.sentiment_label === 'negative' ? 'red' : 'gray'}`}>{rv.sentiment_label}</span>}
                    </div>
                  </div>
                  <p style={{ fontSize: 14, color: 'var(--ad-muted)', margin: 0 }}>{rv.comment || 'No comment provided.'}</p>
                  <p style={{ fontSize: 12, color: 'var(--ad-dim)', margin: '6px 0 0' }}>{fmtDate(rv.created_at)}</p>
                </div>
              ))}
            </div>}
        </div>
      </>
    );
  }

  // SETTINGS
  if (activeNav === 'settings') {
    content = (
      <>
        <div className="ad-page-header"><div><h1 className="ad-page-title">SETTINGS</h1><p className="ad-page-subtitle">Manage your admin profile and preferences</p></div></div>
        <div className="ad-settings-grid">
          <div className="ad-card ad-setting-item">
            <h3 className="ad-card-title">Admin Profile</h3>
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 14, color: 'var(--ad-muted)', margin: '0 0 6px' }}><strong style={{ color: 'var(--ad-text)' }}>Name:</strong> Administrator</p>
              <p style={{ fontSize: 14, color: 'var(--ad-muted)', margin: '0 0 6px' }}><strong style={{ color: 'var(--ad-text)' }}>Role:</strong> Super Admin</p>
              <p style={{ fontSize: 14, color: 'var(--ad-muted)', margin: '0 0 6px' }}><strong style={{ color: 'var(--ad-text)' }}>Access:</strong> Full platform control</p>
              <div className="ad-btn-row" style={{ marginTop: 16 }}><button className="ad-btn ad-btn-danger" onClick={logout}>Logout</button></div>
            </div>
          </div>
          <div className="ad-card ad-setting-item">
            <h3 className="ad-card-title">Platform Stats</h3>
            <div style={{ marginTop: 16 }}>
              {stats && <>
                <p style={{ fontSize: 14, color: 'var(--ad-muted)', margin: '0 0 6px' }}><strong style={{ color: 'var(--ad-text)' }}>Users:</strong> {stats.total_users}</p>
                <p style={{ fontSize: 14, color: 'var(--ad-muted)', margin: '0 0 6px' }}><strong style={{ color: 'var(--ad-text)' }}>Vendors:</strong> {stats.total_vendors}</p>
                <p style={{ fontSize: 14, color: 'var(--ad-muted)', margin: '0 0 6px' }}><strong style={{ color: 'var(--ad-text)' }}>Bookings:</strong> {stats.total_bookings}</p>
                <p style={{ fontSize: 14, color: 'var(--ad-muted)', margin: '0 0 6px' }}><strong style={{ color: 'var(--ad-text)' }}>Reviews:</strong> {stats.total_reviews}</p>
                <p style={{ fontSize: 14, color: 'var(--ad-muted)', margin: '0 0 6px' }}><strong style={{ color: 'var(--ad-text)' }}>Revenue:</strong> <span style={{ color: 'var(--ad-mint)', fontWeight: 700 }}>{fmtINR(totalRevenue)}</span></p>
              </>}
            </div>
          </div>
          <div className="ad-card ad-setting-item">
            <h3 className="ad-card-title">Theme</h3>
            <div style={{ marginTop: 16 }}>
              <p style={{ fontSize: 14, color: 'var(--ad-muted)', margin: '0 0 12px' }}>Toggle between dark and light mode.</p>
              <button className="ad-btn" onClick={() => setDark(!dark)}>{dark ? <Sun size={16} /> : <Moon size={16} />} {dark ? 'Switch to Light' : 'Switch to Dark'}</button>
            </div>
          </div>
        </div>
      </>
    );
  }

  return (
    <div className={`ad-root ${!dark ? 'ad-light' : ''}`}>
      <aside className={`ad-sidebar ${collapsed ? 'ad-sidebar-collapsed' : ''}`}>
        <div className="ad-sidebar-top">
          <span className="ad-sidebar-title">ADMIN</span>
          <button className="ad-menu-btn" onClick={() => setCollapsed(!collapsed)}><Menu size={22} /></button>
        </div>
        <div className="ad-avatar-wrap">
          <div className="ad-avatar">A</div>
          <div className="ad-avatar-name">Administrator</div>
          <div className="ad-avatar-role">Super Admin</div>
        </div>
        <div className="ad-nav-scroll">
          {navGroups.map((g, gi) => (
            <div key={gi}>
              {g.label && <div className="ad-nav-section">{g.label}</div>}
              {g.items.map(it => {
                const Icon = it.icon;
                return (
                  <button key={it.key} className={`ad-nav-item ${activeNav === it.key ? 'active' : ''}`} onClick={() => onNav(it.key)}>
                    <Icon size={20} /><span>{it.label}</span>
                  </button>
                );
              })}
            </div>
          ))}
        </div>
      </aside>

      <div className="ad-main">
        <div className="ad-topbar">
          <button className="ad-topbar-btn" onClick={() => setDark(!dark)}>{dark ? <Sun size={22} /> : <Moon size={22} />}</button>
          <button className="ad-topbar-btn"><Bell size={22} /></button>
          <button className="ad-topbar-btn" onClick={logout}><SettingsIcon size={22} /></button>
        </div>
        <div className="ad-content">
          {content}
        </div>
      </div>

      {toast && <div className="ad-toast">{toast}</div>}
    </div>
  );
}
