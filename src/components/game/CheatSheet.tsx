import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CHEATSHEET } from '@/data/levelData';
import { X, Search } from 'lucide-react';

const CheatSheet = () => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState('');

  const filtered = CHEATSHEET.filter(c =>
    c.command.toLowerCase().includes(search.toLowerCase()) ||
    c.description.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <>
      <motion.button
        whileHover={{ scale: 1.05 }} whileTap={{ scale: 0.95 }}
        onClick={() => setOpen(true)}
        className="fixed bottom-6 right-6 z-40 px-4 py-2 rounded-lg bg-primary font-display font-semibold text-primary-foreground glow-primary text-sm"
      >
        📋 Cheat Sheet
      </motion.button>
      <AnimatePresence>
        {open && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-center justify-center bg-background/80 backdrop-blur-sm"
            onClick={() => setOpen(false)}>
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }} animate={{ scale: 1, opacity: 1 }} exit={{ scale: 0.9, opacity: 0 }}
              onClick={e => e.stopPropagation()}
              className="rounded-xl border border-border bg-card p-6 max-w-lg w-full mx-4 max-h-[80vh] overflow-hidden flex flex-col"
            >
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-display text-lg font-bold text-foreground">Docker Commands</h3>
                <button onClick={() => setOpen(false)} className="text-muted-foreground hover:text-foreground"><X className="w-5 h-5" /></button>
              </div>
              <div className="relative mb-4">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
                <input
                  value={search} onChange={e => setSearch(e.target.value)}
                  placeholder="Search commands..."
                  className="w-full pl-10 pr-4 py-2 rounded-lg bg-secondary border border-border text-sm text-foreground placeholder:text-muted-foreground outline-none focus:ring-1 focus:ring-primary"
                />
              </div>
              <div className="overflow-y-auto flex-1 space-y-1">
                {filtered.map((c, i) => (
                  <div key={i} className="flex items-start gap-3 py-2 px-3 rounded-lg hover:bg-secondary/50">
                    <code className="text-xs font-mono text-accent flex-shrink-0 min-w-[200px]">{c.command}</code>
                    <span className="text-xs text-muted-foreground">{c.description}</span>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default CheatSheet;
