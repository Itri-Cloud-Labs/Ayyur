import { useEffect, useState } from 'react';

/** The current time, refreshed at the start of each minute. */
export function useNow() {
  const [now, setNow] = useState(() => new Date());

  useEffect(() => {
    let timer: ReturnType<typeof setTimeout>;
    const tick = () => {
      const current = new Date();
      setNow(current);
      timer = setTimeout(tick, 60_000 - (current.getSeconds() * 1000 + current.getMilliseconds()) + 50);
    };
    tick();
    return () => clearTimeout(timer);
  }, []);

  return now;
}
