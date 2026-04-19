# Docker Explorer Quest

A web-based learning game that teaches Docker through 15 interactive, animated levels. Each level focuses on a specific topic—from “What is Docker?” to real-world deployment—with visualizations, terminal-style demos, and concept notes.

## Demo 
https://github.com/user-attachments/assets/079c79de-9969-48a9-b015-81c3543840d6

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

### GitHub Pages (recommended for sharing)

This repo includes a workflow that builds and publishes the site whenever you push to `main` or `master`.

1. **Push this project to a GitHub repository** (any name is fine—the build picks up the repo name automatically).

2. **Turn on GitHub Pages**
   - In the repo: **Settings → Pages**
   - Under **Build and deployment**, set **Source** to **GitHub Actions** (not “Deploy from a branch”).

3. **Trigger a deploy**
   - Push to `main` or `master`, or open **Actions → Deploy to GitHub Pages → Run workflow**.

4. **Open your site**  
   After the workflow succeeds, Pages shows the URL. For a project repo it looks like:

   `https://<your-username>.github.io/<repository-name>/`

   Example: `https://jiten.github.io/docker-explorer-quest/`

**How it works**

- `vite.config.ts` sets `base` in production using `GITHUB_REPOSITORY` in CI (`/<repo>/`), so assets load correctly under Pages.
- `BrowserRouter` uses Vite’s `import.meta.env.BASE_URL` so routes match that base.
- The workflow copies `dist/index.html` to `dist/404.html` so refreshing or opening a deep link like `/level/5` still loads the SPA.

**Custom base path** (optional)

```bash
# Local production build with a fixed base (trailing slash optional)
set VITE_BASE_URL=/my-subpath/
npm run build
```

On Windows PowerShell: `$env:VITE_BASE_URL="/my-subpath/"; npm run build`

### Other hosts

Build with `npm run build` and upload the `dist/` folder to Vercel, Netlify, Cloudflare Pages, etc. For a host that serves the app at the domain root, use a normal build without `GITHUB_REPOSITORY` or `VITE_BASE_URL` (base defaults to `/`).

---

**Docker Explorer Quest** — Learn Docker from scratch, one level at a time.

Built with ❤️ by **Jiten Bhalavat**
