import { describe, expect, it } from 'vitest';

import { createClock, formatHlc, isHlc, isTooFarAhead, MAX_AHEAD_MS, parseHlc } from '../clock';

const DEVICE = '00112233445566ff';
const OTHER = 'aabbccddeeff0011';

function fixedTime(start: number) {
  const time = { now: start };
  return { time, now: () => time.now };
}

describe('HLC format', () => {
  it('formats and parses round trip', () => {
    const hlc = formatHlc({ ms: 1_730_000_000_000, counter: 7, device: DEVICE });
    expect(hlc).toBe('0192cc091400:0007:00112233445566ff');
    expect(isHlc(hlc)).toBe(true);
    expect(parseHlc(hlc)).toEqual({ ms: 1_730_000_000_000, counter: 7, device: DEVICE });
  });

  it('sorts as strings in time order', () => {
    const a = formatHlc({ ms: 999, counter: 0xffff, device: OTHER });
    const b = formatHlc({ ms: 1000, counter: 0, device: DEVICE });
    const c = formatHlc({ ms: 1000, counter: 1, device: DEVICE });
    expect([c, a, b].sort()).toEqual([a, b, c]);
  });

  it('refuses malformed input', () => {
    expect(() => formatHlc({ ms: -1, counter: 0, device: DEVICE })).toThrow();
    expect(() => formatHlc({ ms: 1, counter: 0x10000, device: DEVICE })).toThrow();
    expect(() => formatHlc({ ms: 1, counter: 0, device: 'XYZ' })).toThrow();
    expect(() => parseHlc('not a clock')).toThrow();
    expect(isHlc('0192d2d8cc00:0007:00112233445566FF')).toBe(false);
  });
});

describe('createClock', () => {
  it('uses wall time when it moves forward', () => {
    const { time, now } = fixedTime(5000);
    const clock = createClock(DEVICE, null, now);
    expect(parseHlc(clock.tick())).toMatchObject({ ms: 5000, counter: 0 });
    time.now = 6000;
    expect(parseHlc(clock.tick())).toMatchObject({ ms: 6000, counter: 0 });
  });

  it('bumps the counter when wall time stands still or goes backwards', () => {
    const { time, now } = fixedTime(5000);
    const clock = createClock(DEVICE, null, now);
    const first = clock.tick();
    const second = clock.tick();
    time.now = 4000;
    const third = clock.tick();
    expect(parseHlc(second)).toMatchObject({ ms: 5000, counter: 1 });
    expect(parseHlc(third)).toMatchObject({ ms: 5000, counter: 2 });
    expect(first < second && second < third).toBe(true);
  });

  it('moves to the next millisecond when the counter is full', () => {
    const { now } = fixedTime(5000);
    const clock = createClock(DEVICE, formatHlc({ ms: 5000, counter: 0xffff, device: DEVICE }), now);
    expect(parseHlc(clock.tick())).toMatchObject({ ms: 5001, counter: 0 });
  });

  it('resumes after the saved clock, even if wall time is earlier', () => {
    const { now } = fixedTime(1000);
    const clock = createClock(DEVICE, formatHlc({ ms: 9000, counter: 3, device: DEVICE }), now);
    expect(parseHlc(clock.tick())).toMatchObject({ ms: 9000, counter: 4 });
  });

  it('ticks after every clock it received', () => {
    const { now } = fixedTime(1000);
    const clock = createClock(DEVICE, null, now);
    clock.receive(formatHlc({ ms: 2000, counter: 5, device: OTHER }));
    const next = clock.tick();
    expect(parseHlc(next)).toMatchObject({ ms: 2000, counter: 6, device: DEVICE });
  });

  it('folds in a received clock far ahead of its own time, because this device runs slow', () => {
    const { now } = fixedTime(1000);
    const clock = createClock(DEVICE, null, now);
    clock.receive(formatHlc({ ms: 1000 + 10 * MAX_AHEAD_MS, counter: 0, device: OTHER }));
    expect(parseHlc(clock.tick())).toMatchObject({ ms: 1000 + 10 * MAX_AHEAD_MS, counter: 1 });
  });

  it('catches up to server time when its own clock runs slow', () => {
    const { now } = fixedTime(1000);
    const clock = createClock(DEVICE, null, now);
    clock.receiveServerTime(1_000_000);
    expect(parseHlc(clock.tick())).toMatchObject({ ms: 1_000_000, counter: 1 });
  });

  it('can be reset backwards for the clock repair', () => {
    const { now } = fixedTime(1000);
    const clock = createClock(DEVICE, formatHlc({ ms: 9_999_999, counter: 0, device: DEVICE }), now);
    clock.reset(2000, null);
    expect(parseHlc(clock.tick())).toMatchObject({ ms: 2000, counter: 1 });
  });

  it("doesn't reset below a clock it received", () => {
    const { now } = fixedTime(1000);
    const clock = createClock(DEVICE, formatHlc({ ms: 9_999_999, counter: 0, device: DEVICE }), now);
    clock.receive(formatHlc({ ms: 4000, counter: 2, device: OTHER }));
    clock.reset(2000, null);
    expect(parseHlc(clock.tick())).toMatchObject({ ms: 4000, counter: 3 });
  });

  it("doesn't reset below the newest clock the device keeps", () => {
    const { now } = fixedTime(1000);
    const clock = createClock(DEVICE, formatHlc({ ms: 9_999_999, counter: 0, device: DEVICE }), now);
    clock.reset(2000, formatHlc({ ms: 3000, counter: 4, device: OTHER }));
    expect(parseHlc(clock.tick())).toMatchObject({ ms: 3000, counter: 5 });
  });

  it('reports the last clock for saving', () => {
    const { now } = fixedTime(1000);
    const clock = createClock(DEVICE, null, now);
    expect(clock.last()).toBeNull();
    const hlc = clock.tick();
    expect(clock.last()).toBe(hlc);
  });
});

describe('isTooFarAhead', () => {
  it('allows up to five minutes ahead and no more', () => {
    const at = (ms: number) => formatHlc({ ms, counter: 0, device: DEVICE });
    expect(isTooFarAhead(at(10_000 + MAX_AHEAD_MS), 10_000)).toBe(false);
    expect(isTooFarAhead(at(10_000 + MAX_AHEAD_MS + 1), 10_000)).toBe(true);
  });
});
