import { useEffect, useMemo, useState } from "react";
import ChatInput from "../components/ChatInput";
import ChatMessage from "../components/ChatMessage";
import LanguageSelector from "../components/LanguageSelector";
import SectionCards from "../components/SectionCards";
import SchemeProfileForm from "../components/SchemeProfileForm";
import { getSchemeRecommendations, sendChatMessage } from "../services/api";
import { translations } from "../services/translations";

const getSpeechRecognition = () =>
  window.SpeechRecognition || window.webkitSpeechRecognition;

function HelpdeskPage() {
  const [language, setLanguage] = useState("hi");
  const labels = useMemo(() => translations[language], [language]);
  const [activeSection, setActiveSection] = useState("");
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [listening, setListening] = useState(false);
  const [schemeProfile, setSchemeProfile] = useState({
    name: "",
    age: "",
    income: "",
    gender: "",
    pro: false,
  });
  const [recommending, setRecommending] = useState(false);

  const resetChatForSection = (section) => {
    setActiveSection(section);
    setMessages([
      {
        id: Date.now(),
        role: "bot",
        text: labels.sectionPrompts[section] || labels.welcome,
      },
    ]);
    setInput("");
    setError("");
  };

  useEffect(() => {
    if (activeSection) {
      setMessages([
        {
          id: Date.now(),
          role: "bot",
          text: labels.sectionPrompts[activeSection] || labels.welcome,
        },
      ]);
      setError("");
    }
  }, [activeSection, labels]);

  const pickLocalizedField = (scheme, base) => {
    if (language === "or") {
      return (
        scheme?.[`${base}_or`] ??
        scheme?.[`${base}_hi`] ??
        scheme?.[`${base}_en`] ??
        scheme?.[base] ??
        ""
      );
    }
    if (language === "hi") {
      return (
        scheme?.[`${base}_hi`] ??
        scheme?.[`${base}_en`] ??
        scheme?.[`${base}_or`] ??
        scheme?.[base] ??
        ""
      );
    }
    return (
      scheme?.[`${base}_en`] ??
      scheme?.[`${base}_hi`] ??
      scheme?.[`${base}_or`] ??
      scheme?.[base] ??
      ""
    );
  };

  const formatRecommendations = (recommendations) =>
    recommendations
      .map((scheme, index) => {
        const name = pickLocalizedField(scheme, "name") || labels.schemeFallback;
        const description = pickLocalizedField(scheme, "description") || "";
        const score =
          typeof scheme?.recommendationScore === "number"
            ? scheme.recommendationScore
            : "";
        const reasons = Array.isArray(scheme?.recommendationReasons)
          ? scheme.recommendationReasons.join(" ")
          : "";

        return `${index + 1}. ${name}\n   - ${description}\n   - ${labels.matchScore}: ${score}\n   - ${labels.why}: ${reasons}`;
      })
      .join("\n\n");

  const onRecommendSchemes = async () => {
    setRecommending(true);
    setError("");

    try {
      const data = await getSchemeRecommendations(schemeProfile, 10);
      const text = formatRecommendations(data.recommendations || []);
      const modeLine =
        data.mode === "pro"
          ? labels.modeProLocal
          : labels.modeRulesLocal;
      const botMessage = {
        id: Date.now() + 10,
        role: "bot",
        text: text
          ? `${labels.bestSchemesTitle}\n${modeLine}\n\n${text}`
          : labels.noRecommendations,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (requestError) {
      setError(requestError.message || labels.error);
    } finally {
      setRecommending(false);
    }
  };

  const speak = (text) => {
    if (!("speechSynthesis" in window)) {
      return;
    }
    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = language === "hi" ? "hi-IN" : language === "or" ? "or-IN" : "en-IN";
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utterance);
  };

  const onStartListening = () => {
    const SpeechRecognition = getSpeechRecognition();
    if (!SpeechRecognition) {
      setError(labels.speechNotSupported);
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language === "hi" ? "hi-IN" : language === "or" ? "or-IN" : "en-IN";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => {
      setListening(true);
      setError("");
    };
    recognition.onend = () => setListening(false);
    recognition.onerror = () => {
      setListening(false);
      setError(labels.speechError);
    };
    recognition.onresult = (event) => {
      const transcript = event.results[0][0].transcript;
      setInput(transcript);
    };

    recognition.start();
  };

  const submitMessage = async (event) => {
    event.preventDefault();
    const query = input.trim();
    if (!query) {
      return;
    }

    const userMessage = { id: Date.now(), role: "user", text: query };
    setMessages((prev) => [...prev, userMessage]);
    setInput("");
    setLoading(true);
    setError("");

    try {
      const profileToSend =
        activeSection === "schemes" ? schemeProfile : undefined;
      const data = await sendChatMessage(query, language, activeSection, profileToSend);
      const botMessage = {
        id: Date.now() + 1,
        role: "bot",
        text: data.response,
      };
      setMessages((prev) => [...prev, botMessage]);
    } catch (requestError) {
      setError(requestError.message || labels.error);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="mx-auto flex min-h-screen w-full max-w-md flex-col overflow-hidden border border-slate-200 bg-gradient-to-b from-slate-50 to-white shadow-[0_8px_30px_rgba(15,23,42,0.08)]">
      <header className="sticky top-0 z-10 flex items-center justify-between border-b border-slate-100 bg-white/95 px-4 py-3 backdrop-blur">
        <h1 className="text-base font-extrabold tracking-tight text-slate-900">{labels.appTitle}</h1>
        <LanguageSelector language={language} onChange={setLanguage} />
      </header>

      {!activeSection ? (
        <section className="flex-1 px-4 py-5">
          <h2 className="text-lg font-bold text-slate-900">{labels.homeTitle}</h2>
          <p className="mt-1 mb-4 text-sm text-slate-600">{labels.homeSubtitle}</p>
          <SectionCards labels={labels} onSelect={resetChatForSection} />
        </section>
      ) : (
        <>
          <section className="border-b border-slate-200 bg-white px-4 py-2">
            <div className="mb-2 text-xs font-medium text-slate-500">
              {labels.activeSection}
            </div>
            <div className="flex items-center justify-between">
              <div className="text-sm font-semibold text-slate-800">
                {activeSection === "schemes"
                  ? labels.schemesSection
                  : activeSection === "jobs"
                    ? labels.jobsSection
                    : labels.farmingSection}
              </div>
              <button
                type="button"
                onClick={() => setActiveSection("")}
                className="cursor-pointer rounded-lg bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-700 transition hover:bg-slate-200 active:scale-95"
              >
                {labels.backToHome}
              </button>
            </div>
          </section>

          {activeSection === "schemes" && (
            <SchemeProfileForm
              labels={labels}
              profile={schemeProfile}
              onChange={setSchemeProfile}
              onRecommend={onRecommendSchemes}
              loading={recommending}
            />
          )}

          <section className="flex-1 overflow-y-auto px-3 py-4">
            {messages.map((message) => (
              <ChatMessage
                key={message.id}
                role={message.role}
                text={message.text}
                onSpeak={speak}
                speakLabel={labels.speak}
              />
            ))}
            {loading && (
              <div className="mb-3 rounded-2xl bg-white px-4 py-3 text-sm text-slate-500 shadow-sm">
                {labels.loading}
              </div>
            )}
            {error && (
              <div className="rounded-xl bg-red-100 px-4 py-2 text-sm text-red-700">
                {error}
              </div>
            )}
          </section>

          <ChatInput
            value={input}
            onChange={setInput}
            onSubmit={submitMessage}
            onStartListening={onStartListening}
            listening={listening}
            labels={labels}
            disabled={loading}
          />
        </>
      )}
    </main>
  );
}

export default HelpdeskPage;
