# Stage 3 Review

Date: 2026-06-19

## Scope

Stage 3 adds REST API support for user profile and taste memory:

- create profile;
- update weight, height, goal, calorie limit, delivery city, stores, and budget;
- add favorite dish;
- add disliked product;
- get full profile;
- get taste memory.

During security self-review, the API runtime was moved from Nest Express platform to Nest Fastify platform because the latest `@nestjs/platform-express` dependency tree pinned a high-severity vulnerable `multer` version. Fastify keeps the NestJS architecture while removing that runtime dependency.

## Graphify Context

Graphify was updated before edits and used to inspect API, Prisma, domain, and test files.

Related files:

- `apps/api/src/app.module.ts`
- `apps/api/src/prisma/*`
- `apps/api/src/profiles/*`
- `apps/api/test/profiles.service.spec.ts`
- `prisma/schema.prisma`
- `README.md`

## API Routes

- `POST /profiles`
- `GET /profiles/:userId`
- `PATCH /profiles/:userId`
- `GET /profiles/:userId/tastes`
- `POST /profiles/:userId/favorite-dishes`
- `POST /profiles/:userId/disliked-products`

Auth is intentionally not implemented in this stage. `userId` is explicit in the route until the auth/security stage introduces JWT identity.

## Verification

Passed:

- `npm run lint`
- `npm test`
- `npm run build --workspace @foodpilot/api`
- manual API check with local PostgreSQL:
  - `GET /health`
  - `POST /profiles`
  - `PATCH /profiles/:userId`
  - `GET /profiles/:userId/tastes`
  - `POST /profiles/:userId/favorite-dishes`
  - `POST /profiles/:userId/disliked-products`

Manual check created a profile with lazy cabbage rolls, cold beet soup, and disliked eggs/porridge/avocado; update changed weight and daily calories; taste endpoints returned normalized values.

## Self-Review

- DTO validation is enabled globally and profile DTOs reject unknown fields through the existing `ValidationPipe`.
- Prisma is accessed through a shared `PrismaService`, keeping persistence wiring centralized.
- Favorite dishes and disliked products use the existing `FoodPreference` model and unique `(userId, type, value)` constraint.
- Preference values are normalized to lowercase Russian locale before storage, which prevents duplicates like `Яйца` and `яйца`.
- Swagger decorators are present on the controller; response schemas can be made stricter in a later API polish pass.
- `npm audit --audit-level=high` passes after the Fastify switch. Remaining advisories are moderate transitive issues that currently require breaking framework changes.
