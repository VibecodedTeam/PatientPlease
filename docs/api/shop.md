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
      "owned": false,
      "timeCostMs": null
    }
  ]
}
```

Items are filtered to `isActive: true` and (`unlockDay: null` or `unlockDay <= upcomingDayNumber`)
— locked/inactive items are omitted entirely, never returned with a `locked: true` flag.

`itemType: "EXAMINATION"` items carry a `content: { "timeCostMs": number }` payload. The catalog
never exposes raw `content`, but it does surface the derived `timeCostMs: number` field on every
item — `EXAMINATION` items get their `content.timeCostMs` value, every other item gets
`timeCostMs: null`. This lets the frontend show/know an examination's time cost before ordering
it. Owning an `EXAMINATION` item lets the player order it against a case via
`POST /api/v1/examinations` — see `docs/api/examinations.md`.

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
