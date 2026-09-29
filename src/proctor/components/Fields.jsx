import { useId } from 'react';
import { MAX_TEXT_LENGTH } from '../utils/proctorValidation.js';

import { sanitizeNumeric } from '../utils/formatters.js';

export function TextField({ label, value, onChange, onBlur, error, required, type = 'text', prefix, placeholder, hint }) {
  const id = useId();
  return (
    <div className={`pct-field${error ? ' pct-field--error' : ''}`}>
      <label htmlFor={id} className="pct-label">
        {label}
        {required && <span className="pct-req" aria-hidden="true"> *</span>}
      </label>
      <div className="pct-input-wrap">
        {prefix && <span className="pct-prefix">{prefix}</span>}
        <input
          id={id}
          className="pct-input"
          type={type}
          value={value}
          placeholder={placeholder}
          maxLength={type === 'text' ? MAX_TEXT_LENGTH : undefined}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
      </div>
      {error ? <p id={`${id}-err`} className="pct-error">{error}</p> : hint ? <p className="pct-hint">{hint}</p> : null}
    </div>
  );
}

export function NumberField({ label, unit, value, onChange, onBlur, error, required, hint }) {
  const id = useId();
  return (
    <div className={`pct-field${error ? ' pct-field--error' : ''}`}>
      <label htmlFor={id} className="pct-label">
        {label}
        {required && <span className="pct-req" aria-hidden="true"> *</span>}
      </label>
      <div className="pct-input-wrap">
        <input
          id={id}
          className="pct-input pct-input--num"
          type="text"
          inputMode="decimal"
          autoComplete="off"
          value={value}
          onChange={(e) => onChange(sanitizeNumeric(e.target.value))}
          onBlur={onBlur}
          aria-invalid={!!error}
          aria-describedby={error ? `${id}-err` : undefined}
        />
        {unit && <span className="pct-suffix">{unit}</span>}
      </div>
      {error ? <p id={`${id}-err`} className="pct-error">{error}</p> : hint ? <p className="pct-hint">{hint}</p> : null}
    </div>
  );
}

export function Section({ number, title, subtitle, children, actions }) {
  return (
    <section className="pct-section" aria-labelledby={`pct-sec-${number}`}>
      <header className="pct-section__head">
        <div>
          <h2 id={`pct-sec-${number}`} className="pct-section__title">
            <span className="pct-section__num">{number}</span>
            {title}
          </h2>
          {subtitle && <p className="pct-section__sub">{subtitle}</p>}
        </div>
        {actions && <div className="pct-section__actions">{actions}</div>}
      </header>
      {children}
    </section>
  );
}
