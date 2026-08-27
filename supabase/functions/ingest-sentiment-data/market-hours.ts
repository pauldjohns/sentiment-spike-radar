
const TIME_WINDOW_MAP: Record<string, string> = {
  '09:00': 'pre_market',
  '09:30': 'market_open', 
  '10:00': 'plus_30_min',
  '10:30': 'plus_1_hr'
};

export function determineTimeWindow(runTime?: string, timeWindow?: string): string {
  let currentTimeWindow = timeWindow;
  
  if (runTime && TIME_WINDOW_MAP[runTime]) {
    currentTimeWindow = TIME_WINDOW_MAP[runTime];
  } else if (!currentTimeWindow) {
    // Default based on current ET time
    const now = new Date();
    const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
    const hour = etNow.getHours();
    const minute = etNow.getMinutes();
    const timeStr = `${hour.toString().padStart(2, '0')}:${minute.toString().padStart(2, '0')}`;
    
    currentTimeWindow = TIME_WINDOW_MAP[timeStr] || 'market_hours';
  }
  
  console.log(`📊 Time Window: ${currentTimeWindow} (runTime: ${runTime})`);
  return currentTimeWindow;
}

export function validateMarketHours(isManual: boolean, isAutomated: boolean): { allowed: boolean; reason?: string } {
  const now = new Date();
  const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const day = etNow.getDay(); // 0 = Sunday, 6 = Saturday
  const hour = etNow.getHours();
  const minute = etNow.getMinutes();
  const currentTime = hour * 60 + minute;
  
  const preMarketStart = 9 * 60; // 9:00 AM ET
  const marketOpen = 9 * 60 + 30; // 9:30 AM ET  
  const marketClose = 16 * 60; // 4:00 PM ET
  
  const isWeekend = day === 0 || day === 6;
  const isPreMarket = currentTime >= preMarketStart && currentTime < marketOpen;
  const isMarketHours = currentTime >= marketOpen && currentTime < marketClose;
  const isValidTradingTime = isPreMarket || isMarketHours;

  // Log current time for debugging
  console.log(`⏰ Current ET: ${etNow.toISOString()}, Day: ${day}, Hour: ${hour}, Minute: ${minute}`);
  console.log(`📊 Market Status: Weekend: ${isWeekend}, PreMarket: ${isPreMarket}, MarketHours: ${isMarketHours}`);

  // Allow processing during valid trading times or if manual/automated override
  if (!isManual && !isAutomated && (!isValidTradingTime || isWeekend)) {
    return {
      allowed: false,
      reason: `Outside trading hours (weekday ${preMarketStart/60}:00 AM - ${marketClose/60}:00 PM ET) - skipping analysis`
    };
  }

  return { allowed: true };
}

export function isMarketOpen(): boolean {
  const now = new Date();
  const etNow = new Date(now.toLocaleString("en-US", {timeZone: "America/New_York"}));
  const day = etNow.getDay();
  const hour = etNow.getHours();
  const minute = etNow.getMinutes();
  const currentTime = hour * 60 + minute;
  
  // Weekend check
  if (day === 0 || day === 6) return false;
  
  // Market hours: 9:30 AM - 4:00 PM ET
  const marketOpen = 9 * 60 + 30; // 9:30 AM
  const marketClose = 16 * 60; // 4:00 PM
  
  return currentTime >= marketOpen && currentTime < marketClose;
}
