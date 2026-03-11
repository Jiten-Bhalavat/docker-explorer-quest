import { motion } from 'framer-motion';
import { useGameStore, getRank } from '@/store/useGameStore';
import { levels } from '@/data/levelData';
import Navbar from '@/components/game/Navbar';
import LevelCard from '@/components/game/LevelCard';
import CheatSheet from '@/components/game/CheatSheet';
import AchievementPopup from '@/components/game/AchievementPopup';

const ALL_BADGES = [
  '🐳 First Container',
  '🔨 Docker Builder',
  '💾 Volume Master',
  '🌐 Networking Pro',
  '🏆 Docker Master',
];

const Dashboard = () => {
  const { totalXP, badges, completedLevels, resetProgress } = useGameStore();
  const rank = getRank(totalXP);

  return (
    <div className="min-h-screen bg-background dot-grid">
      <Navbar />
      <div className="container mx-auto px-4 py-8 max-w-5xl">
        {/* Hero Section */}
        <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <h1 className="font-display text-4xl md:text-5xl font-bold text-foreground mb-2">
            Docker <span className="text-primary">Quest</span>
          </h1>
          <p className="text-muted-foreground">Master Docker through interactive visual lessons</p>
          <div className="flex items-center justify-center gap-4 mt-4">
            <span className="text-2xl">{rank.emoji}</span>
            <span className="font-display font-semibold text-foreground">{rank.title}</span>
            <span className="text-xp-gold font-mono font-bold">⭐ {totalXP} / 1500 XP</span>
          </div>
          <div className="max-w-xs mx-auto mt-3 h-3 rounded-full bg-secondary overflow-hidden">
            <motion.div
              initial={{ width: 0 }} animate={{ width: `${(totalXP / 1500) * 100}%` }}
              transition={{ duration: 0.8, ease: 'easeOut' }}
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent"
            />
          </div>
        </motion.div>

        {/* Badges Row */}
        <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: 0.2 }}
          className="flex gap-4 justify-center flex-wrap mb-10">
          {ALL_BADGES.map(badge => {
            const earned = badges.includes(badge);
            return (
              <div key={badge} className={`flex items-center gap-2 px-4 py-2 rounded-full border text-sm font-mono ${
                earned ? 'border-accent/40 bg-accent/10 text-accent' : 'border-border bg-card/50 text-muted-foreground grayscale opacity-50'
              }`}>
                {badge}
              </div>
            );
          })}
        </motion.div>

        {/* Level Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mb-12">
          {levels.map(level => (
            <LevelCard key={level.id} id={level.id} title={level.title} description={level.description} />
          ))}
        </div>

        {/* Reset */}
        {completedLevels.length > 0 && (
          <div className="text-center">
            <button onClick={() => { if (confirm('Reset all progress?')) resetProgress(); }}
              className="text-xs text-muted-foreground hover:text-destructive transition-colors font-mono">
              Reset Progress
            </button>
          </div>
        )}
      </div>
      <CheatSheet />
      <AchievementPopup />
    </div>
  );
};

export default Dashboard;
