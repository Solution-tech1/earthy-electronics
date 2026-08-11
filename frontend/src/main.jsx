import React from 'react';
import ReactDOM from 'react-dom/client';
import App from './App';
import { CartProvider } from './context/CartContext';
import { ThemeProvider } from './context/ThemeContext';
import { InventoryProvider } from './context/InventoryContext';
import { CRMProvider } from './context/CRMContext';
import './index.css';

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <ThemeProvider>
      <InventoryProvider>
        <CRMProvider>
          <CartProvider>
            <App />
          </CartProvider>
        </CRMProvider>
      </InventoryProvider>
    </ThemeProvider>
  </React.StrictMode>
);
