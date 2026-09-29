/**
 * Form state for the Proctor module: raw inputs, live calculations, validation,
 * "touched" tracking for inline errors, and a local draft so a page refresh
 * doesn't lose a half-entered test.
 */
import { useCallback, useEffect, useMemo, useState } from 'react';
import { calculateProctor } from '../utils/proctorCalculations.js';
import { validateProctorForm } from '../utils/proctorValidation.js';
import { createEmptyForm, cloneForm } from '../proctorModel.js';

const DRAFT_KEY = 'proctorCompactionTest.draft.v1';

function loadDraft() {
  try {
    const raw = window.localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    const d = JSON.parse(raw);
    return d && d.info && d.mould && Array.isArray(d.trials) && d.trials.length === 5 ? d : null;
  } catch {
    return null;
  }
}

export function useProctorForm() {
  const [form, setForm] = useState(() => loadDraft() || createEmptyForm());
  const [touched, setTouched] = useState({});
  const [showAllErrors, setShowAllErrors] = useState(false);

  useEffect(() => {
    try { window.localStorage.setItem(DRAFT_KEY, JSON.stringify(form)); } catch { /* storage unavailable */ }
  }, [form]);

  // Live calculation: recomputed on every input change.
  const results = useMemo(() => calculateProctor(form), [form]);
  const validation = useMemo(() => validateProctorForm(form, results), [form, results]);
  // MDD/OMC and the peak highlight are only shown when every numeric reading is valid.
  const resultsReady = useMemo(
    () => results.allComplete && !Object.keys(validation.errors).some((k) => k.startsWith('mould.') || k.startsWith('trials')),
    [results.allComplete, validation.errors],
  );

  const setInfo = useCallback((key, value) => setForm((f) => ({ ...f, info: { ...f.info, [key]: value } })), []);
  const setMould = useCallback((key, value) => setForm((f) => ({ ...f, mould: { ...f.mould, [key]: value } })), []);
  const setTrial = useCallback(
    (index, key, value) =>
      setForm((f) => ({ ...f, trials: f.trials.map((t, i) => (i === index ? { ...t, [key]: value } : t)) })),
    [],
  );
  const touch = useCallback((path) => setTouched((t) => (t[path] ? t : { ...t, [path]: true })), []);

  /** Error for a field path, only once the user has left the field or tried to generate. */
  const errorFor = useCallback(
    (path) => ((showAllErrors || touched[path]) ? validation.errors[path] : undefined),
    [showAllErrors, touched, validation.errors],
  );

  const replaceForm = useCallback((next) => {
    setForm(cloneForm(next));
    setTouched({});
    setShowAllErrors(false);
  }, []);
  const resetForm = useCallback(() => replaceForm(createEmptyForm()), [replaceForm]);

  return {
    form, results, resultsReady, validation, errorFor, touch,
    setInfo, setMould, setTrial, replaceForm, resetForm,
    revealAllErrors: () => setShowAllErrors(true),
  };
}
