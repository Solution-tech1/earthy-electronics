import React, { createContext, useState, useEffect, useContext } from 'react';

const ThemeContext = createContext();

export function ThemeProvider({ children }) {
  const [themeConfig, setThemeConfig] = useState(() => {
    const saved = localStorage.getItem('themeConfig');
    return saved ? JSON.parse(saved) : {
      primaryColor: '#065f46',
      secondaryColor: '#fb923c',
      cardStyle: 'Premium Glassmorphism',
      buttonDesign: 'Slightly Rounded (Default)',
      typography: 'Outfit (Modern UI)',
      storeName: 'EarthyElectronics',
      contactPhone: '+92 300 1234567',
      footerAbout: "Pakistan's premium destination for top-quality home appliances and electronics."
    };
  });

  useEffect(() => {
    localStorage.setItem('themeConfig', JSON.stringify(themeConfig));
    
    // Apply CSS Variables globally to the root element
    const root = document.documentElement;
    root.style.setProperty('--primary-color', themeConfig.primaryColor);
    root.style.setProperty('--secondary-color', themeConfig.secondaryColor);
    
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
      root.style.setProperty('--card-bg', '#ffffff');
      root.style.setProperty('--card-border', '1px solid rgba(0,0,0,0.04)');
    } else if (themeConfig.cardStyle.includes('Minimalist')) {
      root.style.setProperty('--card-radius', '0px');
      root.style.setProperty('--card-shadow', 'none');
      root.style.setProperty('--card-bg', '#ffffff');
      root.style.setProperty('--card-border', '1px solid #e2e8f0');
    } else if (themeConfig.cardStyle.includes('Sharp')) {
      root.style.setProperty('--card-radius', '4px');
      root.style.setProperty('--card-shadow', '0 4px 6px rgba(0,0,0,0.1)');
      root.style.setProperty('--card-bg', '#ffffff');
      root.style.setProperty('--card-border', '1px solid #cbd5e1');
    } else {
      // Glassmorphism default
      root.style.setProperty('--card-radius', '16px');
      root.style.setProperty('--card-shadow', '0 8px 32px rgba(0,0,0,0.03)');
      root.style.setProperty('--card-bg', 'rgba(255, 255, 255, 0.7)');
      root.style.setProperty('--card-border', '1px solid rgba(255,255,255,0.4)');
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
