import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  LayoutDashboard, Package, ShoppingCart, Users, TrendingUp,
  CreditCard, LogOut, Menu, X, Bell, Settings, Plus, Pencil,
  Trash2, AlertTriangle, Star, Zap, Banknote, Ticket, Image as ImageIcon
} from 'lucide-react';
import './Admin.css';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const PIE_COLORS = ['#10b981','#38bdf8','#34d399','#a855f7','#f43f5e','#facc15'];

export default function AdminDashboard() {
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [analytics, setAnalytics] = useState(null);
  const [products, setProducts] = useState([]);
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productForm, setProductForm] = useState(null);

  const user = JSON.parse(localStorage.getItem('user') || '{}');
  const token = localStorage.getItem('token');

  // Redirect if not admin
  useEffect(() => {
    if (!token || user.role !== 'admin') {
      navigate('/admin-login');
    }
  }, []);

  const authFetch = (url, opts = {}) =>
    fetch(url, { ...opts, headers: { ...opts.headers, Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' } });

  useEffect(() => {
    if (!token) return;
    
    // Demo bypass for locations
    setLocations([{ id: 1, name: 'Karachi Central' }, { id: 2, name: 'Lahore Branch' }]);

    // Fetch products statically
    fetch('/data/products.json').then(r => r.json()).then(p => {
      if (p.status === 'success') setProducts(p.data);
      setLoading(false);
    }).catch(() => setLoading(false));

    // Hardcode dummy analytics for demo
    setAnalytics({
      summary: { totalRevenue: 5688000, totalOrders: 55, totalProducts: 184, totalCustomers: 34 },
      brandRevenue: [
        { brand: 'Haier', revenue: 1250000 },
        { brand: 'Dawlance', revenue: 980000 },
        { brand: 'Gree', revenue: 780000 },
        { brand: 'Kenwood', revenue: 620000 },
        { brand: 'Samsung', revenue: 550000 }
      ],
      categoryPerformance: [
        { category: 'Air Conditioners', count: 45 },
        { category: 'Refrigerators', count: 32 },
        { category: 'LED TVs', count: 28 },
        { category: 'Washing Machines', count: 35 }
      ]
    });
    setUsers([{ id: 1, name: 'Ali Raza', email: 'ali@example.com', role: 'customer', is_active: 1 }]);
    setInstallments([{ id: 1, product_name: 'Haier 1.5 Ton AC', status: 'pending', months: 12 }]);
    
  }, [token]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    navigate('/');
  };

  const handleDeleteProduct = async (id) => {
    if (!confirm('Are you sure you want to delete this product?')) return;
    await authFetch(`${API}/api/admin/products/${id}`, { method: 'DELETE' });
    setProducts(prev => prev.filter(p => p.id !== id));
  };

  const handleToggleUserStatus = async (userId, currentStatus, userRole) => {
    if (userRole === 'admin') {
      alert("Cannot modify an admin account.");
      return;
    }
    const action = currentStatus === 1 ? 'block and force-logout' : 'reactivate';
    if (!confirm(`Are you sure you want to ${action} this user?`)) return;
    
    try {
      const res = await authFetch(`${API}/api/admin/users/${userId}/toggle`, { method: 'PATCH' });
      const data = await res.json();
      if (data.status === 'success') {
        setUsers(prev => prev.map(u => u.id === userId ? { ...u, is_active: data.is_active } : u));
        alert(data.message);
      } else {
        alert(data.message || 'Failed to update user status');
      }
    } catch (err) {
      alert('Error updating user status');
    }
  };

  const navItems = [
    { id: 'dashboard',    icon: <LayoutDashboard size={18} color="#818cf8"/>, label: 'Dashboard' },
    { id: 'products',     icon: <Package size={18} color="#34d399"/>,          label: 'Inventory' },
    { id: 'orders',       icon: <ShoppingCart size={18} color="#10b981"/>,     label: 'Orders' },
    { id: 'installments', icon: <CreditCard size={18} color="#a78bfa"/>,       label: 'Installments' },
    { id: 'analytics',    icon: <TrendingUp size={18} color="#22d3ee"/>,       label: 'Analytics' },
    { id: 'users',        icon: <Users size={18} color="#fb923c"/>,            label: 'Customers' },
    { id: 'coupons',      icon: <Ticket size={18} color="#f43f5e"/>,           label: 'Promo Codes' },
    { id: 'reviews',      icon: <Star size={18} color="#facc15"/>,             label: 'Reviews' },
    { id: 'banners',      icon: <ImageIcon size={18} color="#c084fc"/>,        label: 'Banners' },
    { id: 'site-settings',icon: <Settings size={18} color="#94a3b8"/>,         label: 'Site Editor' },
  ];

  const summary = analytics?.summary || {};
  const brandData = analytics?.brandRevenue || [];
  const catData = analytics?.categoryPerformance || [];

  // Low stock alert products
  const lowStock = products.filter(p => (p.stock || 0) <= (p.stock_threshold || 5));

  return (
    <div className={`admin-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>

      {/* ── Sidebar ── */}
      <aside className="admin-sidebar">
        <div className="admin-sidebar-head">
          <div className="admin-logo-icon"><Zap size={24} color="#fff"/></div>
          {sidebarOpen && (
            <div>
              <div className="admin-logo-name">EarthyElectronics</div>
              <div className="admin-logo-sub">Admin Panel</div>
            </div>
          )}
        </div>

        <nav className="admin-nav">
          {navItems.map(item => (
            <button
              key={item.id}
              className={`admin-nav-item${activeView === item.id ? ' active' : ''}`}
              onClick={() => setActiveView(item.id)}
              title={!sidebarOpen ? item.label : ''}
            >
              {item.icon}
              {sidebarOpen && <span>{item.label}</span>}
            </button>
          ))}
        </nav>

        <div className="admin-sidebar-footer">
          <button className="admin-nav-item logout-btn" onClick={handleLogout}>
            <LogOut size={18}/>
            {sidebarOpen && <span>Logout</span>}
          </button>
        </div>
      </aside>

      {/* ── Main Content ── */}
      <div className="admin-main">

        {/* Top Bar */}
        <header className="admin-topbar">
          <div className="admin-topbar-left">
            <button className="sidebar-toggle-btn" onClick={() => setSidebarOpen(p => !p)}>
              {sidebarOpen ? <X size={20}/> : <Menu size={20}/>}
            </button>
            <h2 className="admin-page-title">
              {navItems.find(n => n.id === activeView)?.label || 'Dashboard'}
            </h2>
          </div>
          <div className="admin-topbar-right">
            {lowStock.length > 0 && (
              <div className="admin-alert-badge" title={`${lowStock.length} low stock items`}>
                <AlertTriangle size={16}/> {lowStock.length}
              </div>
            )}
            <div className="admin-user-chip">
              <div className="admin-user-avatar">{user.name?.[0] || 'A'}</div>
              {user.name || 'Admin'}
            </div>
          </div>
        </header>

        {/* Content Area */}
        <main className="admin-content">
          {loading ? (
            <div className="admin-loading">
              <div className="admin-spinner"></div>
              <p>Loading dashboard data...</p>
            </div>
          ) : (

            <>
              {/* ── DASHBOARD VIEW ── */}
              {activeView === 'dashboard' && (
                <div>
                  {/* Summary Cards */}
                  <div className="admin-summary-grid">
                                        <div className="summary-card revenue">
                      <div className="summary-icon"><Banknote size={28} color="#16a34a"/></div>
                      <div className="summary-content">
                        <div className="summary-value">Rs. {(summary.totalRevenue || 5688000).toLocaleString()}</div>
                        <div className="summary-label">Total Revenue</div>
                      </div>
                    </div>
                    <div className="summary-card orders">
                      <div className="summary-icon"><Package size={28} color="#10b981"/></div>
                      <div className="summary-content">
                        <div className="summary-value">{summary.totalOrders || 55}</div>
                        <div className="summary-label">Total Orders</div>
                      </div>
                    </div>
                    <div className="summary-card products">
                      <div className="summary-icon"><ShoppingCart size={28} color="#065f46"/></div>
                      <div className="summary-content">
                        <div className="summary-value">{summary.totalProducts || products.length}</div>
                        <div className="summary-label">Total Products</div>
                      </div>
                    </div>
                    <div className="summary-card customers">
                      <div className="summary-icon"><Users size={28} color="#8b5cf6"/></div>
                      <div className="summary-content">
                        <div className="summary-value">{summary.totalCustomers || 34}</div>
                        <div className="summary-label">Customers</div>
                      </div>
                    </div>

                  {/* Low Stock Alert */}
                  {lowStock.length > 0 && (
                    <div className="admin-alert-panel" style={{ display: 'block' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                        <AlertTriangle size={18} className="alert-icon" style={{ marginRight: '8px' }}/>
                        <strong style={{ fontSize: '16px' }}>Low Stock Alert ({lowStock.length} items need restock)</strong>
                      </div>
                      <div className="table-responsive">
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Product Name</th>
                              <th>Category</th>
                              <th>Brand</th>
                              <th>Current Stock</th>
                              <th>Action</th>
                            </tr>
                          </thead>
                          <tbody>
                            {lowStock.slice(0, 5).map(p => (
                              <tr key={p.id}>
                                <td>{p.name}</td>
                                <td><span className="cat-badge">{p.category}</span></td>
                                <td>{p.brand}</td>
                                <td><span style={{ color: '#dc2626', fontWeight: 'bold' }}>{p.stock}</span> left</td>
                                <td><button className="action-btn edit">Restock</button></td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                  </div>
                </div>
              )}

              {/* -- BANNERS VIEW (NEW) -- */}
              {activeView === 'banners' && (
                <div>
                  <div className="admin-view-header">
                    <h3>Homepage Banners & Carousels</h3>
                    <button className="action-btn add"><Plus size={16}/> Upload Banner</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px' }}>
                      <img src="/images/hero1.jpg" alt="Banner 1" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }}/>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold' }}>Main Slider 1</span>
                        <div style={{display: 'flex', gap: 5}}>
                          <button className="action-btn edit">Change</button>
                        </div>
                      </div>
                    </div>
                    <div style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px' }}>
                      <img src="/images/hero2.jpg" alt="Banner 2" style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '10px' }}/>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <span style={{ fontWeight: 'bold' }}>Main Slider 2</span>
                        <div style={{display: 'flex', gap: 5}}>
                          <button className="action-btn edit">Change</button>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* -- SITE SETTINGS / CMS VIEW (NEW) -- */}
              {activeView === 'site-settings' && (
                <div>
                  <div className="admin-view-header">
                    <h3>Live Site Editor & CMS</h3>
                    <button className="action-btn save" style={{ background: '#065f46', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Save Changes</button>
                  </div>
                  
                  <div className="admin-settings-layout">
                    <div className="settings-panels-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                      
                      <div className="admin-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <h4 style={{ color: '#065f46', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>Global Settings</h4>
                        
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label>Store Name</label>
                          <input type="text" className="form-input" defaultValue="EarthyElectronics" style={{width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #e2e8f0'}}/>
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label>Contact Phone</label>
                          <input type="text" className="form-input" defaultValue="+92 300 1234567" style={{width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #e2e8f0'}}/>
                        </div>
                        
                        <div className="form-group">
                          <label>Footer About Text</label>
                          <textarea className="form-input" style={{ minHeight: '80px', width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #e2e8f0' }} defaultValue="Pakistan's premium destination for top-quality home appliances and electronics."></textarea>
                        </div>
                      </div>

                      <div className="admin-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <h4 style={{ color: '#065f46', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>Theme & Branding</h4>
                        
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label>Primary Brand Color</label>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                            <input type="color" defaultValue="#065f46" style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer' }} />
                            <code style={{background: '#f1f5f9', padding: '5px 10px', borderRadius: '5px'}}>#065f46 (Earthy Green)</code>
                          </div>
                        </div>

                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label>Secondary Accent Color</label>
                          <div style={{ display: 'flex', gap: '10px', alignItems: 'center', marginTop: '5px' }}>
                            <input type="color" defaultValue="#fb923c" style={{ width: '40px', height: '40px', padding: '0', border: 'none', borderRadius: '8px', cursor: 'pointer' }} />
                            <code style={{background: '#f1f5f9', padding: '5px 10px', borderRadius: '5px'}}>#fb923c (Vibrant Orange)</code>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </main>
      </div>
    </div>
  );
}


