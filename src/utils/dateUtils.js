/**
 * Local date formatting helpers (YYYY-MM-DD in the user's local timezone).
 * Avoids UTC midnight shifts when comparing daily reading streaks, postponements, or notifications.
 */

/**
 * Format a Date object as YYYY-MM-DD in local time.
 * @param {Date} [date=new Date()]
 * @returns {string}
 */
export function getLocalIsoDate(date = new Date()) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const day = String(date.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Convert an ISO timestamp or date-like string to local YYYY-MM-DD.
 * If already a plain YYYY-MM-DD string, returns it as-is.
 * @param {string|Date|null|undefined} value
 * @returns {string}
 */
export function toLocalIsoDate(value) {
  if (!value) return '';
  if (typeof value === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return value;
  }
  const d = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(d.getTime())) return '';
  return getLocalIsoDate(d);
}
