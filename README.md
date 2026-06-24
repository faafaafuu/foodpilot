# FoodPilot

FoodPilot is a nutrition, calorie, grocery, and cart-preparation platform for simple home food and meal prep.

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

- `POST /cart-builder/menu/cart`
- `POST /cart-builder/grocery-lists/:groceryListId/cart`
- `GET /cart-builder/carts/:cartId`
- `POST /cart-builder/carts/:cartId/confirm`

One-shot menu to cart example:

```bash
curl -X POST http://localhost:3001/cart-builder/menu/cart \
  -H 'Content-Type: application/json' \
  -d '{
    "userId": "USER_ID",
    "menu": {
      "title": "Меню на неделю",
      "storeCode": "mock-store",
      "dishes": [
        { "slug": "lazy-cabbage-rolls", "servings": 8 },
        { "slug": "cold-beet-soup", "servings": 4 }
      ]
    }
  }'
```

The response includes the generated grocery list and a cart with `READY_FOR_CONFIRMATION` status.

Confirming a cart marks the FoodPilot cart as `CONFIRMED`; it still does not submit payment or place an external store order.

Checkout API:

- `GET /checkout/carts/:cartId/review`
- `POST /checkout/carts/:cartId/payment-intents`
- `POST /checkout/payment-intents/:paymentIntentId/confirm`

The current checkout implementation uses `MockPaymentAdapter`. It creates and captures mock payment intents for confirmed carts only; no real card data, money movement, or external store order is handled by FoodPilot.

AI Assistant API:

- `POST /ai/:userId/messages`

Web:

```bash
npm run dev:web
```

The web dashboard is an interactive cockpit. It can create the demo profile, build a mock-store cart from selected dishes, confirm the cart, create and capture a mock payment intent, chat with the local AI adapter, and use browser voice input where supported.

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
15. Final self-review. Done.
16. One-shot menu-to-cart preparation endpoint. Done.
17. Checkout and mock payment intent flow. Done.
18. Interactive web cockpit with cart, checkout, chat, and browser voice input. Done.

## Safety Rules

- FoodPilot prepares carts, but never confirms or pays for orders without explicit user approval.
- Secrets belong in `.env`, not in source code.
- Logs must not contain tokens, payment data, browser sessions, or sensitive personal data.
- DTO validation and rate limiting are required before public API exposure.
- Real payments must be delegated to PCI-compliant providers through adapters; FoodPilot must not store raw card data.
