# FoodPilot

FoodPilot is a nutrition, calorie, grocery, and cart-preparation platform for simple home food and meal prep.

The first MVP focuses on a user who wants to lose weight, prefers filling budget-friendly meals, likes lazy cabbage rolls and cold beet soup, and avoids eggs, porridge, and avocado.

## Monorepo

```text
apps/
  api/     NestJS backend
  mobile/  React Native + Expo app
  web/     Next.js dashboard
packages/
  domain/  shared domain types and pure rules
prisma/    PostgreSQL schema and migrations
docs/      architecture notes
```

## Local Setup

```bash
cp .env.example .env
npm install
npm run prisma:generate
docker compose up -d postgres redis
npm run prisma:migrate
npm run dev:api
```

Healthcheck:

```bash
curl http://localhost:3001/health
```

Swagger/OpenAPI:

```text
http://localhost:3001/docs
```

Web:

```bash
npm run dev:web
```

Mobile:

```bash
npm run dev:mobile
```

## Quality Gates

```bash
npm run lint
npm test
npm run build
npm run prisma:validate
```

## Docker Compose

```bash
docker compose up --build
```

Services:

- API: `http://localhost:3001`
- PostgreSQL: `localhost:15432`
- Redis: `localhost:16379`

## MVP Roadmap

1. Architecture project setup.
2. Data model for users, profiles, dishes, recipes, meal logs, grocery lists, stores, and carts.
3. Profile and taste APIs.
4. Calorie tracker.
5. Dish and recipe base.
6. Meal recommendation engine.
7. Grocery list builder.
8. Store adapter layer.
9. Cart builder with user confirmation before ordering.
10. AI layer through a replaceable adapter.
11. Mobile MVP screens.
12. Web MVP dashboard and debug panel.
13. Security pass.
14. Performance pass.
15. Final self-review.

## Safety Rules

- FoodPilot prepares carts, but never confirms or pays for orders without explicit user approval.
- Secrets belong in `.env`, not in source code.
- Logs must not contain tokens, payment data, browser sessions, or sensitive personal data.
- DTO validation and rate limiting are required before public API exposure.
