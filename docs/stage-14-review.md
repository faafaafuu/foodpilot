# Stage 14 Review

Date: 2026-06-19

## Scope

Stage 14 adds baseline performance improvements and review:

- in-memory TTL cache for dish recommendations;
- in-memory TTL cache for weekly menu recommendations;
- env-configurable `RECOMMENDATION_CACHE_TTL_MS`;
- unit test for repeated recommendation cache hits;
- review of existing indexes and slow-path candidates.

## Graphify Context

Graphify was updated before edits with:

```bash
GRAPHIFY=/root/job-agent/.venv/bin/graphify make graph
```

Related files:

- `apps/api/src/recommendations/recommendations.service.ts`
- `apps/api/test/recommendations.service.spec.ts`
- `.env.example`
- `prisma/schema.prisma`

## Performance Notes

- Prisma schema already has indexes for common MVP paths: user preferences, meal logs by user/date, grocery lists by user/status, carts by user/status, store products by store/name and ingredient.
- Recommendation caching reduces repeated AI/web/mobile recommendation calls.
- Store product cache and background queue search remain future work for real store adapters.

## Verification

Passed:

- `npm run format`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm run prisma:validate`
- `npm run format:check`
- `npm audit --audit-level=high`

## Self-Review

- In-memory cache is intentionally simple for MVP. Production should use Redis so multiple API instances share cache state.
- Cache keys include user, date, limits, days, and remaining calories.
- Preference changes are not actively invalidating cache yet; TTL keeps the stale window bounded.
