import { useState, useEffect, useRef } from 'react';

export function Timer({ seconds, onExpire, paused = false }) {
  const [remaining, setRemaining] = useState(seconds);
  const remainingRef = useRef(seconds);
  const intervalRef = useRef(null);
  const hasExpired = useRef(false);
  const onExpireRef = useRef(onExpire);
  onExpireRef.current = onExpire;

  useEffect(() => {
    if (paused) {
      clearInterval(intervalRef.current);
      return;
    }

    hasExpired.current = false;
    remainingRef.current = remaining;

    intervalRef.current = setInterval(() => {
      remainingRef.current -= 1;
      const next = remainingRef.current;

      if (next <= 0) {
        clearInterval(intervalRef.current);
        setRemaining(0);
        if (!hasExpired.current) {
          hasExpired.current = true;
          onExpireRef.current?.();
        }
      } else {
        setRemaining(next);
      }
    }, 1000);

    return () => clearInterval(intervalRef.current);
  }, [paused]);

  const pct = remaining / seconds;
  const mins = Math.floor(remaining / 60);
  const secs = remaining % 60;
  const display = mins > 0 ? `${mins}:${secs.toString().padStart(2, '0')}` : `${secs}s`;

  const barColor = pct > 0.5
    ? 'bg-emerald-500'
    : pct > 0.2
    ? 'bg-amber-400'
    : 'bg-red-500';

  const textColor = pct <= 0.2 ? 'text-red-600 font-semibold' : 'text-gray-400';

  return (
    <div className="w-full">
      <div className="flex justify-between items-center mb-1.5">
        <span className="text-xs font-medium text-gray-400 uppercase tracking-wider">Time</span>
        <span className={`text-sm tabular-nums ${textColor}`}>{display}</span>
      </div>
      <div className="w-full bg-gray-100 rounded-full h-1.5 overflow-hidden">
        <div
          className={`h-full rounded-full timer-bar ${barColor}`}
          style={{ width: `${pct * 100}%` }}
        />
      </div>
    </div>
  );
}
