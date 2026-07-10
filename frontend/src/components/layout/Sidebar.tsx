import { NavLink, useLocation } from "react-router-dom";
import clsx from "clsx";
import { motion } from "framer-motion";
import {
  LayoutDashboard,
  Package,
  Sparkles,
  TrendingUp,
  Activity,
  UploadCloud,
  Home,
  LogOut,
  Zap,
  Server,
  AlertTriangle,
  DollarSign,
  Globe,
} from "lucide-react";
import { useAuth } from "@/lib/AuthContext";

const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, end: true },
  { to: "/products", label: "Inventory", icon: Package },
  { to: "/recommendations", label: "Recommendations", icon: Sparkles },
  { to: "/upload", label: "Upload Dataset", icon: UploadCloud },
  { to: "/what-if", label: "What-If Simulator", icon: Zap },
  { to: "/warehouse", label: "Warehouse Heatmap", icon: Server },
  { to: "/expiry", label: "Expiry Alerts", icon: AlertTriangle },
  { to: "/revenue", label: "Revenue Predictor", icon: DollarSign },
  { to: "/demand-map", label: "Demand Map", icon: Globe },
];

export function Sidebar() {
  const location = useLocation();
  const { logout } = useAuth();

  return (
    <aside className="fixed inset-y-0 left-0 z-20 flex w-64 flex-col border-r border-base-600 bg-base-900/95 px-4 py-6">
      <div className="mb-8 flex items-center gap-2 px-2">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-signal-indigo/15 text-signal-indigo">
          <TrendingUp size={18} strokeWidth={2.5} />
        </div>
        <div>
          <p className="font-display text-[15px] font-semibold leading-tight text-ink-100">Quantix AI</p>
          <p className="text-[11px] leading-tight text-ink-500">Inventory Intelligence</p>
        </div>
      </div>

      <nav className="flex flex-1 flex-col gap-1 relative">
        {NAV_ITEMS.map(({ to, label, icon: Icon, end }) => {
          const isActive = end
            ? location.pathname === to
            : location.pathname.startsWith(to);

          return (
            <NavLink
              key={to}
              to={to}
              end={end}
              className={clsx(
                "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors relative z-10",
                isActive
                  ? "text-signal-indigo"
                  : "text-ink-500 hover:bg-base-700/50 hover:text-ink-100"
              )}
            >
              <Icon size={17} strokeWidth={2} />
              <span className="relative z-10">{label}</span>
              {isActive && (
                <motion.div
                  layoutId="sidebar-active-indicator"
                  className="absolute inset-0 rounded-lg bg-signal-indigo/12 z-0"
                  transition={{ type: "spring", stiffness: 350, damping: 28 }}
                />
              )}
            </NavLink>
          );
        })}
      </nav>

      <NavLink
        to="/"
        className="flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-base-700 hover:text-ink-100"
      >
        <Home size={17} strokeWidth={2} />
        Back to overview
      </NavLink>

      <button
        onClick={logout}
        className="mb-3 flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-ink-500 transition-colors hover:bg-base-700 hover:text-ink-100 text-left w-full"
      >
        <LogOut size={17} strokeWidth={2} />
        Log out
      </button>

      <div className="mt-auto space-y-3 rounded-xl border border-base-600 bg-base-800 p-3.5">
        <div className="flex items-center gap-2 text-signal-emerald">
          <Activity size={14} />
          <span className="text-xs font-medium">Forecast engine online</span>
        </div>
        <p className="text-[11px] leading-relaxed text-ink-500">
          Holt-Winters demand modeling with automatic seasonality detection, refreshed on every request.
        </p>
      </div>
    </aside>
  );
}
