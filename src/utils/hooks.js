import { useRef, useCallback, useEffect } from "react";
import { registerFlush } from "./closeFlush";

/**
 * Returns a debounced version of `fn` that delays execution by `delay` ms.
 * The timer resets on every call. Pending timer is cleared on unmount.
 *
 * The returned function also carries:
 *   • `.flush()`  — if a call is pending, run it immediately with the last
 *                   args and clear the timer; returns whatever `fn` returns.
 *                   Used by close-flush / unmount paths so the debounce window
 *                   can never silently eat the last keystrokes (audit H3).
 *   • `.cancel()` — drop any pending call without running it.
 */
export function useDebounce(fn, delay) {
  const timer = useRef(null);
  const lastArgs = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  const debounced = useCallback(
    (...args) => {
      lastArgs.current = args;
      clearTimeout(timer.current);
      timer.current = setTimeout(() => {
        timer.current = null;
        lastArgs.current = null;
        fn(...args);
      }, delay);
    },
    [fn, delay]
  );
  debounced.flush = () => {
    if (timer.current) {
      clearTimeout(timer.current);
      timer.current = null;
      const args = lastArgs.current || [];
      lastArgs.current = null;
      return fn(...args);
    }
  };
  debounced.cancel = () => {
    clearTimeout(timer.current);
    timer.current = null;
    lastArgs.current = null;
  };
  return debounced;
}

/**
 * Flush a debounced function's pending call on unmount AND on app quit / reload
 * (via the close-flush registry), so the debounce window can never silently
 * drop the last keystrokes (audit H3). Pass the value returned by useDebounce.
 */
export function useFlushOnExit(debounced) {
  useEffect(() => registerFlush(debounced.flush), [debounced]);
  useEffect(() => () => { debounced.flush(); }, [debounced]);
}
