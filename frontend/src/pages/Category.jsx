import React, { useEffect, useState } from 'react';
import { Search, Star, MapPin, Clock } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import './category-menu.css';

const FOOD_CATS = ['Restaurant','Tiffin','Sweets','Cafe','Bakery','Ice Cream','Grocery','Provision Store'];
const isFood = (c) => FOOD_CATS.includes(c);

/* Food category icons matching MenuRunners circular style */
const FOOD_ICONS = [
  { name:'Restaurant', emoji:'🍽️', color:'#FF6B4A' },
  { name:'Tiffin', emoji:'🍱', color:'#EF4444' },
  { name:'Sweets', emoji:'🍰', color:'#F59E0B' },
  { name:'Cafe', emoji:'☕', color:'#92400E' },
  { name:'Bakery', emoji:'🥖', color:'#D97706' },
  { name:'Ice Cream', emoji:'🍦', color:'#EC4899' },
  { name:'Grocery', emoji:'🛒', color:'#22C55E' },
  { name:'Provision Store', emoji:'🏪', color:'#10B981' },
  { name:'Florist', emoji:'💐', color:'#F0447D' },
  { name:'General Store', emoji:'🏬', color:'#6366F1' },
];

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
    } catch (err) { setMsg(err.message); }
  }

  const isFoodCat = isFood(category);
  const hasFoodItems = (v) => { try { return JSON.parse(v.items||'[]').length>0; } catch { return false; } };

  /* ===== FOOD CATEGORY — MenuRunners style ===== */
  if (isFoodCat) {
    return (
      <div className="mr-food">
        {/* Top nav like screenshot 4 */}
        <div className="mr-top">
          <button className="mr-hamburger" onClick={()=>navigate('home')}>&#9776;</button>
          <span className="mr-loc"><span className="mr-dot">\u 📍</span> {city} <span className="mr-x">\u2715</span></span>
          <span className="mr-logo">Service Sphere</span>
          <span className="mr-cart"><span className="mr-cart-icon">\uD83D\uDED2</span>  $0.00</span>
        </div>

        {/* Category icon scroll */}
        <div className="mr-cat-scroll">
          <button className="mr-scroll-arrow" onClick={() => document.querySelector('.mr-cat-row')?.scrollBy({left:-200,behavior:'smooth'})}>&lt;</button>
          <div className="mr-cat-row">
            {FOOD_ICONS.map(c => (
              <button key={c.name} className={`mr-cat ${category===c.name?'mr-cat-active':''}`} onClick={()=>navigate('category',{category:c.name})}>
                <span className="mr-cat-circle" style={{background:c.color}}>{c.emoji}</span>
                <span className="mr-cat-name">{c.name}</span>
              </button>
            ))}
          </div>
          <button className="mr-scroll-arrow mr-scroll-right" onClick={() => document.querySelector('.mr-cat-row')?.scrollBy({left:200,behavior:'smooth'})}>&gt;</button>
        </div>

        {/* Inline search */}
        <div className="mr-search-bar">
          <Search size={18} color="#999" />
          <input type="text" placeholder="Search restaurants, dishes..." value={search} onChange={e=>setSearch(e.target.value)} />
          {search && <button className="mr-clear" onClick={()=>setSearch('')}>×</button>}
        </div>

        {/* Restaurant cards */}
        {msg && <div className="mr-msg">{msg}</div>}
        <div className="mr-grid">
          {vendors.map(v => (
            <div key={v.id} className="mr-card" onClick={()=>navigate('vendor-detail',{vendorId:v.id})}>
              <div className="mr-card-img">
                {v.photos && JSON.parse(v.photos||'[]')[0]?.url ? (
                  <img src={JSON.parse(v.photos||'[]')[0].url} alt={v.name} />
                ) : (
                  <div className="mr-card-placeholder" style={{background:`linear-gradient(135deg, ${FOOD_ICONS.find(c=>c.name===v.category)?.color||'#FF6B4A'}18, #fff)`}}>
                    <span style={{fontSize:40}}>{FOOD_ICONS.find(c=>c.name===v.category)?.emoji||'🍽️'}</span>
                  </div>
                )}
                {hasFoodItems(v) && <span className="mr-order-tag">Order Online</span>}
              </div>
              <div className="mr-card-body">
                <h3 className="mr-card-title">{v.name}</h3>
                <div className="mr-card-meta">
                  <span><Clock size={12}/> {v.response_minutes}m</span>
                  <span>{v.category}</span>
                  <span>★ {v.rating}</span>
                </div>
                <p className="mr-card-desc">{v.description||v.area}</p>
                <span className="mr-card-price">₹{v.price}+</span>
              </div>
            </div>
          ))}
        </div>
        {vendors.length===0 && <p className="mr-empty">No vendors in {city} for {category}.</p>}

        {/* Second search bar like reference bottom */}
        <div className="mr-bottom-search">
          <span className="mr-pin">📍 Your City</span>
          <input placeholder="ENTER YOUR DELIVERY ADDRESS" />
          <button className="mr-search-btn">🔍</button>
        </div>
      </div>
    );
  }

  /* ===== SERVICE CATEGORY — existing layout ===== */
  return (
    <div className="page layout-two">
      <aside className="panel sticky"><h3>{category} priorities</h3>{Object.keys(weights).map(k => <label className="slider" key={k}><span>{k}</span><input type="range" min="0" max="60" value={weights[k]} onChange={e => w(k, e.target.value)} /><b>{weights[k]}</b></label>)}</aside>
      <section>
        <div className="section-head"><h1>{category} vendors in {city}</h1><p>Ranked live using your preferences.</p></div>
        <div className="mm-search-bar">
          <Search size={18} />
          <input type="text" placeholder="Search by name, area, or keyword" value={search} onChange={e=>setSearch(e.target.value)} />
          {search && <button type="button" className="mm-search-clear" onClick={()=>setSearch('')}>×</button>}
        </div>
        {msg && <div className="alert success">{msg}</div>}
        <div className="vendor-list">{vendors.map(v => (
          <div className="vendor-card" key={v.id}>
            <div><div className="score">{v.match_score}%</div><small>match</small></div>
            <div className="vendor-main" style={{cursor:'pointer'}} onClick={()=>navigate('vendor-detail',{vendorId:v.id})}>
              <h3>{v.name}</h3><p>{v.description}</p>
              <div className="chips"><span>{v.area}</span><span>₹{v.price}</span><span>★ {v.rating}</span><span>{v.response_minutes} min</span>{v.verified?<span>Verified</span>:<span>New</span>}</div>
            </div>
            <button className="primary" onClick={()=>setBooking(v)}>Book now</button>
          </div>
        ))}
        {vendors.length===0 && <p className="mm-no-results">No vendors match your search in {city}.</p>}
        </div>
      </section>
      {booking && <div className="modal"><form className="modal-card" onSubmit={submitBooking}><h2>Book {booking.name}</h2><input placeholder="Your complete address" value={form.address} onChange={e=>setForm({...form,address:e.target.value})} required /><input placeholder="Preferred time" value={form.preferred_time} onChange={e=>setForm({...form,preferred_time:e.target.value})} /><textarea placeholder="Describe the problem" value={form.notes} onChange={e=>setForm({...form,notes:e.target.value})} /><button className="primary full">Send request</button><button type="button" onClick={()=>setBooking(null)}>Cancel</button></form></div>}
    </div>
  );
}
