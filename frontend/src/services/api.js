const parseResponse = async (response) => {
  const payload = await response.json();

  if (!response.ok) {
    throw new Error(payload?.message || payload?.error || "Request failed");
  }

  return payload;
};

export const sendChatMessage = async (query, language, category, profile = {}) => {
  const response = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ query, language, category, profile }),
  });

  return parseResponse(response);
};

export const fetchLatestSchemes = async (limit) => {
  const endpoint = Number.isFinite(Number(limit)) ? `/api/schemes/latest?limit=${Number(limit)}` : "/api/schemes/latest";
  const response = await fetch(endpoint);
  return parseResponse(response);
};

export const getSchemeRecommendations = async (profile, limit = 10) => {
  // Local-only modes: "rules" (all schemes) and "pro" (our selected schemes).
  const mode = profile?.pro ? "pro" : "rules";
  const response = await fetch("/api/schemes/recommend", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ ...profile, limit, mode }),
  });
  return parseResponse(response);
};
