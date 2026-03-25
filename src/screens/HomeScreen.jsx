import { useState } from 'react';
import { complaints, COMPLAINT_LIST, COMPLAINT_SLUGS } from '../data/complaints';

const TIMER_OPTIONS = [
  { label: '1 min', value: 60 },
  { label: '2 min', value: 120 },
  { label: '3 min', value: 180 },
  { label: 'Untimed', value: null },
];

export function HomeScreen({ settings, session, onUpdateSettings, onStartDrill }) {
  const [search, setSearch] = useState('');

  function handleRandom() {
    const slug = COMPLAINT_SLUGS[Math.floor(Math.random() * COMPLAINT_SLUGS.length)];
    onStartDrill(slug);
  }

  const filtered = COMPLAINT_LIST.filter(c =>
    c.name.toLowerCase().includes(search.toLowerCase())
  );

  const avgScore = session.scores.length > 0
    ? Math.round(session.scores.reduce((a, b) => a + b, 0) / session.scores.length)
    : null;

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="mb-10">
          <div className="flex items-center gap-2.5 mb-1">
            <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center">
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M8 1L14 4.5V11.5L8 15L2 11.5V4.5L8 1Z" stroke="white" strokeWidth="1.5" fill="none"/>
                <circle cx="8" cy="8" r="2" fill="white"/>
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">EDMind</h1>
          </div>
          <p className="text-sm text-gray-400 ml-[42px]">Differential diagnosis trainer</p>
        </div>

        {/* Session stats */}
        {session.drillsCompleted > 0 && (
          <div className="flex gap-6 mb-8 ml-1">
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Drills</p>
              <p className="text-2xl font-bold text-gray-900 tabular-nums">{session.drillsCompleted}</p>
            </div>
            <div>
              <p className="text-xs text-gray-400 font-medium uppercase tracking-wider">Avg Score</p>
              <p className={`text-2xl font-bold tabular-nums ${avgScore >= 70 ? 'text-emerald-600' : avgScore >= 50 ? 'text-amber-600' : 'text-red-600'}`}>
                {avgScore}
              </p>
            </div>
          </div>
        )}

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

        {/* Start button */}
        <button
          onClick={handleRandom}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl px-5 py-3.5 font-semibold text-[15px] shadow-soft hover:shadow-elevated transition-all mb-10"
        >
          Start Random Drill
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 mb-6">
          <div className="flex-1 h-px bg-gray-200" />
          <span className="text-xs text-gray-300 font-medium uppercase tracking-wider">or choose</span>
          <div className="flex-1 h-px bg-gray-200" />
        </div>

        {/* Search */}
        <div className="relative mb-4">
          <svg className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
          </svg>
          <input
            type="text"
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search 77 complaints..."
            className="w-full bg-white border border-gray-200 rounded-lg pl-9 pr-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500"
          />
        </div>

        {/* Complaint grid */}
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
                <span className="text-gray-200">·</span>
                <span className="text-amber-400 tabular-nums">{c.yellowCount}</span>
              </div>
            </button>
          ))}
        </div>

        <p className="text-[11px] text-gray-300 text-center mt-6">
          Source: Gold-standard differential diagnosis tables
        </p>
      </div>
    </div>
  );
}
