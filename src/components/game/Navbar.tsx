import { useGameStore, getRank } from '@/store/useGameStore';
import { DockerWhale } from './DockerWhale';

const Navbar = () => {
  const { totalXP, completedLevels } = useGameStore();
  const rank = getRank(totalXP);
  const progress = (totalXP / 1500) * 100;

  return (
    <nav className="sticky top-0 z-50 glass border-b border-border">
      <div className="container mx-auto flex items-center justify-between px-4 py-3">
        <div className="flex items-center gap-3">
          <DockerWhale size={36} />
          <h1 className="font-display text-xl font-bold text-foreground">
            Docker <span className="text-primary">Quest</span>
          </h1>
        </div>
        <div className="flex items-center gap-4">
          <div className="hidden sm:flex items-center gap-2 text-sm text-muted-foreground">
            <span>{rank.emoji}</span>
            <span className="font-display font-medium">{rank.title}</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-xp-gold text-sm font-mono font-bold">⭐ {totalXP} XP</span>
          </div>
          <div className="hidden md:flex items-center gap-2 text-sm text-muted-foreground">
            <span className="text-success">{completedLevels.length}</span>
            <span>/15 levels</span>
          </div>
          <div className="hidden sm:block w-32 h-2 rounded-full bg-secondary overflow-hidden">
            <div
              className="h-full rounded-full bg-gradient-to-r from-primary to-accent transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </nav>
  );
};

export default Navbar;
