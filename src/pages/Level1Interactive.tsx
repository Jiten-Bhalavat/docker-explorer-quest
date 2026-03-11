import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';

type CommandId = 'pull' | 'images' | 'run' | 'ps' | 'stop';

interface CmdMeta {
  id: CommandId;
  label: string;
  color: string;
  colorClass: string;
  borderClass: string;
  bgTint: string;
  glowStyle: string;
}

const COMMANDS: CmdMeta[] = [
  { id: 'pull', label: 'docker pull', color: '#06B6D4', colorClass: 'text-accent', borderClass: 'border-accent', bgTint: 'bg-accent/10', glowStyle: '0 0 12px rgba(6,182,212,0.4)' },
  { id: 'images', label: 'docker images', color: '#8B5CF6', colorClass: 'text-purple-400', borderClass: 'border-purple-500', bgTint: 'bg-purple-500/10', glowStyle: '0 0 12px rgba(139,92,246,0.4)' },
  { id: 'run', label: 'docker run', color: '#10B981', colorClass: 'text-emerald-400', borderClass: 'border-emerald-500', bgTint: 'bg-emerald-500/10', glowStyle: '0 0 12px rgba(16,185,129,0.4)' },
  { id: 'ps', label: 'docker ps', color: '#F59E0B', colorClass: 'text-amber-400', borderClass: 'border-amber-500', bgTint: 'bg-amber-500/10', glowStyle: '0 0 12px rgba(245,158,11,0.4)' },
  { id: 'stop', label: 'docker stop', color: '#EF4444', colorClass: 'text-red-400', borderClass: 'border-red-500', bgTint: 'bg-red-500/10', glowStyle: '0 0 12px rgba(239,68,68,0.4)' },
];

const TERMINAL_OUTPUTS: Record<CommandId, { prefix: string; lines: string[] }> = {
  pull: {
    prefix: '$ docker pull hello-world',
    lines: [
      '  Using default tag: latest',
      '  latest: Pulling from library/hello-world',
      '  719385e32844: Pull complete',
      '  Digest: sha256:1408198...',
      '  Status: Downloaded newer image for hello-world:latest ✓',
    ],
  },
  images: {
    prefix: '$ docker images',
    lines: [
      '  REPOSITORY    TAG      IMAGE ID      SIZE',
      '  hello-world   latest   d1165f221234  13.3kB',
      '  nginx         latest   a6bd71249d4b  142MB',
      '  ubuntu        22.04    c6b84b685f35  77.8MB',
    ],
  },
  run: {
    prefix: '$ docker run hello-world',
    lines: [
      '  Hello from Docker! 🐳',
      '  This message shows Docker is installed correctly.',
      '  Container exited with code 0 ✓',
    ],
  },
  ps: {
    prefix: '$ docker ps',
    lines: [
      '  CONTAINER ID  IMAGE        STATUS      NAMES',
      '  a1b2c3d4      hello-world  Up 2 min    graceful_turing',
      '  e5f6g7h8      nginx        Up 5 min    web_server',
    ],
  },
  stop: {
    prefix: '$ docker stop a1b2c3d4',
    lines: [
      '  Sending SIGTERM to container a1b2c3d4...',
      '  a1b2c3d4',
      '  Container stopped ✓',
    ],
  },
};

const CARD_DATA: Record<CommandId, { syntax: string; whatItDoes: string; useCase: string; example: string }> = {
  pull: {
    syntax: 'docker pull <image>:<tag>',
    whatItDoes: 'Downloads a Docker image from a registry (Docker Hub by default) to your local machine. Think of it like downloading an app installer — the image is the blueprint you\'ll use to create containers. Nothing runs yet; you\'re just downloading.',
    useCase: 'Use this before running a container when you want to explicitly download or update a specific image version.',
    example: 'docker pull nginx:latest',
  },
  images: {
    syntax: 'docker images [OPTIONS]',
    whatItDoes: 'Lists all Docker images currently stored on your local machine — like opening your Downloads folder to see what\'s there. Shows repository name, tag, image ID, creation time, and file size.',
    useCase: 'Use to verify an image was pulled successfully, check which versions you have locally, or audit disk usage from images.',
    example: 'docker images --all',
  },
  run: {
    syntax: 'docker run [OPTIONS] <image> [COMMAND]',
    whatItDoes: 'The most important Docker command. It takes an image and creates a live, running container from it — like launching an application from its installer file. Under the hood it runs docker create + docker start in one step.',
    useCase: 'Use to start any containerized application. Combine with flags: -p to expose ports, -d to run in background, -v to mount a volume, --name to give it a custom name.',
    example: 'docker run -d -p 8080:80 --name my-site nginx',
  },
  ps: {
    syntax: 'docker ps [OPTIONS]',
    whatItDoes: 'Shows all currently running containers — like the Task Manager or Activity Monitor for Docker. Displays container ID, the image it came from, the command it\'s running, how long it\'s been up, port mappings, and its name.',
    useCase: 'Essential for debugging. Check if a container is running, find its ID to stop or exec into it, or verify which ports are being used. Add -a flag to also see stopped containers.',
    example: 'docker ps -a',
  },
  stop: {
    syntax: 'docker stop <container_id or name>',
    whatItDoes: 'Gracefully stops a running container by sending a SIGTERM signal first (gives the app time to clean up), then waits 10 seconds before force-killing it with SIGKILL. This is the clean way to shut down — like clicking "Shut Down" instead of unplugging the power cable.',
    useCase: 'Use before removing a container, deploying an update, or when you need to free up the ports and resources a container is using. Always prefer stop over kill when possible.',
    example: 'docker stop my-site',
  },
};

// ─── Animation Components ───────────────────────────────────────────────────

const Particles = ({ color }: { color: string }) => (
  <>
    {Array.from({ length: 12 }).map((_, i) => (
      <motion.div
        key={i}
        className="absolute w-2 h-2 rounded-full"
        style={{
          backgroundColor: color,
          left: `${45 + (Math.random() - 0.5) * 30}%`,
          top: `${45 + (Math.random() - 0.5) * 30}%`,
        }}
        initial={{ opacity: 1, y: 0, scale: 1 }}
        animate={{ opacity: 0, y: -40, scale: 0.5 }}
        transition={{ delay: i * 0.04, duration: 0.8, ease: 'easeOut' }}
      />
    ))}
  </>
);

const AnimPull = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => { const t = setTimeout(onDone, 3200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="relative w-full h-full flex items-center justify-center">
      <motion.div className="absolute left-[10%] flex flex-col items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <span className="text-4xl">☁️</span>
        <span className="text-xs font-mono text-muted-foreground mt-1 px-2 py-0.5 rounded bg-secondary/60 border border-border">Docker Hub</span>
      </motion.div>
      <motion.div className="absolute right-[10%] flex flex-col items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <span className="text-4xl">💻</span>
        <span className="text-xs font-mono text-muted-foreground mt-1 px-2 py-0.5 rounded bg-secondary/60 border border-border">Local Machine</span>
      </motion.div>
      {/* Dashed arrow */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
        <motion.line x1="22%" y1="50%" x2="78%" y2="50%" stroke="#06B6D4" strokeWidth="2" strokeDasharray="6 4" style={{ animation: 'dashFlow 1s linear infinite' }} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.6 }} transition={{ delay: 0.5, duration: 0.5 }} />
      </svg>
      {/* Package travels */}
      <motion.div className="absolute flex flex-col items-center" initial={{ left: '18%', top: '38%', opacity: 0 }} animate={[{ opacity: 1, transition: { delay: 0.6 } }, { left: '72%', transition: { delay: 1.4, duration: 0.7, ease: [0.4, 0, 0.2, 1] } }]} transition={{ delay: 0.6 }}>
        <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.6, duration: 0.3 }}>
          <span className="text-3xl">📦</span>
          <p className="text-[10px] font-mono text-accent whitespace-nowrap">hello-world:latest</p>
        </motion.div>
      </motion.div>
      {/* Success bar */}
      <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.2 }}>
        <div className="flex items-center gap-2 px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <span className="text-emerald-400 font-mono text-sm">✓ Image pulled to local machine</span>
        </div>
      </motion.div>
      {/* Particles */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2.2 }}>
        <Particles color="#06B6D4" />
      </motion.div>
    </div>
  );
};

const TableRow = ({ cells, delay, colorIdx }: { cells: string[]; delay: number; colorIdx?: number }) => (
  <motion.tr initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay, duration: 0.3 }}>
    {cells.map((c, i) => (
      <td key={i} className={`px-3 py-1 text-xs font-mono whitespace-nowrap ${i === colorIdx ? 'text-purple-400' : 'text-foreground/80'}`}>{c}</td>
    ))}
  </motion.tr>
);

const AnimImages = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <table className="border-collapse">
        <motion.thead initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <tr>{['REPOSITORY', 'TAG', 'IMAGE ID', 'SIZE'].map(h => (
            <th key={h} className="px-3 py-1 text-xs font-mono text-muted-foreground text-left">{h}</th>
          ))}</tr>
        </motion.thead>
        <tbody>
          <TableRow cells={['hello-world', 'latest', 'd1165f221234', '13.3kB']} delay={0.4} colorIdx={0} />
          <TableRow cells={['nginx', 'latest', 'a6bd71249d4b', '142MB']} delay={0.7} colorIdx={0} />
          <TableRow cells={['ubuntu', '22.04', 'c6b84b685f35', '77.8MB']} delay={1.0} colorIdx={0} />
        </tbody>
      </table>
      <motion.p className="text-xs font-mono text-muted-foreground mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.6 }}>
        3 images stored on your local machine
      </motion.p>
    </div>
  );
};

const AnimRun = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => { const t = setTimeout(onDone, 3000); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="relative w-full h-full flex items-center justify-center gap-8">
      <motion.div className="flex flex-col items-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.4 }}>
        <div className="w-24 h-24 rounded-lg border-2 border-muted-foreground/40 flex flex-col items-center justify-center bg-secondary/30">
          <span className="text-2xl">🖼️</span>
          <span className="text-[10px] font-mono text-muted-foreground mt-1">IMAGE</span>
        </div>
      </motion.div>
      {/* Arrow */}
      <svg width="120" height="40" className="overflow-visible">
        <motion.line x1="0" y1="20" x2="120" y2="20" stroke="#10B981" strokeWidth="2" strokeDasharray="6 4" style={{ animation: 'dashFlow 1s linear infinite' }} initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.7 }} transition={{ delay: 0.5, duration: 0.5 }} />
        <motion.text x="30" y="14" fill="#10B981" fontSize="10" fontFamily="JetBrains Mono" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }}>docker run</motion.text>
      </svg>
      <motion.div className="flex flex-col items-center" initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.0, type: 'spring', stiffness: 200 }}>
        <div className="w-24 h-24 rounded-lg border-2 border-emerald-500 flex flex-col items-center justify-center bg-emerald-500/10" style={{ animation: 'glowPulse 2s ease-in-out infinite' }}>
          <span className="text-2xl">📦</span>
          <span className="text-[10px] font-mono text-emerald-400 mt-1">CONTAINER</span>
        </div>
        <motion.div className="flex items-center gap-1 mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 }}>
          <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          <span className="text-xs font-mono text-emerald-400">RUNNING</span>
        </motion.div>
      </motion.div>
      <motion.div className="absolute bottom-6 left-1/2 -translate-x-1/2" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 2.4 }}>
        <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
          <span className="text-emerald-400 font-mono text-sm">Hello from Docker! 🐳  Container exited with code 0 ✓</span>
        </div>
      </motion.div>
    </div>
  );
};

const AnimPs = ({ onDone }: { onDone: () => void }) => {
  useEffect(() => { const t = setTimeout(onDone, 2200); return () => clearTimeout(t); }, [onDone]);
  return (
    <div className="flex flex-col items-center justify-center h-full px-4">
      <table className="border-collapse">
        <motion.thead initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ duration: 0.3 }}>
          <tr>{['CONTAINER ID', 'IMAGE', 'STATUS', 'PORTS', 'NAMES'].map(h => (
            <th key={h} className="px-3 py-1 text-xs font-mono text-muted-foreground text-left">{h}</th>
          ))}</tr>
        </motion.thead>
        <tbody>
          <motion.tr initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.4 }}>
            <td className="px-3 py-1 text-xs font-mono text-foreground/80">a1b2c3d4</td>
            <td className="px-3 py-1 text-xs font-mono text-foreground/80">hello-world</td>
            <td className="px-3 py-1 text-xs font-mono text-emerald-400">
              <motion.span className="inline-flex items-center gap-1" initial={{ opacity: 1 }} animate={{ opacity: 1 }}>
                <motion.span className="w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5, delay: 1.2 }} />
                Up 2 min
              </motion.span>
            </td>
            <td className="px-3 py-1 text-xs font-mono text-muted-foreground">—</td>
            <td className="px-3 py-1 text-xs font-mono text-amber-400">graceful_turing</td>
          </motion.tr>
          <motion.tr initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.7 }}>
            <td className="px-3 py-1 text-xs font-mono text-foreground/80">e5f6g7h8</td>
            <td className="px-3 py-1 text-xs font-mono text-foreground/80">nginx</td>
            <td className="px-3 py-1 text-xs font-mono text-emerald-400">
              <motion.span className="inline-flex items-center gap-1">
                <motion.span className="w-1.5 h-1.5 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.3, 1] }} transition={{ repeat: Infinity, duration: 1.5, delay: 1.2 }} />
                Up 5 min
              </motion.span>
            </td>
            <td className="px-3 py-1 text-xs font-mono text-foreground/80">8080→80</td>
            <td className="px-3 py-1 text-xs font-mono text-amber-400">web_server</td>
          </motion.tr>
        </tbody>
      </table>
      <motion.p className="text-xs font-mono text-muted-foreground mt-4" initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.7 }}>
        2 containers currently running
      </motion.p>
    </div>
  );
};

const AnimStop = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);
  useEffect(() => {
    const timers = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 1400),
      setTimeout(() => setPhase(3), 2000),
      setTimeout(() => { setPhase(4); onDone(); }, 2600),
    ];
    return () => timers.forEach(clearTimeout);
  }, [onDone]);

  const borderColor = phase >= 3 ? 'border-muted-foreground/30' : phase >= 1 ? 'border-amber-500' : 'border-emerald-500';
  const bgColor = phase >= 3 ? 'bg-muted/10' : phase >= 1 ? 'bg-amber-500/5' : 'bg-emerald-500/10';
  const shadow = phase < 1 ? { animation: 'glowPulse 2s ease-in-out infinite' as const } : {};

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center">
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ duration: 0.4 }}>
        <div className={`w-28 h-28 rounded-lg border-2 ${borderColor} ${bgColor} flex flex-col items-center justify-center transition-all duration-500`} style={shadow}>
          <span className={`text-3xl transition-all duration-500 ${phase >= 3 ? 'grayscale opacity-50' : ''}`}>📦</span>
        </div>
      </motion.div>
      <div className="mt-3 h-6 flex items-center">
        {phase === 0 && <span className="flex items-center gap-1 text-xs font-mono text-emerald-400"><span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />● RUNNING</span>}
        {phase === 1 && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-mono text-amber-400">⏸ STOPPING...</motion.span>}
        {phase === 2 && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-mono text-amber-400">⏳ Waiting for graceful shutdown...</motion.span>}
        {phase >= 3 && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs font-mono text-red-400/70">■ STOPPED</motion.span>}
      </div>
      {phase >= 1 && phase < 3 && (
        <motion.p className="text-[10px] font-mono text-muted-foreground mt-2" initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
          Sending SIGTERM signal...
        </motion.p>
      )}
      {phase >= 4 && (
        <motion.div className="absolute bottom-6" initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}>
          <div className="px-4 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/30">
            <span className="text-emerald-400 font-mono text-sm">✓ Container stopped successfully</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

const Level1Interactive = () => {
  const navigate = useNavigate();
  const { completeLevel, completedLevels, totalXP } = useGameStore();
  const [completed, setCompleted] = useState<Set<CommandId>>(new Set());
  const [active, setActive] = useState<CommandId | null>(null);
  const [animating, setAnimating] = useState(false);
  const [terminalLines, setTerminalLines] = useState<{ text: string; type: 'cmd' | 'output' }[]>([]);
  const [localXP, setLocalXP] = useState(0);
  const [levelDone, setLevelDone] = useState(false);
  const termRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (termRef.current) termRef.current.scrollTop = termRef.current.scrollHeight;
  }, [terminalLines]);

  const runCommand = useCallback((id: CommandId) => {
    if (animating) return;
    setActive(id);
    setAnimating(true);

    // Append terminal output with staggered timing
    const output = TERMINAL_OUTPUTS[id];
    const allLines = [{ text: output.prefix, type: 'cmd' as const }, ...output.lines.map(l => ({ text: l, type: 'output' as const }))];
    allLines.forEach((line, i) => {
      setTimeout(() => setTerminalLines(prev => [...prev, line]), i * 120);
    });
  }, [animating]);

  const handleAnimDone = useCallback(() => {
    if (!active) return;
    const wasNew = !completed.has(active);
    const next = new Set(completed);
    next.add(active);
    setCompleted(next);
    setAnimating(false);

    if (wasNew) {
      setLocalXP(prev => prev + 20);
    }

    if (next.size === 5 && !levelDone) {
      setLevelDone(true);
      if (!completedLevels.includes(1)) completeLevel(1);
    }
  }, [active, completed, levelDone, completedLevels, completeLevel]);

  const animKey = active ? `${active}-${Date.now()}` : '';

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#070B14' }}>
      {/* ─── Navbar ─── */}
      <nav className="shrink-0 border-b border-border px-4 py-2.5 flex items-center justify-between" style={{ background: '#0F172A' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground text-sm mr-2">←</button>
          <span className="text-xl">🐳</span>
          <div>
            <h1 className="font-syne font-bold text-accent text-sm tracking-wide">DOCKER QUEST</h1>
            <p className="text-[10px] text-muted-foreground font-mono">Level 1 — What is Docker?</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-syne font-bold text-amber-400 text-sm">⚡ {localXP}</span>
          <div className="hidden sm:flex items-center gap-1.5">
            {COMMANDS.map(cmd => (
              <div key={cmd.id} className="w-2.5 h-2.5 rounded-full border transition-colors duration-300" style={{
                borderColor: completed.has(cmd.id) ? cmd.color : '#1F2D45',
                backgroundColor: completed.has(cmd.id) ? cmd.color : 'transparent',
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
            <span className="font-syne font-bold text-emerald-400 text-sm">🎉 Level 1 Complete! +100 XP — You understand the basics of Docker!</span>
            <button onClick={() => navigate('/level/2')} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-syne font-bold text-xs hover:opacity-90 transition-opacity">
              Continue to Level 2 →
            </button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ─── Body ─── */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Panel */}
        <div className="flex-[58] flex flex-col min-h-0 border-r border-border">
          {/* Command Bar */}
          <div className="shrink-0 flex items-center gap-2 p-3 border-b border-border overflow-x-auto" style={{ background: '#0F172A' }}>
            {COMMANDS.map(cmd => {
              const isDone = completed.has(cmd.id);
              const isActive = active === cmd.id && animating;
              const isDisabled = animating && !isActive;
              return (
                <button
                  key={cmd.id}
                  onClick={() => runCommand(cmd.id)}
                  disabled={isDisabled}
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono whitespace-nowrap transition-all duration-200 ${
                    isActive ? `${cmd.bgTint} ${cmd.borderClass} ${cmd.colorClass}` :
                    isDone ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400' :
                    'bg-secondary/30 border-border text-muted-foreground hover:border-muted-foreground/50'
                  } ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={isActive ? { boxShadow: cmd.glowStyle } : {}}
                >
                  <span className="text-xs">{isDone ? '✓' : '▶'}</span>
                  {cmd.label}
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
                  <p className="text-sm text-muted-foreground mt-4 font-mono">Click a command above to see it animated</p>
                </motion.div>
              )}
              {active && (
                <motion.div key={animKey} className="absolute inset-0" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {/* Command badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: COMMANDS.find(c => c.id === active)!.color }} />
                    <span className="text-xs font-mono" style={{ color: COMMANDS.find(c => c.id === active)!.color }}>
                      {COMMANDS.find(c => c.id === active)!.label}
                    </span>
                  </div>
                  {active === 'pull' && <AnimPull onDone={handleAnimDone} />}
                  {active === 'images' && <AnimImages onDone={handleAnimDone} />}
                  {active === 'run' && <AnimRun onDone={handleAnimDone} />}
                  {active === 'ps' && <AnimPs onDone={handleAnimDone} />}
                  {active === 'stop' && <AnimStop onDone={handleAnimDone} />}
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Terminal Output */}
          <div className="shrink-0 border-t border-border" style={{ height: 200 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: '#0D1117' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-[10px] font-mono text-muted-foreground ml-1">docker-quest terminal</span>
            </div>
            <div ref={termRef} className="terminal-black p-3 overflow-y-auto font-mono text-[13px] leading-5" style={{ height: 'calc(200px - 28px)' }}>
              {terminalLines.length === 0 ? (
                <span className="text-muted-foreground/50">
                  Click a command above to see terminal output...
                  <span className="inline-block w-2 h-4 bg-muted-foreground/50 ml-1" style={{ animation: 'blink 1s infinite' }} />
                </span>
              ) : (
                terminalLines.map((line, i) => (
                  <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                    {line.type === 'cmd' ? (
                      <span className="text-emerald-400">{line.text}</span>
                    ) : (
                      <span className="text-foreground/70">{line.text}</span>
                    )}
                  </motion.div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Panel - Notes */}
        <div className="flex-[42] overflow-y-auto min-h-0" style={{ background: '#0F172A' }}>
          <div className="p-4">
            {/* Panel header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span>📖</span>
                <h2 className="font-syne font-bold text-foreground text-sm">Command Reference</h2>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">Level 1 — What is Docker?</span>
            </div>

            {/* Concept card */}
            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: '#1E3A5F', background: '#0F172A' }}>
              <h3 className="font-syne font-bold text-foreground text-sm mb-2">🐳 What is Docker?</h3>
              <p className="text-xs text-foreground/70 leading-relaxed font-body">
                Docker is a platform that packages your application and all its dependencies into a lightweight, portable unit called a container. Unlike Virtual Machines, containers share the host OS kernel — making them faster, smaller, and more efficient to run.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['Portable', 'Lightweight', 'Isolated', 'Reproducible'].map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-mono text-accent border border-accent/30 bg-accent/5">{tag}</span>
                ))}
              </div>
            </div>

            {/* Command cards */}
            {COMMANDS.map(cmd => {
              const data = CARD_DATA[cmd.id];
              const isDone = completed.has(cmd.id);
              const isActive = active === cmd.id;
              return (
                <motion.div
                  key={cmd.id}
                  onClick={() => runCommand(cmd.id)}
                  className={`rounded-lg border p-3 mb-3 cursor-pointer transition-all duration-300 ${
                    isActive ? `${cmd.borderClass} ${cmd.bgTint}` :
                    isDone ? 'border-emerald-500/30 bg-card' : 'border-border bg-card hover:border-muted-foreground/30'
                  }`}
                  style={isActive ? { boxShadow: cmd.glowStyle, transform: 'scale(1.01)' } : {}}
                  layout
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: cmd.color }} />
                      <span className={`font-mono font-bold text-xs ${isActive ? cmd.colorClass : isDone ? 'text-emerald-400' : 'text-foreground'}`}>{cmd.label}</span>
                    </div>
                    {isDone && <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">✓ Completed</span>}
                  </div>
                  <div className="rounded px-2 py-1 mb-2 bg-background/50 border border-border">
                    <code className="text-[11px] font-mono text-muted-foreground">{data.syntax}</code>
                  </div>
                  <div className="space-y-1.5">
                    <div>
                      <span className="text-[10px] font-syne font-bold text-muted-foreground uppercase tracking-wider">What it does</span>
                      <p className="text-[11px] text-foreground/60 leading-relaxed">{data.whatItDoes}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-syne font-bold text-muted-foreground uppercase tracking-wider">Use case</span>
                      <p className="text-[11px] text-foreground/60 leading-relaxed">{data.useCase}</p>
                    </div>
                    <div>
                      <span className="text-[10px] font-syne font-bold text-muted-foreground uppercase tracking-wider">Example</span>
                      <div className="rounded px-2 py-1 bg-background/50 border border-border mt-0.5">
                        <code className="text-[11px] font-mono text-accent">{data.example}</code>
                      </div>
                    </div>
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

export default Level1Interactive;
