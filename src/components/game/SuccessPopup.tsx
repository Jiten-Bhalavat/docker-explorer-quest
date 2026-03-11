import { motion, AnimatePresence } from 'framer-motion';
import { useEffect, useState } from 'react';

interface SuccessPopupProps {
  show: boolean;
  xp: number;
  badge?: string | null;
  onNext: () => void;
  summaryPoints: string[];
}

const ConfettiParticle = ({ delay }: { delay: number }) => {
  const colors = ['#2563EB', '#06B6D4', '#10B981', '#F59E0B', '#EF4444'];
  const color = colors[Math.floor(Math.random() * colors.length)];
  const left = Math.random() * 100;
  const duration = 2 + Math.random() * 2;

  return (
    <motion.div
      initial={{ y: -20, x: 0, opacity: 1, rotate: 0 }}
      animate={{ y: '100vh', x: (Math.random() - 0.5) * 200, opacity: 0, rotate: 720 }}
      transition={{ delay, duration, ease: 'easeOut' }}
      className="absolute w-2 h-2 rounded-sm"
      style={{ left: `${left}%`, backgroundColor: color }}
    />
  );
};

const SuccessPopup = ({ show, xp, badge, onNext, summaryPoints }: SuccessPopupProps) => {
  const [count, setCount] = useState(0);

  useEffect(() => {
    if (!show) return;
    let frame = 0;
    const interval = setInterval(() => {
      frame += 5;
      setCount(Math.min(frame, xp));
      if (frame >= xp) clearInterval(interval);
    }, 30);
    return () => clearInterval(interval);
  }, [show, xp]);

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
        >
          {Array.from({ length: 30 }).map((_, i) => (
            <ConfettiParticle key={i} delay={i * 0.05} />
          ))}
          <motion.div
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ type: 'spring', stiffness: 200, delay: 0.2 }}
            className="relative z-10 rounded-xl border border-border bg-card p-8 max-w-md w-full mx-4 text-center"
          >
            <motion.div initial={{ y: 20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} transition={{ delay: 0.4 }}
              className="text-4xl mb-4">🎉</motion.div>
            <h2 className="font-display text-2xl font-bold text-foreground mb-2">Level Complete!</h2>
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ delay: 0.6, type: 'spring' }}
              className="inline-flex items-center gap-2 text-xp-gold text-3xl font-mono font-bold glow-gold rounded-full px-6 py-2 bg-warning/10 border border-warning/30 my-4"
            >
              ⭐ +{count} XP
            </motion.div>
            {badge && (
              <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 1 }}
                className="text-lg mb-4">
                <span className="text-foreground font-display">Badge Unlocked: </span>
                <span className="text-accent font-bold">{badge}</span>
              </motion.div>
            )}
            <div className="text-left bg-secondary/50 rounded-lg p-4 mb-6 border border-border">
              <h4 className="font-display text-sm font-semibold text-foreground mb-2">📝 Summary</h4>
              {summaryPoints.map((point, i) => (
                <motion.p key={i} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 1.2 + i * 0.1 }}
                  className="text-xs text-muted-foreground font-mono py-0.5">• {point}</motion.p>
              ))}
            </div>
            <motion.button
              whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
              onClick={onNext}
              className="px-8 py-3 rounded-lg bg-primary font-display font-semibold text-primary-foreground glow-primary animate-pulse-glow"
            >
              Next Level →
            </motion.button>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
};

export default SuccessPopup;
