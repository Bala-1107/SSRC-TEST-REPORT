import { Section, TextField } from './Fields.jsx';
import { REPORT_NO_PREFIX, TEST_TYPE, TEST_METHOD } from '../proctorModel.js';

export default function TestInfoSection({ form, setInfo, touch, errorFor }) {
  const f = (key, label, props = {}) => (
    <TextField
      label={label}
      required
      value={form.info[key]}
      onChange={(v) => setInfo(key, v)}
      onBlur={() => touch(`info.${key}`)}
      error={errorFor(`info.${key}`)}
      {...props}
    />
  );
  return (
    <Section number={1} title="Test Information" subtitle="Printed in the header and information block of the report.">
      <div className="pct-grid pct-grid--2">
        {f('reportNo', 'Report No.', { prefix: REPORT_NO_PREFIX, placeholder: 'R123/2026-27' })}
        {f('reportDate', 'Report Date', { type: 'date' })}
        {f('clientName', 'Client / Contractor Name')}
        {f('projectName', 'Project Name')}
        {f('siteLocation', 'Site Location')}
        {f('sampleDescription', 'Sample Description', { placeholder: 'e.g. Hill Earth' })}
        {f('testingDate', 'Testing Date', { type: 'date' })}
      </div>
      <dl className="pct-fixed">
        <div><dt>Test Type</dt><dd>{TEST_TYPE}</dd></div>
        <div><dt>Test Method</dt><dd>{TEST_METHOD}</dd></div>
      </dl>
    </Section>
  );
}
