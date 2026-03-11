import { motion } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useNavigate } from 'react-router-dom';
import { Lock, Check, Play } from 'lucide-react';

interface LevelCardProps {
  id: number;
  title: string;
  description: string;
}

const LevelCard = ({ id, title, description }: LevelCardProps) => {
  const { completedLevels, currentLevel } = useGameStore();
  const navigate = useNavigate();
  const isCompleted = completedLevels.includes(id);
  const isUnlocked = id === 1 || completedLevels.includes(id - 1);
  const isLocked = !isUnlocked && !isCompleted;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: id * 0.05, duration: 0.4 }}
      whileHover={!isLocked ? { y: -4, transition: { duration: 0.2 } } : {}}
      onClick={() => !isLocked && navigate(`/level/${id}`)}
      className={`relative rounded-lg border p-5 cursor-pointer transition-colors ${
        isLocked
          ? 'border-border bg-card/50 opacity-50 cursor-not-allowed grayscale'
          : isCompleted
          ? 'border-success/40 bg-card glow-success'
          : 'border-primary/40 bg-card glow-primary hover:border-primary'
      }`}
    >
      <div className="flex items-start justify-between mb-3">
        <span className={`inline-flex items-center justify-center w-8 h-8 rounded-full text-sm font-mono font-bold ${
          isCompleted ? 'bg-success/20 text-success' : isLocked ? 'bg-secondary text-muted-foreground' : 'bg-primary/20 text-primary'
        }`}>
          {id}
        </span>
        <div>
          {isLocked && <Lock className="w-5 h-5 text-muted-foreground" />}
          {isCompleted && <Check className="w-5 h-5 text-success" />}
          {!isLocked && !isCompleted && <Play className="w-5 h-5 text-primary" />}
        </div>
      </div>
      <h3 className="font-display font-semibold text-foreground mb-1">{title}</h3>
      <p className="text-sm text-muted-foreground mb-3">{description}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs font-mono text-xp-gold">+100 XP</span>
        <span className={`text-xs font-display font-medium ${
          isCompleted ? 'text-success' : isLocked ? 'text-muted-foreground' : 'text-primary'
        }`}>
          {isCompleted ? 'REPLAY' : isLocked ? 'LOCKED' : 'START'}
        </span>
      </div>
    </motion.div>
  );
};

export default LevelCard;
