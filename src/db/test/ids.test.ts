import { describe, expect, it } from 'vitest';

import { isKeyedId, isRandomId, isRowId, keyedId, newIdKey, planRekey, randomId, SINGLETON_ID } from '../ids';

const randomBytes = (length: number) => crypto.getRandomValues(new Uint8Array(length));
const keyA = new Uint8Array(32).fill(1);
const keyB = new Uint8Array(32).fill(2);
const habit = '3f2b8c1e-0a4d-4e6f-9b7a-1c2d3e4f5a6b';
const toHex = (bytes: Uint8Array) => Array.from(bytes, (byte) => byte.toString(16).padStart(2, '0')).join('');

describe('randomId', () => {
  it('makes UUID v4 ids in lowercase', () => {
    for (let i = 0; i < 100; i++) {
      const id = randomId(randomBytes);
      expect(isRandomId(id)).toBe(true);
      expect(id).toBe(id.toLowerCase());
    }
  });

  it('sets the version and variant bits whatever the random bytes are', () => {
    expect(randomId((length) => new Uint8Array(length).fill(0xff))).toBe('ffffffff-ffff-4fff-bfff-ffffffffffff');
    expect(randomId((length) => new Uint8Array(length))).toBe('00000000-0000-4000-8000-000000000000');
  });
});

describe('keyedId', () => {
  it('is the same for the same key on any device with the same id key', () => {
    expect(keyedId(keyA, 'habitLog', [habit, '2026-11-03'])).toBe(keyedId(keyA, 'habitLog', [habit, '2026-11-03']));
  });

  it('follows the exact formula in spec 6.2', async () => {
    // Checked against WebCrypto's HMAC, a separate implementation. If the formula changes, every
    // keyed row id changes with it, and devices on old and new code stop agreeing.
    const input = new TextEncoder().encode(JSON.stringify(['habitLog', habit, '2026-11-03', 7, true]));
    const key = await crypto.subtle.importKey('raw', keyA, { name: 'HMAC', hash: 'SHA-256' }, false, ['sign']);
    const mac = new Uint8Array(await crypto.subtle.sign('HMAC', key, input));
    expect(keyedId(keyA, 'habitLog', [habit, '2026-11-03', 7, true])).toBe(`k${toHex(mac.subarray(0, 16))}`);
  });

  it('differs by id key, table, value, order and type', () => {
    const base = keyedId(keyA, 'habitLog', [habit, '2026-11-03']);
    expect(keyedId(keyB, 'habitLog', [habit, '2026-11-03'])).not.toBe(base);
    expect(keyedId(keyA, 'fastLog', [habit, '2026-11-03'])).not.toBe(base);
    expect(keyedId(keyA, 'habitLog', [habit, '2026-11-04'])).not.toBe(base);
    expect(keyedId(keyA, 'habitLog', ['2026-11-03', habit])).not.toBe(base);
    expect(keyedId(keyA, 'x', [1])).not.toBe(keyedId(keyA, 'x', ['1']));
    expect(keyedId(keyA, 'x', [true])).not.toBe(keyedId(keyA, 'x', ['true']));
  });

  it('normalises text to NFC', () => {
    const composed = 'café';
    const decomposed = 'café';
    expect(keyedId(keyA, 'x', [composed])).toBe(keyedId(keyA, 'x', [decomposed]));
  });

  it('refuses bad input', () => {
    expect(() => keyedId(new Uint8Array(16), 'x', ['a'])).toThrow();
    expect(() => keyedId(keyA, 'x', [])).toThrow();
    expect(() => keyedId(keyA, 'x', [1.5])).toThrow();
  });

  it('makes ids of the keyed form', () => {
    expect(isKeyedId(keyedId(keyA, 'x', ['a']))).toBe(true);
  });
});

describe('isRowId', () => {
  it('accepts the three id forms and nothing else', () => {
    expect(isRowId(SINGLETON_ID)).toBe(true);
    expect(isRowId(randomId(randomBytes))).toBe(true);
    expect(isRowId(keyedId(keyA, 'x', ['a']))).toBe(true);
    expect(isRowId('3F2B8C1E-0A4D-4E6F-9B7A-1C2D3E4F5A6B')).toBe(false);
    expect(isRowId('3f2b8c1e-0a4d-7e6f-9b7a-1c2d3e4f5a6b')).toBe(false);
    expect(isRowId('k123')).toBe(false);
    expect(isRowId(42)).toBe(false);
  });
});

describe('newIdKey', () => {
  it('makes 32-byte keys', () => {
    expect(newIdKey(randomBytes)).toHaveLength(32);
    expect(() => newIdKey(() => new Uint8Array(8))).toThrow();
  });
});

describe('planRekey', () => {
  it('moves every row whose id changes under the new key, and only those', () => {
    const rows = [
      { id: keyedId(keyA, 'habitLog', [habit, '2026-11-03']), key: [habit, '2026-11-03'] },
      { id: keyedId(keyB, 'habitLog', [habit, '2026-11-04']), key: [habit, '2026-11-04'] },
    ];
    expect(planRekey(keyB, 'habitLog', rows)).toEqual([
      { from: rows[0].id, to: keyedId(keyB, 'habitLog', [habit, '2026-11-03']) },
    ]);
  });
});
