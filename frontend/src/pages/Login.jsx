import React, { useEffect, useRef, useState } from 'react';
import { api, setToken } from '../api.js';
import { useAuth } from '../App.jsx';
import './login.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1009125264293-gh5gcga6tosa7tse5e10r27upq7eip40.apps.googleusercontent.com';
const CATEGORIES = ['Electrician', 'Plumber', 'Tutor', 'Tiffin', 'Bike Mechanic', 'Salon'];
const CITIES = ['Kanpur', 'Delhi', 'Lucknow', 'Gurugram', 'Noida'];

export default function Login() {
  const { login } = useAuth();
  const [otpStep, setOtpStep] = useState('request');
  const [passwordMode, setPasswordMode] = useState('login');
  const [form, setForm] = useState({
    name: 'Adarsh',
    identifier: 'adarsh@example.com',
    username: 'adarsh',
    usernameOrEmail: 'adarsh',
    password: '',
    confirmPassword: '',
    role: 'customer',
    city: 'Kanpur',
    otp: ''
  });
  const [demoOtp, setDemoOtp] = useState('');
  const [error, setError] = useState('');
  const googleButtonRef = useRef(null);

  function update(k, v) { setForm({ ...form, [k]: v }); }

  async function finishLogin(res) {
    setToken(res.token);
    login(res.user, res.token);
  }

  async function registerWithPassword(e) {
    e.preventDefault(); setError('');
    if (form.password !== form.confirmPassword) {
      setError('Password and confirm password do not match');
      return;
    }
    try {
      const res = await api.registerPassword({
        name: form.name,
        username: form.username,
        email: form.identifier,
        password: form.password,
        role: form.role,
        city: form.city,
      });
      await finishLogin(res);
    } catch (err) {
      setError(err.message || 'Registration failed');
    }
  }

  async function loginWithPassword(e) {
    e.preventDefault(); setError('');
    try {
      const res = await api.loginPassword({ username_or_email: form.usernameOrEmail, password: form.password });
      await finishLogin(res);
    } catch (err) {
      setError(err.message || 'Login failed');
    }
  }

  async function sendOtp(e) {
    e.preventDefault(); setError('');
    try { const res = await api.requestOtp(form); setDemoOtp(res.demo_otp); setOtpStep('verify'); }
    catch (err) { setError(err.message || 'OTP request failed'); }
  }

  async function verify(e) {
    e.preventDefault(); setError('');
    try { const res = await api.verifyOtp(form); await finishLogin(res); }
    catch (err) { setError(err.message || 'OTP verification failed'); }
  }

  async function handleGoogleCredential(response) {
    setError('');
    try {
      const res = await api.googleLogin({ credential: response.credential, role: form.role, city: form.city });
      await finishLogin(res);
    } catch (err) {
      setError(err.message || 'Google login failed');
    }
  }

  useEffect(() => {
    function renderGoogleButton() {
      if (!window.google || !googleButtonRef.current || !GOOGLE_CLIENT_ID) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, { theme: 'outline', size: 'large', width: 340, text: 'continue_with' });
    }
    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client';
      script.async = true;
      script.defer = true;
      script.onload = renderGoogleButton;
      document.body.appendChild(script);
    } else {
      renderGoogleButton();
    }
  }, [form.role, form.city]);

  const tickerItems = [...CATEGORIES, ...CATEGORIES];

  return (
    <div className="mm-login-page">
      <div className="mm-visual">
        <p className="mm-eyebrow">Neighborhood services, sorted</p>
        <h1 className="mm-headline">Mohalla<br /><span>Mitra</span></h1>
        <p className="mm-tagline">
          Find a trusted electrician, plumber, tutor, or tiffin service in your own mohalla —
          matched, ranked, and booked in a couple of taps.
        </p>

        <div className="mm-signboard" aria-hidden="true">
          <div className="mm-ticker-track">
            {tickerItems.map((item, i) => <span key={i}>{item}</span>)}
          </div>
        </div>

        <p className="mm-visual-foot">Serving Kanpur · Delhi · Lucknow · Gurugram · Noida</p>
      </div>

      <div className="mm-form-panel">
        <div className="mm-card">
          <p className="mm-card-eyebrow">Secure login</p>
          <h2 className="mm-card-title">Create account / Login</h2>
          <p className="mm-card-sub">Register with email + username + password, or continue with Google or a demo OTP.</p>

          {error && <div className="mm-alert mm-error">{error}</div>}

          <div className="mm-tabs" role="tablist">
            <button
              type="button"
              role="tab"
              aria-selected={passwordMode === 'login'}
              className={`mm-tab ${passwordMode === 'login' ? 'mm-active' : ''}`}
              onClick={() => setPasswordMode('login')}
            >Login</button>
            <button
              type="button"
              role="tab"
              aria-selected={passwordMode === 'register'}
              className={`mm-tab ${passwordMode === 'register' ? 'mm-active' : ''}`}
              onClick={() => setPasswordMode('register')}
            >Register</button>
          </div>

          {passwordMode === 'register' ? (
            <form onSubmit={registerWithPassword} className="mm-form">
              <input className="mm-field" placeholder="Full name" value={form.name} onChange={e => update('name', e.target.value)} required />

              <p className="mm-role-city-note">I am a...</p>
              <div className="mm-row-2">
                <select className="mm-select" value={form.role} onChange={e => update('role', e.target.value)}>
                  <option value="customer">Customer</option>
                  <option value="vendor">Vendor</option>
                </select>
                <select className="mm-select" value={form.city} onChange={e => update('city', e.target.value)}>
                  {CITIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>

              <input className="mm-field" placeholder="Email address" value={form.identifier} onChange={e => update('identifier', e.target.value)} required />
              <input className="mm-field" placeholder="Username" value={form.username} onChange={e => update('username', e.target.value)} required />
              <input className="mm-field" type="password" placeholder="Password (minimum 6 characters)" value={form.password} onChange={e => update('password', e.target.value)} required />
              <input className="mm-field" type="password" placeholder="Confirm password" value={form.confirmPassword} onChange={e => update('confirmPassword', e.target.value)} required />
              <button className="mm-btn mm-btn-primary">Register with email</button>
            </form>
          ) : (
            <form onSubmit={loginWithPassword} className="mm-form">
              <input className="mm-field" placeholder="Username or email" value={form.usernameOrEmail} onChange={e => update('usernameOrEmail', e.target.value)} required />
              <input className="mm-field" type="password" placeholder="Password" value={form.password} onChange={e => update('password', e.target.value)} required />
              <button className="mm-btn mm-btn-primary">Login with password</button>
            </form>
          )}

          <div className="mm-divider"><span>or continue with Google</span></div>
          <p className="mm-google-hint">First time with Google? Pick your role and city below before continuing.</p>
          <div className="mm-row-2" style={{ marginBottom: '14px' }}>
            <select className="mm-select" value={form.role} onChange={e => update('role', e.target.value)}>
              <option value="customer">Customer</option>
              <option value="vendor">Vendor</option>
            </select>
            <select className="mm-select" value={form.city} onChange={e => update('city', e.target.value)}>
              {CITIES.map(c => <option key={c}>{c}</option>)}
            </select>
          </div>
          <div className="mm-google-box"><div ref={googleButtonRef}></div></div>

          <div className="mm-divider"><span>or use demo OTP</span></div>
          {otpStep === 'request' ? (
            <form onSubmit={sendOtp} className="mm-form">
              <input className="mm-field" placeholder="Full name" value={form.name} onChange={e => update('name', e.target.value)} required />
              <input className="mm-field" placeholder="Email or mobile number" value={form.identifier} onChange={e => update('identifier', e.target.value)} required />
              <button className="mm-btn mm-btn-primary">Send OTP</button>
            </form>
          ) : (
            <form onSubmit={verify} className="mm-form">
              <div className="mm-alert mm-success">Demo OTP: <span className="mm-otp-chip">{demoOtp}</span></div>
              <input className="mm-field" placeholder="Enter OTP" value={form.otp} onChange={e => update('otp', e.target.value)} required />
              <button className="mm-btn mm-btn-primary">Verify &amp; continue</button>
              <button type="button" className="mm-btn mm-btn-ghost" onClick={() => setOtpStep('request')}>Change details</button>
            </form>
          )}

          <p className="mm-footnote">Password login is for your Service Sphere account only. Google login never shares or stores your Gmail password.</p>
        </div>
      </div>
    </div>
  );
}