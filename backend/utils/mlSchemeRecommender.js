const { loadJson } = require("./dataLoader");

const toNumber = (value) => {
  if (value === null || value === undefined || value === "") return null;
  const numeric = Number(value);
  return Number.isFinite(numeric) ? numeric : null;
};

const normalizeGender = (value) => {
  const g = String(value || "")
    .trim()
    .toLowerCase();
  if (!g) return "";
  if (["m", "male", "man", "boy"].includes(g)) return "male";
  if (["f", "female", "woman", "girl"].includes(g)) return "female";
  if (["t", "trans", "transgender", "third gender", "other"].includes(g))
    return "transgender";
  return g;
};

const inRange = (value, min, max) => {
  if (value === null) return null;
  const minN = toNumber(min);
  const maxN = toNumber(max);
  if (minN !== null && value < minN) return false;
  if (maxN !== null && value > maxN) return false;
  return true;
};

const schemeAllowsGender = (scheme, gender) => {
  if (!gender) return null;
  const raw = scheme?.eligibleGenders ?? scheme?.genderEligibility ?? "any";
  if (!raw) return null;
  if (typeof raw === "string") {
    const normalized = normalizeGender(raw);
    if (normalized === "any" || normalized === "all") return true;
    return normalized === gender;
  }
  if (Array.isArray(raw)) {
    const set = new Set(raw.map((g) => normalizeGender(g)).filter(Boolean));
    if (!set.size) return null;
    if (set.has("any") || set.has("all")) return true;
    return set.has(gender);
  }
  return null;
};

// Tiny local ML model: linear regression trained with SGD.
// We use it to learn weights that approximate "good scheme match"
// from eligibility features. This is fully offline and deterministic.
class LinearSGDRegressor {
  constructor(featureCount) {
    this.w = Array.from({ length: featureCount }, () => 0);
    this.b = 0;
  }

  predict(x) {
    let y = this.b;
    for (let i = 0; i < this.w.length; i++) y += this.w[i] * x[i];
    return y;
  }

  train(samples, { epochs = 6, lr = 0.02, l2 = 0.0005 } = {}) {
    for (let epoch = 0; epoch < epochs; epoch++) {
      for (const { x, y } of samples) {
        const yhat = this.predict(x);
        const err = yhat - y; // MSE gradient
        for (let i = 0; i < this.w.length; i++) {
          this.w[i] -= lr * (err * x[i] + l2 * this.w[i]);
        }
        this.b -= lr * err;
      }
    }
  }
}

const clamp01 = (v) => Math.max(0, Math.min(1, v));

// Features: keep small and interpretable
// 0 ageEligible (1/0/-1 unknown)
// 1 incomeEligible (1/0/-1 unknown)
// 2 genderEligible (1/0/-1 unknown)
// 3 ageNormalized (0..1)
// 4 incomeNormalized (0..1) [0..20L assumed for scaling]
// 5 schemeHasIncomeCap (1/0)
// 6 schemeIsWomenOnly (1/0)
// 7 schemeIsYouth (1/0)
const makeFeatures = (profile, scheme) => {
  const age = toNumber(profile.age);
  const income = toNumber(profile.income);
  const gender = normalizeGender(profile.gender);

  const ageElig = inRange(age, scheme.minAge, scheme.maxAge);
  const incomeElig = inRange(income, scheme.minIncome, scheme.maxIncome);
  const genderElig = schemeAllowsGender(scheme, gender);

  const ageFeat = ageElig === null ? -1 : ageElig ? 1 : 0;
  const incomeFeat = incomeElig === null ? -1 : incomeElig ? 1 : 0;
  const genderFeat = genderElig === null ? -1 : genderElig ? 1 : 0;

  const ageNorm = age === null ? 0.5 : clamp01(age / 80);
  const incomeNorm = income === null ? 0.5 : clamp01(income / 2000000);

  const hasIncomeCap = scheme?.maxIncome !== null && scheme?.maxIncome !== undefined ? 1 : 0;
  const eligibleGenders = scheme?.eligibleGenders;
  const isWomenOnly =
    Array.isArray(eligibleGenders) &&
    eligibleGenders.length === 1 &&
    normalizeGender(eligibleGenders[0]) === "female"
      ? 1
      : 0;

  const minAge = toNumber(scheme.minAge);
  const maxAge = toNumber(scheme.maxAge);
  const isYouth = (minAge !== null && minAge <= 18 && (maxAge !== null ? maxAge <= 35 : false)) ? 1 : 0;

  return [ageFeat, incomeFeat, genderFeat, ageNorm, incomeNorm, hasIncomeCap, isWomenOnly, isYouth];
};

// Create pseudo-labels from eligibility consistency (not using paid AI).
// This makes the model learn the importance of matching constraints.
const pseudoLabel = (x) => {
  const [ageFeat, incomeFeat, genderFeat] = x;
  let y = 0.4;
  if (ageFeat === 1) y += 0.25;
  if (incomeFeat === 1) y += 0.25;
  if (genderFeat === 1) y += 0.15;
  if (ageFeat === 0) y -= 0.35;
  if (incomeFeat === 0) y -= 0.35;
  if (genderFeat === 0) y -= 0.25;
  return clamp01(y);
};

const randomInt = (min, max) => Math.floor(min + Math.random() * (max - min + 1));

const generateSyntheticProfiles = (n = 2000) => {
  const profiles = [];
  for (let i = 0; i < n; i++) {
    const age = randomInt(10, 75);
    const income = randomInt(50000, 1500000);
    const genders = ["male", "female", "transgender"];
    const gender = genders[randomInt(0, genders.length - 1)];
    profiles.push({ age, income, gender });
  }
  return profiles;
};

let model = null;

const getMLSchemeModel = () => {
  if (model) return model;
  const schemes = loadJson("schemes.json");
  const reg = new LinearSGDRegressor(8);

  const profiles = generateSyntheticProfiles(2500);
  const samples = [];
  // Subsample to keep training fast
  for (let i = 0; i < profiles.length; i++) {
    const profile = profiles[i];
    for (let j = 0; j < schemes.length; j += 10) {
      const scheme = schemes[j];
      const x = makeFeatures(profile, scheme);
      const y = pseudoLabel(x);
      samples.push({ x, y });
    }
  }

  reg.train(samples, { epochs: 7, lr: 0.03, l2: 0.001 });
  model = { reg };
  return model;
};

const recommendSchemesML = (profile = {}, schemes, limit = 10) => {
  const { reg } = getMLSchemeModel();
  const scored = schemes.map((scheme) => {
    const x = makeFeatures(profile, scheme);
    const y = reg.predict(x);
    const score = Math.round(clamp01(1 / (1 + Math.exp(-y))) * 100); // squash to 0..100

    const reasons = [];
    const ageElig = inRange(toNumber(profile.age), scheme.minAge, scheme.maxAge);
    const incomeElig = inRange(toNumber(profile.income), scheme.minIncome, scheme.maxIncome);
    const genderElig = schemeAllowsGender(scheme, normalizeGender(profile.gender));
    if (ageElig === true) reasons.push("Age matches eligibility range.");
    if (incomeElig === true) reasons.push("Income matches eligibility range.");
    if (genderElig === true) reasons.push("Gender eligibility matches.");
    if (!reasons.length) reasons.push("Based on profile similarity and eligibility signals.");

    return {
      ...scheme,
      recommendationScore: score,
      recommendationReasons: reasons.slice(0, 3),
    };
  });

  return scored
    .sort((a, b) => (b.recommendationScore || 0) - (a.recommendationScore || 0))
    .slice(0, limit);
};

module.exports = {
  recommendSchemesML,
};

