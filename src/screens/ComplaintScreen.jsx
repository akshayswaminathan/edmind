import { useState, useRef, useEffect, useCallback } from 'react';
import { Timer } from '../components/Timer';
import { complaints } from '../data/complaints';

export function ComplaintScreen({ complaintSlug, timerSeconds, onSubmit, onExit }) {
  const [userList, setUserList] = useState([]);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState('');
  const [submitted, setSubmitted] = useState(false);
  const inputRef = useRef(null);

  const userListRef = useRef(userList);
  const inputValueRef = useRef(inputValue);
  const submittedRef = useRef(submitted);

  useEffect(() => { userListRef.current = userList; }, [userList]);
  useEffect(() => { inputValueRef.current = inputValue; }, [inputValue]);
  useEffect(() => { submittedRef.current = submitted; }, [submitted]);

  const complaint = complaints[complaintSlug];

  useEffect(() => {
    inputRef.current?.focus();
  }, []);

  function addCurrentInput() {
    const val = inputValueRef.current.trim();
    if (val) {
      const updated = [...userListRef.current, val];
      userListRef.current = updated;
      setUserList(updated);
      setInputValue('');
      inputValueRef.current = '';
      return updated;
    }
    return userListRef.current;
  }

  function handleAdd() {
    const val = inputValue.trim();
    if (!val) return;
    setUserList(prev => {
      const updated = [...prev, val];
      userListRef.current = updated;
      return updated;
    });
    setInputValue('');
    inputValueRef.current = '';
    setError('');
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleAdd();
    }
  }

  function handleSubmit() {
    const finalList = addCurrentInput();
    if (finalList.length === 0) {
      setError('Add at least one diagnosis.');
      return;
    }
    if (submittedRef.current) return;
    setSubmitted(true);
    submittedRef.current = true;
    onSubmit(finalList);
  }

  const handleTimerExpire = useCallback(() => {
    if (submittedRef.current) return;
    submittedRef.current = true;
    setSubmitted(true);

    const pending = inputValueRef.current.trim();
    const finalList = pending
      ? [...userListRef.current, pending]
      : [...userListRef.current];

    onSubmit(finalList.length === 0 ? ['(no entries)'] : finalList);
  }, [onSubmit]);

  function handleRemove(idx) {
    setUserList(prev => {
      const updated = prev.filter((_, i) => i !== idx);
      userListRef.current = updated;
      return updated;
    });
  }

  return (
    <div className="min-h-screen bg-[#fafafa]">
      <div className="max-w-xl mx-auto px-5 py-6">
        {/* Top bar */}
        <div className="flex justify-between items-center mb-8">
          <span className="text-xs text-gray-300 font-medium uppercase tracking-wider">Drill</span>
          <button
            onClick={onExit}
            className="text-gray-300 hover:text-gray-500 transition-colors"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Chief Complaint */}
        <div className="text-center mb-8">
          <p className="text-xs text-gray-300 font-medium uppercase tracking-widest mb-3">Chief Complaint</p>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
            {complaint.chiefComplaint}
          </h1>
          <div className="flex items-center justify-center gap-3 text-xs text-gray-300">
            <span>{complaint.red.length + complaint.yellow.length} diagnoses</span>
          </div>
        </div>

        {/* Timer */}
        {timerSeconds !== null ? (
          <div className="mb-8 px-1">
            <Timer
              seconds={timerSeconds}
              onExpire={handleTimerExpire}
              paused={submitted}
            />
          </div>
        ) : (
          <div className="mb-8" />
        )}

        {/* Input */}
        <div className="mb-4">
          <div className="flex gap-2">
            <input
              ref={inputRef}
              type="text"
              value={inputValue}
              onChange={e => {
                setInputValue(e.target.value);
                inputValueRef.current = e.target.value;
              }}
              onKeyDown={handleKeyDown}
              disabled={submitted}
              placeholder="Type a diagnosis and press Enter..."
              className="flex-1 bg-white border border-gray-200 rounded-lg px-3.5 py-2.5 text-sm text-gray-700 placeholder-gray-300 disabled:opacity-40 focus:border-blue-500"
            />
            <button
              onClick={handleAdd}
              disabled={submitted || !inputValue.trim()}
              className="bg-gray-900 hover:bg-gray-800 disabled:opacity-30 text-white rounded-lg px-4 py-2.5 text-sm font-medium transition-all"
            >
              Add
            </button>
          </div>
          {error && <p className="text-red-500 text-xs mt-2 ml-1">{error}</p>}
        </div>

        {/* User's list */}
        {userList.length > 0 && (
          <div className="bg-white border border-gray-200 rounded-xl overflow-hidden mb-6">
            <div className="px-4 py-2.5 border-b border-gray-100">
              <span className="text-xs text-gray-400 font-medium">Your list ({userList.length})</span>
            </div>
            <ul>
              {userList.map((dx, i) => (
                <li
                  key={i}
                  className={`flex items-center justify-between px-4 py-2 ${
                    i < userList.length - 1 ? 'border-b border-gray-50' : ''
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span className="w-5 h-5 rounded-full bg-blue-50 text-blue-600 text-[10px] font-bold flex items-center justify-center">
                      {i + 1}
                    </span>
                    <span className="text-sm text-gray-700">{dx}</span>
                  </div>
                  {!submitted && (
                    <button
                      onClick={() => handleRemove(i)}
                      className="text-gray-300 hover:text-red-400 transition-colors"
                    >
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path strokeLinecap="round" d="M18 6L6 18M6 6l12 12" />
                      </svg>
                    </button>
                  )}
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Submit */}
        <button
          onClick={handleSubmit}
          disabled={submitted}
          className="w-full bg-blue-600 hover:bg-blue-700 active:bg-blue-800 disabled:opacity-40 text-white rounded-xl px-5 py-3 font-semibold text-[15px] shadow-soft transition-all"
        >
          {submitted ? 'Scoring...' : 'Submit'}
        </button>
      </div>
    </div>
  );
}
