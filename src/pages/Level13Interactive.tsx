import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useGameStore } from '@/store/useGameStore';

type TopicId = 'what-registry' | 'push-pull' | 'private-reg' | 'tagging' | 'ci-cd';

interface TopicMeta {
  id: TopicId; label: string; icon: string; color: string;
  colorClass: string; borderClass: string; bgTint: string; glowStyle: string;
}

const TOPICS: TopicMeta[] = [
  { id: 'what-registry', label: 'What is a Registry', icon: '🏛️', color: '#06B6D4', colorClass: 'text-cyan-400', borderClass: 'border-cyan-500', bgTint: 'bg-cyan-500/10', glowStyle: '0 0 12px rgba(6,182,212,0.4)' },
  { id: 'push-pull', label: 'Push & Pull', icon: '🔄', color: '#10B981', colorClass: 'text-emerald-400', borderClass: 'border-emerald-500', bgTint: 'bg-emerald-500/10', glowStyle: '0 0 12px rgba(16,185,129,0.4)' },
  { id: 'private-reg', label: 'Private Registries', icon: '🔐', color: '#8B5CF6', colorClass: 'text-purple-400', borderClass: 'border-purple-500', bgTint: 'bg-purple-500/10', glowStyle: '0 0 12px rgba(139,92,246,0.4)' },
  { id: 'tagging', label: 'Tagging Strategies', icon: '🏷️', color: '#F59E0B', colorClass: 'text-amber-400', borderClass: 'border-amber-500', bgTint: 'bg-amber-500/10', glowStyle: '0 0 12px rgba(245,158,11,0.4)' },
  { id: 'ci-cd', label: 'Registry in CI/CD', icon: '🚀', color: '#F97316', colorClass: 'text-orange-400', borderClass: 'border-orange-500', bgTint: 'bg-orange-500/10', glowStyle: '0 0 12px rgba(249,115,22,0.4)' },
];

const INFO_LOGS: Record<TopicId, { prefix: string; lines: string[] }> = {
  'what-registry': {
    prefix: '> Loading: Docker Registry Fundamentals',
    lines: [
      '# A registry is a storage and distribution system for Docker images',
      '# Default registry: Docker Hub (docker.io)',
      '# Full image reference: [registry]/[namespace]/[repository]:[tag]',
      "# Short form 'nginx' expands to: docker.io/library/nginx:latest",
      '$ docker info | grep Registry',
      '  Registry: https://index.docker.io/v1/',
      '# Override default: docker pull myregistry.com/myapp:1.0',
      '> Registry fundamentals loaded ✓',
    ],
  },
  'push-pull': {
    prefix: '> Loading: Push and Pull Workflow',
    lines: [
      '$ docker login                           # authenticate to Docker Hub',
      '$ docker tag myapp username/myapp:1.0.0  # tag with registry prefix',
      '$ docker push username/myapp:1.0.0       # upload layers to registry',
      '$ docker pull username/myapp:1.0.0       # download from registry',
      '# Layers already on server are SKIPPED (layer deduplication)',
      '# docker push output: "Layer already exists" = cached, not re-uploaded',
      '# Pull always checks for newer digest even if tag exists locally',
      '> Push and pull demo complete ✓',
    ],
  },
  'private-reg': {
    prefix: '> Loading: Private Registry Authentication',
    lines: [
      '# AWS ECR login (token expires every 12 hours):',
      '$ aws ecr get-login-password --region us-east-1 | \\',
      '    docker login --username AWS \\',
      '    --password-stdin 123456789.dkr.ecr.us-east-1.amazonaws.com',
      '# GitHub Container Registry:',
      '$ echo $CR_PAT | docker login ghcr.io -u USERNAME --password-stdin',
      '# Credentials stored at: ~/.docker/config.json',
      '# Use credential helpers for secure credential storage',
      '> Private registry authentication loaded ✓',
    ],
  },
  tagging: {
    prefix: '> Loading: Image Tagging Strategies',
    lines: [
      '# Strategy 1: Semantic versioning',
      '$ docker tag myapp myapp:1.2.3  # exact — always reproducible',
      '$ docker tag myapp myapp:1.2    # minor — gets patches',
      '$ docker tag myapp myapp:latest # latest — floating',
      '# Strategy 2: Git SHA (used in CI/CD)',
      '$ docker tag myapp myapp:$(git rev-parse --short HEAD)',
      '# Strategy 3: Environment tags',
      '$ docker tag myapp myapp:prod-$(date +%Y%m%d)',
      '# Golden rule: NEVER overwrite a tag used in production',
      '> Tagging strategies loaded ✓',
    ],
  },
  'ci-cd': {
    prefix: '> Loading: CI/CD Pipeline with Registry',
    lines: [
      '# CI workflow: commit → build → tag → push → deploy',
      '$ docker build -t myapp:${GIT_SHA} .',
      '$ docker tag myapp:${GIT_SHA} myapp:latest',
      '$ docker push myapp:${GIT_SHA}     # push with SHA (immutable)',
      '$ docker push myapp:latest         # push latest (mutable)',
      '# Production deploy:',
      '$ docker pull myapp:${GIT_SHA}     # pull exact version',
      '$ docker run -d myapp:${GIT_SHA}   # run exact version',
      '# Rollback:',
      '$ docker run -d myapp:${PREV_SHA}  # instant rollback!',
      '> CI/CD registry pipeline loaded ✓',
    ],
  },
};

interface CardSection { title: string; text: string }
const CARD_DATA: Record<TopicId, { heading: string; sections: CardSection[] }> = {
  'what-registry': {
    heading: 'Docker Registries Explained',
    sections: [
      { title: 'The core concept', text: "A Docker registry is like npm for packages or GitHub for code — but for container images. It stores image layers, manifests, and tags. Docker Hub is the default public registry. It hosts over 15 million images and serves billions of pulls per month." },
      { title: 'Image reference anatomy', text: "Every Docker image has a fully qualified reference:\nregistry.hub.docker.com/library/nginx:1.25.3\n├── registry host:   docker.io (implied default)\n├── namespace:       library (official images)\n├── repository:      nginx (the image name)\n└── tag:             1.25.3 (the version)\n\nShort form 'nginx' = 'docker.io/library/nginx:latest'\n'username/myapp:1.0' = 'docker.io/username/myapp:1.0'" },
      { title: 'Registry types', text: "Public: Docker Hub, Quay.io, GitHub CR (public repos)\nPrivate: Docker Hub (paid), AWS ECR, GitHub CR (private)\nSelf-hosted: Docker Registry v2 (OSS), Harbor (enterprise)\nCloud-native: AWS ECR, Google Artifact Registry, Azure ACR" },
      { title: 'Credentials storage', text: "docker login stores credentials in ~/.docker/config.json.\nCredentials are base64-encoded (NOT encrypted by default!).\nUse a credential helper for secure storage:\nLinux: docker-credential-secretservice\nmacOS: docker-credential-osxkeychain\nAWS: docker-credential-ecr-login" },
    ],
  },
  'push-pull': {
    heading: 'Pushing and Pulling Images',
    sections: [
      { title: 'The complete push workflow', text: "1. Build: docker build -t myapp .\n2. Tag for registry: docker tag myapp username/myapp:1.0.0\n3. Login: docker login\n4. Push: docker push username/myapp:1.0.0\nDocker uploads each layer separately. Already-uploaded layers are skipped ('Layer already exists'), making subsequent pushes fast." },
      { title: 'Layer deduplication', text: "Registries store layers by SHA256 content hash. If two images share a layer (e.g., both use ubuntu:22.04 as base), it's stored ONCE. This dramatically reduces storage costs and download times." },
      { title: 'Pulling', text: "docker pull username/myapp:1.0.0  — checks for newer digest\ndocker pull ubuntu:22.04  — specific version (recommended)\ndocker pull --platform linux/amd64 myapp  — specific architecture" },
      { title: 'Rate limits', text: "Docker Hub: 100 pulls/6h (unauthenticated), 200/6h (free), unlimited (paid). In CI/CD, always authenticate. Use --password-stdin, never --password in commands." },
    ],
  },
  'private-reg': {
    heading: 'Private Registry Options',
    sections: [
      { title: 'AWS ECR', text: "Native AWS container registry. Authentication uses temporary IAM credentials — tokens expire every 12 hours. Integrates with ECS, EKS, Lambda, CodeBuild.\nCost: $0.10/GB/month. Data transfer to AWS services is free.\nLogin: aws ecr get-login-password | docker login --username AWS --password-stdin ACCOUNT.dkr.ecr.REGION.amazonaws.com" },
      { title: 'GitHub Container Registry', text: "Stores images alongside GitHub repos. Public images are free. Private included in storage quota.\nAuth: PAT or GitHub Actions OIDC.\nURL: ghcr.io/OWNER/IMAGE:TAG\nIn Actions: use docker/login-action with secrets.GITHUB_TOKEN." },
      { title: 'Self-Hosted Registry', text: "docker run -d -p 5000:5000 --name registry \\\n  -v registry-data:/var/lib/registry registry:2\nAccess at: localhost:5000\nFor TLS and auth, use Harbor (enterprise-grade OSS registry)." },
      { title: 'Choosing a registry', text: "Small team: Docker Hub free tier (1 private repo)\nAWS shop: ECR (native IAM)\nGitHub-first: GHCR (free with repos, CI integration)\nMulti-cloud/enterprise: Harbor (self-hosted)" },
    ],
  },
  tagging: {
    heading: 'Production Image Tagging Strategies',
    sections: [
      { title: 'The immutability principle', text: "An image tag should be immutable in production — once you push myapp:1.2.3, that tag should ALWAYS point to the same image. The :latest tag is the only acceptable mutable tag, and even then, never use :latest in production deployments." },
      { title: 'Semantic versioning', text: "myapp:2.1.4    — exact patch (most stable)\nmyapp:2.1      — minor version (gets patches)\nmyapp:2        — major version (gets minor + patches)\nmyapp:latest   — most recent release\nThis is the pattern used by nginx, postgres, node, and all official images." },
      { title: 'Git SHA tagging (CI/CD)', text: "Tag every image with the git commit SHA:\nmyapp:a1b2c3d  — short SHA (7 chars, unique per commit)\nBenefits: perfect audit trail, instant rollback, ties image to code.\ndocker tag myapp myapp:$(git rev-parse --short HEAD)" },
      { title: 'Environment + build number', text: "myapp:dev-42         — CI build number\nmyapp:staging-1.2.3  — staging promoted version\nmyapp:prod-20240115  — date-stamped production release\nUseful for tracing exactly which build is deployed where." },
    ],
  },
  'ci-cd': {
    heading: 'Registries in CI/CD Pipelines',
    sections: [
      { title: 'The role of the registry', text: "In CI/CD, the registry is the immutable artifact store bridging build and deploy. CI builds and pushes. Deployment pulls and runs. The registry is the single source of truth for what gets deployed." },
      { title: 'GitHub Actions example', text: "Use official Docker actions:\ndocker/login-action    — authenticate\ndocker/build-push-action — build + push\ndocker/metadata-action — auto-generate tags\n\nKey pattern: push with BOTH sha tag (immutable) and latest (mutable)." },
      { title: 'OIDC for keyless auth', text: "Modern best practice: use OIDC for CI-to-registry auth.\nGitHub Actions → AWS ECR via OIDC: no stored AWS credentials.\nGitHub Actions → GHCR: use GITHUB_TOKEN (auto-provided).\nEliminates long-lived secrets in CI configuration." },
      { title: 'Rollback with SHA tags', text: "Current production: myapp:a1b2c3d (has bug)\nPrevious version: myapp:e4f5g6h (known good)\nRollback: docker run -d myapp:e4f5g6h\nNo rebuild needed. Image already in registry.\nRollback time: seconds, not minutes." },
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

const MachineNode = ({ icon, label, sub, color, active }: { icon: string; label: string; sub?: string; color: string; active?: boolean }) => (
  <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
    className="rounded-lg border-2 px-3 py-2 flex flex-col items-center gap-0.5"
    style={{ borderColor: active ? color : `${color}50`, background: active ? `${color}10` : '#111827', boxShadow: active ? `0 0 12px ${color}40` : 'none' }}>
    <span className="text-lg">{icon}</span>
    <span className="text-[9px] font-mono font-bold" style={{ color }}>{label}</span>
    {sub && <span className="text-[7px] text-foreground/30">{sub}</span>}
  </motion.div>
);

// ─── Animation 1: What is a Registry ─────────────────────────────────────────

const AnimWhatRegistry = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 700),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 3200),
      setTimeout(onDone, 3900),
    ];
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex flex-col items-center p-4 gap-3 overflow-y-auto">
      {/* Central Docker Hub */}
      <motion.div initial={{ opacity: 0, scale: 0.8 }} animate={{ opacity: 1, scale: 1 }}
        className="rounded-xl border-2 px-6 py-3 flex flex-col items-center" style={{ borderColor: '#06B6D4', background: '#06B6D408', boxShadow: '0 0 20px #06B6D420' }}>
        <span className="text-2xl">🐳</span>
        <span className="text-sm font-syne font-bold text-cyan-400">Docker Hub</span>
        <span className="text-[8px] text-foreground/30 font-mono">hub.docker.com</span>
      </motion.div>

      {/* Stats */}
      <div className="flex gap-2">
        {['📦 15M+ images', '⬇️ 13B+ pulls/mo', '👥 7M+ devs'].map((s, i) => (
          <motion.span key={s} initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 + i * 0.15 }}
            className="px-2 py-0.5 rounded text-[8px] font-mono text-cyan-400/70 bg-cyan-500/5 border border-cyan-500/20">{s}</motion.span>
        ))}
      </div>

      {/* Machines around hub */}
      {phase >= 1 && (
        <div className="flex items-center justify-center gap-6">
          <MachineNode icon="💻" label="Developer" sub="builds & pushes" color="#06B6D4" />
          <div className="flex flex-col items-center gap-0.5 text-[7px] font-mono text-cyan-400/40">
            <span>push →</span><span>← pull</span>
          </div>
          <MachineNode icon="🌐" label="Docker Hub" color="#06B6D4" active />
          <div className="flex flex-col items-center gap-0.5 text-[7px] font-mono text-cyan-400/40">
            <span>push →</span><span>← pull</span>
          </div>
          <MachineNode icon="🖥️" label="Production" sub="pulls & runs" color="#06B6D4" />
        </div>
      )}

      {/* Packet flow labels */}
      {phase >= 2 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3 text-[8px] font-mono">
          <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-400">⬆ docker push myapp:1.0</span>
          <span className="px-2 py-0.5 rounded bg-cyan-500/10 border border-cyan-500/20 text-cyan-400">⬇ docker pull myapp:1.0</span>
        </motion.div>
      )}

      {/* Registry types */}
      {phase >= 3 && (
        <div className="flex gap-2 w-full max-w-lg">
          {[
            { icon: '🌍', title: 'Public', desc: 'Docker Hub, Quay.io — free' },
            { icon: '🔐', title: 'Private', desc: 'AWS ECR, GitHub CR — auth' },
            { icon: '🏠', title: 'Self-Hosted', desc: 'Registry OSS, Harbor' },
          ].map((rt, i) => (
            <motion.div key={rt.title} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
              className="flex-1 rounded-lg border p-2 text-center" style={{ borderColor: '#1F2D45', background: '#111827' }}>
              <span className="text-base">{rt.icon}</span>
              <div className="text-[9px] font-mono font-bold text-foreground/70">{rt.title}</div>
              <div className="text-[7px] text-foreground/30">{rt.desc}</div>
            </motion.div>
          ))}
        </div>
      )}

      {/* Image reference anatomy */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="w-full max-w-lg rounded-lg border p-3" style={{ borderColor: '#06B6D430', background: '#0D1117' }}>
          <div className="text-[8px] font-syne font-bold text-cyan-400 mb-1.5">Image Reference Anatomy</div>
          <div className="font-mono text-[9px] mb-2">
            <span className="text-cyan-400">docker.io</span>
            <span className="text-foreground/30"> / </span>
            <span className="text-pink-400">library</span>
            <span className="text-foreground/30"> / </span>
            <span className="text-foreground">nginx</span>
            <span className="text-foreground/30"> : </span>
            <span className="text-amber-400">1.25.3</span>
          </div>
          <div className="flex gap-2 text-[7px] font-mono">
            <span className="text-cyan-400/60">registry</span>
            <span className="text-pink-400/60">namespace</span>
            <span className="text-foreground/40">repository</span>
            <span className="text-amber-400/60">tag</span>
          </div>
          <div className="text-[7px] font-mono text-foreground/30 mt-1">"nginx" = docker.io/library/nginx:latest</div>
        </motion.div>
      )}

      {phase >= 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="px-4 py-1.5 rounded-lg text-center" style={{ background: '#06B6D410', border: '1px solid #06B6D430' }}>
          <span className="text-[10px] font-mono text-cyan-400">A registry is the postal service of the container world.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 2: Push & Pull ────────────────────────────────────────────────

const AnimPushPull = ({ onDone }: { onDone: () => void }) => {
  const [termLines, setTermLines] = useState<{ text: string; isCmd?: boolean; isSuccess?: boolean }[]>([]);
  const [flowState, setFlowState] = useState<'idle' | 'auth' | 'tagged' | 'pushing' | 'pushed' | 'pulling' | 'running'>('idle');
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => { scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' }); }, [termLines.length]);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];

    // Auth
    t.push(setTimeout(() => {
      setFlowState('auth');
      setTermLines(p => [...p, { text: '$ docker login', isCmd: true }]);
      setTimeout(() => setTermLines(p => [...p, { text: 'Username: jiten-dev' }, { text: 'Login Succeeded ✓', isSuccess: true }]), 200);
    }, 200));

    // Tag
    t.push(setTimeout(() => {
      setFlowState('tagged');
      setTermLines(p => [...p, { text: '$ docker build -t myapp .', isCmd: true }]);
      setTimeout(() => setTermLines(p => [...p, { text: 'Successfully tagged myapp:latest ✓', isSuccess: true }]), 200);
      setTimeout(() => {
        setTermLines(p => [...p, { text: '$ docker tag myapp jiten-dev/myapp:1.0.0', isCmd: true }]);
      }, 400);
    }, 900));

    // Push
    t.push(setTimeout(() => {
      setFlowState('pushing');
      setTermLines(p => [...p, { text: '$ docker push jiten-dev/myapp:1.0.0', isCmd: true }]);
      setTimeout(() => setTermLines(p => [...p, { text: 'a1b2c3d4: Pushing  1.0MB/45.2MB' }]), 200);
      setTimeout(() => setTermLines(p => [...p, { text: 'b2c3d4e5: Pushing  512kB/12.3MB' }]), 350);
      setTimeout(() => setTermLines(p => [...p, { text: 'c3d4e5f6: Layer already exists ✓', isSuccess: true }]), 500);
      setTimeout(() => {
        setTermLines(p => [...p, { text: '1.0.0: digest: sha256:abc123... ✓', isSuccess: true }]);
        setFlowState('pushed');
      }, 700);
    }, 1800));

    // Pull on remote
    t.push(setTimeout(() => {
      setFlowState('pulling');
      setTermLines(p => [...p, { text: '$ ssh remote-server', isCmd: true }]);
      setTimeout(() => setTermLines(p => [...p, { text: '$ docker pull jiten-dev/myapp:1.0.0', isCmd: true }]), 200);
      setTimeout(() => setTermLines(p => [...p, { text: 'a1b2c3d4: Pull complete ✓', isSuccess: true }]), 400);
      setTimeout(() => setTermLines(p => [...p, { text: 'Status: Downloaded ✓', isSuccess: true }]), 600);
    }, 3000));

    // Run
    t.push(setTimeout(() => {
      setFlowState('running');
      setTermLines(p => [...p, { text: '$ docker run -d -p 80:3000 jiten-dev/myapp:1.0.0', isCmd: true }]);
      setTimeout(() => setTermLines(p => [...p, { text: 'e5f6g7h8 ● RUNNING', isSuccess: true }]), 200);
    }, 4000));

    t.push(setTimeout(onDone, 4800));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex gap-0">
      {/* Terminal */}
      <div className="flex-[55] flex flex-col border-r" style={{ borderColor: '#1F2D45' }}>
        <TermHeader title="push & pull workflow" />
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

      {/* Workflow diagram */}
      <div className="flex-[45] flex flex-col items-center justify-center gap-3 p-3" style={{ background: '#0F172A' }}>
        <div className="text-[10px] font-syne font-bold text-emerald-400">Distribution Flow</div>

        <MachineNode icon="💻" label="Your Machine" color="#10B981" active={flowState === 'auth' || flowState === 'tagged' || flowState === 'pushing'} />

        {/* Push arrow */}
        <motion.div animate={{ opacity: flowState === 'pushing' || flowState === 'pushed' ? 1 : 0.2 }}
          className="flex flex-col items-center gap-0.5">
          <span className="text-[8px] font-mono text-emerald-400/60">⬆ push</span>
          <svg width="4" height="16"><line x1="2" y1="0" x2="2" y2="16" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
        </motion.div>

        <MachineNode icon="🌐" label="Docker Hub" color="#10B981" active={flowState === 'pushed' || flowState === 'pulling'} />

        {/* Pull arrow */}
        <motion.div animate={{ opacity: flowState === 'pulling' || flowState === 'running' ? 1 : 0.2 }}
          className="flex flex-col items-center gap-0.5">
          <svg width="4" height="16"><line x1="2" y1="0" x2="2" y2="16" stroke="#10B981" strokeWidth="1.5" strokeDasharray="4 3" /></svg>
          <span className="text-[8px] font-mono text-emerald-400/60">⬇ pull</span>
        </motion.div>

        <MachineNode icon="🖥️" label="Remote Server" color="#10B981" active={flowState === 'running'} />

        {flowState === 'running' && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center gap-1.5 text-[8px] font-mono text-emerald-400">
            <span>● RUNNING</span><span className="text-foreground/30">→</span><span>🌍 World</span>
          </motion.div>
        )}

        {flowState === 'running' && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="px-3 py-1 rounded-lg text-center" style={{ background: '#10B98110', border: '1px solid #10B98130' }}>
            <span className="text-[9px] font-mono text-emerald-400">Build locally. Push. Pull anywhere. Run everywhere.</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Animation 3: Private Registries ─────────────────────────────────────────

const AnimPrivateReg = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 800),
      setTimeout(() => setPhase(2), 2200),
      setTimeout(() => setPhase(3), 3200),
      setTimeout(() => setPhase(4), 4000),
      setTimeout(onDone, 4700),
    ];
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  const providers = [
    { name: 'AWS ECR', color: '#F97316', badge: 'Pay per GB', login: 'aws ecr get-login-password | docker login ...amazonaws.com', push: '123456789.dkr.ecr.us-east-1.amazonaws.com/myapp:1.0' },
    { name: 'GitHub CR', color: '#8B5CF6', badge: 'Free public', login: 'echo $CR_PAT | docker login ghcr.io -u USER --password-stdin', push: 'ghcr.io/username/myapp:1.0' },
    { name: 'Self-Hosted', color: '#06B6D4', badge: 'Full control', login: 'docker login registry.mycompany.com', push: 'registry.mycompany.com/myapp:1.0' },
  ];

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2 overflow-y-auto">
      {/* Provider cards */}
      <div className="flex gap-2">
        {providers.map((p, i) => (
          <motion.div key={p.name} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.15 }}
            className="flex-1 rounded-lg border p-2" style={{ borderColor: `${p.color}40`, background: `${p.color}06` }}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] font-mono font-bold" style={{ color: p.color }}>{p.name}</span>
              <span className="text-[7px] font-mono text-foreground/30 bg-foreground/5 px-1.5 py-0.5 rounded">{p.badge}</span>
            </div>

            {/* Login command */}
            {phase >= 1 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="rounded p-1 mt-1 mb-1" style={{ background: '#000' }}>
                <div className="text-[7px] font-mono text-foreground/40 break-all">{p.login}</div>
              </motion.div>
            )}

            {/* Push target */}
            {phase >= 2 && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="text-[7px] font-mono text-foreground/30 break-all">
                push → {p.push}
              </motion.div>
            )}
          </motion.div>
        ))}
      </div>

      {/* Comparison table */}
      {phase >= 3 && (
        <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border overflow-hidden" style={{ borderColor: '#1F2D45' }}>
          <table className="w-full text-[8px] font-mono">
            <thead>
              <tr style={{ background: '#0D1117' }}>
                <th className="text-left px-2 py-1 text-foreground/40 border-b" style={{ borderColor: '#1F2D45' }}>Feature</th>
                <th className="text-left px-2 py-1 text-orange-400/60 border-b" style={{ borderColor: '#1F2D45' }}>Docker Hub</th>
                <th className="text-left px-2 py-1 text-orange-400/60 border-b" style={{ borderColor: '#1F2D45' }}>AWS ECR</th>
                <th className="text-left px-2 py-1 text-purple-400/60 border-b" style={{ borderColor: '#1F2D45' }}>GitHub CR</th>
              </tr>
            </thead>
            <tbody>
              {[
                ['Free tier', 'Limited', '500MB/mo', '500MB/mo'],
                ['Private imgs', 'Paid', 'Yes', 'Yes'],
                ['CI integration', 'Good', 'Excellent', 'Excellent'],
                ['Auth method', 'Username', 'IAM roles', 'Token/OIDC'],
              ].map((row, ri) => (
                <motion.tr key={ri} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: ri * 0.1 }}
                  style={{ background: ri % 2 ? '#111827' : '#0F172A' }}>
                  {row.map((cell, ci) => (
                    <td key={ci} className={`px-2 py-1 ${ci === 0 ? 'text-foreground/40' : 'text-foreground/60'}`}>{cell}</td>
                  ))}
                </motion.tr>
              ))}
            </tbody>
          </table>
        </motion.div>
      )}

      {/* Registry mirror */}
      {phase >= 4 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border p-2" style={{ borderColor: '#8B5CF630', background: '#8B5CF606' }}>
          <div className="text-[9px] font-syne font-bold text-purple-400 mb-1">Registry Mirror</div>
          <div className="flex items-center justify-center gap-2 text-[8px] font-mono text-foreground/50">
            <span>Docker Hub</span><span className="text-purple-400">→</span><span>Local Mirror</span><span className="text-purple-400">→</span><span>Team × 5</span>
          </div>
          <div className="text-[7px] text-foreground/30 text-center mt-0.5">Pull once, serve team. Faster builds, lower costs.</div>
        </motion.div>
      )}

      {phase >= 4 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="px-3 py-1 rounded-lg text-center" style={{ background: '#8B5CF610', border: '1px solid #8B5CF630' }}>
          <span className="text-[10px] font-mono text-purple-400">Private registries = access control + faster pulls + no rate limits.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Animation 4: Tagging Strategies ─────────────────────────────────────────

const AnimTagging = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);

  useEffect(() => {
    const t = [
      setTimeout(() => setPhase(1), 600),
      setTimeout(() => setPhase(2), 1500),
      setTimeout(() => setPhase(3), 2400),
      setTimeout(() => setPhase(4), 3200),
      setTimeout(onDone, 3900),
    ];
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  return (
    <div className="w-full h-full flex gap-0">
      {/* Left: Commands */}
      <div className="flex-[55] flex flex-col border-r p-3 gap-2 overflow-y-auto" style={{ borderColor: '#1F2D45' }}>
        {/* Problem: latest only */}
        <div className="rounded border p-2" style={{ borderColor: '#EF444430', background: '#EF444408' }}>
          <div className="flex items-center gap-2 mb-0.5">
            <span className="text-amber-400">❓</span>
            <span className="text-[9px] font-mono text-red-400">myapp:latest — what version is this?</span>
          </div>
          <span className="text-[7px] text-foreground/30">⚠️ Impossible to track what's deployed in production</span>
        </div>

        {/* Semver */}
        {phase >= 1 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded border p-2" style={{ borderColor: '#F59E0B30', background: '#0D1117' }}>
            <div className="text-[8px] font-syne font-bold text-amber-400 mb-1">Semantic Versioning</div>
            <pre className="text-[8px] font-mono text-foreground/60 leading-4">{`$ docker tag myapp myapp:1.0.0   # exact patch
$ docker tag myapp myapp:1.0     # minor
$ docker tag myapp myapp:1       # major
$ docker tag myapp myapp:latest  # floating`}</pre>
          </motion.div>
        )}

        {/* Git SHA */}
        {phase >= 2 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded border p-2" style={{ borderColor: '#F59E0B30', background: '#0D1117' }}>
            <div className="text-[8px] font-syne font-bold text-amber-400 mb-1">Git SHA Tags</div>
            <pre className="text-[8px] font-mono text-foreground/60 leading-4">{`$ docker tag myapp myapp:$(git rev-parse --short HEAD)
# Result: myapp:a1b2c3d`}</pre>
          </motion.div>
        )}

        {/* Immutability */}
        {phase >= 4 && (
          <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
            className="rounded-lg border p-2" style={{ borderColor: '#F59E0B40', background: '#F59E0B08' }}>
            <div className="text-[9px] font-mono text-amber-400 font-bold mb-0.5">🔒 Golden Rule</div>
            <div className="text-[8px] text-foreground/50">Never mutate a tag in production. myapp:1.2.3 should ALWAYS point to the same image.</div>
            <div className="flex gap-2 mt-1 text-[7px] font-mono">
              <span className="text-red-400">:latest = mutable ⚠️</span>
              <span className="text-emerald-400">:1.2.3 = immutable ✓</span>
            </div>
          </motion.div>
        )}
      </div>

      {/* Right: Tag timeline */}
      <div className="flex-[45] flex flex-col p-3 gap-2 overflow-y-auto" style={{ background: '#0F172A' }}>
        <div className="text-[10px] font-syne font-bold text-amber-400 text-center">Tag Timeline</div>

        <div className="space-y-2 relative">
          {/* Timeline line */}
          <div className="absolute left-3 top-0 bottom-0 w-0.5 bg-amber-500/20 rounded" />

          {/* latest only */}
          <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="pl-6 relative">
            <div className="absolute left-2 top-1.5 w-2 h-2 rounded-full bg-red-500/50 border border-red-500" />
            <span className="px-1.5 py-0.5 rounded text-[8px] font-mono bg-red-500/10 text-red-400 border border-red-500/20">myapp:latest</span>
            <span className="text-[7px] text-foreground/20 ml-1">❓</span>
          </motion.div>

          {/* Semver tags */}
          {phase >= 1 && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="pl-6 relative">
              <div className="absolute left-2 top-1.5 w-2 h-2 rounded-full bg-amber-500/50 border border-amber-500" />
              <div className="flex flex-wrap gap-1">
                {['1.0.0', '1.0', '1', 'latest'].map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 rounded text-[7px] font-mono bg-amber-500/10 text-amber-400 border border-amber-500/20">{tag}</span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Git SHA */}
          {phase >= 2 && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="pl-6 relative">
              <div className="absolute left-2 top-1.5 w-2 h-2 rounded-full bg-cyan-500/50 border border-cyan-500" />
              <div className="flex flex-wrap gap-1">
                {['a1b2c3d', 'v1.2.3', 'main-42'].map(tag => (
                  <span key={tag} className="px-1.5 py-0.5 rounded text-[7px] font-mono bg-cyan-500/10 text-cyan-400 border border-cyan-500/20">{tag}</span>
                ))}
              </div>
            </motion.div>
          )}

          {/* Environment rails */}
          {phase >= 3 && (
            <motion.div initial={{ opacity: 0, x: 8 }} animate={{ opacity: 1, x: 0 }} className="pl-6 space-y-1 relative">
              <div className="absolute left-2 top-1.5 w-2 h-2 rounded-full bg-emerald-500/50 border border-emerald-500" />
              {[
                { env: 'dev', tag: 'dev-a1b2c3d', color: '#06B6D4', freq: '(every commit)' },
                { env: 'staging', tag: 'staging-1.2.3', color: '#F59E0B', freq: '(every PR merge)' },
                { env: 'prod', tag: 'prod-1.2.0', color: '#10B981', freq: '(manual promotion)' },
              ].map(e => (
                <div key={e.env} className="flex items-center gap-1.5">
                  <span className="px-1.5 py-0.5 rounded text-[7px] font-mono border" style={{ color: e.color, borderColor: `${e.color}30`, background: `${e.color}10` }}>{e.tag}</span>
                  <span className="text-[6px] text-foreground/20">{e.freq}</span>
                </div>
              ))}
            </motion.div>
          )}
        </div>

        {phase >= 4 && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="mt-auto px-3 py-1 rounded-lg text-center" style={{ background: '#F59E0B10', border: '1px solid #F59E0B30' }}>
            <span className="text-[9px] font-mono text-amber-400">SHA tags in CI. Semver for releases. Never mutate.</span>
          </motion.div>
        )}
      </div>
    </div>
  );
};

// ─── Animation 5: Registry in CI/CD ──────────────────────────────────────────

const AnimCICD = ({ onDone }: { onDone: () => void }) => {
  const [phase, setPhase] = useState(0);
  const [rollback, setRollback] = useState(false);

  useEffect(() => {
    const t: ReturnType<typeof setTimeout>[] = [];
    t.push(setTimeout(() => setPhase(1), 600));
    t.push(setTimeout(() => setPhase(2), 1800));
    t.push(setTimeout(() => setPhase(3), 3000));
    t.push(setTimeout(() => { setPhase(4); setRollback(true); }, 3600));
    t.push(setTimeout(() => setRollback(false), 4200));
    t.push(setTimeout(() => setPhase(5), 4400));
    t.push(setTimeout(onDone, 5000));
    return () => t.forEach(clearTimeout);
  }, [onDone]);

  const pipelineNodes = [
    { icon: '👨‍💻', label: 'Developer', active: phase >= 0 },
    { icon: '📝', label: 'git push', active: phase >= 0 },
    { icon: '🔧', label: 'CI Runner', active: phase >= 1 },
    { icon: '🌐', label: 'Registry', active: phase >= 2 },
    { icon: '🖥️', label: 'Production', active: phase >= 3 },
  ];

  const ciSteps = [
    'git clone (checkout)',
    'docker build -t myapp:${SHA}',
    'docker tag myapp:${SHA} myapp:latest',
    'docker login registry',
    'docker push myapp:${SHA}',
    'docker push myapp:latest',
  ];

  return (
    <div className="w-full h-full flex flex-col p-3 gap-2 overflow-y-auto">
      {/* Pipeline */}
      <div className="flex items-center justify-center gap-1.5 flex-wrap">
        {pipelineNodes.map((node, i) => (
          <motion.div key={i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: node.active ? 1 : 0.3, x: 0 }} transition={{ delay: i * 0.15 }}
            className="flex items-center gap-1.5">
            <div className="rounded-lg border px-2 py-1 flex flex-col items-center"
              style={{ borderColor: node.active ? '#F97316' : '#1F2D45', background: node.active ? '#F9731608' : '#111827' }}>
              <span className="text-sm">{node.icon}</span>
              <span className="text-[7px] font-mono" style={{ color: node.active ? '#F97316' : '#475569' }}>{node.label}</span>
            </div>
            {i < pipelineNodes.length - 1 && <span className="text-[8px] text-orange-400/40">→</span>}
          </motion.div>
        ))}
      </div>

      {/* CI steps */}
      {phase >= 1 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border p-2" style={{ borderColor: '#F9731630', background: '#0D1117' }}>
          <div className="text-[8px] font-syne font-bold text-orange-400 mb-1">CI Runner Steps</div>
          <div className="space-y-0.5">
            {ciSteps.map((step, i) => {
              const done = phase >= 2 || i < 4;
              return (
                <motion.div key={i} initial={{ opacity: 0, x: -4 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.1 }}
                  className="flex items-center gap-1.5 text-[8px] font-mono">
                  <span style={{ color: done ? '#10B981' : '#475569' }}>{done ? '✓' : '○'}</span>
                  <span className={done ? 'text-foreground/60' : 'text-foreground/30'}>{step}</span>
                </motion.div>
              );
            })}
          </div>
        </motion.div>
      )}

      {/* GitHub Actions YAML snippet */}
      {phase >= 2 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded border p-2" style={{ borderColor: '#1F2D45', background: '#000' }}>
          <div className="text-[7px] font-mono text-orange-400/50 mb-0.5">GitHub Actions (key parts):</div>
          <pre className="text-[8px] font-mono leading-3.5">{`- uses: `}<span className="text-cyan-400">docker/login-action@v3</span>{`
- uses: `}<span className="text-cyan-400">docker/build-push-action@v5</span>{`
  with:
    push: `}<span className="text-amber-400">true</span>{`
    tags: `}<span className="text-foreground/60">user/myapp:latest, user/myapp:$&#123;&#123;github.sha&#125;&#125;</span></pre>
        </motion.div>
      )}

      {/* Deploy + Rollback */}
      {phase >= 3 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border p-2" style={{ borderColor: rollback ? '#EF444440' : '#10B98130', background: rollback ? '#EF444408' : '#10B98108' }}>
          {!rollback ? (
            <div>
              <div className="text-[8px] font-syne font-bold text-emerald-400 mb-0.5">Production Deploy</div>
              <pre className="text-[8px] font-mono text-foreground/50 leading-3.5">{`$ docker pull myapp:a1b2c3d
$ docker run -d myapp:a1b2c3d`}</pre>
            </div>
          ) : (
            <div>
              <div className="text-[8px] font-syne font-bold text-red-400 mb-0.5">⚠️ Bug Found → Rollback</div>
              <pre className="text-[8px] font-mono text-foreground/50 leading-3.5">{`$ docker run -d myapp:e4f5g6h  ← previous SHA`}</pre>
              <span className="text-[7px] font-mono text-emerald-400">✓ Rollback complete in 3 seconds</span>
            </div>
          )}
        </motion.div>
      )}

      {/* Security callout */}
      {phase >= 5 && (
        <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }}
          className="rounded-lg border p-2" style={{ borderColor: '#F59E0B30', background: '#F59E0B06' }}>
          <div className="text-[8px] font-syne font-bold text-amber-400 mb-1">🔒 CI/CD Security</div>
          <div className="space-y-0.5 text-[7px] font-mono text-foreground/40">
            {['Use --password-stdin (not --password)', 'Store credentials as CI secrets', 'Use OIDC for cloud registries (no stored secrets)', 'Sign images with Docker Content Trust'].map((tip, i) => (
              <motion.div key={i} initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.12 }}>• {tip}</motion.div>
            ))}
          </div>
        </motion.div>
      )}

      {phase >= 5 && (
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
          className="px-3 py-1 rounded-lg text-center" style={{ background: '#F9731610', border: '1px solid #F9731630' }}>
          <span className="text-[9px] font-mono text-orange-400">Registry = immutable artifact store. SHA tags = perfect audit trail.</span>
        </motion.div>
      )}
    </div>
  );
};

// ─── Main Level 13 Page ──────────────────────────────────────────────────────

const Level13Interactive = () => {
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
      if (!completedLevels.includes(13)) completeLevel(13);
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
            <p className="text-[10px] text-muted-foreground font-mono">Level 13 — Docker Registry</p>
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
            <span className="font-syne font-bold text-emerald-400 text-sm">🎉 Level 13 Complete! +100 XP — You can distribute images worldwide!</span>
            <button onClick={() => navigate('/level/14')} className="px-4 py-1.5 rounded-lg bg-primary text-primary-foreground font-syne font-bold text-xs hover:opacity-90 transition-opacity">Continue to Level 14 →</button>
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
                  <motion.span className="text-6xl" animate={{ opacity: [1, 0.5, 1] }} transition={{ repeat: Infinity, duration: 2 }}>🏛️</motion.span>
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
                    {active === 'what-registry' && <AnimWhatRegistry onDone={handleAnimDone} />}
                    {active === 'push-pull' && <AnimPushPull onDone={handleAnimDone} />}
                    {active === 'private-reg' && <AnimPrivateReg onDone={handleAnimDone} />}
                    {active === 'tagging' && <AnimTagging onDone={handleAnimDone} />}
                    {active === 'ci-cd' && <AnimCICD onDone={handleAnimDone} />}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          <div className="shrink-0 border-t border-border" style={{ height: 200 }}>
            <div className="flex items-center gap-2 px-3 py-1.5 border-b border-border" style={{ background: '#0D1117' }}>
              <div className="w-2.5 h-2.5 rounded-full bg-red-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-amber-500/70" /><div className="w-2.5 h-2.5 rounded-full bg-emerald-500/70" />
              <span className="text-[10px] font-mono text-muted-foreground ml-1">docker-quest registry log</span>
            </div>
            <div ref={logRef} className="terminal-black p-3 overflow-y-auto font-mono text-[13px] leading-5" style={{ height: 'calc(200px - 28px)' }}>
              {infoLines.length === 0 ? (
                <span className="text-muted-foreground/50">{'> Click a topic to explore Docker Registries...'}<span className="inline-block w-2 h-4 bg-muted-foreground/50 ml-1" style={{ animation: 'blink 1s infinite' }} /></span>
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
              <div className="flex items-center gap-2"><span>📖</span><h2 className="font-syne font-bold text-foreground text-sm">Registry Reference</h2></div>
              <span className="text-[10px] text-muted-foreground font-mono">Level 13 — Docker Registry</span>
            </div>

            <div className="rounded-lg border p-4 mb-4" style={{ borderColor: '#1E3A5F', background: '#0F172A' }}>
              <h3 className="font-syne font-bold text-foreground text-sm mb-2">🏛️ Docker Registries</h3>
              <p className="text-xs text-foreground/70 leading-relaxed">
                A Docker registry is a service that stores and distributes Docker images.
                When you docker pull nginx, Docker downloads it from Docker Hub — the world's
                largest public registry. When you docker push myapp, you upload your image
                to a registry so others can pull it. Registries are the distribution backbone
                of the Docker ecosystem — the bridge between building an image and running
                it anywhere in the world.
              </p>
              <div className="flex flex-wrap gap-1.5 mt-3">
                {['Distribution', 'Push', 'Pull', 'Private', 'CI/CD', 'Immutable'].map(tag => (
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

export default Level13Interactive;
