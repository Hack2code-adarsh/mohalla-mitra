import React, { useRef, useState } from 'react';
import { MapPin, User, LogOut, Store } from 'lucide-react';
import { useAuth } from '../App.jsx';
import CitySelector from './CitySelector.jsx';
import './navbar.css';

function MagneticButton({ children, className = '', onClick }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const [pressed, setPressed] = useState(false);

  function handleMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.3;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.3;
    setPos({ x, y });
  }

  function reset() {
    setPos({ x: 0, y: 0 });
    setPressed(false);
  }

  return (
    <button
      ref={ref}
      className={`mm-mag-btn ${className} ${pressed ? 'mm-pressed' : ''}`}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px) ${pressed ? 'scale(0.94)' : 'scale(1)'}` }}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onMouseDown={() => setPressed(true)}
      onMouseUp={() => setPressed(false)}
      onTouchStart={() => setPressed(true)}
      onTouchEnd={() => setPressed(false)}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function Navbar() {
  const { user, logout, navigate, city, setCity } = useAuth();

  return (
    <header className="navbar mm-navbar">
      <button className="brand mm-brand" onClick={() => navigate('home')}>
        <span className="logo mm-logo">मि</span>
        <span>Mohalla Mitra</span>
      </button>

      <div className="nav-actions mm-nav-actions">
        <div className="mm-city-wrap">
          <CitySelector city={city} setCity={setCity} />
        </div>

        {user?.role === 'customer' && (
          <MagneticButton className="mm-nav-btn" onClick={() => navigate('customer-dashboard')}>
            My Orders
          </MagneticButton>
        )}
        {user?.role === 'vendor' && (
          <MagneticButton className="mm-nav-btn" onClick={() => navigate('vendor-dashboard')}>
            Vendor Dashboard
          </MagneticButton>
        )}

        <MagneticButton className="mm-nav-btn mm-nav-btn-store" onClick={() => navigate('vendor-signup')}>
          <Store size={17} /> List your service
        </MagneticButton>

        {!user ? (
          <MagneticButton className="mm-nav-btn mm-nav-btn-primary" onClick={() => navigate('login')}>
            <User size={17} /> Login
          </MagneticButton>
        ) : (
          <MagneticButton className="mm-nav-btn" onClick={logout}>
            <LogOut size={17} /> Logout
          </MagneticButton>
        )}
      </div>
    </header>
  );
}