import { useEffect, useRef, useState } from 'react';
import { Section } from './Fields.jsx';
import { getProctorFileName } from '../pdf/proctorFileName.js';
import templateUrl from '../assets/proctor-template.pdf?url';

// pdf-lib (~450 kB) is loaded only when a report is first generated, keeping it out of the main bundle.
const loadPdfModule = () => import('../pdf/generateProctorPDF.js');
let templatePromise = null;
const getTemplate = async () => {
  if (!templatePromise) {
    const { loadTemplateBytes } = await loadPdfModule();
    templatePromise = loadTemplateBytes(templateUrl).catch((e) => { templatePromise = null; throw e; });
  }
  return templatePromise;
};

export default function ReportActions({ form, results, validation, revealAllErrors, onLoadSample, onReset }) {
  const [busy, setBusy] = useState(null); // 'preview' | 'download' | null
  const [preview, setPreview] = useState(null); // { url, snapshot }
  const [error, setError] = useState('');
  const [blocked, setBlocked] = useState(false);
  const panelRef = useRef(null);

  const snapshot = JSON.stringify(form);
  const stale = preview && preview.snapshot !== snapshot;
  const errorCount = Object.keys(validation.errors).length;

  useEffect(() => () => preview && URL.revokeObjectURL(preview.url), [preview]);

  async function build() {
    const [{ generateProctorPDF }, templateBytes] = await Promise.all([loadPdfModule(), getTemplate()]);
    const bytes = await generateProctorPDF({ templateBytes, form, results });
    return new Blob([bytes], { type: 'application/pdf' });
  }

  async function run(kind) {
    setError('');
    if (!validation.isValid) {
      revealAllErrors();
      setBlocked(true);
      return;
    }
    setBlocked(false);
    setBusy(kind);
    try {
      const blob = await build();
      if (kind === 'preview') {
        setPreview({ url: URL.createObjectURL(blob), snapshot });
        requestAnimationFrame(() => panelRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' }));
      } else {
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = getProctorFileName(form);
        document.body.appendChild(a);
        a.click();
        a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 10_000);
      }
    } catch (e) {
      console.error(e);
      setError(e?.message || 'The report could not be generated.');
    } finally {
      setBusy(null);
    }
  }

  return (
    <Section number={6} title="Report Actions" subtitle="The preview is the actual generated PDF: the original template with your data overlaid.">
      <div className="pct-actions">
        <button type="button" className="pct-btn pct-btn--secondary" onClick={() => run('preview')} disabled={!!busy}>
          {busy === 'preview' ? 'Generating…' : 'Preview Report'}
        </button>
        <button type="button" className="pct-btn pct-btn--primary" onClick={() => run('download')} disabled={!!busy}>
          {busy === 'download' ? 'Generating…' : 'Download PDF'}
        </button>
        <span className="pct-actions__spacer" />
        {onLoadSample && (
          <button type="button" className="pct-btn pct-btn--ghost" onClick={onLoadSample}>Load sample data</button>
        )}
        <button
          type="button"
          className="pct-btn pct-btn--ghost"
          onClick={() => { if (window.confirm('Clear all entered data?')) { setPreview(null); onReset(); } }}
        >
          Clear form
        </button>
      </div>

      {blocked && !validation.isValid && (
        <div className="pct-alert pct-alert--error" role="alert">
          <strong>The report can't be generated yet.</strong> Fix {errorCount} {errorCount === 1 ? 'issue' : 'issues'}:
          <ul>{Object.values(validation.errors).slice(0, 8).map((m) => <li key={m}>{m}</li>)}</ul>
          {errorCount > 8 && <p>…and {errorCount - 8} more (highlighted above).</p>}
        </div>
      )}
      {error && <div className="pct-alert pct-alert--error" role="alert">{error}</div>}

      {preview && (
        <div className="pct-preview" ref={panelRef}>
          <div className="pct-preview__bar">
            <span>{getProctorFileName(form)}</span>
            {stale && (
              <button type="button" className="pct-btn pct-btn--small" onClick={() => run('preview')}>
                Data changed. Refresh preview
              </button>
            )}
            <a className="pct-link" href={preview.url} target="_blank" rel="noreferrer">Open in new tab</a>
            <button type="button" className="pct-btn pct-btn--small pct-btn--ghost" onClick={() => setPreview(null)}>Close</button>
          </div>
          <iframe className="pct-preview__frame" title="Proctor report preview" src={`${preview.url}#view=FitH`} />
        </div>
      )}
    </Section>
  );
}
