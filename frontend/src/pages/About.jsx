import React from 'react';
import { motion } from 'framer-motion';
import { Award, Target, Users, MapPin, Calendar, Clock } from 'lucide-react';
import './About.css';

function About() {
  return (
    <div className="about-page-container section-padding">
      {/* 1. Hero Block */}
      <section className="about-hero text-center">
        <div className="container">
          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-gradient"
          >
            About EarthyElectronics
          </motion.h1>
          <motion.p
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.6 }}
            className="subtitle"
          >
            Carrying a legacy of premium home appliance retail, delivering reliability and power-saving technology across Karachi.
          </motion.p>
        </div>
      </section>

      {/* 2. Stats Section */}
      <section className="stats-section section-padding">
        <div className="container stats-grid">
          <div className="stat-card glass-panel" data-aos="fade-up">
            <h3 className="text-gradient">10+</h3>
            <p>Years of Service</p>
          </div>
          <div className="stat-card glass-panel" data-aos="fade-up" data-aos-delay="100">
            <h3 className="text-gradient">15,000+</h3>
            <p>Happy Customers</p>
          </div>
          <div className="stat-card glass-panel" data-aos="fade-up" data-aos-delay="200">
            <h3 className="text-gradient">2</h3>
            <p>Karachi Showrooms</p>
          </div>
          <div className="stat-card glass-panel" data-aos="fade-up" data-aos-delay="300">
            <h3 className="text-gradient">100%</h3>
            <p>Original Warranty</p>
          </div>
        </div>
      </section>

      {/* 3. Core Mission & Values */}
      <section className="mission-values-section section-padding">
        <div className="container values-grid">
          <div className="value-card glass-panel" data-aos="fade-up">
            <div className="value-icon"><Target size={24} /></div>
            <h3>Our Mission</h3>
            <p>
              To offer Pakistani households authentic, durable, and highly energy-efficient electronic appliances that lower monthly utility costs while upgrading lifestyle comfort.
            </p>
          </div>
          <div className="value-card glass-panel" data-aos="fade-up" data-aos-delay="100">
            <div className="value-icon"><Award size={24} /></div>
            <h3>Official Dealership</h3>
            <p>
              We are certified direct retail dealers for Pakistan's leading appliance brands including Haier, Gree, Dawlance, Kenwood, and TCL, ensuring our clients receive verified, factory-sealed boxes.
            </p>
          </div>
          <div className="value-card glass-panel" data-aos="fade-up" data-aos-delay="200">
            <div className="value-icon"><Users size={24} /></div>
            <h3>Customer First Care</h3>
            <p>
              Our relationships do not end at checkout. We coordinate swift brand-certified technician visits for installations, maintenance, and query handling.
            </p>
          </div>
        </div>
      </section>

      {/* 4. Showrooms Section */}
      <section className="showrooms-section section-padding">
        <div className="container">
          <div className="section-header text-center">
            <h2>Our Retail Showrooms</h2>
            <p>Visit us in person to view live product demos and discuss specifications with our technical staff.</p>
          </div>
          <div className="showrooms-grid">
            <div className="showroom-card glass-panel" data-aos="fade-right">
              <div className="showroom-header">
                <MapPin className="showroom-icon" />
                <h3>Saddar Main Branch</h3>
              </div>
              <p className="showroom-address">Abdullah Haroon Road, Saddar, Karachi</p>
              <div className="showroom-details">
                <div className="detail-line">
                  <Clock size={16} />
                  <span>Mon - Sat: 11:00 AM - 9:00 PM</span>
                </div>
                <div className="detail-line">
                  <Calendar size={16} />
                  <span>Sunday: Closed</span>
                </div>
              </div>
            </div>

            <div className="showroom-card glass-panel">
              <div className="showroom-header">
                <MapPin className="showroom-icon" />
                <h3>DHA Phase 6 Branch</h3>
              </div>
              <p className="showroom-address">Main Bukhari Commercial Area, Phase 6, DHA, Karachi</p>
              <div className="showroom-details">
                <div className="detail-line">
                  <Clock size={16} />
                  <span>Mon - Sat: 12:00 PM - 10:00 PM</span>
                </div>
                <div className="detail-line">
                  <Calendar size={16} />
                  <span>Sunday: Closed</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default About;
