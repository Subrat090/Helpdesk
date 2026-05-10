function ChatMessage({ role, text, onSpeak, speakLabel }) {
  const isUser = role === "user";

  return (
    <div className={`flex ${isUser ? "justify-end" : "justify-start"} mb-3`}>
      <div
        className={`max-w-[85%] rounded-2xl px-4 py-3 text-left shadow-sm ${
          isUser ? "bg-emerald-600 text-white" : "bg-white text-slate-800"
        }`}
      >
        <p className="whitespace-pre-line text-base leading-relaxed">{text}</p>
        {!isUser && (
          <button
            type="button"
            onClick={() => onSpeak(text)}
            className="mt-2 cursor-pointer rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-95"
          >
            {speakLabel}
          </button>
        )}
      </div>
    </div>
  );
}

export default ChatMessage;
