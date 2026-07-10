import { useMemo, useRef } from "react";
import { Canvas, useFrame } from "@react-three/fiber";
import { Float, Line } from "@react-three/drei";
import * as THREE from "three";

const NODE_COLORS = ["#5B7FFF", "#34D399", "#FFB020", "#5B7FFF", "#34D399"];

function AICore() {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime();
    const scale = 1 + Math.sin(t * 1.4) * 0.06;
    ref.current.scale.setScalar(scale);
    ref.current.rotation.y = t * 0.15;
  });
  return (
    <mesh ref={ref}>
      <icosahedronGeometry args={[0.85, 1]} />
      <meshStandardMaterial
        color="#5B7FFF"
        emissive="#5B7FFF"
        emissiveIntensity={0.55}
        wireframe
      />
    </mesh>
  );
}

function DataNode({ position, color, delay }: { position: [number, number, number]; color: string; delay: number }) {
  const ref = useRef<THREE.Mesh>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() + delay;
    ref.current.position.y = position[1] + Math.sin(t * 0.8) * 0.18;
  });
  return (
    <Float speed={1.2} rotationIntensity={0.3} floatIntensity={0.4}>
      <mesh ref={ref} position={position}>
        <sphereGeometry args={[0.14, 16, 16]} />
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.9} />
      </mesh>
    </Float>
  );
}

function ReasoningGraph() {
  const groupRef = useRef<THREE.Group>(null);
  useFrame((_, delta) => {
    if (groupRef.current) groupRef.current.rotation.y += delta * 0.09;
  });
  const nodes = useMemo(() => {
    const count = 10;
    const pts: [number, number, number][] = [];
    for (let i = 0; i < count; i++) {
      const angle = (i / count) * Math.PI * 2;
      const radius = 2.4 + (i % 3) * 0.5;
      pts.push([
        Math.cos(angle) * radius,
        (Math.sin(i * 1.7) * 1.1),
        Math.sin(angle) * radius,
      ]);
    }
    return pts;
  }, []);

  return (
    <group ref={groupRef}>
      <AICore />
      {nodes.map((pos, i) => (
        <group key={i}>
          <DataNode position={pos} color={NODE_COLORS[i % NODE_COLORS.length]} delay={i * 0.4} />
          <Line
            points={[[0, 0, 0], pos]}
            color={NODE_COLORS[i % NODE_COLORS.length]}
            transparent
            opacity={0.25}
            lineWidth={1}
          />
        </group>
      ))}
    </group>
  );
}

export default function ExplainabilityScene() {
  return (
    <Canvas
      camera={{ position: [0, 1.4, 7.5], fov: 45 }}
      dpr={[1, 1.75]}
      gl={{ antialias: true, alpha: true }}
    >
      <ambientLight intensity={0.5} />
      <pointLight position={[5, 5, 5]} intensity={40} color="#5B7FFF" />
      <pointLight position={[-5, -3, -5]} intensity={25} color="#34D399" />
      <group rotation={[0.15, 0, 0]}>
        <ReasoningGraph />
      </group>
    </Canvas>
  );
}
