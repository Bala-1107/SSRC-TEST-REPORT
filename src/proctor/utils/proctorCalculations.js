/**
 * Proctor Compaction Test (IS 2720 Part 7) — calculation engine.
 *
 * Pure functions only: no React, no formatting, no rounding.
 * Every function returns NaN when an input is missing/invalid or a division
 * would be invalid, so a bad value can never propagate as a wrong number.
 */
import { isFiniteNumber, parseNumber } from './formatters.js';

export const TRIAL_COUNT = 5;

const allFinite = (...xs) => xs.every(isFiniteNumber);

/** A. Compacted soil W3 = (Mould + compacted soil W2) − (Mould W1)  [g] */
export function calculateCompactedSoilWeight(mouldPlusSoilW2, mouldW1) {
  if (!allFinite(mouldPlusSoilW2, mouldW1)) return NaN;
  return mouldPlusSoilW2 - mouldW1;
}

/** B. Bulk density = Compacted soil W3 / Volume of mould  [g/cm³] */
export function calculateBulkDensity(compactedSoilW3, mouldVolume) {
  if (!allFinite(compactedSoilW3, mouldVolume) || mouldVolume <= 0 || compactedSoilW3 <= 0) return NaN;
  return compactedSoilW3 / mouldVolume;
}

/** C. Wet soil W3 = (Container + wet soil W2) − (Container W1)  [g] */
export function calculateWetSoilWeight(containerPlusWetW2, containerW1) {
  if (!allFinite(containerPlusWetW2, containerW1)) return NaN;
  return containerPlusWetW2 - containerW1;
}

/** D. Dry soil W5 = (Container + dry soil W4) − (Container W1)  [g] */
export function calculateDrySoilWeight(containerPlusDryW4, containerW1) {
  if (!allFinite(containerPlusDryW4, containerW1)) return NaN;
  return containerPlusDryW4 - containerW1;
}

/** E. Weight of moisture = Wet soil W3 − Dry soil W5  [g] */
export function calculateMoistureWeight(wetSoilW3, drySoilW5) {
  if (!allFinite(wetSoilW3, drySoilW5)) return NaN;
  return wetSoilW3 - drySoilW5;
}

/** F. Moisture content = (Weight of moisture / Dry soil W5) × 100  [%] */
export function calculateMoistureContent(moistureWeight, drySoilW5) {
  // Negative moisture (dry heavier than wet) is physically impossible → no value.
  if (!allFinite(moistureWeight, drySoilW5) || drySoilW5 <= 0 || moistureWeight < 0) return NaN;
  return (moistureWeight / drySoilW5) * 100;
}

/** G. Dry density = (Bulk density / (Moisture content + 100)) × 100  [g/cm³] */
export function calculateDryDensity(bulkDensity, moistureContent) {
  if (!allFinite(bulkDensity, moistureContent)) return NaN;
  const denominator = moistureContent + 100;
  if (denominator <= 0) return NaN;
  return (bulkDensity / denominator) * 100;
}

/**
 * Index of the trial with the highest dry density (full precision).
 * Ties: the first (lowest-numbered) trial wins. Returns -1 if no valid trial.
 */
export function findPeakTrialIndex(trialResults) {
  let best = -1;
  trialResults.forEach((t, i) => {
    if (!allFinite(t.dryDensity, t.moistureContent)) return;
    if (best === -1 || t.dryDensity > trialResults[best].dryDensity) best = i;
  });
  return best;
}

/** Maximum Dry Density = highest calculated dry density among the trials. */
export function calculateMDD(trialResults) {
  const i = findPeakTrialIndex(trialResults);
  return i === -1 ? NaN : trialResults[i].dryDensity;
}

/** Optimum Moisture Content = moisture content of THE SAME trial that gives MDD. */
export function calculateOMC(trialResults) {
  const i = findPeakTrialIndex(trialResults);
  return i === -1 ? NaN : trialResults[i].moistureContent;
}

/** Calculate every derived value for one trial from already-parsed numbers. */
export function calculateTrial({ mouldW1, mouldVolume, mouldPlusSoilW2, containerW1, containerPlusWetW2, containerPlusDryW4 }) {
  const compactedSoilW3 = calculateCompactedSoilWeight(mouldPlusSoilW2, mouldW1);
  const bulkDensity = calculateBulkDensity(compactedSoilW3, mouldVolume);
  const wetSoilW3 = calculateWetSoilWeight(containerPlusWetW2, containerW1);
  const drySoilW5 = calculateDrySoilWeight(containerPlusDryW4, containerW1);
  const moistureWeight = calculateMoistureWeight(wetSoilW3, drySoilW5);
  const moistureContent = calculateMoistureContent(moistureWeight, drySoilW5);
  const dryDensity = calculateDryDensity(bulkDensity, moistureContent);
  return {
    mouldW1,
    mouldPlusSoilW2,
    compactedSoilW3,
    mouldVolume,
    bulkDensity,
    containerW1,
    containerPlusWetW2,
    wetSoilW3,
    containerPlusDryW4,
    drySoilW5,
    moistureWeight,
    moistureContent,
    dryDensity,
    complete: allFinite(dryDensity, moistureContent),
  };
}

/**
 * Run the full Proctor calculation from raw form state (strings as typed).
 * @param {import('../proctorModel.js').ProctorFormState} form
 */
export function calculateProctor(form) {
  const mouldW1 = parseNumber(form.mould.weight);
  const mouldVolume = parseNumber(form.mould.volume);

  const trials = form.trials.map((t) =>
    calculateTrial({
      mouldW1,
      mouldVolume,
      mouldPlusSoilW2: parseNumber(t.mouldPlusSoil),
      containerW1: parseNumber(t.containerWeight),
      containerPlusWetW2: parseNumber(t.containerPlusWet),
      containerPlusDryW4: parseNumber(t.containerPlusDry),
    }),
  );

  const peakIndex = findPeakTrialIndex(trials);
  return {
    trials,
    peakIndex,
    mdd: peakIndex === -1 ? NaN : trials[peakIndex].dryDensity,
    omc: peakIndex === -1 ? NaN : trials[peakIndex].moistureContent,
    allComplete: trials.length === TRIAL_COUNT && trials.every((t) => t.complete),
  };
}
