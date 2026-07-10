import { useCallback, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertTriangle,
  Loader2,
  PackageCheck,
} from "lucide-react";
import { Layout } from "@/components/layout/Layout";
import { Card, SectionLabel } from "@/components/ui/Primitives";
import { StatCard } from "@/components/ui/StatCard";
import { api, ApiError } from "@/api/client";
import type { DatasetSummary } from "@/types";

type Status = "idle" | "uploading" | "validated" | "committing" | "committed" | "error";

const uploadContainerVariants = {
  hidden: { opacity: 0 },
  show: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
    },
  },
};

const uploadItemVariants = {
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

export default function DatasetUpload() {
  const [status, setStatus] = useState<Status>("idle");
  const [dataset, setDataset] = useState<DatasetSummary | null>(null);
  const [error, setError] = useState<string>("");
  const [dragActive, setDragActive] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const handleFile = useCallback(async (file: File) => {
    setStatus("uploading");
    setError("");
    try {
      const result = await api.datasets.upload(file);
      setDataset(result);
      setStatus("validated");
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Upload failed — is the backend running?";
      setError(message);
      setStatus("error");
    }
  }, []);

  const handleCommit = useCallback(async () => {
    if (!dataset) return;
    setStatus("committing");
    try {
      const result = await api.datasets.commit(dataset.id);
      setDataset({ ...dataset, status: "committed", products_created: result.products_created });
      setStatus("committed");
    } catch (e) {
      const message = e instanceof ApiError ? e.message : "Commit failed";
      setError(message);
      setStatus("validated");
    }
  }, [dataset]);

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragActive(false);
    const file = e.dataTransfer.files?.[0];
    if (file) handleFile(file);
  };

  return (
    <Layout
      title="Upload dataset"
      subtitle="Bring your own inventory or sales export — CSV or Excel"
    >
      <div className="mx-auto max-w-4xl space-y-6">
        {status === "idle" || status === "uploading" || status === "error" ? (
          <motion.div
            onDragOver={(e) => {
              e.preventDefault();
              setDragActive(true);
            }}
            onDragLeave={() => setDragActive(false)}
            onDrop={onDrop}
            onClick={() => inputRef.current?.click()}
            animate={
              dragActive
                ? {
                    scale: 1.01,
                    borderColor: "rgba(91,127,255,1)",
                    backgroundColor: "rgba(91,127,255,0.06)",
                    boxShadow: "0 0 24px 2px rgba(91,127,255,0.25)",
                  }
                : {
                    scale: 1,
                    borderColor: "rgba(35,40,56,1)",
                    backgroundColor: "rgba(18,22,31,0.5)",
                    boxShadow: "0 0 0px 0px rgba(0,0,0,0)",
                  }
            }
            whileHover={!dragActive ? { scale: 1.005, borderColor: "rgba(91,127,255,0.4)" } : undefined}
            className="flex cursor-pointer flex-col items-center justify-center gap-3 rounded-2xl border-2 border-dashed py-20 text-center transition-colors overflow-hidden"
          >
            <input
              ref={inputRef}
              type="file"
              accept=".csv,.xlsx,.xls"
              className="hidden"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) handleFile(file);
              }}
            />
            <div className="flex h-14 w-14 items-center justify-center rounded-2xl bg-signal-indigo/12 text-signal-indigo">
              {status === "uploading" ? <Loader2 size={24} className="animate-spin" /> : <UploadCloud size={24} />}
            </div>
            <p className="font-display text-lg font-semibold text-ink-100">
              {status === "uploading" ? "Validating & cleaning…" : "Drop your file here, or click to browse"}
            </p>
            <p className="max-w-sm text-sm text-ink-500">
              Supports .csv, .xlsx, .xls — Quantix will detect missing values and duplicate rows
              automatically before anything touches your live inventory.
            </p>
            {status === "error" && (
              <p className="mt-2 flex items-center gap-1.5 text-sm text-signal-red">
                <AlertTriangle size={14} /> {error}
              </p>
            )}
          </motion.div>
        ) : null}

        <AnimatePresence>
          {dataset && (
            <motion.div
              variants={uploadContainerVariants}
              initial="hidden"
              animate="show"
              className="space-y-6"
            >
              <motion.div variants={uploadItemVariants} className="grid grid-cols-2 gap-4 sm:grid-cols-4">
                <StatCard label="Rows" value={String(dataset.row_count)} numericValue={dataset.row_count} icon={<FileSpreadsheet size={16} />} />
                <StatCard label="Columns" value={String(dataset.column_count)} numericValue={dataset.column_count} />
                <StatCard
                  label="Duplicates removed"
                  value={String(dataset.duplicate_rows_removed)}
                  numericValue={dataset.duplicate_rows_removed}
                  tone={dataset.duplicate_rows_removed > 0 ? "warning" : "default"}
                />
                <StatCard
                  label="Cells auto-filled"
                  value={String(dataset.missing_cells_filled)}
                  numericValue={dataset.missing_cells_filled}
                  tone={dataset.missing_cells_filled > 0 ? "warning" : "positive"}
                />
              </motion.div>

              {dataset.warnings.length > 0 && (
                <motion.div variants={uploadItemVariants}>
                  <Card className="p-5" hoverGlow>
                    <SectionLabel>Validation notes</SectionLabel>
                    <ul className="space-y-1.5">
                      {dataset.warnings.map((w, i) => (
                        <li key={i} className="flex items-center gap-2 text-sm text-ink-300">
                          <AlertTriangle size={13} className="text-signal-amber shrink-0 animate-bounce" />
                          Column <span className="font-mono text-ink-100">{w.column}</span> had{" "}
                          {w.count} missing value(s) — filled automatically.
                        </li>
                      ))}
                    </ul>
                  </Card>
                </motion.div>
              )}

              <motion.div variants={uploadItemVariants}>
                <Card className="overflow-x-auto p-5" hoverGlow>
                  <SectionLabel>Preview (first {dataset.preview.length} rows)</SectionLabel>
                  <table className="w-full text-left text-sm">
                    <thead>
                      <tr className="border-b border-base-600 text-xs uppercase tracking-wide text-ink-500">
                        {dataset.columns.map((col) => (
                          <th key={col} className="whitespace-nowrap px-3 py-2 font-medium">
                            {col}
                          </th>
                        ))}
                      </tr>
                    </thead>
                    <tbody>
                      {dataset.preview.map((row, i) => (
                        <motion.tr
                          key={i}
                          initial={{ opacity: 0, x: -5 }}
                          animate={{ opacity: 1, x: 0 }}
                          transition={{ delay: i * 0.02 + 0.15 }}
                          className="border-b border-base-700/60 last:border-0"
                        >
                          {dataset.columns.map((col) => (
                            <td key={col} className="whitespace-nowrap px-3 py-2 text-ink-300">
                              {String(row[col] ?? "—")}
                            </td>
                          ))}
                        </motion.tr>
                      ))}
                    </tbody>
                  </table>
                </Card>
              </motion.div>

              <motion.div
                variants={uploadItemVariants}
                className="flex items-center justify-between rounded-2xl border border-base-600 bg-base-800/70 p-5"
              >
                {dataset.status === "committed" ? (
                  <div className="flex items-center gap-2 text-signal-emerald">
                    <PackageCheck size={18} />
                    <p className="text-sm font-medium">
                      Committed — {dataset.products_created} new product(s) added to inventory.
                    </p>
                  </div>
                ) : (
                  <>
                    <p className="text-sm text-ink-500">
                      Looks good? Commit to map these rows into your live inventory.
                    </p>
                    <motion.button
                      onClick={handleCommit}
                      disabled={status === "committing"}
                      whileHover={{ scale: 1.04, boxShadow: "0 0 15px 3px rgba(52,211,153,0.3)" }}
                      whileTap={{ scale: 0.97 }}
                      className="flex items-center gap-2 rounded-lg bg-signal-emerald px-4 py-2.5 text-sm font-medium text-base-900 disabled:opacity-60"
                    >
                      {status === "committing" ? (
                        <Loader2 size={15} className="animate-spin" />
                      ) : (
                        <CheckCircle2 size={15} />
                      )}
                      Commit to inventory
                    </motion.button>
                  </>
                )}
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </Layout>
  );
}
