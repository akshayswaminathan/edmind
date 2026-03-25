const styles = {
  caught: 'bg-green-950 border border-green-700 text-green-300 rounded px-2 py-1 text-sm',
  missed: 'bg-red-950 border border-red-700 text-red-400 rounded px-2 py-1 text-sm line-through',
  bonus: 'bg-yellow-950 border border-yellow-700 text-yellow-300 rounded px-2 py-1 text-sm',
  invalid: 'bg-gray-800 border border-gray-600 text-gray-500 rounded px-2 py-1 text-sm line-through',
  caseReport: 'text-xs bg-orange-950 border border-orange-800 text-orange-300 rounded px-2 py-0.5 ml-2',
  cogError: 'text-xs bg-purple-950 border border-purple-800 text-purple-300 rounded px-2 py-0.5 ml-2',
};

export function DiagnosisBadge({ diagnosis, type, showCaseReport, cognitiveError }) {
  return (
    <span className="inline-flex items-center gap-1 mb-1 mr-1">
      <span className={styles[type] || styles.caught}>
        {type === 'caught' && '\u2705 '}
        {type === 'missed' && '\u274C '}
        {type === 'bonus' && '\u2B50 '}
        {diagnosis}
      </span>
      {showCaseReport && (
        <span className={styles.caseReport}>Published case reports</span>
      )}
      {cognitiveError && (
        <span className={styles.cogError}>{cognitiveError.replace('_', ' ')}</span>
      )}
    </span>
  );
}
