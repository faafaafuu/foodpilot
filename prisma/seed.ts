import { Prisma, PrismaClient } from '@prisma/client';
import {
  starterDishes,
  starterIngredients,
  starterMockStore,
  starterStoreProducts,
  starterUser,
} from '../packages/domain/src/starter-data';

const prisma = new PrismaClient();

async function main(): Promise<void> {
  const user = await prisma.user.upsert({
    where: { email: starterUser.email },
    update: { displayName: starterUser.displayName },
    create: { email: starterUser.email, displayName: starterUser.displayName },
  });

  await prisma.userProfile.upsert({
    where: { userId: user.id },
    update: starterUser.profile,
    create: { ...starterUser.profile, userId: user.id },
  });

  await prisma.calorieGoal.deleteMany({ where: { userId: user.id } });
  await prisma.calorieGoal.create({ data: { ...starterUser.calorieGoal, userId: user.id } });

  for (const preference of starterUser.preferences) {
    await prisma.foodPreference.upsert({
      where: {
        userId_type_value: {
          userId: user.id,
          type: preference.type,
          value: preference.value,
        },
      },
      update: preference,
      create: { ...preference, userId: user.id },
    });
  }

  for (const ingredient of starterIngredients) {
    await prisma.ingredient.upsert({
      where: { normalizedName: ingredient.normalizedName },
      update: ingredient,
      create: ingredient,
    });
  }

  for (const dish of starterDishes) {
    const savedDish = await prisma.dish.upsert({
      where: { slug: dish.slug },
      update: {
        name: dish.name,
        description: dish.description,
        mealPrepFriendly: dish.mealPrepFriendly,
        budgetTier: dish.budgetTier,
        servings: dish.servings,
        caloriesPerServing: dish.caloriesPerServing,
        proteinGrams: dish.proteinGrams,
        fatGrams: dish.fatGrams,
        carbGrams: dish.carbGrams,
        tags: dish.tags,
      },
      create: {
        slug: dish.slug,
        name: dish.name,
        description: dish.description,
        mealPrepFriendly: dish.mealPrepFriendly,
        budgetTier: dish.budgetTier,
        servings: dish.servings,
        caloriesPerServing: dish.caloriesPerServing,
        proteinGrams: dish.proteinGrams,
        fatGrams: dish.fatGrams,
        carbGrams: dish.carbGrams,
        tags: dish.tags,
      },
    });

    const savedRecipe = await prisma.recipe.upsert({
      where: { dishId: savedDish.id },
      update: {
        summary: dish.recipe.summary,
        instructions: dish.recipe.instructions,
        prepMinutes: dish.recipe.prepMinutes,
        cookMinutes: dish.recipe.cookMinutes,
        servings: dish.servings,
      },
      create: {
        dishId: savedDish.id,
        summary: dish.recipe.summary,
        instructions: dish.recipe.instructions,
        prepMinutes: dish.recipe.prepMinutes,
        cookMinutes: dish.recipe.cookMinutes,
        servings: dish.servings,
      },
    });

    await prisma.recipeIngredient.deleteMany({ where: { recipeId: savedRecipe.id } });

    for (const [index, ingredient] of dish.recipe.ingredients.entries()) {
      const savedIngredient = await prisma.ingredient.findUniqueOrThrow({
        where: { normalizedName: ingredient.normalizedName },
      });

      await prisma.recipeIngredient.create({
        data: {
          recipeId: savedRecipe.id,
          ingredientId: savedIngredient.id,
          quantity: new Prisma.Decimal(ingredient.quantity),
          unit: ingredient.unit,
          note: ingredient.note,
          sortOrder: index,
        },
      });
    }
  }

  const store = await prisma.store.upsert({
    where: { code: starterMockStore.code },
    update: { ...starterMockStore, isMock: true, active: true },
    create: { ...starterMockStore, isMock: true, active: true },
  });

  for (const product of starterStoreProducts) {
    const ingredient = await prisma.ingredient.findUniqueOrThrow({
      where: { normalizedName: product.ingredientNormalizedName },
    });

    await prisma.storeProduct.upsert({
      where: {
        storeId_externalId: {
          storeId: store.id,
          externalId: product.externalId,
        },
      },
      update: {
        ingredientId: ingredient.id,
        name: product.name,
        normalizedName: ingredient.normalizedName,
        category: product.category,
        priceCents: product.priceCents,
        packageSize: new Prisma.Decimal(product.packageSize),
        packageUnit: product.packageUnit,
        available: product.available,
        qualityTier: product.qualityTier,
      },
      create: {
        storeId: store.id,
        ingredientId: ingredient.id,
        externalId: product.externalId,
        name: product.name,
        normalizedName: ingredient.normalizedName,
        category: product.category,
        priceCents: product.priceCents,
        packageSize: new Prisma.Decimal(product.packageSize),
        packageUnit: product.packageUnit,
        available: product.available,
        qualityTier: product.qualityTier,
      },
    });
  }

  const demoListTitle = 'Demo weekly menu ingredients';
  const existingDemoLists = await prisma.groceryList.findMany({
    where: { userId: user.id, title: demoListTitle },
    select: { id: true },
  });
  const existingDemoListIds = existingDemoLists.map((list) => list.id);

  if (existingDemoListIds.length > 0) {
    await prisma.cartItem.deleteMany({
      where: { cart: { groceryListId: { in: existingDemoListIds } } },
    });
    await prisma.cart.deleteMany({ where: { groceryListId: { in: existingDemoListIds } } });
    await prisma.groceryList.deleteMany({ where: { id: { in: existingDemoListIds } } });
  }

  const groceryList = await prisma.groceryList.create({
    data: {
      userId: user.id,
      title: demoListTitle,
      status: 'READY',
      sourceMenuJson: {
        dishes: ['Ленивые голубцы', 'Холодный свекольник'],
        days: 3,
      },
    },
  });

  const demoGroceryItems = [
    { normalizedName: 'фарш говяжий', quantity: 1200, unit: 'GRAM' },
    { normalizedName: 'капуста', quantity: 1600, unit: 'GRAM' },
    { normalizedName: 'рис', quantity: 300, unit: 'GRAM' },
    { normalizedName: 'свекла', quantity: 600, unit: 'GRAM' },
    { normalizedName: 'кефир 1%', quantity: 1000, unit: 'MILLILITER' },
  ] as const;

  let estimatedTotalCents = 0;
  const groceryListItems = [];

  for (const item of demoGroceryItems) {
    const ingredient = await prisma.ingredient.findUniqueOrThrow({
      where: { normalizedName: item.normalizedName },
    });
    const product = await prisma.storeProduct.findFirstOrThrow({
      where: { storeId: store.id, ingredientId: ingredient.id },
    });

    estimatedTotalCents += product.priceCents;
    groceryListItems.push(
      await prisma.groceryListItem.create({
        data: {
          groceryListId: groceryList.id,
          ingredientId: ingredient.id,
          name: ingredient.name,
          category: ingredient.category,
          quantity: new Prisma.Decimal(item.quantity),
          unit: item.unit,
          packageQuantity: product.packageSize,
          packageUnit: product.packageUnit,
        },
      }),
    );
  }

  await prisma.groceryList.update({
    where: { id: groceryList.id },
    data: { totalEstimatedCents: estimatedTotalCents },
  });

  const cart = await prisma.cart.create({
    data: {
      userId: user.id,
      storeId: store.id,
      groceryListId: groceryList.id,
      status: 'READY_FOR_CONFIRMATION',
      subtotalCents: estimatedTotalCents,
      requiresConfirmation: true,
    },
  });

  for (const item of groceryListItems) {
    const product = await prisma.storeProduct.findFirstOrThrow({
      where: { storeId: store.id, ingredientId: item.ingredientId },
    });

    await prisma.cartItem.create({
      data: {
        cartId: cart.id,
        groceryListItemId: item.id,
        storeProductId: product.id,
        name: product.name,
        quantity: 1,
        unitPriceCents: product.priceCents,
        totalPriceCents: product.priceCents,
      },
    });
  }
}

main()
  .then(async () => {
    await prisma.$disconnect();
  })
  .catch(async (error: unknown) => {
    console.error(error);
    await prisma.$disconnect();
    process.exit(1);
  });
