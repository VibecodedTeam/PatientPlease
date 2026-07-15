# Patient Notebook Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the desk's `Information_2` + `Information_3` cards with a single `Notebook` component (open-book spread: history on the left page, symptoms + exam results stacked on the right page), absorbing the intent of the orphaned `Book` component, and remove both.

**Architecture:** `Notebook` is a new `components/Notebook/` unit that consumes `useDocumentTable()` for `documents` and passes them down as a prop to two presentational `internal/` sub-pages (`HistoryPage`, `SymptomsExamPage`), which share one pure formatting helper (`internal/formatDocumentContent.js`) generalized from today's `Information_2` inline logic. `TabElem` swaps its `Information_2`/`Information_3` children for `<Notebook />`. `components/Book/` is deleted as dead code with no callers.

**Tech Stack:** React (JS/JSX only, no TypeScript), CSS Modules, PropTypes, Jest + React Testing Library, pnpm workspace (`pnpm --filter frontend test -- <path>`).

## Global Constraints

- No `position: absolute`/`fixed` outside `components/OverlayPortal/` — this feature uses flexbox only (CLAUDE.md Section 1/7).
- `src/frontend` is JavaScript/JSX only, PropTypes for props, JSDoc for non-obvious shapes (CLAUDE.md Section 1).
- `Notebook` consumes `useDocumentTable()` only — no new provider, no direct `useRound()` (spec Section 2).
- Only a folder's `index.js` barrel is a valid outside import path; a unit's own test may import its non-barrel files directly (CLAUDE.md Section 6).
- No frontend production logic without a failing test first (CLAUDE.md Section 8) — every task below writes the test before the implementation.
- Empty states are real literal copy, not fake placeholder/lorem-ipsum data (spec Section 4).
- Test command for this plan: `pnpm --filter frontend test -- <path-or-pattern>`, run from the repo root.

---

## Design decision: `TabElem.module.css` is _not_ modified

The spec (Section 3) lists `TabElem.module.css` as "Changed," reasoning that `Information_2`/`Information_3` each currently get `flex: 1 1 0` from `TabElem.module.css`'s `:where(.tabElem > *)` rule, and `Notebook` needs to inherit their combined space.

Verified against the actual files: `:where()` always has zero specificity, so `Information_1/2/3`'s own root-level CSS Module classes (`.slot`, with `flex: 156 1 0`, `flex: 204 1 0`, `flex: 204 1 0` respectively) already win over the `:where(.tabElem > *) { flex: 1 1 0; }` fallback. The real current proportions are **156 : 204 : 204**, not 1:1:1.

Following that same existing convention (each child owns its own flex value in its own module), `Notebook.module.css`'s root `.notebook` class gets `flex: 408 1 0` (204 + 204 — the exact combined space of the two removed cards). This reproduces today's proportions exactly (156 : 408 sums to the same 564 total as 156 : 204 : 204) with **no edit needed to `TabElem.module.css`** — its `:where()` fallback rule still exists unchanged and still only applies to children that don't set their own flex (e.g. `{children}`). This is a documented deviation from the spec's literal file list, not an oversight: it achieves the spec's stated visual goal ("the combined space the two cards occupied," "exact values tuned during implementation to match today's proportions") via the established per-component convention instead of adding a redundant, dead CSS rule to `TabElem.module.css`.

---

### Task 1: `formatDocumentContent` helper

**Files:**

- Create: `src/frontend/src/components/Notebook/internal/formatDocumentContent.js`
- Test: `src/frontend/src/tests/components/Notebook/internal/formatDocumentContent.test.js`

**Interfaces:**

- Produces: `formatKeyLabel(key: string): string`, `formatHistoryContent(content: string | Record<string, unknown> | null | undefined): string` — both named exports, used by Task 2's `HistoryPage`/`SymptomsExamPage`.

- [ ] **Step 1: Write the failing test**

Create `src/frontend/src/tests/components/Notebook/internal/formatDocumentContent.test.js`:

```js
import { formatKeyLabel, formatHistoryContent } from '../../../../components/Notebook/internal/formatDocumentContent';

describe('formatKeyLabel', () => {
  it('inserts a space before each uppercase letter and capitalizes the first character', () => {
    expect(formatKeyLabel('sunbedUse')).toBe('Sunbed Use');
    expect(formatKeyLabel('occupationalExposure')).toBe('Occupational Exposure');
  });
});

describe('formatHistoryContent', () => {
  it('returns an empty string for falsy content', () => {
    expect(formatHistoryContent(null)).toBe('');
    expect(formatHistoryContent(undefined)).toBe('');
  });

  it('returns string content as-is', () => {
    expect(formatHistoryContent('Przez lata korzystała z solarium.')).toBe('Przez lata korzystała z solarium.');
  });

  it('returns a single-key object as its bare value, with no label', () => {
    expect(formatHistoryContent({ description: 'Itching and bleeding for the past week.' })).toBe(
      'Itching and bleeding for the past week.',
    );
  });

  it('joins a multi-key object as "Label: value; Label: value"', () => {
    expect(formatHistoryContent({ sunbedUse: 'frequent', occupationalExposure: 'high' })).toBe(
      'Sunbed Use: frequent; Occupational Exposure: high',
    );
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test -- tests/components/Notebook/internal/formatDocumentContent.test.js`
Expected: FAIL — cannot find module `../../../../components/Notebook/internal/formatDocumentContent` (file doesn't exist yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/frontend/src/components/Notebook/internal/formatDocumentContent.js`:

```js
/**
 * @param {string} key - camelCase object key, e.g. "sunbedUse".
 * @returns {string} Human-readable label, e.g. "Sunbed Use".
 */
export function formatKeyLabel(key) {
  return key.replace(/([A-Z])/g, ' $1').replace(/^./, (char) => char.toUpperCase());
}

/**
 * @param {string | Record<string, unknown> | null | undefined} content
 * @returns {string} String content as-is; a single-key object as its bare
 * value; a multi-key object as "Label: value; Label: value".
 */
export function formatHistoryContent(content) {
  if (!content) return '';
  if (typeof content === 'string') return content;
  const entries = Object.entries(content);
  if (entries.length === 1) return String(entries[0][1]);
  return entries.map(([key, value]) => `${formatKeyLabel(key)}: ${value}`).join('; ');
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test -- tests/components/Notebook/internal/formatDocumentContent.test.js`
Expected: PASS (5 tests).

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/components/Notebook/internal/formatDocumentContent.js \
        src/frontend/src/tests/components/Notebook/internal/formatDocumentContent.test.js
git commit -m "feat(notebook): add formatDocumentContent helper"
```

---

### Task 2: `Notebook` component (`HistoryPage` + `SymptomsExamPage`)

**Files:**

- Create: `src/frontend/src/components/Notebook/Notebook.jsx`
- Create: `src/frontend/src/components/Notebook/Notebook.module.css`
- Create: `src/frontend/src/components/Notebook/index.js`
- Create: `src/frontend/src/components/Notebook/internal/HistoryPage/HistoryPage.jsx`
- Create: `src/frontend/src/components/Notebook/internal/HistoryPage/HistoryPage.module.css`
- Create: `src/frontend/src/components/Notebook/internal/SymptomsExamPage/SymptomsExamPage.jsx`
- Create: `src/frontend/src/components/Notebook/internal/SymptomsExamPage/SymptomsExamPage.module.css`
- Test: `src/frontend/src/tests/components/Notebook/Notebook.test.jsx`

**Interfaces:**

- Consumes: `useDocumentTable()` from `../Table/providers/DocumentTable` → `{ documents }` (array of `{ id, type, title, content }`). `formatKeyLabel`/`formatHistoryContent` from Task 1's `./internal/formatDocumentContent`.
- Produces: `Notebook` (default-less named export) for Task 3's `TabElem` to consume via `components/Notebook`'s barrel. `HistoryPage({ documents })` and `SymptomsExamPage({ documents })` — internal, no barrel, consumed only by `Notebook.jsx`.

- [ ] **Step 1: Write the failing test**

Create `src/frontend/src/tests/components/Notebook/Notebook.test.jsx`:

```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { Notebook } from '../../../components/Notebook';
import { DocumentTableContext } from '../../../components/Table/providers/DocumentTable/DocumentTableProvider';

function renderWithDocumentTable(documents) {
  return render(
    <DocumentTableContext.Provider value={{ documents, patient: null, isLoading: false, error: null }}>
      <Notebook />
    </DocumentTableContext.Provider>,
  );
}

describe('Notebook', () => {
  it('renders history documents on the left page', () => {
    const { container } = renderWithDocumentTable([
      {
        id: 'd1',
        type: 'UV_EXPOSURE_HISTORY',
        title: 'Sun exposure history',
        content: { sunbedUse: 'frequent', occupationalExposure: 'high' },
      },
    ]);

    expect(screen.getByText('History')).toBeInTheDocument();
    expect(container.textContent).toContain('Sun exposure history:');
    expect(container.textContent).toContain('Sunbed Use: frequent');
    expect(container.textContent).toContain('Occupational Exposure: high');
  });

  it('shows the empty state when there are no history documents', () => {
    renderWithDocumentTable([]);
    expect(screen.getByText('No history recorded yet.')).toBeInTheDocument();
  });

  it('renders the clinical symptoms document on the right page', () => {
    renderWithDocumentTable([
      {
        id: 'd2',
        type: 'CLINICAL_SYMPTOMS',
        title: 'Symptoms',
        content: { description: 'Itching and bleeding for the past week.' },
      },
    ]);

    expect(screen.getByText('Symptoms')).toBeInTheDocument();
    expect(screen.getByText('Itching and bleeding for the past week.')).toBeInTheDocument();
  });

  it('shows the empty state when there is no clinical symptoms document', () => {
    renderWithDocumentTable([]);
    expect(screen.getByText('No symptoms documented yet.')).toBeInTheDocument();
  });

  it('renders every exam results document, including multiple results', () => {
    const { container } = renderWithDocumentTable([
      {
        id: 'd3',
        type: 'EXAMINATION_RESULTS',
        title: 'Dermoscopy',
        content: { finding: 'Irregular pigment network' },
      },
      {
        id: 'd4',
        type: 'EXAMINATION_RESULTS',
        title: 'Biopsy',
        content: { finding: 'Atypical melanocytes' },
      },
    ]);

    expect(screen.getByText('Exam Results')).toBeInTheDocument();
    expect(container.textContent).toContain('Dermoscopy: Irregular pigment network');
    expect(container.textContent).toContain('Biopsy: Atypical melanocytes');
  });

  it('shows the empty state when no examinations have been ordered', () => {
    renderWithDocumentTable([]);
    expect(screen.getByText('No examinations ordered yet.')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test -- tests/components/Notebook/Notebook.test.jsx`
Expected: FAIL — cannot find module `../../../components/Notebook` (no `index.js` yet).

- [ ] **Step 3: Write minimal implementation**

Create `src/frontend/src/components/Notebook/internal/HistoryPage/HistoryPage.jsx`:

```jsx
import React from 'react';
import PropTypes from 'prop-types';
import { formatHistoryContent } from '../formatDocumentContent';
import styles from './HistoryPage.module.css';

/**
 * @param {object} props
 * @param {Array<{id: string, type: string, title: string, content: (string|Record<string, unknown>|null)}>} props.documents
 */
export function HistoryPage({ documents }) {
  const historyDocuments = documents.filter((doc) => doc.type.includes('HISTORY'));

  return (
    <div className={styles.page}>
      <h3 className={styles.heading}>History</h3>
      {historyDocuments.length > 0 ? (
        historyDocuments.map((doc) => (
          <p key={doc.id} className={styles.entry}>
            <strong>{doc.title}: </strong>
            {formatHistoryContent(doc.content)}
          </p>
        ))
      ) : (
        <p className={styles.empty}>No history recorded yet.</p>
      )}
    </div>
  );
}

HistoryPage.propTypes = {
  documents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    }),
  ).isRequired,
};
```

Create `src/frontend/src/components/Notebook/internal/HistoryPage/HistoryPage.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-width: 0;
  box-sizing: border-box;
  gap: 12px;
  padding: 16px;
  border-right: 3px double rgba(74, 63, 40, 0.35);
}

.heading {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #4a3f28;
  letter-spacing: 0.02em;
  padding-bottom: 6px;
  border-bottom: 2px solid rgba(74, 63, 40, 0.25);
}

.entry {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #33362b;
}

.empty {
  margin: 0;
  font-size: 0.9rem;
  font-style: italic;
  color: #7a715c;
}
```

Create `src/frontend/src/components/Notebook/internal/SymptomsExamPage/SymptomsExamPage.jsx`:

```jsx
import React from 'react';
import PropTypes from 'prop-types';
import { formatHistoryContent } from '../formatDocumentContent';
import styles from './SymptomsExamPage.module.css';

/**
 * @param {object} props
 * @param {Array<{id: string, type: string, title: string, content: (string|Record<string, unknown>|null)}>} props.documents
 */
export function SymptomsExamPage({ documents }) {
  const symptomsDocument = documents.find((doc) => doc.type === 'CLINICAL_SYMPTOMS');
  const examDocuments = documents.filter((doc) => doc.type === 'EXAMINATION_RESULTS');

  return (
    <div className={styles.page}>
      <section className={styles.section}>
        <h3 className={styles.heading}>Symptoms</h3>
        {symptomsDocument ? (
          <p className={styles.entry}>{formatHistoryContent(symptomsDocument.content)}</p>
        ) : (
          <p className={styles.empty}>No symptoms documented yet.</p>
        )}
      </section>
      <section className={styles.section}>
        <h3 className={styles.heading}>Exam Results</h3>
        {examDocuments.length > 0 ? (
          examDocuments.map((doc) => (
            <p key={doc.id} className={styles.entry}>
              <strong>{doc.title}: </strong>
              {formatHistoryContent(doc.content)}
            </p>
          ))
        ) : (
          <p className={styles.empty}>No examinations ordered yet.</p>
        )}
      </section>
    </div>
  );
}

SymptomsExamPage.propTypes = {
  documents: PropTypes.arrayOf(
    PropTypes.shape({
      id: PropTypes.string.isRequired,
      type: PropTypes.string.isRequired,
      title: PropTypes.string.isRequired,
      content: PropTypes.oneOfType([PropTypes.string, PropTypes.object]),
    }),
  ).isRequired,
};
```

Create `src/frontend/src/components/Notebook/internal/SymptomsExamPage/SymptomsExamPage.module.css`:

```css
.page {
  display: flex;
  flex-direction: column;
  flex: 1 1 0;
  min-width: 0;
  box-sizing: border-box;
  gap: 16px;
  padding: 16px;
}

.section {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.heading {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: #4a3f28;
  letter-spacing: 0.02em;
  padding-bottom: 6px;
  border-bottom: 2px solid rgba(74, 63, 40, 0.25);
}

.entry {
  margin: 0;
  font-size: 0.9rem;
  line-height: 1.5;
  color: #33362b;
}

.empty {
  margin: 0;
  font-size: 0.9rem;
  font-style: italic;
  color: #7a715c;
}
```

Create `src/frontend/src/components/Notebook/Notebook.jsx`:

```jsx
import React from 'react';
import { useDocumentTable } from '../Table/providers/DocumentTable';
import { HistoryPage } from './internal/HistoryPage/HistoryPage';
import { SymptomsExamPage } from './internal/SymptomsExamPage/SymptomsExamPage';
import styles from './Notebook.module.css';

export function Notebook() {
  const { documents } = useDocumentTable();

  return (
    <div className={styles.notebook}>
      <HistoryPage documents={documents} />
      <SymptomsExamPage documents={documents} />
    </div>
  );
}
```

Create `src/frontend/src/components/Notebook/Notebook.module.css`:

```css
.notebook {
  display: flex;
  flex-direction: row;
  align-items: stretch;
  flex: 408 1 0;
  min-width: 0;
  box-sizing: border-box;
  background-color: #f7f3e8;
  box-shadow: 0 6px 16px rgba(0, 0, 0, 0.35);
  border-radius: 6px;
  overflow: hidden;
}

@media (max-width: 600px) {
  .notebook {
    flex-direction: column;
  }
}
```

Create `src/frontend/src/components/Notebook/index.js`:

```js
export { Notebook } from './Notebook';
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test -- tests/components/Notebook/Notebook.test.jsx`
Expected: PASS (6 tests).

- [ ] **Step 5: Commit**

```bash
git add src/frontend/src/components/Notebook/ \
        src/frontend/src/tests/components/Notebook/Notebook.test.jsx
git commit -m "feat(notebook): add Notebook component with history and symptoms/exam pages"
```

---

### Task 3: Wire `Notebook` into `TabElem`, remove `Information_2`/`Information_3`

**Files:**

- Modify: `src/frontend/src/components/Table/internal/TabElem/TabElem.jsx`
- Delete: `src/frontend/src/components/Table/internal/TabElem/internal/Information_2/Information_2.jsx`
- Delete: `src/frontend/src/components/Table/internal/TabElem/internal/Information_2/Information_2.module.css`
- Delete: `src/frontend/src/components/Table/internal/TabElem/internal/Information_3/Information_3.jsx`
- Delete: `src/frontend/src/components/Table/internal/TabElem/internal/Information_3/Information_3.module.css`
- Delete: `src/frontend/src/tests/components/Table/internal/TabElem/internal/Information_2/Information_2.test.jsx`
- Delete: `src/frontend/src/tests/components/Table/internal/TabElem/internal/Information_3/Information_3.test.jsx`
- Modify (test): `src/frontend/src/tests/components/Table/internal/TabElem/TabElem.test.jsx`

**Interfaces:**

- Consumes: `Notebook` from Task 2, imported via its barrel `../../../Notebook` (relative to `TabElem.jsx`, i.e. `components/Notebook`).

- [ ] **Step 1: Update the failing test first**

Replace `src/frontend/src/tests/components/Table/internal/TabElem/TabElem.test.jsx` with:

```jsx
import React from 'react';
import { render, screen } from '@testing-library/react';
import { TabElem } from '../../../../../components/Table/internal/TabElem/TabElem';
import styles from '../../../../../components/Table/internal/TabElem/TabElem.module.css';
import { DocumentTableContext } from '../../../../../components/Table/providers/DocumentTable/DocumentTableProvider';

function renderWithProviders(ui) {
  return render(
    <DocumentTableContext.Provider value={{ documents: [], patient: null, isLoading: false, error: null }}>
      {ui}
    </DocumentTableContext.Provider>,
  );
}

describe('TabElem', () => {
  it('renders its children alongside Information_1 and the Notebook', () => {
    renderWithProviders(
      <TabElem>
        <span>Extra content</span>
      </TabElem>,
    );

    expect(screen.getByText('Patient Information')).toBeInTheDocument();
    expect(screen.getByText('History')).toBeInTheDocument();
    expect(screen.getByText('Symptoms')).toBeInTheDocument();
    expect(screen.getByText('Exam Results')).toBeInTheDocument();
    expect(screen.getByText('Extra content')).toBeInTheDocument();
  });

  it('applies the tabElem layout class to its root element', () => {
    renderWithProviders(<TabElem data-testid="tabElem-root">content</TabElem>);
    expect(screen.getByTestId('tabElem-root')).toHaveClass(styles.tabElem);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm --filter frontend test -- tests/components/Table/internal/TabElem/TabElem.test.jsx`
Expected: FAIL — `screen.getByText('History')` etc. not found (`TabElem.jsx` still renders `Information_2`/`Information_3`, not `Notebook`).

- [ ] **Step 3: Update `TabElem.jsx` and delete `Information_2`/`Information_3`**

Replace `src/frontend/src/components/Table/internal/TabElem/TabElem.jsx` with:

```jsx
import React from 'react';
import PropTypes from 'prop-types';
import styles from './TabElem.module.css';
import { Information_1 } from './internal/Information_1/Information_1';
import { Notebook } from '../../../Notebook';

export function TabElem({ children, className = '', ...rest }) {
  const rootClassName = className ? `${styles.tabElem} ${className}` : styles.tabElem;

  return (
    <div className={rootClassName} {...rest}>
      <Information_1 />
      <Notebook />
      {children}
    </div>
  );
}

TabElem.propTypes = {
  children: PropTypes.node,
  className: PropTypes.string,
};
```

Delete the old cards and their tests:

```bash
rm -rf src/frontend/src/components/Table/internal/TabElem/internal/Information_2
rm -rf src/frontend/src/components/Table/internal/TabElem/internal/Information_3
rm -rf src/frontend/src/tests/components/Table/internal/TabElem/internal/Information_2
rm -rf src/frontend/src/tests/components/Table/internal/TabElem/internal/Information_3
```

Do **not** modify `TabElem.module.css` — see the "Design decision" section above for why the existing `:where(.tabElem > *)` fallback and `Notebook.module.css`'s own `flex: 408 1 0` already reproduce today's proportions without it.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm --filter frontend test -- tests/components/Table/internal/TabElem`
Expected: PASS (2 tests, `TabElem.test.jsx` only — `Information_2`/`Information_3` test files no longer exist).

- [ ] **Step 5: Run the full frontend test suite to confirm no stale references remain**

Run: `pnpm --filter frontend test`
Expected: PASS — no failures from dangling imports of the deleted `Information_2`/`Information_3` files elsewhere in the tree.

- [ ] **Step 6: Commit**

```bash
git add src/frontend/src/components/Table/internal/TabElem/TabElem.jsx \
        src/frontend/src/tests/components/Table/internal/TabElem/TabElem.test.jsx
git rm -r src/frontend/src/components/Table/internal/TabElem/internal/Information_2 \
          src/frontend/src/components/Table/internal/TabElem/internal/Information_3 \
          src/frontend/src/tests/components/Table/internal/TabElem/internal/Information_2 \
          src/frontend/src/tests/components/Table/internal/TabElem/internal/Information_3
git commit -m "feat(tab-elem): replace Information_2/Information_3 with Notebook"
```

---

### Task 4: Remove the orphaned `Book` component

**Files:**

- Delete: `src/frontend/src/components/Book/Book.jsx`
- Delete: `src/frontend/src/components/Book/Book.module.css`
- Delete: `src/frontend/src/components/Book/index.js`
- Delete: `src/frontend/src/tests/components/Book/Book.test.jsx`

**Interfaces:** None — `components/Book/` has no callers anywhere in the tree (confirmed during research: it is only ever imported by its own test). Its removal is dead-code cleanup, not a behavior change, so this task has no red/green cycle — it's a delete-and-verify step.

- [ ] **Step 1: Confirm there are no other callers before deleting**

Run: `grep -rn "components/Book" src/frontend/src --include=*.jsx --include=*.js | grep -v "src/frontend/src/components/Book/" | grep -v "src/frontend/src/tests/components/Book/"`
Expected: no output (confirms nothing outside `Book`'s own folder and its own test imports it).

- [ ] **Step 2: Delete the component and its test**

```bash
git rm -r src/frontend/src/components/Book src/frontend/src/tests/components/Book
```

- [ ] **Step 3: Run the full frontend test suite**

Run: `pnpm --filter frontend test`
Expected: PASS — no failures from the removal (nothing else referenced `Book`).

- [ ] **Step 4: Commit**

```bash
git commit -m "chore(book): remove orphaned Book component, absorbed into Notebook"
```

---

## Final verification

- [ ] Run `pnpm --filter frontend test` — full frontend suite green.
- [ ] Run `pnpm --filter frontend lint` — no lint errors (unused `Information_2`/`Information_3`/`Book` imports, PropTypes on new components).
- [ ] Manually confirm (via `pnpm dev` or existing dev workflow) that the desk shows `Information_1` alongside the new two-page `Notebook`, with `Information_1` unaffected, and that switching between a case with no exam results and one with `EXAMINATION_RESULTS` documents shows the empty state vs. the real entries.
