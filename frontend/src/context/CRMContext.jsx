import React, { createContext, useState, useEffect, useContext } from 'react';

const CRMContext = createContext();

export function CRMProvider({ children }) {
  // Default Analytics Data for Live Site
  const defaultStats = {
    totalSales: 0,
    revenue: 0,
    activeUsers: 0,
    conversionRate: 0
  };

  const defaultBarChart = [
    { name: 'Jan', revenue: 0 },
    { name: 'Feb', revenue: 0 },
    { name: 'Mar', revenue: 0 },
    { name: 'Apr', revenue: 0 },
    { name: 'May', revenue: 0 },
    { name: 'Jun', revenue: 0 },
  ];

  const defaultPieChart = [
    { name: 'ACs', value: 0 },
    { name: 'Fridges', value: 0 },
    { name: 'TVs', value: 0 },
    { name: 'Washing Machines', value: 0 },
  ];

  const defaultUsers = [];

  const [stats, setStats] = useState(() => {
    const saved = localStorage.getItem('crmStats_v2');
    return saved ? JSON.parse(saved) : defaultStats;
  });

  const [barChart, setBarChart] = useState(() => {
    const saved = localStorage.getItem('crmBarChart_v2');
    return saved ? JSON.parse(saved) : defaultBarChart;
  });

  const [pieChart, setPieChart] = useState(() => {
    const saved = localStorage.getItem('crmPieChart_v2');
    return saved ? JSON.parse(saved) : defaultPieChart;
  });

  const [users, setUsers] = useState(() => {
    const saved = localStorage.getItem('crmUsers_v2');
    return saved ? JSON.parse(saved) : defaultUsers;
  });

  // Track the actual admin session time and location (using browser geolocation)
  useEffect(() => {
    let sessionTimer;
    // Simulate real-time session increment for active users
    sessionTimer = setInterval(() => {
      setUsers(prev => {
        const updated = prev.map(u => u.status === 'Active' ? { ...u, sessionTime: u.sessionTime + 1 } : u);
        localStorage.setItem('crmUsers_v2', JSON.stringify(updated));
        return updated;
      });
    }, 60000); // every minute
    return () => clearInterval(sessionTimer);
  }, []);

  const updateStats = (key, value) => {
    setStats(prev => {
      const updated = { ...prev, [key]: Number(value) };
      localStorage.setItem('crmStats_v2', JSON.stringify(updated));
      return updated;
    });
  };

  const updateBarChart = (newChartData) => {
    setBarChart(newChartData);
    localStorage.setItem('crmBarChart_v2', JSON.stringify(newChartData));
  };

  const updatePieChart = (newChartData) => {
    setPieChart(newChartData);
    localStorage.setItem('crmPieChart_v2', JSON.stringify(newChartData));
  };

  const recordNewSale = (amount) => {
    setStats(prev => {
      const updated = { ...prev, totalSales: prev.totalSales + 1, revenue: prev.revenue + amount };
      localStorage.setItem('crmStats_v2', JSON.stringify(updated));
      return updated;
    });
  };

  return (
    <CRMContext.Provider value={{ stats, barChart, pieChart, users, updateStats, updateBarChart, updatePieChart, recordNewSale }}>
      {children}
    </CRMContext.Provider>
  );
}

export const useCRM = () => useContext(CRMContext);
