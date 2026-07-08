# Design: Night-Phase Shop & Inventory Endpoints

## Problem

The frontend needs a night-phase economy loop on top of the existing day/round flow:

1. A way to actually *end* a day — there is currently no persisted "night" concept at all;
   day/night is purely frontend routing (`MainView` vs `NightView`).
2. A shop catalog and a purchase action, usable only at night.
3. An inventory equip/unequip action — choosing which owned items are visible during the
   day — usable only at night, gated by a capacity that grows over days.
4. Purchasing and equipping must be decoupled: buying an item just adds it to `OwnedItem`;
   it stays unequipped until the player explicitly equips it.

## Data model

### New field: `OwnedItem.isEquipped`

`OwnedItem` currently has no notion of "equipped" vs merely "owned" (`prisma/schema/inventory.prisma`).
Add:

```prisma
model OwnedItem {
  id             String      @id @default(uuid(7)) @db.Uuid
  gameSessionId  String      @db.Uuid
  gameSession    GameSession @relation(fields: [gameSessionId], references: [id])
  shopItemId     String      @db.Uuid
  shopItem       ShopItem    @relation(fields: [shopItemId], references: [id])
  purchasePrice  Int
  purchasedOnDay Int
  purchasedAt    DateTime    @default(now())
  isEquipped     Boolean     @default(false)

  @@unique([gameSessionId, shopItemId])
  @@index([shopItemId])
}
```

Migration: `ALTER TABLE "OwnedItem" ADD COLUMN "isEquipped" BOOLEAN NOT NULL DEFAULT false;`
Existing rows default to `false` — no backfill needed, since equip state didn't exist before.

### Cross-cutting change: `POST /api/v1/round`'s `ownedItems`

`round.ts`'s `OwnedItemRecord`/`toOwnedItemResponse` must start surfacing `isEquipped`, since
the entire point of this feature is "which owned items are visible during the day" —
`MainView` needs it to filter to the equipped subset. `docs/api/round.md`'s example response
and its tests need updating alongside this. This is the one piece of "action at a distance"
in this design and is called out explicitly so it isn't missed during implementation.

### `GameDayLogRecord.endingMoney`

`round.ts`'s narrow `GameDayLogRecord` currently omits `endingMoney`. `POST /api/v1/day/end`
needs to stamp and return it, so the type gains `endingMoney: number | null`. Purely additive;
`game.ts` re-exports the type, so `pauseGame`/`resetGame`/`resetDay` are unaffected beyond
their test fixtures needing the new field.

## Shared helper: night-phase resolution

`GET /api/v1/shop`, `POST /api/v1/shop/purchase`, `GET /api/v1/inventory`, and
`PUT /api/v1/inventory` all need the same read: is it night, and what's the capacity/day
number. This doesn't belong in `round.ts` (owns the day-open/resume gameplay loop) or
`game.ts` (owns state-mutating session actions) — it's a new, narrowly-scoped, read-only
concern shared identically by two new services. New file:

`src/backend/src/services/dayPhase.ts`:

- `computeInventoryCapacity(dayNumber): number` — `Math.ceil(dayNumber / 2)`. Produces 1 slot
  on day 1, a 2nd slot on day 3, a 3rd on day 5, and so on — one additional slot every two
  days.
- `resolveDayPhase(prisma, gameSessionId): Promise<{ isNightPhase, upcomingDayNumber, inventoryCapacity }>`
  — finds the latest `GameDayLog` for the session, ordered by `dayNumber` descending.
  `isNightPhase = latest !== null && latest.endedAt !== null`. `upcomingDayNumber =
  (latest?.dayNumber ?? 0) + 1` — the day about to be played next (or `1` if no day log
  exists yet, i.e. before day 1 has ever started). `inventoryCapacity =
  computeInventoryCapacity(upcomingDayNumber)`.
- `NotNightPhaseError`.

No `GameDayLog` yet, and an open (`endedAt: null`) `GameDayLog`, both resolve to
`isNightPhase: false` — there's nothing to shop for before day 1 has ever ended, and normal
daytime play is obviously not night.

`shop.ts`/`inventory.ts` (below) each locally re-derive "find the latest `ACTIVE`
`GameSession`" rather than importing `game.ts`'s private `requireActiveGameSession` — this
mirrors the existing split between `RoundPrismaClient` and `GamePrismaClient`, keeping each
service's narrow Prisma-client interface free of fields it never calls
(`gameDayLog.update`, `diagnosisAttempt.deleteMany`). Only the `NoActiveGameError` class is
shared, not the lookup function.

## Endpoints

### `POST /api/v1/day/end`

Ends the caller's currently open day, entering the night phase. Does **not** create the next
day's `GameDayLog` — that still happens lazily on the next `POST /api/v1/round` call, per
existing `resolveOpenGameDayLog` behavior (unchanged).

Orchestration (`endDay(prisma, userId)` in `src/backend/src/services/game.ts`, alongside
`pauseGame`/`resetGame`/`resetDay`):

1. Find the latest `GameSession` for `userId`. If none exists, or `status !== 'ACTIVE'`, throw
   `NoActiveGameError`.
2. Find the session's open `GameDayLog` (`endedAt: null`). If none, throw `NoOpenDayError`.
3. Update the day log: `endedAt = now()`, `endingMoney = session.money`.
4. Return `{ gameSession, dayLog }` — the session's `status` is untouched (stays `ACTIVE`;
   there is deliberately no `GameSessionStatus` value for "night" — night-ness is derived
   purely from the day log, per the shared helper above).

| Condition | Status | Body |
|---|---|---|
| No/invalid session cookie | 401 | `{ "error": "unauthenticated" }` |
| No `GameSession`, or latest one is not `ACTIVE` | 409 | `{ "error": "no_active_game" }` |
| Session is `ACTIVE` but has no open `GameDayLog` (already ended, or never started) | 409 | `{ "error": "no_open_day" }` |
| Success | 200 | `{ "gameSession": { ... }, "dayLog": { "id", "dayNumber", "startingMoney", "endingMoney", "endedAt" } }` |

Calling this twice in a row is safe: the second call finds no open day log and returns
`409 no_open_day`, which doubles as an "you're already at night" signal.

### `GET /api/v1/shop`

Returns the purchasable catalog for the caller. Filtered to `isActive: true` items whose
`unlockDay` is `null` or `<= upcomingDayNumber` — locked/inactive items are omitted entirely,
not returned with a `locked: true` flag.

Not night-restricted: it's a pure read with no side effects, so browsing the shop mid-day to
plan a purchase is harmless. The response carries `isNightPhase` so the frontend can
disable/hide the "buy" affordance client-side; `POST /api/v1/shop/purchase` is the
authoritative night-phase gate. Lenient about session existence — a user with no
`GameSession` yet gets a 200 with the day-1 catalog and no owned items, mirroring
`POST /api/v1/game/reset`'s `{ "gameSession": null }` pattern for "nothing yet" states.

Orchestration (`getShopCatalog(prisma, userId)` in `src/backend/src/services/shop.ts`):

1. Find the latest `GameSession` for `userId`. May be `null`.
2. If no session: `dayPhase = { isNightPhase: false, upcomingDayNumber: 1, inventoryCapacity: 1 }`,
   `money = 0`, no owned items.
3. Else: `dayPhase = resolveDayPhase(prisma, session.id)`; `money = session.money`; fetch the
   session's `OwnedItem`s to build a set of owned `shopItemId`s.
4. Fetch `ShopItem`s where `isActive: true` and (`unlockDay: null` or
   `unlockDay <= dayPhase.upcomingDayNumber`), ordered by `name`.
5. Map each to `{ id, sku, name, description, itemType, price, unlockDay, iconImageUrl, owned }`.
6. Return `{ isNightPhase, upcomingDayNumber, inventoryCapacity, money, items }`.

| Condition | Status | Body |
|---|---|---|
| No/invalid session cookie | 401 | `{ "error": "unauthenticated" }` |
| No `GameSession` yet | 200 | day-1 catalog, `money: 0`, no owned items |
| Success | 200 | `{ "isNightPhase", "upcomingDayNumber", "inventoryCapacity", "money", "items": [{ "id", "sku", "name", "description", "itemType", "price", "unlockDay", "iconImageUrl", "owned" }] }` |

### `POST /api/v1/shop/purchase`

Buys a `ShopItem` for the caller's session. Does **not** equip it (`isEquipped: false` on
creation) — decoupled from `PUT /api/v1/inventory` by design, so the player can buy now and
decide what to equip later.

Request body: `{ "shopItemId": "<ShopItem.id>" }`, validated via Fastify JSON schema
(`required: ['shopItemId']`, `type: 'string', minLength: 1` — mirrors `auth.ts`'s `idToken`
validation).

Orchestration (`purchaseItem(prisma, userId, shopItemId)` in
`src/backend/src/services/shop.ts`), in this order (also the required unit-test order, since
a request can fail more than one check at once):

1. Find the latest `GameSession` for `userId`. If none, or `status !== 'ACTIVE'`, throw
   `NoActiveGameError`.
2. `dayPhase = resolveDayPhase(prisma, session.id)`. If `!dayPhase.isNightPhase`, throw
   `NotNightPhaseError`.
3. Fetch the `ShopItem` by id. If not found, or `isActive === false`, throw
   `ItemNotFoundError`.
4. If `shopItem.unlockDay !== null && shopItem.unlockDay > dayPhase.upcomingDayNumber`, throw
   `ItemLockedError`.
5. Check whether the session already owns this `ShopItem` (unique
   `[gameSessionId, shopItemId]`). If so, throw `ItemAlreadyOwnedError`.
6. If `session.money < shopItem.price`, throw `InsufficientFundsError`.
7. Debit money: `gameSession.money -= shopItem.price`. Create the `OwnedItem`:
   `purchasePrice: shopItem.price`, `purchasedOnDay: dayPhase.upcomingDayNumber - 1` (the day
   that just ended and whose earnings funded the purchase — always `>= 1`, since
   `isNightPhase` guarantees `upcomingDayNumber >= 2`), `isEquipped: false`.
8. Return `{ gameSession, ownedItem }`.

| Condition | Status | Body |
|---|---|---|
| No/invalid session cookie | 401 | `{ "error": "unauthenticated" }` |
| Malformed body (missing/empty `shopItemId`) | 400 | Fastify's default schema-validation body |
| No `GameSession`, or latest one is not `ACTIVE` | 409 | `{ "error": "no_active_game" }` |
| Latest `GameDayLog` has no `endedAt` (day phase), or none exists yet | 409 | `{ "error": "not_night_phase" }` |
| `shopItemId` doesn't match any `isActive` `ShopItem` | 404 | `{ "error": "item_not_found" }` |
| Item's `unlockDay` is after `upcomingDayNumber` | 409 | `{ "error": "item_locked" }` |
| Session already owns this `ShopItem` | 409 | `{ "error": "item_already_owned" }` |
| `session.money < shopItem.price` | 409 | `{ "error": "insufficient_funds" }` |
| Success | 200 | `{ "gameSession": { ... }, "ownedItem": { "id", "shopItem": {...}, "purchasePrice", "purchasedOnDay", "purchasedAt", "isEquipped": false } }` |

### `GET /api/v1/inventory`

Returns the caller's owned items, current equip state, and the capacity that governs
`PUT /api/v1/inventory`. Not night-restricted (a pure read — checking your loadout during the
day is harmless) and lenient for a nonexistent session, same as `GET /api/v1/shop`.

Orchestration (`getInventory(prisma, userId)` in `src/backend/src/services/inventory.ts`):

1. Find the latest `GameSession` for `userId`. If none: return
   `{ isNightPhase: false, upcomingDayNumber: 1, inventoryCapacity: 1, equippedItemIds: [], ownedItems: [] }`.
2. `dayPhase = resolveDayPhase(prisma, session.id)`.
3. Fetch all `OwnedItem`s for the session (`include: shopItem`), ordered by `purchasedAt`.
4. Map to `{ id, shopItem, purchasePrice, purchasedOnDay, purchasedAt, isEquipped }`; derive
   `equippedItemIds` from the items where `isEquipped === true`.
5. Return `{ isNightPhase, upcomingDayNumber, inventoryCapacity, equippedItemIds, ownedItems }`.

`equippedItemIds` is redundant with each item's `isEquipped` flag, but is included as a
convenience: it's exactly the shape `PUT /api/v1/inventory`'s request body expects, so the
frontend can round-trip `GET` → mutate locally → `PUT` without re-deriving it.

| Condition | Status | Body |
|---|---|---|
| No/invalid session cookie | 401 | `{ "error": "unauthenticated" }` |
| No `GameSession` yet | 200 | day-1 defaults, empty inventory |
| Success | 200 | `{ "isNightPhase", "upcomingDayNumber", "inventoryCapacity", "equippedItemIds", "ownedItems": [{ "id", "shopItem", "purchasePrice", "purchasedOnDay", "purchasedAt", "isEquipped" }] }` |

### `PUT /api/v1/inventory`

Replaces the full equipped set in one call. Night-only; capacity- and ownership-validated.

Request body: `{ "equippedItemIds": string[] }`, validated via Fastify JSON schema
(`type: 'array', items: { type: 'string', minLength: 1 }` — shape/type only; capacity and
ownership are domain checks, not schema checks).

Orchestration (`updateEquippedItems(prisma, userId, equippedItemIds)` in
`src/backend/src/services/inventory.ts`):

1. Find the latest `GameSession` for `userId`. If none, or `status !== 'ACTIVE'`, throw
   `NoActiveGameError`.
2. `dayPhase = resolveDayPhase(prisma, session.id)`. If `!dayPhase.isNightPhase`, throw
   `NotNightPhaseError`.
3. Compute the **distinct** id count via `new Set(equippedItemIds).size` — not raw
   `.length`, so duplicate ids in the request can't under-count against capacity. If it
   exceeds `dayPhase.inventoryCapacity`, throw `InventoryCapacityExceededError`.
4. Fetch all owned items for the session. If any id in `equippedItemIds` isn't one of them,
   throw `ItemNotOwnedError`.
5. For every owned item, set `isEquipped` to whether its id is in `equippedItemIds` — this
   equips every listed id and unequips every owned item not listed, including ones that were
   previously equipped. Implemented as per-row `update` calls (no `$transaction` — this
   codebase has none in use elsewhere; the non-atomicity across rows is an accepted
   trade-off, called out explicitly rather than silently).
6. Return the same shape as `GET /api/v1/inventory`.

| Condition | Status | Body |
|---|---|---|
| No/invalid session cookie | 401 | `{ "error": "unauthenticated" }` |
| Malformed body (not an array of strings) | 400 | Fastify's default schema-validation body |
| No `GameSession`, or latest one is not `ACTIVE` | 409 | `{ "error": "no_active_game" }` |
| Latest `GameDayLog` has no `endedAt` (day phase), or none exists yet | 409 | `{ "error": "not_night_phase" }` |
| Distinct id count in `equippedItemIds` exceeds `inventoryCapacity` | 409 | `{ "error": "inventory_capacity_exceeded" }` |
| Any id in `equippedItemIds` isn't an `OwnedItem.id` owned by this session | 409 | `{ "error": "item_not_owned" }` |
| Success | 200 | same shape as `GET /api/v1/inventory` |

## Error taxonomy

| Error class | Defined in | HTTP status | Body `error` |
|---|---|---|---|
| `NotNightPhaseError` | `services/dayPhase.ts` | 409 | `not_night_phase` |
| `ItemNotFoundError` | `services/shop.ts` | 404 | `item_not_found` |
| `ItemLockedError` | `services/shop.ts` | 409 | `item_locked` |
| `ItemAlreadyOwnedError` | `services/shop.ts` | 409 | `item_already_owned` |
| `InsufficientFundsError` | `services/shop.ts` | 409 | `insufficient_funds` |
| `InventoryCapacityExceededError` | `services/inventory.ts` | 409 | `inventory_capacity_exceeded` |
| `ItemNotOwnedError` | `services/inventory.ts` | 409 | `item_not_owned` |
| `NoActiveGameError` (reused) | `services/game.ts` | 409 | `no_active_game` |
| `NoOpenDayError` (reused, `day/end` only) | `services/game.ts` | 409 | `no_open_day` |

`ItemNotFoundError` is the only 404 introduced in this API surface — everywhere else uses
401/409. This is an intentional, justified deviation: a bad/nonexistent resource id is a
"not found," not a state conflict.

## Files

- `src/backend/prisma/schema/inventory.prisma` — add `OwnedItem.isEquipped Boolean @default(false)`.
- `src/backend/prisma/migrations/<timestamp>_add_owned_item_is_equipped/migration.sql` — new migration.
- `src/backend/src/services/dayPhase.ts` — new: `resolveDayPhase`, `computeInventoryCapacity`, `NotNightPhaseError`, `DayPhasePrismaClient`, `DayPhaseInfo`.
- `src/backend/src/services/shop.ts` — new: `getShopCatalog`, `purchaseItem`, `ItemNotFoundError`, `ItemLockedError`, `ItemAlreadyOwnedError`, `InsufficientFundsError`, `ShopPrismaClient`.
- `src/backend/src/services/inventory.ts` — new: `getInventory`, `updateEquippedItems`, `InventoryCapacityExceededError`, `ItemNotOwnedError`, `InventoryPrismaClient`.
- `src/backend/src/services/game.ts` — add `endDay`; extend `GamePrismaClient.gameDayLog.update`'s data type with `endingMoney?: number`.
- `src/backend/src/services/round.ts` — extend `GameDayLogRecord` with `endingMoney`; extend `OwnedItemRecord`/`toOwnedItemResponse`/`RoundPrismaClient` with `isEquipped`.
- `src/backend/src/routes/shop.ts` — new: `GET /api/v1/shop`, `POST /api/v1/shop/purchase`.
- `src/backend/src/routes/inventory.ts` — new: `GET /api/v1/inventory`, `PUT /api/v1/inventory`.
- `src/backend/src/routes/day.ts` — add `POST /api/v1/day/end`.
- `src/backend/src/app.ts` — register `shopRoutes`, `inventoryRoutes`.
- `src/backend/test/services/dayPhase.test.ts` — new, mocked-Prisma.
- `src/backend/test/services/shop.test.ts` — new, mocked-Prisma.
- `src/backend/test/services/inventory.test.ts` — new, mocked-Prisma.
- `src/backend/test/services/game.test.ts` — add `endDay` tests; update `makeGameDayLog` fixture with `endingMoney`.
- `src/backend/test/services/round.test.ts` — update fixtures/assertions for `isEquipped`.
- `src/backend/test/routes/shop.test.ts` — new, real-Postgres `app.inject()`.
- `src/backend/test/routes/inventory.test.ts` — new, real-Postgres `app.inject()`.
- `src/backend/test/routes/day.test.ts` — add `POST /api/v1/day/end` describe block.
- `src/backend/test/routes/round.test.ts` — update assertions for `isEquipped`.
- `docs/api/shop.md` — new API doc, mirroring `docs/api/round.md`'s format.
- `docs/api/inventory.md` — new API doc, same format.
- `docs/api/day.md` — add `POST /api/v1/day/end` section.
- `docs/api/round.md` — add `isEquipped` to the `ownedItems` example.

## Testing

TDD red-green-refactor per CLAUDE.md §8, mirroring the existing `round.ts`/`round.test.ts` and
`game.ts`/`game.test.ts` splits: mocked-Prisma unit tests for service logic, real-Postgres
`app.inject()` tests for route-level behavior (auth, status codes, error bodies).

- **`dayPhase.test.ts`**: no day log → `{ isNightPhase: false, upcomingDayNumber: 1, inventoryCapacity: 1 }`;
  open day log (`endedAt: null`, `dayNumber: 3`) → `{ isNightPhase: false, upcomingDayNumber: 4 }`;
  ended day log (`dayNumber: 3`) → `{ isNightPhase: true, upcomingDayNumber: 4, inventoryCapacity: 2 }`;
  `computeInventoryCapacity` table-tested for days 1–8 (`1,1,2,2,3,3,4,4`).
- **`shop.test.ts`**: `getShopCatalog` — no session → day-1 defaults; excludes inactive items;
  excludes items whose `unlockDay > upcomingDayNumber`; includes items with `unlockDay: null`;
  marks owned items `owned: true`. `purchaseItem` — throws each error in validation order
  (including a case with two simultaneous failures, asserting which one wins); on success,
  debits money, creates `OwnedItem` with `isEquipped: false` and correct `purchasedOnDay`.
- **`inventory.test.ts`**: `getInventory` — no session → defaults; correct `equippedItemIds`
  derivation. `updateEquippedItems` — throws each error; a duplicate-id case proving dedup
  (capacity 1, `["a","a"]` succeeds; `["a","b"]` at capacity 1 fails); on success, sets
  `isEquipped` correctly on both newly-equipped and newly-unequipped items.
- **`game.test.ts`** additions: `endDay` throws `NoActiveGameError`/`NoOpenDayError` per
  existing pattern; stamps `endedAt`/`endingMoney`; leaves `GameSession.status` untouched.
- **`round.test.ts`** additions: `ownedItems` responses pass through `isEquipped` unmodified.
- **`routes/shop.test.ts`** (integration): 401 with no cookie; 200 day-1 catalog for a new
  user; catalog excludes/includes seeded `unlockDay` items correctly; `POST /purchase` 409
  `not_night_phase` during day phase; end-to-end happy path with DB-state assertions;
  duplicate purchase returns `item_already_owned`; underfunded purchase returns
  `insufficient_funds`.
- **`routes/inventory.test.ts`** (integration): 401 with no cookie; `GET` 200 empty defaults;
  `PUT` 409 `not_night_phase`/`inventory_capacity_exceeded`/`item_not_owned`; happy path
  equipping and later dropping an item, with DB assertions both ways.
- **`routes/day.test.ts`** additions: `POST /api/v1/day/end` 401/409 per established pattern;
  success stamps DB fields and returns both `gameSession` and `dayLog`; calling it twice
  returns `409 no_open_day` on the second call.

Per CLAUDE.md §8 point 4, the new `OwnedItem.isEquipped` migration is exercised by both the
`shop.test.ts` purchase test (creates a row with `isEquipped: false`) and the
`inventory.test.ts` equip test (flips it).
