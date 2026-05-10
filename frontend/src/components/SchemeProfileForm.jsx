function SchemeProfileForm({
  labels,
  profile,
  onChange,
  onRecommend,
  loading,
}) {
  return (
    <section className="border-b border-slate-200 bg-white px-4 py-3">
      <div className="text-sm font-semibold text-slate-900">
        {labels.profileTitle}
      </div>
      <div className="mt-1 text-xs text-slate-500">{labels.profileHint}</div>

      <div className="mt-3 grid grid-cols-1 gap-2">
        <label className="flex items-center justify-between rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-700">
          <span>
            <span className="font-semibold">{labels.profileProLabel}</span>
            <span className="ml-2 text-xs text-slate-500">
              {labels.profileProHint}
            </span>
          </span>
          <input
            type="checkbox"
            checked={Boolean(profile.pro)}
            onChange={(event) => onChange({ ...profile, pro: event.target.checked })}
            className="h-4 w-4 accent-indigo-600"
          />
        </label>

        <input
          value={profile.name || ""}
          onChange={(event) => onChange({ ...profile, name: event.target.value })}
          placeholder={labels.profileName}
          className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
        />

        <div className="grid grid-cols-2 gap-2">
          <input
            value={profile.age ?? ""}
            onChange={(event) =>
              onChange({ ...profile, age: event.target.value })
            }
            placeholder={labels.profileAge}
            inputMode="numeric"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
          <input
            value={profile.income ?? ""}
            onChange={(event) =>
              onChange({ ...profile, income: event.target.value })
            }
            placeholder={labels.profileIncome}
            inputMode="numeric"
            className="w-full rounded-xl border border-slate-200 bg-slate-50 px-4 py-2 text-sm outline-none transition focus:border-emerald-400 focus:bg-white focus:ring-2 focus:ring-emerald-100"
          />
        </div>

        <select
          value={profile.gender || ""}
          onChange={(event) => onChange({ ...profile, gender: event.target.value })}
          className="w-full cursor-pointer rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-medium shadow-sm transition hover:border-emerald-300 focus:outline-none focus:ring-2 focus:ring-emerald-200"
        >
          <option value="">{labels.profileGender}</option>
          <option value="male">{labels.profileGenderMale}</option>
          <option value="female">{labels.profileGenderFemale}</option>
          <option value="other">{labels.profileGenderOther}</option>
        </select>

        <button
          type="button"
          onClick={onRecommend}
          disabled={loading}
          className="mt-1 cursor-pointer rounded-xl bg-indigo-600 px-4 py-2 text-sm font-bold text-white shadow-sm transition hover:bg-indigo-700 active:scale-95 disabled:cursor-not-allowed disabled:bg-indigo-300"
        >
          {loading ? labels.profileRecommending : labels.profileRecommendButton}
        </button>
      </div>
    </section>
  );
}

export default SchemeProfileForm;
