/**
 * PROCTOR_TEMPLATE_POSITIONS — the ONLY place PDF coordinates live.
 *
 * Source: measured from "Proctor test empty data sheet.pdf" (vector rules / grid)
 * and "Proctor test sample data sheet.pdf" (text baselines, sizes, colours),
 * both US-Letter 612 × 792 pt, single page.
 *
 * Coordinate convention used in this file:  TOP-LEFT origin, y grows DOWN,
 * units = PDF points, y = text BASELINE. (That is how the values were measured
 * and how SVG works.) The PDF writer converts with  pdfY = pageHeight − y.
 *
 * Fonts: the template uses Times New Roman; pdf-lib's standard Times-Roman /
 * Times-Bold have identical metrics, so no font file needs embedding.
 */

export const PROCTOR_TEMPLATE_POSITIONS = Object.freeze({
  page: { width: 612, height: 792 },

  // ---- Header ------------------------------------------------------------
  // Printed on template: "Report No: DERC/"  (x 74.2 – 146.6) and "Date:" (x 380.6 – 403.6)
  reportNo:   { x: 146.9, y: 83.5, size: 8.88, font: 'bold', align: 'left', maxWidth: 225 },
  reportDate: { x: 403.9, y: 83.5, size: 8.88, font: 'bold', align: 'left', maxWidth: 120 },

  // ---- Test information (value column: x 223.4 – 526.3) ------------------
  // Values are printed as ": <value>" exactly like the sample.
  info: {
    clientName:        { x: 224.4, y: 116.8, size: 7.44, font: 'regular', align: 'left', maxWidth: 300 },
    projectName:       { x: 224.4, y: 129.6, size: 7.44, font: 'regular', align: 'left', maxWidth: 300 },
    siteLocation:      { x: 224.4, y: 144.1, size: 7.44, font: 'regular', align: 'left', maxWidth: 300 },
    sampleDescription: { x: 224.4, y: 158.7, size: 7.44, font: 'regular', align: 'left', maxWidth: 300 },
    testingDate:       { x: 224.4, y: 173.1, size: 7.44, font: 'regular', align: 'left', maxWidth: 300 },
    // "Type Name" and "Test method" are pre-printed on the template → not overlaid.
  },

  // ---- Trial table -------------------------------------------------------
  // Column cell boundaries (inner edges of the vertical rules) and centres.
  trialColumns: [
    { left: 223.4, right: 274.6, center: 249.4 },
    { left: 275.3, right: 326.6, center: 301.4 },
    { left: 327.3, right: 378.6, center: 353.4 },
    { left: 379.3, right: 430.5, center: 405.3 },
    { left: 431.2, right: 482.5, center: 457.3 },
  ],
  // Row baselines and styles, keyed by TABLE_ROWS[].key (proctorModel.js).
  trialRows: {
    mouldW1:            { y: 227.1, size: 7.44, font: 'regular' },
    mouldPlusSoilW2:    { y: 237.9, size: 7.44, font: 'regular' },
    compactedSoilW3:    { y: 248.7, size: 7.44, font: 'regular' },
    mouldVolume:        { y: 259.5, size: 7.44, font: 'regular' },
    bulkDensity:        { y: 270.6, size: 8.16, font: 'regular' },
    containerW1:        { y: 281.1, size: 7.44, font: 'regular' },
    containerPlusWetW2: { y: 291.9, size: 7.44, font: 'regular' },
    wetSoilW3:          { y: 302.7, size: 7.44, font: 'regular' },
    containerPlusDryW4: { y: 313.5, size: 7.44, font: 'regular' },
    drySoilW5:          { y: 324.3, size: 7.44, font: 'regular' },
    moistureWeight:     { y: 335.4, size: 7.44, font: 'regular' },
    moistureContent:    { y: 346.1, size: 7.44, font: 'bold' },
    dryDensity:         { y: 357.5, size: 8.16, font: 'bold' },
  },

  // ---- Results (right-aligned just before the pre-printed unit) ----------
  mdd: { x: 273.5, y: 380.8, size: 8.88, font: 'bold', align: 'right' },
  omc: { x: 273.5, y: 395.0, size: 8.88, font: 'bold', align: 'right' },

  // ---- Proctor Compaction Curve -------------------------------------------
  chart: {
    // Outer chart frame printed on the template (title + axis titles live inside it).
    frame: { left: 89.7, top: 419.1, right: 503.7, bottom: 581.8 },
    // Plot area = the pre-printed grid.
    plot: { left: 140.8, top: 448.2, right: 483.7, bottom: 546.9 },
    // The printed grid has 6 horizontal intervals and vertical lines every
    // 62.35 pt starting at the left edge → 5.5 x-intervals across the plot.
    yIntervals: 6,
    xIntervals: 5.5,
    xGridSpacing: 62.35,

    // Styling measured from the sample (Excel "Office" theme).
    curve: { color: '#4F81BD', width: 1.11 },
    axisLine: { color: '#BFBFBF', width: 0.555 },
    gridLine: { color: '#D9D9D9', width: 0.555 },
    yTickLabel: { rightX: 133.9, dy: 2.6, size: 8.18, color: '#595959', font: 'regular' },   // y = gridY + dy
    xTickLabel: { y: 559.0, size: 8.18, color: '#595959', font: 'regular' },                // centred on gridline
    dataLabel: { dy: -7.0, size: 8.17, color: '#404040', font: 'regular' },                 // baseline = pointY + dy

    // Peak highlight (not in the sample; kept subtle so the template look is preserved).
    peak: { show: true, markerRadius: 2.4, markerColor: '#4F81BD', guideColor: '#8EA9C9', guideWidth: 0.6, guideDash: [2, 2], showGuides: true },
    // showGuides draws a single dashed drop line from the peak to the moisture axis (marks OMC).
  },
});

/** Convert a top-origin y (this file's convention) to pdf-lib's bottom-origin y. */
export const toPdfY = (y) => PROCTOR_TEMPLATE_POSITIONS.page.height - y;
