# Night-Phase Shop & Inventory Endpoints Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a persisted night-phase economy loop: ending a day, a shop catalog + purchase action, and an inventory equip/unequip action gated by a capacity that grows over days.

**Architecture:** Three new/extended backend services (`dayPhase.ts` shared read-only helper, `shop.ts`, `inventory.ts`) plus an `endDay` addition to the existing `game.ts`, each with a thin Fastify route file, following the exact `services/*.ts` + `routes/*.ts` + narrow `*PrismaClient` interface + mocked-Prisma unit test + real-Postgres route test split already used by `round.ts`/`game.ts`.

**Tech Stack:** Fastify + TypeScript (backend), Prisma + PostgreSQL, Jest + ts-jest, `app.inject()` for route tests.

## Global Constraints

- Backend is TypeScript only, strict mode, compiled with `tsc` (CLAUDE.md §1.6).
- No production logic without a failing test first — TDD red-green-refactor (CLAUDE.md §1.4, §8).
- `pnpm` only, run from repo root or via `pnpm --filter backend <script>` (CLAUDE.md §1.9).
- Every new Prisma model/migration needs a test exercising a route or service that uses it (CLAUDE.md §8.4).
- Commit messages: Conventional Commits (`feat(scope): summary`, `test(scope): ...`) (CLAUDE.md §10).
- Follow this repo's existing convention of small per-service duplication: each service (`round.ts`, `game.ts`) already defines its own private `toGameSessionResponse` mapper rather than sharing one — `shop.ts` and `inventory.ts` follow the same convention (their own private response-shaping helpers), not a new shared-export pattern.
- `shop.ts`/`inventory.ts` each locally re-derive "find the latest `GameSession`" rather than importing `game.ts`'s private lookup — only the `NoActiveGameError` class is imported/shared from `game.ts`.
- Backend tests: `pnpm --filter backend test` runs `prisma generate && prisma migrate deploy && jest --runInBand` against the real dev Postgres (via `src/backend/.env`'s `DATABASE_URL`) — this must be running locally (`pnpm docker:up` starts it) before running backend tests.

---

### Task 1: `OwnedItem.isEquipped` schema + migration

**Files:**
- Modify: `src/backend/prisma/schema/inventory.prisma`
- Create: `src/backend/prisma/migrations/<timestamp>_add_owned_item_is_equipped/migration.sql`

**Interfaces:**
- Produces: `OwnedItem.isEquipped: boolean` (DB column, default `false`) — every later task that touches `OwnedItem` reads/writes this column.

This task has no application-level test of its own (a raw schema change isn't independently testable); it's exercised end-to-end by Task 5's and Task 7's tests per CLAUDE.md §8.4. Skip red/green here — go straight to the schema edit and migration.

- [ ] **Step 1: Add the column to the Prisma schema**

Edit `src/backend/prisma/schema/inventory.prisma`, in the `OwnedItem` model, add `isEquipped` right after `purchasedAt`:

```prisma
/// A purchase made by a GameSession — join between GameSession and ShopItem.
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

- [ ] **Step 2: Generate the migration**

Run (from `src/backend`, with the local Postgres running via `pnpm docker:up` from repo root in another terminal, or a local Postgres matching `.env`'s `DATABASE_URL`):

```bash
cd src/backend
pnpm exec prisma migrate dev --name add_owned_item_is_equipped
```

Expected: Prisma creates `prisma/migrations/<timestamp>_add_owned_item_is_equipped/migration.sql` containing:

```sql
-- AlterTable
ALTER TABLE "OwnedItem" ADD COLUMN     "isEquipped" BOOLEAN NOT NULL DEFAULT false;
```

and regenerates the Prisma client. If the generated SQL differs cosmetically (whitespace) that's fine — the column/type/default/not-null must match exactly.

- [ ] **Step 3: Verify the client picked up the new field**

Run: `pnpm exec prisma generate`
Expected: no errors; `node_modules/.prisma/client`'s types now include `OwnedItem.isEquipped: boolean`.

- [ ] **Step 4: Commit**

```bash
cd /Users/kuba/GitHub/vibecoded/PatientPlease
git add src/backend/prisma/schema/inventory.prisma src/backend/prisma/migrations
git commit -m "feat(prisma): add OwnedItem.isEquipped column"
```

---

### Task 2: `dayPhase.ts` shared night-phase resolution service

**Files:**
- Create: `src/backend/src/services/dayPhase.ts`
- Test: `src/backend/test/services/dayPhase.test.ts`

**Interfaces:**
- Produces: `computeInventoryCapacity(dayNumber: number): number`; `resolveDayPhase(prisma: DayPhasePrismaClient, gameSessionId: string): Promise<DayPhaseInfo>`; `NotNightPhaseError`; `DayPhasePrismaClient` (interface with `gameDayLog.findFirst`); `DayPhaseInfo` (`{ isNightPhase: boolean; upcomingDayNumber: number; inventoryCapacity: number }`).
- Consumes: nothing from other new files (this is the base dependency for Tasks 5 and 7).

- [ ] **Step 1: Write the failing tests**

Create `src/backend/test/services/dayPhase.test.ts`:

```typescript
import { jest } from '@jest/globals';
import {
  computeInventoryCapacity,
  resolveDayPhase,
  type DayPhasePrismaClient,
} from '../../src/services/dayPhase.js';

function createMockPrisma() {
  return {
    gameDayLog: {
      findFirst: jest.fn<DayPhasePrismaClient['gameDayLog']['findFirst']>(),
    },
  };
}

describe('computeInventoryCapacity', () => {
  it.each([
    [1, 1],
    [2, 1],
    [3, 2],
    [4, 2],
    [5, 3],
    [6, 3],
    [7, 4],
    [8, 4],
  ])('day %i has capacity %i', (dayNumber, expected) => {
    expect(computeInventoryCapacity(dayNumber)).toBe(expected);
  });
});

describe('resolveDayPhase', () => {
  it('resolves day 1, not night, when no GameDayLog exists yet', async () => {
    const prisma = createMockPrisma();
    prisma.gameDayLog.findFirst.mockResolvedValue(null);

    const result = await resolveDayPhase(prisma, 'session-uuid');

    expect(prisma.gameDayLog.findFirst).toHaveBeenCalledWith({
      where: { gameSessionId: 'session-uuid' },
      orderBy: { dayNumber: 'desc' },
    });
    expect(result).toEqual({ isNightPhase: false, upcomingDayNumber: 1, inventoryCapacity: 1 });
  });

  it('resolves not-night, upcoming day 4, when the latest GameDayLog (day 3) is still open', async () => {
    const prisma = createMockPrisma();
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: null });

    const result = await resolveDayPhase(prisma, 'session-uuid');

    expect(result).toEqual({ isNightPhase: false, upcomingDayNumber: 4, inventoryCapacity: 2 });
  });

  it('resolves night phase, upcoming day 4, capacity 2, when the latest GameDayLog (day 3) has ended', async () => {
    const prisma = createMockPrisma();
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date('2026-07-03T00:00:00.000Z') });

    const result = await resolveDayPhase(prisma, 'session-uuid');

    expect(result).toEqual({ isNightPhase: true, upcomingDayNumber: 4, inventoryCapacity: 2 });
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd src/backend && pnpm exec jest --runInBand test/services/dayPhase.test.ts`
Expected: FAIL — `Cannot find module '../../src/services/dayPhase.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/backend/src/services/dayPhase.ts`:

```typescript
export interface DayPhaseGameDayLogRecord {
  dayNumber: number;
  endedAt: Date | null;
}

export interface DayPhaseInfo {
  isNightPhase: boolean;
  upcomingDayNumber: number;
  inventoryCapacity: number;
}

/** Narrow, structurally-compatible subset of PrismaClient this service depends on — mirrors RoundPrismaClient in services/round.ts. */
export interface DayPhasePrismaClient {
  gameDayLog: {
    findFirst(args: {
      where: { gameSessionId: string };
      orderBy: { dayNumber: 'desc' };
    }): Promise<DayPhaseGameDayLogRecord | null>;
  };
}

export class NotNightPhaseError extends Error {
  constructor(message = 'Action requires the night phase') {
    super(message);
    this.name = 'NotNightPhaseError';
  }
}

export function computeInventoryCapacity(dayNumber: number): number {
  return Math.ceil(dayNumber / 2);
}

export async function resolveDayPhase(
  prisma: DayPhasePrismaClient,
  gameSessionId: string,
): Promise<DayPhaseInfo> {
  const latest = await prisma.gameDayLog.findFirst({
    where: { gameSessionId },
    orderBy: { dayNumber: 'desc' },
  });

  const isNightPhase = latest !== null && latest.endedAt !== null;
  const upcomingDayNumber = (latest?.dayNumber ?? 0) + 1;

  return {
    isNightPhase,
    upcomingDayNumber,
    inventoryCapacity: computeInventoryCapacity(upcomingDayNumber),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec jest --runInBand test/services/dayPhase.test.ts`
Expected: PASS, all cases green.

- [ ] **Step 5: Commit**

```bash
cd /Users/kuba/GitHub/vibecoded/PatientPlease
git add src/backend/src/services/dayPhase.ts src/backend/test/services/dayPhase.test.ts
git commit -m "feat(backend/services): add dayPhase night-phase resolution helper"
```

---

### Task 3: Extend `round.ts` with `isEquipped` and `endingMoney`

**Files:**
- Modify: `src/backend/src/services/round.ts`
- Modify: `src/backend/test/services/round.test.ts`
- Modify: `src/backend/test/routes/round.test.ts`
- Modify: `docs/api/round.md`

**Interfaces:**
- Produces: `OwnedItemRecord.isEquipped: boolean` (now part of the exported type — Tasks 5/7's `OwnedItemRecord` imports pick this up automatically); `GameDayLogRecord.endingMoney: number | null` (consumed by Task 4's `game.ts`).
- Consumes: existing `RoundPrismaClient`, `toOwnedItemResponse` from `round.ts` (both modified in place).

- [ ] **Step 1: Update the failing/changed tests in `round.test.ts`**

In `src/backend/test/services/round.test.ts`, update `makeGameDayLog` to include `endingMoney`, and thread `isEquipped` through every `OwnedItemRecord` fixture/assertion.

Edit the `makeGameDayLog` helper (around line 87):

```typescript
function makeGameDayLog(overrides: Partial<GameDayLogRecord> = {}): GameDayLogRecord {
  return {
    id: 'day-log-uuid',
    dayNumber: 1,
    startingMoney: 0,
    endingMoney: null,
    endedAt: null,
    ...overrides,
  };
}
```

In `primeHappyPath` (around line 253), add `isEquipped` to the seeded owned item:

```typescript
    prisma.ownedItem.findMany.mockResolvedValue([
      {
        id: 'owned-item-uuid',
        shopItem: {
          id: 'shop-item-uuid',
          sku: '89898',
          name: 'Handbook',
          description: 'book about ai',
          itemType: 'HANDBOOK',
          iconImageUrl: 'https://cdn.example.test/handbook.png',
        },
        purchasePrice: 100,
        purchasedOnDay: 2,
        purchasedAt: new Date('2026-07-02T00:00:00.000Z'),
        isEquipped: true,
      },
    ]);
```

In the `'shapes the full happy-path response'` assertion (around line 293), add `isEquipped: true` to the expected `ownedItems[0]` entry:

```typescript
      ownedItems: [
        {
          id: 'owned-item-uuid',
          shopItem: {
            id: 'shop-item-uuid',
            sku: '89898',
            name: 'Handbook',
            description: 'book about ai',
            itemType: 'HANDBOOK',
            iconImageUrl: 'https://cdn.example.test/handbook.png',
          },
          purchasePrice: 100,
          purchasedOnDay: 2,
          purchasedAt: new Date('2026-07-02T00:00:00.000Z'),
          isEquipped: true,
        },
      ],
```

Add one new test at the end of the `describe('startRound', ...)` block, right after the `'never leaks answer-key fields...'` test, asserting `isEquipped` passes through unmodified for both `true` and `false`:

```typescript
  it('passes ownedItems.isEquipped through unmodified', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.ownedItem.findMany.mockResolvedValue([
      {
        id: 'owned-item-uuid',
        shopItem: {
          id: 'shop-item-uuid',
          sku: '89898',
          name: 'Handbook',
          description: 'book about ai',
          itemType: 'HANDBOOK',
          iconImageUrl: 'https://cdn.example.test/handbook.png',
        },
        purchasePrice: 100,
        purchasedOnDay: 2,
        purchasedAt: new Date('2026-07-02T00:00:00.000Z'),
        isEquipped: false,
      },
    ]);

    const result = await startRound(prisma, 'user-uuid');

    expect(result.ownedItems[0]?.isEquipped).toBe(false);
  });
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `pnpm exec jest --runInBand test/services/round.test.ts`
Expected: FAIL — type errors / assertion mismatches, since `round.ts` doesn't yet declare `isEquipped` or `endingMoney`.

- [ ] **Step 3: Update `round.ts`**

In `src/backend/src/services/round.ts`:

Update `GameDayLogRecord` (around line 46):

```typescript
export interface GameDayLogRecord {
  id: string;
  dayNumber: number;
  startingMoney: number;
  endingMoney: number | null;
  endedAt: Date | null;
}
```

Update `OwnedItemRecord` (around line 62):

```typescript
export interface OwnedItemRecord {
  id: string;
  shopItem: ShopItemRecord;
  purchasePrice: number;
  purchasedOnDay: number;
  purchasedAt: Date;
  isEquipped: boolean;
}
```

Update `RoundPrismaClient.ownedItem.findMany`'s return type is already `Promise<OwnedItemRecord[]>` — no signature change needed there, it picks up the new field automatically.

Update `toOwnedItemResponse` (around line 260):

```typescript
function toOwnedItemResponse(record: OwnedItemRecord): OwnedItemRecord {
  return {
    id: record.id,
    shopItem: {
      id: record.shopItem.id,
      sku: record.shopItem.sku,
      name: record.shopItem.name,
      description: record.shopItem.description,
      itemType: record.shopItem.itemType,
      iconImageUrl: record.shopItem.iconImageUrl,
    },
    purchasePrice: record.purchasePrice,
    purchasedOnDay: record.purchasedOnDay,
    purchasedAt: record.purchasedAt,
    isEquipped: record.isEquipped,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec jest --runInBand test/services/round.test.ts`
Expected: PASS.

- [ ] **Step 5: Update the route-level integration test**

In `src/backend/test/routes/round.test.ts`, the `createCase`/owned-item setup at line ~143 (`prisma.ownedItem.create`) doesn't need edits — `isEquipped` defaults to `false` at the DB level (Task 1's migration), so the existing test still passes once the response type includes the field. Add one assertion to the existing `'returns the full round payload...'` test, right after the `expect(body.ownedItems[0]?.shopItem.sku).toBe('sku-1');` line:

```typescript
    expect(body.ownedItems[0]?.isEquipped).toBe(false);
```

Update the test's inline type for `ownedItems` (around line 162) to include the field:

```typescript
      ownedItems: { shopItem: { sku: string }; isEquipped: boolean }[];
```

- [ ] **Step 6: Run the full backend test suite for round**

Run: `pnpm --filter backend test -- test/routes/round.test.ts test/services/round.test.ts`
Expected: PASS. (Requires local Postgres running — `pnpm docker:up` from repo root, or your local dev DB.)

- [ ] **Step 7: Update `docs/api/round.md`**

In `docs/api/round.md`, in the `ownedItems` example (around line 41-56), add `isEquipped`:

```jsonc
  "ownedItems": [
    {
      "id": "uuid",
      "shopItem": {
        "id": "uuid",
        "sku": "89898",
        "name": "Handbook",
        "description": "book about ai",
        "itemType": "HANDBOOK",
        "iconImageUrl": "https://cdn.example.com/handbook.png"
      },
      "purchasePrice": 100,
      "purchasedOnDay": 2,
      "purchasedAt": "iso-datetime",
      "isEquipped": false
    }
  ],
```

- [ ] **Step 8: Commit**

```bash
cd /Users/kuba/GitHub/vibecoded/PatientPlease
git add src/backend/src/services/round.ts src/backend/test/services/round.test.ts src/backend/test/routes/round.test.ts docs/api/round.md
git commit -m "feat(backend/round): surface OwnedItem.isEquipped and GameDayLog.endingMoney"
```

---

### Task 4: `POST /api/v1/day/end`

**Files:**
- Modify: `src/backend/src/services/game.ts`
- Modify: `src/backend/src/routes/day.ts`
- Modify: `src/backend/test/services/game.test.ts`
- Modify: `src/backend/test/routes/day.test.ts`
- Modify: `docs/api/day.md`

**Interfaces:**
- Consumes: `GameDayLogRecord` (with `endingMoney`, from Task 3's `round.ts`).
- Produces: `endDay(prisma: GamePrismaClient, userId: string): Promise<{ gameSession: GameSessionRecord; dayLog: GameDayLogRecord }>` in `game.ts` — no other task depends on this directly, it's the terminal endpoint of the day-end flow.

- [ ] **Step 1: Write the failing service tests**

In `src/backend/test/services/game.test.ts`, update `makeGameDayLog` (around line 42) to include `endingMoney`:

```typescript
function makeGameDayLog(overrides: Partial<GameDayLogRecord> = {}): GameDayLogRecord {
  return {
    id: 'day-log-uuid',
    dayNumber: 1,
    startingMoney: 50,
    endingMoney: null,
    endedAt: null,
    ...overrides,
  };
}
```

Add `endDay` to the imports at the top:

```typescript
import {
  NoActiveGameError,
  NoOpenDayError,
  endDay,
  pauseGame,
  resetDay,
  resetGame,
  type GameDayLogRecord,
  type GamePrismaClient,
  type GameSessionRecord,
} from '../../src/services/game.js';
```

Append a new `describe('endDay', ...)` block at the end of the file (after the `describe('resetDay', ...)` block's closing `});`):

```typescript
describe('endDay', () => {
  it('throws NoActiveGameError when there is no GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);

    await expect(endDay(prisma, 'user-uuid')).rejects.toThrow(NoActiveGameError);
  });

  it.each(['PAUSED', 'GAME_OVER', 'COMPLETED'] as const)(
    'throws NoActiveGameError when the latest session is %s',
    async (status) => {
      const prisma = createMockPrisma();
      prisma.gameSession.findFirst.mockResolvedValue(makeSession({ status }));

      await expect(endDay(prisma, 'user-uuid')).rejects.toThrow(NoActiveGameError);
    },
  );

  it('throws NoOpenDayError when the ACTIVE session has no open GameDayLog', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue(null);

    await expect(endDay(prisma, 'user-uuid')).rejects.toThrow(NoOpenDayError);
    expect(prisma.gameDayLog.update).not.toHaveBeenCalled();
  });

  it('stamps endedAt and endingMoney on the open day log, leaving session.status untouched', async () => {
    const prisma = createMockPrisma();
    const session = makeSession({ money: 75, status: 'ACTIVE' });
    prisma.gameSession.findFirst.mockResolvedValue(session);
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));
    const endedLog = makeGameDayLog({ id: 'open-log-uuid', endingMoney: 75, endedAt: new Date() });
    prisma.gameDayLog.update.mockResolvedValue(endedLog);

    const result = await endDay(prisma, 'user-uuid');

    expect(prisma.gameDayLog.update).toHaveBeenCalledWith({
      where: { id: 'open-log-uuid' },
      data: { endedAt: expect.any(Date) as Date, endingMoney: 75 },
    });
    expect(prisma.gameSession.update).not.toHaveBeenCalled();
    expect(result.gameSession).toEqual(session);
    expect(result.dayLog).toEqual(endedLog);
  });

  it('never leaks the gameSessionId column present on the raw GameDayLog row', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));
    prisma.gameDayLog.update.mockResolvedValue({
      ...makeGameDayLog({ id: 'open-log-uuid' }),
      gameSessionId: 'session-uuid',
    } as GameDayLogRecord);

    const result = await endDay(prisma, 'user-uuid');

    expect(result.dayLog).not.toHaveProperty('gameSessionId');
  });

  it('never leaks the userId column present on the raw GameSession row', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue({
      ...makeSession(),
      userId: 'user-uuid',
    } as GameSessionRecord);
    prisma.gameDayLog.findFirst.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));
    prisma.gameDayLog.update.mockResolvedValue(makeGameDayLog({ id: 'open-log-uuid' }));

    const result = await endDay(prisma, 'user-uuid');

    expect(result.gameSession).not.toHaveProperty('userId');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd src/backend && pnpm exec jest --runInBand test/services/game.test.ts`
Expected: FAIL — `endDay is not a function` / type errors.

- [ ] **Step 3: Implement `endDay` in `game.ts`**

In `src/backend/src/services/game.ts`, extend `GamePrismaClient.gameDayLog.update`'s data type (around line 21-29):

```typescript
    update(args: {
      where: { id: string };
      data: {
        pausedAt?: Date | null;
        endedAt?: Date;
        endingMoney?: number;
        casesAttempted?: number;
        casesCorrect?: number;
        penaltyApplied?: boolean;
      };
    }): Promise<GameDayLogRecord>;
```

Add a private `toGameDayLogResponse` mapper (place it right after the existing `toGameSessionResponse` function, around line 94), and the `endDay` function at the end of the file:

```typescript
function toGameDayLogResponse(record: GameDayLogRecord): GameDayLogRecord {
  return {
    id: record.id,
    dayNumber: record.dayNumber,
    startingMoney: record.startingMoney,
    endingMoney: record.endingMoney,
    endedAt: record.endedAt,
  };
}
```

```typescript
export async function endDay(
  prisma: GamePrismaClient,
  userId: string,
): Promise<{ gameSession: GameSessionRecord; dayLog: GameDayLogRecord }> {
  const session = await requireActiveGameSession(prisma, userId);
  const openDayLog = await requireOpenGameDayLog(prisma, session.id);

  const updatedDayLog = await prisma.gameDayLog.update({
    where: { id: openDayLog.id },
    data: { endedAt: new Date(), endingMoney: session.money },
  });

  return {
    gameSession: toGameSessionResponse(session),
    dayLog: toGameDayLogResponse(updatedDayLog),
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec jest --runInBand test/services/game.test.ts`
Expected: PASS.

- [ ] **Step 5: Write the failing route test**

In `src/backend/test/routes/day.test.ts`, append a new `describe('POST /api/v1/day/end', ...)` block after the closing `});` of the existing `describe('POST /api/v1/day/reset', ...)` block:

```typescript
describe('POST /api/v1/day/end', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await prisma.diagnosisAttempt.deleteMany({});
    await prisma.gameDayLog.deleteMany({});
    await prisma.caseDocument.deleteMany({});
    await prisma.case.deleteMany({});
    await prisma.patient.deleteMany({});
    await prisma.gameSession.deleteMany({});
    await prisma.userSession.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.diagnosis.deleteMany({});
    await prisma.treatment.deleteMany({});
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('returns 401 with no session cookie', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();

    const response = await app.inject({ method: 'POST', url: '/api/v1/day/end' });

    expect(response.statusCode).toBe(401);
    expect(response.json()).toEqual({ error: 'unauthenticated' });
  });

  it('returns 409 no_active_game when the user has no GameSession', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie } = await signIn(app);

    const response = await app.inject({ method: 'POST', url: '/api/v1/day/end', headers: { cookie } });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'no_active_game' });
  });

  it('returns 409 no_open_day when the session has no open GameDayLog', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await prisma.gameSession.create({ data: { userId, money: 0 } });

    const response = await app.inject({ method: 'POST', url: '/api/v1/day/end', headers: { cookie } });

    expect(response.statusCode).toBe(409);
    expect(response.json()).toEqual({ error: 'no_open_day' });
  });

  it('stamps endedAt/endingMoney and returns both gameSession and dayLog', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    const { gameDayLog } = await createActiveSessionWithOpenDay(userId, 80);

    const response = await app.inject({ method: 'POST', url: '/api/v1/day/end', headers: { cookie } });

    expect(response.statusCode).toBe(200);
    const rawBody = response.body;
    const body = response.json<{
      gameSession: { status: string };
      dayLog: { id: string; dayNumber: number; startingMoney: number; endingMoney: number; endedAt: string };
    }>();
    expect(body.gameSession.status).toBe('ACTIVE');
    expect(body.dayLog.id).toBe(gameDayLog.id);
    expect(body.dayLog.endingMoney).toBe(80);
    expect(body.dayLog.endedAt).not.toBeNull();
    expect(rawBody).not.toContain('gameSessionId');

    const updated = await prisma.gameDayLog.findUniqueOrThrow({ where: { id: gameDayLog.id } });
    expect(updated.endedAt).not.toBeNull();
    expect(updated.endingMoney).toBe(80);
  });

  it('calling it twice returns 409 no_open_day on the second call', async () => {
    app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
    await app.ready();
    const { cookie, userId } = await signIn(app);
    await createActiveSessionWithOpenDay(userId, 80);

    const first = await app.inject({ method: 'POST', url: '/api/v1/day/end', headers: { cookie } });
    const second = await app.inject({ method: 'POST', url: '/api/v1/day/end', headers: { cookie } });

    expect(first.statusCode).toBe(200);
    expect(second.statusCode).toBe(409);
    expect(second.json()).toEqual({ error: 'no_open_day' });
  });
});
```

- [ ] **Step 6: Run the test to verify it fails**

Run: `pnpm exec jest --runInBand test/routes/day.test.ts`
Expected: FAIL — `404` on `POST /api/v1/day/end` (route doesn't exist yet).

- [ ] **Step 7: Add the route**

In `src/backend/src/routes/day.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import { NoActiveGameError, NoOpenDayError, endDay, resetDay } from '../services/game.js';

export default function dayRoutes(fastify: FastifyInstance): void {
  fastify.post('/api/v1/day/reset', async (request, reply) => {
    const user = await request.getCurrentUser();
    if (!user) {
      return reply.status(401).send({ error: 'unauthenticated' });
    }

    try {
      const gameSession = await resetDay(prisma, user.id);
      return await reply.status(200).send({ gameSession });
    } catch (error) {
      if (error instanceof NoActiveGameError) {
        return reply.status(409).send({ error: 'no_active_game' });
      }
      if (error instanceof NoOpenDayError) {
        return reply.status(409).send({ error: 'no_open_day' });
      }
      throw error;
    }
  });

  fastify.post('/api/v1/day/end', async (request, reply) => {
    const user = await request.getCurrentUser();
    if (!user) {
      return reply.status(401).send({ error: 'unauthenticated' });
    }

    try {
      const result = await endDay(prisma, user.id);
      return await reply.status(200).send(result);
    } catch (error) {
      if (error instanceof NoActiveGameError) {
        return reply.status(409).send({ error: 'no_active_game' });
      }
      if (error instanceof NoOpenDayError) {
        return reply.status(409).send({ error: 'no_open_day' });
      }
      throw error;
    }
  });
}
```

- [ ] **Step 8: Run the test to verify it passes**

Run: `pnpm exec jest --runInBand test/routes/day.test.ts test/services/game.test.ts`
Expected: PASS.

- [ ] **Step 9: Update `docs/api/day.md`**

In `docs/api/day.md`, add a new section after the existing `## POST /api/v1/day/reset` section's content and before `## Related`:

```markdown
## `POST /api/v1/day/end`

Ends the caller's currently open day, entering the night phase. Does **not** create the next
day's `GameDayLog` — that still happens lazily on the next `POST /api/v1/round` call. The
session's `status` is untouched (stays `ACTIVE`) — there is deliberately no `GameSessionStatus`
value for "night"; night-ness is derived from whether the latest `GameDayLog` has `endedAt` set
(see `docs/api/shop.md`/`docs/api/inventory.md`).

### Request

    POST /api/v1/day/end
    Cookie: session=<...>

No request body.

### Response

| Condition                                                        | Status | Body                                                                                          |
| ----------------------------------------------------------------- | ------ | ----------------------------------------------------------------------------------------------- |
| No/invalid session cookie                                          | 401    | `{ "error": "unauthenticated" }`                                                                |
| No `GameSession`, or latest one is not `ACTIVE`                    | 409    | `{ "error": "no_active_game" }`                                                                 |
| Session is `ACTIVE` but has no open `GameDayLog`                   | 409    | `{ "error": "no_open_day" }`                                                                    |
| Success                                                            | 200    | `{ "gameSession": { ... }, "dayLog": { "id", "dayNumber", "startingMoney", "endingMoney", "endedAt" } }` |

Calling this twice in a row is safe: the second call finds no open day log and returns
`409 no_open_day`, which doubles as an "you're already at night" signal.
```

- [ ] **Step 10: Commit**

```bash
cd /Users/kuba/GitHub/vibecoded/PatientPlease
git add src/backend/src/services/game.ts src/backend/src/routes/day.ts src/backend/test/services/game.test.ts src/backend/test/routes/day.test.ts docs/api/day.md
git commit -m "feat(backend/day): add POST /api/v1/day/end"
```

---

### Task 5: `shop.ts` service

**Files:**
- Create: `src/backend/src/services/shop.ts`
- Test: `src/backend/test/services/shop.test.ts`

**Interfaces:**
- Consumes: `resolveDayPhase`, `computeInventoryCapacity`, `NotNightPhaseError`, `DayPhasePrismaClient`, `DayPhaseInfo` from `services/dayPhase.ts` (Task 2); `GameSessionRecord`, `GameSessionStatusValue`, `OwnedItemRecord` from `services/round.ts` (Task 3); `NoActiveGameError` from `services/game.ts`.
- Produces: `getShopCatalog(prisma: ShopPrismaClient, userId: string): Promise<ShopCatalogResponse>`; `purchaseItem(prisma: ShopPrismaClient, userId: string, shopItemId: string): Promise<{ gameSession: GameSessionRecord; ownedItem: OwnedItemRecord }>`; `ItemNotFoundError`; `ItemLockedError`; `ItemAlreadyOwnedError`; `InsufficientFundsError`; `ShopPrismaClient`; `ShopItemRecord`; `ShopCatalogResponse` — consumed by Task 6's routes.

- [ ] **Step 1: Write the failing tests**

Create `src/backend/test/services/shop.test.ts`:

```typescript
import { jest } from '@jest/globals';
import { NoActiveGameError } from '../../src/services/game.js';
import { NotNightPhaseError } from '../../src/services/dayPhase.js';
import {
  ItemAlreadyOwnedError,
  ItemLockedError,
  ItemNotFoundError,
  InsufficientFundsError,
  getShopCatalog,
  purchaseItem,
  type ShopItemRecord,
  type ShopPrismaClient,
} from '../../src/services/shop.js';
import type { GameSessionRecord, OwnedItemRecord } from '../../src/services/round.js';

function createMockPrisma() {
  return {
    gameSession: {
      findFirst: jest.fn<ShopPrismaClient['gameSession']['findFirst']>(),
      update: jest.fn<ShopPrismaClient['gameSession']['update']>(),
    },
    gameDayLog: {
      findFirst: jest.fn<ShopPrismaClient['gameDayLog']['findFirst']>(),
    },
    shopItem: {
      findMany: jest.fn<ShopPrismaClient['shopItem']['findMany']>(),
      findUnique: jest.fn<ShopPrismaClient['shopItem']['findUnique']>(),
    },
    ownedItem: {
      findMany: jest.fn<ShopPrismaClient['ownedItem']['findMany']>(),
      findFirst: jest.fn<ShopPrismaClient['ownedItem']['findFirst']>(),
      create: jest.fn<ShopPrismaClient['ownedItem']['create']>(),
    },
  };
}

function makeSession(overrides: Partial<GameSessionRecord> = {}): GameSessionRecord {
  return {
    id: 'session-uuid',
    money: 100,
    studentLoanThreshold: null,
    consecutiveBadDiagnosisCount: 0,
    status: 'ACTIVE',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeShopItem(overrides: Partial<ShopItemRecord> = {}): ShopItemRecord {
  return {
    id: 'shop-item-uuid',
    sku: 'sku-1',
    name: 'Handbook',
    description: 'test',
    itemType: 'HANDBOOK',
    price: 50,
    unlockDay: null,
    isActive: true,
    iconImageUrl: null,
    ...overrides,
  };
}

function makeOwnedItem(overrides: Partial<OwnedItemRecord> = {}): OwnedItemRecord {
  return {
    id: 'owned-item-uuid',
    shopItem: {
      id: 'shop-item-uuid',
      sku: 'sku-1',
      name: 'Handbook',
      description: 'test',
      itemType: 'HANDBOOK',
      iconImageUrl: null,
    },
    purchasePrice: 50,
    purchasedOnDay: 1,
    purchasedAt: new Date('2026-07-02T00:00:00.000Z'),
    isEquipped: false,
    ...overrides,
  };
}

describe('getShopCatalog', () => {
  it('returns day-1 defaults when the user has no GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);
    prisma.shopItem.findMany.mockResolvedValue([makeShopItem()]);

    const result = await getShopCatalog(prisma, 'user-uuid');

    expect(prisma.shopItem.findMany).toHaveBeenCalledWith({
      where: { isActive: true, OR: [{ unlockDay: null }, { unlockDay: { lte: 1 } }] },
      orderBy: { name: 'asc' },
    });
    expect(result.isNightPhase).toBe(false);
    expect(result.upcomingDayNumber).toBe(1);
    expect(result.inventoryCapacity).toBe(1);
    expect(result.money).toBe(0);
    expect(result.items).toEqual([
      {
        id: 'shop-item-uuid',
        sku: 'sku-1',
        name: 'Handbook',
        description: 'test',
        itemType: 'HANDBOOK',
        price: 50,
        unlockDay: null,
        iconImageUrl: null,
        owned: false,
      },
    ]);
  });

  it('marks owned items owned: true and reflects the session money/day phase', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession({ money: 30 }));
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.ownedItem.findMany.mockResolvedValue([{ shopItemId: 'shop-item-uuid' }]);
    prisma.shopItem.findMany.mockResolvedValue([makeShopItem()]);

    const result = await getShopCatalog(prisma, 'user-uuid');

    expect(result.isNightPhase).toBe(true);
    expect(result.upcomingDayNumber).toBe(4);
    expect(result.inventoryCapacity).toBe(2);
    expect(result.money).toBe(30);
    expect(result.items[0]?.owned).toBe(true);
  });

  it('queries with unlockDay <= upcomingDayNumber, excluding locked items at the query level', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 5, endedAt: new Date() });
    prisma.ownedItem.findMany.mockResolvedValue([]);
    prisma.shopItem.findMany.mockResolvedValue([]);

    await getShopCatalog(prisma, 'user-uuid');

    expect(prisma.shopItem.findMany).toHaveBeenCalledWith({
      where: { isActive: true, OR: [{ unlockDay: null }, { unlockDay: { lte: 6 } }] },
      orderBy: { name: 'asc' },
    });
  });
});

describe('purchaseItem', () => {
  function primeHappyPath(prisma: ReturnType<typeof createMockPrisma>) {
    prisma.gameSession.findFirst.mockResolvedValue(makeSession({ money: 100 }));
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.shopItem.findUnique.mockResolvedValue(makeShopItem({ price: 50 }));
    prisma.ownedItem.findFirst.mockResolvedValue(null);
    prisma.gameSession.update.mockResolvedValue(makeSession({ money: 50 }));
    prisma.ownedItem.create.mockResolvedValue(makeOwnedItem());
  }

  it('throws NoActiveGameError when there is no active GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);

    await expect(purchaseItem(prisma, 'user-uuid', 'shop-item-uuid')).rejects.toThrow(
      NoActiveGameError,
    );
  });

  it('throws NotNightPhaseError during the day phase', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 1, endedAt: null });

    await expect(purchaseItem(prisma, 'user-uuid', 'shop-item-uuid')).rejects.toThrow(
      NotNightPhaseError,
    );
    expect(prisma.shopItem.findUnique).not.toHaveBeenCalled();
  });

  it('throws ItemNotFoundError when the item does not exist', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.shopItem.findUnique.mockResolvedValue(null);

    await expect(purchaseItem(prisma, 'user-uuid', 'missing-uuid')).rejects.toThrow(
      ItemNotFoundError,
    );
  });

  it('throws ItemNotFoundError when the item is inactive', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.shopItem.findUnique.mockResolvedValue(makeShopItem({ isActive: false }));

    await expect(purchaseItem(prisma, 'user-uuid', 'shop-item-uuid')).rejects.toThrow(
      ItemNotFoundError,
    );
  });

  it('throws ItemLockedError when unlockDay is after upcomingDayNumber', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.shopItem.findUnique.mockResolvedValue(makeShopItem({ unlockDay: 10 }));

    await expect(purchaseItem(prisma, 'user-uuid', 'shop-item-uuid')).rejects.toThrow(
      ItemLockedError,
    );
  });

  it('throws ItemAlreadyOwnedError when the session already owns the item', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.shopItem.findUnique.mockResolvedValue(makeShopItem());
    prisma.ownedItem.findFirst.mockResolvedValue({ id: 'existing-owned-uuid' });

    await expect(purchaseItem(prisma, 'user-uuid', 'shop-item-uuid')).rejects.toThrow(
      ItemAlreadyOwnedError,
    );
  });

  it('throws InsufficientFundsError when session.money < price', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession({ money: 10 }));
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.shopItem.findUnique.mockResolvedValue(makeShopItem({ price: 50 }));
    prisma.ownedItem.findFirst.mockResolvedValue(null);

    await expect(purchaseItem(prisma, 'user-uuid', 'shop-item-uuid')).rejects.toThrow(
      InsufficientFundsError,
    );
    expect(prisma.gameSession.update).not.toHaveBeenCalled();
  });

  it('resolves ItemNotFoundError over ItemLockedError when both would apply (item missing wins)', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.shopItem.findUnique.mockResolvedValue(null);

    await expect(purchaseItem(prisma, 'user-uuid', 'missing-uuid')).rejects.toThrow(
      ItemNotFoundError,
    );
  });

  it('debits money, creates the OwnedItem with isEquipped: false, and returns both records', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);

    const result = await purchaseItem(prisma, 'user-uuid', 'shop-item-uuid');

    expect(prisma.gameSession.update).toHaveBeenCalledWith({
      where: { id: 'session-uuid' },
      data: { money: 50 },
    });
    expect(prisma.ownedItem.create).toHaveBeenCalledWith({
      data: {
        gameSessionId: 'session-uuid',
        shopItemId: 'shop-item-uuid',
        purchasePrice: 50,
        purchasedOnDay: 3,
        isEquipped: false,
      },
      include: { shopItem: true },
    });
    expect(result.gameSession.money).toBe(50);
    expect(result.ownedItem.isEquipped).toBe(false);
  });

  it('never leaks the userId column present on the raw GameSession row', async () => {
    const prisma = createMockPrisma();
    primeHappyPath(prisma);
    prisma.gameSession.update.mockResolvedValue({
      ...makeSession({ money: 50 }),
      userId: 'user-uuid',
    } as GameSessionRecord);

    const result = await purchaseItem(prisma, 'user-uuid', 'shop-item-uuid');

    expect(result.gameSession).not.toHaveProperty('userId');
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd src/backend && pnpm exec jest --runInBand test/services/shop.test.ts`
Expected: FAIL — `Cannot find module '../../src/services/shop.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/backend/src/services/shop.ts`:

```typescript
import { NoActiveGameError } from './game.js';
import {
  resolveDayPhase,
  type DayPhaseInfo,
  type DayPhasePrismaClient,
  NotNightPhaseError,
} from './dayPhase.js';
import type { GameSessionRecord, GameSessionStatusValue, OwnedItemRecord } from './round.js';

export type { NotNightPhaseError };

export interface ShopItemRecord {
  id: string;
  sku: string;
  name: string;
  description: string;
  itemType: string;
  price: number;
  unlockDay: number | null;
  isActive: boolean;
  iconImageUrl: string | null;
}

/** Narrow, structurally-compatible subset of PrismaClient this service depends on — mirrors RoundPrismaClient in services/round.ts. */
export interface ShopPrismaClient extends DayPhasePrismaClient {
  gameSession: {
    findFirst(args: {
      where: { userId: string };
      orderBy: { createdAt: 'desc' };
    }): Promise<GameSessionRecord | null>;
    update(args: {
      where: { id: string };
      data: { money: number };
    }): Promise<GameSessionRecord>;
  };
  shopItem: {
    findMany(args: {
      where: { isActive: boolean; OR: [{ unlockDay: null }, { unlockDay: { lte: number } }] };
      orderBy: { name: 'asc' };
    }): Promise<ShopItemRecord[]>;
    findUnique(args: { where: { id: string } }): Promise<ShopItemRecord | null>;
  };
  ownedItem: {
    findMany(args: { where: { gameSessionId: string } }): Promise<{ shopItemId: string }[]>;
    findFirst(args: {
      where: { gameSessionId: string; shopItemId: string };
    }): Promise<{ id: string } | null>;
    create(args: {
      data: {
        gameSessionId: string;
        shopItemId: string;
        purchasePrice: number;
        purchasedOnDay: number;
        isEquipped: false;
      };
      include: { shopItem: true };
    }): Promise<OwnedItemRecord>;
  };
}

export interface ShopCatalogItem {
  id: string;
  sku: string;
  name: string;
  description: string;
  itemType: string;
  price: number;
  unlockDay: number | null;
  iconImageUrl: string | null;
  owned: boolean;
}

export interface ShopCatalogResponse extends DayPhaseInfo {
  money: number;
  items: ShopCatalogItem[];
}

export class ItemNotFoundError extends Error {
  constructor(message = 'ShopItem not found') {
    super(message);
    this.name = 'ItemNotFoundError';
  }
}

export class ItemLockedError extends Error {
  constructor(message = 'ShopItem is locked') {
    super(message);
    this.name = 'ItemLockedError';
  }
}

export class ItemAlreadyOwnedError extends Error {
  constructor(message = 'ShopItem is already owned') {
    super(message);
    this.name = 'ItemAlreadyOwnedError';
  }
}

export class InsufficientFundsError extends Error {
  constructor(message = 'Insufficient funds') {
    super(message);
    this.name = 'InsufficientFundsError';
  }
}

async function findLatestGameSession(
  prisma: ShopPrismaClient,
  userId: string,
): Promise<GameSessionRecord | null> {
  return prisma.gameSession.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

async function requireActiveGameSession(
  prisma: ShopPrismaClient,
  userId: string,
): Promise<GameSessionRecord> {
  const session = await findLatestGameSession(prisma, userId);

  if (!session || session.status !== ('ACTIVE' satisfies GameSessionStatusValue)) {
    throw new NoActiveGameError();
  }

  return session;
}

function toGameSessionResponse(record: GameSessionRecord): GameSessionRecord {
  return {
    id: record.id,
    money: record.money,
    studentLoanThreshold: record.studentLoanThreshold,
    consecutiveBadDiagnosisCount: record.consecutiveBadDiagnosisCount,
    status: record.status,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export async function getShopCatalog(
  prisma: ShopPrismaClient,
  userId: string,
): Promise<ShopCatalogResponse> {
  const session = await findLatestGameSession(prisma, userId);

  let dayPhase: DayPhaseInfo;
  let money: number;
  let ownedShopItemIds: Set<string>;

  if (!session) {
    dayPhase = { isNightPhase: false, upcomingDayNumber: 1, inventoryCapacity: 1 };
    money = 0;
    ownedShopItemIds = new Set();
  } else {
    dayPhase = await resolveDayPhase(prisma, session.id);
    money = session.money;
    const owned = await prisma.ownedItem.findMany({ where: { gameSessionId: session.id } });
    ownedShopItemIds = new Set(owned.map((item) => item.shopItemId));
  }

  const items = await prisma.shopItem.findMany({
    where: {
      isActive: true,
      OR: [{ unlockDay: null }, { unlockDay: { lte: dayPhase.upcomingDayNumber } }],
    },
    orderBy: { name: 'asc' },
  });

  return {
    isNightPhase: dayPhase.isNightPhase,
    upcomingDayNumber: dayPhase.upcomingDayNumber,
    inventoryCapacity: dayPhase.inventoryCapacity,
    money,
    items: items.map((item) => ({
      id: item.id,
      sku: item.sku,
      name: item.name,
      description: item.description,
      itemType: item.itemType,
      price: item.price,
      unlockDay: item.unlockDay,
      iconImageUrl: item.iconImageUrl,
      owned: ownedShopItemIds.has(item.id),
    })),
  };
}

export async function purchaseItem(
  prisma: ShopPrismaClient,
  userId: string,
  shopItemId: string,
): Promise<{ gameSession: GameSessionRecord; ownedItem: OwnedItemRecord }> {
  const session = await requireActiveGameSession(prisma, userId);

  const dayPhase = await resolveDayPhase(prisma, session.id);
  if (!dayPhase.isNightPhase) {
    throw new NotNightPhaseError();
  }

  const shopItem = await prisma.shopItem.findUnique({ where: { id: shopItemId } });
  if (!shopItem || !shopItem.isActive) {
    throw new ItemNotFoundError();
  }

  if (shopItem.unlockDay !== null && shopItem.unlockDay > dayPhase.upcomingDayNumber) {
    throw new ItemLockedError();
  }

  const existing = await prisma.ownedItem.findFirst({
    where: { gameSessionId: session.id, shopItemId: shopItem.id },
  });
  if (existing) {
    throw new ItemAlreadyOwnedError();
  }

  if (session.money < shopItem.price) {
    throw new InsufficientFundsError();
  }

  const updatedSession = await prisma.gameSession.update({
    where: { id: session.id },
    data: { money: session.money - shopItem.price },
  });

  const ownedItem = await prisma.ownedItem.create({
    data: {
      gameSessionId: session.id,
      shopItemId: shopItem.id,
      purchasePrice: shopItem.price,
      purchasedOnDay: dayPhase.upcomingDayNumber - 1,
      isEquipped: false,
    },
    include: { shopItem: true },
  });

  return { gameSession: toGameSessionResponse(updatedSession), ownedItem };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec jest --runInBand test/services/shop.test.ts`
Expected: PASS, all cases green (including the validation-order tests).

- [ ] **Step 5: Commit**

```bash
cd /Users/kuba/GitHub/vibecoded/PatientPlease
git add src/backend/src/services/shop.ts src/backend/test/services/shop.test.ts
git commit -m "feat(backend/services): add shop catalog and purchase logic"
```

---

### Task 6: `GET /api/v1/shop`, `POST /api/v1/shop/purchase` routes

**Files:**
- Create: `src/backend/src/routes/shop.ts`
- Modify: `src/backend/src/app.ts`
- Test: `src/backend/test/routes/shop.test.ts`
- Create: `docs/api/shop.md`

**Interfaces:**
- Consumes: `getShopCatalog`, `purchaseItem`, `ItemNotFoundError`, `ItemLockedError`, `ItemAlreadyOwnedError`, `InsufficientFundsError` from `services/shop.ts` (Task 5); `NotNightPhaseError` from `services/dayPhase.ts` (Task 2); `NoActiveGameError` from `services/game.ts`.

- [ ] **Step 1: Write the failing route tests**

Create `src/backend/test/routes/shop.test.ts`:

```typescript
import { jest } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import type { GoogleIdTokenVerifier } from '../../src/services/auth.js';

function extractSessionCookie(response: {
  headers: { 'set-cookie'?: string | string[] | undefined };
}): string {
  const header = response.headers['set-cookie'];
  const raw = Array.isArray(header) ? header[0] : header;
  const match = /session=([^;]+)/.exec(String(raw));
  if (!match?.[1]) {
    throw new Error('session cookie not set on response');
  }
  return `session=${match[1]}`;
}

const VALID_PAYLOAD = {
  sub: 'google-shop-1',
  email: 'doctor-shop@example.test',
  email_verified: true,
  name: 'Doctor Test',
};

function createGoogleClient(payload: Record<string, unknown> | undefined): GoogleIdTokenVerifier {
  return { verifyIdToken: jest.fn(() => Promise.resolve({ getPayload: () => payload })) };
}

async function signIn(app: FastifyInstance): Promise<{ cookie: string; userId: string }> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/google',
    payload: { idToken: 'raw' },
  });
  const body = response.json<{ user: { id: string } }>();
  return { cookie: extractSessionCookie(response), userId: body.user.id };
}

async function createNightPhaseSession(userId: string, money = 100) {
  const gameSession = await prisma.gameSession.create({ data: { userId, money } });
  await prisma.gameDayLog.create({
    data: {
      gameSessionId: gameSession.id,
      dayNumber: 1,
      startingMoney: money,
      startedAt: new Date(),
      endedAt: new Date(),
      endingMoney: money,
    },
  });
  return gameSession;
}

describe('shop routes', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await prisma.ownedItem.deleteMany({});
    await prisma.gameDayLog.deleteMany({});
    await prisma.gameSession.deleteMany({});
    await prisma.userSession.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.shopItem.deleteMany({});
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/v1/shop', () => {
    it('returns 401 with no session cookie', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();

      const response = await app.inject({ method: 'GET', url: '/api/v1/shop' });

      expect(response.statusCode).toBe(401);
      expect(response.json()).toEqual({ error: 'unauthenticated' });
    });

    it('returns the day-1 catalog for a brand-new user with no GameSession', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie } = await signIn(app);
      await prisma.shopItem.create({
        data: { sku: 'sku-1', name: 'Handbook', description: 'test', itemType: 'HANDBOOK', price: 50 },
      });

      const response = await app.inject({ method: 'GET', url: '/api/v1/shop', headers: { cookie } });

      expect(response.statusCode).toBe(200);
      const body = response.json<{
        isNightPhase: boolean;
        upcomingDayNumber: number;
        inventoryCapacity: number;
        money: number;
        items: { sku: string; owned: boolean }[];
      }>();
      expect(body.isNightPhase).toBe(false);
      expect(body.upcomingDayNumber).toBe(1);
      expect(body.inventoryCapacity).toBe(1);
      expect(body.money).toBe(0);
      expect(body.items).toEqual([expect.objectContaining({ sku: 'sku-1', owned: false })]);
    });

    it('excludes inactive items and items locked past the upcoming day, includes unlockDay: null items', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie } = await signIn(app);
      await prisma.shopItem.create({
        data: { sku: 'active', name: 'Active', description: 'test', itemType: 'HANDBOOK', price: 10 },
      });
      await prisma.shopItem.create({
        data: {
          sku: 'inactive',
          name: 'Inactive',
          description: 'test',
          itemType: 'HANDBOOK',
          price: 10,
          isActive: false,
        },
      });
      await prisma.shopItem.create({
        data: {
          sku: 'locked',
          name: 'Locked',
          description: 'test',
          itemType: 'HANDBOOK',
          price: 10,
          unlockDay: 5,
        },
      });

      const response = await app.inject({ method: 'GET', url: '/api/v1/shop', headers: { cookie } });

      const body = response.json<{ items: { sku: string }[] }>();
      expect(body.items.map((item) => item.sku)).toEqual(['active']);
    });
  });

  describe('POST /api/v1/shop/purchase', () => {
    it('returns 401 with no session cookie', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/shop/purchase',
        payload: { shopItemId: 'x' },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 409 not_night_phase during the day phase', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      const gameSession = await prisma.gameSession.create({ data: { userId, money: 100 } });
      await prisma.gameDayLog.create({
        data: {
          gameSessionId: gameSession.id,
          dayNumber: 1,
          startingMoney: 100,
          startedAt: new Date(),
        },
      });
      const shopItem = await prisma.shopItem.create({
        data: { sku: 'sku-1', name: 'Handbook', description: 'test', itemType: 'HANDBOOK', price: 50 },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/shop/purchase',
        headers: { cookie },
        payload: { shopItemId: shopItem.id },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: 'not_night_phase' });
    });

    it('happy path: debits money and creates an unequipped OwnedItem', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      const gameSession = await createNightPhaseSession(userId, 100);
      const shopItem = await prisma.shopItem.create({
        data: { sku: 'sku-1', name: 'Handbook', description: 'test', itemType: 'HANDBOOK', price: 50 },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/shop/purchase',
        headers: { cookie },
        payload: { shopItemId: shopItem.id },
      });

      expect(response.statusCode).toBe(200);
      const body = response.json<{
        gameSession: { money: number };
        ownedItem: { isEquipped: boolean; shopItem: { sku: string } };
      }>();
      expect(body.gameSession.money).toBe(50);
      expect(body.ownedItem.isEquipped).toBe(false);
      expect(body.ownedItem.shopItem.sku).toBe('sku-1');

      const updatedSession = await prisma.gameSession.findUniqueOrThrow({ where: { id: gameSession.id } });
      expect(updatedSession.money).toBe(50);
    });

    it('duplicate purchase returns 409 item_already_owned', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      const gameSession = await createNightPhaseSession(userId, 100);
      const shopItem = await prisma.shopItem.create({
        data: { sku: 'sku-1', name: 'Handbook', description: 'test', itemType: 'HANDBOOK', price: 50 },
      });
      await prisma.ownedItem.create({
        data: { gameSessionId: gameSession.id, shopItemId: shopItem.id, purchasePrice: 50, purchasedOnDay: 1 },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/shop/purchase',
        headers: { cookie },
        payload: { shopItemId: shopItem.id },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: 'item_already_owned' });
    });

    it('underfunded purchase returns 409 insufficient_funds', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      await createNightPhaseSession(userId, 10);
      const shopItem = await prisma.shopItem.create({
        data: { sku: 'sku-1', name: 'Handbook', description: 'test', itemType: 'HANDBOOK', price: 50 },
      });

      const response = await app.inject({
        method: 'POST',
        url: '/api/v1/shop/purchase',
        headers: { cookie },
        payload: { shopItemId: shopItem.id },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: 'insufficient_funds' });
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd src/backend && pnpm exec jest --runInBand test/routes/shop.test.ts`
Expected: FAIL — `404` on both routes (not registered yet).

- [ ] **Step 3: Add the route file**

Create `src/backend/src/routes/shop.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import { NoActiveGameError } from '../services/game.js';
import { NotNightPhaseError } from '../services/dayPhase.js';
import {
  ItemAlreadyOwnedError,
  ItemLockedError,
  ItemNotFoundError,
  InsufficientFundsError,
  getShopCatalog,
  purchaseItem,
} from '../services/shop.js';

interface PurchaseBody {
  shopItemId: string;
}

export default function shopRoutes(fastify: FastifyInstance): void {
  fastify.get('/api/v1/shop', async (request, reply) => {
    const user = await request.getCurrentUser();
    if (!user) {
      return reply.status(401).send({ error: 'unauthenticated' });
    }

    const catalog = await getShopCatalog(prisma, user.id);
    return reply.status(200).send(catalog);
  });

  fastify.post<{ Body: PurchaseBody }>(
    '/api/v1/shop/purchase',
    {
      schema: {
        body: {
          type: 'object',
          required: ['shopItemId'],
          properties: { shopItemId: { type: 'string', minLength: 1 } },
        },
      },
    },
    async (request, reply) => {
      const user = await request.getCurrentUser();
      if (!user) {
        return reply.status(401).send({ error: 'unauthenticated' });
      }

      try {
        const result = await purchaseItem(prisma, user.id, request.body.shopItemId);
        return await reply.status(200).send(result);
      } catch (error) {
        if (error instanceof NoActiveGameError) {
          return reply.status(409).send({ error: 'no_active_game' });
        }
        if (error instanceof NotNightPhaseError) {
          return reply.status(409).send({ error: 'not_night_phase' });
        }
        if (error instanceof ItemNotFoundError) {
          return reply.status(404).send({ error: 'item_not_found' });
        }
        if (error instanceof ItemLockedError) {
          return reply.status(409).send({ error: 'item_locked' });
        }
        if (error instanceof ItemAlreadyOwnedError) {
          return reply.status(409).send({ error: 'item_already_owned' });
        }
        if (error instanceof InsufficientFundsError) {
          return reply.status(409).send({ error: 'insufficient_funds' });
        }
        throw error;
      }
    },
  );
}
```

- [ ] **Step 4: Register the route in `app.ts`**

In `src/backend/src/app.ts`, add the import and registration:

```typescript
import roundRoutes from './routes/round.js';
import shopRoutes from './routes/shop.js';
```

(insert `shopRoutes` import alphabetically after `roundRoutes`'s import line), and register it:

```typescript
  app.register(dayRoutes);
  app.register(shopRoutes);
```

(after the existing `app.register(dayRoutes);` line).

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm exec jest --runInBand test/routes/shop.test.ts`
Expected: PASS.

- [ ] **Step 6: Write `docs/api/shop.md`**

Create `docs/api/shop.md`:

```markdown
# Shop: Catalog & Purchase

Night-phase shop backend endpoints: browsing the purchasable catalog and buying an item.
Purchasing debits `GameSession.money` and creates an `OwnedItem` row, unequipped by default —
equipping is a separate action (`docs/api/inventory.md`).

## `GET /api/v1/shop`

Returns the purchasable catalog for the caller. Not night-restricted — a pure read with no
side effects, so browsing mid-day to plan a purchase is harmless. Lenient about session
existence: a user with no `GameSession` yet gets a 200 with the day-1 catalog and no owned
items.

### Request

    GET /api/v1/shop
    Cookie: session=<...>

### Response

| Condition                   | Status | Body                                          |
| ---------------------------- | ------ | ----------------------------------------------- |
| No/invalid session cookie    | 401    | `{ "error": "unauthenticated" }`               |
| No `GameSession` yet         | 200    | day-1 catalog, `money: 0`, no owned items      |
| Success                      | 200    | see shape below                                |

```jsonc
{
  "isNightPhase": false,
  "upcomingDayNumber": 3,
  "inventoryCapacity": 2,
  "money": 120,
  "items": [
    {
      "id": "uuid",
      "sku": "89898",
      "name": "Handbook",
      "description": "book about ai",
      "itemType": "HANDBOOK",
      "price": 100,
      "unlockDay": null,
      "iconImageUrl": "https://cdn.example.com/handbook.png",
      "owned": false
    }
  ]
}
```

Items are filtered to `isActive: true` and (`unlockDay: null` or `unlockDay <= upcomingDayNumber`)
— locked/inactive items are omitted entirely, never returned with a `locked: true` flag.

## `POST /api/v1/shop/purchase`

Buys a `ShopItem` for the caller's session. Does **not** equip it.

### Request

    POST /api/v1/shop/purchase
    Cookie: session=<...>
    Content-Type: application/json

    { "shopItemId": "<ShopItem.id>" }

### Response

| Condition                                                    | Status | Body                                                          |
| -------------------------------------------------------------- | ------ | ----------------------------------------------------------------- |
| No/invalid session cookie                                       | 401    | `{ "error": "unauthenticated" }`                                  |
| Malformed body (missing/empty `shopItemId`)                     | 400    | Fastify's default schema-validation body                          |
| No `GameSession`, or latest one is not `ACTIVE`                 | 409    | `{ "error": "no_active_game" }`                                   |
| Not night phase (open/no `GameDayLog`)                          | 409    | `{ "error": "not_night_phase" }`                                  |
| `shopItemId` doesn't match any `isActive` `ShopItem`            | 404    | `{ "error": "item_not_found" }`                                   |
| Item's `unlockDay` is after `upcomingDayNumber`                 | 409    | `{ "error": "item_locked" }`                                      |
| Session already owns this `ShopItem`                            | 409    | `{ "error": "item_already_owned" }`                               |
| `session.money < shopItem.price`                                | 409    | `{ "error": "insufficient_funds" }`                               |
| Success                                                         | 200    | `{ "gameSession": { ... }, "ownedItem": { "id", "shopItem": {...}, "purchasePrice", "purchasedOnDay", "purchasedAt", "isEquipped": false } }` |

Checks run in the order listed above — a request failing more than one check gets the
earliest-listed error.

## Related

- Route: `src/backend/src/routes/shop.ts`
- Business logic: `src/backend/src/services/shop.ts`, `src/backend/src/services/dayPhase.ts`
- App wiring: `src/backend/src/app.ts`
- Tests: `src/backend/test/routes/shop.test.ts`, `src/backend/test/services/shop.test.ts`
- Design spec: `docs/superpowers/specs/2026-07-08-shop-inventory-endpoints-design.md`
```

- [ ] **Step 7: Commit**

```bash
cd /Users/kuba/GitHub/vibecoded/PatientPlease
git add src/backend/src/routes/shop.ts src/backend/src/app.ts src/backend/test/routes/shop.test.ts docs/api/shop.md
git commit -m "feat(backend/shop): add GET /api/v1/shop and POST /api/v1/shop/purchase"
```

---

### Task 7: `inventory.ts` service

**Files:**
- Create: `src/backend/src/services/inventory.ts`
- Test: `src/backend/test/services/inventory.test.ts`

**Interfaces:**
- Consumes: `resolveDayPhase`, `NotNightPhaseError`, `DayPhasePrismaClient`, `DayPhaseInfo` from `services/dayPhase.ts` (Task 2); `GameSessionRecord`, `OwnedItemRecord` from `services/round.ts` (Task 3); `NoActiveGameError` from `services/game.ts`.
- Produces: `getInventory(prisma: InventoryPrismaClient, userId: string): Promise<InventoryResponse>`; `updateEquippedItems(prisma: InventoryPrismaClient, userId: string, equippedItemIds: string[]): Promise<InventoryResponse>`; `InventoryCapacityExceededError`; `ItemNotOwnedError`; `InventoryPrismaClient`; `InventoryResponse` — consumed by Task 8's routes.

- [ ] **Step 1: Write the failing tests**

Create `src/backend/test/services/inventory.test.ts`:

```typescript
import { jest } from '@jest/globals';
import { NoActiveGameError } from '../../src/services/game.js';
import { NotNightPhaseError } from '../../src/services/dayPhase.js';
import {
  InventoryCapacityExceededError,
  ItemNotOwnedError,
  getInventory,
  updateEquippedItems,
  type InventoryPrismaClient,
} from '../../src/services/inventory.js';
import type { GameSessionRecord, OwnedItemRecord } from '../../src/services/round.js';

function createMockPrisma() {
  return {
    gameSession: {
      findFirst: jest.fn<InventoryPrismaClient['gameSession']['findFirst']>(),
    },
    gameDayLog: {
      findFirst: jest.fn<InventoryPrismaClient['gameDayLog']['findFirst']>(),
    },
    ownedItem: {
      findMany: jest.fn<InventoryPrismaClient['ownedItem']['findMany']>(),
      update: jest.fn<InventoryPrismaClient['ownedItem']['update']>(),
    },
  };
}

function makeSession(overrides: Partial<GameSessionRecord> = {}): GameSessionRecord {
  return {
    id: 'session-uuid',
    money: 100,
    studentLoanThreshold: null,
    consecutiveBadDiagnosisCount: 0,
    status: 'ACTIVE',
    createdAt: new Date('2026-07-01T00:00:00.000Z'),
    updatedAt: new Date('2026-07-01T00:00:00.000Z'),
    ...overrides,
  };
}

function makeOwnedItem(overrides: Partial<OwnedItemRecord> = {}): OwnedItemRecord {
  return {
    id: 'owned-item-a',
    shopItem: {
      id: 'shop-item-a',
      sku: 'sku-a',
      name: 'Item A',
      description: 'test',
      itemType: 'HANDBOOK',
      iconImageUrl: null,
    },
    purchasePrice: 50,
    purchasedOnDay: 1,
    purchasedAt: new Date('2026-07-02T00:00:00.000Z'),
    isEquipped: false,
    ...overrides,
  };
}

describe('getInventory', () => {
  it('returns day-1 empty defaults when the user has no GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);

    const result = await getInventory(prisma, 'user-uuid');

    expect(result).toEqual({
      isNightPhase: false,
      upcomingDayNumber: 1,
      inventoryCapacity: 1,
      equippedItemIds: [],
      ownedItems: [],
    });
  });

  it('derives equippedItemIds from ownedItems where isEquipped is true', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.ownedItem.findMany.mockResolvedValue([
      makeOwnedItem({ id: 'owned-a', isEquipped: true }),
      makeOwnedItem({ id: 'owned-b', isEquipped: false }),
    ]);

    const result = await getInventory(prisma, 'user-uuid');

    expect(result.isNightPhase).toBe(true);
    expect(result.upcomingDayNumber).toBe(4);
    expect(result.inventoryCapacity).toBe(2);
    expect(result.equippedItemIds).toEqual(['owned-a']);
    expect(result.ownedItems).toHaveLength(2);
  });
});

describe('updateEquippedItems', () => {
  it('throws NoActiveGameError when there is no active GameSession', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(null);

    await expect(updateEquippedItems(prisma, 'user-uuid', [])).rejects.toThrow(NoActiveGameError);
  });

  it('throws NotNightPhaseError during the day phase', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 1, endedAt: null });

    await expect(updateEquippedItems(prisma, 'user-uuid', [])).rejects.toThrow(NotNightPhaseError);
  });

  it('throws InventoryCapacityExceededError when distinct ids exceed capacity', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 1, endedAt: new Date() });

    await expect(
      updateEquippedItems(prisma, 'user-uuid', ['owned-a', 'owned-b']),
    ).rejects.toThrow(InventoryCapacityExceededError);
    expect(prisma.ownedItem.findMany).not.toHaveBeenCalled();
  });

  it('dedupes ids before checking capacity: ["a","a"] succeeds at capacity 1', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 1, endedAt: new Date() });
    prisma.ownedItem.findMany.mockResolvedValue([makeOwnedItem({ id: 'owned-a' })]);
    prisma.ownedItem.update.mockResolvedValue(makeOwnedItem({ id: 'owned-a', isEquipped: true }));

    await expect(
      updateEquippedItems(prisma, 'user-uuid', ['owned-a', 'owned-a']),
    ).resolves.toBeDefined();
  });

  it('throws ItemNotOwnedError when an id is not owned by this session', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.ownedItem.findMany.mockResolvedValue([makeOwnedItem({ id: 'owned-a' })]);

    await expect(
      updateEquippedItems(prisma, 'user-uuid', ['not-owned-uuid']),
    ).rejects.toThrow(ItemNotOwnedError);
    expect(prisma.ownedItem.update).not.toHaveBeenCalled();
  });

  it('equips listed ids and unequips previously-equipped ids not listed', async () => {
    const prisma = createMockPrisma();
    prisma.gameSession.findFirst.mockResolvedValue(makeSession());
    prisma.gameDayLog.findFirst.mockResolvedValue({ dayNumber: 3, endedAt: new Date() });
    prisma.ownedItem.findMany.mockResolvedValue([
      makeOwnedItem({ id: 'owned-a', isEquipped: true }),
      makeOwnedItem({ id: 'owned-b', isEquipped: false }),
    ]);
    prisma.ownedItem.update.mockImplementation(({ where, data }) =>
      Promise.resolve(makeOwnedItem({ id: where.id, isEquipped: data.isEquipped })),
    );

    const result = await updateEquippedItems(prisma, 'user-uuid', ['owned-b']);

    expect(prisma.ownedItem.update).toHaveBeenCalledWith({
      where: { id: 'owned-a' },
      data: { isEquipped: false },
      include: { shopItem: true },
    });
    expect(prisma.ownedItem.update).toHaveBeenCalledWith({
      where: { id: 'owned-b' },
      data: { isEquipped: true },
      include: { shopItem: true },
    });
    expect(result.equippedItemIds).toEqual(['owned-b']);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `cd src/backend && pnpm exec jest --runInBand test/services/inventory.test.ts`
Expected: FAIL — `Cannot find module '../../src/services/inventory.js'`.

- [ ] **Step 3: Write the implementation**

Create `src/backend/src/services/inventory.ts`:

```typescript
import { NoActiveGameError } from './game.js';
import {
  resolveDayPhase,
  type DayPhaseInfo,
  type DayPhasePrismaClient,
  NotNightPhaseError,
} from './dayPhase.js';
import type { GameSessionRecord, GameSessionStatusValue, OwnedItemRecord } from './round.js';

export type { NotNightPhaseError };

/** Narrow, structurally-compatible subset of PrismaClient this service depends on — mirrors RoundPrismaClient in services/round.ts. */
export interface InventoryPrismaClient extends DayPhasePrismaClient {
  gameSession: {
    findFirst(args: {
      where: { userId: string };
      orderBy: { createdAt: 'desc' };
    }): Promise<GameSessionRecord | null>;
  };
  ownedItem: {
    findMany(args: {
      where: { gameSessionId: string };
      include: { shopItem: true };
      orderBy: { purchasedAt: 'asc' };
    }): Promise<OwnedItemRecord[]>;
    update(args: {
      where: { id: string };
      data: { isEquipped: boolean };
      include: { shopItem: true };
    }): Promise<OwnedItemRecord>;
  };
}

export interface InventoryResponse extends DayPhaseInfo {
  equippedItemIds: string[];
  ownedItems: OwnedItemRecord[];
}

export class InventoryCapacityExceededError extends Error {
  constructor(message = 'Inventory capacity exceeded') {
    super(message);
    this.name = 'InventoryCapacityExceededError';
  }
}

export class ItemNotOwnedError extends Error {
  constructor(message = 'OwnedItem does not belong to this session') {
    super(message);
    this.name = 'ItemNotOwnedError';
  }
}

async function findLatestGameSession(
  prisma: InventoryPrismaClient,
  userId: string,
): Promise<GameSessionRecord | null> {
  return prisma.gameSession.findFirst({ where: { userId }, orderBy: { createdAt: 'desc' } });
}

async function requireActiveGameSession(
  prisma: InventoryPrismaClient,
  userId: string,
): Promise<GameSessionRecord> {
  const session = await findLatestGameSession(prisma, userId);

  if (!session || session.status !== ('ACTIVE' satisfies GameSessionStatusValue)) {
    throw new NoActiveGameError();
  }

  return session;
}

function toOwnedItemResponse(record: OwnedItemRecord): OwnedItemRecord {
  return {
    id: record.id,
    shopItem: {
      id: record.shopItem.id,
      sku: record.shopItem.sku,
      name: record.shopItem.name,
      description: record.shopItem.description,
      itemType: record.shopItem.itemType,
      iconImageUrl: record.shopItem.iconImageUrl,
    },
    purchasePrice: record.purchasePrice,
    purchasedOnDay: record.purchasedOnDay,
    purchasedAt: record.purchasedAt,
    isEquipped: record.isEquipped,
  };
}

function toEquippedItemIds(ownedItems: OwnedItemRecord[]): string[] {
  return ownedItems.filter((item) => item.isEquipped).map((item) => item.id);
}

export async function getInventory(
  prisma: InventoryPrismaClient,
  userId: string,
): Promise<InventoryResponse> {
  const session = await findLatestGameSession(prisma, userId);

  if (!session) {
    return { isNightPhase: false, upcomingDayNumber: 1, inventoryCapacity: 1, equippedItemIds: [], ownedItems: [] };
  }

  const dayPhase = await resolveDayPhase(prisma, session.id);
  const ownedItems = await prisma.ownedItem.findMany({
    where: { gameSessionId: session.id },
    include: { shopItem: true },
    orderBy: { purchasedAt: 'asc' },
  });
  const mapped = ownedItems.map(toOwnedItemResponse);

  return {
    isNightPhase: dayPhase.isNightPhase,
    upcomingDayNumber: dayPhase.upcomingDayNumber,
    inventoryCapacity: dayPhase.inventoryCapacity,
    equippedItemIds: toEquippedItemIds(mapped),
    ownedItems: mapped,
  };
}

export async function updateEquippedItems(
  prisma: InventoryPrismaClient,
  userId: string,
  equippedItemIds: string[],
): Promise<InventoryResponse> {
  const session = await requireActiveGameSession(prisma, userId);

  const dayPhase = await resolveDayPhase(prisma, session.id);
  if (!dayPhase.isNightPhase) {
    throw new NotNightPhaseError();
  }

  const distinctIds = new Set(equippedItemIds);
  if (distinctIds.size > dayPhase.inventoryCapacity) {
    throw new InventoryCapacityExceededError();
  }

  const ownedItems = await prisma.ownedItem.findMany({
    where: { gameSessionId: session.id },
    include: { shopItem: true },
    orderBy: { purchasedAt: 'asc' },
  });

  const ownedIds = new Set(ownedItems.map((item) => item.id));
  for (const id of distinctIds) {
    if (!ownedIds.has(id)) {
      throw new ItemNotOwnedError();
    }
  }

  const updatedItems: OwnedItemRecord[] = [];
  for (const item of ownedItems) {
    const updated = await prisma.ownedItem.update({
      where: { id: item.id },
      data: { isEquipped: distinctIds.has(item.id) },
      include: { shopItem: true },
    });
    updatedItems.push(toOwnedItemResponse(updated));
  }

  return {
    isNightPhase: dayPhase.isNightPhase,
    upcomingDayNumber: dayPhase.upcomingDayNumber,
    inventoryCapacity: dayPhase.inventoryCapacity,
    equippedItemIds: toEquippedItemIds(updatedItems),
    ownedItems: updatedItems,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `pnpm exec jest --runInBand test/services/inventory.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
cd /Users/kuba/GitHub/vibecoded/PatientPlease
git add src/backend/src/services/inventory.ts src/backend/test/services/inventory.test.ts
git commit -m "feat(backend/services): add inventory equip/unequip logic"
```

---

### Task 8: `GET /api/v1/inventory`, `PUT /api/v1/inventory` routes

**Files:**
- Create: `src/backend/src/routes/inventory.ts`
- Modify: `src/backend/src/app.ts`
- Test: `src/backend/test/routes/inventory.test.ts`
- Create: `docs/api/inventory.md`

**Interfaces:**
- Consumes: `getInventory`, `updateEquippedItems`, `InventoryCapacityExceededError`, `ItemNotOwnedError` from `services/inventory.ts` (Task 7); `NotNightPhaseError` from `services/dayPhase.ts` (Task 2); `NoActiveGameError` from `services/game.ts`.

- [ ] **Step 1: Write the failing route tests**

Create `src/backend/test/routes/inventory.test.ts`:

```typescript
import { jest } from '@jest/globals';
import type { FastifyInstance } from 'fastify';
import { buildApp } from '../../src/app.js';
import { prisma } from '../../src/db/prisma.js';
import type { GoogleIdTokenVerifier } from '../../src/services/auth.js';

function extractSessionCookie(response: {
  headers: { 'set-cookie'?: string | string[] | undefined };
}): string {
  const header = response.headers['set-cookie'];
  const raw = Array.isArray(header) ? header[0] : header;
  const match = /session=([^;]+)/.exec(String(raw));
  if (!match?.[1]) {
    throw new Error('session cookie not set on response');
  }
  return `session=${match[1]}`;
}

const VALID_PAYLOAD = {
  sub: 'google-inventory-1',
  email: 'doctor-inventory@example.test',
  email_verified: true,
  name: 'Doctor Test',
};

function createGoogleClient(payload: Record<string, unknown> | undefined): GoogleIdTokenVerifier {
  return { verifyIdToken: jest.fn(() => Promise.resolve({ getPayload: () => payload })) };
}

async function signIn(app: FastifyInstance): Promise<{ cookie: string; userId: string }> {
  const response = await app.inject({
    method: 'POST',
    url: '/auth/google',
    payload: { idToken: 'raw' },
  });
  const body = response.json<{ user: { id: string } }>();
  return { cookie: extractSessionCookie(response), userId: body.user.id };
}

async function createNightPhaseSession(userId: string, dayNumber = 1, money = 100) {
  const gameSession = await prisma.gameSession.create({ data: { userId, money } });
  await prisma.gameDayLog.create({
    data: {
      gameSessionId: gameSession.id,
      dayNumber,
      startingMoney: money,
      startedAt: new Date(),
      endedAt: new Date(),
      endingMoney: money,
    },
  });
  return gameSession;
}

async function createOwnedItem(gameSessionId: string, sku: string) {
  const shopItem = await prisma.shopItem.create({
    data: { sku, name: sku, description: 'test', itemType: 'HANDBOOK', price: 10 },
  });
  return prisma.ownedItem.create({
    data: { gameSessionId, shopItemId: shopItem.id, purchasePrice: 10, purchasedOnDay: 1 },
  });
}

describe('inventory routes', () => {
  let app: FastifyInstance;

  afterEach(async () => {
    await prisma.ownedItem.deleteMany({});
    await prisma.gameDayLog.deleteMany({});
    await prisma.gameSession.deleteMany({});
    await prisma.userSession.deleteMany({});
    await prisma.user.deleteMany({});
    await prisma.shopItem.deleteMany({});
    await app.close();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  describe('GET /api/v1/inventory', () => {
    it('returns 401 with no session cookie', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();

      const response = await app.inject({ method: 'GET', url: '/api/v1/inventory' });

      expect(response.statusCode).toBe(401);
    });

    it('returns empty day-1 defaults for a brand-new user', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie } = await signIn(app);

      const response = await app.inject({ method: 'GET', url: '/api/v1/inventory', headers: { cookie } });

      expect(response.statusCode).toBe(200);
      expect(response.json()).toEqual({
        isNightPhase: false,
        upcomingDayNumber: 1,
        inventoryCapacity: 1,
        equippedItemIds: [],
        ownedItems: [],
      });
    });
  });

  describe('PUT /api/v1/inventory', () => {
    it('returns 401 with no session cookie', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/inventory',
        payload: { equippedItemIds: [] },
      });

      expect(response.statusCode).toBe(401);
    });

    it('returns 409 not_night_phase during the day phase', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      const gameSession = await prisma.gameSession.create({ data: { userId, money: 0 } });
      await prisma.gameDayLog.create({
        data: { gameSessionId: gameSession.id, dayNumber: 1, startingMoney: 0, startedAt: new Date() },
      });

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/inventory',
        headers: { cookie },
        payload: { equippedItemIds: [] },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: 'not_night_phase' });
    });

    it('returns 409 inventory_capacity_exceeded when distinct ids exceed capacity', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      const gameSession = await createNightPhaseSession(userId, 1);
      const itemA = await createOwnedItem(gameSession.id, 'sku-a');
      const itemB = await createOwnedItem(gameSession.id, 'sku-b');

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/inventory',
        headers: { cookie },
        payload: { equippedItemIds: [itemA.id, itemB.id] },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: 'inventory_capacity_exceeded' });
    });

    it('returns 409 item_not_owned for an id not owned by this session', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      await createNightPhaseSession(userId, 1);

      const response = await app.inject({
        method: 'PUT',
        url: '/api/v1/inventory',
        headers: { cookie },
        payload: { equippedItemIds: ['00000000-0000-0000-0000-000000000000'] },
      });

      expect(response.statusCode).toBe(409);
      expect(response.json()).toEqual({ error: 'item_not_owned' });
    });

    it('happy path: equips an item, then a later call drops it, both reflected in the DB', async () => {
      app = buildApp({ googleClient: createGoogleClient(VALID_PAYLOAD) });
      await app.ready();
      const { cookie, userId } = await signIn(app);
      const gameSession = await createNightPhaseSession(userId, 1);
      const item = await createOwnedItem(gameSession.id, 'sku-a');

      const equipResponse = await app.inject({
        method: 'PUT',
        url: '/api/v1/inventory',
        headers: { cookie },
        payload: { equippedItemIds: [item.id] },
      });

      expect(equipResponse.statusCode).toBe(200);
      expect(equipResponse.json()).toMatchObject({ equippedItemIds: [item.id] });
      const afterEquip = await prisma.ownedItem.findUniqueOrThrow({ where: { id: item.id } });
      expect(afterEquip.isEquipped).toBe(true);

      const unequipResponse = await app.inject({
        method: 'PUT',
        url: '/api/v1/inventory',
        headers: { cookie },
        payload: { equippedItemIds: [] },
      });

      expect(unequipResponse.statusCode).toBe(200);
      expect(unequipResponse.json()).toMatchObject({ equippedItemIds: [] });
      const afterUnequip = await prisma.ownedItem.findUniqueOrThrow({ where: { id: item.id } });
      expect(afterUnequip.isEquipped).toBe(false);
    });
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `cd src/backend && pnpm exec jest --runInBand test/routes/inventory.test.ts`
Expected: FAIL — `404` on both routes.

- [ ] **Step 3: Add the route file**

Create `src/backend/src/routes/inventory.ts`:

```typescript
import type { FastifyInstance } from 'fastify';
import { prisma } from '../db/prisma.js';
import { NoActiveGameError } from '../services/game.js';
import { NotNightPhaseError } from '../services/dayPhase.js';
import {
  InventoryCapacityExceededError,
  ItemNotOwnedError,
  getInventory,
  updateEquippedItems,
} from '../services/inventory.js';

interface UpdateInventoryBody {
  equippedItemIds: string[];
}

export default function inventoryRoutes(fastify: FastifyInstance): void {
  fastify.get('/api/v1/inventory', async (request, reply) => {
    const user = await request.getCurrentUser();
    if (!user) {
      return reply.status(401).send({ error: 'unauthenticated' });
    }

    const inventory = await getInventory(prisma, user.id);
    return reply.status(200).send(inventory);
  });

  fastify.put<{ Body: UpdateInventoryBody }>(
    '/api/v1/inventory',
    {
      schema: {
        body: {
          type: 'object',
          required: ['equippedItemIds'],
          properties: {
            equippedItemIds: { type: 'array', items: { type: 'string', minLength: 1 } },
          },
        },
      },
    },
    async (request, reply) => {
      const user = await request.getCurrentUser();
      if (!user) {
        return reply.status(401).send({ error: 'unauthenticated' });
      }

      try {
        const result = await updateEquippedItems(prisma, user.id, request.body.equippedItemIds);
        return await reply.status(200).send(result);
      } catch (error) {
        if (error instanceof NoActiveGameError) {
          return reply.status(409).send({ error: 'no_active_game' });
        }
        if (error instanceof NotNightPhaseError) {
          return reply.status(409).send({ error: 'not_night_phase' });
        }
        if (error instanceof InventoryCapacityExceededError) {
          return reply.status(409).send({ error: 'inventory_capacity_exceeded' });
        }
        if (error instanceof ItemNotOwnedError) {
          return reply.status(409).send({ error: 'item_not_owned' });
        }
        throw error;
      }
    },
  );
}
```

- [ ] **Step 4: Register the route in `app.ts`**

In `src/backend/src/app.ts`, add the import and registration:

```typescript
import gameRoutes from './routes/game.js';
import healthRoutes from './routes/health.js';
import inventoryRoutes from './routes/inventory.js';
```

(insert `inventoryRoutes` import alphabetically), and register it after `app.register(shopRoutes);`:

```typescript
  app.register(shopRoutes);
  app.register(inventoryRoutes);
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `pnpm exec jest --runInBand test/routes/inventory.test.ts`
Expected: PASS.

- [ ] **Step 6: Write `docs/api/inventory.md`**

Create `docs/api/inventory.md`:

```markdown
# Inventory: View & Equip

Night-phase backend endpoints for viewing owned items and choosing which are equipped
(visible during the day). Purchasing (`docs/api/shop.md`) and equipping are decoupled: buying
an item just adds it to `OwnedItem`; it stays unequipped until explicitly equipped here.

## `GET /api/v1/inventory`

Returns the caller's owned items, current equip state, and the capacity that governs
`PUT /api/v1/inventory`. Not night-restricted — a pure read, checking your loadout during the
day is harmless. Lenient for a nonexistent session, same as `GET /api/v1/shop`.

### Request

    GET /api/v1/inventory
    Cookie: session=<...>

### Response

| Condition                 | Status | Body                                     |
| --------------------------- | ------ | ------------------------------------------- |
| No/invalid session cookie   | 401    | `{ "error": "unauthenticated" }`           |
| No `GameSession` yet        | 200    | day-1 defaults, empty inventory            |
| Success                     | 200    | see shape below                            |

```jsonc
{
  "isNightPhase": true,
  "upcomingDayNumber": 4,
  "inventoryCapacity": 2,
  "equippedItemIds": ["uuid"],
  "ownedItems": [
    {
      "id": "uuid",
      "shopItem": {
        "id": "uuid",
        "sku": "89898",
        "name": "Handbook",
        "description": "book about ai",
        "itemType": "HANDBOOK",
        "iconImageUrl": "https://cdn.example.com/handbook.png"
      },
      "purchasePrice": 100,
      "purchasedOnDay": 2,
      "purchasedAt": "iso-datetime",
      "isEquipped": true
    }
  ]
}
```

`equippedItemIds` is redundant with each item's `isEquipped` flag, included as a convenience
matching `PUT /api/v1/inventory`'s request body shape.

## `PUT /api/v1/inventory`

Replaces the full equipped set in one call. Night-only; capacity- and ownership-validated.

### Request

    PUT /api/v1/inventory
    Cookie: session=<...>
    Content-Type: application/json

    { "equippedItemIds": ["uuid", "uuid"] }

### Response

| Condition                                                       | Status | Body                              |
| ------------------------------------------------------------------ | ------ | ------------------------------------ |
| No/invalid session cookie                                           | 401    | `{ "error": "unauthenticated" }`    |
| Malformed body (not an array of strings)                            | 400    | Fastify's default schema-validation body |
| No `GameSession`, or latest one is not `ACTIVE`                     | 409    | `{ "error": "no_active_game" }`     |
| Not night phase                                                     | 409    | `{ "error": "not_night_phase" }`    |
| Distinct id count in `equippedItemIds` exceeds `inventoryCapacity`  | 409    | `{ "error": "inventory_capacity_exceeded" }` |
| Any id isn't an `OwnedItem.id` owned by this session                | 409    | `{ "error": "item_not_owned" }`     |
| Success                                                             | 200    | same shape as `GET /api/v1/inventory` |

Setting `isEquipped` is per-row (no `$transaction`) — every listed id is equipped and every
owned item not listed is unequipped, including ones that were previously equipped.

## Related

- Route: `src/backend/src/routes/inventory.ts`
- Business logic: `src/backend/src/services/inventory.ts`, `src/backend/src/services/dayPhase.ts`
- App wiring: `src/backend/src/app.ts`
- Tests: `src/backend/test/routes/inventory.test.ts`, `src/backend/test/services/inventory.test.ts`
- Design spec: `docs/superpowers/specs/2026-07-08-shop-inventory-endpoints-design.md`
```

- [ ] **Step 7: Commit**

```bash
cd /Users/kuba/GitHub/vibecoded/PatientPlease
git add src/backend/src/routes/inventory.ts src/backend/src/app.ts src/backend/test/routes/inventory.test.ts docs/api/inventory.md
git commit -m "feat(backend/inventory): add GET/PUT /api/v1/inventory"
```

---

### Task 9: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Run the full backend test suite**

Run: `cd src/backend && pnpm test`
Expected: PASS — every test file green, including all of Tasks 1-8's additions.

- [ ] **Step 2: Run lint**

Run: `pnpm lint` (from `src/backend`)
Expected: no errors.

- [ ] **Step 3: Run typecheck**

Run: `pnpm typecheck` (from `src/backend`)
Expected: no errors.

- [ ] **Step 4: Run the code-review skill**

Per CLAUDE.md §10, run the project's `code-review` skill over the full diff (`git diff main...HEAD` or equivalent) before considering this feature done.

## Self-Review Notes

- Spec coverage checked against every section of `docs/superpowers/specs/2026-07-08-shop-inventory-endpoints-design.md`: schema/migration (Task 1), `dayPhase.ts` (Task 2), `round.ts`'s `isEquipped`/`endingMoney` (Task 3), `POST /api/v1/day/end` (Task 4), `shop.ts` + routes (Tasks 5-6), `inventory.ts` + routes (Tasks 7-8), error taxonomy (spread across Tasks 2/5/7 exactly matching the spec's table), all `docs/api/*.md` updates (spread across Tasks 3/4/6/8).
- `GameDayLogRecord.endingMoney` required no new migration — `progression.prisma`'s `GameDayLog.endingMoney Int?` column already exists in the DB; Task 3 only surfaces it in the TypeScript type, per the spec's own note that this is "purely additive."
- Response-shaping helpers (`toGameSessionResponse`, `toOwnedItemResponse`, `toGameDayLogResponse`) are deliberately duplicated per-service rather than shared/exported, matching this codebase's existing `round.ts`/`game.ts` precedent (CLAUDE.md §11: follow established patterns).
