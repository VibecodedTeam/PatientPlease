# Patient Notebook — Design

## 1. Problem

The desk currently shows three fixed-layout cards side by side inside `TabElem` (`components/Table/internal/TabElem/`): `Information_1` (patient identity), `Information_2` (general patient story / history documents), `Information_3` (clinical symptoms). `Information_2` and `Information_3` are visually plain cards, not styled to evoke the doctor's notebook the game's framing implies, and neither surfaces exam results — `EXAMINATION_RESULTS` documents (created once the player orders a matching examination via `Phone`) aren't shown anywhere in the UI today.

Separately, an orphaned `components/Book/` component was added but never wired into any view; the backend already has a `BOOK_DOCUMENT_OPENED` gameplay log event type (`docs/api/logs.md`) written in anticipation of it, with no frontend caller.

This design replaces `Information_2` + `Information_3` with a single `Notebook` component, styled as an open book, that also absorbs the intent behind the orphaned `Book` component and surfaces exam results for the first time. `Information_1` is unaffected.

## 2. Non-goals

- No page-turning / pagination interaction. The notebook is a static two-page open-book spread — both pages always visible, same footprint the two cards occupy today.
- No `BOOK_DOCUMENT_OPENED` logging wired up in this change. The backend event type stays dangling; wiring a frontend caller is explicitly out of scope for now.
- No new provider and no direct `useRound()` access. `Notebook` consumes `useDocumentTable()` only, the same domain hook `Information_1/2/3` already use — `DocumentTableProvider` already exposes everything needed (`documents`, including `EXAMINATION_RESULTS` once present).
- No changes to `Diagnose` or `Table.jsx`'s wiring of it — `Diagnose` is a sibling inside `Table`, untouched by this redesign.
- No changes to what data the backend returns — `EXAMINATION_RESULTS` documents already flow through `round.case.documents` once an examination is successfully ordered (per `docs/api/round.md`); this is purely a frontend surface for data that already exists.

## 3. Component architecture

```
components/Notebook/
├── index.js                          # barrel: exports Notebook only
├── Notebook.jsx                       # open-book spread container: left page + right page
├── Notebook.module.css                # book chrome: unified paper color, spine divider (border/gradient — no position:absolute)
└── internal/
    ├── HistoryPage/
    │   ├── HistoryPage.jsx             # left page — history documents
    │   └── HistoryPage.module.css
    ├── SymptomsExamPage/
    │   ├── SymptomsExamPage.jsx        # right page — clinical symptoms (top) + exam results (bottom), stacked
    │   └── SymptomsExamPage.module.css
    └── formatDocumentContent.js        # pure helper: formatKeyLabel + formatHistoryContent, generalized from today's Information_2 so HistoryPage, and SymptomsExamPage's two sections, share one formatter for the `content: string | Record<string, unknown>` shape
```

Removed:
- `components/Book/` (component, styles, barrel) and its test.
- `components/Table/internal/TabElem/internal/Information_2/` and `.../Information_3/` (component, styles) and their tests.

Changed:
- `components/Table/internal/TabElem/TabElem.jsx`: replaces `<Information_2 /><Information_3 />` with `<Notebook />` (imported via `Notebook`'s barrel, not a relative deep-import, consistent with Section 6's isolation rule). `<Information_1 />` and `{children}` are untouched.
- `components/Table/internal/TabElem/TabElem.module.css`: the flex-row layout that gave `Information_2`/`Information_3` each `flex: 1 1 0` now gives `Notebook` the combined space the two cards occupied (`flex: 2 1 0` alongside `Information_1`'s existing flex value) — exact values tuned during implementation to match today's proportions.

`Notebook` consumes `useDocumentTable()` for `documents` only (not `patient` — that stays `Information_1`'s concern).

## 4. Content mapping & empty states

| Page | Section | Source | Empty state |
|---|---|---|---|
| Left (`HistoryPage`) | History | `documents` where `type` includes `"HISTORY"` (`DISEASE_HISTORY`, `UV_EXPOSURE_HISTORY`, `FAMILY_HISTORY`, `WEATHER_HISTORY`) — same predicate as today's `Information_2` | `"No history recorded yet."` |
| Right (`SymptomsExamPage`), top | Clinical symptoms | `documents.find(type === "CLINICAL_SYMPTOMS")` | `"No symptoms documented yet."` |
| Right (`SymptomsExamPage`), bottom | Exam results | `documents.filter(type === "EXAMINATION_RESULTS")` (zero, one, or more — each ordered exam that matched produces its own document) | `"No examinations ordered yet."` |

All three empty states are real, literal copy — not fake placeholder data. This intentionally drops `Information_2`'s old Lorem-ipsum fallback and `Information_3`'s hardcoded `DEFAULT_SYMPTOMS` table: per `docs/game-design/demo-readiness-case-audit.md`, real cases are now backfilled with history documents, so the fallback path is legacy defensiveness rather than an expected state — a plain "not yet available" message is more honest than fabricated sample content if a case is ever missing one.

Each rendered document entry shows its `title` and its `content` run through `formatDocumentContent`'s `formatHistoryContent` (string content rendered as-is; single-key objects rendered as their bare value; multi-key objects rendered as `Label: value; Label: value`), exactly as `Information_2` does today — generalized so `SymptomsExamPage` reuses the same formatter for both symptoms and exam-result content instead of duplicating the logic.

## 5. Styling

- One unified paper/cream page color across both pages (replacing today's distinct olive-green `Information_2` card and blue `Information_3` card), so the two halves read as one book rather than two separate cards.
- A spine divider between the two pages, implemented with a border/box-shadow/gradient on the shared flex boundary — not `position: absolute` (Section 7 hard constraint).
- Section headings ("History", "Symptoms", "Exam Results") provide visual separation within/across pages in place of the old background-color differentiation.
- Layout stays flexbox-based throughout: `Notebook.jsx` is a flex row of two page panels; each page is a flex column of section blocks. No new CSS Modules class introduces `position: absolute`/`fixed`.

## 6. Testing (TDD, mirrored tree)

Removed:
- `tests/components/Book/Book.test.jsx`
- `tests/components/Table/internal/TabElem/internal/Information_2/Information_2.test.jsx`
- `tests/components/Table/internal/TabElem/internal/Information_3/Information_3.test.jsx`

Added, written red-first per Section 8's TDD workflow:
- `tests/components/Notebook/Notebook.test.jsx` — renders `Notebook` wrapped in a raw `DocumentTableContext.Provider` (same pattern the removed `Information_2/3` tests used), asserting: history entries render from `documents`, symptoms render, exam results render (including the multi-result case), and all three empty states render when their respective document(s) are absent.
- `tests/components/Notebook/internal/formatDocumentContent.test.js` — pure unit test of `formatKeyLabel`/`formatHistoryContent` (string content, single key/value, multi key/value), imported directly since a unit's own test may reach past its barrel (Section 6).
- `tests/components/Table/internal/TabElem/TabElem.test.jsx` — updated (or added, if it doesn't already exist) to assert `Notebook` renders instead of `Information_2`/`Information_3`, alongside `Information_1`.

## 7. Out of scope / follow-ups

- Wiring `BOOK_DOCUMENT_OPENED` logging (would need a deliberate "open" interaction — e.g. click-to-expand per entry — which this static-spread design doesn't include; left for a future iteration if the notebook gains that interaction).
- Any provider changes to surface additional `round` data (`dayLog`, `gameSession`, `ownedItems`, `treatmentOptions`) — none of it is needed for this feature.
