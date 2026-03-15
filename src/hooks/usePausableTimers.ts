import { useRef, useCallback, useEffect } from 'react';

interface PendingTimer {
  callback: () => void;
  remaining: number;
  startTime: number;
  timerId: ReturnType<typeof setTimeout> | null;
}

export function usePausableTimers(paused: boolean) {
  const pausedRef = useRef(paused);
  const timersRef = useRef<PendingTimer[]>([]);

  useEffect(() => {
    const wasPaused = pausedRef.current;
    pausedRef.current = paused;

    if (paused && !wasPaused) {
      timersRef.current.forEach(t => {
        if (t.timerId !== null) {
          clearTimeout(t.timerId);
          t.remaining = Math.max(0, t.remaining - (Date.now() - t.startTime));
          t.timerId = null;
        }
      });
    } else if (!paused && wasPaused) {
      timersRef.current.forEach(t => {
        if (t.timerId === null) {
          t.startTime = Date.now();
          t.timerId = setTimeout(() => {
            timersRef.current = timersRef.current.filter(x => x !== t);
            t.callback();
          }, t.remaining);
        }
      });
    }
  }, [paused]);

  const schedule = useCallback((callback: () => void, delay: number) => {
    const timer: PendingTimer = { callback, remaining: delay, startTime: Date.now(), timerId: null };
    if (!pausedRef.current) {
      timer.timerId = setTimeout(() => {
        timersRef.current = timersRef.current.filter(x => x !== timer);
        callback();
      }, delay);
    }
    timersRef.current.push(timer);
  }, []);

  const clearAll = useCallback(() => {
    timersRef.current.forEach(t => { if (t.timerId !== null) clearTimeout(t.timerId); });
    timersRef.current = [];
  }, []);

  return { schedule, clearAll };
}
