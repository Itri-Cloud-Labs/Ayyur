# AyyurDB: architecture spec

Owner: Backend agent. Status: revision 4, agreed design. The plain modules from M1a are built; the rest isn't. First written 2026-10-16, revised 2026-11-03.

AyyurDB is the SDK that stores Ayyur's data on the phone. When the user turns on cloud sync, it also keeps that data in step with Convex across their devices. This spec covers the machinery: the schema system, the local store, row ids, sync, checksums, encryption and keys, and the account flows around them.

It does not define Ayyur's tables. The data model (prayer log, habits, tasks, Quran progress, streaks) gets its own spec once Product has settled the streak and prayer rules. Tables in this document are examples. Section 5, however, sets rules that the data model must follow, because the sync machinery only works if tables are shaped a certain way.

## 0. How to use this spec

This section is for every agent, human or model, who builds on AyyurDB.

- **MUST** and **MUST NOT** mark rules. Breaking one is a bug, even if the code works in a quick test. Most of these rules protect behaviour that only shows up with two phones, a bad clock or a lost key, which a quick test never covers.
- **SHOULD** marks a strong default. If you depart from it, write down why in the pull request.
- Section 13 lists the invariants as one numbered list. Tests refer to them by number, and so should code comments that rely on them.
- The founder settled the decisions in section 1.1. Do not change them without the founder. Section 16 records the founder decisions that were later changed and the reasons, so nobody brings back the old design by accident.
- The Backend agent made the decisions in section 1.2. Another agent who wants to change one should raise it with the Backend thread first.
- When you change this spec, add a line to the changelog in section 19.
- If the code and this spec disagree, the spec wins until someone updates it. Do not "fix" the spec to match code that drifted.

## 1. Decisions

### 1.1 Settled with the founder

| # | Decision |
|---|---|
| 1 | The SDK is a folder inside the app, `src/db/`, imported as `@/db`. A lint rule keeps app code out of its internals. Changed on 2026-11-03, see 16.2. |
| 2 | One schema, declared with `createAyyurDBSchema()`, generates the SQLite tables through Drizzle and the TypeScript types. Convex doesn't need it (decision 3). |
| 3 | Convex stores every synced row in one table, `rows`. Each document names the table it belongs to and holds each content column as its own ciphertext. Only sync metadata is readable. Convex doesn't know the schema. Changed on 2026-11-03, see 16.1. |
| 4 | Sync is live across several devices while the app is open. |
| 5 | Conflicts merge per column. The value with the newest hybrid logical clock (HLC) wins. Convex and the devices apply the same rule, so the server merges without decrypting. |
| 6 | A delete beats any edit. Deleting wipes the content and leaves a tombstone, which is kept forever. |
| 7 | The checksum system is a pure getter. The sync system calls `getChecksum` and decides what to do. |
| 8 | A checksum hashes each row's sync metadata `(table, id, version, deleted)`, returns one hash per table, and can be narrowed to 16 buckets per table. Totals are kept running, so reading one is instant. |
| 9 | Cloud data is encrypted with a random data key. The user's passphrase wraps that key, and a recovery code shown once gives a second way in. |
| 10 | The SQLite file on the phone is encrypted with SQLCipher for every user, with or without an account, using a separate local key. |
| 11 | Native crypto means the app needs a development build. Expo Go is no longer enough. |
| 12 | Schema changes are additive by default. A breaking change raises a minimum schema version, and older clients pause sync until updated. |
| 13 | App code reads and writes only through SDK methods. Each read has a live hook. |
| 14 | Signing in with local data merges it into the account automatically. Signing out keeps local data. Turning sync off offers "Delete my cloud copy". |
| 15 | Phones only. The SDK has no web support. |
| 16 | Modules use plain names: `schema`, `store`, `sync`, `checksum`, `crypto`, `clock`. |

Mapping from the founder's diagram:

| Diagram | Module |
|---|---|
| SADBSS (Schema System), `createAyyurDBSchema()` | `schema` |
| SADBSS (Sync System), `ReconcileDB(Convex, Local)` | `sync` |
| ADBCSS (Checksum System), `GetCheckSum(db.content)` | `checksum` |
| Local SQLite, SQL schema | `store` |
| Convex, Convex schema | `src/db/convex/` plus the app's `convex/` folder |

### 1.2 Added by the Backend agent in revision 2

These came out of a review of revision 1. Each fixes a failure that revision 1 allowed. The founder decisions still stand.

| # | Decision | The failure it prevents |
|---|---|---|
| B1 | A table can declare a natural key. Its row ids are then derived from the key with a keyed hash, so two phones that record the same fact produce the same row (section 6). | Two offline phones each log Fajr for the same day. With random ids they create two rows, and the log shows Fajr twice. |
| B2 | Keyed tables and singletons cannot be deleted. Their state changes through a column (section 5, rule R6). | A deleted keyed row is a tombstone forever, and delete beats edit. Unticking a prayer and ticking it again would silently do nothing. |
| B3 | Each account has an epoch. Wiping the cloud copy or resetting the data key raises it, and a device on an older epoch stops syncing (section 11.6). | Phone A deletes the cloud copy. Phone B, still signed in, uploads everything again at its next reconcile. |
| B4 | Convex refuses clocks more than 5 minutes ahead of server time, and every push response carries the server's time (section 9). | A phone whose date is set a year ahead wins every conflict until that date arrives. |
| B5 | Reconcile compares checksums only at a shared point. The server checksum carries the `seq` it was read at, and the device compares only when its cursor matches and nothing is pending (section 11.5). | Checksums taken while a pull is still behind differ for no real reason. Reconcile then does pointless repair rounds and can end in a false `error`. |
| B6 | Write transactions run synchronously through one queue. Reads run asynchronously (section 7.4). | `withTransactionAsync` in expo-sqlite includes any query that runs while it is open, even one outside its scope. A write could then roll back another write that happened to run at the same time. |
| B7 | `android.allowBackup` is `false` in `app.json` (section 7.3). | Android restores the database file from a backup, but the key in SecureStore cannot come with it. The restored file can never be opened. |

## 2. Glossary

| Term | Meaning |
|---|---|
| Row | One record in a synced table, identified by `(table, id)`. |
| Content column | A column declared in the schema. It is encrypted in Convex. |
| Sync metadata | `id`, version, deleted flag, per-column clocks, `seq`. Convex can read it. |
| HLC | Hybrid logical clock. A string that sorts in time order and names the device that made it (section 9.1). |
| Cell | One content column's value plus the clock of its last write. In Convex a cell is `{ hlc, ct }`, where `ct` is ciphertext. |
| Tombstone | A deleted row. It has no content, `deleted = true`, and a version equal to the delete clock. |
| Random-id table | A table whose row ids are random UUID v4. The default kind. |
| Keyed table | A table that declares `key`. Row ids are derived from the key columns (section 6.2). |
| Singleton | A table with at most one row, whose id is the literal `'singleton'`. |
| Append-only table | A random-id table whose rows are never edited after insert. They can only be removed. |
| Local table | A table that never syncs. It has no clocks, checksums or Convex table. |
| Id key | 32 random bytes used to derive keyed row ids. It is shared by every device in an account (section 6.3). |
| Data key (DK) | 32 random bytes that encrypt every cloud value (section 12). |
| Epoch | A per-account integer. It rises when the cloud copy is wiped or the data key is reset (section 11.6). |
| `seq` | A per-account counter that Convex stamps on every change it applies. Pull cursors are `seq` values. |
| Pending | Columns changed on this device and not yet confirmed by Convex. Stored in `_pending`. |

## 3. Code layout

```
src/db/
  index.ts       the public API for app code: the `db` object with every table's read and write methods
  schema/        createAyyurDBSchema, column builders, the Drizzle generator, schema diff
  clock/         HLC: tick, receive, compare
  merge/         mergeRow, shared by the device and Convex
  ids/           random ids, keyed id derivation, re-keying
  crypto/        value encryption, key wrapping, local database key
  store/         opens the SQLCipher database, runs migrations, the write queue, change events
  checksum/      row hash, running totals, getChecksum
  sync/          push queue, pull cursor, reconcile, epochs, account flows
  tables/        one file per table: its schema and its SDK read and write methods
  react/         AyyurDBProvider, useAyyurQuery, useSyncState
  convex/        server side: the rows table, push, changes, checksum queries, vault, wipe
  drizzle/       migrations generated by drizzle-kit, committed
  schema-snapshots/  one JSON snapshot per released schema version, committed
  test/
convex/          the app's Convex deployment: schema.ts and thin wrappers around src/db/convex
```

Import rules. A lint rule (`no-restricted-imports` in `eslint.config.js`) enforces the first two.

- App code, meaning everything in `src/` outside `src/db/`, imports only `@/db` and `@/db/react`. It never imports a file deeper inside `src/db/`.
- Nothing outside `src/db/` imports Drizzle, `expo-sqlite`, `react-native-libsodium` or `expo-secure-store` for AyyurDB's data.
- `schema`, `merge`, `clock`, `ids`, `checksum` and `convex` are plain TypeScript. They MUST NOT import React Native, Expo or anything that does, because Convex runs them too. A second lint rule covers these folders.
- `convex/` imports from `src/db/convex/` and the plain modules above by relative path, such as `../src/db/merge`. Convex bundles them with esbuild.

The SDK may move into a workspace package later. That is a mechanical change: move the folder and replace `@/db` imports with the package name.

## 4. Schema system

### 4.1 Declaring

```ts
import { createAyyurDBSchema, table, text, integer, boolean, enumOf, json, day, ref } from '@/db/schema';

export const schema = createAyyurDBSchema({
  version: 3,
  minVersion: 2,
  tables: {
    profile: table(
      { name: text(), birthYear: integer().nullable(), voice: enumOf(['gentle', 'direct', 'teacher']).nullable() },
      { singleton: true },
    ),
    habit: table(
      { title: text(), archived: boolean().default(false) },
      { indexes: [['archived']] },
    ),
    habitLog: table(
      { habitId: ref('habit'), day: day(), status: enumOf(['done', 'cleared']) },
      { key: ['habitId', 'day'] },
    ),
    quranReading: table(
      { day: day(), range: json<{ from: number; to: number }>() },
      { appendOnly: true, indexes: [['day']] },
    ),
    prayerTimes: table(
      { day: day(), times: json<Record<string, number>>() },
      { local: true, indexes: [['day']] },
    ),
  },
});
```

### 4.2 Column types

| Builder | Stored in SQLite as | Value in TypeScript | Notes |
|---|---|---|---|
| `text()` | TEXT | `string` | The SDK normalises text to Unicode NFC on write. |
| `integer()` | INTEGER | `number` | Must be a safe integer. Writes outside `Number.MIN_SAFE_INTEGER` to `Number.MAX_SAFE_INTEGER` throw. |
| `real()` | REAL | `number` | Must be finite. |
| `boolean()` | INTEGER 0 or 1 | `boolean` | |
| `day()` | TEXT | `string` | `YYYY-MM-DD`, checked with a regex on write. The SDK treats it as an opaque date. Which day an act belongs to is the data model's rule, not the SDK's. |
| `timestamp()` | INTEGER | `number` | Milliseconds since the epoch. |
| `enumOf([...])` | TEXT | union of the values | Writes of other values throw. |
| `json<T>()` | TEXT | `T` | Serialised with `JSON.stringify`. Replaced whole on merge, never merged inside (rule R4). |
| `ref('table')` | TEXT | `string` | The id of a row in another synced table. The target MUST be a random-id table or a singleton (rule R8). The schema throws at import time otherwise. |

Every column is required unless it is `.nullable()` or has a `.default()`.

Table and column names MUST match `^[a-z][A-Za-z0-9]{0,63}$`. Names starting with `_` are reserved for sync columns, and Convex refuses record keys that start with `_` or `$`. The schema throws at import time on a name that doesn't match.

A serialised value, meaning the JSON text that gets encrypted, MUST NOT exceed 16 KiB. The SDK throws on writes above this. Longer content, such as a long journal entry, has to be split across rows by the data model.

A whole row's serialised values, added together, MUST NOT exceed 256 KiB. The SDK throws on a write that would pass it. Convex documents are capped at 1 MiB, and this leaves room for encryption overhead and `_extra` cells from newer schemas. In practice a table hits it only with many large text columns, which rule R10 and the 16 KiB limit already discourage.

### 4.3 Table kinds and options

A table has exactly one kind. The schema throws at import time if options combine kinds.

| Kind | Option | Id | SDK write methods | Can delete |
|---|---|---|---|---|
| Random-id | none | random UUID v4 | `insert`, `update`, `remove` | yes |
| Append-only | `appendOnly: true` | random UUID v4 | `insert`, `remove` | yes |
| Keyed | `key: [...]` | derived from key (6.2) | `upsert`, `update` by key | no |
| Singleton | `singleton: true` | `'singleton'` | `upsert`, `update` | no |
| Local | `local: true` | any text the table chooses | anything | yes, and no tombstone |

Further options for every kind:

- `indexes: string[][]` adds local SQLite indexes for reads. Convex has no content indexes, because it can't read the content.

Rules for `key`:

- Key columns MUST be `text`, `integer`, `boolean`, `day`, `enumOf` or `ref`. They MUST NOT be nullable. `real`, `timestamp` and `json` are refused, because two phones can write the same fact with slightly different values for them.
- Key columns can't change after insert. `update` doesn't accept them in its patch type, and throws at runtime if they appear anyway. A different key is a different row.
- The schema adds a unique local index on the key columns.

Local tables are plain Drizzle tables with an `id` column. They have no `_clocks`, `_version`, `_deleted`, `_extra`, checksum or pending entries. They exist for caches the device can rebuild, such as computed prayer times or streaks.

### 4.4 What it generates

From one schema the generators derive:

1. **Drizzle tables** for SQLite, with the sync columns from 7.1 added to every synced table. `drizzle-kit generate` with driver `expo` turns them into SQL migrations in `src/db/drizzle/`, which are committed.
2. **TypeScript types** for each row, for each table's insert and patch shapes, and for each keyed table's key.
3. **Table metadata** used on the device at runtime: each table's kind, key columns and column types.

Convex gets nothing from the schema. Its `rows` table (8.1) holds rows of any table, so adding a table or a column never needs a Convex deploy. Convex MUST NOT import the schema or the table metadata. If it did, an older server would have to know about newer tables, and the release order problem in 16.1 would come back.

The tables are built when the schema is imported. No generated source files are checked in apart from the Drizzle migrations and the schema snapshots.

### 4.5 Evolution

Each released schema has a `version`. A snapshot of each released version is committed to `schema-snapshots/`, and a test compares the current schema with the previous snapshot.

Additive changes, allowed at any time:

- a new table
- a new column that is nullable or has a default
- a new local index

Breaking changes, which need `minVersion` raised to the new version:

- removing or renaming a table or column
- changing a column's type
- making a nullable column required, or a required column nullable. Either way, one side gets a null it can't store or can't read
- adding or removing an enum value
- changing a table's kind, or its key columns

The comparison test fails if a breaking change lands without the `minVersion` bump.

Additive changes ship with the app alone. No Convex deploy is needed, because Convex stores cells under whatever column names the device sends.

Older clients and columns they don't know:

- The server merges per column, so an older client never sends columns it doesn't know and never erases them.
- When an older client pulls a row, it keeps columns it doesn't know in the row's `_extra` column as `{ column: { hlc, ct } }`. The ciphertext stays encrypted, because the client doesn't know the column's type.
- Reconcile sends `_extra` cells along with the row's known cells when it pushes a full row.
- After the app updates and its migration adds the column, the store decrypts these values into it, with their clocks, in one transaction.

`minVersion` is stored in the Convex `meta` table for the deployment. Every push and pull sends the client's schema version. If it is below `minVersion`, the server refuses, and the client sets its sync state to `updateRequired`. Local reads and writes keep working.

Raising `minVersion` in Convex is a manual step, done with an internal mutation, `meta.setMinVersion`, through `npx convex run`. It MUST happen only after the app version that needs it is live in both app stores. Raising it earlier would stop sync for every user, with no update available to fix it.

## 5. Rules for table design

The sync machinery merges each column on its own and lets the newest write win. That is right for some data and badly wrong for other data. These rules say which is which. The data-model spec MUST follow them, and code review MUST check new tables against them.

**R1. Last write wins must be the right answer for every column.** Before adding a column, imagine two phones changing it while offline and one of the values being thrown away. If losing one is acceptable, as with a setting, a title or a status, the column is fine. If it isn't, the data needs rows instead of a column, as in R2.

**R2. No counters, totals or running sums as columns.** "Pages read today" as an integer column loses an increment whenever two phones add to it before syncing. Record each act as its own row in an append-only table, such as one `quranReading` row per session, and add them up when reading.

**R3. Derived values are computed on the device, never synced.** Streaks, totals, badges and prayer times are computed from the synced rows into local tables or into memory. If they synced, two phones that computed them a moment apart would conflict over values that are both correct.

**R4. A `json` column is replaced whole.** Two phones that each add an item to a list stored in one `json` column lose one of the additions. Use `json` only for a value that one person edits at a time as a unit, such as a reminder settings object. For a list the user edits, use one row per item, with an ordering column.

**R5. If a fact can happen at most once per something, the table is keyed.** One status per prayer per day, one log per habit per day, one fast per day. These MUST be keyed tables, so two phones that record the same fact land on the same row.

**R6. Keyed tables and singletons are never deleted.** A tombstone is permanent and beats any later edit, and a keyed row's id can never change. A deleted keyed row could therefore never be recorded again. Give the table a state column with a neutral value instead, such as `status: enumOf(['done', 'cleared'])`. The SDK enforces this, because these kinds have no `remove` method.

**R7. Undo is done with a column, never by deleting and recreating.** A deleted random-id row can't come back. Recreating it makes a new id, which breaks every `ref` to the old one. A screen that offers undo after "delete" MUST set a column such as `archived` or `hidden`, and only call `remove` once the undo is no longer offered, if at all.

**R8. References point at random-id rows or singletons.** A `ref` column stores another row's id. Keyed row ids change when the device adopts an account's id key (6.4), so a `ref` to a keyed row would break. The schema refuses such a `ref`. To point at a keyed row, store its key columns instead.

**R9. Reads tolerate missing references.** Phone A deletes a habit while phone B logs it. Delete wins, so B's log row now points at a tombstone. Reads MUST handle a `ref` whose target is missing or deleted, usually by hiding the row. A write method that deletes a row SHOULD also delete or archive the rows that refer to it in the same transaction, but reads can't rely on that.

**R10. Columns that only make sense together are written as one value.** Per-column merging can mix one phone's `from` with another phone's `to`. If several values must stay consistent, put them in one `json` column, or put them in an append-only row that never changes.

**R11. Content belongs in content columns.** Anything that says something about the user's practice, including dates, names and statuses, MUST be a content column, so it is encrypted in Convex. Never put it in a row id, a table name or any other metadata field. Table names are visible to the server, so they SHOULD describe a feature, not the user.

## 6. Row ids

### 6.1 Random ids

Random-id and append-only tables use UUID v4 from `expo-crypto`'s random bytes, written in lowercase with dashes. It is v4 rather than v7 so the id doesn't reveal when the row was created.

### 6.2 Keyed ids

A keyed row's id is computed from its table name and key values:

```
input = JSON.stringify([tableName, keyValue1, keyValue2, ...])   // key values in the order of `key`
id    = 'k' + hex(first 16 bytes of HMAC-SHA-256(idKey, utf8(input)))
```

- Values go into `input` exactly as the SDK stores them. Text is NFC-normalised, integers are JSON numbers, booleans are `true` or `false`, and days are `YYYY-MM-DD` strings.
- The result is `k` followed by 32 lowercase hex characters.
- HMAC-SHA-256 comes from `@noble/hashes`.
- `ids.keyedId(idKey, table, key)` is the only function that computes it. Nothing else may.

The hash MUST be keyed. A plain hash of `["habitLog","<habit id>","2026-11-03"]` could be guessed by trying every date, and the row id would then reveal what the encryption hides.

### 6.3 The id key

- On first launch the device generates 32 random bytes and stores them in SecureStore under `ayyurdb.id.key`. Every keyed id on this device is derived with the current id key.
- When the device joins an account with sync, all devices in the account must use the same id key, or the same fact would get different ids on each phone. The account's id key is stored in the Convex `vault`, encrypted with the data key (12.3).
- Turning sync on for a new account generates a fresh id key for that account. The device doesn't upload its local one, so the same row ids never appear under two accounts.

### 6.4 Re-keying

When the device adopts a different id key, it re-keys:

1. In one write transaction, for every row of every keyed table, compute the new id from the row's key columns.
2. Rewrite the row's id. If a row with the new id already exists, which can only happen if local data was already inconsistent, merge the two rows with `mergeRow` and keep one.
3. Update the checksum totals: subtract each old row hash and add the new one.
4. Store the new id key in SecureStore.

Re-keying happens before any pull or push in the account flows (11.7), so pulled keyed rows meet local rows that already have the right ids. Re-keying only touches keyed tables. Random ids and `'singleton'` don't change, so `ref` columns stay valid. This is why rule R8 exists.

## 7. Local store

### 7.1 Row layout

Every synced table in SQLite has its content columns plus:

| Column | Meaning |
|---|---|
| `id` | A random UUID v4, a keyed id (6.2), or `'singleton'`. |
| `_clocks` | JSON `{ column: hlc }`, the clock of the last write to each content column. |
| `_version` | The largest clock in `_clocks`, or the delete clock for a tombstone. |
| `_deleted` | 0 or 1. |
| `_extra` | JSON of cells from a newer schema that this version doesn't know (4.5). |

Internal tables:

| Table | Purpose |
|---|---|
| `_meta` | Key-value rows: `deviceId`, `lastHlc`, `schemaVersion`, `cursor`, `epoch`, `userId`, `syncEnabled`, `syncState`. |
| `_pending` | `(table, id, column, hlc)`, one row per changed column not yet confirmed by Convex. A delete is the column `*`. |
| `_checksum` | `(table, bucket, total)`, the running checksum totals (section 10). |

### 7.2 Keys on the device

| SecureStore key | Holds | Created |
|---|---|---|
| `ayyurdb.local.key` | 32 bytes, the SQLCipher key | first launch |
| `ayyurdb.id.key` | 32 bytes, the current id key | first launch, replaced by re-keying |
| `ayyurdb.data.key` | 32 bytes, the data key | when the device unlocks an account |

On iOS these entries use SecureStore's "when unlocked, this device only" accessibility, so they never move to another phone through a backup. M0 checks the exact option name against the SDK 57 `expo-secure-store` docs.

### 7.3 Opening

`AyyurDBProvider` opens the database at app start:

1. It reads `ayyurdb.local.key`.
   - If the key is missing and `ayyur.db` doesn't exist, this is a first launch. It generates the local key and the id key and creates the database.
   - If the key is missing but `ayyur.db` exists, the file came from a backup without its key and can never be opened. The provider deletes the file and starts fresh. If sync was on, signing in again restores the data from Convex.
   - If the key exists but opening fails, the provider MUST NOT delete anything. It reports a fatal store error to the app, which shows it and offers support contact. Deleting here could destroy the only copy of the user's data.
2. It opens `ayyur.db` with `enableChangeListener: false`. Change events come from the SDK's own write path instead (7.6).
3. It runs `PRAGMA key = "x'<hex>'"` straight after opening, before any other statement, as the expo-sqlite docs require.
4. It runs the pending Drizzle migrations, then moves `_extra` values into any columns those migrations added.
5. It renders children only after these steps succeed. The splash screen stays up until then.

SQLCipher is turned on with `useSQLCipher: true` in the `expo-sqlite` config plugin in `app.json`. It doesn't work in Expo Go. From M1 onwards the app runs in a development build only.

`app.json` sets `android.allowBackup: false` (decision B7). This turns off Android backup for the whole app, including AsyncStorage. That is fine, because nothing in the app is worth restoring without its keys.

The local key is separate from the data key, so signing out or forgetting the passphrase never locks the user out of their own phone.

### 7.4 The write queue

Every write goes through one queue in JavaScript. That includes app writes, sync applying pulled rows, re-keying and migrations. The queue runs one item at a time. Each item is one synchronous transaction (`withTransactionSync`).

- Synchronous transactions mean no other query can run inside the transaction, which `withTransactionAsync` doesn't guarantee (decision B6).
- A write transaction SHOULD finish in under 8 ms on the Itel S23, half a frame. Work bigger than that, such as a pulled page or re-keying thousands of rows, MUST be split into several transactions, with the queue yielding to the UI between them.
- Encryption and decryption happen outside the transaction where possible. Sync decrypts a chunk, then opens the transaction to apply it.

Inside one write transaction, for each row it changes:

1. Tick the HLC once for the whole transaction (9.2).
2. Write the values, and set each changed column's clock in `_clocks` to the new tick. A column whose new value equals its old value is not changed and keeps its clock. Update `_version`.
3. Update the checksum totals for the row's table and bucket. Subtract the old row hash and add the new one.
4. If sync is on, add the changed columns to `_pending`, replacing any older pending entry for the same column.
5. Save `lastHlc` in `_meta`.
6. Record the table name for the change event.

### 7.5 Deletes

`remove(id)` exists only on random-id and append-only tables. In one write transaction it:

1. Ticks the HLC.
2. Sets `_deleted = 1`, sets every content column to null or its default, empties `_clocks` and `_extra`, and sets `_version` to the delete tick.
3. Updates the checksum.
4. If sync is on, replaces every pending entry for the row with one `*` entry carrying the delete tick.

Removing a row that is already a tombstone does nothing. Removing an id that doesn't exist throws.

### 7.6 Reads and live hooks

Each table file in `tables/` declares its SDK methods. Reads say which tables they touch:

```ts
export const habitLog = {
  forDay: read(['habitLog', 'habit'], (q, day: string) => q.select().from(t.habitLog).where(...)),
  set: write((tx, input: { habitId: string; day: string; status: 'done' | 'cleared' }) => tx.upsert('habitLog', input)),
};
```

```tsx
const logs = useAyyurQuery(db.habitLog.forDay, today);
```

- Reads use expo-sqlite's async API, so a read never blocks the JS thread.
- Reads hide tombstones. A read that needs them doesn't exist in app code. Only sync and checksum code see tombstones.
- After each committed write transaction, the store adds the changed table names to a set. It emits the set once, in a microtask after the commit. While sync is applying a pulled page, emission waits until the page's last chunk commits, so a 200-row page causes one re-render, not four.
- `useAyyurQuery` re-runs only when one of its declared tables is in the emitted set.
- `useAyyurQuery` returns `undefined` until the first result. After that, it keeps the previous result while re-running. It returns a new array only if a row's `id` or `_version` differs, so unchanged results don't re-render.
- Drizzle and the raw database are never exported from the package.

## 8. Convex side

### 8.1 Tables

Every synced row of every table lives in one Convex table:

```ts
const cell = v.object({ hlc: v.string(), ct: v.bytes() });

rows: defineTable({
  userId: v.string(),               // Clerk subject, from ctx.auth
  table: v.string(),                // the SQLite table this row belongs to, such as 'habitLog'
  rowId: v.string(),
  bucket: v.number(),               // 0 to 15, the checksum bucket of rowId (section 10)
  version: v.string(),              // HLC, as in _version
  deleted: v.boolean(),
  seq: v.int64(),                   // server change counter, for pulling
  device: v.string(),               // device that last changed the row
  cells: v.record(v.string(), cell), // column name to cell; empty for a tombstone
})
  .index('by_user_row', ['userId', 'table', 'rowId'])
  .index('by_user_seq', ['userId', 'seq'])
  .index('by_user_bucket', ['userId', 'table', 'bucket']),
```

- `bucket` is computed by `push` from `rowId` with the checksum module. It exists so `bucketRows` reads one index range instead of every row the user has.
- `cells` holds every column the device sent, including columns from a schema newer than the device that later pulls the row (4.5).

Other tables:

| Table | Holds |
|---|---|
| `meta` | One document per deployment: `minVersion`. |
| `account` | One per user: `epoch`, `seq` (the last value handed out), `wiping` (`null`, `'delete'` or `'reset'`), `lastWipe` (`'delete'`, `'reset'` or `null`). It survives a wipe and is removed only when the Clerk user is deleted. |
| `vault` | One per user: the data key wrapped twice (passphrase and recovery code), the KDF salt and parameters, `keyVersion`, the id key encrypted with the data key, and the `epoch` it was created in. |
| `checksums` | One per user, table and bucket: the running total. Index `by_user_table_bucket`. |

### 8.2 Request envelope and refusals

Every function except `account.status` takes the user from `ctx.auth.getUserIdentity()` and never from its arguments. A call without an identity throws `unauthenticated`.

`push`, `changes`, `checksum`, `bucketRows` and `rows` also take `{ schemaVersion, epoch }`. Before anything else they check these, in this order:

| Check | Refusal code | What the device does |
|---|---|---|
| `schemaVersion < meta.minVersion` | `updateRequired` | State `updateRequired`. Stops syncing until the app updates. |
| `account.wiping` is set | `wiping` | Waits and retries with backoff. |
| no `vault` | `noVault` | Runs the epoch-change handling in 11.6. |
| `epoch !== account.epoch` | `epochChanged` | Runs the epoch-change handling in 11.6. |

`push` adds two more:

| Check | Refusal code | What the device does |
|---|---|---|
| any clock in the batch is more than 5 minutes ahead of server time | `clockAhead` | Runs the clock repair in 9.4. |
| more than 100 rows or more than 4 MiB of ciphertext in the batch; a row whose ciphertext totals more than 300 KiB; a table or column name that doesn't match the pattern in 4.2; a row id that isn't a UUID v4, a keyed id or `'singleton'`; a non-deleted row with no cells, or whose `version` isn't its largest cell clock; a tombstone with cells; or a ciphertext over 17 KiB | `badRequest` | State `error`. Logs it. This is a client bug. |

Refusals are thrown as `ConvexError` with `{ code }`. A `clockAhead` refusal also carries `serverTime`. A refused call changes nothing.

### 8.3 Functions

| Function | Kind | Arguments | Returns |
|---|---|---|---|
| `push` | mutation | envelope, `device`, `rows: WireRow[]` (at most 100) | `{ seq, serverTime, newer: WireRow[] }` |
| `changes` | query | envelope, `cursor` | `{ rows: WireRow[], nextCursor }`, at most 200 rows |
| `checksum` | query | envelope, optional `table` | `{ seq, tables }` or `{ seq, buckets }` |
| `bucketRows` | query | envelope, `table`, `bucket`, optional `after` | `{ seq, rows: { rowId, version, deleted }[], next }`, at most 2,000 rows |
| `rows` | query | envelope, `table`, `rowIds` (at most 100) | `{ rows: WireRow[], missing: string[] }`, at most 4 MiB |
| `account.status` | query | none | `{ epoch, hasVault, wiping, lastWipe }`, or `null` without an identity |
| `vault.get` | query | none | the vault, or `null` |
| `vault.create` | mutation | the new vault | `{ epoch, serverTime }`. Fails with `vaultExists` if one exists, or `wiping` during a wipe. |
| `vault.update` | mutation | `epoch`, `keyVersion`, new wrapped copies | Fails with `epochChanged` or `staleVault` if `keyVersion` doesn't match. |
| `wipe` | mutation | `reason: 'delete' \| 'reset'` | nothing; the work continues in scheduled batches |
| `clerkWebhook` | HTTP action | Clerk event | On `user.deleted`, verifies the signature and schedules a wipe that also removes `account`. |

A `WireRow` is `{ table, rowId, version, deleted, cells: { [column]: { hlc, ct } }, seq? }`. A tombstone has `deleted: true`, empty `cells`, and its delete clock as `version`.

**`push`**, for each incoming row, inside the one mutation:

1. Load the stored row by `by_user_row`, with the row's `table` and `rowId`.
2. If there is none, the merged row is the incoming row.
3. Otherwise the merged row is `mergeRow(stored, incoming)` (9.5).
4. If the merged row differs from the incoming row, add the merged row to `newer`. This happens when the server already held a newer cell or a tombstone.
5. If the merged row equals the stored row, meaning the same `deleted`, `version` and cell clocks, write nothing and stamp no `seq`.
6. Otherwise take the next `account.seq`, write the merged row with that `seq`, `device` and `bucket`, and update the `checksums` total for its table and bucket: subtract the old row hash and add the new one.

The response's `serverTime` is `Date.now()` in the mutation.

`newer` matters because a merge that changes nothing stamps no `seq`. Without it, a device that pushed an older cell than the server's would never pull the server's cell back, and the two would differ forever with the same version, which the checksum can't see. The convergence test found this. `newer` counts toward the 4 MiB response cap; if it would pass it, `push` returns the row ids alone and the device fetches them with `rows`.

**`changes`** reads up to 200 rows from `by_user_seq` with `seq > cursor`, in `seq` order. It stops early once the ciphertext in the page passes 4 MiB, but always returns at least one row if any exist. `nextCursor` is the highest `seq` returned. When the page reaches the end, meaning no rows with a higher `seq` remain, `nextCursor` is `account.seq` instead. A page holds rows from any mix of tables.

The jump at the end matters after a wipe. `seq` keeps rising across wipes (invariant 16), and the wiped rows took their `seq` values with them. No remaining row may carry the latest `seq`, so without the jump the cursor could never reach `account.seq`, and reconcile would wait for it forever (11.5). The convergence test found this.

**`bucketRows`** reads `by_user_bucket` for one table and bucket, ordered by `rowId`, starting after `after`. It returns at most 2,000 rows. `next` is the last `rowId` returned when more remain, or `null`. Reconcile follows `next` until it is `null`. Every page carries `seq`, and if `seq` changes between pages, reconcile starts that bucket again.

**`rows`** reads `by_user_row` once per requested id, in the order given. It stops before the response would pass 4 MiB of ciphertext. Ids it didn't reach go in `missing`, and the caller asks for them again. Ids that don't exist on the server are left out of both lists.

**`checksum`** and **`bucketRows`** return `account.seq` alongside the data. Convex reads a query from one consistent snapshot, so the totals match exactly that `seq`.

### 8.4 Why pulling uses a server counter

Devices pull "everything changed since my cursor". That cursor can't be an HLC.

Suppose a device with a slow clock uploads after another device has already pulled past that time. Its row would carry an older clock and never be pulled. So every change the server applies takes the next value of the user's counter in `account`, inside the same Convex transaction, and the row stores it as `seq`. Cursors are `seq` values.

### 8.5 Wipe

`wipe(reason)` runs as:

1. One mutation sets `account.epoch += 1`, sets `account.wiping = reason`, and deletes the `vault`. From this moment every sync call from every device is refused, before any row is touched.
2. Scheduled mutations delete the user's `rows` and `checksums`, 1,000 documents per mutation, each scheduling the next until none remain.
3. The last batch sets `account.wiping = null` and `account.lastWipe = reason`. `account.seq` is not reset, so cursors never go backwards.

A wipe for a deleted Clerk user does the same and then deletes `account`.

### 8.6 Convex limits this design depends on

From https://docs.convex.dev/production/state/limits, read on 2026-11-03. Recheck them when Convex changes plans or pricing.

| Convex limit | Value | Where this spec stays under it |
|---|---|---|
| Document size | 1 MiB | One row's values total at most 256 KiB as plaintext, and `push` refuses rows over 300 KiB of ciphertext (4.2, 8.2). |
| Function arguments | 16 MiB | `push` batches carry at most 4 MiB of ciphertext (11.3). |
| Return value | 16 MiB | `changes` and `rows` stop at 4 MiB of ciphertext. `bucketRows` returns metadata only, 2,000 rows a page (8.3). |
| Data read per query or mutation | 16 MiB | The same caps as above. `bucketRows` reads whole documents to return their metadata, so a page of 2,000 rows of average size stays well under. |
| Documents scanned per query or mutation | 32,000 | Every read uses an index range with a page limit. Nothing filters in code. |
| Documents written per mutation | 16,000 | A `push` writes at most 100 rows, 100 checksum totals and `account`. Wipe batches delete 1,000 documents. |
| Execution time of user code | 1 second | `push` hashes and merges at most 100 rows. M3 measures this. |
| Top-level field names | 64 characters, alphanumeric and `_` | `rows` uses fixed field names. Column names live inside `cells`, and 4.2 limits them to 64 characters. |

Per-user limits on rows, bytes and push rate are still open (section 17).

## 9. Clocks and merging

### 9.1 Format

A clock is a string that sorts in time order:

```
<ms: 12 lowercase hex>:<counter: 4 lowercase hex>:<device: 16 lowercase hex>
```

- `ms` is milliseconds since the epoch.
- The device id is 8 random bytes, made on first launch and kept in `_meta`.
- Clocks compare as plain strings. The device id is part of every clock, so two writes from different devices never compare equal, and the merge always has a winner.

### 9.2 Ticking

`tick()` runs once per write transaction:

```
now = Date.now()
if now > last.ms:           next = (now, 0)
else if last.counter < 0xffff: next = (last.ms, last.counter + 1)
else:                       next = (last.ms + 1, 0)
last = next
```

### 9.3 Receiving

The device folds other clocks into `last`, so its next write sorts after everything it has seen:

- For each clock in a pulled row: `last = max(last, (remote.ms, remote.counter))`.
- For the `serverTime` returned by `push` and `vault.create`: `last = max(last, (serverTime, 0))`. A phone whose clock runs slow still writes clocks at least as new as the server's time after each push.
- Every pulled clock is folded in, even one far ahead of the device's own `Date.now()`. Convex refuses clocks more than 5 minutes ahead of server time (9.4), so a pulled clock that looks far ahead means this device runs slow. Ignoring it would let the next local write get an older clock than the cell it overwrites. The server would keep the old cell, and the user's later edit would be lost. Revision 3 ignored such clocks; the convergence test found the bug.
- The clock also remembers the newest clock it has received, from pulls and from `serverTime`. The repair in 9.4 never moves the clock below it.

These rules give one guarantee that the rest of sync relies on: **every local write gets a clock later than every clock the device has seen**, apart from its own clocks that Convex refused. So a write always sorts after the cells it overwrites (invariant 20).

### 9.4 Clocks that run ahead

Convex refuses a `push` containing any clock more than 5 minutes ahead of its own time, with `clockAhead` (decision B4). The refused columns stay pending.

On `clockAhead` the device:

1. Reads `serverTime` from the refusal and compares it with its own `Date.now()`.
2. If its own time is still more than 5 minutes ahead, it sets state `clockWrong` and retries on the next trigger. The app tells the user their phone's date or time is wrong. Local reads and writes keep working.
3. Once its own time is within 5 minutes, it repairs, in one write transaction:
   1. It moves the clock back to `(max(serverTime, now), 0)`, but never below the newest clock it has received (9.3), nor below the newest of its own clocks that it keeps. Those are the clocks no more than 5 minutes ahead of `serverTime`.
   2. It ticks once.
   3. It re-stamps, with that one tick, every local cell and every tombstone whose clock is more than 5 minutes ahead of `serverTime`. That covers pending columns and also cells written while sync was off, which reconcile would otherwise try to upload and Convex would refuse.
   4. It updates `_clocks`, `_version` and the checksum for each re-stamped row. If sync is on, it adds the re-stamped columns to `_pending`.
4. Then it pushes.

Re-stamping is safe. Convex never accepted those clocks, so no other device has seen them. The floor in step 3.1 matters: in revision 3 the clock went back to the server's time only, so a re-stamped cell could sort before a newer cell the device had already pulled and merged. The convergence test found that too.

### 9.5 Merge rule

One function, `mergeRow(a, b)`, in `src/db/merge/`. Both the `push` mutation and the device, when it applies pulled rows, use it:

```
if a.deleted or b.deleted:
  return { deleted: true, cells: {}, version: max(version of each side that is deleted) }
cells = {}
for each column in a.cells ∪ b.cells:
  cells[column] = whichever of a.cells[column], b.cells[column] has the larger hlc   // a missing cell loses
return { deleted: false, cells, version: max(hlc of every cell) }
```

- An edit never brings a deleted row back, whatever its clock (decision 6).
- On the server the cells hold ciphertext and the rule only compares clocks, so it never needs a key.
- On the device, `cells` covers both the known columns and `_extra`.
- The rule is deterministic, commutative, associative and idempotent. Devices that have seen the same changes hold the same rows, whatever order the changes arrived in. The convergence test checks this (section 14).

## 10. Checksum system

`getChecksum(store, scope?)`:

- `getChecksum(store)` returns `{ [table]: hash }`.
- `getChecksum(store, { table })` returns `{ [bucket 0..15]: hash }`.

There is one implementation with two storage adapters, SQLite and Convex. It only reads. Deciding what a mismatch means is the sync system's job.

- **Row hash.** The first 16 bytes of `SHA-256(table ‖ 0x00 ‖ id ‖ 0x00 ‖ version ‖ 0x00 ‖ deleted)`, read as a 128-bit integer. `deleted` is the byte `0x30` or `0x31`, ASCII `0` or `1`.
- **Bucket.** The first 4 bits of `SHA-256(id)`. Hashing the id, rather than taking its first character, keeps fixed ids like `'singleton'` and keyed ids spread evenly.
- **Totals.** Each bucket total is the sum of its row hashes mod 2^128, stored as 32 hex characters. A table's hash is the sum of its bucket totals mod 2^128. Writes add the new row hash and subtract the old one in the same transaction as the write (7.4 and `push`), so a read never scans rows.
- **Scope.** Only synced tables have checksums. Local tables have none.
- **Hash function.** SHA-256 comes from `@noble/hashes`, so the phone and Convex run identical code.

Encrypted values aren't hashed, because encrypting the same value twice gives different bytes. A version is assigned once per write, so the same `(id, version, deleted)` on both sides means the same content.

The checksum is for catching sync bugs. It isn't tamper-proof, because the server holds both its data and its totals. Section 12.5 says what that means for the privacy claims.

## 11. Sync system

### 11.1 States

`useSyncState()` returns `{ state, lastSyncedAt, notice }`.

| State | Meaning |
|---|---|
| `off` | No account, or sync turned off. |
| `locked` | Signed in, but this device has no data key yet. It needs the passphrase or the recovery code. |
| `syncing` | Pushing, pulling or reconciling. |
| `idle` | Caught up. |
| `offline` | Can't reach Convex. |
| `updateRequired` | The app's schema is below the server's `minVersion`. |
| `clockWrong` | This phone's clock is more than 5 minutes ahead of the server's (9.4). |
| `error` | Reconcile failed 3 times, or Convex refused with `badRequest`. Shown quietly, retried on the next trigger. |

`notice` is `null`, `'cloudDeleted'` or `'keyChanged'`. It tells the UI to explain, once, why sync stopped (11.6). The UI clears it with `dismissSyncNotice()`.

Local reads and writes work in every state.

### 11.2 Triggers

Sync runs:

- push, 2 seconds after the last write that added to `_pending`
- pull, continuously through the live subscription while the app is in the foreground and unlocked
- reconcile, on launch, when the app returns to the foreground, and after each successful push

Nothing runs in the background (section 18). When `AppState` changes to `background`, sync skips the 2-second timer and pushes whatever is pending at once. It then finishes the requests in flight and stops, and the subscription closes. Without the immediate push, an edit made just before leaving the app would wait for the next launch to reach other devices. If the OS suspends the app before the push completes, the entries stay pending and go out on the next launch.

### 11.3 Push

1. A write that adds to `_pending` starts a 2-second timer. Each further write restarts it.
2. When the timer fires, sync reads the pending entries. For each pending row it sends the whole row: every cell with its clock, encrypted as in 12.2, including `_extra` cells. A row whose pending entry is `*` is sent as a tombstone. Pending entries whose clock no longer matches the local row are dropped first.

   Sending only the changed columns would be smaller, but it can create a row on the server that lacks required columns. That happens when the server never received the full row, for example because the reconcile after turning sync on failed. Other devices would then pull a row they can't read. The convergence test found this. Merging is per column, so the unchanged cells cost bandwidth but change nothing.
3. It sends batches of up to 100 rows and 4 MiB of ciphertext to `push`, whichever limit comes first.
4. When a batch is accepted, sync removes a pending entry only if its clock still matches what was sent. A column edited again while the batch was in flight stays pending.
5. It folds `serverTime` into the clock (9.3), and merges each row in `newer` into the local store, as a pulled row is merged (11.4).
6. On a network error, the pending entries stay, and sync retries with backoff: 2 s, 4 s, 8 s, up to 60 s.
7. On a refusal, it follows the table in 8.2.

### 11.4 Pull

- While the app is in the foreground and unlocked, sync keeps one live subscription to `changes(cursor)`.
- For each page, sync works in chunks of 50 rows:
  1. Decrypt the chunk's cells and check each value's associated data (12.2), outside any transaction.
  2. In one write transaction, merge each row with the local row using `mergeRow`, and update `_clocks`, `_version`, `_extra`, the content columns and the checksum. Remove pending entries whose clock is now older than the stored clock for that column, since pushing them would change nothing.
  3. Yield to the UI before the next chunk.
- The cursor moves to `nextCursor` in the same transaction as the page's last chunk. If the app stops halfway through a page, the next run applies the earlier chunks again, which changes nothing, because merging is idempotent.
- Change events for the page are emitted once, after the last chunk (7.6).
- Pulled rows are never added to `_pending`.
- The device's own pushes come back through the subscription too. Merging them again changes nothing.

### 11.5 Reconcile

Reconcile compares checksums and repairs the rows that differ. It is `ReconcileDB(Convex, Local)` from the diagram. Uploading a device's data when sync turns on is done by push (11.7), and reconcile is the safety net that catches anything push missed.

The checksum has one blind spot. It hashes each row's `version`, which is the row's newest clock only. Two copies of a row can have the same newest cell but differ in an older column, and their checksums match. Whole-row pushes (11.3), `newer` in push responses (8.3) and marking every row pending when sync turns on (11.7) keep that from happening in normal operation. Open question 10 proposes closing the blind spot in the checksum itself.

Preconditions, checked before step 1 and again before each later round:

- No push is in flight, and `_pending` is empty. If it isn't empty, push first.
- Sync has `checksum`'s `seq` from the server, and the local cursor equals it. If the cursor is behind, wait for the pull to reach it, up to 30 seconds, then fetch the server checksum again. If the cursor still lags after that, stop and try at the next trigger.

These preconditions are decision B5. Comparing checksums taken at different points would report differences that are only lag.

Steps:

1. Compare `getChecksum(local)` with the server's `checksum`. If every table matches, stop. State `idle`.
2. For each table that differs, compare the 16 bucket hashes.
3. For each bucket that differs, fetch `bucketRows` and compare them with the local `(id, version, deleted)` list.
   - A row only on the device is pushed as a full row: every cell with its clock, including `_extra` cells.
   - A row only on the server is fetched with `rows` and merged locally.
   - A row on both sides with a different `version` or `deleted` is fetched with `rows`, merged locally, and the merged full row is pushed. With per-column merging, neither side's row is "newer" as a whole. Each may hold some newer columns. Doing both is safe because merging is idempotent.
4. Check the preconditions and compare again. If the checksums still differ after 3 rounds, log the table and bucket, set state `error`, and wait for the next trigger.

### 11.6 Epochs

The device keeps the account's `epoch` in `_meta`. Every sync call sends it.

On `epochChanged` or `noVault`, the device:

1. Stops syncing and closes the subscription.
2. Deletes `ayyurdb.data.key` and clears `cursor` and `_pending`. Local data stays.
3. Calls `account.status`.
   - If there is no vault and `lastWipe` is `'delete'`, the cloud copy was deleted from another device. State `off`, notice `'cloudDeleted'`. The device does not upload anything until the user turns sync on again.
   - If there is a vault, the data key was reset from another device. State `locked`, notice `'keyChanged'`. After the user unlocks with the new passphrase, the normal sign-in flow runs, and reconcile uploads this device's data into the new key.
   - If a wipe is in progress, wait and call `account.status` again.

This is decision B3. Without it, phone B would upload everything again after phone A deleted the cloud copy.

### 11.7 Account flows

All flows use Clerk for identity. Convex authenticates with the Clerk JWT.

**Turning sync on for a new account**, when `account.status` shows no vault:

1. The user sets a passphrase.
2. Sync generates the data key, a recovery code and a fresh id key, and shows the recovery code once.
3. It re-keys local keyed rows with the new id key (6.4).
4. It wraps the data key twice, encrypts the id key, and calls `vault.create`. If that fails with `vaultExists`, another device created the vault first. Sync discards its keys and switches to the next flow.
5. It stores the data key in SecureStore and the returned `epoch` in `_meta`.
6. It marks every local row pending, then pushes, which uploads everything. Then it runs reconcile.

**Signing in to an account that already has a vault:**

1. The state is `locked` until the user enters the passphrase or the recovery code.
2. Sync unwraps the data key, decrypts the id key, and stores both in SecureStore.
3. It re-keys local keyed rows with the account's id key (6.4).
4. It stores the vault's `epoch`, and marks every local row pending.
5. It pulls from cursor 0, pushes, then reconciles.

Local rows merge with the account's by the normal rule. Singleton rows merge column by column. Nothing on the device is discarded.

Marking every row pending is required, not an optimisation. A row edited while signed out can, after merging with the account's copy, have the same version as the server's copy but hold newer cells in older columns. Reconcile's checksum can't see that (11.5), so only a push uploads it. The convergence test found this. Unlocking after `'keyChanged'` runs this same flow.

**Signing out:**

- Sync stops.
- The data key, the Clerk session, the cursor, the epoch and `_pending` are cleared.
- The id key stays. Local keyed rows were derived with it, and new upserts must find them.
- Local data stays, and the app carries on local-only.

**Turning sync off:** the same as signing out, plus an offer: "Delete my cloud copy". Accepting calls `wipe('delete')`.

**Changing the passphrase:** a device that holds the data key rewraps it with the new passphrase and calls `vault.update`. It doesn't need the old passphrase. The data is untouched and the epoch stays.

**Unlocking with the recovery code:** the user must then set a new passphrase, and a new recovery code replaces the old one, through `vault.update`. The epoch stays.

**Starting over when every key is lost:** a signed-in user who is `locked` and has neither the passphrase nor the recovery code can choose "Start over with an empty cloud copy". This calls `wipe('reset')`, then runs "Turning sync on for a new account". The old cloud data is gone for good. Other devices see `'keyChanged'` and upload their local data once unlocked with the new passphrase.

**Deleting the account:**

- Clerk sends `user.deleted` to `clerkWebhook`, which wipes the user's Convex data and their `account` row.
- Each device's Clerk session stops working, and the device runs the sign-out flow.
- Whether local data is also removed is a UI question for the Product thread.

## 12. Encryption and keys

### 12.1 Keys

| Key | Where it lives | Protects |
|---|---|---|
| Local database key | SecureStore, this device only | The SQLite file, through SQLCipher |
| Id key | SecureStore on each device; encrypted with the data key in `vault` | Row ids of keyed tables, from guessing |
| Data key (DK) | SecureStore on each unlocked device; wrapped copies in `vault` | Every cloud value and the id key |
| Passphrase key | Never stored. Derived with Argon2id from the passphrase and a random 16-byte salt | Wrapped DK copy 1 |
| Recovery key | Never stored. Derived with HKDF-SHA-256 from a 128-bit recovery code | Wrapped DK copy 2 |

- **Argon2id parameters.** Set so one derivation takes about 1 second on the Itel S23. The parameters are stored in the vault so they can be raised later.
- **Recovery code.** 128 random bits, written as 26 Crockford base32 characters. The UI decides how to group them for reading. Parsing ignores spaces, dashes and case, and reads `I` and `L` as `1` and `O` as `0`.
- **Lost keys.** If every device is lost and both the passphrase and the recovery code are forgotten, nobody can read the cloud copy, including Ayyur. The UI MUST say this plainly when sync is turned on.

### 12.2 Values

- **Cipher.** Each cell value is serialised to JSON and encrypted with XChaCha20-Poly1305, using the data key and a random 24-byte nonce.
- **Associated data.** `"ayyur.cell.v1" ‖ 0x00 ‖ userId ‖ 0x00 ‖ table ‖ 0x00 ‖ rowId ‖ 0x00 ‖ column ‖ 0x00 ‖ hlc`. Because of this, the server can't move a value to another row, column or user, or pair it with a different clock, without decryption failing.
- **Stored bytes.** `0x01 (format version) ‖ nonce ‖ ciphertext and tag`.
- **Failures.** If a value fails to decrypt, sync rejects that row, logs the table, row and column, and treats the row as differing, so reconcile repairs it.

### 12.3 The vault

- Each wrapped DK copy is the DK encrypted with XChaCha20-Poly1305 under the passphrase key or the recovery key, with associated data `"ayyur.vault.v1" ‖ 0x00 ‖ userId ‖ 0x00 ‖ "passphrase"` or `"recovery"`.
- The id key is encrypted with the DK, with associated data `"ayyur.idkey.v1" ‖ 0x00 ‖ userId`.
- `keyVersion` rises on every `vault.update`. An update with an old `keyVersion` fails with `staleVault`, so two devices changing the passphrase at once can't overwrite each other silently.

### 12.4 Library

- `react-native-libsodium` is the planned library. It has an Expo config plugin and exposes `crypto_aead_xchacha20poly1305_ietf_*`.
- Its docs don't confirm that `crypto_pwhash` (Argon2id) works on native iOS and Android. M0 checks this on the Itel S23 before the library is chosen.
- If it doesn't work, Argon2id comes from a separate native module, and libsodium stays for the encryption itself.
- HMAC, HKDF and SHA-256 come from `@noble/hashes`, so they run the same on the phone and in Convex.

### 12.5 What the server can and can't see

Per PRODUCT.md principle 5, copy about sync must not claim more than this.

**The server cannot see any stored value.** That covers names, notes, prayer entries, habit titles, dates inside rows and settings.

**The server can see:**

- the Clerk identity
- which tables a user has rows in, and how many
- row ids, which are random or keyed hashes that it can't reverse
- which rows belong to keyed tables, from the `k` prefix
- which columns changed and when, from the clocks, `seq` and the times of requests
- whether a row is deleted
- the device ids
- the length of each encrypted value
- the app's schema version
- IP addresses and request times

From this the server could, for example, see that a user updates the prayer log five times a day. It could not see what was logged.

**Copy should say:** "Your data is encrypted on your phone before it's uploaded. Our server stores it but can't read it."

**Copy must not say:** "zero-knowledge", or that nobody can tell when you use the app.

The AI companion is separate. Text sent to an AI provider is not covered by this encryption and needs its own disclosure.

The server could also hold back rows or replay old ones. Encryption stops it from forging or changing values, but not from withholding them. Detecting withheld rows is out of scope for v1.

## 13. Invariants

Tests, reviews and code comments refer to these by number.

1. App code never imports Drizzle, `expo-sqlite`, SecureStore or libsodium for AyyurDB data. It uses `@/db` and `@/db/react` only.
2. Every write to a synced table goes through the write queue, as one synchronous transaction that ticks the clock, updates `_clocks`, `_version` and the checksum, and records pending columns when sync is on.
3. A column's clock changes only when its value changes.
4. `_version` equals the largest clock in `_clocks`, or the delete clock for a tombstone.
5. A tombstone has no content, empty `_clocks` and empty `_extra`. Nothing ever turns it back into a live row.
6. Keyed tables and singletons have no `remove`.
7. A keyed row's id equals `ids.keyedId(currentIdKey, table, keyColumns)`, at all times outside a re-keying transaction.
8. Every `ref` targets a random-id table or a singleton.
9. Each bucket total equals the sum of the hashes of the rows in that bucket mod 2^128, on the device and in Convex.
10. `mergeRow` is deterministic, commutative, associative and idempotent.
11. After full sync with no further writes, every device and Convex hold the same `(table, id, version, deleted)` set and the same checksums.
12. The server never decrypts and never holds a key that could decrypt.
13. Every value in Convex is bound by its associated data to its user, table, row, column and clock.
14. Convex never stores a clock more than 5 minutes ahead of its own time at the moment of the push.
15. No device syncs on an epoch other than the account's current one.
16. `seq` only rises, including across wipes.
17. Reconcile compares checksums only when `_pending` is empty and the local cursor equals the server checksum's `seq`.
18. Reads never return tombstones to app code.
19. The local database file is never deleted while its key exists.
20. Every local write gets a clock later than the `version` of the row it changes (9.3).
21. Every live row in Convex holds every cell the last device to push it held, because pushes send whole rows (11.3).
22. After a push, the device holds the server's merged version of every row it pushed, either because nothing changed or from `newer`.

## 14. Testing

- **Unit tests in Node.** `clock`, `merge`, `ids`, `checksum`, the `schema` generators and the schema diff run in Node with no React Native.
- **Convergence test.** This is the main test for decision 5. It lives in `src/db/test/convergence.test.ts`, with the simulated phones and server in `src/db/test/sim/`. CI runs 150 seeds of 300 steps; `SIM_SEEDS` and `SIM_STEPS` widen it locally. Simulated devices and a simulated server apply random interleavings of inserts, edits, upserts on the same keys, deletes, offline periods and clock skew. After full sync, every device must hold identical rows and identical checksums (invariant 11). It runs with a fixed seed in CI and with random seeds locally.
- **Scenario tests**, one per failure that revision 2 fixed:
  - two devices upsert the same key offline and end with one row
  - a keyed row is cleared and set again, and ends set
  - a device signs in, re-keys, and its keyed rows merge with the account's
  - phone A wipes with `'delete'`, and phone B stops and uploads nothing
  - phone A resets the key, and phone B goes `locked` and uploads after unlocking
  - a device with a clock a year ahead gets `clockAhead`, then repairs once its clock is fixed
  - reconcile during a lagging pull waits instead of reporting a difference
  - a pulled page interrupted halfway and applied again gives the same result
  - after a wipe, the cursor reaches the account's `seq`
  - a phone whose clock runs 10 minutes slow still writes after the newer cells it pulled
  - a repaired clock never goes behind cells the phone already merged
  - edits made while signed out reach the server on sign-in, even when the merged versions match
- **Store tests.** These run the same Drizzle tables against Node's SQLite, through the storage adapter the SDK uses internally.
- **Convex functions.** Tested with `convex-test`, covering auth, every refusal in 8.2, merge and checksum upkeep inside `push`, `changes` paging, `bucketRows` reading only its bucket, and wipe batches.
- **Schema rules.** Tests that the schema refuses a table or column name outside the pattern in 4.2, a `ref` to a keyed table, a nullable key column, a `json` key column, and kinds combined in one table.
- **On device, before each milestone ships**, all on the Itel S23: opening the database with SQLCipher, migrations, write transaction times, the Argon2id timing, and the chunked first pull of 5,000 rows without visible stutter.

## 15. Build order

| Milestone | Delivers | Needs |
|---|---|---|
| M0 Device check | An EAS development build installed on the Itel S23. Checks: SQLCipher opens with `PRAGMA key`; `react-native-libsodium` runs `crypto_pwhash` and its timing; how Drizzle's `expo` driver runs transactions and whether it offers a synchronous one; a 50-row write transaction's time; the SecureStore option name for "this device only". Results go into this spec. | `expo-dev-client`, an EAS project |
| M1a Pure modules (built) | `clock`, `merge`, `ids`, `checksum`, the `schema` builders and diff, the convergence test. Runs in Node only, so it can start before M0 and doesn't affect Expo Go. | `@noble/hashes` |
| M1 Local | `store`, the write queue, `react`, one example table of each kind. The app reads and writes real data, local-only. `android.allowBackup: false`. | M0, expo-sqlite with SQLCipher, drizzle-orm, drizzle-kit, expo-secure-store, expo-crypto |
| M2 Keys | `crypto`: local key, id key, data key, wrapping, recovery code, value encryption. | `react-native-libsodium`, after M0 |
| M3 Sync | The Convex `rows` table and functions, Clerk sign-in, push, pull, the live subscription, epochs, clock bounds. | convex, @clerk/clerk-expo, a Convex project, a Clerk application |
| M4 Repair and lifecycle | Reconcile, account flows, `wipe`, the Clerk webhook, the schema evolution guard. | none |

The tables themselves come from the data-model spec. M1 can start with example tables and swap them out.

Hand-offs to the Frontend/UI thread:

- `AyyurDBProvider` goes in `src/app/_layout.tsx`, and the splash screen waits for it.
- `src/onboarding/store.ts` moves from AsyncStorage to the profile singleton behind the same interface.
- Screens are needed for setting the passphrase, showing the recovery code, the `locked` state, "Delete my cloud copy", "Start over with an empty cloud copy", and the `clockWrong` state.
- Notices are needed for `'cloudDeleted'` and `'keyChanged'`.
- From M1, the app runs in a development build. Expo Go no longer opens it.

## 16. Founder decisions that changed

Both changes were agreed with the founder on 2026-11-03, before any code existed. They are recorded here so no one brings back the old design without knowing why it went.

### 16.1 One Convex table instead of one per SQLite table

Revision 2 mirrored every SQLite table in Convex, with the same columns, each holding ciphertext. Revision 3 uses the single `rows` table in 8.1.

Why the mirror went:

- Separate tables help a server that queries or indexes content. Convex can't read the content, so it only ever compares clocks and stores bytes, and that work is the same for every table.
- Pulling got more expensive with every table. To return the 200 lowest `seq` values across N tables, `changes` had to read up to 200 rows from each. That is 3,000 document reads per page with 15 tables, and the live subscription runs the query again after every push from any of the user's devices. With one table it reads 200 rows from one index.
- Every new table or column needed a Convex deploy before the app shipped. If that order slipped, pushes failed for users until the deploy happened. With one table, Convex doesn't know the schema, and additive changes ship with the app alone.
- It needed a generator from the schema to Convex tables, which no longer exists.

What it cost, accepted:

- The Convex dashboard shows one table. Finding a table's rows means filtering on `table`. Every value is ciphertext, so the dashboard showed little either way.
- Convex no longer checks column names against a schema. It checks the name pattern, the row id forms, the row shape and the sizes (8.2). A buggy app could store a cell under a wrong column name. That only affects the user's own data, and devices keep unknown cells in `_extra` without using them.
- Privacy is unchanged. The server saw table names before, as Convex table names, and sees them now as the `table` field.

Do not split `rows` back into per-table Convex tables, and do not make Convex import the schema.

### 16.2 A folder inside the app instead of a workspace package

Revision 2 put the SDK in `packages/ayyurdb` as a workspace package, `@ayyur/db`. Revision 3 puts it in `src/db/`, imported as `@/db`.

Why:

- The repo is one app, with no workspaces. A package needed npm workspaces with the app as the root package, Metro configuration to resolve it, its own `tsconfig` and test configuration, and an exports map, all before there was any code to share.
- The package's one real benefit was a hard boundary around internal files. The lint rules in section 3 give nearly the same boundary.
- Convex can import the plain modules by relative path.

Moving to a package later costs about an hour: move the folder, add the workspace, and replace the `@/db` imports. Do it if a second app or a shared server ever needs the SDK.

## 17. Open questions

1. **Convex limits per user.** Maximum rows, bytes and push rate, to stop one account filling the deployment.
2. **When the passphrase is asked.** At the moment sync is turned on, or later. This is for Product and Frontend.
3. **Argon2id library.** Answered by M0 (12.4).
4. **Switching accounts.** Signing out of account A and into account B merges this phone's data, including A's, into B. B's vault then holds A's random row ids too, so the server could link the two accounts. Is that wanted, or should switching accounts ask first?
5. **Value length.** Pad text values to fixed size steps so a note's length leaks less? This costs storage.
6. **Rotating the data key.** This would mean encrypting every value again. Out of scope for v1.
7. **Deleting local data with the account.** Product decides (11.7).
8. **Where logs go.** The spec says "logs it" for refusals, decryption failures, bad clocks and reconcile errors. Today that can only mean the device console, which nobody sees in production. A crash and error service would help, but anything sent off the phone must leave out row ids, table names and values, and PRODUCT.md principle 5 requires telling the user. Decide the service and what it may receive before M3.
9. **Exporting data.** Should users be able to export everything as a file, for their own records or to move to another app? The SDK can read every table, so the cost is mostly UI. If yes, the format is for Product.
10. **Checksum blind spot.** This would change founder decision 8. The row hash covers `(table, id, version, deleted)`, and `version` is only the newest clock. Two copies that share their newest cell but differ in an older column hash the same (11.5). Revision 4 prevents that in normal operation, but reconcile exists to catch what normal operation gets wrong, and it can't catch this. The fix is to hash every cell clock instead of `version`: `SHA-256(table ‖ 0x00 ‖ id ‖ 0x00 ‖ deleted ‖ 0x00 ‖ sorted "column=hlc" pairs)`. Convex can read cell clocks, so it can compute the same hash. `bucketRows` would return that hash instead of `version`. The cost is hashing a few dozen bytes more per write.

## 18. Out of scope

- web
- sharing data between users, including the family plan
- background sync
- server-side search or analytics on content
- the AI companion's data path
- detecting a server that withholds rows
- rotating the data key

## 19. Changelog

- **2026-10-16, revision 1.** First agreed design.
- **2026-11-03, revision 2.** Added section 0 on how to use the spec, the glossary, table kinds with keyed ids and the id key (B1), no deletes on keyed tables and singletons (B2), account epochs (B3), server clock bounds and `clockWrong` (B4), reconcile preconditions and two-way repair (B5), the synchronous write queue and batched change events (B6), `android.allowBackup: false` (B7), section 5 on rules for table design, the `ref` column type, value size limits, the refusal codes, `wipe` and `vault` details, the invariants list, the scenario tests, M0 and M1a, and two proposals for the founder. Resolved the conflict in revision 1 between applying a pulled page in one transaction and yielding between chunks: each chunk is now its own transaction, and the cursor moves with the last one.
- **2026-11-03, revision 3.** The founder accepted both proposals. Convex stores all synced rows in one `rows` table and no longer knows the schema (decision 3, 16.1). The SDK lives in `src/db/` and is imported as `@/db` (decision 1, 16.2). The `serverBehind` refusal and the fixed Convex-first release order are gone. `minVersion` is raised by hand only after the app update is live. Added the name pattern for tables and columns, the `bucket` field and `by_user_bucket` index so `bucketRows` doesn't scan every row, and the import lint rules.
- **2026-11-03, revision 3, later the same day.** Checked the design against Convex's published limits and added section 8.6. Added a 256 KiB cap per row, a 4 MiB cap per `push` batch and per `changes` or `rows` response, paging for `bucketRows`, and 1,000-document wipe batches. Sync now pushes at once when the app goes to the background. Added open questions 8 on logging and 9 on data export.
- **2026-11-03, revision 4.** Built M1a. The convergence test found five bugs in the design, all fixed here:
  - `changes` jumps the cursor to `account.seq` at the end, so reconcile isn't stuck waiting after a wipe (8.3).
  - Pushes send whole rows, so the server never holds a row that lacks required columns (11.3).
  - `push` returns `newer`, the merged rows that differ from what was sent, so a device learns when its cell lost (8.3, 11.3).
  - Devices fold every pulled clock, and the clock repair never goes below a clock the device has seen. Both keep a local write from getting an older clock than the cell it overwrites (9.3, 9.4). The repair also re-stamps cells written while sync was off.
  - Turning sync on, signing in and unlocking mark every local row pending, because reconcile can't see some differences (11.5, 11.7).

  Also: changing nullability is breaking in either direction (4.5), `push` refuses a live row whose version isn't its newest cell clock (8.2), invariants 20 to 22, more scenario tests, and open question 10 on the checksum's blind spot.
