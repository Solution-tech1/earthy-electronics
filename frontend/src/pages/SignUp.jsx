import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Zap, AlertTriangle, Eye, EyeOff } from 'lucide-react';
import './Auth.css';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';

export default function SignUp() {
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '', confirmPassword: '' });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const handleChange = e => setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (form.password !== form.confirmPassword) {
      return setError('Passwords do not match');
    }
    if (form.password.length < 6) {
      return setError('Password must be at least 6 characters');
    }
      setLoading(true);
      try {
        // Simulate network delay
        await new Promise(res => setTimeout(res, 800));

        // Create a mock user
        const newUser = {
          id: Date.now(),
          name: form.name,
          email: form.email,
          role: 'user'
        };

        // Fetch existing mock users or create array
        const existingUsers = JSON.parse(localStorage.getItem('mockUsers') || '[]');
        
        // Check if email already exists
        if (existingUsers.some(u => u.email === form.email)) {
          setLoading(false);
          return setError('Email is already registered. Please sign in.');
        }

        // Save to mock database
        existingUsers.push({ ...newUser, password: form.password });
        localStorage.setItem('mockUsers', JSON.stringify(existingUsers));

        // Log the user in
        const secureToken = btoa(Date.now().toString() + 'user-secure-token');
        localStorage.setItem('token', secureToken);
        localStorage.setItem('user', JSON.stringify(newUser));
        
        // Trigger global auth event
        window.dispatchEvent(new Event('authChange'));
        navigate('/');
      } catch (err) {
        setError('Registration failed. Please try again.');
      } finally {
        setLoading(false);
      }
  };

  return (
    <div className="auth-page">
      <div className="auth-card">
        <div className="auth-logo"><Zap size={40} color="#10b981"/></div>
        <h1 className="auth-title">Create Account</h1>
        <p className="auth-subtitle">Join EarthyElectronics</p>

        {error && <div className="auth-error"><AlertTriangle size={16} className="inline-icon"/> {error}</div>}

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="auth-field">
            <label>Full Name</label>
            <input
              type="text"
              name="name"
              placeholder="Ahmed Ali"
              value={form.name}
              onChange={handleChange}
              required
            />
          </div>
          <div className="auth-field">
            <label>Email Address</label>
            <input
              type="email"
              name="email"
              placeholder="ahmed@email.com"
              value={form.email}
              onChange={handleChange}
              required
            />
          </div>
            <div className="auth-field">
              <label>Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={form.password}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0'
                  }}
                >
                  {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
            <div className="auth-field">
              <label>Confirm Password</label>
              <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  placeholder="••••••••"
                  value={form.confirmPassword}
                  onChange={handleChange}
                  required
                  style={{ width: '100%', paddingRight: '40px' }}
                />
                <button
                  type="button"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={{
                    position: 'absolute',
                    right: '10px',
                    background: 'none',
                    border: 'none',
                    cursor: 'pointer',
                    color: '#64748b',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '0'
                  }}
                >
                  {showConfirmPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>
          <button type="submit" className="auth-btn" disabled={loading}>
            {loading ? 'Creating account...' : 'Create Account →'}
          </button>
        </form>

        <p className="auth-switch">
          Already have an account? <Link to="/signin">Sign In</Link>
        </p>
      </div>
    </div>
  );
}
