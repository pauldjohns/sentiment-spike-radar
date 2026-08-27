
import { useState, useEffect } from 'react';

export const useMarketHours = () => {
  const [isMarketOpen, setIsMarketOpen] = useState(false);

  const getMarketStatus = () => {
    const now = new Date();
    const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    
    const day = easternTime.getDay(); // 0 = Sunday, 6 = Saturday
    const hour = easternTime.getHours();
    const minute = easternTime.getMinutes();
    const timeInMinutes = hour * 60 + minute;
    
    // Market is closed on weekends
    if (day === 0 || day === 6) {
      return {
        status: 'closed',
        reason: 'Weekend',
        nextOpen: 'Monday 9:30 AM ET'
      };
    }
    
    // Regular trading hours: 9:30 AM - 4:00 PM ET
    const marketOpen = 9 * 60 + 30; // 9:30 AM
    const marketClose = 16 * 60; // 4:00 PM
    
    if (timeInMinutes >= marketOpen && timeInMinutes < marketClose) {
      return {
        status: 'open',
        reason: 'Regular Trading Hours',
        nextClose: '4:00 PM ET'
      };
    } else if (timeInMinutes < marketOpen) {
      return {
        status: 'closed',
        reason: 'Pre-Market',
        nextOpen: '9:30 AM ET'
      };
    } else {
      return {
        status: 'closed',
        reason: 'After Hours',
        nextOpen: 'Tomorrow 9:30 AM ET'
      };
    }
  };

  useEffect(() => {
    const checkMarketHours = () => {
      const now = new Date();
      const easternTime = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
      
      const day = easternTime.getDay(); // 0 = Sunday, 6 = Saturday
      const hour = easternTime.getHours();
      const minute = easternTime.getMinutes();
      const timeInMinutes = hour * 60 + minute;
      
      // Market is closed on weekends
      if (day === 0 || day === 6) {
        setIsMarketOpen(false);
        return;
      }
      
      // Regular trading hours: 9:30 AM - 4:00 PM ET
      const marketOpen = 9 * 60 + 30; // 9:30 AM
      const marketClose = 16 * 60; // 4:00 PM
      
      setIsMarketOpen(timeInMinutes >= marketOpen && timeInMinutes < marketClose);
    };

    // Check immediately
    checkMarketHours();
    
    // Check every minute
    const interval = setInterval(checkMarketHours, 60000);
    
    return () => clearInterval(interval);
  }, []);

  return { isMarketOpen, getMarketStatus };
};
