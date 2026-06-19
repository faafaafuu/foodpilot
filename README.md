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
npm run prisma:seed
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

Profile API:

```bash
curl -X POST http://localhost:3001/profiles \
  -H 'Content-Type: application/json' \
  -d '{
    "email": "demo@foodpilot.local",
    "weightKg": 92,
    "heightCm": 178,
    "age": 34,
    "goal": "WEIGHT_LOSS",
    "dailyCalorieLimit": 1800,
    "favoriteDishes": ["ленивые голубцы", "холодный свекольник"],
    "dislikedProducts": ["яйца", "каши", "авокадо"]
  }'
```

Available profile routes:

- `POST /profiles`
- `GET /profiles/:userId`
- `PATCH /profiles/:userId`
- `GET /profiles/:userId/tastes`
- `POST /profiles/:userId/favorite-dishes`
- `POST /profiles/:userId/disliked-products`

Calorie API:

- `POST /calories/:userId/goals`
- `POST /calories/:userId/meals`
- `POST /calories/:userId/products`
- `GET /calories/:userId/today`
- `GET /calories/:userId/daily-summary?date=YYYY-MM-DD`

Dish API:

- `GET /dishes`
- `GET /dishes/:slug`
- `GET /dishes/:slug/recipe`
- `GET /dishes/:slug/ingredients`

Recommendation API:

- `GET /recommendations/:userId/dishes?remainingCalories=1200&limit=5`
- `GET /recommendations/:userId/week?days=7`

Grocery List API:

- `POST /grocery-lists/:userId/from-menu`
- `GET /grocery-lists/:listId`
- `GET /grocery-lists/:listId/export`

Mock Store Adapter API:

- `GET /store-adapters/mock/search?query=фарш`
- `GET /store-adapters/mock/products/:productId`
- `GET /store-adapters/mock/products/:productId/availability`
- `POST /store-adapters/mock/cart/items`
- `GET /store-adapters/mock/cart/:cartId`
- `POST /store-adapters/mock/cart/:cartId/replace`

Cart Builder API:

- `POST /cart-builder/grocery-lists/:groceryListId/cart`
- `GET /cart-builder/carts/:cartId`

AI Assistant API:

- `POST /ai/:userId/messages`

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

## Seed Data

Stage 2 includes idempotent development seed data:

- demo user profile with weight-loss goal and 1800 kcal daily limit;
- taste memory for lazy cabbage rolls, cold beet soup, simple home meal prep, and disliked eggs/porridge/avocado;
- 10 starter dishes with ingredients and short recipes;
- mock store with matching products;
- demo grocery list and cart marked `READY_FOR_CONFIRMATION`.

Run it after migrations:

```bash
npm run prisma:seed
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

1. Architecture project setup. Done in `a70dfa5`.
2. Data model for users, profiles, dishes, recipes, meal logs, grocery lists, stores, and carts. Done.
3. Profile and taste APIs. Done.
4. Calorie tracker. Done.
5. Dish and recipe base. Done.
6. Meal recommendation engine. Done.
7. Grocery list builder. Done.
8. Store adapter layer. Done.
9. Cart builder with user confirmation before ordering. Done.
10. AI layer through a replaceable adapter. Done.
11. Mobile MVP screens. Done.
12. Web MVP dashboard and debug panel. Done.
13. Security pass. Done.
14. Performance pass. Done.
15. Final self-review.

## Safety Rules

- FoodPilot prepares carts, but never confirms or pays for orders without explicit user approval.
- Secrets belong in `.env`, not in source code.
- Logs must not contain tokens, payment data, browser sessions, or sensitive personal data.
- DTO validation and rate limiting are required before public API exposure.
