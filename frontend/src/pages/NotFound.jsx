import React from 'react';
import { Link } from 'react-router-dom';
import { Search, Home, ArrowLeft } from 'lucide-react';
import './NotFound.css';

const NotFound = () => {
  return (
    <div className="notfound-container">
      <div className="notfound-content">
        <div className="notfound-illustration">
          <div className="notfound-404">404</div>
          <Search className="notfound-icon" size={64} />
        </div>
        <h1>Oops! Page Not Found</h1>
        <p>The page you're looking for doesn't exist, has been moved, or is temporarily unavailable.</p>
        
        <div className="notfound-actions">
          <button className="btn btn-outline" onClick={() => window.history.back()}>
            <ArrowLeft size={18} /> Go Back
          </button>
          <Link to="/" className="btn btn-navy">
            <Home size={18} /> Back to Home
          </Link>
        </div>
      </div>
    </div>
  );
};

export default NotFound;
