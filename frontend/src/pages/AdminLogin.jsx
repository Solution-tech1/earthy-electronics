import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { LockKeyhole, Eye, EyeOff, AlertCircle } from 'lucide-react';
import './Auth.css';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function AdminLogin() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    const submittedEmail = form.email.trim().toLowerCase();
    
    // Demo Bypass
    if (submittedEmail === 'admin@earthyelectronics.pk' && form.password === 'admin123') {
      localStorage.setItem('token', 'mock-admin-token-12345');
      localStorage.setItem('user', JSON.stringify({ id: 1, name: 'Admin', email: 'admin@earthyelectronics.pk', role: 'admin' }));
      setTimeout(() => {
        setLoading(false);
        navigate('/admin');
      }, 500);
      return;
    }

    // If it's the demo email but wrong password, fail early so it doesn't try the broken backend
    if (submittedEmail === 'admin@earthyelectronics.pk') {
      setLoading(false);
      return setError('Incorrect admin password. Please try again.');
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
      setError('Network error or invalid credentials. Ensure backend is running.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page admin-login-page" style={{ background: '#f4f6f9' }}>
      <div className="auth-card" style={{ borderTop: '4px solid #065f46', boxShadow: '0 20px 40px rgba(0,0,0,0.08)' }}>
        <div className="auth-logo" style={{ background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)', boxShadow: '0 8px 16px rgba(16, 185, 129, 0.25)' }}>
          <LockKeyhole size={36} color="#fff" />
        </div>
        <h1 className="auth-title" style={{ color: '#065f46' }}>Admin Portal</h1>
        <p className="auth-subtitle">EarthyElectronics Workspace</p>

        {error && <div className="auth-error" style={{ background: '#fff0f0', color: '#dc2626', borderColor: '#fecaca', display: 'flex', gap: '8px', alignItems: 'center' }}>
          <AlertCircle size={18} className="inline-icon" /> {error}
        </div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label style={{ color: '#065f46', fontWeight: '600' }}>Admin Email</label>
            <input
              type="email"
              name="email"
              placeholder="admin@earthyelectronics.pk"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
              style={{ border: '1px solid #cbd5e1' }}
            />
          </div>
          
          <div className="auth-field">
            <label style={{ color: '#065f46', fontWeight: '600' }}>Security Key</label>
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input
                type={showPassword ? "text" : "password"}
                name="password"
                placeholder="••••••••"
                value={form.password}
                onChange={handleChange}
                required
                autoComplete="current-password"
                style={{ width: '100%', paddingRight: '40px', border: '1px solid #cbd5e1' }}
              />
              <button 
                type="button" 
                onClick={() => setShowPassword(!showPassword)}
                style={{ position: 'absolute', right: '12px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', padding: 0, display: 'flex' }}
                title={showPassword ? "Hide Password" : "Show Password"}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          </div>
          
          <button type="submit" className="auth-btn" style={{ background: 'linear-gradient(135deg, #065f46 0%, #10b981 100%)', marginTop: '10px' }} disabled={loading}>
            {loading ? 'Authenticating...' : 'Secure Login →'}
          </button>
        </form>

      </div>
    </div>
  );
}
