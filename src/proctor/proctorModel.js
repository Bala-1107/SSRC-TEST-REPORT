/**
 * Proctor module data model: form state shape, row definitions, sample data.
 *
 * All user inputs are kept as the strings the user typed, so that
 *  - inputs stay fully controlled (no "5506" → 5506 → "5506.0" surprises), and
 *  - mould weights / volume can be printed with the precision "as entered".
 */
import { TRIAL_COUNT } from './utils/proctorCalculations.js';
import { PRECISION, countDecimals, formatFixed, todayISO } from './utils/formatters.js';

/**
 * @typedef {Object} ProctorTrialInput
 * @property {string} mouldPlusSoil     Mould wt + Compacted soil W2 (g)
 * @property {string} containerWeight   wt of the container W1 (g)
 * @property {string} containerPlusWet  wt of the container + wet soil sample W2 (g)
 * @property {string} containerPlusDry  wt of the container + dry soil sample W4 (g)
 *
 * @typedef {Object} ProctorFormState
 * @property {{reportNo:string, reportDate:string, clientName:string, projectName:string,
 *             siteLocation:string, sampleDescription:string, testingDate:string}} info
 * @property {{weight:string, volume:string}} mould   Common to all five trials
 * @property {ProctorTrialInput[]} trials             Exactly five
 */

export const TEST_TYPE = 'Proctor Compaction Test';
export const TEST_METHOD = 'IS 2720 Part 7';
/** Printed on the template before the editable part of the report number. */
export const REPORT_NO_PREFIX = 'DERC/';

export const emptyTrial = () => ({ mouldPlusSoil: '', containerWeight: '', containerPlusWet: '', containerPlusDry: '' });

/** @returns {ProctorFormState} */
export function createEmptyForm() {
  return {
    info: {
      reportNo: '',
      reportDate: todayISO(),
      clientName: '',
      projectName: '',
      siteLocation: '',
      sampleDescription: '',
      testingDate: todayISO(),
    },
    mould: { weight: '', volume: '' },
    trials: Array.from({ length: TRIAL_COUNT }, emptyTrial),
  };
}

/** The values from "Proctor test sample data sheet.pdf" — the mandatory test case. */
export const SAMPLE_FORM = Object.freeze({
  info: {
    reportNo: 'R123/2026-27',
    reportDate: '2026-09-28',
    clientName: 'ABC Pvt Ltd',
    projectName: 'School Building',
    siteLocation: 'AVADI',
    sampleDescription: 'Hill Earth',
    testingDate: '2026-09-26',
  },
  mould: { weight: '5506', volume: '2297' },
  trials: [
    { mouldPlusSoil: '10436', containerWeight: '20.00', containerPlusWet: '104.00', containerPlusDry: '100.56' },
    { mouldPlusSoil: '10732', containerWeight: '20.00', containerPlusWet: '126.00', containerPlusDry: '119.96' },
    { mouldPlusSoil: '10992', containerWeight: '21.00', containerPlusWet: '108.00', containerPlusDry: '101.21' },
    { mouldPlusSoil: '10924', containerWeight: '23.00', containerPlusWet: '112.00', containerPlusDry: '103.54' },
    { mouldPlusSoil: '10795', containerWeight: '23.00', containerPlusWet: '114.00', containerPlusDry: '103.65' },
  ],
});

export const cloneForm = (f) => JSON.parse(JSON.stringify(f));

/**
 * The 13 rows of the trial table, in template order.
 *  kind: 'common' = entered once (mould section), 'input' = entered per trial, 'calc' = read-only.
 *  format(trialResult, trialInput, form) → display string ('' when not computable).
 * The same definitions drive the web table AND the PDF overlay, so they cannot drift apart.
 */
const g2 = (v) => formatFixed(v, PRECISION.containerWeight);
export const TABLE_ROWS = [
  { key: 'mouldW1', label: 'Mould wt W1', unit: 'g', kind: 'common',
    format: (r, _t, f) => formatFixed(r.mouldW1, countDecimals(f.mould.weight)) },
  { key: 'mouldPlusSoilW2', label: 'Mould wt + Compacted soil W2', unit: 'g', kind: 'input', field: 'mouldPlusSoil',
    format: (r, t) => formatFixed(r.mouldPlusSoilW2, countDecimals(t.mouldPlusSoil)) },
  { key: 'compactedSoilW3', label: 'Compacted soil wt W3', unit: 'g', kind: 'calc',
    format: (r, t, f) => formatFixed(r.compactedSoilW3, Math.max(countDecimals(t.mouldPlusSoil), countDecimals(f.mould.weight))) },
  { key: 'mouldVolume', label: 'Volume of Mould', unit: 'cm³', kind: 'common',
    format: (r, _t, f) => formatFixed(r.mouldVolume, countDecimals(f.mould.volume)) },
  { key: 'bulkDensity', label: 'Bulk density', unit: 'g/cm³', kind: 'calc',
    format: (r) => formatFixed(r.bulkDensity, PRECISION.bulkDensity) },
  { key: 'containerW1', label: 'wt of the container W1', unit: 'g', kind: 'input', field: 'containerWeight',
    format: (r) => g2(r.containerW1) },
  { key: 'containerPlusWetW2', label: 'wt of the container + wet soil sample W2', unit: 'g', kind: 'input', field: 'containerPlusWet',
    format: (r) => g2(r.containerPlusWetW2) },
  { key: 'wetSoilW3', label: 'wt of wet soil sample W3', unit: 'g', kind: 'calc',
    format: (r) => g2(r.wetSoilW3) },
  { key: 'containerPlusDryW4', label: 'wt of the container + dry soil sample W4', unit: 'g', kind: 'input', field: 'containerPlusDry',
    format: (r) => g2(r.containerPlusDryW4) },
  { key: 'drySoilW5', label: 'wt of dry soil sample W5', unit: 'g', kind: 'calc',
    format: (r) => g2(r.drySoilW5) },
  { key: 'moistureWeight', label: 'Weight of Moisture', unit: 'g', kind: 'calc',
    format: (r) => g2(r.moistureWeight) },
  { key: 'moistureContent', label: 'Moisture Content', unit: '%', kind: 'calc', emphasis: true,
    format: (r) => formatFixed(r.moistureContent, PRECISION.moistureContent) },
  { key: 'dryDensity', label: 'Dry Density', unit: 'g/cm³', kind: 'calc', emphasis: true,
    format: (r) => formatFixed(r.dryDensity, PRECISION.dryDensity) },
];
