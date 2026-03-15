import { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';

type TopicId = 'architecture' | 'pipeline' | 'request' | 'failure' | 'together';

interface TopicMeta {
  id: TopicId; label: string; icon: string; color: string;
  colorClass: string; borderClass: string; bgTint: string; glowStyle: string;
}

const TOPICS: TopicMeta[] = [
  { id: 'architecture', label: 'Full Architecture', icon: '🏗️', color: '#06B6D4', colorClass: 'text-cyan-400', borderClass: 'border-cyan-500', bgTint: 'bg-cyan-500/10', glowStyle: '0 0 12px rgba(6,182,212,0.4)' },
  { id: 'pipeline', label: 'Deploy Pipeline', icon: '🚀', color: '#10B981', colorClass: 'text-emerald-400', borderClass: 'border-emerald-500', bgTint: 'bg-emerald-500/10', glowStyle: '0 0 12px rgba(16,185,129,0.4)' },
  { id: 'request', label: 'Request Journey', icon: '🌊', color: '#8B5CF6', colorClass: 'text-purple-400', borderClass: 'border-purple-500', bgTint: 'bg-purple-500/10', glowStyle: '0 0 12px rgba(139,92,246,0.4)' },
  { id: 'failure', label: 'Failure & Recovery', icon: '🔥', color: '#EF4444', colorClass: 'text-red-400', borderClass: 'border-red-500', bgTint: 'bg-red-500/10', glowStyle: '0 0 12px rgba(239,68,68,0.4)' },
  { id: 'together', label: 'Everything Together', icon: '🏆', color: '#FFD700', colorClass: 'text-yellow-300', borderClass: 'border-yellow-400', bgTint: 'bg-yellow-500/10', glowStyle: '0 0 16px rgba(255,215,0,0.5)' },
];

const INFO_LOGS: Record<TopicId, { prefix: string; lines: string[] }> = {
  architecture: {
    prefix: '> Loading: Production Architecture',
    lines: [
      '# Full stack: nginx×2, web×2, api×3, worker×2,',
      '#   scheduler×1, postgres×1, redis×1, elasticsearch×1, prometheus×1, grafana×1',
      '# Total: 14 containers | Volumes: 3 | Networks: 4',
      '$ docker compose up -d',
      '[+] Running 17/17',
      ' ✔ Network frontend-net   Created',
      ' ✔ Network backend-net    Created',
      ' ✔ Network monitoring-net Created',
      ' ✔ Volume pgdata          Created',
      ' ✔ Container postgres-1   Started',
      ' ✔ Container redis-1      Started',
      ' ✔ Container api-1        Started',
      ' ✔ Container api-2        Started',
      ' ✔ Container api-3        Started',
      ' ✔ Container worker-1     Started',
      ' ✔ Container web-1        Started',
      ' ✔ Container nginx-1      Started',
      '> Full stack running ✓',
    ],
  },
  pipeline: {
    prefix: '> Loading: CI/CD Deploy Pipeline',
    lines: [
      '[1] git push origin main          → CI triggered',
      '[2] docker build -t app:${SHA} .  → image built',
      '[3] npm test                      → tests passed ✓',
      '[4] docker tag app:${SHA} app:latest',
      '[5] docker push app:${SHA}        → pushed to registry',
      '[6] docker compose pull           → pull latest images',
      '[7] docker compose up -d          → rolling update',
      '[8] health checks pass ✓          → deployment complete',
      'Deploy time: 47 seconds | Zero downtime ✓',
      '> CI/CD pipeline demo complete ✓',
    ],
  },
  request: {
    prefix: '> Loading: Request Tracing',
    lines: [
      'GET https://api.myapp.com/api/users/42',
      '→ nginx: SSL terminate, rate check, route /api/* → api',
      '→ api-2: auth validate, GET /users/42',
      '→ redis: GET user:42 → MISS',
      '→ postgres: SELECT * FROM users WHERE id=42 → 1 row, 12ms',
      '→ redis: SET user:42 [data] EX 300 → cached ✓',
      '→ response: 200 OK {"id":42,"name":"Jiten"} 20ms total',
      'Second request (cached):',
      '→ redis: GET user:42 → HIT → 4ms total 🚀',
      '> Request journey traced ✓',
    ],
  },
  failure: {
    prefix: '> Loading: Failure Recovery Scenarios',
    lines: [
      '[1] Container crash:    on-failure restart → recovered 3s ✓',
      '[2] Volume persistence: container removed, data intact ✓',
      '[3] Bad deploy:         health check failed → auto-rollback ✓',
      '[4] Traffic spike:      scale 2→6 replicas → handled ✓',
      '# These recoveries are AUTOMATIC — no human needed',
      '# restart: unless-stopped (L12), volumes (L9),',
      '# healthcheck (L11/L12), --scale (L14)',
      '> Failure scenarios demo complete ✓',
    ],
  },
  together: {
    prefix: '> DOCKER QUEST COMPLETE 🎓',
    lines: [
      '# What you now know:',
      'L1-L3:   Docker fundamentals and installation',
      'L4-L5:   Images and containers',
      'L6-L8:   Commands, Dockerfile, and docker build',
      'L9-L10:  Volumes and networking',
      'L11-L12: Docker Compose and container lifecycle',
      'L13-L14: Registries and scaling',
      'L15:     Real-world production deployment',
      '# Total XP: 1500 / 1500  🏆  Docker Master',
      '$ docker run -d jiten/docker-engineer:v1.0.0 ✓',
      '> You are a Docker Engineer. 🐳',
    ],
  },
};

interface CardSection { title: string; text: string }
const CARD_DATA: Record<TopicId, { heading: string; sections: CardSection[] }> = {
  architecture: {
    heading: 'Production Docker Architecture Patterns',
    sections: [
      { title: 'The layers of a production stack', text: "Edge: nginx/Traefik for SSL, rate limiting, routing.\nPresentation: web frontend (Next.js) as containerized static serving.\nApplication: REST APIs, workers — scale horizontally.\nData: PostgreSQL, Redis (cache), Elasticsearch (search).\nStorage: named volumes for stateful services.\nMonitoring: Prometheus + Grafana for metrics.\nNetworks: frontend-net, backend-net, monitoring-net." },
      { title: 'The golden rules', text: "1. Stateless services → scale horizontally with replicas\n2. Stateful services → vertical scale or managed services\n3. Every service: resource limits, restart policy, health check\n4. Every stateful service: a named volume for persistence\n5. All secrets via env vars, never baked into images\n6. All config in docker-compose.yml, committed to VCS" },
      { title: 'docker-compose.yml as infrastructure', text: "Your docker-compose.yml IS your infrastructure definition. A new developer clones the repo, runs docker compose up -d, and has the entire stack running locally in under 2 minutes. This reproducibility is Docker's greatest gift to teams." },
    ],
  },
  pipeline: {
    heading: 'The Production Deploy Pipeline',
    sections: [
      { title: 'The complete workflow', text: "1. Push code to main branch\n2. GitHub Actions triggers\n3. docker build -t myapp:${SHA}\n4. Run test suite inside the image\n5. docker push myapp:${SHA}\n6. SSH or deploy API trigger\n7. docker compose pull\n8. docker compose up -d (rolling update)\n9. Health checks verify new containers\n10. Old containers removed, deploy complete" },
      { title: 'Zero-downtime deployments', text: "With rolling updates (parallelism: 1, order: start-first): new container starts → health check passes → old stops. At no point is the service down. Requires: multiple replicas (2+) and a load balancer." },
      { title: 'Deployment best practices', text: "Always deploy with SHA tags — never 'latest' in production.\nAlways have health checks — catch broken deployments.\nAlways have rollback tested — know how to revert.\nAlways monitor deploys — watch metrics 15 min post-deploy.\nDeploy small, deploy often — reduce risk per deployment." },
    ],
  },
  request: {
    heading: 'The Request Lifecycle in Production',
    sections: [
      { title: 'The layers a request travels', text: "DNS → Load balancer / CDN → nginx reverse proxy → Auth middleware → Application handler → Cache check (Redis) → Database query (if miss) → Response → Client\n\nEach layer adds latency. Goal: serve from CDN (0ms) or Redis (1–5ms) rather than DB (10–50ms)." },
      { title: 'Caching strategy', text: "Cache-aside pattern:\n1. Check cache — HIT: return (fast)\n2. MISS: query DB, store in cache with TTL, return\n3. On mutation: invalidate or update cache key\nIn Docker: api talks to redis by hostname 'redis'." },
      { title: 'Observability', text: "Three pillars:\nMetrics: Prometheus scrapes container + app metrics\nLogs: structured JSON → Loki or CloudWatch\nTraces: distributed tracing → Jaeger or X-Ray\nIn Docker: add prometheus, grafana, loki to Compose." },
    ],
  },
  failure: {
    heading: 'Production Resilience Patterns',
    sections: [
      { title: 'Design for failure', text: "Production WILL fail. Docker provides:\nrestart policies (L12) → auto recovery\nvolumes (L9) → data survives container loss\nrolling updates + health checks (L11, L12) → safe deploys\nmultiple replicas (L14) → no single point of failure\nregistry history (L13) → instant rollback" },
      { title: 'The resilience checklist', text: "Every production service should have:\n✓ restart: unless-stopped\n✓ healthcheck\n✓ resource limits\n✓ at least 2 replicas\n✓ named volume\n✓ depends_on: service_healthy\n✓ image SHA tag pinned" },
      { title: 'MTTR and MTBF', text: "MTTR (Mean Time To Recovery): how long to restore.\nMTBF (Mean Time Between Failures): how often failures occur.\nGood Docker practices reduce MTTR to seconds.\nMultiple replicas improve MTBF (partial failure = degraded, not down)." },
    ],
  },
  together: {
    heading: 'You Are a Docker Engineer',
    sections: [
      { title: 'What you can now do', text: "Write production Dockerfiles with multi-stage builds. Build images for multiple platforms. Push to any registry.\n\nRun containers with resource limits, restart policies, health checks, ports, and volumes. Debug with exec, logs, inspect.\n\nWrite docker-compose.yml for complete stacks with services, networks, volumes, dependencies, and rolling updates.\n\nScale horizontally, load balance, implement zero-downtime deployments. Design for failure." },
      { title: 'Beyond this course', text: "Kubernetes: production orchestrator for large-scale systems.\nDocker Swarm: simpler built-in orchestration.\nHelm: package manager for Kubernetes.\nTerraform: infrastructure as code.\nNext: deploy a real app to a cloud provider, then explore Kubernetes." },
      { title: 'A final thought', text: "Docker democratized production-grade deployment. What required dedicated DevOps teams now fits in a docker-compose.yml any developer can run. You're part of a generation that builds, ships, and runs software in containers. Welcome to the Docker community. 🐳" },
    ],
  },
};

// ─── Shared Helpers ──────────────────────────────────────────────────────────

const TermHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
    <div className="w-2 h-2 rounded-full bg-red-500/70" />
    <div className="w-2 h-2 rounded-full bg-amber-500/70" />
    <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
    <span className="text-[10px] font-mono text-muted-foreground ml-1">{title}</span>
  </div>
);

const LevelBadge = ({ level, color, delay = 0 }: { level: string; color: string; delay?: number }) => (
  <motion.span initial={{ opacity: 0, scale: 0.7 }} animate={{ opacity: 1, scale: 1 }}
    transition={{ delay, type: 'spring', stiffness: 300, damping: 18 }}
    className="px-1.5 py-0.5 rounded text-[7px] font-mono font-bold"
    style={{ backgroundColor: `${color}20`, color, border: `1px solid ${color}40` }}>
    {level}
  </motion.span>
);

const ArchNode = ({ name, sub, color, badges, delay = 0, replicas }: { name: string; sub: string; color: string; badges: { label: string; color: string }[]; delay?: number; replicas?: number }) => (
  <motion.div initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} transition={{ delay, duration: 0.35 }}
    className="rounded-lg border px-2 py-1.5 flex flex-col gap-0.5 min-w-[80px]"
    style={{ borderColor: `${color}40`, background: `${color}06` }}>
    <div className="flex items-center gap-1">
      <span className="text-[9px] font-mono font-bold" style={{ color }}>{name}</span>
      {replicas && replicas > 1 && <span className="text-[7px] px-1 rounded font-mono" style={{ backgroundColor: `${color}20`, color }}>×{replicas}</span>}
    </div>
    <span className="text-[7px] font-mono text-foreground/30">{sub}</span>
    <div className="flex flex-wrap gap-0.5 mt-0.5">
      {badges.map((b, i) => <LevelBadge key={i} level={b.label} color={b.color} delay={delay + 0.3 + i * 0.1} />)}
    </div>
  </motion.div>
);

// ─── Animation 1: Full Architecture ──────────────────────────────────────────

const AnimArchitecture = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    t.push(setTimeout(() => setPhase(1), 300));
    t.push(setTimeout(() => setPhase(2), 900));
    t.push(setTimeout(() => setPhase(3), 1800));
    t.push(setTimeout(() => setPhase(4), 3000));
    t.push(setTimeout(() => setPhase(5), 4000));
    t.push(setTimeout(() => setPhase(6), 4800));
    t.push(setTimeout(onDone, 5600));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex flex-col items-center p-3 gap-2 overflow-y-auto">
      {phase === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="text-center mt-6">
          <div className="text-sm font-syne font-bold text-foreground">Your Production Docker Stack</div>
          <div className="text-[9px] font-mono text-foreground/30 mt-1">Built from Levels 1–14</div>
        </motion.div>
      )}

      {/* Layer 5: Edge */}
      {phase >= 5 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-1 w-full">
          <motion.div className="text-[8px] font-mono text-foreground/20">👤 Internet Users → HTTPS</motion.div>
          <ArchNode name="🔀 nginx" sub="SSL · Rate Limit · Routing" color="#06B6D4" replicas={2} badges={[{ label: 'L10', color: '#06B6D4' }, { label: 'L14', color: '#F59E0B' }]} />
          <div className="w-px h-3 bg-foreground/10" />
        </motion.div>
      )}

      {/* Layer 4: Presentation */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 justify-center">
          <ArchNode name="🌐 web" sub="Next.js frontend" color="#8B5CF6" replicas={2} badges={[{ label: 'L11', color: '#8B5CF6' }]} delay={0} />
          <ArchNode name="📊 grafana" sub="Monitoring" color="#F97316" badges={[]} delay={0.15} />
          <ArchNode name="📡 prometheus" sub="Metrics" color="#F97316" badges={[]} delay={0.25} />
        </motion.div>
      )}

      {phase >= 4 && <div className="w-24 h-px bg-foreground/10" />}

      {/* Layer 3: Application */}
      {phase >= 3 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 justify-center flex-wrap">
          <ArchNode name="⚙️ api" sub="REST API" color="#10B981" replicas={3} badges={[{ label: 'L11', color: '#8B5CF6' }, { label: 'L14', color: '#F59E0B' }]} delay={0} />
          <ArchNode name="👷 worker" sub="Background Jobs" color="#10B981" replicas={2} badges={[{ label: 'L14', color: '#F59E0B' }]} delay={0.2} />
          <ArchNode name="📬 scheduler" sub="Cron Jobs" color="#10B981" badges={[{ label: 'L11', color: '#8B5CF6' }]} delay={0.35} />
        </motion.div>
      )}

      {phase >= 3 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
          className="px-3 py-0.5 rounded-full border-dashed border text-[7px] font-mono text-purple-400/40" style={{ borderColor: '#8B5CF640' }}>
          backend-net · frontend-net <LevelBadge level="L10" color="#06B6D4" delay={0.5} />
        </motion.div>
      )}

      {/* Layer 2: Data */}
      {phase >= 2 && (
        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 justify-center">
          <ArchNode name="🗄️ postgres:15" sub="Primary Database" color="#06B6D4" badges={[{ label: 'L5', color: '#10B981' }]} delay={0} />
          <ArchNode name="📦 redis:7" sub="Cache & Sessions" color="#EF4444" badges={[{ label: 'L5', color: '#10B981' }]} delay={0.2} />
          <ArchNode name="🔍 elastic" sub="Search Engine" color="#F59E0B" badges={[{ label: 'L5', color: '#10B981' }]} delay={0.35} />
        </motion.div>
      )}

      {/* Layer 1: Storage */}
      {phase >= 1 && (
        <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-1">
          <div className="flex gap-3">
            <div className="flex items-center gap-1">
              <span className="text-[8px]">💾</span>
              <span className="text-[8px] font-mono text-teal-400/60">pgdata</span>
              <LevelBadge level="L9" color="#14B8A6" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[8px]">💾</span>
              <span className="text-[8px] font-mono text-teal-400/60">uploads</span>
              <LevelBadge level="L9" color="#14B8A6" />
            </div>
            <div className="flex items-center gap-1">
              <span className="text-[8px]">💾</span>
              <span className="text-[8px] font-mono text-teal-400/60">es-data</span>
              <LevelBadge level="L9" color="#14B8A6" />
            </div>
          </div>
          <div className="w-full max-w-xs rounded border px-3 py-1 text-center" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
            <span className="text-[7px] font-mono text-foreground/20">Ubuntu 22.04 LTS Host — 16 cores, 32GB RAM</span>
          </div>
        </motion.div>
      )}

      {/* Stats + badge glow */}
      {phase >= 6 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="flex gap-2 flex-wrap justify-center mt-1">
          {[{ v: '14 containers', e: '📦' }, { v: '3 volumes', e: '💾' }, { v: '4 networks', e: '🌐' }, { v: '1 compose file', e: '🐳' }].map((s, i) => (
            <motion.span key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.12 }}
              className="text-[8px] font-mono px-2 py-0.5 rounded-full border" style={{ borderColor: '#06B6D430', color: '#06B6D4', background: '#06B6D406' }}>
              {s.e} {s.v}
            </motion.span>
          ))}
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 2: Deploy Pipeline ────────────────────────────────────────────

const STATIONS = [
  { icon: '👨‍💻', label: 'Dev', color: '#94A3B8' },
  { icon: '📝', label: 'Git Push', color: '#06B6D4' },
  { icon: '🔧', label: 'CI Build', color: '#8B5CF6' },
  { icon: '🔬', label: 'Tests', color: '#F59E0B' },
  { icon: '🏷️', label: 'Tag', color: '#F97316' },
  { icon: '📦', label: 'Registry', color: '#EC4899' },
  { icon: '🚀', label: 'Deploy', color: '#10B981' },
  { icon: '🌍', label: 'Production', color: '#10B981' },
];

const AnimPipeline = ({ onDone }: { onDone: () => void }) => {
  const [trainPos, setTrainPos] = useState(0);
  const [phase, setPhase] = useState(0);
  const [rollback, setRollback] = useState(false);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    let delay = 400;
    for (let i = 1; i <= 7; i++) {
      const d = delay;
      t.push(setTimeout(() => setTrainPos(i), d));
      delay += i === 2 ? 600 : i === 5 ? 500 : 350;
    }
    t.push(setTimeout(() => setPhase(1), delay));

    // Rollback
    t.push(setTimeout(() => { setRollback(true); setPhase(2); }, delay + 600));
    t.push(setTimeout(() => setTrainPos(5), delay + 900));
    t.push(setTimeout(() => { setTrainPos(7); setPhase(3); }, delay + 1500));
    t.push(setTimeout(() => setPhase(4), delay + 2200));
    t.push(setTimeout(onDone, delay + 2800));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex flex-col p-3 gap-3 overflow-y-auto">
      {/* Pipeline track */}
      <div className="relative flex items-center gap-0 w-full overflow-x-auto py-2">
        <div className="absolute top-1/2 left-0 right-0 h-0.5 bg-foreground/10 -translate-y-1/2" />
        {STATIONS.map((st, i) => (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.08 }}
            className="relative flex flex-col items-center flex-1 min-w-[48px] z-10">
            <motion.div className="w-8 h-8 rounded-full border-2 flex items-center justify-center text-sm mb-0.5"
              animate={{ borderColor: trainPos >= i ? st.color : '#1F2D45', boxShadow: trainPos === i ? `0 0 10px ${st.color}50` : 'none' }}
              style={{ background: trainPos >= i ? `${st.color}15` : '#111827' }}>
              {st.icon}
            </motion.div>
            <span className="text-[7px] font-mono" style={{ color: trainPos >= i ? st.color : '#475569' }}>{st.label}</span>
            {trainPos === i && (
              <motion.div layoutId="train" className="absolute -top-3 px-1.5 py-0.5 rounded text-[6px] font-mono"
                style={{ background: '#10B98120', color: '#10B981', border: '1px solid #10B98140' }}>
                {rollback && phase >= 2 ? 'app:prev' : 'app:a1b2c3d'}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Status messages */}
      <AnimatePresence mode="wait">
        {phase === 1 && (
          <motion.div key="live" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-lg border px-3 py-2 text-center" style={{ borderColor: '#10B98140', background: '#10B98108' }}>
            <span className="text-[10px] font-mono text-emerald-400">🟢 LIVE — Deploy complete, zero downtime</span>
          </motion.div>
        )}
        {phase === 2 && (
          <motion.div key="rollback" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-lg border px-3 py-2 text-center" style={{ borderColor: '#EF444440', background: '#EF444408' }}>
            <span className="text-[10px] font-mono text-red-400">🔴 Health check failed — rolling back...</span>
          </motion.div>
        )}
        {phase >= 3 && (
          <motion.div key="recovered" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="rounded-lg border px-3 py-2 text-center" style={{ borderColor: '#10B98140', background: '#10B98108' }}>
            <span className="text-[10px] font-mono text-emerald-400">🟢 LIVE (rollback) — Previous version restored in 12s</span>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Metrics */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex gap-3 justify-center">
          <span className="text-[8px] font-mono text-emerald-400/60">Deploy frequency: 12/day</span>
          <span className="text-[8px] font-mono text-emerald-400/60">MTTR: 45s</span>
        </motion.div>
      )}

      {phase >= 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="px-3 py-1 rounded-lg text-center" style={{ background: '#10B98110', border: '1px solid #10B98130' }}>
          <span className="text-[9px] font-mono text-emerald-400">CI/CD + Docker = deploy with confidence, roll back instantly.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 3: Request Journey ────────────────────────────────────────────

const REQ_STEPS = [
  { node: 'Browser', action: 'GET /api/users/42', color: '#94A3B8' },
  { node: 'nginx', action: 'SSL terminate, route /api/*', color: '#06B6D4' },
  { node: 'api-2', action: 'Auth ✓, route handler', color: '#10B981' },
  { node: 'redis', action: 'GET user:42 → MISS', color: '#EF4444' },
  { node: 'postgres', action: 'SELECT → 1 row (12ms)', color: '#06B6D4' },
  { node: 'redis', action: 'SET user:42 EX 300 → cached', color: '#EF4444' },
  { node: 'api-2', action: 'JSON response assembled', color: '#10B981' },
  { node: 'Browser', action: '200 OK — 20ms total', color: '#8B5CF6' },
];

const AnimRequest = ({ onDone }: { onDone: () => void }) => {
  const [step, setStep] = useState(-1);
  const [cached, setCached] = useState(false);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    let d = 300;
    for (let i = 0; i < REQ_STEPS.length; i++) { const dd = d; t.push(setTimeout(() => setStep(i), dd)); d += 350; }
    t.push(setTimeout(() => { setCached(true); setStep(10); }, d + 200));
    t.push(setTimeout(onDone, d + 1200));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex flex-col p-3 gap-1.5 overflow-y-auto">
      <div className="text-[9px] font-mono text-purple-400/60 text-center">Tracing: GET /api/users/42</div>

      {REQ_STEPS.map((s, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: step >= i ? 1 : 0.15, x: step >= i ? 0 : -10 }}
          transition={{ duration: 0.2 }}
          className="flex items-center gap-2 rounded border px-2 py-1"
          style={{ borderColor: step === i ? `${s.color}60` : '#1F2D4520', background: step === i ? `${s.color}08` : 'transparent', boxShadow: step === i ? `0 0 8px ${s.color}20` : 'none' }}>
          <motion.div className="w-1.5 h-1.5 rounded-full shrink-0"
            animate={{ backgroundColor: step >= i ? s.color : '#1F2D45' }} />
          <span className="text-[9px] font-mono font-bold min-w-[50px]" style={{ color: step >= i ? s.color : '#475569' }}>{s.node}</span>
          <span className="text-[8px] font-mono text-foreground/40">{s.action}</span>
        </motion.div>
      ))}

      {/* Timing breakdown */}
      {step >= 7 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded border p-2 mt-1" style={{ borderColor: '#8B5CF630', background: '#0D1117' }}>
          <div className="text-[7px] font-mono text-purple-400/40 mb-1">Response time breakdown:</div>
          <div className="flex flex-col gap-0.5">
            {[{ l: 'DNS', w: 2 }, { l: 'nginx', w: 1 }, { l: 'Auth', w: 3 }, { l: 'Cache', w: 1 }, { l: 'DB query', w: 12 }, { l: 'Serialize', w: 1 }].map(x => (
              <div key={x.l} className="flex items-center gap-2">
                <span className="text-[7px] font-mono text-foreground/30 w-12 text-right">{x.l}</span>
                <motion.div className="h-1 rounded-full bg-purple-500/50" initial={{ width: 0 }} animate={{ width: `${Math.max(x.w * 4, 4)}px` }} />
                <span className="text-[7px] font-mono text-foreground/20">{x.w}ms</span>
              </div>
            ))}
          </div>
        </motion.div>
      )}

      {cached && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border px-3 py-1.5 text-center" style={{ borderColor: '#10B98130', background: '#10B98108' }}>
          <span className="text-[9px] font-mono text-emerald-400">2nd request: Cache HIT → 4ms total 🚀 (4× faster)</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 4: Failure & Recovery ─────────────────────────────────────────

interface Scenario { title: string; fail: string; recover: string; badge: string; badgeColor: string; time: string }
const SCENARIOS: Scenario[] = [
  { title: 'Container Crash', fail: '💥 api-1 exit code 1', recover: 'restart: on-failure → recovered', badge: 'L12', badgeColor: '#EF4444', time: '3s' },
  { title: 'Data Persistence', fail: '💥 postgres container removed', recover: 'Volume intact → new container attached', badge: 'L9', badgeColor: '#14B8A6', time: '5s' },
  { title: 'Bad Deployment', fail: '💥 New version health check failed', recover: 'Rolling update auto-rollback', badge: 'L12', badgeColor: '#EF4444', time: '30s' },
  { title: 'Traffic Spike', fail: '📈 10× normal load — CPU 95%', recover: 'Scale 2→6 replicas → load distributed', badge: 'L14', badgeColor: '#F59E0B', time: '15s' },
];

const AnimFailure = ({ onDone }: { onDone: () => void }) => {
  const [scenIdx, setScenIdx] = useState(-1);
  const [recovering, setRecovering] = useState(false);
  const [recovered, setRecovered] = useState<Set<number>>(new Set());
  const [showSummary, setShowSummary] = useState(false);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    let d = 200;
    for (let i = 0; i < 4; i++) {
      const dd = d;
      t.push(setTimeout(() => { setScenIdx(i); setRecovering(false); }, dd));
      t.push(setTimeout(() => setRecovering(true), dd + 600));
      t.push(setTimeout(() => setRecovered(p => new Set(p).add(i)), dd + 1100));
      d += 1500;
    }
    t.push(setTimeout(() => setShowSummary(true), d));
    t.push(setTimeout(onDone, d + 700));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2 overflow-y-auto">
      <div className="text-[9px] font-mono text-red-400/50 text-center">Things WILL go wrong. Here's how Docker handles it.</div>

      {SCENARIOS.map((sc, i) => {
        const isActive = scenIdx === i;
        const isDone = recovered.has(i);
        return (
          <motion.div key={i} initial={{ opacity: 0, y: 8 }} animate={{ opacity: scenIdx >= i ? 1 : 0.2, y: scenIdx >= i ? 0 : 8 }}
            className="rounded-lg border p-2" style={{ borderColor: isDone ? '#10B98140' : isActive ? '#EF444450' : '#1F2D45', background: isDone ? '#10B98106' : isActive ? '#EF444406' : '#111827' }}>
            <div className="flex items-center justify-between mb-0.5">
              <div className="flex items-center gap-1.5">
                <span className="text-[8px] font-mono text-foreground/30">Scenario {i + 1}/4</span>
                <span className="text-[9px] font-mono font-bold" style={{ color: isDone ? '#10B981' : '#EF4444' }}>{sc.title}</span>
              </div>
              <LevelBadge level={sc.badge} color={sc.badgeColor} />
            </div>
            <AnimatePresence mode="wait">
              {isActive && !recovering && !isDone && (
                <motion.div key="fail" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[8px] font-mono text-red-400">{sc.fail}</motion.div>
              )}
              {(isActive && recovering && !isDone) && (
                <motion.div key="recovering" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
                  className="text-[8px] font-mono text-amber-400">↻ Recovering...</motion.div>
              )}
              {isDone && (
                <motion.div key="done" initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                  className="flex items-center gap-2">
                  <span className="text-[8px] font-mono text-emerald-400">✓ {sc.recover}</span>
                  <span className="text-[7px] font-mono text-foreground/20">({sc.time})</span>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        );
      })}

      {showSummary && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="px-3 py-1 rounded-lg text-center" style={{ background: '#10B98110', border: '1px solid #10B98130' }}>
          <span className="text-[9px] font-mono text-emerald-400">Docker: resilience, automation, and recovery built in.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 5: Everything Together / Constellation ────────────────────────

const LEVEL_NODES = [
  { id: 1, label: 'What is Docker', color: '#06B6D4' },
  { id: 2, label: 'VMs vs Containers', color: '#10B981' },
  { id: 3, label: 'Installing Docker', color: '#8B5CF6' },
  { id: 4, label: 'Docker Images', color: '#F59E0B' },
  { id: 5, label: 'Containers', color: '#F97316' },
  { id: 6, label: 'Commands', color: '#EC4899' },
  { id: 7, label: 'Dockerfile', color: '#14B8A6' },
  { id: 8, label: 'Docker Build', color: '#06B6D4' },
  { id: 9, label: 'Volumes', color: '#10B981' },
  { id: 10, label: 'Networking', color: '#8B5CF6' },
  { id: 11, label: 'Compose', color: '#F59E0B' },
  { id: 12, label: 'Lifecycle', color: '#EF4444' },
  { id: 13, label: 'Registry', color: '#EC4899' },
  { id: 14, label: 'Scaling', color: '#F97316' },
  { id: 15, label: 'Real World', color: '#FFD700' },
];

const CONSTELLATION_LINKS = [
  [1, 2], [2, 3], [4, 5], [7, 8], [8, 4], [4, 13], [5, 9], [5, 10], [10, 11], [11, 14], [12, 14],
  [13, 15], [14, 15], [11, 15],
];

const AnimTogether = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);
  const [visibleNodes, setVisibleNodes] = useState(0);
  const [showLinks, setShowLinks] = useState(false);
  const [showText, setShowText] = useState(0);
  const [typedCmd, setTypedCmd] = useState('');

  const fullCmd = '$ docker run -d --name future jiten/docker-engineer:v1.0.0 ✓';

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    // Phase 0 → constellation appears
    let d = 300;
    for (let i = 1; i <= 15; i++) { const dd = d; t.push(setTimeout(() => setVisibleNodes(i), dd)); d += 150; }

    // Phase 1 → links
    t.push(setTimeout(() => { setShowLinks(true); setPhase(1); }, d + 200));

    // Phase 2 → all glow gold
    t.push(setTimeout(() => setPhase(2), d + 800));

    // Phase 3 → text overlay
    t.push(setTimeout(() => { setPhase(3); setShowText(1); }, d + 1500));
    t.push(setTimeout(() => setShowText(2), d + 1900));
    t.push(setTimeout(() => setShowText(3), d + 2300));
    t.push(setTimeout(() => setShowText(4), d + 2700));

    // Phase 4 → typed command
    const cmdStart = d + 3200;
    for (let i = 0; i <= fullCmd.length; i++) {
      const dd = cmdStart + i * 30;
      t.push(setTimeout(() => setTypedCmd(fullCmd.slice(0, i)), dd));
    }

    t.push(setTimeout(() => setPhase(4), cmdStart + fullCmd.length * 30 + 300));
    t.push(setTimeout(onDone, cmdStart + fullCmd.length * 30 + 1000));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  const nodePositions = useMemo(() => {
    const cx = 160, cy = 110, r = 85;
    return LEVEL_NODES.map((n, i) => {
      if (n.id === 15) return { x: cx, y: cy };
      const angle = ((i) / 14) * Math.PI * 2 - Math.PI / 2;
      return { x: cx + r * Math.cos(angle), y: cy + r * Math.sin(angle) };
    });
  }, []);

  return (
    <div className="w-full h-full relative flex items-center justify-center overflow-hidden">
      {/* Constellation SVG */}
      <svg viewBox="0 0 320 220" className="w-full max-w-md h-auto" style={{ maxHeight: '100%' }}>
        {/* Links */}
        {showLinks && CONSTELLATION_LINKS.map(([a, b], i) => {
          const pa = nodePositions[a - 1], pb = nodePositions[b - 1];
          return (
            <motion.line key={i} x1={pa.x} y1={pa.y} x2={pb.x} y2={pb.y}
              stroke={phase >= 2 ? '#FFD700' : '#06B6D4'} strokeWidth={0.5} strokeOpacity={0.3}
              initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 1 }}
              transition={{ delay: i * 0.06, duration: 0.3 }} />
          );
        })}

        {/* Nodes */}
        {LEVEL_NODES.map((n, i) => {
          const pos = nodePositions[i];
          const isL15 = n.id === 15;
          const visible = visibleNodes >= n.id;
          const fillColor = phase >= 2 ? '#FFD700' : n.color;
          return visible ? (
            <g key={n.id}>
              <motion.circle cx={pos.x} cy={pos.y} r={isL15 ? 12 : 8}
                fill={`${fillColor}15`} stroke={fillColor} strokeWidth={isL15 ? 1.5 : 0.8}
                initial={{ scale: 0, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                transition={{ type: 'spring', stiffness: 300, damping: 20 }} />
              {phase >= 2 && (
                <motion.circle cx={pos.x} cy={pos.y} r={isL15 ? 16 : 11}
                  fill="none" stroke="#FFD700" strokeWidth={0.3} strokeOpacity={0.2}
                  initial={{ scale: 0 }} animate={{ scale: [1, 1.4, 1] }}
                  transition={{ duration: 1.5, repeat: Infinity, ease: 'easeInOut' }} />
              )}
              <text x={pos.x} y={pos.y + (isL15 ? 0.5 : 0.5)} textAnchor="middle" dominantBaseline="middle"
                fill={fillColor} fontSize={isL15 ? 6 : 5} fontFamily="monospace" fontWeight="bold">
                L{n.id}
              </text>
            </g>
          ) : null;
        })}
      </svg>

      {/* Text overlay */}
      {phase >= 3 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="absolute inset-0 flex flex-col items-center justify-center z-20"
          style={{ background: 'radial-gradient(ellipse, #070B14E0 40%, #070B14A0 100%)' }}>
          {showText >= 1 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="text-sm font-syne font-bold text-foreground text-center">
              You've learned Docker from scratch
            </motion.div>
          )}
          {showText >= 2 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="text-[9px] font-mono text-foreground/40 text-center mt-1">
              Images. Containers. Volumes. Networking. Compose.
            </motion.div>
          )}
          {showText >= 3 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="text-[9px] font-mono text-foreground/40 text-center mt-0.5">
              Building. Scaling. Deploying. Recovering.
            </motion.div>
          )}
          {showText >= 4 && (
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="text-lg font-syne font-bold text-center mt-3"
              style={{ color: '#FFD700', textShadow: '0 0 20px rgba(255,215,0,0.4)' }}>
              You are a Docker Engineer.
            </motion.div>
          )}
          {typedCmd && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="text-[10px] font-mono text-emerald-400/60 mt-4">
              {typedCmd}<span className="inline-block w-1.5 h-3 bg-emerald-400/50 ml-0.5" style={{ animation: 'blink 1s infinite' }} />
            </motion.div>
          )}
        </motion.div>
      )}
    </div>
  );
};

// ─── Graduation Ceremony Overlay ─────────────────────────────────────────────

const PARTICLE_COLORS = ['#06B6D4', '#10B981', '#F59E0B', '#8B5CF6', '#F97316', '#FFD700'];
const BADGES = ['🐳 First Container', '🔨 Docker Builder', '💾 Volume Master', '🌐 Networking Pro', '🏆 Docker Master'];

const GraduationCeremony = ({ onClose }: { onClose: () => void }) => {
  const { resetProgress } = useGameStore();
  const navigate = useNavigate();
  const [gPhase, setGPhase] = useState(0);
  const [xpCount, setXpCount] = useState(0);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    t.push(setTimeout(() => setGPhase(1), 800));
    t.push(setTimeout(() => setGPhase(2), 1800));
    t.push(setTimeout(() => setGPhase(3), 2800));
    t.push(setTimeout(() => setGPhase(4), 3800));
    t.push(setTimeout(() => setGPhase(5), 5000));
    t.push(setTimeout(() => setGPhase(6), 5800));
    return () => t.forEach(clearTimeout);
  }, []);

  useEffect(() => {
    if (gPhase < 3) return;
    const target = 1500;
    const duration = 1500;
    const steps = 40;
    const interval = duration / steps;
    let i = 0;
    const timer = setInterval(() => {
      i++;
      const progress = i / steps;
      const eased = 1 - Math.pow(1 - progress, 3);
      setXpCount(Math.round(target * eased));
      if (i >= steps) clearInterval(timer);
    }, interval);
    return () => clearInterval(timer);
  }, [gPhase]);

  const particles = useMemo(() =>
    Array.from({ length: 80 }, (_, i) => ({
      x: Math.random() * 100,
      size: 2 + Math.random() * 3,
      color: PARTICLE_COLORS[i % PARTICLE_COLORS.length],
      duration: 3 + Math.random() * 3,
      delay: Math.random() * 4,
      drift: (Math.random() - 0.5) * 60,
    })), []);

  const handleCopy = () => {
    navigator.clipboard.writeText('I just completed Docker Quest and learned Docker from scratch! 🐳 #DockerQuest #Docker #DevOps #LearningInPublic');
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
      className="fixed inset-0 z-50 flex items-center justify-center overflow-y-auto"
      style={{ background: '#070B14' }}>
      {/* Particles */}
      {particles.map((p, i) => (
        <motion.div key={i} className="absolute rounded-full pointer-events-none"
          style={{ left: `${p.x}%`, width: p.size, height: p.size, backgroundColor: p.color }}
          animate={{ y: [window.innerHeight, -40], x: [0, p.drift], opacity: [0.8, 0] }}
          transition={{ duration: p.duration, delay: p.delay, repeat: Infinity, ease: 'linear' }} />
      ))}

      {/* Close button */}
      <button onClick={onClose} className="absolute top-4 right-4 z-50 w-8 h-8 rounded-full border border-foreground/20 flex items-center justify-center text-foreground/40 hover:text-foreground hover:border-foreground/40 transition-colors text-sm">✕</button>

      <div className="relative z-10 flex flex-col items-center gap-4 px-4 py-8 max-w-lg w-full">
        {/* Whale */}
        <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }}
          transition={{ type: 'spring', stiffness: 300, damping: 20 }}
          className="text-5xl">🐳</motion.div>

        {/* Certificate */}
        {gPhase >= 1 && (
          <motion.div initial={{ opacity: 0, y: 60 }} animate={{ opacity: 1, y: 0 }}
            transition={{ type: 'spring', stiffness: 150, damping: 20 }}
            className="w-full rounded-xl border-2 p-6 text-center"
            style={{ borderColor: '#FFD700', background: '#0F172A', boxShadow: '0 0 40px rgba(255,215,0,0.1)' }}>
            <div className="text-[10px] font-mono tracking-[0.3em]" style={{ color: '#FFD700' }}>✦ DOCKER QUEST ✦</div>
            <div className="text-lg font-syne font-bold text-foreground mt-3">Certificate of Completion</div>
            <div className="text-xs text-foreground/40 mt-2">This certifies that</div>
            <div className="text-xl font-syne font-bold mt-1" style={{ color: '#FFD700' }}>Docker Engineer</div>
            <div className="text-xs text-foreground/40 mt-2 leading-relaxed">
              has successfully completed all 15 levels of<br />Docker Quest and demonstrated mastery of:
            </div>
            <div className="text-[10px] font-mono text-foreground/50 mt-2 leading-relaxed">
              Container Architecture · Images · Volumes<br />
              Networking · Compose · Lifecycle · Registry<br />
              Scaling · CI/CD · Real World Deployment
            </div>
            <div className="text-[10px] font-mono mt-3" style={{ color: '#FFD700' }}>🐳 Docker Quest — Level 15 Complete</div>
          </motion.div>
        )}

        {/* Badges */}
        {gPhase >= 2 && (
          <div className="flex flex-wrap gap-2 justify-center">
            {BADGES.map((badge, i) => (
              <motion.div key={badge} initial={{ scale: 0 }} animate={{ scale: [0, 1.2, 1] }}
                transition={{ delay: i * 0.15, type: 'spring', stiffness: 300, damping: 18 }}
                className="px-3 py-1.5 rounded-lg border text-[10px] font-mono"
                style={{ borderColor: '#FFD70060', color: '#FFD700', background: '#FFD70010' }}>
                {badge}
              </motion.div>
            ))}
          </div>
        )}

        {/* XP Counter */}
        {gPhase >= 3 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center">
            <div className="flex items-center justify-center gap-2">
              <span className="text-lg">🪙</span>
              <motion.span className="text-2xl font-syne font-bold" style={{ color: '#FFD700' }}>
                {xpCount} XP
              </motion.span>
            </div>
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.2 }}
              className="text-sm font-syne font-bold mt-1" style={{ color: '#FFD700', textShadow: '0 0 16px rgba(255,215,0,0.3)' }}>
              Docker Master 🏆
            </motion.div>
          </motion.div>
        )}

        {/* Level progress strip */}
        {gPhase >= 4 && (
          <div className="flex gap-1.5 justify-center flex-wrap">
            {Array.from({ length: 15 }, (_, i) => (
              <motion.div key={i} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: i * 0.08, type: 'spring', stiffness: 400, damping: 20 }}
                className="w-6 h-6 rounded-full border flex items-center justify-center text-[8px] font-mono font-bold"
                style={{ borderColor: i === 14 ? '#FFD700' : '#10B981', backgroundColor: i === 14 ? '#FFD70020' : '#10B98115', color: i === 14 ? '#FFD700' : '#10B981' }}>
                {i + 1}
              </motion.div>
            ))}
          </div>
        )}

        {/* CTA buttons */}
        {gPhase >= 5 && (
          <div className="flex flex-wrap gap-2 justify-center">
            <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0 }}
              onClick={() => { resetProgress(); navigate('/'); }}
              className="px-4 py-2 rounded-lg border text-xs font-mono transition-colors hover:bg-accent/5"
              style={{ borderColor: '#06B6D450', color: '#06B6D4' }}>
              🔄 Replay Docker Quest
            </motion.button>
            <motion.button initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              onClick={() => window.open('https://docs.docker.com/get-started/', '_blank')}
              className="px-5 py-2 rounded-lg text-xs font-syne font-bold transition-opacity hover:opacity-90"
              style={{ background: '#FFD700', color: '#070B14' }}>
              🚀 Start Building with Docker
            </motion.button>
          </div>
        )}

        {/* Share */}
        {gPhase >= 6 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-2">
            <div className="text-[10px] text-foreground/30 mb-1">Share your achievement:</div>
            <div className="flex items-center gap-2 rounded-lg border px-3 py-2" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
              <span className="text-[9px] font-mono text-foreground/50 flex-1 text-left">
                I completed Docker Quest and learned Docker from scratch! 🐳 #DockerQuest
              </span>
              <button onClick={handleCopy}
                className="shrink-0 px-2 py-1 rounded border text-[9px] font-mono transition-colors"
                style={{ borderColor: copied ? '#10B98150' : '#1F2D45', color: copied ? '#10B981' : '#94A3B8' }}>
                {copied ? '✓ Copied' : 'Copy'}
              </button>
            </div>
          </motion.div>
        )}
      </div>
    </motion.div>
  );
};

// ─── Main Level 15 Page ──────────────────────────────────────────────────────

const Level15Interactive = () => {
  const navigate = useNavigate();
  const { completeLevel, completedLevels } = useGameStore();
  const [completed, setCompleted] = useState<Set<TopicId>>(new Set());
  const [active, setActive] = useState<TopicId | null>(null);
  const [animating, setAnimating] = useState(false);
  const [infoLines, setInfoLines] = useState<{ text: string; type: 'cmd' | 'output' }[]>([]);
  const [localXP, setLocalXP] = useState(0);
  const [showGraduation, setShowGraduation] = useState(false);
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
    if (next.size === 5) {
      if (!completedLevels.includes(15)) completeLevel(15);
      setTimeout(() => setShowGraduation(true), 400);
    }
  }, [active, completed, completedLevels, completeLevel]);

  const animKey = active ? `${active}-${Date.now()}` : '';

  return (
    <div className="h-screen flex flex-col overflow-hidden" style={{ background: 'radial-gradient(ellipse at center, #0D1929 0%, #070B14 70%)' }}>
      {/* Navbar */}
      <nav className="shrink-0 border-b border-border px-4 py-2.5 flex items-center justify-between" style={{ background: '#0F172A' }}>
        <div className="flex items-center gap-3">
          <button onClick={() => navigate('/')} className="text-muted-foreground hover:text-foreground text-sm mr-2">←</button>
          <span className="text-xl">🐳</span>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="font-syne font-bold text-accent text-sm tracking-wide">DOCKER QUEST</h1>
              <span className="px-2 py-0.5 rounded-full text-[8px] font-mono font-bold"
                style={{ border: '1px solid #FFD70060', color: '#FFD700', background: '#FFD70010' }}>FINAL LEVEL</span>
            </div>
            <p className="text-[10px] text-muted-foreground font-mono">Level 15 — Real World Deployment 🏆</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-syne font-bold text-amber-400 text-sm">⚡ {localXP}</span>
          <div className="hidden sm:flex items-center gap-1.5">
            {TOPICS.map(t => (
              <div key={t.id} className="w-2.5 h-2.5 rounded-full border transition-colors duration-300"
                style={{ borderColor: completed.has(t.id) ? '#FFD700' : '#1F2D45', backgroundColor: completed.has(t.id) ? '#FFD700' : 'transparent' }} />
            ))}
          </div>
          <span className="text-xs font-mono text-muted-foreground">{completed.size}/5</span>
        </div>
      </nav>

      {/* Finale banner */}
      <div className="shrink-0 px-4 py-2 text-center border-b" style={{ borderColor: '#FFD70020', background: 'linear-gradient(90deg, #FFD70008, #FFD70015, #FFD70008)' }}>
        <span className="text-[11px] font-mono" style={{ color: '#FFD700CC' }}>
          🎓 You've reached the final level. Everything you've learned comes together here.
        </span>
      </div>

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
                  className={`flex items-center gap-2 px-3 py-1.5 rounded-full border text-xs font-mono whitespace-nowrap transition-all duration-200 ${isActive ? `${topic.bgTint} ${topic.borderClass} ${topic.colorClass}` : isDone ? 'border-yellow-400/40 text-yellow-300' : 'bg-secondary/30 border-border text-muted-foreground hover:border-muted-foreground/50'} ${isDisabled ? 'opacity-40 cursor-not-allowed' : 'cursor-pointer'}`}
                  style={isActive ? { boxShadow: topic.glowStyle } : isDone ? { background: '#FFD70008', boxShadow: '0 0 8px rgba(255,215,0,0.1)' } : {}}>
                  <span className="text-xs">{isDone ? '✓' : topic.icon}</span>{topic.label}
                </button>
              );
            })}
          </div>

          {/* Animation canvas */}
          <div className="flex-1 relative overflow-hidden min-h-[200px]"
            style={{ background: 'radial-gradient(ellipse at center, #06B6D408 0%, transparent 70%)' }}>
            <div className="absolute inset-0 dot-grid-24" />
            <AnimatePresence mode="wait">
              {!active && !animating && (
                <motion.div key="idle" className="absolute inset-0 flex flex-col items-center justify-center z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <motion.span className="text-6xl" animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }}>🏆</motion.span>
                  <p className="text-sm text-muted-foreground mt-4 font-mono">Click a topic to begin the grand finale</p>
                </motion.div>
              )}
              {active && (
                <motion.div key={animKey} className="absolute inset-0 z-10" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  <div className="absolute top-3 left-3 flex items-center gap-2 z-20">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TOPICS.find(t => t.id === active)!.color }} />
                    <span className="text-xs font-mono" style={{ color: TOPICS.find(t => t.id === active)!.color }}>{TOPICS.find(t => t.id === active)!.label}</span>
                  </div>
                  <div className="absolute inset-0 pt-8">
                    {active === 'architecture' && <AnimArchitecture onDone={handleAnimDone} />}
                    {active === 'pipeline' && <AnimPipeline onDone={handleAnimDone} />}
                    {active === 'request' && <AnimRequest onDone={handleAnimDone} />}
                    {active === 'failure' && <AnimFailure onDone={handleAnimDone} />}
                    {active === 'together' && <AnimTogether onDone={handleAnimDone} />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Terminal log */}
          <div className="shrink-0 border-t border-border" style={{ height: 200 }}>
            <TermHeader title="docker-quest deployment log" />
            <div ref={logRef} className="terminal-black p-3 overflow-y-auto font-mono text-[13px] leading-5" style={{ height: 'calc(200px - 28px)' }}>
              {infoLines.length === 0 ? (
                <span className="text-muted-foreground/50">{'> Click a topic to explore Real World Deployment...'}<span className="inline-block w-2 h-4 bg-muted-foreground/50 ml-1" style={{ animation: 'blink 1s infinite' }} /></span>
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
              <div className="flex items-center gap-2"><span>📖</span><h2 className="font-syne font-bold text-foreground text-sm">Deployment Reference</h2></div>
              <span className="text-[10px] text-muted-foreground font-mono">Level 15 — Real World Deployment 🏆</span>
            </div>

            <div className="rounded-lg border-2 p-4 mb-4" style={{ borderColor: '#FFD70040', background: '#0F172A', boxShadow: '0 0 20px rgba(255,215,0,0.05)' }}>
              <h3 className="font-syne font-bold text-foreground text-sm mb-2">🏆 Real World Docker Deployment</h3>
              <p className="text-xs text-foreground/70 leading-relaxed">
                This is where Docker theory becomes Docker mastery. A production deployment
                isn't just running containers — it's an orchestrated system where images are
                built and versioned, containers are deployed with health checks and rolling
                updates, data persists in volumes, services communicate through named networks,
                failures recover automatically, and the entire stack can be reproduced from
                a single docker-compose.yml file.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['Production', 'CI/CD', 'Resilient', 'Observable', 'Reproducible'].map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-mono border"
                    style={{ borderColor: '#FFD70030', color: '#FFD700', background: '#FFD70008' }}>{tag}</span>
                ))}
              </div>
            </div>

            {TOPICS.map(topic => {
              const data = CARD_DATA[topic.id];
              const isDone = completed.has(topic.id);
              const isActive = active === topic.id;
              return (
                <motion.div key={topic.id} onClick={() => runTopic(topic.id)}
                  className={`rounded-lg border p-3 mb-3 cursor-pointer transition-all duration-300 ${isActive ? `${topic.borderClass} ${topic.bgTint}` : isDone ? 'border-yellow-500/30 bg-card' : 'border-border bg-card hover:border-muted-foreground/30'}`}
                  style={isActive ? { boxShadow: topic.glowStyle, transform: 'scale(1.01)' } : isDone ? { boxShadow: '0 0 8px rgba(255,215,0,0.08)' } : {}} layout>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: topic.color }} />
                      <span className={`font-mono font-bold text-xs ${isActive ? topic.colorClass : isDone ? 'text-yellow-300' : 'text-foreground'}`}>{data.heading}</span>
                    </div>
                    {isDone && <span className="text-[10px] font-mono px-2 py-0.5 rounded" style={{ color: '#FFD700', background: '#FFD70010' }}>✓ Completed</span>}
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

      {/* Graduation Ceremony Overlay */}
      <AnimatePresence>
        {showGraduation && <GraduationCeremony onClose={() => setShowGraduation(false)} />}
      </AnimatePresence>
    </div>
  );
};

export default Level15Interactive;
