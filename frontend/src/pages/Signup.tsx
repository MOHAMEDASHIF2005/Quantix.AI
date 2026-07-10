import { useState, Suspense } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { TrendingUp, ArrowRight, Lock, Mail, User, AlertCircle } from "lucide-react";
import { useAuth } from "@/lib/AuthContext";
import ExplainabilityScene from "@/components/three/ExplainabilityScene";
import { Spinner } from "@/components/ui/Primitives";

export default function Signup() {
  const { signup } = useAuth();
  const navigate = useNavigate();
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");

    // Validation
    if (!name) {
      setError("Full name is required");
      return;
    }
    if (!email) {
      setError("Email is required");
      return;
    }
    if (!email.includes("@")) {
      setError("Please enter a valid email address");
      return;
    }
    if (!password) {
      setError("Password is required");
      return;
    }
    if (password.length < 6) {
      setError("Password must be at least 6 characters");
      return;
    }

    try {
      setLoading(true);
      await signup(email, name);
      navigate("/dashboard");
    } catch (err: any) {
      setError(err?.message || "Failed to create account");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen relative flex items-center justify-center bg-base-950 overflow-hidden text-ink-100">
      {/* 3D Background */}
      <div className="absolute inset-0 z-0 pointer-events-none opacity-40">
        <Suspense fallback={null}>
          <ExplainabilityScene />
        </Suspense>
      </div>

      {/* Subtle overlay glow */}
      <div className="absolute inset-0 bg-gradient-to-t from-base-950 via-base-950/80 to-base-950/40 z-10 pointer-events-none" />

      {/* Form Container */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.96 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.8, 0.25, 1] }}
        className="relative z-20 w-full max-w-md mx-4 p-8 rounded-2xl border border-base-600 bg-base-900/80 backdrop-blur-xl shadow-panel"
      >
        <div className="flex flex-col items-center mb-8">
          <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-signal-indigo/15 text-signal-indigo mb-3">
            <TrendingUp size={22} strokeWidth={2.5} />
          </div>
          <h2 className="font-display text-2xl font-bold tracking-tight text-ink-100">Create Account</h2>
          <p className="text-sm text-ink-500 mt-1">Get started with explainable inventory decisions</p>
        </div>

        {error && (
          <motion.div
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-2 rounded-lg bg-signal-redSoft p-3 text-xs text-signal-red mb-5 border border-signal-red/20"
          >
            <AlertCircle size={15} className="shrink-0" />
            <span>{error}</span>
          </motion.div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5" htmlFor="name">
              Full Name
            </label>
            <div className="relative">
              <User className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700" size={16} />
              <input
                id="name"
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="John Doe"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-base-600 bg-base-950/60 text-sm text-ink-100 placeholder:text-ink-700 outline-none focus:border-signal-indigo transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5" htmlFor="email">
              Email Address
            </label>
            <div className="relative">
              <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700" size={16} />
              <input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="manager@quantix.ai"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-base-600 bg-base-950/60 text-sm text-ink-100 placeholder:text-ink-700 outline-none focus:border-signal-indigo transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold uppercase tracking-wider text-ink-500 mb-1.5" htmlFor="password">
              Password
            </label>
            <div className="relative">
              <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-ink-700" size={16} />
              <input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-10 pr-4 py-2.5 rounded-lg border border-base-600 bg-base-950/60 text-sm text-ink-100 placeholder:text-ink-700 outline-none focus:border-signal-indigo transition-colors"
                disabled={loading}
              />
            </div>
          </div>

          <div className="pt-2">
            <motion.button
              type="submit"
              disabled={loading}
              whileHover={{ scale: 1.02, boxShadow: "0 0 20px 4px rgba(91,127,255,0.25)" }}
              whileTap={{ scale: 0.98 }}
              className="w-full flex items-center justify-center gap-2 rounded-lg bg-signal-indigo py-3 text-sm font-semibold text-white transition-all disabled:opacity-50"
            >
              {loading ? <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /> : "Sign Up"}
              {!loading && <ArrowRight size={16} />}
            </motion.button>
          </div>
        </form>

        <p className="text-center text-xs text-ink-500 mt-6">
          Already have an account?{" "}
          <Link to="/login" className="text-signal-indigo hover:underline font-semibold">
            Sign in
          </Link>
        </p>
      </motion.div>
    </div>
  );
}
