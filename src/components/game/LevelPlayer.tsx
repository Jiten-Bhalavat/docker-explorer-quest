import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { levels } from '@/data/levelData';
import VisualExplainer from './VisualExplainer';
import MiniChallenge from './MiniChallenge';
import TerminalSimulator from './TerminalSimulator';
import SuccessPopup from './SuccessPopup';

const terminalOutputs: Record<string, string> = {
  'docker pull nginx': 'Using default tag: latest\nlatest: Pulling from library/nginx\n✓ Pull complete (3 layers)\nStatus: Downloaded newer image for nginx:latest',
  'docker run nginx': 'Container started: a1b2c3d4e5f6\nnginx is running on port 80',
  'docker run hello-world': 'Hello from Docker!\nThis message shows that your installation appears to be working correctly.',
  'docker images': 'REPOSITORY   TAG      IMAGE ID      CREATED       SIZE\nnginx        latest   a6bd71249d4b  2 hours ago   142MB',
  'docker ps': 'CONTAINER ID   IMAGE   COMMAND   CREATED   STATUS   PORTS   NAMES\na1b2c3d4e5f6   nginx   "nginx"   2m ago    Up 2m    80/tcp  happy_whale',
  'docker build -t myapp .': 'Step 1/6 : FROM node:18 ✓\nStep 2/6 : WORKDIR /app ✓\nStep 3/6 : COPY . . ✓\nStep 4/6 : RUN npm install ✓\nStep 5/6 : EXPOSE 3000 ✓\nStep 6/6 : CMD ["node","server.js"] ✓\nSuccessfully tagged myapp:latest ✓',
  'docker volume create mydata': 'mydata (volume created)',
  'docker network create mynetwork': 'mynetwork (network created)',
  'docker compose up': 'Creating network "app_default"\nCreating app_db_1 ... done\nCreating app_web_1 ... done\nCreating app_cache_1 ... done',
  'docker push myapp': 'Pushing myapp:latest to Docker Hub...\n✓ Push complete',
};

interface LevelPlayerProps {
  levelId: number;
}

const LevelPlayer = ({ levelId }: LevelPlayerProps) => {
  const [step, setStep] = useState(1);
  const [challengeComplete, setChallengeComplete] = useState(false);
  const [showSuccess, setShowSuccess] = useState(false);
  const { completeLevel, completedLevels, newBadge } = useGameStore();
  const navigate = useNavigate();
  const level = levels.find(l => l.id === levelId)!;
  const isAlreadyComplete = completedLevels.includes(levelId);

  const handleChallengeComplete = () => {
    setChallengeComplete(true);
  };

  const handleShowSuccess = () => {
    if (!isAlreadyComplete) completeLevel(levelId);
    setShowSuccess(true);
  };

  const handleSimCommand = (cmd: string): { output: string; success: boolean } => {
    const output = terminalOutputs[cmd];
    if (cmd === 'clear') return { output: '', success: true };
    if (cmd === 'hint') return { output: '💡 Try the commands shown in the visual above', success: false };
    if (output) return { output, success: true };
    return { output: `$ ${cmd}: command simulated`, success: true };
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border glass sticky top-0 z-30">
        <div className="container mx-auto px-4 py-3 flex items-center justify-between">
          <button onClick={() => navigate('/')} className="text-sm text-muted-foreground hover:text-foreground font-display">
            ← Back to Dashboard
          </button>
          <h2 className="font-display font-bold text-foreground">
            Level {levelId}: {level.title}
          </h2>
          <div className="flex items-center gap-2">
            {[1, 2, 3, 4].map(s => (
              <div key={s} className={`w-8 h-1 rounded-full ${s <= step ? 'bg-primary' : 'bg-secondary'}`} />
            ))}
            <span className="text-xs text-muted-foreground ml-2">{step}/4</span>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="container mx-auto px-4 py-8 max-w-3xl">
        <motion.div key={step} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4 }}>
          {step === 1 && (
            <div className="space-y-6">
              <h3 className="font-display text-xl font-bold text-foreground text-center">Visual Explanation</h3>
              <VisualExplainer levelId={levelId} />
              <div className="flex justify-center">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setStep(2)}
                  className="px-6 py-2.5 rounded-lg bg-primary font-display font-semibold text-primary-foreground text-sm">
                  Next →
                </motion.button>
              </div>
            </div>
          )}

          {step === 2 && (
            <div className="space-y-6">
              <h3 className="font-display text-xl font-bold text-foreground text-center">Interactive Simulation</h3>
              <p className="text-sm text-muted-foreground text-center">Try out Docker commands in the terminal below</p>
              <TerminalSimulator onCommand={handleSimCommand} />
              <div className="flex justify-center">
                <motion.button whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                  onClick={() => setStep(3)}
                  className="px-6 py-2.5 rounded-lg bg-primary font-display font-semibold text-primary-foreground text-sm">
                  Next →
                </motion.button>
              </div>
            </div>
          )}

          {step === 3 && (
            <div className="space-y-6">
              <h3 className="font-display text-xl font-bold text-foreground text-center">Mini Challenge</h3>
              <MiniChallenge level={level} onComplete={handleChallengeComplete} />
              {challengeComplete && (
                <div className="flex justify-center">
                  <motion.button initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                    whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
                    onClick={() => { setStep(4); handleShowSuccess(); }}
                    className="px-6 py-2.5 rounded-lg bg-primary font-display font-semibold text-primary-foreground text-sm">
                    Complete Level →
                  </motion.button>
                </div>
              )}
            </div>
          )}

          {step === 4 && (
            <div className="text-center text-muted-foreground">
              <p className="font-display">Processing results...</p>
            </div>
          )}
        </motion.div>
      </div>

      <SuccessPopup
        show={showSuccess}
        xp={100}
        badge={newBadge}
        summaryPoints={level.conceptSummary}
        onNext={() => {
          setShowSuccess(false);
          if (levelId < 15) navigate(`/level/${levelId + 1}`);
          else navigate('/');
        }}
      />
    </div>
  );
};

export default LevelPlayer;
