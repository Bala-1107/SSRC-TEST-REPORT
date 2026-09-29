/**
 * generateProctorPDF — overlays data + vector graph onto the ORIGINAL empty template.
 *
 * The template page is loaded untouched with pdf-lib; text and the curve are drawn
 * on top as vector content (nothing is rasterised). Output is the final report bytes,
 * used for both Preview and Download so they are always identical.
 */
import { PDFDocument, StandardFonts, rgb } from 'pdf-lib';
import { PROCTOR_TEMPLATE_POSITIONS as POS, toPdfY } from './proctorTemplateConfig.js';
import { TABLE_ROWS, REPORT_NO_PREFIX } from '../proctorModel.js';
import { formatDateDMY, formatFixed, PRECISION } from '../utils/formatters.js';
import { generateProctorGraph } from '../chart/proctorChart.js';

const hex = (h) => {
  const n = parseInt(h.replace('#', ''), 16);
  return rgb(((n >> 16) & 255) / 255, ((n >> 8) & 255) / 255, (n & 255) / 255);
};
const BLACK = rgb(0, 0, 0);
const MIN_FONT_SIZE = 5.5;

/** Load template bytes (browser: fetch the bundled asset URL; tests: pass bytes). */
export async function loadTemplateBytes(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`Could not load the Proctor template PDF (${res.status}).`);
  return new Uint8Array(await res.arrayBuffer());
}

/**
 * Draw text at a template position. Long text is shrunk (down to MIN_FONT_SIZE) to fit
 * `maxWidth`, then truncated with an ellipsis as a last resort, so it never spills
 * over the table rules.
 */
function drawText(page, fonts, text, spec, overrides = {}) {
  const s = { ...spec, ...overrides };
  if (text === '' || text == null) return;
  const font = fonts[s.font || 'regular'];
  let size = s.size;
  let str = String(text);
  if (s.maxWidth) {
    while (font.widthOfTextAtSize(str, size) > s.maxWidth && size > MIN_FONT_SIZE) size = Math.max(MIN_FONT_SIZE, size - 0.25);
    if (font.widthOfTextAtSize(str, size) > s.maxWidth) {
      while (str.length > 1 && font.widthOfTextAtSize(`${str}…`, size) > s.maxWidth) str = str.slice(0, -1);
      str = `${str.trimEnd()}…`;
    }
  }
  const width = font.widthOfTextAtSize(str, size);
  let x = s.x;
  if (s.align === 'center') x = s.x - width / 2;
  else if (s.align === 'right') x = s.x - width;
  page.drawText(str, { x, y: toPdfY(s.y), size, font, color: s.color ? hex(s.color) : BLACK });
}

function drawChart(page, fonts, model) {
  const C = POS.chart;
  const { plot } = model;
  const line = (x1, y1, x2, y2, { color, width, dash }) =>
    page.drawLine({ start: { x: x1, y: toPdfY(y1) }, end: { x: x2, y: toPdfY(y2) }, thickness: width, color: hex(color), dashArray: dash });

  // Axis lines over the template's first/last grid lines (as in the sample).
  line(plot.left, plot.top, plot.left, plot.bottom, C.axisLine);
  line(plot.left, plot.bottom, plot.right, plot.bottom, C.axisLine);

  // Tick labels.
  for (const t of model.yTicks) drawText(page, fonts, t.label, { ...C.yTickLabel, x: C.yTickLabel.rightX, y: t.y + C.yTickLabel.dy, align: 'right' });
  for (const t of model.xTicks) drawText(page, fonts, t.label, { ...C.xTickLabel, x: t.x, align: 'center' });

  // Peak guide (dashed drop line to the moisture axis, marking OMC) — drawn under the curve.
  if (C.peak.show && C.peak.showGuides && model.peak) {
    line(model.peak.x, model.peak.y, model.peak.x, plot.bottom, { color: C.peak.guideColor, width: C.peak.guideWidth, dash: C.peak.guideDash });
  }

  // Smoothed curve (vector). drawSvgPath flips y, so top-origin coordinates work directly.
  if (model.curve.d) {
    page.drawSvgPath(model.curve.d, { x: 0, y: POS.page.height, borderColor: hex(C.curve.color), borderWidth: C.curve.width });
  }

  if (C.peak.show && model.peak) {
    page.drawCircle({ x: model.peak.x, y: toPdfY(model.peak.y), size: C.peak.markerRadius, color: hex(C.peak.markerColor) });
  }

  // Data labels (dry density), centred above each point.
  for (const p of model.points) drawText(page, fonts, p.label, { ...C.dataLabel, x: p.x, y: p.y + C.dataLabel.dy, align: 'center' });
}

/**
 * @param {Object} args
 * @param {Uint8Array|ArrayBuffer} args.templateBytes  bytes of the EMPTY template PDF
 * @param {import('../proctorModel.js').ProctorFormState} args.form
 * @param {ReturnType<import('../utils/proctorCalculations.js').calculateProctor>} args.results
 * @returns {Promise<Uint8Array>}
 */
export async function generateProctorPDF({ templateBytes, form, results }) {
  const pdfDoc = await PDFDocument.load(templateBytes);
  const page = pdfDoc.getPage(0);
  const fonts = {
    regular: await pdfDoc.embedFont(StandardFonts.TimesRoman),
    bold: await pdfDoc.embedFont(StandardFonts.TimesRomanBold),
  };

  // Header
  drawText(page, fonts, form.info.reportNo.trim(), POS.reportNo);
  drawText(page, fonts, formatDateDMY(form.info.reportDate), POS.reportDate);

  // Test information — printed as ": value" like the sample
  const infoValues = {
    clientName: form.info.clientName,
    projectName: form.info.projectName,
    siteLocation: form.info.siteLocation,
    sampleDescription: form.info.sampleDescription,
    testingDate: formatDateDMY(form.info.testingDate),
  };
  for (const [key, spec] of Object.entries(POS.info)) {
    const v = String(infoValues[key] ?? '').trim();
    if (v) drawText(page, fonts, `: ${v}`, spec);
  }

  // Trial table — same row definitions/formatters as the on-screen table
  results.trials.forEach((r, i) => {
    const col = POS.trialColumns[i];
    for (const row of TABLE_ROWS) {
      const rowPos = POS.trialRows[row.key];
      const text = row.format(r, form.trials[i], form);
      drawText(page, fonts, text, { ...rowPos, x: col.center, align: 'center', maxWidth: col.right - col.left - 2 });
    }
  });

  // MDD / OMC
  drawText(page, fonts, formatFixed(results.mdd, PRECISION.mdd), POS.mdd);
  drawText(page, fonts, formatFixed(results.omc, PRECISION.omc), POS.omc);

  // Graph
  const model = generateProctorGraph(results.trials, results.peakIndex);
  if (!model.empty) drawChart(page, fonts, model);

  pdfDoc.setTitle(`Proctor Compaction Test Report ${REPORT_NO_PREFIX}${form.info.reportNo}`.trim());
  pdfDoc.setSubject('Proctor Compaction Test — IS 2720 Part 7');
  pdfDoc.setProducer('Dynamiq Engineering Research Centre — Report Generator');
  return pdfDoc.save();
}

export { getProctorFileName } from './proctorFileName.js';
