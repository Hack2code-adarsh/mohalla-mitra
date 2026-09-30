import React, { useEffect, useMemo, useState, useRef } from 'react';
import {
  LayoutDashboard, Inbox, Briefcase, IndianRupee, Star, Store,
  Wallet, PencilLine, Settings, Search, HelpCircle, MessageSquare,
  Bell, ChevronDown, Clock, TrendingUp, CheckCircle2, MoreHorizontal,
  MapPin, Calendar, XCircle, CreditCard, Camera, Zap, Wrench, GraduationCap,
  Utensils, Bike, Scissors, Plus, Trash2, Palette, Truck, Wifi, Shield, Clock3,
  Cake, ShoppingBag, BookOpen, Coffee, IceCream, Wine, Apple, Package,
  Heart, Briefcase as ShopIcon,
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
    requested: ['amber', 'New'], accepted: ['blue', 'Accepted'],
    in_progress: ['blue', 'In Progress'], completed: ['green', 'Completed'],
    cancelled: ['gray', 'Cancelled'], rejected: ['red', 'Rejected'],
  };
  const [cls, label] = map[status] || ['gray', status];
  return <span className={`portal-pill ${cls}`}>{label}</span>;
}

const CATEGORIES = [
  { key: 'Electrician', icon: Zap, color: '#FFB627' },
  { key: 'Plumber', icon: Wrench, color: '#0EA5A0' },
  { key: 'Tutor', icon: GraduationCap, color: '#6C5CE7' },
  { key: 'Tiffin', icon: Utensils, color: '#FF6B4A' },
  { key: 'Bike Mechanic', icon: Bike, color: '#2F9BF0' },
  { key: 'Salon', icon: Scissors, color: '#F0447D' },
  { key: 'Cleaner', icon: Shield, color: '#10B981' },
  { key: 'Carpenter', icon: Wrench, color: '#92400E' },
  { key: 'Painter', icon: Palette, color: '#8B5CF6' },
  { key: 'ACRepair', icon: Zap, color: '#0EA5E0' },
  { key: 'Restaurant', icon: Utensils, color: '#EF4444' },
  { key: 'Sweets', icon: Cake, color: '#F59E0B' },
  { key: 'Cafe', icon: Coffee, color: '#92400E' },
  { key: 'Provision Store', icon: ShoppingBag, color: '#10B981' },
  { key: 'Stationery', icon: BookOpen, color: '#3B82F6' },
  { key: 'Ice Cream', icon: IceCream, color: '#EC4899' },
  { key: 'Bakery', icon: Cake, color: '#D97706' },
  { key: 'Grocery', icon: Apple, color: '#22C55E' },
  { key: 'Florist', icon: Heart, color: '#F0447D' },
  { key: 'General Store', icon: Store, color: '#6366F1' },
];

const SERVICE_ITEMS = {
  Tiffin: [
    { id: 'north-thali', name: 'North Indian Thali', desc: 'Dal, sabzi, roti, rice, salad', price: 80, type: 'Veg' },
    { id: 'south-thali', name: 'South Indian Thali', desc: 'Sambar, rice, curd, papad', price: 90, type: 'Veg' },
    { id: 'jain-thali', name: 'Jain Thali', desc: 'No onion, no potato, fresh', price: 85, type: 'Jain' },
    { id: 'breakfast', name: 'Breakfast Combo', desc: 'Poha + tea + fruit', price: 60, type: 'Veg' },
    { id: 'lunch', name: 'Lunch Tiffin', desc: '3 roti, dal, rice, sabzi, sweet', price: 120, type: 'Veg' },
    { id: 'dinner', name: 'Dinner Tiffin', desc: '4 roti, paneer, rice, salad', price: 150, type: 'Veg' },
  ],
  Electrician: [
    { id: 'fan-repair', name: 'Fan Repair/Install', desc: 'Ceiling fan, table fan, exhaust', price: 200, type: 'Service' },
    { id: 'switch-board', name: 'Switch Board Repair', desc: 'Socket, switch, MCB replacement', price: 150, type: 'Service' },
    { id: 'wiring', name: 'House Wiring', desc: 'Full/partial wiring, short circuit', price: 500, type: 'Service' },
    { id: 'inverter', name: 'Inverter/UPS Setup', desc: 'Installation, battery check', price: 400, type: 'Service' },
    { id: 'lighting', name: 'Light/Fixture Install', desc: 'LED, tube light, fancy light', price: 180, type: 'Service' },
    { id: 'doorbell', name: 'Doorbell Install', desc: 'Wired or wireless doorbell', price: 100, type: 'Service' },
  ],
  Plumber: [
    { id: 'tap-repair', name: 'Tap/Mixer Repair', desc: 'Leaking tap, mixer change', price: 150, type: 'Service' },
    { id: 'drain-clean', name: 'Drain Cleaning', desc: 'Blockage removal, jet cleaning', price: 300, type: 'Service' },
    { id: 'toilet-repair', name: 'Toilet Repair', desc: 'Flush tank, seat, leakage', price: 350, type: 'Service' },
    { id: 'geyser', name: 'Geyser Install/Service', desc: 'Water heater setup, repair', price: 400, type: 'Service' },
    { id: 'motor', name: 'Water Motor Repair', desc: 'Pump repair, install', price: 600, type: 'Service' },
    { id: 'pipe-fitting', name: 'Pipe Fitting', desc: 'New pipeline, leakage fix', price: 500, type: 'Service' },
  ],
  Salon: [
    { id: 'haircut', name: 'Haircut', desc: 'Men/Women haircut + styling', price: 100, type: 'Service' },
    { id: 'beard', name: 'Beard Trim/Shave', desc: 'Beard shaping, clean shave', price: 60, type: 'Service' },
    { id: 'facial', name: 'Facial', desc: 'Cleanup, glow facial', price: 250, type: 'Service' },
    { id: 'hair-color', name: 'Hair Color', desc: 'Global, root touch-up', price: 400, type: 'Service' },
    { id: 'massage', name: 'Head Massage', desc: 'Oil head massage', price: 80, type: 'Service' },
    { id: 'threading', name: 'Threading', desc: 'Eyebrow, upper lip', price: 40, type: 'Service' },
  ],
  Tutor: [
    { id: 'maths', name: 'Mathematics', desc: 'Class 6-12, JEE prep', price: 500, type: 'Subject' },
    { id: 'science', name: 'Science (Phy/Chem)', desc: 'Class 8-12, NEET prep', price: 500, type: 'Subject' },
    { id: 'english', name: 'English', desc: 'Grammar, spoken, writing', price: 400, type: 'Subject' },
    { id: 'coding', name: 'Coding/Programming', desc: 'Python, Java, web dev', price: 800, type: 'Subject' },
    { id: 'commerce', name: 'Commerce', desc: 'Accounts, economics', price: 450, type: 'Subject' },
    { id: 'competitive', name: 'Competitive Exam Prep', desc: 'SSC, Banking, Railway', price: 600, type: 'Subject' },
  ],
  'Bike Mechanic': [
    { id: 'service', name: 'Bike Service', desc: 'Oil change, chain, brakes', price: 350, type: 'Service' },
    { id: 'tyre', name: 'Tyre Puncture/Replace', desc: 'Tube, tubeless repair', price: 200, type: 'Service' },
    { id: 'battery', name: 'Battery Check/Replace', desc: 'Battery testing, new battery', price: 500, type: 'Service' },
    { id: 'engine', name: 'Engine Repair', desc: 'Major/minor engine work', price: 800, type: 'Service' },
    { id: 'clutch', name: 'Clutch/Clutch Plate', desc: 'Clutch adjustment, plate change', price: 600, type: 'Service' },
    { id: 'electric', name: 'Electrical Issues', desc: 'Headlight, wiring, self-start', price: 300, type: 'Service' },
  ],
  Restaurant: [
    { id: 'paneer-butter', name: 'Paneer Butter Masala', desc: 'Creamy paneer in rich gravy', price: 220, type: 'Veg' },
    { id: 'dal-makhani', name: 'Dal Makhani', desc: 'Slow-cooked black lentils', price: 180, type: 'Veg' },
    { id: 'butter-naan', name: 'Butter Naan', desc: 'Tandoor baked, buttered', price: 40, type: 'Veg' },
    { id: 'chicken-biryani', name: 'Chicken Biryani', desc: 'Hyderabadi style, raita included', price: 250, type: 'Non-Veg' },
    { id: 'veg-thali', name: 'Veg Thali', desc: '4 sabzi, dal, rice, roti, sweet', price: 150, type: 'Veg' },
    { id: 'chicken-thali', name: 'Chicken Thali', desc: 'Chicken curry, rice, roti, salad', price: 280, type: 'Non-Veg' },
    { id: 'manchurian', name: 'Veg Manchurian', desc: 'Indo-Chinese, spicy gravy', price: 160, type: 'Veg' },
    { id: 'pizza-veg', name: 'Veg Pizza', desc: 'Cheese, capsicum, onion, tomato', price: 200, type: 'Veg' },
    { id: 'burger', name: 'Chicken Burger', desc: 'Grilled chicken, cheese, fries', price: 150, type: 'Non-Veg' },
    { id: 'rolls', name: 'Kathi Roll', desc: 'Paneer/chicken wrap', price: 120, type: 'Veg' },
  ],
  Sweets: [
    { id: 'gulab-jamun', name: 'Gulab Jamun (1kg)', desc: 'Soft, syrup-soaked', price: 350, type: 'Veg' },
    { id: 'rasgulla', name: 'Rasgulla (1kg)', desc: 'Spongy, light syrup', price: 380, type: 'Veg' },
    { id: 'laddu', name: 'Motichoor Laddu (1kg)', desc: 'Besan laddu, ghee', price: 400, type: 'Veg' },
    { id: 'barfi', name: 'Kaju Barfi (1kg)', desc: 'Cashew fudge', price: 600, type: 'Veg' },
    { id: 'jalebi', name: 'Jalebi (1kg)', desc: 'Crispy, hot syrup', price: 300, type: 'Veg' },
    { id: 'peda', name: 'Peda (1kg)', desc: 'Milk fudge, cardamom', price: 450, type: 'Veg' },
    { id: 'soan-papdi', name: 'Soan Papdi (500g)', desc: 'Flaky, sweet', price: 180, type: 'Veg' },
    { id: 'halwa', name: 'Gajar Halwa (1kg)', desc: 'Carrot, milk, ghee, nuts', price: 350, type: 'Veg' },
  ],
  Cafe: [
    { id: 'espresso', name: 'Espresso', desc: 'Single shot, strong', price: 80, type: 'Veg' },
    { id: 'cappuccino', name: 'Cappuccino', desc: 'Espresso, steamed milk, foam', price: 120, type: 'Veg' },
    { id: 'cold-coffee', name: 'Cold Coffee', desc: 'Iced, blended, creamy', price: 140, type: 'Veg' },
    { id: 'masala-chai', name: 'Masala Chai', desc: 'Spiced Indian tea', price: 40, type: 'Veg' },
    { id: 'sandwich', name: 'Grilled Sandwich', desc: 'Veg, cheese, chutney', price: 100, type: 'Veg' },
    { id: 'pasta', name: 'White Sauce Pasta', desc: 'Creamy, cheese, veggies', price: 180, type: 'Veg' },
    { id: 'maggie', name: 'Masala Maggie', desc: 'With veggies, cheesy', price: 80, type: 'Veg' },
    { id: 'fries', name: 'French Fries', desc: 'Crispy, with peri-peri', price: 90, type: 'Veg' },
  ],
  'Provision Store': [
    { id: 'rice', name: 'Basmati Rice (5kg)', desc: 'Premium long grain', price: 400, type: 'Product' },
    { id: 'wheat', name: 'Wheat Flour (5kg)', desc: 'Aata, fresh ground', price: 250, type: 'Product' },
    { id: 'oil', name: 'Cooking Oil (1L)', desc: 'Mustard/sunflower', price: 150, type: 'Product' },
    { id: 'sugar', name: 'Sugar (1kg)', desc: 'Refined, clean', price: 50, type: 'Product' },
    { id: 'dal', name: 'Toor Dal (1kg)', desc: 'Premium quality', price: 120, type: 'Product' },
    { id: 'salt', name: 'Salt (1kg)', desc: 'Iodized table salt', price: 25, type: 'Product' },
    { id: 'tea', name: 'Tea Powder (250g)', desc: 'Premium dust tea', price: 130, type: 'Product' },
    { id: 'spices', name: 'Spice Box Set', desc: '7 essential spices', price: 200, type: 'Product' },
  ],
  Stationery: [
    { id: 'notebook', name: 'Notebook (200 pages)', desc: 'Ruled, hardbound', price: 80, type: 'Product' },
    { id: 'pen', name: 'Ball Pen (Pack of 5)', desc: 'Smooth, blue ink', price: 50, type: 'Product' },
    { id: 'pencil', name: 'Pencil (Pack of 10)', desc: 'HB, dark', price: 40, type: 'Product' },
    { id: 'eraser', name: 'Eraser (Pack of 3)', desc: 'Non-dust, soft', price: 20, type: 'Product' },
    { id: 'scale', name: 'Scale (30cm)', desc: 'Transparent, flexible', price: 15, type: 'Product' },
    { id: 'colors', name: 'Crayon Set (24)', desc: 'Wax crayons, assorted', price: 120, type: 'Product' },
    { id: 'files', name: 'Document File', desc: 'A4, 100 pages', price: 60, type: 'Product' },
    { id: 'calculator', name: 'Calculator', desc: 'Scientific, 240 functions', price: 350, type: 'Product' },
  ],
  'Ice Cream': [
    { id: 'vanilla', name: 'Vanilla (500ml)', desc: 'Classic, creamy', price: 180, type: 'Veg' },
    { id: 'chocolate', name: 'Chocolate (500ml)', desc: 'Rich cocoa', price: 200, type: 'Veg' },
    { id: 'strawberry', name: 'Strawberry (500ml)', desc: 'Fresh fruit', price: 200, type: 'Veg' },
    { id: 'kulfi', name: 'Malai Kulfi', desc: 'Traditional, thick', price: 60, type: 'Veg' },
    { id: 'sundae', name: 'Hot Chocolate Sundae', desc: 'Fudge, nuts, cherry', price: 150, type: 'Veg' },
    { id: 'cone', name: 'Ice Cream Cone', desc: 'Wafer, single scoop', price: 50, type: 'Veg' },
    { id: 'family-pack', name: 'Family Pack (1L)', desc: 'Choice of flavor', price: 350, type: 'Veg' },
    { id: 'falooda', name: 'Falooda', desc: 'Vermicelli, rose, ice cream', price: 120, type: 'Veg' },
  ],
  Bakery: [
    { id: 'bread', name: 'Fresh Bread', desc: 'White, 400g', price: 40, type: 'Veg' },
    { id: 'patties', name: 'Veg Patties', desc: 'Crispy, spicy filling', price: 30, type: 'Veg' },
    { id: 'cake-veg', name: 'Veg Cake (500g)', desc: 'Pineapple/chocolate', price: 350, type: 'Veg' },
    { id: 'cookies', name: 'Cookies (Pack)', desc: 'Butter, assorted', price: 80, type: 'Veg' },
    { id: 'rusk', name: 'Rusk (Pack)', desc: 'Crispy, elaichi', price: 50, type: 'Veg' },
    { id: 'buns', name: 'Burger Buns (4)', desc: 'Soft, fresh', price: 35, type: 'Veg' },
    { id: 'pav', name: 'Pav (6 pieces)', desc: 'Mumbai style', price: 25, type: 'Veg' },
    { id: 'donuts', name: 'Donuts (Pack of 6)', desc: 'Glazed, chocolate', price: 240, type: 'Veg' },
  ],
  Grocery: [
    { id: 'tomato', name: 'Tomato (1kg)', desc: 'Fresh, farm picked', price: 40, type: 'Product' },
    { id: 'potato', name: 'Potato (1kg)', desc: 'Fresh, clean', price: 30, type: 'Product' },
    { id: 'onion', name: 'Onion (1kg)', desc: 'Fresh, medium', price: 35, type: 'Product' },
    { id: 'milk', name: 'Milk (1L)', desc: 'Full cream, fresh', price: 60, type: 'Product' },
    { id: 'paneer', name: 'Paneer (250g)', desc: 'Fresh, soft', price: 90, type: 'Product' },
    { id: 'eggs', name: 'Eggs (12)', desc: 'Farm fresh, brown', price: 80, type: 'Product' },
    { id: 'banana', name: 'Banana (1 dozen)', desc: 'Ripe, fresh', price: 50, type: 'Product' },
    { id: 'curd', name: 'Curd (500g)', desc: 'Fresh, thick', price: 45, type: 'Product' },
  ],
  Florist: [
    { id: 'bouquet-rose', name: 'Rose Bouquet', desc: '12 red roses', price: 300, type: 'Product' },
    { id: 'bouquet-mixed', name: 'Mixed Bouquet', desc: 'Seasonal flowers', price: 250, type: 'Product' },
    { id: 'garland', name: 'Flower Garland', desc: 'Marigold, 3ft', price: 150, type: 'Product' },
    { id: 'basket', name: 'Flower Basket', desc: 'Assorted, decorated', price: 500, type: 'Product' },
    { id: 'single-rose', name: 'Single Rose', desc: 'Red, fresh cut', price: 20, type: 'Product' },
    { id: 'puja-thali', name: 'Puja Flower Set', desc: 'Marigold + rose + leaves', price: 100, type: 'Product' },
  ],
  'General Store': [
    { id: 'shampoo', name: 'Shampoo (200ml)', desc: 'Anti-dandruff', price: 120, type: 'Product' },
    { id: 'soap', name: 'Bath Soap (Pack of 3)', desc: 'Moisturizing', price: 90, type: 'Product' },
    { id: 'detergent', name: 'Detergent (1kg)', desc: 'Front/top load', price: 130, type: 'Product' },
    { id: 'toothpaste', name: 'Toothpaste', desc: 'Mint, 100g', price: 45, type: 'Product' },
    { id: 'biscuits', name: 'Biscuits (Pack)', desc: 'Glucose, assorted', price: 30, type: 'Product' },
    { id: 'snacks', name: 'Snacks (Pack)', desc: 'Namkeen, 200g', price: 50, type: 'Product' },
    { id: 'soft-drink', name: 'Soft Drink (750ml)', desc: 'Cola/lemon/orange', price: 40, type: 'Product' },
    { id: 'candles', name: 'Candles (Pack of 6)', desc: 'Regular, white', price: 35, type: 'Product' },
  ],
};

function VendorShell({ user, onLogout, activeNav, onNav, children }) {
  const navItems = [
    { label: 'Overview', items: [
      { key: 'dashboard', label: 'Dashboard', icon: LayoutDashboard },
      { key: 'orders', label: 'Incoming Orders', icon: Inbox },
      { key: 'jobs', label: 'Active Jobs', icon: Briefcase },
      { key: 'earnings', label: 'Earnings', icon: IndianRupee },
      { key: 'reviews', label: 'Reviews', icon: Star },
      { key: 'listing', label: 'My Listing', icon: Store },
      { key: 'payouts', label: 'Payouts', icon: Wallet },
    ]},
    { label: 'Account Management', items: [
      { key: 'edit', label: 'Update Listing', icon: PencilLine },
      { key: 'availability', label: 'Set Availability', icon: Clock },
    ]},
  ];
  return (
    <div className="portal-root">
      <header className="portal-topbar">
        <div className="portal-topbar-left">
          <div className="portal-logo">SS</div>
          <div className="portal-brand"><span className="name">Service Sphere</span><span className="sub">Vendor Portal</span></div>
        </div>
        <div className="portal-topbar-right">
          <button className="portal-icon-btn" aria-label="Search"><Search size={18} /></button>
          <button className="portal-icon-btn" aria-label="Help"><HelpCircle size={18} /></button>
          <button className="portal-icon-btn" aria-label="Messages"><MessageSquare size={18} /></button>
          <button className="portal-icon-btn" aria-label="Notifications"><Bell size={18} /><span className="dot" /></button>
          <div className="portal-user-chip" onClick={onLogout} role="button" tabIndex={0}>
            <div className="portal-avatar" style={{background:'linear-gradient(135deg,var(--portal-blue),var(--portal-blue-dark))'}}>{(user?.name || 'V').charAt(0).toUpperCase()}</div>
            <div className="portal-user-meta"><span className="nm">{user?.name || 'Vendor'}</span><span className="rl"><MapPin size={11} /> {user?.city || ''} • Vendor</span></div>
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
                return <button key={it.key} className={`portal-nav-item ${on ? 'active' : ''}`} onClick={() => onNav(it.key)}><Icon size={18} /> {it.label}</button>;
              })}
            </div>
          ))}
          <div className="portal-nav-divider" />
          <div className="portal-nav-group">
            <button className="portal-nav-item" onClick={() => onNav('settings')}><Settings size={18} /> Settings</button>
          </div>
        </aside>
        <main className="portal-main">{children}</main>
      </div>
    </div>
  );
}

function Widget({ title, icon, icoClass, children, count }) {
  return (
    <div className="portal-widget">
      <div className="portal-widget-head">
        <div className="portal-widget-title">
          <div className={`portal-widget-ico ${icoClass||''}`}>{icon}</div>
          {title}{count != null && ` (${count})`}
        </div>
        <MoreHorizontal size={18} color="var(--portal-muted)" />
      </div>
      <div className="portal-widget-body">{children}</div>
    </div>
  );
}

function PageHead({ icon, title, sub }) {
  return (
    <div className="portal-page-head" style={{flexDirection:'column',alignItems:'flex-start',gap:4}}>
      <div style={{display:'flex',alignItems:'center',gap:10}}>
        <div className="portal-ico">{icon}</div>
        <h1>{title}</h1>
      </div>
      {sub && <p style={{color:'var(--portal-muted)',fontSize:14,margin:0}}>{sub}</p>}
    </div>
  );
}

function ListingSection({ user, onDone }) {
  const [loading, setLoading] = useState(true);
  const [vendor, setVendor] = useState(null);

  useEffect(() => {
    api.myVendor().then(v => { setVendor(v); setLoading(false); }).catch(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div>
        <PageHead icon={<Store size={22} />} title="My Listing" sub="Manage your business listing" />
        <div className="portal-empty" style={{padding:40}}>Loading your listing…</div>
      </div>
    );
  }

  if (vendor) {
    return <ManageListing vendor={vendor} user={user} onDone={onDone} onUpdate={(v) => setVendor(v)} />;
  }

  return <NewListingWizard user={user} onDone={onDone} onCreated={(v) => setVendor(v)} />;
}

// ===== MANAGE EXISTING LISTING =====
function ManageListing({ vendor, user, onDone, onUpdate }) {
  const [edit, setEdit] = useState(false);
  const [items, setItems] = useState(() => {
    try { return JSON.parse(localStorage.getItem('mm_items_' + vendor.id) || '[]'); } catch { return []; }
  });
  const [form, setForm] = useState({ name: vendor.name, area: vendor.area, phone: vendor.phone || '', price: vendor.price, response_minutes: vendor.response_minutes, distance_km: vendor.distance_km, description: vendor.description || '' });
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);

  const cat = CATEGORIES.find(c => c.key === vendor.category) || CATEGORIES[0];
  const CatIcon = cat.icon;
  const presetItems = SERVICE_ITEMS[vendor.category] || [];

  function saveItems(newItems) { setItems(newItems); localStorage.setItem('mm_items_' + vendor.id, JSON.stringify(newItems)); api.updateVendor(vendor.id, { items: JSON.stringify(newItems) }).catch(()=>{}); }
  function addItem() { saveItems([...items, { id: Date.now(), name: '', desc: '', price: 100, type: 'Service', image: '' }]); }
  function updateItem(id, k, v) { saveItems(items.map(i => i.id === id ? { ...i, [k]: v } : i)); }
  function removeItem(id) { saveItems(items.filter(i => i.id !== id)); }
  function addPresetItem(p) { if (items.some(i => i.name === p.name)) { setToast('Already added'); setTimeout(()=>setToast(''),2000); return; } saveItems([...items, { ...p, id: Date.now(), image: '' }]); }

  async function uploadItemImage(id, file) {
    if (!file) return;
    setToast('Uploading image...'); 
    try {
      const res = await api.uploadImage(file);
      updateItem(id, 'image', res.url);
      setToast('Image uploaded!');
      setTimeout(()=>setToast(''),2000);
    } catch (err) { setToast(err.message || 'Upload failed'); setTimeout(()=>setToast(''),3000); }
  }

  async function saveDetails() {
    setSaving(true);
    try {
      const updated = await api.updateVendor(vendor.id, form);
      onUpdate(updated);
      setEdit(false);
      setToast('Listing updated successfully!');
      setTimeout(() => setToast(''), 3000);
    } catch (err) { setToast(err.message || 'Update failed'); }
    finally { setSaving(false); }
  }

  return (
    <div>
      <PageHead icon={<Store size={22} />} title="My Listing" sub="Manage your business, items, and pricing" />
      {toast && <div className="portal-alert ok" style={{marginBottom:16}}>{toast}</div>}

      {/* Business header */}
      <div className="portal-widget" style={{marginBottom:18}}>
        <div className="portal-widget-head">
          <div className="portal-widget-title">
            <div className="portal-widget-ico"><CatIcon size={16} color={cat.color} /></div>
            {vendor.name}
          </div>
          <button className="portal-btn" onClick={() => setEdit(!edit)}><PencilLine size={14} /> {edit ? 'Cancel' : 'Edit Details'}</button>
        </div>
        <div className="portal-widget-body" style={{padding:'20px 24px'}}>
          {!edit ? (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr 1fr',gap:16}}>
              <div><span style={{fontSize:12,color:'var(--portal-muted)',fontWeight:'600'}}>Category</span><p style={{fontSize:15,fontWeight:'700',margin:'4px 0 0'}}>{vendor.category}</p></div>
              <div><span style={{fontSize:12,color:'var(--portal-muted)',fontWeight:'600'}}>City</span><p style={{fontSize:15,fontWeight:'700',margin:'4px 0 0'}}>{vendor.city}</p></div>
              <div><span style={{fontSize:12,color:'var(--portal-muted)',fontWeight:'600'}}>Area</span><p style={{fontSize:15,fontWeight:'700',margin:'4px 0 0'}}>{vendor.area}</p></div>
              <div><span style={{fontSize:12,color:'var(--portal-muted)',fontWeight:'600'}}>Starting Price</span><p style={{fontSize:15,fontWeight:'700',margin:'4px 0 0'}}>{fmtINR(vendor.price)}</p></div>
              <div><span style={{fontSize:12,color:'var(--portal-muted)',fontWeight:'600'}}>Response Time</span><p style={{fontSize:15,fontWeight:'700',margin:'4px 0 0'}}>{vendor.response_minutes} mins</p></div>
              <div><span style={{fontSize:12,color:'var(--portal-muted)',fontWeight:'600'}}>Service Radius</span><p style={{fontSize:15,fontWeight:'700',margin:'4px 0 0'}}>{vendor.distance_km} km</p></div>
              <div><span style={{fontSize:12,color:'var(--portal-muted)',fontWeight:'600'}}>Phone</span><p style={{fontSize:15,fontWeight:'700',margin:'4px 0 0'}}>{vendor.phone || '—'}</p></div>
              <div><span style={{fontSize:12,color:'var(--portal-muted)',fontWeight:'600'}}>Rating</span><p style={{fontSize:15,fontWeight:'700',margin:'4px 0 0'}}>{vendor.rating} ★</p></div>
              <div><span style={{fontSize:12,color:'var(--portal-muted)',fontWeight:'600'}}>Status</span><p style={{fontSize:15,fontWeight:'700',margin:'4px 0 0'}}><span className={`portal-pill ${vendor.verified ? 'green' : 'amber'}`}>{vendor.verified ? 'Verified' : 'Pending'}</span></p></div>
            </div>
          ) : (
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div><label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:6,display:'block'}}>Business Name</label><input style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--portal-line)',fontSize:14}} value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
              <div><label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:6,display:'block'}}>Phone</label><input style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--portal-line)',fontSize:14}} value={form.phone} onChange={e=>setForm(f=>({...f,phone:e.target.value}))} /></div>
              <div><label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:6,display:'block'}}>Area</label><input style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--portal-line)',fontSize:14}} value={form.area} onChange={e=>setForm(f=>({...f,area:e.target.value}))} /></div>
              <div><label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:6,display:'block'}}>Starting Price</label><input type="number" style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--portal-line)',fontSize:14}} value={form.price} onChange={e=>setForm(f=>({...f,price:Number(e.target.value)}))} /></div>
              <div><label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:6,display:'block'}}>Response Time (mins)</label><input type="number" style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--portal-line)',fontSize:14}} value={form.response_minutes} onChange={e=>setForm(f=>({...f,response_minutes:Number(e.target.value)}))} /></div>
              <div><label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:6,display:'block'}}>Service Radius (km)</label><input type="number" style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--portal-line)',fontSize:14}} value={form.distance_km} onChange={e=>setForm(f=>({...f,distance_km:Number(e.target.value)}))} /></div>
              <div style={{gridColumn:'1 / 3'}}><label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:6,display:'block'}}>Description</label><input style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--portal-line)',fontSize:14}} value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
              <div style={{gridColumn:'1 / 3',display:'flex',justifyContent:'flex-end'}}><button className="portal-btn primary" onClick={saveDetails} disabled={saving}>{saving ? 'Saving...' : 'Save Changes'}</button></div>
            </div>
          )}
          {vendor.description && !edit && <p style={{fontSize:13,color:'var(--portal-muted)',margin:'16px 0 0',paddingTop:16,borderTop:'1px solid var(--portal-line)'}}>{vendor.description}</p>}
        </div>
      </div>

      {/* Items management */}
      <div className="portal-widget">
        <div className="portal-widget-head">
          <div className="portal-widget-title">
            <div className="portal-widget-ico" style={{background:'var(--portal-amber-soft)',color:'#D97706'}}><Plus size={16} /></div>
            Items & Pricing ({items.length})
          </div>
        </div>
        <div className="portal-widget-body" style={{padding:'20px 24px'}}>
          {/* Quick add presets */}
          {presetItems.length > 0 && (
            <div style={{marginBottom:20}}>
              <label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:10,display:'block'}}>Quick add — common {vendor.category} items:</label>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                {presetItems.map(p => (
                  <button key={p.id} onClick={()=>addPresetItem(p)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:20,border:'1px solid var(--portal-line)',background:'var(--portal-card)',cursor:'pointer',fontSize:12,fontWeight:'600',color:'var(--portal-ink)',transition:'all .2s'}}>
                    <Plus size={14} /> {p.name} · {fmtINR(p.price)}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Items table */}
          {items.length === 0 ? (
            <div className="portal-empty" style={{marginBottom:16}}>No items yet. Add items above to start your menu/catalog.</div>
          ) : (
            <table className="portal-table">
              <thead><tr><th>Photo</th><th>Item Name</th><th>Description</th><th>Price</th><th>Type</th><th></th></tr></thead>
              <tbody>
                {items.map(item => (
                  <tr key={item.id}>
                    <td style={{width:80}}>
                      <label style={{cursor:'pointer',display:'block',width:60,height:60,borderRadius:8,overflow:'hidden',border:'1px dashed var(--portal-line)',background:'var(--portal-bg)',position:relative}}>
                        {item.image ? (
                          <img src={item.image} alt={item.name} style={{width:'100%',height:'100%',objectFit:'cover'}} />
                        ) : (
                          <div style={{width:'100%',height:'100%',display:'grid',placeItems:'center',color:'var(--portal-muted)'}}>
                            <Camera size={20} />
                          </div>
                        )}
                        <input type="file" accept="image/*" style={{display:'none'}} onChange={e=>{const f=e.target.files[0];if(f)uploadItemImage(item.id,f);e.target.value='';}} />
                      </label>
                    </td>
                    <td><input style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid var(--portal-line)',fontSize:13}} value={item.name} onChange={e=>updateItem(item.id,'name',e.target.value)} placeholder="Item name" /></td>
                    <td><input style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid var(--portal-line)',fontSize:13}} value={item.desc} onChange={e=>updateItem(item.id,'desc',e.target.value)} placeholder="Description" /></td>
                    <td style={{width:100}}><input type="number" style={{width:'100%',padding:'8px 10px',borderRadius:8,border:'1px solid var(--portal-line)',fontSize:13}} value={item.price} onChange={e=>updateItem(item.id,'price',Number(e.target.value))} /></td>
                    <td style={{width:120}}>
                      <select style={{padding:'8px 10px',borderRadius:8,border:'1px solid var(--portal-line)',fontSize:13,background:'#fff'}} value={item.type} onChange={e=>updateItem(item.id,'type',e.target.value)}>
                        <option>Service</option><option>Veg</option><option>Non-Veg</option><option>Jain</option><option>Subject</option><option>Product</option><option>Beverage</option><option>Dessert</option><option>Combo</option><option>Snack</option>
                      </select>
                    </td>
                    <td style={{width:50}}><button className="portal-btn danger" style={{padding:'8px 10px'}} onClick={()=>removeItem(item.id)}><Trash2 size={14} /></button></td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          <button className="portal-btn" style={{marginTop:12}} onClick={addItem}><Plus size={16} /> Add Custom Item</button>
          <p style={{fontSize:12,color:'var(--portal-muted)',margin:'12px 0 0'}}>Items are saved automatically as you edit.</p>
        </div>
      </div>
    </div>
  );
}

// ===== NEW LISTING WIZARD (only shows if no listing exists) =====
function NewListingWizard({ user, onDone, onCreated }) {
  const [step, setStep] = useState(1);
  const [category, setCategory] = useState('Electrician');
  const [business, setBusiness] = useState({ name: '', city: user?.city || 'Kanpur', area: '', phone: '', description: '', startPrice: 200, responseMins: 30, distanceKm: 3 });
  const [items, setItems] = useState([]);
  const [features, setFeatures] = useState({ homeService: false, onlineBooking: false, emergencyService: false, weekendOpen: false, emiAvailable: false, insured: false });
  const [photos, setPhotos] = useState([]);
  const [toast, setToast] = useState('');
  const [saving, setSaving] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileInputRef = useRef(null);

  function updateBusiness(k, v) { setBusiness(b => ({ ...b, [k]: v })); }
  function toggleFeature(k) { setFeatures(f => ({ ...f, [k]: !f[k] })); }
  function addItem() { setItems(prev => [...prev, { id: Date.now(), name: '', desc: '', price: 100, type: 'Service' }]); }
  function updateItem(id, k, v) { setItems(prev => prev.map(i => i.id === id ? { ...i, [k]: v } : i)); }
  function removeItem(id) { setItems(prev => prev.filter(i => i.id !== id)); }
  function addPresetItem(p) { if (items.some(i => i.name === p.name)) { return; } setItems(prev => [...prev, { ...p, id: Date.now() }]); }

  async function handleFileUpload(e) {
    const files = Array.from(e.target.files || []);
    if (files.length === 0) return;
    setUploading(true);
    try {
      for (const file of files) {
        const res = await api.uploadImage(file);
        setPhotos(prev => [...prev, { id: Date.now() + Math.random(), url: res.url }]);
      }
      setToast('Photos uploaded!');
      setTimeout(() => setToast(''), 2000);
    } catch (err) { setToast(err.message || 'Upload failed'); setTimeout(() => setToast(''), 3000); }
    finally { setUploading(false); if (fileInputRef.current) fileInputRef.current.value = ''; }
  }
  function removePhoto(id) { setPhotos(prev => prev.filter(p => p.id !== id)); }

  async function save() {
    setSaving(true);
    try {
      const payload = {
        name: business.name, category, city: business.city, area: business.area,
        price: business.startPrice, response_minutes: business.responseMins,
        distance_km: business.distanceKm, phone: business.phone, description: business.description,
        items: JSON.stringify(items), photos: JSON.stringify(photos),
      };
      const v = await api.createVendor(payload);
      setToast('Listing created successfully!');
      setTimeout(() => onCreated(v), 1500);
    } catch (err) { setToast(err.message || 'Failed to create listing'); }
    finally { setSaving(false); }
  }

  const cat = CATEGORIES.find(c => c.key === category) || CATEGORIES[0];
  const CatIcon = cat.icon;
  const presetItems = SERVICE_ITEMS[category] || [];

  return (
    <div>
      <PageHead icon={<Store size={22} />} title="Add Your Business" sub="Create your vendor listing — choose category, add items, set pricing" />

      <div style={{ display:'flex',gap:0,marginBottom:24 }}>
        {['Business Info', 'Items & Pricing', 'Features', 'Review'].map((label, i) => {
          const num = i + 1;
          const active = step === num;
          const done = step > num;
          return (
            <div key={i} style={{ flex:1,display:'flex',alignItems:'center',gap:8 }}>
              <div style={{ width:32,height:32,borderRadius:'50%',display:'grid',placeItems:'center',fontWeight:'700',fontSize:14,background:done?'var(--portal-green)':active?'var(--portal-blue)':'var(--portal-line)',color:done||active?'#fff':'var(--portal-muted)',transition:'all .2s' }}>
                {done ? <CheckCircle2 size={16} /> : num}
              </div>
              <span style={{ fontSize:12,fontWeight:active?700:500,color:active?'var(--portal-blue-dark)':'var(--portal-muted)',whiteSpace:'nowrap' }}>{label}</span>
              {i < 3 && <div style={{ flex:1,height:2,background:done?'var(--portal-green)':'var(--portal-line)' }} />}
            </div>
          );
        })}
      </div>

      {toast && <div className="portal-alert ok" style={{marginBottom:16}}>{toast}</div>}

      {step === 1 && (
        <div className="portal-widget">
          <div className="portal-widget-head"><div className="portal-widget-title"><div className="portal-widget-ico"><Store size={16} /></div>Business Details</div></div>
          <div className="portal-widget-body" style={{padding:'20px 24px'}}>
            <label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:10,display:'block'}}>Select your business category</label>
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(120px,1fr))',gap:10,marginBottom:24}}>
              {CATEGORIES.map(c => {
                const Icon = c.icon;
                const sel = category === c.key;
                return (
                  <button key={c.key} onClick={() => setCategory(c.key)} style={{display:'flex',flexDirection:'column',alignItems:'center',gap:6,padding:'14px 8px',borderRadius:12,border:`2px solid ${sel?c.color:'var(--portal-line)'}`,background:sel?c.color+'15':'var(--portal-card)',cursor:'pointer',transition:'all .2s',textAlign:'center'}}>
                    <Icon size={24} color={sel?c.color:'var(--portal-muted)'} />
                    <span style={{fontSize:11,fontWeight:'600',color:sel?c.color:'var(--portal-muted)'}}>{c.key}</span>
                  </button>
                );
              })}
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
              <div><label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:6,display:'block'}}>Business Name</label><input style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--portal-line)',fontSize:14}} placeholder="e.g. Sharma Electricals" value={business.name} onChange={e=>updateBusiness('name',e.target.value)} /></div>
              <div><label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:6,display:'block'}}>Phone</label><input style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--portal-line)',fontSize:14}} placeholder="+91 98765 43210" value={business.phone} onChange={e=>updateBusiness('phone',e.target.value)} /></div>
              <div><label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:6,display:'block'}}>City</label><select style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--portal-line)',fontSize:14,background:'#fff'}} value={business.city} onChange={e=>updateBusiness('city',e.target.value)}>{['Kanpur','Delhi','Lucknow','Gurugram','Noida'].map(c=><option key={c}>{c}</option>)}</select></div>
              <div><label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:6,display:'block'}}>Area / Locality</label><input style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--portal-line)',fontSize:14}} placeholder="e.g. Kalyanpur" value={business.area} onChange={e=>updateBusiness('area',e.target.value)} /></div>
              <div><label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:6,display:'block'}}>Starting Price</label><input type="number" style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--portal-line)',fontSize:14}} value={business.startPrice} onChange={e=>updateBusiness('startPrice',Number(e.target.value))} /></div>
              <div><label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:6,display:'block'}}>Response Time (mins)</label><input type="number" style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--portal-line)',fontSize:14}} value={business.responseMins} onChange={e=>updateBusiness('responseMins',Number(e.target.value))} /></div>
              <div><label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:6,display:'block'}}>Service Radius (km)</label><input type="number" style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--portal-line)',fontSize:14}} value={business.distanceKm} onChange={e=>updateBusiness('distanceKm',Number(e.target.value))} /></div>
              <div><label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:6,display:'block'}}>Description</label><input style={{width:'100%',padding:'11px 14px',borderRadius:10,border:'1px solid var(--portal-line)',fontSize:14}} placeholder="Tell customers about your business" value={business.description} onChange={e=>updateBusiness('description',e.target.value)} /></div>
            </div>
            <div style={{display:'flex',justifyContent:'flex-end',marginTop:24}}><button className="portal-btn primary" onClick={()=>setStep(2)} disabled={!business.name}>Next: Items</button></div>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="portal-widget">
          <div className="portal-widget-head"><div className="portal-widget-title"><div className="portal-widget-ico"><Plus size={16} /></div>Items & Pricing for {category}</div></div>
          <div className="portal-widget-body" style={{padding:'20px 24px'}}>
            {presetItems.length > 0 && (
              <div style={{marginBottom:24}}>
                <label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:10,display:'block'}}>Quick add — common {category} items:</label>
                <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
                  {presetItems.map(p => (
                    <button key={p.id} onClick={()=>addPresetItem(p)} style={{display:'flex',alignItems:'center',gap:6,padding:'8px 14px',borderRadius:20,border:'1px solid var(--portal-line)',background:'var(--portal-card)',cursor:'pointer',fontSize:12,fontWeight:'600',color:'var(--portal-ink)',transition:'all .2s'}}>
                      <Plus size={14} /> {p.name} · {fmtINR(p.price)}
                    </button>
                  ))}
                </div>
              </div>
            )}
            <label style={{fontSize:13,fontWeight:'600',color:'var(--portal-muted)',marginBottom:10,display:'block'}}>Your items ({items.length})</label>
            {items.length === 0 && <div className="portal-empty" style={{marginBottom:16}}>No items added yet. Use quick add above or add custom items.</div>}
            {items.map(item => (
              <div key={item.id} style={{display:'grid',gridTemplateColumns:'2fr 2fr 1fr 1fr auto',gap:8,alignItems:'center',marginBottom:8}}>
                <input style={{padding:'10px 12px',borderRadius:8,border:'1px solid var(--portal-line)',fontSize:13}} placeholder="Item name" value={item.name} onChange={e=>updateItem(item.id,'name',e.target.value)} />
                <input style={{padding:'10px 12px',borderRadius:8,border:'1px solid var(--portal-line)',fontSize:13}} placeholder="Description" value={item.desc} onChange={e=>updateItem(item.id,'desc',e.target.value)} />
                <input type="number" style={{padding:'10px 12px',borderRadius:8,border:'1px solid var(--portal-line)',fontSize:13}} placeholder="Price" value={item.price} onChange={e=>updateItem(item.id,'price',Number(e.target.value))} />
                <select style={{padding:'10px 12px',borderRadius:8,border:'1px solid var(--portal-line)',fontSize:13,background:'#fff'}} value={item.type} onChange={e=>updateItem(item.id,'type',e.target.value)}><option>Service</option><option>Veg</option><option>Non-Veg</option><option>Jain</option><option>Subject</option><option>Product</option><option>Beverage</option><option>Dessert</option><option>Combo</option><option>Snack</option></select>
                <button className="portal-btn danger" style={{padding:'10px 12px'}} onClick={()=>removeItem(item.id)}><Trash2 size={14} /></button>
              </div>
            ))}
            <button className="portal-btn" style={{marginTop:8}} onClick={addItem}><Plus size={16} /> Add Custom Item</button>
            <div style={{display:'flex',justifyContent:'space-between',marginTop:24}}><button className="portal-btn" onClick={()=>setStep(1)}>Back</button><button className="portal-btn primary" onClick={()=>setStep(3)}>Next: Features</button></div>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="portal-widget">
          <div className="portal-widget-head"><div className="portal-widget-title"><div className="portal-widget-ico" style={{background:'var(--portal-amber-soft)',color:'#D97706'}}><Star size={16} /></div>Business Features</div></div>
          <div className="portal-widget-body" style={{padding:'20px 24px'}}>
            <p style={{fontSize:13,color:'var(--portal-muted)',margin:'0 0 16px'}}>Highlight what makes your business stand out — vendors with more features get 3x more bookings.</p>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:12}}>
              {[
                { key:'homeService', icon: Truck, label:'Home Service Available', desc:'We come to your location' },
                { key:'onlineBooking', icon: Wifi, label:'Online Booking', desc:'Customers can book instantly' },
                { key:'emergencyService', icon: Zap, label:'24/7 Emergency Service', desc:'Available for urgent calls' },
                { key:'weekendOpen', icon: Calendar, label:'Open on Weekends', desc:'Saturday & Sunday service' },
                { key:'emiAvailable', icon: CreditCard, label:'EMI Available', desc:'Pay in installments for big jobs' },
                { key:'insured', icon: Shield, label:'Insured & Verified', desc:'Background verified, insured' },
              ].map(f => {
                const Icon = f.icon;
                const on = features[f.key];
                return (
                  <button key={f.key} onClick={()=>toggleFeature(f.key)} style={{display:'flex',alignItems:'center',gap:12,padding:'14px 16px',borderRadius:12,border:`2px solid ${on?'var(--portal-blue)':'var(--portal-line)'}`,background:on?'var(--portal-blue-soft)':'var(--portal-card)',cursor:'pointer',transition:'all .2s',textAlign:'left'}}>
                    <div style={{width:40,height:40,borderRadius:10,display:'grid',placeItems:'center',background:on?'var(--portal-blue)':'var(--portal-bg)',color:on?'#fff':'var(--portal-muted)',transition:'all .2s'}}><Icon size={20} /></div>
                    <div><div style={{fontSize:13,fontWeight:'700',color:on?'var(--portal-blue-dark)':'var(--portal-ink)'}}>{f.label}</div><div style={{fontSize:11,color:'var(--portal-muted)'}}>{f.desc}</div></div>
                    {on && <CheckCircle2 size={18} color="var(--portal-blue)" style={{marginLeft:'auto'}} />}
                  </button>
                );
              })}
            </div>

            {/* Photo Upload */}
            <div style={{marginTop:24,paddingTop:20,borderTop:'1px solid var(--portal-line)'}}>
              <label style={{fontSize:13,fontWeight:600,color:'var(--portal-muted)',marginBottom:10,display:'block'}}>Business Photos ({photos.length})</label>
              <p style={{fontSize:12,color:'var(--portal-muted)',margin:'0 0 12px'}}>Upload photos from your phone or computer. Listings with photos get 5x more views.</p>
              <input ref={fileInputRef} type="file" accept="image/*" multiple style={{display:'none'}} onChange={handleFileUpload} />
              <button className="portal-btn" onClick={() => fileInputRef.current?.click()} disabled={uploading}>
                <Camera size={16} /> {uploading ? 'Uploading...' : 'Upload Photos'}
              </button>
              {photos.length > 0 && (
                <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fill,minmax(100px,1fr))',gap:10,marginTop:14}}>
                  {photos.map(ph => (
                    <div key={ph.id} style={{position:'relative',borderRadius:8,overflow:'hidden',border:'1px solid var(--portal-line)'}}>
                      <img src={ph.url} alt="Business" style={{width:'100%',height:'80px',objectFit:'cover'}} />
                      <button onClick={() => removePhoto(ph.id)} style={{position:'absolute',top:2,right:2,background:'rgba(0,0,0,0.6)',border:'none',borderRadius:'50%',width:22,height:22,color:'#fff',cursor:'pointer',display:'grid',placeItems:'center'}}><Trash2 size={12} /></button>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div style={{display:'flex',justifyContent:'space-between',marginTop:24}}><button className="portal-btn" onClick={()=>setStep(2)}>Back</button><button className="portal-btn primary" onClick={()=>setStep(4)}>Next: Review</button></div>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="portal-widget">
          <div className="portal-widget-head"><div className="portal-widget-title"><div className="portal-widget-ico" style={{background:'var(--portal-green-soft)',color:'var(--portal-green)'}}><CheckCircle2 size={16} /></div>Review Your Listing</div></div>
          <div className="portal-widget-body" style={{padding:'24px'}}>
            <div style={{display:'flex',alignItems:'center',gap:16,marginBottom:24,paddingBottom:20,borderBottom:'1px solid var(--portal-line)'}}>
              <div style={{width:56,height:56,borderRadius:14,display:'grid',placeItems:'center',background:cat.color+'20'}}><CatIcon size={28} color={cat.color} /></div>
              <div><h2 style={{margin:0,fontSize:22,fontWeight:'800'}}>{business.name || 'Your Business'}</h2><p style={{margin:'4px 0 0',fontSize:14,color:'var(--portal-muted)'}}>{category} • {business.area}, {business.city}</p></div>
            </div>
            <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16,marginBottom:24}}>
              <div><span style={{fontSize:12,color:'var(--portal-muted)',fontWeight:'600'}}>Starting Price</span><p style={{fontSize:16,fontWeight:'700',margin:'4px 0 0'}}>{fmtINR(business.startPrice)}</p></div>
              <div><span style={{fontSize:12,color:'var(--portal-muted)',fontWeight:'600'}}>Response Time</span><p style={{fontSize:16,fontWeight:'700',margin:'4px 0 0'}}>{business.responseMins} mins</p></div>
              <div><span style={{fontSize:12,color:'var(--portal-muted)',fontWeight:'600'}}>Service Radius</span><p style={{fontSize:16,fontWeight:'700',margin:'4px 0 0'}}>{business.distanceKm} km</p></div>
              <div><span style={{fontSize:12,color:'var(--portal-muted)',fontWeight:'600'}}>Phone</span><p style={{fontSize:16,fontWeight:'700',margin:'4px 0 0'}}>{business.phone || '—'}</p></div>
            </div>
            {items.length > 0 && (
              <div style={{marginBottom:24}}>
                <h3 style={{fontSize:14,fontWeight:'700',margin:'0 0 10px'}}>Items ({items.length})</h3>
                <table className="portal-table"><thead><tr><th>Name</th><th>Description</th><th>Price</th><th>Type</th></tr></thead>
                  <tbody>{items.map(i => <tr key={i.id}><td>{i.name}</td><td>{i.desc}</td><td>{fmtINR(i.price)}</td><td><span className="portal-pill blue">{i.type}</span></td></tr>)}</tbody>
                </table>
              </div>
            )}
            <div style={{display:'flex',justifyContent:'space-between'}}><button className="portal-btn" onClick={()=>setStep(3)}>Back</button><button className="portal-btn primary" onClick={save} disabled={saving || !business.name}>{saving ? 'Saving...' : 'Publish Listing'}</button></div>
          </div>
        </div>
      )}
    </div>
  );
}

export default function VendorDashboard() {
  const { user, logout, navigate } = useAuth();
  const [rows, setRows] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeNav, setActiveNav] = useState('dashboard');
  const [toast, setToast] = useState('');
  const [available, setAvailable] = useState(true);

  async function load() {
    setLoading(true);
    try {
      const [b, r] = await Promise.allSettled([api.vendorBookings(), api.vendorReviews(user?.id || user?.vendor_id || '')]);
      if (b.status === 'fulfilled') setRows(b.value);
      if (r.status === 'fulfilled') setReviews(r.value || []);
    } catch (err) { setToast(err.message); }
    finally { setLoading(false); }
  }
  useEffect(() => { load(); }, []);

  function showToast(m) { setToast(m); setTimeout(() => setToast(''), 3000); }
  async function setStatus(id, status) {
    try { await api.updateBookingStatus(id, status); showToast(`Order marked ${status.replace('_',' ')}.`); load(); }
    catch (err) { setToast(err.message); }
  }

  const stats = useMemo(() => {
    const pending = rows.filter(r => r.status === 'requested');
    const active = rows.filter(r => ['accepted','in_progress'].includes(r.status));
    const completedAll = rows.filter(r => r.status === 'completed');
    const completedThisMonth = completedAll.filter(r => { const d = new Date(r.preferred_time); const now = new Date(); return d.getMonth() === now.getMonth() && d.getFullYear() === now.getFullYear(); });
    const monthRevenue = completedThisMonth.reduce((s,r) => s + estPrice(r.service_category), 0);
    const totalRevenue = completedAll.reduce((s,r) => s + estPrice(r.service_category), 0);
    const avgRating = reviews.length ? (reviews.reduce((s,r) => s + (r.rating || 0), 0) / reviews.length).toFixed(1) : null;
    return { pending: pending.length, active: active.length, monthRevenue, totalRevenue, avgRating, completedCount: completedAll.length };
  }, [rows, reviews]);

  function onNav(key) {
    if (key === 'edit') { setActiveNav('listing'); return; }
    setActiveNav(key);
  }

  let content = null;

  if (activeNav === 'dashboard') {
    content = (
      <>
        <PageHead icon={<LayoutDashboard size={22} />} title="Dashboard" />
        <div className="portal-action-row">
          <button className="portal-action-card blue" onClick={() => setActiveNav('orders')}><div className="portal-action-icon"><Inbox size={24} /></div><div><h3>View Incoming Orders</h3><p>Accept or reject new customer requests in real time.</p></div></button>
          <button className="portal-action-card navy" onClick={() => setActiveNav('listing')}><div className="portal-action-icon"><Store size={24} /></div><div><h3>List Your Service</h3><p>Add or update your business, services, and availability.</p></div></button>
        </div>
        <div className="portal-stat-row">
          <div className="portal-stat-card warn"><div className="portal-stat-head"><Inbox size={15} /> Pending Orders</div><div className="portal-stat-value">{stats.pending}</div><div className="portal-stat-sub">awaiting your response</div></div>
          <div className="portal-stat-card soon"><div className="portal-stat-head"><Briefcase size={15} /> Active Jobs</div><div className="portal-stat-value">{stats.active}</div><div className="portal-stat-sub">in progress right now</div></div>
          <div className="portal-stat-card total"><div className="portal-stat-head"><TrendingUp size={15} /> Revenue (Month)</div><div className="portal-stat-value">{fmtINR(stats.monthRevenue)}</div><div className="portal-stat-sub">from completed orders</div></div>
        </div>
        {stats.avgRating && (
          <div style={{display:'flex',alignItems:'center',gap:10,background:'var(--portal-card)',border:'1px solid var(--portal-line)',borderRadius:12,padding:'14px 18px',marginBottom:22,boxShadow:'var(--portal-shadow)'}}>
            <div className="portal-widget-ico" style={{background:'var(--portal-amber-soft)',color:'#D97706'}}><Star size={16} /></div>
            <span style={{fontWeight:'700'}}>{stats.avgRating}</span>
            <span style={{color:'var(--portal-muted)',fontSize:13}}>average rating from {reviews.length} review(s)</span>
          </div>
        )}
        <div className="portal-widget-row">
          <Widget title="Incoming Requests" icon={<Inbox size={16} />} icoClass="amber">
            {rows.filter(r => r.status === 'requested').length === 0 ? <div className="portal-empty">No new requests.</div> :
            <table className="portal-table"><thead><tr><th>Order #</th><th>Customer</th><th>Action</th></tr></thead>
              <tbody>{rows.filter(r => r.status === 'requested').slice(0,5).map(r => (
                <tr key={r.id}><td><span className="portal-link">SS-{String(r.id).padStart(5,'0')}</span></td><td>{r.customer_name}<br /><span style={{color:'var(--portal-muted)',fontSize:11}}>{r.service_category}</span></td>
                  <td><div className="portal-btn-row" style={{marginTop:0}}><button className="portal-btn primary" onClick={() => setStatus(r.id,'accepted')}>Accept</button><button className="portal-btn" onClick={() => setStatus(r.id,'rejected')}>Reject</button></div></td>
                </tr>
              ))}</tbody>
            </table>}
          </Widget>
          <Widget title="Active Jobs" icon={<Briefcase size={16} />}>
            {rows.filter(r => ['accepted','in_progress'].includes(r.status)).length === 0 ? <div className="portal-empty">No active jobs.</div> :
            <table className="portal-table"><thead><tr><th>Job #</th><th>Customer</th><th>Status</th></tr></thead>
              <tbody>{rows.filter(r => ['accepted','in_progress'].includes(r.status)).slice(0,5).map(r => (
                <tr key={r.id}><td><span className="portal-link">SS-{String(r.id).padStart(5,'0')}</span></td><td>{r.customer_name}<br /><span style={{color:'var(--portal-muted)',fontSize:11}}>{fmtDate(r.preferred_time)}</span></td>
                  <td><div className="portal-btn-row" style={{marginTop:0}}><StatusPill status={r.status} />{r.status === 'accepted' && <button className="portal-btn" onClick={() => setStatus(r.id,'in_progress')}>Start</button>}{r.status === 'in_progress' && <button className="portal-btn success" onClick={() => setStatus(r.id,'completed')}><CheckCircle2 size={14} /> Done</button>}</div></td>
                </tr>
              ))}</tbody>
            </table>}
          </Widget>
          <Widget title="Recent Completed" icon={<IndianRupee size={16} />} icoClass="green">
            {rows.filter(r => r.status === 'completed').length === 0 ? <div className="portal-empty">No completed jobs yet.</div> :
            <table className="portal-table"><thead><tr><th>Job #</th><th>Date</th><th>Earning</th></tr></thead>
              <tbody>{rows.filter(r => r.status === 'completed').slice(0,5).map(r => (
                <tr key={r.id}><td><span className="portal-link">SS-{String(r.id).padStart(5,'0')}</span></td><td>{fmtDate(r.preferred_time)}</td><td><strong>{fmtINR(estPrice(r.service_category))}</strong></td></tr>
              ))}</tbody>
            </table>}
          </Widget>
        </div>
      </>
    );
  }

  if (activeNav === 'orders') {
    const incoming = rows.filter(r => r.status === 'requested');
    content = (
      <>
        <PageHead icon={<Inbox size={22} />} title="Incoming Orders" />
        <div className="portal-stat-row">
          <div className="portal-stat-card warn"><div className="portal-stat-head"><Inbox size={15} /> New</div><div className="portal-stat-value">{incoming.length}</div><div className="portal-stat-sub">awaiting response</div></div>
          <div className="portal-stat-card soon"><div className="portal-stat-head"><CheckCircle2 size={15} /> Accepted</div><div className="portal-stat-value">{rows.filter(r=>r.status==='accepted').length}</div></div>
          <div className="portal-stat-card total"><div className="portal-stat-head"><XCircle size={15} /> Rejected</div><div className="portal-stat-value">{rows.filter(r=>r.status==='rejected').length}</div></div>
        </div>
        <Widget title="All Incoming Orders" icon={<Inbox size={16} />} icoClass="amber" count={incoming.length}>
          {incoming.length === 0 ? <div className="portal-empty">No incoming orders. New customer requests will appear here.</div> :
          <table className="portal-table"><thead><tr><th>Order #</th><th>Customer</th><th>Service</th><th>City</th><th>Scheduled</th><th>Est. Value</th><th>Action</th></tr></thead>
            <tbody>{incoming.map(r => (
              <tr key={r.id}>
                <td><span className="portal-link">SS-{String(r.id).padStart(5,'0')}</span></td>
                <td>{r.customer_name}</td><td>{r.service_category}</td><td>{r.city}</td><td>{fmtDate(r.preferred_time)}</td><td><strong>{fmtINR(estPrice(r.service_category))}</strong></td>
                <td><div className="portal-btn-row" style={{marginTop:0}}><button className="portal-btn primary" onClick={() => setStatus(r.id,'accepted')}>Accept</button><button className="portal-btn" onClick={() => setStatus(r.id,'rejected')}>Reject</button></div></td>
              </tr>
            ))}</tbody>
          </table>}
        </Widget>
      </>
    );
  }

  if (activeNav === 'jobs') {
    const active = rows.filter(r => ['accepted','in_progress'].includes(r.status));
    content = (
      <>
        <PageHead icon={<Briefcase size={22} />} title="Active Jobs" />
        <div className="portal-stat-row">
          <div className="portal-stat-card soon"><div className="portal-stat-head"><CheckCircle2 size={15} /> Accepted</div><div className="portal-stat-value">{active.filter(r=>r.status==='accepted').length}</div><div className="portal-stat-sub">ready to start</div></div>
          <div className="portal-stat-card total"><div className="portal-stat-head"><Clock size={15} /> In Progress</div><div className="portal-stat-value">{active.filter(r=>r.status==='in_progress').length}</div><div className="portal-stat-sub">currently working</div></div>
          <div className="portal-stat-card warn"><div className="portal-stat-head"><Calendar size={15} /> Total Active</div><div className="portal-stat-value">{active.length}</div></div>
        </div>
        <Widget title="All Active Jobs" icon={<Briefcase size={16} />} count={active.length}>
          {active.length === 0 ? <div className="portal-empty">No active jobs. Accept incoming orders to start working.</div> :
          <table className="portal-table"><thead><tr><th>Job #</th><th>Customer</th><th>Service</th><th>City</th><th>Scheduled</th><th>Status</th><th>Update</th></tr></thead>
            <tbody>{active.map(r => (
              <tr key={r.id}>
                <td><span className="portal-link">SS-{String(r.id).padStart(5,'0')}</span></td>
                <td>{r.customer_name}</td><td>{r.service_category}</td><td>{r.city}</td><td>{fmtDate(r.preferred_time)}</td><td><StatusPill status={r.status} /></td>
                <td><div className="portal-btn-row" style={{marginTop:0}}>
                  {r.status === 'accepted' && <button className="portal-btn primary" onClick={() => setStatus(r.id,'in_progress')}>Start Job</button>}
                  {r.status === 'in_progress' && <button className="portal-btn success" onClick={() => setStatus(r.id,'completed')}><CheckCircle2 size={14} /> Mark Complete</button>}
                </div></td>
              </tr>
            ))}</tbody>
          </table>}
        </Widget>
      </>
    );
  }

  if (activeNav === 'earnings') {
    const completed = rows.filter(r => r.status === 'completed').map(r => ({ ...r, amount: estPrice(r.service_category) }));
    content = (
      <>
        <PageHead icon={<IndianRupee size={22} />} title="Earnings" />
        <div className="portal-stat-row">
          <div className="portal-stat-card total"><div className="portal-stat-head"><TrendingUp size={15} /> This Month</div><div className="portal-stat-value">{fmtINR(stats.monthRevenue)}</div><div className="portal-stat-sub">from {stats.completedCount} completed</div></div>
          <div className="portal-stat-card soon"><div className="portal-stat-head"><IndianRupee size={15} /> Total Revenue</div><div className="portal-stat-value">{fmtINR(stats.totalRevenue)}</div><div className="portal-stat-sub">all-time</div></div>
          <div className="portal-stat-card warn"><div className="portal-stat-head"><Star size={15} /> Avg Rating</div><div className="portal-stat-value">{stats.avgRating || '—'}</div><div className="portal-stat-sub">{reviews.length} review(s)</div></div>
        </div>
        <Widget title="Earnings Breakdown" icon={<IndianRupee size={16} />} icoClass="green" count={completed.length}>
          {completed.length === 0 ? <div className="portal-empty">No earnings yet.</div> :
          <table className="portal-table"><thead><tr><th>Job #</th><th>Customer</th><th>Service</th><th>Completed</th><th>Earning</th></tr></thead>
            <tbody>{completed.map(r => (
              <tr key={r.id}><td><span className="portal-link">SS-{String(r.id).padStart(5,'0')}</span></td><td>{r.customer_name}</td><td>{r.service_category}</td><td>{fmtDate(r.preferred_time)}</td><td><strong>{fmtINR(r.amount)}</strong></td></tr>
            ))}</tbody>
            <tfoot><tr><td colSpan="4" style={{textAlign:'right',fontWeight:'700'}}>Total:</td><td><strong>{fmtINR(stats.totalRevenue)}</strong></td></tr></tfoot>
          </table>}
        </Widget>
      </>
    );
  }

  if (activeNav === 'reviews') {
    content = (
      <>
        <PageHead icon={<Star size={22} />} title="Reviews" />
        <div className="portal-stat-row">
          <div className="portal-stat-card warn"><div className="portal-stat-head"><Star size={15} /> Average</div><div className="portal-stat-value">{stats.avgRating || '—'}</div><div className="portal-stat-sub">out of 5</div></div>
          <div className="portal-stat-card soon"><div className="portal-stat-head"><MessageSquare size={15} /> Total Reviews</div><div className="portal-stat-value">{reviews.length}</div></div>
          <div className="portal-stat-card total"><div className="portal-stat-head"><CheckCircle2 size={15} /> Completed Jobs</div><div className="portal-stat-value">{stats.completedCount}</div></div>
        </div>
        <Widget title="Customer Reviews" icon={<Star size={16} />} icoClass="amber" count={reviews.length}>
          {reviews.length === 0 ? <div className="portal-empty">No reviews yet.</div> :
          <div style={{padding:'8px 18px'}}>
            {reviews.map((rv, i) => (
              <div key={i} style={{padding:'14px 0',borderBottom:i < reviews.length-1 ? '1px solid var(--portal-line)' : 'none'}}>
                <div style={{display:'flex',alignItems:'center',justifyContent:'space-between',marginBottom:6}}>
                  <span style={{fontWeight:'600',fontSize:14}}>{rv.customer_name || 'Anonymous'}</span>
                  <span style={{display:'flex',gap:2}}>{[1,2,3,4,5].map(n => <span key={n} style={{color: n <= (rv.rating||0) ? '#F59E0B' : '#CBD5E1',fontSize:14}}>★</span>)}</span>
                </div>
                <p style={{fontSize:13,color:'var(--portal-muted)',margin:0}}>{rv.comment || 'No comment provided.'}</p>
              </div>
            ))}
          </div>}
        </Widget>
      </>
    );
  }

  if (activeNav === 'listing' || activeNav === 'edit') {
    content = <ListingSection user={user} onDone={() => { setActiveNav('dashboard'); showToast('Listing published!'); }} />;
  }

  if (activeNav === 'payouts') {
    const completed = rows.filter(r => r.status === 'completed').map(r => ({ ...r, amount: estPrice(r.service_category) }));
    const platformFee = Math.round(stats.totalRevenue * 0.1);
    const netPayout = stats.totalRevenue - platformFee;
    content = (
      <>
        <PageHead icon={<Wallet size={22} />} title="Payouts" />
        <div className="portal-stat-row">
          <div className="portal-stat-card total"><div className="portal-stat-head"><IndianRupee size={15} /> Gross Earnings</div><div className="portal-stat-value">{fmtINR(stats.totalRevenue)}</div></div>
          <div className="portal-stat-card warn"><div className="portal-stat-head"><CreditCard size={15} /> Platform Fee (10%)</div><div className="portal-stat-value">{fmtINR(platformFee)}</div></div>
          <div className="portal-stat-card soon"><div className="portal-stat-head"><Wallet size={15} /> Net Payout</div><div className="portal-stat-value">{fmtINR(netPayout)}</div><div className="portal-stat-sub">available for withdrawal</div></div>
        </div>
        <div className="portal-btn-row" style={{marginBottom:18}}>
          <button className="portal-btn primary" onClick={() => showToast('Payout of ' + fmtINR(netPayout) + ' requested… Demo only.')}>Request Payout ({fmtINR(netPayout)})</button>
          <button className="portal-btn" onClick={() => showToast('Bank account setup is not available in demo.')}>Add Bank Account</button>
        </div>
        <Widget title="Payout History" icon={<Wallet size={16} />} icoClass="green" count={completed.length}>
          {completed.length === 0 ? <div className="portal-empty">No payouts yet.</div> :
          <table className="portal-table"><thead><tr><th>Job #</th><th>Date</th><th>Gross</th><th>Fee</th><th>Net</th><th>Status</th></tr></thead>
            <tbody>{completed.map(r => { const fee = Math.round(r.amount * 0.1); const net = r.amount - fee; return <tr key={r.id}><td><span className="portal-link">SS-{String(r.id).padStart(5,'0')}</span></td><td>{fmtDate(r.preferred_time)}</td><td>{fmtINR(r.amount)}</td><td>{fmtINR(fee)}</td><td><strong>{fmtINR(net)}</strong></td><td><span className="portal-pill green">Paid</span></td></tr>; })}</tbody>
          </table>}
        </Widget>
      </>
    );
  }

  if (activeNav === 'availability') {
    content = (
      <>
        <PageHead icon={<Clock size={22} />} title="Set Availability" />
        <div className="portal-widget-row">
          <Widget title="Availability Status" icon={<Clock size={16} />} icoClass="amber">
            <div style={{padding:'20px 18px',textAlign:'center'}}>
              <div style={{fontSize:48,marginBottom:8}}>{available ? '\uD83D\uDFE2' : '\uD83D\uDD34'}</div>
              <p style={{fontSize:18,fontWeight:'700',margin:'0 0 4px'}}>{available ? 'Available' : 'Unavailable'}</p>
              <p style={{fontSize:13,color:'var(--portal-muted)',margin:'0 0 16px'}}>{available ? 'Customers can book your services.' : "You won't receive new orders."}</p>
              <div className="portal-btn-row" style={{justifyContent:'center'}}><button className={`portal-btn ${available ? 'danger' : 'primary'}`} onClick={() => { setAvailable(!available); showToast(available ? 'You are now unavailable.' : 'You are now available.'); }}>{available ? 'Go Unavailable' : 'Go Available'}</button></div>
            </div>
          </Widget>
          <Widget title="Working Hours" icon={<Calendar size={16} />}>
            <div style={{padding:'16px 18px'}}>
              {['Monday','Tuesday','Wednesday','Thursday','Friday','Saturday','Sunday'].map(day => (
                <div key={day} style={{display:'flex',justifyContent:'space-between',alignItems:'center',padding:'8px 0',borderBottom:'1px solid var(--portal-line)'}}>
                  <span style={{fontSize:13,fontWeight:500}}>{day}</span><span style={{fontSize:13,color:'var(--portal-muted)'}}>9:00 AM – 6:00 PM</span>
                </div>
              ))}
              <div className="portal-btn-row" style={{marginTop:12}}><button className="portal-btn" onClick={() => showToast('Schedule editing is not available in demo.')}>Edit Schedule</button></div>
            </div>
          </Widget>
          <Widget title="Service Areas" icon={<MapPin size={16} />} icoClass="green">
            <div style={{padding:'16px 18px'}}>
              <p style={{fontSize:13,color:'var(--portal-muted)',margin:'0 0 8px'}}>You are currently serving:</p>
              <div style={{display:'flex',gap:8,flexWrap:'wrap'}}><span className="portal-pill blue">{user?.city || 'Kanpur'}</span></div>
              <div className="portal-btn-row" style={{marginTop:12}}><button className="portal-btn" onClick={() => showToast('Area editing is not available in demo.')}>Edit Areas</button></div>
            </div>
          </Widget>
        </div>
      </>
    );
  }

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
              <p style={{fontSize:14,margin:'0 0 8px'}}><strong>Role:</strong> Vendor</p>
              <div className="portal-btn-row" style={{marginTop:12}}><button className="portal-btn" onClick={() => setActiveNav('listing')}>Edit Listing</button><button className="portal-btn danger" onClick={logout}>Logout</button></div>
            </div>
          </Widget>
          <Widget title="Notifications" icon={<Bell size={16} />} icoClass="amber">
            <div style={{padding:'16px 18px'}}><p style={{fontSize:13,color:'var(--portal-muted)',margin:0}}>Get notified when new orders come in and payments are processed.</p><div className="portal-btn-row" style={{marginTop:12}}><button className="portal-btn" onClick={() => showToast('Notifications enabled.')}>Enable All</button><button className="portal-btn" onClick={() => showToast('Notifications disabled.')}>Disable</button></div></div>
          </Widget>
          <Widget title="Security" icon={<CheckCircle2 size={16} />} icoClass="green">
            <div style={{padding:'16px 18px'}}><p style={{fontSize:13,color:'var(--portal-muted)',margin:0}}>Keep your account secure with a strong password.</p><div className="portal-btn-row" style={{marginTop:12}}><button className="portal-btn" onClick={() => showToast('Password change is not available in demo.')}>Change Password</button></div></div>
          </Widget>
        </div>
      </>
    );
  }

  return (
    <VendorShell user={user} onLogout={logout} activeNav={activeNav} onNav={onNav}>
      {content || <div className="portal-empty">Loading section… (activeNav: {activeNav})</div>}
      {toast && <div className="portal-toast">{toast}</div>}
    </VendorShell>
  );
}
