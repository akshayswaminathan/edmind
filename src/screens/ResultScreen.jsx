import { useState, useEffect } from 'react';
import { complaints } from '../data/complaints';
import { scoreDifferential } from '../api/claude';

function ScoreRing({ score, size = 72 }) {
  const radius = (size - 8) / 2;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (score / 100) * circumference;
  const color = score >= 70 ? '#10b981' : score >= 50 ? '#f59e0b' : '#ef4444';

  return (
    <div className="relative" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size/2} cy={size/2} r={radius} stroke="#f3f4f6" strokeWidth="4" fill="none" />
        <circle
          cx={size/2} cy={size/2} r={radius}
          stroke={color} strokeWidth="4" fill="none"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: 'stroke-dashoffset 0.8s ease-out' }}
        />
      </svg>
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-lg font-bold text-gray-900 tabular-nums">{score}</span>
      </div>
    </div>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function XIcon({ color = '#ef4444' }) {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2.5">
      <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
    </svg>
  );
}

export function ResultScreen({ complaintSlug, userList, onNextDrill, onRetry, onHome, onSessionUpdate }) {
  const [result, setResult] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllYellow, setShowAllYellow] = useState(false);

  const complaint = complaints[complaintSlug];

  useEffect(() => {
    let cancelled = false;
    async function score() {
      try {
        const res = await scoreDifferential(complaint.chiefComplaint, userList, complaintSlug);
        if (!cancelled) {
          setResult(res);
          setLoading(false);
          onSessionUpdate?.(res);
        }
      } catch (e) {
        if (!cancelled) { setError(e.message); setLoading(false); }
      }
    }
    score();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
          <p className="text-sm text-gray-400 font-medium">Scoring your differential...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-5">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-sm shadow-card">
          <p className="text-red-600 font-semibold mb-2">Scoring failed</p>
          <p className="text-sm text-gray-400 mb-6">{error}</p>
          <button onClick={onHome} className="bg-gray-900 text-white rounded-lg px-5 py-2 text-sm font-medium">
            Back
          </button>
        </div>
      </div>
    );
  }

  const yellowMissedToShow = showAllYellow ? result.yellowMissed : result.yellowMissed?.slice(0, 5);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-xl mx-auto px-5 py-6">
        {/* Header */}
        <div className="flex items-start justify-between mb-8">
          <div>
            <p className="text-xs text-gray-300 font-medium uppercase tracking-wider mb-1">Results</p>
            <h2 className="text-xl font-bold text-gray-900 tracking-tight">
              {complaint.chiefComplaint}
            </h2>
          </div>
          <ScoreRing score={result.score} />
        </div>

        {/* Stats row */}
        <div className="grid grid-cols-2 gap-3 mb-6">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-red-400 font-semibold uppercase tracking-wider mb-1">Red Flags</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {result.redCaught?.length || 0}
              <span className="text-gray-300 text-lg font-normal">/{result.redTotal || 0}</span>
            </p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-amber-500 font-semibold uppercase tracking-wider mb-1">Important</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">
              {result.yellowCaught?.length || 0}
              <span className="text-gray-300 text-lg font-normal">/{result.yellowTotal || 0}</span>
            </p>
          </div>
        </div>

        {/* Red Flags */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider">
              Must-Not-Miss
            </h3>
          </div>
          <div>
            {result.redCaught?.map((dx, i) => (
              <div key={`rc-${i}`} className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 last:border-0">
                <CheckIcon />
                <span className="text-sm text-gray-700">{dx}</span>
              </div>
            ))}
            {result.redMissed?.map((dx, i) => (
              <div key={`rm-${i}`} className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 last:border-0 bg-red-50/40">
                <XIcon />
                <span className="text-sm text-gray-400">{dx}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Yellow / Important */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
              Important
            </h3>
          </div>
          <div>
            {result.yellowCaught?.map((dx, i) => (
              <div key={`yc-${i}`} className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 last:border-0">
                <CheckIcon />
                <span className="text-sm text-gray-700">{dx}</span>
              </div>
            ))}
            {yellowMissedToShow?.map((dx, i) => (
              <div key={`ym-${i}`} className="flex items-center gap-3 px-4 py-2 border-b border-gray-50 last:border-0">
                <XIcon color="#d97706" />
                <span className="text-sm text-gray-400">{dx}</span>
              </div>
            ))}
          </div>
          {!showAllYellow && result.yellowMissed?.length > 5 && (
            <button
              onClick={() => setShowAllYellow(true)}
              className="w-full px-4 py-2.5 text-xs text-blue-600 font-medium hover:bg-gray-50 border-t border-gray-100 transition-colors"
            >
              Show {result.yellowMissed.length - 5} more
            </button>
          )}
        </div>

        {/* Bonus */}
        {result.bonusDiagnoses?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                Bonus
              </h3>
            </div>
            <div className="px-4 py-3 flex flex-wrap gap-1.5">
              {result.bonusDiagnoses.map((dx, i) => (
                <span key={i} className="text-xs bg-emerald-50 text-emerald-700 rounded-md px-2 py-1 font-medium">
                  {dx}
                </span>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2.5 pb-8">
          <button
            onClick={onNextDrill}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-3 font-semibold text-sm shadow-soft transition-all"
          >
            Next Drill
          </button>
          <button
            onClick={onRetry}
            className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium transition-all"
          >
            Retry
          </button>
          <button
            onClick={onHome}
            className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium transition-all"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
