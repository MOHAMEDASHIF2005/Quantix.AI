import clsx from "clsx";
import type { ReactNode } from "react";
import type { Urgency } from "@/types";
import { urgencyColor } from "@/lib/format";

import { motion, useMotionValue, useSpring, useTransform } from "framer-motion";
import type { HTMLMotionProps } from "framer-motion";
import { useRef } from "react";

export function Card({
  children,
  className,
  as: Component = "div",
  hoverGlow = false,
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: React.ElementType;
  hoverGlow?: boolean;
} & HTMLMotionProps<"div">) {
  const MotionComponent = motion(Component);
  return (
    <MotionComponent
      whileHover={
        hoverGlow
          ? {
              scale: 1.01,
              boxShadow: "0 15px 35px -10px rgba(0, 0, 0, 0.6), 0 0 0 1.5px rgba(91,127,255,0.2)",
              borderColor: "rgba(91,127,255,0.3)",
            }
          : undefined
      }
      transition={{ duration: 0.2 }}
      className={clsx(
        "rounded-2xl border border-base-600 bg-base-800/80 shadow-panel backdrop-blur-sm transition-all duration-300",
        className
      )}
      {...props}
    >
      {children}
    </MotionComponent>
  );
}

export function TiltCard({
  children,
  className,
  as: Component = "div",
  onClick,
  ...props
}: {
  children: ReactNode;
  className?: string;
  as?: React.ElementType;
  onClick?: () => void;
} & HTMLMotionProps<"div">) {
  const ref = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 180, damping: 18 });
  const mouseYSpring = useSpring(y, { stiffness: 180, damping: 18 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["6deg", "-6deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-6deg", "6deg"]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    x.set((e.clientX - rect.left) / rect.width - 0.5);
    y.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    x.set(0);
    y.set(0);
  };

  const MotionComponent = motion(Component);

  return (
    <MotionComponent
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      onClick={onClick}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      whileHover={{
        scale: 1.015,
        boxShadow: "0 20px 45px -12px rgba(0, 0, 0, 0.65), 0 0 0 1.5px rgba(91,127,255,0.25)",
        borderColor: "rgba(91,127,255,0.35)",
      }}
      transition={{ duration: 0.22 }}
      className={clsx(
        "rounded-2xl border border-base-600 bg-base-800/80 shadow-panel backdrop-blur-sm transition-all duration-300 cursor-pointer overflow-hidden",
        className
      )}
      {...props}
    >
      <div style={{ transform: "translateZ(10px)" }} className="h-full w-full">
        {children}
      </div>
    </MotionComponent>
  );
}

export function UrgencyBadge({ urgency }: { urgency: Urgency }) {
  const c = urgencyColor[urgency];
  return (
    <span
      className={clsx(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium capitalize",
        c.text,
        c.bg
      )}
    >
      <span className={clsx("h-1.5 w-1.5 rounded-full", c.dot)} />
      {urgency}
    </span>
  );
}

/** The platform's signature motif — a thin gradient band whose fill
 * width encodes model confidence, so every forecasted number carries
 * its own uncertainty signal wherever it appears. */
export function ConfidenceRibbon({ confidence, className }: { confidence: number; className?: string }) {
  return (
    <div className={clsx("confidence-ribbon", className)} title={`Model confidence: ${Math.round(confidence * 100)}%`}>
      <span style={{ transform: `scaleX(${Math.max(0.04, confidence)})` }} />
    </div>
  );
}

export function SectionLabel({ children }: { children: ReactNode }) {
  return (
    <p className="mb-3 text-xs font-semibold uppercase tracking-wider text-ink-500">{children}</p>
  );
}

export function EmptyState({ title, detail }: { title: string; detail: string }) {
  return (
    <div className="flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-base-600 py-16 text-center">
      <p className="font-display text-lg text-ink-100">{title}</p>
      <p className="max-w-sm text-sm text-ink-500">{detail}</p>
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-16">
      <div className="h-6 w-6 animate-spin rounded-full border-2 border-base-600 border-t-signal-indigo" />
    </div>
  );
}
