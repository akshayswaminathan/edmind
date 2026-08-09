import { useState, useEffect, useMemo, useRef, useSyncExternalStore } from 'react';
import {
  GROUP_ORDER, getEditableLibrary, saveDiagnosis, deleteDiagnosis, resetDiagnosis,
  resetAllOverrides, hasOverrides, exportOverrides, importOverrides, exportChangedAsCode,
  emptyGroups, subscribeLibrary, applyRemoteOverrides,
} from '../data/mdmFeatures';
import { publishSharedDiagnosis } from '../api/claude';

// Live view of the effective library — re-reads whenever the store changes.
function useLibrary() {
  return useSyncExternalStore(subscribeLibrary, getEditableLibrary, getEditableLibrary);
}

// Build an editable draft from a library row (aliases held as raw text).
function toDraft(row) {
  return {
    id: row?.id ?? null,
    builtin: Boolean(row?.builtin),
    name: row?.name || '',
    aliasesText: (row?.aliases || []).join(', '),
    groups: GROUP_ORDER.reduce((acc, g) => {
      acc[g] = (row?.groups?.[g] || []).map(f => ({ label: f.label, dir: f.dir }));
      return acc;
    }, {}),
  };
}

function Badge({ tone, children }) {
  const cls = {
    builtin: 'bg-gray-100 text-gray-500',
    edited: 'bg-amber-100 text-amber-700',
    custom: 'bg-violet-100 text-violet-700',
    shared: 'bg-blue-100 text-blue-700',
  }[tone];
  return <span className={`text-[9px] font-semibold uppercase tracking-wide rounded px-1.5 py-0.5 ${cls}`}>{children}</span>;
}

// A single editable finding row: label input + for/against toggle + delete.
function FindingRow({ finding, onChange, onToggleDir, onDelete }) {
  const forSide = finding.dir !== 'against';
  return (
    <div className="flex items-center gap-1.5">
      <button
        type="button"
        onClick={onToggleDir}
        title={forSide ? 'Supports the diagnosis — click to flip to "against"' : 'Argues against — click to flip to "supports"'}
        className={`w-16 shrink-0 rounded-md px-1.5 py-1.5 text-[11px] font-semibold border transition-colors ${forSide ? 'bg-emerald-50 text-emerald-700 border-emerald-200' : 'bg-red-50 text-red-700 border-red-200'}`}
      >
        {forSide ? '＋ for' : '− against'}
      </button>
      <input
        value={finding.label}
        onChange={e => onChange(e.target.value)}
        placeholder="finding label"
        className="flex-1 bg-gray-50 border border-gray-200 rounded-md px-2.5 py-1.5 text-[13px] text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white"
      />
      <button type="button" onClick={onDelete} title="Remove finding" className="text-gray-300 hover:text-red-400 shrink-0 px-1">
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" /></svg>
      </button>
    </div>
  );
}

export function AdminScreen({ onExit }) {
  const library = useLibrary();
  const [selectedId, setSelectedId] = useState(null);   // library id, or '__new__'
  const [draft, setDraft] = useState(null);
  const [dirty, setDirty] = useState(false);
  const [search, setSearch] = useState('');
  const [mobileView, setMobileView] = useState('list'); // 'list' | 'editor'
  const [toast, setToast] = useState('');
  const [publishing, setPublishing] = useState(false);
  const fileRef = useRef(null);
  const PUBLISH_TOKEN_KEY = 'emtools.admin.publishToken';

  // ── Passcode gate (Option A: obscurity, not real security) ──────────────────
  // The editor only affects this browser's localStorage, so this gate just keeps
  // casual users out of the config screen. It is active only when a passcode is
  // configured via the VITE_ADMIN_PASSCODE env var; unset ⇒ open (e.g. local dev).
  const ADMIN_PASSCODE = import.meta.env.VITE_ADMIN_PASSCODE || '';
  const UNLOCK_KEY = 'emtools.admin.unlock';
  const [unlocked, setUnlocked] = useState(() => {
    if (!ADMIN_PASSCODE) return true;
    try { return localStorage.getItem(UNLOCK_KEY) === ADMIN_PASSCODE; } catch { return false; }
  });
  const [passInput, setPassInput] = useState('');
  const [passError, setPassError] = useState(false);

  function tryUnlock(e) {
    e?.preventDefault();
    if (passInput === ADMIN_PASSCODE) {
      try { localStorage.setItem(UNLOCK_KEY, ADMIN_PASSCODE); } catch { /* storage unavailable */ }
      setUnlocked(true); setPassError(false); setPassInput('');
    } else {
      setPassError(true);
    }
  }
  function lock() {
    try { localStorage.removeItem(UNLOCK_KEY); } catch { /* storage unavailable */ }
    setUnlocked(false);
  }

  function flash(msg) { setToast(msg); setTimeout(() => setToast(''), 2200); }

  // Load a condition into the editor.
  function selectRow(row) {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    setSelectedId(row.id);
    setDraft(toDraft(row));
    setDirty(false);
    setMobileView('editor');
  }
  function startNew() {
    if (dirty && !window.confirm('Discard unsaved changes?')) return;
    setSelectedId('__new__');
    setDraft(toDraft({ groups: emptyGroups() }));
    setDirty(false);
    setMobileView('editor');
  }

  // If the selected row changes underneath us (e.g. reset), keep the draft synced
  // only when not dirty.
  useEffect(() => {
    if (selectedId && selectedId !== '__new__' && !dirty) {
      const row = library.find(r => r.id === selectedId);
      if (row) setDraft(toDraft(row));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [library, selectedId]);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return library;
    return library.filter(r =>
      r.name.toLowerCase().includes(q) || r.aliases.some(a => a.toLowerCase().includes(q))
    );
  }, [library, search]);

  const counts = useMemo(() => ({
    total: library.length,
    edited: library.filter(r => r.builtin && r.edited).length,
    custom: library.filter(r => !r.builtin).length,
  }), [library]);

  // ── Draft mutators ──────────────────────────────────────────────────────────
  const patch = up => { setDraft(d => ({ ...d, ...up })); setDirty(true); };
  function editFinding(group, i, label) {
    setDraft(d => {
      const list = d.groups[group].slice();
      list[i] = { ...list[i], label };
      return { ...d, groups: { ...d.groups, [group]: list } };
    });
    setDirty(true);
  }
  function toggleDir(group, i) {
    setDraft(d => {
      const list = d.groups[group].slice();
      list[i] = { ...list[i], dir: list[i].dir === 'against' ? 'for' : 'against' };
      return { ...d, groups: { ...d.groups, [group]: list } };
    });
    setDirty(true);
  }
  function addFinding(group) {
    setDraft(d => ({ ...d, groups: { ...d.groups, [group]: [...d.groups[group], { label: '', dir: 'for' }] } }));
    setDirty(true);
  }
  function deleteFinding(group, i) {
    setDraft(d => ({ ...d, groups: { ...d.groups, [group]: d.groups[group].filter((_, x) => x !== i) } }));
    setDirty(true);
  }

  const totalFindings = draft ? GROUP_ORDER.reduce((n, g) => n + draft.groups[g].filter(f => f.label.trim()).length, 0) : 0;
  const hasAgainst = draft ? GROUP_ORDER.some(g => draft.groups[g].some(f => f.dir === 'against' && f.label.trim())) : false;

  function handleSave() {
    if (!draft?.name.trim()) { flash('Name is required'); return; }
    const entry = {
      name: draft.name.trim(),
      aliases: draft.aliasesText.split(',').map(s => s.trim()).filter(Boolean),
      groups: draft.groups,
    };
    try {
      const id = saveDiagnosis(selectedId === '__new__' ? null : selectedId, entry);
      setSelectedId(id);
      setDirty(false);
      flash('Saved');
    } catch (e) { flash(e.message); }
  }
  function handleDelete() {
    if (!draft?.id) { setSelectedId(null); setDraft(null); return; }
    const verb = draft.builtin ? 'Hide this built-in condition?' : 'Delete this condition?';
    if (!window.confirm(verb)) return;
    deleteDiagnosis(draft.id);
    setSelectedId(null); setDraft(null); setDirty(false);
    flash(draft.builtin ? 'Hidden' : 'Deleted');
  }
  function handleReset() {
    if (!draft?.id) return;
    if (!window.confirm('Revert this condition to the shipped default?')) return;
    resetDiagnosis(draft.id);
    if (!library.find(r => r.id === draft.id && r.builtin)) { setSelectedId(null); setDraft(null); }
    setDirty(false);
    flash('Reverted');
  }

  // Publish the selected (saved) condition to the shared library — curated
  // server-side, then visible to every user. The publish token is held locally,
  // never in the bundle. After publishing, the local edit is dropped so the
  // curated shared version becomes the source of truth on screen.
  async function handlePublish() {
    if (!selectedId || selectedId === '__new__') { flash('Save before publishing'); return; }
    if (dirty) { flash('Save your changes first'); return; }
    const row = library.find(r => r.id === selectedId);
    if (!row) { flash('Nothing to publish'); return; }
    let token = '';
    try { token = localStorage.getItem(PUBLISH_TOKEN_KEY) || ''; } catch { /* ignore */ }
    if (!token) {
      token = (window.prompt('Admin publish token') || '').trim();
      if (!token) return;
      try { localStorage.setItem(PUBLISH_TOKEN_KEY, token); } catch { /* ignore */ }
    }
    setPublishing(true);
    try {
      const { overrides } = await publishSharedDiagnosis(
        { id: row.id, entry: { name: row.name, aliases: row.aliases, groups: row.groups } },
        token,
      );
      applyRemoteOverrides(overrides);
      resetDiagnosis(row.id);   // drop local copy; show the curated shared entry
      flash('Published to shared library');
    } catch (e) {
      if (/unauthorized/i.test(e.message)) {
        try { localStorage.removeItem(PUBLISH_TOKEN_KEY); } catch { /* ignore */ }
        flash('Wrong publish token — try again');
      } else {
        flash(`Publish failed: ${e.message}`);
      }
    } finally {
      setPublishing(false);
    }
  }

  // ── Import / export ───────────────────────────────────────────────────────────
  function download(name, text, type = 'application/json') {
    const blob = new Blob([text], { type });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = name; a.click();
    URL.revokeObjectURL(url);
  }
  function handleExport() { download('mdm-library-overrides.json', exportOverrides()); flash('Exported edits'); }
  async function handleCopyCode() {
    try { await navigator.clipboard.writeText(exportChangedAsCode()); flash('Copied code for edited conditions'); }
    catch { flash('Copy failed'); }
  }
  function handleImportFile(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try { importOverrides(String(reader.result)); flash('Imported'); }
      catch (err) { flash(`Import failed: ${err.message}`); }
    };
    reader.readAsText(file);
    e.target.value = '';
  }
  function handleResetAll() {
    if (!window.confirm('Discard ALL local edits and restore the shipped library?')) return;
    resetAllOverrides();
    setSelectedId(null); setDraft(null); setDirty(false);
    flash('All edits cleared');
  }

  // ── Passcode gate ────────────────────────────────────────────────────────────
  if (!unlocked) {
    return (
      <div className="min-h-screen bg-[#fafafa] flex flex-col">
        <div className="sticky top-0 bg-[#fafafa]/90 backdrop-blur border-b border-gray-100">
          <div className="max-w-7xl mx-auto px-4 py-3">
            <button onClick={onExit} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M15 19l-7-7 7-7" /></svg>
              Back
            </button>
          </div>
        </div>
        <div className="flex-1 flex items-center justify-center px-5">
          <form onSubmit={tryUnlock} className="w-full max-w-xs bg-white border border-gray-200 rounded-2xl p-6 text-center shadow-soft">
            <div className="inline-flex items-center justify-center w-11 h-11 bg-gray-900 rounded-xl mb-3">
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2"><rect x="4" y="11" width="16" height="9" rx="2" /><path strokeLinecap="round" d="M8 11V7a4 4 0 118 0v4" /></svg>
            </div>
            <h2 className="text-base font-bold text-gray-900">Finding Library — Admin</h2>
            <p className="text-xs text-gray-400 mt-1 mb-4">Enter the admin passcode to edit the finding library.</p>
            <input
              type="password" autoFocus value={passInput}
              onChange={e => { setPassInput(e.target.value); setPassError(false); }}
              placeholder="Passcode"
              className={`w-full bg-gray-50 border rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:bg-white ${passError ? 'border-red-300 focus:border-red-500' : 'border-gray-200 focus:border-blue-500'}`}
            />
            {passError && <p className="text-[11px] text-red-500 mt-1.5">Incorrect passcode.</p>}
            <button type="submit" className="w-full mt-3 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-semibold">Unlock</button>
          </form>
        </div>
      </div>
    );
  }

  // ── List pane ──────────────────────────────────────────────────────────────
  const List = (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col lg:h-[calc(100vh-8.5rem)]">
      <div className="p-3 border-b border-gray-100">
        <button onClick={startNew} className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-3 py-2 text-sm font-semibold mb-2 flex items-center justify-center gap-1.5">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>
          New condition
        </button>
        <div className="relative">
          <svg className="absolute left-2.5 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-300" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" strokeLinejoin="round" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" /></svg>
          <input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search conditions…" className="w-full bg-gray-50 border border-gray-200 rounded-lg pl-8 pr-3 py-1.5 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
        </div>
      </div>
      <div className="flex-1 overflow-y-auto divide-y divide-gray-50">
        {filtered.map(row => {
          const findingCount = GROUP_ORDER.reduce((n, g) => n + (row.groups[g]?.length || 0), 0);
          const active = row.id === selectedId;
          return (
            <button key={row.id} onClick={() => selectRow(row)} className={`w-full text-left px-3 py-2.5 transition-colors ${active ? 'bg-blue-50' : 'hover:bg-gray-50'}`}>
              <div className="flex items-center gap-2">
                <span className="text-sm text-gray-800 flex-1 truncate">{row.name}</span>
                {row.shared && <Badge tone="shared">shared</Badge>}
                {!row.builtin && !row.shared && <Badge tone="custom">new</Badge>}
                {row.edited && <Badge tone="edited">edited</Badge>}
              </div>
              <span className="text-[11px] text-gray-400">{findingCount} findings</span>
            </button>
          );
        })}
        {filtered.length === 0 && <p className="text-xs text-gray-300 p-4 text-center">No conditions match “{search}”.</p>}
      </div>
    </div>
  );

  // ── Editor pane ──────────────────────────────────────────────────────────────
  const Editor = draft ? (
    <div className="bg-white border border-gray-200 rounded-xl overflow-hidden flex flex-col lg:h-[calc(100vh-8.5rem)]">
      <div className="flex items-center justify-between px-4 py-3 border-b border-gray-100">
        <div className="flex items-center gap-2 min-w-0">
          <button onClick={() => setMobileView('list')} className="lg:hidden text-gray-400 shrink-0">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M15 19l-7-7 7-7" /></svg>
          </button>
          <span className="text-sm font-semibold text-gray-800 truncate">{selectedId === '__new__' ? 'New condition' : draft.name || 'Untitled'}</span>
          {dirty && <span className="text-[10px] text-amber-600 shrink-0">unsaved</span>}
        </div>
        <button onClick={handleSave} disabled={!dirty && selectedId !== '__new__'} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-40 text-white rounded-lg px-3 py-1.5 text-xs font-semibold shrink-0">Save</button>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        <div>
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Condition name</label>
          <input value={draft.name} onChange={e => patch({ name: e.target.value })} placeholder="e.g. Ovarian torsion" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-800 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
        </div>
        <div>
          <label className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider mb-1 block">Aliases <span className="text-gray-300 normal-case font-normal">(comma-separated — include DB spellings so they match)</span></label>
          <input value={draft.aliasesText} onChange={e => patch({ aliasesText: e.target.value })} placeholder="adnexal torsion, ovarian torsion" className="w-full bg-gray-50 border border-gray-200 rounded-lg px-3 py-2 text-sm text-gray-700 placeholder-gray-300 focus:border-blue-500 focus:bg-white" />
        </div>

        <div className="flex items-center gap-3 text-[11px] text-gray-400 border-y border-gray-100 py-1.5">
          <span>{totalFindings} findings</span>
          <span className={hasAgainst ? 'text-emerald-600' : 'text-amber-600'}>
            {hasAgainst ? '✓ has an “against” finding' : '⚠ add at least one “against” finding'}
          </span>
        </div>

        {GROUP_ORDER.map(group => (
          <div key={group}>
            <div className="flex items-center justify-between mb-1.5">
              <p className="text-[10px] text-gray-400 font-semibold uppercase tracking-wider">{group}</p>
              <button onClick={() => addFinding(group)} className="text-[11px] text-blue-600 hover:text-blue-700 font-medium flex items-center gap-0.5">
                <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4"><path strokeLinecap="round" d="M12 5v14M5 12h14" /></svg>add
              </button>
            </div>
            <div className="space-y-1.5">
              {draft.groups[group].length === 0 && <p className="text-[11px] text-gray-300 italic">No {group.toLowerCase()} findings.</p>}
              {draft.groups[group].map((f, i) => (
                <FindingRow
                  key={i}
                  finding={f}
                  onChange={label => editFinding(group, i, label)}
                  onToggleDir={() => toggleDir(group, i)}
                  onDelete={() => deleteFinding(group, i)}
                />
              ))}
            </div>
          </div>
        ))}
      </div>

      <div className="px-4 py-2.5 border-t border-gray-100 flex items-center gap-3">
        {draft.id && draft.builtin && draft.edited && (
          <button onClick={handleReset} className="text-[11px] text-gray-500 hover:text-gray-700">Revert to default</button>
        )}
        {draft.id && selectedId !== '__new__' && (
          <button onClick={handlePublish} disabled={publishing || dirty} title={dirty ? 'Save your changes first' : 'Curate and publish to the shared library'} className="text-[11px] text-blue-600 hover:text-blue-700 disabled:opacity-40 font-medium">
            {publishing ? 'Publishing…' : 'Publish to shared'}
          </button>
        )}
        <div className="flex-1" />
        {draft.id && (
          <button onClick={handleDelete} className="text-[11px] text-red-500 hover:text-red-600">{draft.builtin ? 'Hide condition' : 'Delete condition'}</button>
        )}
      </div>
    </div>
  ) : (
    <div className="bg-white border border-gray-200 rounded-xl h-[60vh] lg:h-[calc(100vh-8.5rem)] flex items-center justify-center text-center px-6">
      <p className="text-sm text-gray-300">Select a condition to edit,<br />or create a new one.</p>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <input ref={fileRef} type="file" accept="application/json" onChange={handleImportFile} className="hidden" />

      {/* Top bar */}
      <div className="sticky top-0 z-10 bg-[#fafafa]/90 backdrop-blur border-b border-gray-100">
        <div className="max-w-7xl mx-auto px-4 py-3 flex items-center justify-between gap-3">
          <button onClick={onExit} className="text-xs text-gray-400 hover:text-gray-600 flex items-center gap-1 transition-colors shrink-0">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2"><path strokeLinecap="round" d="M15 19l-7-7 7-7" /></svg>
            Done
          </button>
          <span className="text-sm font-bold text-gray-800 tracking-tight">Finding Library — Admin</span>
          <div className="flex items-center gap-1.5 shrink-0">
            <button onClick={handleCopyCode} title="Copy edited conditions as source code" className="text-[11px] text-gray-500 hover:text-blue-600 px-1.5">Copy code</button>
            <button onClick={handleExport} title="Download edits as JSON" className="text-[11px] text-gray-500 hover:text-blue-600 px-1.5">Export</button>
            <button onClick={() => fileRef.current?.click()} title="Import edits from JSON" className="text-[11px] text-gray-500 hover:text-blue-600 px-1.5">Import</button>
            {hasOverrides() && <button onClick={handleResetAll} title="Discard all local edits" className="text-[11px] text-gray-400 hover:text-red-500 px-1.5">Reset all</button>}
            {ADMIN_PASSCODE && <button onClick={lock} title="Lock the admin view" className="text-[11px] text-gray-400 hover:text-gray-700 px-1.5">Lock</button>}
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-4">
        <div className="flex items-center gap-3 mb-3 text-[11px] text-gray-400">
          <span><span className="font-bold text-gray-700">{counts.total}</span> conditions</span>
          {counts.edited > 0 && <span><span className="font-bold text-amber-600">{counts.edited}</span> edited</span>}
          {counts.custom > 0 && <span><span className="font-bold text-violet-600">{counts.custom}</span> new</span>}
          <span className="text-gray-300">· Edits are saved in this browser and apply to the MDM Writer immediately.</span>
        </div>

        <div className="lg:grid lg:grid-cols-[minmax(260px,340px)_1fr] lg:gap-5 lg:items-start">
          <div className={mobileView === 'editor' ? 'hidden lg:block' : ''}>{List}</div>
          <div className={mobileView === 'list' ? 'hidden lg:block' : ''}>{Editor}</div>
        </div>
      </div>

      {toast && (
        <div className="fixed bottom-5 left-1/2 -translate-x-1/2 bg-gray-900 text-white text-xs font-medium rounded-lg px-3.5 py-2 shadow-elevated z-20">{toast}</div>
      )}
    </div>
  );
}
