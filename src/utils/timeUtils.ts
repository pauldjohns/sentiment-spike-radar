
/**
 * Utility functions for consistent time formatting in Eastern Time
 */

export const formatToEasternTime = (date: Date | string, options?: {
  includeSeconds?: boolean;
  includeTimeZone?: boolean;
  dateStyle?: 'short' | 'medium' | 'long';
}) => {
  const {
    includeSeconds = false,
    includeTimeZone = true,
    dateStyle = 'short'
  } = options || {};

  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  // Format time in Eastern Time
  const timeOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(includeSeconds && { second: '2-digit' })
  };

  const dateOptions: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    month: dateStyle === 'short' ? 'numeric' : dateStyle === 'medium' ? 'short' : 'long',
    day: 'numeric',
    ...(dateStyle !== 'short' && { year: 'numeric' })
  };

  const timeString = dateObj.toLocaleTimeString('en-US', timeOptions);
  const dateString = dateObj.toLocaleDateString('en-US', dateOptions);

  // Determine if we're in EST or EDT
  const timeZoneAbbr = includeTimeZone ? getEasternTimeZoneAbbr(dateObj) : '';

  return `${dateString} ${timeString}${timeZoneAbbr ? ` ${timeZoneAbbr}` : ''}`;
};

export const formatTimeOnly = (date: Date | string, includeSeconds = false) => {
  const dateObj = typeof date === 'string' ? new Date(date) : date;
  
  const options: Intl.DateTimeFormatOptions = {
    timeZone: 'America/New_York',
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
    ...(includeSeconds && { second: '2-digit' })
  };

  return dateObj.toLocaleTimeString('en-US', options);
};

export const getEasternTimeZoneAbbr = (date: Date) => {
  // Create a date in Eastern time to check if DST is active
  const easternDate = new Date(date.toLocaleString("en-US", { timeZone: "America/New_York" }));
  const utcDate = new Date(date.toLocaleString("en-US", { timeZone: "UTC" }));
  
  // Calculate offset (DST vs Standard time)
  const offset = (utcDate.getTime() - easternDate.getTime()) / (1000 * 60 * 60);
  
  // EST is UTC-5, EDT is UTC-4
  return offset === 5 ? 'EST' : 'EDT';
};
