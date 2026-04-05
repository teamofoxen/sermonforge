import { useRef, useCallback, useEffect } from "react";

/**
 * Returns a debounced version of `fn` that delays execution by `delay` ms.
 * The timer resets on every call. Pending timer is cleared on unmount.
 */
export function useDebounce(fn, delay) {
  const timer = useRef(null);
  useEffect(() => () => clearTimeout(timer.current), []);
  return useCallback(
    (...args) => {
      clearTimeout(timer.current);
      timer.current = setTimeout(() => fn(...args), delay);
    },
    [fn, delay]
  );
}
