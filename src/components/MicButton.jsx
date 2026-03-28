import { useDictation } from '../hooks/useDictation';

export function MicButton({ onTranscript, className = '' }) {
  const { recording, transcribing, startRecording, stopRecording } = useDictation(onTranscript);

  if (transcribing) {
    return (
      <div className={`flex items-center justify-center w-10 h-10 ${className}`}>
        <div className="w-4 h-4 border-2 border-gray-200 border-t-blue-600 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <button
      onMouseDown={startRecording}
      onMouseUp={stopRecording}
      onMouseLeave={stopRecording}
      onTouchStart={startRecording}
      onTouchEnd={stopRecording}
      className={`flex items-center justify-center w-10 h-10 rounded-lg transition-all select-none ${
        recording
          ? 'bg-red-500 text-white scale-110'
          : 'bg-gray-100 text-gray-400 hover:bg-gray-200 hover:text-gray-600'
      } ${className}`}
      title="Hold to speak"
    >
      <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
        <path strokeLinecap="round" d="M19 10v2a7 7 0 01-14 0v-2" />
        <path strokeLinecap="round" d="M12 19v4M8 23h8" />
      </svg>
    </button>
  );
}
