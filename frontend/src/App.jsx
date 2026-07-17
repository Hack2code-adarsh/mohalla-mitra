import React, { createContext, useContext, useEffect, useState } from 'react';
import Navbar from './components/Navbar.jsx';
import Home from './pages/Home.jsx';
import Login from './pages/Login.jsx';
import Category from './pages/Category.jsx';
import VendorSignup from './pages/VendorSignup.jsx';
import CustomerDashboard from './pages/CustomerDashboard.jsx';
import VendorDashboard from './pages/VendorDashboard.jsx';
import { api, clearToken, getStoredUser, setStoredUser } from './api.js';

const AuthContext = createContext(null);
export const useAuth = () => useContext(AuthContext);

export default function App() {
  const [page, setPage] = useState('home');
  const [routeData, setRouteData] = useState(null);
  const [user, setUser] = useState(getStoredUser());
  const [city, setCity] = useState(getStoredUser()?.city || localStorage.getItem('mm_city') || 'Kanpur');

  useEffect(() => { localStorage.setItem('mm_city', city); }, [city]);

  function login(nextUser, token) {
    setUser(nextUser); setStoredUser(nextUser); setCity(nextUser.city || city);
    if (nextUser.role === 'vendor') setPage('vendor-dashboard'); else setPage('customer-dashboard');
  }
  function logout() { clearToken(); setUser(null); setPage('home'); }
  function navigate(next, data = null) { setRouteData(data); setPage(next); window.scrollTo({top: 0, behavior: 'smooth'}); }

  const ctx = { user, login, logout, city, setCity, navigate };
  let content = <Home />;
  if (page === 'login') content = <Login />;
  if (page === 'category') content = <Category category={routeData?.category} />;
  if (page === 'vendor-signup') content = <VendorSignup />;
  if (page === 'customer-dashboard') content = user?.role === 'customer' ? <CustomerDashboard /> : <Login />;
  if (page === 'vendor-dashboard') content = user?.role === 'vendor' ? <VendorDashboard /> : <Login />;

  return <AuthContext.Provider value={ctx}><Navbar /><main>{content}</main></AuthContext.Provider>;
}
