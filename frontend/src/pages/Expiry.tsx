import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Layout } from "@/components/layout/Layout";
import { Card, SectionLabel, Spinner, TiltCard } from "@/components/ui/Primitives";
import { api } from "@/api/client";
import type { ExpiryItem } from "@/types";
import { AlertCircle, ArrowRight, Check, Percent, RefreshCw, Send, Sparkles } from "lucide-react";
import { currency } from "@/lib/format";

const containerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.08,
    },
  },
};

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
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

export default function Expiry() {
  const [items, setItems] = useState<ExpiryItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [actioningId, setActioningId] = useState<number | null>(null);
  const [actionStatuses, setActionStatuses] = useState<Record<number, { type: string; msg: string }>>({});

  const fetchExpiryItems = () => {
    setLoading(true);
    api.expiry.list(90) // Fetch items expiring within 90 days to show realistic calendar
      .then((res) => setItems(res))
      .catch((err) => console.error("Error loading expiring products:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchExpiryItems();
  }, []);

  const handleAction = async (productId: number, action: "discount" | "transfer") => {
    setActioningId(productId);
    try {
      const res = await api.expiry.action(productId, action);
      setActionStatuses((prev) => ({
        ...prev,
        [productId]: { type: action, msg: res.message },
      }));
      // Re-fetch data after short delay so we capture updated stock/price from backend
      setTimeout(() => {
        api.expiry.list(90).then((res) => setItems(res));
      }, 800);
    } catch (err: any) {
      alert(err?.message || "Failed to process expiry action");
    } finally {
      setActioningId(null);
    }
  };

  return (
    <Layout
      title="Expiry Alert Center"
      subtitle="Proactively manage perishable products before they spoil or lose valuation"
    >
      <div className="flex flex-col gap-6">
        <div className="flex justify-between items-center">
          <SectionLabel>Perishable Inventory Risk Board</SectionLabel>
          <motion.button
            onClick={fetchExpiryItems}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center gap-1.5 rounded-lg border border-base-600 bg-base-800 px-3 py-1.5 text-xs text-ink-500 hover:text-ink-100 transition-colors"
          >
            <RefreshCw size={13} /> Refresh Risks
          </motion.button>
        </div>

        {loading && <Spinner />}

        {!loading && items.length === 0 && (
          <div className="text-center py-20 border border-dashed border-base-600 rounded-2xl bg-base-800/30">
            <AlertCircle size={28} className="text-ink-700 mx-auto mb-2" />
            <h3 className="font-display text-base font-semibold text-ink-100">All Clear</h3>
            <p className="text-sm text-ink-500 mt-1 max-w-sm mx-auto">
              No products are expiring within the next 90 days. Perishable stock levels are healthy.
            </p>
          </div>
        )}

        {!loading && items.length > 0 && (
          <motion.div
            variants={containerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6"
          >
            {items.map((item) => {
              const isUrgent = item.days_until_expiry <= 10;
              const actionTaken = actionStatuses[item.id];
              const isActioning = actioningId === item.id;

              return (
                <motion.div
                  key={item.id}
                  variants={cardVariants}
                  className="relative h-full"
                >
                  <Card
                    className={`p-5 h-full flex flex-col justify-between transition-all duration-300 relative ${
                      isUrgent
                        ? "border-signal-red/30 shadow-[0_0_15px_rgba(255,93,93,0.08)] bg-signal-redSoft/3"
                        : "border-base-600 hover:border-base-500"
                    }`}
                  >
                    {/* Pulsing Red Ring for Urgent Items */}
                    {isUrgent && !actionTaken && (
                      <span className="absolute inset-0 rounded-2xl border border-signal-red/20 pointer-events-none animate-pulse" />
                    )}

                    <div>
                      {/* Top Header */}
                      <div className="flex justify-between items-start gap-2">
                        <div>
                          <p className="text-[10px] font-mono text-ink-500">{item.sku} · {item.category}</p>
                          <h4 className="font-display text-base font-bold text-ink-100 mt-0.5 line-clamp-1">
                            {item.name}
                          </h4>
                        </div>
                        {isUrgent ? (
                          <span className="inline-flex items-center gap-1 rounded bg-signal-redSoft px-1.5 py-0.5 text-[9px] font-bold text-signal-red uppercase tracking-wider animate-pulse">
                            Expiring Soon
                          </span>
                        ) : (
                          <span className="inline-flex items-center rounded bg-base-700 px-1.5 py-0.5 text-[9px] font-bold text-ink-500 uppercase tracking-wider">
                            Monitor
                          </span>
                        )}
                      </div>

                      {/* Expiry Clock */}
                      <div className="my-5 p-3 rounded-xl bg-base-950/40 border border-base-600 flex justify-between items-center">
                        <div>
                          <p className="text-[10px] text-ink-500 uppercase tracking-wider">Time Remaining</p>
                          <p className={`font-display text-lg font-bold mt-0.5 ${isUrgent ? "text-signal-red font-extrabold" : "text-ink-100"}`}>
                            {item.days_until_expiry === 0
                              ? "Expires Today!"
                              : `${item.days_until_expiry} ${item.days_until_expiry === 1 ? "day" : "days"}`}
                          </p>
                        </div>
                        <div className="text-right">
                          <p className="text-[10px] text-ink-500 uppercase tracking-wider">Expiry Date</p>
                          <p className="font-mono text-xs text-ink-300 mt-1">
                            {new Date(item.expiry_date).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}
                          </p>
                        </div>
                      </div>

                      {/* Info Metrics */}
                      <div className="grid grid-cols-2 gap-4 text-xs font-mono mb-4 text-ink-500">
                        <div>
                          <span>Current Stock:</span>{" "}
                          <strong className="text-ink-100 font-medium">{item.current_stock} units</strong>
                        </div>
                        <div>
                          <span>Unit Price:</span>{" "}
                          <strong className="text-ink-100 font-medium">{currency(item.unit_price)}</strong>
                        </div>
                      </div>
                    </div>

                    {/* Action Panel */}
                    <div className="mt-4 pt-4 border-t border-base-600/50 flex flex-col gap-2">
                      <AnimatePresence mode="wait">
                        {actionTaken ? (
                          <motion.div
                            initial={{ opacity: 0, scale: 0.95 }}
                            animate={{ opacity: 1, scale: 1 }}
                            className={`flex items-start gap-2 p-2.5 rounded-lg text-xs leading-tight ${
                              actionTaken.type === "discount"
                                ? "bg-signal-emeraldSoft text-signal-emerald border border-signal-emerald/20"
                                : "bg-signal-indigoSoft text-signal-indigo border border-signal-indigo/20"
                            }`}
                          >
                            <Check size={14} className="shrink-0 mt-0.5" />
                            <span>{actionTaken.type === "discount" ? "Discount applied successfully! " : "Transfer processing! "}{actionTaken.msg}</span>
                          </motion.div>
                        ) : (
                          <div className="grid grid-cols-2 gap-2">
                            <motion.button
                              onClick={() => handleAction(item.id, "discount")}
                              disabled={isActioning}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex items-center justify-center gap-1.5 rounded-lg border border-signal-emerald/30 bg-signal-emeraldSoft/5 px-2 py-2 text-xs font-semibold text-signal-emerald hover:bg-signal-emerald hover:text-white transition-all disabled:opacity-50"
                            >
                              <Percent size={13} /> Apply 20% Off
                            </motion.button>
                            <motion.button
                              onClick={() => handleAction(item.id, "transfer")}
                              disabled={isActioning}
                              whileHover={{ scale: 1.02 }}
                              whileTap={{ scale: 0.98 }}
                              className="flex items-center justify-center gap-1.5 rounded-lg border border-signal-indigo/30 bg-signal-indigoSoft/5 px-2 py-2 text-xs font-semibold text-signal-indigo hover:bg-signal-indigo hover:text-white transition-all disabled:opacity-50"
                            >
                              <Send size={13} /> Relocate Stock
                            </motion.button>
                          </div>
                        )}
                      </AnimatePresence>
                    </div>
                  </Card>
                </motion.div>
              );
            })}
          </motion.div>
        )}
      </div>
    </Layout>
  );
}
