import React, { useEffect, useState } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { ShoppingCart, MessageCircle, X, Search, Star, Settings2, LayoutGrid, Wind, Tv, Refrigerator, Shirt, ChefHat, Microwave, Droplets, Snowflake, Check, Scale } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './Products.css';


const ProductCardItem = ({ group, checkAuth, addToCart, handleSelectProduct, catFallback, idx, compareList, toggleCompare }) => {
  const [selectedVariant, setSelectedVariant] = useState(group.variants[0]);
  
  useEffect(() => {
     const withImg = group.variants.find(v => v.image);
     if (withImg) setSelectedVariant(withImg);
  }, [group]);

  const price = selectedVariant.discountPrice || selectedVariant.price;
  const saved = selectedVariant.discountPrice ? selectedVariant.price - selectedVariant.discountPrice : 0;
  
  return (
    <div className="catalog-card" onClick={() => handleSelectProduct(group, selectedVariant)} style={{ cursor: 'pointer', position: 'relative' }} data-aos="fade-up" data-aos-delay={(idx % 20) * 50}>
      {saved > 0 && <span className="catalog-badge">SAVE Rs.{saved.toLocaleString()}</span>}
      <div className="catalog-img-wrap">
        <img
          src={selectedVariant.image || group.variants.find(v=>v.image)?.image || ''}
          alt={selectedVariant.name}
          loading="lazy"
          decoding="async"
          onError={e => { 
            const card = e.target.closest('.catalog-card');
            if (card) card.style.display = 'none'; 
          }}
          style={{ mixBlendMode: 'multiply' }}
        />
      </div>
      <div className="catalog-body">
        <div className="catalog-brand">{selectedVariant.brand}</div>
        <div className="catalog-name">{selectedVariant.name}</div>
        {group.variants.length > 1 && (
          <div style={{fontSize:'12px', color:'#10b981', fontWeight:'700', marginTop:'4px'}}>+{group.variants.length - 1} Options Available</div>
        )}
        


        <div className="catalog-price" style={{ marginTop: group.variants.length > 1 ? '6px' : 'auto' }}>
          <span className="now">Rs. {price.toLocaleString()}</span>
          {selectedVariant.discountPrice && <span className="was">Rs. {selectedVariant.price.toLocaleString()}</span>}
        </div>
        <label 
          className="compare-checkbox-wrap" 
          onClick={(e) => { e.stopPropagation(); toggleCompare(group, selectedVariant); }}
          style={{ display: 'flex', alignItems: 'center', gap: '6px', fontSize: '12px', color: '#64748b', marginBottom: '12px', cursor: 'pointer' }}
        >
          <input 
            type="checkbox" 
            checked={!!compareList.find(p => p.id === group.id)} 
            readOnly 
            style={{ cursor: 'pointer', accentColor: '#10b981' }}
          />
          <span style={{ fontWeight: 600 }}>Add to Compare</span>
        </label>
        <div className="catalog-actions">
          <button className="btn btn-navy catalog-cart-btn" style={{ padding: '8px 10px', fontSize: '12px' }} onClick={(e) => {
            e.stopPropagation();
            if (checkAuth()) {
              addToCart(selectedVariant);
              alert('Added to cart!');
            }
          }}>
            <ShoppingCart size={14}/> Add to Cart
          </button>
          <button
            className="btn btn-primary catalog-order-btn"
            style={{ padding: '8px 10px', fontSize: '12px' }}
            onClick={(e) => {
              e.stopPropagation();
              if (checkAuth()) {
                addToCart(selectedVariant);
                window.dispatchEvent(new CustomEvent('open-cart'));
              }
            }}
          >
            Order Now
          </button>
        </div>
      </div>
    </div>
  );
};

export default function Products() {
  const { addToCart } = useCart();
  const location = useLocation();
  const navigate = useNavigate();

  const [allProducts, setAllProducts] = useState([]);
  const [shuffledProducts, setShuffledProducts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [initialVariant, setInitialVariant] = useState(null);
  
  // Auth check for cart
  const checkAuth = () => {
    const token = localStorage.getItem('token');
    const user = localStorage.getItem('user');
    if (!token || !user) {
      alert("Please login first to place an order or add to cart.");
      window.location.href = '/signin';
      return false;
    }
    return true;
  };

  const handleSelectProduct = (group, variant) => {
    navigate('/product/' + variant.id);
  };
  const [selectedCategory, setSelectedCategory] = useState('All');
  const [selectedBrands, setSelectedBrands] = useState([]);
  const [maxPrice, setMaxPrice] = useState(10000000);
  const [sortBy, setSortBy] = useState('default');
  const [searchQuery, setSearchQuery] = useState('');
  const [isMobileFilterOpen, setIsMobileFilterOpen] = useState(false);

  // Compare Tool State
  const [compareList, setCompareList] = useState([]);
  const [showCompareModal, setShowCompareModal] = useState(false);

  const extractSpecs = (name) => {
    if (!name) name = '';
    const specs = {};
    const n = name.toLowerCase();
    
    // Capacity / Size
    const sizeMatch = n.match(/(\d+(\.\d+)?\s*(ton|kg|ltr|liters|inch|"))/i);
    specs['Capacity / Size'] = sizeMatch ? sizeMatch[0].toUpperCase() : 'Standard';
    
    // Technology
    specs['Technology'] = n.includes('inverter') ? 'Inverter' : (n.includes('smart') ? 'Smart Tech' : 'Standard');
    
    // Smart/WiFi
    specs['Smart Features'] = (n.includes('wifi') || n.includes('wi-fi') || n.includes('smart')) ? 'Supported (WiFi/Smart)' : 'Not Supported';
    
    return specs;
  };

  const toggleCompare = (group, variant) => {
    if (compareList.find(p => p.id === group.id)) {
      setCompareList(compareList.filter(p => p.id !== group.id));
    } else {
      if (compareList.length >= 4) {
        alert('You can only compare up to 4 products at a time!');
        return;
      }
      setCompareList([...compareList, { ...group, selectedVariant: variant }]);
    }
  };

  // AC Calculator State
  const [acSize, setAcSize] = useState('1.5');
  const [dailyHours, setDailyHours] = useState(8);
  const [unitRate, setUnitRate] = useState(50);
  const acSavings = Math.round(Number(acSize) * dailyHours * 30 * unitRate * 0.4);

  const catFallback = (cat, name = '') => {
    const text = ((cat || '') + ' ' + (name || '')).toLowerCase();
    if (text.includes('washer') || text.includes('washing') || text.includes('hwm') || text.includes('dwt') || text.includes('dwf') || text.includes('tub') || text.includes('spin')) return '/images/cat_washer.png';
    if (text.includes('tv') || text.includes('led') || text.includes('qled') || text.includes('oled')) return '/images/cat_tv.png';
    if (text.includes('geyser') || text.includes('water heater')) return '/images/product_geyser.svg';
    if (text.includes('air conditioner') || text.includes('split ac') || text.includes('inverter ac')) return '/images/cat_ac.png';
    if (text.includes('fridge') || text.includes('refriger') || text.includes('hrf')) return '/images/cat_fridge.png';
    if (text.includes('microwave') || text.includes('oven')) return '/images/cat_microwave.png';
    if (text.includes('dispenser')) return '/images/product_dispenser.png';
    if (text.includes('freezer')) return '/images/product_freezer.png';
    return '/images/cat_kitchen.png';
  };

  // Read URL params
  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const cat = params.get('category');
    const search = params.get('search');
    if (cat) {
      const catLow = cat.toLowerCase();
      if (catLow.includes('air')) setSelectedCategory('Air Conditioners');
      else if (catLow.includes('wash')) setSelectedCategory('Washing Machines');
      else if (catLow.includes('micro') || catLow.includes('oven')) setSelectedCategory('Microwave Ovens');
      else if (catLow.includes('tv') || catLow.includes('led')) setSelectedCategory('LED TVs');
      else if (catLow.includes('fridge') || catLow.includes('refrig')) setSelectedCategory('Refrigerators');
      else if (catLow.includes('kitchen')) setSelectedCategory('Kitchen Appliances');
      else if (catLow.includes('dispen')) setSelectedCategory('Water Dispensers');
      else if (catLow.includes('geyser') || catLow.includes('water heater')) setSelectedCategory('Geysers & Water Heaters');
      else if (catLow.includes('freez')) setSelectedCategory('Deep Freezers');
      else if (catLow.includes('room heater') || catLow.includes('heater')) setSelectedCategory('Room Heaters');
      else setSelectedCategory(cat);
    } else {
      setSelectedCategory('All');
    }
    if (search) setSearchQuery(decodeURIComponent(search));
    else setSearchQuery('');
  }, [location.search]);

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
    fetch(`${base}/api/items`)
      .then(res => res.json())
      .then(data => {
        if (data && Array.isArray(data.data)) {
          const validProducts = data.data.filter(p => {
            if (p.id === 759) return false;
            if (p.image && p.image.includes('GS-18FITH1W.webp')) return false;
            return true;
          });
          
          setAllProducts(validProducts);
          // Shuffle array on initial load
          const shuffled = [...validProducts].sort(() => 0.5 - Math.random());
          setShuffledProducts(shuffled);
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, []);

  const toggleBrand = (brand) => {
    if (brand === 'All') {
      setSelectedBrands([]);
    } else {
      setSelectedBrands(prev => (prev.includes(brand) ? [] : [brand]));
    }
  };

  const clearFilters = () => {
    setSelectedCategory('All');
    setSelectedBrands([]);
    setMaxPrice(2500000);
    setSortBy('default');
    setSearchQuery('');
  };

  // Group Variants
  const groupProducts = (products) => {
    const grouped = [];
    const map = new Map();
    products.forEach(p => {
      const words = p.name.split(' ');
      const baseKey = `${p.brand}-${p.category}-${words.slice(0, 3).join(' ')}`.toLowerCase();
      
      if (map.has(baseKey)) {
        map.get(baseKey).variants.push(p);
      } else {
        const group = { ...p, variants: [p] };
        map.set(baseKey, group);
        grouped.push(group);
      }
    });
    return grouped;
  };

  const groupedArray = groupProducts(shuffledProducts.length > 0 ? shuffledProducts : allProducts);

  // Filter + sort
  let filtered = groupedArray.filter(group => {
    return group.variants.some(p => {
      const price = p.discountPrice || p.price;
      const catSearch = selectedCategory.toLowerCase();
      const pCat = (p.category || '').toLowerCase();
      
      const matchCat = selectedCategory === 'All' || 
        pCat === catSearch || 
        (catSearch.includes('air') && pCat.includes('air')) ||
        (catSearch.includes('wash') && pCat.includes('wash')) ||
        (catSearch.includes('refrig') && pCat.includes('refrig')) ||
        (catSearch.includes('micro') && pCat.includes('micro')) ||
        (catSearch.includes('tv') && pCat.includes('tv')) ||
        (catSearch.includes('dispen') && pCat.includes('dispen')) ||
        (catSearch.includes('freez') && pCat.includes('freez')) ||
        (catSearch.includes('kitchen') && pCat.includes('kitchen')) ||
        (catSearch.includes('geyser') && pCat.includes('geyser')) ||
        (catSearch.includes('heater') && pCat.includes('heater'));
      const matchBrand = selectedBrands.length === 0 || selectedBrands.includes('All') || selectedBrands.some(b => {
        const brandLow = (p.brand || '').toLowerCase();
        const nameLow = (p.name || '').toLowerCase();
        const bLow = b.toLowerCase();
        if (bLow === 'super asia') {
          return brandLow.includes('super asia') || brandLow.includes('superasia') || nameLow.includes('super asia') || nameLow.includes('superasia');
        }
        if (bLow === 'west point') {
          return brandLow.includes('west point') || brandLow.includes('westpoint') || nameLow.includes('west point') || nameLow.includes('westpoint');
        }
        return brandLow.includes(bLow) || nameLow.includes(bLow);
      });
      const matchPrice = price <= maxPrice;
      const matchSearch = !searchQuery || p.name.toLowerCase().includes(searchQuery.toLowerCase()) || p.brand.toLowerCase().includes(searchQuery.toLowerCase());
      return matchCat && matchBrand && matchPrice && matchSearch;
    });
  });

  if (sortBy === 'price-asc') filtered = [...filtered].sort((a, b) => (a.discountPrice || a.price) - (b.discountPrice || b.price));
  if (sortBy === 'price-desc') filtered = [...filtered].sort((a, b) => (b.discountPrice || b.price) - (a.discountPrice || a.price));
  if (sortBy === 'name') filtered = [...filtered].sort((a, b) => a.name.localeCompare(b.name));

  return (
    <div>
      {/* Banner */}
      <div className="page-hero">
        <div className="container">
          <h1>All Products</h1>
          <p>Browse our complete catalogue of genuine home appliances with best prices</p>
        </div>
      </div>

      <div className="container products-page-wrap">
        {/* Mobile Filter Toggle Button */}
        <div className="mobile-filter-bar">
          <button className="mobile-filter-toggle-btn" onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)}>
            <Settings2 size={18} /> {isMobileFilterOpen ? 'Hide Filter Products' : 'Filter Products'}
          </button>
          {(selectedCategory !== 'All' || selectedBrands.length > 0 || searchQuery) && (
            <button className="mobile-reset-btn" onClick={clearFilters}>Reset Filters</button>
          )}
        </div>

        <div className="products-layout">
          <aside className={`filter-sidebar premium-sidebar ${isMobileFilterOpen ? 'is-open' : ''}`}>
            <div className="sidebar-top" onClick={() => setIsMobileFilterOpen(!isMobileFilterOpen)} style={{ cursor: 'pointer' }}>
              <span><Settings2 size={18} className="inline-icon"/> Filter Products</span>
              <button className="sidebar-reset-btn" onClick={(e) => { e.stopPropagation(); clearFilters(); }}>Reset</button>
            </div>

            {/* Category Filter */}
            <div className="filter-section premium-section">
              <div className="filter-section-title">Categories</div>
              <div className="cat-tabs premium-list">
                {[
                  { name: 'All Products', val: 'All', icon: <LayoutGrid size={18} /> },
                  { name: 'Air Conditioners', val: 'Air Conditioners', icon: <Wind size={18} /> },
                  { name: 'Washing Machines', val: 'Washing Machines', icon: <Shirt size={18} /> },
                  { name: 'Microwave Ovens', val: 'Microwave Ovens', icon: <Microwave size={18} /> },
                  { name: 'LED TVs', val: 'LED TVs', icon: <Tv size={18} /> },
                  { name: 'Refrigerators', val: 'Refrigerators', icon: <Refrigerator size={18} /> },
                  { name: 'Kitchen Appliances', val: 'Kitchen Appliances', icon: <ChefHat size={18} /> },
                  { name: 'Water Dispensers', val: 'Water Dispensers', icon: <Droplets size={18} /> },
                  { name: 'Geysers & Heaters', val: 'Geysers & Water Heaters', icon: <Droplets size={18} /> },
                  { name: 'Deep Freezers', val: 'Deep Freezers', icon: <Snowflake size={18} /> },
                  { name: 'Room Heaters', val: 'Room Heaters', icon: <Wind size={18} /> },
                ].map(c => (
                  <button
                    key={c.val}
                    className={`premium-cat-item ${selectedCategory === c.val ? 'is-active' : ''}`}
                    onClick={() => setSelectedCategory(c.val)}
                  >
                    <span className="icon-wrap">{c.icon}</span> <span className="cat-name">{c.name}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Brand Filter */}
            <div className="filter-section premium-section brand-section">
              <div className="filter-section-title">Filter by Brand</div>
              <div className="cat-tabs premium-checkbox-list">
                {[
                  { name: 'All Brands', val: 'All' },
                  { name: 'Haier', val: 'Haier' },
                  { name: 'Dawlance', val: 'Dawlance' },
                  { name: 'Gree', val: 'Gree' },
                  { name: 'Samsung', val: 'Samsung' },
                  { name: 'TCL', val: 'TCL' },
                  { name: 'Kenwood', val: 'Kenwood' },
                  { name: 'PEL', val: 'PEL' },
                  { name: 'Super Asia', val: 'Super Asia' },
                  { name: 'Orient', val: 'Orient' },
                  { name: 'West Point', val: 'West Point' },
                ].map(b => {
                  const isActive = (b.val === 'All' && selectedBrands.length === 0) || selectedBrands.includes(b.val);
                  return (
                    <label key={b.val} className="premium-checkbox-label">
                      <input 
                        type="checkbox" 
                        className="hidden-checkbox"
                        checked={isActive}
                        onChange={() => {
                          if (b.val === 'All') setSelectedBrands([]);
                          else toggleBrand(b.val);
                        }}
                      />
                      <div className={`styled-checkbox ${isActive ? 'checked' : ''}`}>
                        {isActive && <Check size={14} strokeWidth={3} color="#ffffff" />}
                      </div>
                      <span className={`brand-name ${isActive ? 'active-brand' : ''}`}>{b.name}</span>
                    </label>
                  );
                })}
              </div>
            </div>
          </aside>

          {/* ── Products Main ── */}
          <div className="products-main-area">
            {/* AC Calculator Widget when viewing Air Conditioners */}
            {selectedCategory === 'Air Conditioners' && (
              <div style={{
                background: 'linear-gradient(135deg, #f0fdf4 0%, #ffffff 100%)',
                border: '1.5px solid #a7f3d0',
                borderRadius: '14px',
                padding: '20px 24px',
                margin: '16px 0 28px 0',
                boxShadow: '0 4px 16px rgba(16, 185, 129, 0.08)'
              }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px', marginBottom: '14px', paddingBottom: '12px', borderBottom: '1px solid #dcfce7' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div style={{ width: '36px', height: '36px', borderRadius: '10px', background: '#d1fae5', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                      <Wind size={20} color="#059669" />
                    </div>
                    <div>
                      <h3 style={{ margin: 0, fontSize: '16px', fontWeight: '800', color: '#065f46' }}>
                        DC Inverter Savings Calculator
                      </h3>
                      <p style={{ margin: '2px 0 0 0', fontSize: '11.5px', color: '#64748b' }}>
                        Estimate your monthly electricity bill savings by switching to a DC Inverter AC
                      </p>
                    </div>
                  </div>
                  <div style={{ background: 'linear-gradient(135deg, #10b981 0%, #059669 100%)', color: '#ffffff', padding: '6px 14px', borderRadius: '10px', textAlign: 'right', boxShadow: '0 3px 10px rgba(16,185,129,0.25)' }}>
                    <div style={{ fontSize: '9.5px', textTransform: 'uppercase', letterSpacing: '0.8px', opacity: 0.9, fontWeight: '700' }}>Est. Monthly Savings</div>
                    <strong style={{ fontSize: '16px', fontWeight: '900' }}>Rs. {acSavings.toLocaleString()}</strong>
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '14px', alignItems: 'center' }}>
                  <div>
                    <label style={{ display: 'block', fontSize: '11px', fontWeight: '700', color: '#065f46', marginBottom: '5px' }}>AC Capacity (Tonnage)</label>
                    <select
                      value={acSize}
                      onChange={e => setAcSize(e.target.value)}
                      style={{ width: '100%', padding: '7px 10px', borderRadius: '8px', border: '1px solid #cbd5e1', background: '#ffffff', fontSize: '12.5px', fontWeight: '600', color: '#0f172a', outline: 'none' }}
                    >
                      <option value="1.0">1.0 Ton (120-150 sq.ft)</option>
                      <option value="1.5">1.5 Ton (180-200 sq.ft)</option>
                      <option value="2.0">2.0 Ton (250-300 sq.ft)</option>
                    </select>
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#065f46' }}>Daily Usage</label>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>{dailyHours} hrs/day</span>
                    </div>
                    <input
                      type="range"
                      min="2"
                      max="16"
                      value={dailyHours}
                      onChange={e => setDailyHours(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#10b981', height: '6px', cursor: 'pointer' }}
                    />
                  </div>

                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '5px' }}>
                      <label style={{ fontSize: '11px', fontWeight: '700', color: '#065f46' }}>Electricity Rate</label>
                      <span style={{ fontSize: '11px', fontWeight: '800', color: '#10b981', background: '#e0f2fe', padding: '1px 6px', borderRadius: '4px' }}>Rs. {unitRate}/unit</span>
                    </div>
                    <input
                      type="range"
                      min="30"
                      max="80"
                      value={unitRate}
                      onChange={e => setUnitRate(Number(e.target.value))}
                      style={{ width: '100%', accentColor: '#10b981', height: '6px', cursor: 'pointer' }}
                    />
                  </div>
                </div>
              </div>
            )}
            <div className="products-toolbar">
              <span className="toolbar-count">
                Showing <strong>{filtered.length}</strong> of {allProducts.length} products
                {selectedCategory !== 'All' && <> in <strong>{selectedCategory}</strong></>}
              </span>
              <select className="sort-dropdown" value={sortBy} onChange={e => setSortBy(e.target.value)}>
                <option value="default">Sort: Featured</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
                <option value="name">Name A-Z</option>
              </select>
            </div>

            {/* Grid */}
            {loading ? (
              <p style={{ textAlign: 'center', padding: 40, color: '#64748b' }}>Loading products...</p>
            ) : (
              <div className="catalog-grid">
                {filtered.length === 0 ? (
                  <div className="no-products">
                    <h3>Coming Soon!</h3>
                    <p>We are currently updating our premium inventory for this category/brand. Please check back later or try changing your filters.</p>
                    <button className="btn btn-outline" style={{ marginTop: 16 }} onClick={clearFilters}>
                      Clear All Filters
                    </button>
                  </div>
                ) : (
                  filtered.map((group, idx) => (
                    <ProductCardItem 
                      key={group.id} 
                      group={group} 
                      checkAuth={checkAuth} 
                      addToCart={addToCart} 
                      handleSelectProduct={handleSelectProduct} 
                      catFallback={catFallback}
                      idx={idx}
                      compareList={compareList}
                      toggleCompare={toggleCompare}
                    />
                  ))
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Compare Floating FAB */}
      {compareList.length > 0 && (
        <button className="compare-fab" onClick={() => setShowCompareModal(true)}>
          <Scale size={24} />
          <span>Compare Products</span>
          <div className="fab-badge">{compareList.length}</div>
        </button>
      )}

      {/* Compare Modal */}
      {showCompareModal && (
        <div className="modal-overlay" onClick={() => setShowCompareModal(false)}>
          <div className="modal-container" onClick={e => e.stopPropagation()} style={{ maxWidth: '1000px' }}>
            <div className="modal-header">
              <h2>Product Comparison</h2>
              <button className="modal-close" onClick={() => setShowCompareModal(false)}><X/></button>
            </div>
            <div className="modal-body" style={{ overflowX: 'auto' }}>
              <table className="compare-modal-table">
                <tbody>
                  <tr>
                    <th>Product</th>
                    {compareList.map(p => (
                      <td key={p.id}>
                        <img src={p.selectedVariant.image || p.variants?.find(v=>v.image)?.image || ''} alt={p.selectedVariant.name} onError={(e) => e.target.style.display = 'none'} />
                        <h4 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>{p.selectedVariant.name}</h4>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th>Price</th>
                    {compareList.map(p => (
                      <td key={p.id}>
                        <div style={{ color: '#10b981', fontWeight: '800', fontSize: '18px' }}>
                          Rs. {(p.selectedVariant.discountPrice || p.selectedVariant.price).toLocaleString()}
                        </div>
                      </td>
                    ))}
                  </tr>
                  <tr>
                    <th>Brand</th>
                    {compareList.map(p => <td key={p.id} style={{ fontWeight: '600' }}>{p.selectedVariant.brand}</td>)}
                  </tr>
                  <tr>
                    <th>Category</th>
                    {compareList.map(p => <td key={p.id}>{p.selectedVariant.category}</td>)}
                  </tr>
                  <tr>
                    <th>Size / Capacity</th>
                    {compareList.map(p => <td key={p.id} style={{ fontWeight: '600' }}>{extractSpecs(p.selectedVariant.name)['Capacity / Size']}</td>)}
                  </tr>
                  <tr>
                    <th>Technology</th>
                    {compareList.map(p => <td key={p.id}>{extractSpecs(p.selectedVariant.name)['Technology']}</td>)}
                  </tr>
                  <tr>
                    <th>Smart Features</th>
                    {compareList.map(p => <td key={p.id}>{extractSpecs(p.selectedVariant.name)['Smart Features']}</td>)}
                  </tr>
                  <tr>
                    <th>Status</th>
                    {compareList.map(p => <td key={p.id} style={{ color: '#10b981', fontWeight: '600' }}>In Stock</td>)}
                  </tr>
                  <tr>
                    <th>Warranty</th>
                    {compareList.map(p => <td key={p.id}>Official Brand Warranty</td>)}
                  </tr>
                  <tr>
                    <th>Delivery</th>
                    {compareList.map(p => <td key={p.id}>Free Nationwide</td>)}
                  </tr>
                  <tr>
                    <th>Action</th>
                    {compareList.map(p => (
                      <td key={p.id}>
                        <button className="btn btn-navy" style={{ padding: '8px 16px', fontSize: '13px' }} onClick={() => {
                          if(checkAuth()) { addToCart(p.selectedVariant); alert('Added to cart!'); }
                        }}>
                          <ShoppingCart size={14}/> Add to Cart
                        </button>
                      </td>
                    ))}
                  </tr>
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
