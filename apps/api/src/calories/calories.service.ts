import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { DietGoal, MealLog, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { AddDishMealDto } from './dto/add-dish-meal.dto';
import { AddProductMealDto } from './dto/add-product-meal.dto';
import { SetCalorieGoalDto } from './dto/set-calorie-goal.dto';
import { DailyCalorieSummary, MealLogResponse } from './calories.types';

type MealLogWithDecimal = MealLog & {
  servings: Prisma.Decimal;
  proteinGrams: Prisma.Decimal | null;
  fatGrams: Prisma.Decimal | null;
  carbGrams: Prisma.Decimal | null;
};

@Injectable()
export class CaloriesService {
  constructor(private readonly prisma: PrismaService) {}

  async setGoal(userId: string, dto: SetCalorieGoalDto): Promise<DailyCalorieSummary> {
    await this.ensureUser(userId);
    await this.prisma.calorieGoal.create({
      data: {
        userId,
        goal: dto.goal ?? DietGoal.WEIGHT_LOSS,
        dailyCalories: dto.dailyCalories,
        proteinGrams: dto.proteinGrams,
        fatGrams: dto.fatGrams,
        carbGrams: dto.carbGrams,
      },
    });
    await this.prisma.userProfile.upsert({
      where: { userId },
      update: {
        goal: dto.goal ?? DietGoal.WEIGHT_LOSS,
        dailyCalorieLimit: dto.dailyCalories,
      },
      create: {
        userId,
        goal: dto.goal ?? DietGoal.WEIGHT_LOSS,
        dailyCalorieLimit: dto.dailyCalories,
      },
    });

    return this.getDailySummary(userId);
  }

  async addDishMeal(userId: string, dto: AddDishMealDto): Promise<MealLogResponse> {
    await this.ensureUser(userId);

    const servings = dto.servings ?? 1;
    const dish = await this.findDish(dto);

    if (!dish && !dto.name) {
      throw new BadRequestException('Provide dishId, dishSlug, or name for custom dish logging.');
    }

    const calories = Math.round((dto.calories ?? dish?.caloriesPerServing ?? 0) * servings);
    if (calories <= 0) {
      throw new BadRequestException('Calories must be provided for custom dishes.');
    }

    const meal = await this.prisma.mealLog.create({
      data: {
        userId,
        dishId: dish?.id,
        name: dto.name ?? dish?.name ?? 'Custom dish',
        mealType: dto.mealType,
        loggedAt: dto.loggedAt ? new Date(dto.loggedAt) : undefined,
        servings: new Prisma.Decimal(servings),
        calories,
        proteinGrams: scaleMacro(dish?.proteinGrams, servings),
        fatGrams: scaleMacro(dish?.fatGrams, servings),
        carbGrams: scaleMacro(dish?.carbGrams, servings),
        notes: dto.notes,
      },
    });

    return this.toMealResponse(meal);
  }

  async addProductMeal(userId: string, dto: AddProductMealDto): Promise<MealLogResponse> {
    await this.ensureUser(userId);

    const servings = dto.servings ?? 1;
    const meal = await this.prisma.mealLog.create({
      data: {
        userId,
        name: dto.name,
        mealType: dto.mealType,
        loggedAt: dto.loggedAt ? new Date(dto.loggedAt) : undefined,
        servings: new Prisma.Decimal(servings),
        calories: Math.round(dto.calories * servings),
        proteinGrams:
          dto.proteinGrams !== undefined
            ? new Prisma.Decimal(dto.proteinGrams * servings)
            : undefined,
        fatGrams:
          dto.fatGrams !== undefined ? new Prisma.Decimal(dto.fatGrams * servings) : undefined,
        carbGrams:
          dto.carbGrams !== undefined ? new Prisma.Decimal(dto.carbGrams * servings) : undefined,
        notes: dto.notes,
      },
    });

    return this.toMealResponse(meal);
  }

  async getTodaySummary(userId: string): Promise<DailyCalorieSummary> {
    return this.getDailySummary(userId);
  }

  async getDailySummary(userId: string, date?: string): Promise<DailyCalorieSummary> {
    await this.ensureUser(userId);

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
        orderBy: { loggedAt: 'asc' },
      }),
    ]);

    const dailyLimit = goal?.dailyCalories ?? user?.profile?.dailyCalorieLimit ?? 1800;
    const mealResponses = meals.map((meal) => this.toMealResponse(meal));
    const consumedCalories = mealResponses.reduce((sum, meal) => sum + meal.calories, 0);

    return {
      date: dateKey,
      dailyLimit,
      consumedCalories,
      remainingCalories: Math.max(dailyLimit - consumedCalories, 0),
      macros: {
        proteinGrams: sumNullable(mealResponses.map((meal) => meal.proteinGrams)),
        fatGrams: sumNullable(mealResponses.map((meal) => meal.fatGrams)),
        carbGrams: sumNullable(mealResponses.map((meal) => meal.carbGrams)),
      },
      goals: {
        proteinGrams: goal?.proteinGrams ?? null,
        fatGrams: goal?.fatGrams ?? null,
        carbGrams: goal?.carbGrams ?? null,
      },
      meals: mealResponses,
    };
  }

  private async ensureUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

    if (!user) {
      throw new NotFoundException(`User ${userId} was not found`);
    }
  }

  private async findDish(dto: AddDishMealDto) {
    if (dto.dishId) {
      return this.prisma.dish.findUnique({ where: { id: dto.dishId } });
    }

    if (dto.dishSlug) {
      return this.prisma.dish.findUnique({ where: { slug: dto.dishSlug } });
    }

    return null;
  }

  private toMealResponse(meal: MealLogWithDecimal): MealLogResponse {
    return {
      id: meal.id,
      dishId: meal.dishId,
      name: meal.name,
      mealType: meal.mealType,
      loggedAt: meal.loggedAt.toISOString(),
      servings: meal.servings.toNumber(),
      calories: meal.calories,
      proteinGrams: decimalToNumber(meal.proteinGrams),
      fatGrams: decimalToNumber(meal.fatGrams),
      carbGrams: decimalToNumber(meal.carbGrams),
      notes: meal.notes,
    };
  }
}

function scaleMacro(value: Prisma.Decimal | number | null | undefined, servings: number) {
  if (value === null || value === undefined) {
    return undefined;
  }

  const macro = typeof value === 'number' ? value : value.toNumber();
  return new Prisma.Decimal(macro * servings);
}

function decimalToNumber(value: Prisma.Decimal | null): number | null {
  return value === null ? null : value.toNumber();
}

function sumNullable(values: Array<number | null>): number {
  return Number(values.reduce<number>((sum, value) => sum + (value ?? 0), 0).toFixed(2));
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
