import React, { useEffect, useRef, useState, useCallback } from 'react';
import { Eye, EyeOff, ArrowLeft, Home, User, Store, CheckCircle2, Shield } from 'lucide-react';
import { api, setToken } from '../api.js';
import { useAuth } from '../App.jsx';
import './login.css';

const GOOGLE_CLIENT_ID = import.meta.env.VITE_GOOGLE_CLIENT_ID || '1009125264293-gh5gcga6tosa7tse5e10r27upq7eip40.apps.googleusercontent.com';
const CITIES = ['Kanpur', 'Delhi', 'Lucknow', 'Gurugram', 'Noida'];

function GoogleGIcon() {
  return (
    <svg className="bs-g-ico" viewBox="0 0 48 48">
      <path fill="#FFC107" d="M43.6 20.5H42V20H24v8h11.3C33.7 32.4 29.3 36 24 36c-6.6 0-12-5.4-12-12s5.4-12 12-12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 12.9 4 4 12.9 4 24s8.9 20 20 20 20-8.9 20-20c0-1.3-.1-2.3-.4-3.5z"/>
      <path fill="#FF3D00" d="M6.3 14.7l6.6 4.8C14.7 16 19 12 24 12c3.1 0 5.9 1.2 8 3.1l5.7-5.7C34.6 6.1 29.6 4 24 4 16.3 4 9.7 8.3 6.3 14.7z"/>
      <path fill="#4CAF50" d="M24 44c5.2 0 10-2 13.6-5.2l-6.3-5.3C29.2 35 26.7 36 24 36c-5.3 0-9.7-3.6-11.3-8.4l-6.5 5C9.6 39.6 16.2 44 24 44z"/>
      <path fill="#1976D2" d="M43.6 20.5H42V20H24v8h11.3c-.8 2.2-2.2 4.1-4 5.5l6.3 5.3C41.4 35.6 44 30.3 44 24c0-1.3-.1-2.3-.4-3.5z"/>
    </svg>
  );
}

export default function Login() {
  const { login, navigate } = useAuth();
  const [view, setView] = useState('login');
  const [showPwd, setShowPwd] = useState(false);
  const [remember, setRemember] = useState(true);
  const [role, setRole] = useState('customer');
  const [form, setForm] = useState({
    name: '', identifier: '', username: '', usernameOrEmail: '',
    password: '', confirmPassword: '', city: 'Kanpur',
  });
  const [adminForm, setAdminForm] = useState({ username: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [success, setSuccess] = useState(null);
  const googleButtonRef = useRef(null);
  const loginRootRef = useRef(null);

  function update(k, v) { setForm((f) => ({ ...f, [k]: v })); }

  async function finishLogin(res) {
    setToken(res.token);
    setSuccess({ name: res.user.name || 'there', role: res.user.role || 'customer' });
    setTimeout(() => { login(res.user, res.token); }, 1100);
  }

  async function loginWithPassword(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.loginPassword({ username_or_email: form.usernameOrEmail, password: form.password });
      await finishLogin(res);
    } catch (err) { setError(err.message || 'Login failed'); }
    finally { setLoading(false); }
  }

  async function registerWithPassword(e) {
    e.preventDefault(); setError('');
    if (form.password !== form.confirmPassword) { setError('Password and confirm password do not match'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await api.registerPassword({
        name: form.name, username: form.username, email: form.identifier,
        password: form.password, role, city: form.city,
      });
      await finishLogin(res);
    } catch (err) { setError(err.message || 'Registration failed'); }
    finally { setLoading(false); }
  }

  async function adminLogin(e) {
    e.preventDefault(); setError(''); setLoading(true);
    try {
      const res = await api.adminLogin(adminForm);
      setToken(res.token);
      login(res.user, res.token);
    } catch (err) { setError(err.message || 'Admin login failed'); }
    finally { setLoading(false); }
  }

  async function handleGoogleCredential(response) {
    setError('');
    try {
      const res = await api.googleLogin({ credential: response.credential, role, city: form.city });
      await finishLogin(res);
    } catch (err) { setError(err.message || 'Google login failed'); }
  }

  useEffect(() => {
    function renderGoogleButton() {
      if (!window.google || !googleButtonRef.current || !GOOGLE_CLIENT_ID) return;
      window.google.accounts.id.initialize({ client_id: GOOGLE_CLIENT_ID, callback: handleGoogleCredential });
      googleButtonRef.current.innerHTML = '';
      window.google.accounts.id.renderButton(googleButtonRef.current, { size: 'large', width: 320, text: 'continue_with' });
    }
    if (!document.querySelector('script[src="https://accounts.google.com/gsi/client"]')) {
      const script = document.createElement('script');
      script.src = 'https://accounts.google.com/gsi/client'; script.async = true; script.defer = true;
      script.onload = renderGoogleButton; document.body.appendChild(script);
    } else { renderGoogleButton(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [role]);

  function triggerGoogle() {
    const el = googleButtonRef.current;
    if (!el) return;
    const btn = el.querySelector('[role="button"]') || el.querySelector('div > div') || el.firstElementChild;
    if (btn) btn.click();
    else if (window.google) window.google.accounts.id.prompt();
  }

  const handleParallax = useCallback((e) => {
    const root = loginRootRef.current;
    if (!root) return;
    const rect = root.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width - 0.5;
    const py = (e.clientY - rect.top) / rect.height - 0.5;
    const bg = root.querySelector('.bs-left');
    if (bg) bg.style.setProperty('--px', `${px * 6}px`);
    if (bg) bg.style.setProperty('--py', `${py * 4}px`);
  }, []);

  useEffect(() => {
    const root = loginRootRef.current;
    if (!root) return;
    root.addEventListener('mousemove', handleParallax);
    return () => root.removeEventListener('mousemove', handleParallax);
  }, [handleParallax]);

  if (success) {
    const isVendor = success.role === 'vendor';
    return (
      <div className={`bs-success ${isVendor ? 'bs-success-vendor' : 'bs-success-customer'}`}>
        <div className="bs-success-card bs-success-pop">
          <div className="bs-success-check"><CheckCircle2 size={56} /></div>
          <h2 className="bs-success-title">Welcome{success.name ? `, ${success.name.split(' ')[0]}` : ''}!</h2>
          <p className="bs-success-sub">{isVendor ? 'Loading your vendor dashboard…' : 'Loading your customer dashboard…'}</p>
          <div className="bs-success-bar"><span /></div>
        </div>
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <div className="bs-login" ref={loginRootRef}>
        <div className="bs-left">
          <h1 className="bs-welcome bs-stagger-1"><span>Admin</span><span>Portal</span></h1>
          <div className="bs-brand-text bs-stagger-2">
            <div className="bs-brand-name">Service Sphere</div>
            <p className="bs-tagline">Administrative access only. Manage users, vendors, and platform data.</p>
          </div>
        </div>
        <div className="bs-right">
          <button className="bs-home-corner" type="button" onClick={() => navigate('home')} aria-label="Back to home"><Home size={20} /></button>
          <div className="bs-form-wrap bs-stagger-form">
            <div style={{display:'flex',alignItems:'center',justifyContent:'center',gap:10,marginBottom:8}}>
              <Shield size={28} color="#D97706" />
              <h2 className="bs-title" style={{margin:0}}>Admin Login</h2>
            </div>
            <p className="bs-subtitle">Enter your admin credentials to access the control panel.</p>
            {error && <div className="bs-alert err">{error}</div>}
            <form onSubmit={adminLogin}>
              <div className="bs-field-group">
                <label className="bs-label">Admin Username</label>
                <input className="bs-field" placeholder="admin" value={adminForm.username} onChange={(e) => setAdminForm(f => ({ ...f, username: e.target.value }))} required />
              </div>
              <div className="bs-field-group">
                <label className="bs-label">Admin Password</label>
                <div className="bs-pwd-wrap">
                  <input className="bs-field" type={showPwd ? 'text' : 'password'} placeholder="Enter admin password" value={adminForm.password} onChange={(e) => setAdminForm(f => ({ ...f, password: e.target.value }))} required />
                  <button type="button" className="bs-eye" onClick={() => setShowPwd((s) => !s)} aria-label="Toggle password">{showPwd ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                </div>
              </div>
              <button className="bs-btn" disabled={loading}>{loading ? 'Please wait…' : 'Login as Admin'}</button>
            </form>
            <button className="bs-forgot" style={{marginTop:16,display:'inline-flex',alignItems:'center',gap:6}} onClick={() => { setView('login'); setError(''); }}>
              <ArrowLeft size={15} /> Back to user login
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (view === 'register') {
    return (
      <div className="bs-login" ref={loginRootRef}>
        <div className="bs-left">
          <h1 className="bs-welcome bs-stagger-1">
            <span>Create</span>
            <span>Account,</span>
          </h1>
          <div className="bs-brand-text bs-stagger-2">
            <div className="bs-brand-name">Service Sphere</div>
            <p className="bs-tagline">
              Join the trusted local service network — book vendors in your mohalla in seconds.
            </p>
          </div>
        </div>
        <div className="bs-right">
          <button className="bs-home-corner" type="button" onClick={() => navigate('home')} aria-label="Back to home">
            <Home size={20} />
          </button>
          <div className="bs-form-wrap bs-stagger-form">
            <button className="bs-forgot" style={{ marginBottom: 16, display: 'inline-flex', alignItems: 'center', gap: 6 }} onClick={() => { setView('login'); setError(''); }}>
              <ArrowLeft size={15} /> Back to login
            </button>
            <h2 className="bs-title">Register</h2>
            <p className="bs-subtitle">Create your account to get started with Service Sphere.</p>
            <div className="bs-role-chips">
              <button type="button" className={`bs-role-chip ${role === 'customer' ? 'active customer' : ''}`} onClick={() => setRole('customer')}>
                <User size={16} /> Customer
              </button>
              <button type="button" className={`bs-role-chip ${role === 'vendor' ? 'active vendor' : ''}`} onClick={() => setRole('vendor')}>
                <Store size={16} /> Vendor
              </button>
            </div>
            {error && <div className="bs-alert err">{error}</div>}
            <form onSubmit={registerWithPassword}>
              <div className="bs-field-group">
                <label className="bs-label">Full name</label>
                <input className="bs-field" placeholder="Your full name" value={form.name} onChange={(e) => update('name', e.target.value)} required />
              </div>
              <div className="bs-field-group">
                <label className="bs-label">City</label>
                <select className="bs-select" value={form.city} onChange={(e) => update('city', e.target.value)}>
                  {CITIES.map((c) => <option key={c}>{c}</option>)}
                </select>
              </div>
              <div className="bs-field-group">
                <label className="bs-label">Email</label>
                <input className="bs-field" type="email" placeholder="mail@website.com" value={form.identifier} onChange={(e) => update('identifier', e.target.value)} required />
              </div>
              <div className="bs-field-group">
                <label className="bs-label">Username</label>
                <input className="bs-field" placeholder="Choose a username" value={form.username} onChange={(e) => update('username', e.target.value)} required />
              </div>
              <div className="bs-field-group">
                <label className="bs-label">Password</label>
                <div className="bs-pwd-wrap">
                  <input className="bs-field" type={showPwd ? 'text' : 'password'} placeholder="Min. 8 character" value={form.password} onChange={(e) => update('password', e.target.value)} required />
                  <button type="button" className="bs-eye" onClick={() => setShowPwd((s) => !s)} aria-label="Toggle password">
                    {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                  </button>
                </div>
              </div>
              <div className="bs-field-group">
                <label className="bs-label">Confirm password</label>
                <div className="bs-pwd-wrap">
                  <input className="bs-field" type={showPwd ? 'text' : 'password'} placeholder="Re-enter password" value={form.confirmPassword} onChange={(e) => update('confirmPassword', e.target.value)} required />
                  <span className="bs-eye">{showPwd ? <EyeOff size={18} /> : <Eye size={18} />}</span>
                </div>
              </div>
              <button className="bs-btn" disabled={loading}>{loading ? 'Please wait…' : 'Register'}</button>
            </form>
            <p className="bs-register-text">
              Already have an account?{' '}
              <button className="bs-register-link" onClick={() => { setView('login'); setError(''); }}>Login</button>
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`bs-login ${role}`} ref={loginRootRef}>
      <div className="bs-left">
        <h1 className="bs-welcome bs-stagger-1">
          <span>Welcome</span>
          <span>Back,</span>
        </h1>
        <div className="bs-brand-text bs-stagger-2">
          <div className="bs-brand-name">Service Sphere</div>
          <p className="bs-tagline">
            Enter your personal details and start your journey with us — book trusted
            local services in your mohalla in seconds.
          </p>
        </div>
      </div>
      <div className="bs-right">
        <button className="bs-home-corner" type="button" onClick={() => navigate('home')} aria-label="Back to home">
          <Home size={20} />
        </button>
        <div className="bs-form-wrap bs-stagger-form">
          <h2 className="bs-title">Login</h2>
          <p className="bs-subtitle">Sign in to access your local service marketplace.</p>
          <div className="bs-role-chips">
            <button type="button" className={`bs-role-chip ${role === 'customer' ? 'active customer' : ''}`} onClick={() => setRole('customer')}>
              <User size={16} /> Customer
            </button>
            <button type="button" className={`bs-role-chip ${role === 'vendor' ? 'active vendor' : ''}`} onClick={() => setRole('vendor')}>
              <Store size={16} /> Vendor
            </button>
          </div>
          {error && <div className="bs-alert err">{error}</div>}
          <button className="bs-google-btn" type="button" onClick={triggerGoogle}>
            <GoogleGIcon />
            Sign in with Google
          </button>
          <div ref={googleButtonRef} style={{ position: 'absolute', width: 1, height: 1, overflow: 'hidden', opacity: 0, pointerEvents: 'none' }} aria-hidden="true" />
          <div className="bs-divider"><span>Or Sign in with Email</span></div>
          <form onSubmit={loginWithPassword}>
            <div className="bs-field-group">
              <label className="bs-label">Email</label>
              <input className="bs-field" placeholder="mail@website.com" value={form.usernameOrEmail} onChange={(e) => update('usernameOrEmail', e.target.value)} required />
            </div>
            <div className="bs-field-group">
              <label className="bs-label">Password</label>
              <div className="bs-pwd-wrap">
                <input className="bs-field" type={showPwd ? 'text' : 'password'} placeholder="Min. 8 character" value={form.password} onChange={(e) => update('password', e.target.value)} required />
                <button type="button" className="bs-eye" onClick={() => setShowPwd((s) => !s)} aria-label="Toggle password">
                  {showPwd ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="bs-auth-row">
              <label className="bs-remember">
                <input type="checkbox" checked={remember} onChange={(e) => setRemember(e.target.checked)} />
                Remember me
              </label>
              <button type="button" className="bs-forgot" onClick={() => setError('Password reset is not enabled in this demo.')}>Forget password?</button>
            </div>
            <button className="bs-btn" disabled={loading}>{loading ? 'Please wait…' : 'Login'}</button>
          </form>
          <p className="bs-register-text">
            Not registered yet?{' '}
            <button className="bs-register-link" onClick={() => { setView('register'); setError(''); }}>Create an Account</button>
          </p>
          <div style={{ marginTop: 16, paddingTop: 16, borderTop: '1px solid rgba(255,255,255,0.1)' }}>
            <button className="bs-admin-btn" type="button" onClick={() => { setView('admin'); setError(''); }}>
              <Shield size={16} /> Admin Login
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
