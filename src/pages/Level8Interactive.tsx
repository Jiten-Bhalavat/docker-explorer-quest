import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';

type TopicId = 'context' | 'flags' | 'cache' | 'buildkit' | 'multiplatform';

interface TopicMeta {
  id: TopicId; label: string; icon: string; color: string;
  colorClass: string; borderClass: string; bgTint: string; glowStyle: string;
}

const TOPICS: TopicMeta[] = [
  { id: 'context', label: 'Build Context', icon: '📂', color: '#06B6D4', colorClass: 'text-cyan-400', borderClass: 'border-cyan-500', bgTint: 'bg-cyan-500/10', glowStyle: '0 0 12px rgba(6,182,212,0.4)' },
  { id: 'flags', label: 'Build Flags', icon: '🚩', color: '#8B5CF6', colorClass: 'text-purple-400', borderClass: 'border-purple-500', bgTint: 'bg-purple-500/10', glowStyle: '0 0 12px rgba(139,92,246,0.4)' },
  { id: 'cache', label: 'Build Cache', icon: '⚡', color: '#F59E0B', colorClass: 'text-amber-400', borderClass: 'border-amber-500', bgTint: 'bg-amber-500/10', glowStyle: '0 0 12px rgba(245,158,11,0.4)' },
  { id: 'buildkit', label: 'BuildKit & ARG', icon: '🔬', color: '#14B8A6', colorClass: 'text-teal-400', borderClass: 'border-teal-500', bgTint: 'bg-teal-500/10', glowStyle: '0 0 12px rgba(20,184,166,0.4)' },
  { id: 'multiplatform', label: 'Multi-Platform', icon: '🌐', color: '#F97316', colorClass: 'text-orange-400', borderClass: 'border-orange-500', bgTint: 'bg-orange-500/10', glowStyle: '0 0 12px rgba(249,115,22,0.4)' },
];

const INFO_LOGS: Record<TopicId, { prefix: string; lines: string[] }> = {
  context: {
    prefix: '> Loading: Build Context',
    lines: [
      '# Build context = all files in the directory sent to Docker daemon',
      '# Every docker build sends the ENTIRE context to the daemon first',
      '# Large node_modules or .git folders massively slow this step',
      '# Fix: create .dockerignore in your project root',
      '# .dockerignore syntax is same as .gitignore',
      '# Essential ignores: node_modules, .git, .env, *.log, dist, coverage',
      '$ docker build -t myapp .',
      'Sending build context to Docker daemon  2.1kB  ← good',
      '# vs: Sending build context to Docker daemon  195MB ← bad',
      '> Build context demo complete ✓',
    ],
  },
  flags: {
    prefix: '> Loading: docker build Flags Reference',
    lines: [
      '$ docker build -t myapp:1.0 .               # standard build',
      '$ docker build --no-cache -t myapp .        # bypass all cache',
      '$ docker build -f Dockerfile.prod -t myapp . # custom Dockerfile',
      '$ docker build --target builder -t myapp .  # build to specific stage',
      '$ docker build --build-arg ENV=prod -t app . # pass build variable',
      '$ docker build --platform linux/amd64 .     # target architecture',
      '$ docker build --progress=plain -t myapp .  # verbose output',
      '$ docker build --label version=1.0 -t app . # add image metadata label',
      '> Build flags reference loaded ✓',
    ],
  },
  cache: {
    prefix: '> Loading: Build Cache Mechanics',
    lines: [
      '# Docker identifies each layer by a hash of:',
      '#   - The instruction text',
      '#   - The parent layer hash',
      '#   - File contents (for COPY/ADD instructions)',
      '# Cache MISS happens when any of these change',
      '# Cache miss INVALIDATES all subsequent layers (domino effect)',
      '# --no-cache flag skips ALL cache (use when upstream images update)',
      '# docker builder prune    — clear build cache',
      '# docker builder prune -a — clear ALL build cache (frees disk space)',
      '$ docker system df        — shows build cache disk usage',
      '> Cache mechanics loaded ✓',
    ],
  },
  buildkit: {
    prefix: '> Loading: BuildKit and Build Arguments',
    lines: [
      '# Enable BuildKit: export DOCKER_BUILDKIT=1',
      '# Or set in ~/.docker/daemon.json: {"features": {"buildkit": true}}',
      '# BuildKit advantages: parallel builds, better caching, inline secrets',
      '# ARG instruction: build-time variable (not in final image env)',
      '# ENV instruction: runtime variable (available in running containers)',
      '$ docker build --build-arg NODE_ENV=production -t myapp .',
      '# Use ARG for: version numbers, feature flags, non-secret config',
      '# Never use ARG for: passwords, API keys, tokens (visible in history!)',
      '$ docker history myapp    — ARG values visible here (security risk)',
      '> BuildKit and ARG loaded ✓',
    ],
  },
  multiplatform: {
    prefix: '> Loading: Multi-Platform Builds',
    lines: [
      '$ docker buildx ls                          # list builders',
      '$ docker buildx create --name b1 --use      # create new builder',
      '$ docker buildx inspect --bootstrap         # verify platforms',
      '$ docker buildx build \\',
      '    --platform linux/amd64,linux/arm64 \\',
      '    -t user/myapp:latest --push .',
      '# --push sends directly to registry (no local storage for multi-arch)',
      '# Apple Silicon tip: your M1/M2 is arm64, servers are usually amd64',
      '# Always test: docker run --platform linux/amd64 myapp',
      '> Multi-platform build loaded ✓',
    ],
  },
};

interface CardSection { title: string; text: string }
const CARD_DATA: Record<TopicId, { heading: string; sections: CardSection[] }> = {
  context: {
    heading: 'The Build Context Explained',
    sections: [
      { title: 'What it is', text: "When you run docker build, the very first thing Docker does is package all files in the specified directory (the 'build context') and send them to the Docker daemon. This happens BEFORE any Dockerfile instruction runs. The daemon needs these files to execute COPY and ADD instructions." },
      { title: 'Why it matters for speed', text: "If your build context is large — say, a node_modules folder (100MB+) or a .git directory (50MB+) — Docker sends all of it to the daemon on every single build, even if those files are never used. This alone can add 30–60 seconds to every build." },
      { title: 'The .dockerignore file', text: "Create a .dockerignore file in your project root. It uses the same syntax as .gitignore. Minimum recommended .dockerignore:\n  node_modules\n  .git\n  .env\n  *.log\n  dist\n  coverage\n  .DS_Store\n  __pycache__" },
      { title: 'Remote build contexts', text: "docker build also accepts a GitHub URL as the build context:\n  docker build https://github.com/user/repo.git#main\nDocker clones the repo and uses it as the build context. No local files needed. Great for CI/CD pipelines." },
    ],
  },
  flags: {
    heading: 'Essential docker build Flags',
    sections: [
      { title: 'Tagging and naming', text: "-t name:tag     Tags the image. Use semantic versioning: myapp:2.1.0\n                You can apply multiple -t flags in one build:\n                docker build -t myapp:2.1 -t myapp:latest .\n--label key=val Adds metadata labels to the image." },
      { title: 'Cache control', text: "--no-cache      Bypasses ALL cached layers. Rebuilds everything.\n                Use when: a dependency has a new version upstream,\n                or you suspect a cached layer has stale data.\n--cache-from    Import cache from an image (useful in CI pipelines):\n                docker build --cache-from myapp:latest -t myapp ." },
      { title: 'Dockerfile selection', text: "-f path/to/Dockerfile   Use a non-default Dockerfile.\n                         Great for: Dockerfile.dev, Dockerfile.prod,\n                         Dockerfile.test in the same project.\n--target stagename       Build only up to a named stage. Useful for\n                         running tests in the builder stage without\n                         producing the full production image." },
      { title: 'Output control', text: "--progress=plain  Show every build step in full (not collapsed).\n                  Essential for debugging build failures.\n--quiet / -q      Only print the final image ID. Good for scripts." },
    ],
  },
  cache: {
    heading: 'Build Cache Deep Dive',
    sections: [
      { title: 'How cache keys work', text: "Every Docker layer has a cache key. For RUN instructions, the key is the hash of the instruction text. For COPY/ADD, it's the hash of the files being copied plus the instruction. If the cache key matches a stored layer, Docker uses the cached version and skips execution entirely." },
      { title: 'Cache invalidation', text: "Cache is invalidated (broken) when:\n- The instruction text changes (different command string)\n- A file being COPYed changes (different file hash)\n- A parent layer's cache was already invalidated\nOnce a cache miss occurs, ALL subsequent layers must also rebuild. This is the domino effect." },
      { title: 'Optimizing for cache', text: "Structure your Dockerfile so frequently-changing instructions come LAST.\n1. FROM (almost never changes)\n2. System package installs (rarely change)\n3. Dependency manifests: package.json, requirements.txt\n4. RUN install: npm ci, pip install (only if manifest changed)\n5. Application code (changes constantly — put LAST)" },
      { title: 'Cache management', text: "docker builder prune       — remove dangling build cache\ndocker builder prune -a    — remove ALL build cache (frees GBs of disk)\ndocker system df           — see how much disk build cache is using\ndocker build --no-cache    — ignore cache for this build only" },
    ],
  },
  buildkit: {
    heading: 'BuildKit and Build Arguments',
    sections: [
      { title: 'What is BuildKit', text: "BuildKit is Docker's next-generation build engine, enabled by default since Docker 23.0. Key improvements: parallel stage building, better layer caching, inline secret mounting, efficient transfer of build context, and cleaner terminal output." },
      { title: 'Enabling BuildKit', text: "Docker Desktop: enabled by default.\nLinux CLI: export DOCKER_BUILDKIT=1  (add to ~/.bashrc)\nOr permanently in /etc/docker/daemon.json:\n{ \"features\": { \"buildkit\": true } }" },
      { title: 'ARG instruction', text: "ARG declares a build-time variable that can be passed via --build-arg.\n  ARG NODE_ENV=development   (default value)\n  ARG BUILD_VERSION          (no default — must be supplied)\n\nPass at build time:\n  docker build --build-arg NODE_ENV=production -t myapp .\n\nARG is NOT available in the running container unless you copy it to ENV." },
      { title: 'Security warning', text: "ARG values are NOT secret. They appear in docker history and the image manifest. Never use ARG for passwords, tokens, or API keys. For secrets during build, use BuildKit's secret mounting:\n  RUN --mount=type=secret,id=mysecret cat /run/secrets/mysecret" },
    ],
  },
  multiplatform: {
    heading: 'Multi-Platform Builds with buildx',
    sections: [
      { title: 'The problem', text: "Docker images are compiled for a specific CPU architecture. An image built on an Intel x86_64 machine produces a linux/amd64 image. On Apple Silicon (M1/M2), docker build produces a linux/arm64 image. If you deploy the wrong architecture to a server, it will either fail or run through slow emulation." },
      { title: 'docker buildx', text: "docker buildx is Docker's multi-platform build tool. It uses QEMU emulation to build images for architectures different from your host machine. You can build linux/amd64, linux/arm64, linux/arm/v7 all in one command." },
      { title: 'Setup and usage', text: "docker buildx create --name mybuilder --use\ndocker buildx inspect --bootstrap\ndocker buildx build \\\n  --platform linux/amd64,linux/arm64 \\\n  -t username/myapp:latest \\\n  --push .\n\nNote: Multi-platform builds must be pushed to a registry directly (--push flag)." },
      { title: 'Apple Silicon tip', text: "M1/M2 Mac developers: always add --platform linux/amd64 when building images destined for production Linux servers (which are almost always amd64):\n  docker build --platform linux/amd64 -t myapp .\nThis ensures your image runs correctly in production without emulation." },
    ],
  },
};

// ─── Shared terminal header ──────────────────────────────────────────────────

const TermHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
    <div className="w-2 h-2 rounded-full bg-red-500/70" />
    <div className="w-2 h-2 rounded-full bg-amber-500/70" />
    <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
    <span className="text-[10px] font-mono text-muted-foreground ml-1">{title}</span>
  </div>
);

// ─── Animation 1: Build Context ──────────────────────────────────────────────

const FILE_TREE = [
  { name: 'my-node-app/', icon: '📁', indent: 0, size: '' },
  { name: 'Dockerfile', icon: '📄', indent: 1, size: '' },
  { name: 'package.json', icon: '📄', indent: 1, size: '' },
  { name: 'package-lock.json', icon: '📄', indent: 1, size: '' },
  { name: 'server.js', icon: '📄', indent: 1, size: '' },
  { name: 'src/', icon: '📁', indent: 1, size: '' },
  { name: 'node_modules/', icon: '📁', indent: 1, size: '150MB', warn: true },
  { name: '.git/', icon: '📁', indent: 1, size: '45MB', warn: true },
  { name: '.env', icon: '📄', indent: 1, size: '', warn: true },
  { name: '.dockerignore', icon: '📄', indent: 1, size: '', special: true },
];

const AnimContext = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 1200),
      setTimeout(() => setPhase(2), 1700),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 3200),
      setTimeout(onDone, 4000),
    ];
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex gap-0">
      {/* File tree — left 55% */}
      <div className="flex-[55] flex flex-col border-r overflow-hidden" style={{ borderColor: '#1F2D45' }}>
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="shrink-0 px-3 py-1.5 font-mono text-[11px]" style={{ background: '#0D1117', borderBottom: '1px solid #1F2D45' }}>
            <span className="text-emerald-400">$ </span>docker build -t my-app <motion.span animate={{ color: ['#06B6D4', '#fff', '#06B6D4'] }} transition={{ duration: 1.5, repeat: Infinity }} className="font-bold">.</motion.span>
          </motion.div>
        )}
        <div className="flex-1 p-2 overflow-y-auto" style={{ background: '#0F172A' }}>
          {FILE_TREE.map((f, i) => {
            const ignored = phase >= 3 && (f as any).warn;
            return (
              <motion.div key={i} initial={{ opacity: 0, x: -12 }} animate={{ opacity: ignored ? 0.3 : 1, x: 0 }} transition={{ delay: i * 0.08, duration: 0.2 }}
                className="flex items-center gap-1.5 py-0.5 font-mono text-[10px]" style={{ paddingLeft: f.indent * 16 }}>
                <span>{f.icon}</span>
                <span className={`${(f as any).special ? 'text-cyan-400 font-bold' : (f as any).warn ? 'text-foreground/50' : 'text-foreground/80'} ${ignored ? 'line-through' : ''}`}>{f.name}</span>
                {f.size && <span className={`text-[8px] px-1 py-0.5 rounded ${(f as any).warn ? 'bg-red-500/20 text-red-400' : 'text-muted-foreground'}`}>{f.size}</span>}
                {ignored && <span className="text-[8px] text-red-400">✗ ignored</span>}
              </motion.div>
            );
          })}
        </div>
      </div>

      {/* Daemon — right 45% */}
      <div className="flex-[45] flex flex-col items-center justify-center p-3 gap-3" style={{ background: '#0F172A' }}>
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="rounded-xl border-2 p-4 flex flex-col items-center gap-2 w-full max-w-[180px]" style={{ borderColor: '#06B6D440', background: '#06B6D408' }}>
          <span className="text-3xl">🐳</span>
          <span className="text-[10px] font-syne font-bold text-cyan-400">Docker Daemon</span>
        </motion.div>

        {/* Slow (no dockerignore) */}
        {phase >= 2 && phase < 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-1">
            <div className="text-[9px] font-mono text-muted-foreground text-center">Receiving build context...</div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#1F2D45' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 2.5, ease: 'linear' }} className="h-full rounded-full bg-red-500" />
            </div>
            <div className="text-[9px] font-mono text-red-400 text-center">195MB sent... slow!</div>
          </motion.div>
        )}

        {/* Fast (with dockerignore) */}
        {phase >= 3 && phase < 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-1">
            <div className="text-[9px] font-mono text-cyan-400 text-center">.dockerignore active</div>
            <div className="h-2.5 rounded-full overflow-hidden" style={{ background: '#1F2D45' }}>
              <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ duration: 0.4, ease: 'easeOut' }} className="h-full rounded-full bg-emerald-500" />
            </div>
            <div className="text-[9px] font-mono text-emerald-400 text-center">2.1KB sent ✓</div>
          </motion.div>
        )}

        {/* Comparison */}
        {phase >= 4 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full space-y-1.5">
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-red-400 w-14">No ignore</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#1F2D45' }}>
                <div className="h-full rounded-full bg-red-500 w-full" />
              </div>
              <span className="text-[8px] font-mono text-red-400">195MB</span>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-[8px] font-mono text-emerald-400 w-14">With ignore</span>
              <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#1F2D45' }}>
                <div className="h-full rounded-full bg-emerald-500" style={{ width: '1%' }} />
              </div>
              <span className="text-[8px] font-mono text-emerald-400">2.1KB</span>
            </div>
            <div className="text-center px-2 py-1 rounded" style={{ background: '#06B6D410', border: '1px solid #06B6D430' }}>
              <span className="text-[9px] font-mono text-cyan-400">.dockerignore is as important as Dockerfile.</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Animation 2: Build Flags ────────────────────────────────────────────────

interface FlagInfo { text: string; color: string; label: string; desc: string }

const FLAGS: FlagInfo[] = [
  { text: 'docker build', color: '#6B7280', label: 'Base command', desc: '' },
  { text: '--no-cache', color: '#EF4444', label: '--no-cache', desc: 'Force rebuild ALL layers. Ignore cache.' },
  { text: '-t myapp:2.0', color: '#8B5CF6', label: '-t (tag)', desc: 'Tag the image. Format: name:version' },
  { text: '-f Dockerfile.prod', color: '#EC4899', label: '-f (file)', desc: 'Use a specific Dockerfile path.' },
  { text: '--target builder', color: '#14B8A6', label: '--target', desc: 'Stop build at a named stage.' },
  { text: '.', color: '#06B6D4', label: '. (context)', desc: 'Build context directory.' },
];

const EXTRA_FLAGS = [
  { name: '--build-arg', color: '#F59E0B', desc: 'Pass build-time variables' },
  { name: '--platform', color: '#F97316', desc: 'Target CPU architecture' },
  { name: '--progress=plain', color: '#10B981', desc: 'Show full build output' },
];

const QUICK_REF = [
  'docker build -t myapp .',
  'docker build --no-cache -t myapp .',
  'docker build -f Dockerfile.prod -t myapp:prod .',
  'docker build --target builder -t myapp:dev .',
];

const AnimFlags = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 3000),
      setTimeout(() => setPhase(3), 4000),
      setTimeout(() => setPhase(4), 4600),
      setTimeout(onDone, 5300),
    ];
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-3 overflow-y-auto">
      {/* Command */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-wrap gap-1.5 justify-center font-mono text-[13px]">
        {FLAGS.map((f, i) => (
          <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.08 }}
            className="px-1.5 py-0.5 rounded" style={{ background: `${f.color}15`, border: `1px solid ${f.color}40`, color: f.color }}>
            {f.text}
          </motion.span>
        ))}
      </motion.div>

      {/* Brackets / labels */}
      {phase >= 1 && (
        <div className="flex flex-wrap gap-2 justify-center max-w-lg">
          {FLAGS.filter(f => f.desc).map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 16 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.25 }}
              className="rounded border p-2 flex-1 min-w-[120px]" style={{ borderColor: `${f.color}40`, background: `${f.color}08` }}>
              <div className="text-[10px] font-mono font-bold" style={{ color: f.color }}>{f.label}</div>
              <div className="text-[9px] text-foreground/60 mt-0.5">{f.desc}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Extra flags */}
      {phase >= 2 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 flex-wrap justify-center">
          {EXTRA_FLAGS.map((f, i) => (
            <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15 }}
              className="rounded border px-2 py-1.5" style={{ borderColor: `${f.color}40`, background: `${f.color}08` }}>
              <span className="text-[10px] font-mono font-bold" style={{ color: f.color }}>{f.name}</span>
              <div className="text-[8px] text-foreground/50">{f.desc}</div>
            </motion.div>
          ))}
        </motion.div>
      )}

      {/* Quick reference */}
      {phase >= 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded border p-2 w-full max-w-md" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
          <div className="text-[9px] font-syne font-bold text-muted-foreground mb-1">QUICK REFERENCE</div>
          {QUICK_REF.map((cmd, i) => (
            <div key={i} className="font-mono text-[10px] text-foreground/70 leading-5">$ {cmd}</div>
          ))}
        </motion.div>
      )}

      {phase >= 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-1.5 rounded-lg" style={{ background: '#8B5CF610', border: '1px solid #8B5CF630' }}>
          <span className="text-purple-400 font-mono text-[11px]">Flags turn a basic build into a production-grade pipeline.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 3: Build Cache ────────────────────────────────────────────────

interface CacheLayer { label: string; status: 'empty' | 'new' | 'cached'; time: string }

const AnimCache = ({ onDone }: { onDone: () => void }) => {
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean }[]>([]);
  const [layers, setLayers] = useState<CacheLayer[]>(Array(6).fill(null).map(() => ({ label: '', status: 'empty', time: '' })));
  const [buildTime, setBuildTime] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [termLines.length]);

  const updateLayer = (idx: number, l: Partial<CacheLayer>) => setLayers(prev => prev.map((old, i) => i === idx ? { ...old, ...l } : old));

  useEffect(() => {
    const L = [
      { label: 'FROM node:18-alpine', time: '4200ms' },
      { label: 'WORKDIR /app', time: '120ms' },
      { label: 'COPY package*.json', time: '80ms' },
      { label: 'RUN npm ci', time: '8300ms' },
      { label: 'COPY . .', time: '40ms' },
      { label: 'CMD', time: '10ms' },
    ];

    const timers: ReturnType<typeof setTimeout>[] = [];
    // First build
    timers.push(setTimeout(() => setTermLines(p => [...p, { text: '$ docker build -t my-app .', isCmd: true }]), 200));
    const firstStarts = [400, 800, 1300, 1700, 2500, 2700];
    firstStarts.forEach((t, i) => {
      timers.push(setTimeout(() => {
        setTermLines(p => [...p, { text: `Step ${i + 1}/6 : ${L[i].label}` }]);
        if (i === 3) { setTimeout(() => setTermLines(p => [...p, { text: '  added 127 packages in 8.3s' }]), 200); }
        updateLayer(i, { label: L[i].label, status: 'new', time: L[i].time });
      }, t));
    });
    timers.push(setTimeout(() => {
      setTermLines(p => [...p, { text: 'Successfully built ✓', isSuccess: true }]);
      setBuildTime('First build: 13.2s');
    }, 3000));

    // Second build
    timers.push(setTimeout(() => {
      setTermLines(p => [...p, { text: '── Code change (server.js edited) ──' }]);
      setTermLines(p => [...p, { text: '$ docker build -t my-app .', isCmd: true }]);
    }, 3400));
    const secondStarts = [3700, 3900, 4100, 4300, 4600, 4750];
    secondStarts.forEach((t, i) => {
      timers.push(setTimeout(() => {
        const cached = i < 4;
        setTermLines(p => [...p, { text: `Step ${i + 1}/6 : ${L[i].label} ${cached ? '→ Using cache' : '→ REBUILD'}` }]);
        if (i === 3 && cached) setTimeout(() => setTermLines(p => [...p, { text: '  npm install SKIPPED — package.json unchanged!' }]), 100);
        updateLayer(i, { status: cached ? 'cached' : 'new', time: cached ? '0ms' : L[i].time });
      }, t));
    });
    timers.push(setTimeout(() => {
      setTermLines(p => [...p, { text: 'Successfully built ✓', isSuccess: true }]);
      setBuildTime('Second build: 0.8s');
    }, 5000));
    timers.push(setTimeout(onDone, 5800));
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex gap-0">
      {/* Terminal — left 55% */}
      <div className="flex-[55] flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <TermHeader title="build cache demo" />
        <div ref={scrollRef} className="terminal-black p-2 overflow-y-auto font-mono text-[10px] leading-5 flex-1">
          {termLines.map((line, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.12 }}>
              {line.isCmd ? <><span className="text-emerald-400">$ </span><span className="text-foreground">{line.text.slice(2)}</span></> :
                line.isSuccess ? <span className="text-emerald-400">{line.text}</span> :
                  line.text.startsWith('──') ? <span className="text-amber-400/60">{line.text}</span> :
                    <span className="text-foreground/50">{line.text}</span>}
            </motion.div>
          ))}
        </div>
        {buildTime && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="shrink-0 px-3 py-1.5 text-center border-t" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
            <span className="text-[10px] font-mono text-amber-400">⏱ {buildTime}</span>
          </motion.div>
        )}
      </div>

      {/* Cache panel — right 45% */}
      <div className="flex-[45] flex flex-col overflow-hidden" style={{ background: '#0F172A' }}>
        <div className="shrink-0 px-3 py-1.5 border-b text-center" style={{ borderColor: '#1F2D45' }}>
          <span className="text-[10px] font-syne font-bold text-amber-400">Build Cache</span>
        </div>
        <div className="flex-1 p-2 flex flex-col gap-1 overflow-y-auto">
          {layers.map((l, i) => (
            <motion.div
              key={i}
              animate={{
                borderColor: l.status === 'cached' ? '#10B981' : l.status === 'new' ? '#F59E0B' : '#1F2D45',
                backgroundColor: l.status === 'cached' ? '#10B98108' : l.status === 'new' ? '#F59E0B08' : '#111827',
              }}
              transition={{ duration: 0.3 }}
              className="rounded border px-2 py-1.5 flex items-center justify-between"
            >
              <div className="flex items-center gap-1.5">
                <span className="text-[9px] font-mono text-muted-foreground">{i + 1}</span>
                <span className="text-[9px] font-mono text-foreground/70">{l.label || '—'}</span>
              </div>
              {l.status !== 'empty' && (
                <motion.span
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${l.status === 'cached' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-amber-500/20 text-amber-400'}`}
                >
                  {l.status === 'cached' ? `⚡ CACHED` : `⚙️ ${l.time}`}
                </motion.span>
              )}
            </motion.div>
          ))}
        </div>
        {buildTime.includes('0.8') && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="shrink-0 px-2 py-2 border-t text-center" style={{ borderColor: '#1F2D45' }}>
            <div className="text-[9px] font-mono text-amber-400">Cache saved 12.4s (94% faster) 🚀</div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Animation 4: BuildKit & ARG ─────────────────────────────────────────────

const KW_COLORS: Record<string, string> = {
  FROM: '#06B6D4', WORKDIR: '#F97316', COPY: '#EC4899', RUN: '#8B5CF6',
  ENV: '#F59E0B', EXPOSE: '#14B8A6', CMD: '#10B981', ARG: '#14B8A6', LABEL: '#94A3B8',
};

const SyntaxLine = ({ text, highlight }: { text: string; highlight?: boolean }) => {
  if (text.startsWith('#')) return <span style={{ color: '#475569' }}>{text}</span>;
  const parts = text.split(/(\s+)/);
  const kw = parts[0]?.toUpperCase();
  const c = KW_COLORS[kw];
  return (
    <span className="relative block" style={highlight ? { background: '#14B8A610', borderLeft: '3px solid #14B8A6', paddingLeft: 6 } : { paddingLeft: 9 }}>
      {c ? <><span style={{ color: c }}>{parts[0]}</span><span className="text-foreground/80">{parts.slice(1).join('')}</span></> : <span className="text-foreground/80">{text}</span>}
    </span>
  );
};

const BUILDKIT_DF = [
  '# syntax=docker/dockerfile:1',
  'FROM node:18-alpine',
  '',
  'ARG NODE_ENV=development',
  'ARG BUILD_VERSION=1.0.0',
  'ARG PORT=3000',
  '',
  'ENV NODE_ENV=${NODE_ENV}',
  'ENV PORT=${PORT}',
  '',
  'WORKDIR /app',
  'COPY package*.json ./',
  'RUN npm ci',
  'COPY . .',
  '',
  'LABEL version="${BUILD_VERSION}"',
  'EXPOSE ${PORT}',
  'CMD ["node", "server.js"]',
];

const AnimBuildKit = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2300),
      setTimeout(() => setPhase(4), 2900),
      setTimeout(onDone, 3700),
    ];
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  const argLines = [3, 4, 5];

  return (
    <div className="w-full h-full flex gap-0">
      {/* Code editor — left 55% */}
      <div className="flex-[55] flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="shrink-0 px-2 py-1 font-mono text-[9px] border-b" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
            <span className="text-emerald-400">$ </span>docker build --build-arg <span className="text-teal-400">NODE_ENV=production</span> --build-arg <span className="text-teal-400">BUILD_VERSION=2.1.0</span> -t my-app:2.1.0 .
          </motion.div>
        )}
        <div className="flex-1 overflow-y-auto p-1.5" style={{ background: '#0D1117' }}>
          <div className="font-mono text-[10px] leading-5">
            {BUILDKIT_DF.map((line, i) => (
              <div key={i} className="flex">
                <span className="w-5 shrink-0 text-right mr-1.5 select-none" style={{ color: '#475569', fontSize: 9 }}>{i + 1}</span>
                <SyntaxLine text={line} highlight={phase >= 1 && argLines.includes(i)} />
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Flow panel — right 45% */}
      <div className="flex-[45] flex flex-col items-center justify-center p-3 gap-2 overflow-y-auto" style={{ background: '#0F172A' }}>
        {/* ARG flow */}
        <div className="w-full space-y-1.5">
          <div className="text-[9px] font-syne font-bold text-teal-400 text-center">ARG Flow</div>
          {[
            { label: 'docker build --build-arg', color: '#8B5CF6', icon: '⌨️' },
            { label: 'ARG in Dockerfile', color: '#14B8A6', icon: '📄' },
            { label: 'ENV in Container', color: '#F59E0B', icon: '📦' },
          ].map((box, i) => (
            <motion.div key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.2 }}>
              {i > 0 && <div className="text-center text-[10px] text-muted-foreground">↓</div>}
              <div className="rounded border px-2 py-1.5 text-center" style={{ borderColor: `${box.color}40`, background: `${box.color}08` }}>
                <span className="text-[9px] font-mono" style={{ color: box.color }}>{box.icon} {box.label}</span>
              </div>
            </motion.div>
          ))}

          {phase >= 2 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center justify-center gap-1 mt-1">
              <motion.span className="text-[9px] font-mono px-2 py-0.5 rounded-full" style={{ background: '#14B8A620', color: '#14B8A6' }}
                animate={{ x: [0, 0, 0], opacity: [0, 1, 1] }} transition={{ duration: 1 }}>
                NODE_ENV=production
              </motion.span>
            </motion.div>
          )}
        </div>

        {/* Warning */}
        {phase >= 3 && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="rounded border p-2 w-full" style={{ borderColor: '#F59E0B40', background: '#F59E0B08' }}>
            <div className="text-[9px] font-mono text-amber-400 font-bold">⚠️ ARG values are NOT secret</div>
            <div className="text-[8px] text-foreground/50 mt-0.5">Visible in docker history. Never use for passwords or keys.</div>
          </motion.div>
        )}

        {/* BuildKit comparison */}
        {phase >= 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full space-y-1.5">
            <div className="text-[9px] font-syne font-bold text-muted-foreground text-center">Build Engine</div>
            <div className="flex gap-2">
              <div className="flex-1 rounded border p-1.5 text-center" style={{ borderColor: '#EF444430', background: '#EF444408' }}>
                <div className="text-[8px] font-mono text-red-400/70">Legacy</div>
                <div className="flex justify-center gap-0.5 mt-1">
                  {[1, 2, 3, 4, 5].map(i => (
                    <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15 }}
                      className="w-3 h-3 rounded-sm bg-red-500/30 border border-red-500/20" />
                  ))}
                </div>
                <div className="text-[7px] text-foreground/40 mt-0.5">Sequential</div>
              </div>
              <div className="flex-1 rounded border p-1.5 text-center" style={{ borderColor: '#14B8A640', background: '#14B8A608' }}>
                <div className="text-[8px] font-mono text-teal-400">BuildKit</div>
                <div className="flex justify-center gap-0.5 mt-1">
                  {[1, 2, 3].map(i => (
                    <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.05 }}
                      className="w-3 h-3 rounded-sm bg-teal-500/40 border border-teal-500/30" />
                  ))}
                </div>
                <div className="text-[7px] text-foreground/50 mt-0.5">Parallel ⚡</div>
              </div>
            </div>
            <div className="text-center px-2 py-1 rounded" style={{ background: '#14B8A610', border: '1px solid #14B8A630' }}>
              <span className="text-[9px] font-mono text-teal-400">DOCKER_BUILDKIT=1 docker build -t app .</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Animation 5: Multi-Platform ─────────────────────────────────────────────

const PLATFORMS = [
  { label: 'linux/amd64', icon: '💻' },
  { label: 'linux/arm64', icon: '📱' },
  { label: 'linux/arm/v7', icon: '🔧' },
  { label: 'windows/amd64', icon: '🪟' },
];

const AnimMultiPlatform = ({ onDone }: { onDone: () => void }) => {
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean }[]>([]);
  const [litPlatforms, setLitPlatforms] = useState<Set<number>>(new Set());
  const [phase, setPhase] = useState(0);
  const [progress, setProgress] = useState<number[]>([0, 0]);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [termLines.length]);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];

    t.push(setTimeout(() => {
      setTermLines(p => [...p, { text: '$ docker build -t myapp .', isCmd: true }]);
      setTimeout(() => setTermLines(p => [...p, { text: "WARNING: platform (linux/amd64) doesn't match host (linux/arm64)" }]), 300);
    }, 200));

    t.push(setTimeout(() => {
      setPhase(1);
      setTermLines(p => [...p, { text: '$ docker buildx ls', isCmd: true }]);
      setTimeout(() => setTermLines(p => [...p, { text: 'NAME           DRIVER             STATUS' }]), 150);
      setTimeout(() => setTermLines(p => [...p, { text: 'default *      docker             running' }]), 300);
    }, 900));

    t.push(setTimeout(() => {
      setPhase(2);
      setTermLines(p => [...p, { text: '$ docker buildx create --name mybuilder --use', isCmd: true }]);
      setTimeout(() => setTermLines(p => [...p, { text: 'mybuilder', isSuccess: true }]), 200);
      setTimeout(() => setTermLines(p => [...p, { text: '$ docker buildx inspect --bootstrap', isCmd: true }]), 400);
      setTimeout(() => setTermLines(p => [...p, { text: 'Platforms: linux/amd64, linux/arm64, linux/arm/v7' }]), 600);
      setTimeout(() => setLitPlatforms(new Set([0])), 600);
      setTimeout(() => setLitPlatforms(new Set([0, 1])), 800);
      setTimeout(() => setLitPlatforms(new Set([0, 1, 2])), 1000);
    }, 1500));

    t.push(setTimeout(() => {
      setPhase(3);
      setTermLines(p => [...p, { text: '$ docker buildx build --platform linux/amd64,linux/arm64 -t user/myapp:latest --push .', isCmd: true }]);
      setTimeout(() => setTermLines(p => [...p, { text: '[+] Building 45.2s' }]), 200);
      setTimeout(() => setTermLines(p => [...p, { text: '=> [linux/amd64] FROM + RUN  ✓', isSuccess: true }]), 500);
      setTimeout(() => setTermLines(p => [...p, { text: '=> [linux/arm64] FROM + RUN  ✓', isSuccess: true }]), 700);
      setTimeout(() => setTermLines(p => [...p, { text: '=> pushing manifest list...  ✓', isSuccess: true }]), 900);
      // Parallel progress
      let frame = 0;
      const iv = setInterval(() => {
        frame++;
        setProgress([Math.min(frame * 8, 100), Math.min(frame * 8, 100)]);
        if (frame >= 13) clearInterval(iv);
      }, 80);
      t.push(setTimeout(() => clearInterval(iv), 1500) as any);
    }, 2400));

    t.push(setTimeout(() => {
      setPhase(4);
    }, 3400));

    t.push(setTimeout(onDone, 4200));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex gap-0">
      {/* Terminal — left 55% */}
      <div className="flex-[55] flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <TermHeader title="multi-platform build" />
        <div ref={scrollRef} className="terminal-black p-2 overflow-y-auto font-mono text-[10px] leading-5 flex-1">
          {termLines.map((line, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.12 }}>
              {line.isCmd ? <><span className="text-emerald-400">$ </span><span className="text-foreground">{line.text.slice(2)}</span></> :
                line.isSuccess ? <span className="text-emerald-400">{line.text}</span> :
                  line.text.includes('WARNING') ? <span className="text-orange-400">{line.text}</span> :
                    <span className="text-foreground/50">{line.text}</span>}
            </motion.div>
          ))}
        </div>
      </div>

      {/* Platform panel — right 45% */}
      <div className="flex-[45] flex flex-col items-center justify-center p-3 gap-2 overflow-y-auto" style={{ background: '#0F172A' }}>
        <div className="text-[9px] font-syne font-bold text-orange-400">Platform Targets</div>
        <div className="grid grid-cols-2 gap-1.5 w-full">
          {PLATFORMS.map((p, i) => (
            <motion.div
              key={i}
              animate={{
                borderColor: litPlatforms.has(i) ? '#F97316' : '#1F2D45',
                scale: litPlatforms.has(i) ? 1 : 0.95,
                opacity: litPlatforms.has(i) ? 1 : 0.4,
              }}
              transition={{ type: 'spring', stiffness: 300, damping: 20 }}
              className="rounded border p-2 text-center"
              style={{ background: litPlatforms.has(i) ? '#F9731608' : '#111827' }}
            >
              <span className="text-lg">{p.icon}</span>
              <div className="text-[8px] font-mono mt-0.5" style={{ color: litPlatforms.has(i) ? '#F97316' : '#6B7280' }}>{p.label}</div>
            </motion.div>
          ))}
        </div>

        {/* Parallel progress */}
        {phase >= 3 && (
          <div className="w-full space-y-1">
            {['linux/amd64', 'linux/arm64'].map((p, i) => (
              <div key={p} className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono text-orange-400 w-16 truncate">{p}</span>
                <div className="flex-1 h-2 rounded-full overflow-hidden" style={{ background: '#1F2D45' }}>
                  <motion.div className="h-full rounded-full bg-orange-500" style={{ width: `${progress[i]}%` }} />
                </div>
              </div>
            ))}
            <div className="text-[8px] font-mono text-muted-foreground text-center">Building in parallel</div>
          </div>
        )}

        {/* Manifest diagram */}
        {phase >= 4 && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
            <div className="rounded border p-2 text-center" style={{ borderColor: '#F9731640', background: '#F9731608' }}>
              <div className="text-[9px] font-mono text-orange-400 font-bold">☁️ Docker Hub</div>
              <div className="mt-1 rounded border p-1.5" style={{ borderColor: '#1F2D45', background: '#111827' }}>
                <div className="text-[9px] font-mono text-foreground/80">myapp:latest</div>
                <div className="flex gap-1 mt-1 justify-center">
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400">amd64</span>
                  <span className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-orange-500/15 text-orange-400">arm64</span>
                </div>
              </div>
              <div className="text-[8px] text-foreground/50 mt-1">One tag, multiple architectures</div>
            </div>
            <div className="text-center mt-1 px-2 py-1 rounded" style={{ background: '#F9731610', border: '1px solid #F9731630' }}>
              <span className="text-[9px] font-mono text-orange-400">Apple Silicon? Use --platform linux/amd64 for servers.</span>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Main Level 8 Page ───────────────────────────────────────────────────────

const Level8Interactive = () => {
  const navigate = useNavigate();
  const { completeLevel, completedLevels } = useGameStore();
  const [completed, setCompleted] = useState<Set<TopicId>>(new Set());
  const [active, setActive] = useState<TopicId | null>(null);
  const [animating, setAnimating] = useState(false);
  const [infoLines, setInfoLines] = useState<{ text: string; type: 'cmd' | 'output' }[]>([]);
  const [localXP, setLocalXP] = useState(0);
  const [levelDone, setLevelDone] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (logRef.current) logRef.current.scrollTop = logRef.current.scrollHeight;
  }, [infoLines]);

  const runTopic = useCallback((id: TopicId) => {
    if (animating) return;
    setActive(id);
    setAnimating(true);
    const log = INFO_LOGS[id];
    const allLines = [{ text: log.prefix, type: 'cmd' as const }, ...log.lines.map(l => ({ text: l, type: 'output' as const }))];
    allLines.forEach((line, i) => { setTimeout(() => setInfoLines(prev => [...prev, line]), i * 120); });
  }, [animating]);

  const handleAnimDone = useCallback(() => {
    if (!active) return;
    const wasNew = !completed.has(active);
    const next = new Set(completed);
    next.add(active);
    setCompleted(next);
    setAnimating(false);
    if (wasNew) setLocalXP(prev => prev + 20);
    if (next.size === 5 && !levelDone) {
      setLevelDone(true);
      if (!completedLevels.includes(8)) completeLevel(8);
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
            <p className="text-[10px] text-muted-foreground font-mono">Level 8 — Docker Build</p>
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

      <AnimatePresence>
        {levelDone && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="shrink-0 bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-3 flex items-center justify-between">
            <span className="font-syne font-bold text-emerald-400 text-sm">🎉 Level 8 Complete! +100 XP — You build Docker images like a pro!</span>
            <button onClick={() => navigate('/level/9')} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-syne font-bold text-xs hover:opacity-90 transition-opacity">Continue to Level 9 →</button>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        <div className="flex-[58] flex flex-col min-h-0 border-r border-border">
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
                    {active === 'context' && <AnimContext onDone={handleAnimDone} />}
                    {active === 'flags' && <AnimFlags onDone={handleAnimDone} />}
                    {active === 'cache' && <AnimCache onDone={handleAnimDone} />}
                    {active === 'buildkit' && <AnimBuildKit onDone={handleAnimDone} />}
                    {active === 'multiplatform' && <AnimMultiPlatform onDone={handleAnimDone} />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="shrink-0 border-t border-border" style={{ height: 200 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: '#0D1117' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-[10px] font-mono text-muted-foreground ml-1">docker-quest build log</span>
            </div>
            <div ref={logRef} className="terminal-black p-3 overflow-y-auto font-mono text-[13px] leading-5" style={{ height: 'calc(200px - 28px)' }}>
              {infoLines.length === 0 ? (
                <span className="text-muted-foreground/50">{'> Click a topic to explore docker build...'}<span className="inline-block w-2 h-4 bg-muted-foreground/50 ml-1" style={{ animation: 'blink 1s infinite' }} /></span>
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
              <div className="flex items-center gap-2"><span>📖</span><h2 className="font-syne font-bold text-foreground text-sm">Build Reference</h2></div>
              <span className="text-[10px] text-muted-foreground font-mono">Level 8 — Docker Build</span>
            </div>

            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: '#1E3A5F', background: '#0F172A' }}>
              <h3 className="font-syne font-bold text-foreground text-sm mb-2">🔨 docker build — In Depth</h3>
              <p className="text-xs text-foreground/70 leading-relaxed">
                docker build is the command that transforms a Dockerfile into a Docker image.
                But beyond the basics, docker build has a rich set of flags, caching mechanics,
                and modern features (BuildKit, buildx) that separate fast, efficient build
                pipelines from slow, painful ones. Level 8 covers what senior engineers know
                about docker build that most tutorials skip.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['BuildKit', 'Cache', 'Flags', 'Multi-Platform', 'ARG/ENV', 'Context'].map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-mono text-accent border border-accent/30 bg-accent/5">{tag}</span>
                ))}
              </div>
            </div>

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

export default Level8Interactive;
