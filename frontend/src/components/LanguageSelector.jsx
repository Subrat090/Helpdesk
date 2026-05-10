import { languageOptions } from "../services/translations";

function LanguageSelector({ language, onChange }) {
  return (
    <select
      value={language}
      onChange={(event) => onChange(event.target.value)}
      className="cursor-pointer rounded-xl border border-slate-200 bg-white px-3 py-2 text-sm font-medium shadow-sm transition hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
      aria-label="Select language"
    >
      {languageOptions.map((option) => (
        <option key={option.code} value={option.code}>
          {option.label}
        </option>
      ))}
    </select>
  );
}

export default LanguageSelector;
