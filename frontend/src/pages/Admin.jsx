import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useTheme } from '../context/ThemeContext';
import { useInventory } from '../context/InventoryContext';
import { useCRM } from '../context/CRMContext';
import {
  BarChart, Bar, PieChart, Pie, Cell, XAxis, YAxis, CartesianGrid,
  Tooltip, Legend, ResponsiveContainer
} from 'recharts';
import {
  LayoutDashboard, Package, ShoppingCart, Users, TrendingUp,
  CreditCard, LogOut, Menu, X, Bell, Settings, Plus, Pencil,
  Trash2, AlertTriangle, Star, Zap, Banknote, Ticket, Image as ImageIcon, MapPin, Clock
} from 'lucide-react';
import './Admin.css';

const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
const PIE_COLORS = ['#10b981','#38bdf8','#34d399','#a855f7','#f43f5e','#facc15'];

export default function AdminDashboard() {
  const { themeConfig, updateTheme } = useTheme();
  
  const updateBanner = (index, field, value) => {
    const newSlides = [...(themeConfig.heroSlides || [])];
    newSlides[index] = { ...newSlides[index], [field]: value };
    updateTheme("heroSlides", newSlides);
  };

  const { inventory, updateStock } = useInventory();
  const { stats, barChart, pieChart, users: crmUsers, updateStats, updateBarChart, updatePieChart } = useCRM();
  const navigate = useNavigate();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [activeView, setActiveView] = useState('dashboard');
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [analytics, setAnalytics] = useState(null);
  
  // Use inventory from context instead of fetching from MySQL for the local demo
  const products = inventory || [];
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [installments, setInstallments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [productForm, setProductForm] = useState(null);
  const [formErrors, setFormErrors] = useState({});

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
    window.dispatchEvent(new Event('authChange'));
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

    const summary = {
      totalRevenue: stats.revenue,
      totalOrders: stats.totalSales,
      totalProducts: products.length,
      customers: stats.activeUsers
    };
    const brandData = pieChart || [];
    const catData = barChart || [];

  // Low stock alert products
  const lowStock = products.filter(p => (p.stock || 0) <= (p.stock_threshold || 5));

  return (
    <div className={`admin-layout ${sidebarOpen ? 'sidebar-open' : 'sidebar-closed'}`}>

      {/* --- Sidebar --- */}
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
              onClick={() => {
                setActiveView(item.id);
                if (window.innerWidth <= 768) {
                  setSidebarOpen(false);
                } else {
                  setSidebarOpen(true);
                }
              }}
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

      {/* --- Main Content --- */}
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
              {/* 📊 DASHBOARD VIEW 📊 */}
              {activeView === 'dashboard' && (
                <div>
                  {/* Summary Cards */}
                  <div className="admin-summary-grid">
                    <div className="summary-card revenue">
                      <div className="summary-icon"><Banknote size={28} color="#16a34a"/></div>
                      <div>
                        <div className="summary-value">Rs. {(summary.totalRevenue !== undefined && summary.totalRevenue !== '' ? summary.totalRevenue : 5688000).toLocaleString()}</div>
                        <div className="summary-label">Total Revenue</div>
                      </div>
                    </div>
                    <div className="summary-card orders">
                      <div className="summary-icon"><Package size={28} color="#10b981"/></div>
                      <div>
                        <div className="summary-value">{summary.totalOrders !== undefined && summary.totalOrders !== '' ? summary.totalOrders : 55}</div>
                        <div className="summary-label">Total Orders</div>
                      </div>
                    </div>
                    <div className="summary-card products">
                      <div className="summary-icon"><ShoppingCart size={28} color="var(--primary-color)"/></div>
                      <div>
                        <div className="summary-value">{summary.totalProducts !== undefined && summary.totalProducts !== '' ? summary.totalProducts : products.length}</div>
                        <div className="summary-label">Total Products</div>
                      </div>
                    </div>
                    <div className="summary-card customers">
                      <div className="summary-icon"><Users size={28} color="#8b5cf6"/></div>
                      <div>
                        <div className="summary-value">{summary.customers !== undefined && summary.customers !== '' ? summary.customers : 34}</div>
                        <div className="summary-label">Customers</div>
                      </div>
                    </div>
                  </div>

                  {/* Low Stock Alert */}
                  {lowStock.length > 0 && (
                    <div className="admin-alert-panel" style={{ display: 'block' }}>
                      <div style={{ display: 'flex', alignItems: 'center', marginBottom: '15px' }}>
                        <AlertTriangle size={18} className="alert-icon" style={{ marginRight: '8px' }}/>
                        <strong style={{ fontSize: '16px' }}>Low Stock Alert ({lowStock.length} items need restock)</strong>
                      </div>
                      <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
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
                                    <td>
                                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                        <button 
                                          onClick={() => updateStock(p.id, p.stock - 1)}
                                          style={{ width: '24px', height: '24px', borderRadius: '4px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >-</button>
                                        <span style={{ color: '#dc2626', fontWeight: 'bold', minWidth: '20px', textAlign: 'center' }}>{p.stock}</span>
                                        <button 
                                          onClick={() => updateStock(p.id, p.stock + 1)}
                                          style={{ width: '24px', height: '24px', borderRadius: '4px', background: '#f0fdf4', color: '#22c55e', border: '1px solid #86efac', cursor: 'pointer', fontWeight: 'bold', display: 'flex', alignItems: 'center', justifyContent: 'center' }}
                                        >+</button>
                                      </div>
                                    </td>
                                                                    <td><button className="action-btn btn-restock" onClick={() => alert('Restock request placed for ' + p.name)}>Restock</button></td>
                                </tr>
                            ))}
                          </tbody>
                        </table>
                        {lowStock.length > 5 && <div style={{ textAlign: 'center', marginTop: '10px', fontSize: '13px', color: '#64748b' }}>+ {lowStock.length - 5} more items</div>}
                      </div>
                    </div>
                  )}

                  {/* Charts Row */}
                  <div className="admin-charts-row">
                    {/* Brand Revenue Donut */}
                    <div className="admin-chart-card">
                      <h3>Sales by Category</h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <PieChart>
                          <Pie
                            data={brandData.length ? brandData : []}
                            dataKey="value"
                            nameKey="name"
                            cx="50%"
                            cy="50%"
                            outerRadius={90}
                            innerRadius={45}
                            paddingAngle={3}
                            label={({ name, percent }) => `${name} ${(percent * 100).toFixed(0)}%`}
                            labelLine={false}
                          >
                            {(brandData.length ? brandData : []).map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                            ))}
                          </Pie>
                          <Tooltip formatter={(v) => `Rs. ${v.toLocaleString()}`} />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    {/* Category Performance Bar */}
                    <div className="admin-chart-card">
                      <h3>Monthly Revenue</h3>
                      <ResponsiveContainer width="100%" height={260}>
                        <BarChart
                          data={catData.length ? catData : []}
                          margin={{ top: 10, right: 10, bottom: 0, left: -10 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#e2e8f0"/>
                          <XAxis dataKey="name" tick={{ fontSize: 11 }}/>
                          <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11 }}/>
                          <Tooltip/>
                          <Bar dataKey="revenue" fill="#10b981" radius={[4,4,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* 📦 INVENTORY / PRODUCTS VIEW 📦 */}
              {activeView === 'products' && (
                <div>
                  <div className="admin-panel-header" style={{ marginBottom: 24, background: 'transparent', border: 'none', padding: 0 }}>
                    <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: 'var(--primary-color)' }}>Inventory Management</h2>
                    <button className="btn-add" onClick={() => setProductForm({})}>
                      <Plus size={16}/> Add Product
                    </button>
                  </div>

                  {/* Add/Edit Product Modal */}
                  {productForm !== null && (
                    <div className="admin-modal-overlay">
                      <div className="admin-modal" style={{ width: '95%', maxWidth: '500px', maxHeight: '90vh', overflowY: 'auto' }}>
                        <div className="admin-modal-head">
                          <h3>{productForm.id ? 'Edit Product' : 'Add New Product'}</h3>
                          <button className="btn-close" onClick={() => { setProductForm(null); setFormErrors({}); }}><X size={20}/></button>
                        </div>
                        <div className="admin-modal-body" style={{ display: 'grid', gridTemplateColumns: window.innerWidth <= 640 ? '1fr' : 'repeat(2, 1fr)', gap: '15px' }}>
                          {['name','brand','category','price','discountPrice','image'].map(field => (
                            <div key={field} className="form-group">
                              <label>{field.charAt(0).toUpperCase() + field.slice(1)} {['name','price'].includes(field) && '*'}</label>
                              <input
                                className="form-input"
                                type={field.includes('price') ? 'number' : 'text'}
                                value={productForm[field] || ''}
                                onChange={e => {
                                  setProductForm(p => ({ ...p, [field]: e.target.value }));
                                  setFormErrors(err => ({ ...err, [field]: null }));
                                }}
                                placeholder={field}
                                style={{ borderColor: formErrors[field] ? '#ef4444' : '' }}
                              />
                              {formErrors[field] && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>{formErrors[field]}</span>}
                            </div>
                          ))}
                          <div className="form-group" style={{ gridColumn: '1/-1' }}>
                            <label>Description</label>
                            <textarea
                              className="form-input"
                              value={productForm.description || ''}
                              onChange={e => setProductForm(p => ({ ...p, description: e.target.value }))}
                              rows={3}
                            />
                          </div>
                          <div className="form-group">
                            <label>Stock Qty *</label>
                            <input className="form-input" type="number" value={productForm.stock !== undefined ? productForm.stock : ''} 
                              onChange={e => {
                                setProductForm(p => ({ ...p, stock: e.target.value }));
                                setFormErrors(err => ({ ...err, stock: null }));
                              }}
                              style={{ borderColor: formErrors.stock ? '#ef4444' : '' }}
                            />
                            {formErrors.stock && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>{formErrors.stock}</span>}
                          </div>
                          <div className="form-group">
                            <label>Stock Alert Threshold *</label>
                            <input className="form-input" type="number" value={productForm.stock_threshold !== undefined ? productForm.stock_threshold : ''} 
                              onChange={e => {
                                setProductForm(p => ({ ...p, stock_threshold: e.target.value }));
                                setFormErrors(err => ({ ...err, stock_threshold: null }));
                              }}
                              style={{ borderColor: formErrors.stock_threshold ? '#ef4444' : '' }}
                            />
                            {formErrors.stock_threshold && <span style={{ color: '#ef4444', fontSize: '11px', marginTop: '4px', display: 'block' }}>{formErrors.stock_threshold}</span>}
                          </div>
                        </div>
                        <div className="admin-modal-footer">
                          <button className="btn-cancel" onClick={() => { setProductForm(null); setFormErrors({}); }}>Cancel</button>
                          <button className="btn-save" onClick={async (e) => {
                              e.preventDefault();
                              const errors = {};
                              
                              if (!productForm.name || !String(productForm.name).trim()) errors.name = 'Name is required';
                              if (!productForm.price || Number(productForm.price) <= 0) errors.price = 'Price must be a positive number';
                              
                              const stockVal = Number(productForm.stock);
                              if (productForm.stock === undefined || productForm.stock === '' || stockVal < 0 || !Number.isInteger(stockVal)) {
                                errors.stock = 'Stock must be a non-negative integer';
                              }
                              
                              const thresholdVal = Number(productForm.stock_threshold);
                              if (productForm.stock_threshold === undefined || productForm.stock_threshold === '' || thresholdVal < 0 || !Number.isInteger(thresholdVal)) {
                                errors.stock_threshold = 'Threshold must be a non-negative integer';
                              }

                              if (Object.keys(errors).length > 0) {
                                setFormErrors(errors);
                                return;
                              }
                              setFormErrors({});

                              try {
                                if (productForm.id) {
                                  // Use context for frontend demo
                                  updateStock(productForm.id, Number(productForm.stock || 0));
                                  alert("Product stock updated successfully!");
                                }
                                setProductForm(null);
                              } catch (e) {
                                console.error(e);
                                alert("Failed to update product.");
                              }
                            }}>Save Product</button>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Category Filter Tabs */}
                  <div style={{ display: 'flex', gap: '10px', overflowX: 'auto', paddingBottom: '15px', marginBottom: '15px' }}>
                    <button 
                      onClick={() => setSelectedCategory('All')} 
                      style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: selectedCategory === 'All' ? 'var(--primary-color)' : '#f1f5f9', color: selectedCategory === 'All' ? 'white' : '#334155', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}
                    >
                      All Products
                    </button>
                    {[...new Set(products.map(p => p.category))].sort().map(cat => (
                      <button 
                        key={`filter-${cat}`}
                        onClick={() => setSelectedCategory(cat)} 
                        style={{ padding: '8px 16px', borderRadius: '20px', border: 'none', background: selectedCategory === cat ? 'var(--primary-color)' : '#f1f5f9', color: selectedCategory === cat ? 'white' : '#334155', cursor: 'pointer', fontWeight: 500, whiteSpace: 'nowrap' }}
                      >
                        {cat}
                      </button>
                    ))}
                  </div>

                  {/* Products grouped by category */}
                  {[...new Set(products.map(p => p.category))].sort()
                    .filter(cat => selectedCategory === 'All' || cat === selectedCategory)
                    .map(cat => (
                    <div key={cat} className="admin-panel" style={{ marginBottom: '24px' }}>
                      <div className="admin-panel-header">
                        <h3>{cat} <span style={{ fontSize: 13, color: '#64748b', fontWeight: 500 }}>({products.filter(p=>p.category===cat).length} products)</span></h3>
                      </div>
                      <div className="admin-table-container" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>Product</th>
                              <th>Brand</th>
                              <th>Price</th>
                              <th>Stock</th>
                              <th>Actions</th>
                            </tr>
                          </thead>
                          <tbody>
                            {products.filter(p => p.category === cat)
                                     .sort((a, b) => a.name.localeCompare(b.name)).map(p => (
                              <tr key={p.id}>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                                    <img
                                      src={p.image || `https://placehold.co/48x48/f1f5f9/64748b?text=${encodeURIComponent((p.brand||'?')[0])}`}
                                      alt={p.name}
                                      style={{ width: 48, height: 48, objectFit: 'contain', borderRadius: 8, background: '#f8fafc', border: '1px solid rgba(0,0,0,0.05)', flexShrink: 0, mixBlendMode: 'multiply' }}
                                      onError={e => { e.target.onerror=null; e.target.src=`https://placehold.co/48x48/f1f5f9/64748b?text=${encodeURIComponent((p.brand||'?')[0])}`; }}
                                    />
                                    <div>
                                      <div style={{ color: 'var(--primary-color)', fontWeight: 600, fontSize: 13 }}>{p.name}</div>
                                      <div style={{ color: '#64748b', fontSize: 11 }}>ID: {p.id}</div>
                                    </div>
                                  </div>
                                </td>
                                <td style={{ color: '#64748b' }}>{p.brand}</td>
                                <td>
                                  <div style={{ color: '#059669', fontWeight: 600 }}>Rs. {(p.discountPrice || p.price)?.toLocaleString()}</div>
                                  {p.discountPrice && <div style={{ color: '#94a3b8', fontSize: 11, textDecoration: 'line-through' }}>Rs. {p.price?.toLocaleString()}</div>}
                                </td>
                                  <td>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                      <button 
                                        onClick={() => updateStock(p.id, p.stock - 1)}
                                        style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#fef2f2', color: '#ef4444', border: '1px solid #fca5a5', cursor: 'pointer', fontWeight: 'bold' }}
                                      >-</button>
                                      
                                      <span className={`status-badge ${p.stock > (p.stock_threshold||5) ? 'active' : 'blocked'}`}>
                                        {p.stock} left
                                      </span>
                                      
                                      <button 
                                        onClick={() => updateStock(p.id, p.stock + 1)}
                                        style={{ width: '28px', height: '28px', borderRadius: '6px', background: '#f0fdf4', color: '#22c55e', border: '1px solid #86efac', cursor: 'pointer', fontWeight: 'bold' }}
                                      >+</button>
                                    </div>
                                  </td>
                                <td>
                                  <div className="action-btns">
                                    <button className="btn-icon edit" onClick={() => setProductForm(p)}><Pencil size={16}/></button>
                                    <button className="btn-icon delete" onClick={() => handleDeleteProduct(p.id)}><Trash2 size={16}/></button>
                                  </div>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
              )}

              {/* 📈 ANALYTICS VIEW 📈 */}
              {activeView === 'analytics' && (
                <div>
                  <div className="admin-view-header"><h3>Sales Analytics</h3></div>
                  <div className="admin-charts-col">
                    <div className="admin-chart-card wide">
                      <h3>Category Sales Distribution</h3>
                      <ResponsiveContainer width="100%" height={300}>
                        <BarChart data={brandData.length ? brandData : []} margin={{ top: 10, right: 20, bottom: 0, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)"/>
                          <XAxis dataKey="name" tick={{ fontSize: 12, fill: '#64748b' }}/>
                          <YAxis tickFormatter={v => `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: '#64748b' }}/>
                          <Tooltip formatter={v => `Rs. ${v.toLocaleString()}`}/>
                          <Bar dataKey="value" radius={[6,6,0,0]}>
                            {(brandData.length ? brandData : []).map((_, i) => (
                              <Cell key={i} fill={PIE_COLORS[i % PIE_COLORS.length]}/>
                            ))}
                          </Bar>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="admin-chart-card wide">
                      <h3>Monthly Revenue Trend</h3>
                      <ResponsiveContainer width="100%" height={280}>
                        <BarChart data={catData.length ? catData : []} margin={{ top: 10, right: 20, bottom: 0, left: 20 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(0,0,0,0.05)"/>
                          <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#64748b' }}/>
                          <YAxis yAxisId="left" tickFormatter={v => `${(v/1000).toFixed(0)}K`} tick={{ fontSize: 11, fill: '#64748b' }}/>
                          <Tooltip/>
                          <Bar yAxisId="left" dataKey="revenue" fill="#10b981" name="Revenue (PKR)" radius={[4,4,0,0]}/>
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>
                </div>
              )}

              {/* 👥 CUSTOMERS VIEW 👥 */}
              {activeView === 'users' && (
                <div>
                  <div className="admin-view-header"><h3>Customer Accounts ({crmUsers.length})</h3></div>
                  {crmUsers.length === 0 ? (
                    <div className="admin-empty">No customers found.</div>
                  ) : (
                    <div className="admin-panel" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                        <table className="admin-table">
                          <thead>
                            <tr>
                              <th>ID</th>
                              <th>Name/Email</th>
                              <th>Status</th>
                              <th>Live Location</th>
                              <th>Session Time</th>
                              <th>Total Orders</th>
                            </tr>
                          </thead>
                          <tbody>
                            {crmUsers.map(u => {
                              const isActive = u.status === 'Active';
                              return (
                              <tr key={u.id} className={!isActive ? 'user-blocked-row' : ''}>
                                <td>{u.id}</td>
                                <td>
                                  <div className="user-name">{u.name}</div>
                                  <div className="user-email">{u.email}</div>
                                </td>
                                <td>
                                  <span className={`status-badge ${isActive ? 'active' : 'blocked'}`}>
                                    {u.status}
                                  </span>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: '#475569' }}>
                                    <MapPin size={14} color="#3b82f6"/>
                                    {u.location}
                                  </div>
                                </td>
                                <td>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '13px', color: isActive ? '#10b981' : '#64748b' }}>
                                    <Clock size={14}/>
                                    {u.sessionTime} mins
                                  </div>
                                </td>
                                <td>{u.orders}</td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 💳 INSTALLMENTS VIEW 💳 */}
              {activeView === 'installments' && (
                <div>
                  <div className="admin-view-header">
                    <h3>Installment Ledger</h3>
                    <button className="admin-add-btn"><Plus size={16}/> New Plan</button>
                  </div>
                  {installments.length === 0 ? (
                    <div className="admin-empty">
                      <CreditCard size={40} style={{opacity:0.3, margin:'0 auto 16px'}}/>
                      <p>No installment plans yet. Connect MySQL DB to manage EMI plans.</p>
                    </div>
                  ) : (
                    <div className="admin-table-wrap" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                      <table className="admin-table">
                        <thead>
                          <tr><th>Customer</th><th>Product</th><th>Total</th><th>Monthly</th><th>Progress</th><th>Status</th></tr>
                        </thead>
                        <tbody>
                          {installments.map(il => (
                            <tr key={il.id}>
                              <td>{il.customer_name || 'N/A'}</td>
                              <td>{il.product_name || il.product_id}</td>
                              <td>Rs. {il.total_amount?.toLocaleString()}</td>
                              <td>Rs. {il.monthly_amount?.toLocaleString()}</td>
                              <td>{il.paid_months}/{il.total_months} months</td>
                              <td><span className={`status-badge ${il.status}`}>{il.status}</span></td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  )}
                </div>
              )}

              {/* 🛒 ORDERS VIEW 🛒 */}
              {activeView === 'orders' && (
                <div>
                  <div className="admin-view-header"><h3>Orders Management</h3></div>
                  <div className="admin-empty-state">
                    <ShoppingCart size={48} color="#94a3b8"/>
                    <h3>No new orders yet</h3>
                    <p>When customers place orders, they will appear here for processing.</p>
                  </div>
                </div>
              )}

              {/* 🎟️ COUPONS VIEW (NEW) 🎟️ */}
              {activeView === 'coupons' && (
                <div>
                  <div className="admin-view-header">
                    <h3>Promo Codes & Coupons</h3>
                    <button className="action-btn add"><Plus size={16}/> Create Coupon</button>
                  </div>
                  <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                    <table className="admin-table">
                      <thead>
                        <tr><th>Code</th><th>Discount</th><th>Status</th><th>Usage</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        <tr><td><strong>RAMZAN50</strong></td><td>Rs. 5,000 Off</td><td><span className="cat-badge" style={{background: '#dcfce7', color: '#16a34a'}}>Active</span></td><td>12 / 100</td><td><button className="action-btn edit">Edit</button></td></tr>
                        <tr><td><strong>FREESHIP</strong></td><td>Free Shipping</td><td><span className="cat-badge" style={{background: '#dcfce7', color: '#16a34a'}}>Active</span></td><td>45 / ∞</td><td><button className="action-btn edit">Edit</button></td></tr>
                        <tr><td><strong>EID2025</strong></td><td>10% Off</td><td><span className="cat-badge" style={{background: '#f1f5f9', color: '#64748b'}}>Expired</span></td><td>150 / 150</td><td><button className="action-btn delete">Delete</button></td></tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* ⭐ REVIEWS VIEW (NEW) ⭐ */}
              {activeView === 'reviews' && (
                <div>
                  <div className="admin-view-header"><h3>Product Reviews Moderation</h3></div>
                  <div className="table-responsive" style={{ overflowX: 'auto', WebkitOverflowScrolling: 'touch', width: '100%' }}>
                    <table className="admin-table">
                      <thead>
                        <tr><th>Customer</th><th>Product</th><th>Rating</th><th>Review</th><th>Action</th></tr>
                      </thead>
                      <tbody>
                        <tr>
                          <td>Ali Raza</td><td>Haier 1.5 Ton AC</td><td><div style={{color: '#facc15'}}>★★★★★</div></td>
                          <td style={{maxWidth: 250}}>Excellent cooling, very satisfied!</td>
                          <td>
                            <div style={{display: 'flex', gap: 5}}>
                              <button className="action-btn edit" style={{background: '#10b981', color: 'white'}}>Approve</button>
                              <button className="action-btn delete">Reject</button>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td>Kamran</td><td>Dawlance Refrigerator</td><td><div style={{color: '#facc15'}}>★★★★☆</div></td>
                          <td style={{maxWidth: 250}}>Good product but delivery was late.</td>
                          <td>
                            <div style={{display: 'flex', gap: 5}}>
                              <button className="action-btn edit" style={{background: '#10b981', color: 'white'}}>Approve</button>
                              <button className="action-btn delete">Reject</button>
                            </div>
                          </td>
                        </tr>
                      </tbody>
                    </table>
                  </div>
                </div>
              )}

              {/* 🖼️ BANNERS VIEW (NEW) 🖼️ */}
              {activeView === 'banners' && (
                <div>
                  <div className="admin-view-header">
                    <h3>Homepage Banners & Carousels</h3>
                    <button className="action-btn save" onClick={() => alert("Banner changes saved successfully! The live site has been updated.")} style={{ background: 'var(--primary-color)', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Save Changes</button>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '20px' }}>
                    {(themeConfig?.heroSlides || []).map((slide, index) => (
                      <div key={index} style={{ border: '1px solid #e2e8f0', borderRadius: '12px', padding: '15px', background: 'white' }}>
                        <img src={slide.bgImage} alt={`Banner ${index + 1}`} style={{ width: '100%', height: '150px', objectFit: 'cover', borderRadius: '8px', marginBottom: '15px' }}/>
                        
                        <div className="form-group" style={{ marginBottom: '10px' }}>
                          <label style={{fontSize: '12px', color: '#64748b'}}>Image URL</label>
                          <input type="text" className="form-input" value={slide.bgImage} onChange={(e) => updateBanner(index, 'bgImage', e.target.value)} style={{width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0'}}/>
                        </div>

                        <div className="form-group" style={{ marginBottom: '10px' }}>
                          <label style={{fontSize: '12px', color: '#64748b'}}>Heading</label>
                          <input type="text" className="form-input" value={slide.title} onChange={(e) => updateBanner(index, 'title', e.target.value)} style={{width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0'}}/>
                        </div>

                        <div className="form-group" style={{ marginBottom: '10px' }}>
                          <label style={{fontSize: '12px', color: '#64748b'}}>Subtext Description</label>
                          <input type="text" className="form-input" value={slide.desc} onChange={(e) => updateBanner(index, 'desc', e.target.value)} style={{width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0'}}/>
                        </div>

                        <div className="form-group" style={{ marginBottom: '0' }}>
                          <label style={{fontSize: '12px', color: '#64748b'}}>Offer Tag (e.g. Free Delivery)</label>
                          <input type="text" className="form-input" value={slide.offer} onChange={(e) => updateBanner(index, 'offer', e.target.value)} style={{width: '100%', padding: '8px', borderRadius: '6px', border: '1px solid #e2e8f0'}}/>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* ⚙️ SITE SETTINGS / CMS VIEW (NEW) ⚙️ */}
              {activeView === 'site-settings' && (
                <div>
                  <div className="admin-view-header">
                    <h3>Live Site Editor & CMS</h3>
                    <button className="action-btn save" onClick={() => alert("Settings saved successfully! The live site has been updated.")} style={{ background: 'var(--primary-color)', color: 'white', padding: '10px 20px', borderRadius: '8px', border: 'none', cursor: 'pointer' }}>Save Changes</button>
                  </div>
                  
                                    <div className="admin-settings-layout">
                    <div className="settings-panels-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
                      
                      <div className="admin-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <h4 style={{ color: 'var(--primary-color)', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>Global Settings</h4>
                        
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label>Store Name</label>
                          <input type="text" className="form-input" value={themeConfig?.storeName || ""} onChange={(e) => updateTheme("storeName", e.target.value)} style={{width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #e2e8f0'}}/>
                        </div>
                        
                        <div className="form-group" style={{ marginBottom: '16px' }}>
                          <label>Contact Phone</label>
                          <input type="text" className="form-input" value={themeConfig?.contactPhone || ""} onChange={(e) => updateTheme("contactPhone", e.target.value)} style={{width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #e2e8f0'}}/>
                        </div>
                        
                        <div className="form-group">
                          <label>Footer About Text</label>
                          <textarea className="form-input" style={{ minHeight: '80px', width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #e2e8f0' }} value={themeConfig?.footerAbout || ""} onChange={(e) => updateTheme("footerAbout", e.target.value)}></textarea>
                        </div>
                      </div>



                      {/* NEW: CMS Fields (Hero & Promo) */}
                      <div className="admin-panel" style={{ padding: '24px', background: 'white', borderRadius: '16px', boxShadow: '0 4px 12px rgba(0,0,0,0.02)', border: '1px solid rgba(0,0,0,0.05)' }}>
                        <h4 style={{ color: 'var(--primary-color)', borderBottom: '2px solid #e2e8f0', paddingBottom: '10px', marginBottom: '20px' }}>Content Management</h4>
                        

                        
                        <div className="form-group" style={{ marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <input type="checkbox" checked={themeConfig?.promoActive !== false} onChange={(e) => updateTheme("promoActive", e.target.checked)} style={{width: '18px', height: '18px'}}/>
                          <div>
                            <label style={{marginBottom: 0}}>Enable Top Promotion Bar</label>
                            <span style={{display: 'block', fontSize: '11px', color: '#64748b'}}>Toggles the yellow scrolling announcement bar at the very top of the website.</span>
                          </div>
                        </div>
                        
                        <div className="form-group">
                          <label>Promotion Bar Text</label>
                          <span style={{display: 'block', fontSize: '11px', color: '#64748b', marginBottom: '8px'}}>The actual text shown in the scrolling yellow promotion bar.</span>
                          <input type="text" className="form-input" value={themeConfig?.promoText || ""} onChange={(e) => updateTheme("promoText", e.target.value)} style={{width: '100%', padding: '10px', marginTop: '5px', borderRadius: '8px', border: '1px solid #e2e8f0'}}/>
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

      {/* Mobile Bottom Navigation */}
      {window.innerWidth <= 768 && (
        <div style={{
          position: 'fixed', bottom: 0, left: 0, right: 0, 
          background: '#fff', borderTop: '1px solid #e2e8f0', 
          display: 'flex', overflowX: 'auto', zIndex: 1000, 
          padding: '10px 5px', boxShadow: '0 -4px 12px rgba(0,0,0,0.05)'
        }}>
          {navItems.map(item => (
            <button
              key={item.id}
              onClick={() => setActiveView(item.id)}
              style={{
                flex: '0 0 auto', minWidth: '70px', display: 'flex', flexDirection: 'column', 
                alignItems: 'center', gap: '4px', background: 'none', border: 'none', 
                color: activeView === item.id ? '#10b981' : '#64748b', fontSize: '10px', 
                fontWeight: activeView === item.id ? '700' : '500', cursor: 'pointer'
              }}
            >
              {item.icon}
              <span style={{ whiteSpace: 'nowrap' }}>{item.label}</span>
            </button>
          ))}
          <button onClick={handleLogout} style={{ flex: '0 0 auto', minWidth: '70px', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', background: 'none', border: 'none', color: '#ef4444', fontSize: '10px', fontWeight: '500', cursor: 'pointer' }}>
            <LogOut size={18}/>
            <span>Logout</span>
          </button>
        </div>
      )}
    </div>
  );
}











