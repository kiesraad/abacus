import { useCallback, useEffect, useRef } from "react";

export function useDebouncedCallback<T extends (...args: never[]) => unknown>(
  callback: T,
  delay: number,
) {
  const debounceTimerRef = useRef(0);
  useEffect(() => {
    return () => {
      window.clearTimeout(debounceTimerRef.current);
    };
  }, []);

  return useCallback(
    (...args: Parameters<T>) => {
      window.clearTimeout(debounceTimerRef.current);
      debounceTimerRef.current = window.setTimeout(() => callback(...args), delay);
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [delay],
  );
}
