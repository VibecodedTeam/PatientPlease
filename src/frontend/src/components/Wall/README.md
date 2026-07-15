# Wall: known data-passing gap (handbook shelf)

Flagged during the RoundProvider data-passing code review (2026-07-12). Not fixed here —
this is analysis only, per explicit instruction to flag rather than change behavior yet.

## The bug

`Wall` never shows a real purchased handbook. The shelf always renders `mockBooks`
(`./mockBooks.js`), specifically the entries with `bought: true` — which is 6 of the 7 mock
books, regardless of what the player has actually bought in the night shop.

Two independent failures compound here:

1. **Nothing passes `Wall` its data.** `Wall({ books })` (`Wall.jsx:49`) falls back to
   `mockBooks` whenever `books` is `undefined`. `MainView.jsx` renders `<Wall />` with zero
   props (no `books` at all), so the fallback fires on every render, forever.
2. **Even if something did pass data, the shape wouldn't match.** `Wall`'s own `bookShape`
   (`Wall.jsx:34`) requires `{ id, title, category, description, hint, bought }`. The real
   purchased-item data — `round.ownedItems`, from `POST /api/v1/round` — is shaped like:

   ```jsonc
   {
     "id": "uuid",
     "shopItem": { "id": "uuid", "sku": "...", "name": "Handbook", "description": "...",
                   "itemType": "HANDBOOK", "iconImageUrl": "..." },
     "purchasePrice": 100,
     "purchasedOnDay": 2,
     "purchasedAt": "iso-datetime",
     "isEquipped": false
   }
   ```

   There's no `title`, `category`, or `hint` field anywhere in that shape — `shopItem.name`
   is the closest analog to `title`, `shopItem.itemType` to `category`, and nothing maps to
   `hint` at all. There's also no `bought` field, because `ownedItems` only ever contains
   items the player *has* bought — unlike `mockBooks`, which deliberately mixes bought and
   not-yet-bought entries to demonstrate the locked/unlocked shelf states.

   So this isn't a one-line "just pass `round.ownedItems` down as `books`" fix — an adapter
   function has to translate one shape into the other first, and `hint` (a gameplay-relevant
   field: "the medical hint show once a handbook is owned) doesn't exist on the backend's
   `ShopItem` model at all yet, so today there is no source data for it.

## Compare: `Information_1`, a working example of the same kind of data

`Information_1` (`components/Table/internal/TabElem/internal/Information_1/Information_1.jsx`)
solves the equivalent problem — "show real per-player data instead of a placeholder" — the
way every other desk component does, and it works correctly:

```jsx
export function Information_1({ title = 'Patient Information', className = '', ...rest }) {
  const { patient } = useDocumentTable();
  const patientName = patient?.name ?? 'Jane Doe';
  // ...
}
```

The difference that matters: **`Information_1` fetches its own data from a domain hook.** It
calls `useDocumentTable()` directly, so it always reflects whatever `RoundProvider` currently
holds — no parent component has to remember to thread anything through as a prop, and there's
no opportunity for the wiring to be silently forgotten. `patient` falls back to a placeholder
(`'Jane Doe'`) only in the genuinely-still-loading window, not permanently.

`Wall`, by contrast, is written as a "dumb" presentational component that expects its caller
to hand it fully-formed data via a `books` prop — a pattern that only works if every caller
remembers to do that threading correctly. `MainView` doesn't, and nothing catches that at
compile time (`PropTypes.arrayOf(bookShape)` on an optional prop just silently allows
`undefined`). This is exactly the class of bug `Information_1`'s pattern structurally
prevents: there is no "caller forgot to pass it" failure mode when the component pulls its
own data.

## What the real fix would look like (not implemented here)

Mirroring `Information_1`'s pattern:

1. `Wall` calls `useRound()` (or, more consistently with the rest of `Table`'s internals, a
   narrower provider — see CLAUDE.md's Provider Isolation Contract, Section 5) itself,
   instead of accepting a `books` prop.
2. An adapter maps each `ownedItem` with `shopItem.itemType === 'HANDBOOK'` into the shape the
   shelf UI needs (`title: shopItem.name`, `category: shopItem.itemType`, `description:
   shopItem.description`, `bought: true` always, since only owned items are ever in this
   list).
3. `hint` has no backend source yet — either add a field to `ShopItem` (backend schema +
   migration + seed data), or drop `hint` from the shelf UI until that data exists, rather
   than continuing to show a hardcoded placeholder hint for real handbooks.
4. `books` stays as an optional prop for the component's own tests (as `Information_1`-style
   components generally still accept overrides in tests via context providers, not props),
   but production call sites (`MainView`) stop needing to pass anything.

`PATIENTS_LEFT_TODAY` (`Wall.jsx:7`) is a separate, already-acknowledged placeholder and is
intentionally out of scope for this note.
