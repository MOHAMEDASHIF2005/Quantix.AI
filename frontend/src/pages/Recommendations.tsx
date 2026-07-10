import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { api } from "@/api/client";
import type { Recommendation, Urgency } from "@/types";
import { Layout } from "@/components/layout/Layout";
import { Card, EmptyState, Spinner, UrgencyBadge, TiltCard } from "@/components/ui/Primitives";
import { actionLabel } from "@/lib/format";

const URGENCY_FILTERS: { label: string; value: Urgency | "all" }[] = [
  { label: "All", value: "all" },
  { label: "Critical", value: "critical" },
  { label: "High", value: "high" },
  { label: "Medium", value: "medium" },
  { label: "Low", value: "low" },
];

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.05,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 12 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 200,
      damping: 20,
    },
  },
};

export default function Recommendations() {
  const [recs, setRecs] = useState<Recommendation[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<Urgency | "all">("all");

  useEffect(() => {
    api.recommendations.list().then((data) => {
      setRecs(data);
      setLoading(false);
    });
  }, []);

  const filtered = filter === "all" ? recs : recs.filter((r) => r.urgency === filter);

  return (
    <Layout title="Recommendations" subtitle="Every purchasing decision, ranked and explained">
      <div className="mb-5 flex gap-2 relative">
        {URGENCY_FILTERS.map((f) => {
          const isActive = filter === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setFilter(f.value)}
              className={`rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors relative z-10 ${
                isActive ? "text-signal-indigo" : "text-ink-500 hover:text-ink-100"
              }`}
            >
              <span className="relative z-10">{f.label}</span>
              {isActive && (
                <motion.div
                  layoutId="active-rec-filter-bg"
                  className="absolute inset-0 rounded-full bg-signal-indigo/15 z-0"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
            </button>
          );
        })}
      </div>

      {loading ? (
        <Spinner />
      ) : filtered.length === 0 ? (
        <EmptyState title="No recommendations here" detail="Try a different urgency filter." />
      ) : (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-3 relative"
        >
          {filtered.map((r) => (
            <motion.div
              key={r.product_id}
              variants={itemVariants}
            >
              <Link to={`/products/${r.product_id}`}>
                <TiltCard className="flex items-center justify-between gap-6 p-5 hover:border-signal-indigo/40 group">
                  <div className="min-w-0 flex-1">
                    <div className="mb-1 flex items-center gap-2">
                      <p className="font-medium text-ink-100 group-hover:text-signal-indigo transition-colors">{r.product_name}</p>
                      <span className="font-mono text-[11px] text-ink-500">{r.sku}</span>
                      <UrgencyBadge urgency={r.urgency} />
                      <span className="rounded-md bg-base-700 px-2 py-0.5 text-[11px] font-medium text-ink-300">
                        {actionLabel[r.action]}
                      </span>
                    </div>
                    <p className="truncate text-sm text-ink-500">{r.summary}</p>
                  </div>
                  <div className="flex shrink-0 gap-6 text-right">
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-ink-500">Days left</p>
                      <p className="font-mono text-sm tabular text-ink-100">{r.days_of_stock_remaining.toFixed(0)}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-ink-500">Order qty</p>
                      <p className="font-mono text-sm tabular text-ink-100">{r.recommended_order_qty}</p>
                    </div>
                    <div>
                      <p className="text-[11px] uppercase tracking-wider text-ink-500">Weekly demand</p>
                      <p className="font-mono text-sm tabular text-ink-100">{r.forecasted_weekly_demand}</p>
                    </div>
                  </div>
                </TiltCard>
              </Link>
            </motion.div>
          ))}
        </motion.div>
      )}
    </Layout>
  );
}
