import { Section } from './Fields.jsx';
import { sanitizeNumeric } from '../utils/formatters.js';
import { TABLE_ROWS } from '../proctorModel.js';

export default function TrialTable({ form, results, ready, setTrial, touch, errorFor }) {
  const trialIdx = form.trials.map((_, i) => i);
  const cellErrors = [];

  return (
    <Section
      number={3}
      title="Trial Data"
      subtitle="Enter the four raw readings per trial. Grey rows are calculated automatically and update as you type."
    >
      <ul className="pct-legend" aria-label="Legend">
        <li><span className="pct-swatch pct-swatch--input" /> Input</li>
        <li><span className="pct-swatch pct-swatch--common" /> From Mould Information</li>
        <li><span className="pct-swatch pct-swatch--calc" /> Calculated (read-only)</li>
      </ul>

      <div className="pct-table-scroll" tabIndex={0} role="region" aria-label="Trial data table (scrolls horizontally)">
        <table className="pct-table">
          <thead>
            <tr>
              <th scope="col" className="pct-table__desc">Description</th>
              {trialIdx.map((i) => (
                <th scope="col" key={i} className={i === results.peakIndex && ready ? 'is-peak' : undefined}>
                  Trial {i + 1}
                </th>
              ))}
              <th scope="col" className="pct-table__unit">Unit</th>
            </tr>
          </thead>
          <tbody>
            {TABLE_ROWS.map((row) => (
              <tr key={row.key} className={`pct-row pct-row--${row.kind}${row.emphasis ? ' pct-row--em' : ''}`}>
                <th scope="row" className="pct-table__desc">{row.label}</th>
                {trialIdx.map((i) => {
                  const r = results.trials[i];
                  if (row.kind === 'input') {
                    const path = `trials.${i}.${row.field}`;
                    const err = errorFor(path);
                    if (err) cellErrors.push(err);
                    return (
                      <td key={i} className={err ? 'has-error' : undefined}>
                        <input
                          className="pct-cell-input"
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          aria-label={`Trial ${i + 1}: ${row.label} (${row.unit})`}
                          aria-invalid={!!err}
                          title={err || undefined}
                          value={form.trials[i][row.field]}
                          onChange={(e) => setTrial(i, row.field, sanitizeNumeric(e.target.value))}
                          onBlur={() => touch(path)}
                        />
                      </td>
                    );
                  }
                  const text = row.format(r, form.trials[i], form);
                  const peak = row.emphasis && i === results.peakIndex && ready;
                  return (
                    <td key={i} className={peak ? 'is-peak' : undefined}>
                      <output className="pct-cell-out" aria-label={`Trial ${i + 1}: ${row.label}`}>{text || '—'}</output>
                    </td>
                  );
                })}
                <td className="pct-table__unit">{row.unit}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {cellErrors.length > 0 && (
        <ul className="pct-error-list" role="alert">
          {cellErrors.map((e) => <li key={e}>{e}</li>)}
        </ul>
      )}
    </Section>
  );
}
