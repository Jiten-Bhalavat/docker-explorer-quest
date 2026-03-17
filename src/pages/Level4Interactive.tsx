import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { usePausableTimers } from '@/hooks/usePausableTimers';

type TopicId = 'what-is-image' | 'layers' | 'docker-hub' | 'tags' | 'managing';

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
  { id: 'what-is-image', label: 'What is an Image', icon: '🖼️', color: '#06B6D4', colorClass: 'text-cyan-400', borderClass: 'border-cyan-500', bgTint: 'bg-cyan-500/10', glowStyle: '0 0 12px rgba(6,182,212,0.4)' },
  { id: 'layers', label: 'Image Layers', icon: '🗂️', color: '#8B5CF6', colorClass: 'text-purple-400', borderClass: 'border-purple-500', bgTint: 'bg-purple-500/10', glowStyle: '0 0 12px rgba(139,92,246,0.4)' },
  { id: 'docker-hub', label: 'Docker Hub', icon: '☁️', color: '#F97316', colorClass: 'text-orange-400', borderClass: 'border-orange-500', bgTint: 'bg-orange-500/10', glowStyle: '0 0 12px rgba(249,115,22,0.4)' },
  { id: 'tags', label: 'Image Tags', icon: '🏷️', color: '#EC4899', colorClass: 'text-pink-400', borderClass: 'border-pink-500', bgTint: 'bg-pink-500/10', glowStyle: '0 0 12px rgba(236,72,153,0.4)' },
  { id: 'managing', label: 'Managing Images', icon: '🛠️', color: '#F59E0B', colorClass: 'text-amber-400', borderClass: 'border-amber-500', bgTint: 'bg-amber-500/10', glowStyle: '0 0 12px rgba(245,158,11,0.4)' },
];

const INFO_LOGS: Record<TopicId, { prefix: string; lines: string[] }> = {
  'what-is-image': {
    prefix: '> Loading: Docker Image Fundamentals',
    lines: [
      '# A Docker image is a read-only template used to create containers',
      '# Images are stored as a stack of immutable layers',
      '# One image can spawn unlimited containers simultaneously',
      '# Images are identified by: name + tag (e.g. nginx:latest)',
      '# Images live in registries (Docker Hub, ECR, GCR, private registries)',
      '> Concept loaded ✓',
    ],
  },
  layers: {
    prefix: '> Loading: Layer Architecture',
    lines: [
      '# Every instruction in a Dockerfile creates a new image layer',
      '# Layers are cached — unchanged layers are never re-downloaded',
      '# docker history nginx  →  shows all layers of an image',
      '$ docker history nginx',
      '  IMAGE        CREATED      CREATED BY                SIZE',
      '  a6bd712...   2 weeks ago  /bin/sh -c #(nop) CMD     0B',
      '  <missing>    2 weeks ago  /bin/sh -c apt-get...     58.3MB',
      '  <missing>    2 weeks ago  /bin/sh -c #(nop) FROM    77.8MB',
      "# Layer caching is why 'docker build' is fast on second run",
      '> Layer architecture loaded ✓',
    ],
  },
  'docker-hub': {
    prefix: '> Loading: Docker Hub Registry',
    lines: [
      '$ docker search nginx',
      '  NAME        DESCRIPTION              STARS   OFFICIAL',
      '  nginx       Official build of Nginx  19382   [OK]',
      '  unit        Official build of nginx  28      [OK]',
      '# Official images: maintained by Docker, regularly security-patched',
      '# Verified Publisher images: maintained by software vendors',
      '# Always check star count and last updated date before using',
      '> Registry exploration complete ✓',
    ],
  },
  tags: {
    prefix: '> Loading: Image Tagging System',
    lines: [
      '$ docker pull nginx:1.25.3',
      '  1.25.3: Pulling from library/nginx ✓',
      '$ docker pull nginx:alpine',
      '  alpine: Pulling from library/nginx ✓',
      '  Image size: 23.4 MB  (vs 142 MB for nginx:latest)',
      '# :alpine variants use Alpine Linux as base — much smaller images',
      '# Pin versions in Dockerfile: FROM nginx:1.25.3 not FROM nginx:latest',
      '> Tagging concepts loaded ✓',
    ],
  },
  managing: {
    prefix: '> Loading: Image Management Commands',
    lines: [
      '$ docker images              # list all local images',
      '$ docker pull <image>:<tag>  # download from registry',
      '$ docker image inspect <id>  # detailed metadata',
      '$ docker rmi <image>         # remove specific image',
      '$ docker image prune         # remove all dangling images',
      '$ docker image prune -a      # remove ALL unused images',
      '# Tip: docker system df  →  shows disk space used by Docker',
      '> Image management loaded ✓',
    ],
  },
};

interface CardSection { title: string; text: string }

const CARD_DATA: Record<TopicId, { heading: string; sections: CardSection[] }> = {
  'what-is-image': {
    heading: 'Docker Images Explained',
    sections: [
      { title: 'The core idea', text: 'A Docker image is like a snapshot of a filesystem. It contains a complete environment — operating system files, application code, dependencies, and configuration — all frozen at a point in time. It never changes once built.' },
      { title: 'Image vs Container', text: 'The relationship between an image and a container is like a class and an object in programming. The image is the class definition (static blueprint). The container is an instance of that class (running, dynamic, disposable). You can create thousands of containers from one image simultaneously.' },
      { title: 'Where images live', text: 'Images are stored in registries. Docker Hub is the default public registry. Enterprises often use private registries like AWS ECR (Elastic Container Registry), Google GCR, GitHub Container Registry, or self-hosted Harbor.' },
      { title: 'Key command', text: 'docker pull nginx  — downloads an image from Docker Hub to your machine\ndocker images      — lists all images stored locally' },
    ],
  },
  layers: {
    heading: 'The Layer Architecture',
    sections: [
      { title: 'How layers work', text: 'Every Docker image is built from a stack of read-only layers. Each layer represents a change to the filesystem — adding files, installing packages, changing configuration. Layers are stacked on top of each other, and Docker merges them into a single unified filesystem view using a union filesystem (overlayFS on Linux).' },
      { title: 'Why layers matter — caching', text: "Layers are identified by a SHA256 hash of their content. If a layer hasn't changed, Docker reuses the cached version instead of re-downloading or re-building it. This is why the second docker build is much faster than the first — most layers are already cached locally." },
      { title: 'Layer sharing', text: 'If two images share the same base layer (e.g., both use ubuntu:22.04), that layer is stored once on disk and shared. This saves significant disk space when running many containers on one machine.' },
      { title: 'Inspect layers', text: 'Run: docker history <image-name>  to see every layer, its size, and the command that created it.' },
    ],
  },
  'docker-hub': {
    heading: 'Docker Hub — The Image Registry',
    sections: [
      { title: 'What it is', text: "Docker Hub (hub.docker.com) is the world's largest library of container images. It hosts over 100,000 public images — everything from operating systems (ubuntu, alpine) to databases (postgres, mysql, redis) to web servers (nginx, apache) to language runtimes (node, python, java)." },
      { title: 'Image types', text: 'Official Images are maintained by Docker in partnership with software vendors. They are regularly scanned for vulnerabilities and follow best practices. Always prefer official images for production use.\nVerified Publisher images come from software companies (MongoDB, Redis, etc.) and are also trustworthy. Community images are user-contributed and should be used with caution — check stars and last updated date.' },
      { title: 'Searching', text: 'docker search nginx  — searches Docker Hub from the terminal\nOr browse hub.docker.com in your browser for full details, tags, and docs.' },
      { title: 'Rate limits', text: 'Docker Hub has pull rate limits for unauthenticated users: 100 pulls per 6 hours. Create a free Docker Hub account to raise this to 200 pulls/6hr. In CI/CD pipelines, always authenticate to avoid hitting rate limits.' },
    ],
  },
  tags: {
    heading: 'Image Tags and Versioning',
    sections: [
      { title: 'What tags are', text: "An image tag is a label that identifies a specific version of an image. The full image reference format is: registry/repository:tag\nFor example: docker.io/library/nginx:1.25.3\nWhen you just write 'nginx', Docker expands it to docker.io/library/nginx:latest" },
      { title: 'The :latest problem', text: ":latest is the default tag assigned when no tag is specified during a push. It does NOT always mean the newest version — it's just whatever the image maintainer last tagged as 'latest'. In production, always pin to a specific version tag like nginx:1.25.3 to guarantee reproducible deployments." },
      { title: 'Useful tag patterns', text: 'nginx:1.25.3      — exact patch version (most reproducible)\nnginx:1.25        — minor version (gets patches automatically)\nnginx:alpine      — alpine Linux variant (smallest, ~23 MB)\nnginx:stable      — named release channel\nnginx:mainline    — latest development version' },
      { title: 'Alpine variants', text: 'Images with the :alpine tag use Alpine Linux as the base OS instead of Debian/Ubuntu. Alpine is only 5 MB and produces much smaller images. Use alpine variants in production to reduce image size and attack surface.' },
    ],
  },
  managing: {
    heading: 'Essential Image Management Commands',
    sections: [
      { title: 'Listing and inspecting', text: 'docker images              — list all local images with size and tag\ndocker images -a           — include intermediate (hidden) layers\ndocker image inspect nginx — full JSON metadata: layers, env vars, ports\ndocker history nginx       — show layer-by-layer build history' },
      { title: 'Removing images', text: 'docker rmi nginx           — remove image by name (must stop containers first)\ndocker rmi a6bd71249d4b    — remove by image ID\ndocker image prune         — remove dangling images (untagged/unused)\ndocker image prune -a      — remove ALL images not used by a container\ndocker system prune        — nuclear option: removes everything unused' },
      { title: 'Saving and loading', text: 'docker save nginx -o nginx.tar   — export image to a tar file\ndocker load -i nginx.tar         — import image from a tar file\nUseful for air-gapped environments with no internet access.' },
      { title: 'Disk usage', text: "docker system df   — shows disk usage breakdown:\nImages, Containers, Local Volumes, Build Cache\nRun this when your disk fills up — Docker images accumulate fast." },
    ],
  },
};

// ─── Animation 1: What is a Docker Image ─────────────────────────────────────

const AnimWhatIsImage = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const { schedule, clearAll } = usePausableTimers(paused);
  useEffect(() => { schedule(onDone, 3200); return clearAll; }, [onDone, schedule, clearAll]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-3">
      <div className="flex items-center gap-6 flex-wrap justify-center">
        {/* Blueprint / Image */}
        <motion.div
          initial={{ opacity: 0, x: -20 }}
          animate={{ opacity: 1, x: 0 }}
          className="flex flex-col items-center gap-2"
        >
          <div
            className="w-28 h-32 rounded-lg border-2 flex flex-col items-center justify-center relative overflow-hidden"
            style={{ borderColor: '#06B6D4', background: '#06B6D408' }}
          >
            <div className="absolute inset-0 opacity-10" style={{ backgroundImage: 'repeating-linear-gradient(0deg, #06B6D4 0px, transparent 1px, transparent 12px), repeating-linear-gradient(90deg, #06B6D4 0px, transparent 1px, transparent 12px)' }} />
            <span className="text-3xl z-10">🖼️</span>
            <span className="text-[10px] font-mono text-cyan-400 z-10 mt-1 font-bold">Docker Image</span>
          </div>
          <span className="text-[9px] text-muted-foreground font-mono">Read-only template</span>
        </motion.div>

        {/* Arrows */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }} className="flex flex-col items-center gap-1">
          {[0, 1, 2].map(i => (
            <svg key={i} width="60" height="12"><line x1="0" y1="6" x2="60" y2="6" stroke="#06B6D4" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" style={{ animation: 'dashFlow 1.2s linear infinite' }} /></svg>
          ))}
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="text-[9px] font-mono text-cyan-400 mt-1">docker run</motion.span>
        </motion.div>

        {/* Containers */}
        <div className="flex flex-col gap-2">
          {[1, 2, 3].map((c, i) => (
            <motion.div
              key={c}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.6 + i * 0.25 }}
              className="rounded-lg border-2 px-3 py-1.5 flex items-center gap-2"
              style={{ borderColor: '#10B98150', boxShadow: '0 0 10px rgba(16,185,129,0.15)' }}
            >
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 animate-pulse" />
              <span className="text-[10px] font-mono text-emerald-400">Container {c}</span>
              <span className="text-[8px] font-mono text-emerald-400/60">● RUNNING</span>
            </motion.div>
          ))}
          <span className="text-[9px] text-muted-foreground font-mono text-center">Running instances</span>
        </div>
      </div>

      {/* 1 Image → Many Containers label */}
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.9 }}>
        <span className="text-sm font-syne font-bold text-cyan-400">1 Image → Many Containers</span>
      </motion.div>

      {/* Comparison row */}
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.4 }} className="flex flex-col gap-1 items-center">
        <div className="flex gap-4 text-[10px] font-mono">
          <span className="text-cyan-400">🖼️ Image = Blueprint (read-only, immutable)</span>
          <span className="text-emerald-400">📦 Container = Running instance (writable, temporary)</span>
        </div>
        <div className="mt-1 px-4 py-1.5 rounded-lg" style={{ background: '#06B6D410', border: '1px solid #06B6D430' }}>
          <span className="text-cyan-400 font-mono text-[11px]">An image is immutable. A container is a running copy of it.</span>
        </div>
      </motion.div>
    </div>
  );
};

// ─── Animation 2: Image Layers ───────────────────────────────────────────────

const LAYERS = [
  { label: 'Layer 1: Base OS', detail: 'ubuntu:22.04', icon: '📦', size: '77 MB', type: 'base image', bg: '#1E1040' },
  { label: 'Layer 2: Runtime', detail: 'node:18', icon: '⚙️', size: '180 MB', type: 'RUN apt-get', bg: '#261450' },
  { label: 'Layer 3: Dependencies', detail: 'npm install', icon: '📚', size: '45 MB', type: 'RUN npm install', bg: '#2E1860' },
  { label: 'Layer 4: App Code', detail: 'COPY . /app', icon: '💻', size: '2 MB', type: 'COPY', bg: '#361C70' },
  { label: 'Layer 5: Config', detail: 'CMD node server.js', icon: '▶️', size: '1 KB', type: 'CMD metadata', bg: '#3E2080' },
];

const AnimLayers = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const { schedule, clearAll } = usePausableTimers(paused);
  useEffect(() => { schedule(onDone, 3600); return clearAll; }, [onDone, schedule, clearAll]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4">
      <div className="flex items-start gap-3">
        {/* Layer stack — built bottom to top visually, so reverse order in DOM */}
        <div className="flex flex-col-reverse gap-1">
          {LAYERS.map((layer, i) => (
            <motion.div
              key={layer.label}
              initial={{ opacity: 0, y: 30, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              transition={{ delay: i * 0.5, duration: 0.4, ease: [0.34, 1.56, 0.64, 1] }}
              className="rounded-lg border px-4 py-1.5 flex items-center gap-3 w-80"
              style={{ borderColor: '#8B5CF650', background: layer.bg }}
            >
              <span className="text-sm">{layer.icon}</span>
              <div className="flex-1 min-w-0">
                <div className="text-[10px] font-mono text-purple-300 font-bold">{layer.label} — {layer.detail}</div>
                <div className="text-[9px] text-muted-foreground">Size: {layer.size} &nbsp;|&nbsp; {layer.type}</div>
              </div>
            </motion.div>
          ))}
        </div>

        {/* Bracket label */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.6 }}
          className="flex items-center gap-1 self-stretch"
        >
          <svg width="16" height="100%" className="shrink-0">
            <line x1="8" y1="4" x2="8" y2="96%" stroke="#8B5CF6" strokeWidth="2" opacity="0.5" />
            <line x1="0" y1="4" x2="8" y2="4" stroke="#8B5CF6" strokeWidth="2" opacity="0.5" />
            <line x1="0" y1="96%" x2="8" y2="96%" stroke="#8B5CF6" strokeWidth="2" opacity="0.5" />
          </svg>
          <div className="text-[10px] font-mono text-purple-400 whitespace-nowrap">
            <div className="font-bold">Docker Image</div>
            <div className="text-muted-foreground">(304 MB total)</div>
          </div>
        </motion.div>
      </div>

      {/* Key facts */}
      <div className="mt-3 flex flex-col gap-1 items-center">
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.8 }} className="text-[10px] font-mono text-purple-300">
          🔒 Each layer is READ-ONLY and cached independently
        </motion.span>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 3.1 }} className="text-[10px] font-mono text-purple-300">
          ⚡ Unchanged layers are reused — rebuilds only re-run changed layers
        </motion.span>
      </div>

      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 3.3 }}
        className="mt-2 px-4 py-1.5 rounded-lg"
        style={{ background: '#8B5CF610', border: '1px solid #8B5CF630' }}
      >
        <span className="text-purple-400 font-mono text-[11px]">Images = stacked read-only layers. Containers add one writable layer on top.</span>
      </motion.div>
    </div>
  );
};

// ─── Animation 3: Docker Hub ─────────────────────────────────────────────────

const HUB_IMAGES = [
  { name: 'nginx', pulls: '1B+' },
  { name: 'ubuntu', pulls: '500M+' },
  { name: 'node', pulls: '800M+' },
  { name: 'postgres', pulls: '300M+' },
  { name: 'redis', pulls: '400M+' },
  { name: 'python', pulls: '600M+' },
];

const AnimDockerHub = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => setPhase(1), 1200);
    schedule(() => setPhase(2), 1800);
    schedule(() => setPhase(3), 2400);
    schedule(onDone, 3200);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-3">
      {/* Docker Hub cloud */}
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="flex flex-col items-center gap-1">
        <div className="text-3xl">☁️</div>
        <div className="rounded-lg border px-4 py-1" style={{ borderColor: '#F9731650', background: '#F9731610' }}>
          <span className="text-xs font-mono font-bold text-orange-400">Docker Hub</span>
        </div>
        <span className="text-[9px] font-mono text-muted-foreground">hub.docker.com</span>
      </motion.div>

      {/* 2x3 image card grid */}
      <div className="grid grid-cols-3 gap-2">
        {HUB_IMAGES.map((img, i) => (
          <motion.div
            key={img.name}
            initial={{ opacity: 0, scale: 0.85 }}
            animate={{ opacity: 1, scale: phase >= 1 && img.name === 'nginx' ? 1.05 : 1 }}
            transition={{ delay: 0.5 + i * 0.12, duration: 0.3 }}
            className={`rounded-lg border p-2 text-center transition-all duration-300 ${phase >= 1 && img.name === 'nginx' ? 'ring-2 ring-orange-400/50' : ''}`}
            style={{ borderColor: phase >= 1 && img.name === 'nginx' ? '#F97316' : '#1F2D45', background: '#111827' }}
          >
            <div className="text-[11px] font-mono font-bold text-foreground">{img.name}</div>
            <div className="flex items-center justify-center gap-1 mt-0.5">
              <span className="text-[8px] text-emerald-400">Official ✓</span>
            </div>
            <div className="text-[8px] text-muted-foreground">⭐ {img.pulls} pulls</div>
          </motion.div>
        ))}
      </div>

      {/* Pull arrow + laptop */}
      {phase >= 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-1">
          <svg width="20" height="24"><line x1="10" y1="0" x2="10" y2="24" stroke="#F97316" strokeWidth="2" strokeDasharray="6 4" opacity="0.6" style={{ animation: 'dashFlow 1.2s linear infinite' }} /></svg>
          <span className="text-[9px] font-mono text-orange-400">docker pull nginx</span>
        </motion.div>
      )}

      {phase >= 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-1">
          <span className="text-xl">💻</span>
          <div className="h-1.5 w-32 rounded-full bg-secondary/50 overflow-hidden">
            <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.6 }} className="h-full rounded-full" style={{ background: 'linear-gradient(90deg, #F9731680, #F97316)' }} />
          </div>
          <span className="text-[9px] font-mono text-emerald-400">nginx:latest ✓ 142 MB stored locally</span>
        </motion.div>
      )}

      {/* Category labels */}
      {phase >= 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 text-[9px] font-mono">
          <span className="text-orange-300">🏛️ Official — maintained by Docker</span>
          <span className="text-emerald-300">✅ Verified — trusted companies</span>
          <span className="text-muted-foreground">👤 Community — user-contributed</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 4: Image Tags ─────────────────────────────────────────────────

const TAG_ROWS = [
  { tag: 'latest', note: 'points to → nginx:1.25.3', arrow: true },
  { tag: '1.25.3', note: 'specific version' },
  { tag: '1.25', note: 'minor version' },
  { tag: '1', note: 'major version' },
  { tag: 'stable', note: 'named channel' },
  { tag: 'alpine', note: 'lightweight — only 23 MB!', special: true },
];

const AnimTags = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => setPhase(1), 500);
    schedule(() => setPhase(2), 1400);
    schedule(() => setPhase(3), 2000);
    schedule(() => setPhase(4), 2500);
    schedule(onDone, 3200);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-3 overflow-hidden">
      {/* Image name + tag */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1">
        <div className="rounded-lg border-2 px-4 py-2" style={{ borderColor: '#EC489950', background: '#EC489910' }}>
          <span className="text-sm font-mono font-bold text-pink-400">nginx</span>
        </div>
        <span className="text-lg font-mono text-pink-400 font-bold">:</span>
        <span className="text-[10px] font-mono text-muted-foreground">TAG</span>
      </motion.div>

      {/* Tag variants */}
      {phase >= 1 && (
        <div className="flex flex-col gap-1 max-w-sm w-full">
          {TAG_ROWS.map((row, i) => (
            <motion.div
              key={row.tag}
              initial={{ opacity: 0, x: 20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: i * 0.15, duration: 0.3 }}
              className="flex items-center gap-2"
            >
              <span className="text-[10px] font-mono text-pink-300 w-10 text-right shrink-0">nginx:</span>
              <span className={`px-2 py-0.5 rounded-full border text-[10px] font-mono font-bold ${row.special ? 'border-emerald-500/50 bg-emerald-500/10 text-emerald-400' : 'border-pink-500/40 bg-pink-500/10 text-pink-400'}`}>
                {row.tag}
              </span>
              {row.arrow && <span className="text-[9px] font-mono text-cyan-400">← points to → nginx:1.25.3</span>}
              {!row.arrow && <span className="text-[9px] font-mono text-muted-foreground">{row.note}</span>}
              {row.special && <span className="text-[8px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">⚡ Lightweight</span>}
            </motion.div>
          ))}
        </div>
      )}

      {/* Warning card */}
      {phase >= 2 && (
        <motion.div
          initial={{ opacity: 0, scale: 0.9, x: -20 }}
          animate={{ opacity: 1, scale: 1, x: 0 }}
          transition={{ type: 'spring', stiffness: 300, damping: 25 }}
          className="rounded-lg border p-3 max-w-sm w-full"
          style={{ borderColor: '#F59E0B50', background: '#F59E0B08' }}
        >
          <span className="text-xs font-syne font-bold text-amber-400">⚠️ The :latest Tag Trap</span>
          <p className="text-[10px] text-foreground/60 mt-1 leading-relaxed">
            :latest is not always the newest version. It&apos;s just the default tag when none is specified. In production, always pin to a specific version.
          </p>
        </motion.div>
      )}

      {/* Side by side comparison */}
      {phase >= 3 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-4 text-[10px] font-mono">
          <div className="rounded border px-3 py-1.5 text-center" style={{ borderColor: '#EF444440', background: '#EF444410' }}>
            <span className="text-red-400">✗ docker pull nginx</span>
            <div className="text-[9px] text-muted-foreground">Unpredictable</div>
          </div>
          <div className="rounded border px-3 py-1.5 text-center" style={{ borderColor: '#10B98140', background: '#10B98110' }}>
            <span className="text-emerald-400">✓ docker pull nginx:1.25.3</span>
            <div className="text-[9px] text-muted-foreground">Reproducible</div>
          </div>
        </motion.div>
      )}

      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-1.5 rounded-lg" style={{ background: '#EC489910', border: '1px solid #EC489930' }}>
          <span className="text-pink-400 font-mono text-[11px]">Always tag your images. :latest in production is a footgun. 🔫</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 5: Managing Images ────────────────────────────────────────────

interface TermLine { text: string; type: 'cmd' | 'out' | 'success' }

const renderTermLine = (line: TermLine) => {
  if (line.type === 'cmd') {
    const d = line.text.indexOf('$ ');
    if (d >= 0) return <><span className="text-emerald-400">{line.text.slice(0, d + 2)}</span><span className="text-foreground">{line.text.slice(d + 2)}</span></>;
    return <span className="text-foreground">{line.text}</span>;
  }
  if (line.type === 'success') return <span className="text-emerald-400">{line.text}</span>;
  return <span className="text-foreground/50">{line.text}</span>;
};

interface MgmtStep {
  lines: TermLine[];
  storeAction: 'list' | 'add' | 'inspect' | 'remove' | 'prune';
  storeTarget?: string;
}

const MGMT_STEPS: MgmtStep[] = [
  {
    lines: [
      { text: 'user@docker:~$ docker images', type: 'cmd' },
      { text: '  REPOSITORY  TAG      SIZE', type: 'out' },
      { text: '  nginx       latest   142MB', type: 'out' },
      { text: '  ubuntu      22.04    77MB', type: 'out' },
      { text: '  node        18       340MB', type: 'out' },
    ],
    storeAction: 'list',
  },
  {
    lines: [
      { text: 'user@docker:~$ docker pull redis:7', type: 'cmd' },
      { text: '  7: Pulling from library/redis', type: 'out' },
      { text: '  ✓ Pull complete (4 layers)', type: 'success' },
      { text: '  Status: Downloaded newer image redis:7', type: 'success' },
    ],
    storeAction: 'add',
    storeTarget: 'redis:7',
  },
  {
    lines: [
      { text: 'user@docker:~$ docker image inspect nginx', type: 'cmd' },
      { text: '  Id: "sha256:a6bd71249..."', type: 'out' },
      { text: '  Os: "linux"  Arch: "amd64"', type: 'out' },
      { text: '  Size: 142,578,432 bytes (142 MB)', type: 'out' },
    ],
    storeAction: 'inspect',
    storeTarget: 'nginx',
  },
  {
    lines: [
      { text: 'user@docker:~$ docker rmi ubuntu', type: 'cmd' },
      { text: '  Untagged: ubuntu:latest', type: 'out' },
      { text: '  Deleted: sha256:c6b84b685f35...', type: 'out' },
      { text: '  ✓ Image removed', type: 'success' },
    ],
    storeAction: 'remove',
    storeTarget: 'ubuntu',
  },
  {
    lines: [
      { text: 'user@docker:~$ docker image prune', type: 'cmd' },
      { text: '  WARNING: This will remove all dangling images.', type: 'out' },
      { text: '  Total reclaimed space: 0B', type: 'out' },
      { text: '  ✓ No dangling images to remove', type: 'success' },
    ],
    storeAction: 'prune',
  },
];

const INITIAL_STORE = [
  { name: 'nginx', tag: 'latest', size: '142 MB' },
  { name: 'ubuntu', tag: '22.04', size: '77 MB' },
  { name: 'node', tag: '18', size: '340 MB' },
];

const AnimManaging = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [stepIdx, setStepIdx] = useState(-1);
  const [visibleLines, setVisibleLines] = useState<TermLine[]>([]);
  const [store, setStore] = useState(INITIAL_STORE);
  const [highlight, setHighlight] = useState<string | null>(null);
  const [newBadge, setNewBadge] = useState<string | null>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    const stepDelays = [400, 1100, 2000, 2800, 3500];
    stepDelays.forEach((d, i) => schedule(() => setStepIdx(i), d));
    schedule(onDone, 4200);
    return clearAll;
    // Important: do NOT depend on onDone here, or the whole sequence
    // will be rescheduled every time parent state changes.
  }, [schedule, clearAll]);

  useEffect(() => {
    if (stepIdx < 0) return;
    const step = MGMT_STEPS[stepIdx];
    step.lines.forEach((line, i) => {
      schedule(() => setVisibleLines(prev => [...prev, line]), i * 100);
    });

    const afterLines = step.lines.length * 100 + 50;
    schedule(() => {
      if (step.storeAction === 'list') {
        setHighlight('all');
      } else if (step.storeAction === 'add' && step.storeTarget) {
        const [name, tag = 'latest'] = step.storeTarget.split(':');
        setStore(prev => {
          const without = prev.filter(img => !(img.name === name && img.tag === tag));
          const next = [...without, { name, tag, size: '45 MB' }];
          // Keep at most 4 images in the local store
          return next.slice(-4);
        });
        setNewBadge(name);
        schedule(() => setNewBadge(null), 1200);
      } else if (step.storeAction === 'inspect' && step.storeTarget) {
        setHighlight(step.storeTarget);
      } else if (step.storeAction === 'remove' && step.storeTarget) {
        setStore(prev => prev.filter(img => img.name !== step.storeTarget));
      }
      schedule(() => setHighlight(null), 600);
    }, afterLines);
  }, [stepIdx, schedule, clearAll]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [visibleLines]);

  return (
    <div className="w-full h-full flex gap-3 p-4">
      {/* Terminal (60%) */}
      <div className="flex-[60] rounded-lg overflow-hidden border flex flex-col" style={{ borderColor: '#F59E0B40' }}>
        <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          <span className="text-[10px] font-mono text-muted-foreground ml-1">image management</span>
        </div>
        <div ref={scrollRef} className="terminal-black p-3 overflow-y-auto font-mono text-[11px] leading-5 flex-1">
          {visibleLines.map((line, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
              {renderTermLine(line)}
            </motion.div>
          ))}
          {stepIdx < MGMT_STEPS.length - 1 && (
            <span className="inline-block w-2 h-4 bg-foreground/50" style={{ animation: 'blink 1s infinite' }} />
          )}
        </div>
      </div>

      {/* Local Image Store (40%) */}
      <div className="flex-[40] rounded-lg border p-3 flex flex-col" style={{ borderColor: '#F59E0B30', background: '#0F172A' }}>
        <h4 className="text-[11px] font-syne font-bold text-amber-400 mb-2">Local Image Store</h4>
        <div className="space-y-1.5 flex-1">
          <AnimatePresence>
            {store.map(img => (
              <motion.div
                key={img.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: 40 }}
                transition={{ duration: 0.35 }}
                className={`flex items-center gap-2 rounded px-2 py-1.5 border transition-all duration-300 ${
                  highlight === 'all' || highlight === img.name ? 'ring-1 ring-amber-400/40' : ''
                }`}
                style={{ borderColor: '#1F2D45', background: highlight === img.name ? '#F59E0B08' : '#111827' }}
              >
                <span className="text-[10px]">📦</span>
                <div className="flex-1 min-w-0">
                  <span className="text-[10px] font-mono text-foreground font-bold">{img.name}</span>
                  <span className="text-[9px] font-mono text-muted-foreground ml-1">:{img.tag}</span>
                </div>
                <span className="text-[9px] font-mono text-muted-foreground">{img.size}</span>
                {newBadge === img.name && (
                  <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[8px] font-mono text-emerald-400 bg-emerald-500/15 px-1 rounded">NEW</motion.span>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        <div className="text-[9px] font-mono text-muted-foreground mt-2 pt-2 border-t" style={{ borderColor: '#1F2D45' }}>
          {store.length} image{store.length !== 1 ? 's' : ''} stored locally
        </div>
      </div>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

const Level4Interactive = () => {
  const navigate = useNavigate();
  const { completeLevel, completedLevels } = useGameStore();
  const [completed, setCompleted] = useState<Set<TopicId>>(new Set());
  const [active, setActive] = useState<TopicId | null>(null);
  const [animating, setAnimating] = useState(false);
  const [infoLines, setInfoLines] = useState<{ text: string; type: 'cmd' | 'output' }[]>([]);
  const [localXP, setLocalXP] = useState(0);
  const [levelDone, setLevelDone] = useState(false);
  const [paused, setPaused] = useState(false);
  const [animRunId, setAnimRunId] = useState(0);
  const logTimers = usePausableTimers(paused);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [infoLines]);

  const runTopic = useCallback((id: TopicId) => {
    if (animating) return;
    setPaused(false);
    setAnimRunId(prev => prev + 1);
    setActive(id);
    setAnimating(true);

    // Clear any in-flight log timers and previous log lines so replay feels fresh
    logTimers.clearAll?.();
    setInfoLines([]);

    const log = INFO_LOGS[id];
    const allLines = [
      { text: log.prefix, type: 'cmd' as const },
      ...log.lines.map(l => ({ text: l, type: 'output' as const })),
    ];
    allLines.forEach((line, i) => {
      logTimers.schedule(() => setInfoLines(prev => [...prev, line]), i * 120);
    });
  }, [animating, logTimers]);

  const handleAnimDone = useCallback(() => {
    if (!active) return;
    const wasNew = !completed.has(active);
    const next = new Set(completed);
    next.add(active);
    setCompleted(next);
    setAnimating(false);

    if (wasNew) setLocalXP(prev => prev + 20);
    if (wasNew && !completedLevels.includes(4)) completeLevel(4);

    if (next.size === 5 && !levelDone) {
      setLevelDone(true);
    }
  }, [active, completed, levelDone, completedLevels, completeLevel]);

  const animKey = active ? `${active}-${animRunId}` : '';

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#070B14' }}>
      {/* ─── Navbar ─── */}
      <nav className="shrink-0 border-b border-border px-4 py-2.5 flex items-center justify-between" style={{ background: '#0F172A' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground text-sm mr-2">←</button>
          <span className="text-xl">🐳</span>
          <div>
            <h1 className="font-syne font-bold text-accent text-sm tracking-wide">DOCKER QUEST</h1>
            <p className="text-[10px] text-muted-foreground font-mono">Level 4 — Docker Images</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-syne font-bold text-amber-400 text-sm">⚡ {localXP}</span>
          <div className="hidden sm:flex items-center gap-1.5">
            {TOPICS.map(topic => (
              <div key={topic.id} className="w-2.5 h-2.5 rounded-full border transition-colors duration-300" style={{
                borderColor: completed.has(topic.id) ? topic.color : '#1F2D45',
                backgroundColor: completed.has(topic.id) ? topic.color : 'transparent',
              }} />
            ))}
          </div>
          <span className="text-xs font-mono text-muted-foreground">{completed.size}/5</span>
        </div>
      </nav>

      {/* ─── Level Complete Banner ─── */}
      <AnimatePresence>
        {levelDone && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="shrink-0 bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-3 flex items-center justify-between">
            <span className="font-syne font-bold text-emerald-400 text-sm">🎉 Level 4 Complete! +100 XP — You understand Docker Images!</span>
            <button onClick={() => navigate('/level/5')} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-syne font-bold text-xs hover:opacity-90 transition-opacity">
              Continue to Level 5 →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Body ─── */}
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
                <button
                  key={topic.id}
                  onClick={() => runTopic(topic.id)}
                  disabled={isDisabled}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono whitespace-nowrap transition-all duration-200 ${
                    isActive ? `${topic.bgTint} ${topic.borderClass} ${topic.colorClass}` :
                    isDone ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' :
                    'bg-secondary/30 border-border text-muted-foreground hover:border-muted-foreground/50'
                  } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={isActive ? { boxShadow: topic.glowStyle } : {}}
                >
                  <span className="text-xs">{isDone ? '✓' : topic.icon}</span>
                  {topic.label}
                </button>
              );
            })}
          </div>

          {/* Animation Canvas */}
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
                    <span className="text-xs font-mono" style={{ color: TOPICS.find(t => t.id === active)!.color }}>
                      {TOPICS.find(t => t.id === active)!.label}
                    </span>
                  </div>
                  {active === 'what-is-image' && <AnimWhatIsImage onDone={handleAnimDone} paused={paused} />}
                  {active === 'layers' && <AnimLayers onDone={handleAnimDone} paused={paused} />}
                  {active === 'docker-hub' && <AnimDockerHub onDone={handleAnimDone} paused={paused} />}
                  {active === 'tags' && <AnimTags onDone={handleAnimDone} paused={paused} />}
                  {active === 'managing' && <AnimManaging onDone={handleAnimDone} paused={paused} />}
                </motion.div>
              )}
            </AnimatePresence>
            {active && (
              <button onClick={() => setPaused(p => !p)}
                className="absolute bottom-3 right-3 z-30 w-8 h-8 rounded-full border flex items-center justify-center text-sm transition-colors"
                style={{ borderColor: paused ? '#10B98150' : '#ffffff20', background: paused ? '#10B98115' : '#070B14CC', color: paused ? '#10B981' : '#94A3B8' }}
                title={paused ? 'Resume' : 'Pause'}>
                {paused ? '▶' : '⏸'}
              </button>
            )}
          </div>

          {/* Image Log */}
          <div className="shrink-0 border-t border-border" style={{ height: 200 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: '#0D1117' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-[10px] font-mono text-muted-foreground ml-1">docker-quest image log</span>
            </div>
            <div ref={logRef} className="terminal-black p-3 overflow-y-auto font-mono text-[13px] leading-5" style={{ height: 'calc(200px - 28px)' }}>
              {infoLines.length === 0 ? (
                <span className="text-muted-foreground/50">
                  {'> Click a topic to explore Docker Images...'}
                  <span className="inline-block w-2 h-4 bg-muted-foreground/50 ml-1" style={{ animation: 'blink 1s infinite' }} />
                </span>
              ) : (
                infoLines.map((line, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                    {line.type === 'cmd' ? <span className="text-emerald-400">{line.text}</span> : <span className="text-foreground/70">{line.text}</span>}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel */}
        <div className="flex-[42] overflow-y-auto min-h-0" style={{ background: '#0F172A' }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span>📖</span>
                <h2 className="font-syne font-bold text-foreground text-sm">Image Reference</h2>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">Level 4 — Docker Images</span>
            </div>

            {/* Concept intro card */}
            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: '#1E3A5F', background: '#0F172A' }}>
              <h3 className="font-syne font-bold text-foreground text-sm mb-2">🖼️ Docker Images</h3>
              <p className="text-xs text-foreground/70 leading-relaxed">
                A Docker image is a lightweight, standalone, read-only package that contains
                everything needed to run an application: the code, runtime, libraries,
                environment variables, and config files. Images are the building blocks of
                Docker — you pull them, build them, tag them, and run them as containers.
                Understanding images deeply is the key to mastering Docker.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['Read-Only', 'Layered', 'Portable', 'Cached', 'Versioned'].map(tag => (
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
                <motion.div
                  key={topic.id}
                  onClick={() => runTopic(topic.id)}
                  className={`rounded-lg border p-3 mb-3 cursor-pointer transition-all duration-300 ${
                    isActive ? `${topic.borderClass} ${topic.bgTint}` :
                    isDone ? 'border-emerald-500/30 bg-card' : 'border-border bg-card hover:border-muted-foreground/30'
                  }`}
                  style={isActive ? { boxShadow: topic.glowStyle, transform: 'scale(1.01)' } : {}}
                  layout
                >
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

export default Level4Interactive;
