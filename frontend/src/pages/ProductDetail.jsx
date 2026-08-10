import React, { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ShoppingCart, MessageCircle, ArrowLeft } from 'lucide-react';
import { useCart } from '../context/CartContext';
import './Products.css';

export default function ProductDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToCart } = useCart();
  const [productGroup, setProductGroup] = useState(null);
  const [selectedVariant, setSelectedVariant] = useState(null);
  const [loading, setLoading] = useState(true);

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

  useEffect(() => {
    const base = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
    fetch(`${base}/api/items`)
      .then(r => r.json())
      .then(data => {
        if (data.status === 'success') {
          // Find the group containing the exact product variant id in the URL
          const targetId = parseInt(id);
          
          // Grouping logic (same as Products.jsx)
          const map = new Map();
          data.data.forEach(p => {
            let baseKey;
            if (p.group_id) {
              baseKey = p.group_id;
            } else {
              const words = p.name.split(' ');
              baseKey = `${p.brand}-${p.category}-${words.slice(0, 3).join(' ')}`.toLowerCase();
            }
            
            if (map.has(baseKey)) {
              map.get(baseKey).variants.push(p);
            } else {
              const group = { ...p, variants: [p] };
              map.set(baseKey, group);
            }
          });

          // Find which group has this ID
          let foundGroup = null;
          let foundVariant = null;
          for (const group of map.values()) {
            const v = group.variants.find(v => v.id === targetId);
            if (v) {
              foundGroup = group;
              foundVariant = v;
              break;
            }
          }

          if (foundGroup) {
            setProductGroup(foundGroup);
            setSelectedVariant(foundVariant);
          }
        }
        setLoading(false);
      })
      .catch(() => setLoading(false));
  }, [id]);

  if (loading) return <div style={{ padding: '100px', textAlign: 'center' }}>Loading...</div>;
  if (!productGroup) return <div style={{ padding: '100px', textAlign: 'center' }}>Product not found.</div>;

  const price = selectedVariant.discountPrice || selectedVariant.price;

  return (
    <div className="container" style={{ padding: '40px 20px', minHeight: '80vh' }}>
      <button 
        onClick={() => navigate('/products')} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: '#64748b', cursor: 'pointer', marginBottom: '30px', fontSize: '14px', fontWeight: '600' }}
      >
        <ArrowLeft size={16} /> Back to Products
      </button>

      <div className="product-detail-layout">
        <div className="product-detail-image-box" data-aos="fade-right">
          <img 
            src={selectedVariant.image || productGroup.variants.find(v=>v.image)?.image || ''} 
            alt={selectedVariant.name}
            onError={e => { 
              const card = e.target.closest('.product-detail-image-box');
              if (card) card.style.display = 'none'; 
            }}
            style={{ width: '100%', maxWidth: '400px', height: 'auto', objectFit: 'contain' }}
          />
        </div>

        <div className="product-detail-info" data-aos="fade-left">
          <div>
            <div style={{ color: '#10b981', fontWeight: '700', fontSize: '14px', textTransform: 'uppercase', letterSpacing: '1px' }}>{selectedVariant.brand}</div>
            <h1 style={{ fontSize: '28px', color: '#0f172a', margin: '8px 0', lineHeight: '1.2' }}>{selectedVariant.name}</h1>
          </div>

          <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
            <span style={{ fontSize: '32px', fontWeight: '800', color: '#0f172a' }}>Rs. {price.toLocaleString()}</span>
            {selectedVariant.discountPrice && (
              <span style={{ fontSize: '18px', color: '#94a3b8', textDecoration: 'line-through' }}>Rs. {selectedVariant.price.toLocaleString()}</span>
            )}
          </div>

          {productGroup.variants.length > 1 && (
            <div style={{ background: '#f8fafc', padding: '20px', borderRadius: '16px', border: '1px solid #e2e8f0', boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.05)' }}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                <label style={{ fontSize: '13px', color: '#334155', fontWeight: '800', textTransform: 'uppercase', letterSpacing: '0.5px', margin: 0 }}>Available Variants</label>
                <span style={{ fontSize: '12px', color: '#10b981', fontWeight: '700', background: '#d1fae5', padding: '2px 8px', borderRadius: '12px' }}>
                  {productGroup.variants.length} Options
                </span>
              </div>
              <div 
                className="variant-vertical-scroller" 
                style={{ 
                  display: 'flex', 
                  flexDirection: 'column',
                  gap: '8px', 
                  maxHeight: '220px',
                  overflowY: 'auto', 
                  paddingRight: '6px',
                  scrollbarWidth: 'thin',
                  scrollbarColor: '#cbd5e1 transparent'
                }}
              >
                {productGroup.variants.map(v => {
                  const isActive = v.id === selectedVariant.id;
                  const vPrice = v.discountPrice || v.price;
                  return (
                    <button
                      key={v.id}
                      onClick={() => {
                        setSelectedVariant(v);
                        navigate(`/product/${v.id}`, { replace: true });
                      }}
                      style={{
                        width: '100%',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '12px 16px',
                        background: isActive ? '#f0fdf4' : '#ffffff',
                        border: isActive ? '2px solid #10b981' : '1px solid #e2e8f0',
                        borderRadius: '10px',
                        cursor: 'pointer',
                        textAlign: 'left',
                        transition: 'all 0.2s ease',
                      }}
                      onMouseEnter={(e) => { if (!isActive) e.currentTarget.style.borderColor = '#cbd5e1'; }}
                      onMouseLeave={(e) => { if (!isActive) e.currentTarget.style.borderColor = '#e2e8f0'; }}
                    >
                      <span style={{ fontSize: '14px', fontWeight: isActive ? '700' : '500', color: isActive ? '#065f46' : '#334155', flex: 1, paddingRight: '10px' }}>
                        {v.name.replace(productGroup.variants[0].brand, '').trim() || v.name}
                      </span>
                      <span style={{ fontSize: '14px', fontWeight: '700', color: '#0f172a' }}>
                        Rs. {vPrice.toLocaleString()}
                      </span>
                    </button>
                  );
                })}
              </div>
              <style>{`
                .variant-vertical-scroller::-webkit-scrollbar {
                  width: 6px;
                }
                .variant-vertical-scroller::-webkit-scrollbar-track {
                  background: transparent;
                }
                .variant-vertical-scroller::-webkit-scrollbar-thumb {
                  background-color: #cbd5e1;
                  border-radius: 20px;
                }
              `}</style>
            </div>
          )}

          <p style={{ color: '#475569', lineHeight: '1.6', fontSize: '15px' }}>
            {selectedVariant.description || `Get the genuine ${selectedVariant.name} from Earthy Electronics. We guarantee the best price and authentic products directly from the manufacturer.`}
          </p>

          <div className="product-detail-actions">
            <button 
              onClick={() => {
                if (checkAuth()) {
                  addToCart(selectedVariant);
                  window.dispatchEvent(new CustomEvent('open-cart'));
                }
              }}
              style={{ flex: 1, background: '#10b981', color: 'white', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
               Order Now
            </button>
            <button 
              onClick={() => {
                if (checkAuth()) {
                  addToCart(selectedVariant);
                  alert('Added to cart!');
                }
              }}
              style={{ flex: 1, background: '#f1f5f9', color: '#0f172a', border: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', cursor: 'pointer', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              <ShoppingCart size={20}/> Add to Cart
            </button>
          </div>

          <a
            href={`whatsapp://send?phone=923002347457&text=I want to order: ${encodeURIComponent(selectedVariant.name)} - Rs.${price.toLocaleString()}`}
            target="_blank"
            rel="noopener noreferrer"
            style={{ width: '100%', background: '#25D366', color: 'white', textDecoration: 'none', padding: '16px', borderRadius: '12px', fontSize: '16px', fontWeight: '700', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
          >
            <MessageCircle size={20}/> Order on WhatsApp
          </a>

        </div>
      </div>
    </div>
  );
}
