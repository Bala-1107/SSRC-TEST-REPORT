// Public entry point of the Proctor Compaction Test module.
export { default } from './ProctorCompactionTest.jsx';
export { default as ProctorCompactionTest } from './ProctorCompactionTest.jsx';
export * from './utils/proctorCalculations.js';
export { generateProctorGraph } from './chart/proctorChart.js';
export { getProctorFileName } from './pdf/proctorFileName.js';
// generateProctorPDF is intentionally NOT re-exported here: it pulls in pdf-lib, which the page
// loads lazily. Import it directly from './pdf/generateProctorPDF.js' if needed elsewhere.
export { PROCTOR_TEMPLATE_POSITIONS } from './pdf/proctorTemplateConfig.js';
