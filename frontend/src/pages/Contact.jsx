import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Phone, Mail, MapPin, Clock, MessageSquare, Send, CheckCircle } from 'lucide-react';
import './Contact.css';

function Contact() {
  const [formData, setFormData] = useState({ name: '', email: '', phone: '', subject: '', message: '' });
  const [submitted, setSubmitted] = useState(false);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    // In a real application, submit this to a backend route (e.g. POST /api/contact)
    console.log('Form submission data:', formData);
    setSubmitted(true);
    // Clear form
    setFormData({ name: '', email: '', phone: '', subject: '', message: '' });
  };

  return (
    <div className="contact-page-container container section-padding">
      <div className="page-header">
        <h1 className="text-gradient">Get In Touch</h1>
        <p>Have questions about DC inverter compatibility, specs, or ordering? Reach out directly.</p>
      </div>

      <div className="contact-layout">
        {/* Contact info column */}
        <aside className="contact-info-panel glass-panel" data-aos="fade-right">
          <h3>Customer Support Channels</h3>
          <p>Choose the method that works best for you. Our Karachi offices respond within minutes.</p>

          <div className="support-channels-list">
            <div className="channel-item">
              <div className="channel-icon"><Phone size={20} /></div>
              <div className="channel-details">
                <h4>Call Support</h4>
                <a href="tel:+923002347457">0300-2347457</a>
                <span>Available Mon - Sat (11am - 9pm)</span>
              </div>
            </div>

            <div className="channel-item">
              <div className="channel-icon"><Mail size={20} /></div>
              <div className="channel-details">
                <h4>Email Support</h4>
                <a href="mailto:support@earthyelectronics.pk">support@earthyelectronics.pk</a>
                <span>We answer within 24 hours</span>
              </div>
            </div>

            <div className="channel-item">
              <div className="channel-icon"><MessageSquare size={20} style={{ color: '#25d366' }} /></div>
              <div className="channel-details">
                <h4>WhatsApp Sales Desk</h4>
                <a 
                  href="https://wa.me/923002347457?text=Hi%20EarthyElectronics,%20I%20have%20a%20sales%20query."
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="whatsapp-link-text"
                >
                  Start Live Chat
                </a>
                <span>Best for instant stock confirmation</span>
              </div>
            </div>

            <div className="channel-item">
              <div className="channel-icon"><Clock size={20} /></div>
              <div className="channel-details">
                <h4>Office Hours</h4>
                <span>Mon - Sat: 11:00 AM - 10:00 PM</span>
                <span>Sunday: Closed (Online WhatsApp active for bookings)</span>
              </div>
            </div>
          </div>
        </aside>

        {/* Contact form column */}
        <main className="contact-form-panel glass-panel" data-aos="fade-left">
          {submitted ? (
            <motion.div 
              className="submission-success"
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.4 }}
            >
              <CheckCircle size={56} className="success-icon" />
              <h3>Message Sent Successfully!</h3>
              <p>Thank you for contacting EarthyElectronics. A support agent will review your details and reach out shortly.</p>
              <button className="btn btn-primary" onClick={() => setSubmitted(false)}>Send Another Message</button>
            </motion.div>
          ) : (
            <form onSubmit={handleSubmit} className="contact-form">
              <h3>Submit a Support Ticket</h3>
              <p>Fill out this form and we'll route your request to the appropriate showroom manager.</p>

              <div className="form-grid">
                <div className="form-group">
                  <label htmlFor="name">Your Full Name</label>
                  <input 
                    type="text" 
                    id="name"
                    name="name"
                    value={formData.name}
                    onChange={handleChange}
                    required
                    placeholder="Enter your name"
                    className="input-field" 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="email">Email Address</label>
                  <input 
                    type="email" 
                    id="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    placeholder="name@email.com"
                    className="input-field" 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="phone">Phone Number</label>
                  <input 
                    type="tel" 
                    id="phone"
                    name="phone"
                    value={formData.phone}
                    onChange={handleChange}
                    placeholder="0300-1234567"
                    className="input-field" 
                  />
                </div>

                <div className="form-group">
                  <label htmlFor="subject">Inquiry Subject</label>
                  <input 
                    type="text" 
                    id="subject"
                    name="subject"
                    value={formData.subject}
                    onChange={handleChange}
                    required
                    placeholder="AC Tonnage, LED stock query..."
                    className="input-field" 
                  />
                </div>
              </div>

              <div className="form-group full-width">
                <label htmlFor="message">Detailed Message</label>
                <textarea 
                  id="message"
                  name="message"
                  rows="5"
                  value={formData.message}
                  onChange={handleChange}
                  required
                  placeholder="Explain your appliance model query, branch check, or price offer..."
                  className="input-field"
                ></textarea>
              </div>

              <button type="submit" className="btn btn-primary btn-submit">
                <Send size={18} />
                <span>Send Message</span>
              </button>
            </form>
          )}
        </main>
      </div>

      {/* Mock Map Section */}
      <section className="mock-map-section section-padding">
        <div className="glass-panel text-center map-box">
          <MapPin size={32} className="map-icon" />
          <h3>Visit Our Showrooms in Saddar & DHA Phase 6</h3>
          <p>We are centrally located in Karachi's prime shopping areas with dedicated valet parking slots.</p>
          <div className="map-placeholder-media">
            {/* Simple styling to simulate a maps card */}
            <div className="map-point">
              <h4>📍 Saddar Main Branch</h4>
              <p>Abdullah Haroon Rd, Saddar, Karachi City, Sindh</p>
            </div>
            <div className="map-point">
              <h4>📍 DHA Phase 6 Branch</h4>
              <p>Bukhari Commercial Area, Phase 6, DHA, Karachi</p>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

export default Contact;
