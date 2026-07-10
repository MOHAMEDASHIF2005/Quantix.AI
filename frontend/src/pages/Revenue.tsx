import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { Card, SectionLabel, Spinner, TiltCard } from "@/components/ui/Primitives";
import { api } from "@/api/client";
import type { RevenuePredictionResponse } from "@/types";
import { RefreshCw, DollarSign, TrendingUp, Percent, Award, ArrowUpRight } from "lucide-react";
import { currency } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: { staggerChildren: 0.08 },
  },
};

const itemVariants = {
  hidden: { opacity: 0, y: 15 },
  show: {
    opacity: 1,
    y: 0,
    transition: { type: "spring", stiffness: 180, damping: 18 },
  },
};

// CountUp Component for premium visual metric loading
function CountUp({
  value,
  duration = 800,
  formatter,
}: {
  value: number;
  duration?: number;
  formatter: (v: number) => string;
}) {
  const [count, setCount] = useState(0);

  useEffect(() => {
    let startTime: number | null = null;

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp;
      const progress = timestamp - startTime;
      const progressPct = Math.min(progress / duration, 1);
      
      // easeOutQuad curve
      const ease = progressPct * (2 - progressPct);
      setCount(value * ease);

      if (progressPct < 1) {
        requestAnimationFrame(animate);
      } else {
        setCount(value);
      }
    };

    requestAnimationFrame(animate);
  }, [value, duration]);

  return <span className="tabular">{formatter(count)}</span>;
}

export default function Revenue() {
  const [data, setData] = useState<RevenuePredictionResponse | null>(null);
  const [loading, setLoading] = useState(true);

  const fetchPredictions = () => {
    setLoading(true);
    api.revenue.predict()
      .then((res) => setData(res))
      .catch((err) => console.error("Error loading revenue predictions:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchPredictions();
  }, []);

  // Format Recharts data
  const chartData = data
    ? data.category_predictions.map((c) => ({
        name: c.category,
        Revenue: Math.round(c.predicted_revenue),
        Profit: Math.round(c.predicted_profit),
      }))
    : [];

  return (
    <Layout
      title="Financial Analytics & Revenue Predictor"
      subtitle="Examine projected cash flows, margins, and yield optimizations per SKU and category"
    >
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <SectionLabel>8-Week Financial Projections</SectionLabel>
          <motion.button
            onClick={fetchPredictions}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 rounded-lg border border-base-600 bg-base-800 px-3 py-1.5 text-xs text-ink-500 hover:text-ink-100 transition-colors"
          >
            <RefreshCw size={13} /> Refresh Forecasts
          </motion.button>
        </div>

        {loading && <Spinner />}

        {!loading && data && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="space-y-6"
          >
            {/* KPI Stat Cards */}
            <motion.div variants={itemVariants} className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <TiltCard className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-signal-indigo/15 text-signal-indigo flex items-center justify-center shrink-0">
                  <DollarSign size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Predicted Revenue</p>
                  <p className="font-display text-2xl font-bold text-ink-100 mt-1">
                    <CountUp value={data.total_revenue} formatter={(v) => currency(v)} />
                  </p>
                </div>
              </TiltCard>

              <TiltCard className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-signal-emerald/15 text-signal-emerald flex items-center justify-center shrink-0">
                  <TrendingUp size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Predicted Net Profit</p>
                  <p className="font-display text-2xl font-bold text-ink-100 mt-1">
                    <CountUp value={data.total_profit} formatter={(v) => currency(v)} />
                  </p>
                </div>
              </TiltCard>

              <TiltCard className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-signal-amber/15 text-signal-amber flex items-center justify-center shrink-0">
                  <Percent size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Avg. Gross Margin</p>
                  <p className="font-display text-2xl font-bold text-ink-100 mt-1">
                    <CountUp value={data.avg_margin} formatter={(v) => `${v.toFixed(1)}%`} />
                  </p>
                </div>
              </TiltCard>

              <TiltCard className="p-5 flex items-center gap-4">
                <div className="h-12 w-12 rounded-xl bg-signal-indigo/15 text-signal-indigo flex items-center justify-center shrink-0">
                  <Award size={20} />
                </div>
                <div>
                  <p className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">Projected ROI</p>
                  <p className="font-display text-2xl font-bold text-ink-100 mt-1">
                    <CountUp value={data.avg_roi} formatter={(v) => `${v.toFixed(1)}%`} />
                  </p>
                </div>
              </TiltCard>
            </motion.div>

            {/* Category Chart & Aggregates */}
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
              <motion.div variants={itemVariants} className="lg:col-span-8 flex flex-col">
                <Card className="p-5 flex-1" hoverGlow>
                  <SectionLabel>Predicted Revenue & Profit by Category ($)</SectionLabel>
                  <div className="h-[280px] mt-4">
                    <ResponsiveContainer width="100%" height="100%">
                      <BarChart data={chartData} margin={{ top: 10, right: 10, left: -10, bottom: 0 }}>
                        <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                        <XAxis dataKey="name" stroke="#8B92A8" fontSize={11} tickLine={false} />
                        <YAxis stroke="#8B92A8" fontSize={11} tickLine={false} />
                        <Tooltip
                          contentStyle={{ background: "#12161F", borderColor: "#232838", borderRadius: "8px" }}
                          labelStyle={{ color: "#E8EAF0", fontWeight: "bold" }}
                        />
                        <Legend wrapperStyle={{ fontSize: 11 }} />
                        <Bar dataKey="Revenue" fill="#5B7FFF" radius={[4, 4, 0, 0]} />
                        <Bar dataKey="Profit" fill="#34D399" radius={[4, 4, 0, 0]} />
                      </BarChart>
                    </ResponsiveContainer>
                  </div>
                </Card>
              </motion.div>

              <motion.div variants={itemVariants} className="lg:col-span-4 flex flex-col">
                <Card className="p-5 flex-1 flex flex-col justify-between" hoverGlow>
                  <div>
                    <SectionLabel>Category Summary</SectionLabel>
                    <div className="space-y-3 mt-3">
                      {data.category_predictions.map((c) => (
                        <div key={c.category} className="flex justify-between items-center p-2.5 rounded-lg border border-base-600 bg-base-950/20 text-xs">
                          <div>
                            <p className="font-semibold text-ink-100">{c.category}</p>
                            <p className="text-[10px] text-ink-500 mt-0.5">{c.sku_count} SKUs active</p>
                          </div>
                          <div className="text-right">
                            <p className="font-mono font-bold text-ink-100">{currency(c.predicted_revenue)}</p>
                            <p className="text-[10px] text-signal-emerald font-semibold mt-0.5">ROI: {c.avg_roi.toFixed(0)}%</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </Card>
              </motion.div>
            </div>

            {/* SKU Projection Table */}
            <motion.div variants={itemVariants}>
              <Card className="p-6 overflow-hidden" hoverGlow>
                <SectionLabel>Granular Projections per SKU</SectionLabel>
                <div className="overflow-x-auto mt-4">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-base-600 text-ink-500 pb-3">
                        <th className="py-2.5 font-semibold">SKU / Product</th>
                        <th className="py-2.5 font-semibold">Category</th>
                        <th className="py-2.5 font-semibold text-right">Projected Demand</th>
                        <th className="py-2.5 font-semibold text-right">Projected Revenue</th>
                        <th className="py-2.5 font-semibold text-right">Projected Profit</th>
                        <th className="py-2.5 font-semibold text-right">Margin</th>
                        <th className="py-2.5 font-semibold text-right">ROI</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-base-600/50">
                      {data.sku_predictions.map((sku) => (
                        <tr key={sku.sku} className="hover:bg-base-700/25 transition-colors">
                          <td className="py-3">
                            <p className="font-semibold text-ink-100">{sku.sku}</p>
                            <p className="text-[11px] text-ink-500">{sku.name}</p>
                          </td>
                          <td className="py-3 text-ink-300">{sku.category}</td>
                          <td className="py-3 font-mono text-right text-ink-300">{sku.predicted_demand.toFixed(0)}u</td>
                          <td className="py-3 font-mono text-right text-ink-100">{currency(sku.predicted_revenue)}</td>
                          <td className="py-3 font-mono text-right text-signal-emerald font-semibold">{currency(sku.predicted_profit)}</td>
                          <td className="py-3 font-mono text-right text-signal-amber">{sku.margin.toFixed(1)}%</td>
                          <td className="py-3 font-mono text-right text-signal-indigo">
                            <span className="inline-flex items-center gap-0.5 text-signal-indigo font-bold">
                              {sku.roi.toFixed(0)}% <ArrowUpRight size={10} />
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </Card>
            </motion.div>
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
