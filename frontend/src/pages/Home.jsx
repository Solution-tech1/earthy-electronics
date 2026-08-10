import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { ShoppingCart, MessageCircle, ArrowRight, ChevronLeft, ChevronRight, Award, Truck, ShieldCheck, PhoneCall, Flame, Zap, Banknote, Wind, Tv, Refrigerator, Shirt, ChefHat, Microwave, Droplets, Snowflake, Sparkles } from 'lucide-react';
import { useCart } from '../context/CartContext';
import ProductModal from '../components/ProductModal';
import './Home.css';

export default function Home() {
  const { addToCart } = useCart();
  const navigate = useNavigate();

  const [products, setProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [addedProductId, setAddedProductId] = useState(null);
  const [selectedProduct, setSelectedProduct] = useState(null);

  // Permanent Landing Animation: Luxury Curtain Split Reveal
  const [curtainSplit, setCurtainSplit] = useState(false);

  useEffect(() => {
    // Trigger curtain split reveal 1.2s after landing
    const timer = setTimeout(() => {
      setCurtainSplit(true);
    }, 1200);
    return () => clearTimeout(timer);
  }, []);

  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      alert("Please login first to place an order or add to cart.");
      window.location.href = '/login';
      return false;
    }
    return true;
  };

  const handleAddToCart = (product) => {
    if (!checkAuth()) return;
    addToCart(product);
    setAddedProductId(product.id);
    setTimeout(() => setAddedProductId(null), 1000);
  };

  // Calculator state
  const [acSize, setAcSize] = useState('1.5');
  const [dailyHours, setDailyHours] = useState(8);
  const [unitRate, setUnitRate] = useState(55);

  const factor = acSize === '1.0' ? 0.7 : acSize === '1.5' ? 1.0 : 1.35;
  const nonBill = Math.round(1.8 * factor * dailyHours * 30 * unitRate);
  const invBill = Math.round(0.8 * factor * dailyHours * 30 * unitRate);
  const saving  = nonBill - invBill;

  // Hero carousel
  const [currentSlide, setCurrentSlide] = useState(0);
  const heroSlides = [
    {
      bgImage: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2000&auto=format&fit=crop',
      title: "Pakistan's #1 Home Appliances Store",
      desc: 'Authorized dealer of Haier, Dawlance, Gree & Kenwood. Get the best home appliances with official warranty at the most competitive prices in Karachi.',
      offer: 'Authorized Dealer'
    },
    {
      bgImage: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?q=80&w=2000&auto=format&fit=crop',
      title: 'Stay Cool with DC Inverter ACs',
      desc: 'Save up to 60% on electricity bills with our premium DC Inverter Air Conditioners. Available in 1 ton, 1.5 ton and 2 ton with free installation in Karachi.',
      offer: 'Up to 15% OFF'
    },
    {
      bgImage: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?q=80&w=2000&auto=format&fit=crop',
      title: 'Smart 4K LED TVs',
      desc: 'Upgrade your entertainment experience with our premium Smart Android LED TVs from top brands like Samsung, TCL and Haier.',
      offer: 'Home Entertainment'
    },
    {
      bgImage: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?q=80&w=2000&auto=format&fit=crop',
      title: 'Smart Washing Machines & Fridges',
      desc: 'Explore our huge range of fully automatic washing machines, no-frost refrigerators and deep freezers. Get free delivery on orders above Rs. 80,000.',
      offer: 'Free Delivery'
    },
  ];

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentSlide(prev => (prev + 1) % heroSlides.length);
    }, 3800);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
    fetch(`${base}/api/items`)
      .then(r => r.json())
      .then(data => {
        if(data && Array.isArray(data.data)) {
          const validProducts = data.data.filter(p => {
            if (p.id === 759) return false;
            if (p.image && p.image.includes('GS-18FITH1W.webp')) return false;
            return true;
          });
          setProducts(validProducts);
        }
        setLoading(false);
      })
      .catch(err => { console.error(err); setLoading(false); });
  }, []);

  const categories = [
    { img: '/images/cat_ac.png',        icon: <Wind size={24} color="#0284c7" />,        bgColor: '#e0f2fe', name: 'Air Conditioners', desc: 'DC Inverter & Non-Inverter', cat: 'Air Conditioners' },
    { img: '/images/cat_tv.png',        icon: <Tv size={24} color="#7c3aed" />,          bgColor: '#f3e8ff', name: 'LED TVs',           desc: 'Smart 4K & HD Displays',    cat: 'LED TVs'          },
    { img: '/images/cat_fridge.png',    icon: <Refrigerator size={24} color="#0d9488" />,  bgColor: '#ccfbf1', name: 'Refrigerators',     desc: 'No-Frost & Direct Cool',    cat: 'Refrigerators'    },
    { img: '/images/cat_washer.png',    icon: <Shirt size={24} color="#db2777" />,         bgColor: '#fce7f3', name: 'Washing Machines',  desc: 'Front Load & Top Load',     cat: 'Washing Machines' },
    { img: '/images/cat_kitchen.png',   icon: <ChefHat size={24} color="#ea580c" />,       bgColor: '#ffedd5', name: 'Kitchen App.',      desc: 'Air Fryers & Blenders',     cat: 'Kitchen Appliances' },
    { img: '/images/cat_microwave.png', icon: <Microwave size={24} color="#ca8a04" />,     bgColor: '#fef9c3', name: 'Microwaves',        desc: 'Solo & Grill Ovens',        cat: 'Microwave Ovens' },
    { img: '/images/product_dispenser.png', icon: <Droplets size={24} color="#2563eb" />, bgColor: '#dbeafe', name: 'Water Dispensers', desc: 'Hot & Cold Filters',    cat: 'Water Dispensers' },
    { img: 'https://superasiastore.com/cdn/shop/files/01_20ea7cfc-825a-43f4-a2ce-86b748d66b9d.jpg', icon: <Droplets size={24} color="#ef4444" />, bgColor: '#fee2e2', name: 'Geysers & Heaters', desc: 'Electric & Gas Water Heaters', cat: 'Geysers & Water Heaters' },
    { img: '/images/product_freezer.png',   icon: <Snowflake size={24} color="#0891b2" />,  bgColor: '#cffafe', name: 'Deep Freezers',    desc: 'Chest Freezers & Coolers', cat: 'Deep Freezers' },
  ];

  const whyUs = [
    { icon: <Award size={32} color="#10b981"/>, title: 'Authorized Dealer',  desc: 'Official dealer of Haier, Gree, Dawlance & Kenwood with 100% genuine products' },
    { icon: <Truck size={32} color="#0284c7"/>, title: 'Free Delivery',       desc: 'Free doorstep delivery & installation on orders over Rs.80,000 in Karachi' },
    { icon: <ShieldCheck size={32} color="#16a34a"/>, title: 'Warranty Assured',   desc: 'Full manufacturer warranty on all products with dedicated after-sales support' },
    { icon: <PhoneCall size={32} color="#7c3aed"/>, title: '24/7 Support',        desc: 'Call or WhatsApp us anytime — our team is always ready to assist you' },
  ];

  // Hot items by category
  const hotCategories = ['Air Conditioner', 'LED TV', 'Refrigerator', 'Microwave Oven'];
  const hotItems = hotCategories.map(cat => products.find(p => p.category === cat)).filter(Boolean);

  const catFallback = (cat, name = '') => {
    const text = ((cat || '') + ' ' + (name || '')).toLowerCase();
    // 1. TVs & Displays (FIRST priority to prevent 'inverter' matching AC)
    if (text.includes('tv') || text.includes('led') || text.includes('qled') || text.includes('oled') || text.includes('display')) {
      return '/images/cat_tv.png';
    }
    // 2. Geysers & Water Heaters
    if (text.includes('geyser') || text.includes('water heater') || text.includes('reh-') || text.includes('meh-') || text.includes('seh-') || text.includes('eh-')) {
      return 'https://superasiastore.com/cdn/shop/files/01_20ea7cfc-825a-43f4-a2ce-86b748d66b9d.jpg';
    }
    // 3. Room Heaters
    if (text.includes('room heater') || text.includes('quartz heater') || text.includes('gas heater') || text.includes('heater')) {
      return '/images/product_heater.svg';
    }
    // 4. Air Conditioners
    if (text.includes('air conditioner') || text.includes('split ac') || text.includes('floor standing') || text.includes('standing ac') || text.includes('tower ac')) {
      return '/images/cat_ac.png';
    }
    // 5. Refrigerators
    if (text.includes('fridge') || text.includes('refriger')) return '/images/cat_fridge.png';
    // 6. Washing Machines
    if (text.includes('washer') || text.includes('washing')) return '/images/cat_washer.png';
    // 7. Microwaves
    if (text.includes('microwave') || text.includes('oven')) return '/images/cat_microwave.png';
    // 8. Dispensers & Freezers
    if (text.includes('dispenser')) return '/images/product_dispenser.png';
    if (text.includes('freezer')) return '/images/product_freezer.png';

    if (text.includes('ac')) return '/images/cat_ac.png';
    return '/images/cat_kitchen.png';
  };

  // Get diverse mix of categories for Featured Products section
  const [featuredProducts, setFeaturedProducts] = useState([]);

  useEffect(() => {
    if (products && products.length > 0) {
      const categoriesMap = {};
      products.forEach(p => {
        const cat = p.category || 'General';
        if (!categoriesMap[cat]) categoriesMap[cat] = [];
        categoriesMap[cat].push(p);
      });

      const categories = Object.keys(categoriesMap);
      const selected = [];
      let round = 0;

      while (selected.length < 12 && round < 5) {
        for (const cat of categories) {
          const items = categoriesMap[cat];
          if (items && items.length > 0) {
            const randomIndex = Math.floor(Math.random() * items.length);
            const [picked] = items.splice(randomIndex, 1);
            selected.push(picked);
            if (selected.length >= 12) break;
          }
        }
        round++;
      }

      setFeaturedProducts(selected.sort(() => 0.5 - Math.random()));
    }
  }, [products]);

  return (
    <div>
      {/* ── 🚀 Permanent Luxury Preloader Curtain Reveal ── */}
      <div className={`curtain-overlay${curtainSplit ? ' curtain-split' : ''}`}>
        <div className="curtain-panel curtain-top"></div>
        <div className="curtain-panel curtain-bottom"></div>
        <div className="curtain-center-logo">
          <div className="curtain-logo-badge" style={{ background: '#ffffff', borderRadius: '24px', padding: '24px 44px', boxShadow: '0 20px 60px rgba(16, 185, 129, 0.45)' }}>
            <img 
              src="/images/earthyelectronics_official_banner_logo.png" 
              alt="EarthyElectronics Official Logo" 
              style={{ height: '95px', width: 'auto', display: 'block', margin: '0 auto' }} 
            />
          </div>
        </div>
      </div>

      {/* ── Hero Carousel (Full Width) ── */}
      <section className="hero-section">
        {heroSlides.map((slide, idx) => (
          <div
            key={idx}
            className={`hero-slide${idx === currentSlide ? ' active' : ''}`}
            style={{ backgroundImage: `url(${slide.bgImage})` }}
          >
            <div className="hero-overlay"></div>
            <div className="container hero-slide-inner">
              <div className="hero-slide-text banner-text-mode" data-aos="fade-up" data-aos-duration="1000">
                <div className="hero-offer-pill"><Flame size={14}/> {slide.offer}</div>
                <h2>{slide.title}</h2>
                <p>{slide.desc}</p>
                <div className="hero-slide-btns">
                  <Link to="/products" className="btn-mint-hero">Shop Now <ArrowRight size={16}/></Link>
                  <a href="https://wa.me/923002347457" target="_blank" rel="noopener noreferrer" className="btn-white-hero">
                    <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: '8px' }}>
                      <path d="M21 11.5a8.38 8.38 0 0 1-.9 3.8 8.5 8.5 0 0 1-7.6 4.7 8.38 8.38 0 0 1-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 0 1-.9-3.8 8.5 8.5 0 0 1 4.7-7.6 8.38 8.38 0 0 1 3.8-.9h.5a8.48 8.48 0 0 1 8 8v.5z"></path>
                    </svg>
                    WhatsApp Order
                  </a>
                </div>
              </div>
            </div>
          </div>
        ))}
        {/* Dots */}
        <div className="hero-dots">
          {heroSlides.map((_, i) => (
            <button
              key={i}
              className={`hero-dot${i === currentSlide ? ' active' : ''}`}
              onClick={() => setCurrentSlide(i)}
            />
          ))}
        </div>
        {/* Arrows */}
        <button className="hero-arrow left" onClick={() => setCurrentSlide(p => (p - 1 + heroSlides.length) % heroSlides.length)}>
          <ChevronLeft size={24}/>
        </button>
        <button className="hero-arrow right" onClick={() => setCurrentSlide(p => (p + 1) % heroSlides.length)}>
          <ChevronRight size={24}/>
        </button>
      </section>

      {/* ── Hot Deals Section ── */}
      {hotItems.length > 0 && (
        <section className="deals-section" data-aos="fade-up">
          <div className="container">
            <div className="deals-header">
              <div className="deals-header-left">
                <span className="deals-fire"><Flame size={28}/></span>
                <div>
                  <h2>Hot Deals</h2>
                  <p>Limited time offers on top appliances</p>
                </div>
              </div>
              <Link to="/products" className="deals-view-all">
                View All <ArrowRight size={14}/>
              </Link>
            </div>
            <div className="deals-grid">
              {hotItems.map((p, idx) => {
                const price = p.discountPrice || p.price;
                const pct = p.discountPrice ? Math.round((1 - p.discountPrice / p.price) * 100) : 0;
                const colors = ['#065f46', '#7c1c1c', '#0d5c2f', '#4a1f7a'];
                return (
                  <div key={p.id} className="deal-card" style={{ '--deal-accent': colors[idx % colors.length] }} data-aos="fade-up" data-aos-delay={idx * 100}>
                    <div className="deal-card-visual" onClick={() => setSelectedProduct(p)} style={{cursor: 'pointer'}}>
                      {pct > 0 && (
                        <div className="deal-discount-ribbon">
                          <span>{pct}%</span>
                          <small>OFF</small>
                        </div>
                      )}
                      <img 
                        src={p.image || ''} 
                        alt={p.name} 
                        style={{ mixBlendMode: 'multiply' }}
                        onError={e => { 
                          const card = e.target.closest('.deal-card');
                          if (card) card.style.display = 'none'; 
                        }}
                      />
                    </div>
                    <div className="deal-card-body">
                      <span className="deal-brand-pill">{p.brand}</span>
                      <h4 className="deal-title">{p.name}</h4>
                      <div className="deal-price-block">
                        <span className="deal-price-main">Rs. {price.toLocaleString()}</span>
                        {p.discountPrice && <span className="deal-price-old">Rs. {p.price.toLocaleString()}</span>}
                      </div>
                      <div className="deal-actions">
                        <button
                          className="deal-btn deal-btn-cart"
                          style={{ flex: 1 }}
                          onClick={(e) => { e.stopPropagation(); handleAddToCart(p); }}
                        >
                          {addedProductId === p.id ? '✓ Added' : <><ShoppingCart size={14}/> Add to Cart</>}
                        </button>
                        <button
                          className="deal-btn deal-btn-wa"
                          style={{ flex: 1, background: '#10b981', borderColor: '#10b981', color: '#fff' }}
                          onClick={(e) => { e.stopPropagation(); handleAddToCart(p); window.dispatchEvent(new CustomEvent('open-cart')); }}
                        >
                          Order Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </section>
      )}

      {/* ── Shop by Category ── */}
      <section className="cats-section" data-aos="fade-up">
        <div className="container">
          <div className="section-title">
            <h2>Shop by Category</h2>
            <div className="title-line"></div>
            <p>Browse our wide selection of home appliances from top brands</p>
          </div>
          <div className="cats-grid">
            {categories.map((c, idx) => (
              <Link key={c.cat} to={`/products?category=${encodeURIComponent(c.cat)}`} className="cat-card-full" data-aos="fade-up" data-aos-delay={idx * 100}>
                <img src={c.img} alt={c.name} className="cat-bg-img" />
                <div className="cat-overlay-content">
                  <div style={{ display: 'inline-flex', alignItems: 'center', justifyContent: 'center', width: '44px', height: '44px', borderRadius: '12px', background: c.bgColor || '#ffffff', boxShadow: '0 4px 14px rgba(0,0,0,0.18)', marginBottom: '8px' }}>
                    {c.icon}
                  </div>
                  <span className="cat-badge-mini">Explore</span>
                  <h3>{c.name}</h3>
                  <p>{c.desc}</p>
                </div>
              </Link>
            ))}
          </div>
        </div>
      </section>

      {/* ── Featured Products ── */}
      <section className="featured-section" data-aos="fade-up">
        <div className="container">
          <div className="section-title">
            <h2>Featured Products</h2>
            <div className="title-line"></div>
            <p>Hand-picked appliances from top brands</p>
          </div>
          {loading ? (
            <p style={{ textAlign: 'center', color: '#64748b', padding: '40px 0' }}>Loading products...</p>
          ) : (
              <div className="prod-grid">
              {featuredProducts.map((p, idx) => {
                const price = p.discountPrice || p.price;
                const saved = p.discountPrice ? p.price - p.discountPrice : 0;
                const pct   = p.discountPrice ? Math.round((1 - p.discountPrice / p.price) * 100) : 0;
                return (
                  <div key={p.id} className="prod-card" data-aos="fade-up" data-aos-delay={idx * 50}>
                    <div className="prod-img-box" onClick={() => setSelectedProduct(p)} style={{cursor: 'pointer'}}>
                      {pct > 0 && <span className="prod-sale-badge">{pct}% OFF</span>}
                      <img
                        src={p.image || ''}
                        alt={p.name}
                        onError={e => { 
                          const card = e.target.closest('.prod-card');
                          if (card) card.style.display = 'none'; 
                        }}
                        style={{ mixBlendMode: 'multiply' }}
                      />
                    </div>
                    <div className="prod-info-box">
                      <div className="prod-brand-tag">{p.brand}</div>
                      <div className="prod-name-text" onClick={() => setSelectedProduct(p)} style={{cursor: 'pointer'}}>{p.name}</div>
                      <div className="prod-price-row">
                        <span className="prod-price-now">Rs. {price.toLocaleString()}</span>
                        {p.discountPrice && <span className="prod-price-was">Rs. {p.price.toLocaleString()}</span>}
                      </div>
                      <div className="prod-action-row" style={{ display: 'flex', gap: '8px' }}>
                        <button
                          className={`btn btn-sm ${addedProductId === p.id ? 'btn-green' : 'btn-navy'}`}
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={(e) => { e.stopPropagation(); handleAddToCart(p); }}
                        >
                          {addedProductId === p.id ? '✓ Added' : <><ShoppingCart size={13}/> Add to Cart</>}
                        </button>
                        <button
                          className="btn btn-sm btn-orange"
                          style={{ flex: 1, justifyContent: 'center' }}
                          onClick={(e) => { e.stopPropagation(); handleAddToCart(p); window.dispatchEvent(new CustomEvent('open-cart')); }}
                        >
                          Order Now
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
          <div style={{ textAlign: 'center', marginTop: '36px' }}>
            <Link to="/products" className="btn btn-outline">View All Products <ArrowRight size={16}/></Link>
          </div>
        </div>
      </section>



      {/* ── Why EarthyElectronics ── */}
      <section className="why-section" data-aos="fade-up">
        <div className="container">
          <div className="section-title">
            <h2>Why Choose EarthyElectronics?</h2>
            <div className="title-line"></div>
          </div>
          <div className="why-grid">
            {whyUs.map((w, idx) => (
              <div key={w.title} className="why-card" data-aos="fade-up" data-aos-delay={idx * 100}>
                <div className="why-icon">{w.icon}</div>
                <h4>{w.title}</h4>
                <p>{w.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>
      {/* Product Detail Modal */}
      <ProductModal
        product={selectedProduct}
        onClose={() => setSelectedProduct(null)}
      />
    </div>
  );
}
