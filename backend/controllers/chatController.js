const { loadJson } = require("../utils/dataLoader");
const { geminiGenerateContent } = require("../utils/geminiClient");
const { predictIntentML } = require("../utils/mlIntent");
const {
  getLatestSchemes,
  getProfileRecommendations,
} = require("../utils/schemeAdvisor");

const hasGemini = Boolean(process.env.GEMINI_API_KEY);

const i18n = {
  hi: {
    titles: {
      schemes: "सरकारी योजनाएं",
      jobs: "सरकारी नौकरियां",
      farming: "खेती संबंधी सुझाव",
    },
    benefit: "लाभ",
    lastDate: "अंतिम तिथि",
    fallback:
      "माफ कीजिए, मैं अभी यह सवाल ठीक से समझ नहीं पाया। कृपया योजना, नौकरी या खेती से जुड़ा सवाल पूछें।",
  },
  en: {
    titles: {
      schemes: "Government Schemes",
      jobs: "Government Jobs",
      farming: "Farming Guidance",
    },
    benefit: "Benefit",
    lastDate: "Last Date",
    fallback:
      "Sorry, I could not fully understand that. Please ask about schemes, jobs, or farming.",
  },
  or: {
    titles: {
      schemes: "ସରକାରୀ ଯୋଜନା",
      jobs: "ସରକାରୀ ଚାକିରି",
      farming: "ଚାଷ ପରାମର୍ଶ",
    },
    benefit: "ଲାଭ",
    lastDate: "ଶେଷ ତାରିଖ",
    fallback:
      "ମାଫ କରିବେ, ପ୍ରଶ୍ନଟି ସ୍ପଷ୍ଟ ହେଲା ନାହିଁ। ଦୟାକରି ଯୋଜନା, ଚାକିରି କିମ୍ବା ଚାଷ ବିଷୟରେ ପଚାରନ୍ତୁ।",
  },
};

const normalizeLanguage = (language) => {
  if (!language || typeof language !== "string") return "hi";
  const normalized = language.toLowerCase();
  if (normalized.startsWith("en")) return "en";
  if (normalized.startsWith("or") || normalized.startsWith("od")) return "or";
  return "hi";
};

const getLocalizedField = (item, field, language) => {
  const lang = normalizeLanguage(language);
  return (
    item?.[`${field}_${lang}`] ??
    item?.[`${field}_en`] ??
    item?.[field] ??
    ""
  );
};

const containsAny = (text, words) => words.some((word) => text.includes(word));
const supportedIntents = new Set(["schemes", "jobs", "farming"]);
const latestQueryWords = [
  "latest",
  "newest",
  "recent",
  "new scheme",
  "नई योजना",
  "लेटेस्ट",
];
const recommendationQueryWords = [
  "best scheme",
  "recommend",
  "suggest",
  "eligible",
  "which scheme",
  "best for me",
  "मेरे लिए",
  "सुझाव",
];

const detectIntent = (query) => {
  // Local ML intent detection first; fall back to keyword rules if not confident.
  const ml = predictIntentML(query);
  if (ml?.label && ml.confidence >= 0.45) {
    return ml.label;
  }

  const normalized = query.toLowerCase();

  if (
    containsAny(normalized, [
      "scheme",
      "schemes",
      "schme",
      "schmes",
      "yojana",
      "yojna",
      "yozna",
      "योजना",
    ])
  ) {
    return "schemes";
  }
  if (
    containsAny(normalized, [
      "job",
      "jobs",
      "naukri",
      "nokri",
      "rojgar",
      "रोजगार",
      "नौकरी",
    ])
  ) {
    return "jobs";
  }
  if (
    containsAny(normalized, [
      "crop",
      "crops",
      "kheti",
      "khaiti",
      "farming",
      "खेती",
      "फसल",
    ])
  ) {
    return "farming";
  }

  return "complex";
};

const buildStructuredResponse = (intent, language = "hi", options = {}) => {
  const locale = i18n[normalizeLanguage(language)] || i18n.hi;
  const sources = {
    schemes: { file: "schemes.json", title: locale.titles.schemes },
    jobs: { file: "jobs.json", title: locale.titles.jobs },
    farming: { file: "farming.json", title: locale.titles.farming },
  };

  const source = sources[intent];
  if (!source) {
    return null;
  }

  const rows = (() => {
    if (intent === "schemes" && options.useLatestSchemes) {
      const latestRows = getLatestSchemes();
      return options.limit ? latestRows.slice(0, options.limit) : latestRows;
    }
    const allRows = loadJson(source.file);
    if (options.limit) return allRows.slice(0, options.limit);
    return allRows.slice(0, 5);
  })();
  const response = rows
    .map((item, index) => {
      const displayName =
        getLocalizedField(item, "name", language) ||
        getLocalizedField(item, "title", language);
      const description = getLocalizedField(item, "description", language);
      const benefit = getLocalizedField(item, "benefit", language);
      const lines = [
        `${index + 1}. ${displayName}`,
        description ? `   - ${description}` : null,
        benefit ? `   - ${locale.benefit}: ${benefit}` : null,
        item.lastDate ? `   - ${locale.lastDate}: ${item.lastDate}` : null,
      ].filter(Boolean);
      return lines.join("\n");
    })
    .join("\n\n");

  return `${source.title}:\n\n${response}`;
};

const generateWithGemini = async (query, language) => {
  if (!hasGemini) return null;

  const prompt = `You are a rural India helpdesk assistant. Give concise, practical, and user-friendly responses.\nLanguage: ${language}\nQuestion: ${query}`;
  const result = await geminiGenerateContent({
    model: "gemini-2.0-flash",
    text: prompt,
    temperature: 0.3,
  });

  return result.text || null;
};

const chatWithAgent = async (req, res, next) => {
  try {
    const {
      query = "",
      language = "hi",
      category = "",
      profile = {},
      name,
      age,
      income,
      gender,
    } = req.body || {};
    const mergedProfile = {
      ...profile,
      name: profile.name ?? name,
      age: profile.age ?? age,
      income: profile.income ?? income,
      gender: profile.gender ?? gender,
    };
    const normalizedLanguage = normalizeLanguage(language);
    const locale = i18n[normalizedLanguage] || i18n.hi;

    if (!query.trim()) {
      return res.status(400).json({ error: "Query is required." });
    }

    const forcedIntent = supportedIntents.has(category) ? category : "";
    const intent = forcedIntent || detectIntent(query);
    const normalizedQuery = query.toLowerCase();
    const wantsLatestSchemes =
      intent === "schemes" && containsAny(normalizedQuery, latestQueryWords);
    const wantsRecommendations =
      intent === "schemes" &&
      (containsAny(normalizedQuery, recommendationQueryWords) ||
        mergedProfile.age !== undefined ||
        mergedProfile.income !== undefined ||
        mergedProfile.gender !== undefined);

    if (intent !== "complex") {
      if (wantsRecommendations) {
        const recommendedSchemes = getProfileRecommendations(mergedProfile, 10);
        const recommendationText = recommendedSchemes
          .map((scheme, index) => {
            const displayName =
              getLocalizedField(scheme, "name", normalizedLanguage) ||
              getLocalizedField(scheme, "title", normalizedLanguage);
            const description = getLocalizedField(
              scheme,
              "description",
              normalizedLanguage
            );
            const reasons = (scheme.recommendationReasons || []).join(" ");
            return `${index + 1}. ${displayName}\n   - ${description}\n   - Match score: ${
              scheme.recommendationScore
            }\n   - Why: ${reasons}`;
          })
          .join("\n\n");

        const userName =
          typeof mergedProfile.name === "string" && mergedProfile.name.trim()
            ? `${mergedProfile.name.trim()}, `
            : "";

        return res.json({
          source: "rules",
          intent: "scheme_recommendations",
          response: `Best scheme suggestions for ${userName}your profile:\n\n${recommendationText}`,
          recommendations: recommendedSchemes,
        });
      }

      const response = buildStructuredResponse(intent, normalizedLanguage);
      const latestResponse = wantsLatestSchemes
        ? buildStructuredResponse(intent, normalizedLanguage, {
            useLatestSchemes: true,
          })
        : null;
      if (!response) {
        return res.json({
          source: "fallback",
          intent: "unknown",
          response: locale.fallback,
        });
      }
      return res.json({
        source: "rules",
        intent: wantsLatestSchemes ? "latest_schemes" : intent,
        response: latestResponse || response,
      });
    }

    const aiResponse = await generateWithGemini(query, normalizedLanguage);
    if (aiResponse) {
      return res.json({ source: "gemini", intent, response: aiResponse });
    }

    return res.json({
      source: "fallback",
      intent: "unknown",
      response: locale.fallback,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  chatWithAgent,
};
