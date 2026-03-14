import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';

type TopicId = 'data-loss' | 'named-volumes' | 'bind-mounts' | 'volume-cmds' | 'patterns';

interface TopicMeta {
  id: TopicId; label: string; icon: string; color: string;
  colorClass: string; borderClass: string; bgTint: string; glowStyle: string;
}

const TOPICS: TopicMeta[] = [
  { id: 'data-loss', label: 'Data Loss Problem', icon: '💀', color: '#EF4444', colorClass: 'text-red-400', borderClass: 'border-red-500', bgTint: 'bg-red-500/10', glowStyle: '0 0 12px rgba(239,68,68,0.4)' },
  { id: 'named-volumes', label: 'Named Volumes', icon: '💾', color: '#10B981', colorClass: 'text-emerald-400', borderClass: 'border-emerald-500', bgTint: 'bg-emerald-500/10', glowStyle: '0 0 12px rgba(16,185,129,0.4)' },
  { id: 'bind-mounts', label: 'Bind Mounts', icon: '🔗', color: '#06B6D4', colorClass: 'text-cyan-400', borderClass: 'border-cyan-500', bgTint: 'bg-cyan-500/10', glowStyle: '0 0 12px rgba(6,182,212,0.4)' },
  { id: 'volume-cmds', label: 'Volume Commands', icon: '🛠️', color: '#8B5CF6', colorClass: 'text-purple-400', borderClass: 'border-purple-500', bgTint: 'bg-purple-500/10', glowStyle: '0 0 12px rgba(139,92,246,0.4)' },
  { id: 'patterns', label: 'Real-World Patterns', icon: '🏗️', color: '#F59E0B', colorClass: 'text-amber-400', borderClass: 'border-amber-500', bgTint: 'bg-amber-500/10', glowStyle: '0 0 12px rgba(245,158,11,0.4)' },
];

const INFO_LOGS: Record<TopicId, { prefix: string; lines: string[] }> = {
  'data-loss': {
    prefix: '> Loading: The Persistence Problem',
    lines: [
      '# Containers are ephemeral — all data inside dies on docker rm',
      '# The writable container layer is deleted permanently on removal',
      '# This affects: database records, uploaded files, logs, cache, config',
      '$ docker rm my-postgres   # ← 30 days of data: GONE',
      '# Solution: store data OUTSIDE the container using Volumes',
      '# Volumes survive: docker stop, docker rm, docker upgrade, crashes',
      '> Problem demonstrated. Volumes are the solution ✓',
    ],
  },
  'named-volumes': {
    prefix: '> Loading: Named Volumes',
    lines: [
      '$ docker volume create pgdata',
      '$ docker run -d \\',
      '    -v pgdata:/var/lib/postgresql/data \\',
      '    --name postgres-db postgres:15',
      '# Volume syntax: -v VOLUME_NAME:CONTAINER_PATH',
      '# Docker manages where volume data lives on host',
      '# Linux: /var/lib/docker/volumes/<name>/_data',
      '$ docker rm postgres-db   # container gone, pgdata volume intact ✓',
      '> Named volume demo complete ✓',
    ],
  },
  'bind-mounts': {
    prefix: '> Loading: Bind Mounts',
    lines: [
      '$ docker run -d \\',
      '    -v $(pwd):/app \\',
      '    -p 3000:3000 node:18-alpine node server.js',
      '# Bind mount syntax: -v /absolute/host/path:/container/path',
      '# $(pwd) expands to current working directory',
      '# Changes on host are INSTANTLY reflected in container',
      '# Changes in container are INSTANTLY reflected on host',
      '# Perfect for: local development, hot-reload, live editing',
      '> Bind mount demo complete ✓',
    ],
  },
  'volume-cmds': {
    prefix: '> Loading: Volume CLI Reference',
    lines: [
      '$ docker volume ls              # list all volumes',
      '$ docker volume create mydata   # create named volume',
      '$ docker volume inspect mydata  # detailed metadata + mountpoint',
      '$ docker volume rm mydata       # delete volume (must be unmounted)',
      '$ docker volume prune           # delete all unused volumes',
      '# Mount volume: docker run -v mydata:/container/path image',
      '# Mount bind:   docker run -v /host/path:/container/path image',
      '# Read-only:    docker run -v mydata:/data:ro image',
      '> Volume commands loaded ✓',
    ],
  },
  patterns: {
    prefix: '> Loading: Production Volume Patterns',
    lines: [
      '# Pattern 1: Database Persistence',
      '$ docker run -d -v pgdata:/var/lib/postgresql/data postgres:15',
      '# Pattern 2: Shared Config',
      '$ docker run -d -v config:/etc/nginx nginx',
      '# Pattern 3: Dev Hot-Reload (bind mount)',
      '$ docker run -d -v $(pwd):/app -v /app/node_modules node:18 nodemon',
      '# The -v /app/node_modules is an anonymous volume trick:',
      '# Prevents host node_modules from overwriting container\'s',
      '> Real-world patterns loaded ✓',
    ],
  },
};

interface CardSection { title: string; text: string }
const CARD_DATA: Record<TopicId, { heading: string; sections: CardSection[] }> = {
  'data-loss': {
    heading: 'Why Volumes Are Necessary',
    sections: [
      { title: 'The fundamental problem', text: "Every Docker container has a writable layer — a thin filesystem layer on top of the read-only image layers where all runtime writes go. This writable layer is TIED to the container. When you docker rm a container, this layer is permanently deleted. There is no recycle bin, no undo." },
      { title: 'What gets lost without volumes', text: "Database records (PostgreSQL, MySQL, MongoDB data files)\nUser uploaded files (profile pictures, documents)\nApplication logs and audit trails\nRuntime configuration changes\nCache data (Redis persistence files)\nAny file written at runtime to the container filesystem" },
      { title: 'The three storage types', text: "Docker provides three ways to persist or share data:\n1. Named Volumes   — Docker-managed, production-grade persistence\n2. Bind Mounts     — Host directory mounted into container\n3. tmpfs Mounts    — In-memory only, lost on container stop\nNamed volumes are the default recommendation for production." },
      { title: 'Stopping vs removing', text: "docker stop  — pauses the container. Writable layer preserved.\ndocker rm    — destroys the container AND its writable layer.\ndocker start — restarts a stopped container. All data still there.\nVolume data  — survives ALL of the above, including docker rm." },
    ],
  },
  'named-volumes': {
    heading: 'Named Volumes — The Production Standard',
    sections: [
      { title: 'What they are', text: "Named volumes are Docker-managed storage locations on the host machine. You give them a name (like 'pgdata'), Docker decides where they live. On Linux: /var/lib/docker/volumes/<name>/_data. On Mac/Windows: inside Docker Desktop's Linux VM." },
      { title: 'Creating and using', text: "docker volume create pgdata\ndocker run -d \\\n  -v pgdata:/var/lib/postgresql/data \\\n  postgres:15\n\nThe -v flag format: -v VOLUME_NAME:PATH_IN_CONTAINER\nIf the volume doesn't exist yet, docker run creates it automatically." },
      { title: 'Why named volumes in production', text: "Docker manages backups and migration more easily.\nVolumes work correctly on all platforms (Linux, Mac, Windows).\nNamed volumes are optimized for container I/O performance.\nVolume drivers allow remote storage (AWS EFS, NFS, Azure Files).\nData is isolated from host filesystem structure." },
      { title: 'Backup strategy', text: "docker run --rm \\\n  -v pgdata:/source:ro \\\n  -v $(pwd):/backup \\\n  alpine tar czf /backup/pgdata-backup.tar.gz -C /source .\nThis one-liner backs up a volume to a tar file on your host." },
    ],
  },
  'bind-mounts': {
    heading: 'Bind Mounts — For Development',
    sections: [
      { title: 'What they are', text: "A bind mount maps a specific directory from your HOST machine directly into the container. The host path and container path point to the same underlying filesystem location. Changes on either side are instantly visible on the other — no copying, no syncing." },
      { title: 'Syntax', text: "-v /absolute/host/path:/container/path\n-v $(pwd):/app           (current directory)\n-v $(pwd)/config.json:/etc/myapp/config.json  (single file)\n--mount type=bind,source=$(pwd),target=/app   (explicit syntax)" },
      { title: 'The node_modules gotcha', text: "When you bind mount your project directory into /app, it overwrites the container's /app — including node_modules. But the container's node_modules was built for Linux and your host's was built for your OS. They're incompatible.\nSolution: add a second volume mount: -v /app/node_modules\nThis anonymous volume 'shadows' the host's node_modules at that path." },
      { title: 'When NOT to use bind mounts', text: "Avoid bind mounts in production. They tie your container to a specific host directory structure. If you move the container to another server, that path may not exist. Use named volumes in production always." },
    ],
  },
  'volume-cmds': {
    heading: 'Docker Volume CLI Reference',
    sections: [
      { title: 'Creating and listing', text: "docker volume create mydata         create a named volume\ndocker volume create \\\n  --driver local \\\n  --opt type=tmpfs mytemp            create a tmpfs volume\ndocker volume ls                    list all volumes\ndocker volume ls --filter dangling=true  list unused volumes" },
      { title: 'Inspecting', text: "docker volume inspect mydata\nReturns JSON with: Name, Driver, Mountpoint (host path), Labels, Scope, CreatedAt\nThe Mountpoint shows where Docker actually stores the data on the host." },
      { title: 'Removing', text: "docker volume rm mydata             remove specific volume\ndocker volume rm vol1 vol2 vol3     remove multiple volumes\ndocker volume prune                 remove all unused volumes\ndocker system prune --volumes       remove everything unused" },
      { title: 'Volume mount flags', text: "-v mydata:/data           read-write mount (default)\n-v mydata:/data:ro        read-only mount\n-v mydata:/data:z         shared SELinux label (Linux)\n--mount type=volume,source=mydata,target=/data  explicit syntax" },
    ],
  },
  patterns: {
    heading: 'Volume Patterns in Production',
    sections: [
      { title: 'Pattern 1 — Database persistence', text: "Every containerized database needs a volume:\ndocker run -d \\\n  --name postgres \\\n  -v pgdata:/var/lib/postgresql/data \\\n  -e POSTGRES_PASSWORD=secret \\\n  postgres:15\nNamed volumes work here. Never use bind mounts for databases in prod." },
      { title: 'Pattern 2 — Shared storage', text: "Multiple containers can mount the same named volume:\ndocker run -d -v uploads:/uploads --name uploader my-upload-service\ndocker run -d -v uploads:/uploads:ro --name viewer my-viewer-service\nThe uploader writes files, the viewer reads them. One volume, two containers." },
      { title: 'Pattern 3 — Dev hot-reload', text: "docker run -d \\\n  -v $(pwd):/app \\\n  -v /app/node_modules \\\n  -p 3000:3000 \\\n  node:18-alpine npx nodemon server.js\nEdit files locally, nodemon detects changes, auto-restarts." },
      { title: 'Volume drivers for production', text: "Local driver: stores on the host machine (default)\nNFS driver:   network file system (shared across hosts)\nAWS EFS:      elastic file system (managed, HA)\nAzure Files:  Microsoft equivalent of EFS\nFor multi-server Docker setups, use a network volume driver." },
    ],
  },
};

// ─── Volume cylinder shape ───────────────────────────────────────────────────

const VolumeCylinder = ({ label, color, size, glow }: { label: string; color: string; size?: string; glow?: boolean }) => (
  <div className="flex flex-col items-center" style={glow ? { filter: `drop-shadow(0 0 8px ${color}40)` } : {}}>
    <svg width="64" height="48" viewBox="0 0 64 48">
      <ellipse cx="32" cy="8" rx="28" ry="8" fill={`${color}20`} stroke={color} strokeWidth="1.5" />
      <rect x="4" y="8" width="56" height="28" fill={`${color}15`} stroke="none" />
      <line x1="4" y1="8" x2="4" y2="36" stroke={color} strokeWidth="1.5" />
      <line x1="60" y1="8" x2="60" y2="36" stroke={color} strokeWidth="1.5" />
      <ellipse cx="32" cy="36" rx="28" ry="8" fill={`${color}20`} stroke={color} strokeWidth="1.5" />
    </svg>
    <span className="text-[9px] font-mono mt-0.5" style={{ color }}>{label}</span>
    {size && <span className="text-[8px] font-mono text-muted-foreground">{size}</span>}
  </div>
);

// ─── Animation 1: Data Loss Problem ──────────────────────────────────────────

const AnimDataLoss = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);
  const [records, setRecords] = useState(50000);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 900),
      setTimeout(() => setPhase(2), 1600),
      setTimeout(() => setPhase(3), 2500),
      setTimeout(() => setPhase(4), 3200),
      setTimeout(onDone, 4200),
    ];
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  useEffect(() => {
    if (phase !== 2) return;
    const dur = 800; const start = 50000; const startT = Date.now();
    const iv = setInterval(() => {
      const p = Math.min((Date.now() - startT) / dur, 1);
      setRecords(Math.round(start * (1 - p * p)));
      if (p >= 1) clearInterval(iv);
    }, 30);
    return () => clearInterval(iv);
  }, [phase]);

  const DATA_ICONS = ['🗃️', '📊', '👤', '📝', '📋'];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-2 overflow-hidden">
      {/* Before volumes — data loss */}
      {phase < 4 && (
        <div className="flex flex-col items-center gap-2 relative">
          {phase < 2 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="rounded-xl border-2 p-4 flex flex-col items-center gap-1.5 relative"
              style={{ borderColor: phase === 0 ? '#10B981' : '#EF4444', background: phase === 0 ? '#10B98108' : '#EF444408' }}>
              <div className="flex items-center gap-2">
                <span className="text-lg">📦</span>
                <span className="font-mono text-sm font-bold" style={{ color: phase === 0 ? '#10B981' : '#EF4444' }}>postgres-db</span>
              </div>
              <span className={`text-[10px] font-mono ${phase === 0 ? 'text-emerald-400' : 'text-red-400'}`}>
                {phase === 0 ? '● RUNNING' : '■ STOPPED'}
              </span>
              <div className="flex gap-1 mt-1">{DATA_ICONS.map((d, i) => <span key={i} className="text-xs">{d}</span>)}</div>
              <span className="text-[9px] font-mono text-foreground/60">User data: {records.toLocaleString()} records</span>
              {phase === 0 && <span className="text-[8px] text-muted-foreground font-mono">Running for 30 days</span>}
            </motion.div>
          )}

          {phase === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <span className="text-xl">👨‍💻</span>
              <span className="text-[10px] font-mono text-foreground/60">"Time to upgrade to v16..."</span>
            </motion.div>
          )}

          {phase >= 2 && phase < 4 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-2">
              <motion.div className="relative" animate={phase === 2 ? { rotate: [-1, 1, -1, 1, 0], scale: [1, 1, 0.1], opacity: [1, 1, 0] } : {}} transition={{ duration: 1 }}>
                {phase === 2 && (
                  <div className="rounded-xl border-2 border-red-500 p-4 flex flex-col items-center gap-1">
                    <span className="text-lg">📦</span>
                    <span className="text-sm font-mono text-red-400">postgres-db</span>
                    <div className="flex gap-1">{DATA_ICONS.map((d, i) => (
                      <motion.span key={i} animate={{ x: (i - 2) * 30, y: -20 + Math.random() * 40, opacity: 0 }} transition={{ delay: 0.4 + i * 0.05, duration: 0.5 }} className="text-xs">{d}</motion.span>
                    ))}</div>
                  </div>
                )}
              </motion.div>
              {phase >= 2 && (
                <motion.span initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ delay: 0.8, type: 'spring', stiffness: 400, damping: 15 }}
                  className="font-syne font-bold text-red-400 text-lg">DATA LOST</motion.span>
              )}
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xl">👨‍💻</span><span className="text-lg">😱</span>
              </div>
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 }} className="text-center space-y-0.5">
                <div className="text-[10px] font-mono text-red-400">30 days of data: GONE</div>
                <div className="text-[10px] font-mono text-red-400/60">Upgrade cost: start from scratch</div>
              </motion.div>
            </motion.div>
          )}
        </div>
      )}

      {/* After volumes — data saved */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-3">
          <div className="text-[10px] font-syne font-bold text-muted-foreground">— With a Volume —</div>
          <div className="flex items-center gap-4">
            <motion.div className="rounded-lg border p-2 text-center" style={{ borderColor: '#37415140', background: '#11182780' }}>
              <span className="text-[9px] font-mono text-muted-foreground">📦 container</span>
              <div className="text-[8px] text-red-400/60 mt-0.5">removed ✗</div>
            </motion.div>
            <span className="text-muted-foreground text-xs">→</span>
            <VolumeCylinder label="pgdata" color="#10B981" size="8.2MB" glow />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xl">👨‍💻</span><span className="text-lg">😌</span>
          </div>
          <div className="text-[10px] font-mono text-emerald-400">✓ Data safe in volume — 50,000 records intact</div>
          <div className="px-4 py-1.5 rounded-lg" style={{ background: '#EF444410', border: '1px solid #EF444430' }}>
            <span className="text-red-400 font-mono text-[11px]">Containers are ephemeral. Data in volumes survives forever.</span>
          </div>
        </motion.div>
      )}
    </div>
  );
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

// ─── Animation 2: Named Volumes ──────────────────────────────────────────────

const AnimNamedVolumes = ({ onDone }: { onDone: () => void }) => {
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean }[]>([]);
  const [volSize, setVolSize] = useState('0B');
  const [volExists, setVolExists] = useState(false);
  const [container, setContainer] = useState<string | null>(null);
  const [dataLabel, setDataLabel] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [termLines.length]);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    t.push(setTimeout(() => {
      setTermLines(p => [...p, { text: '$ docker volume create pgdata', isCmd: true }]);
      setTimeout(() => { setTermLines(p => [...p, { text: 'pgdata', isSuccess: true }]); setVolExists(true); }, 200);
    }, 200));

    t.push(setTimeout(() => {
      setTermLines(p => [...p, { text: '$ docker run -d -v pgdata:/var/lib/postgresql/data --name postgres-db postgres:15', isCmd: true }]);
      setTimeout(() => { setTermLines(p => [...p, { text: 'a1b2c3d4e5f6' }]); setContainer('postgres-db'); }, 300);
    }, 900));

    t.push(setTimeout(() => {
      setTermLines(p => [...p, { text: '$ docker exec postgres-db psql -U postgres -c "CREATE TABLE users..."', isCmd: true }]);
      setTimeout(() => setTermLines(p => [...p, { text: 'CREATE TABLE' }]), 200);
      setTimeout(() => setTermLines(p => [...p, { text: '$ docker exec postgres-db psql -c "INSERT INTO users VALUES..."', isCmd: true }]), 400);
      setTimeout(() => { setTermLines(p => [...p, { text: 'INSERT 0 2', isSuccess: true }]); setVolSize('8.2MB'); setDataLabel('users (2 rows)'); }, 600);
    }, 2000));

    t.push(setTimeout(() => {
      setTermLines(p => [...p, { text: '$ docker stop postgres-db && docker rm postgres-db', isCmd: true }]);
      setTimeout(() => { setTermLines(p => [...p, { text: 'postgres-db', isSuccess: true }]); setContainer(null); }, 300);
    }, 3000));

    t.push(setTimeout(() => {
      setTermLines(p => [...p, { text: '$ docker run -d -v pgdata:/var/lib/postgresql/data --name postgres-db-v2 postgres:16', isCmd: true }]);
      setTimeout(() => { setTermLines(p => [...p, { text: 'e5f6g7h8' }]); setContainer('postgres-db-v2'); }, 300);
      setTimeout(() => setTermLines(p => [...p, { text: '$ docker exec postgres-db-v2 psql -c "SELECT * FROM users;"', isCmd: true }]), 500);
      setTimeout(() => setTermLines(p => [...p, { text: ' id | name\n ---+------\n  1 | Alice\n  2 | Bob' }]), 700);
      setTimeout(() => setTermLines(p => [...p, { text: '✓ Data survived container deletion and upgrade!', isSuccess: true }]), 900);
    }, 3700));

    t.push(setTimeout(onDone, 5000));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex gap-0">
      <div className="flex-[55] flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <TermHeader title="named volumes" />
        <div ref={scrollRef} className="terminal-black p-2 overflow-y-auto font-mono text-[10px] leading-5 flex-1">
          {termLines.map((line, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.12 }}>
              {line.isCmd ? <><span className="text-emerald-400">$ </span><span className="text-foreground">{line.text.slice(2)}</span></> :
                line.isSuccess ? <span className="text-emerald-400">{line.text}</span> :
                  <span className="text-foreground/50" style={{ whiteSpace: 'pre-wrap' }}>{line.text}</span>}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex-[45] flex flex-col items-center justify-center p-3 gap-3" style={{ background: '#0F172A' }}>
        <div className="text-[10px] font-syne font-bold text-emerald-400">Docker Volume Store</div>

        {volExists && (
          <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-2">
            <VolumeCylinder label="pgdata" color="#10B981" size={volSize} glow />
            {dataLabel && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[8px] font-mono text-emerald-400/70">🗃️ {dataLabel}</motion.span>}
          </motion.div>
        )}

        {/* Connection line to container */}
        {container && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-1">
            <svg width="4" height="24"><line x1="2" y1="0" x2="2" y2="24" stroke="#10B981" strokeWidth="2" strokeDasharray="6 4" style={{ animation: 'dashFlow 1.2s linear infinite' }} /></svg>
            <div className="rounded border px-2 py-1 text-center" style={{ borderColor: '#10B981', background: '#10B98108' }}>
              <span className="text-[9px] font-mono text-emerald-400">📦 {container}</span>
              <div className="text-[8px] text-emerald-400/60">● RUNNING</div>
            </div>
          </motion.div>
        )}

        {!container && volExists && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <div className="text-[9px] font-mono text-emerald-400/60">No container attached</div>
            <div className="text-[8px] font-mono text-emerald-400">Volume data intact ✓</div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Animation 3: Bind Mounts ────────────────────────────────────────────────

const AnimBindMounts = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);
  const [editFlash, setEditFlash] = useState(false);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 1300),
      setTimeout(() => { setPhase(3); setEditFlash(true); setTimeout(() => setEditFlash(false), 600); }, 2000),
      setTimeout(() => setPhase(4), 2700),
      setTimeout(onDone, 3500),
    ];
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  const HOST_FILES = ['server.js', 'package.json', 'src/'];
  const COMPARISON = [
    { feat: 'Managed by', vol: 'Docker', bind: 'You (host OS)' },
    { feat: 'Best for', vol: 'Production DB', bind: 'Local dev' },
    { feat: 'Host path', vol: 'Docker picks', bind: 'You specify' },
    { feat: 'Performance', vol: 'Optimized', bind: 'Good on Linux' },
    { feat: 'Portability', vol: 'Easy', bind: 'Host-dependent' },
  ];

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2">
      {/* Command */}
      {phase >= 1 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded px-3 py-1 font-mono text-[10px] shrink-0" style={{ background: '#0D1117', border: '1px solid #1F2D45' }}>
          <span className="text-emerald-400">$ </span>docker run -d <span className="text-cyan-400">-v $(pwd):/app</span> -p 3000:3000 node:18-alpine
        </motion.div>
      )}

      {/* Split: Host ↔ Container */}
      <div className="flex gap-3 flex-1 min-h-0">
        {/* Host */}
        <div className="flex-1 rounded-lg border overflow-hidden" style={{ borderColor: '#06B6D440', background: '#0D1117' }}>
          <div className="px-2 py-1 border-b text-center" style={{ borderColor: '#1F2D45' }}>
            <span className="text-[10px] font-syne font-bold text-cyan-400">💻 Host Machine</span>
          </div>
          <div className="p-2 font-mono text-[10px] space-y-0.5">
            <div className="text-foreground/60">~/my-node-app/</div>
            {HOST_FILES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                className="pl-3 flex items-center gap-1"
                style={editFlash && f === 'server.js' ? { background: '#06B6D430' } : {}}>
                <span className="text-xs">{f.endsWith('/') ? '📁' : '📄'}</span>
                <span className="text-foreground/80">{f}</span>
                {editFlash && f === 'server.js' && <span className="text-[8px]">✏️</span>}
              </motion.div>
            ))}
          </div>
        </div>

        {/* Arrow */}
        {phase >= 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center justify-center gap-1 shrink-0">
            <span className="text-cyan-400 text-lg">↔</span>
            <span className="text-[8px] font-mono text-cyan-400">Live sync</span>
          </motion.div>
        )}

        {/* Container */}
        <div className="flex-1 rounded-lg border overflow-hidden" style={{ borderColor: phase >= 2 ? '#06B6D440' : '#1F2D4540', background: '#0D1117' }}>
          <div className="px-2 py-1 border-b text-center" style={{ borderColor: '#1F2D45' }}>
            <span className="text-[10px] font-syne font-bold text-cyan-400">🐳 Container</span>
          </div>
          <div className="p-2 font-mono text-[10px] space-y-0.5">
            <div className="text-foreground/60">/app/</div>
            {phase >= 2 ? HOST_FILES.map((f, i) => (
              <motion.div key={i} initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                className="pl-3 flex items-center gap-1"
                style={editFlash && f === 'server.js' ? { background: '#06B6D430' } : {}}>
                <span className="text-xs">{f.endsWith('/') ? '📁' : '📄'}</span>
                <span className="text-foreground/80">{f}</span>
                {editFlash && f === 'server.js' && <span className="text-[8px]">⚡</span>}
              </motion.div>
            )) : <div className="pl-3 text-muted-foreground/40">(empty)</div>}
            {phase >= 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1 pl-3 text-[9px] text-emerald-400">
                Server restarted (change detected)
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Comparison table */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="rounded border overflow-hidden shrink-0" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
          <div className="grid grid-cols-3 text-[8px] font-mono">
            <div className="px-2 py-1 border-b text-muted-foreground" style={{ borderColor: '#1F2D45' }}>Feature</div>
            <div className="px-2 py-1 border-b text-emerald-400" style={{ borderColor: '#1F2D45' }}>Named Volume</div>
            <div className="px-2 py-1 border-b text-cyan-400" style={{ borderColor: '#1F2D45' }}>Bind Mount</div>
            {COMPARISON.map((r, i) => (
              <motion.div key={i} className="contents" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 }}>
                <div className="px-2 py-0.5 text-foreground/50 border-b" style={{ borderColor: '#1F2D4530' }}>{r.feat}</div>
                <div className="px-2 py-0.5 text-foreground/70 border-b" style={{ borderColor: '#1F2D4530' }}>{r.vol}</div>
                <div className="px-2 py-0.5 text-foreground/70 border-b" style={{ borderColor: '#1F2D4530' }}>{r.bind}</div>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 4: Volume Commands ────────────────────────────────────────────

interface VolRow { name: string; status: 'available' | 'in-use'; error?: boolean }

const AnimVolumeCmds = ({ onDone }: { onDone: () => void }) => {
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean; isError?: boolean }[]>([]);
  const [volumes, setVolumes] = useState<VolRow[]>([
    { name: 'appdata', status: 'in-use' },
    { name: 'cachedata', status: 'available' },
    { name: 'dbdata', status: 'in-use' },
  ]);
  const [step, setStep] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [termLines.length]);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    t.push(setTimeout(() => {
      setStep(1);
      setTermLines(p => [...p, { text: '$ docker volume ls', isCmd: true }]);
      setTimeout(() => setTermLines(p => [...p, { text: 'DRIVER    VOLUME NAME' }]), 150);
      setTimeout(() => setTermLines(p => [...p, { text: 'local     appdata\nlocal     cachedata\nlocal     dbdata' }]), 300);
    }, 200));

    t.push(setTimeout(() => {
      setStep(2);
      setTermLines(p => [...p, { text: '$ docker volume create --name myvolume', isCmd: true }]);
      setTimeout(() => { setTermLines(p => [...p, { text: 'myvolume', isSuccess: true }]); setVolumes(prev => [...prev, { name: 'myvolume', status: 'available' }]); }, 200);
      setTimeout(() => setTermLines(p => [...p, { text: '$ docker volume inspect myvolume', isCmd: true }]), 400);
      setTimeout(() => setTermLines(p => [...p, { text: '  Mountpoint: /var/lib/docker/volumes/myvolume/_data' }]), 600);
    }, 900));

    t.push(setTimeout(() => {
      setStep(3);
      setTermLines(p => [...p, { text: '$ docker run -d --name app1 -v myvolume:/data alpine sleep 3600', isCmd: true }]);
      setTimeout(() => { setTermLines(p => [...p, { text: 'a1b2c3' }]); setVolumes(prev => prev.map(v => v.name === 'myvolume' ? { ...v, status: 'in-use' } : v)); }, 250);
    }, 2000));

    t.push(setTimeout(() => {
      setStep(4);
      setTermLines(p => [...p, { text: '$ docker volume rm cachedata', isCmd: true }]);
      setTimeout(() => {
        setTermLines(p => [...p, { text: 'Error: volume is in use', isError: true }]);
        setVolumes(prev => prev.map(v => v.name === 'cachedata' ? { ...v, error: true } : v));
        setTimeout(() => setVolumes(prev => prev.map(v => ({ ...v, error: false }))), 800);
      }, 200);
      setTimeout(() => setTermLines(p => [...p, { text: '$ docker stop app1 && docker rm app1', isCmd: true }]), 500);
      setTimeout(() => {
        setTermLines(p => [...p, { text: '$ docker volume rm cachedata', isCmd: true }]);
        setTimeout(() => { setTermLines(p => [...p, { text: 'cachedata', isSuccess: true }]); setVolumes(prev => prev.filter(v => v.name !== 'cachedata')); }, 200);
      }, 800);
    }, 2800));

    t.push(setTimeout(() => {
      setStep(5);
      setTermLines(p => [...p, { text: '$ docker volume prune', isCmd: true }]);
      setTimeout(() => setTermLines(p => [...p, { text: 'WARNING: This will remove all unused volumes.' }]), 200);
      setTimeout(() => {
        setTermLines(p => [...p, { text: 'Deleted Volumes: myvolume\nTotal reclaimed space: 125MB', isSuccess: true }]);
        setVolumes(prev => prev.filter(v => v.status === 'in-use'));
      }, 500);
    }, 3700));

    t.push(setTimeout(onDone, 4500));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex gap-0">
      <div className="flex-[58] flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <TermHeader title="volume commands" />
        <div ref={scrollRef} className="terminal-black p-2 overflow-y-auto font-mono text-[10px] leading-5 flex-1">
          {termLines.map((line, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.12 }}>
              {line.isCmd ? <><span className="text-emerald-400">$ </span><span className="text-foreground">{line.text.slice(2)}</span></> :
                line.isSuccess ? <span className="text-emerald-400" style={{ whiteSpace: 'pre-wrap' }}>{line.text}</span> :
                  line.isError ? <span className="text-red-400">{line.text}</span> :
                    <span className="text-foreground/50" style={{ whiteSpace: 'pre-wrap' }}>{line.text}</span>}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex-[42] flex flex-col overflow-hidden" style={{ background: '#0F172A' }}>
        <div className="shrink-0 px-3 py-1.5 border-b text-center" style={{ borderColor: '#1F2D45' }}>
          <span className="text-[10px] font-syne font-bold text-purple-400">Local Volume Registry</span>
        </div>
        <div className="flex-1 p-2 space-y-1.5 overflow-y-auto">
          <AnimatePresence>
            {volumes.map(v => (
              <motion.div
                key={v.name}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0, backgroundColor: v.error ? '#EF444420' : '#111827' }}
                exit={{ opacity: 0, height: 0, marginBottom: 0 }}
                transition={{ duration: 0.3 }}
                className="rounded border px-2 py-1.5 flex items-center justify-between"
                style={{ borderColor: v.error ? '#EF4444' : v.status === 'in-use' ? '#8B5CF640' : '#1F2D45' }}
              >
                <div className="flex items-center gap-1.5">
                  <span className="text-xs">💾</span>
                  <span className="text-[9px] font-mono text-foreground/80">{v.name}</span>
                </div>
                <span className={`text-[8px] font-mono px-1.5 py-0.5 rounded ${v.status === 'in-use' ? 'bg-emerald-500/20 text-emerald-400' : 'bg-secondary/30 text-muted-foreground'}`}>
                  {v.status === 'in-use' ? '● IN USE' : 'available'}
                </span>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
        {step >= 5 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="shrink-0 px-2 py-2 border-t text-center" style={{ borderColor: '#1F2D45' }}>
            <span className="text-[9px] font-mono text-purple-400">Cannot remove a volume mounted to a running container.</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Animation 5: Real-World Patterns ────────────────────────────────────────

const AnimPatterns = ({ onDone }: { onDone: () => void }) => {
  const [pattern, setPattern] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPattern(1), 0),
      setTimeout(() => setPattern(2), 1800),
      setTimeout(() => setPattern(3), 3300),
      setTimeout(() => setPattern(4), 4800),
      setTimeout(onDone, 5600),
    ];
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-2 overflow-hidden relative">
      {/* Pattern 1: Database Persistence */}
      <AnimatePresence>
        {pattern >= 1 && (
          <motion.div
            key="p1"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: pattern === 1 ? 1 : 0.15 }}
            exit={{ opacity: 0 }}
            className="w-full max-w-md"
            style={{ position: pattern > 1 ? 'absolute' : 'relative', top: pattern > 1 ? 8 : undefined }}
          >
            <div className="text-[10px] font-syne font-bold text-amber-400 mb-2">Pattern 1: Database Persistence</div>
            <div className="flex items-center gap-3 justify-center">
              <div className="rounded border px-2 py-1.5 text-center" style={{ borderColor: '#1F2D45', background: '#111827' }}>
                <span className="text-[9px] font-mono text-foreground/70">📦 App</span>
              </div>
              <span className="text-muted-foreground text-[10px]">→</span>
              <div className="rounded border px-2 py-1.5 text-center" style={{ borderColor: '#10B98140', background: '#10B98108' }}>
                <span className="text-[9px] font-mono text-emerald-400">📦 postgres</span>
              </div>
              <span className="text-muted-foreground text-[10px]">→</span>
              <VolumeCylinder label="pgdata" color="#10B981" glow />
            </div>
            <div className="mt-1 font-mono text-[9px] text-foreground/50 text-center">
              -v pgdata:/var/lib/postgresql/data
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pattern 2: Shared Configuration */}
      <AnimatePresence>
        {pattern >= 2 && pattern < 4 && (
          <motion.div key="p2" initial={{ opacity: 0, x: 20 }} animate={{ opacity: pattern === 2 ? 1 : 0.15 }} className="w-full max-w-md">
            <div className="text-[10px] font-syne font-bold text-amber-400 mb-2">Pattern 2: Shared Configuration</div>
            <div className="flex items-center gap-2 justify-center">
              <div className="flex flex-col gap-1">
                {['Container A', 'Container B', 'Container C'].map((c, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
                    className="rounded border px-2 py-0.5 text-[8px] font-mono text-foreground/70" style={{ borderColor: '#1F2D45', background: '#111827' }}>
                    {c}
                  </motion.div>
                ))}
              </div>
              <span className="text-muted-foreground text-[10px]">→</span>
              <VolumeCylinder label="config-vol" color="#F59E0B" glow />
            </div>
            <div className="mt-1 text-[9px] font-mono text-foreground/50 text-center">
              Multiple containers reading one shared volume
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Pattern 3: Dev Hot-Reload */}
      <AnimatePresence>
        {pattern >= 3 && pattern < 4 && (
          <motion.div key="p3" initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1 }} className="w-full max-w-md">
            <div className="text-[10px] font-syne font-bold text-amber-400 mb-2">Pattern 3: Dev Hot-Reload</div>
            <div className="flex items-center gap-3 justify-center">
              <div className="rounded border px-2 py-1.5 text-center" style={{ borderColor: '#06B6D440', background: '#06B6D408' }}>
                <span className="text-[9px] font-mono text-cyan-400">💻 ~/my-app/</span>
              </div>
              <span className="text-cyan-400 text-lg">↔</span>
              <div className="rounded border px-2 py-1.5 text-center" style={{ borderColor: '#06B6D440', background: '#06B6D408' }}>
                <span className="text-[9px] font-mono text-cyan-400">🐳 /app/</span>
              </div>
            </div>
            <div className="mt-1 rounded border p-1.5" style={{ borderColor: '#F59E0B30', background: '#F59E0B08' }}>
              <span className="text-[8px] font-mono text-amber-400">💡 -v /app/node_modules</span>
              <div className="text-[8px] text-foreground/50">Anonymous volume prevents host node_modules from overwriting container's</div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Summary */}
      {pattern >= 4 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full max-w-md space-y-2">
          <div className="text-[10px] font-syne font-bold text-amber-400 text-center">3 Volume Patterns</div>
          {[
            { icon: '💾', label: 'Named Volume', desc: 'production databases, persistent app data', color: '#10B981' },
            { icon: '🔗', label: 'Bind Mount', desc: 'local development, hot-reload workflows', color: '#06B6D4' },
            { icon: '📁', label: 'Anonymous Vol', desc: 'container-specific ephemeral storage', color: '#8B5CF6' },
          ].map((p, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
              className="rounded border px-3 py-1.5 flex items-center gap-2" style={{ borderColor: `${p.color}40`, background: `${p.color}08` }}>
              <span className="text-sm">{p.icon}</span>
              <div>
                <span className="text-[10px] font-mono font-bold" style={{ color: p.color }}>{p.label}</span>
                <div className="text-[8px] text-foreground/50">{p.desc}</div>
              </div>
            </motion.div>
          ))}
          <div className="text-center px-3 py-1.5 rounded" style={{ background: '#F59E0B10', border: '1px solid #F59E0B30' }}>
            <span className="text-[10px] font-mono text-amber-400">Volumes bridge ephemeral containers and persistent reality.</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Main Level 9 Page ───────────────────────────────────────────────────────

const Level9Interactive = () => {
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
      if (!completedLevels.includes(9)) completeLevel(9);
    }
  }, [active, completed, levelDone, completedLevels, completeLevel]);

  const animKey = active ? `${active}-${Date.now()}` : '';

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#070B14' }}>
      <nav className="shrink-0 border-b border-border px-4 py-2.5 flex items-center justify-between" style={{ background: '#0F172A' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground text-sm mr-2">←</button>
          <span className="text-xl">🐳</span>
          <div>
            <h1 className="font-syne font-bold text-accent text-sm tracking-wide">DOCKER QUEST</h1>
            <p className="text-[10px] text-muted-foreground font-mono">Level 9 — Docker Volumes</p>
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
            <span className="font-syne font-bold text-emerald-400 text-sm">🎉 Level 9 Complete! +100 XP — Your data will never vanish again!</span>
            <button onClick={() => navigate('/level/10')} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-syne font-bold text-xs hover:opacity-90 transition-opacity">Continue to Level 10 →</button>
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
                    {active === 'data-loss' && <AnimDataLoss onDone={handleAnimDone} />}
                    {active === 'named-volumes' && <AnimNamedVolumes onDone={handleAnimDone} />}
                    {active === 'bind-mounts' && <AnimBindMounts onDone={handleAnimDone} />}
                    {active === 'volume-cmds' && <AnimVolumeCmds onDone={handleAnimDone} />}
                    {active === 'patterns' && <AnimPatterns onDone={handleAnimDone} />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="shrink-0 border-t border-border" style={{ height: 200 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: '#0D1117' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-[10px] font-mono text-muted-foreground ml-1">docker-quest volume log</span>
            </div>
            <div ref={logRef} className="terminal-black p-3 overflow-y-auto font-mono text-[13px] leading-5" style={{ height: 'calc(200px - 28px)' }}>
              {infoLines.length === 0 ? (
                <span className="text-muted-foreground/50">{'> Click a topic to explore Docker Volumes...'}<span className="inline-block w-2 h-4 bg-muted-foreground/50 ml-1" style={{ animation: 'blink 1s infinite' }} /></span>
              ) : infoLines.map((line, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                  {line.type === 'cmd' ? <span className="text-emerald-400">{line.text}</span> : <span className="text-foreground/70">{line.text}</span>}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        <div className="flex-[42] overflow-y-auto min-h-0" style={{ background: '#0F172A' }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><span>📖</span><h2 className="font-syne font-bold text-foreground text-sm">Volume Reference</h2></div>
              <span className="text-[10px] text-muted-foreground font-mono">Level 9 — Docker Volumes</span>
            </div>

            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: '#1E3A5F', background: '#0F172A' }}>
              <h3 className="font-syne font-bold text-foreground text-sm mb-2">💾 Docker Volumes</h3>
              <p className="text-xs text-foreground/70 leading-relaxed">
                Docker containers are ephemeral by design — when a container is removed, all
                data written inside it disappears permanently. Docker Volumes solve this by
                storing data OUTSIDE the container filesystem, in a location managed by Docker
                (or directly on your host). Volumes survive container deletion, upgrades, and
                crashes. They are the essential bridge between Docker's stateless design and
                the stateful reality of databases, file uploads, and user data.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['Persistent', 'Ephemeral', 'Named', 'Bind', 'Production'].map(tag => (
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

export default Level9Interactive;
