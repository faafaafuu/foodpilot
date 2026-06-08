# Stage 2 Review

Date: 2026-06-07

## Scope

Stage 2 adds the FoodPilot MVP data model and seed data.

Created Prisma entities:

- `User`
- `UserProfile`
- `FoodPreference`
- `Dish`
- `Ingredient`
- `Recipe`
- `RecipeIngredient`
- `MealLog`
- `CalorieGoal`
- `GroceryList`
- `GroceryListItem`
- `Store`
- `StoreProduct`
- `Cart`
- `CartItem`

The requested entities are present. `RecipeIngredient` is added as the join model required to store ingredient quantities per recipe.

## Graphify Context

Graphify was updated before edits and used to inspect the current Prisma/domain baseline. Related files were:

- `prisma/schema.prisma`
- `prisma/migrations/*`
- `prisma/seed.ts`
- `packages/domain/src/index.ts`
- `packages/domain/src/starter-data.ts`
- `README.md`
- `docs/architecture.md`

After implementation, Graphify should be refreshed again before the next stage.

## Seed Data

Seed data is idempotent and creates:

- one demo user;
- one profile with weight-loss goal and 1800 kcal daily limit;
- seven preferences covering favorite dishes, disliked products, and meal style;
- 20 ingredients;
- 10 starter dishes;
- 10 recipes;
- 53 recipe ingredient rows;
- one mock store;
- 20 mock store products;
- one demo grocery list;
- one mock cart that requires user confirmation.

Verified counts after running the seed twice:

```json
{
  "users": 1,
  "profiles": 1,
  "calorieGoals": 1,
  "dishes": 10,
  "ingredients": 20,
  "recipes": 10,
  "recipeItems": 53,
  "groceryLists": 1,
  "groceryItems": 5,
  "stores": 1,
  "products": 20,
  "carts": 1,
  "cartItems": 5,
  "preferences": 7
}
```

## Verification

Passed:

- `npm run prisma:validate`
- `npm run prisma:generate`
- `DATABASE_URL=postgresql://foodpilot:foodpilot@127.0.0.1:15432/foodpilot?schema=public npm run prisma:migrate`
- `DATABASE_URL=postgresql://foodpilot:foodpilot@127.0.0.1:15432/foodpilot?schema=public npm run prisma:seed`
- `npm run lint`
- `npm test`
- `npm run build`
- `npm audit --audit-level=high`

## Self-Review

- Store/order safety is preserved: seeded carts use `READY_FOR_CONFIRMATION` and `requiresConfirmation = true`.
- Food dislikes are represented as user preferences and starter recipes avoid eggs.
- The model keeps store product data separate from grocery list items, so future adapters can replace products without mutating the requested list.
- The model uses PostgreSQL arrays and JSON for pragmatic MVP fields such as tags, instructions, preferred stores, and source menu metadata.
- Full API exposure belongs to Stage 3; this stage only establishes persistence.
- `npm audit` still reports 12 moderate transitive issues from Expo/Next/PostCSS/uuid dependency trees. High/critical audit passes. `npm audit fix --force` is intentionally not applied because it proposes breaking framework changes.
