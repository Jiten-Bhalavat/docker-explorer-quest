import { motion } from 'framer-motion';

export const DockerWhale = ({ size = 40, className = '' }: { size?: number; className?: string }) => (
  <motion.svg
    width={size} height={size} viewBox="0 0 64 64" fill="none"
    className={className}
    initial={{ y: -10 }} animate={{ y: 0 }}
    transition={{ type: 'spring', stiffness: 200 }}
  >
    <path d="M52 28c-1-4-4-6-7-7 0-3-1-6-3-7-3-2-7-2-10 0l-1 1h-5c-3 0-6 0-9 2-2 1-3 3-4 5h-2c-2 0-4 1-5 3-1 3 0 6 2 8 0 4 2 8 5 11 4 4 9 6 15 6s11-2 15-6c3-3 5-7 5-11 2-1 4-3 4-5z" fill="hsl(221, 83%, 53%)" />
    <rect x="19" y="20" width="5" height="5" rx="1" fill="hsl(213, 31%, 95%)" opacity="0.9" />
    <rect x="26" y="20" width="5" height="5" rx="1" fill="hsl(213, 31%, 95%)" opacity="0.9" />
    <rect x="33" y="20" width="5" height="5" rx="1" fill="hsl(213, 31%, 95%)" opacity="0.9" />
    <rect x="19" y="13" width="5" height="5" rx="1" fill="hsl(213, 31%, 95%)" opacity="0.9" />
    <rect x="26" y="13" width="5" height="5" rx="1" fill="hsl(213, 31%, 95%)" opacity="0.9" />
    <circle cx="48" cy="32" r="2" fill="hsl(213, 31%, 95%)" />
  </motion.svg>
);
