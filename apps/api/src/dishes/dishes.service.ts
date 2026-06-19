import { Injectable, NotFoundException } from '@nestjs/common';
import { Dish, Ingredient, Prisma, Recipe, RecipeIngredient } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DishDetailsResponse,
  DishSummaryResponse,
  RecipeIngredientResponse,
  RecipeResponse,
} from './dishes.types';

type RecipeIngredientWithIngredient = RecipeIngredient & {
  quantity: Prisma.Decimal;
  ingredient: Ingredient & {
    proteinPer100g: Prisma.Decimal | null;
    fatPer100g: Prisma.Decimal | null;
    carbPer100g: Prisma.Decimal | null;
  };
};

type RecipeWithIngredients = Recipe & {
  ingredients: RecipeIngredientWithIngredient[];
};

type DishWithRecipe = Dish & {
  proteinGrams: Prisma.Decimal | null;
  fatGrams: Prisma.Decimal | null;
  carbGrams: Prisma.Decimal | null;
  recipe: RecipeWithIngredients | null;
};

@Injectable()
export class DishesService {
  constructor(private readonly prisma: PrismaService) {}

  async listDishes(): Promise<DishSummaryResponse[]> {
    const dishes = await this.prisma.dish.findMany({
      orderBy: [{ mealPrepFriendly: 'desc' }, { name: 'asc' }],
    });

    return dishes.map((dish) => this.toDishSummary(dish));
  }

  async getDish(slug: string): Promise<DishDetailsResponse> {
    const dish = await this.findDishWithRecipe(slug);

    return {
      ...this.toDishSummary(dish),
      recipe: dish.recipe ? this.toRecipeResponse(dish, dish.recipe) : null,
    };
  }

  async getRecipe(slug: string): Promise<RecipeResponse> {
    const dish = await this.findDishWithRecipe(slug);

    if (!dish.recipe) {
      throw new NotFoundException(`Recipe for dish ${slug} was not found`);
    }

    return this.toRecipeResponse(dish, dish.recipe);
  }

  async getIngredients(slug: string): Promise<RecipeIngredientResponse[]> {
    return (await this.getRecipe(slug)).ingredients;
  }

  private async findDishWithRecipe(slug: string): Promise<DishWithRecipe> {
    const dish = await this.prisma.dish.findUnique({
      where: { slug },
      include: {
        recipe: {
          include: {
            ingredients: {
              include: { ingredient: true },
              orderBy: { sortOrder: 'asc' },
            },
          },
        },
      },
    });

    if (!dish) {
      throw new NotFoundException(`Dish ${slug} was not found`);
    }

    return dish;
  }

  private toRecipeResponse(dish: DishWithRecipe, recipe: RecipeWithIngredients): RecipeResponse {
    return {
      id: recipe.id,
      dish: this.toDishSummary(dish),
      summary: recipe.summary,
      instructions: recipe.instructions,
      prepMinutes: recipe.prepMinutes,
      cookMinutes: recipe.cookMinutes,
      servings: recipe.servings,
      ingredients: recipe.ingredients.map((ingredient) =>
        this.toRecipeIngredientResponse(ingredient),
      ),
    };
  }

  private toDishSummary(dish: Dish): DishSummaryResponse {
    return {
      id: dish.id,
      slug: dish.slug,
      name: dish.name,
      description: dish.description,
      mealPrepFriendly: dish.mealPrepFriendly,
      budgetTier: dish.budgetTier,
      servings: dish.servings,
      caloriesPerServing: dish.caloriesPerServing,
      macros: {
        proteinGrams: decimalToNumber(dish.proteinGrams),
        fatGrams: decimalToNumber(dish.fatGrams),
        carbGrams: decimalToNumber(dish.carbGrams),
      },
      tags: dish.tags,
    };
  }

  private toRecipeIngredientResponse(
    recipeIngredient: RecipeIngredientWithIngredient,
  ): RecipeIngredientResponse {
    return {
      id: recipeIngredient.id,
      quantity: recipeIngredient.quantity.toNumber(),
      unit: recipeIngredient.unit,
      note: recipeIngredient.note,
      sortOrder: recipeIngredient.sortOrder,
      ingredient: {
        id: recipeIngredient.ingredient.id,
        name: recipeIngredient.ingredient.name,
        normalizedName: recipeIngredient.ingredient.normalizedName,
        category: recipeIngredient.ingredient.category,
        defaultUnit: recipeIngredient.ingredient.defaultUnit,
        nutrition: {
          caloriesPer100g: recipeIngredient.ingredient.caloriesPer100g,
          proteinPer100g: decimalToNumber(recipeIngredient.ingredient.proteinPer100g),
          fatPer100g: decimalToNumber(recipeIngredient.ingredient.fatPer100g),
          carbPer100g: decimalToNumber(recipeIngredient.ingredient.carbPer100g),
        },
      },
    };
  }
}

function decimalToNumber(value: Prisma.Decimal | number | null): number | null {
  if (value === null) {
    return null;
  }

  return typeof value === 'number' ? value : value.toNumber();
}
