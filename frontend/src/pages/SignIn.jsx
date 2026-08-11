import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, AlertTriangle } from 'lucide-react';
import './Auth.css';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function SignIn() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [keySequence, setKeySequence] = useState([]);

  // Secret keyboard shortcut to reach admin login: press Ctrl+Alt+A
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.ctrlKey && e.altKey && e.key === 'a') {
        navigate('/admin-login');
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [navigate]);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
      setLoading(true);
      try {
        await new Promise(res => setTimeout(res, 800)); // Simulate delay
        
        // Fetch existing mock users
        const existingUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]');
        
        // Check credentials
        const validUser = existingUsers.find(u => u.email === form.email && u.password === form.password);

        if (validUser) {
          // Block admin from using normal login
          if (validUser.role === 'admin') {
            setLoading(false);
            return setError('Access denied. Please use the Admin portal.');
          }

          // Generate token and save session
          const secureToken = btoa(Date.now().toString() + 'user-secure-token');
          localStorage.setItem('token', secureToken);
          
          // Don't save password in session
          const sessionUser = { id: validUser.id, name: validUser.name, email: validUser.email, role: validUser.role };
          localStorage.setItem('user', JSON.stringify(sessionUser));
          
          window.dispatchEvent(new Event('authChange'));
          navigate('/');
        } else {
          setError('Invalid email or password.');
        }
      } catch (err) {
        setError('Login failed. Please try again.');
      } finally {
        setLoading(false);
      }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><Zap size={40} color="#10b981"/></div>
        <h1 className="auth-title">Welcome Back</h1>
        <p className="auth-subtitle">Sign in to your account</p>

        {error && <div className="auth-error"><AlertTriangle size={16} className="inline-icon"/> {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="your@email.com"
              value={form.email}
              onChange={handleChange}
              required
              autoComplete="email"
            />
          </div>
          <div className="auth-field">
            <label>Password</label>
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
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In →'}
          </button>
        </form>

        <p className="auth-switch">
          Don't have an account? <Link to="/signup">Create Account</Link>
        </p>
        <p style={{ textAlign: 'center', marginTop: '20px', fontSize: '11px', color: '#94a3b8' }}>
          <Link to="/admin-login" style={{ color: '#94a3b8', textDecoration: 'none' }}>Admin? Click here</Link>
        </p>
      </div>
    </div>
  );
}
