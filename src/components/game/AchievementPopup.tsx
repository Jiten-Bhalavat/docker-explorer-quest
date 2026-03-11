import { motion, AnimatePresence } from 'framer-motion';
import { useGameStore } from '@/store/useGameStore';
import { useEffect } from 'react';

const AchievementPopup = () => {
  const { newBadge, clearNewBadge } = useGameStore();

  useEffect(() => {
    if (newBadge) {
      const timer = setTimeout(clearNewBadge, 3000);
      return () => clearTimeout(timer);
    }
  }, [newBadge, clearNewBadge]);

  return (
    <AnimatePresence>
      {newBadge && (
        <motion.div
          initial={{ x: 300, opacity: 0 }}
          animate={{ x: 0, opacity: 1 }}
          exit={{ x: 300, opacity: 0 }}
          transition={{ type: 'spring', stiffness: 200 }}
          className="fixed bottom-20 right-6 z-50 rounded-lg border border-accent/40 bg-card p-4 glow-accent max-w-xs"
        >
          <p className="text-sm font-display font-semibold text-foreground">🎉 Badge Unlocked!</p>
          <p className="text-accent font-mono text-sm mt-1">{newBadge}</p>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default AchievementPopup;
