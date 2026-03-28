import { useState, useRef, useEffect } from 'react';
import { chatWithPatient, orderTest } from '../api/claude';
import { MicButton } from '../components/MicButton';

export function WorkupScreen({ caseData, differential, setDifferential, onReady, onBack }) {
  // Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState('');
  const [chatLoading, setChatLoading] = useState(false);

  // Orders
  const [orderInput, setOrderInput] = useState('');
  const [orderType, setOrderType] = useState('labs');
  const [orderResults, setOrderResults] = useState([]);
  const [orderLoading, setOrderLoading] = useState(false);
  const [ordersExpanded, setOrdersExpanded] = useState(false);

  // Vitals & Exam
  const [vitalsRevealed, setVitalsRevealed] = useState(false);
  const [examRevealed, setExamRevealed] = useState({});

  // Differential
  const [diffInput, setDiffInput] = useState('');

  const chatInputRef = useRef(null);

  useEffect(() => {
    chatInputRef.current?.focus();
  }, []);

  // ── Chat ────────────────────────────────────────────────────────────────────
  async function handleSendChat() {
    const text = chatInput.trim();
    if (!text || chatLoading) return;

    const newMessages = [...chatMessages, { role: 'user', content: text }];
    setChatMessages(newMessages);
    setChatInput('');
    setChatLoading(true);
    chatInputRef.current?.focus();

    try {
      const { reply } = await chatWithPatient(caseData.id, newMessages);
      setChatMessages(prev => [...prev, { role: 'assistant', content: reply }]);
    } catch (err) {
      setChatMessages(prev => [...prev, { role: 'assistant', content: `[Error: ${err.message}]` }]);
    } finally {
      setChatLoading(false);
      chatInputRef.current?.focus();
    }
  }

  // ── Orders ──────────────────────────────────────────────────────────────────
  async function handleOrder() {
    const name = orderInput.trim();
    if (!name || orderLoading) return;

    setOrderInput('');
    setOrderLoading(true);
    setOrdersExpanded(true);

    try {
      const result = await orderTest(caseData.id, orderType, name);
      setOrderResults(prev => [...prev, { ...result, orderType, orderedAs: name }]);
    } catch (err) {
      setOrderResults(prev => [...prev, {
        found: false, name, result: `Error: ${err.message}`, flag: null, orderType, orderedAs: name,
      }]);
    } finally {
      setOrderLoading(false);
    }
  }

  // ── Differential ────────────────────────────────────────────────────────────
  function addDiff() {
    const val = diffInput.trim();
    if (!val) return;
    setDifferential(prev => [...prev, val]);
    setDiffInput('');
  }

  function removeDiff(idx) {
    setDifferential(prev => prev.filter((_, i) => i !== idx));
  }

  // ── Data ────────────────────────────────────────────────────────────────────
  const examSystems = [
    { key: 'general', label: 'General' },
    { key: 'heent', label: 'HEENT' },
    { key: 'cardiovascular', label: 'Cardiovascular' },
    { key: 'respiratory', label: 'Respiratory' },
    { key: 'abdomen', label: 'Abdomen' },
    { key: 'neurological', label: 'Neurological' },
    { key: 'musculoskeletal', label: 'MSK' },
    { key: 'skin', label: 'Skin' },
  ];

  const v = caseData.vitals;
  const pe = caseData.physicalExam || {};

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-2xl mx-auto px-4 py-4">
        {/* Header — door chart */}
        <div className="flex items-start justify-between mb-4">
          <div>
            <p className="text-xs text-gray-300 font-medium uppercase tracking-wider mb-1">Active Workup</p>
            <p className="text-base font-bold text-gray-900">{caseData.doorChart || caseData.chiefComplaint}</p>
          </div>
          <div className="flex gap-2 shrink-0">
            <button onClick={onBack} className="text-xs text-gray-400 hover:text-gray-600 border border-gray-200 rounded-lg px-3 py-1.5">
              Back
            </button>
            <button onClick={onReady} className="text-xs font-semibold text-white bg-blue-600 hover:bg-blue-700 rounded-lg px-3 py-1.5 shadow-soft">
              Ready to Present
            </button>
          </div>
        </div>

        {/* ── Action buttons: Vitals + Exam ── */}
        <div className="flex gap-2 mb-3 flex-wrap">
          <button
            onClick={() => setVitalsRevealed(true)}
            className={`text-xs font-medium rounded-lg px-3 py-1.5 transition-all ${
              vitalsRevealed
                ? 'bg-blue-50 text-blue-700 border border-blue-200'
                : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
            }`}
          >
            {vitalsRevealed ? 'Vitals' : 'Check Vitals'}
          </button>
          {examSystems.map(sys => (
            <button
              key={sys.key}
              onClick={() => setExamRevealed(prev => ({ ...prev, [sys.key]: true }))}
              className={`text-xs font-medium rounded-lg px-3 py-1.5 transition-all ${
                examRevealed[sys.key]
                  ? pe[sys.key]
                    ? 'bg-amber-50 text-amber-700 border border-amber-200'
                    : 'bg-gray-50 text-gray-400 border border-gray-200'
                  : 'bg-white text-gray-500 border border-gray-200 hover:bg-gray-50'
              }`}
            >
              {sys.label}
            </button>
          ))}
        </div>

        {/* ── Revealed vitals ── */}
        {vitalsRevealed && (
          <div className="flex gap-4 bg-white border border-gray-200 rounded-lg px-4 py-2 mb-3">
            {[
              { label: 'HR', value: v.hr, warn: v.hr != null && v.hr > 100 },
              { label: 'BP', value: v.bp },
              { label: 'RR', value: v.rr, warn: v.rr != null && v.rr > 20 },
              { label: 'SpO2', value: v.spo2, warn: v.spo2 != null && parseInt(v.spo2) < 95 },
              { label: 'Temp', value: v.temp, warn: v.temp != null && parseFloat(v.temp) > 100.4 },
            ].map(item => (
              <div key={item.label} className="flex items-center gap-1.5">
                <span className="text-[10px] text-gray-400 font-medium uppercase">{item.label}</span>
                <span className={`text-xs font-bold tabular-nums ${
                  item.value == null ? 'text-gray-300' : item.warn ? 'text-red-500' : 'text-gray-900'
                }`}>
                  {item.value ?? '--'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Revealed exam findings ── */}
        {Object.keys(examRevealed).length > 0 && (
          <div className="bg-white border border-gray-200 rounded-lg px-4 py-2 mb-3 space-y-1">
            {examSystems.filter(s => examRevealed[s.key]).map(s => (
              <div key={s.key} className="flex gap-2 text-xs">
                <span className="font-semibold text-gray-500 w-24 shrink-0">{s.label}:</span>
                <span className={pe[s.key] ? 'text-gray-700' : 'text-gray-400 italic'}>
                  {pe[s.key] || 'No abnormal findings'}
                </span>
              </div>
            ))}
          </div>
        )}

        {/* ── Patient Chat ── */}
        <div className="bg-white border border-gray-200 rounded-xl mb-3">
          <div className="px-4 py-2 border-b border-gray-100">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">Patient</span>
          </div>
          <div className="px-4 py-3 space-y-2.5 min-h-[200px] max-h-[320px] overflow-y-auto">
            {chatMessages.length === 0 && (
              <p className="text-sm text-gray-300 text-center py-6">Talk to your patient to gather the history.</p>
            )}
            {chatMessages.map((msg, i) => (
              <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                <div className={`max-w-[80%] rounded-xl px-3 py-2 text-sm leading-relaxed ${
                  msg.role === 'user' ? 'bg-blue-600 text-white' : 'bg-gray-100 text-gray-700'
                }`}>
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div className="flex justify-start">
                <div className="bg-gray-100 rounded-xl px-3 py-2 text-sm text-gray-400">
                  <span className="inline-flex gap-1">
                    <span className="animate-bounce" style={{ animationDelay: '0ms' }}>&bull;</span>
                    <span className="animate-bounce" style={{ animationDelay: '150ms' }}>&bull;</span>
                    <span className="animate-bounce" style={{ animationDelay: '300ms' }}>&bull;</span>
                  </span>
                </div>
              </div>
            )}
          </div>
          <div className="px-3 py-2 border-t border-gray-100 flex gap-2">
            <input
              ref={chatInputRef}
              type="text"
              value={chatInput}
              onChange={e => setChatInput(e.target.value)}
              onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleSendChat(); } }}
              disabled={chatLoading}
              placeholder="Talk to the patient..."
              className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 disabled:opacity-50 focus:border-blue-500"
            />
            <MicButton onTranscript={text => setChatInput(prev => prev ? prev + ' ' + text : text)} />
            <button
              onClick={handleSendChat}
              disabled={!chatInput.trim() || chatLoading}
              className="bg-gray-900 hover:bg-gray-800 disabled:opacity-30 text-white rounded-lg px-3 py-2 text-sm font-medium transition-all"
            >
              Send
            </button>
          </div>
        </div>

        {/* ── Orders ── */}
        <div className="bg-white border border-gray-200 rounded-xl mb-3">
          <button
            onClick={() => setOrdersExpanded(!ordersExpanded)}
            className="w-full flex items-center justify-between px-4 py-2"
          >
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Orders {orderResults.length > 0 && `(${orderResults.length})`}
            </span>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"
              className={`text-gray-300 transition-transform ${ordersExpanded ? 'rotate-180' : ''}`}>
              <path strokeLinecap="round" d="M6 9l6 6 6-6" />
            </svg>
          </button>
          {ordersExpanded && (
            <div className="px-4 pb-3">
              <div className="flex gap-1.5 mb-2">
                {['labs', 'imaging'].map(t => (
                  <button
                    key={t}
                    onClick={() => setOrderType(t)}
                    className={`rounded-md px-2.5 py-1 text-[11px] font-medium transition-all ${
                      orderType === t
                        ? 'bg-blue-50 text-blue-700 border border-blue-200'
                        : 'bg-gray-50 text-gray-400 border border-gray-200'
                    }`}
                  >
                    {t === 'labs' ? 'Labs' : 'Imaging'}
                  </button>
                ))}
              </div>
              <div className="flex gap-2 mb-2">
                <input
                  type="text"
                  value={orderInput}
                  onChange={e => setOrderInput(e.target.value)}
                  onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); handleOrder(); } }}
                  disabled={orderLoading}
                  placeholder={orderType === 'labs' ? 'e.g. CBC, Troponin, CMP...' : 'e.g. CXR, CT abdomen/pelvis...'}
                  className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 disabled:opacity-50 focus:border-blue-500"
                />
                <button
                  onClick={handleOrder}
                  disabled={!orderInput.trim() || orderLoading}
                  className="bg-gray-900 hover:bg-gray-800 disabled:opacity-30 text-white rounded-lg px-3 py-2 text-xs font-medium transition-all"
                >
                  Order
                </button>
              </div>
              {orderLoading && (
                <div className="flex items-center gap-2 py-1">
                  <div className="w-3 h-3 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
                  <span className="text-xs text-gray-400">Processing...</span>
                </div>
              )}
              {orderResults.map((r, i) => (
                <div
                  key={i}
                  className={`rounded-lg p-2 mb-1.5 text-xs ${
                    r.flag === 'critical' ? 'bg-red-50 border border-red-200' :
                    r.flag === 'abnormal' ? 'bg-amber-50 border border-amber-200' :
                    !r.found ? 'bg-gray-50 border border-gray-200' :
                    'bg-white border border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-0.5">
                    <span className="font-semibold text-gray-700 uppercase tracking-wider">{r.name}</span>
                    <span className={`font-medium uppercase px-1.5 py-0.5 rounded text-[9px] ${
                      r.flag === 'critical' ? 'bg-red-100 text-red-700' :
                      r.flag === 'abnormal' ? 'bg-amber-100 text-amber-700' :
                      r.flag === 'normal' ? 'bg-emerald-100 text-emerald-700' :
                      'bg-gray-100 text-gray-400'
                    }`}>
                      {r.flag || (r.found ? 'result' : 'N/A')}
                    </span>
                  </div>
                  <p className={r.found ? 'text-gray-700' : 'text-gray-400 italic'}>{r.result}</p>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Differential ── */}
        <div className="bg-white border border-gray-200 rounded-xl mb-3">
          <div className="px-4 py-2 border-b border-gray-100">
            <span className="text-xs text-gray-400 font-medium uppercase tracking-wider">
              Differential ({differential.length})
            </span>
          </div>
          <div className="px-4 py-2">
            <div className="flex gap-2 mb-2">
              <input
                type="text"
                value={diffInput}
                onChange={e => setDiffInput(e.target.value)}
                onKeyDown={e => { if (e.key === 'Enter') { e.preventDefault(); addDiff(); } }}
                placeholder="Add diagnosis..."
                className="flex-1 bg-gray-50 border border-gray-200 rounded-lg px-3 py-1.5 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500"
              />
              <button
                onClick={addDiff}
                disabled={!diffInput.trim()}
                className="bg-gray-900 hover:bg-gray-800 disabled:opacity-30 text-white rounded-lg px-3 py-1.5 text-xs font-medium transition-all"
              >
                Add
              </button>
            </div>
            {differential.length > 0 && (
              <div className="space-y-0.5">
                {differential.map((dx, i) => (
                  <div key={i} className="flex items-center justify-between py-1">
                    <div className="flex items-center gap-2">
                      <span className="w-4 h-4 rounded-full bg-blue-50 text-blue-600 text-[9px] font-bold flex items-center justify-center">{i + 1}</span>
                      <span className="text-sm text-gray-700">{dx}</span>
                    </div>
                    <button onClick={() => removeDiff(i)} className="text-gray-300 hover:text-red-400 transition-colors">
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
