import React, { createContext, useState, useEffect, useContext } from 'react';

const InventoryContext = createContext();

export function InventoryProvider({ children }) {
  const [inventory, setInventory] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadInventory = async () => {
      const saved = localStorage.getItem('demoInventory_v2');
      if (saved) {
        setInventory(JSON.parse(saved));
        setLoading(false);
      } else {
        try {
          const res = await fetch('/data/products.json');
          const resData = await res.json();
          const itemsArray = Array.isArray(resData) ? resData : resData.data || [];
          // Seed inventory with a default stock if not present, e.g., random between 3 and 15
          // or use actual stock if available.
          const seededData = itemsArray.map(p => ({
            ...p,
            stock: p.stock !== undefined ? p.stock : Math.floor(Math.random() * 12) + 3
          }));
          setInventory(seededData);
          localStorage.setItem('demoInventory_v2', JSON.stringify(seededData));
        } catch (error) {
          console.error("Failed to load products for inventory", error);
        } finally {
          setLoading(false);
        }
      }
    };
    loadInventory();
  }, []);

  const updateStock = (productId, newStock) => {
    const updated = inventory.map(p => 
      p.id === productId ? { ...p, stock: newStock } : p
    );
    setInventory(updated);
    localStorage.setItem('demoInventory_v2', JSON.stringify(updated));
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
