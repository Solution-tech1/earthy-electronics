import React, { useState, useEffect, useRef } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { ShoppingCart, MessageCircle, Search, Trash2, Plus, Minus, X, Menu, Moon, Sun, LogIn, LogOut, LayoutDashboard, PartyPopper, Truck, Star, CheckCircle2, Banknote, PhoneCall, Wind, Tv, Refrigerator, Shirt, ChefHat, Microwave, Droplets, Snowflake, Zap, Leaf, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useTheme } from '../context/ThemeContext';
import emailjs from '@emailjs/browser';
import './Header.css';

export default function Header() {
  const { cartItems, cartCount, cartTotal, updateQuantity, removeFromCart, clearCart, toast, setToast } = useCart();
  const { isDark, toggleTheme, themeConfig } = useTheme();
  const [cartOpen, setCartOpen] = useState(false);
  const [checkoutMode, setCheckoutMode] = useState(false);
  
  // Checkout form states
  const [orderName, setOrderName] = useState('');
  const [orderPhone, setOrderPhone] = useState('');
  const [orderAddress, setOrderAddress] = useState('');
  const [orderSubmitting, setOrderSubmitting] = useState(false);
  const [orderSuccessPopup, setOrderSuccessPopup] = useState(false);

  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [bounce, setBounce] = useState(false);
  const [showFloatingCart, setShowFloatingCart] = useState(false);
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [allProducts, setAllProducts] = useState([]);
  const [activeIdx, setActiveIdx] = useState(-1);
  const searchRef = useRef(null);
  const [authUser, setAuthUser] = useState(() => {
    try { return JSON.parse(localStorage.getItem('user')); } catch { return null; }
  });

  const handleAuthLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('user');
    setAuthUser(null);
    window.dispatchEvent(new Event('authChange'));
    navigate('/signin');
  };

  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const userMenuRef = useRef(null);

  useEffect(() => {
    const handleClick = (e) => {
      if (userMenuRef.current && !userMenuRef.current.contains(e.target)) {
        setUserMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);
  
  const navigate = useNavigate();
  const location = useLocation();

  const catFallback = (cat) => {
    if (!cat) return '/images/cat_washer.png';
    cat = cat.toLowerCase();
    if (cat.includes('ac') || cat.includes('air')) return '/images/cat_ac.png';
    if (cat.includes('tv') || cat.includes('led')) return '/images/cat_tv.png';
    if (cat.includes('fridge') || cat.includes('refriger')) return '/images/cat_fridge.png';
    if (cat.includes('washer') || cat.includes('washing')) return '/images/cat_washer.png';
    if (cat.includes('microwave') || cat.includes('oven')) return '/images/cat_microwave.png';
    if (cat.includes('dispenser')) return '/images/product_dispenser.png';
    if (cat.includes('freezer')) return '/images/product_freezer.png';
    return '/images/cat_washer.png';
  };

  const isActive = (path) => location.pathname === path ? 'nav-active' : '';

  // Trigger bounce animation on cart count increase
  useEffect(() => {
    if (cartCount === 0) return;
    setBounce(true);
    const timer = setTimeout(() => setBounce(false), 400);
    return () => clearTimeout(timer);
  }, [cartCount]);

  // Listen for external open-cart events
  useEffect(() => {
    const handleOpenCart = () => setCartOpen(true);
    window.addEventListener('open-cart', handleOpenCart);
    return () => window.removeEventListener('open-cart', handleOpenCart);
  }, []);

  // Show floating cart on scroll
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 300) {
        setShowFloatingCart(true);
      } else {
        setShowFloatingCart(false);
      }
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  // Fetch all products once for suggestions
  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
    fetch(`/data/products.json`)
      .then(r => r.json())
      .then(data => { if (data.status === 'success') setAllProducts(data.data); })
      .catch(() => {});
  }, []);

  // Close suggestions on outside click
  useEffect(() => {
    const handleClick = (e) => {
      if (searchRef.current && !searchRef.current.contains(e.target)) {
        setShowSuggestions(false);
        setActiveIdx(-1);
      }
    };
    document.addEventListener('mousedown', handleClick);
    return () => document.removeEventListener('mousedown', handleClick);
  }, []);

  // Filter suggestions as user types
  const handleSearchChange = (e) => {
    const val = e.target.value;
    setSearch(val);
    setActiveIdx(-1);
    if (val.trim().length < 2) {
      setSuggestions([]);
      setShowSuggestions(false);
      return;
    }
    const q = val.toLowerCase();
    const matched = [];
    const seen = new Set();
    allProducts.forEach(p => {
      // Match product name
      if (p.name.toLowerCase().includes(q) && !seen.has(p.name)) {
        seen.add(p.name);
        matched.push({ type: 'product', label: p.name, category: p.category, brand: p.brand });
      }
      // Match brand
      if (p.brand.toLowerCase().includes(q) && !seen.has('brand_' + p.brand)) {
        seen.add('brand_' + p.brand);
        matched.push({ type: 'brand', label: p.brand, category: p.category });
      }
      // Match category
      if (p.category.toLowerCase().includes(q) && !seen.has('cat_' + p.category)) {
        seen.add('cat_' + p.category);
        matched.push({ type: 'category', label: p.category, category: p.category });
      }
    });
    setSuggestions(matched.slice(0, 8));
    setShowSuggestions(matched.length > 0);
  };

  const handleSuggestionClick = (s) => {
    setShowSuggestions(false);
    setSearch('');
    if (s.type === 'category') {
      navigate(`/products?category=${encodeURIComponent(s.category)}`);
    } else if (s.type === 'brand') {
      navigate(`/products?search=${encodeURIComponent(s.label)}`);
    } else {
      navigate(`/products?search=${encodeURIComponent(s.label)}`);
    }
  };

  const handleKeyDown = (e) => {
    if (!showSuggestions) return;
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setActiveIdx(i => Math.min(i + 1, suggestions.length - 1));
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setActiveIdx(i => Math.max(i - 1, -1));
    } else if (e.key === 'Enter' && activeIdx >= 0) {
      e.preventDefault();
      handleSuggestionClick(suggestions[activeIdx]);
    } else if (e.key === 'Escape') {
      setShowSuggestions(false);
    }
  };

  const handleSearch = (e) => {
    e.preventDefault();
    setShowSuggestions(false);
    if (search.trim()) {
      navigate(`/products?search=${encodeURIComponent(search.trim())}`);
      setSearch('');
    }
  };

  const handleCheckout = () => {
    let text = "I want to place an order from EarthyElectronics:\n\n";
    cartItems.forEach(i => {
      text += `- ${i.name} (${i.quantity}x) = Rs. ${((i.discountPrice || i.price) * i.quantity).toLocaleString()}\n`;
    });
    text += `\n*Total: Rs. ${cartTotal.toLocaleString()}*`;
    window.open(`https://wa.me/923002347457?text=${encodeURIComponent(text)}`, '_blank');
  };

  const handlePlaceOrder = async (e) => {
    e.preventDefault();
    if (!orderName || !orderPhone || !orderAddress) return;
    
    // We are bypassing the login requirement for the local demo so the client can easily test EmailJS checkout
    
    setOrderSubmitting(true);
    try {
      // Prepare the email text
      let itemsList = cartItems.map(i => `- ${i.name} (Qty: ${i.quantity}) - Rs. ${((i.discountPrice || i.price) * i.quantity).toLocaleString()}`).join('\n');
      
      const emailMessage = `
NEW ORDER RECEIVED!
--------------------------
Customer Name: ${orderName}
Phone Number: ${orderPhone}
Address: ${orderAddress}

ORDER DETAILS:
${itemsList}

Total Amount: Rs. ${cartTotal.toLocaleString()}
--------------------------
`;

      // Use EmailJS to send the email
      await emailjs.send(
        'service_5e6fcjm',    // Service ID
        'template_2pedukm',   // Template ID
        { message: emailMessage }, // Template Params
        'ehutdzjr0maqm0s_U'   // Public Key
      );

      clearCart();
      setCartOpen(false);
      setCheckoutMode(false);
      setOrderName('');
      setOrderPhone('');
      setOrderAddress('');
      // Show the beautiful success modal requested by the user
      setOrderSuccessPopup(true);
      
    } catch (err) {
      console.error(err);
      alert('Error placing order. Please check your internet connection and try again.');
    }
    setOrderSubmitting(false);
  };

  return (
    <>
      {/* ─── Scrolling Offer Ticker (Absolute Top) ─── */}
      {themeConfig?.promoActive !== false && (<div className="offer-ticker">
        <div className="ticker-track">
          {[
            <><PartyPopper size={15} color="#fbbf24" fill="#f59e0b" style={{ filter: 'drop-shadow(0 2px 4px rgba(251,191,36,0.6))' }}/> {themeConfig?.promoText || 'Flat 10% Off Sitewide.'}</>,
            <><Truck size={15} color="#38bdf8" fill="#0284c7" style={{ filter: 'drop-shadow(0 2px 4px rgba(56,189,248,0.6))' }}/> Free Delivery on Orders Rs.80,000 & Above.</>,
            <><Star size={15} color="#fbbf24" fill="#f59e0b" style={{ filter: 'drop-shadow(0 2px 4px rgba(251,191,36,0.6))' }}/> Welcome to EarthyElectronics.</>,
            <><CheckCircle2 size={15} color="#34d399" fill="#059669" style={{ filter: 'drop-shadow(0 2px 4px rgba(52,211,153,0.6))' }}/> Authorized Dealer of Haier.</>,
            <><CheckCircle2 size={15} color="#34d399" fill="#059669" style={{ filter: 'drop-shadow(0 2px 4px rgba(52,211,153,0.6))' }}/> Authorized Dealer of Gree.</>,
            <><CheckCircle2 size={15} color="#34d399" fill="#059669" style={{ filter: 'drop-shadow(0 2px 4px rgba(52,211,153,0.6))' }}/> Authorized Dealer of Dawlance.</>,
            <><PartyPopper size={15} color="#fbbf24" fill="#f59e0b" style={{ filter: 'drop-shadow(0 2px 4px rgba(251,191,36,0.6))' }}/> {themeConfig?.promoText || 'Flat 10% Off Sitewide.'}</>,
            <><Truck size={15} color="#38bdf8" fill="#0284c7" style={{ filter: 'drop-shadow(0 2px 4px rgba(56,189,248,0.6))' }}/> Free Delivery on Orders Rs.80,000 & Above.</>,
            <><Star size={15} color="#fbbf24" fill="#f59e0b" style={{ filter: 'drop-shadow(0 2px 4px rgba(251,191,36,0.6))' }}/> Welcome to EarthyElectronics.</>,
            <><CheckCircle2 size={15} color="#34d399" fill="#059669" style={{ filter: 'drop-shadow(0 2px 4px rgba(52,211,153,0.6))' }}/> Authorized Dealer of Kenwood.</>,
            <><Banknote size={15} color="#4ade80" fill="#16a34a" style={{ filter: 'drop-shadow(0 2px 4px rgba(74,222,128,0.6))' }}/> Up to 15% Off on Inverter ACs.</>,
            <><svg xmlns="http://www.w3.org/2000/svg" width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#25d366" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ filter: 'drop-shadow(0 2px 4px rgba(37,211,102,0.6))', display: 'inline-block', verticalAlign: 'middle', marginRight: '4px' }}><path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path></svg> WhatsApp Order: 0300-2347457.</>,
          ].map((t, i) => (
            <span key={i} className="ticker-item">{t}</span>
          ))}
        </div>
      </div>)}

      {/* ─── Main Header ─── */}
      <header className="site-header">
        <div className="header-main-row" style={window.innerWidth <= 640 ? { flexWrap: 'wrap' } : {}}>
          {/* Mobile hamburger menu toggle */}
          <button className="hdr-mobile-menu-btn" onClick={() => setMobileMenuOpen(true)}>
            <Menu size={24} />
          </button>

          <Link to="/" className="hdr-logo" style={{ display: 'flex', alignItems: 'center', padding: '0', textDecoration: 'none' }}>
            <img 
              src="/images/earthyelectronics_official_banner_logo.png" 
              alt="EarthyElectronics Official Logo" 
              className="hdr-logo-img" 
            />
          </Link>

          {/* Desktop Navigation (Middle) */}
          <nav className="hdr-nav-inline">
            <ul className="hdr-nav-list-inline">
              <li><Link to="/" className={isActive('/')}>Home</Link></li>
              <li className="hdr-nav-dropdown-inline">
                <Link to="/products" className={`dropdown-trigger-link-inline ${isActive('/products')}`}>
                  Products ▾
                </Link>
                <ul className="dropdown-menu-inline">
                  <li><Link to="/products?category=Air%20Conditioner"><Wind size={15} color="#0284c7" className="inline-icon"/>Air Conditioners</Link></li>
                  <li><Link to="/products?category=LED%20TV"><Tv size={15} color="#7c3aed" className="inline-icon"/>LED TVs</Link></li>
                  <li><Link to="/products?category=Refrigerator"><Refrigerator size={15} color="#0d9488" className="inline-icon"/>Refrigerators</Link></li>
                  <li><Link to="/products?category=Washing%20Machine"><Shirt size={15} color="#db2777" className="inline-icon"/>Washing Machines</Link></li>
                  <li><Link to="/products?category=Kitchen%20Appliances"><ChefHat size={15} color="#ea580c" className="inline-icon"/>Kitchen Appliances</Link></li>
                  <li><Link to="/products?category=Microwave%20Oven"><Microwave size={15} color="#ca8a04" className="inline-icon"/>Microwave Ovens</Link></li>
                  <li><Link to="/products?category=Water%20Dispenser"><Droplets size={15} color="#2563eb" className="inline-icon"/>Water Dispensers</Link></li>
                  <li><Link to="/products?category=Deep%20Freezer"><Snowflake size={15} color="#0284c7" className="inline-icon"/>Deep Freezers</Link></li>
                </ul>
              </li>
              <li><Link to="/about" className={isActive('/about')}>About</Link></li>
              <li><Link to="/contact" className={isActive('/contact')}>Contact</Link></li>
            </ul>
          </nav>

          {/* Search & Actions Group (Right) */}
          <div className="hdr-right-group" style={window.innerWidth <= 640 ? { flexWrap: 'wrap', width: '100%', justifyContent: 'flex-end' } : {}}>
            {/* Search with Autocomplete */}
            <div className="hdr-search-wrap" ref={searchRef} style={window.innerWidth <= 640 ? { order: 3, flexBasis: '100%', width: '100%', minWidth: '100%', marginTop: '10px' } : {}}>
              <form className="hdr-search" onSubmit={handleSearch}>
                <input
                  type="text"
                  placeholder="Search ACs, TVs, Refrigerators, Brands..."
                  value={search}
                  onChange={handleSearchChange}
                  onKeyDown={handleKeyDown}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  autoComplete="off"
                />
                <button type="submit"><Search size={16} /></button>
              </form>
              {showSuggestions && (
                <ul className="search-suggestions">
                  {suggestions.map((s, i) => (
                    <li
                      key={i}
                      className={`suggestion-item${i === activeIdx ? ' active' : ''}`}
                      onMouseDown={() => handleSuggestionClick(s)}
                    >
                      <span className="suggestion-icon">
                        {s.type === 'category' ? '📂' : s.type === 'brand' ? '🏷️' : '🔍'}
                      </span>
                      <span className="suggestion-label">{s.label}</span>
                      <span className="suggestion-type">
                        {s.type === 'category' ? 'Category' : s.type === 'brand' ? 'Brand' : s.category}
                      </span>
                    </li>
                  ))}
                </ul>
              )}
            </div>

            {/* Cart Icon Button */}
            <button className="hdr-cart-btn-compact" onClick={() => setCartOpen(true)} title="View Cart">
              <div className={`cart-icon-container-compact ${bounce ? 'cart-bounce' : ''}`}>
                <ShoppingCart size={22} />
                {cartCount > 0 && <span className="hdr-cart-badge-compact">{cartCount}</span>}
              </div>
              <span className="hdr-cart-text-compact">Cart</span>
            </button>

            {/* WhatsApp Order Button */}
            <a
              href="https://wa.me/923002347457?text=Hello%20EarthyElectronics!%20I%20need%20assistance."
              target="_blank"
              rel="noopener noreferrer"
              className="hdr-wa-btn-compact"
              title="Order on WhatsApp"
            >
              <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '4px' }}>
                <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
              </svg>
              <span>WhatsApp</span>
            </a>

            {/* Auth Button */}
            {authUser ? (
              <div className="auth-menu-wrap" ref={userMenuRef}>
                <button
                  className="auth-user-pill"
                  onClick={() => setUserMenuOpen(prev => !prev)}
                  style={{ cursor: 'pointer', border: 'none', background: 'none' }}
                >
                  <span className="auth-user-avatar">{authUser.name?.[0]?.toUpperCase() || 'U'}</span>
                  <span className="auth-user-name">{authUser.name?.split(' ')[0]}</span>
                  <span style={{ fontSize: '10px', marginLeft: '2px' }}>▾</span>
                </button>

                {userMenuOpen && (
                  <div className="user-dropdown-menu">
                    <div className="user-dropdown-header">
                      <span style={{ fontWeight: 'bold', fontSize: '14px' }}>{authUser.name}</span>
                      <span style={{ fontSize: '12px', color: '#64748b' }}>{authUser.email}</span>
                    </div>
                    <div className="user-dropdown-divider"/>
                    {authUser.role === 'admin' && (
                      <Link
                        to="/admin"
                        className="user-dropdown-item admin-item"
                        onClick={() => setUserMenuOpen(false)}
                      >
                        <LayoutDashboard size={15}/> Admin Dashboard
                      </Link>
                    )}
                    <Link
                      to="/dashboard"
                      className="user-dropdown-item"
                      onClick={() => setUserMenuOpen(false)}
                    >
                      <Star size={15}/> My Account
                    </Link>
                    <div className="user-dropdown-divider"/>
                    <button
                      className="user-dropdown-item logout-item"
                      onClick={() => { setUserMenuOpen(false); handleAuthLogout(); }}
                    >
                      <LogOut size={15}/> Sign Out
                    </button>
                  </div>
                )}
              </div>
            ) : (
              <Link to="/signin" className="hdr-signin-btn" title="Sign In">
                <LogIn size={15}/>
                <span>Sign In</span>
              </Link>
            )}

          </div>
        </div>
      </header>

      {/* ─── Mobile Menu Drawer ─── */}
      <div className={`menu-overlay${mobileMenuOpen ? ' is-open' : ''}`} onClick={() => setMobileMenuOpen(false)}>
        <div className="menu-panel" onClick={e => e.stopPropagation()}>
          <div className="menu-panel-head">
            <h3>📂 Navigation Menu</h3>
            <button className="menu-close-x" onClick={() => setMobileMenuOpen(false)}>
              <X size={20} />
            </button>
          </div>
          <div className="menu-panel-body">
            <div className="menu-panel-links">
              <Link to="/" className={isActive('/')} onClick={() => setMobileMenuOpen(false)}>🏠 Home</Link>
              <Link to="/products" className={isActive('/products')} onClick={() => setMobileMenuOpen(false)}>📦 All Products</Link>
              <Link to="/products?category=Air%20Conditioner" onClick={() => setMobileMenuOpen(false)}>❄️ Air Conditioners</Link>
              <Link to="/products?category=LED%20TV" onClick={() => setMobileMenuOpen(false)}>📺 LED TVs</Link>
              <Link to="/products?category=Refrigerator" onClick={() => setMobileMenuOpen(false)}>🧊 Refrigerators</Link>
              <Link to="/products?category=Washing%20Machine" onClick={() => setMobileMenuOpen(false)}>🧺 Washing Machines</Link>
              <Link to="/products?category=Kitchen%20Appliances" onClick={() => setMobileMenuOpen(false)}>🍳 Kitchen Appliances</Link>
              <Link to="/products?category=Microwave%20Oven" onClick={() => setMobileMenuOpen(false)}>🍲 Microwave Ovens</Link>
              <Link to="/products?category=Water%20Dispenser" onClick={() => setMobileMenuOpen(false)}>🚰 Water Dispensers</Link>
              <Link to="/products?category=Deep%20Freezer" onClick={() => setMobileMenuOpen(false)}>🥶 Deep Freezers</Link>
              <Link to="/about" className={isActive('/about')} onClick={() => setMobileMenuOpen(false)}>ℹ️ About Us</Link>
              <Link to="/contact" className={isActive('/contact')} onClick={() => setMobileMenuOpen(false)}>📞 Contact Us</Link>
            </div>
          </div>
        </div>
      </div>

      {/* ─── Cart Drawer ─── */}
      <div className={`cart-overlay${cartOpen ? ' is-open' : ''}`} onClick={() => setCartOpen(false)}>
        <div className="cart-panel" onClick={e => e.stopPropagation()}>
          {/* Head */}
          <div className="cart-panel-head">
            <h3>{checkoutMode ? 'Secure Checkout' : `🛒 Cart (${cartCount} item${cartCount !== 1 ? 's' : ''})`}</h3>
            <button className="cart-close-x" onClick={() => { setCartOpen(false); setCheckoutMode(false); }}>
              <X size={20} />
            </button>
          </div>

          {/* Items / Checkout Form */}
          <div className="cart-panel-body">
            {cartItems.length === 0 ? (
              <div className="cart-empty-msg">
                <ShoppingCart size={52} strokeWidth={1} />
                <p>Your cart is empty</p>
                <p style={{ fontSize: 12, color: '#94a3b8' }}>Add products to get started!</p>
              </div>
            ) : checkoutMode ? (
              <form className="checkout-form" onSubmit={handlePlaceOrder} style={{ padding: '10px' }}>
                <h4 style={{ marginBottom: '15px', color: '#065f46' }}>Delivery Details</h4>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 'bold' }}>Full Name *</label>
                  <input type="text" required value={orderName} onChange={e => setOrderName(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="John Doe" />
                </div>
                <div style={{ marginBottom: '12px' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 'bold' }}>Phone Number *</label>
                  <input type="tel" required value={orderPhone} onChange={e => setOrderPhone(e.target.value)} style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="03xx xxxxxxx" />
                </div>
                <div style={{ marginBottom: '20px' }}>
                  <label style={{ display: 'block', fontSize: '13px', marginBottom: '4px', fontWeight: 'bold' }}>Delivery Address *</label>
                  <textarea required value={orderAddress} onChange={e => setOrderAddress(e.target.value)} rows="3" style={{ width: '100%', padding: '10px', border: '1px solid #cbd5e1', borderRadius: '4px' }} placeholder="House/Flat No, Street, Area, City" />
                </div>
                
                <div style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '15px' }}>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px' }}>
                    <span>Subtotal:</span>
                    <span>Rs. {cartTotal.toLocaleString()}</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', fontSize: '14px', color: '#16a34a' }}>
                    <span>Delivery:</span>
                    <span>Free</span>
                  </div>
                  <div style={{ display: 'flex', justifyContent: 'space-between', borderTop: '1px solid #e2e8f0', paddingTop: '8px', fontWeight: 'bold', fontSize: '16px' }}>
                    <span>Total:</span>
                    <span>Rs. {cartTotal.toLocaleString()}</span>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '10px' }}>
                  <button type="button" onClick={() => setCheckoutMode(false)} className="btn btn-outline" style={{ flex: 1, justifyContent: 'center' }}>Back</button>
                  <button type="submit" className="btn btn-green" disabled={orderSubmitting} style={{ flex: 2, justifyContent: 'center' }}>
                    {orderSubmitting ? 'Placing Order...' : 'Confirm Order'}
                  </button>
                </div>
              </form>
            ) : (
              cartItems.map(item => (
                <div key={item.id} className="cart-prod-row">
                  <img 
                    className="cart-prod-img" 
                    src={item.image || catFallback(item.category)} 
                    alt={item.name} 
                    style={{ mixBlendMode: 'multiply' }}
                    onError={e => { e.target.onerror = null; e.target.src = catFallback(item.category); }}
                  />
                  <div className="cart-prod-info">
                    <h4>{item.name}</h4>
                    <div className="cart-prod-price">
                      Rs. {((item.discountPrice || item.price) * item.quantity).toLocaleString()}
                    </div>
                    <div className="cart-qty-row">
                      <button className="cart-qty-btn" onClick={() => updateQuantity(item.id, item.quantity - 1)}>
                        <Minus size={12} />
                      </button>
                      <span className="cart-qty-num">{item.quantity}</span>
                      <button className="cart-qty-btn" onClick={() => updateQuantity(item.id, item.quantity + 1)}>
                        <Plus size={12} />
                      </button>
                      <button className="cart-remove-btn" onClick={() => removeFromCart(item.id)}>
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>

          {/* Footer */}
          {cartItems.length > 0 && !checkoutMode && (
            <div className="cart-panel-foot">
              <div className="cart-total-row">
                <span>Total:</span>
                <span>Rs. {cartTotal.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                <button className="btn btn-orange" style={{ width: '100%', justifyContent: 'center', padding: '12px' }} onClick={() => setCheckoutMode(true)}>
                  Proceed to Checkout (Website)
                </button>
                <button className="cart-wa-checkout" onClick={handleCheckout}>
                  <MessageCircle size={18} /> Checkout on WhatsApp
                </button>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ─── Floating Sticky Cart Button (on scroll) ─── */}
      {cartCount > 0 && (
        <button 
          className={`floating-cart-btn${showFloatingCart ? ' visible' : ''}`}
          onClick={() => setCartOpen(true)}
          title="Open Cart"
        >
          <div style={{ position: 'relative', display: 'flex' }}>
            <ShoppingCart size={24} />
            <span className="floating-cart-badge">{cartCount}</span>
          </div>
        </button>
      )}

      {/* ─── Toast Popup ─── */}
      <div className={`cart-toast${toast.show ? ' show' : ''}`}>
        <div className="cart-toast-icon">✓</div>
        <span>{toast.message}</span>
      </div>

      {/* ─── Success Order Popup Modal ─── */}
      {orderSuccessPopup && (
        <div className="menu-overlay is-open" style={{ zIndex: 999999, display: 'flex', alignItems: 'center', justifyContent: 'center' }} onClick={() => setOrderSuccessPopup(false)}>
          <div className="cart-panel" style={{ width: '90%', maxWidth: '400px', height: 'auto', borderRadius: '16px', padding: '30px 20px', textAlign: 'center', animation: 'scaleUp 0.3s ease-out' }} onClick={e => e.stopPropagation()}>
            <div style={{ background: '#dcfce7', width: '80px', height: '80px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px auto' }}>
              <CheckCircle2 size={40} color="#16a34a" />
            </div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', color: '#064e3b', marginBottom: '10px' }}>Order Confirmed!</h2>
            <p style={{ color: '#475569', fontSize: '15px', lineHeight: '1.5', marginBottom: '25px' }}>
              Thank you for choosing EarthyElectronics. Your order has been placed successfully and the admin has been notified. We will contact you shortly to confirm the delivery!
            </p>
            <button className="btn btn-green" style={{ width: '100%', justifyContent: 'center', padding: '14px', fontSize: '16px' }} onClick={() => setOrderSuccessPopup(false)}>
              Continue Shopping
            </button>
          </div>
        </div>
      )}
    </>
  );
}

