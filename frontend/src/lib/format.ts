import type { RecAction, Urgency } from "@/types";

export function currency(value: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(value);
}

export function number(value: number, decimals = 0): string {
  return new Intl.NumberFormat("en-US", {
    maximumFractionDigits: decimals,
    minimumFractionDigits: decimals,
  }).format(value);
}

export function percent(value: number): string {
  return `${Math.round(value * 100)}%`;
}

export const urgencyColor: Record<Urgency, { text: string; bg: string; dot: string }> = {
  critical: { text: "text-signal-red", bg: "bg-signal-redSoft", dot: "bg-signal-red" },
  high: { text: "text-signal-amber", bg: "bg-signal-amberSoft", dot: "bg-signal-amber" },
  medium: { text: "text-signal-indigo", bg: "bg-signal-indigoSoft", dot: "bg-signal-indigo" },
  low: { text: "text-signal-emerald", bg: "bg-signal-emeraldSoft", dot: "bg-signal-emerald" },
};

export const actionLabel: Record<RecAction, string> = {
  REORDER_NOW: "Reorder now",
  MONITOR: "Monitor",
  REDUCE_STOCK: "Reduce stock",
  HEALTHY: "Healthy",
};

export function relativeDate(iso: string): string {
  const d = new Date(iso);
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
}
