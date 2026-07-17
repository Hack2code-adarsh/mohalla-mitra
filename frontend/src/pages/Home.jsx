import React, { useRef, useState } from 'react';
import { Zap, Wrench, GraduationCap, Utensils, Bike, Scissors, ShieldCheck, MapPin } from 'lucide-react';
import { useAuth } from '../App.jsx';
import './home.css';

const categories = [
  ['Electrician', Zap, '#FFB627'],
  ['Plumber', Wrench, '#0EA5A0'],
  ['Tutor', GraduationCap, '#6C5CE7'],
  ['Tiffin', Utensils, '#FF6B4A'],
  ['Bike Mechanic', Bike, '#2F9BF0'],
  ['Salon', Scissors, '#F0447D'],
];

function TiltCard({ children, className = '', color, onClick }) {
  const ref = useRef(null);
  const [transform, setTransform] = useState('perspective(700px) rotateX(0deg) rotateY(0deg)');
  const [ripples, setRipples] = useState([]);

  function handleMouseMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 16;
    const rotateX = (0.5 - py) * 16;
    setTransform(`perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(4px)`);
  }

  function handleTouchMove(e) {
    const el = ref.current;
    if (!el || !e.touches[0]) return;
    const rect = el.getBoundingClientRect();
    const px = (e.touches[0].clientX - rect.left) / rect.width;
    const py = (e.touches[0].clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * 12;
    const rotateX = (0.5 - py) * 12;
    setTransform(`perspective(700px) rotateX(${rotateX}deg) rotateY(${rotateY}deg) translateZ(4px)`);
  }

  function reset() {
    setTransform('perspective(700px) rotateX(0deg) rotateY(0deg) translateZ(0)');
  }

  function fireRipple(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const clientX = e.touches ? e.touches[0].clientX : e.clientX;
    const clientY = e.touches ? e.touches[0].clientY : e.clientY;
    const id = Date.now() + Math.random();
    setRipples((r) => [...r, { id, x: clientX - rect.left, y: clientY - rect.top }]);
    setTimeout(() => setRipples((r) => r.filter((rp) => rp.id !== id)), 600);
  }

  function handleKeyDown(e) {
    if (onClick && (e.key === 'Enter' || e.key === ' ')) {
      e.preventDefault();
      onClick();
    }
  }

  return (
    <div
      ref={ref}
      className={`mm-tilt ${className}`}
      style={{ transform, '--tilt-color': color }}
      onMouseMove={handleMouseMove}
      onMouseLeave={reset}
      onMouseDown={fireRipple}
      onTouchStart={fireRipple}
      onTouchMove={handleTouchMove}
      onTouchEnd={reset}
      onClick={onClick}
      role={onClick ? 'button' : undefined}
      tabIndex={onClick ? 0 : undefined}
      onKeyDown={handleKeyDown}
    >
      {children}
      {ripples.map((r) => (
        <span key={r.id} className="mm-ripple" style={{ left: r.x, top: r.y }} />
      ))}
    </div>
  );
}

function MagneticButton({ children, className = '', onClick }) {
  const ref = useRef(null);
  const [pos, setPos] = useState({ x: 0, y: 0 });

  function handleMove(e) {
    const el = ref.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    const x = (e.clientX - rect.left - rect.width / 2) * 0.25;
    const y = (e.clientY - rect.top - rect.height / 2) * 0.25;
    setPos({ x, y });
  }

  function reset() {
    setPos({ x: 0, y: 0 });
  }

  return (
    <button
      ref={ref}
      className={className}
      style={{ transform: `translate(${pos.x}px, ${pos.y}px)` }}
      onMouseMove={handleMove}
      onMouseLeave={reset}
      onClick={onClick}
    >
      {children}
    </button>
  );
}

export default function Home() {
  const { city, navigate, user } = useAuth();

  return (
    <div className="mm-home">
      <div className="mm-blob mm-blob-1" />
      <div className="mm-blob mm-blob-2" />
      <div className="mm-blob mm-blob-3" />

      <section className="mm-hero">
        <div className="mm-hero-text">
          <p className="mm-eyebrow"><MapPin size={16} /> Showing verified local vendors in {city}</p>
          <h1 className="mm-h1">Your trusted mohalla service network.</h1>
          <p className="mm-lead">
            Book electricians, plumbers, tutors, tiffin services and more with live matching
            based on rating, distance, price and response time.
          </p>
          <div className="mm-hero-actions">
            <MagneticButton className="mm-btn-primary" onClick={() => navigate('category', { category: 'Electrician' })}>
              Find a service
            </MagneticButton>
            <MagneticButton
              className="mm-btn-outline"
              onClick={() => navigate(user?.role === 'vendor' ? 'vendor-dashboard' : 'vendor-signup')}
            >
              Become a vendor
            </MagneticButton>
          </div>

          <div className="mm-strip" aria-hidden="true">
            <div className="mm-strip-track">
              {[...categories, ...categories].map(([name], i) => (
                <span key={i}>{name}</span>
              ))}
            </div>
          </div>
        </div>

        <TiltCard className="mm-hero-card" color="#FFB627">
          <div className="mm-score-ring"><span>92%</span></div>
          <h3>Smart vendor match</h3>
          <p>Every listing is ranked using your priorities and your selected city.</p>
          <div className="mm-trust-row"><ShieldCheck size={16} /> Verified vendors • Fast response • Local pricing</div>
        </TiltCard>
      </section>

      <section className="mm-section-head">
        <h2>Choose a category</h2>
        <p>Only vendors from your selected city are shown.</p>
      </section>

      <div className="mm-category-grid">
        {categories.map(([name, Icon, color]) => (
          <TiltCard
            key={name}
            className="mm-category-card"
            color={color}
            onClick={() => navigate('category', { category: name })}
          >
            <div className="mm-cat-icon" style={{ background: color }}>
              <Icon size={26} color="#fff" strokeWidth={2.2} />
            </div>
            <span>{name}</span>
          </TiltCard>
        ))}
      </div>
    </div>
  );
}