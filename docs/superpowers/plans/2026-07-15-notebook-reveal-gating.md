# Notebook Reveal-Gating Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make `GET /api/v1/round` only return `DISEASE_HISTORY`, `UV_EXPOSURE_HISTORY`, `CLINICAL_SYMPTOMS`, `FAMILY_HISTORY`, and `WEATHER_HISTORY` documents once a `CaseDocumentReveal` row exists for them (mirroring how `EXAMINATION_RESULTS` already works), and restructure the `Notebook` component's two pages around that: a flat "Case Documents" left page and an exam-only "Examinations" right page.

**Architecture:** Backend: add one more `Promise.all` query (`caseDocumentReveal.findMany`) to `startRound` in `services/round.ts`, thread the resulting id set through `isVisibleDocument`/`toCaseResponse` exactly the way `visibleExaminationShopItemIds` already threads through today. Frontend: replace `Notebook`'s two internal page components (`HistoryPage`, `SymptomsExamPage`) with two renamed ones (`CaseDocumentsPage`, `ExaminationsPage`) that filter by an explicit type whitelist instead of a substring match, with no new provider or state — `Notebook` still consumes `useDocumentTable()` only.

**Tech Stack:** Backend: TypeScript, Fastify, Prisma, Jest (`ts-jest`, `@jest/globals`). Frontend: React (JSX), Jest + React Testing Library, CSS Modules.

**Full design spec:** `docs/superpowers/specs/2026-07-15-notebook-reveal-gating-design.md` — read this if any task instruction below seems to conflict with it; the spec is authoritative on intent, this plan is authoritative on exact steps/code.

## Global Constraints

- The reveal-gated type list is exactly these five strings, in this order, and must be character-identical between the backend `REVEAL_GATED_DOCUMENT_TYPES` set and the frontend `CASE_DOCUMENT_TYPES` array: `DISEASE_HISTORY`, `UV_EXPOSURE_HISTORY`, `CLINICAL_SYMPTOMS`, `FAMILY_HISTORY`, `WEATHER_HISTORY`.
- `EXAMINATION_RESULTS` visibility logic (gated on `CaseExamination.isSuccessful`) does not change at all.
- `SKIN_IMAGE` (and any other type not in the five above and not `EXAMINATION_RESULTS`) stays unconditionally visible — it is not chat-reveal-gated.
- No change to `src/backend/src/services/chat.ts`, no change to `RoundProvider.revealDocuments`, no new frontend provider, no new frontend state. `Notebook.jsx` continues to consume `useDocumentTable()` only.
- No per-type subheadings/grouping on the left page — it is one flat list in the array's incoming order (already sorted by the backend's `sortOrder`).
- No Prisma migration — `CaseDocumentReveal` already exists in the schema from the Chat feature; this only adds a read path.
- Exact copy strings (do not paraphrase): left-page heading `"Case Documents"`, left-page empty state `"No case documents revealed yet."`; right-page heading `"Examinations"`, right-page empty state `"No examinations completed yet."`.
- Backend is TypeScript only (`src/backend/src` has no `.js` source); frontend is JavaScript only (`src/frontend/src` has no `.ts`/`.tsx`), with PropTypes on components (CLAUDE.md Section 1).
- TDD is mandatory: write the failing test before the implementation, for both tasks (CLAUDE.md Section 8).
- Frontend tests live in the mirrored `src/frontend/src/tests/` tree, never co-located with source (CLAUDE.md Section 1, Section 6). Backend tests live in `src/backend/test/`.
- `Notebook`'s barrel (`components/Notebook/index.js`) still exports only `Notebook` — internal page components are never imported from outside `components/Notebook/`.

---

### Task 1: Backend — gate the five document types on `CaseDocumentReveal`

**Files:**
- Modify: `src/backend/src/services/round.ts`
- Modify: `src/backend/test/services/round.test.ts`
- Modify: `docs/api/round.md`

**Interfaces:**
- Consumes: existing `RoundPrismaClient`, `CaseDocumentRecord`, `CaseRecord`, `RoundResponse` types already defined in `services/round.ts` (read in full before editing — this task only adds to them, it does not restructure anything else in the file).
- Produces: `RoundPrismaClient['caseDocumentReveal']` (a new sub-interface: `findMany(args: { where: { gameSessionId: string; caseId: string }; select: { caseDocumentId: true } }): Promise<{ caseDocumentId: string }[]>`), and the exported constant/behavior that `startRound`'s response gates the five listed document types on rows returned from it. Task 2 (frontend) does not consume anything from this task directly — the two tasks are independent — but its `CASE_DOCUMENT_TYPES` whitelist must stay textually identical to this task's `REVEAL_GATED_DOCUMENT_TYPES`.

- [ ] **Step 1: Write the failing/updated tests in `src/backend/test/services/round.test.ts`**

  1a. In `createMockPrisma()` (around line 18-47), add a `caseDocumentReveal` mock alongside the existing `caseExamination` one:

  ```ts
      caseExamination: {
        findMany: jest.fn<RoundPrismaClient['caseExamination']['findMany']>(),
      },
      caseDocumentReveal: {
        findMany: jest.fn<RoundPrismaClient['caseDocumentReveal']['findMany']>(),
      },
  ```

  1b. In `primeHappyPath` (around line 489-518), add a default resolved value right after the existing `prisma.caseExamination.findMany.mockResolvedValue([]);` line:

  ```ts
      prisma.caseExamination.findMany.mockResolvedValue([]);
      prisma.caseDocumentReveal.findMany.mockResolvedValue([]);
  ```

  1c. Replace the entire `'never filters non-EXAMINATION_RESULTS document types'` test (currently lines 753-761) with:

  ```ts
    it('always includes a SKIN_IMAGE document regardless of CaseDocumentReveal rows', async () => {
      const prisma = createMockPrisma();
      primeHappyPath(prisma);
      prisma.caseExamination.findMany.mockResolvedValue([]);
      prisma.caseDocumentReveal.findMany.mockResolvedValue([]);

      const result = await startRound(prisma, 'user-uuid');

      expect(result.case.documents.map((document) => document.id)).toEqual(['document-uuid']);
    });
  ```

  (`makeCase()`'s default document is `id: 'document-uuid'`, `type: 'SKIN_IMAGE'` — this proves it survives with zero reveal rows.)

  1d. Add these two new tests directly after it, following the exact structure of the existing `EXAMINATION_RESULTS` pair (lines 664-729):

  ```ts
    it('omits a reveal-gated document (e.g. DISEASE_HISTORY) when no CaseDocumentReveal row exists for it', async () => {
      const prisma = createMockPrisma();
      primeHappyPath(prisma);
      prisma.case.findMany.mockResolvedValue([
        makeCase({
          documents: [
            ...makeCase().documents,
            {
              id: 'history-doc-uuid',
              attentionPointRegion: null,
              type: 'DISEASE_HISTORY',
              title: 'Disease history',
              documentDate: null,
              sortOrder: 2,
              imageUrl: null,
              imageWidthPx: null,
              imageHeightPx: null,
              imageAltText: null,
              content: { pastDiagnoses: 'None' },
            },
          ],
        }),
      ]);
      prisma.caseDocumentReveal.findMany.mockResolvedValue([]);

      const result = await startRound(prisma, 'user-uuid');

      expect(prisma.caseDocumentReveal.findMany).toHaveBeenCalledWith({
        where: { gameSessionId: 'session-uuid', caseId: 'case-uuid' },
        select: { caseDocumentId: true },
      });
      expect(result.case.documents.map((document) => document.id)).toEqual(['document-uuid']);
    });

    it('includes a reveal-gated document once a CaseDocumentReveal row exists for it', async () => {
      const prisma = createMockPrisma();
      primeHappyPath(prisma);
      prisma.case.findMany.mockResolvedValue([
        makeCase({
          documents: [
            ...makeCase().documents,
            {
              id: 'history-doc-uuid',
              attentionPointRegion: null,
              type: 'DISEASE_HISTORY',
              title: 'Disease history',
              documentDate: null,
              sortOrder: 2,
              imageUrl: null,
              imageWidthPx: null,
              imageHeightPx: null,
              imageAltText: null,
              content: { pastDiagnoses: 'None' },
            },
          ],
        }),
      ]);
      prisma.caseDocumentReveal.findMany.mockResolvedValue([{ caseDocumentId: 'history-doc-uuid' }]);

      const result = await startRound(prisma, 'user-uuid');

      expect(result.case.documents.map((document) => document.id)).toEqual([
        'document-uuid',
        'history-doc-uuid',
      ]);
    });
  ```

- [ ] **Step 2: Run the tests to verify they fail**

  Run: `cd src/backend && node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand test/services/round.test.ts`
  Expected: FAIL — either a TypeScript compile error (`Property 'caseDocumentReveal' does not exist on type 'RoundPrismaClient'`) since the interface doesn't have it yet, or (once that's visible) assertion failures because `startRound` doesn't call `caseDocumentReveal.findMany` and doesn't gate `DISEASE_HISTORY`. Confirm the failure is about the missing interface member / missing gating, not a typo in the test itself.

- [ ] **Step 3: Implement the minimal `services/round.ts` changes**

  3a. Add `caseDocumentReveal` to the `RoundPrismaClient` interface, immediately after the existing `caseExamination` block:

  ```ts
    caseExamination: {
      findMany(args: {
        where: { gameSessionId: string; caseId: string; isSuccessful: true };
        select: { shopItemId: true };
      }): Promise<{ shopItemId: string }[]>;
    };
    caseDocumentReveal: {
      findMany(args: {
        where: { gameSessionId: string; caseId: string };
        select: { caseDocumentId: true };
      }): Promise<{ caseDocumentId: string }[]>;
    };
  ```

  3b. Replace the existing `isVisibleDocument` function with:

  ```ts
  const REVEAL_GATED_DOCUMENT_TYPES = new Set([
    'DISEASE_HISTORY',
    'UV_EXPOSURE_HISTORY',
    'CLINICAL_SYMPTOMS',
    'FAMILY_HISTORY',
    'WEATHER_HISTORY',
  ]);

  function isVisibleDocument(
    document: CaseDocumentRecord,
    visibleExaminationShopItemIds: Set<string>,
    revealedDocumentIds: Set<string>,
  ): boolean {
    if (document.type === 'EXAMINATION_RESULTS') {
      const shopItemId = (document.content as { shopItemId?: string } | null)?.shopItemId;
      return shopItemId !== undefined && visibleExaminationShopItemIds.has(shopItemId);
    }
    if (REVEAL_GATED_DOCUMENT_TYPES.has(document.type)) {
      return revealedDocumentIds.has(document.id);
    }
    return true;
  }
  ```

  3c. Update `toCaseResponse` to accept and thread the new set:

  ```ts
  function toCaseResponse(
    record: CaseRecord,
    visibleExaminationShopItemIds: Set<string>,
    revealedDocumentIds: Set<string>,
  ): RoundResponse['case'] {
    return {
      id: record.id,
      difficulty: record.difficulty,
      moneyReward: record.moneyReward,
      moneyPenalty: record.moneyPenalty,
      patient: {
        id: record.patient.id,
        name: record.patient.name,
        age: record.patient.age,
        sex: record.patient.sex,
        occupation: record.patient.occupation,
        portraitImageUrl: record.patient.portraitImageUrl,
        bodyModelVariant: record.patient.bodyModelVariant,
      },
      documents: record.documents
        .filter((document) =>
          isVisibleDocument(document, visibleExaminationShopItemIds, revealedDocumentIds),
        )
        .map((document) => ({
          id: document.id,
          attentionPointRegion: document.attentionPointRegion,
          type: document.type,
          title: document.title,
          documentDate: document.documentDate,
          sortOrder: document.sortOrder,
          imageUrl: document.imageUrl,
          imageWidthPx: document.imageWidthPx,
          imageHeightPx: document.imageHeightPx,
          imageAltText: document.imageAltText,
          content: document.content,
        })),
    };
  }
  ```

  3d. In `startRound`, extend the `Promise.all` and thread the new set through to `toCaseResponse`:

  ```ts
    const [ownedItems, diagnoses, treatments, successfulExaminations, documentReveals] = await Promise.all([
      prisma.ownedItem.findMany({
        where: { gameSessionId: session.id },
        include: { shopItem: true },
        orderBy: { purchasedAt: 'asc' },
      }),
      prisma.diagnosis.findMany({ orderBy: { name: 'asc' } }),
      prisma.treatment.findMany({ orderBy: { name: 'asc' } }),
      prisma.caseExamination.findMany({
        where: { gameSessionId: session.id, caseId: nextCase.id, isSuccessful: true },
        select: { shopItemId: true },
      }),
      prisma.caseDocumentReveal.findMany({
        where: { gameSessionId: session.id, caseId: nextCase.id },
        select: { caseDocumentId: true },
      }),
    ]);
    const visibleExaminationShopItemIds = new Set(
      successfulExaminations.map((examination) => examination.shopItemId),
    );
    const revealedDocumentIds = new Set(documentReveals.map((reveal) => reveal.caseDocumentId));

    return {
      gameSession: toGameSessionResponse(session),
      ownedItems: ownedItems.map(toOwnedItemResponse),
      case: toCaseResponse(nextCase, visibleExaminationShopItemIds, revealedDocumentIds),
      diagnosisOptions: selectDiagnosisOptions(diagnoses, nextCase.correctDiagnosisId).map(
        toDiagnosisResponse,
      ),
      treatmentOptions: treatments.map(toTreatmentResponse),
      dayLog: { elapsedMs, dayNumber: openDayLog.dayNumber },
    };
  ```

  (Only the destructured array, the two `new Set(...)` lines, and the `case:` line inside the returned object change — everything else in `startRound` is unchanged.)

- [ ] **Step 4: Run the tests to verify they pass**

  Run: `cd src/backend && node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand test/services/round.test.ts`
  Expected: PASS, all tests in the file green (including the untouched `EXAMINATION_RESULTS` and other `startRound` tests — this proves the new parameter didn't regress existing behavior).

  Also run the full backend suite to catch any other test file that constructs a `RoundPrismaClient` mock or calls `toCaseResponse`/`isVisibleDocument` directly: `cd src/backend && node --experimental-vm-modules ./node_modules/jest/bin/jest.js --runInBand`
  Expected: PASS (requires a reachable test Postgres per `src/backend/test/setup/`; if unavailable in this environment, at minimum confirm no other file references `services/round.ts`'s internals via `grep -rn "caseExamination\|toCaseResponse\|isVisibleDocument" src/backend/test`).

- [ ] **Step 5: Update `docs/api/round.md`**

  Immediately after the existing paragraph about `EXAMINATION_RESULTS` visibility (the one starting "A `documents` entry of `type: "EXAMINATION_RESULTS"` is only included once..."), add:

  ```md
  A `documents` entry of type `DISEASE_HISTORY`, `UV_EXPOSURE_HISTORY`, `CLINICAL_SYMPTOMS`,
  `FAMILY_HISTORY`, or `WEATHER_HISTORY` is only included once a `CaseDocumentReveal` row exists
  for `(this session, this case, this document)` — written by `POST /api/v1/chat` when its
  document-selection step decides that document is relevant to the conversation. `SKIN_IMAGE`
  remains always visible regardless of reveal state, since `PatientScene`'s 3D-model attention
  points consume it directly as part of the physical exam, not as something Chat reveals.
  ```

- [ ] **Step 6: Commit**

  ```bash
  git add src/backend/src/services/round.ts src/backend/test/services/round.test.ts docs/api/round.md
  git commit -m "feat(backend/round): gate five document types on CaseDocumentReveal"
  ```

---

### Task 2: Frontend — restructure `Notebook` into `CaseDocumentsPage` + `ExaminationsPage`

**Files:**
- Create: `src/frontend/src/components/Notebook/internal/CaseDocumentsPage/CaseDocumentsPage.jsx`
- Create: `src/frontend/src/components/Notebook/internal/CaseDocumentsPage/CaseDocumentsPage.module.css`
- Create: `src/frontend/src/components/Notebook/internal/ExaminationsPage/ExaminationsPage.jsx`
- Create: `src/frontend/src/components/Notebook/internal/ExaminationsPage/ExaminationsPage.module.css`
- Delete: `src/frontend/src/components/Notebook/internal/HistoryPage/HistoryPage.jsx`
- Delete: `src/frontend/src/components/Notebook/internal/HistoryPage/HistoryPage.module.css`
- Delete: `src/frontend/src/components/Notebook/internal/SymptomsExamPage/SymptomsExamPage.jsx`
- Delete: `src/frontend/src/components/Notebook/internal/SymptomsExamPage/SymptomsExamPage.module.css`
- Modify: `src/frontend/src/components/Notebook/Notebook.jsx`
- Modify: `src/frontend/src/tests/components/Notebook/Notebook.test.jsx`
- Unmodified (do not touch): `src/frontend/src/components/Notebook/internal/formatDocumentContent.js`, `src/frontend/src/tests/components/Notebook/internal/formatDocumentContent.test.js`, `src/frontend/src/components/Notebook/index.js`, `src/frontend/src/components/Notebook/Notebook.module.css`

**Interfaces:**
- Consumes: `formatHistoryContent` from `../formatDocumentContent` (already defined, signature `(content: string | Record<string, unknown> | null | undefined) => string`); `useDocumentTable()` from `../Table/providers/DocumentTable` (already defined, returns `{ documents, patient, isLoading, error }`); `DocumentTableContext` from `../../../components/Table/providers/DocumentTable/DocumentTableProvider` (test-only, already used by the existing test file).
- Produces: `CaseDocumentsPage({ documents })` and `ExaminationsPage({ documents })`, each a plain function component taking the same `documents` prop shape the old `HistoryPage`/`SymptomsExamPage` took (`Array<{id, type, title, content}>`). Neither is exported from `components/Notebook/index.js` — they stay internal, consumed only by `Notebook.jsx`.

- [ ] **Step 1: Write the failing test — rewrite `src/frontend/src/tests/components/Notebook/Notebook.test.jsx` in full**

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
    it('renders all five reveal-gated document types as a flat list on the left page, with no subheadings', () => {
      const { container } = renderWithDocumentTable([
        {
          id: 'd1',
          type: 'UV_EXPOSURE_HISTORY',
          title: 'Sun exposure history',
          content: { sunbedUse: 'frequent', occupationalExposure: 'high' },
        },
        {
          id: 'd2',
          type: 'CLINICAL_SYMPTOMS',
          title: 'Symptoms',
          content: { description: 'Itching and bleeding for the past week.' },
        },
      ]);

      expect(screen.getByText('Case Documents')).toBeInTheDocument();
      expect(screen.queryByText('History')).not.toBeInTheDocument();
      expect(screen.queryByText('Symptoms')).not.toBeInTheDocument();
      expect(container.textContent).toContain('Sun exposure history:');
      expect(container.textContent).toContain('Sunbed Use: frequent');
      expect(container.textContent).toContain('Occupational Exposure: high');
      expect(container.textContent).toContain('Symptoms: Itching and bleeding for the past week.');
    });

    it('renders DISEASE_HISTORY, FAMILY_HISTORY, and WEATHER_HISTORY documents on the left page', () => {
      const { container } = renderWithDocumentTable([
        { id: 'd3', type: 'DISEASE_HISTORY', title: 'Disease history', content: 'None reported.' },
        { id: 'd4', type: 'FAMILY_HISTORY', title: 'Family history', content: 'Father: melanoma.' },
        { id: 'd5', type: 'WEATHER_HISTORY', title: 'Weather history', content: 'High UV index region.' },
      ]);

      expect(container.textContent).toContain('Disease history: None reported.');
      expect(container.textContent).toContain('Family history: Father: melanoma.');
      expect(container.textContent).toContain('Weather history: High UV index region.');
    });

    it('shows the empty state when there are no case documents', () => {
      renderWithDocumentTable([]);
      expect(screen.getByText('No case documents revealed yet.')).toBeInTheDocument();
    });

    it('renders every exam results document, including multiple results', () => {
      const { container } = renderWithDocumentTable([
        {
          id: 'd6',
          type: 'EXAMINATION_RESULTS',
          title: 'Dermoscopy',
          content: { finding: 'Irregular pigment network' },
        },
        {
          id: 'd7',
          type: 'EXAMINATION_RESULTS',
          title: 'Biopsy',
          content: { finding: 'Atypical melanocytes' },
        },
      ]);

      expect(screen.getByText('Examinations')).toBeInTheDocument();
      expect(container.textContent).toContain('Dermoscopy: Irregular pigment network');
      expect(container.textContent).toContain('Biopsy: Atypical melanocytes');
    });

    it('shows the empty state when no examinations have been completed', () => {
      renderWithDocumentTable([]);
      expect(screen.getByText('No examinations completed yet.')).toBeInTheDocument();
    });
  });
  ```

- [ ] **Step 2: Run the test to verify it fails**

  Run: `cd src/frontend && npx jest tests/components/Notebook/Notebook.test.jsx`
  Expected: FAIL — the current `Notebook` still renders `"History"` / `"Symptoms"` / `"Exam Results"` headings and the old empty-state copy, so `screen.getByText('Case Documents')` etc. do not find matches.

- [ ] **Step 3: Create `CaseDocumentsPage`**

  `src/frontend/src/components/Notebook/internal/CaseDocumentsPage/CaseDocumentsPage.jsx`:

  ```jsx
  import React from 'react';
  import PropTypes from 'prop-types';
  import { formatHistoryContent } from '../formatDocumentContent';
  import styles from './CaseDocumentsPage.module.css';

  const CASE_DOCUMENT_TYPES = [
    'DISEASE_HISTORY',
    'UV_EXPOSURE_HISTORY',
    'CLINICAL_SYMPTOMS',
    'FAMILY_HISTORY',
    'WEATHER_HISTORY',
  ];

  /**
   * @param {object} props
   * @param {Array<{id: string, type: string, title: string, content: (string|Record<string, unknown>|null)}>} props.documents
   */
  export function CaseDocumentsPage({ documents }) {
    const caseDocuments = documents.filter((doc) => CASE_DOCUMENT_TYPES.includes(doc.type));

    return (
      <div className={styles.page}>
        <h3 className={styles.heading}>Case Documents</h3>
        {caseDocuments.length > 0 ? (
          caseDocuments.map((doc) => (
            <p key={doc.id} className={styles.entry}>
              <strong>{doc.title}: </strong>
              {formatHistoryContent(doc.content)}
            </p>
          ))
        ) : (
          <p className={styles.empty}>No case documents revealed yet.</p>
        )}
      </div>
    );
  }

  CaseDocumentsPage.propTypes = {
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

  `src/frontend/src/components/Notebook/internal/CaseDocumentsPage/CaseDocumentsPage.module.css` (identical to the deleted `HistoryPage.module.css` — same layout/colors, per spec Section 4.4):

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

- [ ] **Step 4: Create `ExaminationsPage`**

  `src/frontend/src/components/Notebook/internal/ExaminationsPage/ExaminationsPage.jsx`:

  ```jsx
  import React from 'react';
  import PropTypes from 'prop-types';
  import { formatHistoryContent } from '../formatDocumentContent';
  import styles from './ExaminationsPage.module.css';

  /**
   * @param {object} props
   * @param {Array<{id: string, type: string, title: string, content: (string|Record<string, unknown>|null)}>} props.documents
   */
  export function ExaminationsPage({ documents }) {
    const examDocuments = documents.filter((doc) => doc.type === 'EXAMINATION_RESULTS');

    return (
      <div className={styles.page}>
        <h3 className={styles.heading}>Examinations</h3>
        {examDocuments.length > 0 ? (
          examDocuments.map((doc) => (
            <p key={doc.id} className={styles.entry}>
              <strong>{doc.title}: </strong>
              {formatHistoryContent(doc.content)}
            </p>
          ))
        ) : (
          <p className={styles.empty}>No examinations completed yet.</p>
        )}
      </div>
    );
  }

  ExaminationsPage.propTypes = {
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

  `src/frontend/src/components/Notebook/internal/ExaminationsPage/ExaminationsPage.module.css` (same page/heading/entry/empty rules as `CaseDocumentsPage`, minus the `border-right` — this is the rightmost page, exactly like the deleted `SymptomsExamPage.module.css` had no `border-right`):

  ```css
  .page {
    display: flex;
    flex-direction: column;
    flex: 1 1 0;
    min-width: 0;
    box-sizing: border-box;
    gap: 12px;
    padding: 16px;
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

- [ ] **Step 5: Update `Notebook.jsx`**

  Replace the full contents of `src/frontend/src/components/Notebook/Notebook.jsx` with:

  ```jsx
  import React from 'react';
  import { useDocumentTable } from '../Table/providers/DocumentTable';
  import { CaseDocumentsPage } from './internal/CaseDocumentsPage/CaseDocumentsPage';
  import { ExaminationsPage } from './internal/ExaminationsPage/ExaminationsPage';
  import styles from './Notebook.module.css';

  export function Notebook() {
    const { documents } = useDocumentTable();

    return (
      <div className={styles.notebook}>
        <CaseDocumentsPage documents={documents} />
        <ExaminationsPage documents={documents} />
      </div>
    );
  }
  ```

- [ ] **Step 6: Delete the old page components**

  ```bash
  git rm src/frontend/src/components/Notebook/internal/HistoryPage/HistoryPage.jsx \
         src/frontend/src/components/Notebook/internal/HistoryPage/HistoryPage.module.css \
         src/frontend/src/components/Notebook/internal/SymptomsExamPage/SymptomsExamPage.jsx \
         src/frontend/src/components/Notebook/internal/SymptomsExamPage/SymptomsExamPage.module.css
  ```

- [ ] **Step 7: Run the test to verify it passes**

  Run: `cd src/frontend && npx jest tests/components/Notebook/Notebook.test.jsx`
  Expected: PASS, all 6 tests green.

  Also run `cd src/frontend && npx jest tests/components/Notebook` to confirm `formatDocumentContent.test.js` (untouched) still passes alongside it, and `cd src/frontend && npx eslint src/components/Notebook src/tests/components/Notebook --ext .js,.jsx` to confirm no unused-import lint errors from the deleted files.

- [ ] **Step 8: Commit**

  ```bash
  git add src/frontend/src/components/Notebook src/frontend/src/tests/components/Notebook
  git commit -m "feat(notebook): restructure into reveal-gated Case Documents and Examinations pages"
  ```

---

## After both tasks

Both tasks are independent and can be reviewed in either order. Once both are complete and reviewed:
- Confirm `docs/superpowers/specs/2026-07-15-notebook-reveal-gating-design.md`'s Section 6 test list is fully covered (it is, by Task 1 Step 1 and Task 2 Step 1).
- Proceed to the final whole-branch review and `superpowers:finishing-a-development-branch` per the subagent-driven-development skill.
