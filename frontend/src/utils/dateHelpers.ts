/**
 * Formats a date as YYYY-MM-DD in the user's local timezone.
 * This ensures that a date intended as "May 16th" is always treated as "May 16th"
 * regardless of UTC offsets.
 */
export const toLocalISOString = (date: Date | string): string => {
  const d = typeof date === 'string' ? new Date(date) : date;
  if (isNaN(d.getTime())) return '';
  
  // If it's a string from the backend that looks like "2026-05-16T00:00:00.000Z",
  // we want to extract the date part WITHOUT timezone conversion if possible, 
  // OR treat it as local midnight.
  
  if (typeof date === 'string' && date.includes('T')) {
    // If it has a T, it's likely a full ISO string. 
    // To prevent the "previous day" bug, we extract the date part directly.
    return date.split('T')[0];
  }

  const year = d.getFullYear();
  const month = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

/**
 * Compares two dates (can be Date objects or ISO strings) based ONLY on the calendar day.
 */
export const isSameDayLocal = (date1: Date | string, date2: Date | string): boolean => {
  return toLocalISOString(date1) === toLocalISOString(date2);
};

/**
 * Parses a date string from the backend into a local Date object at midnight.
 * Prevents the "previous day" shift.
 */
export const parseAsLocalMidnight = (dateStr: string): Date => {
  const [year, month, day] = dateStr.split('T')[0].split('-').map(Number);
  return new Date(year, month - 1, day);
};
