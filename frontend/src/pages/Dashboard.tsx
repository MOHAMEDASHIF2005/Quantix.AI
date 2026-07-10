import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { AlertTriangle, Boxes, DollarSign, Gauge, Sparkles } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/api/client";
import type { DashboardResponse } from "@/types";
import { Layout } from "@/components/layout/Layout";
import { StatCard } from "@/components/ui/StatCard";
import { Card, EmptyState, Spinner, UrgencyBadge } from "@/components/ui/Primitives";
import { CategoryChart } from "@/charts/CategoryChart";
import { currency, percent } from "@/lib/format";
import { FestivalBanner } from "@/components/dashboard/FestivalBanner";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: {
      type: "spring",
      stiffness: 180,
      damping: 18,
    },
  },
};

export default function Dashboard() {
  const [data, setData] = useState<DashboardResponse | null>(null);
  const [narrative, setNarrative] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let active = true;
    setLoading(true);
    console.log("Dashboard: Starting main data fetch...");

    api.dashboard.get()
      .then((dash) => {
        if (!active) return;
        console.log("Dashboard: Main data fetched successfully:", dash);
        setData(dash);
      })
      .catch((err) => {
        console.error("Dashboard: Error fetching main KPIs:", err);
      })
      .finally(() => {
        if (active) {
          console.log("Dashboard: Setting loading to false");
          setLoading(false);
        }
      });

    api.insights.executiveSummary()
      .then((insight) => {
        if (!active) return;
        console.log("Dashboard: Narrative fetched successfully:", insight);
        setNarrative(insight.narrative);
      })
      .catch((err) => {
        console.warn("Dashboard: Executive briefing unavailable (possibly blocked by browser shield):", err);
      });

    return () => {
      active = false;
    };
  }, []);

  return (
    <Layout title="Dashboard" subtitle="Real-time inventory health across your catalog">
      {loading && <Spinner />}

      {!loading && data && (
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="flex flex-col gap-6 relative"
        >
          <motion.div variants={itemVariants}>
            <FestivalBanner />
          </motion.div>

          {narrative && (
            <motion.div variants={itemVariants}>
              <Card className="flex gap-3 border-signal-indigo/25 bg-signal-indigo/[0.06] p-5 hover:border-signal-indigo/40 hover:bg-signal-indigo/[0.08] transition-all">
                <Sparkles size={18} className="mt-0.5 shrink-0 text-signal-indigo animate-pulse" />
                <div>
                  <p className="mb-1 text-xs font-semibold uppercase tracking-wider text-signal-indigo">
                    AI executive briefing
                  </p>
                  <p className="text-sm leading-relaxed text-ink-100">{narrative}</p>
                </div>
              </Card>
            </motion.div>
          )}

          <motion.div
            variants={itemVariants}
            className="grid grid-cols-2 gap-4 lg:grid-cols-4"
          >
            <StatCard
              label="Inventory value"
              value={currency(data.kpis.inventory_value)}
              numericValue={data.kpis.inventory_value}
              formatter={currency}
              sub={`${data.kpis.total_skus} SKUs tracked`}
              icon={<Boxes size={16} />}
            />
            <StatCard
              label="Critical SKUs"
              value={String(data.kpis.critical_skus)}
              numericValue={data.kpis.critical_skus}
              sub="Stockout risk within lead time"
              icon={<AlertTriangle size={16} />}
              tone={data.kpis.critical_skus > 0 ? "critical" : "positive"}
            />
            <StatCard
              label="Revenue at risk"
              value={currency(data.kpis.projected_stockout_value_at_risk)}
              numericValue={data.kpis.projected_stockout_value_at_risk}
              formatter={currency}
              sub="Projected from at-risk SKUs"
              icon={<DollarSign size={16} />}
              tone={data.kpis.projected_stockout_value_at_risk > 0 ? "warning" : "default"}
            />
            <StatCard
              label="Forecast confidence"
              value={percent(data.kpis.avg_forecast_confidence)}
              numericValue={data.kpis.avg_forecast_confidence}
              formatter={percent}
              sub="Average across all models"
              icon={<Gauge size={16} />}
              tone="positive"
            />
          </motion.div>

          <motion.div
            variants={itemVariants}
            className="grid grid-cols-1 gap-6 lg:grid-cols-5"
          >
            <Card className="col-span-3 p-6" hoverGlow>
              <div className="mb-4 flex items-center justify-between">
                <div>
                  <h3 className="font-display text-base font-semibold text-ink-100">Urgent recommendations</h3>
                  <p className="text-sm text-ink-500">Ranked by urgency, highest impact first</p>
                </div>
                <Link to="/recommendations" className="text-sm font-medium text-signal-indigo hover:underline">
                  View all →
                </Link>
              </div>

              {data.top_urgent.length === 0 ? (
                <EmptyState title="Nothing urgent" detail="Every tracked SKU is within a healthy coverage range." />
              ) : (
                <div className="flex flex-col divide-y divide-base-600">
                  {data.top_urgent.map((r, i) => (
                    <motion.div
                      key={r.product_id}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.05 + 0.1, duration: 0.3 }}
                    >
                      <Link
                        to={`/products/${r.product_id}`}
                        className="flex items-center justify-between gap-4 py-3.5 transition-colors hover:bg-base-700/40 rounded-lg px-2 -mx-2 group"
                      >
                        <div className="min-w-0 flex-1">
                          <div className="flex items-center gap-2">
                            <p className="truncate text-sm font-medium text-ink-100 group-hover:text-signal-indigo transition-colors">{r.product_name}</p>
                            <span className="shrink-0 font-mono text-[11px] text-ink-500">{r.sku}</span>
                          </div>
                          <p className="mt-0.5 truncate text-xs text-ink-500">{r.summary}</p>
                        </div>
                        <div className="flex shrink-0 items-center gap-3">
                          <span className="font-mono text-sm tabular text-ink-300">
                            {r.days_of_stock_remaining.toFixed(0)}d left
                          </span>
                          <UrgencyBadge urgency={r.urgency} />
                        </div>
                      </Link>
                    </motion.div>
                  ))}
                </div>
              )}
            </Card>

            <Card className="col-span-2 p-6" hoverGlow>
              <h3 className="font-display text-base font-semibold text-ink-100">Inventory by category</h3>
              <p className="mb-2 text-sm text-ink-500">Value distribution and risk concentration</p>
              <CategoryChart data={data.category_breakdown} />
            </Card>
          </motion.div>
        </motion.div>
      )}
    </Layout>
  );
}
