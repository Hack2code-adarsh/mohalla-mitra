import React, { useEffect, useState, useRef } from 'react';
import {
  Utensils, Cake, Coffee, ShoppingBag, IceCream, Apple, Store,
  Zap, Wrench, GraduationCap, Scissors, ShieldCheck, Bike, Palette,
  MapPin, Search, Star, Clock, ChevronRight, ArrowRight, TrendingUp,
  Sparkles, Award, Home as HomeIcon, BookOpen, Heart,
} from 'lucide-react';
import { api } from '../api.js';
import { useAuth } from '../App.jsx';
import './home3d.css';

const FOOD_CATS = [
  { name: 'Restaurant', icon: Utensils, color: '#EF4444', emoji: '🍽️', desc: 'Order from local restaurants' },
  { name: 'Tiffin', icon: Utensils, color: '#FF6B4A', emoji: '🍱', desc: 'Daily meal subscriptions' },
  { name: 'Sweets', icon: Cake, color: '#F59E0B', emoji: '🍰', desc: 'Fresh sweets & mithai' },
  { name: 'Cafe', icon: Coffee, color: '#92400E', emoji: '☕', desc: 'Coffee & snacks' },
  { name: 'Bakery', icon: Cake, color: '#D97706', emoji: '🥖', desc: 'Bread, cakes & pastries' },
  { name: 'Ice Cream', icon: IceCream, color: '#EC4899', emoji: '🍦', desc: 'Cool treats' },
  { name: 'Grocery', icon: Apple, color: '#22C55E', emoji: '🛒', desc: 'Fresh groceries' },
  { name: 'Provision Store', icon: ShoppingBag, color: '#10B981', emoji: '🏪', desc: 'Daily essentials' },
];

const SERVICE_CATS = [
  { name: 'Electrician', icon: Zap, color: '#FFB627', emoji: '⚡', desc: 'Wiring, fans, repairs' },
  { name: 'Plumber', icon: Wrench, color: '#0EA5A0', emoji: '🔧', desc: 'Taps, leaks, fittings' },
  { name: 'Tutor', icon: GraduationCap, color: '#6C5CE7', emoji: '📚', desc: 'Home & online tuition' },
  { name: 'Salon', icon: Scissors, color: '#F0447D', emoji: '💇', desc: 'Hair, beauty, grooming' },
  { name: 'Bike Mechanic', icon: Bike, color: '#2F9BF0', emoji: '🏍️', desc: 'Service & repair' },
  { name: 'Cleaner', icon: ShieldCheck, color: '#10B981', emoji: '🧹', desc: 'Home & office cleaning' },
  { name: 'Carpenter', icon: Wrench, color: '#92400E', emoji: '🪚', desc: 'Furniture & woodwork' },
  { name: 'Painter', icon: Palette, color: '#8B5CF6', emoji: '🎨', desc: 'Interior & exterior' },
  { name: 'ACRepair', icon: Zap, color: '#0EA5E0', emoji: '❄️', desc: 'AC install & service' },
  { name: 'Stationery', icon: BookOpen, color: '#3B82F6', emoji: '📝', desc: 'Books & supplies' },
  { name: 'Florist', icon: Heart, color: '#F0447D', emoji: '💐', desc: 'Flowers & bouquets' },
  { name: 'General Store', icon: Store, color: '#6366F1', emoji: '🏪', desc: 'Everything nearby' },
];

function fmtINR(n) { return '₹' + (n || 0); }

function TiltCard3D({ children, className = '', onClick }) {
  const ref = useRef(null);
  const [transform, setTransform] = useState('');
  const [glare, setGlare] = useState({ x: 50, y: 50, o: 0 });

  function handleMove(e) {
    const el = ref.current; if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const ry = (px - 0.5) * 16;
    const rx = (0.5 - py) * 16;
    el.style.transform = `perspective(800px) rotateX(${rx}deg) rotateY(${ry}deg) translateZ(10px)`;
    const glareEl = el.querySelector('.t3d-glare');
    if (glareEl) glareEl.style.background = `radial-gradient(circle at ${px * 100}% ${py * 100}%, rgba(255,255,255,0.15) 0%, transparent 50%)`;
  }
  function reset() {
    const el = ref.current; if (!el) return;
    el.style.transform = 'perspective(800px) rotateX(0) rotateY(0) translateZ(0)';
    const glareEl = el.querySelector('.t3d-glare');
    if (glareEl) glareEl.style.background = 'none';
  }
  function handleClick(e) {
    if (onClick) onClick(e);
  }
  return (
    <div ref={ref} className={`t3d-card ${className}`}
      onMouseMove={handleMove} onMouseLeave={reset} onClick={handleClick}
      role={onClick ? 'button' : undefined} tabIndex={onClick ? 0 : undefined}>
      <div className="t3d-glare" />
      {children}
    </div>
  );
}

export default function Home() {
  const { city, navigate, user } = useAuth();
  const [search, setSearch] = useState('');
  const [foodVendors, setFoodVendors] = useState([]);
  const [serviceVendors, setServiceVendors] = useState([]);

  useEffect(() => {
    api.vendors({ city }).then(all => {
      const food = all.filter(v => ['Restaurant','Tiffin','Sweets','Cafe','Bakery','Ice Cream','Grocery','Provision Store'].includes(v.category));
      const services = all.filter(v => !['Restaurant','Tiffin','Sweets','Cafe','Bakery','Ice Cream','Grocery','Provision Store'].includes(v.category));
      setFoodVendors(food.sort((a,b) => (b.rating||0)-(a.rating||0)).slice(0, 6));
      setServiceVendors(services.sort((a,b) => (b.rating||0)-(a.rating||0)).slice(0, 6));
    }).catch(() => {});
  }, [city]);

  function handleSearch(e) {
    e.preventDefault();
    if (search.trim()) {
      const found = [...FOOD_CATS, ...SERVICE_CATS].find(c => c.name.toLowerCase().includes(search.toLowerCase()));
      navigate('category', { category: found ? found.name : 'Electrician' });
    }
  }

  return (
    <div className="h3d-page">
      {/* Animated background orbs */}
      <div className="h3d-orbs">
        <div className="h3d-orb h3d-orb-1" />
        <div className="h3d-orb h3d-orb-2" />
        <div className="h3d-orb h3d-orb-3" />
      </div>

      {/* ===== HERO ===== */}
      <section className="h3d-hero">
        <div className="h3d-hero-content">
          <div className="h3d-hero-badge"><Sparkles size={14} /> {city} • 20+ categories • Live now</div>
          <h1 className="h3d-hero-title">
            Everything your mohalla needs.
            <span className="h3d-hero-accent">One platform.</span>
          </h1>
          <p className="h3d-hero-sub">Order food, book services, discover local vendors — all ranked by rating, distance & price.</p>

          {/* 3D Search */}
          <form className="h3d-search" onSubmit={handleSearch}>
            <Search size={20} color="#94a3b8" />
            <input type="text" placeholder="Search restaurants, electricians, plumbers..." value={search} onChange={e => setSearch(e.target.value)} />
            <button type="submit">Search</button>
          </form>

          <div className="h3d-hero-cta">
            <button className="h3d-btn-food" onClick={() => navigate('category', { category: 'Restaurant' })}>
              <Utensils size={18} /> Order Food <ArrowRight size={16} />
            </button>
            <button className="h3d-btn-service" onClick={() => navigate('category', { category: 'Electrician' })}>
              <Zap size={18} /> Book a Service
            </button>
          </div>
        </div>

        {/* 3D Hero card stack */}
        <div className="h3d-hero-stack">
          <TiltCard3D className="h3d-hero-card h3d-card-1">
            <div className="h3d-card-emoji">🍔</div>
            <h3>Order Food</h3>
            <p>Restaurants, tiffin, sweets & more</p>
          </TiltCard3D>
          <TiltCard3D className="h3d-hero-card h3d-card-2">
            <div className="h3d-card-emoji">⚡</div>
            <h3>Book Services</h3>
            <p>Electricians, plumbers, tutors</p>
          </TiltCard3D>
          <TiltCard3D className="h3d-hero-card h3d-card-3">
            <div className="h3d-card-emoji">🛒</div>
            <h3>Groceries</h3>
            <p>Fresh, delivered to your door</p>
          </TiltCard3D>
        </div>
      </section>

      {/* ===== STATS BAR (3D glass) ===== */}
      <section className="h3d-stats">
        <TiltCard3D className="h3d-stat-3d">
          <TrendingUp size={28} color="#4cceac" />
          <strong>{foodVendors.length + serviceVendors.length}+</strong>
          <span>Vendors</span>
        </TiltCard3D>
        <TiltCard3D className="h3d-stat-3d">
          <Award size={28} color="#FFB627" />
          <strong>20+</strong>
          <span>Categories</span>
        </TiltCard3D>
        <TiltCard3D className="h3d-stat-3d">
          <MapPin size={28} color="#6C5CE7" />
          <strong>5</strong>
          <span>Cities</span>
        </TiltCard3D>
        <TiltCard3D className="h3d-stat-3d">
          <Star size={28} color="#F0447D" />
          <strong>4.5+</strong>
          <span>Avg Rating</span>
        </TiltCard3D>
      </section>

      {/* ===== ORDER FOOD (3D cards) ===== */}
      <section className="h3d-section">
        <div className="h3d-section-head">
          <div>
            <h2 className="h3d-section-title">Order Food Online</h2>
            <p className="h3d-section-sub">Restaurants, tiffin, sweets & more — delivered to your door</p>
          </div>
          <button className="h3d-see-all" onClick={() => navigate('category', { category: 'Restaurant' })}>See all <ChevronRight size={16} /></button>
        </div>

        <div className="h3d-food-cats">
          {FOOD_CATS.map(cat => (
            <TiltCard3D key={cat.name} className="h3d-food-cat" onClick={() => navigate('category', { category: cat.name })}>
              <div className="h3d-food-emoji" style={{ background: cat.color + '20', border: `1.5px solid ${cat.color}40` }}>
                <span style={{ fontSize: 30 }}>{cat.emoji}</span>
              </div>
              <span className="h3d-food-name">{cat.name}</span>
              <span className="h3d-food-desc">{cat.desc}</span>
            </TiltCard3D>
          ))}
        </div>

        {foodVendors.length > 0 && (
          <div className="h3d-vendor-scroll">
            {foodVendors.map(v => {
              const cat = FOOD_CATS.find(c => c.name === v.category) || FOOD_CATS[0];
              const hasItems = (() => { try { return JSON.parse(v.items || '[]').length > 0; } catch { return false; } })();
              return (
                <TiltCard3D key={v.id} className="h3d-vendor-card" onClick={() => navigate('vendor-detail', { vendorId: v.id })}>
                  <div className="h3d-vcard-banner" style={{ background: `linear-gradient(135deg, ${cat.color}30, ${cat.color}08)` }}>
                    <span style={{ fontSize: 48 }}>{cat.emoji}</span>
                    {hasItems && <span className="h3d-order-badge">Order Online</span>}
                  </div>
                  <div className="h3d-vcard-body">
                    <h3>{v.name}</h3>
                    <p>{v.description || cat.desc}</p>
                    <div className="h3d-vcard-tags">
                      <span className="h3d-tag-rating"><Star size={11} fill="#F59E0B" color="#F59E0B" /> {v.rating}</span>
                      <span className="h3d-tag-time"><Clock size={11} /> {v.response_minutes}m</span>
                      <span className="h3d-tag-price">{fmtINR(v.price)}+</span>
                    </div>
                    {hasItems ? (
                      <button className="h3d-vcard-cta h3d-cta-food" onClick={(e) => { e.stopPropagation(); navigate('vendor-detail', { vendorId: v.id }); }}>View Menu & Order</button>
                    ) : (
                      <button className="h3d-vcard-cta" onClick={(e) => { e.stopPropagation(); navigate('vendor-detail', { vendorId: v.id }); }}>View Details</button>
                    )}
                  </div>
                </TiltCard3D>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== BOOK A SERVICE (3D cards) ===== */}
      <section className="h3d-section">
        <div className="h3d-section-head">
          <div>
            <h2 className="h3d-section-title">Book a Service</h2>
            <p className="h3d-section-sub">Electricians, plumbers, tutors & more — book in seconds</p>
          </div>
          <button className="h3d-see-all" onClick={() => navigate('category', { category: 'Electrician' })}>See all <ChevronRight size={16} /></button>
        </div>

        <div className="h3d-service-grid">
          {SERVICE_CATS.map(cat => (
            <TiltCard3D key={cat.name} className="h3d-service-card" onClick={() => navigate('category', { category: cat.name })}>
              <div className="h3d-service-icon" style={{ background: `linear-gradient(135deg, ${cat.color}, ${cat.color}cc)` }}>
                <cat.icon size={24} color="#fff" strokeWidth={2.2} />
              </div>
              <div className="h3d-service-text">
                <span className="h3d-service-name">{cat.name}</span>
                <span className="h3d-service-desc">{cat.desc}</span>
              </div>
              <ChevronRight size={16} color="#94a3b8" />
            </TiltCard3D>
          ))}
        </div>

        {serviceVendors.length > 0 && (
          <div className="h3d-vendor-scroll">
            {serviceVendors.map(v => {
              const cat = SERVICE_CATS.find(c => c.name === v.category) || SERVICE_CATS[0];
              return (
                <TiltCard3D key={v.id} className="h3d-vendor-card" onClick={() => navigate('vendor-detail', { vendorId: v.id })}>
                  <div className="h3d-vcard-banner" style={{ background: `linear-gradient(135deg, ${cat.color}25, ${cat.color}08)` }}>
                    <div className="h3d-svc-icon" style={{ background: cat.color }}>
                      <cat.icon size={26} color="#fff" />
                    </div>
                  </div>
                  <div className="h3d-vcard-body">
                    <h3>{v.name}</h3>
                    <p>{v.description || cat.desc}</p>
                    <div className="h3d-vcard-tags">
                      <span className="h3d-tag-rating"><Star size={11} fill="#F59E0B" color="#F59E0B" /> {v.rating}</span>
                      <span className="h3d-tag-time"><Clock size={11} /> {v.response_minutes}m</span>
                      <span className="h3d-tag-price">{fmtINR(v.price)}+</span>
                    </div>
                    <button className="h3d-vcard-cta" onClick={(e) => { e.stopPropagation(); navigate('vendor-detail', { vendorId: v.id }); }}>Book Now</button>
                  </div>
                </TiltCard3D>
              );
            })}
          </div>
        )}
      </section>

      {/* ===== GROW YOUR BUSINESS — Big 3D Card ===== */}
      {!user && (
        <section className="h3d-section" style={{paddingTop:24}}>
          <TiltCard3D className="h3d-grow-card">
            <div className="h3d-grow-glow" />
            <div className="h3d-grow-content">
              <div className="h3d-grow-badge"><Store size={14} /> For Business Owners</div>
              <h2 className="h3d-grow-title">Make Your Business <span className="h3d-hero-accent">Grow With Us</span></h2>
              <p className="h3d-grow-sub">List your shop or service on Service Sphere and reach thousands of customers in {city}. Add your menu with photos, set your prices, and start receiving orders today.</p>

              <div className="h3d-grow-features">
                <div className="h3d-grow-feat">
                  <div className="h3d-grow-feat-icon" style={{ background: 'rgba(76,206,172,0.15)' }}><Store size={22} color="#4cceac" /></div>
                  <div><strong>Create Your Listing</strong><p>Add your business name, category, photos & details in minutes</p></div>
                </div>
                <div className="h3d-grow-feat">
                  <div className="h3d-grow-feat-icon" style={{ background: 'rgba(104,112,250,0.15)' }}><Utensils size={22} color="#6870fa" /></div>
                  <div><strong>Add Menu Items</strong><p>Upload item photos, set prices, add descriptions & types</p></div>
                </div>
                <div className="h3d-grow-feat">
                  <div className="h3d-grow-feat-icon" style={{ background: 'rgba(245,158,11,0.15)' }}><TrendingUp size={22} color="#F59E0B" /></div>
                  <div><strong>Receive Orders</strong><p>Get real-time orders, accept/reject, track & manage from dashboard</p></div>
                </div>
                <div className="h3d-grow-feat">
                  <div className="h3d-grow-feat-icon" style={{ background: 'rgba(244,68,89,0.15)' }}><Star size={22} color="#F0447D" /></div>
                  <div><strong>Grow Your Rating</strong><p>Deliver great service, get reviews & climb the rankings</p></div>
                </div>
              </div>

              <div className="h3d-grow-stats">
                <div className="h3d-grow-stat"><strong>20+</strong><span>Categories</span></div>
                <div className="h3d-grow-stat"><strong>5</strong><span>Cities</span></div>
                <div className="h3d-grow-stat"><strong>1000+</strong><span>Potential Customers</span></div>
                <div className="h3d-grow-stat"><strong>4.5★</strong><span>Avg Rating</span></div>
              </div>

              <div className="h3d-grow-cta">
                <button className="h3d-btn-food" onClick={() => navigate('login')}><Store size={18} /> Start Selling <ArrowRight size={16} /></button>
                <button className="h3d-btn-service" onClick={() => navigate('login')}>Login to Dashboard</button>
              </div>
            </div>
          </TiltCard3D>
        </section>
      )}
    </div>
  );
}
