import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';
import { usePausableTimers } from '@/hooks/usePausableTimers';

type TopicId = 'drivers' | 'bridge' | 'user-defined' | 'dns' | 'net-cmds';

interface TopicMeta {
  id: TopicId; label: string; icon: string; color: string;
  colorClass: string; borderClass: string; bgTint: string; glowStyle: string;
}

const TOPICS: TopicMeta[] = [
  { id: 'drivers', label: 'Network Drivers', icon: '🌐', color: '#06B6D4', colorClass: 'text-cyan-400', borderClass: 'border-cyan-500', bgTint: 'bg-cyan-500/10', glowStyle: '0 0 12px rgba(6,182,212,0.4)' },
  { id: 'bridge', label: 'Bridge Network', icon: '🌉', color: '#8B5CF6', colorClass: 'text-purple-400', borderClass: 'border-purple-500', bgTint: 'bg-purple-500/10', glowStyle: '0 0 12px rgba(139,92,246,0.4)' },
  { id: 'user-defined', label: 'User-Defined Networks', icon: '🔒', color: '#10B981', colorClass: 'text-emerald-400', borderClass: 'border-emerald-500', bgTint: 'bg-emerald-500/10', glowStyle: '0 0 12px rgba(16,185,129,0.4)' },
  { id: 'dns', label: 'DNS Discovery', icon: '📡', color: '#F97316', colorClass: 'text-orange-400', borderClass: 'border-orange-500', bgTint: 'bg-orange-500/10', glowStyle: '0 0 12px rgba(249,115,22,0.4)' },
  { id: 'net-cmds', label: 'Network Commands', icon: '🛠️', color: '#F59E0B', colorClass: 'text-amber-400', borderClass: 'border-amber-500', bgTint: 'bg-amber-500/10', glowStyle: '0 0 12px rgba(245,158,11,0.4)' },
];

const INFO_LOGS: Record<TopicId, { prefix: string; lines: string[] }> = {
  drivers: {
    prefix: '> Loading: Docker Network Drivers',
    lines: [
      '# Docker has 3 built-in network drivers:',
      '# bridge — default, isolated network with NAT (most common)',
      '# host   — container shares host network stack (Linux only)',
      '# none   — no network at all (complete isolation)',
      '$ docker network ls',
      '  NETWORK ID     NAME      DRIVER',
      '  a1b2c3d4e5f6   bridge    bridge   ← default for all containers',
      '  b2c3d4e5f6a1   host      host',
      '  c3d4e5f6a1b2   none      null',
      '# Plus: overlay (Swarm), macvlan (advanced), ipvlan (advanced)',
      '> Network drivers loaded ✓',
    ],
  },
  bridge: {
    prefix: '> Loading: Default Bridge Network',
    lines: [
      '# Default bridge: docker0 interface (172.17.0.1)',
      '# Containers get IPs in 172.17.0.0/16 range',
      '# Containers CAN reach each other via IP address',
      '# Containers CANNOT reach each other via container name (no DNS)',
      '# External traffic uses NAT via iptables rules',
      '$ docker run -d --name web nginx       # 172.17.0.2',
      '$ docker run -d --name api node:18     # 172.17.0.3',
      '$ docker exec web ping 172.17.0.3      # ✓ works (IP)',
      '$ docker exec web ping api             # ✗ fails (no DNS on default bridge)',
      '> Bridge network demo complete ✓',
    ],
  },
  'user-defined': {
    prefix: '> Loading: User-Defined Networks',
    lines: [
      '$ docker network create app-net',
      '$ docker run -d --name web --network app-net nginx',
      '$ docker run -d --name api --network app-net node:18-alpine',
      '$ docker run -d --name db  --network app-net postgres:15',
      '# Now containers can reach each other by NAME:',
      '$ docker exec web ping api             # ✓ works! Built-in DNS',
      '$ docker exec api curl http://db:5432  # ✓ works! Name resolution',
      '# Isolation: containers NOT on app-net cannot reach containers inside',
      '# Best practice: always create a dedicated network per app stack',
      '> User-defined network demo complete ✓',
    ],
  },
  dns: {
    prefix: '> Loading: Container DNS Resolution',
    lines: [
      "# Docker's embedded DNS server: 127.0.0.11",
      '# All containers on a user-defined network use this DNS server',
      '# DNS maps container names → their current IP addresses',
      '# If a container restarts with a new IP, DNS updates automatically',
      '$ docker exec web ping -c 1 api',
      '  PING api (172.20.0.3): 56 data bytes',
      '  64 bytes from 172.20.0.3 ✓',
      '$ docker exec web curl http://api:3000/health',
      '  {"status":"ok"} ✓',
      '# Network aliases: --network-alias lets one container have multiple names',
      '# Service discovery is built-in — no external DNS server needed',
      '> DNS discovery loaded ✓',
    ],
  },
  'net-cmds': {
    prefix: '> Loading: Network CLI Reference',
    lines: [
      '$ docker network ls                           # list all networks',
      '$ docker network create mynet                 # create network',
      '$ docker network create \\',
      '    --subnet 192.168.1.0/24 mynet             # custom subnet',
      '$ docker network inspect mynet                # detailed info + containers',
      '$ docker network connect mynet container1     # add container to network',
      '$ docker network disconnect mynet container1  # remove from network',
      '$ docker network rm mynet                     # delete network',
      '$ docker network prune                        # delete all unused networks',
      '# Attach at run time: docker run --network mynet nginx',
      '> Network commands loaded ✓',
    ],
  },
};

interface CardSection { title: string; text: string }
const CARD_DATA: Record<TopicId, { heading: string; sections: CardSection[] }> = {
  drivers: {
    heading: "Docker's Network Drivers",
    sections: [
      { title: 'Bridge (default)', text: "The default network driver. When you run a container without specifying a network, it joins the default bridge network. Docker creates a virtual Ethernet bridge called docker0 on the host. Containers on the same bridge can communicate via IP. External traffic uses NAT via iptables rules.\nBest for: most applications, web servers, microservices." },
      { title: 'Host', text: "Removes network isolation between the container and host. The container shares the host's network stack directly — no separate IP, no NAT, no port mapping needed. Use docker run --network host nginx and nginx is directly on host port 80.\nBest for: performance-sensitive networking, monitoring agents, Linux only." },
      { title: 'None', text: "Completely disables all networking for the container. Only the loopback interface (localhost) is available. The container cannot send or receive any network traffic.\nBest for: batch processing jobs, security-sensitive workloads." },
      { title: 'Others', text: "Overlay: multi-host networking for Docker Swarm clusters.\nMacvlan: assign a real MAC address to a container (advanced).\nIPvlan: similar to macvlan with different Layer 3 routing.\nThese are advanced drivers for specific infrastructure needs." },
    ],
  },
  bridge: {
    heading: 'The Default Bridge Network',
    sections: [
      { title: 'How it works', text: "Docker creates a virtual network bridge called docker0 on the host machine with IP 172.17.0.1. When containers start without a specified network, they join this bridge and get an IP from 172.17.0.0/16 (like 172.17.0.2, 172.17.0.3, etc.). The host acts as a router between containers and the outside network." },
      { title: 'The DNS limitation', text: "The default bridge network does NOT support automatic DNS resolution. If Container A wants to talk to Container B, it must use Container B's IP address — which changes every time the container restarts. This makes the default bridge fragile for multi-container apps. Always use user-defined networks to get automatic DNS." },
      { title: 'Port publishing', text: "By default, container ports are not accessible from outside the host.\n-p 8080:80 nginx  — maps host:8080 to container:80\n-p 80 nginx       — Docker picks a random host port\n-P nginx          — publishes ALL exposed ports randomly\nView published ports: docker port <container>" },
      { title: 'iptables under the hood', text: "Docker automatically creates iptables rules for port forwarding and NAT. Outbound traffic from containers is masqueraded (NATed) to the host IP. Inbound published port traffic is DNAT-ed to the container's IP and port." },
    ],
  },
  'user-defined': {
    heading: 'User-Defined Networks — Best Practice',
    sections: [
      { title: 'Why they are better', text: "User-defined networks have several advantages over the default bridge:\n1. Automatic DNS: containers reach each other by name\n2. Better isolation: containers on different networks cannot communicate\n3. On-the-fly connect/disconnect without restart\n4. Custom subnets: specify your own IP ranges\nAlways create a dedicated network for each application stack." },
      { title: 'Creating and using', text: "docker network create app-net\ndocker run -d --name web --network app-net nginx\ndocker run -d --name api --network app-net node-app\ndocker run -d --name db  --network app-net postgres\n\nNow: web can curl http://api:3000, api can connect to db:5432.\nAll by name. No IP management needed." },
      { title: 'Multi-network containers', text: "A container can join multiple networks simultaneously:\ndocker network connect frontend-net web\ndocker network connect backend-net web\nNow 'web' can talk to containers on both networks — acting as a bridge between network segments. Common pattern for API gateways." },
      { title: 'Network scope and isolation', text: "Containers on network A cannot reach containers on network B unless they share a container connected to both. This gives you micro-segmentation: your db container is on backend-net only and is unreachable from the public-facing frontend-net." },
    ],
  },
  dns: {
    heading: 'Built-in DNS and Service Discovery',
    sections: [
      { title: "Docker's embedded DNS", text: "Every user-defined network has an embedded DNS server at 127.0.0.11. All containers on that network automatically use this DNS server. When Container A looks up 'api', the DNS server returns the current IP of the container named 'api'. If the container restarts with a new IP, DNS is updated automatically." },
      { title: 'How it works in practice', text: "In your application code, use the container name as the hostname:\nconst db = new Client({ host: 'postgres', port: 5432 })\nconst redis = createClient({ url: 'redis://cache:6379' })\nconst api = fetch('http://api-service:3000/data')\nThese just work on the same user-defined network." },
      { title: 'Network aliases', text: "A container can have multiple DNS names:\ndocker run -d \\\n  --name db-primary \\\n  --network app-net \\\n  --network-alias database \\\n  --network-alias db \\\n  postgres:15\nNow 'db-primary', 'database', and 'db' all resolve to this container.\nUseful for zero-downtime migrations." },
      { title: 'Service discovery vs load balancing', text: "Docker's built-in DNS resolves one IP per name (one container). For load balancing across multiple replicas, use Docker Swarm (VIP-based load balancing) or Docker Compose with scaling, covered in Level 11 and Level 14." },
    ],
  },
  'net-cmds': {
    heading: 'Docker Network CLI Reference',
    sections: [
      { title: 'Creating networks', text: "docker network create mynet\n  Create a bridge network with default settings.\n\ndocker network create \\\n  --driver bridge \\\n  --subnet 192.168.1.0/24 \\\n  --gateway 192.168.1.1 \\\n  mynet\n  Create with custom subnet and IP range." },
      { title: 'Listing and inspecting', text: "docker network ls               — list all networks\ndocker network ls --filter driver=bridge\ndocker network inspect mynet    — full JSON: subnet, gateway, containers\ndocker network inspect mynet \\\n  --format '{{range .Containers}}{{.Name}}{{end}}'" },
      { title: 'Connecting containers', text: "docker run -d --network mynet --name web nginx\n  — connect at run time (preferred)\ndocker network connect mynet web\n  — connect running container to additional network\ndocker network disconnect mynet web\n  — remove container from network (without stopping it)" },
      { title: 'Cleanup', text: "docker network rm mynet         — remove specific network\ndocker network rm n1 n2 n3      — remove multiple\ndocker network prune            — remove all unused networks\nNote: cannot remove a network with connected containers\nNote: cannot remove the built-in bridge, host, and none networks" },
    ],
  },
};

// ─── Shared components ───────────────────────────────────────────────────────

const TermHeader = ({ title }: { title: string }) => (
  <div className="flex items-center gap-2 px-3 py-1.5 border-b shrink-0" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
    <div className="w-2 h-2 rounded-full bg-red-500/70" />
    <div className="w-2 h-2 rounded-full bg-amber-500/70" />
    <div className="w-2 h-2 rounded-full bg-emerald-500/70" />
    <span className="text-[10px] font-mono text-muted-foreground ml-1">{title}</span>
  </div>
);

const ContainerNode = ({ name, ip, color, size = 'md', status }: { name: string; ip?: string; color: string; size?: 'sm' | 'md'; status?: string }) => (
  <div className={`rounded-lg border flex flex-col items-center justify-center ${size === 'sm' ? 'px-2 py-1' : 'px-3 py-2'}`}
    style={{ borderColor: `${color}60`, background: `${color}08` }}>
    <span className={`font-mono font-bold ${size === 'sm' ? 'text-[8px]' : 'text-[10px]'}`} style={{ color }}>📦 {name}</span>
    {ip && <span className={`font-mono text-foreground/40 ${size === 'sm' ? 'text-[7px]' : 'text-[8px]'}`}>{ip}</span>}
    {status && <span className={`font-mono ${size === 'sm' ? 'text-[7px]' : 'text-[8px]'}`} style={{ color }}>{status}</span>}
  </div>
);

const Packet = ({ color, success, style }: { color: string; success: boolean; style?: React.CSSProperties }) => (
  <motion.div className="absolute flex items-center gap-0.5" style={style}>
    <div className="w-2 h-2 rounded-full" style={{ backgroundColor: color, boxShadow: `0 0 6px ${color}` }} />
    <span className="text-[8px] font-mono" style={{ color }}>{success ? '✓' : '✗'}</span>
  </motion.div>
);

// ─── Animation 1: Network Drivers ────────────────────────────────────────────

const AnimDrivers = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => setPhase(1), 400);
    schedule(() => setPhase(2), 1800);
    schedule(() => setPhase(3), 2400);
    schedule(() => setPhase(4), 3000);
    schedule(onDone, 3800);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  const columns: { title: string; color: string; desc: string; useCase: string; containers: { name: string; ip?: string }[]; packetResult: boolean }[] = [
    { title: 'BRIDGE', color: '#06B6D4', desc: 'Default. Isolated. NAT for external.', useCase: 'Web apps, microservices', containers: [{ name: 'A', ip: '172.17.0.2' }, { name: 'B', ip: '172.17.0.3' }, { name: 'C', ip: '172.17.0.4' }], packetResult: true },
    { title: 'HOST', color: '#F59E0B', desc: 'No isolation. Max performance.', useCase: 'High-performance, monitoring', containers: [{ name: 'D' }], packetResult: true },
    { title: 'NONE', color: '#EF4444', desc: 'Completely isolated. No network.', useCase: 'Batch jobs, max security', containers: [{ name: 'E' }], packetResult: false },
  ];

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2">
      <div className="flex gap-2 flex-1 min-h-0">
        {columns.map((col, ci) => (
          <motion.div key={col.title} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: ci * 0.2 }}
            className="flex-1 rounded-lg border flex flex-col overflow-hidden" style={{ borderColor: `${col.color}30`, background: '#0D1117' }}>
            <div className="shrink-0 px-2 py-1.5 border-b text-center" style={{ borderColor: '#1F2D45' }}>
              <span className="text-[11px] font-syne font-bold" style={{ color: col.color }}>{col.title}</span>
            </div>

            <div className="flex-1 flex flex-col items-center justify-center gap-2 p-2 relative">
              {/* Containers */}
              {phase >= 1 && (
                <div className="flex flex-wrap gap-1.5 justify-center">
                  {col.containers.map((c, i) => (
                    <motion.div key={i} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.1 * i }}>
                      <ContainerNode name={c.name} ip={c.ip} color={col.color} size="sm" />
                    </motion.div>
                  ))}
                </div>
              )}

              {/* Network layer */}
              {phase >= 1 && col.title === 'BRIDGE' && (
                <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 0.3 }}
                  className="w-full h-5 rounded border flex items-center justify-center" style={{ borderColor: col.color, background: `${col.color}10` }}>
                  <span className="text-[7px] font-mono" style={{ color: col.color }}>docker0 (bridge)</span>
                </motion.div>
              )}

              {col.title === 'HOST' && phase >= 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="text-[8px] font-mono text-amber-400/60 text-center">Host network stack</motion.div>
              )}

              {col.title === 'NONE' && phase >= 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.3 }}
                  className="text-base">🚫</motion.div>
              )}

              {/* Packet test */}
              {phase >= 2 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex items-center gap-1">
                  <div className="w-1.5 h-1.5 rounded-full" style={{ backgroundColor: col.packetResult ? '#10B981' : '#EF4444' }} />
                  <span className="text-[8px] font-mono" style={{ color: col.packetResult ? '#10B981' : '#EF4444' }}>
                    {col.packetResult ? 'Packet ✓' : 'Blocked ✗'}
                  </span>
                </motion.div>
              )}

              {/* Description */}
              {phase >= 1 && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.5 }}
                  className="text-[8px] text-foreground/40 text-center font-mono">{col.desc}</motion.div>
              )}
            </div>

            {/* Use case */}
            {phase >= 3 && (
              <motion.div initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }}
                className="shrink-0 px-2 py-1 border-t text-center" style={{ borderColor: '#1F2D45', background: `${col.color}06` }}>
                <span className="text-[8px] font-mono text-foreground/50">{col.useCase}</span>
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Highlight bar */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="shrink-0 rounded-lg px-4 py-1.5 text-center" style={{ background: '#06B6D410', border: '1px solid #06B6D430' }}>
          <span className="text-[10px] font-mono text-cyan-400">Bridge is the default. Most containers use bridge networking.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 2: Bridge Network Deep Dive ───────────────────────────────────

const AnimBridge = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => setPhase(1), 500);
    schedule(() => setPhase(2), 1100);
    schedule(() => setPhase(3), 1700);
    schedule(() => setPhase(4), 2400);
    schedule(onDone, 3200);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  return (
    <div className="w-full h-full flex flex-col items-center p-4 gap-3 overflow-hidden">
      {/* Host machine */}
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
        className="w-full max-w-lg rounded-xl border-2 p-3 flex flex-col gap-3 relative"
        style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
        <div className="text-[9px] font-syne font-bold text-muted-foreground text-center">HOST MACHINE</div>

        {/* NAT boundary */}
        {phase >= 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-0.5 rounded text-[8px] font-mono bg-amber-500/10 border border-amber-500/30 text-amber-400">
            NAT (iptables)
          </motion.div>
        )}

        {/* Containers row */}
        {phase >= 1 && (
          <div className="flex justify-center gap-3">
            {[{ n: 'web', ip: '172.17.0.2' }, { n: 'api', ip: '172.17.0.3' }, { n: 'db', ip: '172.17.0.4' }].map((c, i) => (
              <motion.div key={c.n} initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.12 }}>
                <ContainerNode name={c.n} ip={c.ip} color="#8B5CF6" size="sm" />
              </motion.div>
            ))}
          </div>
        )}

        {/* Connection lines to bridge */}
        {phase >= 1 && (
          <div className="flex justify-center gap-8">
            {[0, 1, 2].map(i => (
              <motion.div key={i} initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.3 + i * 0.1 }}
                className="w-0.5 h-4 origin-top" style={{ backgroundColor: '#8B5CF640' }} />
            ))}
          </div>
        )}

        {/* docker0 bridge */}
        <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 0.1 }}
          className="w-full h-7 rounded border-2 flex items-center justify-center" style={{ borderColor: '#8B5CF6', background: '#8B5CF610' }}>
          <span className="text-[9px] font-mono text-purple-400 font-bold">docker0 (172.17.0.1)</span>
        </motion.div>
      </motion.div>

      {/* Communication tests */}
      <div className="w-full max-w-lg space-y-1.5">
        {/* IP communication success */}
        {phase >= 2 && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 rounded px-3 py-1 border" style={{ borderColor: '#10B98130', background: '#10B98108' }}>
            <span className="text-[8px]">✓</span>
            <span className="text-[9px] font-mono text-foreground/70">web → <span className="text-emerald-400">172.17.0.3</span> → api</span>
            <span className="text-[8px] font-mono text-emerald-400 ml-auto">IP works</span>
          </motion.div>
        )}

        {/* Name resolution failure */}
        {phase >= 3 && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="flex items-center gap-2 rounded px-3 py-1 border" style={{ borderColor: '#EF444430', background: '#EF444408' }}>
            <span className="text-[8px]">✗</span>
            <span className="text-[9px] font-mono text-foreground/70">web → <span className="text-red-400">"ping api"</span> → ?</span>
            <span className="text-[8px] font-mono text-red-400 ml-auto">No DNS on default bridge!</span>
          </motion.div>
        )}

        {/* NAT / Port publishing */}
        {phase >= 4 && (
          <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
            className="rounded border px-3 py-1.5" style={{ borderColor: '#F59E0B30', background: '#F59E0B08' }}>
            <div className="text-[9px] font-mono text-amber-400 mb-0.5">Port Publishing via NAT</div>
            <div className="text-[8px] font-mono text-foreground/50">
              <span className="text-foreground/70">-p 8080:80</span> → Host:8080 → NAT → 172.17.0.2:80 (web)
            </div>
            <div className="text-[8px] font-mono text-foreground/40 mt-0.5">External user → Host:8080 → iptables DNAT → container</div>
          </motion.div>
        )}
      </div>

      {phase >= 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="px-4 py-1.5 rounded-lg text-center" style={{ background: '#8B5CF610', border: '1px solid #8B5CF630' }}>
          <span className="text-[10px] font-mono text-purple-400">Default bridge: IP-only communication. No DNS. NAT for external access.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 3: User-Defined Networks ──────────────────────────────────────

const AnimUserDefined = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [phase, setPhase] = useState(0);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => {
    schedule(() => setPhase(1), 700);
    schedule(() => setPhase(2), 1300);
    schedule(() => setPhase(3), 2100);
    schedule(() => setPhase(4), 2700);
    schedule(onDone, 3500);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  const CONTAINERS = ['web', 'api', 'db'];

  return (
    <div className="w-full h-full flex gap-0">
      {/* Left: Default Bridge (problem) */}
      <div className="flex-1 flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <div className="shrink-0 px-3 py-1.5 border-b text-center" style={{ borderColor: '#1F2D45', background: '#0D1117' }}>
          <span className="text-[10px] font-syne font-bold text-red-400">Default Bridge ❌</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-3">
          <div className="flex gap-2">
            {CONTAINERS.map((c, i) => (
              <motion.div key={c} initial={{ opacity: 0, y: -8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.1 }}>
                <ContainerNode name={c} ip={`172.17.0.${i + 2}`} color="#8B5CF6" size="sm" />
              </motion.div>
            ))}
          </div>
          <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 0.3 }}
            className="w-4/5 h-4 rounded border flex items-center justify-center" style={{ borderColor: '#8B5CF640', background: '#8B5CF608' }}>
            <span className="text-[7px] font-mono text-purple-400/60">docker0</span>
          </motion.div>

          {/* DNS failure */}
          {phase >= 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 rounded px-2 py-1" style={{ background: '#EF444410', border: '1px solid #EF444430' }}>
              <span className="text-[8px]">✗</span>
              <span className="text-[8px] font-mono text-red-400">ping api → failed</span>
            </motion.div>
          )}
          <span className="text-[8px] font-mono text-foreground/30">No DNS. IPs only. Fragile.</span>
        </div>
      </div>

      {/* Right: User-Defined (solution) */}
      <div className="flex-1 flex flex-col" style={{ background: '#0F172A' }}>
        <div className="shrink-0 px-3 py-1.5 border-b text-center" style={{ borderColor: '#1F2D45' }}>
          <span className="text-[10px] font-syne font-bold text-emerald-400">User-Defined Network ✓</span>
        </div>
        <div className="flex-1 flex flex-col items-center justify-center gap-3 p-3">
          {/* Network ring */}
          <div className="rounded-xl border-2 border-dashed p-3 relative" style={{ borderColor: '#10B981', background: '#10B98105' }}>
            <div className="absolute -top-2 left-1/2 -translate-x-1/2 px-2 py-0 rounded text-[8px] font-mono font-bold" style={{ color: '#10B981', background: '#0F172A' }}>
              app-net
            </div>

            {phase >= 2 && (
              <div className="absolute -top-2 right-2 px-1.5 py-0 rounded text-[7px] font-mono" style={{ color: '#10B981', background: '#10B98115' }}>
                DNS ✓
              </div>
            )}

            <div className="flex gap-2 mt-1">
              {CONTAINERS.map((c, i) => (
                <motion.div key={c} initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 + i * 0.15 }}>
                  <ContainerNode name={c} color="#10B981" size="sm" />
                </motion.div>
              ))}
            </div>
          </div>

          {/* DNS success */}
          {phase >= 1 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
              className="flex items-center gap-1.5 rounded px-2 py-1" style={{ background: '#10B98110', border: '1px solid #10B98130' }}>
              <span className="text-[8px]">✓</span>
              <span className="text-[8px] font-mono text-emerald-400">ping api → 172.20.0.3</span>
            </motion.div>
          )}

          {/* Intruder bounce */}
          {phase >= 3 && (
            <motion.div initial={{ opacity: 0, x: 30 }} animate={{ opacity: 1, x: [30, -5, 0] }} transition={{ type: 'spring', stiffness: 500, damping: 15 }}
              className="flex items-center gap-1.5">
              <ContainerNode name="intruder" color="#EF4444" size="sm" />
              <span className="text-[8px] font-mono text-red-400">→ app-net ✗ blocked</span>
            </motion.div>
          )}

          {/* Multi-network */}
          {phase >= 4 && (
            <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
              className="rounded border px-2 py-1 text-center" style={{ borderColor: '#10B98130', background: '#10B98108' }}>
              <span className="text-[8px] font-mono text-emerald-400/70">A container can join multiple networks</span>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

// ─── Animation 4: DNS & Service Discovery ────────────────────────────────────

const AnimDNS = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean }[]>([]);
  const [dnsStep, setDnsStep] = useState(0);
  const [aliasName, setAliasName] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [termLines.length]);

  useEffect(() => {
    schedule(() => {
      setTermLines(p => [...p, { text: '$ docker network create app-net', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: '9f8e7d6c5b4a' }]), 150);
      schedule(() => setTermLines(p => [...p, { text: '$ docker run -d --name web --network app-net nginx', isCmd: true }]), 300);
      schedule(() => setTermLines(p => [...p, { text: '$ docker run -d --name api --network app-net node:18-alpine', isCmd: true }]), 500);
      schedule(() => setTermLines(p => [...p, { text: '$ docker run -d --name db  --network app-net postgres:15', isCmd: true }]), 700);
      schedule(() => setDnsStep(1), 800);
    }, 200);

    schedule(() => {
      setDnsStep(2);
      setTermLines(p => [...p, { text: '$ docker exec web ping -c 2 api', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: 'PING api (172.20.0.3): 56 data bytes' }]), 200);
      schedule(() => setTermLines(p => [...p, { text: '64 bytes from 172.20.0.3: icmp_seq=0 time=0.142ms', isSuccess: true }]), 400);
      schedule(() => setTermLines(p => [...p, { text: '64 bytes from 172.20.0.3: icmp_seq=1 time=0.089ms', isSuccess: true }]), 500);
    }, 1200);

    schedule(() => {
      setDnsStep(3);
      setTermLines(p => [...p, { text: '$ docker exec web curl http://api:3000/health', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: '{"status":"ok","service":"api"}', isSuccess: true }]), 250);
    }, 2100);

    schedule(() => {
      setDnsStep(4);
      setTermLines(p => [...p, { text: '$ docker network inspect app-net', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: '  Subnet: 172.20.0.0/16' }]), 200);
      schedule(() => setTermLines(p => [...p, { text: '  web: 172.20.0.2  api: 172.20.0.3  db: 172.20.0.4' }]), 350);
    }, 2800);

    schedule(() => {
      setDnsStep(5);
      setTermLines(p => [...p, { text: '$ docker run -d --name db-primary --network app-net --network-alias database postgres:15', isCmd: true }]);
      schedule(() => { setTermLines(p => [...p, { text: 'f1e2d3c4b5a6', isSuccess: true }]); setAliasName('database'); }, 250);
    }, 3600);

    schedule(onDone, 4400);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  return (
    <div className="w-full h-full flex gap-0">
      {/* Terminal */}
      <div className="flex-[55] flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <TermHeader title="dns discovery" />
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

      {/* DNS Flow Diagram */}
      <div className="flex-[45] flex flex-col items-center justify-center gap-2 p-3" style={{ background: '#0F172A' }}>
        <div className="text-[10px] font-syne font-bold text-orange-400">DNS Resolution Flow</div>

        {dnsStep >= 1 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} className="flex flex-col items-center gap-1">
            <ContainerNode name="web" ip={dnsStep >= 4 ? '172.20.0.2' : undefined} color="#F97316" size="sm" />

            {dnsStep >= 2 && (
              <motion.div initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }} className="flex flex-col items-center">
                <svg width="4" height="20"><line x1="2" y1="0" x2="2" y2="20" stroke="#F97316" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
                <span className="text-[7px] font-mono text-orange-400/60">query "api"</span>
              </motion.div>
            )}

            {dnsStep >= 2 && (
              <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
                className="rounded-lg border-2 px-3 py-1.5 text-center" style={{ borderColor: '#F97316', background: '#F9731610' }}>
                <span className="text-[9px] font-mono font-bold text-orange-400">DNS 127.0.0.11</span>
                <div className="text-[7px] text-foreground/40">Docker DNS Resolver</div>
              </motion.div>
            )}

            {dnsStep >= 2 && (
              <motion.div initial={{ opacity: 0, scaleY: 0 }} animate={{ opacity: 1, scaleY: 1 }} transition={{ delay: 0.2 }} className="flex flex-col items-center">
                <span className="text-[7px] font-mono text-orange-400/60">→ 172.20.0.3</span>
                <svg width="4" height="20"><line x1="2" y1="0" x2="2" y2="20" stroke="#F97316" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
              </motion.div>
            )}

            <ContainerNode name="api" ip={dnsStep >= 4 ? '172.20.0.3' : undefined} color="#F97316" size="sm" />

            {dnsStep >= 3 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mt-1 rounded px-2 py-0.5" style={{ background: '#10B98110', border: '1px solid #10B98130' }}>
                <span className="text-[8px] font-mono text-emerald-400">HTTP 200 OK ✓</span>
              </motion.div>
            )}
          </motion.div>
        )}

        {/* DB container */}
        {dnsStep >= 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mt-1">
            <ContainerNode name="db" ip="172.20.0.4" color="#F97316" size="sm" />
          </motion.div>
        )}

        {/* Alias */}
        {dnsStep >= 5 && aliasName && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded border px-2 py-1 text-center" style={{ borderColor: '#F9731630', background: '#F9731608' }}>
            <span className="text-[8px] font-mono text-orange-400">db-primary</span>
            <span className="text-[8px] text-foreground/30 mx-1">=</span>
            <span className="text-[8px] font-mono text-orange-400">"{aliasName}"</span>
            <div className="text-[7px] text-foreground/40">alias → same IP</div>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Animation 5: Network Commands ───────────────────────────────────────────

interface NetNode { name: string; type: 'network' | 'container'; color: string; ip?: string }
interface NetEdge { from: string; to: string }

const AnimNetCmds = ({ onDone, paused }: { onDone: () => void; paused: boolean }) => {
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean; isError?: boolean }[]>([]);
  const [nodes, setNodes] = useState<NetNode[]>([]);
  const [edges, setEdges] = useState<NetEdge[]>([]);
  const [errorNode, setErrorNode] = useState('');
  const scrollRef = useRef<HTMLDivElement>(null);
  const { schedule, clearAll } = usePausableTimers(paused);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [termLines.length]);

  useEffect(() => {
    schedule(() => {
      setTermLines(p => [...p, { text: '$ docker network ls', isCmd: true }]);
      schedule(() => {
        setTermLines(p => [...p, { text: 'NETWORK ID     NAME      DRIVER    SCOPE' }]);
        setTermLines(p => [...p, { text: 'a1b2c3d4e5f6   bridge    bridge    local\nb2c3d4e5f6a1   host      host      local\nc3d4e5f6a1b2   none      null      local' }]);
        setNodes([
          { name: 'bridge', type: 'network', color: '#8B5CF6' },
          { name: 'host', type: 'network', color: '#F59E0B' },
          { name: 'none', type: 'network', color: '#EF4444' },
        ]);
      }, 200);
    }, 200);

    schedule(() => {
      setTermLines(p => [...p, { text: '$ docker network create --driver bridge --subnet 192.168.100.0/24 my-network', isCmd: true }]);
      schedule(() => {
        setTermLines(p => [...p, { text: 'd4e5f6a1b2c3', isSuccess: true }]);
        setNodes(prev => [...prev, { name: 'my-network', type: 'network', color: '#F59E0B' }]);
      }, 200);
    }, 900);

    schedule(() => {
      setTermLines(p => [...p, { text: '$ docker run -d --name app1 --network my-network nginx', isCmd: true }]);
      schedule(() => {
        setTermLines(p => [...p, { text: 'a1b2c3' }]);
        setNodes(prev => [...prev, { name: 'app1', type: 'container', color: '#F59E0B', ip: '192.168.100.2' }]);
        setEdges(prev => [...prev, { from: 'app1', to: 'my-network' }]);
      }, 200);
      schedule(() => setTermLines(p => [...p, { text: '$ docker run -d --name app2 --network my-network redis', isCmd: true }]), 400);
      schedule(() => {
        setTermLines(p => [...p, { text: 'b2c3d4' }]);
        setNodes(prev => [...prev, { name: 'app2', type: 'container', color: '#F59E0B', ip: '192.168.100.3' }]);
        setEdges(prev => [...prev, { from: 'app2', to: 'my-network' }]);
      }, 600);
    }, 1800);

    schedule(() => {
      setTermLines(p => [...p, { text: '$ docker network connect my-network app3', isCmd: true }]);
      schedule(() => {
        setNodes(prev => [...prev, { name: 'app3', type: 'container', color: '#06B6D4' }]);
        setEdges(prev => [...prev, { from: 'app3', to: 'my-network' }, { from: 'app3', to: 'bridge' }]);
      }, 200);
      schedule(() => {
        setTermLines(p => [...p, { text: '$ docker network disconnect bridge app3', isCmd: true }]);
        schedule(() => setEdges(prev => prev.filter(e => !(e.from === 'app3' && e.to === 'bridge'))), 200);
      }, 500);
    }, 2600);

    schedule(() => {
      setTermLines(p => [...p, { text: '$ docker network inspect my-network', isCmd: true }]);
      schedule(() => setTermLines(p => [...p, { text: '  app1: 192.168.100.2/24\n  app2: 192.168.100.3/24' }]), 200);
      schedule(() => {
        setTermLines(p => [...p, { text: '$ docker network rm my-network', isCmd: true }]);
        schedule(() => {
          setTermLines(p => [...p, { text: 'Error: network has active endpoints', isError: true }]);
          setErrorNode('my-network');
          schedule(() => setErrorNode(''), 800);
        }, 200);
      }, 500);
      schedule(() => {
        setTermLines(p => [...p, { text: '$ docker network prune', isCmd: true }]);
        schedule(() => {
          setTermLines(p => [...p, { text: 'Deleted Networks: my-network', isSuccess: true }]);
          setNodes(prev => prev.filter(n => n.name !== 'my-network' && n.name !== 'app1' && n.name !== 'app2' && n.name !== 'app3'));
          setEdges(prev => prev.filter(e => e.to !== 'my-network' && e.from !== 'app1' && e.from !== 'app2' && e.from !== 'app3'));
        }, 200);
      }, 1000);
    }, 3400);

    schedule(onDone, 4800);
    return clearAll;
  }, [onDone, schedule, clearAll]);

  return (
    <div className="w-full h-full flex gap-0">
      {/* Terminal */}
      <div className="flex-[58] flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <TermHeader title="network commands" />
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

      {/* Network Topology Panel */}
      <div className="flex-[42] flex flex-col overflow-hidden" style={{ background: '#0F172A' }}>
        <div className="shrink-0 px-3 py-1.5 border-b text-center" style={{ borderColor: '#1F2D45' }}>
          <span className="text-[10px] font-syne font-bold text-amber-400">Network Map</span>
        </div>
        <div className="flex-1 p-3 space-y-2 overflow-y-auto">
          <AnimatePresence>
            {nodes.filter(n => n.type === 'network').map(net => (
              <motion.div key={net.name} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1, borderColor: errorNode === net.name ? '#EF4444' : `${net.color}50` }}
                exit={{ opacity: 0, scale: 0.8, height: 0 }} transition={{ duration: 0.3 }}
                className="rounded-lg border-2 border-dashed p-2" style={{ background: `${net.color}05` }}>
                <div className="flex items-center gap-1.5 mb-1.5">
                  <div className="w-3 h-3 rounded-full" style={{ backgroundColor: `${net.color}40`, border: `1.5px solid ${net.color}` }} />
                  <span className="text-[9px] font-mono font-bold" style={{ color: net.color }}>{net.name}</span>
                  {net.name === 'my-network' && <span className="text-[7px] font-mono text-foreground/30 ml-auto">192.168.100.0/24</span>}
                </div>
                {/* Containers connected to this network */}
                <div className="flex flex-wrap gap-1.5">
                  <AnimatePresence>
                    {edges.filter(e => e.to === net.name).map(e => {
                      const cn = nodes.find(n => n.name === e.from);
                      if (!cn) return null;
                      return (
                        <motion.div key={e.from} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                          exit={{ opacity: 0, x: 10 }} transition={{ duration: 0.25 }}
                          className="rounded border px-1.5 py-0.5 flex items-center gap-1" style={{ borderColor: `${cn.color}40`, background: `${cn.color}08` }}>
                          <span className="text-[8px]">📦</span>
                          <span className="text-[8px] font-mono" style={{ color: cn.color }}>{cn.name}</span>
                          {cn.ip && <span className="text-[7px] font-mono text-foreground/30">{cn.ip}</span>}
                        </motion.div>
                      );
                    })}
                  </AnimatePresence>
                  {edges.filter(e => e.to === net.name).length === 0 && (
                    <span className="text-[8px] text-foreground/20 font-mono">no containers</span>
                  )}
                </div>
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      </div>
    </div>
  );
};

// ─── Main Level 10 Page ──────────────────────────────────────────────────────

const Level10Interactive = () => {
  const navigate = useNavigate();
  const { completeLevel, completedLevels } = useGameStore();
  const [completed, setCompleted] = useState<Set<TopicId>>(new Set());
  const [active, setActive] = useState<TopicId | null>(null);
  const [animating, setAnimating] = useState(false);
  const [infoLines, setInfoLines] = useState<{ text: string; type: 'cmd' | 'output' }[]>([]);
  const [localXP, setLocalXP] = useState(0);
  const [levelDone, setLevelDone] = useState(false);
  const [paused, setPaused] = useState(false);
  const logRef = useRef<HTMLDivElement>(null);
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
    if (wasNew && !completedLevels.includes(10)) completeLevel(10);
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
            <p className="text-[10px] text-muted-foreground font-mono">Level 10 — Docker Networking</p>
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

      {/* Level complete banner */}
      <AnimatePresence>
        {levelDone && (
          <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: 'auto', opacity: 1 }} className="shrink-0 bg-emerald-500/10 border-b border-emerald-500/30 px-4 py-3 flex items-center justify-between">
            <span className="font-syne font-bold text-emerald-400 text-sm">🎉 Level 10 Complete! +100 XP — Your containers can talk to each other!</span>
            <button onClick={() => navigate('/level/11')} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-syne font-bold text-xs hover:opacity-90 transition-opacity">Continue to Level 11 →</button>
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
                  <motion.span className="text-6xl" animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }}>🌐</motion.span>
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
                    {active === 'drivers' && <AnimDrivers onDone={handleAnimDone} paused={paused} />}
                    {active === 'bridge' && <AnimBridge onDone={handleAnimDone} paused={paused} />}
                    {active === 'user-defined' && <AnimUserDefined onDone={handleAnimDone} paused={paused} />}
                    {active === 'dns' && <AnimDNS onDone={handleAnimDone} paused={paused} />}
                    {active === 'net-cmds' && <AnimNetCmds onDone={handleAnimDone} paused={paused} />}
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

          {/* Terminal log */}
          <div className="shrink-0 border-t border-border" style={{ height: 200 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: '#0D1117' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-[10px] font-mono text-muted-foreground ml-1">docker-quest network log</span>
            </div>
            <div ref={logRef} className="terminal-black p-3 overflow-y-auto font-mono text-[13px] leading-5" style={{ height: 'calc(200px - 28px)' }}>
              {infoLines.length === 0 ? (
                <span className="text-muted-foreground/50">{'> Click a topic to explore Docker Networking...'}<span className="inline-block w-2 h-4 bg-muted-foreground/50 ml-1" style={{ animation: 'blink 1s infinite' }} /></span>
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
              <div className="flex items-center gap-2"><span>📖</span><h2 className="font-syne font-bold text-foreground text-sm">Network Reference</h2></div>
              <span className="text-[10px] text-muted-foreground font-mono">Level 10 — Docker Networking</span>
            </div>

            {/* Intro card */}
            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: '#1E3A5F', background: '#0F172A' }}>
              <h3 className="font-syne font-bold text-foreground text-sm mb-2">🌐 Docker Networking</h3>
              <p className="text-xs text-foreground/70 leading-relaxed">
                By default, each Docker container runs in isolation — it cannot communicate
                with other containers or the outside world unless you explicitly connect it.
                Docker Networking solves this by providing virtual networks that containers
                can join. Understanding networking is what separates developers who run single
                containers from those who run full multi-service applications. It is the
                prerequisite for Docker Compose (Level 11) and production deployments.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['Bridge', 'DNS', 'Isolation', 'Service Discovery', 'Port Publishing'].map(tag => (
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

export default Level10Interactive;
