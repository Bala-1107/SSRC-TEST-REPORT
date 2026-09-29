import { Section } from './Fields.jsx';
import { formatFixed, PRECISION } from '../utils/formatters.js';

export default function ResultsSection({ results, ready, warnings }) {
  const peak = results.peakIndex;
  return (
    <Section number={4} title="Calculated Results" subtitle="Taken from the trial with the highest calculated dry density.">
      <div className="pct-results">
        <div className="pct-kpi">
          <span className="pct-kpi__label">Maximum Dry Density (MDD)</span>
          <span className="pct-kpi__value">
            {ready ? formatFixed(results.mdd, PRECISION.mdd) : '—'}
            <small> g/cm³</small>
          </span>
        </div>
        <div className="pct-kpi">
          <span className="pct-kpi__label">Optimum Moisture Content (OMC)</span>
          <span className="pct-kpi__value">
            {ready ? formatFixed(results.omc, PRECISION.omc) : '—'}
            <small> %</small>
          </span>
        </div>
        <div className="pct-kpi pct-kpi--muted">
          <span className="pct-kpi__label">Peak trial</span>
          <span className="pct-kpi__value">{ready && peak >= 0 ? `Trial ${peak + 1}` : '—'}</span>
        </div>
      </div>
      {!ready && <p className="pct-hint">MDD and OMC appear once the mould details and all five trials have valid readings.</p>}
      {warnings.length > 0 && (
        <ul className="pct-warning-list">
          {warnings.map((w) => <li key={w}>{w}</li>)}
        </ul>
      )}
    </Section>
  );
}
