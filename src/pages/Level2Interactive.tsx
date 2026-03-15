import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { usePausableTimers } from '@/hooks/usePausableTimers';

type TopicId = 'vm-arch' | 'container-arch' | 'comparison' | 'isolation' | 'resources';

interface TopicMeta {
  id: TopicId;
  label: string;
  color: string;
  colorClass: string;
  borderClass: string;
  bgTint: string;
  glowStyle: string;
}

const TOPICS: TopicMeta[] = [
  { id: 'vm-arch', label: 'VM Architecture', color: '#F97316', colorClass: 'text-orange-400', borderClass: 'border-orange-500', bgTint: 'bg-orange-500/10', glowStyle: '0 0 12px rgba(249,115,22,0.4)' },
  { id: 'container-arch', label: 'Container Architecture', color: '#06B6D4', colorClass: 'text-cyan-400', borderClass: 'border-cyan-500', bgTint: 'bg-cyan-500/10', glowStyle: '0 0 12px rgba(6,182,212,0.4)' },
  { id: 'comparison', label: 'VM vs Container', color: '#8B5CF6', colorClass: 'text-purple-400', borderClass: 'border-purple-500', bgTint: 'bg-purple-500/10', glowStyle: '0 0 12px rgba(139,92,246,0.4)' },
  { id: 'isolation', label: 'App Isolation', color: '#10B981', colorClass: 'text-emerald-400', borderClass: 'border-emerald-500', bgTint: 'bg-emerald-500/10', glowStyle: '0 0 12px rgba(16,185,129,0.4)' },
  { id: 'resources', label: 'Resource Use', color: '#F59E0B', colorClass: 'text-amber-400', borderClass: 'border-amber-500', bgTint: 'bg-amber-500/10', glowStyle: '0 0 12px rgba(245,158,11,0.4)' },
];

const INFO_LOGS: Record<TopicId, { prefix: string; lines: string[] }> = {
  'vm-arch': {
    prefix: '> Loading: VM Architecture',
    lines: [
      '# Virtual Machines require a full Guest OS per instance',
      '# Hypervisor sits between hardware and VMs',
      '# Each VM is isolated at the hardware level',
      '# Typical VM size: 1GB to 20GB',
      '# VM boot time: 60 to 120 seconds',
      '> Concept loaded ✓',
    ],
  },
  'container-arch': {
    prefix: '> Loading: Container Architecture',
    lines: [
      '# Containers share the Host OS kernel — no Guest OS needed',
      '# Docker Engine manages container creation and lifecycle',
      '# Each container gets its own filesystem, network, and process space',
      '# Typical container size: 50MB to 200MB',
      '# Container start time: milliseconds to 1 second',
      '> Concept loaded ✓',
    ],
  },
  comparison: {
    prefix: '> Loading: Comparison Mode',
    lines: [
      '# Size:      VM ~10GB   vs  Container ~100MB  → Container wins',
      '# Speed:     VM ~2min   vs  Container ~1sec   → Container wins',
      '# Overhead:  VM needs hypervisor layer        → Container uses host OS',
      '# Use VMs when you need complete OS isolation or run different OSes',
      '# Use containers for microservices, CI/CD, and scalable apps',
      '> Comparison complete ✓',
    ],
  },
  isolation: {
    prefix: '> Loading: Isolation Demo',
    lines: [
      '# Each container runs in its own isolated process namespace',
      "# Containers cannot access each other's filesystem by default",
      '# Port mapping controls which ports are reachable from outside',
      '# Example: docker run -p 3000:3000 my-node-app',
      '# Container A on port 3000 and Container B on port 8000 coexist safely',
      '> Isolation demo complete ✓',
    ],
  },
  resources: {
    prefix: '> Loading: Resource Benchmark',
    lines: [
      '# 5 VMs running:  ~40GB RAM  |  ~100GB Disk  |  ~10 min boot',
      '# 5 Containers:   ~2GB RAM   |  ~1GB Disk    |  ~5 sec boot',
      '# Containers use approximately 20x less memory than equivalent VMs',
      '# This is why containers are preferred for cloud-native deployments',
      '# Lower resource usage = lower infrastructure costs',
      '> Benchmark complete ✓',
    ],
  },
};

interface CardSection {
  title: string;
  text: string;
}

const CARD_DATA: Record<TopicId, { heading: string; sections: CardSection[] }> = {
  'vm-arch': {
    heading: 'How Virtual Machines Work',
    sections: [
      {
        title: 'What it is',
        text: 'A Virtual Machine (VM) is a software-based emulation of a physical computer. A piece of software called a hypervisor sits on top of physical hardware and creates multiple isolated virtual computers. Each VM runs its own complete operating system — called a Guest OS — completely independent from the others.',
      },
      {
        title: 'Key components',
        text: 'Physical Hardware → Hypervisor → Virtual Machines → Guest OS → App',
      },
      {
        title: 'The downside',
        text: 'Because each VM includes a full OS, they are large (1–20 GB each), slow to boot (1–2 minutes), and consume significant CPU and RAM even when idle.',
      },
      {
        title: 'Real example',
        text: 'AWS EC2 instances, VMware vSphere, and VirtualBox are all VM technologies.',
      },
    ],
  },
  'container-arch': {
    heading: 'How Docker Containers Work',
    sections: [
      {
        title: 'What it is',
        text: "A container is a lightweight, isolated process that shares the host machine's operating system kernel. Instead of virtualizing hardware like VMs do, containers virtualize at the OS level. Docker Engine manages containers and provides each one with its own filesystem, network interface, and process space.",
      },
      {
        title: 'Key components',
        text: 'Physical Hardware → Host OS → Docker Engine → Containers → App',
      },
      {
        title: 'The advantage',
        text: 'No Guest OS means containers are tiny (50–200 MB), start in under a second, and use a fraction of the resources that VMs need.',
      },
      {
        title: 'Real example',
        text: 'Every app on Docker Hub — nginx, postgres, redis, node — runs as a container.',
      },
    ],
  },
  comparison: {
    heading: 'Key Differences at a Glance',
    sections: [
      {
        title: 'Overview',
        text: 'The table below shows the most important practical differences between running an app in a VM versus a Docker container. These differences explain why the industry shifted toward containers for most modern workloads.',
      },
      {
        title: 'Comparison',
        text: 'Size: VM = 1–20 GB / Container = 50–200 MB\nBoot time: VM = 1–2 min / Container = < 1 sec\nOS overhead: VM = Full Guest OS / Container = Shared Host OS\nIsolation: VM = Hardware-level / Container = Process-level\nPerformance: VM = Hypervisor tax / Container = Near-native\nPortability: VM = Limited / Container = Runs anywhere',
      },
      {
        title: 'When to use VMs',
        text: 'Use VMs when you need to run a completely different OS (e.g., Windows app on Linux server), require full hardware-level isolation for security compliance, or are running legacy applications that cannot be containerized.',
      },
    ],
  },
  isolation: {
    heading: 'How Container Isolation Works',
    sections: [
      {
        title: 'What it is',
        text: 'Even though multiple containers share the same host OS kernel, they are completely isolated from each other using Linux kernel features called namespaces and cgroups. Each container gets its own view of the filesystem, network, process IDs, and user space.',
      },
      {
        title: 'Namespaces explained',
        text: 'Linux namespaces are what make isolation possible. The PID namespace means Container A cannot see the processes inside Container B. The network namespace means each container gets its own IP address and port space. The filesystem namespace means each container sees only its own files.',
      },
      {
        title: 'Practical impact',
        text: "You can run Node.js v14 in Container A and Node.js v18 in Container B on the same machine with zero conflicts. You can have two containers both binding to port 3000 internally — Docker's port mapping handles the external routing.",
      },
      {
        title: 'Security note',
        text: 'Container isolation is strong but not as absolute as VM isolation. For highly sensitive workloads, VMs or VM+container combinations are preferred.',
      },
    ],
  },
  resources: {
    heading: 'Why Containers Are More Efficient',
    sections: [
      {
        title: 'The core reason',
        text: 'VMs waste resources because they must run a full operating system at all times — even when the app inside is idle. The Guest OS itself consumes RAM, CPU cycles, and disk space. Docker containers eliminate this overhead entirely by sharing the host OS kernel.',
      },
      {
        title: 'Numbers that matter',
        text: 'A typical Node.js app in a VM might require a 2GB VM image just to boot. The same app in a Docker container using node:alpine is only ~180MB. Startup time drops from 60+ seconds to under 1 second.',
      },
      {
        title: 'At scale',
        text: 'A server running 5 VMs might max out with 40GB RAM. The same server can comfortably run 50–100 containers using the same resources. This is why container-based microservices are the foundation of cloud infrastructure at companies like Netflix, Uber, and Airbnb.',
      },
      {
        title: 'Cost impact',
        text: 'Fewer resources per workload = fewer servers needed = direct cost reduction. This is a major reason why Docker adoption exploded in production environments.',
      },
    ],
  },
};

// ─── Shared Layer Box ────────────────────────────────────────────────────────

const LayerBox = ({
  children,
  color,
  delay = 0,
  className = '',
  glow = false,
}: {
  children: React.ReactNode;
  color: string;
  delay?: number;
  className?: string;
  glow?: boolean;
}) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4, ease: 'easeOut' }}
    className={`rounded-lg border px-4 py-2 text-center ${className}`}
    style={{
      borderColor: `${color}50`,
      background: `${color}10`,
      boxShadow: glow ? `0 0 16px ${color}30` : undefined,
    }}
  >
    {children}
  </motion.div>
);

// ─── Animation 1: VM Architecture ────────────────────────────────────────────

const AnimVMArch = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const { schedule, clearAll } = usePausableTimers(paused);
  useEffect(() => { schedule(onDone, 3200); return clearAll; }, [onDone, schedule, clearAll]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden px-4">
      <div className="flex flex-col items-center gap-2">
        {/* Size indicator — top of visual, appears late */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.4 }}
          className="flex items-center gap-2 px-3 py-1.5 rounded-lg"
          style={{ background: '#F59E0B10', border: '1px solid #F59E0B30' }}
        >
          <span className="text-amber-400 text-[11px] font-mono">⚠️ Each VM: 1–20 GB | Boot: 1–2 minutes</span>
        </motion.div>

        {/* 3 VM boxes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.8, duration: 0.4 }}
          className="flex gap-3"
        >
          {['VM 1', 'VM 2', 'VM 3'].map((vm, i) => (
            <motion.div
              key={vm}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 0.8 + i * 0.15 }}
              className="rounded-lg border-2 border-dashed p-2 flex flex-col items-center gap-0.5"
              style={{ borderColor: '#F9731660' }}
            >
              <div className="text-[10px] font-mono font-bold text-orange-400">{vm}</div>
              <div className="rounded px-2 py-0.5 text-[9px]" style={{ background: '#EF444420', color: '#F87171' }}>Guest OS</div>
              <div className="rounded px-2 py-0.5 text-[9px]" style={{ background: '#F9731620', color: '#FB923C' }}>Binaries & Libs</div>
              <div className="rounded px-2 py-0.5 text-[9px]" style={{ background: '#F59E0B20', color: '#FBBF24' }}>App</div>
            </motion.div>
          ))}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1.2 }}
            className="flex items-center pl-1"
          >
            <span className="text-[9px] text-orange-400/60 font-mono writing-vertical" style={{ writingMode: 'vertical-rl' }}>
              Each VM = full OS copy
            </span>
          </motion.div>
        </motion.div>

        {/* Flowing arrows upward from hypervisor to VMs */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 2.0 }}
          className="flex items-center gap-1"
        >
          <svg width="180" height="24" className="overflow-visible">
            {[45, 90, 135].map((x, i) => (
              <line key={i} x1={x} y1="24" x2={x} y2="0" stroke="#F97316" strokeWidth="2" strokeDasharray="6 4" opacity="0.5" style={{ animation: 'dashFlow 1.2s linear infinite' }} />
            ))}
            <text x="30" y="18" fill="#F9731680" fontSize="8" fontFamily="JetBrains Mono">allocates resources</text>
          </svg>
        </motion.div>

        {/* Hypervisor */}
        <LayerBox color="#F97316" delay={0.4} className="w-72">
          <span className="text-xs font-mono font-bold" style={{ color: '#F97316' }}>HYPERVISOR</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">VMware / VirtualBox / Hyper-V</p>
          <p className="text-[9px] text-muted-foreground/70">Manages and allocates hardware to VMs</p>
        </LayerBox>

        {/* Hardware — bottom of stack, appears first */}
        <LayerBox color="#F97316" delay={0} className="w-72">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-mono font-bold" style={{ color: '#F97316' }}>PHYSICAL HARDWARE</span>
          </div>
          <div className="flex justify-center gap-3 mt-1">
            {['🖥️ CPU', '💾 RAM', '💿 Disk'].map(item => (
              <span key={item} className="text-[10px] text-muted-foreground">{item}</span>
            ))}
          </div>
        </LayerBox>
      </div>
    </div>
  );
};

// ─── Animation 2: Container Architecture ─────────────────────────────────────

const AnimContainerArch = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const { schedule, clearAll } = usePausableTimers(paused);
  useEffect(() => { schedule(onDone, 3200); return clearAll; }, [onDone, schedule, clearAll]);

  return (
    <div className="relative w-full h-full flex items-center justify-center overflow-hidden px-4">
      <div className="flex flex-col items-center gap-2">
        {/* Size + kernel note — top of visual, appears late */}
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.8 }}
          className="flex flex-col items-center gap-1"
        >
          <div className="flex items-center gap-2 px-3 py-1.5 rounded-lg" style={{ background: '#10B98110', border: '1px solid #10B98130' }}>
            <span className="text-emerald-400 text-[11px] font-mono">✅ Each container: 50–200 MB | Start: &lt; 1 second</span>
          </div>
          <span className="text-[9px] text-cyan-400/60 font-mono">Containers share the host OS kernel</span>
        </motion.div>

        {/* 3 Container boxes */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.2, duration: 0.4 }}
          className="flex gap-3"
        >
          {[1, 2, 3].map((c, i) => (
            <motion.div
              key={c}
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ delay: 1.2 + i * 0.15 }}
              className="rounded-lg border-2 p-2 flex flex-col items-center gap-0.5"
              style={{ borderColor: '#06B6D450', boxShadow: '0 0 12px rgba(6,182,212,0.15)' }}
            >
              <div className="text-[10px] font-mono font-bold text-cyan-400">Container {c}</div>
              <div className="rounded px-2 py-0.5 text-[9px]" style={{ background: '#06B6D420', color: '#22D3EE' }}>Binaries & Libs</div>
              <div className="rounded px-2 py-0.5 text-[9px]" style={{ background: '#06B6D420', color: '#67E8F9' }}>App</div>
            </motion.div>
          ))}
        </motion.div>

        {/* Docker Engine — glowing */}
        <LayerBox color="#06B6D4" delay={0.8} className="w-72" glow>
          <div className="flex items-center justify-center gap-2">
            <span className="text-sm">🐳</span>
            <span className="text-xs font-mono font-bold" style={{ color: '#06B6D4' }}>DOCKER ENGINE</span>
          </div>
          <p className="text-[10px] text-muted-foreground mt-0.5">Manages container lifecycle</p>
        </LayerBox>

        {/* Host OS */}
        <LayerBox color="#06B6D4" delay={0.4} className="w-72">
          <span className="text-xs font-mono font-bold" style={{ color: '#06B6D4' }}>HOST OPERATING SYSTEM</span>
          <p className="text-[10px] text-muted-foreground mt-0.5">Linux / macOS / Windows</p>
          <p className="text-[9px] text-muted-foreground/70">One OS. Shared by all containers.</p>
        </LayerBox>

        {/* Hardware — bottom, appears first */}
        <LayerBox color="#06B6D4" delay={0} className="w-72">
          <div className="flex items-center justify-center gap-2">
            <span className="text-xs font-mono font-bold" style={{ color: '#06B6D4' }}>PHYSICAL HARDWARE</span>
          </div>
          <div className="flex justify-center gap-3 mt-1">
            {['🖥️ CPU', '💾 RAM', '💿 Disk'].map(item => (
              <span key={item} className="text-[10px] text-muted-foreground">{item}</span>
            ))}
          </div>
        </LayerBox>
      </div>
    </div>
  );
};

// ─── Animation 3: Side-by-Side Comparison ────────────────────────────────────

const COMPARISON_ROWS: { label: string; left: string; right: string; neutral?: boolean }[] = [
  { label: 'Size', left: '1–20 GB per VM', right: '50–200 MB per container' },
  { label: 'Boot Time', left: '1–2 minutes', right: '< 1 second' },
  { label: 'OS Required', left: 'Full Guest OS per VM', right: 'Shares Host OS kernel' },
  { label: 'Isolation', left: 'Hardware-level isolation', right: 'Process-level isolation', neutral: true },
  { label: 'Performance', left: 'Overhead from hypervisor', right: 'Near-native performance' },
];

const AnimComparison = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const { schedule, clearAll } = usePausableTimers(paused);
  useEffect(() => { schedule(onDone, 3200); return clearAll; }, [onDone, schedule, clearAll]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden px-4">
      {/* Column headers */}
      <div className="flex w-full max-w-lg mb-4">
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex-1 text-center">
          <span className="text-sm font-syne font-bold text-orange-400">Virtual Machine</span>
        </motion.div>
        <div className="w-20" />
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.1 }} className="flex-1 text-center">
          <span className="text-sm font-syne font-bold text-cyan-400">Docker Container</span>
        </motion.div>
      </div>

      {/* Divider */}
      <div className="relative w-full max-w-lg">
        <div className="absolute left-1/2 top-0 bottom-0 w-px bg-border -translate-x-1/2" />

        <div className="space-y-3">
          {COMPARISON_ROWS.map((row, i) => (
            <div key={row.label} className="flex items-center">
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.35, duration: 0.3 }}
                className="flex-1 flex items-center gap-2 justify-end pr-3"
              >
                <span className="text-[11px] text-foreground/70 font-mono text-right">{row.left}</span>
                <span className={`w-2 h-2 rounded-full shrink-0 ${row.neutral ? 'bg-muted-foreground' : 'bg-orange-500'}`} />
              </motion.div>

              <motion.span
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ delay: 0.5 + i * 0.35 }}
                className="text-[10px] text-purple-400 font-mono font-bold w-20 text-center shrink-0"
              >
                {row.label}
              </motion.span>

              <motion.div
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.5 + i * 0.35, duration: 0.3 }}
                className="flex-1 flex items-center gap-2 pl-3"
              >
                <span className={`w-2 h-2 rounded-full shrink-0 ${row.neutral ? 'bg-muted-foreground' : 'bg-emerald-500'}`} />
                <span className="text-[11px] text-foreground/70 font-mono">{row.right}</span>
              </motion.div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.4 }}
        className="mt-6 px-4 py-2 rounded-lg"
        style={{ background: '#8B5CF610', border: '1px solid #8B5CF630' }}
      >
        <span className="text-purple-400 font-mono text-sm">🐳 Containers are faster, smaller, and more portable than VMs</span>
      </motion.div>
    </div>
  );
};

// ─── Animation 4: App Isolation ──────────────────────────────────────────────

const ISOLATION_CONTAINERS = [
  { name: 'Container A', tech: 'Node.js v16', app: 'React App', port: '3000', from: { x: -40, y: 0 } },
  { name: 'Container B', tech: 'Python v3.9', app: 'Django App', port: '8000', from: { x: 0, y: -40 } },
  { name: 'Container C', tech: 'Java v11', app: 'Spring App', port: '8080', from: { x: 40, y: 0 } },
];

const AnimIsolation = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [showWalls, setShowWalls] = useState(false);
  const [showLabels, setShowLabels] = useState(false);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => setShowWalls(true), 1400);
    schedule(() => setShowLabels(true), 1800);
    schedule(onDone, 2800);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden px-4">
      {/* Server platform */}
      <motion.div
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
        className="rounded-xl border-2 p-5"
        style={{ borderColor: '#10B98140', background: '#10B98108' }}
      >
        <div className="flex items-center gap-2 mb-4 justify-center">
          <span className="text-xl">🖥️</span>
          <span className="text-xs font-mono text-emerald-400 font-bold">Your Server</span>
        </div>

        {/* Containers row with walls */}
        <div className="flex items-stretch">
          {ISOLATION_CONTAINERS.map((c, i) => (
            <div key={c.name} className="flex items-stretch">
              <motion.div
                initial={{ opacity: 0, x: c.from.x, y: c.from.y }}
                animate={{ opacity: 1, x: 0, y: 0 }}
                transition={{ delay: 0.4 + i * 0.3, duration: 0.3, ease: 'easeOut' }}
                className="rounded-lg border-2 p-2.5 flex flex-col items-center gap-0.5"
                style={{ borderColor: '#10B98150', boxShadow: '0 0 12px rgba(16,185,129,0.15)' }}
              >
                <span className="text-[10px] font-mono font-bold text-emerald-400">{c.name}</span>
                <span className="text-[9px] text-foreground/60">{c.tech}</span>
                <span className="text-[9px] text-foreground/60">{c.app}</span>
                <span className="text-[9px] font-mono text-emerald-400/70">Port {c.port}</span>
              </motion.div>

              {/* Isolation wall between containers */}
              {i < 2 && (
                <div className="flex flex-col items-center justify-center mx-1.5 w-5">
                  {showWalls && (
                    <motion.div
                      initial={{ scaleY: 0 }}
                      animate={{ scaleY: 1 }}
                      transition={{ duration: 0.3 }}
                      className="flex flex-col items-center justify-center h-full gap-1"
                    >
                      <div className="flex-1 border-l-2 border-dashed" style={{ borderColor: '#10B98160' }} />
                      <motion.span
                        animate={{ scale: [1, 1.2, 1] }}
                        transition={{ duration: 0.4 }}
                        className="text-[10px]"
                      >
                        🔒
                      </motion.span>
                      <div className="flex-1 border-l-2 border-dashed" style={{ borderColor: '#10B98160' }} />
                    </motion.div>
                  )}
                </div>
              )}
            </div>
          ))}
        </div>
      </motion.div>

      {/* Labels below server */}
      {showLabels && (
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          className="flex flex-col items-center gap-1.5 mt-4"
        >
          <span className="text-[11px] text-emerald-400 font-mono">🔒 Each container is fully isolated</span>
          <div className="flex items-center gap-4 text-[10px] font-mono">
            <span className="text-red-400">✗ Container A cannot see Container B</span>
            <span className="text-emerald-400">✓ Exposed ports allow controlled communication</span>
          </div>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 5: Resource Efficiency ────────────────────────────────────────

interface BarData { label: string; percent: number; value: string }

const VM_BARS: BarData[] = [
  { label: 'RAM', percent: 85, value: '~40 GB RAM' },
  { label: 'CPU', percent: 70, value: '~70% CPU idle' },
  { label: 'Disk', percent: 90, value: '~100 GB Disk' },
  { label: 'Boot', percent: 95, value: '~10 min total' },
];

const CONTAINER_BARS: BarData[] = [
  { label: 'RAM', percent: 20, value: '~2 GB RAM' },
  { label: 'CPU', percent: 10, value: '~5% CPU idle' },
  { label: 'Disk', percent: 15, value: '~1 GB Disk' },
  { label: 'Boot', percent: 5, value: '~5 sec total' },
];

const BarChart = ({
  title,
  bars,
  barColor,
  baseDelay,
}: {
  title: string;
  bars: BarData[];
  barColor: string;
  baseDelay: number;
}) => (
  <div className="flex-1 min-w-0">
    <motion.h4
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: baseDelay }}
      className="text-[11px] font-syne font-bold mb-3 text-center"
      style={{ color: barColor }}
    >
      {title}
    </motion.h4>
    <div className="space-y-2">
      {bars.map((bar, i) => (
        <motion.div
          key={bar.label}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: baseDelay + 0.1 + i * 0.15 }}
          className="flex items-center gap-2"
        >
          <span className="text-[10px] font-mono text-muted-foreground w-8 text-right shrink-0">{bar.label}</span>
          <div className="flex-1 h-4 rounded-full bg-secondary/50 overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${bar.percent}%` }}
              transition={{ delay: baseDelay + 0.1 + i * 0.15, duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full"
              style={{ background: `linear-gradient(90deg, ${barColor}80, ${barColor})` }}
            />
          </div>
          <span className="text-[9px] font-mono w-[72px] text-right shrink-0" style={{ color: barColor }}>{bar.value}</span>
        </motion.div>
      ))}
    </div>
  </div>
);

const AnimResources = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const { schedule, clearAll } = usePausableTimers(paused);
  useEffect(() => { schedule(onDone, 3000); return clearAll; }, [onDone, schedule, clearAll]);

  return (
    <div className="relative w-full h-full flex flex-col items-center justify-center overflow-hidden px-6">
      <div className="flex gap-6 w-full max-w-lg">
        <BarChart title="Running 5 VMs" bars={VM_BARS} barColor="#F97316" baseDelay={0.2} />
        <div className="w-px bg-border self-stretch shrink-0" />
        <BarChart title="Running 5 Containers" bars={CONTAINER_BARS} barColor="#10B981" baseDelay={0.8} />
      </div>
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 2.2 }}
        className="mt-6 px-4 py-2 rounded-lg"
        style={{ background: '#F59E0B10', border: '1px solid #F59E0B30' }}
      >
        <span className="text-amber-400 font-mono text-sm">🐳 Containers use up to 20x fewer resources than equivalent VMs</span>
      </motion.div>
    </div>
  );
};

// ─── Main Page ──────────────────────────────────────────────────────────────

const Level2Interactive = () => {
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
    if (wasNew && !completedLevels.includes(2)) completeLevel(2);

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
            <p className="text-[10px] text-muted-foreground font-mono">Level 2 — Containers vs Virtual Machines</p>
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
              🎉 Level 2 Complete! +100 XP — You now understand VMs vs Containers!
            </span>
            <button
              onClick={() => navigate('/level/3')}
              className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-syne font-bold text-xs hover:opacity-90 transition-opacity"
            >
              Continue to Level 3 →
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
                  <span className="text-xs">{isDone ? '✓' : '👁'}</span>
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
                  {/* Topic badge */}
                  <div className="absolute top-3 left-3 flex items-center gap-2 z-10">
                    <span className="w-2 h-2 rounded-full" style={{ backgroundColor: TOPICS.find(t => t.id === active)!.color }} />
                    <span className="text-xs font-mono" style={{ color: TOPICS.find(t => t.id === active)!.color }}>
                      {TOPICS.find(t => t.id === active)!.label}
                    </span>
                  </div>
                  {active === 'vm-arch' && <AnimVMArch onDone={handleAnimDone} paused={paused} />}
                  {active === 'container-arch' && <AnimContainerArch onDone={handleAnimDone} paused={paused} />}
                  {active === 'comparison' && <AnimComparison onDone={handleAnimDone} paused={paused} />}
                  {active === 'isolation' && <AnimIsolation onDone={handleAnimDone} paused={paused} />}
                  {active === 'resources' && <AnimResources onDone={handleAnimDone} paused={paused} />}
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

          {/* Info Log (Terminal-style) */}
          <div className="shrink-0 border-t border-border" style={{ height: 200 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: '#0D1117' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" />
              <div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-[10px] font-mono text-muted-foreground ml-1">docker-quest info log</span>
            </div>
            <div ref={logRef} className="terminal-black p-3 overflow-y-auto font-mono text-[13px] leading-5" style={{ height: 'calc(200px - 28px)' }}>
              {infoLines.length === 0 ? (
                <span className="text-muted-foreground/50">
                  {'> Click a topic above to learn more...'}
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
                <h2 className="font-syne font-bold text-foreground text-sm">Concept Reference</h2>
              </div>
              <span className="text-[10px] text-muted-foreground font-mono">Level 2 — Containers vs VMs</span>
            </div>

            {/* Concept intro card */}
            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: '#1E3A5F', background: '#0F172A' }}>
              <h3 className="font-syne font-bold text-foreground text-sm mb-2">🆚 Containers vs Virtual Machines</h3>
              <p className="text-xs text-foreground/70 leading-relaxed">
                This is the most important conceptual foundation in Docker. Both VMs and
                containers solve the same problem — running isolated applications — but
                they do it in fundamentally different ways. Understanding this difference
                explains why Docker became the standard for modern software deployment.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['Isolation', 'Efficiency', 'Portability', 'Architecture'].map(tag => (
                  <span key={tag} className="px-2 py-0.5 rounded-full text-[10px] font-mono text-accent border border-accent/30 bg-accent/5">{tag}</span>
                ))}
              </div>
            </div>

            {/* Concept cards — one per topic */}
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

export default Level2Interactive;
