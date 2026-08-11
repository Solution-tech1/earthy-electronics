import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShieldAlert, Key } from 'lucide-react';
import './Auth.css';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    // Demo Bypass
    if (form.email === 'admin@earthyelectronics.pk' && form.password === 'admin123') {
      localStorage.setItem('token', 'mock-admin-token-12345');
      localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Admin', email: 'admin@earthyelectronics.pk', role: 'admin' }));
      navigate('/admin');
      return;
    }

    try {
      const res = await fetch(`${API}/api/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json();
      if (data.status === 'success') {
        if (data.user.role !== 'admin') {
          return setError('Access Denied. Admin privileges required.');
        }
        localStorage.setItem('token', data.token);
        localStorage.setItem('user', JSON.stringify(data.user));
        navigate('/admin');
      } else {
        setError(data.message || 'Login failed');
      }
    } catch {
      setError('Network error. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page admin-login-page">
      <div className="auth-card">
        <div className="auth-logo" style={{ background: '#dc2626' }}>
          <ShieldAlert size={36} color="#fff" />
        </div>
        <h1 className="auth-title">Admin Portal</h1>
        <p className="auth-subtitle">Restricted Access</p>

        {error && <div className="auth-error"><ShieldAlert size={16} className="inline-icon"/> {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Admin Email</label>
            <input
              type="email"
              name="email"
              placeholder="admin@earthyelectronics.pk"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label>Security Key</label>
            <input
              type="password"
              name="password"
              placeholder="••••••••"
              value={form.password}
              onChange={handleChange}
              required
              autoComplete="current-password"
            />
          </div>
          <button type="submit" className="auth-btn" style={{ background: '#dc2626' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Secure Login →'}
          </button>
        </form>

        <div className="auth-demo-hint" style={{ marginTop: '24px', background: '#fee2e2', borderColor: '#fca5a5', color: '#b91c1c' }}>
          <span></span>
        </div>
      </div>
    </div>
  );
}
