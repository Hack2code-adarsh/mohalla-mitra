import React, { useEffect, useState, useMemo } from 'react';
import { ArrowLeft, Search, SlidersHorizontal, Heart, Star, Plus, Minus, Trash2, X, MapPin, Clock } from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import './grill.css';

function fmtINR(n) { return '₹' + (n || 0).toFixed(2); }

const CATEGORY_CHIPS = ['All', 'Veg', 'Non-Veg', 'Jain', 'Beverage', 'Dessert', 'Combo', 'Snack', 'Service', 'Product'];

export default function VendorDetail({ vendorId }) {
  const { user, navigate } = useAuth();
  const [vendor, setVendor] = useState(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeCat, setActiveCat] = useState('All');
  const [favorites, setFavorites] = useState({});
  const [cart, setCart] = useState([]);
  const [orderType, setOrderType] = useState('Dine');
  const [payment, setPayment] = useState('Cash');
  const [showSuccess, setShowSuccess] = useState(false);
  const [placing, setPlacing] = useState(false);
  const [address, setAddress] = useState('');

  useEffect(() => {
    api.getVendor(vendorId).then(v => { setVendor(v); setLoading(false); }).catch(() => setLoading(false));
  }, [vendorId]);

  const items = useMemo(() => {
    if (!vendor) return [];
    try { return JSON.parse(vendor.items || '[]'); } catch { return []; }
  }, [vendor]);

  const filteredItems = useMemo(() => {
    let f = items;
    if (activeCat !== 'All') f = f.filter(i => (i.type || 'Other') === activeCat);
    if (search) f = f.filter(i => i.name.toLowerCase().includes(search.toLowerCase()) || (i.desc || '').toLowerCase().includes(search.toLowerCase()));
    return f;
  }, [items, activeCat, search]);

  function toggleFav(idx) { setFavorites(f => ({ ...f, [idx]: !f[idx] })); }

  function addToCart(item, idx) {
    setCart(c => {
      const existing = c.find(ci => ci.idx === idx);
      if (existing) return c.map(ci => ci.idx === idx ? { ...ci, qty: ci.qty + 1 } : ci);
      return [...c, { ...item, idx, qty: 1 }];
    });
  }
  function incQty(idx) { setCart(c => c.map(ci => ci.idx === idx ? { ...ci, qty: ci.qty + 1 } : ci)); }
  function decQty(idx) { setCart(c => c.map(ci => ci.idx === idx ? { ...ci, qty: Math.max(0, ci.qty - 1) } : ci).filter(ci => ci.qty > 0)); }
  function removeItem(idx) { setCart(c => c.filter(ci => ci.idx !== idx)); }

  const itemsTotal = cart.reduce((s, i) => s + i.price * i.qty, 0);
  const discount = cart.length > 0 ? 3.00 : 0;
  const total = Math.max(0, itemsTotal - discount);

  async function checkout() {
    if (!user) { navigate('login'); return; }
    if (cart.length === 0) return;
    setPlacing(true);
    try {
      const orderItems = cart.map(i => ({ name: i.name, desc: i.desc || '', price: i.price, qty: i.qty, type: i.type }));
      await api.createBooking({
        vendor_id: vendor.id,
        address: address || orderType + ' order',
        preferred_time: orderType,
        notes: `Payment: ${payment}`,
        order_items: JSON.stringify(orderItems),
        total_amount: total,
      });
      setShowSuccess(true);
      setCart([]);
      setTimeout(() => setShowSuccess(false), 3000);
    } catch (err) { alert(err.message || 'Failed to place order'); }
    finally { setPlacing(false); }
  }

  if (loading) return <div className="grill-loading">Loading restaurant...</div>;
  if (!vendor) return <div className="grill-loading">Vendor not found.</div>;

  const today = new Date().toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });

  return (
    <div className="grill-page">
      {/* ===== LEFT: Main content ===== */}
      <div className="grill-main">
        {/* Back bar */}
        <div className="grill-backbar">
          <button onClick={() => navigate('home')} className="grill-back-btn"><ArrowLeft size={18} /> Back</button>
          <button onClick={() => navigate('home')} className="grill-back-btn">Home</button>
        </div>

        {/* Header */}
        <div className="grill-header">
          <div>
            <span className="grill-date">{today}</span>
            <h1 className="grill-restaurant-name">{vendor.name}</h1>
            <div className="grill-meta">
              <span className="grill-rating-badge"><Star size={12} fill="#fff" color="#fff" /> {vendor.rating}</span>
              <span><MapPin size={13} /> {vendor.area}, {vendor.city}</span>
              <span><Clock size={13} /> {vendor.response_minutes} mins</span>
              <span className="grill-cat-tag">{vendor.category}</span>
            </div>
          </div>
          <div className="grill-search-wrap">
            <Search size={18} color="#999" />
            <input type="text" placeholder="Search Here" value={search} onChange={e => setSearch(e.target.value)} className="grill-search-input" />
            <button className="grill-filter-btn"><SlidersHorizontal size={16} /></button>
          </div>
        </div>

        {/* Category section */}
        <div className="grill-cat-section">
          <div className="grill-cat-head">
            <h2 className="grill-cat-title">Find The Best Food</h2>
            <button className="grill-view-all">View All</button>
          </div>
          <div className="grill-chips">
            {CATEGORY_CHIPS.map(cat => (
              <button key={cat} className={`grill-chip ${activeCat === cat ? 'active' : ''}`} onClick={() => setActiveCat(cat)}>
                {cat}
              </button>
            ))}
          </div>
        </div>

        {/* Food cards grid */}
        <div className="grill-food-grid">
          {filteredItems.length === 0 ? (
            <div className="grill-no-items">
              <p style={{ fontSize: 16, fontWeight: 600, color: '#1F2937', margin: 0 }}>No menu items found</p>
              <p style={{ fontSize: 14, color: '#6b7280', margin: '8px 0 0' }}>This vendor hasn't added items matching your search.</p>
            </div>
          ) : (
            filteredItems.map((item, i) => {
              const idx = items.indexOf(item);
              const isFav = favorites[idx];
              const img = item.image || `https://source.unsplash.com/200x200/?food,${encodeURIComponent(item.name)}`;
              return (
                <div key={idx} className="grill-food-card">
                  <button className="grill-heart" onClick={() => toggleFav(idx)}>
                    <Heart size={18} fill={isFav ? '#EF4444' : 'none'} color={isFav ? '#EF4444' : '#cbd5e1'} />
                  </button>
                  <div className="grill-food-img-wrap">
                    <img src={img} alt={item.name} className="grill-food-img" onError={(e) => { e.target.src = `https://picsum.photos/seed/${item.name}/200/200`; }} />
                  </div>
                  <div className="grill-food-info">
                    <div className="grill-food-name-row">
                      <h3 className="grill-food-name">{item.name}</h3>
                      <span className="grill-food-price">{fmtINR(item.price)}</span>
                    </div>
                    <p className="grill-food-desc">{item.desc || 'With cheese, vegetables & special sauce'}</p>
                    <div className="grill-food-bottom">
                      <span className="grill-food-rating"><Star size={14} fill="#F59E0B" color="#F59E0B" /> 5.0</span>
                      <button className="grill-add-btn" onClick={() => addToCart(item, idx)}>
                        <Plus size={14} /> Add to cart
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* ===== RIGHT: My Order sidebar ===== */}
      <div className="grill-sidebar">
        {/* Sidebar header */}
        <div className="grill-order-header">
          <h2 className="grill-order-title">My Order</h2>
          <button className="grill-close-btn" onClick={() => setCart([])}><X size={18} /></button>
        </div>

        {/* Order type tabs */}
        <div className="grill-order-tabs">
          {['Dine', 'Pick Up', 'Delivery'].map(t => (
            <button key={t} className={`grill-order-tab ${orderType === t ? 'active' : ''}`} onClick={() => setOrderType(t)}>{t}</button>
          ))}
        </div>

        {/* Order items */}
        <div className="grill-order-items">
          {cart.length === 0 ? (
            <div className="grill-empty-cart">
              <p style={{ fontSize: 15, color: '#6b7280', margin: 0 }}>Your cart is empty.</p>
              <p style={{ fontSize: 13, color: '#9ca3af', margin: '8px 0 0' }}>Add items from the menu to start your order.</p>
            </div>
          ) : (
            cart.map(ci => (
              <div key={ci.idx} className="grill-order-item">
                <img src={ci.image || `https://picsum.photos/seed/${ci.name}/80/80`} alt={ci.name} className="grill-order-thumb" onError={(e) => { e.target.src = `https://picsum.photos/seed/${ci.name}/80/80`; }} />
                <div className="grill-order-item-info">
                  <h4 className="grill-order-item-name">{ci.name}</h4>
                  <span className="grill-order-item-variant">{ci.type || 'Regular'}</span>
                  <span className="grill-order-item-price">{fmtINR(ci.price)}</span>
                </div>
                <div className="grill-order-item-right">
                  <button className="grill-trash-btn" onClick={() => removeItem(ci.idx)}><Trash2 size={16} /></button>
                  <div className="grill-qty-stepper">
                    <button onClick={() => incQty(ci.idx)}><Plus size={14} /></button>
                    <span>{String(ci.qty).padStart(2, '0')}</span>
                    <button onClick={() => decQty(ci.idx)}><Minus size={14} /></button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>

        {/* Address for delivery */}
        {orderType === 'Delivery' && cart.length > 0 && (
          <div className="grill-address-wrap">
            <input type="text" placeholder="Delivery address" value={address} onChange={e => setAddress(e.target.value)} className="grill-address-input" />
          </div>
        )}

        {/* Summary */}
        {cart.length > 0 && (
          <div className="grill-summary">
            <div className="grill-summary-row">
              <span>Items</span>
              <span className="grill-summary-green">{fmtINR(itemsTotal)}</span>
            </div>
            <div className="grill-summary-row">
              <span>Discount</span>
              <span className="grill-summary-red">-{fmtINR(discount)}</span>
            </div>
            <div className="grill-summary-divider" />
            <div className="grill-summary-row grill-total-row">
              <span>Total Amount</span>
              <span className="grill-summary-green grill-total-value">{fmtINR(total)}</span>
            </div>
          </div>
        )}

        {/* Payments */}
        <div className="grill-payments">
          <h3 className="grill-payments-title">Payments</h3>
          <div className="grill-pay-methods">
            {['Cash', 'Debit', 'E-Wallet'].map(m => (
              <button key={m} className={`grill-pay-btn ${payment === m ? 'active' : ''}`} onClick={() => setPayment(m)}>{m}</button>
            ))}
          </div>
          <button className="grill-checkout-btn" onClick={checkout} disabled={placing || cart.length === 0}>
            {placing ? 'Placing Order...' : `Checkout • ${fmtINR(total)}`}
          </button>
        </div>
      </div>

      {/* Success toast */}
      {showSuccess && (
        <div className="grill-success-toast">
          <Star size={20} fill="#fff" /> Order placed successfully!
        </div>
      )}
    </div>
  );
}
