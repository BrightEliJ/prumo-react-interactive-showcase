"use client";

import { Canvas, useFrame } from "@react-three/fiber";
import { Environment, OrbitControls, PerspectiveCamera, Stars } from "@react-three/drei";
import { Physics, RigidBody, CuboidCollider } from "@react-three/rapier";
import { EffectComposer, Bloom, Vignette } from "@react-three/postprocessing";
import { useGesture } from "@use-gesture/react";
import { animated, useSpring } from "@react-spring/three";
import { create } from "zustand";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";
import { easing } from "maath";
import { motion } from "framer-motion";
import { World } from "miniplex";

type GameState = {
  started: boolean;
  score: number;
  energy: number;
  combo: number;
  pulse: number;
  destroyed: number;
  start: () => void;
  addScore: (n: number) => void;
  destroy: () => void;
  reset: () => void;
};

const useGame = create<GameState>((set) => ({
  started: false,
  score: 0,
  energy: 100,
  combo: 1,
  pulse: 0,
  destroyed: 0,
  start: () => set({ started: true }),
  addScore: (n) =>
    set((s) => ({
      score: s.score + n * s.combo,
      energy: Math.min(100, s.energy + 3),
      combo: Math.min(8, s.combo + 0.25),
      pulse: s.pulse + 1,
    })),
  destroy: () =>
    set((s) => ({
      destroyed: s.destroyed + 1,
      score: s.score + 150 * s.combo,
      combo: Math.min(8, s.combo + 0.5),
      pulse: s.pulse + 1,
    })),
  reset: () => set({ started: false, score: 0, energy: 100, combo: 1, pulse: 0, destroyed: 0 }),
}));

type ArenaEntity = {
  kind: "orb" | "core" | "target";
  id: number;
  active: boolean;
};

function EntityRegistry() {
  const world = useMemo(() => new World<ArenaEntity>(), []);

  useEffect(() => {
    const entities: ArenaEntity[] = [
      { kind: "core", id: 0, active: true },
      ...Array.from({ length: 10 }, (_, id) => ({ kind: "orb" as const, id: id + 1, active: true })),
      ...Array.from({ length: 4 }, (_, id) => ({ kind: "target" as const, id: id + 20, active: true })),
    ];
    entities.forEach((entity) => world.add(entity));
    return () => entities.forEach((entity) => world.remove(entity));
  }, [world]);

  return null;
}

function PulseRing({ pulse }: { pulse: number }) {
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    ref.current.scale.lerp(new THREE.Vector3(1.8, 1.8, 1), delta * 5);
    ref.current.rotation.z += delta * 0.5;
    ref.current.material.opacity = Math.max(0.04, ref.current.material.opacity - delta * 1.5);
  });

  useEffect(() => {
    ref.current.scale.set(0.15, 0.15, 1);
    ref.current.material.opacity = 0.85;
  }, [pulse]);

  return (
    <mesh ref={ref} rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.03, 0]}>
      <ringGeometry args={[1.15, 1.22, 64]} />
      <meshBasicMaterial color="#67e8f9" transparent opacity={0.05} toneMapped={false} />
    </mesh>
  );
}

function Core() {
  const ref = useRef<THREE.Mesh>(null!);
  const [active, setActive] = useState(false);
  const { addScore, pulse } = useGame();
  const [spring, api] = useSpring(() => ({ scale: 1, rotation: 0 }));

  useFrame((_, delta) => {
    ref.current.rotation.y += delta * (0.7 + spring.rotation.get() * 0.15);
    ref.current.rotation.x = easing.damp(ref.current.rotation.x, active ? 0.25 : 0, 4, delta);
    ref.current.rotation.z = easing.damp(ref.current.rotation.z, spring.rotation.get() * 0.2, 4, delta);
  });

  const bind = useGesture({
    onDrag: ({ down, offset: [x] }) => {
      api.start({ scale: down ? 1.3 : 1, rotation: x * 0.01 });
    },
  });

  return (
    <group>
      <PulseRing pulse={pulse} />
      <animated.mesh
        ref={ref}
        {...bind()}
        {...spring}
        position={[0, 1.6, 0]}
        onPointerDown={() => {
          setActive(true);
          addScore(100);
        }}
        onPointerUp={() => setActive(false)}
      >
        <icosahedronGeometry args={[1, 3]} />
        <meshStandardMaterial
          emissive="#62e6ff"
          emissiveIntensity={active ? 11 : 3.5}
          color="#173a63"
          metalness={0.95}
          roughness={0.12}
        />
      </animated.mesh>
      <pointLight position={[0, 1.6, 0]} intensity={active ? 20 : 7} distance={5} color="#67e8f9" />
    </group>
  );
}

function Orb({ position, index }: { position: [number, number, number]; index: number }) {
  const body = useRef<any>(null);
  const { addScore } = useGame();
  const [hit, setHit] = useState(false);

  return (
    <RigidBody
      ref={body}
      colliders="ball"
      restitution={0.82}
      friction={0.2}
      position={position}
      linearDamping={0.15}
      angularDamping={0.1}
    >
      <mesh
        onClick={() => {
          setHit(true);
          addScore(25);
          body.current?.applyImpulse(
            { x: (Math.random() - 0.5) * 3.5, y: 2.5 + index * 0.04, z: (Math.random() - 0.5) * 3.5 },
            true,
          );
        }}
        scale={hit ? 1.25 : 1}
      >
        <sphereGeometry args={[0.22, 24, 24]} />
        <meshStandardMaterial
          emissive={hit ? "#ffffff" : "#b04cff"}
          emissiveIntensity={hit ? 12 : 4}
          color={hit ? "#d7c8ff" : "#5b2380"}
          metalness={0.7}
          roughness={0.18}
        />
      </mesh>
    </RigidBody>
  );
}

function Target({ position, index }: { position: [number, number, number]; index: number }) {
  const { destroy } = useGame();
  const [alive, setAlive] = useState(true);
  const ref = useRef<THREE.Mesh>(null!);

  useFrame((_, delta) => {
    if (alive) {
      ref.current.rotation.x += delta * (0.7 + index * 0.1);
      ref.current.rotation.y -= delta * 0.9;
    }
  });

  if (!alive) return null;

  return (
    <RigidBody type="fixed" position={position}>
      <mesh
        ref={ref}
        onClick={() => {
          setAlive(false);
          destroy();
        }}
      >
        <boxGeometry args={[0.65, 0.65, 0.65]} />
        <meshStandardMaterial color="#f59e0b" emissive="#ff6b00" emissiveIntensity={3} metalness={0.8} roughness={0.2} />
      </mesh>
    </RigidBody>
  );
}

function Arena() {
  const { energy } = useGame();

  return (
    <>
      <EntityRegistry />
      <Stars radius={35} depth={22} count={1600} factor={2.2} saturation={0} fade speed={0.4} />
      <Environment preset="night" />

      <Physics gravity={[0, -5, 0]}>
        <RigidBody type="fixed">
          <CuboidCollider args={[7, 0.2, 5]} position={[0, -0.4, 0]} />
        </RigidBody>

        {Array.from({ length: 4 }, (_, i) => (
          <Target key={`target-${i}`} index={i} position={[(i - 1.5) * 3, 0.6, i % 2 ? -2.7 : 2.7]} />
        ))}

        {Array.from({ length: 10 }, (_, i) => (
          <Orb
            key={i}
            index={i}
            position={[(i % 5 - 2) * 1.8, 1 + Math.floor(i / 5) * 1.3, (i % 3 - 1) * 1.1]}
          />
        ))}

        <Core />
      </Physics>

      <EffectComposer>
        <Bloom intensity={1.35 + energy / 180} luminanceThreshold={0.12} mipmapBlur />
        <Vignette eskil={false} offset={0.2} darkness={0.7} />
      </EffectComposer>
    </>
  );
}

function StartScreen() {
  const { start } = useGame();

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="start-screen">
      <div className="start-card">
        <div className="eyebrow">PRUMO / EXPERIMENT 01</div>
        <h1>FLUX <span>ARENA</span></h1>
        <p>Controle o núcleo. Domine a física. Quebre os alvos. Construa seu combo.</p>
        <div className="mission">
          <b>MISSÃO</b>
          <span>Destrua 4 alvos e alcance o maior score possível.</span>
        </div>
        <button onClick={start}>INICIAR MISSÃO</button>
        <small>TOQUE • ARRASTE • CLIQUE</small>
      </div>
    </motion.div>
  );
}

function Hud() {
  const { started, score, energy, combo, destroyed, reset } = useGame();
  const bind = useGesture({ onDrag: () => undefined });

  if (!started) return null;

  return (
    <div className="hud">
      <div className="flex items-start justify-between gap-4">
        <div className="brand">
          <span>PRUMO</span>
          <small>FLUX ARENA</small>
        </div>
        <div className="glass-status">PHYSICS <strong>ONLINE</strong></div>
      </div>

      <div className="stats">
        <div><b>{Math.floor(score).toLocaleString("pt-BR")}</b><small>SCORE</small></div>
        <div><b>x{combo.toFixed(1)}</b><small>COMBO</small></div>
        <div><b>{destroyed}/4</b><small>TARGETS</small></div>
      </div>

      <div className="mx-auto flex w-full max-w-xl flex-col gap-3">
        <div className="h-1.5 overflow-hidden rounded-full bg-white/10">
          <motion.div
            className="h-full rounded-full bg-cyan-300 shadow-[0_0_18px_rgba(103,232,249,.9)]"
            animate={{ width: `${energy}%` }}
            transition={{ type: "spring", stiffness: 140, damping: 20 }}
          />
        </div>
        <div className="flex items-center justify-between gap-4">
          <div className="hint text-left">ARRASTE O NÚCLEO • DESTRUA OS ALVOS • DOMINE O COMBO</div>
          <button
            {...bind()}
            onClick={reset}
            className="pointer-events-auto shrink-0 rounded-full border border-cyan-300/30 bg-slate-950/65 px-4 py-2 text-[10px] font-semibold tracking-[0.18em] text-cyan-50 backdrop-blur-xl"
          >
            RESET
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Home() {
  const started = useGame((s) => s.started);

  return (
    <main>
      <Canvas dpr={[1, 2]} gl={{ antialias: true }}>
        <PerspectiveCamera makeDefault position={[0, 4, 10]} fov={48} />
        <ambientLight intensity={0.32} />
        <pointLight position={[0, 5, 3]} intensity={80} color="#67e8f9" />
        <pointLight position={[-6, 2, -4]} intensity={50} color="#a855f7" />
        <Arena />
        <OrbitControls enablePan={false} minDistance={6} maxDistance={15} enableDamping />
      </Canvas>

      {started ? <Hud /> : <StartScreen />}

      <div className="legend">
        {["THREE.JS", "R3F", "RAPIER", "SPRING", "GESTURES", "ZUSTAND", "MINIPLEX", "POSTFX"].map((item) => (
          <span key={item}>{item}</span>
        ))}
      </div>
    </main>
  );
}
