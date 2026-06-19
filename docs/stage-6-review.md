# Stage 6 Review

Date: 2026-06-19

## Scope

Stage 6 adds a rule-based meal recommendation engine:

- recommends 3-5 dishes;
- ranks by remaining calories;
- uses favorite dishes and meal-prep preferences;
- considers weekly budget tier;
- excludes disliked products and hard restrictions by dish/ingredient text;
- explains why each dish was suggested;
- builds a simple weekly lunch/dinner menu from ranked recommendations.

## Graphify Context

Graphify was updated before edits with:

```bash
GRAPHIFY=/root/job-agent/.venv/bin/graphify make graph
```

The graph was queried for recommendation, user taste memory, calories, profiles, dishes, and tests. Related files:

- `apps/api/src/profiles/*`
- `apps/api/src/calories/*`
- `apps/api/src/dishes/*`
- `apps/api/src/app.module.ts`
- `prisma/schema.prisma`
- `packages/domain/src/starter-data.ts`
- `apps/api/test/*`

## API Routes

- `GET /recommendations/:userId/dishes?remainingCalories=1200&limit=5`
- `GET /recommendations/:userId/week?days=7`

## Behavior

- Disliked products and hard restrictions remove matching dishes before ranking.
- Favorite dishes receive a strong score boost.
- Dishes sharing ingredients with favorite catalog dishes receive a smaller similarity boost.
- Meal-prep friendly dishes receive a boost when the profile prefers cooking for several days.
- Dishes over the calorie remainder can still appear only if needed, but include a warning and lower score.

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

- `GET /recommendations/:userId/dishes?remainingCalories=1200&limit=5` returned 5 ranked dishes with lazy cabbage rolls and cold beet soup first.
- `GET /recommendations/:userId/week?days=7` returned a 7-day lunch/dinner menu and grocery candidate dish slugs.
- Seed restrictions for eggs, porridge, and avocado did not surface restricted products in the returned starter recommendations.

## Self-Review

- This is deterministic and debuggable, which is preferable before the AI layer starts calling recommendation tools.
- The engine is intentionally separated from the LLM layer so providers can change later without changing recommendation rules.
- Weekly menu generation is minimal: lunch/dinner rotation from ranked dishes. Portion tuning by meal slot should be expanded after grocery-list generation exists.
