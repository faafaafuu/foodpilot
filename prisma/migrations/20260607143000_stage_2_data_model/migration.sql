CREATE EXTENSION IF NOT EXISTS "pgcrypto";

CREATE TYPE "DietGoal" AS ENUM ('WEIGHT_LOSS', 'MAINTENANCE', 'MUSCLE_GAIN');
CREATE TYPE "FoodPreferenceType" AS ENUM ('FAVORITE_DISH', 'DISLIKED_PRODUCT', 'HARD_RESTRICTION', 'SUCCESSFUL_RECOMMENDATION', 'FAILED_RECOMMENDATION', 'MEAL_STYLE', 'PREFERRED_STORE');
CREATE TYPE "BudgetTier" AS ENUM ('LOW', 'NORMAL', 'HIGH');
CREATE TYPE "GroceryCategory" AS ENUM ('MEAT', 'VEGETABLES', 'DAIRY', 'GRAINS', 'PANTRY', 'DRINKS', 'OTHER');
CREATE TYPE "MeasurementUnit" AS ENUM ('GRAM', 'KILOGRAM', 'MILLILITER', 'LITER', 'PIECE', 'CAN', 'PACK', 'BUNCH');
CREATE TYPE "MealType" AS ENUM ('BREAKFAST', 'LUNCH', 'DINNER', 'SNACK');
CREATE TYPE "GroceryListStatus" AS ENUM ('DRAFT', 'READY', 'ORDER_PREPARED', 'ARCHIVED');
CREATE TYPE "CartStatus" AS ENUM ('DRAFT', 'READY_FOR_CONFIRMATION', 'CONFIRMED', 'ABANDONED');

CREATE TABLE "User" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "email" TEXT,
    "displayName" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "User_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "UserProfile" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "weightKg" DECIMAL(6,2),
    "heightCm" INTEGER,
    "age" INTEGER,
    "goal" "DietGoal" NOT NULL DEFAULT 'WEIGHT_LOSS',
    "dailyCalorieLimit" INTEGER,
    "desiredMealsPerDay" INTEGER NOT NULL DEFAULT 3,
    "weeklyBudgetCents" INTEGER,
    "deliveryCity" TEXT,
    "preferredStores" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "UserProfile_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "FoodPreference" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "type" "FoodPreferenceType" NOT NULL,
    "value" TEXT NOT NULL,
    "notes" TEXT,
    "weight" INTEGER NOT NULL DEFAULT 1,
    "repeatFrequency" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "FoodPreference_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Dish" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "slug" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "mealPrepFriendly" BOOLEAN NOT NULL DEFAULT false,
    "budgetTier" "BudgetTier" NOT NULL DEFAULT 'NORMAL',
    "servings" INTEGER NOT NULL DEFAULT 1,
    "caloriesPerServing" INTEGER NOT NULL,
    "proteinGrams" DECIMAL(6,2),
    "fatGrams" DECIMAL(6,2),
    "carbGrams" DECIMAL(6,2),
    "tags" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Dish_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Ingredient" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "category" "GroceryCategory" NOT NULL DEFAULT 'OTHER',
    "defaultUnit" "MeasurementUnit" NOT NULL DEFAULT 'GRAM',
    "caloriesPer100g" INTEGER,
    "proteinPer100g" DECIMAL(6,2),
    "fatPer100g" DECIMAL(6,2),
    "carbPer100g" DECIMAL(6,2),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Ingredient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Recipe" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "dishId" UUID NOT NULL,
    "summary" TEXT NOT NULL,
    "instructions" TEXT[] NOT NULL,
    "prepMinutes" INTEGER,
    "cookMinutes" INTEGER,
    "servings" INTEGER NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Recipe_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "RecipeIngredient" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "recipeId" UUID NOT NULL,
    "ingredientId" UUID NOT NULL,
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" "MeasurementUnit" NOT NULL,
    "note" TEXT,
    "sortOrder" INTEGER NOT NULL DEFAULT 0,
    CONSTRAINT "RecipeIngredient_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "MealLog" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "dishId" UUID,
    "name" TEXT NOT NULL,
    "mealType" "MealType",
    "loggedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "servings" DECIMAL(6,2) NOT NULL DEFAULT 1,
    "calories" INTEGER NOT NULL,
    "proteinGrams" DECIMAL(6,2),
    "fatGrams" DECIMAL(6,2),
    "carbGrams" DECIMAL(6,2),
    "notes" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "MealLog_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CalorieGoal" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID NOT NULL,
    "goal" "DietGoal" NOT NULL DEFAULT 'WEIGHT_LOSS',
    "dailyCalories" INTEGER NOT NULL,
    "proteinGrams" INTEGER,
    "fatGrams" INTEGER,
    "carbGrams" INTEGER,
    "effectiveFrom" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CalorieGoal_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroceryList" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "title" TEXT NOT NULL,
    "status" "GroceryListStatus" NOT NULL DEFAULT 'DRAFT',
    "sourceMenuJson" JSONB,
    "totalEstimatedCents" INTEGER,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "GroceryList_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "GroceryListItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "groceryListId" UUID NOT NULL,
    "ingredientId" UUID,
    "name" TEXT NOT NULL,
    "category" "GroceryCategory" NOT NULL DEFAULT 'OTHER',
    "quantity" DECIMAL(10,2) NOT NULL,
    "unit" "MeasurementUnit" NOT NULL,
    "packageQuantity" DECIMAL(10,2),
    "packageUnit" "MeasurementUnit",
    "checked" BOOLEAN NOT NULL DEFAULT false,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "GroceryListItem_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Store" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "code" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "adapterKey" TEXT NOT NULL,
    "city" TEXT,
    "isMock" BOOLEAN NOT NULL DEFAULT false,
    "active" BOOLEAN NOT NULL DEFAULT true,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Store_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "StoreProduct" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "storeId" UUID NOT NULL,
    "ingredientId" UUID,
    "externalId" TEXT,
    "name" TEXT NOT NULL,
    "normalizedName" TEXT NOT NULL,
    "category" "GroceryCategory" NOT NULL DEFAULT 'OTHER',
    "priceCents" INTEGER NOT NULL,
    "packageSize" DECIMAL(10,2) NOT NULL,
    "packageUnit" "MeasurementUnit" NOT NULL,
    "available" BOOLEAN NOT NULL DEFAULT true,
    "qualityTier" "BudgetTier" NOT NULL DEFAULT 'NORMAL',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "StoreProduct_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "Cart" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "userId" UUID,
    "storeId" UUID NOT NULL,
    "groceryListId" UUID,
    "status" "CartStatus" NOT NULL DEFAULT 'DRAFT',
    "subtotalCents" INTEGER NOT NULL DEFAULT 0,
    "currency" TEXT NOT NULL DEFAULT 'RUB',
    "requiresConfirmation" BOOLEAN NOT NULL DEFAULT true,
    "confirmedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "Cart_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "CartItem" (
    "id" UUID NOT NULL DEFAULT gen_random_uuid(),
    "cartId" UUID NOT NULL,
    "groceryListItemId" UUID,
    "storeProductId" UUID,
    "name" TEXT NOT NULL,
    "quantity" INTEGER NOT NULL DEFAULT 1,
    "unitPriceCents" INTEGER NOT NULL,
    "totalPriceCents" INTEGER NOT NULL,
    "replacementForName" TEXT,
    "replacementReason" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "CartItem_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX "User_email_key" ON "User"("email");
CREATE UNIQUE INDEX "UserProfile_userId_key" ON "UserProfile"("userId");
CREATE UNIQUE INDEX "FoodPreference_userId_type_value_key" ON "FoodPreference"("userId", "type", "value");
CREATE INDEX "FoodPreference_userId_type_idx" ON "FoodPreference"("userId", "type");
CREATE UNIQUE INDEX "Dish_slug_key" ON "Dish"("slug");
CREATE UNIQUE INDEX "Dish_name_key" ON "Dish"("name");
CREATE UNIQUE INDEX "Ingredient_normalizedName_key" ON "Ingredient"("normalizedName");
CREATE INDEX "Ingredient_category_idx" ON "Ingredient"("category");
CREATE UNIQUE INDEX "Recipe_dishId_key" ON "Recipe"("dishId");
CREATE UNIQUE INDEX "RecipeIngredient_recipeId_ingredientId_note_key" ON "RecipeIngredient"("recipeId", "ingredientId", "note");
CREATE INDEX "RecipeIngredient_ingredientId_idx" ON "RecipeIngredient"("ingredientId");
CREATE INDEX "MealLog_userId_loggedAt_idx" ON "MealLog"("userId", "loggedAt");
CREATE INDEX "MealLog_dishId_idx" ON "MealLog"("dishId");
CREATE INDEX "CalorieGoal_userId_effectiveFrom_idx" ON "CalorieGoal"("userId", "effectiveFrom");
CREATE INDEX "GroceryList_userId_status_idx" ON "GroceryList"("userId", "status");
CREATE INDEX "GroceryListItem_groceryListId_idx" ON "GroceryListItem"("groceryListId");
CREATE INDEX "GroceryListItem_ingredientId_idx" ON "GroceryListItem"("ingredientId");
CREATE UNIQUE INDEX "Store_code_key" ON "Store"("code");
CREATE UNIQUE INDEX "Store_name_key" ON "Store"("name");
CREATE UNIQUE INDEX "StoreProduct_storeId_externalId_key" ON "StoreProduct"("storeId", "externalId");
CREATE INDEX "StoreProduct_storeId_normalizedName_idx" ON "StoreProduct"("storeId", "normalizedName");
CREATE INDEX "StoreProduct_ingredientId_idx" ON "StoreProduct"("ingredientId");
CREATE INDEX "Cart_userId_status_idx" ON "Cart"("userId", "status");
CREATE INDEX "Cart_storeId_idx" ON "Cart"("storeId");
CREATE INDEX "Cart_groceryListId_idx" ON "Cart"("groceryListId");
CREATE INDEX "CartItem_cartId_idx" ON "CartItem"("cartId");
CREATE INDEX "CartItem_storeProductId_idx" ON "CartItem"("storeProductId");

ALTER TABLE "UserProfile" ADD CONSTRAINT "UserProfile_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "FoodPreference" ADD CONSTRAINT "FoodPreference_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "Recipe" ADD CONSTRAINT "Recipe_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_recipeId_fkey" FOREIGN KEY ("recipeId") REFERENCES "Recipe"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RecipeIngredient" ADD CONSTRAINT "RecipeIngredient_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "MealLog" ADD CONSTRAINT "MealLog_dishId_fkey" FOREIGN KEY ("dishId") REFERENCES "Dish"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CalorieGoal" ADD CONSTRAINT "CalorieGoal_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroceryList" ADD CONSTRAINT "GroceryList_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "GroceryListItem" ADD CONSTRAINT "GroceryListItem_groceryListId_fkey" FOREIGN KEY ("groceryListId") REFERENCES "GroceryList"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "GroceryListItem" ADD CONSTRAINT "GroceryListItem_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "StoreProduct" ADD CONSTRAINT "StoreProduct_ingredientId_fkey" FOREIGN KEY ("ingredientId") REFERENCES "Ingredient"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_userId_fkey" FOREIGN KEY ("userId") REFERENCES "User"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_storeId_fkey" FOREIGN KEY ("storeId") REFERENCES "Store"("id") ON DELETE RESTRICT ON UPDATE CASCADE;
ALTER TABLE "Cart" ADD CONSTRAINT "Cart_groceryListId_fkey" FOREIGN KEY ("groceryListId") REFERENCES "GroceryList"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_cartId_fkey" FOREIGN KEY ("cartId") REFERENCES "Cart"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_groceryListItemId_fkey" FOREIGN KEY ("groceryListItemId") REFERENCES "GroceryListItem"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "CartItem" ADD CONSTRAINT "CartItem_storeProductId_fkey" FOREIGN KEY ("storeProductId") REFERENCES "StoreProduct"("id") ON DELETE SET NULL ON UPDATE CASCADE;
