import { useEffect, useState } from "react";
import { useParams, Link } from "react-router-dom";
import { ArrowLeft, ArrowDownRight, ArrowUpRight, Minus, ShieldCheck, TrendingUp } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/api/client";
import type { ForecastResponse, ProductDetail as ProductDetailT, Recommendation } from "@/types";
import { Layout } from "@/components/layout/Layout";
import { Card, ConfidenceRibbon, SectionLabel, Spinner, UrgencyBadge, TiltCard } from "@/components/ui/Primitives";
import { DemandForecastChart } from "@/charts/DemandForecastChart";
import { currency, percent } from "@/lib/format";
import { FestivalBanner } from "@/components/dashboard/FestivalBanner";

const trendIcon = { rising: ArrowUpRight, falling: ArrowDownRight, stable: Minus };
const impactColor = {
  increases_risk: "border-l-signal-red",
  decreases_risk: "border-l-signal-emerald",
  neutral: "border-l-base-500",
};

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

export default function ProductDetail() {
  const { id } = useParams();
  const [product, setProduct] = useState<ProductDetailT | null>(null);
  const [forecast, setForecast] = useState<ForecastResponse | null>(null);
  const [rec, setRec] = useState<Recommendation | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!id) return;
    const pid = Number(id);
    setLoading(true);
    Promise.all([api.products.get(pid), api.forecasts.get(pid), api.recommendations.get(pid)]).then(
      ([p, f, r]) => {
        setProduct(p);
        setForecast(f);
        setRec(r);
        setLoading(false);
      }
    );
  }, [id]);

  if (loading || !product || !forecast || !rec) {
    return (
      <Layout title="Loading...">
        <Spinner />
      </Layout>
    );
  }

  const TrendIcon = trendIcon[forecast.trend.direction];

  return (
    <Layout
      title={product.name}
      subtitle={`${product.sku} · ${product.category} · ${product.warehouse_location}`}
      actions={
        <motion.div whileHover={{ x: -4 }} transition={{ type: "spring", stiffness: 200, damping: 15 }}>
          <Link to="/products" className="flex items-center gap-1.5 text-sm font-medium text-ink-500 hover:text-ink-100">
            <ArrowLeft size={15} /> Back to inventory
          </Link>
        </motion.div>
      }
    >
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="flex flex-col gap-6"
      >
        <motion.div variants={itemVariants}>
          <FestivalBanner />
        </motion.div>

        <motion.div variants={itemVariants} className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Forecast chart */}
          <Card className="col-span-2 p-6" hoverGlow>
            <div className="mb-1 flex items-center justify-between">
              <div>
                <h3 className="font-display text-base font-semibold text-ink-100">Demand forecast</h3>
                <p className="text-sm text-ink-500">
                  {forecast.history_periods_used} weeks of history · {forecast.method.replace(/-/g, " ")}
                </p>
              </div>
              <div className="text-right">
                <p className="text-xs text-ink-500">Model confidence</p>
                <p className="font-mono text-lg font-semibold text-ink-100">{percent(forecast.model_confidence)}</p>
              </div>
            </div>
            <ConfidenceRibbon confidence={forecast.model_confidence} className="mb-4 mt-2" />
            <DemandForecastChart history={product.demand_records} forecast={forecast.forecast} />
          </Card>

          {/* Recommendation summary */}
          <Card className="p-6" hoverGlow>
            <div className="mb-4 flex items-center justify-between">
              <SectionLabel>AI recommendation</SectionLabel>
              <UrgencyBadge urgency={rec.urgency} />
            </div>
            <p className="font-display text-lg font-semibold leading-snug text-ink-100">{rec.summary}</p>

            <div className="mt-5 grid grid-cols-2 gap-4">
              <Metric label="Current stock" value={String(rec.current_stock)} />
              <Metric label="Days of cover" value={`${rec.days_of_stock_remaining.toFixed(0)}d`} />
              <Metric label="Reorder point" value={rec.reorder_point.toFixed(0)} />
              <Metric label="Safety stock" value={rec.safety_stock.toFixed(0)} />
              <Metric label="Economic order qty" value={String(rec.economic_order_qty)} />
              <Metric label="Recommended order" value={String(rec.recommended_order_qty)} highlight />
            </div>

            {rec.estimated_stockout_date && (
              <div className="mt-5 flex items-center gap-2 rounded-lg bg-signal-redSoft px-3 py-2.5 text-xs text-signal-red">
                <TrendingUp size={14} />
                Estimated stockout: {new Date(rec.estimated_stockout_date).toLocaleDateString("en-US", { month: "long", day: "numeric" })}
              </div>
            )}
            {!rec.estimated_stockout_date && (
              <div className="mt-5 flex items-center gap-2 rounded-lg bg-signal-emeraldSoft px-3 py-2.5 text-xs text-signal-emerald">
                <ShieldCheck size={14} />
                No stockout projected within the forecast horizon
              </div>
            )}
          </Card>
        </motion.div>

        {/* Explainability factors */}
        <motion.div variants={itemVariants} className="mt-2">
          <SectionLabel>Why this recommendation — contributing factors</SectionLabel>
          <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {rec.factors.map((f, i) => (
              <TiltCard key={i} className={`border-l-4 p-4 ${impactColor[f.impact]}`}>
                <div className="mb-1 flex items-center justify-between">
                  <p className="text-sm font-semibold text-ink-100">{f.label}</p>
                  <span className="font-mono text-xs text-ink-500">{f.value}</span>
                </div>
                <p className="text-xs leading-relaxed text-ink-500">{f.detail}</p>
              </TiltCard>
            ))}
          </div>
        </motion.div>

        {/* Trend / seasonality summary */}
        <motion.div variants={itemVariants} className="grid grid-cols-1 gap-4 md:grid-cols-3">
          <TiltCard className="p-5">
            <SectionLabel>Trend</SectionLabel>
            <div className="flex items-center gap-2">
              <TrendIcon size={18} className="text-signal-indigo" />
              <p className="font-display text-base font-semibold capitalize text-ink-100">
                {forecast.trend.direction}
              </p>
            </div>
            <p className="mt-1 text-xs text-ink-500">
              {forecast.trend.slope_per_period > 0 ? "+" : ""}
              {forecast.trend.slope_per_period.toFixed(1)} units/week · strength {forecast.trend.strength.toFixed(2)}
            </p>
          </TiltCard>
          <TiltCard className="p-5">
            <SectionLabel>Seasonality</SectionLabel>
            <p className="font-display text-base font-semibold text-ink-100">
              {forecast.seasonality.detected ? "Cyclical pattern" : "No pattern detected"}
            </p>
            <p className="mt-1 text-xs text-ink-500">
              {forecast.seasonality.detected
                ? `4-week cycle, strength ${forecast.seasonality.strength.toFixed(2)}`
                : "Demand does not show a repeating cycle"}
            </p>
          </TiltCard>
          <TiltCard className="p-5">
            <SectionLabel>Volatility</SectionLabel>
            <p className="font-display text-base font-semibold text-ink-100">
              {forecast.volatility_cv < 0.2 ? "Low" : forecast.volatility_cv < 0.45 ? "Moderate" : "High"}
            </p>
            <p className="mt-1 text-xs text-ink-500">Coefficient of variation: {forecast.volatility_cv.toFixed(2)}</p>
          </TiltCard>
        </motion.div>
      </motion.div>
    </Layout>
  );
}

function Metric({ label, value, highlight }: { label: string; value: string; highlight?: boolean }) {
  return (
    <div>
      <p className="text-[11px] uppercase tracking-wider text-ink-500">{label}</p>
      <p className={`font-mono text-lg tabular ${highlight ? "text-signal-indigo font-semibold" : "text-ink-100"}`}>
        {value}
      </p>
    </div>
  );
}
