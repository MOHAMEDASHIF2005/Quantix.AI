import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { MessageSquareText, X, Send, Sparkles, Mic, Volume2, VolumeX } from "lucide-react";
import { api } from "@/api/client";

interface Message {
  role: "user" | "assistant";
  text: string;
}

const SUGGESTIONS = ["What's critical right now?", "What's my inventory value?", "Any overstocked items?"];

const typingBubble = {
  animate: {
    transition: {
      staggerChildren: 0.15,
    },
  },
};

const typingDot = {
  initial: { y: 0 },
  animate: {
    y: [0, -6, 0],
    transition: {
      duration: 0.8,
      repeat: Infinity,
      ease: "easeInOut",
    },
  },
};

export function ChatbotWidget() {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      text: "Hi, I'm the Quantix assistant. Ask me about stock levels, reorder urgency, or inventory value — I'll answer from your live dashboard data.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Web Speech API references
  const SpeechRecognition = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  const recognitionRef = useRef<any>(null);
  const synthRef = useRef<SpeechSynthesis | null>(typeof window !== "undefined" ? window.speechSynthesis : null);
  
  const [isListening, setIsListening] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [speakReplies, setSpeakReplies] = useState(false); // default to false (mute) to respect privacy, toggleable

  // Initialize Speech Recognition
  useEffect(() => {
    if (SpeechRecognition) {
      const rec = new SpeechRecognition();
      rec.continuous = false;
      rec.interimResults = false;
      rec.lang = "en-US";

      rec.onstart = () => {
        setIsListening(true);
        if (synthRef.current?.speaking) {
          synthRef.current.cancel();
          setIsSpeaking(false);
        }
      };

      rec.onresult = (event: any) => {
        const transcript = event.results[0][0].transcript;
        if (transcript) {
          setInput(transcript);
        }
      };

      rec.onerror = (event: any) => {
        console.error("Speech recognition error:", event.error);
        setIsListening(false);
      };

      rec.onend = () => {
        setIsListening(false);
      };

      recognitionRef.current = rec;
    }
  }, [SpeechRecognition]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: "smooth" });
  }, [messages, open, loading]);

  const speakText = (text: string) => {
    if (!synthRef.current || !speakReplies) return;
    synthRef.current.cancel();

    const utterance = new SpeechSynthesisUtterance(text);
    utterance.lang = "en-US";

    const voices = synthRef.current.getVoices();
    const englishVoice = voices.find((v) => v.lang.startsWith("en"));
    if (englishVoice) {
      utterance.voice = englishVoice;
    }

    utterance.onstart = () => setIsSpeaking(true);
    utterance.onend = () => setIsSpeaking(false);
    utterance.onerror = () => setIsSpeaking(false);

    synthRef.current.speak(utterance);
  };

  const toggleListening = () => {
    if (!recognitionRef.current) return;
    if (isListening) {
      recognitionRef.current.stop();
    } else {
      recognitionRef.current.start();
    }
  };

  const send = async (text: string) => {
    const question = text.trim();
    if (!question || loading) return;
    setMessages((m) => [...m, { role: "user", text: question }]);
    setInput("");
    setLoading(true);

    if (synthRef.current?.speaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }

    try {
      const res = await api.chat.ask(question);
      setMessages((m) => [...m, { role: "assistant", text: res.answer }]);
      speakText(res.answer);
    } catch {
      const errMsg = "I couldn't reach the backend — make sure the API server is running on port 8000.";
      setMessages((m) => [...m, { role: "assistant", text: errMsg }]);
      speakText(errMsg);
    } finally {
      setLoading(false);
    }
  };

  // Mute logic when widget collapses
  useEffect(() => {
    if (!open && synthRef.current?.speaking) {
      synthRef.current.cancel();
      setIsSpeaking(false);
    }
  }, [open]);

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 30, scale: 0.93 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 30, scale: 0.93 }}
            transition={{ type: "spring", stiffness: 260, damping: 24 }}
            className="fixed bottom-24 right-6 z-40 flex h-[520px] w-[360px] flex-col overflow-hidden rounded-2xl border border-base-600 bg-base-800 shadow-panel"
          >
            {/* Header */}
            <div className="flex items-center gap-2.5 border-b border-base-600 bg-base-900/60 px-4 py-3.5">
              <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-signal-indigo/15 text-signal-indigo">
                <Sparkles size={15} />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2">
                  <p className="text-sm font-semibold text-ink-100">Ask Quantix</p>
                  {isSpeaking && (
                    <div className="flex items-end gap-0.5 h-3 pb-0.5">
                      <motion.span className="w-0.5 rounded bg-signal-indigo" animate={{ height: [4, 12, 4] }} transition={{ repeat: Infinity, duration: 0.6, ease: "easeInOut" }} />
                      <motion.span className="w-0.5 rounded bg-signal-indigo" animate={{ height: [6, 14, 6] }} transition={{ repeat: Infinity, duration: 0.5, ease: "easeInOut", delay: 0.1 }} />
                      <motion.span className="w-0.5 rounded bg-signal-indigo" animate={{ height: [3, 9, 3] }} transition={{ repeat: Infinity, duration: 0.7, ease: "easeInOut", delay: 0.2 }} />
                    </div>
                  )}
                </div>
                <p className="text-[11px] text-ink-500">Grounded in your live data</p>
              </div>

              {/* Speech Output Audio Toggle */}
              {synthRef.current && (
                <button
                  type="button"
                  onClick={() => {
                    setSpeakReplies(!speakReplies);
                    if (synthRef.current?.speaking) {
                      synthRef.current.cancel();
                      setIsSpeaking(false);
                    }
                  }}
                  className={`rounded-md p-1 transition-colors ${
                    speakReplies ? "text-signal-indigo hover:bg-base-750" : "text-ink-500 hover:bg-base-700 hover:text-ink-100"
                  }`}
                  title={speakReplies ? "Mute voice assistant" : "Unmute voice assistant"}
                >
                  {speakReplies ? <Volume2 size={16} /> : <VolumeX size={16} />}
                </button>
              )}

              <button
                onClick={() => setOpen(false)}
                className="rounded-md p-1 text-ink-500 hover:bg-base-700 hover:text-ink-100 transition-colors"
                aria-label="Close chat"
              >
                <X size={16} />
              </button>
            </div>

            {/* Chat Messages */}
            <div ref={scrollRef} className="flex-1 space-y-3 overflow-y-auto px-4 py-4">
              <AnimatePresence initial={false}>
                {messages.map((m, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 12, scale: 0.95 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    exit={{ opacity: 0 }}
                    transition={{ type: "spring", stiffness: 200, damping: 20 }}
                    className={`max-w-[85%] rounded-xl px-3.5 py-2.5 text-[13px] leading-relaxed ${
                      m.role === "user"
                        ? "ml-auto bg-signal-indigo text-white"
                        : "bg-base-700 text-ink-100"
                    }`}
                  >
                    {m.text}
                  </motion.div>
                ))}
              </AnimatePresence>
              {loading && (
                <motion.div
                  variants={typingBubble}
                  initial="initial"
                  animate="animate"
                  className="flex items-center gap-1 rounded-xl bg-base-700 px-4 py-3 text-ink-100 w-fit"
                >
                  <span className="text-xs text-ink-500 mr-1">assistant is typing</span>
                  <motion.span variants={typingDot} className="h-1.5 w-1.5 rounded-full bg-signal-indigo" />
                  <motion.span variants={typingDot} className="h-1.5 w-1.5 rounded-full bg-signal-indigo" />
                  <motion.span variants={typingDot} className="h-1.5 w-1.5 rounded-full bg-signal-indigo" />
                </motion.div>
              )}
              {messages.length === 1 && !loading && (
                <div className="flex flex-wrap gap-1.5 pt-1">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={s}
                      onClick={() => send(s)}
                      initial={{ opacity: 0, scale: 0.9 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ delay: 0.15 + i * 0.05 }}
                      whileHover={{ scale: 1.04, borderColor: "rgba(91,127,255,0.45)", color: "#5B7FFF" }}
                      whileTap={{ scale: 0.96 }}
                      className="rounded-full border border-base-600 px-2.5 py-1 text-[11px] text-ink-500 transition-colors"
                    >
                      {s}
                    </motion.button>
                  ))}
                </div>
              )}
            </div>

            {/* Input Form */}
            <form
              onSubmit={(e) => {
                e.preventDefault();
                send(input);
              }}
              className="flex items-center gap-2 border-t border-base-600 p-3"
            >
              <div className="relative flex-1 flex items-center">
                <input
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isListening ? "Listening…" : "Ask about your inventory…"}
                  className="flex-1 rounded-lg border border-base-600 bg-base-900 pl-3 pr-10 py-2 text-sm text-ink-100 placeholder:text-ink-700 outline-none focus:border-signal-indigo transition-colors"
                  disabled={isListening}
                />
                
                {/* Micro icon with voice capture validation */}
                {SpeechRecognition ? (
                  <div className="absolute right-2 flex items-center justify-center">
                    <button
                      type="button"
                      onClick={toggleListening}
                      className={`relative flex h-7.5 w-7.5 items-center justify-center rounded-full p-1 transition-colors ${
                        isListening
                          ? "bg-signal-red text-white"
                          : "text-ink-500 hover:text-ink-100"
                      }`}
                      title="Microphone input"
                    >
                      <Mic size={14} />
                      {isListening && (
                        <motion.span
                          className="absolute -inset-1 rounded-full border border-signal-red pointer-events-none"
                          animate={{ scale: [1.1, 1.5], opacity: [0.6, 0] }}
                          transition={{ repeat: Infinity, duration: 1.0, ease: "easeOut" }}
                        />
                      )}
                    </button>
                  </div>
                ) : (
                  <div
                    className="absolute right-2 text-ink-700 cursor-not-allowed"
                    title="Speech recognition not supported in this browser"
                  >
                    <Mic size={14} className="opacity-50" />
                  </div>
                )}
              </div>

              <motion.button
                type="submit"
                disabled={loading || isListening}
                whileHover={{ scale: 1.06, backgroundColor: "rgba(91,127,255,0.95)" }}
                whileTap={{ scale: 0.94 }}
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-signal-indigo text-white disabled:opacity-50"
                aria-label="Send message"
              >
                <Send size={15} />
              </motion.button>
            </form>
          </motion.div>
        )}
      </AnimatePresence>

      <motion.button
        onClick={() => setOpen((o) => !o)}
        whileHover={{ scale: 1.08, rotate: 5, boxShadow: "0 0 20px 4px rgba(91,127,255,0.4)" }}
        whileTap={{ scale: 0.94 }}
        className="fixed bottom-6 right-6 z-40 flex h-14 w-14 items-center justify-center rounded-full bg-signal-indigo text-white shadow-glow"
        aria-label="Open Quantix AI assistant"
      >
        {open ? <X size={22} /> : <MessageSquareText size={22} />}
      </motion.button>
    </>
  );
}
