import { REPORT_NO_PREFIX } from '../proctorModel.js';
import { toSafeFileName } from '../utils/formatters.js';

/** Proctor_Test_Report_<ReportNumber>.pdf, falling back to the report date. */
export function getProctorFileName(form) {
  const rn = toSafeFileName(form.info.reportNo);
  if (rn) return `Proctor_Test_Report_${toSafeFileName(REPORT_NO_PREFIX)}-${rn}.pdf`;
  const d = toSafeFileName(form.info.reportDate || new Date().toISOString().slice(0, 10));
  return `Proctor_Test_Report_${d}.pdf`;
}
