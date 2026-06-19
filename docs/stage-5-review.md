# Stage 5 Review

Date: 2026-06-19

## Scope

Stage 5 exposes the base dish and recipe catalog through the API:

- list starter dishes;
- fetch a dish by slug;
- fetch a short recipe;
- fetch ordered recipe ingredients;
- return calories, portions, macros, ingredient quantities, categories, and nutrition hints.

The dish catalog itself was already seeded in Stage 2 through `packages/domain/src/starter-data.ts` and `prisma/seed.ts`.

## Graphify Context

Graphify was updated before edits with:

```bash
GRAPHIFY=/root/job-agent/.venv/bin/graphify make graph
```

The graph was queried for Dish, Recipe, Ingredient, Prisma seed data, NestJS controllers, services, and tests. Related files:

- `packages/domain/src/starter-data.ts`
- `prisma/schema.prisma`
- `prisma/seed.ts`
- `apps/api/src/app.module.ts`
- `apps/api/src/profiles/*`
- `apps/api/src/calories/*`
- `apps/api/test/*`

## API Routes

- `GET /dishes`
- `GET /dishes/:slug`
- `GET /dishes/:slug/recipe`
- `GET /dishes/:slug/ingredients`

## Starter Dishes

The seeded MVP catalog includes:

1. Ленивые голубцы
2. Холодный свекольник
3. Тефтели в томатном соусе
4. Фаршированный перец
5. Тушёная капуста с мясом
6. Суп с фрикадельками
7. Гуляш
8. Щи
9. Борщ
10. Окрошка без яиц

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

- `GET /dishes` returned 10 starter dishes.
- `GET /dishes/lazy-cabbage-rolls/recipe` returned the short recipe, 8 servings, 430 kcal per serving, and ordered ingredients.
- `GET /dishes/cold-beet-soup/ingredients` returned ordered ingredients for the egg-free cold beet soup.

## Self-Review

- Stage 5 is intentionally read-only: dish creation and recipe editing are not required for MVP user flow yet.
- Recipe ingredients are ordered by `sortOrder` to keep cooking instructions and grocery list generation predictable.
- The API returns structured ingredient category and measurement data so Stage 7 can build grocery lists without reparsing recipe text.
- No store-ordering behavior is introduced here; order confirmation safety remains unchanged.
