import type { ReactNode } from "react";
import { Sidebar } from "./Sidebar";
import { ChatbotWidget } from "@/components/chat/ChatbotWidget";
import { motion } from "framer-motion";

export function AmbientBackground() {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none z-0">
      {/* Glow Blob 1 */}
      <motion.div
        animate={{
          x: [0, 60, -30, 0],
          y: [0, -80, 50, 0],
        }}
        transition={{
          duration: 35,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute top-1/4 left-1/4 h-[400px] w-[400px] rounded-full bg-signal-indigo/5 blur-[120px]"
      />
      {/* Glow Blob 2 */}
      <motion.div
        animate={{
          x: [0, -40, 70, 0],
          y: [0, 60, -60, 0],
        }}
        transition={{
          duration: 40,
          repeat: Infinity,
          ease: "easeInOut",
        }}
        className="absolute bottom-1/4 right-1/4 h-[450px] w-[450px] rounded-full bg-signal-emerald/4 blur-[130px]"
      />
      {/* Subtle Grid */}
      <div className="absolute inset-0 bg-[linear-gradient(rgba(255,255,255,0.015)_1px,transparent_1px),linear-gradient(90deg,rgba(255,255,255,0.015)_1px,transparent_1px)] bg-[size:40px_40px] [mask-image:radial-gradient(ellipse_60%_50%_at_50%_0%,#000_70%,transparent_100%)] opacity-70" />
    </div>
  );
}

export function Layout({
  title,
  subtitle,
  actions,
  children,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
  children: ReactNode;
}) {
  return (
    <div className="min-h-screen relative overflow-hidden bg-base-950">
      <AmbientBackground />
      <Sidebar />
      <div className="pl-64 relative z-10">
        <header className="sticky top-0 z-10 flex items-center justify-between border-b border-base-600 bg-base-950/80 px-8 py-5 backdrop-blur-md">
          <div>
            <h1 className="font-display text-xl font-semibold text-ink-100">{title}</h1>
            {subtitle && <p className="mt-0.5 text-sm text-ink-500">{subtitle}</p>}
          </div>
          {actions}
        </header>
        <main className="px-8 py-7">{children}</main>
      </div>
      <ChatbotWidget />
    </div>
  );
}
