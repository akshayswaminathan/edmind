import { useState } from 'react';
import { TERMS_META, TERMS_SECTIONS, CONSENT_POINTS } from '../data/terms';

// Renders inline **bold** spans without dangerouslySetInnerHTML.
function inline(text) {
  return text.split(/\*\*(.+?)\*\*/g).map((part, i) =>
    i % 2 === 1
      ? <strong key={i} className="font-semibold text-gray-900">{part}</strong>
      : <span key={i}>{part}</span>
  );
}

function TermsBody() {
  return (
    <div className="space-y-5">
      {TERMS_SECTIONS.map(section => (
        <section key={section.n}>
          <h3 className="text-sm font-bold text-gray-900 mb-1.5">{section.n}. {section.title}</h3>
          <div className="space-y-2">
            {section.blocks.map((block, i) =>
              typeof block === 'string' ? (
                <p key={i} className="text-[13px] text-gray-600 leading-relaxed">{inline(block)}</p>
              ) : (
                <ul key={i} className="list-disc pl-5 space-y-1">
                  {block.ul.map((item, j) => (
                    <li key={j} className="text-[13px] text-gray-600 leading-relaxed">{inline(item)}</li>
                  ))}
                </ul>
              )
            )}
          </div>
        </section>
      ))}
    </div>
  );
}

// Consent gate shown before the MDM Writer. The user must affirm the three
// acknowledgments and agree to the Terms of Use to continue; declining returns
// them home. Acceptance is persisted by the caller.
export function TermsModal({ onAgree, onDecline }) {
  const [checked, setChecked] = useState(false);

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-gray-900/60 px-4 py-6">
      <div className="w-full max-w-lg max-h-[90vh] bg-white rounded-2xl shadow-elevated flex flex-col overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-6 pb-4 border-b border-gray-100">
          <h2 className="text-lg font-bold text-gray-900 tracking-tight">Before you use the MDM Writer</h2>
          <p className="text-sm text-gray-400 mt-1">Please review and accept the following to continue.</p>
        </div>

        {/* Acknowledgments + scrollable terms */}
        <div className="px-6 py-4 overflow-y-auto">
          <ul className="space-y-2 mb-5">
            {CONSENT_POINTS.map((point, i) => (
              <li key={i} className="flex items-start gap-2.5">
                <span className="mt-0.5 w-5 h-5 rounded-md bg-blue-50 text-blue-600 flex items-center justify-center shrink-0">
                  <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3"><path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" /></svg>
                </span>
                <span className="text-sm text-gray-700 leading-snug">{point}</span>
              </li>
            ))}
          </ul>

          <div className="flex items-baseline justify-between mb-2">
            <p className="text-xs text-gray-500 font-semibold uppercase tracking-wider">{TERMS_META.title}</p>
            <p className="text-[11px] text-gray-400">Last revised {TERMS_META.lastRevised}</p>
          </div>
          <div className="border border-gray-200 rounded-xl p-4 max-h-64 overflow-y-auto bg-gray-50/50">
            <TermsBody />
          </div>
        </div>

        {/* Footer: consent checkbox + actions */}
        <div className="px-6 py-4 border-t border-gray-100 bg-white">
          <label className="flex items-start gap-2.5 cursor-pointer mb-4">
            <input
              type="checkbox"
              checked={checked}
              onChange={e => setChecked(e.target.checked)}
              className="mt-0.5 w-4 h-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500 shrink-0"
            />
            <span className="text-[13px] text-gray-600 leading-snug">
              I am a licensed medical provider, I will not enter protected health information (PHI), and I have read and agree to the Terms of Use.
            </span>
          </label>
          <div className="flex gap-2">
            <button
              onClick={onDecline}
              className="rounded-xl px-5 py-3 text-sm font-medium text-gray-600 bg-white border border-gray-200 hover:bg-gray-50 transition-all"
            >
              Cancel
            </button>
            <button
              onClick={onAgree}
              disabled={!checked}
              className="flex-1 rounded-xl px-5 py-3 text-sm font-semibold text-white bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 shadow-soft transition-all"
            >
              Agree &amp; continue
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
