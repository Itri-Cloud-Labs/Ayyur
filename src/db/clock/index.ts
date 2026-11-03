// Hybrid logical clocks, spec section 9. Plain TypeScript: Convex runs this file too, so it must not
// import React Native, Expo or anything under `@/`.

/** `<ms: 12 hex>:<counter: 4 hex>:<device: 16 hex>`. Sorting as strings sorts in time order. */
export type Hlc = string;

export type HlcParts = { ms: number; counter: number; device: string };

/** How far ahead of server time a clock may be before Convex refuses it (decision B4). */
export const MAX_AHEAD_MS = 5 * 60 * 1000;

const MAX_MS = 0xffff_ffff_ffff;
const MAX_COUNTER = 0xffff;
const HLC_PATTERN = /^[0-9a-f]{12}:[0-9a-f]{4}:[0-9a-f]{16}$/;
const DEVICE_PATTERN = /^[0-9a-f]{16}$/;

export function isHlc(value: unknown): value is Hlc {
  return typeof value === 'string' && HLC_PATTERN.test(value);
}

export function isDeviceId(value: unknown): value is string {
  return typeof value === 'string' && DEVICE_PATTERN.test(value);
}

export function formatHlc({ ms, counter, device }: HlcParts): Hlc {
  if (!Number.isInteger(ms) || ms < 0 || ms > MAX_MS) throw new RangeError(`HLC time out of range: ${ms}`);
  if (!Number.isInteger(counter) || counter < 0 || counter > MAX_COUNTER) {
    throw new RangeError(`HLC counter out of range: ${counter}`);
  }
  if (!isDeviceId(device)) throw new TypeError(`Not a device id: ${device}`);
  return `${ms.toString(16).padStart(12, '0')}:${counter.toString(16).padStart(4, '0')}:${device}`;
}

export function parseHlc(hlc: Hlc): HlcParts {
  if (!isHlc(hlc)) throw new TypeError(`Not an HLC: ${hlc}`);
  return {
    ms: parseInt(hlc.slice(0, 12), 16),
    counter: parseInt(hlc.slice(13, 17), 16),
    device: hlc.slice(18),
  };
}

export function compareHlc(a: Hlc, b: Hlc): -1 | 0 | 1 {
  return a < b ? -1 : a > b ? 1 : 0;
}

export function maxHlc(a: Hlc, b: Hlc): Hlc {
  return a >= b ? a : b;
}

/** True if `hlc` is more than MAX_AHEAD_MS ahead of `nowMs`. `push` refuses such clocks. */
export function isTooFarAhead(hlc: Hlc, nowMs: number): boolean {
  return parseHlc(hlc).ms > nowMs + MAX_AHEAD_MS;
}

export type Clock = {
  /** A new clock for one write transaction. Always greater than every clock this device made or received. */
  tick(): Hlc;
  /**
   * Folds in a clock from a pulled row, so the next tick sorts after it. Every pulled clock counts,
   * even one far ahead of this device's own time: Convex refuses clocks more than MAX_AHEAD_MS ahead
   * of server time, so a clock that looks far ahead here means this device runs slow. Ignoring it
   * would let the next local write get an older clock than the cell it overwrites.
   */
  receive(remote: Hlc): void;
  /** Folds in the server's time from a `push` or `vault.create` response. */
  receiveServerTime(ms: number): void;
  /**
   * Moves the clock back to `(ms, 0)` for the clock repair in spec 9.4, and never below `floor` or
   * any clock received since the clock was created. `floor` is the newest of the device's own clocks
   * that it keeps. So the next tick is still later than every clock the device has seen, apart from
   * its own clocks that Convex refused.
   */
  reset(ms: number, floor: Hlc | null): void;
  /** The last clock made or received, to save in `_meta.lastHlc`, or null before the first tick. */
  last(): Hlc | null;
};

/**
 * @param device this device's id, 16 hex characters
 * @param last the saved `_meta.lastHlc`, or null on first launch
 * @param now wall-clock time in ms, `Date.now` on the device
 */
export function createClock(device: string, last: Hlc | null, now: () => number): Clock {
  if (!isDeviceId(device)) throw new TypeError(`Not a device id: ${device}`);
  let ms = 0;
  let counter = 0;
  let started = false;
  // The newest clock received from elsewhere. Convex bounds these, so the repair can keep them.
  let receivedMs = 0;
  let receivedCounter = 0;
  if (last !== null) {
    const parts = parseHlc(last);
    ms = parts.ms;
    counter = parts.counter;
    started = true;
  }

  // (ms, counter) pairs compare like the HLC strings they become.
  const fold = (otherMs: number, otherCounter: number) => {
    if (otherMs > ms || (otherMs === ms && otherCounter > counter)) {
      ms = otherMs;
      counter = otherCounter;
      started = true;
    }
  };

  const remember = (otherMs: number, otherCounter: number) => {
    if (otherMs > receivedMs || (otherMs === receivedMs && otherCounter > receivedCounter)) {
      receivedMs = otherMs;
      receivedCounter = otherCounter;
    }
  };

  return {
    tick() {
      const wall = Math.floor(now());
      if (wall > ms) {
        ms = wall;
        counter = 0;
      } else if (counter < MAX_COUNTER) {
        counter += 1;
      } else {
        ms += 1;
        counter = 0;
      }
      started = true;
      return formatHlc({ ms, counter, device });
    },
    receive(remote) {
      const parts = parseHlc(remote);
      remember(parts.ms, parts.counter);
      fold(parts.ms, parts.counter);
    },
    receiveServerTime(serverMs) {
      remember(Math.floor(serverMs), 0);
      fold(Math.floor(serverMs), 0);
    },
    reset(toMs, floor) {
      ms = Math.floor(toMs);
      counter = 0;
      started = true;
      fold(receivedMs, receivedCounter);
      if (floor !== null) {
        const parts = parseHlc(floor);
        fold(parts.ms, parts.counter);
      }
    },
    last() {
      return started ? formatHlc({ ms, counter, device }) : null;
    },
  };
}
