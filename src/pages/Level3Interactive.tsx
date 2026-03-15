import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { usePausableTimers } from '@/hooks/usePausableTimers';

type TopicId = 'docker-desktop' | 'linux-install' | 'components' | 'daemon' | 'verify';

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
  { id: 'docker-desktop', label: 'Docker Desktop', icon: '🖥️', color: '#06B6D4', colorClass: 'text-cyan-400', borderClass: 'border-cyan-500', bgTint: 'bg-cyan-500/10', glowStyle: '0 0 12px rgba(6,182,212,0.4)' },
  { id: 'linux-install', label: 'Linux Install', icon: '🐧', color: '#F97316', colorClass: 'text-orange-400', borderClass: 'border-orange-500', bgTint: 'bg-orange-500/10', glowStyle: '0 0 12px rgba(249,115,22,0.4)' },
  { id: 'components', label: 'What Gets Installed', icon: '📦', color: '#8B5CF6', colorClass: 'text-purple-400', borderClass: 'border-purple-500', bgTint: 'bg-purple-500/10', glowStyle: '0 0 12px rgba(139,92,246,0.4)' },
  { id: 'daemon', label: 'Docker Daemon', icon: '⚙️', color: '#10B981', colorClass: 'text-emerald-400', borderClass: 'border-emerald-500', bgTint: 'bg-emerald-500/10', glowStyle: '0 0 12px rgba(16,185,129,0.4)' },
  { id: 'verify', label: 'Verify Install', icon: '✅', color: '#F59E0B', colorClass: 'text-amber-400', borderClass: 'border-amber-500', bgTint: 'bg-amber-500/10', glowStyle: '0 0 12px rgba(245,158,11,0.4)' },
];

const INFO_LOGS: Record<TopicId, { prefix: string; lines: string[] }> = {
  'docker-desktop': {
    prefix: '> Loading: Docker Desktop Installation',
    lines: [
      '# Platform: macOS / Windows',
      '# Download: Docker Desktop installer (~540 MB)',
      '# Installs: Docker Engine, Docker CLI, Docker Compose, Docker Dashboard',
      '# Requires: macOS 12+ or Windows 10/11 with WSL2 enabled',
      '# After install: Docker whale appears in system tray',
      '> Installation simulation complete ✓',
    ],
  },
  'linux-install': {
    prefix: '> Loading: Linux Installation (Ubuntu/Debian)',
    lines: [
      '$ sudo apt-get update',
      '$ sudo apt-get install docker.io -y',
      '$ sudo systemctl start docker',
      '$ sudo systemctl enable docker',
      '$ sudo usermod -aG docker $USER',
      '# Last command: adds your user to docker group (no sudo needed)',
      '# Log out and back in for group change to take effect',
      '> Linux install simulation complete ✓',
    ],
  },
  components: {
    prefix: '> Loading: Docker Component Map',
    lines: [
      "# Docker CLI      — the 'docker' command (client)",
      '# Docker Daemon   — dockerd background service (server)',
      '# REST API        — bridge between CLI and Daemon',
      '# containerd      — container runtime manager',
      '# runc            — low-level container executor',
      '# Docker Compose  — multi-container orchestration tool',
      '> Component map loaded ✓',
    ],
  },
  daemon: {
    prefix: '> Loading: Daemon Architecture',
    lines: [
      '# dockerd listens on: unix:///var/run/docker.sock',
      '# All docker commands are REST API calls to the daemon',
      '# Daemon manages: images, containers, networks, volumes',
      '# Check daemon status: sudo systemctl status docker',
      '# View daemon logs:    journalctl -u docker.service',
      '> Daemon architecture loaded ✓',
    ],
  },
  verify: {
    prefix: '> Running verification sequence...',
    lines: [
      '$ docker --version',
      'Docker version 24.0.5, build ced0996 ✓',
      '$ docker info',
      'Server Version: 24.0.5  |  Containers: 0 ✓',
      '$ docker run hello-world',
      'Hello from Docker! ✓',
      '> All 3 checks passed — Docker is ready to use! 🐳',
    ],
  },
};

interface CardSection { title: string; text: string }

const CARD_DATA: Record<TopicId, { heading: string; sections: CardSection[] }> = {
  'docker-desktop': {
    heading: 'Docker Desktop',
    sections: [
      {
        title: 'What it is',
        text: 'Docker Desktop is the recommended way to install Docker on Mac and Windows. It is a native application that runs Docker in a lightweight Linux virtual machine in the background. You get a visual dashboard to manage containers and images, and the docker command works in your terminal just like on Linux.',
      },
      {
        title: 'What it includes',
        text: 'Docker Desktop bundles: Docker Engine, Docker CLI, Docker Compose, Docker Scout, Docker Extensions, and a GUI dashboard. It is a one-click install that handles all the complexity for you.',
      },
      {
        title: 'System requirements',
        text: 'macOS: Version 12 (Monterey) or later, Apple Silicon or Intel chip.\nWindows: Windows 10/11 with WSL2 (Windows Subsystem for Linux 2) enabled. WSL2 is what allows Docker to run a Linux kernel on Windows.',
      },
      {
        title: 'Download',
        text: 'Get Docker Desktop from: docs.docker.com/get-docker',
      },
    ],
  },
  'linux-install': {
    heading: 'Installing Docker on Linux',
    sections: [
      {
        title: "Why it's different",
        text: "On Linux, you don't need Docker Desktop — you install Docker Engine directly. Linux is Docker's native home since containers are built on Linux kernel features (namespaces and cgroups). The installation uses your distro's package manager.",
      },
      {
        title: 'Ubuntu / Debian commands',
        text: 'sudo apt-get update\nsudo apt-get install docker.io -y\nsudo systemctl start docker\nsudo systemctl enable docker\nsudo usermod -aG docker $USER',
      },
      {
        title: 'The last command explained',
        text: "sudo usermod -aG docker $USER adds your user to the 'docker' group. Without this, every docker command requires sudo. You must log out and log back in for this change to take effect.",
      },
      {
        title: 'Post-install',
        text: "Run docker run hello-world to verify the installation works. If you see 'Hello from Docker!' — you're ready to go.",
      },
    ],
  },
  components: {
    heading: 'The Docker Component Stack',
    sections: [
      {
        title: 'Docker CLI',
        text: "The docker command you type in your terminal. It's a client that sends your commands to the Docker Daemon via REST API calls. The CLI itself does nothing on its own — it's just a messenger.",
      },
      {
        title: 'Docker Daemon (dockerd)',
        text: 'The background service that actually does the work. It receives commands from the CLI, manages images and containers, handles networking and volumes, and communicates with the container runtime.',
      },
      {
        title: 'Docker REST API',
        text: 'The HTTP interface between the CLI and the Daemon. You can even control Docker programmatically by sending HTTP requests directly to this API — this is how Docker SDKs in Python, Go, and other languages work.',
      },
      {
        title: 'containerd',
        text: 'The high-level container runtime that the Docker Daemon delegates to. It handles pulling images, managing container storage, and supervising running containers. containerd is a CNCF graduated project.',
      },
      {
        title: 'runc',
        text: 'The lowest-level piece. containerd calls runc to actually create and run containers using Linux kernel features. runc implements the OCI (Open Container Initiative) runtime specification.',
      },
    ],
  },
  daemon: {
    heading: 'The Docker Daemon Explained',
    sections: [
      {
        title: 'What it is',
        text: 'The Docker Daemon (dockerd) is a persistent background service that runs on your host machine and manages all Docker objects: images, containers, networks, and volumes. It listens for Docker API requests and processes them.',
      },
      {
        title: 'How it starts',
        text: 'On Linux: systemctl start docker starts the daemon.\nOn Mac/Windows: launching Docker Desktop starts the daemon automatically.\nThe daemon runs until you stop it or shut down Docker Desktop.',
      },
      {
        title: 'How CLI talks to it',
        text: "By default, the CLI communicates with the daemon via a Unix socket at /var/run/docker.sock. This is why running docker commands without sudo on Linux fails — only users in the 'docker' group can access this socket.",
      },
      {
        title: "Check if it's running",
        text: "Run: docker info\nIf it returns server information, the daemon is running.\nIf it says 'Cannot connect to Docker daemon' — the daemon is not running.",
      },
    ],
  },
  verify: {
    heading: 'How to Verify Docker Works',
    sections: [
      {
        title: 'The 3 essential checks',
        text: 'After installing Docker, always run these three commands to confirm everything is working correctly.',
      },
      {
        title: 'Check 1 — docker --version',
        text: 'Prints the installed Docker version. If this works, the CLI is installed.\nExample output: Docker version 24.0.5, build ced0996',
      },
      {
        title: 'Check 2 — docker info',
        text: 'Shows detailed information about the Docker installation — server version, number of containers, images, storage driver, kernel version, and more. If this works, the daemon is running and the CLI can reach it.',
      },
      {
        title: 'Check 3 — docker run hello-world',
        text: "This is the definitive test. It pulls a tiny image from Docker Hub, runs it as a container, prints 'Hello from Docker!', and exits. If you see this message, Docker is fully working end-to-end.",
      },
      {
        title: 'Common issue',
        text: "If you get 'permission denied' on Linux, you haven't added your user to the docker group yet. Run: sudo usermod -aG docker $USER then log out and back in.",
      },
    ],
  },
};

// ─── Terminal line renderer ──────────────────────────────────────────────────

interface TermLine {
  text: string;
  type: 'cmd' | 'out' | 'success';
  checkIndex?: number;
}

const renderTermLine = (line: TermLine) => {
  if (line.type === 'cmd') {
    const dollarIdx = line.text.indexOf('$ ');
    if (dollarIdx >= 0) {
      return (
        <>
          <span className="text-emerald-400">{line.text.slice(0, dollarIdx + 2)}</span>
          <span className="text-foreground">{line.text.slice(dollarIdx + 2)}</span>
        </>
      );
    }
    return <span className="text-foreground">{line.text}</span>;
  }
  if (line.type === 'success') return <span className="text-emerald-400">{line.text}</span>;
  return <span className="text-foreground/50">{line.text}</span>;
};

// ─── Animation 1: Docker Desktop ─────────────────────────────────────────────

const AnimDockerDesktop = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => setPhase(1), 600);
    schedule(() => setPhase(2), 1600);
    schedule(() => setPhase(3), 2400);
    schedule(() => setPhase(4), 3000);
    schedule(onDone, 3600);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  const INSTALL_STEPS = ['Extracting files...', 'Installing Docker Engine...', 'Installing Docker CLI...', 'Setting up Docker Compose...'];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-3">
      {/* Browser / Installer mockup */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="w-full max-w-md rounded-lg border overflow-hidden"
        style={{ borderColor: '#06B6D440', background: '#0D1117' }}
      >
        {/* Title bar */}
        <div className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ borderColor: '#1F2D45', background: '#0F172A' }}>
          <div className="flex gap-1.5">
            <div className="w-2 h-2 rounded-full bg-red-500/70" />
            <div className="w-2 h-2 rounded-full bg-amber-500/70" />
            <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
          </div>
          <div className="flex-1 rounded px-2 py-0.5 text-[10px] font-mono text-muted-foreground" style={{ background: '#070B14' }}>
            {phase < 2 ? '🔒 hub.docker.com/get-docker' : '🐳 Docker Desktop Installer'}
          </div>
        </div>

        {/* Content area */}
        <div className="p-4 min-h-[180px] flex flex-col items-center justify-center gap-3">
          {/* Phase 0: Download page */}
          {phase < 1 && (
            <>
              <span className="text-3xl">🐳</span>
              <p className="text-[10px] text-muted-foreground font-mono">Step 1: Download from docker.com</p>
              <motion.button
                animate={{ boxShadow: ['0 0 8px #06B6D440', '0 0 20px #06B6D460', '0 0 8px #06B6D440'] }}
                transition={{ repeat: Infinity, duration: 1.5 }}
                className="px-4 py-2 rounded-lg text-xs font-syne font-bold"
                style={{ background: '#06B6D4', color: '#070B14' }}
              >
                Download Docker Desktop
              </motion.button>
            </>
          )}

          {/* Phase 1: Download progress */}
          {phase === 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="w-full max-w-xs flex flex-col items-center gap-3">
              <motion.div
                initial={{ y: -20, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                transition={{ duration: 0.4 }}
                className="text-3xl"
              >
                💾
              </motion.div>
              <div className="w-full">
                <div className="flex justify-between text-[10px] font-mono text-muted-foreground mb-1">
                  <span>DockerDesktop.dmg</span>
                  <span>540 MB</span>
                </div>
                <div className="h-2.5 rounded-full bg-secondary/50 overflow-hidden">
                  <motion.div
                    initial={{ width: '0%' }}
                    animate={{ width: '100%' }}
                    transition={{ duration: 0.8, ease: 'easeInOut' }}
                    className="h-full rounded-full"
                    style={{ background: 'linear-gradient(90deg, #06B6D480, #06B6D4)' }}
                  />
                </div>
              </div>
              <p className="text-[10px] text-muted-foreground font-mono">Downloading...</p>
            </motion.div>
          )}

          {/* Phase 2+: Install wizard */}
          {phase >= 2 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="w-full">
              <h4 className="text-xs font-syne font-bold text-foreground mb-2 text-center">Docker Desktop Installer</h4>
              <div className="h-2 rounded-full bg-secondary/50 overflow-hidden mb-3">
                <motion.div
                  initial={{ width: '0%' }}
                  animate={{ width: '100%' }}
                  transition={{ duration: 0.6, ease: 'easeOut' }}
                  className="h-full rounded-full"
                  style={{ background: 'linear-gradient(90deg, #06B6D480, #06B6D4)' }}
                />
              </div>
              <div className="space-y-1">
                {INSTALL_STEPS.map((step, i) => (
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: -8 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: i * 0.15 }}
                    className="flex items-center gap-2 text-[11px] font-mono"
                  >
                    <span className="text-emerald-400">✓</span>
                    <span className="text-foreground/60">{step}</span>
                  </motion.div>
                ))}
              </div>

              {phase >= 3 && (
                <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} className="mt-3 text-center">
                  <span className="text-xs font-mono text-emerald-400">Installation Complete ✓</span>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: [0, 1.3, 1] }} transition={{ duration: 0.4 }} className="text-3xl mt-1">
                    🐳
                  </motion.div>
                  <span className="text-[9px] text-muted-foreground font-mono">Docker Desktop running in system tray</span>
                </motion.div>
              )}
            </motion.div>
          )}
        </div>
      </motion.div>

      {/* Success banner */}
      {phase >= 4 && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="px-4 py-2 rounded-lg"
          style={{ background: '#10B98110', border: '1px solid #10B98130' }}
        >
          <span className="text-emerald-400 font-mono text-sm">✅ Docker Desktop installed — Mac & Windows users are ready to go!</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 2: Linux Install ──────────────────────────────────────────────

const LINUX_LINES: TermLine[] = [
  { text: 'user@ubuntu:~$ sudo apt-get update', type: 'cmd' },
  { text: '  Hit:1 http://archive.ubuntu.com/ubuntu jammy InRelease', type: 'out' },
  { text: '  Get:2 http://archive.ubuntu.com/ubuntu jammy-updates InRelease', type: 'out' },
  { text: '  Reading package lists... Done', type: 'out' },
  { text: 'user@ubuntu:~$ sudo apt-get install docker.io -y', type: 'cmd' },
  { text: '  Reading package lists... Done', type: 'out' },
  { text: '  Building dependency tree... Done', type: 'out' },
  { text: '  The following NEW packages will be installed: docker.io', type: 'out' },
  { text: '  Setting up docker.io (24.0.5-0ubuntu1) ...', type: 'out' },
  { text: '  ✓ docker.io installed', type: 'success' },
  { text: 'user@ubuntu:~$ sudo systemctl start docker', type: 'cmd' },
  { text: '  Started Docker Application Container Engine.', type: 'out' },
  { text: 'user@ubuntu:~$ sudo systemctl enable docker', type: 'cmd' },
  { text: '  Created symlink → docker.service', type: 'out' },
  { text: '  ✓ Docker will start on boot', type: 'success' },
  { text: 'user@ubuntu:~$ docker --version', type: 'cmd' },
  { text: '  Docker version 24.0.5, build ced0996 ✓', type: 'success' },
];

const AnimLinuxInstall = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [shown, setShown] = useState(0);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    LINUX_LINES.forEach((_, i) =>
      schedule(() => setShown(i + 1), 300 + i * 160),
    );
    schedule(onDone, 300 + LINUX_LINES.length * 160 + 400);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [shown]);

  return (
    <div className="w-full h-full flex items-center justify-center p-4">
      <div className="w-full max-w-lg rounded-lg overflow-hidden border" style={{ borderColor: '#F9731640' }}>
        <div className="flex items-center gap-2 px-3 py-1.5 border-b" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          <span className="text-[10px] font-mono text-muted-foreground ml-1">🐧 ubuntu terminal</span>
        </div>
        <div ref={scrollRef} className="terminal-black p-3 overflow-y-auto font-mono text-[12px] leading-5" style={{ maxHeight: 300 }}>
          {LINUX_LINES.slice(0, shown).map((line, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
              {renderTermLine(line)}
            </motion.div>
          ))}
          {shown < LINUX_LINES.length && (
            <span className="inline-block w-2 h-4 bg-foreground/50" style={{ animation: 'blink 1s infinite' }} />
          )}
        </div>
        {shown >= LINUX_LINES.length && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="px-3 py-2 text-center" style={{ background: '#10B98110', borderTop: '1px solid #10B98130' }}>
            <span className="text-emerald-400 font-mono text-xs">✅ Docker installed on Linux via apt</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Animation 3: What Gets Installed (Component Stack) ──────────────────────

const AnimComponents = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const { schedule, clearAll } = usePausableTimers(paused);
  useEffect(() => { schedule(onDone, 3200); return clearAll; }, [onDone, schedule, clearAll]);

  const ENGINE_PARTS = [
    { name: 'Docker Daemon (dockerd)', icon: '⚙️', desc: 'Background service that manages everything', delay: 0.6 },
    { name: 'Docker CLI', icon: '>_', desc: "The 'docker' command you type in terminal", delay: 0.9 },
    { name: 'REST API', icon: '🔌', desc: 'CLI talks to daemon through this API', delay: 1.2 },
  ];

  return (
    <div className="w-full h-full flex flex-col items-center justify-center p-4 gap-2">
      {/* OS */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-lg border px-8 py-2 text-center"
        style={{ borderColor: '#8B5CF650', background: '#8B5CF610' }}
      >
        <span className="text-xs font-mono text-purple-400 font-bold">Your Operating System</span>
      </motion.div>

      {/* Arrow */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}>
        <svg width="20" height="20"><line x1="10" y1="0" x2="10" y2="20" stroke="#8B5CF6" strokeWidth="2" strokeDasharray="4 3" opacity="0.5" style={{ animation: 'dashFlow 1.2s linear infinite' }} /></svg>
      </motion.div>

      {/* Docker Engine box */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.5 }}
        className="rounded-lg border-2 p-4"
        style={{ borderColor: '#8B5CF650', background: '#8B5CF608' }}
      >
        <span className="text-xs font-mono font-bold text-purple-400 mb-3 block text-center">Docker Engine</span>
        <div className="flex gap-3">
          {ENGINE_PARTS.map(comp => (
            <motion.div
              key={comp.name}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: comp.delay }}
              className="rounded border p-2 text-center min-w-[90px]"
              style={{ borderColor: '#8B5CF640', background: '#8B5CF610' }}
            >
              <div className="text-sm">{comp.icon}</div>
              <div className="text-[9px] font-mono text-purple-300 font-bold">{comp.name}</div>
              <div className="text-[8px] text-muted-foreground mt-0.5">{comp.desc}</div>
            </motion.div>
          ))}
        </div>
      </motion.div>

      {/* Arrow */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.3 }}>
        <svg width="20" height="20"><line x1="10" y1="0" x2="10" y2="20" stroke="#8B5CF6" strokeWidth="2" strokeDasharray="4 3" opacity="0.5" style={{ animation: 'dashFlow 1.2s linear infinite' }} /></svg>
      </motion.div>

      {/* containerd + runc */}
      <motion.div
        initial={{ opacity: 0, y: 16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 1.5 }}
        className="flex gap-4"
      >
        {[
          { name: 'containerd', icon: '📦', desc: 'Manages container lifecycle', d: 0 },
          { name: 'runc', icon: '⚡', desc: 'Executes containers via Linux kernel', d: 0.2 },
        ].map(comp => (
          <motion.div
            key={comp.name}
            initial={{ opacity: 0, scale: 0.8 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: 1.5 + comp.d }}
            className="rounded-lg border p-2.5 text-center"
            style={{ borderColor: '#8B5CF640', background: '#8B5CF610' }}
          >
            <span className="text-sm">{comp.icon}</span>
            <div className="text-[9px] font-mono text-purple-300 font-bold">{comp.name}</div>
            <div className="text-[8px] text-muted-foreground">{comp.desc}</div>
          </motion.div>
        ))}
      </motion.div>

      {/* Request flow chain */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0 }}
        className="flex items-center gap-1.5 mt-1"
      >
        {['CLI', '→', 'API', '→', 'Daemon', '→', 'containerd', '→', 'runc'].map((item, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 2.0 + i * 0.08 }}
            className={`text-[10px] font-mono ${item === '→' ? 'text-purple-500' : 'text-purple-300'}`}
          >
            {item}
          </motion.span>
        ))}
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.6 }}
        className="px-4 py-2 rounded-lg mt-1"
        style={{ background: '#8B5CF610', border: '1px solid #8B5CF630' }}
      >
        <span className="text-purple-400 font-mono text-[11px]">When you type &apos;docker run&apos; — this entire stack activates in milliseconds</span>
      </motion.div>
    </div>
  );
};

// ─── Animation 4: Docker Daemon (Hub-and-Spoke) ──────────────────────────────

const DAEMON_NODES = [
  { id: 'cli', label: 'Docker CLI', sub: 'Sends commands', icon: '>_', left: '15%', top: '18%', delay: 0.5 },
  { id: 'hub', label: 'Docker Hub', sub: 'Pulls images', icon: '☁️', left: '80%', top: '18%', delay: 0.7 },
  { id: 'containers', label: 'Containers', sub: 'Creates & manages', icon: '📦', left: '15%', top: '68%', delay: 0.9 },
  { id: 'images', label: 'Images', sub: 'Builds & stores', icon: '🖼️', left: '80%', top: '68%', delay: 1.1 },
];

const DAEMON_LINES = [
  { x1: '22%', y1: '24%', x2: '43%', y2: '40%', delay: 0.6 },
  { x1: '74%', y1: '24%', x2: '57%', y2: '40%', delay: 0.8 },
  { x1: '22%', y1: '64%', x2: '43%', y2: '52%', delay: 1.0 },
  { x1: '74%', y1: '64%', x2: '57%', y2: '52%', delay: 1.2 },
];

const AnimDaemon = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [flowStep, setFlowStep] = useState(0);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => setFlowStep(1), 1500);
    schedule(() => setFlowStep(2), 1800);
    schedule(() => setFlowStep(3), 2100);
    schedule(onDone, 3000);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  return (
    <div className="relative w-full h-full overflow-hidden">
      {/* Center daemon */}
      <motion.div
        initial={{ opacity: 0, scale: 0.5 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4, type: 'spring' }}
        className="absolute left-1/2 top-[44%] -translate-x-1/2 -translate-y-1/2 z-10"
      >
        <div
          className={`rounded-xl border-2 p-4 flex flex-col items-center gap-1 transition-all duration-300 ${flowStep === 2 ? 'ring-2 ring-emerald-400/50' : ''}`}
          style={{ borderColor: '#10B98160', background: '#10B98110', animation: 'glowPulse 2s ease-in-out infinite' }}
        >
          <span className="text-2xl">🐳</span>
          <span className="text-xs font-mono font-bold text-emerald-400">Docker Daemon</span>
        </div>
      </motion.div>

      {/* Spoke nodes */}
      {DAEMON_NODES.map(node => {
        const isHighlight = (flowStep === 1 && node.id === 'cli') || (flowStep === 3 && node.id === 'containers');
        return (
          <motion.div
            key={node.id}
            initial={{ opacity: 0, scale: 0.5 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ delay: node.delay, type: 'spring', stiffness: 200 }}
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2"
            style={{ left: node.left, top: node.top }}
          >
            <div
              className={`rounded-lg border p-2.5 flex flex-col items-center gap-0.5 transition-all duration-300 ${isHighlight ? 'ring-2 ring-emerald-400/50' : ''}`}
              style={{ borderColor: isHighlight ? '#10B981' : '#10B98140', background: '#0F172A' }}
            >
              <span className="text-sm">{node.icon}</span>
              <span className="text-[10px] font-mono text-emerald-300 font-bold">{node.label}</span>
              <span className="text-[8px] text-muted-foreground">{node.sub}</span>
            </div>
          </motion.div>
        );
      })}

      {/* SVG lines connecting nodes to daemon center */}
      <svg className="absolute inset-0 w-full h-full pointer-events-none">
        {DAEMON_LINES.map((line, i) => (
          <motion.line
            key={i}
            x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2}
            stroke="#10B981" strokeWidth="2" strokeDasharray="6 4"
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.4 }}
            transition={{ delay: line.delay, duration: 0.3 }}
            style={{ animation: 'dashFlow 1.2s linear infinite' }}
          />
        ))}
      </svg>

      {/* Socket info */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 2.0 }}
        className="absolute bottom-16 left-1/2 -translate-x-1/2 z-10"
      >
        <div className="rounded px-3 py-1.5 font-mono text-[10px] whitespace-nowrap" style={{ background: '#0D1117', border: '1px solid #10B98130' }}>
          <span className="text-emerald-400">● dockerd</span>
          <span className="text-muted-foreground"> listening on </span>
          <span className="text-emerald-300">/var/run/docker.sock</span>
        </div>
      </motion.div>

      {/* Summary */}
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.4 }}
        className="absolute bottom-4 left-1/2 -translate-x-1/2 px-4 py-2 rounded-lg z-10"
        style={{ background: '#10B98110', border: '1px solid #10B98130' }}
      >
        <span className="text-emerald-400 font-mono text-[11px]">The Docker Daemon is always running in the background, waiting for commands</span>
      </motion.div>
    </div>
  );
};

// ─── Animation 5: Verify Installation ────────────────────────────────────────

const VERIFY_LINES: TermLine[] = [
  { text: 'user@docker:~$ docker --version', type: 'cmd' },
  { text: '  Docker version 24.0.5, build ced0996', type: 'success', checkIndex: 0 },
  { text: 'user@docker:~$ docker info', type: 'cmd' },
  { text: '  Client: Docker Engine - Community', type: 'out' },
  { text: '  Server Version: 24.0.5', type: 'out' },
  { text: '  Containers: 0  Running: 0  Stopped: 0', type: 'out' },
  { text: '  Images: 0', type: 'out', checkIndex: 1 },
  { text: 'user@docker:~$ docker run hello-world', type: 'cmd' },
  { text: "  Unable to find image 'hello-world:latest' locally", type: 'out' },
  { text: '  latest: Pulling from library/hello-world', type: 'out' },
  { text: '  Status: Downloaded newer image', type: 'out' },
  { text: '  Hello from Docker! 🐳', type: 'success' },
  { text: '  Your installation appears to be working correctly.', type: 'success', checkIndex: 2 },
];

const CHECKLIST = ['Docker version verified', 'Docker daemon running', 'Hello-world container works'];

const AnimVerify = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [shown, setShown] = useState(0);
  const [checks, setChecks] = useState([false, false, false]);
  const [allDone, setAllDone] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    VERIFY_LINES.forEach((line, i) => {
      const delay = 400 + i * 160;
      schedule(() => {
        setShown(i + 1);
        if (line.checkIndex !== undefined) {
          setChecks(prev => { const next = [...prev]; next[line.checkIndex!] = true; return next; });
        }
      }, delay);
    });
    const lastDelay = 400 + VERIFY_LINES.length * 160;
    schedule(() => setAllDone(true), lastDelay + 300);
    schedule(onDone, lastDelay + 600);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [shown]);

  return (
    <div className="w-full h-full flex gap-3 p-4">
      {/* Terminal (65%) */}
      <div className="flex-[65] rounded-lg overflow-hidden border flex flex-col" style={{ borderColor: '#F59E0B40' }}>
        <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
          <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
          <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
          <span className="text-[10px] font-mono text-muted-foreground ml-1">verification</span>
        </div>
        <div ref={scrollRef} className="terminal-black p-3 overflow-y-auto font-mono text-[11px] leading-5 flex-1">
          {VERIFY_LINES.slice(0, shown).map((line, i) => (
            <motion.div key={i} initial={{ opacity: 0, x: -6 }} animate={{ opacity: 1, x: 0 }} transition={{ duration: 0.15 }}>
              {renderTermLine(line)}
            </motion.div>
          ))}
          {shown < VERIFY_LINES.length && (
            <span className="inline-block w-2 h-4 bg-foreground/50" style={{ animation: 'blink 1s infinite' }} />
          )}
        </div>
      </div>

      {/* Checklist (35%) */}
      <div className="flex-[35] rounded-lg border p-3 flex flex-col" style={{ borderColor: '#F59E0B30', background: '#0F172A' }}>
        <h4 className="text-xs font-syne font-bold text-amber-400 mb-3">Install Checklist</h4>
        <div className="space-y-2.5">
          {CHECKLIST.map((item, i) => (
            <div key={i} className="flex items-center gap-2">
              {checks[i] ? (
                <motion.span
                  initial={{ scale: 0 }}
                  animate={{ scale: 1 }}
                  transition={{ type: 'spring', stiffness: 400, damping: 20 }}
                  className="w-5 h-5 rounded flex items-center justify-center text-xs shrink-0"
                  style={{ background: '#10B98120', color: '#10B981' }}
                >
                  ✓
                </motion.span>
              ) : (
                <span className="w-5 h-5 rounded border shrink-0 flex items-center justify-center text-[10px] text-muted-foreground" style={{ borderColor: '#1F2D45' }}>
                  □
                </span>
              )}
              <span className={`text-[11px] font-mono ${checks[i] ? 'text-emerald-400' : 'text-muted-foreground'}`}>
                {item}
              </span>
            </div>
          ))}
        </div>
        {allDone && (
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mt-auto pt-3 px-3 py-2 rounded-lg text-center"
            style={{ background: '#F59E0B10', border: '1px solid #F59E0B30' }}
          >
            <span className="text-amber-400 font-mono text-[11px]">🎉 Docker is installed and working correctly!</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

const Level3Interactive = () => {
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
    if (wasNew && !completedLevels.includes(3)) completeLevel(3);

    if (next.size === 5 && !levelDone) {
      setLevelDone(true);
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
            <p className="text-[10px] text-muted-foreground font-mono">Level 3 — Installing Docker</p>
          </div>
        </div>
        <div className="flex items-center gap-4">
          <span className="font-syne font-bold text-amber-400 text-sm">⚡ {localXP}</span>
          <div className="hidden sm:flex items-center gap-1.5">
            {TOPICS.map(topic => (
              <div
                key={topic.id}
                className="w-2.5 h-2.5 rounded-full border transition-colors duration-300"
                style={{
                  borderColor: completed.has(topic.id) ? topic.color : '#1F2D45',
                  backgroundColor: completed.has(topic.id) ? topic.color : 'transparent',
                }}
              />
            ))}
          </div>
          <span className="text-xs font-mono text-muted-foreground">{completed.size}/5</span>
        </div>
      </nav>

      {/* ─── Level Complete Banner ─── */}
      <AnimatePresence>
        {levelDone && (
          <motion.div
            initial={{ height: 0, opacity: 0 }}
            animate={{ height: 'auto', opacity: 1 }}
            className="shrink-0 bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-3 flex items-center justify-between"
          >
            <span className="font-syne font-bold text-emerald-400 text-sm">
              🎉 Level 3 Complete! +100 XP — Docker is installed and ready!
            </span>
            <button
              onClick={() => navigate('/level/4')}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-syne font-bold text-xs hover:opacity-90 transition-opacity"
            >
              Continue to Level 4 →
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
                    isActive
                      ? `${topic.bgTint} ${topic.borderClass} ${topic.colorClass}`
                      : isDone
                        ? 'bg-emerald-500/10 border-emerald-500/40 text-emerald-400'
                        : 'bg-secondary/30 border-border text-muted-foreground hover:border-muted-foreground/50'
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
                  {active === 'docker-desktop' && <AnimDockerDesktop onDone={handleAnimDone} paused={paused} />}
                  {active === 'linux-install' && <AnimLinuxInstall onDone={handleAnimDone} paused={paused} />}
                  {active === 'components' && <AnimComponents onDone={handleAnimDone} paused={paused} />}
                  {active === 'daemon' && <AnimDaemon onDone={handleAnimDone} paused={paused} />}
                  {active === 'verify' && <AnimVerify onDone={handleAnimDone} paused={paused} />}
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

          {/* Install Log (Terminal-style) */}
          <div className="shrink-0 border-t border-border" style={{ height: 200 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: '#0D1117' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-[10px] font-mono text-muted-foreground ml-1">docker-quest install log</span>
            </div>
            <div ref={logRef} className="terminal-black p-3 overflow-y-auto font-mono text-[13px] leading-5" style={{ height: 'calc(200px - 28px)' }}>
              {infoLines.length === 0 ? (
                <span className="text-muted-foreground/50">
                  {'> Click a topic to see installation details...'}
                  <span className="inline-block w-2 h-4 bg-muted-foreground/50 ml-1" style={{ animation: 'blink 1s infinite' }} />
                </span>
              ) : (
                infoLines.map((line, i) => (
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

        {/* Right Panel — Concept Notes */}
        <div className="flex-[42] overflow-y-auto min-h-0" style={{ background: '#0F172A' }}>
          <div className="p-4">
            {/* Panel header */}
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <span>📖</span>
                <h2 className="font-syne font-bold text-foreground text-sm">Installation Guide</h2>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">Level 3 — Installing Docker</span>
            </div>

            {/* Concept intro card */}
            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: '#1E3A5F', background: '#0F172A' }}>
              <h3 className="font-syne font-bold text-foreground text-sm mb-2">🔧 Installing Docker</h3>
              <p className="text-xs text-foreground/70 leading-relaxed">
                Docker can be installed on any major operating system. On Mac and Windows,
                Docker Desktop provides a GUI application that bundles everything you need.
                On Linux, you install Docker Engine directly via the package manager. Either
                way, the result is the same: the Docker Daemon runs in the background, and
                the Docker CLI lets you control it from your terminal.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['macOS', 'Windows', 'Linux', 'Docker Desktop', 'Docker Engine'].map(tag => (
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
                    isActive
                      ? `${topic.borderClass} ${topic.bgTint}`
                      : isDone
                        ? 'border-emerald-500/30 bg-card'
                        : 'border-border bg-card hover:border-muted-foreground/30'
                  }`}
                  style={isActive ? { boxShadow: topic.glowStyle, transform: 'scale(1.01)' } : {}}
                  layout
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full" style={{ backgroundColor: topic.color }} />
                      <span className={`font-mono font-bold text-xs ${isActive ? topic.colorClass : isDone ? 'text-emerald-400' : 'text-foreground'}`}>
                        {data.heading}
                      </span>
                    </div>
                    {isDone && (
                      <span className="text-[10px] font-mono text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded">✓ Completed</span>
                    )}
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

export default Level3Interactive;
