# Docker Explorer Quest

A web-based learning game that teaches Docker through 15 interactive, animated levels. Each level focuses on a specific topic—from “What is Docker?” to real-world deployment—with visualizations, terminal-style demos, and concept notes.

## What’s inside

- **15 levels** — Fundamentals, images, containers, commands, Dockerfile, build, volumes, networking, Compose, lifecycle, registry, scaling, and a capstone “Real World Deployment” level.
- **Interactive animations** — Each level has 5 topic sections with Framer Motion animations that show concepts step-by-step.
- **Pause / resume** — Pause any animation to read at your own pace; resume from the same frame.
- **All levels unlocked** — Jump to any level; no need to complete previous ones.
- **Progress & XP** — Complete topics to earn XP; finishing a level marks it complete (green) and awards a level bonus.
- **Level 15 graduation** — Finishing the final level unlocks a certificate-style screen and “Docker Master” style completion.

## Tech stack

- **React** + **Vite** + **TypeScript**
- **Tailwind CSS** + **shadcn-ui**
- **Framer Motion** for animations
- **Zustand** (persisted) for progress, XP, and badges
- **React Router** for navigation
- Fonts: **Syne** (UI) and **JetBrains Mono** (terminal/code)

## Run locally

```bash
# Install dependencies
npm install

# Start dev server (with hot reload)
npm run dev
```

Then open the URL shown in the terminal (e.g. `http://localhost:5173`).

## Build for production

```bash
npm run build
```

Output is in the `dist/` folder. Serve it with any static host.

## Project structure (high level)

- `src/pages/` — Level routes and interactive level pages (`Level1Interactive.tsx` … `Level15Interactive.tsx`).
- `src/components/game/` — Shared UI (e.g. `LevelCard`, `AchievementPopup`).
- `src/data/levelData.ts` — Level titles and descriptions for the dashboard.
- `src/store/useGameStore.ts` — Global state (completed levels, XP, badges).
- `src/hooks/usePausableTimers.ts` — Hook used by levels to pause/resume animation timers.

## Deploy

Build with `npm run build` and deploy the `dist/` directory to any static hosting (Vercel, Netlify, GitHub Pages, etc.). No server or env vars are required for the app itself.

---

**Docker Explorer Quest** — Learn Docker from scratch, one level at a time.

Built with ❤️ by **Jiten Bhalavat**