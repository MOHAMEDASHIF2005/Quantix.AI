import { Suspense } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  UploadCloud,
  Sparkles,
  TrendingUp,
  MessageSquareText,
  ShieldCheck,
  ArrowRight,
  Zap,
} from "lucide-react";
import ExplainabilityScene from "@/components/three/ExplainabilityScene";
import { TiltCard } from "@/components/ui/Primitives";

const MotionLink = motion(Link);

const STEPS = [
  { icon: UploadCloud, title: "Upload", detail: "Drop in a CSV or Excel export from your POS or ERP." },
  { icon: ShieldCheck, title: "Validate & clean", detail: "Missing values imputed, duplicates removed automatically." },
  { icon: TrendingUp, title: "AI forecasts demand", detail: "Trend, seasonality, and lead time modeled per SKU." },
  { icon: Sparkles, title: "Explains every call", detail: "Reasoning trail shows exactly why, in plain language." },
];

const FEATURES = [
  {
    icon: Sparkles,
    title: "Explainable AI",
    detail: "Every reorder recommendation ships with a causal reasoning trail — never a black-box number.",
  },
  {
    icon: UploadCloud,
    title: "Dataset upload & cleaning",
    detail: "Upload CSV or Excel files; Quantix validates, deduplicates, and fills gaps before analysis.",
  },
  {
    icon: TrendingUp,
    title: "Demand forecasting",
    detail: "Statistical models detect trend and seasonality to project demand per product.",
  },
  {
    icon: MessageSquareText,
    title: "AI assistant chatbot",
    detail: "Ask Quantix anything about your stock — grounded in your live dashboard data.",
  },
  {
    icon: ShieldCheck,
    title: "Risk detection",
    detail: "Critical, low, and safe tiers flagged automatically against safety stock thresholds.",
  },
  {
    icon: Zap,
    title: "What-if simulation",
    detail: "Test demand spikes or supplier delays before committing real purchase orders.",
  },
];

const fadeUp = {
  hidden: { opacity: 0, y: 24 },
  show: { opacity: 1, y: 0 },
};

export default function Landing() {
  return (
    <div className="min-h-screen overflow-x-hidden bg-base-900 text-ink-100 relative">
      {/* Subtle Background Glows */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
        <motion.div
          animate={{
            x: [0, 40, -20, 0],
            y: [0, -30, 40, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[-10%] left-[-10%] h-[500px] w-[500px] rounded-full bg-signal-indigo/5 blur-[120px]"
        />
        <motion.div
          animate={{
            x: [0, -30, 40, 0],
            y: [0, 40, -30, 0],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-[40%] right-[-10%] h-[600px] w-[600px] rounded-full bg-signal-emerald/4 blur-[130px]"
        />
      </div>

      {/* Nav */}
      <header className="sticky top-0 z-30 flex items-center justify-between border-b border-base-600 bg-base-900/80 px-6 py-4 backdrop-blur-md sm:px-10">
        <div className="flex items-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-indigo/15 text-signal-indigo">
            <TrendingUp size={18} strokeWidth={2.5} />
          </div>
          <span className="font-display text-[15px] font-semibold">Quantix AI</span>
        </div>
        <MotionLink
          to="/dashboard"
          whileHover={{ scale: 1.04, boxShadow: "0 0 20px 4px rgba(91,127,255,0.3)" }}
          whileTap={{ scale: 0.98 }}
          className="flex items-center gap-1.5 rounded-lg bg-signal-indigo px-4 py-2 text-sm font-medium text-white shadow-glow"
        >
          Launch Dashboard <ArrowRight size={15} />
        </MotionLink>
      </header>

      {/* Hero */}
      <section className="relative mx-auto grid max-w-7xl grid-cols-1 items-center gap-10 px-6 pb-16 pt-14 sm:px-10 lg:grid-cols-2 lg:pt-24 z-10">
        <motion.div initial="hidden" animate="show" variants={fadeUp} transition={{ duration: 0.6 }}>
          <span className="inline-flex items-center gap-1.5 rounded-full border border-signal-indigo/30 bg-signal-indigo/10 px-3 py-1 text-xs font-medium text-signal-indigo">
            <Sparkles size={12} /> Explainable AI Inventory Platform
          </span>
          <h1 className="mt-5 font-display text-4xl font-semibold leading-[1.1] sm:text-5xl">
            Predict. Optimize.
            <br />
            <span className="bg-gradient-to-r from-signal-indigo to-signal-emerald bg-clip-text text-transparent">
              Never run out.
            </span>
          </h1>
          <p className="mt-5 max-w-lg text-[15px] leading-relaxed text-ink-300">
            Quantix AI reads your sales history, current stock, and supplier lead times, then
            recommends exactly how much to reorder — and explains why, in the same plain language
            a veteran inventory manager would use.
          </p>

          <div className="mt-8 flex flex-wrap items-center gap-3">
            <MotionLink
              to="/dashboard"
              whileHover={{ scale: 1.04, boxShadow: "0 0 24px 6px rgba(91,127,255,0.35)" }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 rounded-lg bg-signal-indigo px-5 py-3 text-sm font-medium text-white shadow-glow"
            >
              Enter Dashboard <ArrowRight size={16} />
            </MotionLink>
            <MotionLink
              to="/upload"
              whileHover={{ scale: 1.04, borderColor: "rgba(52,211,153,0.4)", color: "#34D399" }}
              whileTap={{ scale: 0.98 }}
              className="flex items-center gap-2 rounded-lg border border-base-600 bg-base-800 px-5 py-3 text-sm font-medium text-ink-100 transition-colors"
            >
              <UploadCloud size={16} /> Upload your dataset
            </MotionLink>
          </div>

          <div className="mt-10 flex items-center gap-6 text-xs text-ink-500">
            <span>Holt-Winters forecasting</span>
            <span className="h-1 w-1 rounded-full bg-base-600" />
            <span>Auto data cleaning</span>
            <span className="h-1 w-1 rounded-full bg-base-600" />
            <span>Grounded AI chat</span>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, scale: 0.92 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.8, delay: 0.15 }}
          className="relative h-[380px] sm:h-[460px]"
        >
          <div className="absolute inset-0 rounded-3xl bg-gradient-to-br from-signal-indigo/10 via-transparent to-signal-emerald/10" />
          <Suspense fallback={null}>
            <ExplainabilityScene />
          </Suspense>
        </motion.div>
      </section>

      {/* How it works */}
      <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 relative z-10">
        <motion.p
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mb-8 text-xs font-semibold uppercase tracking-wider text-ink-500"
        >
          How it works
        </motion.p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STEPS.map(({ icon: Icon, title, detail }, i) => (
            <TiltCard
              key={title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: i * 0.08 }}
              className="p-5"
            >
              <div className="mb-3 flex h-9 w-9 items-center justify-center rounded-lg bg-signal-indigo/12 text-signal-indigo">
                <Icon size={17} />
              </div>
              <p className="mb-1 text-[11px] font-mono text-ink-500">0{i + 1}</p>
              <p className="font-display text-[15px] font-semibold">{title}</p>
              <p className="mt-1.5 text-sm leading-relaxed text-ink-500">{detail}</p>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* Features */}
      <section className="mx-auto max-w-7xl px-6 py-16 sm:px-10 relative z-10">
        <motion.p
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="mb-8 text-xs font-semibold uppercase tracking-wider text-ink-500"
        >
          Everything an inventory manager needs
        </motion.p>
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {FEATURES.map(({ icon: Icon, title, detail }, i) => (
            <TiltCard
              key={title}
              initial="hidden"
              whileInView="show"
              viewport={{ once: true, margin: "-60px" }}
              variants={fadeUp}
              transition={{ duration: 0.5, delay: (i % 3) * 0.08 }}
              className="p-6"
            >
              <div className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl bg-signal-emerald/12 text-signal-emerald">
                <Icon size={18} />
              </div>
              <p className="font-display text-[15px] font-semibold">{title}</p>
              <p className="mt-2 text-sm leading-relaxed text-ink-500">{detail}</p>
            </TiltCard>
          ))}
        </div>
      </section>

      {/* Example callout */}
      <section className="mx-auto max-w-5xl px-6 pb-24 sm:px-10 relative z-10">
        <motion.div
          initial="hidden"
          whileInView="show"
          viewport={{ once: true, margin: "-80px" }}
          variants={fadeUp}
          className="rounded-3xl border border-signal-indigo/25 bg-gradient-to-br from-signal-indigo/10 to-signal-emerald/5 p-8 sm:p-10"
        >
          <p className="text-xs font-semibold uppercase tracking-wider text-signal-indigo">Instead of this</p>
          <p className="mt-2 font-display text-lg text-ink-300 line-through decoration-signal-red/60">
            "Order 500 units."
          </p>
          <p className="mt-5 text-xs font-semibold uppercase tracking-wider text-signal-emerald">Quantix says this</p>
          <p className="mt-2 font-display text-xl leading-snug text-ink-100 sm:text-2xl">
            "Order 500 units — sales rose 34% over two weeks, a festival lands this weekend,
            supplier delivery takes 4 days, and current stock won't cover it."
          </p>
          <MotionLink
            to="/dashboard"
            whileHover={{ scale: 1.04, boxShadow: "0 0 20px 4px rgba(91,127,255,0.3)" }}
            whileTap={{ scale: 0.98 }}
            className="mt-7 inline-flex items-center gap-2 rounded-lg bg-signal-indigo px-5 py-3 text-sm font-medium text-white shadow-glow"
          >
            See it in the dashboard <ArrowRight size={16} />
          </MotionLink>
        </motion.div>
      </section>

      <footer className="border-t border-base-600 px-6 py-8 text-center text-xs text-ink-700 sm:px-10 relative z-10">
        Quantix AI — Explainable AI Inventory Decision Platform
      </footer>
    </div>
  );
}
