import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { usePausableTimers } from '@/hooks/usePausableTimers';

type TopicId = 'basics' | 'instructions' | 'layer-order' | 'multi-stage' | 'build';

interface TopicMeta {
  id: TopicId;
  label: string;
  icon: string;
  color: string;
  colorClass: string;
  borderClass: string;
  bgTint: string;
  glowStyle: string;
}

const TOPICS: TopicMeta[] = [
  { id: 'basics', label: 'Dockerfile Basics', icon: '📄', color: '#06B6D4', colorClass: 'text-cyan-400', borderClass: 'border-cyan-500', bgTint: 'bg-cyan-500/10', glowStyle: '0 0 12px rgba(6,182,212,0.4)' },
  { id: 'instructions', label: 'Core Instructions', icon: '🔧', color: '#8B5CF6', colorClass: 'text-purple-400', borderClass: 'border-purple-500', bgTint: 'bg-purple-500/10', glowStyle: '0 0 12px rgba(139,92,246,0.4)' },
  { id: 'layer-order', label: 'Layer Ordering', icon: '📚', color: '#F97316', colorClass: 'text-orange-400', borderClass: 'border-orange-500', bgTint: 'bg-orange-500/10', glowStyle: '0 0 12px rgba(249,115,22,0.4)' },
  { id: 'multi-stage', label: 'Multi-Stage Builds', icon: '🏗️', color: '#14B8A6', colorClass: 'text-teal-400', borderClass: 'border-teal-500', bgTint: 'bg-teal-500/10', glowStyle: '0 0 12px rgba(20,184,166,0.4)' },
  { id: 'build', label: 'Dockerfile → Image', icon: '⚙️', color: '#10B981', colorClass: 'text-emerald-400', borderClass: 'border-emerald-500', bgTint: 'bg-emerald-500/10', glowStyle: '0 0 12px rgba(16,185,129,0.4)' },
];

const INFO_LOGS: Record<TopicId, { prefix: string; lines: string[] }> = {
  basics: {
    prefix: '> Loading: Dockerfile Fundamentals',
    lines: [
      '# A Dockerfile is a plain text file named exactly "Dockerfile"',
      '# It contains instructions that docker build executes top to bottom',
      '# Each instruction (except FROM) creates a new image layer',
      '# Build context: the directory you run docker build from',
      '$ docker build -t my-app .',
      '# The dot (.) means "use current directory as build context"',
      '# -t my-app assigns a name (tag) to the resulting image',
      '> Dockerfile basics loaded ✓',
    ],
  },
  instructions: {
    prefix: '> Loading: Dockerfile Instructions',
    lines: [
      '# FROM     — base image (required, must be first)',
      '# WORKDIR  — set working directory inside container',
      '# COPY     — copy files from host into image',
      '# ADD      — like COPY but supports URLs and auto-extracts tarballs',
      '# RUN      — execute command during build (creates a layer)',
      '# ENV      — set environment variable (persists in containers)',
      '# ARG      — build-time variable (not available in running container)',
      '# EXPOSE   — document which port the app uses (metadata only)',
      '# CMD      — default command when container starts (overridable)',
      '# ENTRYPOINT — main command (not easily overridden)',
      '> Instructions reference loaded ✓',
    ],
  },
  'layer-order': {
    prefix: '> Loading: Layer Cache Optimization',
    lines: [
      '# Docker caches each layer by its instruction + file contents hash',
      '# If a layer\'s cache is INVALID, all subsequent layers also rebuild',
      '# This is called "cache busting" — avoid it for slow instructions',
      '# Golden rule: put LEAST-changing instructions at the TOP',
      '# WORST: COPY . . then RUN npm install (code change = reinstall)',
      '# BEST:  COPY package*.json then RUN npm install then COPY . .',
      '# Result: code changes only invalidate last 2 fast layers',
      '> Layer ordering loaded ✓',
    ],
  },
  'multi-stage': {
    prefix: '> Loading: Multi-Stage Build Pattern',
    lines: [
      '$ docker build -t my-app:prod .',
      '# Stage 1 (builder): uses node:18 — full 1.1GB image',
      '# Stage 2 (prod):    uses node:18-alpine — only 178MB base',
      '# COPY --from=builder copies only compiled output to final image',
      '# Build tools, dev dependencies, source maps NEVER reach production',
      '# Final image: ~95MB vs ~1.1GB single-stage equivalent',
      '# docker build still just needs one command — stages are internal',
      '> Multi-stage build demo complete ✓',
    ],
  },
  build: {
    prefix: '> Executing: docker build -t my-node-app .',
    lines: [
      'Step 1/7 : FROM node:18-alpine    → CACHED  178MB',
      'Step 2/7 : WORKDIR /app           → NEW       0B',
      'Step 3/7 : COPY package*.json ./  → NEW       2KB',
      'Step 4/7 : RUN npm ci             → NEW      45MB',
      'Step 5/7 : COPY . .               → NEW     1.2MB',
      'Step 6/7 : EXPOSE 3000            → NEW       0B',
      'Step 7/7 : CMD ["node","server"]  → NEW       0B',
      'Successfully built 7k8l9m0n1o2p',
      'Successfully tagged my-node-app:latest ✓',
      'Total image size: 224MB',
      '> Build complete ✓',
    ],
  },
};

interface CardSection { title: string; text: string }
const CARD_DATA: Record<TopicId, { heading: string; sections: CardSection[] }> = {
  basics: {
    heading: 'Dockerfile Fundamentals',
    sections: [
      { title: 'What it is', text: "A Dockerfile is a plain text file named exactly 'Dockerfile' (no extension, capital D). It lives in your project's root directory alongside your source code. Docker reads it top to bottom during docker build, executing each instruction in order. Every instruction (except FROM) adds a new read-only layer to the image." },
      { title: 'The build context', text: "When you run docker build, Docker sends all files in the current directory to the Docker daemon — this is the build context. Keep it small! Use a .dockerignore file to exclude node_modules, .git, test files, and logs. A large build context slows every build, even with caching." },
      { title: '.dockerignore', text: "Create a .dockerignore file alongside your Dockerfile:\n  node_modules\n  .git\n  .env\n  *.log\n  dist\n  coverage\nThis prevents huge directories from being sent to the daemon unnecessarily." },
      { title: 'Basic build command', text: "docker build -t myapp:1.0 .\n  -t myapp:1.0  — tag the image with name 'myapp' and version '1.0'\n  .             — use the current directory as build context\n  docker build --no-cache -t myapp .  — force rebuild all layers" },
    ],
  },
  instructions: {
    heading: 'Dockerfile Instructions Reference',
    sections: [
      { title: 'FROM', text: "FROM node:18-alpine\nThe starting point. Defines the base image. Must be the first instruction (ARG can come before FROM). Choose alpine variants for smaller images. You can have multiple FROM statements in one file (multi-stage builds)." },
      { title: 'WORKDIR', text: "WORKDIR /app\nSets and creates the working directory for all following instructions. Prefer WORKDIR over RUN cd /app. If the directory doesn't exist, it's created automatically. Use absolute paths always." },
      { title: 'COPY vs ADD', text: "COPY package.json ./   — copies files from build context into image\nADD archive.tar.gz ./  — like COPY but auto-extracts tarballs\nAlways prefer COPY over ADD unless you specifically need ADD's extras." },
      { title: 'RUN', text: "RUN npm ci\nExecutes a shell command during build. Each RUN creates a new layer.\nChain multiple commands with && to reduce layers:\nRUN apt-get update && apt-get install -y curl && rm -rf /var/lib/apt/lists/*" },
      { title: 'ENV / ARG', text: "ENV NODE_ENV=production  — available during build AND in containers\nARG BUILD_VERSION=1.0   — only available during build, not in containers\nUse ARG for build-time secrets and version numbers." },
      { title: 'EXPOSE / CMD / ENTRYPOINT', text: "EXPOSE 3000          — documents the port (metadata only, not published)\nCMD ['node','app']   — default command, overridable with docker run <cmd>\nENTRYPOINT ['node']  — main executable, harder to override, use for tools" },
    ],
  },
  'layer-order': {
    heading: 'Optimizing Build Cache with Layer Order',
    sections: [
      { title: 'The cache rule', text: "Docker caches every layer. When you rebuild, Docker checks each instruction from top to bottom. The moment it finds a change (different instruction, different file contents), it INVALIDATES that layer AND every layer below it. This is why order matters enormously." },
      { title: 'The golden rule', text: "Order instructions from LEAST likely to change → MOST likely to change.\nLeast changing: base image, system packages, dependency manifests\nMost changing:  your application source code" },
      { title: 'The npm install anti-pattern', text: "BAD — slow rebuilds every code change:\n  COPY . .              (copies everything including source code)\n  RUN npm install       (cache invalidated by ANY code change)\n\nGOOD — fast rebuilds:\n  COPY package*.json ./ (only copy manifest files)\n  RUN npm install       (cached unless package.json changes)\n  COPY . .              (copy source code LAST)" },
      { title: 'Combining RUN commands', text: "Each RUN is a layer. Don't do:\n  RUN apt-get update\n  RUN apt-get install curl\n  RUN apt-get install git\nDo this instead (one layer):\n  RUN apt-get update && apt-get install -y curl git \\\n      && rm -rf /var/lib/apt/lists/*" },
    ],
  },
  'multi-stage': {
    heading: 'Multi-Stage Builds',
    sections: [
      { title: 'The problem they solve', text: "To compile or build an application, you need compilers, build tools, and dev dependencies — none of which are needed to RUN the application. Without multi-stage builds, all those build tools end up in your production image, bloating it to hundreds of MB or even GB unnecessarily." },
      { title: 'How it works', text: "A multi-stage Dockerfile has multiple FROM instructions. Each FROM starts a new build stage. You name stages with AS: FROM node:18 AS builder. In later stages, you can copy files FROM earlier stages using:\nCOPY --from=builder /app/dist ./dist\nOnly the final stage becomes the image that gets shipped." },
      { title: 'Real example', text: "FROM node:18 AS builder\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nRUN npm run build\n\nFROM node:18-alpine\nWORKDIR /app\nCOPY --from=builder /app/dist ./dist\nCMD ['node', 'dist/server.js']" },
      { title: 'Size impact', text: "Single-stage (with build tools): ~1.1 GB\nMulti-stage (production only):   ~95 MB\nReduction: 91%. Smaller images = faster pushes, faster pulls, smaller attack surface, lower storage costs." },
    ],
  },
  build: {
    heading: 'The docker build Process',
    sections: [
      { title: 'What happens during build', text: "docker build -t myapp .\n1. Docker reads the Dockerfile top to bottom\n2. For each instruction, Docker checks if a cached layer exists\n3. Cache HIT: reuse existing layer (fast, no work done)\n4. Cache MISS: execute the instruction, create a new layer, cache it\n5. Each layer gets a SHA256 hash ID\n6. All layers are combined into the final image and tagged" },
      { title: 'Build flags', text: "docker build -t myapp .         — standard build with cache\ndocker build --no-cache -t myapp . — rebuild all layers from scratch\ndocker build -f Dockerfile.prod .  — specify custom Dockerfile name\ndocker build --platform linux/amd64 . — build for specific platform\ndocker build --target builder .    — build only up to named stage" },
      { title: 'Inspecting the result', text: "After build, verify with:\n  docker images myapp            — see image size and tag\n  docker history myapp           — see every layer and its size\n  docker image inspect myapp     — full metadata including layers\n  docker run --rm myapp ls /app  — verify files are in the right place" },
      { title: 'Build output meaning', text: "CACHED → layer was reused (instant, no execution)\nNEW    → layer was built fresh (took real time)\n---> sha256:abc123 → the layer ID assigned to this step\nSuccessfully built → image ID of the final image\nSuccessfully tagged → the -t name was applied to the image" },
    ],
  },
};

// ─── Syntax highlighting helper ──────────────────────────────────────────────

const KW_COLORS: Record<string, string> = {
  FROM: '#06B6D4', WORKDIR: '#F97316', COPY: '#EC4899', ADD: '#EC4899',
  RUN: '#8B5CF6', ENV: '#F59E0B', EXPOSE: '#14B8A6', CMD: '#10B981',
  ENTRYPOINT: '#10B981', ARG: '#94A3B8', AS: '#06B6D4',
};

const SyntaxLine = ({ text, highlight, highlightColor }: { text: string; highlight?: boolean; highlightColor?: string }) => {
  if (text.startsWith('#')) return <span style={{ color: '#475569' }}>{text}</span>;
  const parts = text.split(/(\s+)/);
  const keyword = parts[0]?.toUpperCase();
  const kwColor = KW_COLORS[keyword];

  return (
    <span className="relative block" style={highlight ? { background: 'rgba(255,255,255,0.05)', borderLeft: `3px solid ${highlightColor || kwColor || '#1F2D45'}`, paddingLeft: 6 } : { paddingLeft: 9 }}>
      {kwColor ? <><span style={{ color: kwColor }}>{parts[0]}</span><span className="text-foreground/80">{parts.slice(1).join('')}</span></> : <span className="text-foreground/80">{text}</span>}
    </span>
  );
};

const CodeEditor = ({ lines, highlightIdx, title, highlightColor }: { lines: string[]; highlightIdx?: number; title?: string; highlightColor?: string }) => (
  <div className="rounded-lg border overflow-hidden h-full flex flex-col" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
    {title && (
      <div className="shrink-0 px-3 py-1 border-b flex items-center gap-2" style={{ borderColor: '#1F2D45' }}>
        <div className="w-2 h-2 rounded-full bg-red-500/70" /><div className="w-2 h-2 rounded-full bg-amber-500/70" /><div className="w-2 h-2 rounded-full bg-emerald-500/70" />
        <span className="text-[10px] font-mono text-muted-foreground ml-1">{title}</span>
      </div>
    )}
    <div className="flex-1 overflow-y-auto p-2 font-mono text-[11px] leading-6">
      {lines.map((line, i) => (
        <div key={i} className="flex">
          <span className="w-6 shrink-0 text-right mr-2 select-none" style={{ color: '#475569', fontSize: 10 }}>{i + 1}</span>
          <SyntaxLine text={line} highlight={highlightIdx === i} highlightColor={highlightColor} />
        </div>
      ))}
    </div>
  </div>
);

// ─── Animation 1: Dockerfile Basics ──────────────────────────────────────────

const BASIC_DF = [
  '# My first Dockerfile',
  'FROM node:18-alpine',
  'WORKDIR /app',
  'COPY package.json .',
  'RUN npm install',
  'COPY . .',
  'EXPOSE 3000',
  'CMD ["node", "server.js"]',
];

const AnimBasics = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const [visibleLines, setVisibleLines] = useState(0);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => setPhase(1), 600);
    BASIC_DF.forEach((_, i) => schedule(() => setVisibleLines(i + 1), 800 + i * 180));
    schedule(() => setPhase(2), 2200);
    schedule(() => setPhase(3), 3000);
    schedule(() => setPhase(4), 3600);
    schedule(onDone, 4300);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  const ANNOTATIONS = [
    { line: 1, text: 'Base image — your starting point', color: '#06B6D4' },
    { line: 4, text: 'Execute commands during build', color: '#8B5CF6' },
    { line: 6, text: 'Document which port app uses', color: '#14B8A6' },
    { line: 7, text: 'Default command when container starts', color: '#10B981' },
  ];

  const FLOW = ['Dockerfile', 'docker build', 'Docker Image', 'docker run', 'Container'];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-3">
      {/* File icon / editor */}
      {phase === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border-2 p-6 flex flex-col items-center gap-2" style={{ borderColor: '#06B6D4', background: '#06B6D408' }}>
          <span className="text-4xl">📄</span>
          <span className="font-mono text-sm text-cyan-400 font-bold">Dockerfile</span>
          <span className="text-[10px] text-muted-foreground font-mono">A plain text file with no extension</span>
        </motion.div>
      )}

      {phase >= 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-md relative">
          <CodeEditor lines={BASIC_DF.slice(0, visibleLines)} title="Dockerfile" />

          {/* Annotations */}
          {phase >= 2 && ANNOTATIONS.map((a, i) => (
            visibleLines > a.line && (
              <motion.div key={i} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.2 }}
                className="absolute text-[9px] font-mono px-2 py-0.5 rounded border whitespace-nowrap"
                style={{ top: 28 + a.line * 24, right: -8, transform: 'translateX(100%)', borderColor: a.color, color: a.color, background: `${a.color}10` }}>
                ← {a.text}
              </motion.div>
            )
          ))}
        </motion.div>
      )}

      {/* Flow diagram */}
      {phase >= 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex items-center gap-1.5 flex-wrap justify-center">
          {FLOW.map((item, i) => (
            <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.2 }} className="flex items-center gap-1.5">
              <span className={`text-[10px] font-mono px-2 py-0.5 rounded border ${i % 2 === 0 ? 'border-cyan-500/40 text-cyan-400 bg-cyan-500/10' : 'text-muted-foreground border-border'}`}>
                {item}
              </span>
              {i < FLOW.length - 1 && <span className="text-muted-foreground text-xs">→</span>}
            </motion.span>
          ))}
        </motion.div>
      )}

      {phase >= 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-1.5 rounded-lg" style={{ background: '#06B6D410', border: '1px solid #06B6D430' }}>
          <span className="text-cyan-400 font-mono text-[11px]">A Dockerfile is a recipe. docker build cooks it into an image.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 2: Core Instructions ──────────────────────────────────────────

const INSTR_DF = [
  'FROM node:18-alpine',
  'WORKDIR /app',
  'COPY package*.json ./',
  'RUN npm ci --only=production',
  'ENV NODE_ENV=production',
  'COPY . .',
  'EXPOSE 3000',
  'CMD ["node", "server.js"]',
];

interface InstrDetail { name: string; icon: string; desc: string; example: string; color: string }
const INSTR_DETAILS: InstrDetail[] = [
  { name: 'FROM', icon: '📦', desc: 'Sets the base image for all subsequent instructions. Every Dockerfile must start with FROM.', example: 'FROM node:18-alpine', color: '#06B6D4' },
  { name: 'WORKDIR', icon: '📁', desc: "Sets the working directory inside the container. Creates it if it doesn't exist.", example: 'WORKDIR /app', color: '#F97316' },
  { name: 'COPY', icon: '📋', desc: 'Copies files from the build context (your local machine) into the container filesystem.', example: 'COPY package*.json ./', color: '#EC4899' },
  { name: 'RUN', icon: '⚙️', desc: 'Executes a command during the IMAGE BUILD process and commits the result as a new layer.', example: 'RUN npm ci --only=production', color: '#8B5CF6' },
  { name: 'ENV', icon: '🔑', desc: 'Sets environment variables that persist both during the build and when containers run.', example: 'ENV NODE_ENV=production', color: '#F59E0B' },
  { name: 'COPY', icon: '📋', desc: 'Copies remaining app source code. Placed after RUN npm install for cache optimization.', example: 'COPY . .', color: '#EC4899' },
  { name: 'EXPOSE', icon: '🔌', desc: 'Documents which port the app listens on. Metadata only — does NOT publish the port.', example: 'EXPOSE 3000', color: '#14B8A6' },
  { name: 'CMD', icon: '▶️', desc: 'Default command to run when a container starts. Only one CMD per Dockerfile. Use exec form.', example: 'CMD ["node", "server.js"]', color: '#10B981' },
];

const AnimInstructions = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [step, setStep] = useState(-1);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    INSTR_DETAILS.forEach((_, i) => schedule(() => setStep(i), i * 900));
    schedule(onDone, INSTR_DETAILS.length * 900 + 500);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  const detail = step >= 0 ? INSTR_DETAILS[step] : null;

  return (
    <div className="w-full h-full flex gap-0">
      {/* Code editor — left 55% */}
      <div className="flex-[55] p-2">
        <CodeEditor lines={INSTR_DF} highlightIdx={step >= 0 ? step : undefined} title="Dockerfile" highlightColor={detail?.color} />
      </div>
      {/* Detail panel — right 45% */}
      <div className="flex-[45] p-2 flex flex-col justify-center">
        <AnimatePresence mode="wait">
          {detail ? (
            <motion.div
              key={step}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: -20 }}
              transition={{ duration: 0.25 }}
              className="rounded-lg border p-3 space-y-2"
              style={{ borderColor: detail.color, background: `${detail.color}08` }}
            >
              <div className="flex items-center gap-2">
                <span className="text-xl">{detail.icon}</span>
                <span className="font-mono font-bold text-sm" style={{ color: detail.color }}>{detail.name}</span>
              </div>
              <p className="text-[11px] text-foreground/70 leading-relaxed">{detail.desc}</p>
              <div className="rounded px-2 py-1 font-mono text-[10px]" style={{ background: '#0D1117', border: '1px solid #1F2D45', color: detail.color }}>
                {detail.example}
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">{step + 1}/8</span>
            </motion.div>
          ) : (
            <motion.div key="empty" className="text-center text-[10px] font-mono text-muted-foreground">
              Starting instruction walkthrough...
            </motion.div>
          )}
        </AnimatePresence>

        {step >= INSTR_DETAILS.length - 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-center px-2 py-1.5 rounded" style={{ background: '#8B5CF610', border: '1px solid #8B5CF630' }}>
            <span className="text-[10px] font-mono text-purple-400">7 instructions → 1 Dockerfile → 1 Docker Image</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Animation 3: Layer Ordering ─────────────────────────────────────────────

const BAD_DF = ['FROM node:18-alpine', 'COPY . .', 'RUN npm install', 'EXPOSE 3000', 'CMD ["node", "server.js"]'];
const GOOD_DF = ['FROM node:18-alpine', 'COPY package*.json ./', 'RUN npm install', 'COPY . .', 'EXPOSE 3000', 'CMD ["node", "server.js"]'];

type CacheStatus = 'none' | 'hit' | 'miss';

const CacheBadge = ({ status }: { status: CacheStatus }) => {
  if (status === 'none') return null;
  return (
    <motion.span
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      className={`text-[8px] font-mono px-1.5 py-0.5 rounded ml-1 ${status === 'hit' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-red-500/20 text-red-400'}`}
    >
      {status === 'hit' ? '✅ CACHED' : '🔴 MISS'}
    </motion.span>
  );
};

const AnimLayerOrder = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const [badCache, setBadCache] = useState<CacheStatus[]>(BAD_DF.map(() => 'none'));
  const [goodCache, setGoodCache] = useState<CacheStatus[]>(GOOD_DF.map(() => 'none'));
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => setPhase(1), 800);
    schedule(() => setPhase(2), 1400);
    schedule(() => setBadCache(['hit', 'miss', 'miss', 'miss', 'miss']), 1500);
    schedule(() => setPhase(3), 2400);
    schedule(() => setGoodCache(['hit', 'hit', 'hit', 'miss', 'miss', 'miss']), 2500);
    schedule(() => setPhase(4), 3200);
    schedule(onDone, 4000);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2">
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Bad */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="text-[11px] font-syne font-bold text-red-400 text-center">❌ Bad Order</div>
          <div className="rounded-lg border overflow-hidden flex-1 flex flex-col" style={{ borderColor: '#EF444440', background: '#0D1117' }}>
            <div className="p-2 font-mono text-[10px] leading-6 flex-1">
              {BAD_DF.map((line, i) => (
                <div key={i} className="flex items-center">
                  <span className="w-4 shrink-0 text-right mr-1.5 select-none" style={{ color: '#475569', fontSize: 9 }}>{i + 1}</span>
                  <span className={`flex-1 px-1 rounded ${badCache[i] === 'miss' ? 'bg-red-500/10' : badCache[i] === 'hit' ? 'bg-emerald-500/5' : ''}`}>
                    <SyntaxLine text={line} />
                  </span>
                  <CacheBadge status={badCache[i]} />
                </div>
              ))}
            </div>
            {phase >= 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-2 py-1 border-t text-center" style={{ borderColor: '#1F2D45' }}>
                <span className="text-[9px] font-mono text-red-400">⏱ Rebuild: ~45 seconds</span>
                <div className="text-[8px] font-mono text-red-400/60">npm install runs every time!</div>
              </motion.div>
            )}
          </div>
        </div>
        {/* Good */}
        <div className="flex-1 flex flex-col gap-1">
          <div className="text-[11px] font-syne font-bold text-emerald-400 text-center">✅ Good Order</div>
          <div className="rounded-lg border overflow-hidden flex-1 flex flex-col" style={{ borderColor: '#10B98140', background: '#0D1117' }}>
            <div className="p-2 font-mono text-[10px] leading-6 flex-1">
              {GOOD_DF.map((line, i) => (
                <div key={i} className="flex items-center">
                  <span className="w-4 shrink-0 text-right mr-1.5 select-none" style={{ color: '#475569', fontSize: 9 }}>{i + 1}</span>
                  <span className={`flex-1 px-1 rounded ${goodCache[i] === 'miss' ? 'bg-red-500/10' : goodCache[i] === 'hit' ? 'bg-emerald-500/5' : ''}`}>
                    <SyntaxLine text={line} />
                  </span>
                  <CacheBadge status={goodCache[i]} />
                </div>
              ))}
            </div>
            {phase >= 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-2 py-1 border-t text-center" style={{ borderColor: '#1F2D45' }}>
                <span className="text-[9px] font-mono text-emerald-400">⏱ Rebuild: ~3 seconds</span>
                <div className="text-[8px] font-mono text-emerald-400/60">npm install uses cache!</div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Edit flash indicator */}
      {phase >= 1 && phase < 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: [0, 1, 0] }} transition={{ duration: 0.8 }} className="text-center text-[10px] font-mono text-amber-400">
          ✏️ App code changed...
        </motion.div>
      )}

      {/* Speed comparison */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="space-y-1.5">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-red-400 w-10">Bad</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#1F2D45' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.6 }} className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500" />
            </div>
            <span className="text-[9px] font-mono text-red-400 w-8">45s</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-emerald-400 w-10">Good</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#1F2D45' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: '7%' }} transition={{ duration: 0.6 }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400" />
            </div>
            <span className="text-[9px] font-mono text-emerald-400 w-8">3s</span>
          </div>
          <div className="text-center px-3 py-1 rounded" style={{ background: '#F9731610', border: '1px solid #F9731630' }}>
            <span className="text-[10px] font-mono text-orange-400">Rule: Order from LEAST changed to MOST changed. Dependencies before code.</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 4: Multi-Stage Builds ─────────────────────────────────────────

const AnimMultiStage = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => setPhase(1), 800);
    schedule(() => setPhase(2), 2200);
    schedule(() => setPhase(3), 2900);
    schedule(() => setPhase(4), 3500);
    schedule(onDone, 4300);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  const STAGE1 = ['FROM node:18 AS builder', 'WORKDIR /app', 'COPY package*.json ./', 'RUN npm ci', 'COPY . .', 'RUN npm run build'];
  const STAGE2 = ['FROM node:18-alpine', 'WORKDIR /app', 'COPY --from=builder /app/dist ./', 'CMD ["node", "server.js"]'];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-2 overflow-hidden">
      {/* Problem — single stage */}
      {phase === 0 && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-lg border-2 p-4 w-full max-w-sm text-center" style={{ borderColor: '#EF4444', background: '#EF444408' }}>
          <span className="font-syne font-bold text-red-400 text-sm">Single-Stage Build</span>
          <div className="mt-2 text-[9px] font-mono text-foreground/60 space-y-0.5 text-left">
            <div>• Full Node.js runtime</div><div>• npm + build tools (gcc, make)</div>
            <div>• node_modules (dev deps)</div><div>• Source code + compiled output</div>
          </div>
          <div className="mt-2 text-[10px] font-mono text-red-400">⚠️ Everything in production — 1.1 GB</div>
        </motion.div>
      )}

      {/* Two stages */}
      {phase >= 1 && (
        <div className="flex gap-3 w-full max-w-lg">
          {/* Stage 1 */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: phase >= 4 ? 0.3 : 1, x: 0 }}
            transition={{ duration: 0.4 }}
            className="flex-1 rounded-lg border overflow-hidden"
            style={{ borderColor: '#14B8A6', background: '#0D1117' }}
          >
            <div className="px-2 py-1 border-b text-center" style={{ borderColor: '#1F2D45' }}>
              <span className="text-[10px] font-syne font-bold text-teal-400">Stage 1: Builder</span>
            </div>
            <div className="p-1.5 font-mono text-[9px] leading-5">
              {STAGE1.map((l, i) => <div key={i}><SyntaxLine text={l} /></div>)}
            </div>
            <div className="px-2 py-1 text-center border-t" style={{ borderColor: '#1F2D45' }}>
              <span className="text-[9px] font-mono text-red-400/70">1.1 GB (not shipped)</span>
            </div>
          </motion.div>

          {/* Transfer animation */}
          {phase >= 2 && phase < 4 && (
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.6 }}
              className="flex items-center"
            >
              <div className="flex flex-col items-center gap-1">
                <motion.span className="text-lg" animate={{ x: [0, 8, 0] }} transition={{ repeat: Infinity, duration: 1 }}>📦</motion.span>
                <span className="text-[8px] font-mono text-teal-400 whitespace-nowrap">dist/ only</span>
              </div>
            </motion.div>
          )}

          {/* Stage 2 */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: 0.3 }}
            className="flex-1 rounded-lg border overflow-hidden"
            style={{ borderColor: phase >= 4 ? '#10B981' : '#10B98160', background: '#0D1117', boxShadow: phase >= 4 ? '0 0 16px rgba(16,185,129,0.2)' : undefined }}
          >
            <div className="px-2 py-1 border-b text-center" style={{ borderColor: '#1F2D45' }}>
              <span className="text-[10px] font-syne font-bold text-emerald-400">Stage 2: Production</span>
            </div>
            <div className="p-1.5 font-mono text-[9px] leading-5">
              {STAGE2.map((l, i) => (
                <div key={i} style={l.includes('--from=builder') ? { background: '#14B8A610' } : {}}>
                  <SyntaxLine text={l} highlight={l.includes('--from=builder')} highlightColor="#14B8A6" />
                </div>
              ))}
            </div>
            <div className="px-2 py-1 text-center border-t" style={{ borderColor: '#1F2D45' }}>
              <span className="text-[9px] font-mono text-emerald-400">95 MB (final image)</span>
            </div>
          </motion.div>
        </div>
      )}

      {/* Size comparison */}
      {phase >= 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-lg space-y-1">
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-red-400 w-16">Single</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#1F2D45' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.6 }} className="h-full rounded-full bg-gradient-to-r from-red-500 to-orange-500" />
            </div>
            <span className="text-[9px] font-mono text-red-400">1.1 GB</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[9px] font-mono text-emerald-400 w-16">Multi</span>
            <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: '#1F2D45' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: '9%' }} transition={{ duration: 0.6 }} className="h-full rounded-full bg-gradient-to-r from-emerald-500 to-green-400" />
            </div>
            <span className="text-[9px] font-mono text-emerald-400">95 MB</span>
          </div>
          <div className="text-center text-[10px] font-mono text-teal-400">91% smaller! 🎉</div>
        </motion.div>
      )}

      {phase >= 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-1.5 rounded-lg" style={{ background: '#14B8A610', border: '1px solid #14B8A630' }}>
          <span className="text-teal-400 font-mono text-[11px]">Multi-stage builds: build heavy, ship light. Industry standard.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 5: Dockerfile → Image (Build) ────────────────────────────────

interface BuildLayer { step: number; instruction: string; size: string; cached: boolean }

const BUILD_STEPS: { cmd: string; output: string[]; layer: BuildLayer }[] = [
  { cmd: '$ docker build -t my-node-app .', output: ['Sending build context to Docker daemon  2.048kB'], layer: { step: 0, instruction: '', size: '', cached: false } },
  { cmd: 'Step 1/7 : FROM node:18-alpine', output: [' ---> a6bd71249d4b'], layer: { step: 1, instruction: 'FROM node:18-alpine', size: '178MB', cached: true } },
  { cmd: 'Step 2/7 : WORKDIR /app', output: [' ---> Running in 3f4a5b6c', ' ---> 9e0f1a2b3c4d'], layer: { step: 2, instruction: 'WORKDIR /app', size: '0B', cached: false } },
  { cmd: 'Step 3/7 : COPY package*.json ./', output: [' ---> 5d6e7f8a9b0c'], layer: { step: 3, instruction: 'COPY package*.json', size: '2KB', cached: false } },
  { cmd: 'Step 4/7 : RUN npm ci --only=production', output: [' ---> Running in 1a2b3c4d', 'added 127 packages in 8.3s', ' ---> 7g8h9i0j1k2l'], layer: { step: 4, instruction: 'RUN npm ci', size: '45MB', cached: false } },
  { cmd: 'Step 5/7 : COPY . .', output: [' ---> 3m4n5o6p7q8r'], layer: { step: 5, instruction: 'COPY app code', size: '1.2MB', cached: false } },
  { cmd: 'Step 6/7 : EXPOSE 3000', output: [' ---> 5y6z7a8b9c0d'], layer: { step: 6, instruction: 'EXPOSE 3000', size: '0B', cached: false } },
  { cmd: 'Step 7/7 : CMD ["node", "server.js"]', output: [' ---> 7k8l9m0n1o2p'], layer: { step: 7, instruction: 'CMD', size: '0B', cached: false } },
];

const AnimBuild = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean }[]>([]);
  const [layers, setLayers] = useState<BuildLayer[]>([]);
  const [done, setDone] = useState(false);
  const [spinning, setSpinning] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [termLines.length]);

  useEffect(() => {
    let time = 0;
    BUILD_STEPS.forEach((s, idx) => {
      const extra = idx === 4 ? 600 : 0;
      schedule(() => {
        setTermLines(p => [...p, { text: s.cmd, isCmd: idx === 0 }]);
        if (idx === 4) setSpinning(true);
        s.output.forEach((line, j) => {
          schedule(() => {
            setTermLines(p => [...p, { text: line }]);
            if (idx === 4 && j === s.output.length - 1) setSpinning(false);
          }, (j + 1) * 150 + extra);
        });
        if (s.layer.step > 0) {
          schedule(() => setLayers(p => [...p, s.layer]), s.output.length * 150 + extra + 50);
        }
      }, time);
      time += 500 + extra;
    });

    schedule(() => {
      setTermLines(p => [...p, { text: 'Successfully built 7k8l9m0n1o2p', isSuccess: true }, { text: 'Successfully tagged my-node-app:latest ✓', isSuccess: true }]);
      setDone(true);
    }, time + 200);
    schedule(onDone, time + 800);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  return (
    <div className="w-full h-full flex gap-0">
      {/* Terminal — left 55% */}
      <div className="flex-[55] flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
          <div className="w-2 h-2 rounded-full bg-red-500/70" /><div className="w-2 h-2 rounded-full bg-amber-500/70" /><div className="w-2 h-2 rounded-full bg-emerald-500/70" />
          <span className="text-[10px] font-mono text-muted-foreground ml-1">docker build</span>
          {spinning && <motion.span animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 0.8, ease: 'linear' }} className="text-[10px]">⏳</motion.span>}
        </div>
        <div ref={scrollRef} className="terminal-black p-3 overflow-y-auto font-mono text-[10px] leading-5 flex-1">
          {termLines.map((line, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.12 }}>
              {line.isCmd ? <><span className="text-emerald-400">$ </span><span className="text-foreground">{line.text.slice(2)}</span></> : line.isSuccess ? <span className="text-emerald-400">{line.text}</span> : <span className="text-foreground/50">{line.text}</span>}
            </motion.div>
          ))}
        </div>
      </div>
      {/* Layer stack — right 45% */}
      <div className="flex-[45] flex flex-col overflow-hidden" style={{ background: '#0F172A' }}>
        <div className="shrink-0 px-3 py-1.5 border-b text-center" style={{ borderColor: '#1F2D45' }}>
          <span className="text-[10px] font-syne font-bold text-emerald-400">Layer Stack</span>
        </div>
        <div className="flex-1 overflow-y-auto p-2 flex flex-col-reverse gap-1">
          <AnimatePresence>
            {layers.map(l => (
              <motion.div
                key={l.step}
                initial={{ opacity: 0, y: 20, scale: 0.96 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 25 }}
                className="rounded border-l-[3px] px-2 py-1.5 flex items-center justify-between"
                style={{ borderLeftColor: l.cached ? '#10B981' : '#06B6D4', background: '#111827', borderTop: '1px solid #1F2D45', borderRight: '1px solid #1F2D45', borderBottom: '1px solid #1F2D45' }}
              >
                <div>
                  <span className="text-[9px] font-mono text-muted-foreground">Step {l.step} </span>
                  <span className="text-[9px] font-mono text-foreground/80">{l.instruction}</span>
                </div>
                <div className="flex items-center gap-1.5">
                  <span className="text-[8px] font-mono text-muted-foreground">{l.size}</span>
                  <span className={`text-[8px] font-mono px-1 py-0.5 rounded ${l.cached ? 'bg-emerald-500/20 text-emerald-400' : 'bg-cyan-500/20 text-cyan-400'}`}>
                    {l.cached ? 'CACHED' : 'NEW'}
                  </span>
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {done && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="shrink-0 px-2 py-2 border-t text-center" style={{ borderColor: '#1F2D45' }}>
            <span className="text-[10px] font-mono text-emerald-400 font-bold">my-node-app:latest (224 MB)</span>
            <div className="text-[9px] font-mono text-emerald-400/60 mt-0.5">7 instructions → 7 layers → 1 image</div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Main Level 7 Page ───────────────────────────────────────────────────────

const Level7Interactive = () => {
  const navigate = useNavigate();
  const { completeLevel, completedLevels } = useGameStore();
  const [completed, setCompleted] = useState<Set<TopicId>>(new Set());
  const [active, setActive] = useState<TopicId | null>(null);
  const [animating, setAnimating] = useState(false);
  const [infoLines, setInfoLines] = useState<{ text: string; type: 'cmd' | 'output' }[]>([]);
  const [localXP, setLocalXP] = useState(0);
  const [levelDone, setLevelDone] = useState(false);
  const [paused, setPaused] = useState(false);
  const logTimers = usePausableTimers(paused);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [infoLines]);

  const runTopic = useCallback((id: TopicId) => {
    if (animating) return;
    setPaused(false);
    setActive(id);
    setAnimating(true);
    const log = INFO_LOGS[id];
    const allLines = [{ text: log.prefix, type: 'cmd' as const }, ...log.lines.map(l => ({ text: l, type: 'output' as const }))];
    allLines.forEach((line, i) => { logTimers.schedule(() => setInfoLines(prev => [...prev, line]), i * 120); });
  }, [animating, logTimers]);

  const handleAnimDone = useCallback(() => {
    if (!active) return;
    const wasNew = !completed.has(active);
    const next = new Set(completed);
    next.add(active);
    setCompleted(next);
    setAnimating(false);
    if (wasNew) setLocalXP(prev => prev + 20);
    if (wasNew && !completedLevels.includes(7)) completeLevel(7);

    if (next.size === 5 && !levelDone) {
      setLevelDone(true);
    }
  }, [active, completed, levelDone, completedLevels, completeLevel]);

  const animKey = active ? `${active}-${Date.now()}` : '';

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#070B14' }}>
      {/* Navbar */}
      <nav className="shrink-0 border-b border-border px-4 py-2.5 flex items-center justify-between" style={{ background: '#0F172A' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground text-sm mr-2">←</button>
          <span className="text-xl">🐳</span>
          <div>
            <h1 className="font-syne font-bold text-accent text-sm tracking-wide">DOCKER QUEST</h1>
            <p className="text-[10px] text-muted-foreground font-mono">Level 7 — Dockerfile</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-syne font-bold text-amber-400 text-sm">⚡ {localXP}</span>
          <div className="hidden sm:flex items-center gap-1.5">
            {TOPICS.map(t => (
              <div key={t.id} className="w-2.5 h-2.5 rounded-full border transition-colors duration-300" style={{ borderColor: completed.has(t.id) ? t.color : '#1F2D45', backgroundColor: completed.has(t.id) ? t.color : 'transparent' }} />
            ))}
          </div>
          <span className="text-xs font-mono text-muted-foreground">{completed.size}/5</span>
        </div>
      </nav>

      {/* Level Complete Banner */}
      <AnimatePresence>
        {levelDone && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="shrink-0 bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-3 flex items-center justify-between">
            <span className="font-syne font-bold text-emerald-400 text-sm">🎉 Level 7 Complete! +100 XP — You can write production Dockerfiles!</span>
            <button onClick={() => navigate('/level/8')} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-syne font-bold text-xs hover:opacity-90 transition-opacity">Continue to Level 8 →</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Panel */}
        <div className="flex-[58] flex flex-col min-h-0 border-r border-border">
          {/* Topic Bar */}
          <div className="shrink-0 flex items-center gap-2 p-3 border-b border-border overflow-x-auto" style={{ background: '#0F172A' }}>
            {TOPICS.map(topic => {
              const isDone = completed.has(topic.id);
              const isActive = active === topic.id && animating;
              const isDisabled = animating && !isActive;
              return (
                <button key={topic.id} onClick={() => runTopic(topic.id)} disabled={isDisabled}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono whitespace-nowrap transition-all duration-200 ${isActive ? `${topic.bgTint} ${topic.borderClass} ${topic.colorClass}` : isDone ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' : 'bg-secondary/30 border-border text-muted-foreground hover:border-muted-foreground/50'} ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={isActive ? { boxShadow: topic.glowStyle } : {}}>
                  <span className="text-xs">{isDone ? '✓' : topic.icon}</span>{topic.label}
                </button>
              );
            })}
          </div>

          {/* Canvas */}
          <div className="flex-1 relative dot-grid-24 overflow-hidden min-h-[200px]">
            <AnimatePresence mode="wait">
              {!active && !animating && (
                <motion.div key="idle" className="absolute inset-0 flex flex-col items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.span className="text-6xl" animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }}>🐳</motion.span>
                  <p className="text-sm text-muted-foreground mt-4 font-mono">Click a topic above to see it animated</p>
                </motion.div>
              )}
              {active && (
                <motion.div key={animKey} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TOPICS.find(t => t.id === active)!.color }} />
                    <span className="text-xs font-mono" style={{ color: TOPICS.find(t => t.id === active)!.color }}>{TOPICS.find(t => t.id === active)!.label}</span>
                  </div>
                  <div className="absolute inset-0 pt-8">
                    {active === 'basics' && <AnimBasics onDone={handleAnimDone} paused={paused} />}
                    {active === 'instructions' && <AnimInstructions onDone={handleAnimDone} paused={paused} />}
                    {active === 'layer-order' && <AnimLayerOrder onDone={handleAnimDone} paused={paused} />}
                    {active === 'multi-stage' && <AnimMultiStage onDone={handleAnimDone} paused={paused} />}
                    {active === 'build' && <AnimBuild onDone={handleAnimDone} paused={paused} />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            {animating && (
              <button onClick={() => setPaused(p => !p)}
                className="absolute bottom-3 right-3 z-30 w-8 h-8 rounded-full border flex items-center justify-center text-sm transition-colors"
                style={{ borderColor: paused ? '#10B98150' : '#ffffff20', background: paused ? '#10B98115' : '#070B14CC', color: paused ? '#10B981' : '#94A3B8' }}
                title={paused ? 'Resume' : 'Pause'}>
                {paused ? '▶' : '⏸'}
              </button>
            )}
          </div>

          {/* Terminal Log */}
          <div className="shrink-0 border-t border-border" style={{ height: 200 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: '#0D1117' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-[10px] font-mono text-muted-foreground ml-1">docker-quest build log</span>
            </div>
            <div ref={logRef} className="terminal-black p-3 overflow-y-auto font-mono text-[13px] leading-5" style={{ height: 'calc(200px - 28px)' }}>
              {infoLines.length === 0 ? (
                <span className="text-muted-foreground/50">{'> Click a topic to learn about Dockerfiles...'}<span className="inline-block w-2 h-4 bg-muted-foreground/50 ml-1" style={{ animation: 'blink 1s infinite' }} /></span>
              ) : infoLines.map((line, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                  {line.type === 'cmd' ? <span className="text-emerald-400">{line.text}</span> : <span className="text-foreground/70">{line.text}</span>}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-[42] overflow-y-auto min-h-0" style={{ background: '#0F172A' }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><span>📖</span><h2 className="font-syne font-bold text-foreground text-sm">Dockerfile Reference</h2></div>
              <span className="text-[10px] text-muted-foreground font-mono">Level 7 — Dockerfile</span>
            </div>

            {/* Intro card */}
            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: '#1E3A5F', background: '#0F172A' }}>
              <h3 className="font-syne font-bold text-foreground text-sm mb-2">📄 The Dockerfile</h3>
              <p className="text-xs text-foreground/70 leading-relaxed">
                A Dockerfile is a plain text script that contains all the instructions needed
                to assemble a Docker image. You write a Dockerfile, run docker build, and Docker
                executes each instruction in order — producing a layered, portable, reproducible
                image. A good Dockerfile is the foundation of every Docker-based application.
                Writing them well is the difference between 45-second rebuilds and 3-second ones.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['Build', 'Layers', 'Reproducible', 'Optimized', 'Multi-Stage'].map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-mono text-accent border border-accent/30 bg-accent/5">{tag}</span>
                ))}
              </div>
            </div>

            {/* Concept cards */}
            {TOPICS.map(topic => {
              const data = CARD_DATA[topic.id];
              const isDone = completed.has(topic.id);
              const isActive = active === topic.id;
              return (
                <motion.div key={topic.id} onClick={() => runTopic(topic.id)}
                  className={`rounded-lg border p-3 mb-3 cursor-pointer transition-all duration-300 ${isActive ? `${topic.borderClass} ${topic.bgTint}` : isDone ? 'border-emerald-500/30 bg-card' : 'border-border bg-card hover:border-muted-foreground/30'}`}
                  style={isActive ? { boxShadow: topic.glowStyle, transform: 'scale(1.01)' } : {}} layout>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: topic.color }} />
                      <span className={`font-mono font-bold text-xs ${isActive ? topic.colorClass : isDone ? 'text-emerald-400' : 'text-foreground'}`}>{data.heading}</span>
                    </div>
                    {isDone && <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">✓ Completed</span>}
                  </div>
                  <div className="space-y-2">
                    {data.sections.map((section, i) => (
                      <div key={i}>
                        <span className="text-[10px] font-syne font-bold text-muted-foreground uppercase tracking-wider">{section.title}</span>
                        <p className="text-[11px] text-foreground/60 leading-relaxed whitespace-pre-line">{section.text}</p>
                      </div>
                    ))}
                  </div>
                </motion.div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Level7Interactive;
