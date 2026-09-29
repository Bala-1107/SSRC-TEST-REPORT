/**
 * Validation for the Proctor form.
 *
 * errors   → block Preview / Download (keyed by field path, e.g. "trials.2.containerPlusDry")
 * warnings → shown to the user but do not block (engineering sanity checks)
 */
import { TRIAL_COUNT } from './proctorCalculations.js';
import { parseNumber, isFiniteNumber, formatFixed, PRECISION } from './formatters.js';

export const MAX_TEXT_LENGTH = 100;

const REQUIRED_INFO = {
  reportNo: 'Report number',
  reportDate: 'Report date',
  clientName: 'Client / Contractor name',
  projectName: 'Project name',
  siteLocation: 'Site location',
  sampleDescription: 'Sample description',
  testingDate: 'Testing date',
};

// Characters the PDF's standard Times font (WinAnsi encoding) can print.
const WIN_ANSI_EXTRAS = '€‚ƒ„…†‡ˆ‰Š‹ŒŽ‘’“”•–—˜™š›œžŸ';
export function findUnprintableChars(text) {
  const bad = new Set();
  for (const ch of String(text ?? '')) {
    const c = ch.codePointAt(0);
    const ok = (c >= 0x20 && c <= 0x7e) || (c >= 0xa0 && c <= 0xff) || WIN_ANSI_EXTRAS.includes(ch);
    if (!ok) bad.add(ch);
  }
  return [...bad];
}

/** Validate one numeric field; returns an error message or null. */
function checkNumber(raw, label, { allowZero = false } = {}) {
  if (raw === undefined || raw === null || String(raw).trim() === '') return `${label} is required.`;
  const n = parseNumber(raw);
  if (!isFiniteNumber(n)) return `${label} must be a valid number.`;
  if (n < 0 || (!allowZero && n === 0)) return `${label} must be greater than zero.`;
  return null;
}

/**
 * @param {import('../proctorModel.js').ProctorFormState} form
 * @param {ReturnType<import('./proctorCalculations.js').calculateProctor>} [results]
 */
export function validateProctorForm(form, results) {
  const errors = {};
  const warnings = [];

  // --- Test information ---------------------------------------------------
  for (const [key, label] of Object.entries(REQUIRED_INFO)) {
    const v = String(form.info[key] ?? '').trim();
    const path = `info.${key}`;
    if (!v) { errors[path] = `${label} is required.`; continue; }
    if (v.length > MAX_TEXT_LENGTH) { errors[path] = `${label} must be ${MAX_TEXT_LENGTH} characters or fewer.`; continue; }
    const bad = findUnprintableChars(v);
    if (bad.length) errors[path] = `${label} contains characters the report font cannot print: ${bad.join(' ')}`;
  }
  if (form.info.testingDate && form.info.reportDate && form.info.testingDate > form.info.reportDate) {
    warnings.push('Testing date is after the report date.');
  }

  // --- Mould (common) -----------------------------------------------------
  const mouldErr = checkNumber(form.mould.weight, 'Mould weight W1');
  if (mouldErr) errors['mould.weight'] = mouldErr;
  const volErr = checkNumber(form.mould.volume, 'Volume of mould');
  if (volErr) errors['mould.volume'] = volErr;
  const mouldW1 = parseNumber(form.mould.weight);

  // --- Trials -------------------------------------------------------------
  if (form.trials.length !== TRIAL_COUNT) errors.trials = `Exactly ${TRIAL_COUNT} trials are required.`;

  form.trials.forEach((t, i) => {
    const n = i + 1;
    const p = (f) => `trials.${i}.${f}`;
    const e1 = checkNumber(t.mouldPlusSoil, `Trial ${n}: Mould + compacted soil W2`);
    const e2 = checkNumber(t.containerWeight, `Trial ${n}: Container W1`);
    const e3 = checkNumber(t.containerPlusWet, `Trial ${n}: Container + wet soil W2`);
    const e4 = checkNumber(t.containerPlusDry, `Trial ${n}: Container + dry soil W4`);
    if (e1) errors[p('mouldPlusSoil')] = e1;
    if (e2) errors[p('containerWeight')] = e2;
    if (e3) errors[p('containerPlusWet')] = e3;
    if (e4) errors[p('containerPlusDry')] = e4;

    const w2 = parseNumber(t.mouldPlusSoil);
    const c1 = parseNumber(t.containerWeight);
    const cw = parseNumber(t.containerPlusWet);
    const cd = parseNumber(t.containerPlusDry);

    if (!e1 && !mouldErr && w2 <= mouldW1)
      errors[p('mouldPlusSoil')] = `Trial ${n}: Mould + compacted soil must be greater than the mould weight (${form.mould.weight} g).`;
    if (!e2 && !e3 && cw <= c1)
      errors[p('containerPlusWet')] = `Trial ${n}: Container + wet soil must be greater than the container weight.`;
    if (!e2 && !e4 && cd <= c1)
      errors[p('containerPlusDry')] = `Trial ${n}: Container + dry soil must be greater than the container weight (dry soil weight cannot be zero).`;
    else if (!e3 && !e4 && cd > cw)
      errors[p('containerPlusDry')] = `Trial ${n}: Dry soil cannot weigh more than wet soil (container + dry > container + wet).`;
  });

  // --- Engineering sanity warnings (non-blocking) -------------------------
  if (results && results.allComplete && Object.keys(errors).length === 0) {
    const { trials, peakIndex } = results;
    if (peakIndex === 0 || peakIndex === trials.length - 1) {
      warnings.push(
        `The highest dry density is in Trial ${peakIndex + 1} (the ${peakIndex === 0 ? 'first' : 'last'} trial), so the curve has not clearly passed its peak. ` +
          'MDD/OMC are reported from the measured points; an additional trial may be advisable.',
      );
    }
    for (let i = 1; i < trials.length; i++) {
      if (!(trials[i].moistureContent > trials[i - 1].moistureContent)) {
        warnings.push('Moisture contents do not increase from Trial 1 to Trial 5. Check the trial order and container readings.');
        break;
      }
    }
    const shown = trials.map((t) => formatFixed(t.dryDensity, PRECISION.dryDensity));
    const peakShown = shown[peakIndex];
    const ties = shown.map((s, i) => (s === peakShown ? i + 1 : null)).filter(Boolean);
    if (ties.length > 1) {
      warnings.push(`Trials ${ties.join(' & ')} have the same dry density to 3 decimals; Trial ${peakIndex + 1} is used as the peak (highest at full precision).`);
    }
  }

  return { errors, warnings, isValid: Object.keys(errors).length === 0 };
}
