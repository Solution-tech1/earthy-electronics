import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, MapPin, MessageCircle, Zap, Home, Package, Info, PhoneCall, Wind, Tv, Refrigerator, Shirt, Leaf } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  return (
    <footer className="site-footer">
      <div className="footer-top">
        <div className="container">
          <div className="footer-grid">
            {/* Brand */}
            <div className="footer-brand">
              <div className="footer-brand-name" style={{ display: 'flex', alignItems: 'center' }}>
                <img src="/images/earthyelectronics_official_banner_logo.png" alt="EarthyElectronics" style={{ height: '60px', width: 'auto', border: 'none', borderRadius: '0' }} />
              </div>
              <p>Karachi's premier eco-friendly electronics retailer since 2010. Authorized dealer for Haier, Gree, Dawlance, and Kenwood with energy-efficient appliances, free delivery, and expert support.</p>
              <div className="footer-contact-item"><Phone size={14}/> 0300-2347457</div>
              <div className="footer-contact-item"><MapPin size={14}/> Saddar & DHA Phase 6, Karachi</div>
            </div>

            {/* Quick Links */}
            <div className="footer-col">
              <h4>Quick Links</h4>
              <ul>
                <li><Link to="/"><Home size={14} className="inline-icon"/> Home</Link></li>
                <li><Link to="/products"><Package size={14} className="inline-icon"/> All Products</Link></li>
                <li><Link to="/about"><Info size={14} className="inline-icon"/> About Us</Link></li>
                <li><Link to="/contact"><PhoneCall size={14} className="inline-icon"/> Contact Us</Link></li>
              </ul>
            </div>

            {/* Categories */}
            <div className="footer-col">
              <h4>Categories</h4>
              <ul>
                <li><Link to="/products?category=Air Conditioner"><Wind size={14} className="inline-icon"/> Air Conditioners</Link></li>
                <li><Link to="/products?category=LED TV"><Tv size={14} className="inline-icon"/> LED TVs</Link></li>
                <li><Link to="/products?category=Refrigerator"><Refrigerator size={14} className="inline-icon"/> Refrigerators</Link></li>
                <li><Link to="/products?category=Washing Machine"><Shirt size={14} className="inline-icon"/> Washing Machines</Link></li>
              </ul>
            </div>

            {/* Contact */}
            <div className="footer-col">
              <h4>Get in Touch</h4>
              <ul>
                <li><a href="tel:+923002347457"><Phone size={13}/> 0300-2347457</a></li>
                <li>
                  <a href="https://wa.me/923002347457" target="_blank" rel="noopener noreferrer">
                    <MessageCircle size={13}/> WhatsApp Order
                  </a>
                </li>
                <li><a href="#"><MapPin size={13}/> Saddar Branch</a></li>
                <li><a href="#"><MapPin size={13}/> DHA Phase 6 Branch</a></li>
              </ul>
            </div>
          </div>
        </div>
      </div>
      <div className="footer-bottom">
        <div className="container">
          <p>&copy; 2026 EarthyElectronics. All rights reserved. | Karachi, Pakistan</p>
        </div>
      </div>
    </footer>
  );
}
