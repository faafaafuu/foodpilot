import { DietGoal, FoodPreferenceType, Prisma } from '@prisma/client';
import { PrismaService } from '../src/prisma/prisma.service';
import { ProfilesService } from '../src/profiles/profiles.service';

function createPrismaMock() {
  return {
    user: {
      upsert: jest.fn(),
      update: jest.fn(),
      findUnique: jest.fn(),
    },
    userProfile: {
      upsert: jest.fn(),
    },
    calorieGoal: {
      create: jest.fn(),
    },
    foodPreference: {
      upsert: jest.fn(),
    },
  };
}

describe('ProfilesService', () => {
  it('creates a profile with favorite dishes and disliked products', async () => {
    const prisma = createPrismaMock();
    const service = new ProfilesService(prisma as unknown as PrismaService);

    prisma.user.upsert.mockResolvedValue({ id: 'user-1' });
    prisma.foodPreference.upsert.mockImplementation(({ create }) =>
      Promise.resolve({
        id: `${create.type}-${create.value}`,
        type: create.type,
        value: create.value,
        notes: create.notes ?? null,
        weight: create.weight,
        repeatFrequency: create.repeatFrequency ?? null,
      }),
    );
    prisma.user.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'demo@foodpilot.local',
      displayName: 'Demo',
      createdAt: new Date(),
      updatedAt: new Date(),
      profile: {
        weightKg: new Prisma.Decimal(92),
        heightCm: 178,
        age: 34,
        goal: DietGoal.WEIGHT_LOSS,
        dailyCalorieLimit: 1800,
        desiredMealsPerDay: 3,
        weeklyBudgetCents: 700000,
        deliveryCity: 'Москва',
        preferredStores: ['mock-store'],
      },
      preferences: [
        preference('pref-1', FoodPreferenceType.FAVORITE_DISH, 'ленивые голубцы', 5),
        preference('pref-2', FoodPreferenceType.DISLIKED_PRODUCT, 'яйца', 5),
      ],
    });

    const response = await service.createProfile({
      email: 'demo@foodpilot.local',
      displayName: 'Demo',
      weightKg: 92,
      heightCm: 178,
      age: 34,
      goal: DietGoal.WEIGHT_LOSS,
      dailyCalorieLimit: 1800,
      desiredMealsPerDay: 3,
      weeklyBudgetCents: 700000,
      deliveryCity: 'Москва',
      preferredStores: ['mock-store'],
      favoriteDishes: ['Ленивые голубцы'],
      dislikedProducts: ['Яйца'],
    });

    expect(prisma.userProfile.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        create: expect.objectContaining({
          userId: 'user-1',
          dailyCalorieLimit: 1800,
        }),
      }),
    );
    expect(prisma.foodPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_type_value: {
            userId: 'user-1',
            type: FoodPreferenceType.FAVORITE_DISH,
            value: 'ленивые голубцы',
          },
        },
      }),
    );
    expect(response.profile?.weightKg).toBe(92);
    expect(response.tastes.favoriteDishes).toHaveLength(1);
    expect(response.tastes.dislikedProducts[0]?.value).toBe('яйца');
  });

  it('adds a disliked product for an existing user', async () => {
    const prisma = createPrismaMock();
    const service = new ProfilesService(prisma as unknown as PrismaService);

    prisma.user.findUnique.mockResolvedValue({ id: 'user-1' });
    prisma.foodPreference.upsert.mockResolvedValue(
      preference('pref-3', FoodPreferenceType.DISLIKED_PRODUCT, 'авокадо', 4),
    );

    const response = await service.addDislikedProduct('user-1', {
      value: 'Авокадо',
      weight: 4,
    });

    expect(prisma.foodPreference.upsert).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          userId_type_value: {
            userId: 'user-1',
            type: FoodPreferenceType.DISLIKED_PRODUCT,
            value: 'авокадо',
          },
        },
      }),
    );
    expect(response.value).toBe('авокадо');
    expect(response.weight).toBe(4);
  });
});

function preference(id: string, type: FoodPreferenceType, value: string, weight: number) {
  return {
    id,
    userId: 'user-1',
    type,
    value,
    notes: null,
    weight,
    repeatFrequency: null,
    createdAt: new Date(),
    updatedAt: new Date(),
  };
}
