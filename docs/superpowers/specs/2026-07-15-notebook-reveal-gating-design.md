# Notebook Reveal-Gating — Design

## 1. Problem

The `Notebook` component (`src/frontend/src/components/Notebook/`, added in the previous iteration — see `docs/superpowers/specs/2026-07-15-notebook-design.md`) currently shows every non-image document the backend returns for a case, from the very first `/round` call, split into a "History" left page and a "Symptoms" + "Exam Results" right page. In practice this means all of a case's disease history, UV exposure history, clinical symptoms, and family/weather history are visible to the player immediately, with no dependency on whether the player has actually surfaced that information through the Chat conversation.

The backend already has a dormant mechanism for exactly this: `CaseDocumentReveal` is a join table written by `POST /api/v1/chat` the moment its document-selection step decides a document is relevant to reveal, and `services/round.ts` already uses an equivalent pattern for one document type — `EXAMINATION_RESULTS` documents are only included in `/round`'s response once a matching `CaseExamination` row has `isSuccessful: true`. `CaseDocumentReveal` is written on every relevant chat turn but is never read by anything — `/round` returns every non-exam document unconditionally regardless of reveal state.

This change wires `CaseDocumentReveal` into `/round`'s visibility filter for the five document types the Notebook renders, and restructures the Notebook's two pages around the resulting behavior: the left page becomes a flat "Case Documents" list of whatever has been revealed so far, and the right page becomes "Examinations" — exam results only, dropping the separate "Symptoms" section since `CLINICAL_SYMPTOMS` now folds into the same reveal-gated bucket as history documents.

## 2. Non-goals

- No change to `EXAMINATION_RESULTS` visibility logic — it already works the way this change makes the other five types work, and is left untouched.
- No change to `SKIN_IMAGE` visibility. `PatientScene`'s 3D-model attention points consume `SKIN_IMAGE` documents directly and must keep seeing them unconditionally from the start of the case — that's the physical exam interaction, not something Chat reveals. `SKIN_IMAGE` stays outside the new gate entirely.
- No change to `services/chat.ts`. It already creates `CaseDocumentReveal` rows and returns `revealedDocuments` in its response; this change only makes `/round` (and therefore `RoundProvider`, `DocumentTableProvider`, and `Notebook`) respect rows that table already contains.
- No change to `RoundProvider.revealDocuments` (the client-side merge that appends newly-revealed documents from a chat response into `round.case.documents`). It already does the right thing — appends by id, deduped — and continues to make a freshly-revealed document appear immediately without waiting for the next `/round` refetch.
- No new provider, no new frontend state. `Notebook` still consumes `useDocumentTable()` only.
- No per-type subheadings on the left page (e.g. no separate "History" vs "Symptoms" grouping) — see Section 5.
- No migration: `CaseDocumentReveal` already exists in the schema from the Chat feature; this change only adds a read path in `services/round.ts`.

## 3. Backend change

### 3.1 `src/backend/src/services/round.ts`

Add a `caseDocumentReveal.findMany` call to the existing `Promise.all` in `startRound`, alongside `caseExamination.findMany`:

```ts
const [ownedItems, diagnoses, treatments, successfulExaminations, documentReveals] = await Promise.all([
  prisma.ownedItem.findMany({ /* unchanged */ }),
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
```

Extend `isVisibleDocument` to take the new set and gate the five non-image, non-exam types on it:

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
  // SKIN_IMAGE (and any future always-visible type) falls through here.
  return true;
}
```

`toCaseResponse` gains the new `revealedDocumentIds` parameter and threads it into the `.filter(...)` call exactly as `visibleExaminationShopItemIds` is threaded today. `startRound`'s call to `toCaseResponse(nextCase, visibleExaminationShopItemIds)` becomes `toCaseResponse(nextCase, visibleExaminationShopItemIds, revealedDocumentIds)`.

### 3.2 `RoundPrismaClient` interface

Add, mirroring `ChatPrismaClient`'s existing shape in `services/chat.ts`:

```ts
caseDocumentReveal: {
  findMany(args: {
    where: { gameSessionId: string; caseId: string };
    select: { caseDocumentId: true };
  }): Promise<{ caseDocumentId: string }[]>;
};
```

### 3.3 `docs/api/round.md`

Add a paragraph next to the existing `EXAMINATION_RESULTS` visibility note, documenting that `DISEASE_HISTORY`, `UV_EXPOSURE_HISTORY`, `CLINICAL_SYMPTOMS`, `FAMILY_HISTORY`, and `WEATHER_HISTORY` documents are now only included once a `CaseDocumentReveal` row exists for them (written by `POST /api/v1/chat`), and that `SKIN_IMAGE` remains always visible.

## 4. Frontend change

### 4.1 Component architecture

```
components/Notebook/
├── index.js                          # unchanged: barrel exports Notebook only
├── Notebook.jsx                       # unchanged: passes documents to both pages
├── Notebook.module.css                # unchanged
└── internal/
    ├── CaseDocumentsPage/              # replaces HistoryPage
    │   ├── CaseDocumentsPage.jsx
    │   └── CaseDocumentsPage.module.css
    ├── ExaminationsPage/                # replaces SymptomsExamPage
    │   ├── ExaminationsPage.jsx
    │   └── ExaminationsPage.module.css
    └── formatDocumentContent.js         # unchanged
```

Removed: `internal/HistoryPage/` and `internal/SymptomsExamPage/` (component + styles), and their coverage inside the old `Notebook.test.jsx`.

`Notebook.jsx` changes only its two child imports/usages — `<HistoryPage documents={documents} />` / `<SymptomsExamPage documents={documents} />` become `<CaseDocumentsPage documents={documents} />` / `<ExaminationsPage documents={documents} />`. Everything else in `Notebook.jsx` and `Notebook.module.css` is unchanged.

### 4.2 `CaseDocumentsPage` (left page)

Filters `documents` to a fixed whitelist matching the backend's `REVEAL_GATED_DOCUMENT_TYPES` exactly:

```js
const CASE_DOCUMENT_TYPES = [
  'DISEASE_HISTORY',
  'UV_EXPOSURE_HISTORY',
  'CLINICAL_SYMPTOMS',
  'FAMILY_HISTORY',
  'WEATHER_HISTORY',
];
```

`documents.filter((doc) => CASE_DOCUMENT_TYPES.includes(doc.type))`, rendered as one flat list in array order (the array already arrives sorted by the backend's `sortOrder`) — no per-type subheadings or grouping. Each entry renders `doc.title` + `formatHistoryContent(doc.content)`, identically to how history entries render today. Heading: "Case Documents". Empty state (real literal copy, not fabricated content, consistent with the original Notebook design's empty-state rule): `"No case documents revealed yet."`

This replaces the old `type.includes('HISTORY')` substring filter with an explicit whitelist — deliberately, so the frontend's definition of "case documents" is the same closed list as the backend's `REVEAL_GATED_DOCUMENT_TYPES`, not a substring match that could silently include or exclude a future type.

### 4.3 `ExaminationsPage` (right page)

Keeps exactly today's exam-results filter and rendering (`documents.filter((doc) => doc.type === 'EXAMINATION_RESULTS')`, zero/one/many, title + formatted content) — only the heading and empty-state copy change: heading "Examinations", empty state `"No examinations completed yet."` The "Symptoms" section is deleted entirely (not merged in here) — a `CLINICAL_SYMPTOMS` document now renders on the left page like any other case document.

### 4.4 Styling

No new styling rules beyond renaming: both pages keep the same page/heading/entry/empty CSS Module classes and cream/flexbox styling established in the original Notebook design (Section 5 of the prior spec) — this change doesn't touch layout, colors, or the flex proportions between `Information_1` and `Notebook`.

## 5. Rationale: flat list, no type subheadings

The left page drops the old type-based grouping (formerly "History" as its own section) in favor of one continuous list. Now that reveal timing — not document type — determines what's visible, a fixed set of type-based subheadings would often render empty or in an order that doesn't track how the player actually uncovered the information through conversation. A flat list ordered by the backend's `sortOrder` is simpler to build, simpler to test, and doesn't imply structure (grouping) that reveal-driven content doesn't actually have.

## 6. Testing (TDD, mirrored tree)

### Backend

`src/backend/test/services/round.test.ts`:
- Add `caseDocumentReveal: { findMany: jest.fn<RoundPrismaClient['caseDocumentReveal']['findMany']>() }` to `createMockPrisma()`, defaulting to `mockResolvedValue([])` in `primeHappyPath`.
- Replace the existing `'never filters non-EXAMINATION_RESULTS document types'` test (which asserted no gating for any non-exam type) with `'always includes a SKIN_IMAGE document regardless of CaseDocumentReveal rows'` — same assertion shape, but explicit that it's `SKIN_IMAGE` specifically that stays ungated, not "everything but exams" as before.
- Add `'omits a reveal-gated document (e.g. DISEASE_HISTORY) when no CaseDocumentReveal row exists for it'` and `'includes a reveal-gated document once a CaseDocumentReveal row exists for it'`, following the exact structure of the existing `EXAMINATION_RESULTS` pair of tests (lines 664–729 today): add a second document of a gated type to `makeCase().documents`, assert it's excluded/included as `prisma.caseDocumentReveal.findMany` resolves to `[]` vs `[{ caseDocumentId: <that doc's id> }]`.

### Frontend

- Delete `tests/components/Notebook/internal/HistoryPage` and `tests/components/Notebook/internal/SymptomsExamPage` coverage (there isn't dedicated per-page test today — coverage lives inside `Notebook.test.jsx`, per the original design's testing approach).
- Rewrite `tests/components/Notebook/Notebook.test.jsx`: replace `"History"`/`"Symptoms"`/`"Exam Results"` heading assertions with `"Case Documents"`/`"Examinations"`; replace the old separate history/symptoms test cases with cases proving all five gated types render in the flat left-page list (at minimum two different types together, to prove there's no grouping/subheading between them) and that `CLINICAL_SYMPTOMS` no longer gets a distinct "Symptoms" heading; update empty-state assertions to the new copy; keep the existing multi-exam-result test case as-is (unaffected).
- `formatDocumentContent.test.js` is untouched — the helper itself doesn't change.

## 7. Out of scope / follow-ups

- No change to how Chat decides which documents are relevant to reveal (`buildDocumentSelectionPrompt` / `selectDocumentIds` in `services/chat.ts`) — this change only makes `/round` respect the reveals Chat already records.
- No handling for a case that has zero chat-revealable documents at all (a data-authoring concern, not a code concern) — the empty state covers it.
- No retroactive reveal for existing in-progress sessions/rows — this only affects future `/round` responses; if a session already has a `CaseDocumentReveal` row for a document (from prior chat activity before this change), it will simply already be visible once this ships.
