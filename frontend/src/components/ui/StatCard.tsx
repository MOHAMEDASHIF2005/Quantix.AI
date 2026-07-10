import clsx from "clsx";
import type { ReactNode } from "react";
import { useEffect, useState, useRef } from "react";
import { motion, useMotionValue, useSpring, useTransform, animate } from "framer-motion";

export function CountUp({
  value,
  formatter = (v: number) => String(v),
  duration = 1.0,
}: {
  value: number;
  formatter?: (v: number) => string;
  duration?: number;
}) {
  const [displayValue, setDisplayValue] = useState(formatter(0));

  useEffect(() => {
    let active = true;
    const controls = animate(0, value, {
      duration,
      ease: [0.16, 1, 0.3, 1], // easeOutExpo
      onUpdate: (latest) => {
        if (active) {
          setDisplayValue(formatter(latest));
        }
      },
    });
    return () => {
      active = false;
      controls.stop();
    };
  }, [value, duration]);

  return <span className="tabular">{displayValue}</span>;
}

export function StatCard({
  label,
  value,
  numericValue,
  formatter,
  sub,
  icon,
  tone = "default",
}: {
  label: string;
  value: string;
  numericValue?: number;
  formatter?: (v: number) => string;
  sub?: string;
  icon?: ReactNode;
  tone?: "default" | "critical" | "warning" | "positive";
}) {
  const toneClasses: Record<string, string> = {
    default: "text-ink-100",
    critical: "text-signal-red",
    warning: "text-signal-amber",
    positive: "text-signal-emerald",
  };

  const ref = useRef<HTMLDivElement>(null);
  
  const x = useMotionValue(0);
  const y = useMotionValue(0);

  const mouseXSpring = useSpring(x, { stiffness: 180, damping: 18 });
  const mouseYSpring = useSpring(y, { stiffness: 180, damping: 18 });

  const rotateX = useTransform(mouseYSpring, [-0.5, 0.5], ["5deg", "-5deg"]);
  const rotateY = useTransform(mouseXSpring, [-0.5, 0.5], ["-5deg", "5deg"]);

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

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={{
        rotateX,
        rotateY,
        transformStyle: "preserve-3d",
      }}
      whileHover={{
        scale: 1.02,
        boxShadow: "0 15px 35px -10px rgba(0, 0, 0, 0.55), 0 0 0 1.5px rgba(91,127,255,0.2)",
        borderColor: "rgba(91,127,255,0.3)",
      }}
      transition={{ duration: 0.2 }}
      className="rounded-2xl border border-base-600 bg-base-800/80 p-5 shadow-panel backdrop-blur-sm transition-all duration-300 hover:border-base-500 cursor-pointer overflow-hidden"
    >
      <div style={{ transform: "translateZ(10px)" }} className="flex flex-col h-full justify-between">
        <div>
          <div className="flex items-start justify-between">
            <p className="text-xs font-medium uppercase tracking-wider text-ink-500">{label}</p>
            {icon && <div className="text-ink-700">{icon}</div>}
          </div>
          <p className={clsx("mt-3 font-mono text-[26px] font-semibold leading-none tabular", toneClasses[tone])}>
            {numericValue !== undefined ? (
              <CountUp value={numericValue} formatter={formatter} />
            ) : (
              value
            )}
          </p>
        </div>
        {sub && <p className="mt-2 text-xs text-ink-500">{sub}</p>}
      </div>
    </motion.div>
  );
}
