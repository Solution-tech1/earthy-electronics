import React, { useState, useEffect } from 'react';
import { X, ShoppingCart, MessageCircle, Star, CreditCard } from 'lucide-react';
import { useCart } from '../context/CartContext';
import { useNavigate } from 'react-router-dom';
import './ProductModal.css';

export default function ProductModal({ group, initialVariant, onClose }) {
  const { addToCart } = useCart();
  const navigate = useNavigate();
  const [currentVariant, setCurrentVariant] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [reviewName, setReviewName] = useState('');
  const [reviewText, setReviewText] = useState('');
  const [reviewRating, setReviewRating] = useState(5);
  const [hoverRating, setHoverRating] = useState(0);

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

  const fetchReviews = async (productId) => {
    try {
      const base = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
      const res = await fetch(`${base}/api/products/${productId}/reviews`);
      const data = await res.json();
      if (data.status === 'success') {
        setReviews(data.data);
      }
    } catch (e) {
      console.error('Failed to fetch reviews', e);
    }
  };

  useEffect(() => {
    if (group) {
      const variantToSelect = initialVariant || group.variants.find(v => v.image) || group.variants[0];
      setCurrentVariant(variantToSelect);
      document.body.style.overflow = 'hidden';
      document.documentElement.style.overflow = 'hidden';
    } else {
      setCurrentVariant(null);
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
      document.documentElement.style.overflow = '';
    };
  }, [group, initialVariant]);

  useEffect(() => {
    if (currentVariant) {
      fetchReviews(currentVariant.id);
    }
  }, [currentVariant]);

  const handleSubmitReview = async () => {
    if (!reviewName.trim() || !reviewText.trim()) return;
    try {
      const base = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
      const userStr = localStorage.getItem('user');
      const user = userStr ? JSON.parse(userStr) : null;
      
      const payload = {
        name: reviewName.trim(),
        comment: reviewText.trim(),
        rating: reviewRating,
        userId: user ? user.id : null
      };

      const res = await fetch(`${base}/api/products/${currentVariant.id}/reviews`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload)
      });
      const data = await res.json();
      if (data.status === 'success') {
        fetchReviews(currentVariant.id);
        setReviewName('');
        setReviewText('');
        setReviewRating(5);
      }
    } catch (e) {
      console.error('Failed to submit review', e);
    }
  };

  const getAvgRating = () => {
    if (!reviews.length) return 4.5;
    return (reviews.reduce((s, r) => s + r.rating, 0) / reviews.length).toFixed(1);
  };

  const handleOrderNow = () => {
    addToCart(currentVariant);
    onClose();
    // In our app, opening cart drawer handles checkout, or we can navigate to a checkout page.
    // Assuming cart sidebar is accessible or we dispatch a custom event.
    // For now we'll just add it and trigger cart open via standard means.
    window.dispatchEvent(new CustomEvent('open-cart'));
  };

  if (!group || !currentVariant) return null;

  // Helper to extract clear variant labels (e.g., "White - 1 Ton")
  const getVariantLabel = (variant, allVariants) => {
    if (allVariants.length <= 1) return variant.name;
    const allNames = allVariants.map(v => v.name);
    // Find common words ignoring case
    const commonWords = allNames[0].toLowerCase().split(/[\s,]+/);
    for (let i = 1; i < allNames.length; i++) {
      const words = allNames[i].toLowerCase().split(/[\s,]+/);
      for (let j = commonWords.length - 1; j >= 0; j--) {
        if (!words.includes(commonWords[j])) {
          commonWords.splice(j, 1);
        }
      }
    }
    // Extract unique words for this variant
    const nameWords = variant.name.split(/[\s,]+/);
    const diffWords = nameWords.filter(w => !commonWords.includes(w.toLowerCase()) && w !== '-');
    if (diffWords.length === 0) return variant.name.split(' ').slice(3).join(' ') || variant.name;
    return diffWords.join(' - ');
  };

  return (
    <div className="modal-bg" onClick={onClose}>
      <div className="modal-container" onClick={e => e.stopPropagation()}>
        <div className="modal-top-bar">
          <h3>{currentVariant.brand} — {currentVariant.category}</h3>
          <button className="modal-x-btn" onClick={onClose}><X size={20}/></button>
        </div>
        <div className="modal-body">
          <div className="modal-left-panel">
            <div className="modal-product-img">
              <img 
                src={currentVariant.image || catFallback(currentVariant.category)} 
                alt={currentVariant.name} 
                style={{ mixBlendMode: 'multiply' }}
                onError={e => { e.target.onerror = null; e.target.src = catFallback(currentVariant.category); }}
              />
            </div>
            
            {/* Variant Selector */}
            {group.variants.length > 1 && (
              <div className="modal-variant-selector">
                <div className="variant-label">Select Variant</div>
                <div className="variant-tiles-container">
                  {group.variants.map(v => {
                    const isActive = currentVariant.id === v.id;
                    const vPrice = v.discountPrice || v.price;
                    return (
                      <button 
                        key={v.id} 
                        className={`variant-tile ${isActive ? 'is-active' : ''}`}
                        onClick={() => setCurrentVariant(v)}
                      >
                        <span className="variant-tile-name">{getVariantLabel(v, group.variants)}</span>
                        <span className="variant-tile-price">Rs. {vPrice.toLocaleString()}</span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>

          <div className="modal-product-info">
            <div className="modal-info-header">
              <h2>{currentVariant.name}</h2>
              <div className="modal-price-block">
                <span className="m-price">Rs. {(currentVariant.discountPrice || currentVariant.price).toLocaleString()}</span>
                {currentVariant.discountPrice && (
                  <span className="m-was">Rs. {currentVariant.price.toLocaleString()}</span>
                )}
              </div>
            </div>
            
            <div className="modal-info-scrollable">
              <p className="modal-desc">{currentVariant.description}</p>
              
              <div className="modal-specs-title">Specifications</div>
              <div className="specs-table">
                {Object.entries(currentVariant.specifications || {}).map(([k, v]) => (
                  <div key={k} className="modal-spec-row">
                    <span className="sk">{k.charAt(0).toUpperCase() + k.slice(1)}</span>
                    <span className="sv">{v}</span>
                  </div>
                ))}
              </div>

              <div className="modal-cta-row">
                <button className="btn btn-orange m-btn-large" onClick={handleOrderNow}>
                  <CreditCard size={18}/> Order Now
                </button>
                <button className="btn btn-navy m-btn-large" onClick={() => { addToCart(currentVariant); onClose(); }}>
                  <ShoppingCart size={18}/> Add to Cart
                </button>
                <a
                  href={`whatsapp://send?phone=923002347457&text=I want to order: ${encodeURIComponent(currentVariant.name)}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn btn-green m-btn-large"
                  style={{ textDecoration: 'none', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px' }}
                >
                  <MessageCircle size={18}/> Order on WhatsApp
                </a>
              </div>

            {/* ── Reviews Section ── */}
            <div className="reviews-section" style={{ marginTop: '30px' }}>
              <div className="reviews-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid #e2e8f0', paddingBottom: '10px', marginBottom: '15px' }}>
                <h4 style={{ margin: 0 }}>Customer Reviews</h4>
                <div className="avg-rating-badge" style={{ display: 'flex', alignItems: 'center', gap: '5px', background: '#f8fafc', padding: '4px 10px', borderRadius: '20px' }}>
                  <Star size={14} className="star-filled" fill="#fbbf24" color="#fbbf24" />
                  <span style={{ fontWeight: 'bold' }}>{getAvgRating()}</span>
                  <small style={{ color: '#64748b' }}>({reviews.length} reviews)</small>
                </div>
              </div>

              {/* Review Form */}
              <div className="review-form" style={{ background: '#f8fafc', padding: '15px', borderRadius: '8px', marginBottom: '20px' }}>
                <div className="review-star-picker" style={{ display: 'flex', gap: '4px', marginBottom: '10px' }}>
                  {[1,2,3,4,5].map(star => (
                    <button
                      key={star}
                      style={{ background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
                      onMouseEnter={() => setHoverRating(star)}
                      onMouseLeave={() => setHoverRating(0)}
                      onClick={() => setReviewRating(star)}
                    >
                      <Star
                        size={20}
                        fill={(hoverRating || reviewRating) >= star ? '#fbbf24' : 'none'}
                        color={(hoverRating || reviewRating) >= star ? '#fbbf24' : '#94a3b8'}
                      />
                    </button>
                  ))}
                </div>
                <div className="review-inputs" style={{ display: 'flex', flexDirection: 'column', gap: '10px', marginBottom: '10px' }}>
                  <input
                    type="text"
                    placeholder="Your name"
                    value={reviewName}
                    onChange={e => setReviewName(e.target.value)}
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '100%' }}
                  />
                  <textarea
                    placeholder="Write your review and feedback here..."
                    value={reviewText}
                    onChange={e => setReviewText(e.target.value)}
                    rows={3}
                    style={{ padding: '8px 12px', border: '1px solid #cbd5e1', borderRadius: '4px', width: '100%', resize: 'vertical' }}
                  />
                </div>
                <button
                  className="btn btn-navy"
                  onClick={handleSubmitReview}
                >
                  Post Feedback
                </button>
              </div>

              {/* Reviews List */}
              <div className="reviews-list">
                {reviews.length === 0 ? (
                  <p style={{ color: '#64748b', fontSize: '13px' }}>No feedback yet. Be the first to review!</p>
                ) : (
                  reviews.map(r => (
                    <div key={r.id} style={{ borderBottom: '1px solid #f1f5f9', padding: '12px 0' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <span style={{ fontWeight: '600', fontSize: '14px' }}>{r.reviewer_name}</span>
                          <div style={{ display: 'flex', gap: '2px' }}>
                            {[1,2,3,4,5].map(s => (
                              <Star key={s} size={12}
                                fill={r.rating >= s ? '#fbbf24' : 'none'}
                                color={r.rating >= s ? '#fbbf24' : '#cbd5e1'}
                              />
                            ))}
                          </div>
                        </div>
                        <span style={{ fontSize: '12px', color: '#94a3b8' }}>{new Date(r.created_at).toLocaleDateString()}</span>
                      </div>
                      <p style={{ fontSize: '13px', color: '#475569', margin: 0 }}>{r.comment}</p>
                    </div>
                  ))
                )}
              </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
