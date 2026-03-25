export function SummaryScreen({ session, onDrillAgain, onHome }) {
  const avgScore = session.scores.length > 0
    ? Math.round(session.scores.reduce((a, b) => a + b, 0) / session.scores.length)
    : 0;

  const missedSorted = Object.entries(session.missedDiagnoses)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 10);

  const scoreColor = avgScore >= 70 ? 'text-emerald-600' : avgScore >= 50 ? 'text-amber-600' : 'text-red-600';

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-xl mx-auto px-5 py-8">
        {/* Header */}
        <div className="mb-8">
          <p className="text-xs text-gray-300 font-medium uppercase tracking-wider mb-1">Summary</p>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">Session Complete</h1>
        </div>

        {/* Stats */}
        <div className="grid grid-cols-3 gap-3 mb-8">
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Avg Score</p>
            <p className={`text-2xl font-bold tabular-nums ${scoreColor}`}>{avgScore}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Drills</p>
            <p className="text-2xl font-bold text-gray-900 tabular-nums">{session.drillsCompleted}</p>
          </div>
          <div className="bg-white border border-gray-200 rounded-xl p-4 text-center">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-1">Red Missed</p>
            <p className="text-2xl font-bold text-red-500 tabular-nums">{session.redMissedCount || 0}</p>
          </div>
        </div>

        {/* Score trend */}
        {session.scores.length > 1 && (
          <div className="bg-white border border-gray-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-4">Score Trend</p>
            <div className="flex items-end gap-1 h-20">
              {session.scores.map((score, i) => (
                <div key={i} className="flex-1 flex flex-col items-center gap-1">
                  <span className="text-[10px] text-gray-300 tabular-nums">{score}</span>
                  <div
                    className={`w-full rounded-sm ${
                      score >= 70 ? 'bg-emerald-400' : score >= 50 ? 'bg-amber-400' : 'bg-red-400'
                    }`}
                    style={{ height: `${Math.max(score * 0.6, 3)}px` }}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Missed */}
        {missedSorted.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-8">
            <div className="px-4 py-3 border-b border-gray-100">
              <h3 className="text-xs font-semibold text-red-500 uppercase tracking-wider">
                Most Frequently Missed
              </h3>
            </div>
            <div>
              {missedSorted.map(([dx, count], i) => (
                <div
                  key={dx}
                  className={`flex items-center justify-between px-4 py-2.5 ${
                    i < missedSorted.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <span className="text-sm text-gray-700">{dx}</span>
                  <span className="text-xs text-gray-300 tabular-nums">{count}x</span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Actions */}
        <div className="flex gap-2.5 pb-8">
          <button
            onClick={onDrillAgain}
            className="flex-1 bg-blue-600 hover:bg-blue-700 text-white rounded-xl px-5 py-3 font-semibold text-sm shadow-soft transition-all"
          >
            Keep Drilling
          </button>
          <button
            onClick={onHome}
            className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl px-5 py-3 text-sm font-medium transition-all"
          >
            Home
          </button>
        </div>
      </div>
    </div>
  );
}
