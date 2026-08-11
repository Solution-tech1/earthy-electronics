import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeConfig, setThemeConfig] = useState(() => {
    const saved = localStorage.getItem('themeConfig_v2');
    return saved ? JSON.parse(saved) : {
      primaryColor: '#065f46',
      secondaryColor: '#fb923c',
      cardStyle: 'Premium Glassmorphism',
      buttonDesign: 'Slightly Rounded (Default)',
      typography: 'Outfit (Modern UI)',
      storeName: 'EarthyElectronics',
      contactPhone: '+92 300 1234567',
      footerAbout: "Pakistan's premium destination for top-quality home appliances and electronics.",
      darkMode: false,
      heroHeading: 'Premium Appliances for Your Modern Home',
      heroSubtext: 'Discover our exclusive collection of energy-efficient electronics.',
      promoText: 'FREE NATIONWIDE DELIVERY ON ALL PRE-PAID ORDERS!',
      promoActive: true,
      heroSlides: [
        {
          bgImage: 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?q=80&w=2000&auto=format&fit=crop',
          title: "Pakistan's #1 Home Appliances Store",
          desc: 'Authorized dealer of Haier, Dawlance, Gree & Kenwood. Get the best home appliances with official warranty at the most competitive prices in Karachi.',
          offer: 'Authorized Dealer'
        },
        {
          bgImage: 'https://images.unsplash.com/photo-1615874959474-d609969a20ed?q=80&w=2000&auto=format&fit=crop',
          title: 'Stay Cool with DC Inverter ACs',
          desc: 'Save up to 60% on electricity bills with our premium DC Inverter Air Conditioners. Available in 1 ton, 1.5 ton and 2 ton with free installation in Karachi.',
          offer: 'Up to 15% OFF'
        },
        {
          bgImage: 'https://images.unsplash.com/photo-1593784991095-a205069470b6?q=80&w=2000&auto=format&fit=crop',
          title: 'Smart 4K LED TVs',
          desc: 'Upgrade your entertainment experience with our premium Smart Android LED TVs from top brands like Samsung, TCL and Haier.',
          offer: 'Home Entertainment'
        },
        {
          bgImage: 'https://images.unsplash.com/photo-1626806787461-102c1bfaaea1?q=80&w=2000&auto=format&fit=crop',
          title: 'Smart Washing Machines & Fridges',
          desc: 'Explore our huge range of fully automatic washing machines, no-frost refrigerators and deep freezers. Get free delivery on orders above Rs. 80,000.',
          offer: 'Free Delivery'
        }
      ]
    };
  });

  useEffect(() => {
    localStorage.setItem('themeConfig_v2', JSON.stringify(themeConfig));
    
    // Apply CSS Variables globally to the root element
    const root = document.documentElement;
    root.style.setProperty('--primary-color', themeConfig.primaryColor);
    root.style.setProperty('--secondary-color', themeConfig.secondaryColor);
    
    // Dark Mode logic
    if (themeConfig.darkMode) {
      document.body.classList.add('dark-mode');
    } else {
      document.body.classList.remove('dark-mode');
    }

    // Typography logic
    if (themeConfig.typography.includes('Inter')) {
      root.style.setProperty('--font-family', "'Inter', sans-serif");
    } else if (themeConfig.typography.includes('Playfair')) {
      root.style.setProperty('--font-family', "'Playfair Display', serif");
    } else {
      root.style.setProperty('--font-family', "'Outfit', sans-serif");
    }

    // Card Style logic
    if (themeConfig.cardStyle.includes('Rounded')) {
      root.style.setProperty('--card-radius', '24px');
      root.style.setProperty('--card-shadow', '0 8px 24px rgba(0,0,0,0.06)');
      root.style.setProperty('--card-bg', themeConfig.darkMode ? '#1e293b' : '#ffffff');
      root.style.setProperty('--card-border', '1px solid rgba(0,0,0,0.04)');
    } else if (themeConfig.cardStyle.includes('Minimalist')) {
      root.style.setProperty('--card-radius', '0px');
      root.style.setProperty('--card-shadow', 'none');
      root.style.setProperty('--card-bg', themeConfig.darkMode ? '#0f172a' : '#ffffff');
      root.style.setProperty('--card-border', themeConfig.darkMode ? '1px solid #334155' : '1px solid #e2e8f0');
    } else if (themeConfig.cardStyle.includes('Sharp')) {
      root.style.setProperty('--card-radius', '4px');
      root.style.setProperty('--card-shadow', '0 4px 6px rgba(0,0,0,0.1)');
      root.style.setProperty('--card-bg', themeConfig.darkMode ? '#1e293b' : '#ffffff');
      root.style.setProperty('--card-border', themeConfig.darkMode ? '1px solid #475569' : '1px solid #cbd5e1');
    } else {
      // Glassmorphism default
      root.style.setProperty('--card-radius', '16px');
      root.style.setProperty('--card-shadow', '0 8px 32px rgba(0,0,0,0.03)');
      root.style.setProperty('--card-bg', themeConfig.darkMode ? 'rgba(30, 41, 59, 0.7)' : 'rgba(255, 255, 255, 0.7)');
      root.style.setProperty('--card-border', themeConfig.darkMode ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(255,255,255,0.4)');
    }

    // Button Design logic
    if (themeConfig.buttonDesign.includes('Pill')) {
      root.style.setProperty('--btn-radius', '9999px');
    } else if (themeConfig.buttonDesign.includes('Square')) {
      root.style.setProperty('--btn-radius', '4px');
    } else {
      root.style.setProperty('--btn-radius', '8px');
    }
    
  }, [themeConfig]);

  const updateTheme = (key, value) => {
    setThemeConfig(prev => ({ ...prev, [key]: value }));
  };

  return (
    <ThemeContext.Provider value={{ themeConfig, updateTheme }}>
      {children}
    </ThemeContext.Provider>
  );
}

export const useTheme = () => useContext(ThemeContext);
