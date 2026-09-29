# Proctor Compaction Test module: integration notes

Self-contained React module. It does not modify or depend on the Quotation Generator code.

## 1. Copy
Copy this whole `proctor/` folder to `src/modules/proctor/` (or wherever your feature modules live).

## 2. Dependency
```bash
npm install pdf-lib
```
Why pdf-lib: the report must be the ORIGINAL empty PDF with data drawn on top. jsPDF, html2pdf
and @react-pdf/renderer can only create new documents; they cannot open an existing PDF as a
background. pdf-lib can, and it keeps the template's vector content untouched. It is loaded
lazily (dynamic import) the first time a report is generated, so the main bundle does not grow.
Your existing quotation PDF code keeps using whatever it uses today.

## 3. Route / menu
React Router example:
```jsx
import ProctorCompactionTest from './modules/proctor';
<Route path="/proctor-compaction-test" element={<ProctorCompactionTest />} />
```
Without a router, render `<ProctorCompactionTest />` where the other generator pages are switched.
Add a nav/menu entry labelled "Proctor Compaction Test".

Prop: `showSampleLoader` (default: dev builds only). Shows a "Load sample data" button that
fills in the values from the supplied sample PDF.

## 4. TypeScript projects
Vite compiles the `.js`/`.jsx` files as they are. If `tsconfig` has `allowJs: false`, either enable it
or ask for a `.ts/.tsx` conversion. If TS complains about the `?url` import, `vite/client`
types (normally already referenced in `vite-env.d.ts`) cover it.

## Structure
| Path | Responsibility |
|---|---|
| `proctorModel.js` | form shape, 13 table-row definitions (shared by UI + PDF), sample data |
| `utils/proctorCalculations.js` | pure formula functions, MDD/OMC |
| `utils/proctorValidation.js` | blocking errors + engineering warnings |
| `utils/formatters.js` | decimal-safe rounding, date/file-name formatting |
| `chart/proctorChart.js` | `generateProctorGraph()`: axis fitting, smoothed curve, labels (one model for SVG and PDF) |
| `pdf/proctorTemplateConfig.js` | `PROCTOR_TEMPLATE_POSITIONS`: every PDF coordinate, nowhere else |
| `pdf/generateProctorPDF.js` | loads `assets/proctor-template.pdf`, overlays text + vector graph |
| `hooks/useProctorForm.js` | state, live calculation, touched/errors, local draft autosave |
| `components/*` | the six UI sections |
| `__tests__/proctor.test.js` | Vitest: mandatory sample case, validation, axis fitting, PDF |

Run tests: `npx vitest run src/modules/proctor`

## Adjusting the template
If the lab edits the empty PDF (moves a row, etc.), replace `assets/proctor-template.pdf` and update
only `pdf/proctorTemplateConfig.js`. Coordinates there use a top-left origin with y = text baseline,
in PDF points. For the chart, the axis logic fits the data to the template's printed grid (6 × 5.5 intervals).

## Notes
- Values are overlaid with the PDF standard fonts Times-Roman/Times-Bold. Their character widths
  match the template's Times New Roman. Text containing characters outside the Western (WinAnsi)
  set is rejected by validation with a clear message.
- The template's own printed text ("Procter", "Trail 1…5", "Volumn") is left exactly as supplied.
