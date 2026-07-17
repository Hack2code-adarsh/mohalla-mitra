import React, { useEffect, useState } from 'react';
import { api } from '../api.js';

export default function VendorDashboard() {
  const [rows, setRows] = useState([]); const [msg, setMsg] = useState('');
  async function load(){ try { setRows(await api.vendorBookings()); } catch(err){ setMsg(err.message); } }
  useEffect(()=>{ load(); }, []);
  async function setStatus(id, status){ await api.updateBookingStatus(id, status); load(); }
  return <div className="page"><div className="section-head"><h1>Vendor dashboard</h1><p>Manage incoming orders from customers.</p></div>{msg && <div className="alert">{msg}</div>}<div className="order-grid">{rows.map(r=><div className="order-card" key={r.id}><div className="between"><h3>{r.customer_name}</h3><span className={`status ${r.status}`}>{r.status}</span></div><p><b>{r.service_category}</b> • {r.city}</p><p>{r.address}</p><p className="muted">{r.notes}</p><div className="chips"><span>{r.preferred_time}</span><span>{r.customer_identifier}</span></div><div className="actions"><button onClick={()=>setStatus(r.id,'accepted')}>Accept</button><button onClick={()=>setStatus(r.id,'rejected')}>Reject</button><button onClick={()=>setStatus(r.id,'in_progress')}>In progress</button><button className="primary" onClick={()=>setStatus(r.id,'completed')}>Completed</button></div></div>)}{rows.length===0 && <div className="empty panel">No orders yet. Create a vendor listing first, then customer bookings for that listing will appear here.</div>}</div></div>
}
