import { useEffect, useState, Suspense, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html } from "@react-three/drei";
import { Layout } from "@/components/layout/Layout";
import { Card, SectionLabel, Spinner, TiltCard } from "@/components/ui/Primitives";
import { api } from "@/api/client";
import type { ShelfHealth, ShelfProduct } from "@/types";
import { RefreshCw, LayoutGrid, Box, AlertTriangle, Eye, Server } from "lucide-react";
import * as THREE from "three";

// Colors for status mapping
const STATUS_COLORS = {
  red: {
    bg: "bg-signal-redSoft",
    text: "text-signal-red",
    border: "border-signal-red/20",
    glow: "shadow-[0_0_15px_rgba(255,93,93,0.15)]",
    hex: "#FF5D5D",
  },
  amber: {
    bg: "bg-signal-amberSoft",
    text: "text-signal-amber",
    border: "border-signal-amber/20",
    glow: "shadow-[0_0_15px_rgba(255,176,32,0.15)]",
    hex: "#FFB020",
  },
  green: {
    bg: "bg-signal-emeraldSoft",
    text: "text-signal-emerald",
    border: "border-signal-emerald/20",
    glow: "shadow-[0_0_15px_rgba(52,211,153,0.15)]",
    hex: "#34D399",
  },
};

// 3D Single Shelf Box Component
function ThreeShelfBlock({
  position,
  shelfData,
  onSelect,
  isSelected,
}: {
  position: [number, number, number];
  shelfData: ShelfHealth;
  onSelect: (data: ShelfHealth) => void;
  isSelected: boolean;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const color = STATUS_COLORS[shelfData.health].hex;
  const [hovered, setHovered] = useState(false);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    if (hovered || isSelected) {
      const t = clock.getElapsedTime();
      meshRef.current.scale.setScalar(1 + Math.sin(t * 3) * 0.02);
    } else {
      meshRef.current.scale.setScalar(1);
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={position}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(shelfData);
      }}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={() => setHovered(false)}
    >
      <boxGeometry args={[1.5, 0.4, 0.9]} />
      <meshStandardMaterial
        color={color}
        roughness={0.2}
        metalness={0.8}
        emissive={color}
        emissiveIntensity={hovered || isSelected ? 0.6 : 0.25}
      />
      {hovered && (
        <Html distanceFactor={6} position={[0, 0.4, 0]}>
          <div className="bg-base-950/90 text-ink-100 border border-base-600 rounded-lg px-2.5 py-1.5 shadow-panel text-[10px] whitespace-nowrap backdrop-blur-md pointer-events-none">
            <p className="font-semibold">{shelfData.shelf}</p>
            <p className="text-ink-500 font-mono">Stock: {shelfData.current_stock} / {shelfData.capacity}</p>
            <p className="text-ink-500 font-mono">Util: {shelfData.utilization.toFixed(0)}%</p>
          </div>
        </Html>
      )}
    </mesh>
  );
}

// 3D Rack Structure Drawing Component
function ThreeWarehouseScene({
  data,
  onSelectShelf,
  selectedShelf,
}: {
  data: ShelfHealth[];
  onSelectShelf: (shelf: ShelfHealth) => void;
  selectedShelf: ShelfHealth | null;
}) {
  // Build coordinates for each shelf.
  // Group by Zone, and render them on virtual grid racks
  const zones = Array.from(new Set(data.map((s) => s.zone))).sort();

  return (
    <group position={[0, -1, 0]}>
      {zones.map((zone, zIdx) => {
        const zoneShelves = data.filter((s) => s.zone === zone);
        return (
          <group key={zone} position={[(zIdx - (zones.length - 1) / 2) * 2.8, 0, 0]}>
            {/* Draw Rack Frame bars */}
            <mesh position={[-0.9, 1.25, 0]}>
              <boxGeometry args={[0.06, 2.8, 0.9]} />
              <meshStandardMaterial color="#232838" metalness={0.9} roughness={0.1} />
            </mesh>
            <mesh position={[0.9, 1.25, 0]}>
              <boxGeometry args={[0.06, 2.8, 0.9]} />
              <meshStandardMaterial color="#232838" metalness={0.9} roughness={0.1} />
            </mesh>
            
            {/* Render shelf blocks */}
            {zoneShelves.map((shelf, sIdx) => {
              // Y represents height, X is zone center, Z is offset
              const yPos = sIdx * 0.7 + 0.3;
              return (
                <group key={shelf.shelf} position={[0, yPos, 0]}>
                  <ThreeShelfBlock
                    position={[0, 0, 0]}
                    shelfData={shelf}
                    onSelect={onSelectShelf}
                    isSelected={selectedShelf?.shelf === shelf.shelf}
                  />
                  {/* Metal Shelf Plate */}
                  <mesh position={[0, -0.22, 0]}>
                    <boxGeometry args={[1.7, 0.03, 0.95]} />
                    <meshStandardMaterial color="#2E3446" metalness={0.8} />
                  </mesh>
                </group>
              );
            })}
          </group>
        );
      })}
    </group>
  );
}

export default function Warehouse() {
  const [data, setData] = useState<ShelfHealth[]>([]);
  const [loading, setLoading] = useState(true);
  const [view3d, setView3d] = useState(false);
  const [selectedShelf, setSelectedShelf] = useState<ShelfHealth | null>(null);
  const [hoveredShelfId, setHoveredShelfId] = useState<string | null>(null);

  const fetchData = () => {
    setLoading(true);
    api.warehouse.heatmap()
      .then((res) => {
        setData(res);
        if (res.length > 0) {
          // Keep current selected or default to first
          setSelectedShelf((prev) => {
            const match = res.find((s) => s.shelf === prev?.shelf);
            return match || res[0];
          });
        }
      })
      .catch((err) => console.error("Error loading warehouse heatmap:", err))
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchData();
  }, []);

  return (
    <Layout
      title="AI Warehouse Heatmap"
      subtitle="Visual shelf stock health mapping and spatial warehouse optimization"
      actions={
        <div className="flex items-center gap-2">
          {/* Toggle 2D / 3D */}
          <div className="flex rounded-lg border border-base-600 bg-base-800 p-0.5">
            <button
              onClick={() => setView3d(false)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                !view3d ? "bg-signal-indigo text-white" : "text-ink-500 hover:text-ink-100"
              }`}
            >
              <LayoutGrid size={13} /> Grid Heatmap
            </button>
            <button
              onClick={() => setView3d(true)}
              className={`flex items-center gap-1.5 rounded-md px-3 py-1.5 text-xs font-medium transition-colors ${
                view3d ? "bg-signal-indigo text-white" : "text-ink-500 hover:text-ink-100"
              }`}
            >
              <Box size={13} /> 3D Spatial
            </button>
          </div>

          <motion.button
            onClick={fetchData}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="flex items-center justify-center p-2.5 rounded-lg border border-base-600 bg-base-800 text-ink-500 hover:text-ink-100 transition-colors"
            aria-label="Refresh data"
          >
            <RefreshCw size={15} />
          </motion.button>
        </div>
      }
    >
      {loading && <Spinner />}

      {!loading && data.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20">
          <p className="text-ink-500">No warehouse shelves seeded yet. Try recreating the database.</p>
        </div>
      )}

      {!loading && data.length > 0 && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
          {/* Visualizer Column */}
          <div className="lg:col-span-8 flex flex-col">
            <AnimatePresence mode="wait">
              {!view3d ? (
                // 2D Grid Layout
                <motion.div
                  key="grid"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.25 }}
                  className="grid grid-cols-2 sm:grid-cols-4 gap-4"
                >
                  {data.map((shelf) => {
                    const activeColor = STATUS_COLORS[shelf.health];
                    const isSelected = selectedShelf?.shelf === shelf.shelf;
                    const isHovered = hoveredShelfId === shelf.shelf;

                    return (
                      <TiltCard
                        key={shelf.shelf}
                        onClick={() => setSelectedShelf(shelf)}
                        onPointerOver={() => setHoveredShelfId(shelf.shelf)}
                        onPointerOut={() => setHoveredShelfId(null)}
                        className={`p-4 flex flex-col justify-between h-[150px] relative border transition-all duration-300 ${
                          isSelected ? "border-signal-indigo shadow-[0_0_20px_rgba(91,127,255,0.15)] ring-1 ring-signal-indigo" : ""
                        } ${activeColor.glow}`}
                      >
                        <div className="flex justify-between items-start">
                          <div>
                            <p className="text-[10px] font-semibold text-ink-500 uppercase tracking-wider">
                              Shelf Location
                            </p>
                            <p className="font-display text-lg font-bold text-ink-100 mt-0.5">{shelf.shelf}</p>
                          </div>
                          <span className={`inline-flex h-2.5 w-2.5 rounded-full ${
                            shelf.health === "red" ? "bg-signal-red animate-pulse" : 
                            shelf.health === "amber" ? "bg-signal-amber" : "bg-signal-emerald"
                          }`} />
                        </div>

                        <div>
                          <div className="flex justify-between text-xs text-ink-300 font-mono mb-1">
                            <span>Util: {shelf.utilization.toFixed(0)}%</span>
                            <span>{shelf.current_stock} units</span>
                          </div>
                          {/* Progress/Utilization Bar */}
                          <div className="w-full bg-base-950/60 rounded-full h-1.5 overflow-hidden border border-base-600">
                            <motion.div
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.min(100, shelf.utilization)}%` }}
                              transition={{ duration: 0.4 }}
                              className={`h-full rounded-full ${
                                shelf.health === "red" ? "bg-signal-red" : 
                                shelf.health === "amber" ? "bg-signal-amber" : "bg-signal-emerald"
                              }`}
                            />
                          </div>
                        </div>

                        {/* Hover Overlay Detail Tooltip */}
                        <AnimatePresence>
                          {isHovered && (
                            <motion.div
                              initial={{ opacity: 0, scale: 0.95 }}
                              animate={{ opacity: 1, scale: 1 }}
                              exit={{ opacity: 0, scale: 0.95 }}
                              transition={{ duration: 0.15 }}
                              className="absolute inset-0 bg-base-900/95 backdrop-blur-md rounded-xl p-3 border border-base-500 z-10 flex flex-col justify-between"
                            >
                              <p className="text-[10px] font-bold text-ink-300 uppercase tracking-wider">
                                SKUs on Shelf: {shelf.products.length}
                              </p>
                              <div className="space-y-1 my-1 overflow-y-auto max-h-[70px] pr-1">
                                {shelf.products.map((p) => (
                                  <div key={p.sku} className="flex justify-between text-[10px] font-mono">
                                    <span className="text-ink-100 truncate max-w-[80px]">{p.sku}</span>
                                    <span className="text-ink-500 font-semibold">{p.current_stock}u</span>
                                  </div>
                                ))}
                              </div>
                              <p className="text-[9px] text-signal-indigo text-right font-medium">Click to select details →</p>
                            </motion.div>
                          )}
                        </AnimatePresence>
                      </TiltCard>
                    );
                  })}
                </motion.div>
              ) : (
                // 3D Canvas Visualizer
                <motion.div
                  key="3d"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.25 }}
                  className="h-[500px] w-full rounded-2xl border border-base-600 bg-base-900/50 relative overflow-hidden flex flex-col"
                >
                  <div className="absolute top-4 left-4 z-10 bg-base-950/80 border border-base-600 rounded-lg p-3 backdrop-blur-md text-xs space-y-1.5 pointer-events-none">
                    <p className="font-semibold text-ink-100 flex items-center gap-1.5">
                      <Server size={12} className="text-signal-indigo" /> 3D Warehouse Racks
                    </p>
                    <p className="text-[10px] text-ink-500">Left-click + Drag to rotate scene</p>
                    <p className="text-[10px] text-ink-500">Scroll to zoom. Click block to select shelf.</p>
                  </div>
                  
                  <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing">
                    <Suspense fallback={<Spinner />}>
                      <Canvas camera={{ position: [0, 2.5, 7.5], fov: 40 }} dpr={[1, 1.5]}>
                        <ambientLight intensity={0.7} />
                        <pointLight position={[5, 10, 5]} intensity={1.5} />
                        <directionalLight position={[-5, 5, -5]} intensity={0.5} />
                        <ThreeWarehouseScene
                          data={data}
                          onSelectShelf={setSelectedShelf}
                          selectedShelf={selectedShelf}
                        />
                        <OrbitControls
                          enablePan={false}
                          maxPolarAngle={Math.PI / 2}
                          minDistance={4}
                          maxDistance={12}
                        />
                      </Canvas>
                    </Suspense>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Details Drawer Column */}
          <div className="lg:col-span-4 flex flex-col">
            <Card className="p-6 h-full flex flex-col justify-between" hoverGlow>
              <div>
                <div className="flex justify-between items-center mb-4">
                  <SectionLabel>Shelf Details</SectionLabel>
                  {selectedShelf && (
                    <span className={`inline-flex items-center rounded-full px-2.5 py-0.5 text-xs font-semibold uppercase border ${
                      STATUS_COLORS[selectedShelf.health].bg
                    } ${STATUS_COLORS[selectedShelf.health].text} ${STATUS_COLORS[selectedShelf.health].border}`}>
                      {selectedShelf.health === "red" ? "Low Stock" : selectedShelf.health === "amber" ? "Monitor" : "Healthy"}
                    </span>
                  )}
                </div>

                {selectedShelf ? (
                  <div className="space-y-6">
                    <div>
                      <h3 className="font-display text-2xl font-bold text-ink-100">{selectedShelf.shelf}</h3>
                      <p className="text-xs text-ink-500 mt-1">Zone: {selectedShelf.zone} · Warehouse Area MAIN</p>
                    </div>

                    {/* Stats */}
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-ink-500">Current Stock</p>
                        <p className="font-mono text-lg font-semibold text-ink-100 mt-0.5">
                          {selectedShelf.current_stock} <span className="text-xs text-ink-500 font-normal">units</span>
                        </p>
                      </div>
                      <div>
                        <p className="text-[10px] uppercase tracking-wider text-ink-500">Utilization</p>
                        <p className="font-mono text-lg font-semibold text-ink-100 mt-0.5">
                          {selectedShelf.utilization.toFixed(0)}%
                        </p>
                      </div>
                    </div>

                    {/* Product list */}
                    <div className="space-y-3">
                      <p className="text-xs font-semibold uppercase tracking-wider text-ink-500">Associated SKUs</p>
                      <div className="space-y-2 max-h-[220px] overflow-y-auto pr-1">
                        {selectedShelf.products.map((p) => (
                          <div
                            key={p.sku}
                            className="flex flex-col gap-2 p-3 rounded-xl border border-base-600 bg-base-900/60"
                          >
                            <div className="flex justify-between items-start">
                              <div>
                                <p className="text-xs font-bold text-ink-100">{p.sku}</p>
                                <p className="text-[10px] text-ink-500 truncate max-w-[150px]">{p.name}</p>
                              </div>
                              <span className={`inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[9px] font-bold ${
                                p.urgency === "critical" || p.urgency === "high"
                                  ? "bg-signal-redSoft text-signal-red"
                                  : p.urgency === "medium"
                                  ? "bg-signal-amberSoft text-signal-amber"
                                  : "bg-signal-emeraldSoft text-signal-emerald"
                              }`}>
                                {p.urgency}
                              </span>
                            </div>
                            <div className="flex justify-between items-center text-[10px] text-ink-500 mt-1">
                              <span>Stock: <strong className="text-ink-100 font-mono font-medium">{p.current_stock}</strong></span>
                              <span>Action: <strong className="text-ink-300">{p.action.replace("_", " ")}</strong></span>
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="flex flex-col items-center justify-center py-20 text-center text-ink-700">
                    <p className="text-sm">Select a shelf block to inspect SKUs and stock metrics.</p>
                  </div>
                )}
              </div>

              {selectedShelf && selectedShelf.health === "red" && (
                <div className="mt-6 flex items-center gap-2.5 rounded-xl bg-signal-redSoft border border-signal-red/20 p-3.5 text-xs text-signal-red">
                  <AlertTriangle size={15} className="shrink-0" />
                  <span>
                    One or more products stored on this shelf require urgent replenishment to prevent stockouts.
                  </span>
                </div>
              )}
            </Card>
          </div>
        </div>
      )}
    </Layout>
  );
}
