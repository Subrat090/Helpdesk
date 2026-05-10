const tokenize = (text) =>
  String(text || "")
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .split(/\s+/)
    .map((t) => t.trim())
    .filter(Boolean);

// Very small, local ML model: Multinomial Naive Bayes with Laplace smoothing.
// Trained on seed examples below (can be expanded later).
class NaiveBayesTextClassifier {
  constructor() {
    this.classDocCounts = new Map(); // class -> docs
    this.classTokenCounts = new Map(); // class -> total tokens
    this.tokenCountsByClass = new Map(); // class -> Map(token->count)
    this.vocab = new Set();
    this.totalDocs = 0;
  }

  addExample(label, text) {
    const tokens = tokenize(text);
    if (!tokens.length) return;
    this.totalDocs += 1;
    this.classDocCounts.set(label, (this.classDocCounts.get(label) || 0) + 1);

    const byToken = this.tokenCountsByClass.get(label) || new Map();
    let totalTokens = this.classTokenCounts.get(label) || 0;
    for (const tok of tokens) {
      this.vocab.add(tok);
      byToken.set(tok, (byToken.get(tok) || 0) + 1);
      totalTokens += 1;
    }
    this.tokenCountsByClass.set(label, byToken);
    this.classTokenCounts.set(label, totalTokens);
  }

  // Returns { label, confidence, scores }
  predict(text) {
    const tokens = tokenize(text);
    const labels = [...this.classDocCounts.keys()];
    if (!tokens.length || !labels.length) {
      return { label: "complex", confidence: 0, scores: {} };
    }

    const vocabSize = Math.max(this.vocab.size, 1);
    const scores = {};

    // log P(class) + sum log P(token|class)
    for (const label of labels) {
      const classDocs = this.classDocCounts.get(label) || 0;
      const prior = Math.log((classDocs + 1) / (this.totalDocs + labels.length));

      const tokenMap = this.tokenCountsByClass.get(label) || new Map();
      const totalTokens = this.classTokenCounts.get(label) || 0;

      let logp = prior;
      for (const tok of tokens) {
        const count = tokenMap.get(tok) || 0;
        const prob = (count + 1) / (totalTokens + vocabSize);
        logp += Math.log(prob);
      }
      scores[label] = logp;
    }

    // Pick top-2 to compute a margin-based confidence.
    const sorted = Object.entries(scores).sort((a, b) => b[1] - a[1]);
    const [bestLabel, bestScore] = sorted[0];
    const secondScore = sorted[1]?.[1] ?? -Infinity;
    const margin = bestScore - secondScore;

    // Convert margin to a bounded 0..1 confidence (heuristic).
    const confidence = 1 - Math.exp(-Math.max(0, margin));

    return { label: bestLabel, confidence, scores };
  }
}

// Seed training data (Hindi + English + a little Odia transliteration support)
// NOTE: These are intentionally short; add more examples to improve accuracy.
const seedExamples = [
  // schemes
  ["schemes", "best scheme for me"],
  ["schemes", "which scheme am I eligible for"],
  ["schemes", "yojana batao"],
  ["schemes", "योजना बताओ"],
  ["schemes", "सरकारी योजना"],
  ["schemes", "scholarship scheme"],
  ["schemes", "awas yojana"],
  ["schemes", "pm kisan"],
  ["schemes", "pension yojana"],
  ["schemes", "health scheme ayushman"],

  // jobs
  ["jobs", "government job"],
  ["jobs", "sarkari naukri"],
  ["jobs", "नौकरी बताओ"],
  ["jobs", "rojgar"],
  ["jobs", "job vacancy"],
  ["jobs", "apply for govt job"],
  ["jobs", "रेलवे भर्ती"],
  ["jobs", "teacher vacancy"],

  // farming
  ["farming", "farming tips"],
  ["farming", "crop advice"],
  ["farming", "खेती सलाह"],
  ["farming", "फसल रोग"],
  ["farming", "kheti kaise kare"],
  ["farming", "pest control for crops"],
  ["farming", "fertilizer guidance"],
  ["farming", "irrigation methods"],

  // complex (anything else)
  ["complex", "write a letter to the bank"],
  ["complex", "summarize this paragraph"],
  ["complex", "translate this text"],
  ["complex", "help me decide between two options"],
  ["complex", "tell me a story"],
];

let model = null;

const getIntentModel = () => {
  if (model) return model;
  const m = new NaiveBayesTextClassifier();
  for (const [label, text] of seedExamples) {
    m.addExample(label, text);
  }
  model = m;
  return model;
};

const predictIntentML = (query) => {
  const m = getIntentModel();
  return m.predict(query);
};

module.exports = {
  predictIntentML,
};

