import { BrowserRouter, Routes, Route, useLocation, Navigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import Landing from "@/pages/Landing";
import Dashboard from "@/pages/Dashboard";
import Products from "@/pages/Products";
import ProductDetail from "@/pages/ProductDetail";
import Recommendations from "@/pages/Recommendations";
import DatasetUpload from "@/pages/DatasetUpload";
import Login from "@/pages/Login";
import Signup from "@/pages/Signup";
import WhatIf from "@/pages/WhatIf";
import Warehouse from "@/pages/Warehouse";
import Expiry from "@/pages/Expiry";
import Revenue from "@/pages/Revenue";
import DemandMap from "@/pages/DemandMap";
import { AuthProvider, useAuth } from "@/lib/AuthContext";

function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return (
      <div className="min-h-screen bg-base-950 flex items-center justify-center text-ink-300">
        <div className="flex flex-col items-center gap-3">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-signal-indigo border-t-transparent" />
          <span className="text-sm font-medium">Verifying session...</span>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return <>{children}</>;
}

function AnimatedRoutes() {
  const location = useLocation();
  return (
    <AnimatePresence mode="wait">
      <Routes location={location} key={location.pathname}>
        <Route path="/login" element={<PageWrapper><Login /></PageWrapper>} />
        <Route path="/signup" element={<PageWrapper><Signup /></PageWrapper>} />
        
        {/* Protected Routes */}
        <Route path="/" element={<ProtectedRoute><PageWrapper><Landing /></PageWrapper></ProtectedRoute>} />
        <Route path="/dashboard" element={<ProtectedRoute><PageWrapper><Dashboard /></PageWrapper></ProtectedRoute>} />
        <Route path="/products" element={<ProtectedRoute><PageWrapper><Products /></PageWrapper></ProtectedRoute>} />
        <Route path="/products/:id" element={<ProtectedRoute><PageWrapper><ProductDetail /></PageWrapper></ProtectedRoute>} />
        <Route path="/recommendations" element={<ProtectedRoute><PageWrapper><Recommendations /></PageWrapper></ProtectedRoute>} />
        <Route path="/upload" element={<ProtectedRoute><PageWrapper><DatasetUpload /></PageWrapper></ProtectedRoute>} />
        <Route path="/what-if" element={<ProtectedRoute><PageWrapper><WhatIf /></PageWrapper></ProtectedRoute>} />
        <Route path="/warehouse" element={<ProtectedRoute><PageWrapper><Warehouse /></PageWrapper></ProtectedRoute>} />
        <Route path="/expiry" element={<ProtectedRoute><PageWrapper><Expiry /></PageWrapper></ProtectedRoute>} />
        <Route path="/revenue" element={<ProtectedRoute><PageWrapper><Revenue /></PageWrapper></ProtectedRoute>} />
        <Route path="/demand-map" element={<ProtectedRoute><PageWrapper><DemandMap /></PageWrapper></ProtectedRoute>} />
        
        {/* Fallback */}
        <Route path="*" element={<Navigate to="/dashboard" replace />} />
      </Routes>
    </AnimatePresence>
  );
}

function PageWrapper({ children }: { children: React.ReactNode }) {
  return (
    <motion.div
      initial={{ opacity: 0, y: 15 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -15 }}
      transition={{ duration: 0.25, ease: [0.25, 0.8, 0.25, 1] }}
      className="w-full h-full"
    >
      {children}
    </motion.div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AnimatedRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
