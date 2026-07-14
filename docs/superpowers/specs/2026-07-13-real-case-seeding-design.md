# Real Case Seeding Pipeline — Design

## 1. Problem

`src/backend/src/db/seed.ts` currently generates 25 fully synthetic cases: patient names, documents, and diagnosis/treatment assignments are all invented in-file, with diagnosis/treatment picked by `i % length` round-robin (no semantic connection between a case's content and its "correct" answer).

We now have ~35 real medical cases (sourced from a Google Doc, in Polish, inconsistent format — some have a clean `{diagnosis, treatment}` tag, some state the diagnosis only in prose, one has no cancer at all, several have multiple bracketed notes and citation links). These need to become real seed data: translated, split into the schema's fixed document categories, mapped to real diagnosis/treatment codes, and paired with real or stock photos.

## 2. Non-goals

- No automated NLP/regex parser for the source text. The format is too inconsistent to trust a deterministic parser with medical accuracy; extraction is done by hand (by Claude), case by case.
- No new Diagnosis/Treatment catalog rows. Real cases map to the **closest existing** of the current 25 diagnoses / 25 treatments (per user decision), even where not a perfect match.
- No backend image-serving route. Images are served as frontend static assets, matching the existing `src/frontend/public/melanoma/` (ISIC dataset) precedent — no new backend infrastructure.
- Citation/source links (PubMed, etc.) are not stored in the database. They're sourcing/review notes only.
- Intermediate narrative beats (e.g. "order a biopsy" before the final diagnosis) are not modeled as separate hints/examinations. Only the final stated diagnosis + treatment become the case's answer key.

## 3. Data flow

```
Google Doc text (pasted, Polish)
  → Claude translates + splits each case into schema-shaped fields, by hand
  → written as a typed data file, src/backend/src/db/data/realCases.ts
  → seed.ts consumes it, resolving Diagnosis/Treatment by code (not round-robin)
  → images referenced by relative path into src/frontend/public/cases/
  → Claude reviews the generated data against schema.prisma constraints before calling it done
```

## 4. New files/folders

- **`src/backend/src/db/data/realCases.ts`** — exports `REAL_CASES: RealCaseSeed[]`. One entry per case:
  ```ts
  type RealCaseSeed = {
    patientName: string
    age: number
    sex: 'MALE' | 'FEMALE' | 'OTHER'
    occupation: string | null
    bodyRegion: BodyRegion
    documents: Array<{ type: CaseDocumentType; content: Record<string, unknown> | null }>
    diagnosisCode: string   // must match an existing Diagnosis.code
    treatmentCode: string | null // null only if genuinely no treatment is indicated by the source
    imageFile: string        // filename only, resolved against /cases/ at seed time
  }
  ```
- **`src/frontend/public/cases/`** — new static folder, sibling to the existing `melanoma/` folder. The user drops real `Case N.jpg` and `STOCK_...` files here using their current filenames (no renaming required).
- **`docs/game-design/case-sourcing-notes.md`** — one entry per case carrying its citation link(s), kept out of the DB.

## 5. Authoring process

For each of the ~35 cases, by hand:

1. Translate the Polish narrative to English.
2. Split the narrative across the `CaseDocumentType`s it actually supports: most get `CLINICAL_SYMPTOMS`; sun/tanning-bed history → `UV_EXPOSURE_HISTORY`; family cancer history → `FAMILY_HISTORY`; prior personal skin-cancer history → `DISEASE_HISTORY`. **Not every case populates every document type** — a type simply isn't created for a case if the source never mentions it, rather than being created with a fabricated/empty content payload.
3. Within a created document's `content`, any specific sub-field the source doesn't mention is explicit `null`, never a placeholder guess. This matches the schema, where `CaseDocument.content`, `Patient.occupation`, and `Case.correctTreatmentId` are already nullable.
4. Take the final stated diagnosis/treatment (ignoring intermediate "order a biopsy"-style notes) and map to the closest existing `Diagnosis.code` / `Treatment.code`.
5. Assign `imageFile`: the matching `Case N.jpg` (numbered by the case's position in the source doc) where a real photo exists, otherwise a `STOCK_...` file whose implied category best matches the mapped diagnosis.
6. Move any citation link to `case-sourcing-notes.md`, keyed by case number.

**Acceptance criterion**: the resulting case set must include both cancer (`MALIGNANT`) and non-cancer (`BENIGN`/other) outcomes, matching the real mix already present in the source material — this isn't extra design work, just a check that it isn't lost during mapping.

## 6. seed.ts changes

- Add `resolveCaseSeedRefs(realCase: RealCaseSeed, catalogs: { diagnoses: Diagnosis[]; treatments: Treatment[] }): { diagnosisId: string; treatmentId: string | null }` — looks up catalog rows by code, throws a clear error naming the case and the missing code if no match exists. Since this is real logic (not just data), it gets a unit test first (mocked catalog arrays: correct resolution, throws on unknown code) per the TDD rule.
- Replace the current per-case `i % length` picks with iteration over `REAL_CASES`, calling `resolveCaseSeedRefs` for each, and building `CaseDocument` rows directly from `realCase.documents` instead of the current hardcoded 3-document shape.
- The existing synthetic-generation code path is removed, not kept as a fallback — `REAL_CASES` becomes the only case source once this lands.

## 7. Verification pass

Once `realCases.ts` is written, before calling the work done, Claude reviews it directly against `schema.prisma`:
- Every `diagnosisCode`/`treatmentCode` resolves to a real catalog entry.
- Every `CaseDocumentType` value used is a real enum member.
- No case violates `@@unique([attentionPointRegion, caseId])`.
- `content` shapes are consistent across all documents sharing the same `CaseDocumentType` (e.g. every `UV_EXPOSURE_HISTORY.content` uses the same key names, `null` where unknown).
- Both cancer and non-cancer outcomes are represented (Section 5's acceptance criterion).

## 8. Testing

Per CLAUDE.md Section 8 (backend TDD):
- `resolveCaseSeedRefs` gets a unit test in `src/backend/test/` using a mocked catalog — no real DB needed, since it's pure lookup logic.
- After `seed.ts` is updated, an existing or new `inject()`-based integration test confirms at least one known real case (by patient name or a stable index) seeds correctly with its expected diagnosis/treatment/document types, against the real test Postgres database.
