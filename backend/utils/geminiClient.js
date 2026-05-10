const geminiGenerateContent = async ({
  model,
  text,
  tools = null,
  temperature = 0.3,
}) => {
  const GEMINI_API_KEY = process.env.GEMINI_API_KEY;
  if (!GEMINI_API_KEY) {
    return {
      text: null,
      raw: null,
      error: "GEMINI_API_KEY is not configured.",
    };
  }

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`;
  const body = {
    contents: [{ role: "user", parts: [{ text }] }],
    generationConfig: { temperature },
  };
  if (Array.isArray(tools) && tools.length) {
    body.tools = tools;
  }

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": GEMINI_API_KEY,
      },
      body: JSON.stringify(body),
    });

    const payload = await response.json().catch(() => null);
    if (!response.ok) {
      const message =
        payload?.error?.message ||
        payload?.message ||
        `Gemini request failed (${response.status})`;
      return { text: null, raw: payload, error: message };
    }

    const candidateText =
      payload?.candidates?.[0]?.content?.parts
        ?.map((part) => part?.text)
        .filter(Boolean)
        .join("\n") || null;

    return { text: candidateText, raw: payload, error: null };
  } catch (error) {
    return {
      text: null,
      raw: null,
      error: error?.message || "Gemini request failed.",
    };
  }
};

module.exports = {
  geminiGenerateContent,
};
