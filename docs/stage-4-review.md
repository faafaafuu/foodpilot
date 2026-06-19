# Stage 4 Review

Date: 2026-06-19

## Scope

Stage 4 adds the calorie tracker API:

- set daily calorie and macro goals;
- add a dish meal by `dishId` or `dishSlug`;
- add a standalone product;
- calculate consumed calories;
- calculate remaining daily calories;
- calculate daily protein, fat, and carbs;
- return meal history for a day.

## Graphify Context

Graphify was updated before edits and used to inspect the current Prisma, profile API, and app module structure.

Related files:

- `apps/api/src/app.module.ts`
- `apps/api/src/calories/*`
- `apps/api/test/calories.service.spec.ts`
- `prisma/schema.prisma`
- `README.md`

## API Routes

- `POST /calories/:userId/goals`
- `POST /calories/:userId/meals`
- `POST /calories/:userId/products`
- `GET /calories/:userId/today`
- `GET /calories/:userId/daily-summary?date=YYYY-MM-DD`

## Verification

Passed:

- `npm run lint`
- `npm test`
- `npm run build --workspace @foodpilot/api`
- manual API check with local PostgreSQL:
  - set goal: 1800 kcal;
  - logged one serving of lazy cabbage rolls: 430 kcal;
  - logged cottage cheese product: 170 kcal;
  - fetched summary for `2026-06-19`.

Manual summary result:

```json
{
  "dailyLimit": 1800,
  "consumedCalories": 600,
  "remainingCalories": 1200,
  "macros": {
    "proteinGrams": 48,
    "fatGrams": 26,
    "carbGrams": 38
  }
}
```

## Self-Review

- Dish logging uses catalog calories and macros when a dish is provided.
- Product logging supports manual calories and optional macros.
- Daily summary uses the latest calorie goal before the day end; if absent, it falls back to `UserProfile.dailyCalorieLimit`, then `1800`.
- Remaining calories are clamped at zero to avoid negative UI values.
- Date boundaries are UTC-based for MVP predictability. User-local timezone handling should be revisited when mobile/web clients send locale-aware dates.
