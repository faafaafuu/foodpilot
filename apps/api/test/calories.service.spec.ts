import { DietGoal, MealType, Prisma } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { CaloriesService } from '../src/calories/calories.service';

function createPrismaMock() {
  return {
    user: {
      findUnique: jest.fn(),
    },
    userProfile: {
      upsert: jest.fn(),
    },
    calorieGoal: {
      create: jest.fn(),
      findFirst: jest.fn(),
    },
    dish: {
      findUnique: jest.fn(),
    },
    mealLog: {
      create: jest.fn(),
      findMany: jest.fn(),
    },
  };
}

describe('CaloriesService', () => {
  it('returns consumed and remaining calories for a day', async () => {
    const prisma = createPrismaMock();
    const service = new CaloriesService(prisma as unknown as PrismaService);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      profile: { dailyCalorieLimit: 1800 },
    });
    prisma.calorieGoal.findFirst.mockResolvedValue({
      dailyCalories: 1800,
      proteinGrams: 120,
      fatGrams: 60,
      carbGrams: 170,
    });
    prisma.mealLog.findMany.mockResolvedValue([
      mealLog({ id: 'meal-1', calories: 600, proteinGrams: 40, fatGrams: 20, carbGrams: 50 }),
    ]);

    const summary = await service.getDailySummary('user-1', '2026-06-19');

    expect(summary.dailyLimit).toBe(1800);
    expect(summary.consumedCalories).toBe(600);
    expect(summary.remainingCalories).toBe(1200);
    expect(summary.macros).toEqual({
      proteinGrams: 40,
      fatGrams: 20,
      carbGrams: 50,
    });
    expect(summary.meals).toHaveLength(1);
  });

  it('adds a dish meal using dish calories and macros', async () => {
    const prisma = createPrismaMock();
    const service = new CaloriesService(prisma as unknown as PrismaService);

    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.dish.findUnique.mockResolvedValue({
      id: 'dish-1',
      slug: 'lazy-cabbage-rolls',
      name: 'Ленивые голубцы',
      caloriesPerServing: 430,
      proteinGrams: new Prisma.Decimal(28),
      fatGrams: new Prisma.Decimal(21),
      carbGrams: new Prisma.Decimal(34),
    });
    prisma.mealLog.create.mockImplementation(({ data }) =>
      Promise.resolve(
        mealLog({
          id: 'meal-1',
          dishId: data.dishId,
          name: data.name,
          mealType: data.mealType,
          servings: data.servings,
          calories: data.calories,
          proteinGrams: data.proteinGrams,
          fatGrams: data.fatGrams,
          carbGrams: data.carbGrams,
        }),
      ),
    );

    const meal = await service.addDishMeal('user-1', {
      dishSlug: 'lazy-cabbage-rolls',
      mealType: MealType.LUNCH,
      servings: 1.5,
    });

    expect(prisma.mealLog.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          dishId: 'dish-1',
          name: 'Ленивые голубцы',
          calories: 645,
        }),
      }),
    );
    expect(meal.proteinGrams).toBe(42);
    expect(meal.fatGrams).toBe(31.5);
    expect(meal.carbGrams).toBe(51);
  });

  it('creates a new calorie goal and mirrors the limit to the profile', async () => {
    const prisma = createPrismaMock();
    const service = new CaloriesService(prisma as unknown as PrismaService);

    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      profile: { dailyCalorieLimit: 1750 },
    });
    prisma.calorieGoal.create.mockResolvedValue({});
    prisma.userProfile.upsert.mockResolvedValue({});
    prisma.calorieGoal.findFirst.mockResolvedValue({
      dailyCalories: 1750,
      proteinGrams: 120,
      fatGrams: 60,
      carbGrams: 150,
    });
    prisma.mealLog.findMany.mockResolvedValue([]);

    const summary = await service.setGoal('user-1', {
      goal: DietGoal.WEIGHT_LOSS,
      dailyCalories: 1750,
      proteinGrams: 120,
      fatGrams: 60,
      carbGrams: 150,
    });

    expect(prisma.calorieGoal.create).toHaveBeenCalledWith(
      expect.objectContaining({
        data: expect.objectContaining({
          userId: 'user-1',
          dailyCalories: 1750,
        }),
      }),
    );
    expect(summary.remainingCalories).toBe(1750);
  });
});

function mealLog(overrides: {
  id: string;
  dishId?: string | null;
  name?: string;
  mealType?: MealType | null;
  servings?: Prisma.Decimal;
  calories: number;
  proteinGrams?: Prisma.Decimal | number | null;
  fatGrams?: Prisma.Decimal | number | null;
  carbGrams?: Prisma.Decimal | number | null;
}) {
  return {
    id: overrides.id,
    userId: 'user-1',
    dishId: overrides.dishId ?? null,
    name: overrides.name ?? 'Meal',
    mealType: overrides.mealType ?? null,
    loggedAt: new Date('2026-06-19T12:00:00.000Z'),
    servings: overrides.servings ?? new Prisma.Decimal(1),
    calories: overrides.calories,
    proteinGrams: toDecimal(overrides.proteinGrams),
    fatGrams: toDecimal(overrides.fatGrams),
    carbGrams: toDecimal(overrides.carbGrams),
    notes: null,
    createdAt: new Date('2026-06-19T12:00:00.000Z'),
  };
}

function toDecimal(value: Prisma.Decimal | number | null | undefined): Prisma.Decimal | null {
  if (value === undefined || value === null) {
    return null;
  }

  return typeof value === 'number' ? new Prisma.Decimal(value) : value;
}
