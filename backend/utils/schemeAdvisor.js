const { loadJson } = require("./dataLoader");
const { geminiGenerateContent } = require("./geminiClient");

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

const parseDate = (value) => {
  if (!value || typeof value !== "string") return null;
  const parsed = Date.parse(value);
  return Number.isFinite(parsed) ? parsed : null;
};

// Local-only Pro mode: use the same dataset as Rules.
const getProSchemes = () => getLatestSchemes();

const getLatestSchemes = () => {
  const schemes = loadJson("schemes.json");
  return [...schemes].sort((first, second) => {
    const firstDate =
      parseDate(first.lastDate) ||
      parseDate(first.updatedAt) ||
      parseDate(first.startDate) ||
      0;
    const secondDate =
      parseDate(second.lastDate) ||
      parseDate(second.updatedAt) ||
      parseDate(second.startDate) ||
      0;

    if (firstDate !== secondDate) return secondDate - firstDate;
    return (second.id || 0) - (first.id || 0);
  });
};

const identifySchemeType = (scheme) => {
  const name = (scheme.name_en || "").toLowerCase();
  if (name.includes("pm-kisan")) return "pmKisan";
  if (name.includes("fasal bima")) return "fasalBima";
  if (name.includes("awas")) return "awas";
  if (name.includes("ayushman")) return "ayushman";
  if (name.includes("credit card")) return "kcc";
  if (name.includes("mgnrega")) return "mgnrega";
  return "general";
};

const safeJsonParse = (text) => {
  if (!text || typeof text !== "string") return null;
  const trimmed = text.trim();
  try {
    return JSON.parse(trimmed);
  } catch {
    // try to extract first JSON object/array
    const match = trimmed.match(/(\{[\s\S]*\}|\[[\s\S]*\])\s*$/);
    if (!match) return null;
    try {
      return JSON.parse(match[1]);
    } catch {
      return null;
    }
  }
};

const getProfileRecommendations = (profile = {}, limit = 5, options = {}) => {
  const mode = String(options?.mode || "rules").toLowerCase();
  const schemes = mode === "pro" ? getProSchemes() : getLatestSchemes();
  const age = toNumber(profile.age);
  const income = toNumber(profile.income);
  const gender = normalizeGender(profile.gender);

  const scored = schemes.map((scheme) => {
    let score = 0;
    const reasons = [];
    const schemeType = identifySchemeType(scheme);

    // Hard eligibility gates (when scheme provides explicit rules)
    const ageEligibility = inRange(age, scheme.minAge, scheme.maxAge);
    if (ageEligibility === false) {
      score -= 100;
      reasons.push("Age not in eligibility range.");
    } else if (ageEligibility === true) {
      score += 25;
      reasons.push("Age matches eligibility range.");
    }

    const incomeEligibility = inRange(income, scheme.minIncome, scheme.maxIncome);
    if (incomeEligibility === false) {
      score -= 90;
      reasons.push("Income not in eligibility range.");
    } else if (incomeEligibility === true) {
      score += 25;
      reasons.push("Income matches eligibility range.");
    }

    const genderEligibility = schemeAllowsGender(scheme, gender);
    if (genderEligibility === false) {
      score -= 70;
      reasons.push("Gender not eligible for this scheme.");
    } else if (genderEligibility === true) {
      score += 18;
      reasons.push("Gender eligibility matches.");
    }

    // Soft relevance bands (still useful even without explicit per-scheme limits)
    score += 25; // baseline relevance

    if (age !== null) {
      if (age >= 18 && age <= 35) score += 6;
      else if (age >= 36 && age <= 59) score += 4;
      else if (age >= 60) score += 9;
    }

    if (income !== null) {
      if (income <= 250000) {
        score += 14;
      } else if (income <= 500000) {
        score += 8;
      } else {
        score -= 6;
      }
    }

    if (schemeType === "pmKisan") {
      score += 20;
      reasons.push("PM-KISAN provides direct income support to farmers.");
      if (income !== null && income > 800000) score -= 25;
    }

    if (schemeType === "fasalBima") {
      score += 12;
      reasons.push("Crop insurance helps reduce farming risk.");
    }

    if (schemeType === "awas") {
      if (income !== null && income <= 300000) {
        score += 25;
        reasons.push("Lower income profile aligns with rural housing support.");
      } else {
        score += 5;
      }
      if (gender === "female") {
        score += 10;
        reasons.push("Women applicants often receive preference in housing schemes.");
      }
    }

    if (schemeType === "ayushman") {
      if (income !== null && income <= 500000) {
        score += 22;
        reasons.push("Health cover is highly relevant for eligible low-income families.");
      } else {
        score += 4;
      }
      if (age !== null && age >= 50) {
        score += 6;
        reasons.push("Higher age increases health-risk relevance.");
      }
    }

    if (schemeType === "kcc") {
      if (age !== null && age >= 18 && age <= 75) {
        score += 16;
        reasons.push("Age profile matches common KCC eligibility range.");
      }
      if (income !== null && income <= 800000) score += 5;
    }

    if (schemeType === "mgnrega") {
      if (age !== null && age >= 18) score += 12;
      if (income !== null && income <= 250000) {
        score += 18;
        reasons.push("MGNREGA is useful for income support in rural households.");
      }
      if (age !== null && age >= 50) score += 3;
    }

    return {
      ...scheme,
      recommendationScore: score,
      recommendationReasons: reasons.slice(0, 3),
    };
  });

  return scored
    .sort((first, second) => second.recommendationScore - first.recommendationScore)
    .slice(0, limit);
};

const getProfileRecommendationsAI = async (profile = {}, limit = 5) => {
  const schemes = getLatestSchemes();
  const compactSchemes = schemes.map((s) => ({
    id: s.id,
    name: s.name_en || s.name_hi || s.name_or,
    description: s.description_en || s.description_hi || s.description_or,
  }));

  try {
    const prompt = JSON.stringify({
      task: "Rank these candidate schemes for this user profile.",
      profile,
      candidates: compactSchemes,
      limit,
      output_format: {
        recommendations: [
          {
            id: "number",
            score: "number 0-100",
            reasons: ["short strings"],
          },
        ],
      },
      rules:
        "Return STRICT JSON only. No markdown. Use practical eligibility reasoning; if unsure, keep reasons generic.",
    });

    const result = await geminiGenerateContent({
      model: "gemini-2.0-flash",
      text: prompt,
      temperature: 0.2,
    });

    if (!result.text) {
      return { recommendations: null, error: result.error || "AI failed." };
    }

    const parsed = safeJsonParse(result.text);
    if (!parsed || !Array.isArray(parsed.recommendations)) {
      return {
        recommendations: null,
        error: "AI response could not be parsed.",
      };
    }

    const byId = new Map(schemes.map((s) => [s.id, s]));
    const merged = parsed.recommendations
      .map((r) => {
        const scheme = byId.get(r.id);
        if (!scheme) return null;
        return {
          ...scheme,
          recommendationScore:
            typeof r.score === "number" ? r.score : scheme.recommendationScore ?? 0,
          recommendationReasons: Array.isArray(r.reasons) ? r.reasons.slice(0, 3) : [],
        };
      })
      .filter(Boolean)
      .slice(0, limit);

    return {
      recommendations: merged.length ? merged : null,
      error: merged.length ? null : "AI returned no ranked recommendations.",
    };
  } catch (error) {
    return {
      recommendations: null,
      error:
        error?.message || "AI recommendation request failed.",
    };
  }
};

const getProSchemeRecommendationsAI = async (
  profile = {},
  limit = 5,
  language = "en"
) => {
  try {
    const prompt = JSON.stringify({
      task: "Fetch latest Indian government schemes from the web and recommend the best ones for this user profile.",
      profile,
      limit,
      language,
      output_format: {
        recommendations: [
          {
            name: "string",
            description: "string",
            url: "string",
            score: "number 0-100",
            reasons: ["short strings"],
          },
        ],
      },
      rules:
        "Return STRICT JSON only. No markdown. Prefer official sources (gov.in, nic.in, pmindia.gov.in, etc.) when possible.",
    });

    const result = await geminiGenerateContent({
      model: "gemini-2.0-flash",
      text: prompt,
      tools: [{ google_search: {} }],
      temperature: 0.2,
    });

    if (!result.text) {
      return { recommendations: null, error: result.error || "Pro AI failed." };
    }

    const parsed = safeJsonParse(result.text);
    if (!parsed || !Array.isArray(parsed.recommendations)) {
      return { recommendations: null, error: "AI response could not be parsed." };
    }

    const cleaned = parsed.recommendations
      .map((item) => ({
        id: item.id || null,
        name_en: item.name || "",
        description_en: item.description || "",
        sourceUrl: item.url || "",
        recommendationScore: typeof item.score === "number" ? item.score : 0,
        recommendationReasons: Array.isArray(item.reasons)
          ? item.reasons.slice(0, 3)
          : [],
        isLive: true,
      }))
      .filter((item) => item.name_en);

    return {
      recommendations: cleaned.slice(0, limit),
      error: cleaned.length ? null : "AI returned no recommendations.",
    };
  } catch (error) {
    return {
      recommendations: null,
      error: error?.message || "Pro AI request failed.",
    };
  }
};

module.exports = {
  getLatestSchemes,
  getProfileRecommendations,
  getProfileRecommendationsAI,
  getProSchemeRecommendationsAI,
};
