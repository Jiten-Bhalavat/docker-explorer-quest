import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';

type TopicId = 'state-machine' | 'create-start' | 'pause-stop-kill' | 'restart-policies' | 'signals-exit';

interface TopicMeta {
  id: TopicId; label: string; icon: string; color: string;
  colorClass: string; borderClass: string; bgTint: string; glowStyle: string;
}

const TOPICS: TopicMeta[] = [
  { id: 'state-machine', label: 'State Machine', icon: '🔄', color: '#06B6D4', colorClass: 'text-cyan-400', borderClass: 'border-cyan-500', bgTint: 'bg-cyan-500/10', glowStyle: '0 0 12px rgba(6,182,212,0.4)' },
  { id: 'create-start', label: 'Create & Start', icon: '▶️', color: '#10B981', colorClass: 'text-emerald-400', borderClass: 'border-emerald-500', bgTint: 'bg-emerald-500/10', glowStyle: '0 0 12px rgba(16,185,129,0.4)' },
  { id: 'pause-stop-kill', label: 'Pause, Stop & Kill', icon: '⏹️', color: '#EF4444', colorClass: 'text-red-400', borderClass: 'border-red-500', bgTint: 'bg-red-500/10', glowStyle: '0 0 12px rgba(239,68,68,0.4)' },
  { id: 'restart-policies', label: 'Restart Policies', icon: '🔁', color: '#F97316', colorClass: 'text-orange-400', borderClass: 'border-orange-500', bgTint: 'bg-orange-500/10', glowStyle: '0 0 12px rgba(249,115,22,0.4)' },
  { id: 'signals-exit', label: 'Signals & Exit', icon: '📨', color: '#8B5CF6', colorClass: 'text-purple-400', borderClass: 'border-purple-500', bgTint: 'bg-purple-500/10', glowStyle: '0 0 12px rgba(139,92,246,0.4)' },
];

const INFO_LOGS: Record<TopicId, { prefix: string; lines: string[] }> = {
  'state-machine': {
    prefix: '> Loading: Container State Machine',
    lines: [
      '# Container states: created, running, paused, stopped, restarting, dead',
      "$ docker inspect <n> --format '{{.State.Status}}'",
      '# Returns current state: created / running / paused / exited / dead',
      '$ docker events --filter container=web',
      '# Streams real-time lifecycle events for a container',
      '# Events: create, start, pause, unpause, stop, kill, die, destroy',
      '> State machine overview loaded ✓',
    ],
  },
  'create-start': {
    prefix: '> Loading: Container Creation',
    lines: [
      '$ docker create --name web nginx    # create without starting',
      '$ docker start web                  # start a created container',
      '$ docker run -d --name api nginx    # create + start in one command',
      '# docker run = docker create + docker start',
      '$ docker ps -a --filter status=created   # show only created containers',
      '# Use docker create when: setting up volumes/networks before starting',
      "# Use --rm for one-off containers: docker run --rm alpine date",
      '> Create and start demo complete ✓',
    ],
  },
  'pause-stop-kill': {
    prefix: '> Loading: Stopping Containers',
    lines: [
      '$ docker pause web       # freeze container (SIGSTOP via cgroups)',
      '$ docker unpause web     # resume frozen container',
      '$ docker stop web        # SIGTERM → 10s → SIGKILL (graceful)',
      '$ docker stop -t 30 web  # SIGTERM → 30s timeout → SIGKILL',
      '$ docker kill web        # immediate SIGKILL (forceful)',
      '$ docker kill -s SIGINT web  # send specific signal',
      '# docker stop -t 0 = same as docker kill (zero timeout)',
      '> Stop methods loaded ✓',
    ],
  },
  'restart-policies': {
    prefix: '> Loading: Restart Policies',
    lines: [
      '# Restart policies: no | always | unless-stopped | on-failure',
      '$ docker run -d --restart unless-stopped nginx',
      '$ docker run -d --restart on-failure:5 worker   # max 5 retries',
      '# Update restart policy on running container:',
      '$ docker update --restart unless-stopped web',
      "$ docker inspect web --format '{{.HostConfig.RestartPolicy.Name}}'",
      "$ docker inspect web --format '{{.RestartCount}}'",
      '> Restart policies loaded ✓',
    ],
  },
  'signals-exit': {
    prefix: '> Loading: Signals and Graceful Shutdown',
    lines: [
      '# Default stop signal is SIGTERM. Override per image:',
      '# STOPSIGNAL SIGINT  (in Dockerfile)',
      '$ docker stop web              # sends SIGTERM (or STOPSIGNAL)',
      '$ docker kill -s SIGUSR1 web   # send custom signal',
      '# Check what PID 1 is in a container:',
      '$ docker exec web cat /proc/1/cmdline',
      '# Good exit code = 0 (clean). Bad = non-zero (error/crash)',
      "$ docker inspect web --format '{{.State.ExitCode}}'",
      '# Always use exec form: CMD ["node","server.js"]',
      '> Signals and graceful exit loaded ✓',
    ],
  },
};

interface CardSection { title: string; text: string }
const CARD_DATA: Record<TopicId, { heading: string; sections: CardSection[] }> = {
  'state-machine': {
    heading: 'Container States Explained',
    sections: [
      { title: 'All six states', text: "CREATED: Container created but not started. Filesystem set up, network configured, no process running.\n\nRUNNING: Main process (PID 1) is running. Active state consuming CPU, memory, network.\n\nPAUSED: Processes frozen using Linux cgroups freezer. Memory preserved, no CPU used.\n\nSTOPPED (exited): Main process has exited. Filesystem still exists. Can be restarted with docker start.\n\nRESTARTING: Container is restarting due to a restart policy. Transitional state.\n\nDEAD: Docker tried to stop the container but failed. Rarely seen. Indicates a serious problem." },
      { title: 'Inspecting state', text: "docker inspect <n> --format '{{.State.Status}}'\nReturns: created / running / paused / exited / restarting / dead\n\ndocker events — streams real-time lifecycle events:\ncreate, start, pause, unpause, stop, kill, die, destroy, oom" },
    ],
  },
  'create-start': {
    heading: 'Creating and Starting Containers',
    sections: [
      { title: 'docker create vs docker run', text: "docker create allocates the container's filesystem, configures its network, and prepares it to run — but does NOT start the main process. Returns a container ID. State: CREATED.\n\ndocker start takes a CREATED or STOPPED container and starts its main process → RUNNING.\n\ndocker run = docker create + docker start in one command." },
      { title: 'Useful run-time flags', text: "--rm         Auto-remove container on exit\n--restart    Set restart policy at creation time\n-d           Detached mode (background)\n-it          Interactive terminal\n--name       Human-readable container name\n-e KEY=VAL   Set environment variable\n--env-file   Load env vars from a file" },
      { title: 'One-off containers with --rm', text: "The --rm flag auto-removes the container when it exits. Perfect for:\ndocker run --rm alpine ping -c 3 google.com\ndocker run --rm -v $(pwd):/app node:18 node script.js\nNo leftover stopped containers cluttering docker ps -a." },
    ],
  },
  'pause-stop-kill': {
    heading: 'Three Ways to Stop a Container',
    sections: [
      { title: 'docker pause (suspend)', text: "Suspends all processes using Linux cgroups freezer. Frozen in place — no CPU, memory preserved.\ndocker pause mycontainer\ndocker unpause mycontainer  ← resume from exact point" },
      { title: 'docker stop (graceful)', text: "Sends SIGTERM to PID 1, then waits 10 seconds. If no exit, SIGKILL is sent.\ndocker stop mycontainer        (default 10s)\ndocker stop -t 30 mycontainer  (30s timeout)" },
      { title: 'docker kill (forceful)', text: "Sends SIGKILL directly. Process immediately terminated. No cleanup.\nUse only when docker stop is not working.\ndocker kill mycontainer\ndocker kill -s SIGINT mycontainer  (specific signal)" },
      { title: 'When to use which', text: "Normal shutdown: docker stop (always try first)\nFrozen/unresponsive: docker kill\nTemporary suspension: docker pause / unpause\ndocker stop -t 0 = equivalent to docker kill" },
    ],
  },
  'restart-policies': {
    heading: 'Container Restart Policies',
    sections: [
      { title: 'The four policies', text: "no (default): Never restart. For dev, one-off tasks.\n\nalways: Always restart regardless of exit code. Also starts on Docker daemon startup.\n\nunless-stopped: Like always, but manual docker stop prevents further restarts. Recommended for production.\n\non-failure[:max-retries]: Only restart on non-zero exit code. Optional max retries. Exponential backoff." },
      { title: 'Setting and updating', text: "Set at creation: docker run -d --restart unless-stopped nginx\nUpdate running: docker update --restart on-failure:5 web\nIn Compose: restart: unless-stopped\nCheck: docker inspect web | grep -A2 RestartPolicy" },
      { title: 'Exponential backoff', text: "Docker applies increasing delays between restart attempts:\n0s → 1s → 2s → 4s → 8s → 16s → ... (up to 1 minute max)\nBackoff resets after container runs successfully for 10 seconds." },
    ],
  },
  'signals-exit': {
    heading: 'Linux Signals and Graceful Shutdown',
    sections: [
      { title: 'What is SIGTERM', text: "SIGTERM (signal 15) is the 'please shut down gracefully' signal. docker stop sends SIGTERM to PID 1. A well-behaved app catches it and performs cleanup: close HTTP connections, finish requests, flush DB buffers, close file handles, then exit 0." },
      { title: 'The PID 1 problem', text: "Shell form CMD (WRONG): CMD node server.js\nDocker wraps in sh: sh -c 'node server.js'\nPID 1 = sh (not node). sh doesn't forward SIGTERM.\n\nExec form CMD (CORRECT): CMD ['node', 'server.js']\nPID 1 = node directly. Receives SIGTERM. Can handle cleanly." },
      { title: 'Implementing SIGTERM handler', text: "Node.js:\nprocess.on('SIGTERM', async () => {\n  await server.close();\n  await db.disconnect();\n  process.exit(0);\n});\n\nPython: signal.signal(signal.SIGTERM, handler)\nGo: signal.Notify(c, syscall.SIGTERM)" },
      { title: 'Exit codes', text: "0 = clean exit (success)\n1 = general error\n137 = killed by SIGKILL (128 + 9)\n143 = killed by SIGTERM (128 + 15)\ndocker inspect <n> --format '{{.State.ExitCode}}'\nNon-zero codes trigger on-failure restart policy." },
    ],
  },
};

// ─── State Colors ────────────────────────────────────────────────────────────

const STATE_COLORS: Record<string, { bg: string; border: string; text: string }> = {
  IMAGE:      { bg: '#0F172A', border: '#06B6D4', text: '#06B6D4' },
  CREATED:    { bg: '#0F172A', border: '#475569', text: '#94A3B8' },
  RUNNING:    { bg: '#052E16', border: '#10B981', text: '#10B981' },
  PAUSED:     { bg: '#1C1000', border: '#F59E0B', text: '#F59E0B' },
  STOPPED:    { bg: '#1C0000', border: '#EF4444', text: '#EF4444' },
  RESTARTING: { bg: '#1C0900', border: '#F97316', text: '#F97316' },
  DEAD:       { bg: '#0A0E1A', border: '#1F2D45', text: '#475569' },
};

const StateNode = ({ label, active, badge, size = 'md' }: { label: string; active?: boolean; badge?: string; size?: 'sm' | 'md' }) => {
  const sc = STATE_COLORS[label] || STATE_COLORS.CREATED;
  return (
    <motion.div
      className={`rounded-xl border-2 flex flex-col items-center justify-center ${size === 'sm' ? 'px-2 py-1' : 'px-3 py-2'}`}
      style={{ background: sc.bg, borderColor: sc.border, boxShadow: active ? `0 0 16px ${sc.border}66` : 'none' }}
      animate={active ? { boxShadow: [`0 0 8px ${sc.border}33`, `0 0 20px ${sc.border}66`, `0 0 8px ${sc.border}33`] } : {}}
      transition={active ? { repeat: Infinity, duration: 1.5 } : {}}>
      <span className={`font-mono font-bold ${size === 'sm' ? 'text-[8px]' : 'text-[10px]'}`} style={{ color: sc.text }}>
        {badge || label}
      </span>
    </motion.div>
  );
};

const TermHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
    <div className="w-2 h-2 rounded-full bg-red-500/70" />
    <div className="w-2 h-2 rounded-full bg-amber-500/70" />
    <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
    <span className="text-[10px] font-mono text-muted-foreground ml-1">{title}</span>
  </div>
);

// ─── Animation 1: State Machine Overview ─────────────────────────────────────

const STATES_ORDER = ['CREATED', 'RUNNING', 'PAUSED', 'STOPPED', 'RESTARTING', 'DEAD'];
const JOURNEY = ['IMAGE', 'CREATED', 'RUNNING', 'PAUSED', 'RUNNING', 'STOPPED', 'RUNNING', 'STOPPED'];

const AnimStateMachine = ({ onDone }: { onDone: () => void }) => {
  const [visibleNodes, setVisibleNodes] = useState(0);
  const [showArrows, setShowArrows] = useState(false);
  const [journeyIdx, setJourneyIdx] = useState(-1);
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    STATES_ORDER.forEach((_, i) => { t.push(setTimeout(() => setVisibleNodes(i + 1), 400 + i * 250)); });
    t.push(setTimeout(() => setShowArrows(true), 400 + STATES_ORDER.length * 250));
    const arrowTime = 400 + STATES_ORDER.length * 250 + 600;
    JOURNEY.forEach((_, i) => { t.push(setTimeout(() => setJourneyIdx(i), arrowTime + i * 500)); });
    t.push(setTimeout(() => setShowSummary(true), arrowTime + JOURNEY.length * 500 + 200));
    t.push(setTimeout(onDone, arrowTime + JOURNEY.length * 500 + 800));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  const currentState = journeyIdx >= 0 ? JOURNEY[journeyIdx] : null;

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2 overflow-hidden">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[9px] font-mono text-cyan-400/60 text-center">
        The Complete Container State Machine
      </motion.div>

      {/* State grid */}
      <div className="flex-1 flex flex-col items-center justify-center gap-3 min-h-0">
        {/* Top row: IMAGE → CREATED */}
        <div className="flex items-center gap-3">
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }}>
            <StateNode label="IMAGE" active={currentState === 'IMAGE'} badge="🖼️ IMAGE" size="sm" />
          </motion.div>
          {showArrows && (
            <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} className="flex items-center gap-1">
              <div className="h-0.5 w-8 bg-cyan-500/40" />
              <span className="text-[7px] font-mono text-cyan-400/50">create</span>
              <span className="text-[8px] text-cyan-400/50">→</span>
            </motion.div>
          )}
          {visibleNodes >= 1 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
              <StateNode label="CREATED" active={currentState === 'CREATED'} badge="◎ CREATED" size="sm" />
            </motion.div>
          )}
        </div>

        {/* Middle row: PAUSED ← RUNNING → STOPPED */}
        <div className="flex items-center gap-3">
          {visibleNodes >= 3 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
              <StateNode label="PAUSED" active={currentState === 'PAUSED'} badge="⏸ PAUSED" size="sm" />
            </motion.div>
          )}
          {showArrows && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-[6px] font-mono text-amber-400/50">
              <span>pause →</span><span>← unpause</span>
            </motion.div>
          )}
          {visibleNodes >= 2 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
              <StateNode label="RUNNING" active={currentState === 'RUNNING'} badge="● RUNNING" />
            </motion.div>
          )}
          {showArrows && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center text-[6px] font-mono text-red-400/50">
              <span>stop/kill →</span><span>← start</span>
            </motion.div>
          )}
          {visibleNodes >= 4 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
              <StateNode label="STOPPED" active={currentState === 'STOPPED'} badge="■ STOPPED" size="sm" />
            </motion.div>
          )}
        </div>

        {/* Bottom row: RESTARTING, DEAD */}
        <div className="flex items-center gap-6">
          {visibleNodes >= 5 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
              <StateNode label="RESTARTING" active={currentState === 'RESTARTING'} badge="↻ RESTARTING" size="sm" />
            </motion.div>
          )}
          {visibleNodes >= 6 && (
            <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', stiffness: 300 }}>
              <StateNode label="DEAD" active={currentState === 'DEAD'} badge="✕ DEAD" size="sm" />
            </motion.div>
          )}
        </div>
      </div>

      {/* Journey indicator */}
      {journeyIdx >= 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="shrink-0 text-center text-[9px] font-mono text-cyan-400/70">
          Journey: {JOURNEY.slice(0, journeyIdx + 1).join(' → ')}
        </motion.div>
      )}

      {/* Summary */}
      {showSummary && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="shrink-0 rounded-lg px-4 py-1.5 text-center" style={{ background: '#06B6D410', border: '1px solid #06B6D430' }}>
          <span className="text-[10px] font-mono text-cyan-400">6 states. 12 transitions. Every docker command moves a container between these states.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 2: Create & Start ─────────────────────────────────────────────

const AnimCreateStart = ({ onDone }: { onDone: () => void }) => {
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean }[]>([]);
  const [activeState, setActiveState] = useState<string>('IMAGE');
  const [phase, setPhase] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [termLines.length]);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];

    t.push(setTimeout(() => {
      setTermLines(p => [...p, { text: '$ docker create --name web nginx:alpine', isCmd: true }]);
      setTimeout(() => { setTermLines(p => [...p, { text: 'a1b2c3d4e5f6' }]); setActiveState('CREATED'); }, 200);
    }, 200));

    t.push(setTimeout(() => {
      setTermLines(p => [...p, { text: '$ docker start web', isCmd: true }]);
      setTimeout(() => { setTermLines(p => [...p, { text: 'web', isSuccess: true }]); setActiveState('RUNNING'); }, 200);
    }, 1000));

    t.push(setTimeout(() => {
      setPhase(1);
      setTermLines(p => [...p, { text: '$ docker run -d --name api node:18-alpine', isCmd: true }]);
      setTimeout(() => { setTermLines(p => [...p, { text: 'e5f6g7h8i9j0', isSuccess: true }]); }, 200);
    }, 1700));

    t.push(setTimeout(() => {
      setPhase(2);
      setTermLines(p => [...p, { text: '$ docker ps', isCmd: true }]);
      setTimeout(() => setTermLines(p => [...p, { text: 'CONTAINER ID  IMAGE         STATUS     NAMES\na1b2c3d4      nginx:alpine  Up 8s      web\ne5f6g7h8      node:18       Up 5s      api' }]), 200);
    }, 2500));

    t.push(setTimeout(() => setPhase(3), 3200));
    t.push(setTimeout(onDone, 3800));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex gap-0">
      {/* Terminal */}
      <div className="flex-[55] flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <TermHeader title="create & start" />
        <div ref={scrollRef} className="terminal-black p-2 overflow-y-auto font-mono text-[10px] leading-5 flex-1">
          {termLines.map((line, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.12 }}>
              {line.isCmd ? <><span className="text-emerald-400">$ </span><span className="text-foreground">{line.text.slice(2)}</span></> :
                line.isSuccess ? <span className="text-emerald-400" style={{ whiteSpace: 'pre-wrap' }}>{line.text}</span> :
                  <span className="text-foreground/50" style={{ whiteSpace: 'pre-wrap' }}>{line.text}</span>}
            </motion.div>
          ))}
        </div>
      </div>

      {/* State diagram + flags */}
      <div className="flex-[45] flex flex-col p-3 gap-3 overflow-y-auto" style={{ background: '#0F172A' }}>
        <div className="text-[10px] font-syne font-bold text-emerald-400 text-center">Creation Flow</div>

        {/* State flow */}
        <div className="flex items-center justify-center gap-2">
          <StateNode label="IMAGE" active={activeState === 'IMAGE'} badge="🖼️ IMAGE" size="sm" />
          <span className="text-[8px] text-foreground/30">→</span>
          <StateNode label="CREATED" active={activeState === 'CREATED'} badge="◎ CREATED" size="sm" />
          <span className="text-[8px] text-foreground/30">→</span>
          <StateNode label="RUNNING" active={activeState === 'RUNNING'} badge="● RUNNING" size="sm" />
        </div>

        {/* Shortcut */}
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded border px-2 py-1.5 text-center" style={{ borderColor: '#10B98130', background: '#10B98108' }}>
            <div className="text-[9px] font-mono text-emerald-400">docker run = create + start</div>
            <div className="text-[7px] text-foreground/30">Most common way to launch containers</div>
          </motion.div>
        )}

        {/* Run flags */}
        {phase >= 3 && (
          <div className="space-y-1.5">
            {[
              { flag: '--rm', color: '#10B981', desc: 'Auto-remove on exit. One-off tasks.' },
              { flag: '--restart', color: '#F97316', desc: 'Set restart policy at creation.' },
              { flag: '-it', color: '#06B6D4', desc: 'Interactive terminal. RUNNING until you exit.' },
            ].map((f, i) => (
              <motion.div key={f.flag} initial={{ opacity: 0, x: 10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }}
                className="rounded border px-2 py-1 flex items-center gap-2" style={{ borderColor: `${f.color}30`, background: `${f.color}06` }}>
                <span className="text-[9px] font-mono font-bold" style={{ color: f.color }}>{f.flag}</span>
                <span className="text-[8px] text-foreground/50">{f.desc}</span>
              </motion.div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

// ─── Animation 3: Pause, Stop & Kill ─────────────────────────────────────────

type ContainerStatus = 'running' | 'paused' | 'stopping' | 'stopped' | 'killed';

const AnimPauseStopKill = ({ onDone }: { onDone: () => void }) => {
  const [statuses, setStatuses] = useState<ContainerStatus[]>(['running', 'running', 'running']);
  const [phase, setPhase] = useState(0);
  const [countdown, setCountdown] = useState(-1);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];

    // Pause cA
    t.push(setTimeout(() => { setStatuses(p => { const n = [...p]; n[0] = 'paused'; return n; }); setPhase(1); }, 900));
    t.push(setTimeout(() => { setStatuses(p => { const n = [...p]; n[0] = 'running'; return n; }); }, 1600));

    // Stop cB
    t.push(setTimeout(() => { setPhase(2); setStatuses(p => { const n = [...p]; n[1] = 'stopping'; return n; }); setCountdown(10); }, 2000));
    t.push(setTimeout(() => setCountdown(6), 2300));
    t.push(setTimeout(() => setCountdown(2), 2600));
    t.push(setTimeout(() => { setCountdown(-1); setStatuses(p => { const n = [...p]; n[1] = 'stopped'; return n; }); }, 2900));

    // Kill cC
    t.push(setTimeout(() => { setPhase(3); setStatuses(p => { const n = [...p]; n[2] = 'killed'; return n; }); }, 3200));

    // Comparison
    t.push(setTimeout(() => setPhase(4), 3800));

    // Postgres example
    t.push(setTimeout(() => setPhase(5), 4400));

    t.push(setTimeout(onDone, 5000));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  const statusColor = (s: ContainerStatus) => {
    switch (s) {
      case 'running': return '#10B981';
      case 'paused': return '#F59E0B';
      case 'stopping': return '#F97316';
      case 'stopped': return '#EF4444';
      case 'killed': return '#EF4444';
    }
  };

  const statusLabel = (s: ContainerStatus) => {
    switch (s) {
      case 'running': return '● RUNNING';
      case 'paused': return '❄️ PAUSED';
      case 'stopping': return '⏳ STOPPING';
      case 'stopped': return '■ STOPPED';
      case 'killed': return '⚡ KILLED';
    }
  };

  const NAMES = ['cA (pause)', 'cB (stop)', 'cC (kill)'];
  const METHODS = ['docker pause', 'docker stop', 'docker kill'];

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2 overflow-y-auto">
      {/* Three containers side by side */}
      <div className="flex gap-2">
        {NAMES.map((name, i) => (
          <motion.div key={i} className="flex-1 rounded-lg border p-2 flex flex-col items-center gap-1.5"
            style={{ borderColor: `${statusColor(statuses[i])}50`, background: `${statusColor(statuses[i])}08` }}
            animate={{ borderColor: `${statusColor(statuses[i])}50`, background: `${statusColor(statuses[i])}08` }}
            transition={{ duration: 0.3 }}>
            <span className="text-[8px] font-mono text-foreground/40">{name}</span>
            <span className="text-[9px] font-mono font-bold" style={{ color: statusColor(statuses[i]) }}>{statusLabel(statuses[i])}</span>
            <span className="text-[7px] font-mono text-foreground/30">{METHODS[i]}</span>
            {/* Process bars */}
            <div className="w-full flex flex-col gap-0.5">
              {[0.6, 0.4, 0.8].map((w, j) => (
                <motion.div key={j} className="h-1 rounded-full"
                  style={{ backgroundColor: `${statusColor(statuses[i])}40` }}
                  animate={statuses[i] === 'running' ? { width: ['30%', `${w * 100}%`, '30%'] } : { width: `${w * 50}%` }}
                  transition={statuses[i] === 'running' ? { repeat: Infinity, duration: 1.5 + j * 0.3, ease: 'easeInOut' } : { duration: 0.3 }} />
              ))}
            </div>
          </motion.div>
        ))}
      </div>

      {/* Signal visualization */}
      {phase >= 2 && countdown >= 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="shrink-0 flex items-center justify-center gap-2">
          <span className="text-[9px] font-mono text-purple-400">💬 SIGTERM sent →</span>
          <span className="text-sm font-mono font-bold" style={{ color: countdown > 5 ? '#10B981' : countdown > 2 ? '#F59E0B' : '#EF4444' }}>{countdown}s</span>
          <span className="text-[9px] font-mono text-foreground/30">→ then SIGKILL</span>
        </motion.div>
      )}

      {phase >= 3 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="shrink-0 flex items-center justify-center gap-2">
          <span className="text-[9px] font-mono text-red-400">⚡ SIGKILL → instant (0s)</span>
        </motion.div>
      )}

      {/* Comparison */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="shrink-0 rounded-lg border p-2 space-y-1" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
          <div className="text-[9px] font-syne font-bold text-foreground/60">Comparison</div>
          <div className="text-[8px] font-mono"><span className="text-emerald-400">docker stop:</span> <span className="text-foreground/50">SIGTERM → wait 10s → SIGKILL (graceful, data safe)</span></div>
          <div className="text-[8px] font-mono"><span className="text-red-400">docker kill:</span> <span className="text-foreground/50">SIGKILL immediately (forceful, may lose data)</span></div>
        </motion.div>
      )}

      {/* Postgres example */}
      {phase >= 5 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="shrink-0 flex gap-2">
          <div className="flex-1 rounded border p-1.5" style={{ borderColor: '#10B98130', background: '#10B98108' }}>
            <div className="text-[8px] font-mono text-emerald-400 mb-0.5">docker stop postgres</div>
            <div className="text-[7px] font-mono text-foreground/40">📄 Checkpoint... flush... ✓</div>
            <div className="text-[7px] font-mono text-emerald-400">✓ Data safe</div>
          </div>
          <div className="flex-1 rounded border p-1.5" style={{ borderColor: '#EF444430', background: '#EF444408' }}>
            <div className="text-[8px] font-mono text-red-400 mb-0.5">docker kill postgres</div>
            <div className="text-[7px] font-mono text-foreground/40">📄 Writing checkp— [KILLED]</div>
            <div className="text-[7px] font-mono text-red-400">⚠️ Possible corruption!</div>
          </div>
        </motion.div>
      )}

      {phase >= 5 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="shrink-0 px-3 py-1 rounded-lg text-center" style={{ background: '#EF444410', border: '1px solid #EF444430' }}>
          <span className="text-[10px] font-mono text-red-400">Always docker stop first. docker kill is for unresponsive containers only.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 4: Restart Policies ───────────────────────────────────────────

const AnimRestartPolicies = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 2000),
      setTimeout(() => setPhase(3), 2800),
      setTimeout(() => setPhase(4), 3600),
      setTimeout(onDone, 4200),
    ];
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  const policies: { name: string; desc: string; behavior: string; badge?: string }[] = [
    { name: 'no', desc: 'Never restart (default)', behavior: '● → ■ stays stopped' },
    { name: 'always', desc: 'Always restart, any exit', behavior: '● → ■ → ● → ■ → ● ...' },
    { name: 'unless-stopped', desc: 'Restart unless manual stop', behavior: '● → ■ → ● (unless docker stop)', badge: '✓ Recommended' },
    { name: 'on-failure', desc: 'Only on non-zero exit', behavior: 'exit 0 → stopped | exit 1 → restart' },
  ];

  const BACKOFF = [
    { attempt: 1, wait: '0s', h: 20 },
    { attempt: 2, wait: '1s', h: 30 },
    { attempt: 3, wait: '2s', h: 45 },
    { attempt: 4, wait: '4s', h: 60 },
    { attempt: 5, wait: '8s', h: 80 },
  ];

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2 overflow-y-auto">
      {/* 2x2 Policy grid */}
      <div className="grid grid-cols-2 gap-2">
        {policies.map((pol, i) => (
          <motion.div key={pol.name} initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.15 }}
            className="rounded-lg border p-2" style={{ borderColor: '#F9731630', background: '#F9731606' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold text-orange-400">{pol.name}</span>
              {pol.badge && <span className="text-[7px] font-mono text-emerald-400 bg-emerald-500/10 px-1.5 py-0.5 rounded">{pol.badge}</span>}
            </div>
            <div className="text-[8px] text-foreground/50 mb-1">{pol.desc}</div>
            {phase >= 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-[8px] font-mono text-orange-400/70">{pol.behavior}</motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Command syntax */}
      {phase >= 2 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="shrink-0 rounded border p-2" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
          <pre className="text-[8px] font-mono text-foreground/60 leading-4">{`$ docker run -d --restart unless-stopped nginx
$ docker run -d --restart on-failure:5 worker  # max 5 retries`}</pre>
        </motion.div>
      )}

      {/* Backoff staircase */}
      {phase >= 3 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="shrink-0 rounded-lg border p-2" style={{ borderColor: '#F9731620', background: '#0D1117' }}>
          <div className="text-[8px] font-syne font-bold text-orange-400 mb-1.5">Exponential Backoff</div>
          <div className="flex items-end gap-1.5">
            {BACKOFF.map((step, i) => (
              <motion.div key={i} initial={{ height: 0, opacity: 0 }} animate={{ height: step.h, opacity: 1 }} transition={{ delay: i * 0.2 }}
                className="flex-1 rounded-t border-t border-x flex flex-col items-center justify-end pb-0.5"
                style={{ borderColor: '#F97316', background: `#F97316${10 + i * 5}` }}>
                <span className="text-[7px] font-mono font-bold text-orange-400">{step.wait}</span>
                <span className="text-[6px] font-mono text-foreground/30">#{step.attempt}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Recommendation */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="shrink-0 px-3 py-1.5 rounded-lg text-center" style={{ background: '#F9731610', border: '1px solid #F9731630' }}>
          <span className="text-[10px] font-mono text-orange-400">unless-stopped for production. on-failure for workers.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 5: Signals & Graceful Exit ────────────────────────────────────

const AnimSignalsExit = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);
  const [connections, setConnections] = useState(3);
  const [files, setFiles] = useState(2);
  const [dbConn, setDbConn] = useState(1);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    t.push(setTimeout(() => setPhase(1), 700));

    // Graceful shutdown countdown
    t.push(setTimeout(() => { setPhase(2); setConnections(2); }, 1400));
    t.push(setTimeout(() => setConnections(1), 1600));
    t.push(setTimeout(() => setConnections(0), 1800));
    t.push(setTimeout(() => setFiles(0), 2000));
    t.push(setTimeout(() => { setDbConn(0); setPhase(3); }, 2200));

    // Bad app
    t.push(setTimeout(() => setPhase(4), 2800));

    // PID 1
    t.push(setTimeout(() => setPhase(5), 3600));

    t.push(setTimeout(onDone, 4300));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex gap-0">
      {/* Left: Signal flow + code */}
      <div className="flex-[55] flex flex-col border-r p-3 gap-2 overflow-y-auto" style={{ borderColor: '#1F2D45' }}>
        {/* Signal flow diagram */}
        <div className="rounded-lg border p-2" style={{ borderColor: '#8B5CF630', background: '#0D1117' }}>
          <div className="text-[8px] font-syne font-bold text-purple-400 mb-1">Signal Flow</div>
          <div className="flex items-center gap-1 text-[8px] font-mono">
            <span className="px-1.5 py-0.5 rounded border border-purple-500/30 bg-purple-500/10 text-purple-400">docker stop</span>
            <span className="text-foreground/30">→</span>
            <span className="px-1.5 py-0.5 rounded border border-purple-500/40 bg-purple-500/15 text-purple-300 font-bold">SIGTERM</span>
            <span className="text-foreground/30">→</span>
            <span className="px-1.5 py-0.5 rounded border border-foreground/10 text-foreground/50">PID 1</span>
          </div>
          <div className="flex items-center gap-1 text-[8px] font-mono mt-1">
            <span className="text-foreground/20">10s timeout →</span>
            <span className="px-1.5 py-0.5 rounded border border-red-500/40 bg-red-500/15 text-red-300 font-bold">SIGKILL</span>
            <span className="text-foreground/30">→</span>
            <span className="text-foreground/30">force stop</span>
          </div>
        </div>

        {/* SIGTERM handler code */}
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded border p-2" style={{ borderColor: '#8B5CF620', background: '#000' }}>
            <div className="text-[7px] font-mono text-purple-400/50 mb-0.5">signal handler (Node.js):</div>
            <pre className="text-[8px] font-mono text-foreground/60 leading-3.5">{`process.on('SIGTERM', async () => {
  await server.close();
  await db.disconnect();
  process.exit(0);
});`}</pre>
          </motion.div>
        )}

        {/* PID 1 comparison */}
        {phase >= 5 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2">
            <div className="flex-1 rounded border p-1.5" style={{ borderColor: '#EF444430', background: '#EF444406' }}>
              <div className="text-[7px] font-mono text-red-400 mb-0.5">❌ Shell form (wrong)</div>
              <div className="text-[8px] font-mono text-foreground/50">CMD node server.js</div>
              <div className="text-[7px] font-mono text-foreground/30 mt-0.5">PID 1: sh → node</div>
              <div className="text-[7px] font-mono text-red-400/60">sh doesn't forward SIGTERM</div>
            </div>
            <div className="flex-1 rounded border p-1.5" style={{ borderColor: '#10B98130', background: '#10B98106' }}>
              <div className="text-[7px] font-mono text-emerald-400 mb-0.5">✅ Exec form (right)</div>
              <div className="text-[8px] font-mono text-foreground/50">CMD ["node", "server.js"]</div>
              <div className="text-[7px] font-mono text-foreground/30 mt-0.5">PID 1: node (direct)</div>
              <div className="text-[7px] font-mono text-emerald-400/60">Receives SIGTERM ✓</div>
            </div>
          </motion.div>
        )}

        {phase >= 5 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="shrink-0 px-3 py-1 rounded-lg text-center" style={{ background: '#8B5CF610', border: '1px solid #8B5CF630' }}>
            <span className="text-[9px] font-mono text-purple-400">Implement SIGTERM handler. Use exec form CMD. Graceful = no data loss.</span>
          </motion.div>
        )}
      </div>

      {/* Right: Container interior */}
      <div className="flex-[45] flex flex-col p-3 gap-2 overflow-y-auto" style={{ background: '#0F172A' }}>
        <div className="text-[10px] font-syne font-bold text-purple-400 text-center">Container Interior</div>

        <div className="rounded-lg border p-3 space-y-2" style={{ borderColor: '#8B5CF630', background: '#111827' }}>
          {/* PID list */}
          <div>
            <div className="text-[8px] font-mono text-foreground/40 mb-0.5">Processes</div>
            <div className="flex gap-1">
              <span className="px-1.5 py-0.5 rounded text-[7px] font-mono" style={{ background: phase >= 3 ? '#EF444410' : '#10B98110', color: phase >= 3 ? '#EF4444' : '#10B981' }}>
                PID 1: node {phase >= 3 ? '(exited)' : '(running)'}
              </span>
            </div>
          </div>

          {/* Resources */}
          {[
            { label: 'HTTP connections', value: connections, max: 3 },
            { label: 'Open files', value: files, max: 2 },
            { label: 'DB connections', value: dbConn, max: 1 },
          ].map(res => (
            <div key={res.label}>
              <div className="flex items-center justify-between">
                <span className="text-[8px] font-mono text-foreground/40">{res.label}</span>
                <span className="text-[8px] font-mono" style={{ color: res.value === 0 ? '#10B981' : '#F59E0B' }}>
                  {res.value} {res.value === 0 ? '✓' : ''}
                </span>
              </div>
              <div className="h-1 rounded-full bg-foreground/5 mt-0.5">
                <motion.div className="h-full rounded-full" animate={{ width: `${(res.value / res.max) * 100}%` }} transition={{ duration: 0.3 }}
                  style={{ backgroundColor: res.value === 0 ? '#10B981' : '#F59E0B' }} />
              </div>
            </div>
          ))}

          {phase >= 3 && (
            <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }}
              className="text-center pt-1">
              <span className="text-[9px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">✓ Clean shutdown</span>
            </motion.div>
          )}
        </div>

        {/* Bad app contrast */}
        {phase >= 4 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border p-2.5" style={{ borderColor: '#EF444430', background: '#EF444406' }}>
            <div className="text-[8px] font-syne font-bold text-red-400 mb-1">⚠️ Bad App (no handler)</div>
            <div className="space-y-0.5 text-[8px] font-mono">
              <div className="text-foreground/50">SIGTERM → no handler → 10s timeout</div>
              <div className="text-red-400">SIGKILL → forced stop</div>
              <div className="text-red-400/70">✗ connections RESET ✗ files not flushed</div>
            </div>
          </motion.div>
        )}

        {/* Exit codes */}
        {phase >= 5 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="rounded border p-2" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
            <div className="text-[8px] font-syne font-bold text-foreground/40 mb-0.5">Exit Codes</div>
            <div className="text-[7px] font-mono text-foreground/50 space-y-0.5">
              <div><span className="text-emerald-400">0</span> = clean exit</div>
              <div><span className="text-red-400">137</span> = SIGKILL (128+9)</div>
              <div><span className="text-purple-400">143</span> = SIGTERM (128+15)</div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Main Level 12 Page ──────────────────────────────────────────────────────

const Level12Interactive = () => {
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
      if (!completedLevels.includes(12)) completeLevel(12);
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
            <p className="text-[10px] text-muted-foreground font-mono">Level 12 — Container Lifecycle</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-syne font-bold text-amber-400 text-sm">⚡ {localXP}</span>
          <div className="hidden sm:flex items-center gap-1.5">
            {TOPICS.map(t => (
              <div key={t.id} className="w-2.5 h-2.5 rounded-full border transition-colors duration-300"
                style={{ borderColor: completed.has(t.id) ? t.color : '#1F2D45', backgroundColor: completed.has(t.id) ? t.color : 'transparent' }} />
            ))}
          </div>
          <span className="text-xs font-mono text-muted-foreground">{completed.size}/5</span>
        </div>
      </nav>

      {/* Level complete banner */}
      <AnimatePresence>
        {levelDone && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            className="shrink-0 bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-3 flex items-center justify-between">
            <span className="font-syne font-bold text-emerald-400 text-sm">🎉 Level 12 Complete! +100 XP — You control every state of every container!</span>
            <button onClick={() => navigate('/level/13')} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-syne font-bold text-xs hover:opacity-90 transition-opacity">Continue to Level 13 →</button>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Main body */}
      <div className="flex-1 flex flex-col lg:flex-row min-h-0 overflow-hidden">
        {/* Left Panel */}
        <div className="flex-[58] flex flex-col min-h-0 border-r border-border">
          {/* Topic bar */}
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

          {/* Animation canvas */}
          <div className="flex-1 relative dot-grid-24 overflow-hidden min-h-[200px]">
            <AnimatePresence mode="wait">
              {!active && !animating && (
                <motion.div key="idle" className="absolute inset-0 flex flex-col items-center justify-center" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.span className="text-6xl" animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }}>🔄</motion.span>
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
                    {active === 'state-machine' && <AnimStateMachine onDone={handleAnimDone} />}
                    {active === 'create-start' && <AnimCreateStart onDone={handleAnimDone} />}
                    {active === 'pause-stop-kill' && <AnimPauseStopKill onDone={handleAnimDone} />}
                    {active === 'restart-policies' && <AnimRestartPolicies onDone={handleAnimDone} />}
                    {active === 'signals-exit' && <AnimSignalsExit onDone={handleAnimDone} />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Terminal log */}
          <div className="shrink-0 border-t border-border" style={{ height: 200 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: '#0D1117' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-[10px] font-mono text-muted-foreground ml-1">docker-quest lifecycle log</span>
            </div>
            <div ref={logRef} className="terminal-black p-3 overflow-y-auto font-mono text-[13px] leading-5" style={{ height: 'calc(200px - 28px)' }}>
              {infoLines.length === 0 ? (
                <span className="text-muted-foreground/50">{'> Click a topic to explore Container Lifecycle...'}<span className="inline-block w-2 h-4 bg-muted-foreground/50 ml-1" style={{ animation: 'blink 1s infinite' }} /></span>
              ) : infoLines.map((line, i) => (
                <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.2 }}>
                  {line.type === 'cmd' ? <span className="text-emerald-400">{line.text}</span> : <span className="text-foreground/70">{line.text}</span>}
                </motion.div>
              ))}
            </div>
          </div>
        </div>

        {/* Right Panel — Concept Notes */}
        <div className="flex-[42] overflow-y-auto min-h-0" style={{ background: '#0F172A' }}>
          <div className="p-4">
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2"><span>📖</span><h2 className="font-syne font-bold text-foreground text-sm">Lifecycle Reference</h2></div>
              <span className="text-[10px] text-muted-foreground font-mono">Level 12 — Container Lifecycle</span>
            </div>

            {/* Intro card */}
            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: '#1E3A5F', background: '#0F172A' }}>
              <h3 className="font-syne font-bold text-foreground text-sm mb-2">🔄 Container Lifecycle</h3>
              <p className="text-xs text-foreground/70 leading-relaxed">
                Every Docker container moves through a well-defined set of states: created,
                running, paused, stopped, restarting, and dead. Understanding these states
                and the commands that transition between them is what separates developers
                who fight Docker from those who control it. Mastering the lifecycle means
                knowing exactly what your containers are doing at any moment — and what to
                do when something goes wrong.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['States', 'Signals', 'Restart', 'Graceful', 'PID 1'].map(tag => (
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

export default Level12Interactive;
