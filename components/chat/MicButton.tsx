"use client";

interface Props {
  isListening: boolean;
  isSupported: boolean;
  networkError: boolean;
  onStart: () => void;
  onStop: () => void;
}

export function MicButton({ isListening, isSupported, networkError, onStart, onStop }: Props) {
  if (!isSupported || networkError) {
    return (
      <button
        type="button"
        disabled
        title={
          networkError
            ? "Microfone indisponível em localhost — funciona no deploy (HTTPS)"
            : "Voz disponível apenas no Chrome ou Edge"
        }
        className="flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center bg-gray-100 text-gray-300 cursor-not-allowed"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
          <line x1="2" y1="2" x2="22" y2="22" strokeWidth="2" />
        </svg>
      </button>
    );
  }

  return (
    <button
      type="button"
      onClick={isListening ? onStop : onStart}
      title={isListening ? "Parar gravação" : "Falar (Chrome/Edge)"}
      className={`flex-shrink-0 w-9 h-9 rounded-xl flex items-center justify-center transition-all duration-200 ${
        isListening
          ? "bg-red-100 text-red-600 hover:bg-red-200 animate-pulse"
          : "bg-gray-100 text-gray-500 hover:bg-gray-200 hover:text-gray-700"
      }`}
    >
      {isListening ? (
        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
          <rect x="6" y="6" width="12" height="12" rx="2" />
        </svg>
      ) : (
        <svg
          width="16"
          height="16"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z" />
          <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
          <line x1="12" x2="12" y1="19" y2="22" />
        </svg>
      )}
    </button>
  );
}
