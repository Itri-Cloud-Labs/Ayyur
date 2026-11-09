// Checking and serialising column values, spec 4.2. The store runs every value through
// `normalizeValue` before writing it, and through `serializeValue` before encrypting it.

import { SINGLETON_ID, isRandomId } from '../ids';
import type { ColumnSpec } from './columns';

/** The largest serialised value the SDK accepts, in UTF-8 bytes. */
export const MAX_VALUE_BYTES = 16 * 1024;

/** The largest total of one row's serialised values, in UTF-8 bytes. Convex documents stop at 1 MiB. */
export const MAX_ROW_BYTES = 256 * 1024;

const DAY_PATTERN = /^(\d{4})-(\d{2})-(\d{2})$/;

export class ValueError extends TypeError {
  override name = 'ValueError';
}

/** True for a real calendar date written as `YYYY-MM-DD`. */
export function isDay(value: unknown): value is string {
  if (typeof value !== 'string') return false;
  const match = DAY_PATTERN.exec(value);
  if (!match) return false;
  const [year, month, date] = [Number(match[1]), Number(match[2]), Number(match[3])];
  if (month < 1 || month > 12 || date < 1) return false;
  return date <= new Date(Date.UTC(year, month, 0)).getUTCDate();
}

/** True for values `JSON.stringify` and `JSON.parse` carry through unchanged. */
export function isJsonValue(value: unknown): boolean {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
  if (typeof value === 'number') return Number.isFinite(value);
  if (Array.isArray(value)) return value.every(isJsonValue);
  if (typeof value === 'object') {
    const proto = Object.getPrototypeOf(value);
    if (proto !== Object.prototype && proto !== null) return false;
    return Object.values(value).every(isJsonValue);
  }
  return false;
}

/**
 * Checks a value against its column and returns it in stored form: text NFC-normalised, everything
 * else unchanged. Throws a ValueError naming `where` (such as `habit.title`) if the value doesn't fit.
 */
export function normalizeValue(spec: ColumnSpec, value: unknown, where: string): unknown {
  if (value === null) {
    if (spec.nullable) return null;
    throw new ValueError(`${where} can't be null`);
  }
  const fail = (expected: string): never => {
    throw new ValueError(`${where} must be ${expected}, got ${describe(value)}`);
  };
  switch (spec.type) {
    case 'text':
      return typeof value === 'string' ? value.normalize('NFC') : fail('text');
    case 'integer':
    case 'timestamp':
      return Number.isSafeInteger(value) ? value : fail('a safe integer');
    case 'real':
      return typeof value === 'number' && Number.isFinite(value) ? value : fail('a finite number');
    case 'boolean':
      return typeof value === 'boolean' ? value : fail('true or false');
    case 'day':
      return isDay(value) ? value : fail('a date as YYYY-MM-DD');
    case 'enum':
      return typeof value === 'string' && spec.values?.includes(value) ? value : fail(`one of ${spec.values?.join(', ')}`);
    case 'json':
      return isJsonValue(value) ? value : fail('a JSON value');
    case 'ref':
      return typeof value === 'string' && (isRandomId(value) || value === SINGLETON_ID) ? value : fail('a row id');
  }
}

/** The text that gets encrypted for one cell. Throws if it passes MAX_VALUE_BYTES. */
export function serializeValue(value: unknown, where: string): string {
  const serialized = JSON.stringify(value);
  const bytes = utf8Length(serialized);
  if (bytes > MAX_VALUE_BYTES) {
    throw new ValueError(`${where} is ${bytes} bytes serialised; the limit is ${MAX_VALUE_BYTES}`);
  }
  return serialized;
}

/** Throws if one row's serialised values together pass MAX_ROW_BYTES. */
export function checkRowSize(serializedValues: Iterable<string>, where: string): void {
  let bytes = 0;
  for (const serialized of serializedValues) bytes += utf8Length(serialized);
  if (bytes > MAX_ROW_BYTES) {
    throw new ValueError(`${where} is ${bytes} bytes serialised; the limit for a row is ${MAX_ROW_BYTES}`);
  }
}

/** UTF-8 length without allocating. Lone surrogates count as 3 bytes, as TextEncoder writes them. */
export function utf8Length(text: string): number {
  let bytes = 0;
  for (let i = 0; i < text.length; i++) {
    const code = text.charCodeAt(i);
    if (code < 0x80) bytes += 1;
    else if (code < 0x800) bytes += 2;
    else if (code >= 0xd800 && code <= 0xdbff && i + 1 < text.length) {
      const next = text.charCodeAt(i + 1);
      if (next >= 0xdc00 && next <= 0xdfff) {
        bytes += 4;
        i++;
      } else bytes += 3;
    } else bytes += 3;
  }
  return bytes;
}

function describe(value: unknown): string {
  if (typeof value === 'string') return JSON.stringify(value.length > 40 ? `${value.slice(0, 40)}…` : value);
  if (typeof value === 'object') return Array.isArray(value) ? 'an array' : 'an object';
  return String(value);
}
