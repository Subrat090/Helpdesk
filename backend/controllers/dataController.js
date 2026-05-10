const { loadJson } = require("../utils/dataLoader");
const {
  getLatestSchemes,
  getProfileRecommendations,
  getProfileRecommendationsAI,
  getProSchemeRecommendationsAI,
} = require("../utils/schemeAdvisor");

const getSchemes = (_req, res) => {
  const schemes = loadJson("schemes.json");
  res.json(schemes);
};

const getLatestSchemesList = (req, res) => {
  const limitParam = Number(req.query.limit);
  const latestSchemes = getLatestSchemes();
  const schemes =
    Number.isFinite(limitParam) && limitParam > 0
      ? latestSchemes.slice(0, limitParam)
      : latestSchemes;
  res.json(schemes);
};

const recommendSchemes = async (req, res, next) => {
  try {
    const {
      name = "",
      age,
      income,
      gender = "",
      limit,
      mode = "",
      language = "en",
    } =
      req.body || {};
  const normalizedLimit = Number(limit);
  const topN =
    Number.isFinite(normalizedLimit) && normalizedLimit > 0
      ? normalizedLimit
      : 10;

    const profile = { name, age, income, gender };
    const normalizedMode = String(mode || "").toLowerCase();
    const effectiveMode =
      normalizedMode === "pro" ? "pro" : normalizedMode === "ml" ? "ml" : "rules";
    const recommendations = getProfileRecommendations(profile, topN, {
      mode: effectiveMode,
    });

    res.json({
      requestedMode: effectiveMode,
      mode: effectiveMode,
      aiError: null,
      profile,
      recommendations,
    });
  } catch (error) {
    next(error);
  }
};

const getJobs = (_req, res) => {
  const jobs = loadJson("jobs.json");
  res.json(jobs);
};

const getFarmingTips = (_req, res) => {
  const farmingTips = loadJson("farming.json");
  res.json(farmingTips);
};

module.exports = {
  getSchemes,
  getLatestSchemesList,
  recommendSchemes,
  getJobs,
  getFarmingTips,
};
