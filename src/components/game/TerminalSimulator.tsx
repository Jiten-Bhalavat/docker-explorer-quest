import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';

interface TerminalSimulatorProps {
  onCommand: (cmd: string) => { output: string; success: boolean };
  placeholder?: string;
}

const TerminalSimulator = ({ onCommand, placeholder = 'Type a Docker command...' }: TerminalSimulatorProps) => {
  const [history, setHistory] = useState<{ type: 'input' | 'output' | 'error'; text: string }[]>([]);
  const [input, setInput] = useState('');
  const [cmdHistory, setCmdHistory] = useState<string[]>([]);
  const [historyIdx, setHistoryIdx] = useState(-1);
  const inputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo({ top: scrollRef.current.scrollHeight, behavior: 'smooth' });
  }, [history]);

  const handleSubmit = useCallback(() => {
    const cmd = input.trim();
    if (!cmd) return;
    if (cmd === 'clear') {
      setHistory([]);
      setInput('');
      return;
    }
    const newHistory: typeof history = [...history, { type: 'input', text: cmd }];
    const result = onCommand(cmd);
    newHistory.push({ type: result.success ? 'output' : 'error', text: result.output });
    setHistory(newHistory);
    setCmdHistory(prev => [...prev, cmd]);
    setHistoryIdx(-1);
    setInput('');
  }, [input, history, onCommand]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') { handleSubmit(); return; }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const newIdx = historyIdx < cmdHistory.length - 1 ? historyIdx + 1 : historyIdx;
      setHistoryIdx(newIdx);
      setInput(cmdHistory[cmdHistory.length - 1 - newIdx] || '');
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const newIdx = historyIdx > 0 ? historyIdx - 1 : -1;
      setHistoryIdx(newIdx);
      setInput(newIdx === -1 ? '' : cmdHistory[cmdHistory.length - 1 - newIdx] || '');
    }
    if (e.key === 'Tab') {
      e.preventDefault();
      const cmds = ['docker pull', 'docker run', 'docker ps', 'docker images', 'docker stop', 'docker rm', 'docker build', 'docker compose', 'docker volume', 'docker network', 'docker push', 'docker exec'];
      const match = cmds.find(c => c.startsWith(input));
      if (match) setInput(match + ' ');
    }
  };

  return (
    <div className="rounded-lg overflow-hidden border border-border" onClick={() => inputRef.current?.focus()}>
      <div className="flex items-center gap-2 px-4 py-2 bg-secondary/50 border-b border-border">
        <div className="w-3 h-3 rounded-full bg-destructive/70" />
        <div className="w-3 h-3 rounded-full bg-warning/70" />
        <div className="w-3 h-3 rounded-full bg-success/70" />
        <span className="text-xs font-mono text-muted-foreground ml-2">terminal</span>
      </div>
      <div ref={scrollRef} className="terminal-bg p-4 max-h-[300px] overflow-y-auto font-mono text-sm">
        <AnimatePresence>
          {history.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              className={`mb-1 ${
                entry.type === 'input' ? 'text-accent' : entry.type === 'error' ? 'text-destructive' : 'text-foreground/80'
              }`}
            >
              {entry.type === 'input' ? (
                <span><span className="text-success">user@docker-quest:~$</span> {entry.text}</span>
              ) : (
                <pre className="whitespace-pre-wrap">{entry.text}</pre>
              )}
            </motion.div>
          ))}
        </AnimatePresence>
        <div className="flex items-center">
          <span className="text-success mr-2">user@docker-quest:~$</span>
          <input
            ref={inputRef}
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={handleKeyDown}
            className="flex-1 bg-transparent outline-none text-accent caret-accent"
            placeholder={history.length === 0 ? placeholder : ''}
            autoFocus
            spellCheck={false}
          />
          <span className="w-2 h-5 bg-accent/80" style={{ animation: 'blink 1s infinite' }} />
        </div>
      </div>
    </div>
  );
};

export default TerminalSimulator;
