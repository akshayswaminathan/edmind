import { useState } from 'react';
import { complaints, COMPLAINT_LIST, COMPLAINT_SLUGS } from '../data/complaints';
import { CASE_LIST } from '../data/cases';

const TIMER_OPTIONS = [
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: 'Untimed', value: null },
];

export function HomeScreen({ settings, session, onUpdateSettings, onStartDrill, onStartCase }) {
  const [mode, setMode] = useState(null); // null | 'drills' | 'cases'
  const [search, setSearch] = useState('');

  function handleRandom() {
    const slug = COMPLAINT_SLUGS[Math.floor(Math.random() * COMPLAINT_SLUGS.length)];
    onStartDrill(slug);
  }

  function handleRandomCase() {
    const c = CASE_LIST[Math.floor(Math.random() * CASE_LIST.length)];
    onStartCase(c.id);
  }

  const filtered = COMPLAINT_LIST.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const avgScore = session.scores.length > 0
    ? Math.round(session.scores.reduce((a, b) => a + b, 0) / session.scores.length)
    : null;

  // ── Landing: pick a module ──
  if (mode === null) {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <div className="max-w-xl mx-auto px-5 py-8">
          {/* Header */}
          <div className="text-center mb-12 pt-8">
            <div className="inline-flex items-center justify-center w-12 h-12 bg-blue-600 rounded-2xl mb-4">
              <svg width="22" height="22" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="white" strokeWidth="1.5" fill="none"/>
                <circle cx="8" cy="8" r="2" fill="white"/>
              </svg>
            </div>
            <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">EDMind</h1>
            <p className="text-sm text-gray-400">Emergency medicine trainer</p>
          </div>

          {/* Module cards */}
          <div className="space-y-4">
            <button
              onClick={() => setMode('drills')}
              className="w-full bg-white border border-gray-200 rounded-2xl p-6 text-left hover:border-blue-300 hover:shadow-md transition-all group"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h2 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-blue-600 transition-colors">Differential Drills</h2>
                  <p className="text-sm text-gray-400 leading-relaxed">
                    Timed drills on generating differential diagnoses from a chief complaint. Build speed and breadth.
                  </p>
                </div>
                <div className="shrink-0 ml-4 mt-1">
                  <div className="w-10 h-10 rounded-xl bg-blue-50 flex items-center justify-center group-hover:bg-blue-100 transition-colors">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#2563eb" strokeWidth="2">
                      <path strokeLinecap="round" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2"/>
                      <path strokeLinecap="round" d="M9 14l2 2 4-4"/>
                    </svg>
                  </div>
                </div>
              </div>
              {session.drillsCompleted > 0 && (
                <div className="flex gap-4 mt-4 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400"><span className="font-bold text-gray-700">{session.drillsCompleted}</span> drills</span>
                  {avgScore != null && (
                    <span className="text-xs text-gray-400">
                      avg <span className={`font-bold ${avgScore >= 70 ? 'text-emerald-600' : avgScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{avgScore}</span>
                    </span>
                  )}
                </div>
              )}
            </button>

            {CASE_LIST.length > 0 && (
              <button
                onClick={() => setMode('cases')}
                className="w-full bg-white border border-gray-200 rounded-2xl p-6 text-left hover:border-emerald-300 hover:shadow-md transition-all group"
              >
                <div className="flex items-start justify-between">
                  <div>
                    <h2 className="text-lg font-bold text-gray-900 mb-1 group-hover:text-emerald-600 transition-colors">Case Simulator</h2>
                    <p className="text-sm text-gray-400 leading-relaxed">
                      Full ED case simulations. Interview the patient, order tests, examine, then present and write your MDM.
                    </p>
                  </div>
                  <div className="shrink-0 ml-4 mt-1">
                    <div className="w-10 h-10 rounded-xl bg-emerald-50 flex items-center justify-center group-hover:bg-emerald-100 transition-colors">
                      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#059669" strokeWidth="2">
                        <path strokeLinecap="round" d="M16 4h2a2 2 0 012 2v14a2 2 0 01-2 2H6a2 2 0 01-2-2V6a2 2 0 012-2h2"/>
                        <path strokeLinecap="round" d="M12 11v6M9 14h6"/>
                        <rect x="8" y="2" width="8" height="4" rx="1"/>
                      </svg>
                    </div>
                  </div>
                </div>
                <div className="mt-4 pt-3 border-t border-gray-100">
                  <span className="text-xs text-gray-400"><span className="font-bold text-gray-700">{CASE_LIST.length}</span> cases available</span>
                </div>
              </button>
            )}
          </div>
        </div>
      </div>
    );
  }

  // ── Differential Drills ──
  if (mode === 'drills') {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <div className="max-w-xl mx-auto px-5 py-8">
          {/* Header */}
          <div className="flex items-center justify-between mb-8">
            <div>
              <button onClick={() => setMode(null)} className="text-xs text-gray-400 hover:text-gray-600 mb-1 flex items-center gap-1 transition-colors">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
                </svg>
                Back
              </button>
              <h1 className="text-xl font-bold text-gray-900 tracking-tight">Differential Drills</h1>
            </div>
            {session.drillsCompleted > 0 && (
              <div className="flex gap-4">
                <div className="text-right">
                  <p className="text-xs text-gray-400">Drills</p>
                  <p className="text-lg font-bold text-gray-900 tabular-nums">{session.drillsCompleted}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-gray-400">Avg</p>
                  <p className={`text-lg font-bold tabular-nums ${avgScore >= 70 ? 'text-emerald-600' : avgScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>{avgScore}</p>
                </div>
              </div>
            )}
          </div>

          {/* Timer */}
          <div className="mb-6">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-2 ml-1">Timer</p>
            <div className="flex gap-1.5">
              {TIMER_OPTIONS.map(opt => (
                <button
                  key={opt.label}
                  onClick={() => onUpdateSettings({ timerSeconds: opt.value })}
                  className={`rounded-lg px-3.5 py-1.5 text-sm font-medium transition-all ${
                    settings.timerSeconds === opt.value
                      ? 'bg-gray-900 text-white shadow-soft'
                      : 'bg-white text-gray-500 hover:text-gray-700 hover:bg-gray-50 border border-gray-200'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          {/* Random drill */}
          <button
            onClick={handleRandom}
            className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl px-5 py-3.5 font-semibold text-[15px] shadow-soft hover:shadow-elevated transition-all mb-8"
          >
            Random Drill
          </button>

          {/* Search */}
          <div className="relative mb-4">
            <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
            <input
              type="text"
              value={search}
              onChange={e => setSearch(e.target.value)}
              placeholder={`Search ${COMPLAINT_LIST.length} complaints...`}
              className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500"
            />
          </div>

          {/* Complaint list */}
          <div className="space-y-1 max-h-[420px] overflow-y-auto rounded-xl border border-gray-200 bg-white">
            {filtered.map((c, i) => (
              <button
                key={c.slug}
                onClick={() => onStartDrill(c.slug)}
                className={`w-full flex items-center justify-between px-4 py-2.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                  i < filtered.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <span className="text-sm text-gray-700 font-medium">{c.name}</span>
                <div className="flex items-center gap-2 text-xs">
                  <span className="text-red-400 tabular-nums">{c.redCount}</span>
                  <span className="text-gray-200">&middot;</span>
                  <span className="text-amber-400 tabular-nums">{c.yellowCount}</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // ── Case Simulator ──
  if (mode === 'cases') {
    return (
      <div className="min-h-screen bg-[#fafafa]">
        <div className="max-w-xl mx-auto px-5 py-8">
          {/* Header */}
          <div className="mb-8">
            <button onClick={() => setMode(null)} className="text-xs text-gray-400 hover:text-gray-600 mb-1 flex items-center gap-1 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M15 19l-7-7 7-7" />
              </svg>
              Back
            </button>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">Case Simulator</h1>
            <p className="text-sm text-gray-400 mt-1">Pick a case. You'll start with just the door chart.</p>
          </div>

          {/* Random case */}
          <button
            onClick={handleRandomCase}
            className="w-full bg-emerald-600 hover:bg-emerald-700 active:bg-emerald-800 text-white rounded-xl px-5 py-3.5 font-semibold text-[15px] shadow-soft hover:shadow-elevated transition-all mb-8"
          >
            Random Case
          </button>

          {/* Case list — minimal info */}
          <div className="rounded-xl border border-gray-200 bg-white overflow-hidden">
            {CASE_LIST.map((c, i) => (
              <button
                key={c.id}
                onClick={() => onStartCase(c.id)}
                className={`w-full flex items-center justify-between px-4 py-3.5 text-left hover:bg-gray-50 active:bg-gray-100 transition-colors ${
                  i < CASE_LIST.length - 1 ? 'border-b border-gray-100' : ''
                }`}
              >
                <div className="flex items-center gap-3">
                  <span className="w-6 h-6 rounded-full bg-emerald-50 text-emerald-600 text-[11px] font-bold flex items-center justify-center shrink-0">
                    {i + 1}
                  </span>
                  <span className="text-sm text-gray-700 font-medium">{c.doorChart || c.chiefComplaint}</span>
                </div>
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" className="text-gray-300 shrink-0">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                </svg>
              </button>
            ))}
          </div>
        </div>
      </div>
    );
  }
}
