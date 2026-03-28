import { useState, useRef, useEffect } from 'react';
import { CASES } from '../data/cases';
import { WorkupScreen } from './WorkupScreen';
import { getCaseFeedback } from '../api/claude';
import { MicButton } from '../components/MicButton';

const PHASES = [
  { key: 'presenting', label: 'Presenting Concern' },
  { key: 'differential', label: 'Initial Differential' },
  { key: 'workup', label: 'Active Workup' },
  { key: 'synthesis', label: 'Presentation & MDM' },
  { key: 'feedback', label: 'Feedback' },
];

export function CaseSimScreen({ caseId, onHome }) {
  const caseData = CASES.find(c => c.id === caseId);
  const [phaseIdx, setPhaseIdx] = useState(0);
  const phase = PHASES[phaseIdx];

  const [differential, setDifferential] = useState([]);
  const [diffInput, setDiffInput] = useState('');
  const [synthesisText, setSynthesisText] = useState('');

  const inputRef = useRef(null);
  useEffect(() => { inputRef.current?.focus(); }, [phaseIdx]);

  if (!caseData) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex items-center justify-center">
        <p className="text-gray-400">Case not found.</p>
      </div>
    );
  }

  function nextPhase() {
    if (phaseIdx < PHASES.length - 1) setPhaseIdx(phaseIdx + 1);
  }

  function prevPhase() {
    if (phaseIdx > 0) setPhaseIdx(phaseIdx - 1);
  }

  function addDiff() {
    const val = diffInput.trim();
    if (!val) return;
    setDifferential(prev => [...prev, val]);
    setDiffInput('');
  }

  function removeDiff(idx) {
    setDifferential(prev => prev.filter((_, i) => i !== idx));
  }

  const phaseGroupLabel =
    phaseIdx <= 1 ? 'Phase 1: Initial Assessment' :
    phaseIdx === 2 ? 'Phase 2: Active Workup' :
    'Phase 3: Synthesis & Feedback';

  const progress = ((phaseIdx + 1) / PHASES.length) * 100;

  if (phase.key === 'workup') {
    return (
      <WorkupScreen
        caseData={caseData}
        differential={differential}
        setDifferential={setDifferential}
        onReady={nextPhase}
        onBack={prevPhase}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-xl mx-auto px-5 py-6">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-2">
          <span className="text-xs text-gray-300 font-medium uppercase tracking-wider">
            Case Simulator
          </span>
          <button onClick={onHome} className="text-gray-300 hover:text-gray-500 transition-colors">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Progress */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-1.5">
            <span className="text-xs text-gray-400 font-medium">{phaseGroupLabel}</span>
            <span className="text-xs text-gray-300">{phase.label}</span>
          </div>
          <div className="w-full h-1.5 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-blue-600 rounded-full transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Phase content */}
        <div className="mb-6">
          {phase.key === 'presenting' && (
            <PresentingStage caseData={caseData} onNext={nextPhase} />
          )}
          {phase.key === 'differential' && (
            <DifferentialStage
              caseData={caseData}
              differential={differential}
              diffInput={diffInput}
              setDiffInput={setDiffInput}
              onAdd={addDiff}
              onRemove={removeDiff}
              onNext={nextPhase}
              inputRef={inputRef}
            />
          )}
          {phase.key === 'synthesis' && (
            <SynthesisStage
              synthesisText={synthesisText}
              setSynthesisText={setSynthesisText}
              onSubmit={nextPhase}
              onBack={prevPhase}
            />
          )}
          {phase.key === 'feedback' && (
            <FeedbackStage
              caseData={caseData}
              differential={differential}
              synthesisText={synthesisText}
              onHome={onHome}
            />
          )}
        </div>
      </div>
    </div>
  );
}

/* ── Phase 1 ── */

function PresentingStage({ caseData, onNext }) {
  return (
    <div>
      <div className="text-center mb-8">
        <p className="text-xs text-gray-300 font-medium uppercase tracking-widest mb-3">You're Up</p>
        <div className="bg-white border border-gray-200 rounded-xl p-6 mb-6">
          <p className="text-xs text-gray-400 font-medium uppercase tracking-wider mb-3">Door Chart</p>
          <h1 className="text-xl font-bold text-gray-900 tracking-tight">
            {caseData.doorChart || caseData.chiefComplaint}
          </h1>
        </div>
      </div>

      <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 mb-6">
        <p className="text-sm text-blue-800">
          This is all you know. Generate your initial differential, then you'll enter the room to talk to the patient and begin your workup.
        </p>
      </div>

      <button
        onClick={onNext}
        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl px-5 py-3 font-semibold text-[15px] shadow-soft transition-all"
      >
        Continue to Differential
      </button>
    </div>
  );
}

function DifferentialStage({ caseData, differential, diffInput, setDiffInput, onAdd, onRemove, onNext, inputRef }) {
  function handleKeyDown(e) {
    if (e.key === 'Enter') { e.preventDefault(); onAdd(); }
  }

  return (
    <div>
      <div className="bg-white border border-gray-200 rounded-lg px-4 py-2.5 mb-5">
        <p className="text-[10px] text-gray-400 font-medium uppercase tracking-wider">Door Chart</p>
        <p className="text-sm font-semibold text-gray-900">{caseData.doorChart || caseData.chiefComplaint}</p>
      </div>

      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Initial Differential</h2>
        <p className="text-sm text-gray-400">
          List all possible diagnoses before you begin the workup. Focus on breadth and dangerous diagnoses.
        </p>
      </div>

      <div className="flex gap-2 mb-4">
        <input
          ref={inputRef}
          type="text"
          value={diffInput}
          onChange={e => setDiffInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Type a diagnosis and press Enter..."
          className="flex-1 bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500"
        />
        <button
          onClick={onAdd}
          disabled={!diffInput.trim()}
          className="bg-gray-900 hover:bg-gray-800 disabled:opacity-30 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
        >
          Add
        </button>
      </div>

      <DiffList items={differential} onRemove={onRemove} />

      <button
        onClick={onNext}
        disabled={differential.length === 0}
        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white rounded-xl px-5 py-3 font-semibold text-[15px] shadow-soft transition-all mt-4"
      >
        Begin Workup
      </button>
    </div>
  );
}

/* ── Phase 3 ── */

function SynthesisStage({ synthesisText, setSynthesisText, onSubmit, onBack }) {
  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Case Presentation & MDM</h2>
        <p className="text-sm text-gray-400">
          Present this patient as if speaking to an attending, then include your medical decision making. Cover HPI, findings, assessment, plan, differential reasoning, risk stratification, and disposition.
        </p>
      </div>

      <div className="bg-amber-50 border border-amber-100 rounded-xl p-4 mb-4">
        <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider mb-2">Should Include</p>
        <div className="grid grid-cols-2 gap-x-4 gap-y-1 text-sm text-amber-800">
          <span>- HPI and relevant history</span>
          <span>- Differential reasoning</span>
          <span>- Key exam and workup findings</span>
          <span>- Risk stratification</span>
          <span>- Assessment and diagnosis</span>
          <span>- Justification for interventions</span>
          <span>- Management plan</span>
          <span>- Disposition reasoning</span>
        </div>
      </div>

      <textarea
        value={synthesisText}
        onChange={e => setSynthesisText(e.target.value)}
        placeholder="This is a [age]-year-old [sex] presenting with [chief complaint]... The differential includes... Given the workup findings... The plan is..."
        rows={14}
        className="w-full bg-white border border-gray-200 rounded-xl px-4 py-3 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 resize-none leading-relaxed mb-2"
      />

      <div className="flex items-center gap-2 mb-4">
        <MicButton onTranscript={text => setSynthesisText(prev => prev ? prev + ' ' + text : text)} />
        <span className="text-xs text-gray-300">Hold to dictate</span>
      </div>

      <div className="flex gap-2.5">
        <button
          onClick={onBack}
          className="bg-white border border-gray-200 text-gray-600 hover:bg-gray-50 rounded-xl px-4 py-3 text-sm font-medium transition-all"
        >
          Back to Workup
        </button>
        <button
          onClick={onSubmit}
          disabled={!synthesisText.trim()}
          className="flex-1 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white rounded-xl px-5 py-3 font-semibold text-[15px] shadow-soft transition-all"
        >
          Get Feedback
        </button>
      </div>
    </div>
  );
}

function FeedbackStage({ caseData, differential, synthesisText, onHome }) {
  const [feedback, setFeedback] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function fetchFeedback() {
      try {
        const result = await getCaseFeedback(caseData.id, differential, synthesisText);
        if (!cancelled) {
          setFeedback(result);
          setLoading(false);
        }
      } catch (e) {
        if (!cancelled) {
          setError(e.message);
          setLoading(false);
        }
      }
    }
    fetchFeedback();
    return () => { cancelled = true; };
  }, []);

  if (loading) {
    return (
      <div className="text-center py-12">
        <div className="w-8 h-8 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin mx-auto mb-4" />
        <p className="text-sm text-gray-400 font-medium">Generating feedback...</p>
      </div>
    );
  }

  return (
    <div>
      <div className="mb-6">
        <h2 className="text-lg font-bold text-gray-900 mb-1">Case Feedback</h2>
        <p className="text-sm text-gray-400">
          Review your performance on this case.
        </p>
      </div>

      {/* AI Feedback */}
      {error ? (
        <div className="bg-red-50 border border-red-200 rounded-xl p-4 mb-4">
          <p className="text-sm text-red-700">Failed to generate feedback: {error}</p>
        </div>
      ) : (
        <>
          <div className="bg-emerald-50 border border-emerald-200 rounded-xl p-4 mb-4">
            <p className="text-xs text-emerald-700 font-semibold uppercase tracking-wider mb-2">What you did well</p>
            <p className="text-sm text-gray-700 leading-relaxed">{feedback.doingWell}</p>
          </div>

          <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 mb-6">
            <p className="text-xs text-amber-700 font-semibold uppercase tracking-wider mb-2">What you could improve</p>
            <p className="text-sm text-gray-700 leading-relaxed">{feedback.couldImprove}</p>
          </div>
        </>
      )}

      {/* Your submission for reference */}
      <details className="bg-gray-50 border border-gray-200 rounded-xl mb-6">
        <summary className="px-4 py-3 text-xs text-gray-400 font-semibold uppercase tracking-wider cursor-pointer hover:text-gray-600">
          Your Submission
        </summary>
        <div className="px-4 pb-3">
          <p className="text-xs text-gray-400 font-medium mb-1">Differential:</p>
          <p className="text-sm text-gray-600 mb-3">{differential.join(', ')}</p>
          <p className="text-xs text-gray-400 font-medium mb-1">Presentation & MDM:</p>
          <p className="text-sm text-gray-600 whitespace-pre-wrap">{synthesisText}</p>
        </div>
      </details>

      <button
        onClick={onHome}
        className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white rounded-xl px-5 py-3 font-semibold text-[15px] shadow-soft transition-all"
      >
        Finish Case
      </button>
    </div>
  );
}

/* ── Shared ── */

function DiffList({ items, onRemove }) {
  if (items.length === 0) return null;
  return (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
      <div className="px-4 py-2.5 border-b border-gray-100">
        <span className="text-xs text-gray-400 font-medium">Your differential ({items.length})</span>
      </div>
      <ul>
        {items.map((dx, i) => (
          <li key={i} className={`flex items-center justify-between px-4 py-2 ${i < items.length - 1 ? 'border-b border-gray-50' : ''}`}>
            <div className="flex items-center gap-2.5">
              <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center">{i + 1}</span>
              <span className="text-sm text-gray-700">{dx}</span>
            </div>
            <button onClick={() => onRemove(i)} className="text-gray-300 hover:text-red-400 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
              </svg>
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
