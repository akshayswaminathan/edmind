import { useState, useMemo, useEffect } from 'react';
import { MDM_COMPLAINTS, getComplaintDiagnoses, searchDiagnoses } from '../data/mdmDiagnoses';
import {
  getFeatureSet, featuresWithIds, GROUP_ORDER, PLAN_MENU, PLAN_ORDER,
  COMMON_PMH, INTERP_STUDIES, IMAGING_SIMPLE, IMAGING_GROUPS,
} from '../data/mdmFeatures';
import { generateMdm, buildOneLiner } from '../data/mdmGenerate';
import { TermsModal } from '../components/TermsModal';
import { TERMS_META } from '../data/terms';

const STEPS = ['Diagnoses', 'Patient', 'Findings', 'Plan', 'MDM'];

// Persisted acceptance of the Terms of Use (keyed by version so a substantive
// terms change re-prompts previously accepted users).
const TERMS_KEY = 'emtools.mdm.termsAcceptedVersion';
function hasAcceptedTerms() {
  try { return localStorage.getItem(TERMS_KEY) === TERMS_META.version; }
  catch { return false; }
}

// A fresh, empty plan keyed by every current plan category.
const emptyPlan = () => Object.fromEntries(PLAN_ORDER.map(c => [c, []]));

const TIER_DOT = { red: 'bg-red-400', common: 'bg-amber-400', rare: 'bg-gray-300' };

const DX_TIERS = [
  { key: 'likely', label: 'Most likely' },
  { key: 'cantmiss', label: "Can't-miss" },
  { key: 'less', label: 'Less likely' },
];

// ── No-PHI banner ────────────────────────────────────────────────────────────
function PhiBanner({ compact }) {
  if (compact) {
    return (
      <div className="flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5 mb-4">
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z" />
        </svg>
        <span>Do not enter PHI. This is not a HIPAA-covered system and not for patient information.</span>
      </div>
    );
  }
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-6">
      <div className="flex items-start gap-3">
        <div className="w-8 h-8 rounded-lg bg-amber-100 flex items-center justify-center shrink-0">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#b45309" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z" />
          </svg>
        </div>
        <div>
          <p className="text-sm font-semibold text-amber-900">Do not enter protected health information (PHI)</p>
          <p className="text-xs text-amber-700 leading-relaxed mt-0.5">
            This is a documentation helper — not a HIPAA-covered system, not a medical device, and not for storing
            patient information. Never enter names, dates of birth, or MRNs. Use only de-identified clinical shorthand.
            Everything runs in your browser; nothing is saved. You review and paste the note into the EHR, and you
            attest to its content — not this tool.
          </p>
        </div>
      </div>
    </div>
  );
}

// ── Present / absent / pending toggle ────────────────────────────────────────
function FeatureToggle({ state, onSet }) {
  const base = 'w-7 h-7 rounded-md flex items-center justify-center text-sm font-bold transition-all';
  return (
    <div className="flex gap-1 shrink-0">
      <button
        type="button" aria-label="Present"
        onClick={() => onSet(state === 'present' ? null : 'present')}
        className={`${base} ${state === 'present' ? 'bg-emerald-500 text-white shadow-soft' : 'bg-gray-100 text-gray-400 hover:bg-emerald-50 hover:text-emerald-500'}`}
      >+</button>
      <button
        type="button" aria-label="Absent"
        onClick={() => onSet(state === 'absent' ? null : 'absent')}
        className={`${base} ${state === 'absent' ? 'bg-red-500 text-white shadow-soft' : 'bg-gray-100 text-gray-400 hover:bg-red-50 hover:text-red-500'}`}
      >−</button>
      <button
        type="button" aria-label="Pending"
        onClick={() => onSet(state === 'pending' ? null : 'pending')}
        className={`${base} ${state === 'pending' ? 'bg-amber-500 text-white shadow-soft' : 'bg-gray-100 text-gray-400 hover:bg-amber-50 hover:text-amber-500'}`}
      >
        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2">
          <circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 8v4l2.5 2.5" />
        </svg>
      </button>
    </div>
  );
}

// ── Multi-select chip ────────────────────────────────────────────────────────
function Chip({ active, onClick, children, dot }) {
  return (
    <button
      type="button" onClick={onClick}
      className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
        active ? 'bg-blue-600 text-white border-blue-600 shadow-soft' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
      }`}
    >
      {dot && <span className={`w-1.5 h-1.5 rounded-full ${active ? 'bg-white/70' : dot}`} />}
      {children}
    </button>
  );
}

// ── Rendered note preview ────────────────────────────────────────────────────
// Shows the generated note with its markdown bold (**...**) and bullet spacing
// actually rendered, so the clinician sees the formatting that will paste in.
function renderInline(line) {
  // Split on **bold**; odd-indexed parts are the bolded segments.
  return line.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-gray-900">{part}</strong>
      : <span key={i}>{part}</span>
  );
}

function NotePreview({ text }) {
  const blocks = (text || '').split('\n\n').filter(b => b.trim());
  if (!blocks.length) {
    return <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-300">Nothing to preview yet.</div>;
  }
  return (
    <div className="bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-700 leading-relaxed space-y-3">
      {blocks.map((block, bi) => (
        <div key={bi}>
          {block.split('\n').map((line, li) => (
            <p key={li} className={line.startsWith('•') ? 'pl-3' : ''}>{renderInline(line)}</p>
          ))}
        </div>
      ))}
    </div>
  );
}

export function MdmScreen({ onExit }) {
  const [step, setStep] = useState(0);
  const [termsAccepted, setTermsAccepted] = useState(hasAcceptedTerms);

  function acceptTerms() {
    try { localStorage.setItem(TERMS_KEY, TERMS_META.version); } catch { /* storage unavailable */ }
    setTermsAccepted(true);
  }

  // Step 1 — diagnoses
  const [complaintSearch, setComplaintSearch] = useState('');
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [dxSearch, setDxSearch] = useState('');
  const [freeText, setFreeText] = useState('');
  const [selected, setSelected] = useState([]);        // [{ name, tier }]
  const [dxTier, setDxTier] = useState({});            // { dxName: 'likely'|'cantmiss'|'less' }

  // Step 2 — patient one-liner
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [ccTouched, setCcTouched] = useState(false);
  const [concern, setConcern] = useState('');
  const [concernTouched, setConcernTouched] = useState(false);
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [pmh, setPmh] = useState([]);
  const [pmhInput, setPmhInput] = useState('');

  // Step 3 — findings
  const [featureState, setFeatureState] = useState({}); // { dxName: { featureId: 'present'|'absent'|'pending' } }

  // Step 4 — plan
  const [plan, setPlan] = useState(emptyPlan);
  const [planCustom, setPlanCustom] = useState({});
  const [openImg, setOpenImg] = useState(null);         // which imaging modality menu is open
  const [interpretations, setInterpretations] = useState([]); // [{ study, read }]
  const [interpStudy, setInterpStudy] = useState('ECG');
  const [interpRead, setInterpRead] = useState('');
  const [consult, setConsult] = useState({ who: '', what: '' });

  // Step 5 — output
  const [mdmText, setMdmText] = useState('');
  const [copied, setCopied] = useState(false);

  const featureSets = useMemo(() => {
    const map = {};
    for (const dx of selected) map[dx.name] = featuresWithIds(getFeatureSet(dx.name).groups);
    return map;
  }, [selected]);

  const filteredComplaints = useMemo(() => {
    const q = complaintSearch.trim().toLowerCase();
    return q ? MDM_COMPLAINTS.filter(c => c.name.toLowerCase().includes(q)) : MDM_COMPLAINTS;
  }, [complaintSearch]);

  const dxResults = useMemo(() => searchDiagnoses(dxSearch), [dxSearch]);
  const isSelected = name => selected.some(d => d.name.toLowerCase() === name.toLowerCase());

  function toggleDx(name, tier = 'custom') {
    setSelected(prev => {
      const exists = prev.find(d => d.name.toLowerCase() === name.toLowerCase());
      if (exists) {
        setDxTier(t => { const c = { ...t }; delete c[name]; return c; });
        return prev.filter(d => d.name.toLowerCase() !== name.toLowerCase());
      }
      return [...prev, { name: name.trim(), tier }];
    });
  }

  function addFreeText() {
    const val = freeText.trim();
    if (!val || isSelected(val)) { setFreeText(''); return; }
    setSelected(prev => [...prev, { name: val, tier: 'custom' }]);
    setFreeText('');
  }

  function pickComplaint(slug) {
    setActiveComplaint(prev => (prev === slug ? null : slug));
    const c = MDM_COMPLAINTS.find(x => x.slug === slug);
    if (c && (!ccTouched || !chiefComplaint)) setChiefComplaint(c.name.toLowerCase());
  }

  function setTier(dxName, tierKey) {
    setDxTier(prev => {
      const current = prev[dxName];
      const next = { ...prev };
      if (current === tierKey) { delete next[dxName]; return next; }
      // Only one diagnosis can be "most likely".
      if (tierKey === 'likely') {
        for (const k of Object.keys(next)) if (next[k] === 'likely') delete next[k];
        if (!concernTouched) setConcern(dxName);
      }
      next[dxName] = tierKey;
      return next;
    });
  }

  function setFeat(dxName, featureId, value) {
    setFeatureState(prev => {
      const dxState = { ...(prev[dxName] || {}) };
      if (value === null) delete dxState[featureId];
      else dxState[featureId] = value;
      return { ...prev, [dxName]: dxState };
    });
  }

  function togglePlan(category, item) {
    setPlan(prev => {
      const list = prev[category] || [];
      return { ...prev, [category]: list.includes(item) ? list.filter(x => x !== item) : [...list, item] };
    });
  }
  function addPlanCustom(category) {
    const val = (planCustom[category] || '').trim();
    if (!val) return;
    setPlan(prev => ({ ...prev, [category]: prev[category].includes(val) ? prev[category] : [...prev[category], val] }));
    setPlanCustom(prev => ({ ...prev, [category]: '' }));
  }
  function addInterp() {
    if (!interpRead.trim()) return;
    setInterpretations(prev => [...prev, { study: interpStudy, read: interpRead.trim() }]);
    setInterpRead('');
  }
  function addPmh(val) {
    const v = val.trim();
    if (!v || pmh.includes(v)) return;
    setPmh(prev => [...prev, v]);
    setPmhInput('');
  }
  function clearAll() {
    if (!window.confirm('Clear all entries and start over?')) return;
    setStep(0);
    setSelected([]); setDxTier({}); setFeatureState({});
    setComplaintSearch(''); setActiveComplaint(null); setDxSearch(''); setFreeText('');
    setChiefComplaint(''); setCcTouched(false); setConcern(''); setConcernTouched(false);
    setAge(''); setSex(''); setPmh([]); setPmhInput('');
    setPlan(emptyPlan()); setPlanCustom({}); setOpenImg(null);
    setInterpretations([]); setInterpRead(''); setConsult({ who: '', what: '' });
    setMdmText('');
  }

  function generate() {
    const diagnoses = selected.map(dx => ({
      name: dx.name,
      tier: dxTier[dx.name] || null,
      features: featureSets[dx.name] || {},
      state: featureState[dx.name] || {},
    }));
    const text = generateMdm({
      oneLiner: { age, sex, pmh, chiefComplaint, concern },
      diagnoses, interpretations, consult, plan,
    });
    setMdmText(text);
    setCopied(false);
  }

  useEffect(() => {
    if (step === STEPS.length - 1) generate();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function copyMdm() {
    try { await navigator.clipboard.writeText(mdmText); setCopied(true); setTimeout(() => setCopied(false), 1800); }
    catch { setCopied(false); }
  }

  const canAdvance = step === 0 ? selected.length > 0 : true;

  const Header = (
    <div className="mb-6">
      <div className="flex items-center justify-between mb-4">
        <button onClick={onExit} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M15 19l-7-7 7-7" /></svg>
          Home
        </button>
        <div className="flex items-center gap-3">
          <button onClick={clearAll} className="text-[11px] text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
          <span className="text-xs text-gray-300 font-medium uppercase tracking-wider">MDM Writer</span>
        </div>
      </div>
      <div className="flex items-center gap-1.5">
        {STEPS.map((s, i) => (
          <button
            key={s} onClick={() => i <= step && setStep(i)} disabled={i > step}
            className={`flex-1 flex flex-col items-center gap-1 ${i <= step ? 'cursor-pointer' : 'cursor-default'}`}
          >
            <div className={`w-full h-1 rounded-full transition-all ${i <= step ? 'bg-blue-600' : 'bg-gray-200'}`} />
            <span className={`text-[10px] font-medium tracking-wide ${i === step ? 'text-blue-600' : i < step ? 'text-gray-500' : 'text-gray-300'}`}>{s}</span>
          </button>
        ))}
      </div>
    </div>
  );

  const Footer = (
    <div className="flex gap-2 mt-8">
      {step > 0 && (
        <button onClick={() => setStep(step - 1)} className="rounded-xl px-5 py-3 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all">Back</button>
      )}
      {step < STEPS.length - 1 && (
        <button
          onClick={() => canAdvance && setStep(step + 1)} disabled={!canAdvance}
          className="flex-1 rounded-xl px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 shadow-soft transition-all"
        >
          {step === 0 && selected.length === 0 ? 'Select at least one diagnosis' : 'Continue'}
        </button>
      )}
    </div>
  );

  // Consent gate — the MDM Writer is unavailable until the Terms of Use and the
  // licensed-provider / no-PHI acknowledgments are accepted.
  if (!termsAccepted) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <TermsModal onAgree={acceptTerms} onDecline={onExit} />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-2xl mx-auto px-5 py-6">
        {Header}

        {/* ── Step 1: Diagnoses ── */}
        {step === 0 && (
          <div>
            <PhiBanner />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-1">Pick your diagnoses</h1>
            <p className="text-sm text-gray-400 mb-6">Start from a chief complaint, search all diagnoses, or add your own.</p>

            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 ml-1">From a chief complaint</p>
            <div className="relative mb-3">
              <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
              <input value={complaintSearch} onChange={e => setComplaintSearch(e.target.value)} placeholder={`Search ${MDM_COMPLAINTS.length} chief complaints...`} className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500" />
            </div>
            <div className="flex flex-wrap gap-1.5 mb-3">
              {filteredComplaints.slice(0, 12).map(c => (
                <Chip key={c.slug} active={activeComplaint === c.slug} onClick={() => pickComplaint(c.slug)}>{c.name}</Chip>
              ))}
            </div>

            {activeComplaint && (
              <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
                <p className="text-xs text-gray-400 mb-3">
                  Tap to add. <span className="inline-flex items-center gap-1"><span className="w-1.5 h-1.5 rounded-full bg-red-400" /> must-not-miss</span>
                  <span className="inline-flex items-center gap-1 ml-2"><span className="w-1.5 h-1.5 rounded-full bg-amber-400" /> common</span>
                  <span className="inline-flex items-center gap-1 ml-2"><span className="w-1.5 h-1.5 rounded-full bg-gray-300" /> rare</span>
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {getComplaintDiagnoses(activeComplaint).map(dx => (
                    <Chip key={dx.name} active={isSelected(dx.name)} onClick={() => toggleDx(dx.name, dx.tier)} dot={TIER_DOT[dx.tier]}>{dx.name}</Chip>
                  ))}
                </div>
              </div>
            )}

            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 ml-1">Search all diagnoses</p>
            <input value={dxSearch} onChange={e => setDxSearch(e.target.value)} placeholder="e.g. pulmonary embolism" className="w-full bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 mb-2" />
            {dxResults.length > 0 && (
              <div className="flex flex-wrap gap-1.5 mb-4">
                {dxResults.map(dx => (
                  <Chip key={dx.name} active={isSelected(dx.name)} onClick={() => toggleDx(dx.name, dx.tier)} dot={TIER_DOT[dx.tier]}>{dx.name}</Chip>
                ))}
              </div>
            )}

            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 ml-1 mt-4">Add your own</p>
            <div className="flex gap-2 mb-6">
              <input value={freeText} onChange={e => setFreeText(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addFreeText(); } }} placeholder="Type any diagnosis and press Enter" className="flex-1 bg-white border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500" />
              <button onClick={addFreeText} disabled={!freeText.trim()} className="bg-gray-900 hover:bg-gray-800 disabled:opacity-30 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all">Add</button>
            </div>

            {selected.length > 0 && (
              <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
                <div className="px-4 py-2.5 border-b border-gray-100"><span className="text-xs text-gray-400 font-medium">Selected diagnoses ({selected.length})</span></div>
                <ul>
                  {selected.map((dx, i) => (
                    <li key={dx.name} className={`flex items-center justify-between px-4 py-2.5 ${i < selected.length - 1 ? 'border-b border-gray-50' : ''}`}>
                      <div className="flex items-center gap-2.5">
                        <span className={`w-1.5 h-1.5 rounded-full ${TIER_DOT[dx.tier] || 'bg-blue-300'}`} />
                        <span className="text-sm text-gray-700">{dx.name}</span>
                      </div>
                      <button onClick={() => toggleDx(dx.name, dx.tier)} className="text-gray-300 hover:text-red-400 transition-colors">
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" /></svg>
                      </button>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* ── Step 2: Patient one-liner ── */}
        {step === 1 && (
          <div>
            <PhiBanner compact />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-1">Patient one-liner</h1>
            <p className="text-sm text-gray-400 mb-6">De-identified only. A good one-liner risk-stratifies — it names the concern, not just the symptom.</p>

            <div className="bg-white border border-gray-200 rounded-xl p-5 space-y-4">
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">Chief complaint</label>
                <input value={chiefComplaint} onChange={e => { setChiefComplaint(e.target.value); setCcTouched(true); }} placeholder="e.g. chest pain" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
              </div>
              <div className="flex gap-3">
                <div className="w-24">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">Age</label>
                  <input value={age} onChange={e => setAge(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} inputMode="numeric" placeholder="58" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
                </div>
                <div className="flex-1">
                  <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">Sex</label>
                  <div className="flex gap-1.5">
                    {['male', 'female', 'other'].map(s => (
                      <button key={s} onClick={() => setSex(sex === s ? '' : s)} className={`flex-1 rounded-lg px-3 py-2 text-sm font-medium border transition-all ${sex === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>{s}</button>
                    ))}
                  </div>
                </div>
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">Relevant history</label>
                <div className="flex flex-wrap gap-1.5 mb-2">
                  {COMMON_PMH.map(p => (
                    <Chip key={p} active={pmh.includes(p)} onClick={() => pmh.includes(p) ? setPmh(pmh.filter(x => x !== p)) : addPmh(p)}>{p}</Chip>
                  ))}
                </div>
                <div className="flex gap-2">
                  <input value={pmhInput} onChange={e => setPmhInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPmh(pmhInput); } }} placeholder="Add other comorbidity" className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
                  <button onClick={() => addPmh(pmhInput)} disabled={!pmhInput.trim()} className="bg-gray-900 hover:bg-gray-800 disabled:opacity-30 text-white rounded-lg px-4 py-2 text-sm font-medium transition-all">Add</button>
                </div>
                {pmh.filter(p => !COMMON_PMH.includes(p)).length > 0 && (
                  <div className="flex flex-wrap gap-1.5 mt-2">
                    {pmh.filter(p => !COMMON_PMH.includes(p)).map(p => (
                      <span key={p} className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-600 px-2.5 py-1 text-xs">{p}<button onClick={() => setPmh(pmh.filter(x => x !== p))} className="hover:text-blue-800">×</button></span>
                    ))}
                  </div>
                )}
              </div>
              <div>
                <label className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1.5 block">Concerning for <span className="text-gray-300 normal-case">(risk-stratifies the one-liner)</span></label>
                <input value={concern} onChange={e => { setConcern(e.target.value); setConcernTouched(true); }} placeholder="e.g. acute coronary syndrome" list="concern-options" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
                <datalist id="concern-options">{selected.map(d => <option key={d.name} value={d.name} />)}</datalist>
              </div>
            </div>

            <div className="mt-4 bg-blue-50/50 border border-blue-100 rounded-xl px-4 py-3">
              <p className="text-[10px] text-blue-400 font-medium uppercase tracking-wider mb-1">Preview</p>
              <p className="text-sm text-gray-700 leading-relaxed">{buildOneLiner({ age, sex, pmh, chiefComplaint, concern })}</p>
            </div>
          </div>
        )}

        {/* ── Step 3: Findings ── */}
        {step === 2 && (
          <div>
            <PhiBanner compact />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-1">Findings by diagnosis</h1>
            <p className="text-sm text-gray-400 mb-1">
              <span className="text-emerald-600 font-medium">+</span> present · <span className="text-red-500 font-medium">−</span> absent · <span className="text-amber-500 font-medium">◷</span> pending · untouched = not assessed.
            </p>
            <p className="text-xs text-gray-400 mb-5">Untouched findings never appear in the note. Assign a tier to each diagnosis.</p>

            <div className="space-y-4">
              {selected.map(dx => {
                const groups = featureSets[dx.name] || {};
                const matched = getFeatureSet(dx.name).matched;
                const tier = dxTier[dx.name];
                return (
                  <div key={dx.name} className={`bg-white border rounded-xl overflow-hidden ${tier === 'likely' ? 'border-blue-300 shadow-soft' : 'border-gray-200'}`}>
                    <div className="px-4 py-3 border-b border-gray-100 bg-gray-50/50">
                      <div className="flex items-center gap-2 mb-2">
                        <span className={`w-1.5 h-1.5 rounded-full ${TIER_DOT[dx.tier] || 'bg-blue-300'}`} />
                        <span className="text-sm font-semibold text-gray-800">{dx.name}</span>
                        {!matched && <span className="text-[10px] text-gray-400">(generic template)</span>}
                      </div>
                      <div className="flex gap-1.5">
                        {DX_TIERS.map(t => (
                          <button key={t.key} onClick={() => setTier(dx.name, t.key)} className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium border transition-all ${tier === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>{t.label}</button>
                        ))}
                      </div>
                    </div>
                    <div className="p-4 space-y-3">
                      {GROUP_ORDER.filter(g => (groups[g] || []).length > 0).map(group => (
                        <div key={group}>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">{group}</p>
                          <div className="space-y-1">
                            {groups[group].map(f => {
                              const s = featureState[dx.name]?.[f.id];
                              return (
                                <div key={f.id} className={`flex items-center justify-between gap-3 rounded-lg px-2.5 py-1.5 transition-colors ${s === 'present' ? 'bg-emerald-50' : s === 'absent' ? 'bg-red-50' : s === 'pending' ? 'bg-amber-50' : 'hover:bg-gray-50'}`}>
                                  <span className="text-sm text-gray-600 leading-snug">{f.label}</span>
                                  <FeatureToggle state={s} onSet={v => setFeat(dx.name, f.id, v)} />
                                </div>
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* ── Step 4: Plan ── */}
        {step === 3 && (
          <div>
            <PhiBanner compact />
            <h1 className="text-xl font-bold text-gray-900 tracking-tight mb-1">Plan</h1>
            <p className="text-sm text-gray-400 mb-5">Orders, your independent reads, and consultant discussion.</p>

            <div className="space-y-4">
              {PLAN_ORDER.map(category => (
                <div key={category} className="bg-white border border-gray-200 rounded-xl p-4">
                  <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">{category}</p>

                  {category === 'Imaging' ? (
                    <div className="mb-3">
                      {/* Selected studies stay visible even when the modality menus are closed */}
                      {plan.Imaging.length > 0 && (
                        <div className="flex flex-wrap gap-1.5 mb-2.5">
                          {plan.Imaging.map(item => (
                            <Chip key={item} active onClick={() => togglePlan('Imaging', item)}>{item}</Chip>
                          ))}
                        </div>
                      )}
                      {/* One-click studies + expandable modality menus */}
                      <div className="flex flex-wrap gap-1.5">
                        {IMAGING_SIMPLE.map(item => (
                          <Chip key={item} active={plan.Imaging.includes(item)} onClick={() => togglePlan('Imaging', item)}>{item}</Chip>
                        ))}
                        {IMAGING_GROUPS.map(g => {
                          const count = g.options.filter(o => plan.Imaging.includes(g.format(o))).length;
                          const open = openImg === g.label;
                          return (
                            <button
                              key={g.label} type="button"
                              onClick={() => setOpenImg(open ? null : g.label)}
                              className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-medium border transition-all ${
                                open || count ? 'bg-blue-600 text-white border-blue-600 shadow-soft' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'
                              }`}
                            >
                              {g.label}
                              {count > 0 && <span className={`text-[10px] rounded-full px-1.5 ${open ? 'bg-white/20' : 'bg-blue-100 text-blue-700'}`}>{count}</span>}
                              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${open ? 'rotate-180' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
                            </button>
                          );
                        })}
                      </div>
                      {/* Popover panel for the open modality */}
                      {openImg && (() => {
                        const g = IMAGING_GROUPS.find(x => x.label === openImg);
                        return (
                          <div className="mt-2 bg-gray-50 border border-gray-200 rounded-lg p-3">
                            <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-2">{g.label} — tap to add</p>
                            <div className="flex flex-wrap gap-1.5">
                              {g.options.map(o => {
                                const order = g.format(o);
                                return (
                                  <Chip key={o} active={plan.Imaging.includes(order)} onClick={() => togglePlan('Imaging', order)}>{o}</Chip>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })()}
                    </div>
                  ) : (
                    <div className="flex flex-wrap gap-1.5 mb-3">
                      {PLAN_MENU[category].map(item => (
                        <Chip key={item} active={plan[category].includes(item)} onClick={() => togglePlan(category, item)}>{item}</Chip>
                      ))}
                      {plan[category].filter(x => !PLAN_MENU[category].includes(x)).map(item => (
                        <Chip key={item} active onClick={() => togglePlan(category, item)}>{item}</Chip>
                      ))}
                    </div>
                  )}

                  <div className="flex gap-2">
                    <input value={planCustom[category] || ''} onChange={e => setPlanCustom(prev => ({ ...prev, [category]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPlanCustom(category); } }} placeholder={`Add ${category.toLowerCase()}...`} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
                    <button onClick={() => addPlanCustom(category)} disabled={!(planCustom[category] || '').trim()} className="bg-gray-900 hover:bg-gray-800 disabled:opacity-30 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-all">Add</button>
                  </div>
                </div>
              ))}

              {/* Independent interpretations */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-1">My independent read</p>
                <p className="text-[11px] text-gray-400 mb-3">Attributed as "on my interpretation" — your own read of an ECG or imaging study.</p>
                <div className="flex gap-2 mb-2">
                  <select value={interpStudy} onChange={e => setInterpStudy(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-sm text-gray-700 focus:border-blue-500">
                    {INTERP_STUDIES.map(s => <option key={s}>{s}</option>)}
                  </select>
                  <input value={interpRead} onChange={e => setInterpRead(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInterp(); } }} placeholder="e.g. no acute ST changes, NSR at 78" className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
                  <button onClick={addInterp} disabled={!interpRead.trim()} className="bg-gray-900 hover:bg-gray-800 disabled:opacity-30 text-white rounded-lg px-3 py-1.5 text-sm font-medium transition-all">Add</button>
                </div>
                {interpretations.length > 0 && (
                  <ul className="space-y-1">
                    {interpretations.map((it, i) => (
                      <li key={i} className="flex items-center justify-between text-sm text-gray-600 bg-gray-50 rounded-lg px-3 py-1.5">
                        <span><span className="font-medium text-gray-700">{it.study}:</span> {it.read}</span>
                        <button onClick={() => setInterpretations(interpretations.filter((_, x) => x !== i))} className="text-gray-300 hover:text-red-400">×</button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>

              {/* Consultant discussion */}
              <div className="bg-white border border-gray-200 rounded-xl p-4">
                <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider mb-3">Consultant discussion</p>
                <div className="flex gap-2">
                  <input value={consult.who} onChange={e => setConsult({ ...consult, who: e.target.value })} placeholder="Discussed with (service/role)" className="w-1/2 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
                  <input value={consult.what} onChange={e => setConsult({ ...consult, what: e.target.value })} placeholder="who recommended..." className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── Step 5: MDM output ── */}
        {step === 4 && (
          <div>
            <div className="flex items-center justify-between mb-1">
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Your MDM draft</h1>
              <button onClick={generate} className="text-xs text-gray-400 hover:text-blue-600 flex items-center gap-1 transition-colors">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M4 4v5h5M20 20v-5h-5M4 9a8 8 0 0114-3M20 15a8 8 0 01-14 3" /></svg>
                Regenerate
              </button>
            </div>
            <p className="text-sm text-gray-400 mb-4">A draft to review, edit, and paste. You are attesting to this note — read it before it goes in the chart, and confirm there is no PHI.</p>

            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mb-1.5">Preview</p>
            <NotePreview text={mdmText} />

            <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider mt-4 mb-1.5">Edit</p>
            <textarea value={mdmText} onChange={e => setMdmText(e.target.value)} rows={18} className="w-full bg-white border border-gray-200 rounded-xl p-4 text-sm text-gray-700 leading-relaxed focus:border-blue-500 resize-y" />

            <button onClick={copyMdm} className={`w-full mt-3 rounded-xl px-5 py-3 font-semibold text-sm shadow-soft transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white'}`}>
              {copied ? '✓ Copied — review before pasting' : 'Copy draft'}
            </button>
            <PhiBanner compact />
          </div>
        )}

        {Footer}
      </div>
    </div>
  );
}
