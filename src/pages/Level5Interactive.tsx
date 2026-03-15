import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { usePausableTimers } from '@/hooks/usePausableTimers';

type TopicId = 'image-to-container' | 'writable-layer' | 'port-mapping' | 'detached' | 'commands';

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
  { id: 'image-to-container', label: 'Image → Container', icon: '🔄', color: '#10B981', colorClass: 'text-emerald-400', borderClass: 'border-emerald-500', bgTint: 'bg-emerald-500/10', glowStyle: '0 0 12px rgba(16,185,129,0.4)' },
  { id: 'writable-layer', label: 'Writable Layer', icon: '📝', color: '#8B5CF6', colorClass: 'text-purple-400', borderClass: 'border-purple-500', bgTint: 'bg-purple-500/10', glowStyle: '0 0 12px rgba(139,92,246,0.4)' },
  { id: 'port-mapping', label: 'Port Mapping', icon: '🔌', color: '#06B6D4', colorClass: 'text-cyan-400', borderClass: 'border-cyan-500', bgTint: 'bg-cyan-500/10', glowStyle: '0 0 12px rgba(6,182,212,0.4)' },
  { id: 'detached', label: 'Detached Mode', icon: '🚀', color: '#F97316', colorClass: 'text-orange-400', borderClass: 'border-orange-500', bgTint: 'bg-orange-500/10', glowStyle: '0 0 12px rgba(249,115,22,0.4)' },
  { id: 'commands', label: 'Container Commands', icon: '⌨️', color: '#F59E0B', colorClass: 'text-amber-400', borderClass: 'border-amber-500', bgTint: 'bg-amber-500/10', glowStyle: '0 0 12px rgba(245,158,11,0.4)' },
];

const INFO_LOGS: Record<TopicId, { prefix: string; lines: string[] }> = {
  'image-to-container': {
    prefix: '> Loading: Container Creation',
    lines: [
      '$ docker run -d -p 3000:3000 --name my-app node-app',
      '# docker run = docker create + docker start in one command',
      '# -d         = detached mode (run in background)',
      '# -p 3000:3000 = map host port 3000 to container port 3000',
      '# --name     = assign a human-readable name (else random name)',
      '# Result: container ID printed, container starts immediately',
      '> Container created and running ✓',
    ],
  },
  'writable-layer': {
    prefix: '> Loading: Writable Layer Explained',
    lines: [
      '# Every container gets a thin writable layer on top of the image layers',
      '# All file changes during runtime go into this writable layer',
      '# When container is removed: writable layer is permanently deleted',
      '# When container is stopped (not removed): writable layer survives',
      '$ docker stop my-app    # stops container, data preserved',
      '$ docker rm my-app      # removes container AND its writable layer',
      '# Solution: mount a Volume to persist data outside the container',
      '> Writable layer demo complete ✓',
    ],
  },
  'port-mapping': {
    prefix: '> Loading: Port Mapping',
    lines: [
      '$ docker run -p 8080:80 nginx',
      '# Format: -p HOST_PORT:CONTAINER_PORT',
      '# Host port 8080: what you access from your browser',
      '# Container port 80: what nginx listens on inside',
      '$ curl http://localhost:8080    # accesses nginx through the mapping',
      '# Multiple ports: docker run -p 8080:80 -p 443:443 nginx',
      '# Random host port: docker run -p 80 nginx  (Docker assigns host port)',
      '> Port mapping demo complete ✓',
    ],
  },
  detached: {
    prefix: '> Loading: Detached Mode vs Foreground',
    lines: [
      '$ docker run nginx          # foreground: terminal blocked',
      '$ docker run -d nginx       # detached: terminal free immediately',
      '# Container ID returned: a1b2c3d4e5f6789a...',
      '$ docker ps                 # verify container is running',
      '$ docker logs -f nginx      # follow logs in real-time (-f = follow)',
      '$ docker attach nginx       # re-attach to foreground (then Ctrl+PQ to detach)',
      '> Detached mode demo complete ✓',
    ],
  },
  commands: {
    prefix: '> Loading: Essential Container Commands',
    lines: [
      '$ docker run -d --name web nginx   # create + start',
      '$ docker exec -it web bash         # enter container shell',
      '$ docker logs web                  # view stdout/stderr logs',
      '$ docker logs -f web               # follow logs live',
      '$ docker inspect web               # full JSON metadata',
      '$ docker stats web                 # live CPU/memory usage',
      '$ docker stop web                  # graceful shutdown',
      '$ docker rm web                    # remove stopped container',
      '$ docker rm -f web                 # force remove (even if running)',
      '> Container command reference loaded ✓',
    ],
  },
};

interface CardSection { title: string; text: string }

const CARD_DATA: Record<TopicId, { heading: string; sections: CardSection[] }> = {
  'image-to-container': {
    heading: 'How a Container is Created',
    sections: [
      { title: 'The process', text: "When you run docker run, Docker performs several steps automatically:\n1. Checks if the image exists locally (pulls from Docker Hub if not)\n2. Creates a new container layer on top of the image layers\n3. Allocates a network interface and assigns an internal IP address\n4. Sets up the isolated filesystem using the image layers + writable layer\n5. Executes the CMD or ENTRYPOINT instruction specified in the image\nThe entire process typically takes under one second." },
      { title: 'docker run anatomy', text: "docker run [OPTIONS] IMAGE [COMMAND] [ARGS]\nCommon options:\n  -d           run in detached (background) mode\n  -p 8080:80   map host port 8080 to container port 80\n  --name web   assign the name 'web' to the container\n  -e KEY=VALUE set an environment variable\n  -v /host:/container  mount a volume\n  --rm         automatically remove container when it exits\n  -it          interactive terminal (for running bash)" },
      { title: 'Container vs Image', text: 'An image is like a stopped clock — frozen in time, unchanging. A container is the clock running — alive, consuming resources, potentially changing state. You can have 100 containers all running from the same single image.' },
    ],
  },
  'writable-layer': {
    heading: 'The Container Writable Layer',
    sections: [
      { title: 'What it is', text: 'Every container gets a thin writable layer added on top of the read-only image layers. This is where all runtime changes go: files created or modified, logs written, data stored. The image layers underneath are never touched — this is what makes containers safe to share and restart.' },
      { title: 'Copy-on-write', text: 'Docker uses a copy-on-write (CoW) strategy. If a container needs to modify a file that exists in a read-only image layer, Docker first copies that file up into the writable layer, then modifies the copy. The original in the image layer remains unchanged. This keeps images immutable and shareable.' },
      { title: 'The ephemerality problem', text: "When you docker rm a container, its writable layer is permanently deleted. This means any data written inside the container during its lifetime — database records, uploaded files, logs — is gone forever unless you've persisted it using a Volume or bind mount." },
      { title: 'When data survives', text: 'docker stop (not docker rm) only pauses the container. The writable layer survives a stop. Running docker start restarts the container with all its previous filesystem changes intact. Data is only lost on docker rm.' },
    ],
  },
  'port-mapping': {
    heading: 'Container Port Mapping Explained',
    sections: [
      { title: 'The problem', text: "By default, a container's network is completely isolated. If nginx is running inside a container and listening on port 80, nothing outside the container can reach it — not your browser, not other services. You must explicitly publish ports to make them accessible." },
      { title: 'The syntax', text: '-p hostPort:containerPort\nThe host port is the port on YOUR machine that external traffic connects to. The container port is the port the application inside the container listens on. Docker routes traffic from one to the other automatically.' },
      { title: 'Practical examples', text: 'docker run -p 8080:80 nginx      → access nginx at localhost:8080\ndocker run -p 5432:5432 postgres → access postgres at localhost:5432\ndocker run -p 3000:3000 node-app → access Node.js at localhost:3000\ndocker run -p 80 nginx           → Docker picks a random host port' },
      { title: 'Viewing port mappings', text: 'docker ps shows port mappings in the PORTS column.\ndocker port <container> shows the exact mapping.\nExample output: 0.0.0.0:8080->80/tcp' },
    ],
  },
  detached: {
    heading: 'Foreground vs Detached Mode',
    sections: [
      { title: 'Foreground mode (default)', text: 'Without the -d flag, docker run attaches your terminal to the container\'s stdout and stderr streams. You see all output in real-time, but your terminal is blocked — you cannot run other commands. Pressing Ctrl+C sends a SIGINT signal to the container, which usually stops it.' },
      { title: 'Detached mode (-d)', text: 'With the -d flag, the container starts in the background. Docker prints the full container ID and returns your terminal prompt immediately. The container keeps running independently. This is what you want 99% of the time for web servers, databases, and long-running services.' },
      { title: 'Working with detached containers', text: 'docker logs <name>     — view all stdout/stderr output\ndocker logs -f <name>  — follow logs in real-time (like tail -f)\ndocker attach <name>   — reattach your terminal to the container\ndocker stats <name>    — live CPU, memory, network usage dashboard' },
      { title: 'The -it flag', text: 'For interactive containers (like running bash), use -it instead of -d.\n-i keeps stdin open, -t allocates a pseudo-TTY (terminal).\nExample: docker run -it ubuntu bash  — drops you into an Ubuntu shell.\nType exit to leave. The container stops when you exit.' },
    ],
  },
  commands: {
    heading: 'Container Lifecycle Commands',
    sections: [
      { title: 'Creating and running', text: 'docker run -d --name web nginx     create and start a container\ndocker create --name web nginx     create without starting\ndocker start web                   start a stopped container\ndocker restart web                 stop then start again' },
      { title: 'Inspecting and debugging', text: 'docker ps                 list running containers\ndocker ps -a              list ALL containers (including stopped)\ndocker logs web           view container stdout/stderr logs\ndocker logs -f web        follow logs in real-time\ndocker exec -it web bash  open a shell inside a running container\ndocker inspect web        full JSON metadata (IP, mounts, env vars)\ndocker stats              live resource usage for all containers' },
      { title: 'Stopping and removing', text: 'docker stop web           graceful stop (SIGTERM then SIGKILL after 10s)\ndocker kill web           immediate stop (SIGKILL)\ndocker rm web             remove a stopped container\ndocker rm -f web          force remove (even if running)\ndocker container prune    remove all stopped containers' },
      { title: 'Pro tip', text: "Combine --rm with docker run to auto-remove the container when it exits:\ndocker run --rm -it ubuntu bash\nPerfect for one-off tasks where you don't want leftover containers." },
    ],
  },
};

// ─── Animation 1: Image to Container ─────────────────────────────────────────

const AnimImageToContainer = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => setPhase(1), 700);
    schedule(() => setPhase(2), 1400);
    schedule(() => setPhase(3), 2100);
    schedule(() => setPhase(4), 2800);
    schedule(onDone, 3500);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  const IMAGE_LAYERS = [
    { label: 'CMD node server.js', color: '#374151' },
    { label: 'npm install + app', color: '#1F2937' },
    { label: 'ubuntu base OS', color: '#111827' },
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-3">
      {/* Command */}
      {phase >= 1 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="rounded px-3 py-1.5 font-mono text-[11px]" style={{ background: '#0D1117', border: '1px solid #1F2D45' }}>
          <span className="text-emerald-400">$ </span>
          <span className="text-foreground">docker run </span>
          <span className="text-orange-400">-d </span>
          <span className="text-cyan-400">-p 3000:3000 </span>
          <span className="text-purple-400">--name my-app </span>
          <span className="text-foreground">node-app</span>
        </motion.div>
      )}

      <div className="flex items-center gap-6">
        {/* Image stack — hidden after morph */}
        {phase < 3 && (
          <motion.div
            animate={phase >= 2 ? { scale: 0.9, opacity: 0.3, boxShadow: '0 0 20px rgba(16,185,129,0.5)' } : {}}
            className="flex flex-col gap-0.5 relative"
          >
            {phase >= 2 && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                className="rounded border-2 px-3 py-1 text-center text-[9px] font-mono"
                style={{ borderColor: '#10B981', background: '#10B98115', color: '#10B981' }}
              >
                ✏️ Writable Container Layer
              </motion.div>
            )}
            {IMAGE_LAYERS.map((l, i) => (
              <div key={i} className="rounded border px-3 py-1 text-center text-[9px] font-mono" style={{ borderColor: '#374151', background: l.color, color: '#9CA3AF' }}>
                🔒 {l.label}
              </div>
            ))}
            <span className="text-[9px] text-muted-foreground font-mono text-center mt-1">Docker Image (read-only)</span>
          </motion.div>
        )}

        {/* Arrow */}
        {phase >= 2 && phase < 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <svg width="40" height="20"><line x1="0" y1="10" x2="40" y2="10" stroke="#10B981" strokeWidth="2" strokeDasharray="6 4" style={{ animation: 'dashFlow 1.2s linear infinite' }} /></svg>
          </motion.div>
        )}

        {/* Container box */}
        {phase >= 3 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 200, damping: 20 }}
            className="rounded-xl border-2 p-4 flex flex-col items-center gap-1.5"
            style={{ borderColor: '#10B981', background: '#10B98108', boxShadow: '0 0 20px rgba(16,185,129,0.25)' }}
          >
            <div className="flex items-center gap-2">
              <span className="text-lg">📦</span>
              <span className="text-sm font-mono font-bold text-emerald-400">my-app</span>
            </div>
            <div className="flex items-center gap-1">
              <motion.span className="w-2 h-2 rounded-full bg-emerald-400" animate={{ opacity: [1, 0.4, 1] }} transition={{ repeat: Infinity, duration: 1.5 }} />
              <span className="text-[10px] font-mono text-emerald-400">RUNNING</span>
            </div>
            <div className="text-[9px] font-mono text-muted-foreground">node:18 | Port 3000</div>
            <div className="text-[9px] font-mono text-muted-foreground">ID: a1b2c3d4e5f6</div>
          </motion.div>
        )}
      </div>

      {/* Info badges */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-2 items-center">
          <div className="flex gap-2 flex-wrap justify-center">
            {[
              { text: '🔒 Read-only layers: 3', d: 0 },
              { text: '✏️ Writable layer: 1', d: 0.15 },
              { text: '⚡ Started in 0.3s', d: 0.3 },
            ].map(b => (
              <motion.span key={b.text} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: b.d }} className="text-[9px] font-mono px-2 py-1 rounded border" style={{ borderColor: '#1F2D45', background: '#111827', color: '#94A3B8' }}>
                {b.text}
              </motion.span>
            ))}
          </div>
          <div className="px-4 py-1.5 rounded-lg" style={{ background: '#10B98110', border: '1px solid #10B98130' }}>
            <span className="text-emerald-400 font-mono text-[11px]">Container is live! Image layers are read-only. Only the top writable layer can be modified.</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 2: Writable Layer ─────────────────────────────────────────────

const AnimWritableLayer = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => setPhase(1), 600);
    schedule(() => setPhase(2), 1500);
    schedule(() => setPhase(3), 2100);
    schedule(() => setPhase(4), 2700);
    schedule(onDone, 3500);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  const WRITES = [
    { icon: '📄', label: 'Logs → /var/log/app.log', delay: 0 },
    { icon: '🗄️', label: 'User data → /data/', delay: 0.3 },
    { icon: '⚙️', label: 'Config changes saved', delay: 0.6 },
  ];

  const RO_LAYERS = ['Base OS Layer', 'Runtime Layer', 'App Layer'];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-2">
      {/* Layer stack */}
      <div className="flex flex-col gap-0.5 relative">
        {/* Writable layer */}
        <AnimatePresence>
          {phase < 3 && (
            <motion.div
              exit={{ opacity: 0, scaleY: 0 }}
              transition={{ duration: 0.4 }}
              className={`rounded border-2 px-4 py-2 text-center relative overflow-hidden ${phase === 2 ? 'border-red-500/60' : 'border-purple-500/60'}`}
              style={{ background: phase === 2 ? '#EF444410' : '#8B5CF610', originY: 0 }}
            >
              <div className="text-[10px] font-mono font-bold" style={{ color: phase === 2 ? '#EF4444' : '#8B5CF6' }}>
                {phase === 2 ? '■ STOPPED' : '✏️ Writable Layer'} — READ-WRITE
              </div>
              {/* Write operations landing */}
              {phase >= 1 && phase < 2 && (
                <div className="flex gap-2 justify-center mt-1">
                  {WRITES.map((w, i) => (
                    <motion.span key={i} initial={{ opacity: 0, x: -40 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: w.delay, duration: 0.4 }} className="text-[9px] font-mono text-purple-300">
                      {w.icon} {w.label.split('→')[0]}
                    </motion.span>
                  ))}
                </div>
              )}
            </motion.div>
          )}
        </AnimatePresence>

        {phase >= 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded border-2 border-red-500/40 px-4 py-2 text-center" style={{ background: '#EF444410' }}>
            <span className="text-[10px] font-mono text-red-400">✗ Writable layer DELETED — data lost forever</span>
          </motion.div>
        )}

        {/* Read-only layers */}
        {RO_LAYERS.map((layer, i) => (
          <div key={i} className="rounded border px-4 py-1 text-center text-[9px] font-mono" style={{ borderColor: '#374151', background: '#111827', color: '#6B7280' }}>
            🔒 {layer} — READ-ONLY
          </div>
        ))}
      </div>

      {/* Write operations info */}
      {phase === 1 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-2">
          {WRITES.map((w, i) => (
            <motion.span key={i} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: w.delay + 0.2 }} className="text-[9px] font-mono text-purple-300 px-2 py-0.5 rounded border" style={{ borderColor: '#8B5CF630', background: '#8B5CF608' }}>
              {w.icon} {w.label}
            </motion.span>
          ))}
        </motion.div>
      )}

      {/* Warning */}
      {phase >= 3 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="text-[10px] font-mono text-red-400">
          ⚠️ Data in the writable layer is LOST when the container is removed!
        </motion.div>
      )}

      {/* Solution: Volumes tease */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-4 items-start">
          <div className="flex flex-col items-center gap-1 rounded border p-2" style={{ borderColor: '#EF444440', background: '#EF444408' }}>
            <span className="text-[9px] font-mono text-red-400">Without Volume</span>
            <span className="text-sm">📦💥</span>
            <span className="text-[9px] text-red-400">✗ Data lost</span>
          </div>
          <div className="flex flex-col items-center gap-1 rounded border p-2" style={{ borderColor: '#10B98140', background: '#10B98108' }}>
            <span className="text-[9px] font-mono text-emerald-400">With Volume</span>
            <div className="flex items-center gap-1">
              <span className="text-sm">📦</span>
              <span className="text-[9px] text-cyan-400">→</span>
              <span className="text-sm">💾</span>
            </div>
            <span className="text-[9px] text-emerald-400">✓ Data persists</span>
          </div>
        </motion.div>
      )}

      {phase >= 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-4 py-1.5 rounded-lg" style={{ background: '#8B5CF610', border: '1px solid #8B5CF630' }}>
          <span className="text-purple-400 font-mono text-[11px]">Use Volumes to persist data beyond the container lifecycle. (Level 9)</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 3: Port Mapping ───────────────────────────────────────────────

const AnimPortMapping = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => setPhase(1), 700);
    schedule(() => setPhase(2), 1300);
    schedule(() => setPhase(3), 2000);
    schedule(() => setPhase(4), 2600);
    schedule(onDone, 3400);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-3">
      {/* Command */}
      {phase >= 1 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} className="rounded px-3 py-1 font-mono text-[11px]" style={{ background: '#0D1117', border: '1px solid #1F2D45' }}>
          <span className="text-emerald-400">$ </span>docker run <span className="text-cyan-400">-p 8080:80</span> nginx
          <div className="text-[9px] text-muted-foreground mt-0.5 text-center">hostPort : containerPort</div>
        </motion.div>
      )}

      {/* Diagram: Browser → Host Port → Container Port */}
      <div className="flex items-center gap-3">
        {/* Browser */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex flex-col items-center gap-1">
          <span className="text-2xl">🌐</span>
          <span className="text-[9px] font-mono text-foreground">Your Browser</span>
          <span className="text-[9px] font-mono text-cyan-400">localhost:8080</span>
          {phase >= 3 && (
            <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] font-mono text-emerald-400 px-1.5 py-0.5 rounded" style={{ background: '#10B98115' }}>✓ 200 OK</motion.span>
          )}
        </motion.div>

        {/* Request arrow */}
        {phase >= 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center">
            <span className="text-[8px] font-mono text-cyan-400">Request →</span>
            <svg width="50" height="12"><line x1="0" y1="6" x2="50" y2="6" stroke="#06B6D4" strokeWidth="2" strokeDasharray="6 4" style={{ animation: 'dashFlow 1.2s linear infinite' }} /></svg>
            {phase >= 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
                <span className="text-[8px] font-mono text-emerald-400">← Response</span>
                <svg width="50" height="12"><line x1="50" y1="6" x2="0" y2="6" stroke="#10B981" strokeWidth="2" strokeDasharray="6 4" style={{ animation: 'dashFlow 1.2s linear infinite' }} /></svg>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* Host Machine */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }} className="flex flex-col items-center gap-1">
          <div className="rounded-lg border-2 px-3 py-2 text-center" style={{ borderColor: '#1F2D45', background: '#111827' }}>
            <span className="text-[9px] font-mono text-muted-foreground">Host Machine</span>
            <div className={`rounded px-2 py-0.5 mt-1 text-[10px] font-mono font-bold transition-all ${phase >= 2 ? 'text-cyan-400' : 'text-foreground/60'}`} style={{ background: phase >= 2 ? '#06B6D415' : '#0F172A', border: `1px solid ${phase >= 2 ? '#06B6D450' : '#1F2D45'}` }}>
              Port 8080
            </div>
          </div>
        </motion.div>

        {/* Inner arrow */}
        {phase >= 2 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
            <svg width="30" height="12"><line x1="0" y1="6" x2="30" y2="6" stroke="#06B6D4" strokeWidth="2" strokeDasharray="4 3" opacity="0.5" style={{ animation: 'dashFlow 1.2s linear infinite' }} /></svg>
          </motion.div>
        )}

        {/* Container */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }} className="flex flex-col items-center gap-1">
          <div className="rounded-lg border-2 px-3 py-2 text-center" style={{ borderColor: '#06B6D440', background: '#06B6D408' }}>
            <span className="text-[9px] font-mono text-cyan-400">📦 nginx container</span>
            <div className={`rounded px-2 py-0.5 mt-1 text-[10px] font-mono font-bold transition-all ${phase >= 2 ? 'text-cyan-400' : 'text-foreground/60'}`} style={{ background: phase >= 2 ? '#06B6D415' : '#0F172A', border: `1px solid ${phase >= 2 ? '#06B6D450' : '#1F2D45'}` }}>
              Port 80
            </div>
          </div>
        </motion.div>
      </div>

      {/* More examples */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col gap-1 items-center">
          {[
            { cmd: '-p 3000:3000', app: 'Node.js app' },
            { cmd: '-p 5432:5432', app: 'PostgreSQL' },
            { cmd: '-p 6379:6379', app: 'Redis' },
          ].map((ex, i) => (
            <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.15 }} className="text-[9px] font-mono text-muted-foreground">
              docker run <span className="text-cyan-400">{ex.cmd}</span> {ex.app}
            </motion.span>
          ))}
          <div className="mt-1 px-4 py-1.5 rounded-lg" style={{ background: '#06B6D410', border: '1px solid #06B6D430' }}>
            <span className="text-cyan-400 font-mono text-[11px]">-p HOST_PORT:CONTAINER_PORT — Host port is your browser, container port is the app.</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 4: Detached Mode ──────────────────────────────────────────────

const AnimDetached = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => setPhase(1), 500);
    schedule(() => setPhase(2), 1000);
    schedule(() => setPhase(3), 1700);
    schedule(() => setPhase(4), 2400);
    schedule(onDone, 3200);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-3 gap-2 overflow-hidden">
      {/* Split headers */}
      <div className="flex gap-3 w-full max-w-lg">
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex-1 text-center">
          <span className="text-[11px] font-syne font-bold text-red-400">Foreground Mode (default)</span>
        </motion.div>
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }} className="flex-1 text-center">
          <span className="text-[11px] font-syne font-bold text-emerald-400">Detached Mode (-d flag)</span>
        </motion.div>
      </div>

      {/* Split terminals */}
      <div className="flex gap-3 w-full max-w-lg">
        {/* Left — Foreground */}
        <div className="flex-1 rounded-lg border overflow-hidden" style={{ borderColor: '#EF444440' }}>
          <div className="px-2 py-1 border-b" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
            <span className="text-[9px] font-mono text-muted-foreground">terminal</span>
          </div>
          <div className="terminal-black p-2 font-mono text-[10px] leading-4" style={{ minHeight: 100 }}>
            <div><span className="text-emerald-400">$ </span>docker run nginx</div>
            {phase >= 1 && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-foreground/40">nginx: start worker processes</motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="text-foreground/40">nginx: ready to accept...</motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="text-foreground/40">... (logs streaming)</motion.div>
              </>
            )}
            {phase >= 1 && phase < 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="mt-1 px-1.5 py-0.5 rounded text-[9px] inline-block" style={{ background: '#EF444420', color: '#EF4444' }}>
                ● Terminal BLOCKED
              </motion.div>
            )}
            {phase >= 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}>
                <div className="text-muted-foreground mt-1">
                  <span className="px-1 py-0.5 rounded text-[9px] border" style={{ borderColor: '#374151' }}>Ctrl</span>
                  {' + '}
                  <span className="px-1 py-0.5 rounded text-[9px] border" style={{ borderColor: '#374151' }}>C</span>
                </div>
                <div className="text-amber-400 text-[9px] mt-0.5">⚠️ Container stops</div>
              </motion.div>
            )}
          </div>
        </div>

        {/* Right — Detached */}
        <div className="flex-1 rounded-lg border overflow-hidden" style={{ borderColor: '#10B98140' }}>
          <div className="px-2 py-1 border-b" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
            <span className="text-[9px] font-mono text-muted-foreground">terminal</span>
          </div>
          <div className="terminal-black p-2 font-mono text-[10px] leading-4" style={{ minHeight: 100 }}>
            <div><span className="text-emerald-400">$ </span>docker run <span className="text-orange-400">-d</span> nginx</div>
            {phase >= 2 && (
              <>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-foreground/60">a1b2c3d4e5f6789a...</motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
                  <span className="text-emerald-400">user@machine:~$ </span>
                  <span className="inline-block w-2 h-3 bg-foreground/50" style={{ animation: 'blink 1s infinite' }} />
                </motion.div>
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="mt-1 px-1.5 py-0.5 rounded text-[9px] inline-block" style={{ background: '#10B98120', color: '#10B981' }}>
                  ● Terminal FREE
                </motion.div>
              </>
            )}
            {phase >= 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-muted-foreground mt-1 space-y-0.5">
                <div><span className="text-emerald-400">$ </span>docker ps</div>
                <div><span className="text-emerald-400">$ </span>docker logs nginx</div>
                <div><span className="text-emerald-400">$ </span>docker stop nginx</div>
              </motion.div>
            )}
          </div>
        </div>
      </div>

      {/* Recommendation */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="px-4 py-1.5 rounded-lg max-w-lg" style={{ background: '#F9731610', border: '1px solid #F9731630' }}>
          <span className="text-orange-400 font-mono text-[11px]">✅ Best practice: Always use -d for servers and services. Foreground only for debugging.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 5: Container Commands ─────────────────────────────────────────

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

type CState = 'none' | 'running' | 'exec' | 'logs' | 'stopped' | 'removed';

const CMD_STEPS: { lines: TermLine[]; state: CState }[] = [
  {
    lines: [
      { text: 'user@docker:~$ docker run -d --name web nginx', type: 'cmd' },
      { text: '  a1b2c3d4e5f6', type: 'success' },
    ],
    state: 'running',
  },
  {
    lines: [
      { text: 'user@docker:~$ docker exec -it web bash', type: 'cmd' },
      { text: '  root@a1b2c3d4:/# ls /etc/nginx', type: 'out' },
      { text: '  conf.d  nginx.conf  sites-enabled', type: 'out' },
      { text: '  root@a1b2c3d4:/# exit', type: 'out' },
    ],
    state: 'exec',
  },
  {
    lines: [
      { text: 'user@docker:~$ docker logs web', type: 'cmd' },
      { text: '  nginx: start worker processes', type: 'out' },
      { text: '  nginx: ready to accept connections', type: 'out' },
    ],
    state: 'logs',
  },
  {
    lines: [
      { text: 'user@docker:~$ docker stop web', type: 'cmd' },
      { text: '  web', type: 'success' },
    ],
    state: 'stopped',
  },
  {
    lines: [
      { text: 'user@docker:~$ docker rm web', type: 'cmd' },
      { text: '  web', type: 'success' },
    ],
    state: 'removed',
  },
];

const STATE_CONFIG: Record<CState, { border: string; bg: string; badge: string; badgeColor: string; icon: string }> = {
  none: { border: '#1F2D45', bg: '#111827', badge: '', badgeColor: '', icon: '' },
  running: { border: '#10B981', bg: '#10B98108', badge: '● RUNNING', badgeColor: '#10B981', icon: '📦' },
  exec: { border: '#10B981', bg: '#10B98108', badge: '🔍 EXEC SESSION', badgeColor: '#06B6D4', icon: '📦' },
  logs: { border: '#10B981', bg: '#10B98108', badge: '📋 LOGS', badgeColor: '#F59E0B', icon: '📦' },
  stopped: { border: '#EF4444', bg: '#EF444408', badge: '■ STOPPED', badgeColor: '#EF4444', icon: '📦' },
  removed: { border: '#374151', bg: '#11182700', badge: '✕ REMOVED', badgeColor: '#6B7280', icon: '' },
};

const AnimCommands = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [stepIdx, setStepIdx] = useState(-1);
  const [visibleLines, setVisibleLines] = useState<TermLine[]>([]);
  const [cState, setCState] = useState<CState>('none');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    const delays = [300, 1100, 2000, 2700, 3300];
    delays.forEach((d, i) => schedule(() => setStepIdx(i), d));
    schedule(onDone, 4000);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  useEffect(() => {
    if (stepIdx < 0) return;
    const step = CMD_STEPS[stepIdx];
    step.lines.forEach((line, i) => {
      schedule(() => setVisibleLines(prev => [...prev, line]), i * 100);
    });
    schedule(() => setCState(step.state), step.lines.length * 100 + 50);
  }, [stepIdx, schedule]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [visibleLines]);

  const sc = STATE_CONFIG[cState];

  return (
    <div className="w-full h-full flex gap-3 p-4">
      {/* Terminal */}
      <div className="flex-[60] rounded-lg overflow-hidden border flex flex-col" style={{ borderColor: '#F59E0B40' }}>
        <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          <span className="text-[10px] font-mono text-muted-foreground ml-1">container lifecycle</span>
        </div>
        <div ref={scrollRef} className="terminal-black p-3 overflow-y-auto font-mono text-[11px] leading-5 flex-1">
          {visibleLines.map((line, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
              {renderTermLine(line)}
            </motion.div>
          ))}
          {stepIdx < CMD_STEPS.length - 1 && (
            <span className="inline-block w-2 h-4 bg-foreground/50" style={{ animation: 'blink 1s infinite' }} />
          )}
        </div>
      </div>

      {/* Container State Visualizer */}
      <div className="flex-[40] rounded-lg border p-3 flex flex-col items-center justify-center" style={{ borderColor: '#F59E0B30', background: '#0F172A' }}>
        <h4 className="text-[11px] font-syne font-bold text-amber-400 mb-3">Container State</h4>
        <AnimatePresence mode="wait">
          {cState !== 'none' && cState !== 'removed' ? (
            <motion.div
              key={cState}
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.8 }}
              transition={{ duration: 0.35 }}
              className="rounded-xl border-2 p-4 flex flex-col items-center gap-2 w-full max-w-[160px]"
              style={{ borderColor: sc.border, background: sc.bg, boxShadow: cState === 'running' || cState === 'exec' || cState === 'logs' ? `0 0 16px ${sc.border}30` : undefined }}
            >
              <span className="text-2xl">{sc.icon}</span>
              <span className="text-xs font-mono font-bold text-foreground">web (nginx)</span>
              <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: sc.badgeColor, background: `${sc.badgeColor}15` }}>
                {sc.badge}
              </span>
            </motion.div>
          ) : cState === 'removed' ? (
            <motion.div
              key="removed"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="flex flex-col items-center gap-2"
            >
              <span className="text-[11px] font-mono text-muted-foreground">✕ Container removed</span>
            </motion.div>
          ) : (
            <motion.div key="empty" className="text-[10px] text-muted-foreground font-mono">
              No container yet
            </motion.div>
          )}
        </AnimatePresence>
        {stepIdx >= CMD_STEPS.length - 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-3 text-center px-2 py-1.5 rounded-lg" style={{ background: '#F59E0B10', border: '1px solid #F59E0B30' }}>
            <span className="text-amber-400 font-mono text-[10px]">run → exec → logs → stop → rm</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

const Level5Interactive = () => {
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
    if (wasNew && !completedLevels.includes(5)) completeLevel(5);
    if (next.size === 5 && !levelDone) { setLevelDone(true); }
  }, [active, completed, levelDone, completedLevels, completeLevel]);

  const animKey = active ? `${active}-${animRunId}` : '';

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#070B14' }}>
      {/* Navbar */}
      <nav className="shrink-0 border-b border-border px-4 py-2.5 flex items-center justify-between" style={{ background: '#0F172A' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground text-sm mr-2">←</button>
          <span className="text-xl">🐳</span>
          <div>
            <h1 className="font-syne font-bold text-accent text-sm tracking-wide">DOCKER QUEST</h1>
            <p className="text-[10px] text-muted-foreground font-mono">Level 5 — Docker Containers</p>
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
            <span className="font-syne font-bold text-emerald-400 text-sm">🎉 Level 5 Complete! +100 XP — You can create and manage containers!</span>
            <button onClick={() => navigate('/level/6')} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-syne font-bold text-xs hover:opacity-90 transition-opacity">Continue to Level 6 →</button>
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
                  {active === 'image-to-container' && <AnimImageToContainer onDone={handleAnimDone} paused={paused} />}
                  {active === 'writable-layer' && <AnimWritableLayer onDone={handleAnimDone} paused={paused} />}
                  {active === 'port-mapping' && <AnimPortMapping onDone={handleAnimDone} paused={paused} />}
                  {active === 'detached' && <AnimDetached onDone={handleAnimDone} paused={paused} />}
                  {active === 'commands' && <AnimCommands onDone={handleAnimDone} paused={paused} />}
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

          {/* Terminal Log */}
          <div className="shrink-0 border-t border-border" style={{ height: 200 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: '#0D1117' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-[10px] font-mono text-muted-foreground ml-1">docker-quest container log</span>
            </div>
            <div ref={logRef} className="terminal-black p-3 overflow-y-auto font-mono text-[13px] leading-5" style={{ height: 'calc(200px - 28px)' }}>
              {infoLines.length === 0 ? (
                <span className="text-muted-foreground/50">{'> Click a topic to explore Docker Containers...'}<span className="inline-block w-2 h-4 bg-muted-foreground/50 ml-1" style={{ animation: 'blink 1s infinite' }} /></span>
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
              <div className="flex items-center gap-2"><span>📖</span><h2 className="font-syne font-bold text-foreground text-sm">Container Reference</h2></div>
              <span className="text-[10px] text-muted-foreground font-mono">Level 5 — Docker Containers</span>
            </div>

            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: '#1E3A5F', background: '#0F172A' }}>
              <h3 className="font-syne font-bold text-foreground text-sm mb-2">📦 Docker Containers</h3>
              <p className="text-xs text-foreground/70 leading-relaxed">
                A Docker container is a running instance of a Docker image. It is an isolated
                process on your machine that has its own filesystem, networking, and process
                space — but shares the host OS kernel. Containers are ephemeral by design:
                they can be created, started, stopped, and destroyed in seconds. Understanding
                containers is the heart of Docker.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['Ephemeral', 'Isolated', 'Lightweight', 'Stateful', 'Interactive'].map(tag => (
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

export default Level5Interactive;
