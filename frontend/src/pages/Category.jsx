import React, { useEffect, useState } from 'react';
import { Search } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';

export default function Category({ category = 'Electrician' }) {
  const { city, user, navigate } = useAuth();
  const [weights, setWeights] = useState({ rating: 35, distance: 25, price: 20, response: 20 });
  const [vendors, setVendors] = useState([]);
  const [search, setSearch] = useState('');
  const [booking, setBooking] = useState(null);
  const [form, setForm] = useState({ address: '', preferred_time: 'Today evening', notes: '' });
  const [msg, setMsg] = useState('');

  useEffect(() => {
    api.vendors({ city, category, search, ...weights }).then(setVendors).catch(console.error);
  }, [city, category, search, weights]);

  function w(k, v) { setWeights({ ...weights, [k]: v }); }

  async function submitBooking(e) {
    e.preventDefault();
    if (!user) { navigate('login'); return; }
    try {
      await api.createBooking({ vendor_id: booking.id, ...form });
      setMsg('Booking request sent! Check your customer dashboard.');
      setBooking(null);
    } catch (err) {
      setMsg(err.message);
    }
  }

  return <div className="page layout-two">
    <aside className="panel sticky"><h3>{category} priorities</h3>{Object.keys(weights).map(k => <label className="slider" key={k}><span>{k}</span><input type="range" min="0" max="60" value={weights[k]} onChange={e => w(k, e.target.value)} /><b>{weights[k]}</b></label>)}</aside>
    <section>
      <div className="section-head"><h1>{category} vendors in {city}</h1><p>Ranked live using your preferences.</p></div>

      <div className="mm-search-bar">
        <Search size={18} />
        <input
          type="text"
          placeholder="Search by name, area, or keyword (e.g. plumber, leakage)"
          value={search}
          onChange={e => setSearch(e.target.value)}
        />
        {search && <button type="button" className="mm-search-clear" onClick={() => setSearch('')}>×</button>}
      </div>

      {msg && <div className="alert success">{msg}</div>}
      <div className="vendor-list">{vendors.map(v => <div className="vendor-card" key={v.id}>
        <div>
          <div className="score">{v.match_score}%</div><small>match</small>
          {v.ai_match_score !== null && v.ai_match_score !== undefined && (
            <div className="mm-ai-score"><span className="mm-ai-badge">AI</span> {v.ai_match_score}%</div>
          )}
        </div>
        <div className="vendor-main">
          <h3>{v.name}</h3>
          <p>{v.description}</p>
          <div className="chips"><span>{v.area}</span><span>₹{v.price}</span><span>⭐ {v.rating}</span><span>{v.response_minutes} min</span>{v.verified ? <span>Verified</span> : <span>New</span>}</div>
        </div>
        <button className="primary" onClick={() => setBooking(v)}>Book now</button>
      </div>)}
      {vendors.length === 0 && <p className="mm-no-results">No vendors match your search in {city}. Try a different keyword.</p>}
      </div>
    </section>
    {booking && <div className="modal"><form className="modal-card" onSubmit={submitBooking}><h2>Book {booking.name}</h2><input placeholder="Your complete address" value={form.address} onChange={e => setForm({ ...form, address: e.target.value })} required /><input placeholder="Preferred time" value={form.preferred_time} onChange={e => setForm({ ...form, preferred_time: e.target.value })} /><textarea placeholder="Describe the problem" value={form.notes} onChange={e => setForm({ ...form, notes: e.target.value })} /><button className="primary full">Send request</button><button type="button" onClick={() => setBooking(null)}>Cancel</button></form></div>}
  </div>
}