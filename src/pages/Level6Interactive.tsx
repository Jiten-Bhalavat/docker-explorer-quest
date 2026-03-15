import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { usePausableTimers } from '@/hooks/usePausableTimers';

type TopicId = 'image-cmds' | 'container-cmds' | 'exec-logs' | 'system-cmds' | 'cheat-sheet';

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
  { id: 'image-cmds', label: 'Image Commands', icon: '🖼️', color: '#06B6D4', colorClass: 'text-cyan-400', borderClass: 'border-cyan-500', bgTint: 'bg-cyan-500/10', glowStyle: '0 0 12px rgba(6,182,212,0.4)' },
  { id: 'container-cmds', label: 'Container Commands', icon: '📦', color: '#10B981', colorClass: 'text-emerald-400', borderClass: 'border-emerald-500', bgTint: 'bg-emerald-500/10', glowStyle: '0 0 12px rgba(16,185,129,0.4)' },
  { id: 'exec-logs', label: 'Exec & Logs', icon: '🔍', color: '#8B5CF6', colorClass: 'text-purple-400', borderClass: 'border-purple-500', bgTint: 'bg-purple-500/10', glowStyle: '0 0 12px rgba(139,92,246,0.4)' },
  { id: 'system-cmds', label: 'System Commands', icon: '🛠️', color: '#F97316', colorClass: 'text-orange-400', borderClass: 'border-orange-500', bgTint: 'bg-orange-500/10', glowStyle: '0 0 12px rgba(249,115,22,0.4)' },
  { id: 'cheat-sheet', label: 'Cheat Sheet Run', icon: '⚡', color: '#F59E0B', colorClass: 'text-amber-400', borderClass: 'border-amber-500', bgTint: 'bg-amber-500/10', glowStyle: '0 0 12px rgba(245,158,11,0.4)' },
];

const INFO_LOGS: Record<TopicId, { prefix: string; lines: string[] }> = {
  'image-cmds': {
    prefix: '> Category: Image Commands',
    lines: [
      '$ docker pull <image>:<tag>         # download image from registry',
      '$ docker images                     # list all local images',
      '$ docker image inspect <image>      # detailed image metadata',
      '$ docker image history <image>      # show layer build history',
      '$ docker rmi <image>                # remove image by name or ID',
      '$ docker image prune                # remove dangling images',
      '$ docker image prune -a             # remove all unused images',
      '> Image commands loaded ✓',
    ],
  },
  'container-cmds': {
    prefix: '> Category: Container Lifecycle Commands',
    lines: [
      '$ docker run -d -p HOST:CONT --name NAME IMAGE   # create + start',
      '$ docker ps                         # list running containers',
      '$ docker ps -a                      # list all containers',
      '$ docker start <name>               # start stopped container',
      '$ docker stop <name>                # graceful stop (SIGTERM)',
      '$ docker restart <name>             # stop then start',
      '$ docker rm <name>                  # remove stopped container',
      '$ docker rm -f <name>               # force remove running container',
      '> Container commands loaded ✓',
    ],
  },
  'exec-logs': {
    prefix: '> Category: Exec and Logging Commands',
    lines: [
      '$ docker exec -it <name> bash       # open bash shell in container',
      '$ docker exec -it <name> sh         # open sh shell (Alpine uses sh)',
      '$ docker exec <name> <command>      # run single command in container',
      '$ docker logs <name>                # view all stdout/stderr output',
      '$ docker logs -f <name>             # follow logs in real-time',
      '$ docker logs --tail 50 <name>      # show last 50 lines',
      '$ docker logs --timestamps <name>   # show logs with timestamps',
      '> Exec and logging commands loaded ✓',
    ],
  },
  'system-cmds': {
    prefix: '> Category: System & Housekeeping Commands',
    lines: [
      '$ docker system df                  # disk usage breakdown',
      '$ docker system info                # full system information',
      '$ docker system prune               # remove all unused objects',
      '$ docker system prune --volumes     # also remove volumes',
      '$ docker container prune            # remove all stopped containers',
      '$ docker image prune -a             # remove all unused images',
      '$ docker volume prune               # remove all unused volumes',
      '$ docker network prune              # remove all unused networks',
      '> System commands loaded ✓',
    ],
  },
  'cheat-sheet': {
    prefix: '> Full Workflow: Pull → Run → Exec → Stats → Stop → Clean',
    lines: [
      '$ docker pull redis:7-alpine        ✓  image downloaded',
      '$ docker run -d --name cache redis  ✓  container started',
      '$ docker exec cache redis-cli ping  ✓  PONG received',
      '$ docker stats cache --no-stream    ✓  0.3% CPU  8MB RAM',
      '$ docker stop cache                 ✓  container stopped',
      '$ docker rm cache                   ✓  container removed',
      '$ docker system df                  ✓  system clean',
      '> Full Docker workflow demonstrated ✓',
    ],
  },
};

interface CardSection { title: string; text: string }
const CARD_DATA: Record<TopicId, { heading: string; sections: CardSection[] }> = {
  'image-cmds': {
    heading: 'Image Management Commands',
    sections: [
      { title: 'The essentials', text: "docker pull <image>:<tag>\n  Downloads an image from a registry to your local machine.\n  Always specify a tag. Omitting tag defaults to :latest.\n\ndocker images  (alias: docker image ls)\n  Lists all images on your machine with repository, tag, ID, and size.\n  Add -a to also show intermediate build layers.\n\ndocker image inspect <image>\n  Returns full JSON metadata: layers, environment variables, exposed ports,\n  entrypoint, architecture, creation date. Extremely useful for debugging.\n\ndocker history <image>\n  Shows every layer that makes up an image: the command that created it,\n  its size, and when it was created.\n\ndocker rmi <image>  (alias: docker image rm)\n  Removes an image from local storage. Fails if a container using it\n  exists — stop and remove containers first." },
      { title: 'Useful flags', text: "docker images --format '{{.Repository}}:{{.Tag}} {{.Size}}'\n  Custom output format using Go templates — great for scripting.\ndocker pull --platform linux/amd64 nginx\n  Pull a specific architecture (important on Apple Silicon Macs)." },
    ],
  },
  'container-cmds': {
    heading: 'Container Lifecycle Commands',
    sections: [
      { title: 'Create and run', text: "docker run [OPTIONS] IMAGE [CMD]\n  The most-used Docker command. Creates and starts a container.\n  Key flags: -d (detached), -p (ports), --name (name), -e (env var),\n  -v (volume), --rm (auto-remove on exit), -it (interactive terminal).\n\ndocker create IMAGE\n  Creates a container without starting it. Returns container ID.\n  Start later with docker start.\n\ndocker start <name/id>\n  Starts a previously stopped container (keeps its data/config).\n\ndocker restart <name/id>\n  Equivalent to docker stop + docker start." },
      { title: 'Inspect and list', text: "docker ps\n  Lists all RUNNING containers with ID, image, uptime, ports, name.\ndocker ps -a\n  Lists ALL containers including stopped ones.\ndocker ps --format 'table {{.Names}}\\t{{.Status}}'\n  Custom formatted output.\ndocker inspect <name>\n  Full JSON metadata: IP address, mounts, env vars, network settings." },
      { title: 'Stop and remove', text: "docker stop <name>    — graceful (SIGTERM → wait 10s → SIGKILL)\ndocker kill <name>    — immediate (SIGKILL)\ndocker rm <name>      — remove stopped container\ndocker rm -f <name>   — force-remove running container\ndocker container prune — remove all stopped containers at once" },
    ],
  },
  'exec-logs': {
    heading: 'Debugging: exec and logs',
    sections: [
      { title: 'docker exec', text: "docker exec -it <name> bash\n  Opens an interactive bash shell inside a running container.\n  Use this to inspect files, run commands, debug issues.\n  Note: if the container uses Alpine Linux, use sh instead of bash.\n\ndocker exec <name> <command>\n  Runs a single command without an interactive shell.\n  Examples:\n    docker exec db psql -U postgres -c 'SELECT version();'\n    docker exec cache redis-cli ping\n    docker exec web nginx -t   (test nginx config)" },
      { title: 'docker logs', text: "docker logs <name>\n  Shows all stdout and stderr output from the container.\n\ndocker logs -f <name>\n  Follows logs in real-time. Like tail -f but for containers.\n  Press Ctrl+C to stop following (container keeps running).\n\ndocker logs --tail 100 <name>\n  Shows only the last 100 lines.\n\ndocker logs --since 1h <name>\n  Shows logs from the past 1 hour.\n\ndocker logs --timestamps <name>\n  Prefixes each log line with an ISO 8601 timestamp." },
      { title: 'Practical debugging flow', text: "1. docker ps -a              — is the container running?\n2. docker logs <name>        — what went wrong in the output?\n3. docker exec -it <name> sh — inspect files/config inside\n4. docker inspect <name>     — check env vars and network config" },
    ],
  },
  'system-cmds': {
    heading: 'System & Housekeeping Commands',
    sections: [
      { title: 'Disk usage', text: "docker system df\n  Shows a breakdown of disk space used by Docker:\n  Images, Containers, Local Volumes, and Build Cache.\n  Also shows how much is reclaimable (safe to delete).\n  Run this when your disk fills up — Docker accumulates data fast." },
      { title: 'System info', text: "docker system info  (alias: docker info)\n  Comprehensive overview of your Docker installation:\n  number of containers and images, storage driver, kernel version,\n  CPU, memory, Docker version, logging driver, and more." },
      { title: 'Cleanup commands', text: "docker container prune   — remove all stopped containers\ndocker image prune       — remove dangling (untagged) images\ndocker image prune -a    — remove all images not used by a container\ndocker volume prune      — remove all unused volumes\ndocker network prune     — remove all unused networks\ndocker system prune      — remove containers + networks + dangling images\ndocker system prune -a   — remove everything unused including images\ndocker system prune --volumes — also remove unused volumes" },
      { title: 'Recommendation', text: "Run docker system prune once a month during development. Images and\nstopped containers pile up quickly and can consume tens of GBs.\nUse docker system df first to see how much you can reclaim." },
    ],
  },
  'cheat-sheet': {
    heading: 'The Docker Command Cheat Sheet',
    sections: [
      { title: 'Images', text: "pull    docker pull nginx:alpine\nlist    docker images\ninspect docker image inspect nginx\nhistory docker history nginx\nremove  docker rmi nginx\nclean   docker image prune -a" },
      { title: 'Containers', text: "create  docker run -d -p 8080:80 --name web nginx\nlist    docker ps -a\nstart   docker start web\nstop    docker stop web\nremove  docker rm web\nshell   docker exec -it web bash\nlogs    docker logs -f web\nstats   docker stats web" },
      { title: 'System', text: "usage   docker system df\ninfo    docker system info\nclean   docker system prune -a --volumes" },
      { title: 'Power combos', text: "Stop all containers:  docker stop $(docker ps -q)\nRemove all stopped:   docker rm $(docker ps -aq)\nRemove all images:    docker rmi $(docker images -q)\nNuclear clean:        docker system prune -a --volumes" },
    ],
  },
};

// ─── Shared: Terminal header bar ─────────────────────────────────────────────

const TermHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
    <div className="w-2 h-2 rounded-full bg-red-500/70" />
    <div className="w-2 h-2 rounded-full bg-amber-500/70" />
    <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
    <span className="text-[10px] font-mono text-muted-foreground ml-1">{title}</span>
  </div>
);

// ─── Shared: Split-canvas shell ──────────────────────────────────────────────

interface SplitCanvasProps {
  termTitle: string;
  panelTitle: string;
  panelColor: string;
  termLines: { text: string; isCmd?: boolean; isSuccess?: boolean }[];
  children: React.ReactNode;
}

const SplitCanvas = ({ termTitle, panelTitle, panelColor, termLines, children }: SplitCanvasProps) => {
  const scrollRef = useRef<HTMLDivElement>(null);
  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [termLines.length]);

  return (
    <div className="w-full h-full flex gap-0">
      {/* Terminal — left 62% */}
      <div className="flex-[62] flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <TermHeader title={termTitle} />
        <div ref={scrollRef} className="terminal-black p-3 overflow-y-auto font-mono text-[11px] leading-5 flex-1">
          {termLines.map((line, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
              {line.isCmd ? (
                <><span className="text-emerald-400">$ </span><span className="text-foreground">{line.text}</span></>
              ) : line.isSuccess ? (
                <span className="text-emerald-400">{line.text}</span>
              ) : (
                <span className="text-foreground/50">{line.text}</span>
              )}
            </motion.div>
          ))}
          <span className="inline-block w-2 h-3.5 bg-foreground/50" style={{ animation: 'blink 1s infinite' }} />
        </div>
      </div>
      {/* Visual panel — right 38% */}
      <div className="flex-[38] flex flex-col overflow-hidden" style={{ background: '#0F172A' }}>
        <div className="shrink-0 px-3 py-1.5 border-b text-center" style={{ borderColor: '#1F2D45' }}>
          <span className="text-[10px] font-syne font-bold" style={{ color: panelColor }}>{panelTitle}</span>
        </div>
        <div className="flex-1 overflow-y-auto p-3">
          {children}
        </div>
      </div>
    </div>
  );
};

// ─── Animation 1: Image Commands ─────────────────────────────────────────────

interface ImageRow { name: string; tag: string; size: string; isNew?: boolean; highlighted?: boolean; infoBadge?: string }

const AnimImageCmds = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [step, setStep] = useState(0);
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean }[]>([]);
  const [images, setImages] = useState<ImageRow[]>([]);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => {
      setStep(1);
      setTermLines(p => [...p, { text: 'docker pull nginx:alpine', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: 'alpine: Pulling from library/nginx' }]), 200);
      schedule(() => setTermLines(p => [...p, { text: '✓ sha256:a3... Pull complete', isSuccess: true }]), 400);
      schedule(() => setTermLines(p => [...p, { text: '✓ sha256:b7... Pull complete', isSuccess: true }]), 550);
      schedule(() => {
        setTermLines(p => [...p, { text: 'Status: Downloaded newer image nginx:alpine', isSuccess: true }]);
        setImages([{ name: 'nginx', tag: 'alpine', size: '23.4MB', isNew: true }]);
      }, 700);
    }, 200);

    schedule(() => {
      setStep(2);
      setTermLines(p => [...p, { text: 'docker pull node:18-slim', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: '18-slim: Pulling from library/node' }]), 200);
      schedule(() => setTermLines(p => [...p, { text: '✓ 3 layers pulled', isSuccess: true }]), 400);
      schedule(() => {
        setTermLines(p => [...p, { text: 'Status: Downloaded newer image node:18-slim', isSuccess: true }]);
        setImages(prev => [{ name: 'node', tag: '18-slim', size: '174MB', isNew: true }, ...prev.map(i => ({ ...i, isNew: false }))]);
      }, 600);
    }, 1400);

    schedule(() => {
      setStep(3);
      setTermLines(p => [...p, { text: 'docker images', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: 'REPOSITORY    TAG        SIZE' }]), 150);
      schedule(() => setTermLines(p => [...p, { text: 'nginx         alpine     23.4MB' }]), 300);
      schedule(() => setTermLines(p => [...p, { text: 'node          18-slim    174MB' }]), 450);
      schedule(() => setImages(prev => prev.map(i => ({ ...i, isNew: false, highlighted: true }))), 500);
      schedule(() => setImages(prev => prev.map(i => ({ ...i, highlighted: false }))), 1200);
    }, 2300);

    schedule(() => {
      setStep(4);
      setTermLines(p => [...p, { text: "docker image inspect nginx:alpine --format '{{.Os}}/{{.Architecture}}'", isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: 'linux/amd64' }]), 200);
      schedule(() => setImages(prev => prev.map(i => i.name === 'nginx' ? { ...i, infoBadge: 'linux/amd64' } : i)), 250);
      schedule(() => setImages(prev => prev.map(i => ({ ...i, infoBadge: undefined }))), 1100);
    }, 3000);

    schedule(() => {
      setStep(5);
      setTermLines(p => [...p, { text: 'docker rmi node:18-slim', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: 'Untagged: node:18-slim' }]), 150);
      schedule(() => setTermLines(p => [...p, { text: 'Deleted: sha256:b7c3...' }]), 300);
      schedule(() => setTermLines(p => [...p, { text: '✓ Removed', isSuccess: true }]), 450);
      schedule(() => setImages(prev => prev.filter(i => i.name !== 'node')), 400);
    }, 3600);

    schedule(onDone, 4400);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  return (
    <SplitCanvas termTitle="image commands" panelTitle="Local Image Store" panelColor="#06B6D4" termLines={termLines}>
      <div className="space-y-2">
        <AnimatePresence>
          {images.length === 0 && step === 0 && (
            <motion.div exit={{ opacity: 0 }} className="text-[10px] text-muted-foreground font-mono text-center py-4">No images</motion.div>
          )}
          {images.map(img => (
            <motion.div
              key={`${img.name}:${img.tag}`}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0, boxShadow: img.highlighted ? '0 0 12px rgba(6,182,212,0.3)' : 'none' }}
              exit={{ opacity: 0, x: 40 }}
              transition={{ duration: 0.3 }}
              className="rounded border p-2 flex items-center justify-between"
              style={{ borderColor: img.highlighted ? '#06B6D4' : img.isNew ? '#06B6D460' : '#1F2D45', background: img.highlighted ? '#06B6D408' : '#111827' }}
            >
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-mono text-cyan-400 font-bold">{img.name}</span>
                <span className="text-[9px] font-mono text-muted-foreground">:{img.tag}</span>
                {img.isNew && (
                  <motion.span initial={{ scale: 1.2 }} animate={{ scale: 1, opacity: [1, 0.5, 1] }} transition={{ duration: 0.6 }} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-cyan-500/20 text-cyan-400">NEW</motion.span>
                )}
                {img.infoBadge && (
                  <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-[8px] font-mono px-1.5 py-0.5 rounded bg-purple-500/20 text-purple-400">{img.infoBadge}</motion.span>
                )}
              </div>
              <span className="text-[9px] font-mono text-muted-foreground">{img.size}</span>
            </motion.div>
          ))}
        </AnimatePresence>
        {step >= 5 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-3 px-2 py-1.5 rounded" style={{ background: '#06B6D410', border: '1px solid #06B6D430' }}>
            <span className="text-[10px] font-mono text-cyan-400">Pull, list, inspect, remove — the 4 core image commands.</span>
          </motion.div>
        )}
      </div>
    </SplitCanvas>
  );
};

// ─── Animation 2: Container Commands ─────────────────────────────────────────

interface ContainerRow { name: string; image: string; ports: string; status: 'running' | 'stopped' | 'removing' }

const AnimContainerCmds = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean }[]>([]);
  const [containers, setContainers] = useState<ContainerRow[]>([]);
  const [step, setStep] = useState(0);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => {
      setStep(1);
      setTermLines(p => [...p, { text: 'docker run -d -p 8080:80 --name web nginx:alpine', isCmd: true }]);
      schedule(() => {
        setTermLines(p => [...p, { text: 'a1b2c3d4e5f6789abcdef1234567890ab' }]);
        setContainers([{ name: 'web', image: 'nginx:alpine', ports: '8080→80', status: 'running' }]);
      }, 300);
    }, 200);

    schedule(() => {
      setStep(2);
      setTermLines(p => [...p, { text: 'docker run -d -p 5432:5432 --name db postgres:15', isCmd: true }]);
      schedule(() => {
        setTermLines(p => [...p, { text: 'e5f6g7h8i9j0123456789abcdef01234' }]);
        setContainers(prev => [...prev, { name: 'db', image: 'postgres:15', ports: '5432→5432', status: 'running' }]);
      }, 300);
    }, 1200);

    schedule(() => {
      setStep(3);
      setTermLines(p => [...p, { text: 'docker ps', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: 'CONTAINER ID  IMAGE          STATUS       PORTS              NAMES' }]), 150);
      schedule(() => setTermLines(p => [...p, { text: 'a1b2c3d4      nginx:alpine   Up 5 sec     0.0.0.0:8080->80   web' }]), 300);
      schedule(() => setTermLines(p => [...p, { text: 'e5f6g7h8      postgres:15    Up 3 sec     0.0.0.0:5432->5432 db' }]), 450);
    }, 2100);

    schedule(() => {
      setStep(4);
      setTermLines(p => [...p, { text: 'docker stop web', isCmd: true }]);
      schedule(() => {
        setTermLines(p => [...p, { text: 'web', isSuccess: true }]);
        setContainers(prev => prev.map(c => c.name === 'web' ? { ...c, status: 'stopped' } : c));
      }, 300);
    }, 3000);

    schedule(() => {
      setStep(5);
      setTermLines(p => [...p, { text: 'docker rm web', isCmd: true }]);
      schedule(() => {
        setTermLines(p => [...p, { text: 'web', isSuccess: true }]);
        setContainers(prev => prev.filter(c => c.name !== 'web'));
      }, 300);
      schedule(() => setTermLines(p => [...p, { text: 'docker ps -a', isCmd: true }]), 500);
      schedule(() => setTermLines(p => [...p, { text: 'e5f6g7h8  postgres:15  Up 12 sec  db' }]), 650);
    }, 3700);

    schedule(onDone, 4500);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  return (
    <SplitCanvas termTitle="container lifecycle" panelTitle="Container Dashboard" panelColor="#10B981" termLines={termLines}>
      <div className="space-y-2">
        <AnimatePresence>
          {containers.length === 0 && step === 0 && (
            <motion.div exit={{ opacity: 0 }} className="text-[10px] text-muted-foreground font-mono text-center py-4">No containers</motion.div>
          )}
          {containers.map(c => (
            <motion.div
              key={c.name}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 30, height: 0, marginBottom: 0, padding: 0 }}
              transition={{ duration: 0.3 }}
              className="rounded border p-2"
              style={{
                borderColor: c.status === 'running' ? '#10B981' : c.status === 'stopped' ? '#6B7280' : '#EF4444',
                background: c.status === 'running' ? '#10B98108' : '#11182700',
              }}
            >
              <div className="flex items-center gap-2">
                <motion.div
                  className="w-2 h-2 rounded-full"
                  style={{ backgroundColor: c.status === 'running' ? '#10B981' : '#6B7280' }}
                  animate={c.status === 'running' ? { scale: [1, 1.3, 1] } : {}}
                  transition={{ repeat: Infinity, duration: 1.5 }}
                />
                <span className="text-[10px] font-mono font-bold text-foreground">{c.name}</span>
                <span className="text-[9px] font-mono text-muted-foreground">{c.image}</span>
              </div>
              <div className="flex items-center gap-3 mt-1 ml-4">
                <span className={`text-[9px] font-mono ${c.status === 'running' ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                  {c.status === 'running' ? '● RUNNING' : '■ STOPPED'}
                </span>
                <span className="text-[9px] font-mono text-muted-foreground">{c.ports}</span>
              </div>
            </motion.div>
          ))}
        </AnimatePresence>
        {step >= 5 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center mt-3 px-2 py-1.5 rounded" style={{ background: '#10B98110', border: '1px solid #10B98130' }}>
            <span className="text-[10px] font-mono text-emerald-400">run → ps → stop → rm — the container lifecycle loop.</span>
          </motion.div>
        )}
      </div>
    </SplitCanvas>
  );
};

// ─── Animation 3: Exec & Logs ────────────────────────────────────────────────

type InteriorView = 'empty' | 'fs' | 'procs' | 'logs' | 'logs-ts';

const AnimExecLogs = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean }[]>([]);
  const [view, setView] = useState<InteriorView>('empty');
  const [step, setStep] = useState(0);
  const [badge, setBadge] = useState('');
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => {
      setStep(1);
      setTermLines(p => [...p, { text: 'docker run -d --name app node:18-slim node -e "..."', isCmd: true }]);
      schedule(() => {
        setTermLines(p => [...p, { text: 'b2c3d4e5f6' }]);
        setView('empty');
        setBadge('RUNNING');
      }, 250);
    }, 200);

    schedule(() => {
      setStep(2);
      setTermLines(p => [...p, { text: 'docker exec -it app sh', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: '/ # ls' }]), 200);
      schedule(() => setTermLines(p => [...p, { text: 'bin  dev  etc  home  lib  node_modules  proc  usr' }]), 400);
      schedule(() => setTermLines(p => [...p, { text: '/ # cat /etc/os-release' }]), 600);
      schedule(() => setTermLines(p => [...p, { text: 'NAME="Alpine Linux"' }]), 750);
      schedule(() => setTermLines(p => [...p, { text: 'ID=alpine' }]), 850);
      schedule(() => { setView('fs'); setBadge('EXEC SESSION'); }, 300);
    }, 1100);

    schedule(() => {
      setStep(3);
      setTermLines(p => [...p, { text: '/ # ps aux', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: 'PID  COMMAND' }]), 200);
      schedule(() => setTermLines(p => [...p, { text: '1    node -e require...' }]), 350);
      schedule(() => setTermLines(p => [...p, { text: '12   sh' }]), 500);
      schedule(() => setTermLines(p => [...p, { text: '18   ps aux' }]), 650);
      schedule(() => setView('procs'), 200);
    }, 2200);

    schedule(() => {
      setStep(4);
      setTermLines(p => [...p, { text: '/ # exit' }]);
      schedule(() => setTermLines(p => [...p, { text: 'docker logs app', isCmd: true }]), 200);
      schedule(() => setTermLines(p => [...p, { text: 'Server started on port 3000' }]), 400);
      schedule(() => setTermLines(p => [...p, { text: 'GET / 200 12ms' }]), 550);
      schedule(() => setTermLines(p => [...p, { text: 'GET /favicon.ico 404 2ms' }]), 700);
      schedule(() => { setView('logs'); setBadge('LOGS'); }, 300);
    }, 3000);

    schedule(() => {
      setStep(5);
      setTermLines(p => [...p, { text: 'docker logs --tail 5 --timestamps app', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: '2024-01-15T10:23:41Z Server started on port 3000' }]), 250);
      schedule(() => setTermLines(p => [...p, { text: '2024-01-15T10:23:45Z GET / 200 12ms' }]), 400);
      schedule(() => setView('logs-ts'), 200);
    }, 3700);

    schedule(onDone, 4500);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  const FS_TREE = ['/', '├── bin', '├── etc', '├── home', '├── lib', '├── node_modules', '├── proc', '└── usr'];
  const PROCS = [
    { pid: '1', cmd: 'node -e require...' },
    { pid: '12', cmd: 'sh' },
    { pid: '18', cmd: 'ps aux' },
  ];
  const LOG_LINES = ['Server started on port 3000', 'GET / 200 12ms', 'GET /favicon.ico 404 2ms'];
  const LOG_TS_LINES = ['2024-01-15T10:23:41Z Server started on port 3000', '2024-01-15T10:23:45Z GET / 200 12ms'];

  return (
    <SplitCanvas termTitle="exec & logs" panelTitle="Container Interior" panelColor="#8B5CF6" termLines={termLines}>
      {/* Container box visualization */}
      <div className="flex flex-col items-center gap-2">
        {step >= 1 && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className="rounded-lg border-2 p-3 w-full"
            style={{ borderColor: '#8B5CF6', background: '#8B5CF608' }}
          >
            <div className="flex items-center justify-between mb-2">
              <span className="text-[10px] font-mono font-bold text-purple-400">app (node:18-slim)</span>
              <span className="text-[8px] font-mono px-1.5 py-0.5 rounded" style={{ background: badge === 'RUNNING' ? '#10B98120' : badge === 'EXEC SESSION' ? '#8B5CF620' : '#F59E0B20', color: badge === 'RUNNING' ? '#10B981' : badge === 'EXEC SESSION' ? '#8B5CF6' : '#F59E0B' }}>
                {badge === 'EXEC SESSION' ? '🔍 ' : badge === 'LOGS' ? '📋 ' : '● '}{badge}
              </span>
            </div>

            <AnimatePresence mode="wait">
              {view === 'empty' && (
                <motion.div key="empty" exit={{ opacity: 0 }} className="text-[9px] text-muted-foreground font-mono text-center py-2">
                  PORT 3000
                </motion.div>
              )}
              {view === 'fs' && (
                <motion.div key="fs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-mono text-[9px] space-y-0.5">
                  {FS_TREE.map((line, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.05 }} className="text-purple-300">{line}</motion.div>
                  ))}
                </motion.div>
              )}
              {view === 'procs' && (
                <motion.div key="procs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-mono text-[9px] space-y-1">
                  <div className="text-muted-foreground">PID  COMMAND</div>
                  {PROCS.map((p, i) => (
                    <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.15 }} className="text-purple-300">
                      <span className="text-foreground/60 mr-2">{p.pid}</span>{p.cmd}
                    </motion.div>
                  ))}
                </motion.div>
              )}
              {view === 'logs' && (
                <motion.div key="logs" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-mono text-[9px] space-y-1">
                  <div className="text-muted-foreground text-[8px]">LOG STREAM</div>
                  {LOG_LINES.map((l, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} className="text-amber-300/80">{l}</motion.div>
                  ))}
                </motion.div>
              )}
              {view === 'logs-ts' && (
                <motion.div key="logs-ts" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="font-mono text-[9px] space-y-1">
                  <div className="text-muted-foreground text-[8px]">LOG STREAM (timestamps)</div>
                  {LOG_TS_LINES.map((l, i) => (
                    <motion.div key={i} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }} className="text-amber-300/80">{l}</motion.div>
                  ))}
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>
        )}

        {step >= 5 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center px-2 py-1.5 rounded" style={{ background: '#8B5CF610', border: '1px solid #8B5CF630' }}>
            <span className="text-[10px] font-mono text-purple-400">exec gets you inside. logs shows what happened. Master both.</span>
          </motion.div>
        )}
      </div>
    </SplitCanvas>
  );
};

// ─── Animation 4: System Commands ────────────────────────────────────────────

const CountUp = ({ target, color, flash }: { target: number; color: string; flash?: boolean }) => {
  const [val, setVal] = useState(0);
  useEffect(() => {
    const dur = 600;
    const start = val;
    const diff = target - start;
    const startTime = performance.now();
    let raf: number;
    const tick = (now: number) => {
      const elapsed = now - startTime;
      const progress = Math.min(elapsed / dur, 1);
      setVal(Math.round(start + diff * progress));
      if (progress < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [target]);

  return (
    <motion.span
      className="font-mono text-sm font-bold"
      style={{ color }}
      animate={flash ? { color: ['#EF4444', color] } : {}}
      transition={{ duration: 0.6 }}
    >
      {val}MB
    </motion.span>
  );
};

const AnimSystemCmds = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean }[]>([]);
  const [metrics, setMetrics] = useState({ images: 0, containers: 0, volumes: 0, cache: 0 });
  const [flash, setFlash] = useState('');
  const [step, setStep] = useState(0);
  const [cleaned, setCleaned] = useState(false);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => {
      setStep(1);
      setTermLines(p => [...p, { text: 'docker system df', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: 'TYPE            SIZE      RECLAIMABLE' }]), 200);
      schedule(() => setTermLines(p => [...p, { text: 'Images          452MB     234MB (52%)' }]), 350);
      schedule(() => setTermLines(p => [...p, { text: 'Containers      12MB      12MB (100%)' }]), 500);
      schedule(() => setTermLines(p => [...p, { text: 'Local Volumes   88MB      0B (0%)' }]), 650);
      schedule(() => setTermLines(p => [...p, { text: 'Build Cache     156MB     156MB (100%)' }]), 800);
      schedule(() => setMetrics({ images: 452, containers: 12, volumes: 88, cache: 156 }), 300);
    }, 200);

    schedule(() => {
      setStep(2);
      setTermLines(p => [...p, { text: 'docker system info', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: 'Containers: 3  Running: 1  Stopped: 2' }]), 200);
      schedule(() => setTermLines(p => [...p, { text: 'Images: 8' }]), 350);
      schedule(() => setTermLines(p => [...p, { text: 'Server Version: 24.0.5' }]), 500);
      schedule(() => setTermLines(p => [...p, { text: 'Storage Driver: overlay2' }]), 650);
      schedule(() => setTermLines(p => [...p, { text: 'Kernel: 5.15.0-91  |  OS: Ubuntu 22.04.3 LTS' }]), 800);
    }, 1500);

    schedule(() => {
      setStep(3);
      setTermLines(p => [...p, { text: 'docker container prune', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: 'WARNING: This will remove all stopped containers.' }]), 200);
      schedule(() => setTermLines(p => [...p, { text: 'Deleted Containers: a1b2c3, e5f6g7' }]), 400);
      schedule(() => {
        setTermLines(p => [...p, { text: 'Total reclaimed space: 12MB', isSuccess: true }]);
        setFlash('containers');
        setMetrics(prev => ({ ...prev, containers: 0 }));
      }, 600);
    }, 2500);

    schedule(() => {
      setStep(4);
      setTermLines(p => [...p, { text: 'docker image prune -a', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: 'Deleted Images: sha256:a1..., sha256:b2...' }]), 250);
      schedule(() => {
        setTermLines(p => [...p, { text: 'Total reclaimed space: 234MB', isSuccess: true }]);
        setFlash('images');
        setMetrics(prev => ({ ...prev, images: 218 }));
      }, 500);
    }, 3200);

    schedule(() => {
      setStep(5);
      setTermLines(p => [...p, { text: 'docker system prune --volumes', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: 'WARNING: This will remove everything unused.' }]), 200);
      schedule(() => {
        setTermLines(p => [...p, { text: 'Total reclaimed space: 390MB ✓', isSuccess: true }]);
        setFlash('all');
        setMetrics({ images: 34, containers: 0, volumes: 0, cache: 0 });
        schedule(() => setCleaned(true), 400);
      }, 500);
    }, 3900);

    schedule(onDone, 4800);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  const cards = [
    { label: 'Images', value: metrics.images, color: '#06B6D4', key: 'images' },
    { label: 'Containers', value: metrics.containers, color: '#10B981', key: 'containers' },
    { label: 'Volumes', value: metrics.volumes, color: '#8B5CF6', key: 'volumes' },
    { label: 'Build Cache', value: metrics.cache, color: '#F97316', key: 'cache' },
  ];

  return (
    <SplitCanvas termTitle="system housekeeping" panelTitle="System Health Dashboard" panelColor="#F97316" termLines={termLines}>
      <div className="grid grid-cols-2 gap-2">
        {cards.map(c => (
          <motion.div
            key={c.key}
            className="rounded border p-2 text-center"
            style={{ borderColor: flash === c.key || flash === 'all' ? '#F97316' : '#1F2D45', background: flash === c.key || flash === 'all' ? '#F9731610' : '#111827' }}
            animate={flash === c.key || flash === 'all' ? { borderColor: ['#F97316', '#1F2D45'] } : {}}
            transition={{ duration: 0.8 }}
          >
            <div className="text-[9px] font-mono text-muted-foreground mb-1">{c.label}</div>
            <CountUp target={c.value} color={c.color} flash={flash === c.key || flash === 'all'} />
          </motion.div>
        ))}
      </div>

      {step >= 2 && step < 5 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 rounded border p-2 text-center" style={{ borderColor: '#F9731630', background: '#F9731608' }}>
          <div className="text-[9px] font-mono text-orange-400 font-bold mb-1">System Info</div>
          <div className="text-[8px] font-mono text-muted-foreground space-y-0.5">
            <div>v24.0.5 · overlay2 · Ubuntu 22.04</div>
            <div>3 containers · 8 images</div>
          </div>
        </motion.div>
      )}

      {cleaned && (
        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-2 text-center px-2 py-1.5 rounded" style={{ background: '#10B98110', border: '1px solid #10B98130' }}>
          <span className="text-[10px] font-mono text-emerald-400">✓ System Cleaned</span>
        </motion.div>
      )}

      {step >= 5 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-2 text-center px-2 py-1.5 rounded" style={{ background: '#F9731610', border: '1px solid #F9731630' }}>
          <span className="text-[10px] font-mono text-orange-400">docker system prune is your cleanup command. Use it monthly.</span>
        </motion.div>
      )}
    </SplitCanvas>
  );
};

// ─── Animation 5: Cheat Sheet Run ────────────────────────────────────────────

interface CheatCard { icon: string; title: string; color: string }

const CHEAT_CARDS: CheatCard[] = [
  { icon: '🐳', title: 'Docker version verified', color: '#06B6D4' },
  { icon: '☁️', title: 'Image pulled from Hub', color: '#06B6D4' },
  { icon: '📦', title: "Container 'cache' started", color: '#10B981' },
  { icon: '📋', title: 'Formatted container list', color: '#F59E0B' },
  { icon: '⚡', title: 'Redis responded: PONG', color: '#10B981' },
  { icon: '📊', title: 'Live resource stats', color: '#8B5CF6' },
  { icon: '■', title: 'Container stopped & removed', color: '#EF4444' },
  { icon: '🧹', title: 'System clean', color: '#10B981' },
];

const CHEAT_CMDS: { cmd: string; output: string[] }[] = [
  { cmd: 'docker version', output: ['Client: 24.0.5  Server: 24.0.5'] },
  { cmd: 'docker pull redis:7-alpine', output: ['Status: Downloaded redis:7-alpine ✓'] },
  { cmd: 'docker run -d --name cache redis:7-alpine', output: ['c9d8e7f6'] },
  { cmd: 'docker ps --format "table {{.Names}}\\t{{.Status}}"', output: ['NAMES   STATUS', 'cache   Up 3 sec'] },
  { cmd: 'docker exec cache redis-cli ping', output: ['PONG'] },
  { cmd: 'docker stats cache --no-stream', output: ['NAME   CPU%   MEM USAGE', 'cache  0.3%   8.2MiB'] },
  { cmd: 'docker stop cache && docker rm cache', output: ['cache', 'cache'] },
  { cmd: 'docker system df', output: ['Images: 34MB  Containers: 0B  Volumes: 0B'] },
];

const AnimCheatSheet = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean }[]>([]);
  const [cardIdx, setCardIdx] = useState(-1);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    CHEAT_CMDS.forEach((entry, i) => {
      const base = i * 600;
      schedule(() => {
        setTermLines(p => [...p, { text: entry.cmd, isCmd: true }]);
        setCardIdx(i);
        entry.output.forEach((line, j) => {
          schedule(() => setTermLines(p => [...p, { text: line, isSuccess: j === entry.output.length - 1 }]), (j + 1) * 120);
        });
      }, base);
    });
    schedule(onDone, CHEAT_CMDS.length * 600 + 400);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  const currentCard = cardIdx >= 0 ? CHEAT_CARDS[cardIdx] : null;

  return (
    <SplitCanvas termTitle="cheat sheet run (fast)" panelTitle="Command Result Card" panelColor="#F59E0B" termLines={termLines}>
      <div className="flex flex-col items-center justify-center h-full gap-3">
        <AnimatePresence mode="wait">
          {currentCard && (
            <motion.div
              key={cardIdx}
              initial={{ rotateY: 90, opacity: 0 }}
              animate={{ rotateY: 0, opacity: 1 }}
              exit={{ rotateY: -90, opacity: 0 }}
              transition={{ duration: 0.25 }}
              style={{ perspective: 800 }}
              className="rounded-xl border-2 p-4 flex flex-col items-center gap-2 w-full"
              {...{ style: { borderColor: currentCard.color, background: `${currentCard.color}10` } }}
            >
              <span className="text-3xl">{currentCard.icon}</span>
              <span className="text-[11px] font-mono font-bold text-center" style={{ color: currentCard.color }}>
                {currentCard.title}
              </span>
              <span className="text-[9px] font-mono text-muted-foreground">{cardIdx + 1}/8</span>
            </motion.div>
          )}
        </AnimatePresence>

        {cardIdx < 0 && (
          <div className="text-[10px] text-muted-foreground font-mono text-center">Waiting for commands...</div>
        )}

        {cardIdx >= CHEAT_CMDS.length - 1 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-center px-2 py-1.5 rounded" style={{ background: '#F59E0B10', border: '1px solid #F59E0B30' }}>
            <span className="text-[10px] font-mono text-amber-400">8 commands. The full Docker workflow from pull to cleanup.</span>
          </motion.div>
        )}
      </div>
    </SplitCanvas>
  );
};

// ─── Main Level 6 Page ───────────────────────────────────────────────────────

const Level6Interactive = () => {
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
    if (wasNew && !completedLevels.includes(6)) completeLevel(6);

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
            <p className="text-[10px] text-muted-foreground font-mono">Level 6 — Docker Commands</p>
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
            <span className="font-syne font-bold text-emerald-400 text-sm">🎉 Level 6 Complete! +100 XP — You know the essential Docker commands!</span>
            <button onClick={() => navigate('/level/7')} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-syne font-bold text-xs hover:opacity-90 transition-opacity">Continue to Level 7 →</button>
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
                    {active === 'image-cmds' && <AnimImageCmds onDone={handleAnimDone} paused={paused} />}
                    {active === 'container-cmds' && <AnimContainerCmds onDone={handleAnimDone} paused={paused} />}
                    {active === 'exec-logs' && <AnimExecLogs onDone={handleAnimDone} paused={paused} />}
                    {active === 'system-cmds' && <AnimSystemCmds onDone={handleAnimDone} paused={paused} />}
                    {active === 'cheat-sheet' && <AnimCheatSheet onDone={handleAnimDone} paused={paused} />}
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
              <span className="text-[10px] font-mono text-muted-foreground ml-1">docker-quest command log</span>
            </div>
            <div ref={logRef} className="terminal-black p-3 overflow-y-auto font-mono text-[13px] leading-5" style={{ height: 'calc(200px - 28px)' }}>
              {infoLines.length === 0 ? (
                <span className="text-muted-foreground/50">{'> Click a topic to practice Docker commands...'}<span className="inline-block w-2 h-4 bg-muted-foreground/50 ml-1" style={{ animation: 'blink 1s infinite' }} /></span>
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
              <div className="flex items-center gap-2"><span>📖</span><h2 className="font-syne font-bold text-foreground text-sm">Command Reference</h2></div>
              <span className="text-[10px] text-muted-foreground font-mono">Level 6 — Docker Commands</span>
            </div>

            {/* Intro card */}
            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: '#1E3A5F', background: '#0F172A' }}>
              <h3 className="font-syne font-bold text-foreground text-sm mb-2">⌨️ Docker CLI Commands</h3>
              <p className="text-xs text-foreground/70 leading-relaxed">
                The Docker CLI is your primary interface with the Docker Engine. Every docker
                command follows the same structure: docker [OBJECT] [COMMAND] [OPTIONS].
                Understanding how commands are grouped by object type (image, container,
                volume, network, system) helps you predict commands you've never seen before.
                Level 6 covers the commands you'll use every single day.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['CLI', 'Terminal', 'Lifecycle', 'Debugging', 'Housekeeping'].map(tag => (
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

export default Level6Interactive;
