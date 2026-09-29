import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { PDFDocument } from 'pdf-lib';
import {
  calculateCompactedSoilWeight, calculateBulkDensity, calculateWetSoilWeight, calculateDrySoilWeight,
  calculateMoistureWeight, calculateMoistureContent, calculateDryDensity, calculateMDD, calculateOMC,
  calculateProctor,
} from '../utils/proctorCalculations.js';
import { roundTo, formatFixed, parseNumber, countDecimals, formatDateDMY } from '../utils/formatters.js';
import { validateProctorForm, findUnprintableChars } from '../utils/proctorValidation.js';
import { computeDensityAxis, computeMoistureAxis, generateProctorGraph } from '../chart/proctorChart.js';
import { SAMPLE_FORM, TABLE_ROWS, cloneForm, createEmptyForm } from '../proctorModel.js';
import { generateProctorPDF, getProctorFileName } from '../pdf/generateProctorPDF.js';

const sample = () => cloneForm(SAMPLE_FORM);

describe('formula examples from the specification', () => {
  it('A–G', () => {
    expect(calculateCompactedSoilWeight(10436, 5506)).toBe(4930);
    expect(formatFixed(calculateBulkDensity(4930, 2297), 3)).toBe('2.146');
    expect(calculateWetSoilWeight(104, 20)).toBe(84);
    expect(formatFixed(calculateDrySoilWeight(100.56, 20), 2)).toBe('80.56');
    expect(formatFixed(calculateMoistureWeight(84, 80.56), 2)).toBe('3.44');
    expect(formatFixed(calculateMoistureContent(3.44, 80.56), 2)).toBe('4.27');
    expect(formatFixed(calculateDryDensity(4930 / 2297, (3.44 / 80.56) * 100), 3)).toBe('2.058');
  });
  it('guards invalid division', () => {
    expect(calculateBulkDensity(4930, 0)).toBeNaN();
    expect(calculateMoistureContent(3, 0)).toBeNaN();
    expect(calculateCompactedSoilWeight(NaN, 5506)).toBeNaN();
  });
});

describe('mandatory sample test case (Proctor test sample data sheet.pdf)', () => {
  const r = calculateProctor(sample());
  const col = (key) => r.trials.map((t, i) => TABLE_ROWS.find((row) => row.key === key).format(t, SAMPLE_FORM.trials[i], SAMPLE_FORM));

  it('reproduces every row of the completed sample table', () => {
    expect(col('mouldW1')).toEqual(['5506', '5506', '5506', '5506', '5506']);
    expect(col('mouldPlusSoilW2')).toEqual(['10436', '10732', '10992', '10924', '10795']);
    expect(col('compactedSoilW3')).toEqual(['4930', '5226', '5486', '5418', '5289']);
    expect(col('mouldVolume')).toEqual(['2297', '2297', '2297', '2297', '2297']);
    expect(col('bulkDensity')).toEqual(['2.146', '2.275', '2.388', '2.359', '2.303']);
    expect(col('containerW1')).toEqual(['20.00', '20.00', '21.00', '23.00', '23.00']);
    expect(col('containerPlusWetW2')).toEqual(['104.00', '126.00', '108.00', '112.00', '114.00']);
    expect(col('wetSoilW3')).toEqual(['84.00', '106.00', '87.00', '89.00', '91.00']);
    expect(col('containerPlusDryW4')).toEqual(['100.56', '119.96', '101.21', '103.54', '103.65']);
    expect(col('drySoilW5')).toEqual(['80.56', '99.96', '80.21', '80.54', '80.65']);
    expect(col('moistureWeight')).toEqual(['3.44', '6.04', '6.79', '8.46', '10.35']);
    expect(col('moistureContent')).toEqual(['4.27', '6.04', '8.47', '10.50', '12.83']);
    expect(col('dryDensity')).toEqual(['2.058', '2.146', '2.202', '2.135', '2.041']);
  });

  it('MDD = 2.202 g/cm³ and OMC = 8.47 % from the same trial (Trial 3)', () => {
    expect(r.peakIndex).toBe(2);
    expect(formatFixed(r.mdd, 3)).toBe('2.202');
    expect(formatFixed(r.omc, 2)).toBe('8.47');
    expect(calculateMDD(r.trials)).toBe(r.trials[2].dryDensity);
    expect(calculateOMC(r.trials)).toBe(r.trials[2].moistureContent);
    expect(r.allComplete).toBe(true);
  });

  it('passes validation with no warnings', () => {
    const v = validateProctorForm(sample(), r);
    expect(v.errors).toEqual({});
    expect(v.warnings).toEqual([]);
  });

  it('chooses the same axes as the sample graph', () => {
    const g = generateProctorGraph(r.trials, r.peakIndex);
    expect(g.xTicks.map((t) => t.label)).toEqual(['3.00', '5.00', '7.00', '9.00', '11.00', '13.00']);
    expect(g.yTicks.map((t) => t.label)).toEqual(['2.000', '2.050', '2.100', '2.150', '2.200', '2.250', '2.300']);
    // Point positions match the sample PDF's curve anchor points (±0.3 pt).
    const expected = [[180.39, 527.65], [235.64, 499.01], [311.17, 480.46], [374.73, 502.62], [447.34, 533.47]];
    g.points.forEach((p, i) => {
      expect(Math.abs(p.x - expected[i][0])).toBeLessThan(0.3);
      expect(Math.abs(p.y - expected[i][1])).toBeLessThan(0.3);
    });
    // Points keep their exact values (not snapped to ticks)
    expect(g.points[2].mc).toBe(r.trials[2].moistureContent);
    expect(g.peak.trial).toBe(3);
  });
});

describe('axis adapts to other data', () => {
  it('always contains all points with padding', () => {
    const sets = [
      [[8, 1.62], [10.5, 1.71], [13.2, 1.76], [15.8, 1.73], [18.1, 1.66]],
      [[14, 1.45], [18, 1.52], [22, 1.56], [26, 1.53], [30, 1.47]],
      [[2.1, 2.21], [3.4, 2.25], [4.9, 2.27], [6.2, 2.26], [7.5, 2.23]],
      [[9, 1.8], [9.5, 1.801], [10, 1.802], [10.5, 1.801], [11, 1.8]],
      [[0.65, 1.77], [3.99, 2.01], [8.87, 2.07], [13.19, 1.99], [18.63, 1.83]], // near-zero moisture → axis starts at 0
    ];
    for (const s of sets) {
      const x = computeMoistureAxis(s.map((p) => p[0]));
      const y = computeDensityAxis(s.map((p) => p[1]));
      for (const [mc, dd] of s) {
        expect(mc).toBeGreaterThan(x.min);
        expect(mc).toBeLessThan(x.max);
        expect(dd).toBeGreaterThanOrEqual(y.min);
        expect(dd).toBeLessThan(y.max);
      }
      expect(x.ticks).toHaveLength(6);
      expect(y.ticks).toHaveLength(7);
    }
  });
});

describe('chart robustness', () => {
  it('never throws on implausible in-progress data (negative moisture)', () => {
    const f = cloneForm(SAMPLE_FORM);
    f.trials[3].containerPlusDry = '130'; // dry > wet → negative moisture content
    const r = calculateProctor(f);
    expect(() => generateProctorGraph(r.trials, r.peakIndex)).not.toThrow();
    expect(generateProctorGraph(r.trials, r.peakIndex).points).toHaveLength(4); // impossible trial is not plotted
    expect(r.trials[3].moistureContent).toBeNaN();
    expect(r.peakIndex).toBe(2);
  });
});

describe('formatting & validation', () => {
  it('rounds decimal-correctly without float artefacts', () => {
    expect(roundTo(1.005, 2)).toBe(1.01);
    expect(formatFixed(2.1454999999999997, 3)).toBe('2.146'); // binary artefact of 2.1455
    expect(formatFixed(2.14549, 3)).toBe('2.145');
    expect(formatFixed(2.1455, 3)).toBe('2.146');
    expect(formatFixed(NaN, 2)).toBe('');
    expect(parseNumber('1,234.5')).toBe(1234.5);
    expect(parseNumber('12abc')).toBeNaN();
    expect(countDecimals('20.50')).toBe(2);
    expect(formatDateDMY('2026-09-26')).toBe('26/09/2026');
  });

  it('blocks empty / invalid / impossible input', () => {
    const f = createEmptyForm();
    const v = validateProctorForm(f);
    expect(v.isValid).toBe(false);
    expect(v.errors['info.clientName']).toMatch(/required/);
    expect(v.errors['mould.volume']).toMatch(/required/);

    const s = sample();
    s.mould.volume = '0';
    s.trials[1].containerPlusDry = '20';          // dry soil = 0
    s.trials[2].containerPlusDry = '200';         // dry > wet
    s.trials[3].mouldPlusSoil = 'abc';
    s.trials[4].mouldPlusSoil = '5000';           // less than mould
    s.info.clientName = 'Client த';           // Tamil char — not printable in Times WinAnsi
    const e = validateProctorForm(s).errors;
    expect(e['mould.volume']).toMatch(/greater than zero/);
    expect(e['trials.1.containerPlusDry']).toMatch(/dry soil weight cannot be zero/);
    expect(e['trials.2.containerPlusDry']).toMatch(/cannot weigh more/);
    expect(e['trials.3.mouldPlusSoil']).toMatch(/valid number/);
    expect(e['trials.4.mouldPlusSoil']).toMatch(/greater than the mould weight/);
    expect(e['info.clientName']).toMatch(/cannot print/);
    expect(findUnprintableChars('ABC – “Ltd” €')).toEqual([]);
  });

  it('warns when the peak is at an end trial', () => {
    const s = sample();
    s.trials[4].mouldPlusSoil = '11400';
    const r = calculateProctor(s);
    expect(r.peakIndex).toBe(4);
    expect(validateProctorForm(s, r).warnings.join(' ')).toMatch(/last trial/);
  });
});

describe('PDF overlay', () => {
  it('produces a single-page PDF on the unmodified template', async () => {
    const templateBytes = readFileSync(fileURLToPath(new URL('../assets/proctor-template.pdf', import.meta.url)));
    const form = sample();
    const bytes = await generateProctorPDF({ templateBytes, form, results: calculateProctor(form) });
    const doc = await PDFDocument.load(bytes);
    expect(doc.getPageCount()).toBe(1);
    const { width, height } = doc.getPage(0).getSize();
    expect([width, height]).toEqual([612, 792]);
    expect(getProctorFileName(form)).toBe('Proctor_Test_Report_DERC-R123-2026-27.pdf');
  });
});
