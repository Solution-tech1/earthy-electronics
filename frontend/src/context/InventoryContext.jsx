import React, { createContext, useState, useEffect, useContext } from 'react';

const InventoryContext = createContext();

export function InventoryProvider({ children }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  const loadInventory = async () => {
    try {
      const res = await fetch('http://localhost:5000/api/products');
      const resData = await res.json();
      const itemsArray = Array.isArray(resData) ? resData : resData.data || [];
      setInventory(itemsArray);
    } catch (error) {
      console.error("Failed to load products for inventory", error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadInventory();
  }, []);

  const updateStock = async (productId, newStock) => {
    try {
      const token = localStorage.getItem('token');
      await fetch(`http://localhost:5000/api/admin/products/${productId}/stock`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          ...(token && { Authorization: `Bearer ${token}` })
        },
        body: JSON.stringify({ stock: newStock })
      });
      loadInventory(); // refresh
      
      if (newStock <= 5) {
         alert(`LOW STOCK WARNING: Product ID ${productId} is now at ${newStock} items.`);
      }
    } catch (err) {
      console.error("Failed to update stock", err);
    }
  };

  const deductStock = (productId, amount) => {
    const updated = inventory.map(p => {
      if (p.id === productId) {
        const newStock = Math.max(0, p.stock - amount);
        // Dispatch event for email alert if stock drops to <= 5
        if (newStock <= 5 && p.stock > 5) {
          window.dispatchEvent(new CustomEvent('lowStockAlert', { detail: { ...p, stock: newStock } }));
        }
        return { ...p, stock: newStock };
      }
      return p;
    });
    setInventory(updated);
    localStorage.setItem('demoInventory_v2', JSON.stringify(updated));
  };

  return (
    <InventoryContext.Provider value={{ inventory, loading, updateStock, deductStock }}>
      {children}
    </InventoryContext.Provider>
  );
}

export const useInventory = () => useContext(InventoryContext);
