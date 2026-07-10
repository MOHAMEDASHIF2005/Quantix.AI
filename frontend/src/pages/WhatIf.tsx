import { useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sparkles, Sliders, Play, TrendingUp, AlertTriangle, HelpCircle, RefreshCw } from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card, SectionLabel, Spinner, TiltCard } from "@/components/ui/Primitives";
import { api } from "@/api/client";
import type { SimulationResponse } from "@/types";
import { currency, percent } from "@/lib/format";
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from "recharts";

const SUGGESTIONS = [
  { text: "If Diwali sales increase by 50%", delta: 0.50, category: "All", event: "Diwali" },
  { text: "If logistics delays cut electronics demand by 20%", delta: -0.20, category: "Electronics", event: "Logistics delay" },
  { text: "If fitness trend spikes by 35% in summer", delta: 0.35, category: "Fitness", event: "Summer spike" },
];

const CATEGORIES = ["All", "Electronics", "Nutrition", "Fitness", "Home & Living", "Beauty"];

export default function WhatIf() {
  const [scenarioText, setScenarioText] = useState("If Diwali sales increase by 50%, what happens?");
  const [demandDelta, setDemandDelta] = useState(0.50);
  const [selectedCategory, setSelectedCategory] = useState("All");
  const [eventTag, setEventTag] = useState("Diwali");
  
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<SimulationResponse | null>(null);
  const [error, setError] = useState("");

  const handleRunSimulation = async () => {
    setLoading(true);
    setError("");
    try {
      const payload = {
        scenario: scenarioText,
        demand_delta: demandDelta,
        category: selectedCategory === "All" ? undefined : selectedCategory,
        event_tag: eventTag || undefined,
      };
      const res = await api.simulation.run(payload);
      setResult(res);
    } catch (err: any) {
      setError(err?.message || "Failed to execute simulation");
    } finally {
      setLoading(false);
    }
  };

  const handleSelectSuggestion = (s: typeof SUGGESTIONS[0]) => {
    setScenarioText(s.text);
    setDemandDelta(s.delta);
    setSelectedCategory(s.category);
    setEventTag(s.event);
  };

  // Format Recharts data
  const chartData = result
    ? result.sku_breakdown.map((item) => ({
        name: item.sku,
        Before: Math.round(item.before_revenue),
        After: Math.round(item.after_revenue),
        "Before demand": item.before_demand,
        "After demand": item.after_demand,
      })).slice(0, 8) // Limit to top 8 for clarity
    : [];

  return (
    <Layout
      title="AI What-If Simulator"
      subtitle="Simulate and stress-test demand spikes, logistics constraints, or promotional events"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* Controls Column */}
        <div className="lg:col-span-4 space-y-6">
          <Card className="p-6" hoverGlow>
            <div className="flex items-center gap-2 mb-4">
              <Sliders className="text-signal-indigo" size={18} />
              <SectionLabel>Simulation Inputs</SectionLabel>
            </div>

            <div className="space-y-4">
              {/* Text Scenario Input */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5">
                  Scenario description
                </label>
                <textarea
                  value={scenarioText}
                  onChange={(e) => setScenarioText(e.target.value)}
                  placeholder="Describe your scenario..."
                  rows={2}
                  className="w-full px-3 py-2 text-sm rounded-lg border border-base-600 bg-base-950/60 text-ink-100 placeholder:text-ink-700 outline-none focus:border-signal-indigo transition-colors resize-none"
                />
              </div>

              {/* Slider for Demand Delta */}
              <div>
                <div className="flex justify-between items-center mb-1.5">
                  <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500">
                    Demand Change (Delta)
                  </label>
                  <span className="font-mono text-xs font-bold text-signal-indigo">
                    {demandDelta >= 0 ? "+" : ""}{(demandDelta * 100).toFixed(0)}%
                  </span>
                </div>
                <input
                  type="range"
                  min="-1.0"
                  max="2.0"
                  step="0.05"
                  value={demandDelta}
                  onChange={(e) => setDemandDelta(parseFloat(e.target.value))}
                  className="w-full accent-signal-indigo bg-base-950/60 rounded-lg cursor-pointer h-2"
                />
                <div className="flex justify-between text-[10px] text-ink-700 font-mono mt-1">
                  <span>-100% (No Sales)</span>
                  <span>0%</span>
                  <span>+100%</span>
                  <span>+200%</span>
                </div>
              </div>

              {/* Category Dropdown */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5">
                  Affected Category
                </label>
                <select
                  value={selectedCategory}
                  onChange={(e) => setSelectedCategory(e.target.value)}
                  className="w-full px-3 py-2.5 rounded-lg border border-base-600 bg-base-950/60 text-sm text-ink-100 outline-none focus:border-signal-indigo transition-colors"
                >
                  {CATEGORIES.map((cat) => (
                    <option key={cat} value={cat}>
                      {cat === "All" ? "All Categories" : cat}
                    </option>
                  ))}
                </select>
              </div>

              {/* Event Tag */}
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5">
                  Event / Campaign Tag
                </label>
                <input
                  type="text"
                  value={eventTag}
                  onChange={(e) => setEventTag(e.target.value)}
                  placeholder="e.g. Diwali (Optional)"
                  className="w-full px-3 py-2 text-sm rounded-lg border border-base-600 bg-base-950/60 text-ink-100 placeholder:text-ink-700 outline-none focus:border-signal-indigo transition-colors"
                />
              </div>

              <motion.button
                onClick={handleRunSimulation}
                disabled={loading}
                whileHover={{ scale: 1.02, boxShadow: "0 0 20px 4px rgba(91,127,255,0.25)" }}
                whileTap={{ scale: 0.98 }}
                className="w-full flex items-center justify-center gap-2 rounded-lg bg-signal-indigo py-3 text-sm font-semibold text-white transition-all disabled:opacity-50 mt-2"
              >
                {loading ? (
                  <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                ) : (
                  <>
                    <Play size={15} /> Run Simulation
                  </>
                )}
              </motion.button>
            </div>
          </Card>

          {/* Preset Suggestions */}
          <div className="space-y-2">
            <SectionLabel>Quick Scenarios</SectionLabel>
            {SUGGESTIONS.map((s, idx) => (
              <button
                key={idx}
                onClick={() => handleSelectSuggestion(s)}
                className="w-full text-left p-3 rounded-xl border border-base-600 bg-base-800/40 hover:bg-base-700/30 transition-colors flex items-start gap-2.5"
              >
                <Sparkles size={14} className="text-signal-emerald shrink-0 mt-0.5" />
                <div>
                  <p className="text-xs font-medium text-ink-100">{s.text}</p>
                  <p className="text-[10px] text-ink-500 font-mono mt-0.5">
                    Category: {s.category} · Delta: {s.delta >= 0 ? "+" : ""}{s.delta * 100}%
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>

        {/* Results Column */}
        <div className="lg:col-span-8 space-y-6">
          <AnimatePresence mode="wait">
            {loading && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                className="flex items-center justify-center py-32"
              >
                <div className="flex flex-col items-center gap-3">
                  <div className="h-10 w-10 animate-spin rounded-full border-4 border-signal-indigo border-t-transparent" />
                  <span className="text-sm text-ink-300 font-medium">Re-computing exponential smoothing models...</span>
                </div>
              </motion.div>
            )}

            {!loading && !result && !error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex flex-col items-center justify-center py-28 text-center"
              >
                <div className="h-16 w-16 rounded-full bg-base-800 flex items-center justify-center text-ink-700 mb-4 border border-base-600">
                  <HelpCircle size={32} />
                </div>
                <h3 className="font-display text-lg font-semibold text-ink-100">No Simulation Executed</h3>
                <p className="max-w-md text-sm text-ink-500 mt-2">
                  Select a preset scenario or set your custom demand change parameters and click "Run Simulation" to model the impacts.
                </p>
              </motion.div>
            )}

            {!loading && error && (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex items-center gap-3 rounded-2xl bg-signal-redSoft border border-signal-red/20 p-5 text-sm text-signal-red"
              >
                <AlertTriangle size={18} />
                <span>{error}</span>
              </motion.div>
            )}

            {!loading && result && (
              <motion.div
                initial={{ opacity: 0, y: 15 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                className="space-y-6"
              >
                {/* AI Summary Banner */}
                <motion.div
                  initial={{ scale: 0.98, opacity: 0 }}
                  animate={{ scale: 1, opacity: 1 }}
                  className="rounded-2xl border border-signal-indigo/35 bg-gradient-to-br from-signal-indigo/15 to-signal-emerald/5 p-5 shadow-panel relative overflow-hidden"
                >
                  <div className="absolute top-0 right-0 p-3 text-signal-indigo/20 pointer-events-none">
                    <Sparkles size={120} />
                  </div>
                  <div className="flex items-center gap-2 mb-2">
                    <Sparkles className="text-signal-indigo animate-pulse" size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-signal-indigo">
                      AI Simulator Synthesis
                    </span>
                  </div>
                  <p className="font-display text-base font-medium leading-relaxed text-ink-100 relative z-10">
                    {result.summary_narrative}
                  </p>
                </motion.div>

                {/* Simulated Metrics Grid */}
                <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                  <ComparisonCard
                    label="Projected Revenue"
                    before={currency(result.before_total_revenue)}
                    after={currency(result.after_total_revenue)}
                    percentage={((result.after_total_revenue - result.before_total_revenue) / result.before_total_revenue) * 100}
                  />
                  <ComparisonCard
                    label="Projected Profit"
                    before={currency(result.before_total_profit)}
                    after={currency(result.after_total_profit)}
                    percentage={((result.after_total_profit - result.before_total_profit) / result.before_total_profit) * 100}
                  />
                  <ComparisonCard
                    label="Warehouse Util."
                    before={`${result.before_avg_utilization.toFixed(1)}%`}
                    after={`${result.after_avg_utilization.toFixed(1)}%`}
                    percentage={result.after_avg_utilization - result.before_avg_utilization}
                    suffix="pts"
                  />
                  <ComparisonCard
                    label="Stockout Risks"
                    before={String(result.sku_breakdown.filter((s) => s.before_stockout).length)}
                    after={String(result.sku_breakdown.filter((s) => s.after_stockout).length)}
                    difference={result.sku_breakdown.filter((s) => s.after_stockout).length - result.sku_breakdown.filter((s) => s.before_stockout).length}
                  />
                </div>

                {/* Charts Card */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <Card className="p-5" hoverGlow>
                    <SectionLabel>Revenue Comparison per SKU ($)</SectionLabel>
                    <div className="h-[260px] mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" stroke="#8B92A8" fontSize={10} tickLine={false} />
                          <YAxis stroke="#8B92A8" fontSize={10} tickLine={false} />
                          <Tooltip
                            contentStyle={{ background: "#12161F", borderColor: "#232838", borderRadius: "8px" }}
                            labelStyle={{ color: "#E8EAF0", fontWeight: "bold" }}
                          />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="Before" fill="rgba(139, 146, 168, 0.4)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="After" fill="#5B7FFF" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>

                  <Card className="p-5" hoverGlow>
                    <SectionLabel>Weekly Demand Comparison per SKU (Units)</SectionLabel>
                    <div className="h-[260px] mt-4">
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
                          <XAxis dataKey="name" stroke="#8B92A8" fontSize={10} tickLine={false} />
                          <YAxis stroke="#8B92A8" fontSize={10} tickLine={false} />
                          <Tooltip
                            contentStyle={{ background: "#12161F", borderColor: "#232838", borderRadius: "8px" }}
                            labelStyle={{ color: "#E8EAF0", fontWeight: "bold" }}
                          />
                          <Legend wrapperStyle={{ fontSize: 10 }} />
                          <Bar dataKey="Before demand" fill="rgba(139, 146, 168, 0.4)" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="After demand" fill="#34D399" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </Card>
                </div>

                {/* SKU Breakdown Table */}
                <Card className="p-6 overflow-hidden" hoverGlow>
                  <SectionLabel>Simulated SKU Breakdown</SectionLabel>
                  <div className="overflow-x-auto mt-3">
                    <table className="w-full text-left text-xs border-collapse">
                      <thead>
                        <tr className="border-b border-base-600 text-ink-500 pb-3">
                          <th className="py-2.5 font-semibold">SKU / Name</th>
                          <th className="py-2.5 font-semibold">Category</th>
                          <th className="py-2.5 font-semibold">Current Stock</th>
                          <th className="py-2.5 font-semibold">Before Demand</th>
                          <th className="py-2.5 font-semibold">After Demand</th>
                          <th className="py-2.5 font-semibold">Stockout Risk Status</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-base-600/50">
                        {result.sku_breakdown.map((sku) => {
                          const statusChanged = sku.after_stockout && !sku.before_stockout;
                          return (
                            <tr
                              key={sku.sku}
                              className={`hover:bg-base-700/20 transition-colors ${
                                statusChanged ? "bg-signal-redSoft/10 border-l-2 border-l-signal-red" : ""
                              }`}
                            >
                              <td className="py-3">
                                <p className="font-semibold text-ink-100">{sku.sku}</p>
                                <p className="text-[11px] text-ink-500">{sku.name}</p>
                              </td>
                              <td className="py-3 text-ink-300">{sku.category}</td>
                              <td className="py-3 font-mono text-ink-300">{sku.current_stock}</td>
                              <td className="py-3 font-mono text-ink-500">{sku.before_demand}</td>
                              <td className="py-3 font-mono text-signal-indigo font-semibold">{sku.after_demand}</td>
                              <td className="py-3">
                                {sku.after_stockout ? (
                                  <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium ${
                                    statusChanged ? "bg-signal-red text-white animate-pulse" : "bg-signal-redSoft text-signal-red"
                                  }`}>
                                    <AlertTriangle size={10} /> Stockout Risk
                                  </span>
                                ) : (
                                  <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-[10px] font-medium bg-signal-emeraldSoft text-signal-emerald">
                                    Healthy
                                  </span>
                                )}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </Layout>
  );
}

interface ComparisonCardProps {
  label: string;
  before: string;
  after: string;
  percentage?: number;
  difference?: number;
  suffix?: string;
}

function ComparisonCard({ label, before, after, percentage, difference, suffix = "%" }: ComparisonCardProps) {
  let badgeText = "";
  let badgeColor = "text-ink-500 bg-base-700";
  
  if (percentage !== undefined && percentage !== 0) {
    const sign = percentage > 0 ? "+" : "";
    badgeText = `${sign}${percentage.toFixed(0)}${suffix}`;
    badgeColor = percentage > 0 ? "text-signal-emerald bg-signal-emeraldSoft" : "text-signal-red bg-signal-redSoft";
  } else if (difference !== undefined && difference !== 0) {
    const sign = difference > 0 ? "+" : "";
    badgeText = `${sign}${difference}`;
    badgeColor = difference > 0 ? "text-signal-red bg-signal-redSoft" : "text-signal-emerald bg-signal-emeraldSoft";
  }

  return (
    <TiltCard className="p-4 flex flex-col justify-between h-[120px]">
      <p className="text-[10px] uppercase tracking-wider text-ink-500 font-semibold">{label}</p>
      
      <div className="flex items-baseline gap-2 mt-2">
        <span className="font-mono text-[11px] text-ink-700 line-through">{before}</span>
        <span className="font-mono text-lg font-bold text-ink-100">{after}</span>
      </div>

      {badgeText && (
        <span className={`inline-block w-fit mt-1 text-[10px] font-mono px-1.5 py-0.5 rounded font-bold ${badgeColor}`}>
          {badgeText}
        </span>
      )}
    </TiltCard>
  );
}
