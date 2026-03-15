import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { usePausableTimers } from '@/hooks/usePausableTimers';

type TopicId = 'h-vs-v' | 'load-balance' | 'compose-scale' | 'resources' | 'auto-scale';

interface TopicMeta {
  id: TopicId; label: string; icon: string; color: string;
  colorClass: string; borderClass: string; bgTint: string; glowStyle: string;
}

const TOPICS: TopicMeta[] = [
  { id: 'h-vs-v', label: 'H vs V Scaling', icon: '↔️', color: '#06B6D4', colorClass: 'text-cyan-400', borderClass: 'border-cyan-500', bgTint: 'bg-cyan-500/10', glowStyle: '0 0 12px rgba(6,182,212,0.4)' },
  { id: 'load-balance', label: 'Load Balancing', icon: '⚖️', color: '#10B981', colorClass: 'text-emerald-400', borderClass: 'border-emerald-500', bgTint: 'bg-emerald-500/10', glowStyle: '0 0 12px rgba(16,185,129,0.4)' },
  { id: 'compose-scale', label: 'Compose Scaling', icon: '📈', color: '#8B5CF6', colorClass: 'text-purple-400', borderClass: 'border-purple-500', bgTint: 'bg-purple-500/10', glowStyle: '0 0 12px rgba(139,92,246,0.4)' },
  { id: 'resources', label: 'Resource Limits', icon: '🔒', color: '#F97316', colorClass: 'text-orange-400', borderClass: 'border-orange-500', bgTint: 'bg-orange-500/10', glowStyle: '0 0 12px rgba(249,115,22,0.4)' },
  { id: 'auto-scale', label: 'Auto-Scaling', icon: '🤖', color: '#F59E0B', colorClass: 'text-amber-400', borderClass: 'border-amber-500', bgTint: 'bg-amber-500/10', glowStyle: '0 0 12px rgba(245,158,11,0.4)' },
];

const INFO_LOGS: Record<TopicId, { prefix: string; lines: string[] }> = {
  'h-vs-v': {
    prefix: '> Loading: Horizontal vs Vertical Scaling',
    lines: [
      '# Vertical scaling: bigger machine (more CPU/RAM per container)',
      '# Horizontal scaling: more machines (more container replicas)',
      '# Containers are designed for HORIZONTAL scaling (stateless)',
      '# Vertical has a hardware ceiling. Horizontal is near-infinite.',
      '# Rule: make your app stateless → then it can scale horizontally',
      '# Stateful data (DB) → scale vertical or use managed services',
      '> Scaling concepts loaded ✓',
    ],
  },
  'load-balance': {
    prefix: '> Loading: Load Balancing Strategies',
    lines: [
      '# Round Robin: requests distributed in rotation (simple, equal)',
      '# Least Connections: route to least busy backend (smarter)',
      '# IP Hash: same client → same server (sticky sessions)',
      '# Health checks: remove failed containers from rotation',
      '$ docker run -d -p 80:80 --name lb nginx',
      '# Docker Compose DNS: same service name → multiple IPs → auto round-robin',
      '> Load balancing loaded ✓',
    ],
  },
  'compose-scale': {
    prefix: '> Loading: Docker Compose Scaling',
    lines: [
      '$ docker compose up -d --scale api=3     # scale to 3 replicas',
      '$ docker compose up -d --scale api=1     # scale down to 1',
      '$ docker compose up -d --scale api=0     # scale to zero',
      '# deploy.replicas: 3      — desired replica count',
      '# deploy.update_config    — rolling update settings',
      '# deploy.restart_policy   — per-service restart behavior',
      '$ docker compose ps       # see all replicas and their status',
      '> Compose scaling loaded ✓',
    ],
  },
  resources: {
    prefix: '> Loading: Container Resource Limits',
    lines: [
      '$ docker run -d --cpus="0.5" --memory="512m" node:18-alpine',
      '# --cpus: fraction of host CPU (0.5 = 50% of 1 core)',
      '# --memory: hard limit (container OOM killed if exceeded)',
      '# --memory-reservation: soft limit (Docker tries to guarantee)',
      '$ docker stats              # live resource usage',
      '$ docker stats --no-stream  # one-time snapshot',
      '# In Compose: deploy.resources.limits and reservations',
      '> Resource limits loaded ✓',
    ],
  },
  'auto-scale': {
    prefix: '> Loading: Auto-Scaling Concepts',
    lines: [
      '# Auto-scaling: adjust replica count based on metrics',
      '# Scale-up trigger: CPU > 80%, queue depth > 1000',
      '# Scale-down trigger: CPU < 20% for 5+ minutes (cool-down)',
      '# Docker Swarm: docker service scale web=5',
      '# Kubernetes HPA: auto-scales based on CPU/memory/custom metrics',
      '# AWS ECS: target tracking scaling policies',
      '# Cool-down prevents rapid scale-up/scale-down flapping',
      '> Auto-scaling concepts loaded ✓',
    ],
  },
};

interface CardSection { title: string; text: string }
const CARD_DATA: Record<TopicId, { heading: string; sections: CardSection[] }> = {
  'h-vs-v': {
    heading: 'Scale Up vs Scale Out',
    sections: [
      { title: 'Vertical scaling (scale up)', text: "Add more resources to a single machine: more CPU, more RAM, faster disk. Simple in concept — just get a bigger server. Limitations: hardware ceiling, exponentially expensive, single point of failure, requires downtime for hardware upgrades." },
      { title: 'Horizontal scaling (scale out)', text: "Add more instances running the same workload. Instead of one 32-core server, run 32 single-core containers. A load balancer distributes traffic. If one fails, others absorb. Add or remove instances without downtime. This is how Netflix, Uber, and Google scale." },
      { title: 'The stateless requirement', text: "Horizontal scaling only works for STATELESS services — each request handled independently, no local session data. Stateless: REST APIs, web servers, workers. Stateful services (databases) require vertical scaling or specialized clustering." },
      { title: 'Containers and horizontal scaling', text: "Docker containers are perfect for horizontal scaling:\n• Start in under a second (fast scale-up)\n• Identical copies (no configuration drift)\n• Isolated (one crash doesn't affect others)\n• Lightweight (many per host machine)" },
    ],
  },
  'load-balance': {
    heading: 'Load Balancing Strategies',
    sections: [
      { title: 'What a load balancer does', text: "Sits in front of multiple container replicas and distributes incoming requests. Also monitors replica health and removes unhealthy instances. Options: nginx, HAProxy, Traefik, AWS ALB, GCP LB." },
      { title: 'Round Robin', text: "Simplest strategy. Requests distributed in rotation: R1→C1, R2→C2, R3→C3, R4→C1. Works well when containers have equal capacity and requests take similar time." },
      { title: 'Least Connections', text: "Routes each new request to the container with fewest active connections. Better when requests vary in processing time — fast requests complete quickly so that container takes more." },
      { title: 'Docker Compose DNS load balancing', text: "When you scale a Compose service (api: 3 replicas), all replicas share the same DNS name. Docker's embedded DNS returns all replica IPs. Clients round-robin between them automatically." },
    ],
  },
  'compose-scale': {
    heading: 'Scaling with Docker Compose',
    sections: [
      { title: 'The scale command', text: "docker compose up -d --scale SERVICE=N\nScales a service to N replicas. Creates or removes containers. Named containers get numeric suffixes: api-1, api-2, api-3." },
      { title: 'Port conflict issue', text: "Cannot scale a service with fixed host port:\nports: '3000:3000' ← two containers can't share port 3000\nSolution 1: Remove host port, use a load balancer\nSolution 2: Port range: '3000-3003:3000'\nSolution 3: Use Docker internal DNS only" },
      { title: 'The deploy section', text: "deploy:\n  replicas: 3\n  update_config:\n    parallelism: 1      — update N at a time\n    delay: 10s           — wait between batches\n    order: start-first   — zero-downtime\n  restart_policy:\n    condition: on-failure\n    max_attempts: 3" },
      { title: 'Rolling updates', text: "With update_config, docker compose up replaces containers one at a time. order: start-first means new container starts and passes health checks BEFORE old stops — true zero-downtime deployment." },
    ],
  },
  resources: {
    heading: 'CPU and Memory Limits',
    sections: [
      { title: 'Why limits are essential', text: "Without limits, a single misbehaving container can consume all CPU/memory on the host, starving other containers. This is the 'noisy neighbor' problem. In production, every container should have limits." },
      { title: 'CPU limits', text: "--cpus='0.5' → 50% of one CPU core\n--cpus='2.0' → 2 full CPU cores\n--cpu-shares=512 → relative weight (soft limit)\nCPU limits throttle — container slows down, doesn't die." },
      { title: 'Memory limits', text: "--memory='512m' → hard limit at 512 MB\n--memory-reservation='256m' → soft limit (best effort)\n--memory-swap='512m' → set equal to --memory to disable swap\nMemory limits kill — exceed and OOM killer terminates. Exit code 137 often means out of memory." },
      { title: 'In docker-compose.yml', text: "deploy:\n  resources:\n    limits:\n      cpus: '0.50'\n      memory: 512M\n    reservations:\n      cpus: '0.25'\n      memory: 256M\nLimits: hard cap. Reservations: soft guarantee.\nMonitor: docker stats" },
    ],
  },
  'auto-scale': {
    heading: 'Auto-Scaling Containers',
    sections: [
      { title: 'The concept', text: "Automatically adjust running container replicas based on observed metrics. Scale up when demand increases, down when it drops. Maintain performance SLAs while minimizing cost." },
      { title: 'Scaling metrics', text: "CPU utilization: scale up when avg > 70%\nMemory pressure: scale up when > 80% of limit\nRequest rate: scale up when req/s exceeds threshold\nQueue depth: scale up when messages exceed N\nCustom: p95 latency, active WebSocket connections" },
      { title: 'The cool-down period', text: "After scaling up, wait before scaling down (5–10 min). Prevents 'flapping' — rapidly scaling up and down. Scale-up should be aggressive (fast). Scale-down should be conservative (slow)." },
      { title: 'Tools for auto-scaling', text: "Docker Compose: no built-in auto-scaling (manual --scale)\nDocker Swarm: docker service update --replicas=N + scripts\nKubernetes HPA: built-in, metrics-based. Industry standard.\nAWS ECS: target tracking, step scaling, scheduled scaling\nAWS Fargate: serverless containers — auto-scales transparently" },
    ],
  },
};

// ─── Helpers ─────────────────────────────────────────────────────────────────

const TermHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
    <div className="w-2 h-2 rounded-full bg-red-500/70" />
    <div className="w-2 h-2 rounded-full bg-amber-500/70" />
    <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
    <span className="text-[10px] font-mono text-muted-foreground ml-1">{title}</span>
  </div>
);

const GaugeBar = ({ value, max = 100, color, label, limit }: { value: number; max?: number; color?: string; label?: string; limit?: number }) => {
  const pct = Math.min((value / max) * 100, 100);
  const c = color || (pct > 80 ? '#EF4444' : pct > 60 ? '#F59E0B' : '#10B981');
  return (
    <div className="w-full">
      {label && <div className="flex items-center justify-between text-[7px] font-mono mb-0.5"><span className="text-foreground/40">{label}</span><span style={{ color: c }}>{value}{max !== 100 ? `/${max}MB` : '%'}</span></div>}
      <div className="h-1.5 rounded-full bg-foreground/5 relative overflow-hidden">
        <motion.div className="h-full rounded-full" animate={{ width: `${pct}%` }} transition={{ duration: 0.5 }} style={{ backgroundColor: c }} />
        {limit !== undefined && <div className="absolute top-0 h-full w-0.5 bg-red-500/60" style={{ left: `${(limit / max) * 100}%` }} />}
      </div>
    </div>
  );
};

const ContainerBox = ({ name, cpu, status = 'running', color = '#10B981', small }: { name: string; cpu?: number; status?: string; color?: string; small?: boolean }) => (
  <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0, scale: 0.7 }}
    transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    className={`rounded-lg border flex flex-col items-center justify-center ${small ? 'px-1.5 py-1' : 'px-2.5 py-1.5'}`}
    style={{ borderColor: status === 'dead' ? '#EF4444' : status === 'updating' ? '#F59E0B60' : `${color}50`, background: status === 'dead' ? '#EF444410' : `${color}06` }}>
    <span className={`font-mono font-bold ${small ? 'text-[7px]' : 'text-[8px]'}`} style={{ color: status === 'dead' ? '#EF4444' : color }}>{name}</span>
    {cpu !== undefined && <GaugeBar value={cpu} />}
    <span className={`font-mono ${small ? 'text-[6px]' : 'text-[7px]'}`} style={{ color: status === 'dead' ? '#EF4444' : status === 'updating' ? '#F59E0B' : '#10B981' }}>
      {status === 'dead' ? '✕ DEAD' : status === 'updating' ? '↻ UPDATING' : '● RUN'}
    </span>
  </motion.div>
);

// ─── Animation 1: H vs V Scaling ─────────────────────────────────────────────

const AnimHvsV = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const [traffic, setTraffic] = useState(100);
  const [vScale, setVScale] = useState(1);
  const [hCount, setHCount] = useState(1);
  const [vDead, setVDead] = useState(false);
  const [hDead, setHDead] = useState(-1);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => { setTraffic(400); setPhase(1); }, 500);
    schedule(() => setTraffic(800), 900);
    schedule(() => { setVScale(1.4); setHCount(3); setPhase(2); }, 1200);
    schedule(() => { setVDead(true); setHDead(1); setPhase(3); }, 2400);
    schedule(() => { setHDead(-1); setHCount(3); }, 3000);
    schedule(() => setPhase(4), 3200);
    schedule(onDone, 3900);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  const vCpu = phase >= 2 ? 60 : phase >= 1 ? 90 : 25;
  const hCpu = phase >= 2 ? 30 : phase >= 1 ? 90 : 25;

  return (
    <div className="w-full h-full flex gap-0">
      {/* Vertical */}
      <div className="flex-1 flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <div className="shrink-0 px-3 py-1.5 border-b text-center" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
          <span className="text-[10px] font-syne font-bold text-amber-400">⬆️ Scale Up (Vertical)</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-3">
          <span className="text-[8px] font-mono text-foreground/30">{traffic} req/s</span>
          {!vDead ? (
            <motion.div animate={{ scale: vScale }} className="origin-center">
              <ContainerBox name="api" cpu={vCpu} color="#F59E0B" />
            </motion.div>
          ) : (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
              <span className="text-lg">💥</span>
              <div className="text-[9px] font-mono text-red-400">SYSTEM DOWN</div>
              <div className="text-[7px] text-red-400/60">100% traffic lost</div>
            </motion.div>
          )}
          {phase >= 2 && !vDead && <span className="text-[7px] font-mono text-amber-400/60">💸 Bigger hardware</span>}
        </div>
      </div>

      {/* Horizontal */}
      <div className="flex-1 flex flex-col" style={{ background: '#0F172A' }}>
        <div className="shrink-0 px-3 py-1.5 border-b text-center" style={{ borderColor: '#1F2D45' }}>
          <span className="text-[10px] font-syne font-bold text-cyan-400">➡️ Scale Out (Horizontal)</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-2 p-3">
          <span className="text-[8px] font-mono text-foreground/30">{traffic} req/s ÷ {hCount}</span>
          <div className="flex flex-wrap gap-1.5 justify-center">
            <AnimatePresence>
              {Array.from({ length: hCount }).map((_, i) => (
                hDead !== i ? <ContainerBox key={i} name={`api-${i + 1}`} cpu={hCpu} color="#06B6D4" small /> : null
              ))}
            </AnimatePresence>
          </div>
          {phase >= 3 && hDead >= 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[7px] font-mono text-emerald-400">
              ✓ 66% capacity — others continue
            </motion.div>
          )}
          {phase >= 3 && hDead < 0 && (
            <span className="text-[7px] font-mono text-emerald-400">✓ Replaced failed container</span>
          )}
        </div>
      </div>

      {/* Comparison overlay */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 40 }} animate={{ opacity: 1, y: 0 }}
          className="absolute bottom-2 left-2 right-2 rounded-lg border p-2" style={{ borderColor: '#06B6D430', background: '#0D1117F0' }}>
          <div className="grid grid-cols-3 gap-1 text-[7px] font-mono">
            <span className="text-foreground/30">Attribute</span><span className="text-amber-400/60">Scale Up</span><span className="text-cyan-400/60">Scale Out</span>
            <span className="text-foreground/30">Cost</span><span className="text-foreground/40">Exponential</span><span className="text-foreground/40">Linear</span>
            <span className="text-foreground/30">Fault tolerance</span><span className="text-red-400/60">None</span><span className="text-emerald-400/60">High</span>
            <span className="text-foreground/30">Limit</span><span className="text-foreground/40">Hardware cap</span><span className="text-foreground/40">Near infinite</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 2: Load Balancing ─────────────────────────────────────────────

const AnimLoadBalance = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const [loads, setLoads] = useState([30, 30, 30]);
  const [activeRoute, setActiveRoute] = useState(-1);
  const [unhealthy, setUnhealthy] = useState(-1);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    // Round robin
    schedule(() => { setPhase(1); setActiveRoute(0); }, 600);
    schedule(() => setActiveRoute(1), 900);
    schedule(() => setActiveRoute(2), 1200);
    schedule(() => setActiveRoute(0), 1500);

    // Least connections
    schedule(() => { setPhase(2); setLoads([80, 20, 45]); setActiveRoute(1); }, 1800);

    // Health check failure
    schedule(() => { setPhase(3); setUnhealthy(1); setActiveRoute(-1); }, 2400);
    schedule(() => { setUnhealthy(-1); setPhase(4); }, 3200);

    schedule(onDone, 3900);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  const containers = ['API-1', 'API-2', 'API-3'];

  return (
    <div className="w-full h-full flex flex-col items-center p-4 gap-3 overflow-y-auto">
      {/* Load balancer */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="rounded-xl border-2 px-6 py-2 flex items-center gap-2"
        style={{ borderColor: '#10B981', background: '#10B98108', boxShadow: '0 0 16px #10B98120' }}>
        <span className="text-lg">⚖️</span>
        <div>
          <span className="text-[10px] font-syne font-bold text-emerald-400">LOAD BALANCER</span>
          <div className="text-[7px] text-foreground/30 font-mono">nginx / HAProxy</div>
        </div>
      </motion.div>

      {/* Strategy label */}
      <AnimatePresence mode="wait">
        <motion.div key={phase} initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="text-[8px] font-mono text-emerald-400/60">
          {phase <= 1 ? 'Round Robin: rotate equally' : phase === 2 ? 'Least Connections: route to least busy' : phase === 3 ? 'Health check: removing unhealthy' : 'Container restored to pool ✓'}
        </motion.div>
      </AnimatePresence>

      {/* Containers */}
      <div className="flex items-start gap-3">
        {containers.map((c, i) => (
          <motion.div key={c} animate={{ opacity: unhealthy === i ? 0.3 : 1 }} className="flex flex-col items-center gap-1">
            <motion.div className="rounded-lg border-2 px-3 py-2 flex flex-col items-center gap-1 w-20"
              animate={{ borderColor: activeRoute === i ? '#10B981' : unhealthy === i ? '#EF4444' : '#1F2D45', boxShadow: activeRoute === i ? '0 0 12px #10B98140' : 'none' }}
              style={{ background: unhealthy === i ? '#EF444408' : '#111827' }}>
              <span className="text-[9px] font-mono font-bold" style={{ color: unhealthy === i ? '#EF4444' : '#10B981' }}>{c}</span>
              <GaugeBar value={loads[i]} label="CPU" />
              {unhealthy === i && <span className="text-[7px] font-mono text-red-400">✕ UNHEALTHY</span>}
            </motion.div>
          </motion.div>
        ))}
      </div>

      {/* Nginx config snippet */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded border p-2 w-full max-w-sm" style={{ borderColor: '#1F2D45', background: '#000' }}>
          <pre className="text-[7px] font-mono text-foreground/50 leading-3.5">{`upstream api_servers {
    least_conn;
    server api_1:3000;
    server api_2:3000;
    server api_3:3000;
}`}</pre>
        </motion.div>
      )}

      {phase >= 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="px-4 py-1 rounded-lg text-center" style={{ background: '#10B98110', border: '1px solid #10B98130' }}>
          <span className="text-[9px] font-mono text-emerald-400">Load balancers are the traffic directors of a scaled system.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 3: Compose Scaling ────────────────────────────────────────────

interface Replica { name: string; status: 'running' | 'updating' | 'removing' }

const AnimComposeScale = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean }[]>([]);
  const [replicas, setReplicas] = useState<Replica[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [termLines.length]);

  useEffect(() => {
    // Step 1: initial up
    schedule(() => {
      setTermLines(p => [...p, { text: '$ docker compose up -d', isCmd: true }]);
      schedule(() => {
        setTermLines(p => [...p, { text: '✔ app-web-1 Started', isSuccess: true }, { text: '✔ app-api-1 Started', isSuccess: true }, { text: '✔ app-db-1  Started', isSuccess: true }]);
        setReplicas([{ name: 'web-1', status: 'running' }, { name: 'api-1', status: 'running' }, { name: 'db-1', status: 'running' }]);
      }, 300);
    }, 200);

    // Step 2: scale up
    schedule(() => {
      setTermLines(p => [...p, { text: '$ docker compose up -d --scale api=3', isCmd: true }]);
      schedule(() => {
        setTermLines(p => [...p, { text: '✔ app-api-2 Started', isSuccess: true }, { text: '✔ app-api-3 Started', isSuccess: true }]);
        setReplicas(prev => [...prev, { name: 'api-2', status: 'running' }, { name: 'api-3', status: 'running' }]);
      }, 300);
    }, 1200);

    // Step 3: scale down
    schedule(() => {
      setTermLines(p => [...p, { text: '$ docker compose up -d --scale api=2', isCmd: true }]);
      schedule(() => {
        setTermLines(p => [...p, { text: '✔ app-api-3 Removed' }]);
        setReplicas(prev => prev.filter(r => r.name !== 'api-3'));
      }, 300);
    }, 2000);

    // Step 4: rolling update
    schedule(() => {
      setTermLines(p => [...p, { text: '$ docker compose up -d api  # rolling update', isCmd: true }]);
      schedule(() => {
        setReplicas(prev => prev.map(r => r.name === 'api-1' ? { ...r, status: 'updating' } : r));
        setTermLines(p => [...p, { text: '✔ app-api-1 Recreated', isSuccess: true }]);
      }, 200);
      schedule(() => {
        setReplicas(prev => prev.map(r => r.name === 'api-1' ? { ...r, status: 'running' } : r.name === 'api-2' ? { ...r, status: 'updating' } : r));
        setTermLines(p => [...p, { text: '✔ app-api-2 Recreated', isSuccess: true }]);
      }, 600);
      schedule(() => {
        setReplicas(prev => prev.map(r => ({ ...r, status: 'running' })));
      }, 1000);
    }, 2800);

    schedule(onDone, 4200);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  return (
    <div className="w-full h-full flex gap-0">
      <div className="flex-[55] flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <TermHeader title="compose scaling" />
        <div ref={scrollRef} className="terminal-black p-2 overflow-y-auto font-mono text-[10px] leading-5 flex-1">
          {termLines.map((line, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.12 }}>
              {line.isCmd ? <><span className="text-emerald-400">$ </span><span className="text-foreground">{line.text.slice(2)}</span></> :
                line.isSuccess ? <span className="text-emerald-400">{line.text}</span> :
                  <span className="text-foreground/50">{line.text}</span>}
            </motion.div>
          ))}
        </div>
      </div>

      <div className="flex-[45] flex flex-col" style={{ background: '#0F172A' }}>
        <div className="shrink-0 px-3 py-1.5 border-b text-center" style={{ borderColor: '#1F2D45' }}>
          <span className="text-[10px] font-syne font-bold text-purple-400">Running Replicas</span>
          <span className="text-[8px] font-mono text-foreground/30 ml-2">{replicas.length} containers</span>
        </div>
        <div className="flex-1 p-3 overflow-y-auto">
          <div className="grid grid-cols-2 gap-1.5">
            <AnimatePresence>
              {replicas.map(r => (
                <ContainerBox key={r.name} name={r.name} status={r.status} color="#8B5CF6" small />
              ))}
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Animation 4: Resource Limits ────────────────────────────────────────────

const AnimResources = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const [stats, setStats] = useState([
    { name: 'hungry-app', cpu: 10, mem: 50, memLimit: 0 },
    { name: 'web', cpu: 5, mem: 45, memLimit: 256 },
    { name: 'db', cpu: 12, mem: 234, memLimit: 1024 },
  ]);
  const [oom, setOom] = useState(false);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    // Noisy neighbor
    schedule(() => { setPhase(1); setStats(prev => prev.map((s, i) => i === 0 ? { ...s, cpu: 95, mem: 950 } : s)); }, 200);

    // Set CPU limit
    schedule(() => {
      setPhase(2);
      setStats(prev => [{ name: 'api', cpu: 48, mem: 300, memLimit: 512 }, prev[1], prev[2]]);
    }, 1000);

    // Set memory limit
    schedule(() => setPhase(3), 1800);

    // OOM
    schedule(() => { setOom(true); setPhase(4); }, 2600);
    schedule(() => { setOom(false); setStats(prev => prev.map((s, i) => i === 0 ? { ...s, mem: 100 } : s)); }, 3100);

    // docker stats
    schedule(() => setPhase(5), 3400);

    schedule(onDone, 4100);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2 overflow-y-auto">
      <div className="text-[10px] font-syne font-bold text-orange-400 text-center">Container Resource Monitor</div>

      {/* Container resource rows */}
      <div className="space-y-2">
        {stats.map((s, i) => (
          <motion.div key={s.name} layout className="rounded-lg border p-2"
            style={{ borderColor: (i === 0 && phase === 1) ? '#EF444450' : (i === 0 && oom) ? '#EF4444' : '#1F2D45', background: (i === 0 && oom) ? '#EF444410' : '#111827' }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[9px] font-mono font-bold text-foreground/70">{s.name}</span>
              {i === 0 && phase === 1 && <span className="text-[7px] font-mono text-red-400">⚠️ Noisy neighbor!</span>}
              {i === 0 && oom && <motion.span initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-[7px] font-mono text-red-400">💥 OOM KILLED</motion.span>}
            </div>
            <GaugeBar value={s.cpu} label="CPU" />
            <div className="mt-1" />
            <GaugeBar value={s.mem} max={s.memLimit || 1024} label="Memory" limit={s.memLimit || undefined} />
          </motion.div>
        ))}
      </div>

      {/* Compose YAML */}
      {phase >= 3 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded border p-2" style={{ borderColor: '#F9731630', background: '#0D1117' }}>
          <div className="text-[7px] font-mono text-orange-400/50 mb-0.5">Compose resource config:</div>
          <pre className="text-[8px] font-mono text-foreground/50 leading-3.5">{`deploy:
  resources:
    limits:   { cpus: '0.50', memory: 512M }
    reservations: { cpus: '0.25', memory: 256M }`}</pre>
          <div className="flex gap-3 mt-1 text-[7px] font-mono">
            <span className="text-red-400/60">limits = hard cap</span>
            <span className="text-amber-400/60">reservations = soft guarantee</span>
          </div>
        </motion.div>
      )}

      {/* docker stats */}
      {phase >= 5 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded border p-2" style={{ borderColor: '#1F2D45', background: '#000' }}>
          <div className="text-[7px] font-mono text-orange-400/50 mb-0.5">$ docker stats</div>
          <pre className="text-[8px] font-mono text-foreground/50 leading-4">{`CONTAINER  CPU%    MEM / LIMIT     MEM%
api        48.2%   487MiB/512MiB   95% ⚠️
web         2.1%    45MiB/256MiB   17% ✓
db         12.4%   234MiB/1GiB     23% ✓`}</pre>
        </motion.div>
      )}

      {phase >= 5 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="px-3 py-1 rounded-lg text-center" style={{ background: '#F9731610', border: '1px solid #F9731630' }}>
          <span className="text-[9px] font-mono text-orange-400">Always set resource limits. Prevent one container from killing your host.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 5: Auto-Scaling ───────────────────────────────────────────────

const AnimAutoScale = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [traffic, setTraffic] = useState(20);
  const [replicas, setReplicas] = useState(2);
  const [phase, setPhase] = useState(0);
  const [cooldown, setCooldown] = useState(false);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    // Spike
    schedule(() => { setTraffic(50); setPhase(1); }, 500);
    schedule(() => setTraffic(80), 800);
    schedule(() => { setTraffic(95); }, 1100);

    // Scale up
    schedule(() => { setPhase(2); setReplicas(4); }, 1500);

    // Traffic drops
    schedule(() => { setTraffic(40); setPhase(3); }, 2400);
    schedule(() => setTraffic(20), 2700);

    // Cool-down + scale down
    schedule(() => setCooldown(true), 3000);
    schedule(() => { setCooldown(false); setReplicas(2); setPhase(4); }, 3500);

    // Tools
    schedule(() => setPhase(5), 3800);
    schedule(onDone, 4500);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  const cpuPerReplica = Math.round(traffic / replicas * 1.2);
  const trafficColor = traffic > 80 ? '#EF4444' : traffic > 50 ? '#F59E0B' : '#10B981';

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2 overflow-y-auto">
      {/* Traffic meter */}
      <div className="rounded-lg border p-2" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
        <div className="flex items-center justify-between text-[8px] font-mono mb-1">
          <span className="text-foreground/40">Traffic Load</span>
          <span style={{ color: trafficColor }}>{traffic * 10} req/s</span>
        </div>
        <div className="h-3 rounded-full bg-foreground/5 overflow-hidden">
          <motion.div className="h-full rounded-full" animate={{ width: `${traffic}%` }} transition={{ duration: 0.5 }}
            style={{ backgroundColor: trafficColor }} />
        </div>
      </div>

      {/* Alert */}
      {phase >= 1 && traffic > 70 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-[8px] font-mono text-red-400 text-center">
          ⚠️ CPU &gt; 80% threshold breached
        </motion.div>
      )}

      {/* Auto-scaler decision */}
      {phase === 2 && (
        <motion.div initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded border px-3 py-1 text-center" style={{ borderColor: '#F59E0B40', background: '#F59E0B08' }}>
          <span className="text-[9px] font-mono text-amber-400">🤖 Auto-scaler: +2 replicas (2 → 4)</span>
        </motion.div>
      )}

      {cooldown && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="rounded border px-3 py-1 text-center" style={{ borderColor: '#F59E0B30', background: '#F59E0B06' }}>
          <span className="text-[8px] font-mono text-amber-400/60">⏳ Cool-down... 4 → 2 replicas</span>
        </motion.div>
      )}

      {/* Replicas */}
      <div className="flex flex-wrap gap-1.5 justify-center">
        <AnimatePresence>
          {Array.from({ length: replicas }).map((_, i) => (
            <ContainerBox key={i} name={`api-${i + 1}`} cpu={Math.min(cpuPerReplica, 95)} color="#F59E0B" small />
          ))}
        </AnimatePresence>
      </div>

      <div className="text-[8px] font-mono text-foreground/30 text-center">{replicas} replicas — ~{cpuPerReplica}% CPU each</div>

      {/* Scaling tools */}
      {phase >= 5 && (
        <div className="flex gap-2">
          {[
            { name: 'Docker Swarm', desc: 'Built-in. Simple.', color: '#06B6D4' },
            { name: 'K8s HPA', desc: 'Industry standard.', color: '#8B5CF6' },
            { name: 'AWS ECS', desc: 'Managed. Cloud.', color: '#F97316' },
          ].map((tool, i) => (
            <motion.div key={tool.name} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }}
              className="flex-1 rounded-lg border p-1.5 text-center" style={{ borderColor: `${tool.color}30`, background: `${tool.color}06` }}>
              <div className="text-[8px] font-mono font-bold" style={{ color: tool.color }}>{tool.name}</div>
              <div className="text-[7px] text-foreground/30">{tool.desc}</div>
            </motion.div>
          ))}
        </div>
      )}

      {phase >= 5 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="px-3 py-1 rounded-lg text-center" style={{ background: '#F59E0B10', border: '1px solid #F59E0B30' }}>
          <span className="text-[9px] font-mono text-amber-400">Auto-scaling = match capacity to demand. K8s HPA is the standard.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Main Level 14 Page ──────────────────────────────────────────────────────

const Level14Interactive = () => {
  const navigate = useNavigate();
  const { completeLevel, completedLevels } = useGameStore();
  const [completed, setCompleted] = useState<Set<TopicId>>(new Set());
  const [active, setActive] = useState<TopicId | null>(null);
  const [animating, setAnimating] = useState(false);
  const [infoLines, setInfoLines] = useState<{ text: string; type: 'cmd' | 'output' }[]>([]);
  const [localXP, setLocalXP] = useState(0);
  const [levelDone, setLevelDone] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
  const [paused, setPaused] = useState(false);
  const [animRunId, setAnimRunId] = useState(0);
  const logTimers = usePausableTimers(paused);

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
    if (wasNew && !completedLevels.includes(14)) completeLevel(14);
    if (next.size === 5 && !levelDone) {
      setLevelDone(true);
    }
  }, [active, completed, levelDone, completedLevels, completeLevel]);

  const animKey = active ? `${active}-${animRunId}` : '';

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: '#070B14' }}>
      <nav className="shrink-0 border-b border-border px-4 py-2.5 flex items-center justify-between" style={{ background: '#0F172A' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground text-sm mr-2">←</button>
          <span className="text-xl">🐳</span>
          <div>
            <h1 className="font-syne font-bold text-accent text-sm tracking-wide">DOCKER QUEST</h1>
            <p className="text-[10px] text-muted-foreground font-mono">Level 14 — Scaling Containers</p>
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

      <AnimatePresence>
        {levelDone && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }}
            className="shrink-0 bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-3 flex items-center justify-between">
            <span className="font-syne font-bold text-emerald-400 text-sm">🎉 Level 14 Complete! +100 XP — Your system can handle any load!</span>
            <button onClick={() => navigate('/level/15')} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-syne font-bold text-xs hover:opacity-90 transition-opacity">Continue to Level 15 →</button>
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
                  <motion.span className="text-6xl" animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }}>📈</motion.span>
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
                    {active === 'h-vs-v' && <AnimHvsV onDone={handleAnimDone} paused={paused} />}
                    {active === 'load-balance' && <AnimLoadBalance onDone={handleAnimDone} paused={paused} />}
                    {active === 'compose-scale' && <AnimComposeScale onDone={handleAnimDone} paused={paused} />}
                    {active === 'resources' && <AnimResources onDone={handleAnimDone} paused={paused} />}
                    {active === 'auto-scale' && <AnimAutoScale onDone={handleAnimDone} paused={paused} />}
                  </div>
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

          <div className="shrink-0 border-t border-border" style={{ height: 200 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: '#0D1117' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-[10px] font-mono text-muted-foreground ml-1">docker-quest scaling log</span>
            </div>
            <div ref={logRef} className="terminal-black p-3 overflow-y-auto font-mono text-[13px] leading-5" style={{ height: 'calc(200px - 28px)' }}>
              {infoLines.length === 0 ? (
                <span className="text-muted-foreground/50">{'> Click a topic to explore Container Scaling...'}<span className="inline-block w-2 h-4 bg-muted-foreground/50 ml-1" style={{ animation: 'blink 1s infinite' }} /></span>
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
              <div className="flex items-center gap-2"><span>📖</span><h2 className="font-syne font-bold text-foreground text-sm">Scaling Reference</h2></div>
              <span className="text-[10px] text-muted-foreground font-mono">Level 14 — Scaling Containers</span>
            </div>

            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: '#1E3A5F', background: '#0F172A' }}>
              <h3 className="font-syne font-bold text-foreground text-sm mb-2">📈 Scaling Containers</h3>
              <p className="text-xs text-foreground/70 leading-relaxed">
                Scaling is about handling more traffic, more users, and more load without
                your system falling over. Docker containers are uniquely suited for horizontal
                scaling — spin up identical copies in seconds, route traffic with a load balancer,
                and tear them down just as fast. Level 14 builds the mental model for how
                production systems handle real-world load.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['Horizontal', 'Replicas', 'Load Balancer', 'Resources', 'Auto-Scale'].map(tag => (
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

export default Level14Interactive;
