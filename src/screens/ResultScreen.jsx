import { useState, useEffect } from 'react';
import { complaints } from '../data/complaints';
import { scoreDifferential } from '../api/claude';

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#10b981" strokeWidth="2.5">
      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
    </svg>
  );
}

function DashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#d1d5db" strokeWidth="2.5">
      <path strokeLinecap="round" d="M5 12h14" />
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
          <p className="text-sm text-gray-400 font-medium">Reviewing your differential...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center px-5">
        <div className="bg-white border border-gray-200 rounded-2xl p-8 text-center max-w-sm">
          <p className="text-red-600 font-semibold mb-2">Review failed</p>
          <p className="text-sm text-gray-400 mb-6">{error}</p>
          <button onClick={onHome} className="bg-gray-900 text-white rounded-lg px-5 py-2 text-sm font-medium">
            Back
          </button>
        </div>
      </div>
    );
  }

  const allRed = [...(result.redCaught || []), ...(result.redMissed || [])];
  const redCaughtSet = new Set(result.redCaught || []);

  const allYellow = [...(result.yellowCaught || []), ...(result.yellowMissed || [])];
  const yellowCaughtSet = new Set(result.yellowCaught || []);
  const yellowToShow = showAllYellow ? allYellow : allYellow.slice(0, 10);

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-xl mx-auto px-5 py-6">
        {/* Header */}
        <div className="mb-6">
          <p className="text-xs text-gray-300 font-medium uppercase tracking-wider mb-1">Results</p>
          <h2 className="text-xl font-bold text-gray-900 tracking-tight">
            {complaint.chiefComplaint}
          </h2>
        </div>

        {/* Your differential */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
              Your Differential ({userList.length})
            </h3>
          </div>
          <div className="px-4 py-3 flex flex-wrap gap-1.5">
            {userList.map((dx, i) => (
              <span key={i} className="text-xs bg-blue-50 text-blue-700 rounded-md px-2 py-1 font-medium">
                {dx}
              </span>
            ))}
          </div>
        </div>

        {/* Summary line */}
        <div className="flex gap-4 mb-4 ml-1">
          <span className="text-xs text-gray-400">
            Identified <span className="font-bold text-red-500">{result.redCaught?.length || 0}</span> of <span className="font-bold text-gray-700">{allRed.length}</span> must-not-miss
          </span>
          <span className="text-xs text-gray-400">
            <span className="font-bold text-amber-500">{result.yellowCaught?.length || 0}</span> of <span className="font-bold text-gray-700">{allYellow.length}</span> important
          </span>
        </div>

        {/* Must-not-miss */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider">
              Must-Not-Miss
            </h3>
          </div>
          <div>
            {allRed.map((dx, i) => {
              const caught = redCaughtSet.has(dx);
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2 border-b border-gray-50 last:border-0 ${caught ? '' : 'bg-gray-50/50'}`}>
                  {caught ? <CheckIcon /> : <DashIcon />}
                  <span className={`text-sm ${caught ? 'text-gray-700' : 'text-gray-400'}`}>{dx}</span>
                </div>
              );
            })}
          </div>
        </div>

        {/* Important */}
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
          <div className="px-4 py-3 border-b border-gray-100">
            <h3 className="text-xs font-semibold text-amber-500 uppercase tracking-wider">
              Important
            </h3>
          </div>
          <div>
            {yellowToShow.map((dx, i) => {
              const caught = yellowCaughtSet.has(dx);
              return (
                <div key={i} className={`flex items-center gap-3 px-4 py-2 border-b border-gray-50 last:border-0 ${caught ? '' : 'bg-gray-50/50'}`}>
                  {caught ? <CheckIcon /> : <DashIcon />}
                  <span className={`text-sm ${caught ? 'text-gray-700' : 'text-gray-400'}`}>{dx}</span>
                </div>
              );
            })}
          </div>
          {!showAllYellow && allYellow.length > 10 && (
            <button
              onClick={() => setShowAllYellow(true)}
              className="w-full px-4 py-2.5 text-xs text-blue-600 font-medium hover:bg-gray-50 border-t border-gray-100 transition-colors"
            >
              Show {allYellow.length - 10} more
            </button>
          )}
        </div>

        {/* Bonus — valid diagnoses not on the lists */}
        {result.bonusDiagnoses?.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-4">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">
                Additional Valid Diagnoses
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

        {/* Note about matching */}
        <p className="text-[11px] text-gray-300 text-center mb-6">
          Matching is approximate. Review the lists above and self-assess.
        </p>

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
