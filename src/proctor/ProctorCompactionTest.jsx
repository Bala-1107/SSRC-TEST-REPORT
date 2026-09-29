/**
 * Proctor Compaction Test (IS 2720 Part 7): page component.
 * Composes the six sections. Logic lives in hooks/, utils/, chart/ and pdf/.
 */
import './proctor.css';
import { useProctorForm } from './hooks/useProctorForm.js';
import { SAMPLE_FORM } from './proctorModel.js';
import TestInfoSection from './components/TestInfoSection.jsx';
import MouldSection from './components/MouldSection.jsx';
import TrialTable from './components/TrialTable.jsx';
import ResultsSection from './components/ResultsSection.jsx';
import ProctorCurve from './components/ProctorCurve.jsx';
import ReportActions from './components/ReportActions.jsx';

/**
 * @param {{ showSampleLoader?: boolean }} props
 *   showSampleLoader: show a "Load sample data" button (defaults to dev builds only).
 */
export default function ProctorCompactionTest({ showSampleLoader = import.meta.env.DEV }) {
  const p = useProctorForm();
  return (
    <div className="pct-page">
      <header className="pct-page__head">
        <p className="pct-page__eyebrow">Soil testing · IS 2720 Part 7</p>
        <h1 className="pct-page__title">Proctor Compaction Test</h1>
      </header>

      <TestInfoSection form={p.form} setInfo={p.setInfo} touch={p.touch} errorFor={p.errorFor} />
      <MouldSection form={p.form} setMould={p.setMould} touch={p.touch} errorFor={p.errorFor} />
      <TrialTable form={p.form} results={p.results} ready={p.resultsReady} setTrial={p.setTrial} touch={p.touch} errorFor={p.errorFor} />
      <ResultsSection results={p.results} ready={p.resultsReady} warnings={p.validation.warnings} />
      <ProctorCurve results={p.results} ready={p.resultsReady} />
      <ReportActions
        form={p.form}
        results={p.results}
        validation={p.validation}
        revealAllErrors={p.revealAllErrors}
        onLoadSample={showSampleLoader ? () => p.replaceForm(SAMPLE_FORM) : undefined}
        onReset={p.resetForm}
      />
    </div>
  );
}
