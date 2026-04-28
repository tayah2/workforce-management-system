/**
 * Format an ISO date string into a human-readable UK date.
 * e.g. "2026-04-28T09:30:00Z" → "28 Apr 2026"
 *
 * @param {string|null|undefined} iso
 * @returns {string}
 */
export function formatDate(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });
}

/**
 * Format an ISO date string to time only.
 * e.g. "2026-04-28T09:30:00Z" → "09:30"
 *
 * @param {string|null|undefined} iso
 * @returns {string}
 */
export function formatTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

/**
 * Format an ISO datetime string to date + time.
 * e.g. "2026-04-28T09:30:00Z" → "28 Apr 2026 09:30"
 *
 * @param {string|null|undefined} iso
 * @returns {string}
 */
export function formatDateTime(iso) {
  if (!iso) return '-';
  const d = new Date(iso);
  if (isNaN(d.getTime())) return '-';
  return `${formatDate(iso)} ${formatTime(iso)}`;
}

/**
 * Format a number as UK currency.
 * e.g. 12.5 → "£12.50"
 *
 * @param {number|null|undefined} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount === null || amount === undefined || isNaN(amount)) return '£0.00';
  return `£${Number(amount).toFixed(2)}`;
}

/**
 * Format a decimal hours value to a human-readable string.
 * e.g. 7.5 → "7.5 hrs"
 *
 * @param {number|null|undefined} h
 * @returns {string}
 */
export function formatHours(h) {
  if (h === null || h === undefined || isNaN(h)) return '0 hrs';
  const rounded = Math.round(Number(h) * 100) / 100;
  return `${rounded} hrs`;
}

/**
 * Returns initials from a full name string.
 * e.g. "Jane Smith" → "JS"
 *
 * @param {string} name
 * @returns {string}
 */
export function getInitials(name) {
  if (!name) return '?';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0][0].toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

/**
 * Format a streak count with appropriate label.
 * e.g. 5 → "5 days"
 *
 * @param {number} days
 * @returns {string}
 */
export function formatStreak(days) {
  if (!days) return '0 days';
  return `${days} ${days === 1 ? 'day' : 'days'}`;
}
