import { NumberField, Section } from './Fields.jsx';

export default function MouldSection({ form, setMould, touch, errorFor }) {
  return (
    <Section number={2} title="Mould Information" subtitle="Entered once and applied automatically to all five trials.">
      <div className="pct-grid pct-grid--2 pct-grid--narrow">
        <NumberField
          label="Mould Weight W1"
          unit="g"
          required
          value={form.mould.weight}
          onChange={(v) => setMould('weight', v)}
          onBlur={() => touch('mould.weight')}
          error={errorFor('mould.weight')}
        />
        <NumberField
          label="Volume of Mould"
          unit="cm³"
          required
          value={form.mould.volume}
          onChange={(v) => setMould('volume', v)}
          onBlur={() => touch('mould.volume')}
          error={errorFor('mould.volume')}
        />
      </div>
    </Section>
  );
}
