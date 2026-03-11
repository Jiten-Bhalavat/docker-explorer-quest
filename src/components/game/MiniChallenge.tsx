import { useState, useCallback } from 'react';
import { motion } from 'framer-motion';
import TerminalSimulator from './TerminalSimulator';
import type { LevelData } from '@/data/levelData';

interface MiniChallengeProps {
  level: LevelData;
  onComplete: () => void;
}

const terminalOutputs: Record<string, string> = {
  'docker run hello-world': 'Hello from Docker!\nThis message shows that your installation appears to be working correctly.\n✓ Container ran successfully',
  'docker pull nginx': 'Using default tag: latest\nlatest: Pulling from library/nginx\n✓ Pull complete (3 layers)\nStatus: Downloaded newer image for nginx:latest',
  'docker run nginx': 'Container started: a1b2c3d4e5f6\nnginx is running on port 80',
  'docker images': 'REPOSITORY   TAG      IMAGE ID      CREATED       SIZE\nnginx        latest   a6bd71249d4b  2 hours ago   142MB\nmyapp        latest   f8e2a1b3c4d5  5 mins ago    89MB',
  'docker build -t myapp .': 'Step 1/6 : FROM node:18 ✓\nStep 2/6 : WORKDIR /app ✓\nStep 3/6 : COPY . . ✓\nStep 4/6 : RUN npm install ✓\nStep 5/6 : EXPOSE 3000 ✓\nStep 6/6 : CMD ["node","server.js"] ✓\nSuccessfully tagged myapp:latest ✓',
  'docker volume create mydata': 'mydata (volume created)',
  'docker network create mynetwork': 'mynetwork (network created)',
  'docker compose up': 'Creating network "app_default"\nCreating app_db_1 ... done\nCreating app_web_1 ... done\nCreating app_cache_1 ... done',
  'docker push myapp': 'Pushing myapp:latest to Docker Hub...\n✓ Push complete',
  'docker ps': 'CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES\na1b2c3d4e5f6   nginx   "nginx"   2m ago    Up 2m    80/tcp  happy_whale',
};

const MiniChallenge = ({ level, onComplete }: MiniChallengeProps) => {
  const [completed, setCompleted] = useState(false);
  const [failCount, setFailCount] = useState(0);
  const [matchedCommands, setMatchedCommands] = useState<string[]>([]);
  const [sliderValue, setSliderValue] = useState(1);

  const handleCommand = useCallback((cmd: string): { output: string; success: boolean } => {
    if (cmd === 'hint') {
      const hint = level.hints[Math.min(failCount, level.hints.length - 1)];
      return { output: `💡 Hint: ${hint}`, success: false };
    }
    if (cmd === 'clear') return { output: '', success: false };

    // Check for matching output
    const output = terminalOutputs[cmd];

    // Check if command matches expected
    const isExpected = level.expectedCommands.some(expected => {
      if (expected === 'docker stop') return cmd.startsWith('docker stop ');
      return cmd === expected;
    });

    if (isExpected) {
      const newMatched = [...matchedCommands, level.expectedCommands.find(e => cmd.startsWith(e)) || cmd];
      setMatchedCommands(newMatched);
      const allDone = level.expectedCommands.every(e => newMatched.some(m => m === e || cmd.startsWith(e)));
      if (allDone) {
        setTimeout(() => { setCompleted(true); onComplete(); }, 500);
      }
      return { output: output || `✓ Command executed successfully`, success: true };
    }

    setFailCount(f => f + 1);
    if (output) return { output, success: true };

    if (cmd.includes('docker') && cmd !== cmd.toLowerCase()) {
      return { output: "Commands are case-sensitive. Use lowercase.", success: false };
    }
    return { output: `Command not recognized. Type 'hint' for help.`, success: false };
  }, [level, matchedCommands, failCount, onComplete]);

  // Click-type challenges
  if (level.challengeType === 'click' || level.challengeType === 'button') {
    const buttonLabel = level.id === 3 ? '🐳 Install Docker' : level.id === 15 ? '🚀 Deploy to Production' : '✅ I Understand';
    return (
      <div className="flex flex-col items-center gap-6">
        <p className="text-sm text-muted-foreground text-center">{level.challengePrompt}</p>
        {!completed ? (
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => { setCompleted(true); onComplete(); }}
            className="px-8 py-3 rounded-lg bg-primary font-display font-semibold text-primary-foreground glow-primary hover:brightness-110 transition-all"
          >
            {buttonLabel}
          </motion.button>
        ) : (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-success text-lg font-display">
            Challenge Complete! ✅
          </motion.div>
        )}
      </div>
    );
  }

  // Slider challenge (Level 14)
  if (level.challengeType === 'slider') {
    return (
      <div className="flex flex-col items-center gap-6">
        <p className="text-sm text-muted-foreground">{level.challengePrompt}</p>
        <div className="flex items-center gap-4">
          <span className="text-sm font-mono text-muted-foreground">Replicas:</span>
          <input
            type="range" min={1} max={3} value={sliderValue}
            onChange={e => {
              const v = Number(e.target.value);
              setSliderValue(v);
              if (v === 3) { setCompleted(true); onComplete(); }
            }}
            className="w-48 accent-primary"
          />
          <span className="text-lg font-mono text-primary font-bold">{sliderValue}</span>
        </div>
        <div className="flex gap-2">
          {Array.from({ length: sliderValue }).map((_, i) => (
            <motion.div key={i} initial={{ scale: 0 }} animate={{ scale: 1 }}
              className="w-12 h-12 rounded border border-primary/40 bg-primary/10 flex items-center justify-center text-xs font-mono text-primary">
              #{i + 1}
            </motion.div>
          ))}
        </div>
        {completed && (
          <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-success text-lg font-display">
            Scaled to 3 replicas! ✅
          </motion.div>
        )}
      </div>
    );
  }

  // Terminal challenge
  return (
    <div className="flex flex-col gap-4">
      <p className="text-sm text-muted-foreground text-center">{level.challengePrompt}</p>
      {failCount >= 2 && (
        <motion.p initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="text-xs text-warning text-center">
          💡 {level.hints[Math.min(failCount - 1, level.hints.length - 1)]}
        </motion.p>
      )}
      <TerminalSimulator onCommand={handleCommand} placeholder="Type the correct Docker command..." />
      {completed && (
        <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} className="text-center text-success text-lg font-display">
          Challenge Complete! ✅
        </motion.div>
      )}
    </div>
  );
};

export default MiniChallenge;
