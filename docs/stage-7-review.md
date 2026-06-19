# Stage 7 Review

Date: 2026-06-19

## Scope

Stage 7 adds grocery-list generation from selected menu dishes:

- expands dishes into recipe ingredients;
- scales quantities by requested servings;
- merges duplicate ingredients;
- keeps ingredient categories;
- rounds items to available mock-store package sizes;
- estimates total grocery cost from available store products;
- exports a readable text list.

## Graphify Context

Graphify was updated before edits with:

```bash
GRAPHIFY=/root/job-agent/.venv/bin/graphify make graph
```

The graph was queried for grocery list, recipe ingredients, store products, category, package rounding, and export context. Related files:

- `prisma/schema.prisma`
- `prisma/seed.ts`
- `packages/domain/src/starter-data.ts`
- `apps/api/src/dishes/*`
- `apps/api/src/recommendations/*`
- `apps/api/src/app.module.ts`

## API Routes

- `POST /grocery-lists/:userId/from-menu`
- `GET /grocery-lists/:listId`
- `GET /grocery-lists/:listId/export`

Example request:

```json
{
  "title": "Меню на неделю",
  "dishes": [
    { "slug": "lazy-cabbage-rolls", "servings": 8 },
    { "slug": "cold-beet-soup", "servings": 4 }
  ]
}
```

## Behavior

- `quantity` stores the needed cooking amount.
- `package.packageCount` and `package.roundedQuantity` show how much to buy after package rounding.
- `totalEstimatedCents` is calculated from available active store products.
- Export is plain text grouped by category for quick manual shopping.

## Verification

Passed:

- `npm run format`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run prisma:validate`
- `npm run format:check`
- `npm audit --audit-level=high`
- manual API check with local PostgreSQL seed data

Manual API checks:

- `POST /grocery-lists/:userId/from-menu` generated a `READY` list from lazy cabbage rolls and cold beet soup.
- The generated list merged ingredients, rounded packages, and returned `totalEstimatedCents`.
- `GET /grocery-lists/:listId/export` returned a readable category-grouped text export.

## Self-Review

- Stage 7 does not pick specific cart products beyond package-size estimates; that belongs to Store Adapter and Cart Builder stages.
- Unit conversion is intentionally conservative and supports common MVP pairs: grams/kilograms, milliliters/liters, and approximate grams/milliliters for simple grocery packaging.
- The persisted schema does not store item-level price. The list stores the total estimate, while exact line-item prices are deferred to cart building.
