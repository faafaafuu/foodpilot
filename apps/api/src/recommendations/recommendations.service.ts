import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Dish,
  FoodPreference,
  FoodPreferenceType,
  Ingredient,
  MealLog,
  MealType,
  Prisma,
  Recipe,
  RecipeIngredient,
  User,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  DishRecommendationsResponse,
  RecommendedDishResponse,
  WeeklyMenuResponse,
} from './recommendations.types';

type UserWithContext = User & {
  profile: {
    dailyCalorieLimit: number | null;
    weeklyBudgetCents: number | null;
  } | null;
  preferences: FoodPreference[];
};

type DishWithRecipe = Dish & {
  proteinGrams: Prisma.Decimal | null;
  fatGrams: Prisma.Decimal | null;
  carbGrams: Prisma.Decimal | null;
  recipe:
    | (Recipe & {
        ingredients: Array<
          RecipeIngredient & {
            ingredient: Ingredient;
          }
        >;
      })
    | null;
};

interface DailyContext {
  date: string;
  dailyLimit: number;
  consumedCalories: number;
  remainingCalories: number;
}

interface ScoredDish {
  recommendation: RecommendedDishResponse;
  rankKey: string;
}

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async recommendDishes(
    userId: string,
    options: { remainingCalories?: number; limit?: number; date?: string } = {},
  ): Promise<DishRecommendationsResponse> {
    const [user, dishes, dailyContext] = await Promise.all([
      this.getUser(userId),
      this.getDishes(),
      this.getDailyContext(userId, options.date, options.remainingCalories),
    ]);
    const recommendations = this.rankDishes(
      user,
      dishes,
      dailyContext.remainingCalories,
      options.limit,
    );

    return {
      userId,
      date: dailyContext.date,
      dailyLimit: dailyContext.dailyLimit,
      consumedCalories: dailyContext.consumedCalories,
      remainingCalories: dailyContext.remainingCalories,
      recommendations: recommendations.map((item) => item.recommendation),
    };
  }

  async recommendWeeklyMenu(
    userId: string,
    options: { days?: number; date?: string } = {},
  ): Promise<WeeklyMenuResponse> {
    const [user, dishes, dailyContext] = await Promise.all([
      this.getUser(userId),
      this.getDishes(),
      this.getDailyContext(userId, options.date),
    ]);
    const days = clampInteger(options.days ?? 7, 1, 14);
    const ranked = this.rankDishes(user, dishes, dailyContext.remainingCalories, 5).map(
      (item) => item.recommendation,
    );

    if (ranked.length === 0) {
      throw new BadRequestException('No dishes can be recommended with current restrictions.');
    }

    const menuDays = Array.from({ length: days }, (_, index) => {
      const lunch = ranked[index % ranked.length];
      const dinner = ranked[(index + 2) % ranked.length] ?? ranked[0];
      const meals = [
        {
          mealType: MealType.LUNCH,
          dish: lunch.dish,
          reason: lunch.reason,
        },
        {
          mealType: MealType.DINNER,
          dish: dinner.dish,
          reason: dinner.reason,
        },
      ];

      return {
        day: index + 1,
        meals,
        estimatedCalories: meals.reduce((sum, meal) => sum + meal.dish.caloriesPerServing, 0),
      };
    });

    const groceryCandidateDishSlugs = Array.from(
      new Set(menuDays.flatMap((day) => day.meals.map((meal) => meal.dish.slug))),
    );
    const estimatedAverageCalories = Math.round(
      menuDays.reduce((sum, day) => sum + day.estimatedCalories, 0) / menuDays.length,
    );

    return {
      userId,
      days: menuDays,
      estimatedAverageCalories,
      groceryCandidateDishSlugs,
    };
  }

  private async getUser(userId: string): Promise<UserWithContext> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: {
          select: {
            dailyCalorieLimit: true,
            weeklyBudgetCents: true,
          },
        },
        preferences: true,
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} was not found`);
    }

    return user;
  }

  private getDishes(): Promise<DishWithRecipe[]> {
    return this.prisma.dish.findMany({
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
      orderBy: [{ mealPrepFriendly: 'desc' }, { name: 'asc' }],
    });
  }

  private async getDailyContext(
    userId: string,
    date?: string,
    overrideRemainingCalories?: number,
  ): Promise<DailyContext> {
    const { start, end, dateKey } = dayRange(date);
    const [goal, user, meals] = await Promise.all([
      this.prisma.calorieGoal.findFirst({
        where: { userId, effectiveFrom: { lte: end } },
        orderBy: { effectiveFrom: 'desc' },
      }),
      this.prisma.user.findUnique({
        where: { id: userId },
        include: { profile: true },
      }),
      this.prisma.mealLog.findMany({
        where: { userId, loggedAt: { gte: start, lt: end } },
      }),
    ]);

    const dailyLimit = goal?.dailyCalories ?? user?.profile?.dailyCalorieLimit ?? 1800;
    const consumedCalories = meals.reduce((sum: number, meal: MealLog) => sum + meal.calories, 0);
    const remainingCalories =
      overrideRemainingCalories ?? Math.max(dailyLimit - consumedCalories, 0);

    return {
      date: dateKey,
      dailyLimit,
      consumedCalories,
      remainingCalories,
    };
  }

  private rankDishes(
    user: UserWithContext,
    dishes: DishWithRecipe[],
    remainingCalories: number,
    requestedLimit?: number,
  ): ScoredDish[] {
    const disliked = preferenceValues(user.preferences, [
      FoodPreferenceType.DISLIKED_PRODUCT,
      FoodPreferenceType.HARD_RESTRICTION,
    ]);
    const favorites = preferenceValues(user.preferences, [FoodPreferenceType.FAVORITE_DISH]);
    const mealStyles = preferenceValues(user.preferences, [FoodPreferenceType.MEAL_STYLE]);
    const preferredMealPrep = mealStyles.some((value) => value.includes('несколько дней'));
    const budgetCents = user.profile?.weeklyBudgetCents;
    const favoriteCatalogDishes = dishes.filter((dish) => matchesAny(dish.name, favorites));
    const limit = clampInteger(requestedLimit ?? 5, 3, 5);

    return dishes
      .filter((dish) => !this.hasDislikedContent(dish, disliked))
      .map((dish) => {
        const scoreParts = this.scoreDish({
          dish,
          remainingCalories,
          favorites,
          preferredMealPrep,
          budgetCents,
          favoriteCatalogDishes,
        });

        return {
          recommendation: {
            dish: toDishSummary(dish),
            score: scoreParts.score,
            reason: scoreParts.reasons.slice(0, 3).join(' '),
            matchedPreferences: scoreParts.matchedPreferences,
            warnings: scoreParts.warnings,
          },
          rankKey: dish.slug,
        };
      })
      .sort((left, right) => {
        if (right.recommendation.score !== left.recommendation.score) {
          return right.recommendation.score - left.recommendation.score;
        }

        return left.rankKey.localeCompare(right.rankKey, 'ru');
      })
      .slice(0, limit);
  }

  private hasDislikedContent(dish: DishWithRecipe, disliked: string[]): boolean {
    if (disliked.length === 0) {
      return false;
    }

    const searchable = [
      dish.name,
      dish.description ?? '',
      ...dish.tags,
      ...(dish.recipe?.ingredients.flatMap((item) => [
        item.ingredient.name,
        item.ingredient.normalizedName,
      ]) ?? []),
    ].map(normalize);

    return disliked.some((blocked) => searchable.some((value) => value.includes(blocked)));
  }

  private scoreDish(options: {
    dish: DishWithRecipe;
    remainingCalories: number;
    favorites: string[];
    preferredMealPrep: boolean;
    budgetCents: number | null | undefined;
    favoriteCatalogDishes: DishWithRecipe[];
  }): {
    score: number;
    reasons: string[];
    matchedPreferences: string[];
    warnings: string[];
  } {
    const {
      dish,
      remainingCalories,
      favorites,
      preferredMealPrep,
      budgetCents,
      favoriteCatalogDishes,
    } = options;
    let score = 10;
    const reasons: string[] = [];
    const matchedPreferences: string[] = [];
    const warnings: string[] = [];

    if (dish.caloriesPerServing <= remainingCalories) {
      score += 30;
      reasons.push(`Вписывается в остаток ${remainingCalories} ккал.`);
    } else {
      const over = dish.caloriesPerServing - remainingCalories;
      score -= Math.min(45, Math.ceil(over / 50) * 5);
      warnings.push(`Порция выше остатка на ${over} ккал.`);
      reasons.push('Можно взять меньшую порцию, если остаток калорий небольшой.');
    }

    if (matchesAny(dish.name, favorites)) {
      score += 45;
      matchedPreferences.push(dish.name);
      reasons.push('Совпадает с любимым блюдом.');
    }

    const sharedIngredientCount = maxSharedIngredientCount(dish, favoriteCatalogDishes);
    if (sharedIngredientCount > 0 && !matchesAny(dish.name, favorites)) {
      score += Math.min(20, sharedIngredientCount * 3);
      reasons.push('Похоже на любимые домашние блюда по продуктам.');
    }

    if (preferredMealPrep && dish.mealPrepFriendly) {
      score += 15;
      matchedPreferences.push('готовка на несколько дней');
      reasons.push('Подходит для meal-prep.');
    }

    if (budgetCents !== null && budgetCents !== undefined) {
      if (budgetCents < 500000 && dish.budgetTier === 'LOW') {
        score += 12;
        reasons.push('Бюджетный вариант.');
      } else if (budgetCents >= 500000 && dish.budgetTier !== 'HIGH') {
        score += 8;
        reasons.push('Нормальная цена без премиум-продуктов.');
      }
    }

    if (dish.tags.some((tag) => ['home', 'simple', 'filling'].includes(tag))) {
      score += 8;
      reasons.push('Простая сытная домашняя еда.');
    }

    return {
      score,
      reasons: reasons.length > 0 ? reasons : ['Подходит под текущие настройки профиля.'],
      matchedPreferences: Array.from(new Set(matchedPreferences)),
      warnings,
    };
  }
}

function preferenceValues(preferences: FoodPreference[], types: FoodPreferenceType[]): string[] {
  return preferences
    .filter((preference) => types.includes(preference.type))
    .map((preference) => normalize(preference.value));
}

function matchesAny(value: string, candidates: string[]): boolean {
  const normalized = normalize(value);

  return candidates.some(
    (candidate) => normalized.includes(candidate) || candidate.includes(normalized),
  );
}

function maxSharedIngredientCount(dish: DishWithRecipe, favoriteDishes: DishWithRecipe[]): number {
  const dishIngredients = ingredientSet(dish);

  return Math.max(
    0,
    ...favoriteDishes
      .filter((favoriteDish) => favoriteDish.slug !== dish.slug)
      .map((favoriteDish) => {
        const favoriteIngredients = ingredientSet(favoriteDish);

        return [...dishIngredients].filter((ingredient) => favoriteIngredients.has(ingredient))
          .length;
      }),
  );
}

function ingredientSet(dish: DishWithRecipe): Set<string> {
  return new Set(
    dish.recipe?.ingredients.map((item) => normalize(item.ingredient.normalizedName)) ?? [],
  );
}

function toDishSummary(dish: DishWithRecipe) {
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

function decimalToNumber(value: Prisma.Decimal | number | null): number | null {
  if (value === null) {
    return null;
  }

  return typeof value === 'number' ? value : value.toNumber();
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU');
}

function clampInteger(value: number, min: number, max: number): number {
  return Math.min(Math.max(Math.trunc(value), min), max);
}

function dayRange(date?: string): { start: Date; end: Date; dateKey: string } {
  const source = date ? new Date(`${date}T00:00:00.000Z`) : new Date();
  if (Number.isNaN(source.getTime())) {
    throw new BadRequestException('Date must use YYYY-MM-DD format.');
  }

  const dateKey = source.toISOString().slice(0, 10);
  const start = new Date(`${dateKey}T00:00:00.000Z`);
  const end = new Date(start);
  end.setUTCDate(end.getUTCDate() + 1);

  return { start, end, dateKey };
}
