import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';

type TopicId = 'why-compose' | 'compose-file' | 'compose-cmds' | 'dependencies' | 'full-stack';

interface TopicMeta {
  id: TopicId; label: string; icon: string; color: string;
  colorClass: string; borderClass: string; bgTint: string; glowStyle: string;
}

const TOPICS: TopicMeta[] = [
  { id: 'why-compose', label: 'Why Compose', icon: '😤', color: '#EF4444', colorClass: 'text-red-400', borderClass: 'border-red-500', bgTint: 'bg-red-500/10', glowStyle: '0 0 12px rgba(239,68,68,0.4)' },
  { id: 'compose-file', label: 'Compose File', icon: '📋', color: '#06B6D4', colorClass: 'text-cyan-400', borderClass: 'border-cyan-500', bgTint: 'bg-cyan-500/10', glowStyle: '0 0 12px rgba(6,182,212,0.4)' },
  { id: 'compose-cmds', label: 'Compose Commands', icon: '⚡', color: '#10B981', colorClass: 'text-emerald-400', borderClass: 'border-emerald-500', bgTint: 'bg-emerald-500/10', glowStyle: '0 0 12px rgba(16,185,129,0.4)' },
  { id: 'dependencies', label: 'Dependencies', icon: '🔗', color: '#F97316', colorClass: 'text-orange-400', borderClass: 'border-orange-500', bgTint: 'bg-orange-500/10', glowStyle: '0 0 12px rgba(249,115,22,0.4)' },
  { id: 'full-stack', label: 'Full Stack', icon: '🏗️', color: '#8B5CF6', colorClass: 'text-purple-400', borderClass: 'border-purple-500', bgTint: 'bg-purple-500/10', glowStyle: '0 0 12px rgba(139,92,246,0.4)' },
];

const INFO_LOGS: Record<TopicId, { prefix: string; lines: string[] }> = {
  'why-compose': {
    prefix: '> Loading: The Problem Compose Solves',
    lines: [
      '# WITHOUT Compose: 8+ manual docker run commands per stack',
      '# Every team member must run them in the right order',
      '# Easy to forget flags, volumes, env vars, network names',
      '# Hard to share, hard to reproduce, easy to make mistakes',
      '# WITH Compose: 1 docker-compose.yml file + 1 command',
      '$ docker compose up -d   # starts everything ✓',
      '$ docker compose down    # stops everything ✓',
      '# File is version-controlled with your code → reproducible everywhere',
      '> Problem vs solution loaded ✓',
    ],
  },
  'compose-file': {
    prefix: '> Loading: docker-compose.yml Structure',
    lines: [
      '# Top-level sections:',
      '# version:  — Compose file format (3.9 recommended, optional in V2)',
      '# services: — define each container (the main section)',
      '# volumes:  — declare named volumes used by services',
      '# networks: — declare custom networks used by services',
      '# configs:  — external config files (advanced)',
      '# secrets:  — sensitive data (advanced, Swarm feature)',
      '# Each service key becomes the container name AND DNS hostname',
      '# Environment variables: use ${VAR} syntax to read from .env file',
      '> Compose file anatomy loaded ✓',
    ],
  },
  'compose-cmds': {
    prefix: '> Loading: Docker Compose Commands',
    lines: [
      '$ docker compose up          # start in foreground (logs stream)',
      '$ docker compose up -d       # start detached (background)',
      '$ docker compose up --build  # rebuild images then start',
      '$ docker compose down        # stop + remove containers + networks',
      '$ docker compose down -v     # also remove volumes',
      '$ docker compose ps          # list service status',
      '$ docker compose logs        # view all service logs',
      '$ docker compose logs -f api # follow specific service logs',
      '$ docker compose restart api # restart one service',
      '$ docker compose exec api sh # shell into a running service',
      '$ docker compose pull        # pull latest images',
      '$ docker compose build       # rebuild all images',
      '> Compose commands loaded ✓',
    ],
  },
  dependencies: {
    prefix: '> Loading: Service Dependencies',
    lines: [
      '# depends_on controls STARTUP ORDER, not readiness',
      '# condition: service_started → dependency container is running',
      '# condition: service_healthy → dependency passed health check',
      '# condition: service_completed_successfully → for init containers',
      '# Always use service_healthy for databases and caches',
      '# Define healthcheck: in the dependency service',
      '$ docker compose up',
      '# Postgres starts → health check runs → api starts → web starts',
      '# Without health check: api may start before postgres is ready → errors!',
      '> Dependency management loaded ✓',
    ],
  },
  'full-stack': {
    prefix: '> Loading: Full-Stack Compose Stack',
    lines: [
      '# 6-service production stack:',
      '# nginx    → reverse proxy (ports 80, 443)',
      '# web      → Next.js frontend (port 3000)',
      '# api      → Node.js REST API (port 3001)',
      '# worker   → background job processor',
      '# postgres → primary database (volume: pgdata)',
      '# redis    → cache and session store',
      '$ docker compose up -d',
      '[+] Running 8/8',
      ' ✔ Network app_frontend  Created',
      ' ✔ Network app_backend   Created',
      ' ✔ Volume app_pgdata     Created',
      ' ✔ Container postgres    Started',
      ' ✔ Container redis       Started',
      ' ✔ Container api         Started',
      ' ✔ Container worker      Started',
      ' ✔ Container web         Started',
      ' ✔ Container nginx       Started',
      '> Full stack running ✓',
    ],
  },
};

interface CardSection { title: string; text: string }
const CARD_DATA: Record<TopicId, { heading: string; sections: CardSection[] }> = {
  'why-compose': {
    heading: 'The Problem Docker Compose Solves',
    sections: [
      { title: 'The pain without Compose', text: "A typical web application needs at least 3–5 services: a web server, an API, a database, a cache, and maybe a background worker. Running all of these manually with docker run requires 8+ commands, each with their own flags, environment variables, volume mounts, and network settings. Every developer must run these in the right order. Every time. On every machine." },
      { title: 'What Compose provides', text: "A single docker-compose.yml file declares your entire stack. Every developer on your team runs docker compose up and gets an identical environment. The file is checked into version control alongside your code. New team members are onboarded in minutes, not hours." },
      { title: 'Compose V1 vs V2', text: "Docker Compose V1 was a separate Python tool: docker-compose (with hyphen).\nDocker Compose V2 is built into Docker itself: docker compose (with space).\nV2 is faster, has better performance, and is the current standard.\nAlways use V2: docker compose (no hyphen). V1 is deprecated." },
      { title: 'What Compose is NOT', text: "Compose is not a production orchestrator at scale. For large-scale production, use Kubernetes or Docker Swarm. Compose is perfect for: local development, staging environments, simple single-server production, and CI/CD test environments." },
    ],
  },
  'compose-file': {
    heading: 'The docker-compose.yml File',
    sections: [
      { title: 'The services section', text: "The heart of the Compose file. Each key is a service name that becomes the container name AND the DNS hostname. Services can specify:\nimage: pull from a registry\nbuild: build from a local Dockerfile\nports: publish host:container port mappings\nvolumes: mount named volumes or bind mounts\nenvironment: set environment variables\ndepends_on: define startup dependencies\nrestart: restart policy\nnetworks: which networks to connect to" },
      { title: 'Environment variables', text: "Use a .env file alongside docker-compose.yml:\nDB_PASSWORD=mysecret\nAPI_KEY=abc123\nReference in Compose: ${DB_PASSWORD}\nCompose automatically loads .env from the same directory.\nNever commit .env to version control. Commit .env.example instead." },
      { title: 'The volumes and networks sections', text: "Top-level volumes declare named volumes:\nvolumes:\n  pgdata:       (Docker-managed)\n  uploads:      (another named volume)\n\nTop-level networks declare custom networks:\nnetworks:\n  frontend:     (containers can reach each other)\n  backend:      (isolated from frontend)\n\nIf you don't declare a custom network, Compose creates a default network named <project>_default." },
      { title: 'Service naming', text: "Compose prefixes container names with the project name (default: the directory name). So service 'api' in directory 'myapp' becomes container 'myapp-api-1'.\nOverride: docker compose -p myproject up\nor: COMPOSE_PROJECT_NAME=myproject" },
    ],
  },
  'compose-cmds': {
    heading: 'Essential Docker Compose Commands',
    sections: [
      { title: 'Starting and stopping', text: "docker compose up             — start all, stream logs\ndocker compose up -d          — start detached\ndocker compose up --build     — rebuild then start\ndocker compose up api         — start only 'api' + deps\ndocker compose down           — stop + remove all\ndocker compose down -v        — also remove volumes ⚠️\ndocker compose restart api    — restart one service" },
      { title: 'Monitoring', text: "docker compose ps          — status of all services\ndocker compose logs         — all service logs\ndocker compose logs -f api  — follow specific service\ndocker compose top          — running processes\ndocker compose stats        — live CPU/memory per service" },
      { title: 'Development workflow', text: "docker compose exec api sh         — shell into service\ndocker compose exec db psql -U postgres\ndocker compose run api npm test    — one-off command\ndocker compose pull                — pull latest images\ndocker compose build               — rebuild images\ndocker compose config              — validate config" },
    ],
  },
  dependencies: {
    heading: 'Service Dependencies and Startup Order',
    sections: [
      { title: 'depends_on basics', text: "Controls which services must start before others. Without it, Compose starts all services simultaneously — causing errors when an API tries to connect to a database that isn't ready yet.\n\nSimple form:\ndepends_on:\n  - postgres\n  - redis\n\nThis only guarantees the container is running — not that the database is ready." },
      { title: 'Health check conditions', text: "Extended depends_on:\ndepends_on:\n  postgres:\n    condition: service_healthy\n  redis:\n    condition: service_started\n\nservice_healthy — waits for health check to pass (best for DBs)\nservice_started — waits for container to start (ok for redis)\nservice_completed_successfully — for init/migration containers" },
      { title: 'Defining health checks', text: "healthcheck:\n  test: ['CMD-SHELL', 'pg_isready -U postgres']\n  interval: 5s\n  timeout: 3s\n  retries: 5\n  start_period: 10s\n\ntest: command that exits 0 = healthy\ninterval: time between checks\ntimeout: max time for the check\nretries: unhealthy after consecutive failures\nstart_period: grace period before first check" },
      { title: 'Common health checks', text: "Postgres:  pg_isready -U ${POSTGRES_USER}\nMySQL:     mysqladmin ping -h localhost\nRedis:     redis-cli ping\nHTTP API:  curl -f http://localhost:3000/health\nGeneric:   test -f /tmp/ready" },
    ],
  },
  'full-stack': {
    heading: 'Production Compose Patterns',
    sections: [
      { title: 'Multiple Compose files', text: "Use base + override files for different environments:\ndocker-compose.yml          — base config (shared)\ndocker-compose.override.yml — auto-loaded, dev overrides\ndocker-compose.prod.yml     — production overrides\n\nDev: docker compose up  (loads base + override)\nProd: docker compose -f docker-compose.yml \\\n      -f docker-compose.prod.yml up -d" },
      { title: 'The .env pattern', text: ".env file (not committed to git):\nPOSTGRES_PASSWORD=supersecret\nAPI_SECRET_KEY=abc123xyz\n\n.env.example (committed, no real values):\nPOSTGRES_PASSWORD=\nAPI_SECRET_KEY=\n\nEvery developer copies .env.example to .env and fills in values." },
      { title: 'Resource limits', text: "deploy:\n  resources:\n    limits:\n      cpus: '0.5'\n      memory: 512M\n    reservations:\n      memory: 256M\nPrevents one service from starving others." },
      { title: 'Restart policies', text: "restart: no             — never (default)\nrestart: always         — always, even on clean exit\nrestart: unless-stopped — restart unless manually stopped\nrestart: on-failure     — only on non-zero exit code\nUse unless-stopped for production services." },
    ],
  },
};

// ─── Shared helpers ──────────────────────────────────────────────────────────

const TermHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
    <div className="w-2 h-2 rounded-full bg-red-500/70" />
    <div className="w-2 h-2 rounded-full bg-amber-500/70" />
    <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
    <span className="text-[10px] font-mono text-muted-foreground ml-1">{title}</span>
  </div>
);

const ServiceBox = ({ name, icon, status, color }: { name: string; icon: string; status: 'stopped' | 'starting' | 'running'; color: string }) => (
  <motion.div initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }} transition={{ type: 'spring', stiffness: 400, damping: 20 }}
    className="rounded-lg border px-2.5 py-1.5 flex items-center gap-1.5"
    style={{ borderColor: status === 'running' ? `${color}` : status === 'starting' ? '#F59E0B60' : '#1F2D45', background: status === 'running' ? `${color}10` : '#111827' }}>
    <span className="text-xs">{icon}</span>
    <span className="text-[9px] font-mono font-bold" style={{ color: status === 'running' ? color : '#94A3B8' }}>{name}</span>
    <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: status === 'running' ? '#10B981' : status === 'starting' ? '#F59E0B' : '#475569' }} />
  </motion.div>
);

// ─── Animation 1: Why Compose ────────────────────────────────────────────────

const AnimWhyCompose = ({ onDone }: { onDone: () => void }) => {
  const [leftCmds, setLeftCmds] = useState<string[]>([]);
  const [phase, setPhase] = useState(0);
  const leftRef = useRef<HTMLDivElement>(null);

  const MANUAL_CMDS = [
    '$ docker network create app-net',
    '$ docker volume create pgdata',
    '$ docker run -d --name postgres \\',
    '    --network app-net -v pgdata:/var/lib/postgresql/data \\',
    '    -e POSTGRES_PASSWORD=secret postgres:15',
    '$ docker run -d --name redis \\',
    '    --network app-net redis:7-alpine',
    '$ docker run -d --name api \\',
    '    --network app-net -p 3000:3000 \\',
    '    -e DATABASE_URL=postgres://postgres:secret@postgres/myapp \\',
    '    my-api:latest',
    '$ docker run -d --name web \\',
    '    --network app-net -p 80:80 my-web:latest',
  ];

  useEffect(() => { leftRef.current?.scrollTo({ top: leftRef.current.scrollHeight, behavior: 'smooth' }); }, [leftCmds.length]);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    MANUAL_CMDS.forEach((cmd, i) => {
      t.push(setTimeout(() => setLeftCmds(prev => [...prev, cmd]), 200 + i * 180));
    });
    t.push(setTimeout(() => setPhase(1), 200 + MANUAL_CMDS.length * 180 + 200));
    t.push(setTimeout(() => setPhase(2), 200 + MANUAL_CMDS.length * 180 + 800));
    t.push(setTimeout(() => setPhase(3), 200 + MANUAL_CMDS.length * 180 + 1600));
    t.push(setTimeout(onDone, 200 + MANUAL_CMDS.length * 180 + 2400));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex gap-0">
      {/* Left: Without Compose */}
      <div className="flex-1 flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <div className="shrink-0 px-3 py-1.5 border-b text-center" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
          <span className="text-[10px] font-syne font-bold text-red-400">❌ Without Compose</span>
        </div>
        <div ref={leftRef} className="flex-1 p-2 overflow-y-auto font-mono text-[9px] leading-4 terminal-black">
          {leftCmds.map((cmd, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }}>
              {cmd.startsWith('$') ? <><span className="text-red-400">$ </span><span className="text-foreground/80">{cmd.slice(2)}</span></> : <span className="text-foreground/50">{cmd}</span>}
            </motion.div>
          ))}
        </div>
        <div className="shrink-0 px-3 py-1.5 border-t flex items-center justify-between" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
          {phase >= 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-2">
              <motion.span className="text-[10px] font-mono font-bold text-red-400 px-2 py-0.5 rounded" style={{ background: '#EF444415' }}
                animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.3 }}>
                {leftCmds.filter(c => c.startsWith('$')).length} manual commands
              </motion.span>
              <span className="text-sm">😤</span>
            </motion.div>
          )}
          {phase >= 1 && <span className="text-[8px] font-mono text-red-400/60">Every. Single. Time.</span>}
        </div>
      </div>

      {/* Right: With Compose */}
      <div className="flex-1 flex flex-col" style={{ background: '#0F172A' }}>
        <div className="shrink-0 px-3 py-1.5 border-b text-center" style={{ borderColor: '#1F2D45' }}>
          <span className="text-[10px] font-syne font-bold text-emerald-400">✅ With Compose</span>
        </div>
        <div className="flex-1 p-2 overflow-y-auto">
          {phase >= 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="rounded border p-2 mb-2" style={{ borderColor: '#06B6D430', background: '#000' }}>
              <div className="text-[8px] font-mono text-cyan-400/60 mb-1">docker-compose.yml</div>
              <pre className="text-[8px] font-mono leading-3.5 text-foreground/70 whitespace-pre-wrap">{`services:
  postgres:
    image: postgres:15
    volumes:
      - pgdata:/var/lib/postgresql/data
    environment:
      POSTGRES_PASSWORD: secret
  redis:
    image: redis:7-alpine
  api:
    build: ./api
    ports: ["3000:3000"]
    depends_on: [postgres, redis]
  web:
    build: ./web
    ports: ["80:80"]
volumes:
  pgdata:`}</pre>
            </motion.div>
          )}

          {phase >= 2 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="mb-2">
              <div className="text-[9px] font-mono text-emerald-400 mb-1.5">$ docker compose up -d</div>
              <div className="flex flex-wrap gap-1.5">
                {['🗄️ postgres', '📦 redis', '⚙️ api', '🌐 web'].map((s) => (
                  <ServiceBox key={s} name={s.split(' ')[1]} icon={s.split(' ')[0]} status="running" color="#10B981" />
                ))}
              </div>
              <div className="flex items-center gap-2 mt-2">
                <motion.span className="text-[10px] font-mono font-bold text-emerald-400 px-2 py-0.5 rounded" style={{ background: '#10B98115' }}
                  animate={{ scale: [1, 1.15, 1] }} transition={{ duration: 0.3 }}>
                  1 command
                </motion.span>
                <span className="text-sm">😌</span>
              </div>
            </motion.div>
          )}
        </div>

        {phase >= 3 && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="shrink-0 px-3 py-2 border-t" style={{ borderColor: '#1F2D45', background: '#10B98108' }}>
            <div className="text-[8px] font-mono space-y-0.5">
              <div><span className="text-red-400">Manual:</span> <span className="text-foreground/50">8 cmds, error-prone, hard to share</span></div>
              <div><span className="text-emerald-400">Compose:</span> <span className="text-foreground/50">1 cmd, declarative, reproducible</span></div>
            </div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Animation 2: Compose File Anatomy ───────────────────────────────────────

const YAML_LINES = [
  { text: 'version: "3.9"', type: 'version' },
  { text: '', type: 'blank' },
  { text: 'services:', type: 'services' },
  { text: '  postgres:', type: 'services' },
  { text: '    image: postgres:15', type: 'services' },
  { text: '    restart: unless-stopped', type: 'services' },
  { text: '    volumes:', type: 'services' },
  { text: '      - pgdata:/var/lib/postgresql/data', type: 'services' },
  { text: '    environment:', type: 'services' },
  { text: '      POSTGRES_PASSWORD: ${DB_PASSWORD}', type: 'services' },
  { text: '  redis:', type: 'services' },
  { text: '    image: redis:7-alpine', type: 'services' },
  { text: '  api:', type: 'build' },
  { text: '    build:', type: 'build' },
  { text: '      context: ./api', type: 'build' },
  { text: '      dockerfile: Dockerfile', type: 'build' },
  { text: '    ports: ["3000:3000"]', type: 'build' },
  { text: '    depends_on:', type: 'depends' },
  { text: '      postgres:', type: 'depends' },
  { text: '        condition: service_healthy', type: 'depends' },
  { text: '      redis:', type: 'depends' },
  { text: '        condition: service_started', type: 'depends' },
  { text: '  web:', type: 'depends' },
  { text: '    build: ./web', type: 'depends' },
  { text: '    ports: ["80:80"]', type: 'depends' },
  { text: '    depends_on: [api]', type: 'depends' },
  { text: '', type: 'blank' },
  { text: 'volumes:', type: 'infra' },
  { text: '  pgdata:', type: 'infra' },
  { text: '', type: 'blank' },
  { text: 'networks:', type: 'infra' },
  { text: '  frontend:', type: 'infra' },
  { text: '  backend:', type: 'infra' },
];

const SECTION_DETAILS: { type: string; icon: string; title: string; desc: string }[] = [
  { type: 'version', icon: '📌', title: 'version', desc: "Specifies the Compose file format version. Use '3.9' for modern features. In Docker Compose V2 (current), version is optional/ignored." },
  { type: 'services', icon: '📦', title: 'services', desc: "Defines each container in your stack. Each key under services is a service name — this becomes the container name AND the DNS hostname for container-to-container communication." },
  { type: 'build', icon: '🔨', title: 'build', desc: "Build from a local Dockerfile instead of pulling an image. Specify context (build directory) and dockerfile (filename). Compose builds the image automatically on first docker compose up." },
  { type: 'depends', icon: '🔗', title: 'depends_on', desc: "Defines startup order. Service won't start until its dependencies are running (or healthy). Use condition: service_healthy for health-check-based waiting." },
  { type: 'infra', icon: '🏗️', title: 'volumes & networks', desc: "Top-level volumes and networks declare shared resources. Volumes and networks listed here are created by Docker Compose. Services are connected to them by name." },
];

const AnimComposeFile = ({ onDone }: { onDone: () => void }) => {
  const [highlightType, setHighlightType] = useState<string | null>(null);
  const [detailIdx, setDetailIdx] = useState(-1);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    SECTION_DETAILS.forEach((sec, i) => {
      t.push(setTimeout(() => { setHighlightType(sec.type); setDetailIdx(i); }, i * 900));
    });
    t.push(setTimeout(() => setHighlightType(null), SECTION_DETAILS.length * 900));
    t.push(setTimeout(onDone, SECTION_DETAILS.length * 900 + 400));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  const colorForLine = (line: typeof YAML_LINES[0], highlighted: boolean) => {
    if (!highlighted) return 'text-foreground/40';
    if (line.text.match(/^\s{2}\w+:$/)) return 'text-pink-400';
    if (line.text.match(/^(version|services|volumes|networks):/)) return 'text-cyan-400 font-bold';
    if (line.text.match(/^\s{4,}(image|build|restart|ports|environment|depends_on|volumes|condition|context|dockerfile):/)) return 'text-cyan-400';
    return 'text-foreground/80';
  };

  return (
    <div className="w-full h-full flex gap-0">
      {/* YAML Editor */}
      <div className="flex-[55] flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <TermHeader title="docker-compose.yml" />
        <div className="flex-1 p-2 overflow-y-auto terminal-black">
          {YAML_LINES.map((line, i) => {
            const isHighlighted = line.type === highlightType;
            return (
              <div key={i} className={`flex items-center transition-all duration-200 ${isHighlighted ? 'bg-cyan-500/5' : ''}`}>
                <span className="text-[8px] font-mono text-foreground/20 w-5 text-right mr-2 select-none">{i + 1}</span>
                <pre className={`text-[9px] font-mono leading-4 ${colorForLine(line, isHighlighted || !highlightType)}`}>{line.text || ' '}</pre>
              </div>
            );
          })}
        </div>
      </div>

      {/* Detail panel */}
      <div className="flex-[45] flex flex-col items-center justify-center p-4" style={{ background: '#0F172A' }}>
        <AnimatePresence mode="wait">
          {detailIdx >= 0 && detailIdx < SECTION_DETAILS.length && (
            <motion.div key={detailIdx} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -12 }} transition={{ duration: 0.25 }}
              className="rounded-lg border p-4 w-full" style={{ borderColor: '#06B6D430', background: '#111827' }}>
              <div className="flex items-center gap-2 mb-2">
                <span className="text-lg">{SECTION_DETAILS[detailIdx].icon}</span>
                <span className="text-sm font-syne font-bold text-cyan-400">{SECTION_DETAILS[detailIdx].title}</span>
              </div>
              <p className="text-[11px] text-foreground/60 leading-relaxed">{SECTION_DETAILS[detailIdx].desc}</p>
              <div className="mt-2 text-[9px] font-mono text-cyan-400/40">{detailIdx + 1} / {SECTION_DETAILS.length}</div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

// ─── Animation 3: Compose Commands ───────────────────────────────────────────

type SvcStatus = 'stopped' | 'starting' | 'running';
interface SvcRow { name: string; image: string; port?: string; status: SvcStatus }

const AnimComposeCmds = ({ onDone }: { onDone: () => void }) => {
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean }[]>([]);
  const [services, setServices] = useState<SvcRow[]>([
    { name: 'postgres', image: 'postgres:15', port: '5432/tcp', status: 'stopped' },
    { name: 'redis', image: 'redis:alpine', status: 'stopped' },
    { name: 'api', image: 'my-api', port: '3000→3000', status: 'stopped' },
    { name: 'web', image: 'my-web', port: '80→80', status: 'stopped' },
  ]);
  const [showServices, setShowServices] = useState(true);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [termLines.length]);

  const setAllStatus = (s: SvcStatus) => setServices(prev => prev.map(svc => ({ ...svc, status: s })));

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];

    // Step 1: docker compose up
    t.push(setTimeout(() => {
      setTermLines(p => [...p, { text: '$ docker compose up -d', isCmd: true }]);
      setAllStatus('starting');
    }, 200));
    t.push(setTimeout(() => {
      setTermLines(p => [...p,
        { text: '[+] Running 4/4' },
        { text: ' ✔ Container myapp-postgres-1  Started', isSuccess: true },
        { text: ' ✔ Container myapp-redis-1     Started', isSuccess: true },
        { text: ' ✔ Container myapp-api-1       Started', isSuccess: true },
        { text: ' ✔ Container myapp-web-1       Started', isSuccess: true },
      ]);
      setAllStatus('running');
    }, 900));

    // Step 2: docker compose ps
    t.push(setTimeout(() => {
      setTermLines(p => [...p, { text: '$ docker compose ps', isCmd: true }]);
      setTimeout(() => setTermLines(p => [...p, { text: 'NAME                IMAGE        STATUS   PORTS' }, { text: 'myapp-postgres-1    postgres:15  running  5432/tcp\nmyapp-redis-1       redis:alpine running\nmyapp-api-1         my-api       running  0.0.0.0:3000->3000/tcp\nmyapp-web-1         my-web       running  0.0.0.0:80->80/tcp' }]), 200);
    }, 1800));

    // Step 3: docker compose logs
    t.push(setTimeout(() => {
      setTermLines(p => [...p, { text: '$ docker compose logs api', isCmd: true }]);
      setTimeout(() => setTermLines(p => [...p,
        { text: 'myapp-api-1  | Server started on port 3000', isSuccess: true },
        { text: 'myapp-api-1  | Connected to postgres ✓', isSuccess: true },
        { text: 'myapp-api-1  | Connected to redis ✓', isSuccess: true },
      ]), 200);
    }, 2700));

    // Step 4: docker compose down
    t.push(setTimeout(() => {
      setTermLines(p => [...p, { text: '$ docker compose down', isCmd: true }]);
      setAllStatus('starting');
    }, 3400));
    t.push(setTimeout(() => {
      setTermLines(p => [...p,
        { text: ' ✔ Container myapp-web-1       Removed' },
        { text: ' ✔ Container myapp-api-1       Removed' },
        { text: ' ✔ Container myapp-redis-1     Removed' },
        { text: ' ✔ Container myapp-postgres-1  Removed' },
      ]);
      setAllStatus('stopped');
    }, 3800));

    // Step 5: down -v
    t.push(setTimeout(() => {
      setTermLines(p => [...p, { text: '$ docker compose down -v', isCmd: true }]);
      setTimeout(() => {
        setTermLines(p => [...p, { text: '⚠️ pgdata volume also removed', isSuccess: false }]);
        setShowServices(true);
      }, 200);
    }, 4100));

    t.push(setTimeout(onDone, 4800));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex gap-0">
      {/* Terminal */}
      <div className="flex-[58] flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <TermHeader title="compose commands" />
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

      {/* Stack Status Panel */}
      <div className="flex-[42] flex flex-col" style={{ background: '#0F172A' }}>
        <div className="shrink-0 px-3 py-1.5 border-b text-center" style={{ borderColor: '#1F2D45' }}>
          <span className="text-[10px] font-syne font-bold text-emerald-400">Stack Status</span>
        </div>
        <div className="flex-1 p-3 space-y-1.5 overflow-y-auto">
          {showServices && services.map(svc => (
            <motion.div key={svc.name} layout className="rounded border px-2.5 py-1.5 flex items-center gap-2"
              style={{ borderColor: svc.status === 'running' ? '#10B98140' : '#1F2D45', background: svc.status === 'running' ? '#10B98108' : '#111827' }}>
              <motion.div className="w-2 h-2 rounded-full shrink-0" animate={{ backgroundColor: svc.status === 'running' ? '#10B981' : svc.status === 'starting' ? '#F59E0B' : '#475569' }}
                transition={{ duration: 0.3 }} />
              <span className="text-[9px] font-mono font-bold text-foreground/80 w-16">{svc.name}</span>
              <span className="text-[8px] font-mono text-foreground/30 flex-1">{svc.image}</span>
              <span className="text-[8px] font-mono" style={{ color: svc.status === 'running' ? '#10B981' : svc.status === 'starting' ? '#F59E0B' : '#475569' }}>
                {svc.status === 'running' ? '● RUNNING' : svc.status === 'starting' ? '◌ STARTING' : '○ STOPPED'}
              </span>
            </motion.div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─── Animation 4: Dependencies & Health Checks ──────────────────────────────

const AnimDependencies = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);
  const [nodeStates, setNodeStates] = useState<Record<string, 'gray' | 'starting' | 'healthy' | 'running'>>({ postgres: 'gray', redis: 'gray', api: 'gray', web: 'gray' });

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    t.push(setTimeout(() => setPhase(1), 600));
    t.push(setTimeout(() => {
      setPhase(2);
      setNodeStates(prev => ({ ...prev, postgres: 'starting', redis: 'starting' }));
    }, 1200));
    t.push(setTimeout(() => setNodeStates(prev => ({ ...prev, redis: 'running' })), 1800));
    t.push(setTimeout(() => setNodeStates(prev => ({ ...prev, postgres: 'healthy' })), 2600));
    t.push(setTimeout(() => {
      setNodeStates(prev => ({ ...prev, api: 'starting' }));
    }, 3000));
    t.push(setTimeout(() => setNodeStates(prev => ({ ...prev, api: 'running' })), 3500));
    t.push(setTimeout(() => setNodeStates(prev => ({ ...prev, web: 'starting' })), 3800));
    t.push(setTimeout(() => { setNodeStates(prev => ({ ...prev, web: 'running' })); setPhase(3); }, 4200));
    t.push(setTimeout(onDone, 4800));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  const nodeColor = (s: string) => {
    const st = nodeStates[s];
    if (st === 'running') return '#10B981';
    if (st === 'healthy') return '#F97316';
    if (st === 'starting') return '#F59E0B';
    return '#475569';
  };

  const nodeBg = (s: string) => {
    const st = nodeStates[s];
    if (st === 'running') return '#10B98110';
    if (st === 'healthy') return '#F9731610';
    if (st === 'starting') return '#F59E0B10';
    return '#111827';
  };

  const nodeLabel = (s: string) => {
    const st = nodeStates[s];
    if (st === 'running') return '● RUNNING';
    if (st === 'healthy') return '💓 HEALTHY';
    if (st === 'starting') return '◌ STARTING';
    return '○ WAITING';
  };

  const DepNode = ({ name, x, y }: { name: string; x: string; y: string }) => (
    <motion.div className="absolute rounded-lg border-2 px-3 py-2 flex flex-col items-center gap-0.5"
      style={{ left: x, top: y, borderColor: nodeColor(name), background: nodeBg(name), transform: 'translate(-50%, -50%)' }}
      animate={{ borderColor: nodeColor(name), background: nodeBg(name) }} transition={{ duration: 0.3 }}>
      <span className="text-[10px] font-mono font-bold" style={{ color: nodeColor(name) }}>{name}</span>
      <span className="text-[7px] font-mono" style={{ color: nodeColor(name) }}>{nodeLabel(name)}</span>
    </motion.div>
  );

  return (
    <div className="w-full h-full flex flex-col p-4 gap-3">
      {/* Dependency graph */}
      <div className="flex-1 relative min-h-[180px]">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="text-[10px] font-syne font-bold text-orange-400 text-center mb-1">
          Startup Order (depends_on)
        </motion.div>

        <div className="relative w-full h-full">
          <DepNode name="postgres" x="25%" y="35%" />
          <DepNode name="redis" x="25%" y="70%" />
          <DepNode name="api" x="60%" y="50%" />
          <DepNode name="web" x="88%" y="50%" />

          {/* Arrows as simple label connectors */}
          {phase >= 0 && (
            <svg className="absolute inset-0 w-full h-full pointer-events-none" style={{ overflow: 'visible' }}>
              <defs>
                <marker id="arrow-dep" viewBox="0 0 10 7" refX="10" refY="3.5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
                  <polygon points="0 0, 10 3.5, 0 7" fill="#F97316" />
                </marker>
              </defs>
              {/* postgres → api */}
              <motion.line x1="33%" y1="35%" x2="52%" y2="48%" stroke="#F97316" strokeWidth="1.5" markerEnd="url(#arrow-dep)"
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.6 }} transition={{ delay: 0.3, duration: 0.5 }} />
              {/* redis → api */}
              <motion.line x1="33%" y1="68%" x2="52%" y2="52%" stroke="#F97316" strokeWidth="1.5" markerEnd="url(#arrow-dep)"
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.6 }} transition={{ delay: 0.5, duration: 0.5 }} />
              {/* api → web */}
              <motion.line x1="68%" y1="50%" x2="80%" y2="50%" stroke="#F97316" strokeWidth="1.5" markerEnd="url(#arrow-dep)"
                initial={{ pathLength: 0, opacity: 0 }} animate={{ pathLength: 1, opacity: 0.6 }} transition={{ delay: 0.7, duration: 0.5 }} />
            </svg>
          )}
        </div>
      </div>

      {/* Timeline bar */}
      {phase >= 2 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="shrink-0 rounded-lg border px-3 py-2" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
          <div className="text-[8px] font-mono text-foreground/30 mb-1">Startup Timeline</div>
          <div className="relative h-4">
            <div className="absolute inset-y-0 left-0 right-0 flex items-center">
              <div className="h-0.5 w-full bg-foreground/10 rounded" />
            </div>
            {[
              { label: 'pg+redis start', pct: '0%', color: '#F59E0B', active: true },
              { label: 'redis ●', pct: '20%', color: '#10B981', active: nodeStates.redis !== 'gray' },
              { label: 'pg 💓', pct: '45%', color: '#F97316', active: nodeStates.postgres === 'healthy' || nodeStates.postgres === 'running' },
              { label: 'api start', pct: '60%', color: '#F59E0B', active: nodeStates.api !== 'gray' },
              { label: 'api ●', pct: '75%', color: '#10B981', active: nodeStates.api === 'running' },
              { label: 'web ●', pct: '95%', color: '#10B981', active: nodeStates.web === 'running' },
            ].map((evt, i) => (
              <motion.div key={i} className="absolute flex flex-col items-center" style={{ left: evt.pct, top: '-2px' }}
                initial={{ opacity: 0, scale: 0 }} animate={{ opacity: evt.active ? 1 : 0.2, scale: evt.active ? 1 : 0.5 }}
                transition={{ type: 'spring', stiffness: 300, delay: 0.1 }}>
                <div className="w-2 h-2 rounded-full" style={{ backgroundColor: evt.active ? evt.color : '#475569' }} />
                <span className="text-[6px] font-mono mt-0.5 whitespace-nowrap" style={{ color: evt.active ? evt.color : '#47556980' }}>{evt.label}</span>
              </motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {/* Health check code snippet */}
      {phase >= 1 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="shrink-0 rounded border p-2" style={{ borderColor: '#F9731630', background: '#0D1117' }}>
          <div className="text-[8px] font-mono text-orange-400/60 mb-0.5">healthcheck config:</div>
          <pre className="text-[8px] font-mono text-foreground/50 leading-3.5">{`test: ["CMD-SHELL", "pg_isready -U postgres"]
interval: 5s | timeout: 3s | retries: 5 | start_period: 10s`}</pre>
        </motion.div>
      )}

      {phase >= 3 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="shrink-0 px-4 py-1.5 rounded-lg text-center" style={{ background: '#F9731610', border: '1px solid #F9731630' }}>
          <span className="text-[10px] font-mono text-orange-400">depends_on + healthcheck = reliable startup. Never skip health checks.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 5: Full Stack ─────────────────────────────────────────────────

const AnimFullStack = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);
  const [glowHop, setGlowHop] = useState(-1);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    t.push(setTimeout(() => setPhase(1), 400));
    t.push(setTimeout(() => setPhase(2), 1200));
    t.push(setTimeout(() => setPhase(3), 2000));
    t.push(setTimeout(() => setPhase(4), 2900));
    // Request journey glow
    t.push(setTimeout(() => setGlowHop(0), 3400));
    t.push(setTimeout(() => setGlowHop(1), 3700));
    t.push(setTimeout(() => setGlowHop(2), 4000));
    t.push(setTimeout(() => setGlowHop(3), 4300));
    t.push(setTimeout(() => setGlowHop(-1), 4600));
    t.push(setTimeout(onDone, 5000));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  const layers: { phase: number; color: string; label: string; tint: string; services: { icon: string; name: string; detail: string }[] }[] = [
    { phase: 1, color: '#8B5CF6', label: 'Data Layer', tint: '#8B5CF610', services: [{ icon: '🗄️', name: 'postgres:15', detail: 'Primary Database' }, { icon: '📦', name: 'redis:7-alpine', detail: 'Cache / Sessions' }] },
    { phase: 2, color: '#14B8A6', label: 'Application Layer', tint: '#14B8A610', services: [{ icon: '⚙️', name: 'api (Node.js)', detail: 'REST API' }, { icon: '📧', name: 'worker (Node.js)', detail: 'Background Jobs' }] },
    { phase: 3, color: '#06B6D4', label: 'Presentation Layer', tint: '#06B6D410', services: [{ icon: '🌐', name: 'web (Next.js)', detail: 'Frontend UI' }] },
    { phase: 4, color: '#F97316', label: 'Reverse Proxy', tint: '#F9731610', services: [{ icon: '🔀', name: 'nginx', detail: 'SSL / Load Balancing' }] },
  ];

  return (
    <div className="w-full h-full flex flex-col p-4 gap-2 overflow-y-auto">
      {phase === 0 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex-1 flex flex-col items-center justify-center">
          <span className="text-sm font-syne font-bold text-purple-400">Building a Full-Stack App</span>
          <span className="text-[10px] text-foreground/40 font-mono mt-1">1 docker-compose.yml — 6 services — 1 command</span>
        </motion.div>
      )}

      {/* Layers build from bottom (reversed in flex-col-reverse would be tricky, so render top-to-bottom but stagger) */}
      {phase >= 1 && (
        <div className="flex flex-col-reverse gap-2 flex-1">
          {layers.map((layer, li) => (
            phase >= layer.phase ? (
              <motion.div key={li} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}
                className="rounded-lg border p-2.5" style={{ borderColor: `${layer.color}40`, background: layer.tint }}>
                <div className="flex items-center gap-2 mb-1.5">
                  <div className="w-2 h-2 rounded-full" style={{ backgroundColor: layer.color }} />
                  <span className="text-[9px] font-syne font-bold" style={{ color: layer.color }}>{layer.label}</span>
                </div>
                <div className="flex flex-wrap gap-2">
                  {layer.services.map((svc, si) => (
                    <motion.div key={si} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: si * 0.15 }}
                      className="rounded border px-2.5 py-1.5 flex items-center gap-1.5"
                      style={{
                        borderColor: glowHop === li ? `${layer.color}` : `${layer.color}30`,
                        background: glowHop === li ? `${layer.color}15` : '#111827',
                        boxShadow: glowHop === li ? `0 0 8px ${layer.color}40` : 'none',
                        transition: 'all 0.3s',
                      }}>
                      <span className="text-xs">{svc.icon}</span>
                      <div>
                        <div className="text-[9px] font-mono font-bold" style={{ color: layer.color }}>{svc.name}</div>
                        <div className="text-[7px] text-foreground/40">{svc.detail}</div>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            ) : null
          ))}
        </div>
      )}

      {/* Request journey label + user icon */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="shrink-0 flex items-center justify-center gap-1 text-[9px] font-mono text-purple-400/70">
          <span>👤</span>
          <span>→ nginx → web → api → postgres/redis</span>
        </motion.div>
      )}

      {phase >= 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="shrink-0 px-4 py-1.5 rounded-lg text-center" style={{ background: '#8B5CF610', border: '1px solid #8B5CF630' }}>
          <span className="text-[10px] font-mono text-purple-400">docker compose up -d — all 6 services start wired together.</span>
          <div className="text-[8px] text-foreground/30 mt-0.5">~60 lines of YAML → entire production stack</div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Main Level 11 Page ──────────────────────────────────────────────────────

const Level11Interactive = () => {
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
      if (!completedLevels.includes(11)) completeLevel(11);
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
            <p className="text-[10px] text-muted-foreground font-mono">Level 11 — Docker Compose</p>
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
            <span className="font-syne font-bold text-emerald-400 text-sm">🎉 Level 11 Complete! +100 XP — You can orchestrate entire app stacks!</span>
            <button onClick={() => navigate('/level/12')} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-syne font-bold text-xs hover:opacity-90 transition-opacity">Continue to Level 12 →</button>
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
                  <motion.span className="text-6xl" animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }}>🎼</motion.span>
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
                    {active === 'why-compose' && <AnimWhyCompose onDone={handleAnimDone} />}
                    {active === 'compose-file' && <AnimComposeFile onDone={handleAnimDone} />}
                    {active === 'compose-cmds' && <AnimComposeCmds onDone={handleAnimDone} />}
                    {active === 'dependencies' && <AnimDependencies onDone={handleAnimDone} />}
                    {active === 'full-stack' && <AnimFullStack onDone={handleAnimDone} />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* Terminal log */}
          <div className="shrink-0 border-t border-border" style={{ height: 200 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: '#0D1117' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-[10px] font-mono text-muted-foreground ml-1">docker-quest compose log</span>
            </div>
            <div ref={logRef} className="terminal-black p-3 overflow-y-auto font-mono text-[13px] leading-5" style={{ height: 'calc(200px - 28px)' }}>
              {infoLines.length === 0 ? (
                <span className="text-muted-foreground/50">{'> Click a topic to explore Docker Compose...'}<span className="inline-block w-2 h-4 bg-muted-foreground/50 ml-1" style={{ animation: 'blink 1s infinite' }} /></span>
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
              <div className="flex items-center gap-2"><span>📖</span><h2 className="font-syne font-bold text-foreground text-sm">Compose Reference</h2></div>
              <span className="text-[10px] text-muted-foreground font-mono">Level 11 — Docker Compose</span>
            </div>

            {/* Intro card */}
            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: '#1E3A5F', background: '#0F172A' }}>
              <h3 className="font-syne font-bold text-foreground text-sm mb-2">🎼 Docker Compose</h3>
              <p className="text-xs text-foreground/70 leading-relaxed">
                Docker Compose is a tool for defining and running multi-container applications.
                With a single docker-compose.yml file, you describe your entire application
                stack — services, networks, volumes, environment variables, build configs —
                and launch it all with one command. It is the standard tool for local
                development and simple production deployments. If Level 10 taught your
                containers to talk, Compose teaches them to move as one.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['Multi-Service', 'YAML', 'Declarative', 'Reproducible', 'Dev & Prod'].map(tag => (
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

export default Level11Interactive;
