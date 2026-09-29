/**
 * Number / text formatting for the Proctor module.
 *
 * Calculations always run at full floating-point precision; values are only
 * rounded here, at display / PDF-output time.
 */

/** Precision rules (decimal places) for each displayed quantity. */
export const PRECISION = Object.freeze({
  bulkDensity: 3,
  dryDensity: 3,
  moistureContent: 2,
  mdd: 3,
  omc: 2,
  containerWeight: 2, // container / wet / dry / moisture weights (sample shows 20.00, 80.56 …)
  axisX: 2,
  axisY: 3,
});

/** True for a finite number (rejects NaN, ±Infinity, null, strings). */
export function isFiniteNumber(value) {
  return typeof value === 'number' && Number.isFinite(value);
}

/**
 * Decimal-correct half-up rounding.
 * Uses exponent notation so 1.005 → 1.01 (plain Math.round(x*100)/100 gives 1.00).
 * A tiny epsilon nudge also protects against binary artefacts like 2.1454999999999997.
 */
export function roundTo(value, decimals) {
  if (!isFiniteNumber(value)) return NaN;
  const sign = value < 0 ? -1 : 1;
  const abs = Math.abs(value);
  const shifted = Number(`${abs}e${decimals}`);
  const rounded = Math.round(shifted + shifted * Number.EPSILON);
  return sign * Number(`${rounded}e-${decimals}`);
}

/** Format to a fixed number of decimals; returns '' for non-numbers. */
export function formatFixed(value, decimals) {
  if (!isFiniteNumber(value)) return '';
  const r = roundTo(value, decimals);
  // Avoid "-0.00"
  return (Object.is(r, -0) ? 0 : r).toFixed(decimals);
}

/**
 * Count decimal places of what the user typed ("5506" → 0, "20.5" → 1, "20.50" → 2).
 * Used so entered mould weights / volume are printed "as entered".
 */
export function countDecimals(raw) {
  if (raw === null || raw === undefined) return 0;
  const s = String(raw).trim();
  const dot = s.indexOf('.');
  return dot === -1 ? 0 : s.length - dot - 1;
}

/** Parse a user-entered numeric string. Returns NaN for blank / invalid input. */
export function parseNumber(raw) {
  if (raw === null || raw === undefined) return NaN;
  if (typeof raw === 'number') return raw;
  const s = String(raw).trim().replace(/,/g, '');
  if (s === '' || !/^[-+]?(\d+\.?\d*|\.\d+)$/.test(s)) return NaN;
  return Number(s);
}

/** ISO date "2026-09-26" → "26/09/2026" (the format used on the sample report). */
export function formatDateDMY(iso) {
  if (!iso) return '';
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso);
  return m ? `${m[3]}/${m[2]}/${m[1]}` : String(iso);
}

/** Today's date as ISO yyyy-mm-dd in the browser's local time zone. */
export function todayISO() {
  const d = new Date();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${d.getFullYear()}-${mm}-${dd}`;
}

/** Make a string safe for a file name: "R123/2026-27" → "R123-2026-27". */
export function toSafeFileName(s) {
  return String(s ?? '')
    .trim()
    .replace(/[\\/:*?"<>|\s]+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '');
}

/** Keep only characters that can form a non-negative decimal number while typing. */
export const sanitizeNumeric = (v) => String(v).replace(/[^\d.]/g, '').replace(/(\..*)\./g, '$1');
