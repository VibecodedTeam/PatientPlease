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
