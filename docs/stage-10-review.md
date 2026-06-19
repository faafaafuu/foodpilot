# Stage 10 Review

Date: 2026-06-19

## Scope

Stage 10 adds the first AI assistant layer:

- unified AI endpoint;
- replaceable `AiAdapter` interface;
- local deterministic adapter for MVP;
- intent handling for calories left, weekly menu, grocery list, recipe, ingredients, and dish recommendations;
- tool calls into calorie, dish, recommendation, and grocery-list services;
- explicit preference saving for known favorite dishes and disliked products.

## Graphify Context

Graphify was updated before edits with:

```bash
GRAPHIFY=/root/job-agent/.venv/bin/graphify make graph
```

The graph was queried for AI assistant, adapter, prompt/tools, preferences, recommendations, calories, recipes, and grocery list context. Related files:

- `apps/api/src/calories/*`
- `apps/api/src/dishes/*`
- `apps/api/src/recommendations/*`
- `apps/api/src/grocery-lists/*`
- `apps/api/src/profiles/*`
- `prisma/schema.prisma`

## API Route

- `POST /ai/:userId/messages`

Example:

```json
{
  "message": "Хочу меню на неделю. Люблю ленивые голубцы и холодный свекольник."
}
```

## Behavior

- The MVP adapter is local and deterministic; it does not require external LLM keys.
- The adapter is intentionally behind an interface so OpenAI or another provider can replace it later.
- Natural-language requests call existing typed services instead of duplicating business logic.
- Preference saving is conservative: only explicit known dishes and known disliked products are saved.

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

- `POST /ai/:userId/messages` with “Хочу меню на неделю. Люблю ленивые голубцы и холодный свекольник. Хочу похудеть.” returned `WEEKLY_MENU`, saved both favorites, and returned a 7-day menu.
- `POST /ai/:userId/messages` with “Сколько калорий осталось?” returned `CALORIES_LEFT` and the current daily calorie summary.
- `npm audit fix` updated `undici` from `6.26.0` to `6.27.0` to remove a high-severity advisory; only moderate advisories remain and their suggested fixes require breaking/force updates.

## Self-Review

- This is not pretending to be a full LLM integration. It is a working local adapter that exercises the architecture and tools safely.
- External providers should be added behind `AiAdapter` with env-based credentials, prompt tests, rate limits, and logging redaction.
- Grocery-list generation is a write action, so future UX should show a confirmation or undo affordance in mobile/web.
