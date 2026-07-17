import React, { useState } from 'react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import './vendorSignup.css';

const CATEGORY_COLORS = {
  'Electrician': '#FFB627',
  'Plumber': '#0EA5A0',
  'Tutor': '#6C5CE7',
  'Tiffin': '#FF6B4A',
  'Bike Mechanic': '#2F9BF0',
  'Salon': '#F0447D',
};

function FloatingField({ label, value, onChange, type = 'text', required = false, textarea = false, accent }) {
  const [pulse, setPulse] = useState(false);

  function handleBlur() {
    if (value !== '' && value !== undefined && value !== null) {
      setPulse(true);
    }
  }

  const Tag = textarea ? 'textarea' : 'input';

  return (
    <div className={`mm-field-wrap ${pulse ? 'mm-pulse' : ''}`} style={{ '--field-accent': accent }} onAnimationEnd={() => setPulse(false)}>
      <Tag
        className="mm-field"
        placeholder=" "
        type={type}
        value={value}
        onChange={onChange}
        onBlur={handleBlur}
        required={required}
        rows={textarea ? 3 : undefined}
      />
      <label className="mm-floating-label">{label}</label>
    </div>
  );
}

export default function VendorSignup() {
  const { user, navigate, city } = useAuth();
  const [form, setForm] = useState({ name: '', category: 'Electrician', city, area: '', price: 300, response_minutes: 30, distance_km: 2, phone: '', description: '' });
  const [msg, setMsg] = useState('');

  function update(k, v) { setForm({ ...form, [k]: v }); }

  async function submit(e) {
    e.preventDefault();
    if (!user) { navigate('login'); return; }
    try {
      await api.createVendor(form);
      setMsg('Vendor listing created. New orders will appear in your vendor dashboard.');
    } catch (err) {
      setMsg(err.message);
    }
  }

  const accent = CATEGORY_COLORS[form.category] || '#0EA5A0';

  return (
    <div className="mm-vs-page" style={{ '--vs-accent': accent }}>
      <div className="mm-vs-head">
        <h1>List your service</h1>
        <p>Create a vendor listing connected to your vendor account.</p>
      </div>

      {msg && <div className="mm-vs-alert mm-vs-success">{msg}</div>}
      {!user && <div className="mm-vs-alert mm-vs-warn">Login as a vendor first, then create your listing.</div>}

      <form className="mm-vs-panel" onSubmit={submit}>
        <FloatingField label="Business name" value={form.name} onChange={e => update('name', e.target.value)} required accent={accent} />

        <div className="mm-field-wrap mm-select-wrap" style={{ '--field-accent': accent }}>
          <select className="mm-field" value={form.category} onChange={e => update('category', e.target.value)}>
            {Object.keys(CATEGORY_COLORS).map(c => <option key={c}>{c}</option>)}
          </select>
          <label className="mm-floating-label mm-label-static">Category</label>
        </div>

        <div className="mm-field-wrap mm-select-wrap" style={{ '--field-accent': accent }}>
          <select className="mm-field" value={form.city} onChange={e => update('city', e.target.value)}>
            {['Kanpur', 'Delhi', 'Lucknow', 'Gurugram', 'Noida'].map(c => <option key={c}>{c}</option>)}
          </select>
          <label className="mm-floating-label mm-label-static">City</label>
        </div>

        <FloatingField label="Area / locality" value={form.area} onChange={e => update('area', e.target.value)} required accent={accent} />
        <FloatingField label="Starting price (₹)" type="number" value={form.price} onChange={e => update('price', Number(e.target.value))} accent={accent} />
        <FloatingField label="Response time (minutes)" type="number" value={form.response_minutes} onChange={e => update('response_minutes', Number(e.target.value))} accent={accent} />
        <FloatingField label="Phone" value={form.phone} onChange={e => update('phone', e.target.value)} accent={accent} />
        <FloatingField label="Short description" value={form.description} onChange={e => update('description', e.target.value)} textarea accent={accent} />

        <button className="mm-vs-submit" style={{ background: `linear-gradient(135deg, ${accent}, #1E7F72)` }}>
          Create listing
        </button>
      </form>
    </div>
  );
}