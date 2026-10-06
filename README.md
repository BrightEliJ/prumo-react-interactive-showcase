# Prumo Flux Arena

**Prumo Flux Arena** is a polished interactive 3D playground built to demonstrate how a modern React stack can combine responsive UI, real-time 3D rendering, physics, gestures, animation and state management in one cohesive experience.

## The experience

You control a luminous central **Flux Core** inside a physics arena.

- Drag the core to interact with its spring animation.
- Click the energy orbs to launch them with real physics impulses.
- Build your score and combo multiplier.
- Watch the energy bar and bloom intensity react to the game state.
- Orbit the camera with pointer or touch.
- Resize the viewport: the HUD is designed to remain usable on desktop and mobile.

## Stack demonstrated

| Technology | Role in the experience |
|---|---|
| **Next.js + React + TypeScript** | Application shell and component architecture |
| **Three.js** | WebGL 3D rendering and materials |
| **React Three Fiber** | Declarative React renderer for Three.js |
| **Drei** | Camera, environment, stars and scene helpers |
| **Rapier** | Rigid-body physics, gravity, restitution, friction and impulses |
| **React Spring** | Spring-based core interaction |
| **@use-gesture/react** | Drag/pointer gesture layer |
| **Zustand** | Score, energy, combo and interaction state |
| **Framer Motion** | Responsive 2D HUD animation |
| **maath** | Smooth damping and motion interpolation |
| **Miniplex** | Entity registry/ECS-style foundation for scalable game entities |
| **@react-three/postprocessing** | Bloom and vignette cinematic effects |
| **Tailwind CSS** | Utility styling for responsive HUD components |
| **GLTF/GLB-ready R3F architecture** | Ready for production 3D assets through Drei loaders |

## Architecture

The project separates the experience into three layers:

1. **Simulation** — R3F + Three.js + Rapier.
2. **Game state** — Zustand + Miniplex entity registry.
3. **Presentation** — React/Next.js + Tailwind + Framer Motion.

This separation is intentional: the same foundation can evolve into a complete browser-game platform with avatars, particles, sound, matchmaking, missions, leaderboards and persistent progression.

## Run locally

```bash
npm install
npm run dev
```

Then open `http://localhost:3000`.

For a production build:

```bash
npm run build
npm run start
```

## Project status

**v1.1 — Interactive Showcase**

The repository is intentionally small enough to understand, but the architecture is designed to demonstrate the technologies rather than merely list them as dependencies.


## v1.2 — Mission Vertical Slice

The showcase now includes a playable mission flow: start screen, four destructible targets, combo-driven scoring, impact feedback, persistent local game state and a responsive cinematic HUD. It is intentionally structured as a foundation for the next layer of the Prumo game platform rather than as a one-off visual demo.
