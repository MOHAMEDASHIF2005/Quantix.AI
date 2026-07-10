import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { Search } from "lucide-react";
import { motion } from "framer-motion";
import { api } from "@/api/client";
import type { Product } from "@/types";
import { Layout } from "@/components/layout/Layout";
import { Card, Spinner } from "@/components/ui/Primitives";
import { currency } from "@/lib/format";

export default function Products() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [category, setCategory] = useState<string>("all");

  useEffect(() => {
    api.products.list().then((data) => {
      setProducts(data);
      setLoading(false);
    });
  }, []);

  const categories = useMemo(
    () => ["all", ...Array.from(new Set(products.map((p) => p.category)))],
    [products]
  );

  const filtered = products.filter((p) => {
    const matchesCategory = category === "all" || p.category === category;
    const matchesQuery =
      !query ||
      p.name.toLowerCase().includes(query.toLowerCase()) ||
      p.sku.toLowerCase().includes(query.toLowerCase());
    return matchesCategory && matchesQuery;
  });

  return (
    <Layout title="Inventory" subtitle={`${products.length} SKUs across your catalog`}>
      <div className="mb-5 flex flex-wrap items-center gap-3">
        <motion.div
          whileHover={{ scale: 1.01 }}
          className="relative w-full max-w-sm"
        >
          <Search size={15} className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-ink-700" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by name or SKU..."
            className="w-full rounded-lg border border-base-600 bg-base-800 py-2 pl-9 pr-3 text-sm text-ink-100 placeholder:text-ink-700 focus:border-signal-indigo outline-none transition-all focus:ring-1 focus:ring-signal-indigo"
          />
        </motion.div>
        <div className="flex flex-wrap gap-2 relative">
          {categories.map((c) => {
            const isActive = category === c;
            return (
              <button
                key={c}
                onClick={() => setCategory(c)}
                className={`rounded-full px-3.5 py-1.5 text-xs font-medium capitalize transition-colors relative ${
                  isActive
                    ? "text-signal-indigo"
                    : "text-ink-500 hover:text-ink-100"
                }`}
              >
                <span className="relative z-10">{c}</span>
                {isActive && (
                  <motion.div
                    layoutId="active-category-bg"
                    className="absolute inset-0 rounded-full bg-signal-indigo/15 z-0"
                    transition={{ type: "spring", stiffness: 350, damping: 28 }}
                  />
                )}
              </button>
            );
          })}
        </div>
      </div>

      {loading ? (
        <Spinner />
      ) : (
        <Card className="overflow-hidden" hoverGlow>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-base-600 text-left text-xs uppercase tracking-wider text-ink-500">
                <th className="px-5 py-3 font-medium">Product</th>
                <th className="px-5 py-3 font-medium">Category</th>
                <th className="px-5 py-3 font-medium text-right">Stock</th>
                <th className="px-5 py-3 font-medium text-right">Unit cost</th>
                <th className="px-5 py-3 font-medium text-right">Inventory value</th>
                <th className="px-5 py-3 font-medium">Supplier</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((p, i) => (
                <motion.tr
                  key={p.id}
                  initial={{ opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: Math.min(i * 0.02, 0.4), duration: 0.2 }}
                  className="cursor-pointer border-b border-base-600/60 transition-colors last:border-0 hover:bg-base-700/40"
                >
                  <td className="px-5 py-3.5">
                    <Link to={`/products/${p.id}`} className="block">
                      <p className="font-medium text-ink-100">{p.name}</p>
                      <p className="font-mono text-[11px] text-ink-500">{p.sku}</p>
                    </Link>
                  </td>
                  <td className="px-5 py-3.5 text-ink-500">{p.category}</td>
                  <td className="px-5 py-3.5 text-right font-mono tabular text-ink-100">{p.current_stock}</td>
                  <td className="px-5 py-3.5 text-right font-mono tabular text-ink-500">{currency(p.unit_cost)}</td>
                  <td className="px-5 py-3.5 text-right font-mono tabular text-ink-100">
                    {currency(p.current_stock * p.unit_cost)}
                  </td>
                  <td className="px-5 py-3.5 text-ink-500">{p.supplier?.name ?? "—"}</td>
                </motion.tr>
              ))}
            </tbody>
          </table>
        </Card>
      )}
    </Layout>
  );
}
