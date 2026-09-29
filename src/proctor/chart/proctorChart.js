/**
 * Proctor Compaction Curve — chart model.
 *
 * generateProctorGraph() turns the calculated (moisture, dry density) points into a
 * renderer-agnostic model expressed in TEMPLATE coordinates (PDF points, top-left origin).
 * Both the on-screen SVG (ProctorCurve.jsx) and the PDF writer (generateProctorPDF.js)
 * draw from this one model, so the screen and the report cannot disagree.
 *
 * Axis logic: the empty template already has a printed grid with 6 horizontal
 * intervals and 5.5 vertical intervals. The axis therefore picks the smallest "nice"
 * step (1, 2, 2.5, 5 × 10ⁿ) and a clean start value so that all points fit inside
 * that grid with padding. Exact calculated coordinates are always used for the points;
 * only the tick labels are rounded. For the supplied sample this yields
 * X 3.00 → 13.00 (step 2) and Y 2.000 → 2.300 (step 0.050) — identical to the sample PDF.
 */
import { PROCTOR_TEMPLATE_POSITIONS } from '../pdf/proctorTemplateConfig.js';
import { formatFixed, isFiniteNumber, roundTo, PRECISION } from '../utils/formatters.js';

const CHART = PROCTOR_TEMPLATE_POSITIONS.chart;
const NICE_MULTIPLIERS = [1, 2, 2.5, 5];

/** Ascending list of nice steps ≥ minStep. */
function* niceSteps(minStep) {
  for (let exp = -4; exp <= 6; exp++) {
    for (const m of NICE_MULTIPLIERS) {
      const step = roundTo(m * 10 ** exp, 8);
      if (step >= minStep) yield step;
    }
  }
}

const snap = (v) => roundTo(v, 9); // kill binary noise in tick arithmetic

/**
 * Y axis (dry density): 6 intervals. Start = step multiple at/below the lowest point
 * (Excel-style). Requires ≥ 0.1 step below the lowest point and ≥ 0.8 step above the
 * highest point (room for the data label).
 */
export function computeDensityAxis(values, intervals = CHART.yIntervals) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1e-6);
  const padBottom = 0.1;
  const padTop = 0.8;
  for (const step of niceSteps(Math.max(range / intervals, 0.005))) {
    let start = snap(Math.floor(snap(min / step)) * step);
    if (min - start < padBottom * step) start = snap(start - step);
    if (start < 0 && min >= 0) start = 0;
    const end = snap(start + intervals * step);
    if (end - max >= padTop * step && min - start >= 0) {
      return buildAxis(start, step, intervals);
    }
  }
  throw new Error('Unable to fit density axis');
}

/**
 * X axis (moisture content): 5.5 intervals (the template's printed grid).
 * For the smallest nice step that can hold the data (≥ 0.2 step padding each side),
 * candidate start values are tried in tiers of "cleanliness":
 *   tier 0 – multiples of the step            (0, 2, 4 …)
 *   tier 1 – whole numbers (step ≥ 1) or multiples of step/2   (3, 5, 7 … as in the sample)
 *   tier 2 – multiples of 0.5 (step ≥ 1)
 * and the feasible start that best centres the data (with a small penalty per tier) wins.
 */
export function computeMoistureAxis(values, intervals = CHART.xIntervals) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  const range = Math.max(max - min, 1e-6);
  const pad = 0.2;
  for (const step of niceSteps(Math.max(range / (intervals - 2 * pad), 0.1))) {
    const span = intervals * step;
    const grids = [step, step >= 1 ? 1 : step / 2];
    if (step >= 1) grids.push(0.5);
    let best = null;
    const consider = (start, tier) => {
      const padL = (min - start) / step;
      const padR = (start + span - max) / step;
      // Moisture can't be negative: an axis starting at 0 is allowed even if the
      // first point sits closer than the usual padding.
      const leftOk = padL >= pad || (start === 0 && min > 0);
      if (start < 0 && min >= 0) return;
      if (!leftOk || padR < pad) return;
      const score = Math.abs(padL - padR) + tier * 0.5;
      if (!best || score < best.score - 1e-9) best = { start, score };
    };
    grids.forEach((g, tier) => {
      // (Negative starts only arise from invalid, still-being-typed data; they are allowed so the chart never breaks.)
      const lo = Math.ceil(snap((max + pad * step - span) / g));
      const hi = Math.floor(snap((min - pad * step) / g));
      for (let k = lo; k <= hi; k++) consider(snap(k * g), tier);
    });
    if (min >= 0) consider(0, 0);
    if (best) return buildAxis(best.start, step, intervals);
  }
  throw new Error('Unable to fit moisture axis');
}

function buildAxis(min, step, intervals) {
  const ticks = [];
  for (let i = 0; i <= Math.floor(intervals + 1e-9); i++) ticks.push(snap(min + i * step));
  return { min, max: snap(min + intervals * step), step, intervals, ticks };
}

/**
 * Catmull-Rom → cubic Bézier, reproducing Excel's "smoothed line":
 * inner tangents (P[i+1] − P[i−1]) / 6, end tangents (P1 − P0) / 3.
 * (Verified against the control points of the curve in the sample PDF.)
 */
export function smoothPath(pts) {
  if (pts.length < 2) return { segments: [], d: '' };
  const segments = [];
  for (let i = 0; i < pts.length - 1; i++) {
    const p0 = pts[i];
    const p1 = pts[i + 1];
    const prev = i === 0 ? { x: 2 * p0.x - p1.x, y: 2 * p0.y - p1.y } : pts[i - 1];
    const next = i + 2 < pts.length ? pts[i + 2] : { x: 2 * p1.x - p0.x, y: 2 * p1.y - p0.y };
    const c1 = { x: p0.x + (p1.x - prev.x) / 6, y: p0.y + (p1.y - prev.y) / 6 };
    const c2 = { x: p1.x - (next.x - p0.x) / 6, y: p1.y - (next.y - p0.y) / 6 };
    segments.push({ p0, c1, c2, p1 });
  }
  const f = (n) => n.toFixed(2);
  const d =
    `M ${f(pts[0].x)} ${f(pts[0].y)} ` +
    segments.map((s) => `C ${f(s.c1.x)} ${f(s.c1.y)} ${f(s.c2.x)} ${f(s.c2.y)} ${f(s.p1.x)} ${f(s.p1.y)}`).join(' ');
  return { segments, d };
}

/**
 * Build the complete chart model.
 * @param {Array<{moistureContent:number, dryDensity:number}>} trials calculated trials (any order)
 * @param {number} peakIndex index (into `trials`) of the MDD trial, or -1
 */
export function generateProctorGraph(trials, peakIndex = -1) {
  const { plot, xGridSpacing } = CHART;
  const points = trials
    .map((t, i) => ({ trial: i + 1, index: i, mc: t.moistureContent, dd: t.dryDensity }))
    .filter((p) => isFiniteNumber(p.mc) && isFiniteNumber(p.dd));

  if (points.length === 0) return { plot, empty: true, points: [], xAxis: null, yAxis: null, curve: { d: '', segments: [] } };

  let xAxis;
  let yAxis;
  try {
    xAxis = computeMoistureAxis(points.map((p) => p.mc));
    yAxis = computeDensityAxis(points.map((p) => p.dd));
  } catch {
    // Never let implausible in-progress input break the page.
    return { plot, empty: true, points: [], xAxis: null, yAxis: null, curve: { d: '', segments: [] } };
  }

  const plotW = plot.right - plot.left;
  const plotH = plot.bottom - plot.top;
  const toX = (v) => plot.left + ((v - xAxis.min) / (xAxis.max - xAxis.min)) * plotW;
  const toY = (v) => plot.bottom - ((v - yAxis.min) / (yAxis.max - yAxis.min)) * plotH;

  const xTicks = xAxis.ticks.map((v, i) => ({ value: v, label: formatFixed(v, PRECISION.axisX), x: plot.left + i * xGridSpacing }));
  const yTicks = yAxis.ticks.map((v) => ({ value: v, label: formatFixed(v, PRECISION.axisY), y: toY(v) }));

  // Curve is drawn in moisture order (a Proctor curve is a function of moisture).
  const sorted = [...points].sort((a, b) => a.mc - b.mc);
  const plotted = sorted.map((p) => ({
    ...p,
    x: toX(p.mc),
    y: toY(p.dd),
    label: formatFixed(p.dd, PRECISION.dryDensity),
    isPeak: p.index === peakIndex,
  }));
  const curve = smoothPath(plotted);
  const peak = plotted.find((p) => p.isPeak) || null;

  return { plot, empty: false, xAxis, yAxis, xTicks, yTicks, points: plotted, curve, peak };
}
