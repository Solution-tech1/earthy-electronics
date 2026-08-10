import React, { createContext, useContext, useState, useEffect } from 'react';

const CartContext = createContext();

export function CartProvider({ children }) {
  const getUserCartKey = () => {
    try {
      const user = JSON.parse(localStorage.getItem('user'));
      return user && user.id ? `earthyElectronicsCart_${user.id}` : 'earthyElectronicsCart_guest';
    } catch {
      return 'earthyElectronicsCart_guest';
    }
  };

  const [cartItems, setCartItems] = useState(() => {
    try {
      const saved = localStorage.getItem(getUserCartKey());
      return saved ? JSON.parse(saved) : [];
    } catch {
      return [];
    }
  });

  const [toast, setToast] = useState({ show: false, message: '' });

  // Update cart state when auth changes (e.g. login/logout)
  useEffect(() => {
    const handleStorageChange = () => {
      try {
        const saved = localStorage.getItem(getUserCartKey());
        setCartItems(saved ? JSON.parse(saved) : []);
      } catch {
        setCartItems([]);
      }
    };
    
    window.addEventListener('storage', handleStorageChange);
    // Custom event to trigger update on same tab
    window.addEventListener('authChange', handleStorageChange);
    
    return () => {
      window.removeEventListener('storage', handleStorageChange);
      window.removeEventListener('authChange', handleStorageChange);
    };
  }, []);

  // Persist cart items
  useEffect(() => {
    localStorage.setItem(getUserCartKey(), JSON.stringify(cartItems));
  }, [cartItems]);

  // Handle toast timeout
  useEffect(() => {
    if (!toast.show) return;
    const timer = setTimeout(() => {
      setToast({ show: false, message: '' });
    }, 2500);
    return () => clearTimeout(timer);
  }, [toast.show]);

  const addToCart = (product) => {
    setCartItems(prev => {
      const existing = prev.find(item => item.id === product.id);
      if (existing) {
        return prev.map(item =>
          item.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
        );
      }
      return [...prev, { ...product, quantity: 1 }];
    });
    setToast({ show: true, message: `"${product.name}" added to cart!` });
  };

  const removeFromCart = (productId) => {
    setCartItems(prev => prev.filter(item => item.id !== productId));
  };

  const updateQuantity = (productId, qty) => {
    if (qty <= 0) {
      removeFromCart(productId);
      return;
    }
    setCartItems(prev =>
      prev.map(item => item.id === productId ? { ...item, quantity: qty } : item)
    );
  };

  const clearCart = () => setCartItems([]);

  const cartCount = cartItems.reduce((sum, item) => sum + item.quantity, 0);
  const cartTotal = cartItems.reduce((sum, item) => {
    return sum + (item.discountPrice || item.price) * item.quantity;
  }, 0);

  return (
    <CartContext.Provider value={{
      cartItems,
      cartCount,
      cartTotal,
      addToCart,
      removeFromCart,
      updateQuantity,
      clearCart,
      toast,
      setToast
    }}>
      {children}
    </CartContext.Provider>
  );
}

export function useCart() {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used inside CartProvider');
  return ctx;
}
