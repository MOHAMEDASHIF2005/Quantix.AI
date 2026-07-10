import { useEffect, useState, Suspense, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Canvas, useFrame } from "@react-three/fiber";
import { OrbitControls, Html, Stars, useTexture } from "@react-three/drei";
import { Layout } from "@/components/layout/Layout";
import { Card, SectionLabel, Spinner, TiltCard } from "@/components/ui/Primitives";
import { Compass, Search, Sparkles, TrendingUp, Globe as GlobeIcon, MapPin } from "lucide-react";
import * as THREE from "three";
import earthImg from "@/assets/earth-day.jpg";

const REGIONAL_TRENDS = [
  { id: 1, name: "Tamil Nadu (IN)", lat: 11.1271, lon: 78.6569, trend: "Whey Protein Pro ↑ (+42%)", category: "Nutrition", details: "Spurred by upcoming Pongal fitness challenges." },
  { id: 2, name: "Karnataka (IN)", lat: 12.9716, lon: 77.5946, trend: "Wireless Earbuds Pro ↑ (+48%)", category: "Electronics", details: "Corporate gift purchasing spikes detected." },
  { id: 3, name: "Maharashtra (IN)", lat: 19.0760, lon: 72.8777, trend: "USB-C Chargers ↑ (+29%)", category: "Electronics", details: "Increased work-from-home electronic accessories demand." },
  { id: 4, name: "California (US)", lat: 36.7783, lon: -119.4179, trend: "Adjustable Dumbbells ↑ (+22%)", category: "Fitness", details: "High holiday resolution cycle demand." },
  { id: 5, name: "London (UK)", lat: 51.5074, lon: -0.1278, trend: "Coffee Mug Sets ↑ (+18%)", category: "Home & Living", details: "Cozy winter category purchasing trend." },
  { id: 6, name: "Sydney (AU)", lat: -33.8688, lon: 151.2093, trend: "Yoga Mats ↑ (+25%)", category: "Fitness", details: "Coastal health and leisure club demand." },
  { id: 7, name: "Tokyo (JP)", lat: 35.6762, lon: 139.6503, trend: "Vitamin C Serum ↑ (+38%)", category: "Beauty", details: "Skin wellness cosmetics spike." },
];

// Helper to convert lat/lon to sphere coordinates
function latLonToVector3(lat: number, lon: number, radius: number): THREE.Vector3 {
  const phi = (90 - lat) * (Math.PI / 180);   // polar angle from north pole
  const theta = (lon + 180) * (Math.PI / 180); // azimuthal angle
  return new THREE.Vector3(
    -radius * Math.sin(phi) * Math.cos(theta),
    radius * Math.cos(phi),
    radius * Math.sin(phi) * Math.sin(theta)
  );
}

// 3D Hotspot Pin Component (Upgraded to 3D Supplier Building Marker)
function GlobePin({
  position,
  regionName,
  trendText,
  isHighlighted,
  onSelect,
}: {
  position: THREE.Vector3;
  regionName: string;
  trendText: string;
  isHighlighted: boolean;
  onSelect: () => void;
}) {
  const meshRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);

  // Compute normal and quaternion to align building mesh flush to globe surface
  const normal = position.clone().normalize();
  const quaternion = new THREE.Quaternion().setFromUnitVectors(new THREE.Vector3(0, 1, 0), normal);

  useFrame(({ clock }) => {
    if (!meshRef.current) return;
    const t = clock.getElapsedTime();
    const speed = isHighlighted || hovered ? 6.0 : 3.0;
    const amp = isHighlighted || hovered ? 0.08 : 0.03;
    const bob = Math.sin(t * speed) * amp;
    
    // Idle gentle bobbing and pulsing
    meshRef.current.position.y = bob;
    
    const scalePulse = (isHighlighted || hovered)
      ? 1.35 + Math.sin(t * 6) * 0.06
      : 1.0 + Math.sin(t * 3) * 0.03;
      
    meshRef.current.scale.set(scalePulse, scalePulse + bob * 1.5, scalePulse);
  });

  return (
    <group position={position} quaternion={quaternion}>
      {/* 3D Building Group */}
      <group
        ref={meshRef}
        onPointerOver={(e) => {
          e.stopPropagation();
          setHovered(true);
          document.body.style.cursor = "pointer";
        }}
        onPointerOut={() => {
          setHovered(false);
          document.body.style.cursor = "auto";
        }}
        onClick={(e) => {
          e.stopPropagation();
          onSelect();
        }}
      >
        {/* Main supplier building block */}
        <mesh position={[0, 0.07, 0]}>
          <boxGeometry args={[0.07, 0.14, 0.07]} />
          <meshStandardMaterial
            color={isHighlighted || hovered ? "#FFB020" : "#5B7FFF"}
            roughness={0.25}
            metalness={0.8}
            emissive={isHighlighted || hovered ? "#FFB020" : "#5B7FFF"}
            emissiveIntensity={isHighlighted || hovered ? 0.8 : 0.2}
          />
        </mesh>

        {/* Secondary roof box block */}
        <mesh position={[0, 0.16, 0]}>
          <boxGeometry args={[0.04, 0.04, 0.04]} />
          <meshStandardMaterial
            color={isHighlighted || hovered ? "#FF5D5D" : "#34D399"}
            roughness={0.1}
            metalness={0.9}
            emissive={isHighlighted || hovered ? "#FF5D5D" : "#34D399"}
            emissiveIntensity={isHighlighted || hovered ? 0.5 : 0.1}
          />
        </mesh>

        {/* Highlighting base circular ring */}
        <mesh position={[0, 0.005, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[0.06, 0.09, 16]} />
          <meshBasicMaterial
            color={isHighlighted || hovered ? "#FFB020" : "#5B7FFF"}
            transparent
            opacity={0.35}
            side={THREE.DoubleSide}
          />
        </mesh>
      </group>

      {(hovered || isHighlighted) && (
        <Html distanceFactor={6} position={[0, 0.35, 0]}>
          <div className="bg-base-950/90 text-ink-100 border border-base-600 rounded-lg p-2.5 shadow-panel text-[10px] whitespace-nowrap backdrop-blur-md pointer-events-none">
            <p className="font-semibold text-signal-amber">{regionName}</p>
            <p className="mt-0.5 font-mono">{trendText}</p>
          </div>
        </Html>
      )}
    </group>
  );
}

// 3D Globe Component
function ThreeDGlobe({
  onSelectRegion,
  selectedId,
  autoRotate,
}: {
  onSelectRegion: (id: number) => void;
  selectedId: number | null;
  autoRotate: boolean;
}) {
  const globeRef = useRef<THREE.Group>(null);
  const radius = 2.4;
  const [targetRot, setTargetRot] = useState<{ x: number; y: number } | null>(null);
  
  const texture = useTexture(earthImg);
  if (texture) {
    texture.colorSpace = THREE.SRGBColorSpace;
  }

  // Calculate target rotation to align selected pin straight facing the camera
  useEffect(() => {
    if (selectedId !== null) {
      const r = REGIONAL_TRENDS.find((x) => x.id === selectedId);
      if (r) {
        const pos = latLonToVector3(r.lat, r.lon, radius);
        const rotX = Math.asin(pos.y / radius);
        const rotY = Math.atan2(-pos.x, pos.z);
        setTargetRot({ x: rotX, y: rotY });
      }
    }
  }, [selectedId]);

  useFrame((state, delta) => {
    if (globeRef.current) {
      if (autoRotate && !targetRot) {
        globeRef.current.rotation.y += delta * 0.05;
      } else if (targetRot) {
        const prefersReducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
        
        if (prefersReducedMotion) {
          globeRef.current.rotation.x = targetRot.x;
          globeRef.current.rotation.y = targetRot.y;
          setTargetRot(null);
        } else {
          // Smoothly lerp X rotation
          globeRef.current.rotation.x = THREE.MathUtils.lerp(globeRef.current.rotation.x, targetRot.x, delta * 3.5);
          
          // Smoothly lerp Y rotation (handling 360-degree wrapping for shortest path)
          let currentY = globeRef.current.rotation.y;
          const twoPi = Math.PI * 2;
          let diff = (targetRot.y - currentY) % twoPi;
          if (diff < -Math.PI) diff += twoPi;
          if (diff > Math.PI) diff -= twoPi;
          const adjustedTargetY = currentY + diff;
          
          globeRef.current.rotation.y = THREE.MathUtils.lerp(currentY, adjustedTargetY, delta * 3.5);
          
          // Snap when close enough to clear targetRot and stop updates
          if (
            Math.abs(globeRef.current.rotation.x - targetRot.x) < 0.005 &&
            Math.abs(globeRef.current.rotation.y - adjustedTargetY) < 0.005
          ) {
            globeRef.current.rotation.x = targetRot.x;
            globeRef.current.rotation.y = targetRot.y;
            setTargetRot(null);
          }
        }
      }
    }
  });

  return (
    <group ref={globeRef}>
      {/* Textured Globe Core with MeshStandardMaterial */}
      <mesh rotation={[0, 0, 0]}>
        <sphereGeometry args={[radius, 64, 64]} />
        <meshStandardMaterial
          map={texture}
          roughness={0.7}
          metalness={0.15}
        />
      </mesh>

      {/* Atmosphere glowing halo shell */}
      <mesh>
        <sphereGeometry args={[radius + 0.05, 32, 32]} />
        <meshStandardMaterial
          color="#3b82f6"
          emissive="#60a5fa"
          emissiveIntensity={1.2}
          transparent
          opacity={0.12}
          blending={THREE.AdditiveBlending}
          side={THREE.BackSide}
        />
      </mesh>

      {/* Futuristic Grid Overlay */}
      <mesh>
        <sphereGeometry args={[radius + 0.01, 24, 24]} />
        <meshStandardMaterial
          color="#232838"
          wireframe
          transparent
          opacity={0.15}
        />
      </mesh>

      {/* Lat/Lon Grid Lines */}
      <gridHelper args={[radius * 2, 8, "#2E3446", "#232838"]} rotation={[Math.PI / 2, 0, 0]} />

      {/* Hotspots */}
      {REGIONAL_TRENDS.map((r) => {
        const pos = latLonToVector3(r.lat, r.lon, radius + 0.02);
        return (
          <GlobePin
            key={r.id}
            position={pos}
            regionName={r.name}
            trendText={r.trend}
            isHighlighted={selectedId === r.id}
            onSelect={() => onSelectRegion(r.id)}
          />
        );
      })}
    </group>
  );
}

export default function DemandMap() {
  const [selectedId, setSelectedId] = useState<number>(1);
  const [searchQuery, setSearchQuery] = useState("");
  const [autoRotate, setAutoRotate] = useState(true);

  const selectedRegion = REGIONAL_TRENDS.find((r) => r.id === selectedId) || REGIONAL_TRENDS[0];

  const filteredRegions = REGIONAL_TRENDS.filter(
    (r) =>
      r.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.trend.toLowerCase().includes(searchQuery.toLowerCase()) ||
      r.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <Layout
      title="Spatial Demand Explorer"
      subtitle="Interactive 3D spatial mapping tracking category breakout velocity globally"
    >
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-stretch">
        {/* Globe Viewport */}
        <div className="lg:col-span-8 flex flex-col">
          <Card className="p-4 flex-1 h-[520px] relative overflow-hidden flex flex-col" hoverGlow>
            <div className="absolute top-4 left-4 z-10 bg-base-950/80 border border-base-600 rounded-lg p-3 backdrop-blur-md text-xs space-y-1">
              <p className="font-semibold text-ink-100 flex items-center gap-1.5">
                <GlobeIcon size={12} className="text-signal-indigo animate-spin" style={{ animationDuration: "10s" }} /> 
                Spatial AI Demand Sphere
              </p>
              <p className="text-[10px] text-ink-500">Drag to spin globe. Zoom to inspect pins.</p>
              <button
                onClick={() => setAutoRotate(!autoRotate)}
                className="mt-1 text-[10px] text-signal-indigo font-semibold hover:underline block text-left"
              >
                {autoRotate ? "Pause Auto-Rotation" : "Enable Auto-Rotation"}
              </button>
            </div>

            <div className="flex-1 w-full h-full cursor-grab active:cursor-grabbing">
              <Suspense fallback={<Spinner />}>
                <Canvas camera={{ position: [0, 0, 6], fov: 45 }} dpr={[1, 1.5]}>
                  {/* Starfield background */}
                  <Stars radius={100} depth={50} count={3500} factor={4} saturation={0.5} fade speed={1} />
                  
                  {/* Lights mapping for realistic sun shine and shadow */}
                  <ambientLight intensity={0.65} />
                  <directionalLight position={[6, 3, 5]} intensity={2.0} />
                  <pointLight position={[-6, -3, -5]} intensity={0.6} />

                  <Suspense fallback={
                    <mesh>
                      <sphereGeometry args={[2.4, 32, 32]} />
                      <meshStandardMaterial color="#1d4ed8" roughness={0.6} />
                    </mesh>
                  }>
                    <ThreeDGlobe
                      onSelectRegion={(id) => {
                        setSelectedId(id);
                        setAutoRotate(false);
                      }}
                      selectedId={selectedId}
                      autoRotate={autoRotate}
                    />
                  </Suspense>
                  <OrbitControls
                    enablePan={false}
                    maxPolarAngle={Math.PI}
                    minDistance={3.5}
                    maxDistance={9}
                  />
                </Canvas>
              </Suspense>
            </div>
          </Card>
        </div>

        {/* Sidebar Analytics */}
        <div className="lg:col-span-4 flex flex-col gap-6">
          {/* Detailed analysis of active region */}
          <AnimatePresence mode="wait">
            {selectedRegion && (
              <motion.div
                key={selectedRegion.id}
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.2 }}
              >
                <Card className="p-5 border-l-4 border-l-signal-indigo" hoverGlow>
                  <div className="flex items-center gap-2 mb-3">
                    <MapPin className="text-signal-indigo shrink-0" size={16} />
                    <span className="text-xs font-semibold uppercase tracking-wider text-signal-indigo">
                      Regional Spotlight
                    </span>
                  </div>
                  <h3 className="font-display text-xl font-bold text-ink-100">{selectedRegion.name}</h3>
                  
                  <div className="mt-3 p-3 rounded-lg bg-base-950/40 border border-base-600/70">
                    <p className="text-[10px] text-ink-500 uppercase tracking-wider">Breakout Trend</p>
                    <p className="text-sm font-semibold text-signal-amber flex items-center gap-1 mt-1">
                      <TrendingUp size={14} /> {selectedRegion.trend}
                    </p>
                  </div>

                  <p className="text-xs text-ink-300 leading-relaxed mt-4">
                    {selectedRegion.details}
                  </p>

                  <div className="mt-4 flex items-center gap-2 text-[10px] text-ink-500">
                    <span className="inline-flex items-center rounded-full bg-signal-indigo/10 px-2 py-0.5 border border-signal-indigo/20 text-signal-indigo">
                      {selectedRegion.category}
                    </span>
                    <span>Coordinates: {selectedRegion.lat.toFixed(2)}N, {selectedRegion.lon.toFixed(2)}E</span>
                  </div>
                </Card>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Search List */}
          <Card className="p-5 flex-1 flex flex-col justify-between" hoverGlow>
            <div className="flex flex-col gap-3 h-full">
              <SectionLabel>Select Region</SectionLabel>

              <div className="relative">
                <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 text-ink-700" size={13} />
                <input
                  type="text"
                  placeholder="Search regions..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-base-600 bg-base-950/60 text-ink-100 placeholder:text-ink-700 outline-none focus:border-signal-indigo transition-colors"
                />
              </div>

              <div className="space-y-1.5 overflow-y-auto max-h-[190px] pr-1 mt-1 flex-1">
                {filteredRegions.map((r) => {
                  const isSelected = selectedId === r.id;
                  return (
                    <button
                      key={r.id}
                      onClick={() => {
                        setSelectedId(r.id);
                        setAutoRotate(false);
                      }}
                      className={`w-full text-left p-2.5 rounded-lg border text-xs flex justify-between items-center transition-all duration-200 ${
                        isSelected
                          ? "bg-signal-indigo/10 border-signal-indigo/35 text-ink-100 font-semibold"
                          : "border-transparent bg-base-950/10 hover:bg-base-750/30 text-ink-500 hover:text-ink-100"
                      }`}
                    >
                      <div className="truncate max-w-[170px]">
                        <p className="truncate">{r.name}</p>
                        <p className="text-[9px] text-ink-700 font-mono mt-0.5 truncate">{r.trend}</p>
                      </div>
                      <span className="text-[9px] uppercase font-bold text-ink-700 font-mono">
                        {r.category}
                      </span>
                    </button>
                  );
                })}
                {filteredRegions.length === 0 && (
                  <p className="text-center text-[11px] text-ink-700 py-6">No matching regions found.</p>
                )}
              </div>
            </div>
          </Card>
        </div>
      </div>
    </Layout>
  );
}
