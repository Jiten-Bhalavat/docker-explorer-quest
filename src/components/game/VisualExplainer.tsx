import { motion } from 'framer-motion';
import { ReactNode } from 'react';

const fadeUp = { initial: { opacity: 0, y: 20 }, animate: { opacity: 1, y: 0 } };
const stagger = { animate: { transition: { staggerChildren: 0.2 } } };

const Box = ({ children, color = 'primary', className = '', delay = 0 }: { children: ReactNode; color?: string; className?: string; delay?: number }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
    transition={{ delay, duration: 0.4 }}
    className={`rounded-lg border px-3 py-2 text-xs font-mono text-center ${
      color === 'primary' ? 'border-primary/50 bg-primary/10 text-primary' :
      color === 'accent' ? 'border-accent/50 bg-accent/10 text-accent' :
      color === 'success' ? 'border-success/40 bg-success/10 text-success' :
      color === 'warning' ? 'border-warning/40 bg-warning/10 text-warning' :
      color === 'destructive' ? 'border-destructive/40 bg-destructive/10 text-destructive' :
      'border-border bg-secondary text-foreground'
    } ${className}`}
  >{children}</motion.div>
);

const Arrow = ({ direction = 'down', delay = 0, label = '' }: { direction?: 'down' | 'right'; delay?: number; label?: string }) => (
  <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }} className="flex items-center justify-center py-1">
    {label && <span className="text-[10px] text-muted-foreground mr-1">{label}</span>}
    <svg width={direction === 'right' ? 40 : 20} height={direction === 'right' ? 20 : 30} className="text-primary">
      {direction === 'down' ? (
        <line x1="10" y1="0" x2="10" y2="25" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" style={{ animation: 'flowArrow 1.5s linear infinite' }} />
      ) : (
        <line x1="0" y1="10" x2="35" y2="10" stroke="currentColor" strokeWidth="2" strokeDasharray="4 3" style={{ animation: 'flowArrow 1.5s linear infinite' }} />
      )}
    </svg>
  </motion.div>
);

const Label = ({ children, delay = 0 }: { children: ReactNode; delay?: number }) => (
  <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay }} className="text-sm text-muted-foreground text-center mt-4 max-w-md mx-auto">{children}</motion.p>
);

// Level 1: VMs vs Containers
const Level1Diagram = () => (
  <div className="flex flex-col md:flex-row gap-8 items-start justify-center">
    <motion.div {...stagger} className="flex flex-col items-center gap-1">
      <motion.h4 {...fadeUp} className="font-display text-sm font-semibold text-destructive mb-2">VM Model</motion.h4>
      <Box color="default" delay={0.1}>Hardware</Box>
      <Arrow delay={0.2} />
      <Box color="warning" delay={0.3}>Hypervisor</Box>
      <Arrow delay={0.4} />
      <div className="flex gap-2">
        {['VM 1', 'VM 2', 'VM 3'].map((vm, i) => (
          <motion.div key={vm} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.5 + i * 0.15 }}
            className="border border-destructive/30 rounded p-2 bg-destructive/5">
            <div className="text-[10px] text-destructive font-mono">{vm}</div>
            <div className="text-[8px] text-muted-foreground mt-1">Guest OS<br />Libs<br />App</div>
          </motion.div>
        ))}
      </div>
      <Label delay={0.9}>Heavy — each VM needs its own OS</Label>
    </motion.div>
    <motion.div initial={{ opacity: 0, x: 20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1 }} className="flex flex-col items-center gap-1">
      <h4 className="font-display text-sm font-semibold text-success mb-2">Container Model</h4>
      <Box color="default" delay={1.1}>Hardware</Box>
      <Arrow delay={1.2} />
      <Box color="success" delay={1.3}>Host OS</Box>
      <Arrow delay={1.4} />
      <Box color="primary" delay={1.5}>Docker Engine</Box>
      <Arrow delay={1.6} />
      <div className="flex gap-2">
        {[1, 2, 3].map((c, i) => (
          <motion.div key={c} initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1.7 + i * 0.15 }}
            className="border border-primary/40 rounded p-2 bg-primary/5 glow-primary">
            <div className="text-[10px] text-primary font-mono">Container {c}</div>
            <div className="text-[8px] text-muted-foreground mt-1">App + Libs</div>
          </motion.div>
        ))}
      </div>
      <Label delay={2.1}>Lightweight — shared OS kernel</Label>
    </motion.div>
  </div>
);

// Level 2: Containerization
const Level2Diagram = () => (
  <div className="flex flex-col items-center gap-4">
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} className="text-4xl">💻</motion.div>
    <div className="flex flex-wrap justify-center gap-4">
      {[
        { name: 'Node.js App', ver: 'v16', color: 'success' as const },
        { name: 'Python App', ver: 'v3.9', color: 'primary' as const },
        { name: 'Java App', ver: 'v11', color: 'warning' as const },
      ].map((app, i) => (
        <motion.div key={app.name} initial={{ opacity: 0, y: 30 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 + i * 0.2 }}
          className="animate-float" style={{ animationDelay: `${i * 0.5}s` }}>
          <Box color={app.color}>{app.name} ({app.ver})</Box>
          <motion.div initial={{ scaleY: 0 }} animate={{ scaleY: 1 }} transition={{ delay: 0.8 + i * 0.2 }}
            className="border-l-2 border-r-2 border-dashed border-primary/30 h-4 mx-2" />
        </motion.div>
      ))}
    </div>
    <Label delay={1.5}>Each app runs isolated. No conflicts.</Label>
  </div>
);

// Level 3: Installing Docker
const Level3Diagram = () => (
  <div className="flex flex-col items-center gap-3">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-5xl">🖥️</motion.div>
    <Box color="default" delay={0.2}>Operating System</Box>
    <motion.div initial={{ y: -60, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.5, type: 'spring', stiffness: 120 }}>
      <Box color="primary" className="glow-primary">🐳 Docker Engine</Box>
    </motion.div>
    <Label delay={1}>Docker Engine installed ✅</Label>
  </div>
);

// Level 4: Docker Images
const Level4Diagram = () => (
  <div className="flex flex-col items-center gap-1">
    {[
      { label: 'App Layer: myapp.js', color: 'accent' as const, delay: 0.6 },
      { label: 'Library Layer: Node.js', color: 'warning' as const, delay: 0.4 },
      { label: 'Base Image: ubuntu:22.04', color: 'primary' as const, delay: 0.2 },
    ].map((layer) => (
      <Box key={layer.label} color={layer.color} delay={layer.delay} className="w-56">{layer.label}</Box>
    ))}
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.9 }}
      className="mt-2 border-l-2 border-primary/40 pl-3 text-xs text-primary font-mono">
      ← Docker Image
    </motion.div>
    <Label delay={1.1}>Images are built from stacked layers</Label>
  </div>
);

// Level 5: Docker Containers
const Level5Diagram = () => (
  <div className="flex items-center justify-center gap-4 flex-wrap">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex flex-col items-center gap-1">
      <Box color="primary" delay={0.1}>ubuntu:22.04</Box>
      <Box color="warning" delay={0.2} className="w-full">Node.js</Box>
      <Box color="accent" delay={0.3} className="w-full">myapp.js</Box>
      <span className="text-[10px] text-muted-foreground">Image (blueprint)</span>
    </motion.div>
    <motion.div initial={{ opacity: 0, scaleX: 0 }} animate={{ opacity: 1, scaleX: 1 }} transition={{ delay: 0.6 }} className="flex items-center gap-1">
      <span className="text-xs font-mono text-primary">docker run →</span>
      <svg width="40" height="10"><line x1="0" y1="5" x2="40" y2="5" stroke="hsl(221,83%,53%)" strokeWidth="2" strokeDasharray="4 3" style={{ animation: 'flowArrow 1.5s linear infinite' }} /></svg>
    </motion.div>
    <motion.div initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1, type: 'spring' }}
      className="rounded-lg border-2 border-success/50 bg-success/5 p-4 glow-success">
      <div className="text-xs font-mono text-success mb-1">RUNNING ●</div>
      <div className="text-[10px] text-muted-foreground">Container Instance</div>
    </motion.div>
  </div>
);

// Level 6: Docker Commands
const Level6Diagram = () => {
  const commands = [
    { cmd: '$ docker pull nginx', result: '📥 Image downloaded' },
    { cmd: '$ docker images', result: '📋 Image list shown' },
    { cmd: '$ docker run nginx', result: '▶️ Container started' },
    { cmd: '$ docker ps', result: '📋 Running containers' },
  ];
  return (
    <div className="flex flex-col gap-2 max-w-sm mx-auto">
      {commands.map((c, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.4 }}
          className="flex items-center gap-3 terminal-bg rounded px-3 py-2">
          <span className="font-mono text-xs text-accent flex-1">{c.cmd}</span>
          <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.4 + 0.2 }}
            className="text-xs text-muted-foreground">{c.result}</motion.span>
        </motion.div>
      ))}
      <Label delay={1.8}>Core commands for managing Docker</Label>
    </div>
  );
};

// Level 7: Dockerfile
const Level7Diagram = () => {
  const lines = [
    { code: 'FROM node:18', icon: '📦', desc: 'Base image' },
    { code: 'WORKDIR /app', icon: '📂', desc: 'Set directory' },
    { code: 'COPY . .', icon: '📄', desc: 'Copy files' },
    { code: 'RUN npm install', icon: '⚙️', desc: 'Build step' },
    { code: 'EXPOSE 3000', icon: '🔌', desc: 'Open port' },
    { code: 'CMD ["node","server.js"]', icon: '▶️', desc: 'Start command' },
  ];
  return (
    <div className="max-w-md mx-auto terminal-bg rounded-lg p-4 border border-border">
      <div className="text-xs text-muted-foreground mb-3 font-mono">Dockerfile</div>
      {lines.map((line, i) => (
        <motion.div key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.3 }}
          className="flex items-center gap-3 py-1">
          <code className="text-xs text-accent font-mono flex-1">{line.code}</code>
          <span className="text-sm">{line.icon}</span>
          <span className="text-[10px] text-muted-foreground w-20">{line.desc}</span>
        </motion.div>
      ))}
    </div>
  );
};

// Level 8: Docker Build
const Level8Diagram = () => (
  <div className="flex flex-col items-center gap-2">
    <motion.code initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-sm text-accent font-mono terminal-bg px-4 py-2 rounded">
      $ docker build -t myapp .
    </motion.code>
    {[1, 2, 3, 4, 5, 6].map((step, i) => (
      <motion.div key={step} initial={{ opacity: 0, width: 0 }} animate={{ opacity: 1, width: '100%' }} transition={{ delay: 0.3 + i * 0.3 }}
        className="flex items-center gap-2 max-w-xs w-full">
        <span className="text-[10px] text-muted-foreground w-16">Step {step}/6</span>
        <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
          <motion.div initial={{ width: 0 }} animate={{ width: '100%' }} transition={{ delay: 0.5 + i * 0.3, duration: 0.3 }}
            className="h-full bg-gradient-to-r from-primary to-accent rounded-full" />
        </div>
        <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.8 + i * 0.3 }} className="text-success text-xs">✓</motion.span>
      </motion.div>
    ))}
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 2.5 }}>
      <Box color="success" className="glow-success">myapp:latest ✅</Box>
    </motion.div>
  </div>
);

// Level 9: Volumes
const Level9Diagram = () => (
  <div className="flex flex-col md:flex-row gap-8 items-center justify-center">
    <div className="flex flex-col items-center gap-2">
      <motion.h4 {...fadeUp} className="text-sm font-display text-destructive">Without Volume</motion.h4>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="border border-primary/40 rounded p-3 bg-primary/5">
        <div className="text-xs text-primary font-mono">Container</div>
        <div className="text-[10px] text-muted-foreground">📁 Data</div>
      </motion.div>
      <motion.div initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 1.5, duration: 0.5 }} className="text-lg">💥</motion.div>
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="text-xs text-destructive">Data lost ✗</motion.span>
    </div>
    <div className="flex flex-col items-center gap-2">
      <motion.h4 {...fadeUp} className="text-sm font-display text-success">With Volume</motion.h4>
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.4 }} className="border border-primary/40 rounded p-3 bg-primary/5">
        <div className="text-xs text-primary font-mono">Container</div>
      </motion.div>
      <Arrow delay={0.6} />
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.8 }}
        className="border border-success/40 rounded-full p-3 bg-success/5">
        <div className="text-xs text-success font-mono">💾 Volume</div>
      </motion.div>
      <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 2 }} className="text-xs text-success">Data persists ✓</motion.span>
    </div>
  </div>
);

// Level 10: Networking
const Level10Diagram = () => (
  <div className="flex flex-col items-center gap-3">
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 0.2 }}
      className="border-2 border-dashed border-primary/30 rounded-xl p-6">
      <div className="flex gap-4 items-center flex-wrap justify-center">
        {['Web', 'App', 'DB'].map((name, i) => (
          <div key={name} className="flex items-center gap-2">
            <Box color={i === 0 ? 'accent' : i === 1 ? 'primary' : 'warning'} delay={0.4 + i * 0.2}>{name}</Box>
            {i < 2 && <motion.span initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1 + i * 0.2 }} className="text-primary">⟷</motion.span>}
          </div>
        ))}
      </div>
      <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.5 }} className="text-[10px] text-primary/60 text-center mt-2">docker network</motion.p>
    </motion.div>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="flex items-center gap-2">
      <span className="text-xs text-muted-foreground">User</span>
      <Arrow direction="right" delay={2} />
      <span className="text-xs text-accent">:8080</span>
    </motion.div>
    <Label delay={2.2}>Containers on the same network can communicate</Label>
  </div>
);

// Level 11: Docker Compose
const Level11Diagram = () => (
  <div className="flex flex-col items-center gap-4">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="terminal-bg rounded-lg p-3 border border-border text-xs font-mono max-w-xs w-full">
      <div className="text-muted-foreground mb-1">docker-compose.yml</div>
      {['services:', '  web: nginx', '  app: node', '  db: postgres'].map((line, i) => (
        <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 + i * 0.3 }} className="text-accent">{line}</motion.div>
      ))}
    </motion.div>
    <Arrow delay={1.5} label="docker compose up" />
    <div className="flex gap-3">
      {['nginx', 'node', 'postgres'].map((svc, i) => (
        <motion.div key={svc} initial={{ opacity: 0, scale: 0 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 1.8 + i * 0.15, type: 'spring', stiffness: 200 }}>
          <Box color={i === 0 ? 'accent' : i === 1 ? 'success' : 'warning'}>{svc}</Box>
        </motion.div>
      ))}
    </div>
    <Label delay={2.5}>Entire stack starts together</Label>
  </div>
);

// Level 12: Container Lifecycle
const Level12Diagram = () => {
  const states = [
    { name: 'Created', color: 'default' as const },
    { name: 'Running', color: 'success' as const },
    { name: 'Paused', color: 'warning' as const },
    { name: 'Stopped', color: 'destructive' as const },
  ];
  return (
    <div className="flex flex-wrap items-center justify-center gap-3">
      {states.map((state, i) => (
        <div key={state.name} className="flex items-center gap-2">
          <Box color={state.color} delay={i * 0.3}>{state.name}</Box>
          {i < states.length - 1 && <Arrow direction="right" delay={i * 0.3 + 0.15} />}
        </div>
      ))}
      <Label delay={1.5}>Containers move through lifecycle states</Label>
    </div>
  );
};

// Level 13: Docker Registry
const Level13Diagram = () => (
  <div className="flex items-center justify-center gap-4 flex-wrap">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }} className="flex flex-col items-center">
      <Box color="primary">myapp:v1</Box>
      <span className="text-[10px] text-muted-foreground mt-1">Local</span>
    </motion.div>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.6 }} className="flex flex-col items-center gap-1">
      <span className="text-xs text-primary font-mono">docker push →</span>
      <svg width="50" height="10"><line x1="0" y1="5" x2="50" y2="5" stroke="hsl(221,83%,53%)" strokeWidth="2" strokeDasharray="4 3" style={{ animation: 'flowArrow 1.5s linear infinite' }} /></svg>
    </motion.div>
    <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: 1, type: 'spring' }}
      className="flex flex-col items-center">
      <div className="text-3xl animate-float">☁️</div>
      <span className="text-xs text-primary font-mono">Docker Hub</span>
    </motion.div>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.4 }} className="flex flex-col items-center gap-1">
      <span className="text-xs text-success font-mono">← docker pull</span>
      <svg width="50" height="10"><line x1="0" y1="5" x2="50" y2="5" stroke="hsl(160,84%,39%)" strokeWidth="2" strokeDasharray="4 3" style={{ animation: 'flowArrow 1.5s linear infinite' }} /></svg>
    </motion.div>
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 1.8 }} className="flex flex-col items-center">
      <Box color="success">myapp:v1</Box>
      <span className="text-[10px] text-muted-foreground mt-1">Remote</span>
    </motion.div>
  </div>
);

// Level 14: Scaling
const Level14Diagram = () => (
  <div className="flex flex-col items-center gap-3">
    <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}>
      <Box color="accent" className="glow-accent">Load Balancer</Box>
    </motion.div>
    <div className="flex gap-1">
      {[1, 2, 3].map(i => <Arrow key={i} delay={0.4 + i * 0.1} />)}
    </div>
    <div className="flex gap-3">
      {[1, 2, 3].map(i => (
        <motion.div key={i} initial={{ opacity: 0, scale: 0.5 }} animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.8 + i * 0.2, type: 'spring' }}>
          <Box color="primary">Replica {i}</Box>
        </motion.div>
      ))}
    </div>
    <Label delay={1.8}>Scale horizontally with multiple replicas</Label>
  </div>
);

// Level 15: Production Architecture
const Level15Diagram = () => (
  <div className="flex flex-col items-center gap-2">
    <Box color="default" delay={0.1}>👤 User Browser</Box>
    <Arrow delay={0.3} />
    <Box color="accent" delay={0.4} className="glow-accent">Load Balancer</Box>
    <Arrow delay={0.6} />
    <div className="flex gap-2">
      {[1, 2, 3].map(i => <Box key={i} color="primary" delay={0.7 + i * 0.1}>Web {i}</Box>)}
    </div>
    <Arrow delay={1.1} />
    <div className="flex gap-2">
      {[1, 2].map(i => <Box key={i} color="success" delay={1.2 + i * 0.1}>App {i}</Box>)}
    </div>
    <Arrow delay={1.5} />
    <div className="flex gap-3">
      <Box color="warning" delay={1.6}>🐘 Postgres</Box>
      <Box color="destructive" delay={1.7}>⚡ Redis</Box>
    </div>
    <Arrow delay={1.9} />
    <Box color="accent" delay={2}>💾 Volume (persistent)</Box>
    <Label delay={2.3}>Production Docker architecture</Label>
  </div>
);

const diagrams: Record<number, () => JSX.Element> = {
  1: Level1Diagram, 2: Level2Diagram, 3: Level3Diagram, 4: Level4Diagram,
  5: Level5Diagram, 6: Level6Diagram, 7: Level7Diagram, 8: Level8Diagram,
  9: Level9Diagram, 10: Level10Diagram, 11: Level11Diagram, 12: Level12Diagram,
  13: Level13Diagram, 14: Level14Diagram, 15: Level15Diagram,
};

const VisualExplainer = ({ levelId }: { levelId: number }) => {
  const Diagram = diagrams[levelId];
  if (!Diagram) return null;
  return (
    <div className="dot-grid rounded-xl p-8 border border-border bg-card/50 min-h-[300px] flex items-center justify-center">
      <Diagram />
    </div>
  );
};

export default VisualExplainer;
