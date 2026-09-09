"use client";

import { useEffect, useRef } from "react";

/**
 * Returns a stable callback that only fires the wrapped function after
 * `delay` ms of inactivity. Useful for debouncing localStorage writes and
 * Notion sync calls while scrubbing / playing.
 */
export function useDebouncedCallback<A extends unknown[]>(
  callback: (...args: A) => void,
  delay: number
): (...args: A) => void {
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, [callback]);

  useEffect(() => {
    return () => {
      if (timer.current) clearTimeout(timer.current);
    };
  }, []);

  return (...args: A) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  };
}

/**
 * Synchronizes a value to localStorage but never more often than every
 * `minIntervalMs`. Flushes the latest value immediately on unmount.
 */
export function useSyncToStorage<T>(
  key: string,
  value: T | undefined,
  serialize: (value: T) => string = (v) => JSON.stringify(v)
): void {
  const latestRef = useRef(value);
  const lastWriteRef = useRef(0);

  useEffect(() => {
    latestRef.current = value;
  }, [value]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = Date.now();
      if (
        latestRef.current !== undefined &&
        now - lastWriteRef.current > 30_000
      ) {
        try {
          window.localStorage.setItem(key, serialize(latestRef.current));
          lastWriteRef.current = now;
        } catch {
          /* ignore */
        }
      }
    }, 15_000);

    return () => {
      clearInterval(interval);
      if (latestRef.current !== undefined) {
        try {
          window.localStorage.setItem(key, serialize(latestRef.current));
        } catch {
          /* ignore */
        }
      }
    };
  }, [key, serialize]);
}