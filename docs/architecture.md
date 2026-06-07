# FoodPilot Architecture

FoodPilot is a TypeScript monorepo split by runtime and bounded context.

## Runtime Apps

- `apps/api`: NestJS backend. Owns REST/OpenAPI, validation, auth, persistence, background-job orchestration, and adapter coordination.
- `apps/mobile`: React Native + Expo client for the first mobile MVP.
- `apps/web`: Next.js dashboard and future admin/debug panel.

## Shared Packages

- `packages/domain`: cross-platform domain types and pure rules that are safe to reuse in API, web, and mobile.

Future packages should be added when their boundaries become real:

- `packages/llm-adapters`: provider-neutral AI interfaces and provider implementations.
- `packages/store-adapters`: store search/cart interfaces plus implementations such as mock, Lenta, Ozon Fresh.
- `packages/test-fixtures`: shared test data for dishes, ingredients, menus, carts, and users.

## Architectural Constraints

- Store integrations must never place an order or pay without explicit user confirmation.
- AI providers are replaceable behind an adapter; product behavior must not depend on one vendor.
- Store integrations are replaceable behind adapters; cart-building logic must not know browser automation details.
- Calorie sources are replaceable; the database should store source metadata for calculated values.
- Auth is designed for JWT access tokens and refresh tokens, with future alternative login methods.
- User dislikes and hard food restrictions must be enforced before meal recommendations are returned.
- Browser sessions for store adapters must be local, encrypted or protected by OS/user permissions, and excluded from logs.

## Graphify Workflow

Before implementation work, update the code graph:

```bash
GRAPHIFY=/path/to/graphify make graph
GRAPHIFY=/path/to/graphify make graph-query
```

Use the graph to identify related files and architectural constraints before editing. Commit updated graph artifacts only when they are useful for review; raw `graphify-out/` output is ignored by git.
