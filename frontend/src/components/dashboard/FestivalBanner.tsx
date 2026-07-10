import { Sparkles } from "lucide-react";
import { motion } from "framer-motion";

export function FestivalBanner() {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className="mb-6 flex items-center justify-between gap-4 rounded-xl border border-signal-amber/30 bg-signal-amber/5 p-4 shadow-sm"
    >
      <div className="flex items-center gap-3">
        <div className="relative flex h-9 w-9 items-center justify-center rounded-lg bg-signal-amber/15 text-signal-amber">
          <Sparkles size={18} />
          <span className="absolute inset-0 rounded-lg border border-signal-amber/30 animate-ping opacity-40" />
        </div>
        <div>
          <p className="text-sm font-semibold text-ink-100">
            Upcoming Festival Impact: <span className="text-signal-amber">Raksha Bandhan</span> (August 28, 2026)
          </p>
          <p className="text-xs text-ink-500 mt-0.5">
            Expected demand multipliers: <span className="font-semibold text-ink-300">Beauty (1.3x)</span>, <span className="font-semibold text-ink-300">Electronics (1.2x)</span>, and <span className="font-semibold text-ink-300">Nutrition/General (1.15x)</span> are now active.
          </p>
        </div>
      </div>
      <div className="hidden sm:block text-right">
        <span className="inline-flex items-center rounded-full bg-signal-amber/10 px-2.5 py-0.5 text-xs font-semibold text-signal-amber border border-signal-amber/20">
          Forecast Adjusted
        </span>
      </div>
    </motion.div>
  );
}
