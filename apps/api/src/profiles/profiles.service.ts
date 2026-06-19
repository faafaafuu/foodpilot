import { Injectable, NotFoundException } from '@nestjs/common';
import { DietGoal, FoodPreference, FoodPreferenceType, Prisma, User } from '@prisma/client';
import { randomUUID } from 'node:crypto';
import { PrismaService } from '../prisma/prisma.service';
import { AddPreferenceDto } from './dto/add-preference.dto';
import { CreateProfileDto } from './dto/create-profile.dto';
import { UpdateProfileDto } from './dto/update-profile.dto';
import { decimalToNumber, PreferenceResponse, ProfileResponse } from './profile-response';

type UserWithProfileAndPreferences = User & {
  profile: {
    weightKg: Prisma.Decimal | null;
    heightCm: number | null;
    age: number | null;
    goal: DietGoal;
    dailyCalorieLimit: number | null;
    desiredMealsPerDay: number;
    weeklyBudgetCents: number | null;
    deliveryCity: string | null;
    preferredStores: string[];
  } | null;
  preferences: FoodPreference[];
};

type ProfileCreateData = Omit<Prisma.UserProfileUncheckedCreateInput, 'userId'>;

@Injectable()
export class ProfilesService {
  constructor(private readonly prisma: PrismaService) {}

  async createProfile(dto: CreateProfileDto): Promise<ProfileResponse> {
    const user = await this.prisma.user.upsert({
      where: { email: dto.email ?? `local-${randomUUID()}@foodpilot.local` },
      update: {
        displayName: dto.displayName,
      },
      create: {
        email: dto.email,
        displayName: dto.displayName,
      },
    });

    await this.prisma.userProfile.upsert({
      where: { userId: user.id },
      update: this.profileData(dto),
      create: {
        ...this.profileData(dto),
        userId: user.id,
      },
    });

    if (dto.dailyCalorieLimit) {
      await this.prisma.calorieGoal.create({
        data: {
          userId: user.id,
          goal: dto.goal,
          dailyCalories: dto.dailyCalorieLimit,
        },
      });
    }

    await this.upsertPreferenceList(
      user.id,
      FoodPreferenceType.FAVORITE_DISH,
      dto.favoriteDishes ?? [],
      5,
    );
    await this.upsertPreferenceList(
      user.id,
      FoodPreferenceType.DISLIKED_PRODUCT,
      dto.dislikedProducts ?? [],
      5,
    );

    return this.getProfile(user.id);
  }

  async updateProfile(userId: string, dto: UpdateProfileDto): Promise<ProfileResponse> {
    await this.ensureUser(userId);

    if (dto.displayName !== undefined) {
      await this.prisma.user.update({
        where: { id: userId },
        data: { displayName: dto.displayName },
      });
    }

    await this.prisma.userProfile.upsert({
      where: { userId },
      update: this.updateProfileData(dto),
      create: {
        ...this.defaultProfileData(dto),
        userId,
      },
    });

    if (dto.dailyCalorieLimit !== undefined || dto.goal !== undefined) {
      await this.prisma.calorieGoal.create({
        data: {
          userId,
          goal: dto.goal ?? DietGoal.WEIGHT_LOSS,
          dailyCalories: dto.dailyCalorieLimit ?? 1800,
        },
      });
    }

    return this.getProfile(userId);
  }

  async getProfile(userId: string): Promise<ProfileResponse> {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      include: {
        profile: true,
        preferences: {
          orderBy: [{ type: 'asc' }, { weight: 'desc' }, { value: 'asc' }],
        },
      },
    });

    if (!user) {
      throw new NotFoundException(`User ${userId} was not found`);
    }

    return this.toProfileResponse(user);
  }

  async getTastes(userId: string): Promise<ProfileResponse['tastes']> {
    return (await this.getProfile(userId)).tastes;
  }

  async addFavoriteDish(userId: string, dto: AddPreferenceDto): Promise<PreferenceResponse> {
    await this.ensureUser(userId);
    const preference = await this.upsertPreference(userId, FoodPreferenceType.FAVORITE_DISH, dto);

    return this.toPreferenceResponse(preference);
  }

  async addDislikedProduct(userId: string, dto: AddPreferenceDto): Promise<PreferenceResponse> {
    await this.ensureUser(userId);
    const preference = await this.upsertPreference(
      userId,
      FoodPreferenceType.DISLIKED_PRODUCT,
      dto,
    );

    return this.toPreferenceResponse(preference);
  }

  private async ensureUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

    if (!user) {
      throw new NotFoundException(`User ${userId} was not found`);
    }
  }

  private profileData(dto: CreateProfileDto): ProfileCreateData {
    return {
      weightKg: new Prisma.Decimal(dto.weightKg),
      heightCm: dto.heightCm,
      age: dto.age,
      goal: dto.goal,
      dailyCalorieLimit: dto.dailyCalorieLimit,
      desiredMealsPerDay: dto.desiredMealsPerDay ?? 3,
      weeklyBudgetCents: dto.weeklyBudgetCents,
      deliveryCity: dto.deliveryCity,
      preferredStores: dto.preferredStores ?? [],
    };
  }

  private updateProfileData(dto: UpdateProfileDto): Prisma.UserProfileUncheckedUpdateInput {
    return {
      ...(dto.weightKg !== undefined ? { weightKg: new Prisma.Decimal(dto.weightKg) } : {}),
      ...(dto.heightCm !== undefined ? { heightCm: dto.heightCm } : {}),
      ...(dto.age !== undefined ? { age: dto.age } : {}),
      ...(dto.goal !== undefined ? { goal: dto.goal } : {}),
      ...(dto.dailyCalorieLimit !== undefined ? { dailyCalorieLimit: dto.dailyCalorieLimit } : {}),
      ...(dto.desiredMealsPerDay !== undefined
        ? { desiredMealsPerDay: dto.desiredMealsPerDay }
        : {}),
      ...(dto.weeklyBudgetCents !== undefined ? { weeklyBudgetCents: dto.weeklyBudgetCents } : {}),
      ...(dto.deliveryCity !== undefined ? { deliveryCity: dto.deliveryCity } : {}),
      ...(dto.preferredStores !== undefined ? { preferredStores: dto.preferredStores } : {}),
    };
  }

  private defaultProfileData(dto: UpdateProfileDto): ProfileCreateData {
    return {
      weightKg: dto.weightKg !== undefined ? new Prisma.Decimal(dto.weightKg) : undefined,
      heightCm: dto.heightCm,
      age: dto.age,
      goal: dto.goal ?? DietGoal.WEIGHT_LOSS,
      dailyCalorieLimit: dto.dailyCalorieLimit,
      desiredMealsPerDay: dto.desiredMealsPerDay ?? 3,
      weeklyBudgetCents: dto.weeklyBudgetCents,
      deliveryCity: dto.deliveryCity,
      preferredStores: dto.preferredStores ?? [],
    };
  }

  private async upsertPreferenceList(
    userId: string,
    type: FoodPreferenceType,
    values: string[],
    weight: number,
  ): Promise<void> {
    for (const value of values) {
      await this.upsertPreference(userId, type, { value, weight });
    }
  }

  private async upsertPreference(
    userId: string,
    type: FoodPreferenceType,
    dto: AddPreferenceDto,
  ): Promise<FoodPreference> {
    const value = dto.value.trim().toLocaleLowerCase('ru-RU');

    return this.prisma.foodPreference.upsert({
      where: {
        userId_type_value: {
          userId,
          type,
          value,
        },
      },
      update: {
        notes: dto.notes,
        weight: dto.weight ?? 1,
        repeatFrequency: dto.repeatFrequency,
      },
      create: {
        userId,
        type,
        value,
        notes: dto.notes,
        weight: dto.weight ?? 1,
        repeatFrequency: dto.repeatFrequency,
      },
    });
  }

  private toProfileResponse(user: UserWithProfileAndPreferences): ProfileResponse {
    const all = user.preferences.map((preference) => this.toPreferenceResponse(preference));

    return {
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
      },
      profile: user.profile
        ? {
            weightKg: decimalToNumber(user.profile.weightKg),
            heightCm: user.profile.heightCm,
            age: user.profile.age,
            goal: user.profile.goal,
            dailyCalorieLimit: user.profile.dailyCalorieLimit,
            desiredMealsPerDay: user.profile.desiredMealsPerDay,
            weeklyBudgetCents: user.profile.weeklyBudgetCents,
            deliveryCity: user.profile.deliveryCity,
            preferredStores: user.profile.preferredStores,
          }
        : null,
      tastes: {
        favoriteDishes: all.filter((item) => item.type === FoodPreferenceType.FAVORITE_DISH),
        dislikedProducts: all.filter((item) => item.type === FoodPreferenceType.DISLIKED_PRODUCT),
        mealStyles: all.filter((item) => item.type === FoodPreferenceType.MEAL_STYLE),
        all,
      },
    };
  }

  private toPreferenceResponse(preference: FoodPreference): PreferenceResponse {
    return {
      id: preference.id,
      type: preference.type,
      value: preference.value,
      notes: preference.notes,
      weight: preference.weight,
      repeatFrequency: preference.repeatFrequency,
    };
  }
}
