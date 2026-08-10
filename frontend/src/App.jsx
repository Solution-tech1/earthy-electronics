import React, { useEffect } from 'react';
import { BrowserRouter as Router, Routes, Route } from 'react-router-dom';
import AOS from 'aos';
import 'aos/dist/aos.css';
import Home from './pages/Home';
import Products from './pages/Products';
import ProductDetail from './pages/ProductDetail';
import About from './pages/About';
import Contact from './pages/Contact';
import SignIn from './pages/SignIn';
import SignUp from './pages/SignUp';
import AdminLogin from './pages/AdminLogin';
import Admin from './pages/Admin';
import CustomerDashboard from './pages/CustomerDashboard';
import Header from './components/Header';
import Footer from './components/Footer';
import Chatbot from './components/Chatbot';

function LocationTracker() {
  useEffect(() => {
    const userStr = localStorage.getItem('user');
    const token = localStorage.getItem('token');
    let user;
    try { user = JSON.parse(userStr); } catch { return; }
    if (!user || user.role !== 'customer') return;

    let watchId;
    if ('geolocation' in navigator) {
      watchId = navigator.geolocation.watchPosition((position) => {
        const { latitude, longitude } = position.coords;
        const API = import.meta.env.VITE_API_BASE || 'http://localhost:5000';
        fetch(`${API}/api/user/location`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
          },
          body: JSON.stringify({ lat: latitude, lng: longitude })
        }).catch(err => console.error('Location sync failed:', err));
      }, (error) => {
        console.error('Geolocation error:', error);
      }, { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 });
    }
    
    return () => {
      if (watchId) navigator.geolocation.clearWatch(watchId);
    };
  }, []);
  return null;
}

function App() {
  useEffect(() => {
    AOS.init({
      once: true,
      offset: 50,
      duration: 600,
      easing: 'ease-out-cubic',
    });
  }, []);

  return (
    <Router>
      <LocationTracker />
      <Routes>
        {/* Admin: no header/footer */}
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin-login" element={<AdminLogin />} />

        {/* Auth: no header/footer  */}
        <Route path="/signin" element={<SignIn />} />
        <Route path="/signup" element={<SignUp />} />

        {/* Public pages with Header & Footer */}
        <Route path="/*" element={
          <>
            <Header />
            <main>
              <Routes>
                <Route path="/"        element={<Home />} />
                <Route path="/products" element={<Products />} />
                <Route path="/product/:id" element={<ProductDetail />} />
                <Route path="/about"   element={<About />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/dashboard" element={<CustomerDashboard />} />
              </Routes>
            </main>
            <Footer />
          </>
        } />
      </Routes>
      <Chatbot />
    </Router>
  );
}

export default App;
