import { useState, useMemo } from 'react';
import { MDM_COMPLAINTS, getComplaintDiagnoses, searchDiagnoses } from '../data/mdmDiagnoses';
import {
  getFeatureSet, featuresWithIds, GROUP_ORDER, PLAN_MENU, PLAN_ORDER,
  IMAGING_SIMPLE, IMAGING_GROUPS,
} from '../data/mdmFeatures';
import { generateMdmBlocks, DEFAULT_HANDOFF } from '../data/mdmGenerate';
import { suggestFindings, suggestDiagnoses, suggestPlan } from '../api/claude';
import { getPlanSuggestions, recordPlanSelection } from '../data/planSuggest';
import { TermsModal } from '../components/TermsModal';
import { TERMS_META } from '../data/terms';

const TIER_DOT = { red: 'bg-red-400', common: 'bg-amber-400', rare: 'bg-gray-300' };
const DX_TIERS = [
  { key: 'likely', label: 'Most likely' },
  { key: 'cantmiss', label: "Can't-miss" },
  { key: 'less', label: 'Less likely' },
  { key: 'consideration', label: 'Under consideration' },
];

// The four finding sections shown per diagnosis, each drawing from one or more of
// the underlying feature groups. History folds in patient-reported symptoms;
// Physical is the exam. (Findings still carry a for/against direction internally,
// which drives the note — but the clinician just marks each finding + or −.)
const SECTIONS = [
  { title: 'History', groups: ['History', 'Symptoms'] },
  { title: 'Physical', groups: ['Exam'] },
  { title: 'Labs', groups: ['Labs'] },
  { title: 'Imaging', groups: ['Imaging'] },
];

// How many suggested items to surface per plan category.
const SUGGEST_PER_CATEGORY = 5;

// Persisted acceptance of the Terms of Use (keyed by version so a substantive
// terms change re-prompts previously accepted users).
const TERMS_KEY = 'emtools.mdm.termsAcceptedVersion';
function hasAcceptedTerms() {
  try { return localStorage.getItem(TERMS_KEY) === TERMS_META.version; }
  catch { return false; }
}

// A fresh, empty plan keyed by every current plan category.
const emptyPlan = () => Object.fromEntries(PLAN_ORDER.map(c => [c, []]));

// A selected entry may lump several diagnoses together (e.g. bladder + prostate
// cancer); its stable key and display name is the members joined with " / ".
const keyOf = item => item.names.join(' / ');

// Renders inline **bold** spans (from the generated note) without innerHTML.
function renderInline(line) {
  return line.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-gray-900">{part}</strong>
      : <span key={i}>{part}</span>
  );
}

// Merge the curated (or AI-drafted) feature groups for every member of a lumped
// entry into one set, de-duplicating by label within each group so a phrase
// shared by two diagnoses shows only once.
function mergeGroups(names, aiFeatures) {
  const merged = Object.fromEntries(GROUP_ORDER.map(g => [g, []]));
  const seen = Object.fromEntries(GROUP_ORDER.map(g => [g, new Set()]));
  for (const nm of names) {
    const groups = aiFeatures[nm] || getFeatureSet(nm).groups;
    for (const g of GROUP_ORDER) {
      for (const f of groups[g] || []) {
        const k = f.label.trim().toLowerCase();
        if (seen[g].has(k)) continue;
        seen[g].add(k);
        merged[g].push(f);
      }
    }
  }
  return merged;
}

// ── Small building blocks ────────────────────────────────────────────────────
function Chevron({ open }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" className={`transition-transform ${open ? 'rotate-90' : ''}`}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
    </svg>
  );
}

function Sparkle({ className = '' }) {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className={className}>
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16 2.3 5.7L21 12l-5.7 2.3L13 20l-2.3-5.7L5 12l5.7-2.3L13 4Z" />
    </svg>
  );
}

function Spinner() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" className="animate-spin"><path strokeLinecap="round" d="M12 3a9 9 0 1 0 9 9" /></svg>;
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

// A double-sided finding control: tap the "+" cap to mark the finding present,
// the "−" cap to mark it absent, and the middle (the label) to mark its result
// pending. Tapping the active zone again clears it. The whole row is tinted to
// the current state, so intent is self-evident without any instructions.
function FeatureButton({ label, state, onSet }) {
  const rowTint = state === 'present' ? 'border-emerald-300 bg-emerald-50'
    : state === 'absent' ? 'border-red-300 bg-red-50'
    : state === 'pending' ? 'border-amber-300 bg-amber-50'
    : 'border-gray-200 bg-white';
  const toggle = v => onSet(state === v ? null : v);
  const plusOn = state === 'present', minusOn = state === 'absent', pendOn = state === 'pending';
  return (
    <div className={`flex items-stretch rounded-md border overflow-hidden text-[13px] transition-colors ${rowTint}`}>
      <button
        type="button" onClick={() => toggle('present')} title="Present" aria-pressed={plusOn}
        aria-label={`${label} — present`}
        className={`w-8 shrink-0 flex items-center justify-center text-base font-bold border-r transition-colors ${plusOn ? 'bg-emerald-500 text-white border-emerald-500' : 'text-emerald-600 border-gray-200 hover:bg-emerald-100/60'}`}
      >+</button>
      <button
        type="button" onClick={() => toggle('pending')} title="Result pending"
        aria-label={`${label}${pendOn ? ' — pending' : ' — mark result pending'}`}
        className="flex-1 text-left px-2 py-1 leading-snug flex items-center gap-1.5 min-w-0"
      >
        <span className="flex-1 min-w-0">{label}</span>
        {pendOn && <span className="text-[11px] text-amber-600 font-medium shrink-0">⏱ pending</span>}
      </button>
      <button
        type="button" onClick={() => toggle('absent')} title="Absent" aria-pressed={minusOn}
        aria-label={`${label} — absent`}
        className={`w-8 shrink-0 flex items-center justify-center text-base font-bold border-l transition-colors ${minusOn ? 'bg-red-500 text-white border-red-500' : 'text-red-500 border-gray-200 hover:bg-red-100/60'}`}
      >−</button>
    </div>
  );
}

function PlanChip({ active, suggested, onClick, children }) {
  const base = active
    ? 'bg-blue-600 text-white border-blue-600 shadow-soft'
    : suggested
      ? 'bg-blue-50 text-blue-700 border-blue-200 hover:border-blue-400'
      : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600';
  return (
    <button type="button" onClick={onClick} className={`inline-flex items-center gap-1 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all ${base}`}>
      <span className={`text-sm leading-none ${active ? 'text-white' : 'text-gray-300'}`}>{active ? '−' : '+'}</span>
      {children}
    </button>
  );
}

export function MdmScreen({ onExit, onAdmin }) {
  const [termsAccepted, setTermsAccepted] = useState(hasAcceptedTerms);

  function acceptTerms() {
    try { localStorage.setItem(TERMS_KEY, TERMS_META.version); } catch { /* storage unavailable */ }
    setTermsAccepted(true);
  }

  // Clinical selections. Each `selected` entry is { names:[...], tier } — a single
  // diagnosis has one name; lumped diagnoses carry several.
  const [selected, setSelected] = useState([]);
  const [dxTier, setDxTier] = useState({});              // key -> MDM tier
  const [featureState, setFeatureState] = useState({});  // key -> { featureId: state }
  const [aiFeatures, setAiFeatures] = useState({});      // dxName -> AI-drafted groups
  const [aiStatus, setAiStatus] = useState({});          // dxName -> 'loading' | 'error'
  const [lumpSel, setLumpSel] = useState(new Set());     // keys checked for lumping
  const [plan, setPlan] = useState(emptyPlan);
  const [planCustom, setPlanCustom] = useState({});
  const [openImg, setOpenImg] = useState(null);          // which imaging modality menu is open
  const [handoff, setHandoff] = useState(DEFAULT_HANDOFF);

  // Plan suggestion state
  const [learnTick, setLearnTick] = useState(0);         // bumps when learning is recorded
  const [aiPlan, setAiPlan] = useState({});              // AI-drafted plan items (folded into suggestions)
  const [aiPlanStatus, setAiPlanStatus] = useState(null);

  // Chief-complaint → AI differential
  const [aiDx, setAiDx] = useState({ query: '', status: null, results: [] });

  // UI state
  const [dxQuery, setDxQuery] = useState('');
  const [activeComplaint, setActiveComplaint] = useState(null);
  const [open, setOpen] = useState({ dx: true, plan: false, handoff: false });
  const [dxOpen, setDxOpen] = useState({});
  const [mobileView, setMobileView] = useState('menu'); // 'menu' | 'note'
  const [copied, setCopied] = useState(false);

  // Note-pane block ordering (drag-and-drop). Holds an explicit id order; blocks
  // not listed here fall back to their natural (tier-sorted) position.
  const [blockOrder, setBlockOrder] = useState([]);
  const [dragId, setDragId] = useState(null);

  // Curated library first; fall back to any AI-drafted set. For lumped entries the
  // member sets are merged.
  const featureSets = useMemo(() => {
    const map = {};
    for (const item of selected) {
      map[keyOf(item)] = featuresWithIds(mergeGroups(item.names, aiFeatures));
    }
    return map;
  }, [selected, aiFeatures]);

  const isSelected = name => selected.some(it => it.names.some(n => n.toLowerCase() === name.toLowerCase()));
  const dxNames = selected.flatMap(it => it.names);

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

  // Ranked plan suggestions for the current differential (curated + learned + AI).
  const planSuggestions = useMemo(
    () => getPlanSuggestions(dxNames, aiPlan),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [selected, aiPlan, learnTick]
  );

  // ── Live note blocks ─────────────────────────────────────────────────────────
  const noteBlocks = useMemo(() => {
    const diagnoses = selected.map(item => {
      const key = keyOf(item);
      return {
        name: key,
        tier: dxTier[key] || null,
        features: featureSets[key] || {},
        state: featureState[key] || {},
      };
    });
    return generateMdmBlocks({ diagnoses, plan, handoffLine: handoff });
  }, [selected, dxTier, featureSets, featureState, plan, handoff]);

  // Apply the user's drag order on top of the natural block order.
  const orderedBlocks = useMemo(() => {
    const byId = new Map(noteBlocks.map(b => [b.id, b]));
    const seen = new Set();
    const out = [];
    for (const id of blockOrder) {
      if (byId.has(id) && !seen.has(id)) { out.push(byId.get(id)); seen.add(id); }
    }
    for (const b of noteBlocks) if (!seen.has(b.id)) out.push(b);
    return out;
  }, [noteBlocks, blockOrder]);

  const mdmText = useMemo(() => orderedBlocks.map(b => b.text).join('\n\n'), [orderedBlocks]);
  const hasContent = orderedBlocks.length > 0;

  // ── Mutators ─────────────────────────────────────────────────────────────────
  function addDx(name, tier = 'custom') {
    const clean = name.trim();
    if (!clean || isSelected(clean)) return;
    setSelected(prev => [...prev, { names: [clean], tier }]);
    setDxOpen(prev => ({ ...prev, [clean]: true }));
    setOpen(prev => ({ ...prev, dx: true }));
  }
  function removeDx(key) {
    setSelected(prev => prev.filter(it => keyOf(it) !== key));
    setDxTier(t => { const c = { ...t }; delete c[key]; return c; });
    setFeatureState(s => { const c = { ...s }; delete c[key]; return c; });
    setLumpSel(prev => { const n = new Set(prev); n.delete(key); return n; });
  }
  function toggleLump(key) {
    setLumpSel(prev => { const n = new Set(prev); n.has(key) ? n.delete(key) : n.add(key); return n; });
  }
  // Combine the checked entries into one lumped diagnosis at the first one's slot.
  function lumpSelected() {
    const keys = new Set(lumpSel);
    if (keys.size < 2) return;
    setSelected(prev => {
      const chosen = prev.filter(it => keys.has(keyOf(it)));
      if (chosen.length < 2) return prev;
      const names = chosen.flatMap(it => it.names);
      const tier = chosen.find(it => it.tier === 'red')?.tier || chosen[0].tier;
      const merged = { names, tier };
      const firstIdx = prev.findIndex(it => keys.has(keyOf(it)));
      const rest = prev.filter(it => !keys.has(keyOf(it)));
      rest.splice(Math.max(0, firstIdx), 0, merged);
      setDxOpen(o => ({ ...o, [keyOf(merged)]: true }));
      return rest;
    });
    setLumpSel(new Set());
  }
  // Split a lumped entry back into its individual diagnoses.
  function unlump(key) {
    setSelected(prev => {
      const idx = prev.findIndex(it => keyOf(it) === key);
      if (idx < 0 || prev[idx].names.length < 2) return prev;
      const item = prev[idx];
      const singles = item.names.map(nm => ({ names: [nm], tier: item.tier }));
      const copy = [...prev];
      copy.splice(idx, 1, ...singles);
      return copy;
    });
    setLumpSel(prev => { const n = new Set(prev); n.delete(key); return n; });
  }
  function commitQuery() {
    const q = dxQuery.trim();
    if (!q) return;
    if (dxMatches.length && !exactMatch) addDx(dxMatches[0].name, dxMatches[0].tier);
    else addDx(q);
    setDxQuery('');
  }
  function pickComplaint(slug) {
    setActiveComplaint(prev => (prev === slug ? null : slug));
  }
  function setTier(key, tierKey) {
    setDxTier(prev => {
      const next = { ...prev };
      if (next[key] === tierKey) { delete next[key]; return next; }
      if (tierKey === 'likely') {
        for (const k of Object.keys(next)) if (next[k] === 'likely') delete next[k];
      }
      next[key] = tierKey;
      return next;
    });
  }
  // Draft a finding set (via the backend) for a diagnosis with no curated set.
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
  // Turn a free-text chief complaint into a candidate differential (AI).
  async function generateDiagnoses() {
    const q = dxQuery.trim();
    if (!q) return;
    setAiDx({ query: q, status: 'loading', results: [] });
    try {
      const { diagnoses } = await suggestDiagnoses(q);
      setAiDx({ query: q, status: 'done', results: diagnoses });
    } catch {
      setAiDx({ query: q, status: 'error', results: [] });
    }
  }
  function setFeat(key, featureId, value) {
    setFeatureState(prev => {
      const dxState = { ...(prev[key] || {}) };
      if (value === null || value === undefined) delete dxState[featureId];
      else dxState[featureId] = value;
      return { ...prev, [key]: dxState };
    });
  }
  function togglePlan(category, item) {
    const has = (plan[category] || []).includes(item);
    setPlan(prev => {
      const list = prev[category] || [];
      return { ...prev, [category]: list.includes(item) ? list.filter(x => x !== item) : [...list, item] };
    });
    if (!has && dxNames.length) {
      recordPlanSelection(dxNames, category, item);
      setLearnTick(t => t + 1);
    }
  }
  function addPlanCustom(category) {
    const val = (planCustom[category] || '').trim();
    if (!val) return;
    if (!plan[category].includes(val)) {
      setPlan(prev => ({ ...prev, [category]: [...prev[category], val] }));
      if (dxNames.length) { recordPlanSelection(dxNames, category, val); setLearnTick(t => t + 1); }
    }
    setPlanCustom(prev => ({ ...prev, [category]: '' }));
  }
  // AI fallback: draft plan items for the differential, folded into suggestions.
  async function generatePlan() {
    if (!dxNames.length) return;
    setAiPlanStatus('loading');
    try {
      const { plan: drafted } = await suggestPlan(dxNames);
      setAiPlan(drafted || {});
      setAiPlanStatus('done');
    } catch {
      setAiPlanStatus('error');
    }
  }
  function clearAll() {
    if (!window.confirm('Clear all entries and start over?')) return;
    setSelected([]); setDxTier({}); setFeatureState({}); setAiFeatures({}); setAiStatus({});
    setLumpSel(new Set()); setPlan(emptyPlan()); setPlanCustom({}); setOpenImg(null);
    setAiPlan({}); setAiPlanStatus(null); setBlockOrder([]);
    setHandoff(DEFAULT_HANDOFF); setDxQuery(''); setActiveComplaint(null);
    setAiDx({ query: '', status: null, results: [] });
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

  // Drag-and-drop reordering of note blocks.
  function dropOnBlock(targetId) {
    if (!dragId || dragId === targetId) { setDragId(null); return; }
    const ids = orderedBlocks.map(b => b.id);
    const from = ids.indexOf(dragId);
    const to = ids.indexOf(targetId);
    if (from < 0 || to < 0) { setDragId(null); return; }
    ids.splice(to, 0, ids.splice(from, 1)[0]);
    setBlockOrder(ids);
    setDragId(null);
  }

  const totalPlan = PLAN_ORDER.reduce((n, c) => n + plan[c].length, 0);

  // ── Left menu ────────────────────────────────────────────────────────────────
  const Menu = (
    <div>
      {/* Diagnoses */}
      <Section title="Differential" count={selected.length} open={open.dx} onToggle={() => setOpen(o => ({ ...o, dx: !o.dx }))}>
        <div className="relative mb-2">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input
            value={dxQuery}
            onChange={e => setDxQuery(e.target.value)}
            onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); commitQuery(); } }}
            placeholder="Search a chief complaint or diagnosis…"
            className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white"
          />
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
              <>
                <button onClick={generateDiagnoses} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors">
                  <Sparkle className="text-blue-500 shrink-0" />
                  <span className="text-sm text-gray-600">Generate a differential for “<span className="font-medium text-gray-800">{dxQuery.trim()}</span>” with AI</span>
                </button>
                <button onClick={commitQuery} className="w-full flex items-center gap-2 px-3 py-2 text-left hover:bg-blue-50 transition-colors">
                  <span className="text-gray-400 font-bold">+</span>
                  <span className="text-sm text-gray-500">Add “<span className="font-medium text-gray-700">{dxQuery.trim()}</span>” as a diagnosis</span>
                </button>
              </>
            )}
          </div>
        )}

        {/* AI-generated differential from a chief complaint */}
        {(aiDx.status === 'loading' || (aiDx.results.length > 0) || aiDx.status === 'error') && (
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-blue-500 font-medium">AI differential for “{aiDx.query}” — tap to add, then curate</p>
              <button onClick={() => setAiDx({ query: '', status: null, results: [] })} className="text-blue-300 hover:text-blue-600 text-xs">clear</button>
            </div>
            {aiDx.status === 'loading' && (
              <p className="text-xs text-gray-500 flex items-center gap-1.5"><Spinner />Generating possible diagnoses…</p>
            )}
            {aiDx.status === 'error' && <p className="text-xs text-red-500">Couldn’t generate — try again.</p>}
            {aiDx.results.length > 0 && (
              <div className="flex flex-wrap gap-1.5">
                {aiDx.results.map(dx => (
                  <button key={dx.name} onClick={() => addDx(dx.name, dx.tier)} disabled={isSelected(dx.name)} className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium border transition-all ${isSelected(dx.name) ? 'bg-blue-600 text-white border-blue-600 opacity-60' : 'bg-white text-gray-600 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>
                    <span className={`w-1.5 h-1.5 rounded-full ${isSelected(dx.name) ? 'bg-white/70' : (TIER_DOT[dx.tier] || 'bg-gray-300')}`} />
                    {dx.name}
                  </button>
                ))}
              </div>
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

        {/* Lump action bar */}
        {lumpSel.size >= 2 && (
          <div className="flex items-center justify-between bg-blue-50 border border-blue-100 rounded-lg px-3 py-2 mb-2">
            <span className="text-[11px] text-blue-700 font-medium">{lumpSel.size} diagnoses selected</span>
            <div className="flex items-center gap-3">
              <button onClick={() => setLumpSel(new Set())} className="text-[11px] text-blue-400 hover:text-blue-600">cancel</button>
              <button onClick={lumpSelected} className="text-[11px] font-semibold text-white bg-blue-600 rounded-md px-2.5 py-1 hover:bg-blue-700">Lump together</button>
            </div>
          </div>
        )}

        {/* Selected diagnoses — each a collapsible finding panel */}
        {selected.length === 0 && <p className="text-xs text-gray-300 py-2">No diagnoses yet. Search above to build your differential.</p>}
        <div className="space-y-2">
          {selected.map(item => {
            const key = keyOf(item);
            const groups = featureSets[key] || {};
            const lumped = item.names.length > 1;
            const members = item.names.map(nm => ({
              name: nm,
              matched: getFeatureSet(nm).matched,
              hasAi: Boolean(aiFeatures[nm]),
            }));
            const needGen = members.filter(m => !m.matched && !m.hasAi);
            const anyAi = members.some(m => m.hasAi);
            const tier = dxTier[key];
            const isOpen = dxOpen[key];
            const marks = Object.keys(featureState[key] || {}).length;
            const checked = lumpSel.has(key);
            return (
              <div key={key} className={`border rounded-lg overflow-hidden ${tier === 'likely' ? 'border-blue-300' : 'border-gray-200'}`}>
                <div className="flex items-center gap-2 px-3 py-2 bg-gray-50/70">
                  {selected.length > 1 && (
                    <button onClick={() => toggleLump(key)} title="Select to lump with another diagnosis" className="shrink-0">
                      <span className={`w-4 h-4 rounded border flex items-center justify-center text-[10px] font-bold ${checked ? 'bg-blue-600 border-blue-600 text-white' : 'border-gray-300 text-transparent'}`}>✓</span>
                    </button>
                  )}
                  <button onClick={() => setDxOpen(o => ({ ...o, [key]: !o[key] }))} className="text-gray-400 shrink-0"><Chevron open={isOpen} /></button>
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${TIER_DOT[item.tier] || 'bg-blue-300'}`} />
                  <span className="text-sm font-semibold text-gray-800 flex-1 truncate">{key}</span>
                  {lumped && <button onClick={() => unlump(key)} title="Split apart" className="text-[10px] text-gray-400 hover:text-blue-600 shrink-0">unlump</button>}
                  {marks > 0 && <span className="text-[10px] text-blue-600 bg-blue-50 rounded-full px-1.5 py-0.5">{marks}</span>}
                  <button onClick={() => removeDx(key)} className="text-gray-300 hover:text-red-400 shrink-0">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" /></svg>
                  </button>
                </div>
                {isOpen && (
                  <div className="p-3">
                    <div className="grid grid-cols-2 gap-1.5 mb-3">
                      {DX_TIERS.map(t => (
                        <button key={t.key} onClick={() => setTier(key, t.key)} className={`rounded-md px-2 py-1 text-[11px] font-medium border transition-all ${tier === t.key ? 'bg-blue-600 text-white border-blue-600' : 'bg-white text-gray-500 border-gray-200 hover:border-blue-300 hover:text-blue-600'}`}>{t.label}</button>
                      ))}
                    </div>
                    {needGen.length > 0 && (
                      <div className="mb-3 rounded-lg bg-gray-50 border border-gray-200 p-2.5">
                        <p className="text-[10px] text-gray-400 mb-1.5">
                          {lumped
                            ? 'Some conditions have no curated finding set — a generic template is shown for them.'
                            : 'No curated finding set for this diagnosis — a generic template is shown.'}
                        </p>
                        <div className="flex flex-wrap gap-1.5">
                          {needGen.map(m => (
                            <button
                              key={m.name}
                              onClick={() => generateFindings(m.name)}
                              disabled={aiStatus[m.name] === 'loading'}
                              className="inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1.5 text-xs font-medium border transition-all bg-white text-blue-600 border-blue-200 hover:border-blue-400 disabled:opacity-50"
                            >
                              {aiStatus[m.name] === 'loading'
                                ? <><Spinner />Drafting…</>
                                : <><Sparkle />{lumped ? `Suggest findings — ${m.name}` : 'Suggest findings'}</>}
                            </button>
                          ))}
                        </div>
                        {needGen.some(m => aiStatus[m.name] === 'error') && <span className="mt-1.5 block text-[10px] text-red-500">Couldn’t generate — try again.</span>}
                      </div>
                    )}
                    {anyAi && <p className="text-[10px] text-blue-500 mb-2">AI-suggested draft — review and curate before relying on it.</p>}
                    <div className="space-y-3">
                      {SECTIONS.map(section => {
                        const feats = section.groups.flatMap(g => groups[g] || []);
                        if (!feats.length) return null;
                        return (
                          <div key={section.title}>
                            <p className="text-[10px] text-gray-500 font-semibold uppercase tracking-wider mb-1">{section.title}</p>
                            <div className="space-y-1">
                              {feats.map(f => (
                                <FeatureButton key={f.id} label={f.label} state={featureState[key]?.[f.id]} onSet={v => setFeat(key, f.id, v)} />
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </Section>

      {/* Plan */}
      <Section title="Plan" count={totalPlan} open={open.plan} onToggle={() => setOpen(o => ({ ...o, plan: !o.plan }))}>
        {/* Suggested-for-your-differential strip */}
        {selected.length > 0 && (
          <div className="bg-blue-50/50 border border-blue-100 rounded-lg p-3 mb-3">
            <div className="flex items-center justify-between mb-2">
              <p className="text-[11px] text-blue-500 font-medium flex items-center gap-1"><Sparkle />Suggested for your differential</p>
              <button onClick={generatePlan} disabled={aiPlanStatus === 'loading'} className="text-[11px] text-blue-500 hover:text-blue-700 disabled:opacity-50">
                {aiPlanStatus === 'loading' ? 'Thinking…' : 'Refine with AI'}
              </button>
            </div>
            {aiPlanStatus === 'error' && <p className="text-[10px] text-red-500 mb-1.5">Couldn’t reach AI — showing curated suggestions.</p>}
            {PLAN_ORDER.some(c => (planSuggestions[c] || []).length) ? (
              <div className="space-y-2">
                {PLAN_ORDER.filter(c => (planSuggestions[c] || []).length).map(category => (
                  <div key={category}>
                    <p className="text-[9px] text-gray-400 font-semibold uppercase tracking-wider mb-1">{category}</p>
                    <div className="flex flex-wrap gap-1.5">
                      {(planSuggestions[category] || []).slice(0, SUGGEST_PER_CATEGORY).map(({ item }) => (
                        <PlanChip key={item} active={plan[category].includes(item)} suggested onClick={() => togglePlan(category, item)}>{item}</PlanChip>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-[11px] text-gray-400">No curated matches yet — tap “Refine with AI” or use the full menus below. Your picks are learned for next time.</p>
            )}
          </div>
        )}

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
          <div className="space-y-2">
            {orderedBlocks.length > 1 && (
              <p className="text-[10px] text-gray-300 mb-1 flex items-center gap-1">
                <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" /></svg>
                Drag paragraphs to reorder
              </p>
            )}
            {orderedBlocks.map(block => (
              <div
                key={block.id}
                draggable
                onDragStart={() => setDragId(block.id)}
                onDragOver={e => e.preventDefault()}
                onDrop={() => dropOnBlock(block.id)}
                onDragEnd={() => setDragId(null)}
                className={`group flex gap-2 rounded-lg border px-2.5 py-2 cursor-grab active:cursor-grabbing transition-colors ${dragId === block.id ? 'border-blue-300 bg-blue-50/60 opacity-60' : 'border-transparent hover:border-gray-200 hover:bg-gray-50'}`}
              >
                <span className="mt-0.5 shrink-0 text-gray-300 group-hover:text-gray-400" title="Drag to reorder">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M8 6h.01M8 12h.01M8 18h.01M16 6h.01M16 12h.01M16 18h.01" /></svg>
                </span>
                <div className="flex-1 text-[13px] text-gray-700 leading-relaxed min-w-0">
                  {block.text.split('\n').map((line, li) => (
                    <p key={li} className={line.startsWith('•') ? 'pl-3' : ''}>{renderInline(line)}</p>
                  ))}
                </div>
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
