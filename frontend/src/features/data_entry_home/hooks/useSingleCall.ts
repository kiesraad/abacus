import { useCallback, useRef } from "react";

export function useSingleCall<Args extends unknown[], Return>(
  fn: (...args: Args) => Return,
): [(...args: Args) => Return | undefined, () => void] {
  const hasCalledRef = useRef(false);

  const call: (...args: Args) => Return | undefined = useCallback(
    (...args: Args) => {
      if (!hasCalledRef.current) {
        hasCalledRef.current = true;
        return fn(...args);
      }
      return undefined;
    },
    [fn],
  );

  const reset = useCallback(() => {
    hasCalledRef.current = false;
  }, []);

  return [call, reset];
}
