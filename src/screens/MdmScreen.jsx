import { useState, useMemo } from 'react';
import { MDM_COMPLAINTS, getComplaintDiagnoses, searchDiagnoses, ALL_DIAGNOSES } from '../data/mdmDiagnoses';
import {
  getFeatureSet, featuresWithIds, GROUP_ORDER, PLAN_MENU, PLAN_ORDER,
  RISK_CALCULATORS, INTERP_STUDIES, COMMON_PMH, IMAGING_SIMPLE, IMAGING_GROUPS,
  getEditableLibrary,
} from '../data/mdmFeatures';
import { generateMdm, buildOneLiner, hasOneLiner, DEFAULT_HANDOFF } from '../data/mdmGenerate';
import { suggestFindings, suggestDifferential } from '../api/claude';
import { TermsModal } from '../components/TermsModal';
import { TERMS_META } from '../data/terms';

const TIER_DOT = { red: 'bg-red-400', common: 'bg-amber-400', rare: 'bg-gray-300' };
const DX_TIERS = [
  { key: 'likely', label: 'Most likely' },
  { key: 'cantmiss', label: "Can't-miss" },
  { key: 'less', label: 'Less likely' },
];

// Display styling for AI-suggested differential tiers.
const DDX_TIER_META = {
  likely: { label: 'Likely', chip: 'bg-emerald-100 text-emerald-700' },
  cantmiss: { label: "Can't-miss", chip: 'bg-red-100 text-red-700' },
  less: { label: 'Less likely', chip: 'bg-gray-100 text-gray-500' },
};

// Persisted acceptance of the Terms of Use (keyed by version so a substantive
// terms change re-prompts previously accepted users).
const TERMS_KEY = 'emtools.mdm.termsAcceptedVersion';
function hasAcceptedTerms() {
  try { return localStorage.getItem(TERMS_KEY) === TERMS_META.version; }
  catch { return false; }
}

// A fresh, empty plan keyed by every current plan category.
const emptyPlan = () => Object.fromEntries(PLAN_ORDER.map(c => [c, []]));

// Renders inline **bold** spans (from the generated note) without innerHTML.
function renderInline(line) {
  return line.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-gray-900">{part}</strong>
      : <span key={i}>{part}</span>
  );
}

// ── Small building blocks ────────────────────────────────────────────────────
function Chevron({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={`transition-transform ${open ? 'rotate-90' : ''}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function Section({ title, count, open, onToggle, children }) {
  return (
    <div className="bg-white border border-gray-200 rounded-xl mb-3 overflow-hidden">
      <button onClick={onToggle} className="w-full flex items-center justify-between px-4 py-3 hover:bg-gray-50 transition-colors">
        <span className="flex items-center gap-2 text-sm font-semibold text-gray-800">
          <span className="text-gray-400"><Chevron open={open} /></span>
          {title}
        </span>
        {count > 0 && <span className="text-[11px] font-medium text-blue-600 bg-blue-50 rounded-full px-2 py-0.5 tabular-nums">{count}</span>}
      </button>
      {open && <div className="px-4 pb-4">{children}</div>}
    </div>
  );
}

// Epic-style split "phrase button": the label is the button, with a + side
// (present) on the left and a − side (absent) on the right. Tapping the phrase
// itself toggles the third state, pending. Clicking an active side clears it.
function FeatureButton({ label, state, onSet }) {
  const rowBg = state === 'present' ? 'bg-emerald-50 border-emerald-200'
    : state === 'absent' ? 'bg-red-50 border-red-200'
    : state === 'pending' ? 'bg-amber-50 border-amber-200'
    : 'bg-white border-gray-200';
  const labelColor = state === 'present' ? 'text-emerald-800'
    : state === 'absent' ? 'text-red-800'
    : state === 'pending' ? 'text-amber-800'
    : 'text-gray-600';
  return (
    <div className={`flex items-stretch rounded-md border overflow-hidden ${rowBg}`}>
      <button
        type="button" aria-label={`Mark ${label} present`}
        onClick={() => onSet(state === 'present' ? null : 'present')}
        className={`w-7 shrink-0 flex items-center justify-center text-base font-bold transition-colors ${state === 'present' ? 'bg-emerald-500 text-white' : 'text-emerald-500/60 hover:bg-emerald-100'}`}
      >+</button>
      <button
        type="button" aria-label={`${label} — mark pending`}
        onClick={() => onSet(state === 'pending' ? null : 'pending')}
        className={`flex-1 flex items-center gap-1.5 text-left px-2 py-1 text-[13px] leading-snug transition-colors ${labelColor} hover:bg-black/[0.02]`}
      >
        {state === 'pending' && (
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className="shrink-0"><circle cx="12" cy="12" r="9" /><path strokeLinecap="round" d="M12 8v4l2.5 2.5" /></svg>
        )}
        {label}
      </button>
      <button
        type="button" aria-label={`Mark ${label} absent`}
        onClick={() => onSet(state === 'absent' ? null : 'absent')}
        className={`w-7 shrink-0 flex items-center justify-center text-base font-bold transition-colors ${state === 'absent' ? 'bg-red-500 text-white' : 'text-red-400/60 hover:bg-red-100'}`}
      >−</button>
    </div>
  );
}

function PlanChip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all ${active ? 'bg-blue-600 text-white border-blue-600 shadow-soft' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>
      <span className={`text-sm leading-none ${active ? 'text-white' : 'text-gray-300'}`}>{active ? '−' : '+'}</span>
      {children}
    </button>
  );
}

// A plain multi-select chip (no ±) for the one-liner history picker.
function Chip({ active, onClick, children }) {
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-medium border transition-all ${active ? 'bg-blue-600 text-white border-blue-600 shadow-soft' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>
      {children}
    </button>
  );
}

function ToggleRow({ label, hint, on, onToggle }) {
  return (
    <button type="button" onClick={onToggle} className={`w-full flex items-center gap-2.5 text-left rounded-lg px-3 py-2 border transition-all ${on ? 'bg-blue-50 border-blue-200' : 'bg-white border-gray-200 hover:border-gray-300'}`}>
      <span className={`w-4 h-4 rounded flex items-center justify-center shrink-0 ${on ? 'bg-blue-600 text-white' : 'bg-gray-100 text-transparent'}`}>
        <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
      </span>
      <span>
        <span className="text-sm font-medium text-gray-700 block leading-tight">{label}</span>
        {hint && <span className="text-[11px] text-gray-400">{hint}</span>}
      </span>
    </button>
  );
}

export function MdmScreen({ onExit, onAdmin }) {
  const [termsAccepted, setTermsAccepted] = useState(hasAcceptedTerms);

  function acceptTerms() {
    try { localStorage.setItem(TERMS_KEY, TERMS_META.version); } catch { /* storage unavailable */ }
    setTermsAccepted(true);
  }

  // Clinical selections
  const [selected, setSelected] = useState([]);          // [{ name, tier }]
  const [dxTier, setDxTier] = useState({});
  const [featureState, setFeatureState] = useState({});
  const [aiFeatures, setAiFeatures] = useState({});      // dxName -> AI-drafted groups
  const [aiStatus, setAiStatus] = useState({});          // dxName -> 'loading' | 'error'
  const [ddx, setDdx] = useState({ status: 'idle', phrase: '', items: [], error: '' });
  const [plan, setPlan] = useState(emptyPlan);
  const [planCustom, setPlanCustom] = useState({});
  const [openImg, setOpenImg] = useState(null);          // which imaging modality menu is open
  const [interpretations, setInterpretations] = useState([]);
  const [interpStudy, setInterpStudy] = useState('ECG');
  const [interpRead, setInterpRead] = useState('');
  const [consult, setConsult] = useState({ who: '', what: '' });
  const [deferred, setDeferred] = useState([]);
  const [defItem, setDefItem] = useState('');
  const [defRationale, setDefRationale] = useState('');
  const [calcSel, setCalcSel] = useState([]);
  const [calcImpact, setCalcImpact] = useState({});
  const [reassess, setReassess] = useState({ on: false, text: '' });
  const [sdm, setSdm] = useState({ on: false, text: '' });
  const [uncertainty, setUncertainty] = useState({ on: false, text: '' });
  const [handoff, setHandoff] = useState(DEFAULT_HANDOFF);

  // Patient one-liner
  const [chiefComplaint, setChiefComplaint] = useState('');
  const [ccTouched, setCcTouched] = useState(false);
  const [concern, setConcern] = useState('');
  const [concernTouched, setConcernTouched] = useState(false);
  const [age, setAge] = useState('');
  const [sex, setSex] = useState('');
  const [pmh, setPmh] = useState([]);
  const [pmhInput, setPmhInput] = useState('');

  // UI state
  const [dxQuery, setDxQuery] = useState('');
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [open, setOpen] = useState({ dx: true, patient: false, plan: true, interp: false, safety: false, handoff: false });
  const [dxOpen, setDxOpen] = useState({});
  const [mobileView, setMobileView] = useState('menu'); // 'menu' | 'note'
  const [copied, setCopied] = useState(false);

  // Curated library first; fall back to any AI-drafted set the clinician generated.
  const featureSets = useMemo(() => {
    const map = {};
    for (const dx of selected) {
      const groups = aiFeatures[dx.name] || getFeatureSet(dx.name).groups;
      map[dx.name] = featuresWithIds(groups);
    }
    return map;
  }, [selected, aiFeatures]);

  const isSelected = name => selected.some(d => d.name.toLowerCase() === name.toLowerCase());

  const complaintMatches = useMemo(() => {
    const q = dxQuery.trim().toLowerCase();
    return q ? MDM_COMPLAINTS.filter(c => c.name.toLowerCase().includes(q)).slice(0, 5) : [];
  }, [dxQuery]);

  const dxMatches = useMemo(() => {
    const q = dxQuery.trim();
    return q ? searchDiagnoses(q, 8).filter(d => !isSelected(d.name)) : [];
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [dxQuery, selected]);

  const exactMatch = dxMatches.some(d => d.name.toLowerCase() === dxQuery.trim().toLowerCase());

  // Catalog of every diagnosis the tool knows (differential DB + curated library,
  // including admin edits) — sent to the model so it reasons over our library.
  const catalog = useMemo(() => {
    const names = new Set();
    for (const d of ALL_DIAGNOSES) names.add(d.name);
    for (const e of getEditableLibrary()) names.add(e.name);
    return [...names];
  }, []);
  // DB tier (red/common/rare) by name, for the persistent dot on added dx.
  const dbTierByName = useMemo(() => {
    const m = new Map();
    for (const d of ALL_DIAGNOSES) m.set(d.name.toLowerCase(), d.tier);
    return m;
  }, []);

  // ── Live note ──────────────────────────────────────────────────────────────
  const oneLiner = { age, sex, pmh, chiefComplaint, concern };
  const mdmText = useMemo(() => {
    const diagnoses = selected.map(dx => ({
      name: dx.name,
      tier: dxTier[dx.name] || null,
      features: featureSets[dx.name] || {},
      state: featureState[dx.name] || {},
    }));
    const calculators = calcSel.map(name => ({ name, impact: calcImpact[name] || '' }));
    return generateMdm({
      oneLiner: { age, sex, pmh, chiefComplaint, concern },
      diagnoses, interpretations, deferred, calculators, consult,
      reassessment: reassess, sdm, uncertainty, plan, handoffLine: handoff,
    });
  }, [selected, dxTier, featureSets, featureState, age, sex, pmh, chiefComplaint, concern, interpretations, deferred, calcSel, calcImpact, consult, reassess, sdm, uncertainty, plan, handoff]);

  const hasContent = selected.length > 0 || hasOneLiner(oneLiner) || PLAN_ORDER.some(c => plan[c].length) || interpretations.length || deferred.length || calcSel.length || consult.who || reassess.on || sdm.on || uncertainty.on;

  // ── Mutators ─────────────────────────────────────────────────────────────────
  function addDx(name, tier = 'custom') {
    if (!name.trim() || isSelected(name)) return;
    setSelected(prev => [...prev, { name: name.trim(), tier }]);
    setDxOpen(prev => ({ ...prev, [name.trim()]: true }));
    setOpen(prev => ({ ...prev, dx: true }));
  }
  function removeDx(name) {
    setSelected(prev => prev.filter(d => d.name.toLowerCase() !== name.toLowerCase()));
    setDxTier(t => { const c = { ...t }; delete c[name]; return c; });
  }
  function commitQuery() {
    const q = dxQuery.trim();
    if (!q) return;
    if (dxMatches.length && !exactMatch) addDx(dxMatches[0].name, dxMatches[0].tier);
    else addDx(q);
    setDxQuery('');
  }
  // Selecting a chief complaint seeds the one-liner's CC (until hand-edited).
  function pickComplaint(slug) {
    setActiveComplaint(prev => (prev === slug ? null : slug));
    const c = MDM_COMPLAINTS.find(x => x.slug === slug);
    if (c && (!ccTouched || !chiefComplaint)) setChiefComplaint(c.name.toLowerCase());
  }
  function setTier(dxName, tierKey) {
    setDxTier(prev => {
      const next = { ...prev };
      if (next[dxName] === tierKey) { delete next[dxName]; return next; }
      if (tierKey === 'likely') {
        for (const k of Object.keys(next)) if (next[k] === 'likely') delete next[k];
        // The most-likely diagnosis seeds the one-liner's concern (until edited).
        if (!concernTouched) setConcern(dxName);
      }
      next[dxName] = tierKey;
      return next;
    });
  }
  // Draft a finding set (via the backend) for a diagnosis with no curated set.
  // The clinician then curates it on screen exactly like a curated set.
  async function generateFindings(dxName) {
    setAiStatus(prev => ({ ...prev, [dxName]: 'loading' }));
    try {
      const { groups } = await suggestFindings(dxName);
      setAiFeatures(prev => ({ ...prev, [dxName]: groups }));
      setAiStatus(prev => { const n = { ...prev }; delete n[dxName]; return n; });
    } catch {
      setAiStatus(prev => ({ ...prev, [dxName]: 'error' }));
    }
  }
  // Reason over the library to propose a differential from the search phrase.
  async function runSuggestDifferential() {
    const phrase = dxQuery.trim();
    if (!phrase || ddx.status === 'loading') return;
    setDdx({ status: 'loading', phrase, items: [], error: '' });
    try {
      const { suggestions } = await suggestDifferential(phrase, catalog);
      setDdx({ status: 'done', phrase, items: suggestions || [], error: '' });
    } catch (e) {
      setDdx({ status: 'error', phrase, items: [], error: e.message });
    }
  }
  // Add a suggested diagnosis, pre-setting its reasoning tier (user can change it).
  function addSuggestion(s) {
    if (isSelected(s.name)) return;
    const dot = s.tier === 'cantmiss' ? 'red' : (dbTierByName.get(s.name.toLowerCase()) || 'custom');
    addDx(s.name, dot);
    setTier(s.name, s.tier);
  }
  function addAllSuggestions() {
    for (const s of ddx.items) if (!isSelected(s.name)) addSuggestion(s);
  }
  function setFeat(dxName, featureId, value) {
    setFeatureState(prev => {
      const dxState = { ...(prev[dxName] || {}) };
      if (value === null) delete dxState[featureId]; else dxState[featureId] = value;
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
  function addDeferred() {
    if (!defItem.trim()) return;
    setDeferred(prev => [...prev, { item: defItem.trim(), rationale: defRationale.trim() }]);
    setDefItem(''); setDefRationale('');
  }
  function toggleCalc(name) {
    setCalcSel(prev => prev.includes(name) ? prev.filter(x => x !== name) : [...prev, name]);
  }
  function addPmh(val) {
    const v = val.trim();
    if (!v || pmh.includes(v)) return;
    setPmh(prev => [...prev, v]);
    setPmhInput('');
  }
  function clearAll() {
    if (!window.confirm('Clear all entries and start over?')) return;
    setSelected([]); setDxTier({}); setFeatureState({}); setAiFeatures({}); setAiStatus({});
    setDdx({ status: 'idle', phrase: '', items: [], error: '' });
    setPlan(emptyPlan()); setPlanCustom({}); setOpenImg(null);
    setInterpretations([]); setInterpRead(''); setConsult({ who: '', what: '' });
    setDeferred([]); setDefItem(''); setDefRationale(''); setCalcSel([]); setCalcImpact({});
    setReassess({ on: false, text: '' }); setSdm({ on: false, text: '' }); setUncertainty({ on: false, text: '' });
    setHandoff(DEFAULT_HANDOFF); setDxQuery(''); setActiveComplaint(null);
    setChiefComplaint(''); setCcTouched(false); setConcern(''); setConcernTouched(false);
    setAge(''); setSex(''); setPmh([]); setPmhInput('');
  }
  async function copyMdm() {
    try {
      if (navigator.clipboard && window.isSecureContext) await navigator.clipboard.writeText(mdmText);
      else {
        const ta = document.createElement('textarea');
        ta.value = mdmText; ta.style.position = 'fixed'; ta.style.opacity = '0';
        document.body.appendChild(ta); ta.focus(); ta.select();
        document.execCommand('copy'); document.body.removeChild(ta);
      }
      setCopied(true); setTimeout(() => setCopied(false), 1800);
    } catch { setCopied(false); }
  }

  const totalPlan = PLAN_ORDER.reduce((n, c) => n + plan[c].length, 0);
  const patientCount = (chiefComplaint ? 1 : 0) + (age ? 1 : 0) + (sex ? 1 : 0) + pmh.length + (concern ? 1 : 0);
  const safetyCount = deferred.length + calcSel.length + (reassess.on ? 1 : 0) + (sdm.on ? 1 : 0) + (uncertainty.on ? 1 : 0);
  const interpCount = interpretations.length + (consult.who ? 1 : 0);

  // ── Left menu ────────────────────────────────────────────────────────────────
  const Menu = (
    <div>
      {/* Diagnoses */}
      <Section title="Differential" count={selected.length} open={open.dx} onToggle={() => setOpen(o => ({ ...o, dx: !o.dx }))}>
        <div className="mb-2">
          <div className="relative">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
            <input
              value={dxQuery}
              onChange={e => setDxQuery(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitQuery(); } }}
              placeholder="Search, add, or describe the presentation…"
              className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white"
            />
          </div>
          <div className="flex justify-end mt-1.5">
            <button
              onClick={runSuggestDifferential}
              disabled={!dxQuery.trim() || ddx.status === 'loading'}
              title="Reason over the library to suggest a differential for this phrase"
              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all bg-white text-violet-600 border-violet-200 hover:border-violet-400 disabled:opacity-40"
            >
              {ddx.status === 'loading' ? (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="animate-spin"><path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" /></svg>Reasoning…</>
              ) : (
                <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="m13 4-2.3 5.7L5 12l5.7 2.3L13 20l2.3-5.7L21 12l-5.7-2.3L13 4Z" /></svg>Suggest differential</>
              )}
            </button>
          </div>
        </div>

        {/* Search results dropdown */}
        {dxQuery.trim() && (
          <div className="border border-gray-200 rounded-lg overflow-hidden mb-3 divide-y divide-gray-50">
            {complaintMatches.map(c => (
              <button key={c.slug} onClick={() => pickComplaint(c.slug)} className="w-full flex items-center justify-between px-3 py-2 text-left hover:bg-blue-50 transition-colors">
                <span className="text-sm text-gray-700">{c.name}</span>
                <span className="text-[10px] text-gray-400 uppercase tracking-wide">chief complaint · {c.diagnoses.length} dx</span>
              </button>
            ))}
            {dxMatches.map(d => (
              <button key={d.name} onClick={() => { addDx(d.name, d.tier); setDxQuery(''); }} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors">
                <span className={`w-1.5 h-1.5 rounded-full ${TIER_DOT[d.tier] || 'bg-gray-300'}`} />
                <span className="text-sm text-gray-700">{d.name}</span>
              </button>
            ))}
            {!exactMatch && (
              <button onClick={commitQuery} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors">
                <span className="text-blue-500 font-bold">+</span>
                <span className="text-sm text-gray-600">Add “<span className="font-medium text-gray-800">{dxQuery.trim()}</span>”</span>
              </button>
            )}
          </div>
        )}

        {/* AI-suggested differential (reasoned over the library) */}
        {(ddx.status === 'done' || ddx.status === 'error') && (
          <div className="border border-violet-200 bg-violet-50/40 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[11px] text-violet-500 font-semibold uppercase tracking-wider">Suggested differential</p>
              <button onClick={() => setDdx({ status: 'idle', phrase: '', items: [], error: '' })} className="text-gray-300 hover:text-gray-500" title="Dismiss">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" /></svg>
              </button>
            </div>
            {ddx.status === 'error' && <p className="text-xs text-red-500">Couldn’t generate — {ddx.error || 'try again'}.</p>}
            {ddx.status === 'done' && ddx.items.length === 0 && <p className="text-xs text-gray-400">No suggestions returned.</p>}
            {ddx.status === 'done' && ddx.items.length > 0 && (
              <>
                <p className="text-[11px] text-gray-400 mb-2">For “{ddx.phrase}” — tap to add. Reasoning tier is pre-set and editable.</p>
                <div className="space-y-1.5 mb-2">
                  {ddx.items.map(s => {
                    const added = isSelected(s.name);
                    const meta = DDX_TIER_META[s.tier] || DDX_TIER_META.less;
                    return (
                      <div key={s.name} className="flex items-start gap-2 bg-white border border-gray-200 rounded-lg px-2.5 py-1.5">
                        <button onClick={() => addSuggestion(s)} disabled={added} title={added ? 'Added' : 'Add to differential'} className={`shrink-0 mt-0.5 w-5 h-5 rounded flex items-center justify-center text-sm font-bold transition-colors ${added ? 'bg-emerald-500 text-white' : 'bg-violet-100 text-violet-600 hover:bg-violet-200'}`}>
                          {added ? '✓' : '+'}
                        </button>
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-1.5 flex-wrap">
                            <span className="text-[13px] font-medium text-gray-800">{s.name}</span>
                            <span className={`text-[9px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${meta.chip}`}>{meta.label}</span>
                          </div>
                          {s.reason && <p className="text-[11px] text-gray-400 leading-snug">{s.reason}</p>}
                        </div>
                      </div>
                    );
                  })}
                </div>
                {ddx.items.some(s => !isSelected(s.name)) && (
                  <button onClick={addAllSuggestions} className="text-[11px] text-violet-600 hover:text-violet-700 font-medium">+ Add all</button>
                )}
              </>
            )}
          </div>
        )}

        {/* Diagnoses for an expanded chief complaint */}
        {activeComplaint && (
          <div className="bg-gray-50 border border-gray-200 rounded-lg p-3 mb-3">
            <p className="text-[11px] text-gray-400 mb-2">{MDM_COMPLAINTS.find(c => c.slug === activeComplaint)?.name} — tap to add</p>
            <div className="flex flex-wrap gap-1.5">
              {getComplaintDiagnoses(activeComplaint).map(dx => (
                <button key={dx.name} onClick={() => addDx(dx.name, dx.tier)} disabled={isSelected(dx.name)} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all ${isSelected(dx.name) ? 'bg-blue-600 text-white border-blue-600 opacity-60' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>
                  <span className={`w-1.5 h-1.5 rounded-full ${isSelected(dx.name) ? 'bg-white/70' : TIER_DOT[dx.tier]}`} />
                  {dx.name}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Selected diagnoses — each a collapsible finding panel */}
        {selected.length === 0 && <p className="text-xs text-gray-300 py-2">No diagnoses yet. Search above to build your differential.</p>}
        <div className="space-y-2">
          {selected.map(dx => {
            const groups = featureSets[dx.name] || {};
            const matched = getFeatureSet(dx.name).matched;
            const hasAi = Boolean(aiFeatures[dx.name]);
            const aiState = aiStatus[dx.name];
            const tier = dxTier[dx.name];
            const isOpen = dxOpen[dx.name];
            const marks = Object.keys(featureState[dx.name] || {}).length;
            return (
              <div key={dx.name} className={`border rounded-lg overflow-hidden ${tier === 'likely' ? 'border-blue-300' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/70">
                  <button onClick={() => setDxOpen(o => ({ ...o, [dx.name]: !o[dx.name] }))} className="text-gray-400 shrink-0"><Chevron open={isOpen} /></button>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TIER_DOT[dx.tier] || 'bg-blue-300'}`} />
                  <span className="text-sm font-semibold text-gray-800 flex-1 truncate">{dx.name}</span>
                  {marks > 0 && <span className="text-[10px] text-blue-600 bg-blue-50 rounded-full px-1.5 py-0.5">{marks}</span>}
                  <button onClick={() => removeDx(dx.name)} className="text-gray-300 hover:text-red-400 shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
                {isOpen && (
                  <div className="p-3">
                    <div className="flex gap-1.5 mb-3">
                      {DX_TIERS.map(t => (
                        <button key={t.key} onClick={() => setTier(dx.name, t.key)} className={`flex-1 rounded-md px-2 py-1 text-[11px] font-medium border transition-all ${tier === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>{t.label}</button>
                      ))}
                    </div>
                    {!matched && !hasAi && (
                      <div className="mb-2 rounded-lg bg-gray-50 border border-gray-200 p-2.5">
                        <p className="text-[10px] text-gray-400 mb-1.5">No curated finding set for this diagnosis — a generic template is shown.</p>
                        <button
                          onClick={() => generateFindings(dx.name)}
                          disabled={aiState === 'loading'}
                          className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all bg-white text-blue-600 border-blue-200 hover:border-blue-400 disabled:opacity-50"
                        >
                          {aiState === 'loading' ? (
                            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="animate-spin"><path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" /></svg>Drafting findings…</>
                          ) : (
                            <><svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16 2.3 5.7L21 12l-5.7 2.3L13 20l-2.3-5.7L5 12l5.7-2.3L13 4Z" /></svg>Suggest findings</>
                          )}
                        </button>
                        {aiState === 'error' && <span className="ml-2 text-[10px] text-red-500">Couldn’t generate — try again.</span>}
                      </div>
                    )}
                    {hasAi && <p className="text-[10px] text-blue-500 mb-2">AI-suggested draft — review and curate before relying on it.</p>}
                    <p className="text-[10px] text-gray-400 mb-2"><span className="text-emerald-600 font-bold">+</span> present · <span className="text-red-500 font-bold">−</span> absent · tap the phrase for pending</p>
                    <div className="space-y-3">
                      {GROUP_ORDER.filter(g => (groups[g] || []).length > 0).map(group => (
                        <div key={group}>
                          <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1">{group}</p>
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-1">
                            {groups[group].map(f => {
                              const s = featureState[dx.name]?.[f.id];
                              return (
                                <FeatureButton key={f.id} label={f.label} state={s} onSet={v => setFeat(dx.name, f.id, v)} />
                              );
                            })}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Patient one-liner */}
      <Section title="Patient one-liner" count={patientCount} open={open.patient} onToggle={() => setOpen(o => ({ ...o, patient: !o.patient }))}>
        <p className="text-[11px] text-gray-400 mb-3">De-identified only. A good one-liner risk-stratifies — it names the concern, not just the symptom.</p>
        <div className="space-y-3">
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Chief complaint</label>
            <input value={chiefComplaint} onChange={e => { setChiefComplaint(e.target.value); setCcTouched(true); }} placeholder="e.g. chest pain" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
          </div>
          <div className="flex gap-2">
            <div className="w-20">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Age</label>
              <input value={age} onChange={e => setAge(e.target.value.replace(/[^0-9]/g, '').slice(0, 3))} inputMode="numeric" placeholder="58" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
            </div>
            <div className="flex-1">
              <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Sex</label>
              <div className="flex gap-1.5">
                {['male', 'female', 'other'].map(s => (
                  <button key={s} onClick={() => setSex(sex === s ? '' : s)} className={`flex-1 rounded-lg px-2 py-1.5 text-xs font-medium border transition-all ${sex === s ? 'bg-gray-900 text-white border-gray-900' : 'bg-gray-50 text-gray-500 border-gray-200 hover:bg-gray-100'}`}>{s}</button>
                ))}
              </div>
            </div>
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Relevant history</label>
            <div className="flex flex-wrap gap-1.5 mb-1.5">
              {COMMON_PMH.map(p => (
                <Chip key={p} active={pmh.includes(p)} onClick={() => pmh.includes(p) ? setPmh(pmh.filter(x => x !== p)) : addPmh(p)}>{p}</Chip>
              ))}
            </div>
            <div className="flex gap-1.5">
              <input value={pmhInput} onChange={e => setPmhInput(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPmh(pmhInput); } }} placeholder="+ add comorbidity" className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
            </div>
            {pmh.filter(p => !COMMON_PMH.includes(p)).length > 0 && (
              <div className="flex flex-wrap gap-1.5 mt-1.5">
                {pmh.filter(p => !COMMON_PMH.includes(p)).map(p => (
                  <span key={p} className="inline-flex items-center gap-1 rounded-full bg-blue-50 text-blue-600 px-2.5 py-1 text-xs">{p}<button onClick={() => setPmh(pmh.filter(x => x !== p))} className="hover:text-blue-800">×</button></span>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Concerning for</label>
            <input value={concern} onChange={e => { setConcern(e.target.value); setConcernTouched(true); }} placeholder="e.g. acute coronary syndrome" list="concern-options" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
            <datalist id="concern-options">{selected.map(d => <option key={d.name} value={d.name} />)}</datalist>
          </div>
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg px-3 py-2">
            <p className="text-[10px] text-blue-400 font-semibold uppercase tracking-wider mb-0.5">Preview</p>
            <p className="text-[13px] text-gray-700 leading-relaxed">{buildOneLiner(oneLiner)}</p>
          </div>
        </div>
      </Section>

      {/* Plan */}
      <Section title="Plan" count={totalPlan} open={open.plan} onToggle={() => setOpen(o => ({ ...o, plan: !o.plan }))}>
        <div className="space-y-3">
          {PLAN_ORDER.map(category => (
            <div key={category}>
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">{category}</p>

              {category === 'Imaging' ? (
                <div className="mb-1.5">
                  {/* Selected studies stay visible even when the modality menus are closed */}
                  {plan.Imaging.length > 0 && (
                    <div className="flex flex-wrap gap-1.5 mb-1.5">
                      {plan.Imaging.map(item => (
                        <PlanChip key={item} active onClick={() => togglePlan('Imaging', item)}>{item}</PlanChip>
                      ))}
                    </div>
                  )}
                  {/* One-click studies + expandable modality menus */}
                  <div className="flex flex-wrap gap-1.5">
                    {IMAGING_SIMPLE.map(item => (
                      <PlanChip key={item} active={plan.Imaging.includes(item)} onClick={() => togglePlan('Imaging', item)}>{item}</PlanChip>
                    ))}
                    {IMAGING_GROUPS.map(g => {
                      const count = g.options.filter(o => plan.Imaging.includes(g.format(o))).length;
                      const isOpen = openImg === g.label;
                      return (
                        <button
                          key={g.label} type="button"
                          onClick={() => setOpenImg(isOpen ? null : g.label)}
                          className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all ${isOpen || count ? 'bg-blue-600 text-white border-blue-600 shadow-soft' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}
                        >
                          {g.label}
                          {count > 0 && <span className={`text-[10px] rounded-full px-1.5 ${isOpen ? 'bg-white/20' : 'bg-blue-100 text-blue-700'}`}>{count}</span>}
                          <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" className={`transition-transform ${isOpen ? 'rotate-180' : ''}`}><path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" /></svg>
                        </button>
                      );
                    })}
                  </div>
                  {/* Popover panel for the open modality */}
                  {openImg && (() => {
                    const g = IMAGING_GROUPS.find(x => x.label === openImg);
                    return (
                      <div className="mt-1.5 bg-gray-50 border border-gray-200 rounded-lg p-2.5">
                        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">{g.label} — tap to add</p>
                        <div className="flex flex-wrap gap-1.5">
                          {g.options.map(o => {
                            const order = g.format(o);
                            return (
                              <PlanChip key={o} active={plan.Imaging.includes(order)} onClick={() => togglePlan('Imaging', order)}>{o}</PlanChip>
                            );
                          })}
                        </div>
                      </div>
                    );
                  })()}
                </div>
              ) : (
                <div className="flex flex-wrap gap-1.5 mb-1.5">
                  {PLAN_MENU[category].map(item => (
                    <PlanChip key={item} active={plan[category].includes(item)} onClick={() => togglePlan(category, item)}>{item}</PlanChip>
                  ))}
                  {plan[category].filter(x => !PLAN_MENU[category].includes(x)).map(item => (
                    <PlanChip key={item} active onClick={() => togglePlan(category, item)}>{item}</PlanChip>
                  ))}
                </div>
              )}

              <div className="flex gap-1.5">
                <input value={planCustom[category] || ''} onChange={e => setPlanCustom(prev => ({ ...prev, [category]: e.target.value }))} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addPlanCustom(category); } }} placeholder={`+ add ${category.toLowerCase()}`} className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
              </div>
            </div>
          ))}
        </div>
      </Section>

      {/* Interpretations & discussion */}
      <Section title="Interpretations & discussion" count={interpCount} open={open.interp} onToggle={() => setOpen(o => ({ ...o, interp: !o.interp }))}>
        <p className="text-[11px] text-gray-400 mb-2">Your independent read of an ECG or study — attributed “on my interpretation.”</p>
        <div className="flex gap-1.5 mb-2">
          <select value={interpStudy} onChange={e => setInterpStudy(e.target.value)} className="bg-gray-50 border border-gray-200 rounded-lg px-2 py-1.5 text-xs text-gray-700 focus:border-blue-500">
            {INTERP_STUDIES.map(s => <option key={s}>{s}</option>)}
          </select>
          <input value={interpRead} onChange={e => setInterpRead(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addInterp(); } }} placeholder="e.g. no acute ST changes, NSR at 78" className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
          <button onClick={addInterp} disabled={!interpRead.trim()} className="bg-gray-900 hover:bg-gray-800 disabled:opacity-30 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium">Add</button>
        </div>
        {interpretations.length > 0 && (
          <ul className="space-y-1 mb-3">
            {interpretations.map((it, i) => (
              <li key={i} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5">
                <span><span className="font-medium text-gray-700">{it.study}:</span> {it.read}</span>
                <button onClick={() => setInterpretations(interpretations.filter((_, x) => x !== i))} className="text-gray-300 hover:text-red-400">×</button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Consultant discussion</p>
        <div className="flex gap-1.5">
          <input value={consult.who} onChange={e => setConsult({ ...consult, who: e.target.value })} placeholder="Discussed with…" className="w-1/2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
          <input value={consult.what} onChange={e => setConsult({ ...consult, what: e.target.value })} placeholder="who recommended…" className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
        </div>
      </Section>

      {/* Safety net */}
      <Section title="Safety net & reasoning" count={safetyCount} open={open.safety} onToggle={() => setOpen(o => ({ ...o, safety: !o.safety }))}>
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Considered but deferred</p>
        <div className="flex gap-1.5 mb-2">
          <input value={defItem} onChange={e => setDefItem(e.target.value)} placeholder="test / treatment" className="w-1/2 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
          <input value={defRationale} onChange={e => setDefRationale(e.target.value)} onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDeferred(); } }} placeholder="rationale (e.g. PERC negative)" className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
          <button onClick={addDeferred} disabled={!defItem.trim()} className="bg-gray-900 hover:bg-gray-800 disabled:opacity-30 text-white rounded-lg px-2.5 py-1.5 text-xs font-medium">Add</button>
        </div>
        {deferred.length > 0 && (
          <ul className="space-y-1 mb-3">
            {deferred.map((d, i) => (
              <li key={i} className="flex items-center justify-between text-xs text-gray-600 bg-gray-50 rounded-lg px-2.5 py-1.5">
                <span><span className="font-medium text-gray-700">{d.item}</span>{d.rationale ? ` — ${d.rationale}` : ''}</span>
                <button onClick={() => setDeferred(deferred.filter((_, x) => x !== i))} className="text-gray-300 hover:text-red-400">×</button>
              </li>
            ))}
          </ul>
        )}
        <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1.5">Decision instruments</p>
        <div className="flex flex-wrap gap-1.5 mb-2">
          {RISK_CALCULATORS.map(c => (
            <PlanChip key={c} active={calcSel.includes(c)} onClick={() => toggleCalc(c)}>{c}</PlanChip>
          ))}
        </div>
        {calcSel.length > 0 && (
          <div className="space-y-1.5 mb-3">
            {calcSel.map(c => (
              <div key={c} className="flex items-center gap-2">
                <span className="text-[11px] text-gray-500 w-28 shrink-0 truncate">{c}</span>
                <input value={calcImpact[c] || ''} onChange={e => setCalcImpact(prev => ({ ...prev, [c]: e.target.value }))} placeholder="result & what it changed" className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1 text-xs text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
              </div>
            ))}
          </div>
        )}
        <div className="space-y-1.5">
          <ToggleRow label="Serial reassessment" on={reassess.on} onToggle={() => setReassess({ ...reassess, on: !reassess.on })} />
          {reassess.on && <input value={reassess.text} onChange={e => setReassess({ ...reassess, text: e.target.value })} placeholder="for… (e.g. repeat troponin, response to therapy)" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />}
          <ToggleRow label="Shared decision-making" on={sdm.on} onToggle={() => setSdm({ ...sdm, on: !sdm.on })} />
          {sdm.on && <input value={sdm.text} onChange={e => setSdm({ ...sdm, text: e.target.value })} placeholder="regarding… (e.g. testing options, admission vs discharge)" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />}
          <ToggleRow label="Diagnostic uncertainty & return precautions" on={uncertainty.on} onToggle={() => setUncertainty({ ...uncertainty, on: !uncertainty.on })} />
          {uncertainty.on && <input value={uncertainty.text} onChange={e => setUncertainty({ ...uncertainty, text: e.target.value })} placeholder="including… (specific return precautions)" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-xs text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />}
        </div>
      </Section>

      {/* Handoff */}
      <Section title="Handoff line" open={open.handoff} onToggle={() => setOpen(o => ({ ...o, handoff: !o.handoff }))}>
        <p className="text-[11px] text-gray-400 mb-2">Closes the note. The ED course lives in the EHR — this tool writes the initial reasoning and stops.</p>
        <input value={handoff} onChange={e => setHandoff(e.target.value)} className="w-full bg-gray-50 border border-gray-200 rounded-lg px-2.5 py-1.5 text-sm text-gray-700 focus:border-blue-500 focus:bg-white" />
      </Section>
    </div>
  );

  // ── Right note pane ──────────────────────────────────────────────────────────
  const Note = (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col lg:h-[calc(100vh-7rem)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <span className="text-sm font-semibold text-gray-800">MDM note</span>
        <button onClick={copyMdm} className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition-all ${copied ? 'bg-emerald-600 text-white' : 'bg-blue-600 hover:bg-blue-700 text-white'}`}>
          {copied ? '✓ Copied' : 'Copy note'}
        </button>
      </div>
      <div className="flex-1 overflow-y-auto p-4">
        {hasContent ? (
          <div className="space-y-3">
            {mdmText.split('\n\n').map((block, bi) => (
              <div key={bi} className="text-[13px] text-gray-700 leading-relaxed">
                {block.split('\n').map((line, li) => (
                  <p key={li} className={line.startsWith('•') ? 'pl-3' : ''}>{renderInline(line)}</p>
                ))}
              </div>
            ))}
          </div>
        ) : (
          <div className="h-full flex items-center justify-center text-center px-6">
            <p className="text-sm text-gray-300">Select diagnoses and click findings on the left.<br />Your note builds here, live.</p>
          </div>
        )}
      </div>
      <div className="px-4 py-2 border-t border-gray-100 flex items-center gap-2 text-[11px] text-amber-700 bg-amber-50">
        <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="shrink-0"><path strokeLinecap="round" strokeLinejoin="round" d="M12 9v4m0 4h.01M10.3 3.9L1.8 18a2 2 0 001.7 3h17a2 2 0 001.7-3L14.7 3.9a2 2 0 00-3.4 0z" /></svg>
        <span>No PHI. Review before pasting — you attest to this note.</span>
      </div>
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
      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#fafafa]/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={onExit} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M15 19l-7-7 7-7" /></svg>
            Home
          </button>
          <span className="text-sm font-bold text-gray-800 tracking-tight">MDM Writer</span>
          <div className="flex items-center gap-3">
            {/* mobile pane toggle */}
            <div className="flex lg:hidden bg-gray-100 rounded-lg p-0.5">
              <button onClick={() => setMobileView('menu')} className={`px-2.5 py-1 text-xs font-medium rounded-md ${mobileView === 'menu' ? 'bg-white text-gray-800 shadow-soft' : 'text-gray-400'}`}>Menu</button>
              <button onClick={() => setMobileView('note')} className={`px-2.5 py-1 text-xs font-medium rounded-md ${mobileView === 'note' ? 'bg-white text-gray-800 shadow-soft' : 'text-gray-400'}`}>Note</button>
            </div>
            {onAdmin && <button onClick={onAdmin} className="text-[11px] text-gray-400 hover:text-blue-600 transition-colors">Edit library</button>}
            <button onClick={clearAll} className="text-[11px] text-gray-400 hover:text-red-500 transition-colors">Clear all</button>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="lg:grid lg:grid-cols-[1fr_minmax(340px,420px)] lg:gap-5 lg:items-start">
          <div className={mobileView === 'note' ? 'hidden lg:block' : ''}>{Menu}</div>
          <div className={`${mobileView === 'menu' ? 'hidden lg:block' : ''} lg:sticky lg:top-[4.5rem]`}>{Note}</div>
        </div>
      </div>
    </div>
  );
}
