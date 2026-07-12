# Phone Examinations Provider Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the `Phone` component (the "Zleć badania" / order-tests panel) a real, backend-sourced list of which examinations ("badania") exist and what they cost, replacing its currently-hardcoded local `TESTS` array.

**Architecture:** A new co-located domain provider, `Phone/providers/Examinations/`, narrows `RoundProvider`'s existing `shopCatalog` (already fetched via `GET /api/v1/shop` for the night shop) down to just the `itemType: 'EXAMINATION'` items, in the exact same "narrow a domain provider from RoundProvider" pattern already used by `DocumentTableProvider` and `NightShopProvider`. `Phone.jsx` then renders from this real data instead of its hardcoded list.

**Tech Stack:** React + Context/hooks (no new libraries), Jest + React Testing Library, CSS Modules (unchanged).

## Global Constraints

- No new provider talks to `useApi()` directly — this domain reads `shopCatalog`/`loadShopCatalog` from `useRound()` only, per CLAUDE.md's Provider Isolation Contract (Section 5). `RoundProvider` already owns the one `GET /api/v1/shop` call site.
- Naming: `PascalCase` domain folder (`Examinations`), `PascalCase` + `Provider` suffix (`ExaminationsProvider.jsx`), `camelCase` `use`-prefixed hook (`useExaminations.js`), barrel `index.js` exporting only the public provider + hook (CLAUDE.md Section 6).
- Frontend is JavaScript only (JSDoc for non-obvious shapes, PropTypes on components) — no TypeScript.
- TDD mandatory: every step below writes the failing test before the implementation (CLAUDE.md Section 8). Tests mock `global.fetch` directly, never `jest.mock()` on axios/`lib/Api`.
- **Explicitly out of scope for this plan** (do not implement, even if it seems like a natural next step): ordering an examination against a case (`POST /api/v1/examinations`), purchasing an unowned examination (`POST /api/v1/shop/purchase`), and any per-case result data. This plan only gets the real *catalog* (name, description, price, owned-or-not) into `Phone`. Ordering/purchasing is a separate future plan.
- The existing `TESTS` array's `minutes` (duration) field has no backend equivalent (`ShopItem.content.timeCostMs` exists in the DB but is deliberately never included in `GET /api/v1/shop`'s response — see `docs/api/shop.md`). This plan drops the duration display entirely rather than inventing fake data for it; the footer summary shows total **price** instead of total time.
- The old `available` boolean (fake, per-test) is replaced by the real `owned` flag from the catalog: per `docs/api/examinations.md`, only an *owned* `EXAMINATION` item can actually be ordered, so "you don't own this yet" is the real, correct reason a row is disabled — not an arbitrary fake flag.

---

### Task 1: `Examinations` provider (narrows RoundProvider's shopCatalog to EXAMINATION items)

**Files:**
- Create: `src/frontend/src/components/Phone/providers/Examinations/ExaminationsProvider.jsx`
- Create: `src/frontend/src/components/Phone/providers/Examinations/useExaminations.js`
- Create: `src/frontend/src/components/Phone/providers/Examinations/index.js`
- Test: `src/frontend/src/tests/components/Phone/providers/Examinations/ExaminationsProvider.test.jsx`

**Interfaces:**
- Consumes: `useRound()` → `{ shopCatalog, isShopLoading, shopError, loadShopCatalog }` (all already exist on `RoundProvider`, `src/frontend/src/providers/Round/RoundProvider.jsx`).
- Produces: `useExaminations()` → `{ examinations: Array<{id, name, description, price, owned}>, isLoading: boolean, error: * }`. Task 2 consumes exactly this shape.

- [ ] **Step 1: Write the failing test**

Create `src/frontend/src/tests/components/Phone/providers/Examinations/ExaminationsProvider.test.jsx`:

```jsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import { ApiProvider } from '../../../../../providers/Api';
import { RoundProvider } from '../../../../../providers/Round';
import {
  ExaminationsProvider,
  useExaminations,
} from '../../../../../components/Phone/providers/Examinations';

const CATALOG = {
  money: 100,
  items: [
    {
      id: 'exam-1',
      sku: 'exam-punch-biopsy',
      name: 'Punch Biopsy',
      description: 'A small tissue sample sent to pathology for a definitive histological read.',
      itemType: 'EXAMINATION',
      price: 140,
      unlockDay: null,
      iconImageUrl: null,
      owned: true,
    },
    {
      id: 'exam-2',
      sku: 'exam-dermoscopy',
      name: 'Dermoscopy Imaging',
      description: 'Magnified, polarized imaging that reveals a lesion’s sub-surface structures.',
      itemType: 'EXAMINATION',
      price: 80,
      unlockDay: null,
      iconImageUrl: null,
      owned: false,
    },
    {
      id: 'book-1',
      sku: 'abcde-rule',
      name: 'ABCDE Rule',
      description: 'A diagnostic guide handbook.',
      itemType: 'HANDBOOK',
      price: 50,
      unlockDay: null,
      iconImageUrl: null,
      owned: true,
    },
  ],
};

function Probe() {
  const { examinations, isLoading, error } = useExaminations();
  if (isLoading) return <span>loading</span>;
  if (error) return <span>error</span>;
  return (
    <ul>
      {examinations.map((exam) => (
        <li key={exam.id}>
          {exam.name} - {exam.price} - {exam.owned ? 'owned' : 'not-owned'}
        </li>
      ))}
    </ul>
  );
}

function renderProvider() {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <ExaminationsProvider>
          <Probe />
        </ExaminationsProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('ExaminationsProvider', () => {
  it('narrows RoundProvider shopCatalog down to EXAMINATION-type items only', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(CATALOG), { status: 200 }));
    renderProvider();

    await waitFor(() => expect(screen.getByText('Punch Biopsy - 140 - owned')).toBeInTheDocument());
    expect(screen.getByText('Dermoscopy Imaging - 80 - not-owned')).toBeInTheDocument();
    expect(screen.queryByText(/ABCDE Rule/)).not.toBeInTheDocument();
  });

  it('exposes an error when the catalog fetch fails', async () => {
    global.fetch = jest.fn().mockResolvedValue(new Response('nope', { status: 500 }));
    renderProvider();
    await waitFor(() => expect(screen.getByText('error')).toBeInTheDocument());
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test -- --maxWorkers=1 --testPathPattern="Phone/providers/Examinations"`
Expected: FAIL — `Cannot find module '../../../../../components/Phone/providers/Examinations'` (nothing created yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/frontend/src/components/Phone/providers/Examinations/ExaminationsProvider.jsx`:

```jsx
import React, { createContext, useEffect, useMemo } from 'react';
import PropTypes from 'prop-types';
import { useRound } from '../../../../providers/Round';

export const ExaminationsContext = createContext(null);

/**
 * Narrows RoundProvider's shopCatalog down to just the EXAMINATION-type items
 * Phone needs to display: name, description, price, and whether the player
 * already owns it. Only an owned EXAMINATION can actually be ordered against a
 * case (see docs/api/examinations.md) — `owned` is the real, backend-driven
 * reason a row would be unselectable, not an arbitrary flag.
 *
 * Read-only for now: ordering (POST /api/v1/examinations) and purchasing an
 * unowned one (POST /api/v1/shop/purchase) are deliberately out of scope here
 * — see docs/superpowers/plans/2026-07-12-phone-examinations-provider.md.
 */
export function ExaminationsProvider({ children }) {
  const { shopCatalog, isShopLoading, shopError, loadShopCatalog } = useRound();

  useEffect(() => {
    loadShopCatalog();
  }, [loadShopCatalog]);

  const examinations = useMemo(
    () =>
      (shopCatalog?.items ?? [])
        .filter((item) => item.itemType === 'EXAMINATION')
        .map((item) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          price: item.price,
          owned: item.owned,
        })),
    [shopCatalog],
  );

  const value = useMemo(
    () => ({ examinations, isLoading: isShopLoading, error: shopError }),
    [examinations, isShopLoading, shopError],
  );

  return <ExaminationsContext.Provider value={value}>{children}</ExaminationsContext.Provider>;
}

ExaminationsProvider.propTypes = {
  children: PropTypes.node.isRequired,
};
```

Create `src/frontend/src/components/Phone/providers/Examinations/useExaminations.js`:

```js
import { useContext } from 'react';
import { ExaminationsContext } from './ExaminationsProvider';

export function useExaminations() {
  const context = useContext(ExaminationsContext);
  if (!context) {
    throw new Error('useExaminations must be used within an ExaminationsProvider');
  }
  return context;
}
```

Create `src/frontend/src/components/Phone/providers/Examinations/index.js`:

```js
export { ExaminationsProvider } from './ExaminationsProvider';
export { useExaminations } from './useExaminations';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test -- --maxWorkers=1 --testPathPattern="Phone/providers/Examinations"`
Expected: PASS (2/2).

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/components/Phone/providers/Examinations src/frontend/src/tests/components/Phone/providers/Examinations
git commit -m "feat(phone-examinations): add Examinations provider narrowing RoundProvider's shop catalog"
```

---

### Task 2: Wire `Phone` to render real examinations instead of the hardcoded `TESTS` list

**Files:**
- Modify: `src/frontend/src/components/Phone/Phone.jsx`
- Modify: `src/frontend/src/components/Wall/Wall.jsx:6,268` (import + wrap `<Phone>` with `<ExaminationsProvider>`)
- Test: `src/frontend/src/tests/components/Phone/Phone.test.jsx` (full rewrite — every existing test renders `<Phone>` standalone with no providers and asserts on the old hardcoded Polish names; all of that becomes provider-backed and asserts on mocked real catalog data instead)

**Interfaces:**
- Consumes: `useExaminations()` → `{ examinations, isLoading, error }` from Task 1.
- Produces: n/a (leaf component).

- [ ] **Step 1: Write the failing test**

Replace the full contents of `src/frontend/src/tests/components/Phone/Phone.test.jsx`:

```jsx
import React from 'react';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { ApiProvider } from '../../../providers/Api';
import { RoundProvider } from '../../../providers/Round';
import { ExaminationsProvider } from '../../../components/Phone/providers/Examinations';
import { Phone } from '../../../components/Phone';

const CATALOG = {
  money: 100,
  items: [
    {
      id: 'exam-1',
      sku: 'exam-punch-biopsy',
      name: 'Punch Biopsy',
      description: 'A small tissue sample sent to pathology for a definitive histological read.',
      itemType: 'EXAMINATION',
      price: 140,
      unlockDay: null,
      iconImageUrl: null,
      owned: true,
    },
    {
      id: 'exam-2',
      sku: 'exam-dermoscopy',
      name: 'Dermoscopy Imaging',
      description: 'Magnified, polarized imaging.',
      itemType: 'EXAMINATION',
      price: 80,
      unlockDay: null,
      iconImageUrl: null,
      owned: false,
    },
  ],
};

function renderPhone(onCancel = jest.fn()) {
  return render(
    <ApiProvider baseUrl="http://api.test">
      <RoundProvider>
        <ExaminationsProvider>
          <Phone onCancel={onCancel} />
        </ExaminationsProvider>
      </RoundProvider>
    </ApiProvider>,
  );
}

describe('Phone', () => {
  beforeEach(() => {
    global.fetch = jest.fn().mockResolvedValue(new Response(JSON.stringify(CATALOG), { status: 200 }));
  });

  it('renders the order-tests form with the real examination catalog', async () => {
    renderPhone();

    expect(screen.getByRole('heading', { name: 'Zleć badania' })).toBeInTheDocument();
    await waitFor(() => expect(screen.getByText('Punch Biopsy')).toBeInTheDocument());
    expect(screen.getByText('Dermoscopy Imaging')).toBeInTheDocument();
    expect(screen.getByText('$140')).toBeInTheDocument();
    expect(screen.getByText('$80')).toBeInTheDocument();
  });

  it('marks not-yet-owned examinations and prevents selecting them', async () => {
    const user = userEvent.setup();
    renderPhone();
    await waitFor(() => screen.getByText('Punch Biopsy'));

    expect(screen.getAllByText('Niedostępne')).toHaveLength(1);

    await user.click(screen.getByRole('button', { name: /dermoscopy imaging/i }));

    expect(screen.getByText('Nie wybrano badań')).toBeInTheDocument();
  });

  it('starts with nothing selected and Confirm disabled', async () => {
    renderPhone();
    await waitFor(() => screen.getByText('Punch Biopsy'));

    expect(screen.getByText('Nie wybrano badań')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zleć badania' })).toBeDisabled();
  });

  it('selecting an owned examination updates the count/total price and enables Confirm', async () => {
    const user = userEvent.setup();
    renderPhone();
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(screen.getByRole('button', { name: /punch biopsy/i }));

    expect(screen.getByText('1 badanie wybrane')).toBeInTheDocument();
    expect(screen.getByText('$140')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Zleć badania (1)' })).toBeEnabled();
  });

  it('confirming shows the success state with the ordered tests', async () => {
    const user = userEvent.setup();
    renderPhone();
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(screen.getByRole('button', { name: /punch biopsy/i }));
    await user.click(screen.getByRole('button', { name: 'Zleć badania (1)' }));

    expect(screen.getByText('Badania zlecone')).toBeInTheDocument();
    expect(screen.getByText('Zleć kolejne')).toBeInTheDocument();
  });

  it('calls onCancel when the close (X) button is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderPhone(onCancel);
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(screen.getByRole('button', { name: /^close$/i }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when Anuluj is clicked', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderPhone(onCancel);
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(screen.getByRole('button', { name: 'Anuluj' }));

    expect(onCancel).toHaveBeenCalled();
  });

  it('calls onCancel when Zamknij is clicked after ordering', async () => {
    const user = userEvent.setup();
    const onCancel = jest.fn();
    renderPhone(onCancel);
    await waitFor(() => screen.getByText('Punch Biopsy'));

    await user.click(screen.getByRole('button', { name: /punch biopsy/i }));
    await user.click(screen.getByRole('button', { name: 'Zleć badania (1)' }));
    await user.click(screen.getByRole('button', { name: 'Zamknij' }));

    expect(onCancel).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test -- --maxWorkers=1 --testPathPattern="components/Phone/Phone.test"`
Expected: FAIL — `Phone` still reads its local hardcoded `TESTS` array, so none of the real-catalog assertions (`Punch Biopsy`, `$140`, etc.) match, and rendering `<Phone>` without wrapping it in the provider chain isn't required yet by the current source, so the *old* Polish-name elements are what actually render instead.

- [ ] **Step 3: Write minimal implementation**

Replace the full contents of `src/frontend/src/components/Phone/Phone.jsx`:

```jsx
import React, { useState } from 'react';
import PropTypes from 'prop-types';
import styles from './Phone.module.css';
import { useExaminations } from './providers/Examinations';

function countLabel(n) {
  if (n === 0) return 'Nie wybrano badań';
  const word = n === 1 ? 'badanie' : n < 5 ? 'badania' : 'badań';
  return `${n} ${word} wybrane`;
}

export function Phone({ onCancel }) {
  const { examinations, isLoading, error } = useExaminations();
  const [selected, setSelected] = useState({});
  const [ordered, setOrdered] = useState(false);

  function toggle(id) {
    const exam = examinations.find((e) => e.id === id);
    if (!exam || !exam.owned) return;
    setSelected((current) => ({ ...current, [id]: !current[id] }));
  }

  function reset() {
    setSelected({});
    setOrdered(false);
  }

  const chosen = examinations.filter((e) => selected[e.id] && e.owned);
  const totalPrice = chosen.reduce((sum, e) => sum + e.price, 0);
  const confirmDisabled = chosen.length === 0;

  return (
    <div className={styles.phone}>
      <div className={styles.header}>
        <div className={styles.headerIcon} aria-hidden="true">
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="#ffffff" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
            <circle cx="11" cy="11" r="7" />
            <path d="m20 20-3.2-3.2" />
            <circle cx="11" cy="11" r="2.6" />
          </svg>
        </div>
        <div className={styles.headerText}>
          <h3 className={styles.title}>Zleć badania</h3>
          <p className={styles.patientLine}>
            Pacjent: <strong>Anna Kowalska</strong> · 47 l. · podejrzenie czerniaka (zmiana ok. plec.)
          </p>
        </div>
        <button type="button" className={styles.closeButton} aria-label="Close" onClick={onCancel}>
          ✕
        </button>
      </div>

      {isLoading && <p className={styles.patientLine}>Ładowanie badań…</p>}
      {error && <p className={styles.patientLine}>Nie udało się wczytać listy badań.</p>}

      {!isLoading && !error && (ordered ? (
        <div className={styles.success}>
          <div className={styles.successIcon} aria-hidden="true">
            <svg width="30" height="30" viewBox="0 0 24 24" fill="none" stroke="#4fbfa2" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
              <path d="M20 6 9 17l-5-5" />
            </svg>
          </div>
          <h4 className={styles.successTitle}>Badania zlecone</h4>
          <p className={styles.successText}>
            Skierowania trafiły do rejestracji. Łączny koszt: <strong>${totalPrice}</strong>.
          </p>

          <div className={styles.orderedList}>
            {chosen.map((e) => (
              <div className={styles.orderedRow} key={e.id}>
                <span className={styles.orderedName}>{e.name}</span>
                <span className={styles.orderedDuration}>${e.price}</span>
              </div>
            ))}
          </div>

          <div className={styles.successActions}>
            <button type="button" className={styles.resetButton} onClick={reset}>
              Zleć kolejne
            </button>
            <button type="button" className={styles.doneButton} onClick={onCancel}>
              Zamknij
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className={styles.testList}>
            {examinations.map((exam) => {
              const isSelected = !!selected[exam.id] && exam.owned;
              const unavailable = !exam.owned;
              return (
                <button
                  key={exam.id}
                  type="button"
                  className={`${styles.row}${isSelected ? ` ${styles.rowSelected}` : ''}${unavailable ? ` ${styles.rowUnavailable}` : ''}`}
                  disabled={unavailable}
                  aria-pressed={isSelected}
                  onClick={() => toggle(exam.id)}
                >
                  <span className={`${styles.rowBox}${isSelected ? ` ${styles.rowBoxSelected}` : ''}`} aria-hidden="true">
                    {isSelected && (
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="#ece8e3" strokeWidth="3.2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M20 6 9 17l-5-5" />
                      </svg>
                    )}
                  </span>
                  <span className={styles.rowBody}>
                    <span className={styles.rowNameLine}>
                      <span className={`${styles.rowName}${unavailable ? ` ${styles.rowNameUnavailable}` : ''}`}>{exam.name}</span>
                      {unavailable && <span className={styles.unavailableBadge}>Niedostępne</span>}
                    </span>
                    <span className={`${styles.rowDesc}${unavailable ? ` ${styles.rowDescUnavailable}` : ''}`}>{exam.description}</span>
                  </span>
                  <span className={`${styles.rowDuration}${unavailable ? ` ${styles.rowDurationUnavailable}` : ''}`}>
                    ${exam.price}
                  </span>
                </button>
              );
            })}
          </div>

          <div className={styles.footer}>
            <div className={styles.summary}>
              <div>
                <div className={styles.summaryLabel}>Łączny koszt badań</div>
                <div className={styles.summaryCount}>{countLabel(chosen.length)}</div>
              </div>
              <div className={styles.summaryTotal}>${totalPrice}</div>
            </div>

            <div className={styles.actions}>
              <button type="button" className={styles.cancelButton} onClick={onCancel}>
                Anuluj
              </button>
              <button type="button" className={styles.confirmButton} disabled={confirmDisabled} onClick={() => setOrdered(true)}>
                {confirmDisabled ? 'Zleć badania' : `Zleć badania (${chosen.length})`}
              </button>
            </div>
          </div>
        </>
      ))}
    </div>
  );
}

Phone.propTypes = {
  onCancel: PropTypes.func.isRequired,
};
```

Then, in `src/frontend/src/components/Wall/Wall.jsx`: add the import (near the existing `Phone` import, line 6):

```jsx
import { Phone } from '../Phone';
import { ExaminationsProvider } from '../Phone/providers/Examinations';
```

...and wrap the existing `<Phone onCancel={closeSettings} />` (line 268) with it:

```jsx
            <ExaminationsProvider>
              <Phone onCancel={closeSettings} />
            </ExaminationsProvider>
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test -- --maxWorkers=1 --testPathPattern="components/Phone/Phone.test"`
Expected: PASS (8/8).

- [ ] **Step 5: Run the full frontend suite to confirm no regressions**

Run: `pnpm --filter frontend test -- --maxWorkers=2`
Expected: PASS, including `Wall.test.jsx` (its "Order tests" button now opens a provider-wrapped `Phone` — if that test renders `Wall` without an ancestor `RoundProvider`/`ApiProvider`, it will need the same provider wrapping added; check and fix as part of this step, since a PR that breaks an existing test is not done).

- [ ] **Step 6: Commit**

```bash
git add src/frontend/src/components/Phone/Phone.jsx src/frontend/src/components/Wall/Wall.jsx src/frontend/src/tests/components/Phone/Phone.test.jsx
git commit -m "feat(phone): render the real EXAMINATION catalog from RoundProvider instead of a hardcoded list"
```

---

## Self-Review

**Spec coverage:** "a provider... that will get its data from the main RoundProvider" → Task 1. "give the data... on what badania are available and how much they cost" → Task 1's `examinations` shape (`name`, `description`, `price`, `owned`) + Task 2 actually rendering it. Ordering/ purchasing explicitly deferred per the user's "for now" framing — called out in Global Constraints so it isn't accidentally in-scoped later.

**Placeholder scan:** none — every step has complete file contents, not descriptions.

**Type consistency:** `useExaminations()` returns `{ examinations, isLoading, error }` in Task 1 and is consumed with that exact shape in Task 2; `examinations[].{id,name,description,price,owned}` matches on both sides.
