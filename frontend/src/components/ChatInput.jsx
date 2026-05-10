function ChatInput({
  value,
  onChange,
  onSubmit,
  onStartListening,
  listening,
  labels,
  disabled,
}) {
  return (
    <form
      onSubmit={onSubmit}
      className="border-t border-slate-200 bg-white p-3 sm:p-4"
    >
      <div className="mb-2 text-xs text-slate-500">{labels.typeOrSpeak}</div>
      <div className="flex items-center gap-2">
        <button
          type="button"
          onClick={onStartListening}
          className="cursor-pointer rounded-xl bg-orange-500 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-orange-600 active:scale-95"
        >
          {listening ? labels.listening : labels.mic}
        </button>
        <input
          value={value}
          onChange={(event) => onChange(event.target.value)}
          placeholder={labels.placeholder}
          className="flex-1 rounded-xl border border-slate-200 bg-slate-50 px-4 py-3 text-base outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          disabled={disabled}
        />
        <button
          type="submit"
          className="cursor-pointer rounded-xl bg-emerald-600 px-4 py-3 text-sm font-bold text-white shadow-sm transition hover:bg-emerald-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-emerald-300"
          disabled={disabled || !value.trim()}
        >
          {labels.send}
        </button>
      </div>
    </form>
  );
}

export default ChatInput;
