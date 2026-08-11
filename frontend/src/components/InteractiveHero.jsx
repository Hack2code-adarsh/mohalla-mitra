import React, { useEffect, useRef } from 'react';
import { Zap, Wrench, BookOpen, Soup, Bike, Scissors } from 'lucide-react';
import './interactiveHero.css';

const ITEMS = [
  { Icon: Zap, label: 'Electrician', color: '#F4A93B' },
  { Icon: Wrench, label: 'Plumber', color: '#1E7F72' },
  { Icon: BookOpen, label: 'Tutor', color: '#5B7FDE' },
  { Icon: Soup, label: 'Tiffin', color: '#D9622B' },
  { Icon: Bike, label: 'Mechanic', color: '#8B5CF6' },
  { Icon: Scissors, label: 'Salon', color: '#DB4C77' },
];

function DraggableChip({ item, index, containerRef }) {
  const chipRef = useRef(null);
  const state = useRef({
    x: 0, y: 0, vx: 0, vy: 0, rot: 0,
    dragging: false,
    lastX: 0, lastY: 0, lastT: 0,
    raf: null,
  });

  useEffect(() => {
    const chip = chipRef.current;
    const container = containerRef.current;
    if (!chip || !container) return;

    function applyTransform() {
      const s = state.current;
      chip.style.transform =
        `translate(${s.x}px, ${s.y}px) rotate(${s.rot}deg) scale(${s.dragging ? 1.12 : 1})`;
    }

    function getBounds() {
      return {
        cw: container.clientWidth,
        ch: container.clientHeight,
        size: chip.offsetWidth,
      };
    }

    const { cw, ch, size } = getBounds();
    state.current.x = Math.random() * Math.max(cw - size - 40, 40) + 20;
    state.current.y = Math.random() * Math.max(ch - size - 40, 40) + 20;
    applyTransform();

    function onPointerDown(e) {
      chip.setPointerCapture(e.pointerId);
      state.current.dragging = true;
      chip.classList.add('mm-chip-grabbed');
      state.current.lastX = e.clientX;
      state.current.lastY = e.clientY;
      state.current.lastT = performance.now();
      cancelAnimationFrame(state.current.raf);
    }

    function onPointerMove(e) {
      if (!state.current.dragging) return;
      const now = performance.now();
      const dt = Math.max(now - state.current.lastT, 1);
      const dx = e.clientX - state.current.lastX;
      const dy = e.clientY - state.current.lastY;

      state.current.x += dx;
      state.current.y += dy;
      state.current.vx = (dx / dt) * 16;
      state.current.vy = (dy / dt) * 16;
      state.current.rot = Math.max(-20, Math.min(20, dx * 2));

      state.current.lastX = e.clientX;
      state.current.lastY = e.clientY;
      state.current.lastT = now;

      const { cw: bw, ch: bh, size: bs } = getBounds();
      state.current.x = Math.min(Math.max(state.current.x, 0), bw - bs);
      state.current.y = Math.min(Math.max(state.current.y, 0), bh - bs);

      applyTransform();
    }

    function onPointerUp(e) {
      if (!state.current.dragging) return;
      state.current.dragging = false;
      chip.classList.remove('mm-chip-grabbed');
      try { chip.releasePointerCapture(e.pointerId); } catch (_) {}
      runInertia();
    }

    function runInertia() {
      const friction = 0.94;
      const rotFriction = 0.9;
      const bounce = 0.55;

      function step() {
        const { cw: bw, ch: bh, size: bs } = getBounds();
        const s = state.current;

        s.x += s.vx;
        s.y += s.vy;
        s.vx *= friction;
        s.vy *= friction;
        s.rot *= rotFriction;

        if (s.x < 0) { s.x = 0; s.vx *= -bounce; }
        if (s.x > bw - bs) { s.x = bw - bs; s.vx *= -bounce; }
        if (s.y < 0) { s.y = 0; s.vy *= -bounce; }
        if (s.y > bh - bs) { s.y = bh - bs; s.vy *= -bounce; }

        applyTransform();

        if (Math.abs(s.vx) > 0.05 || Math.abs(s.vy) > 0.05) {
          state.current.raf = requestAnimationFrame(step);
        }
      }
      state.current.raf = requestAnimationFrame(step);
    }

    chip.addEventListener('pointerdown', onPointerDown);
    chip.addEventListener('pointermove', onPointerMove);
    chip.addEventListener('pointerup', onPointerUp);
    chip.addEventListener('pointercancel', onPointerUp);

    return () => {
      chip.removeEventListener('pointerdown', onPointerDown);
      chip.removeEventListener('pointermove', onPointerMove);
      chip.removeEventListener('pointerup', onPointerUp);
      chip.removeEventListener('pointercancel', onPointerUp);
      cancelAnimationFrame(state.current.raf);
    };
  }, [containerRef]);

  const { Icon, label, color } = item;

  return (
    <div ref={chipRef} className="mm-chip" style={{ '--chip-color': color }}>
      <Icon size={22} strokeWidth={2.2} />
      <span>{label}</span>
    </div>
  );
}

export default function InteractiveHero() {
  const containerRef = useRef(null);

  return (
    <div className="mm-hero-playground" ref={containerRef}>
      <div className="mm-hero-copy">
        <p className="mm-hero-eyebrow">Drag a service, feel it move</p>
        <h2>Your mohalla, one tap away</h2>
        <p className="mm-hero-sub">
          Touch and flick any tile — a quick feel for how fast Service Sphere
          connects you to help nearby.
        </p>
      </div>
      {ITEMS.map((item, i) => (
        <DraggableChip key={item.label} item={item} index={i} containerRef={containerRef} />
      ))}
    </div>
  );
}