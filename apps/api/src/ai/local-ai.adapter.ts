import { Injectable } from '@nestjs/common';
import { FoodPreferenceType } from '@prisma/client';
import { CaloriesService } from '../calories/calories.service';
import { DishesService } from '../dishes/dishes.service';
import { GroceryListsService } from '../grocery-lists/grocery-lists.service';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationsService } from '../recommendations/recommendations.service';
import { AiAdapter, AiAssistantResponse, AiIntent } from './ai.types';

@Injectable()
export class LocalAiAdapter implements AiAdapter {
  constructor(
    private readonly prisma: PrismaService,
    private readonly caloriesService: CaloriesService,
    private readonly dishesService: DishesService,
    private readonly recommendationsService: RecommendationsService,
    private readonly groceryListsService: GroceryListsService,
  ) {}

  async handle(userId: string, message: string): Promise<AiAssistantResponse> {
    const normalizedMessage = normalize(message);
    const actions = await this.saveExplicitPreferences(userId, normalizedMessage);
    const intent = detectIntent(normalizedMessage);

    if (intent === 'CALORIES_LEFT') {
      const summary = await this.caloriesService.getTodaySummary(userId);

      return {
        intent,
        actions,
        reply: `Осталось ${summary.remainingCalories} ккал из ${summary.dailyLimit}.`,
        data: summary,
      };
    }

    if (intent === 'WEEKLY_MENU') {
      const menu = await this.recommendationsService.recommendWeeklyMenu(userId, { days: 7 });

      return {
        intent,
        actions,
        reply: `Собрал меню на 7 дней. Средний калораж основных блюд: ${menu.estimatedAverageCalories} ккал.`,
        data: menu,
      };
    }

    if (intent === 'GROCERY_LIST') {
      const menu = await this.recommendationsService.recommendWeeklyMenu(userId, { days: 7 });
      const groceryList = await this.groceryListsService.generateFromMenu(userId, {
        title: 'AI weekly grocery list',
        dishes: menu.groceryCandidateDishSlugs.map((slug) => ({ slug })),
      });

      return {
        intent,
        actions: [...actions, 'generated_grocery_list'],
        reply: `Собрал список покупок: ${groceryList.items.length} позиций, примерно ${groceryList.totalEstimatedCents ?? 0} коп.`,
        data: groceryList,
      };
    }

    if (intent === 'RECIPE' || intent === 'INGREDIENTS') {
      const slug = await this.findDishSlugInMessage(normalizedMessage);
      const recipe = await this.dishesService.getRecipe(slug ?? 'lazy-cabbage-rolls');

      return {
        intent,
        actions,
        reply:
          intent === 'RECIPE'
            ? recipe.instructions.join(' ')
            : recipe.ingredients
                .map((item) => `${item.ingredient.name}: ${item.quantity} ${item.unit}`)
                .join('; '),
        data: intent === 'RECIPE' ? recipe : recipe.ingredients,
      };
    }

    const recommendations = await this.recommendationsService.recommendDishes(userId, { limit: 5 });

    return {
      intent,
      actions,
      reply: `Предлагаю: ${recommendations.recommendations.map((item) => item.dish.name).join(', ')}.`,
      data: recommendations,
    };
  }

  private async saveExplicitPreferences(userId: string, message: string): Promise<string[]> {
    const actions: string[] = [];
    const dishes = await this.dishesService.listDishes();

    if (message.includes('люблю')) {
      for (const dish of dishes) {
        if (message.includes(normalize(dish.name))) {
          await this.upsertPreference(
            userId,
            FoodPreferenceType.FAVORITE_DISH,
            normalize(dish.name),
          );
          actions.push(`saved_favorite:${dish.slug}`);
        }
      }
    }

    if (message.includes('не люблю')) {
      for (const product of ['яйца', 'каши', 'авокадо']) {
        if (message.includes(product)) {
          await this.upsertPreference(userId, FoodPreferenceType.DISLIKED_PRODUCT, product);
          actions.push(`saved_disliked:${product}`);
        }
      }
    }

    return actions;
  }

  private async upsertPreference(
    userId: string,
    type: FoodPreferenceType,
    value: string,
  ): Promise<void> {
    await this.prisma.foodPreference.upsert({
      where: {
        userId_type_value: {
          userId,
          type,
          value,
        },
      },
      update: { weight: 5 },
      create: {
        userId,
        type,
        value,
        weight: 5,
      },
    });
  }

  private async findDishSlugInMessage(message: string): Promise<string | null> {
    const dishes = await this.dishesService.listDishes();
    const dish = dishes.find((item) => message.includes(normalize(item.name)));

    return dish?.slug ?? null;
  }
}

function detectIntent(message: string): AiIntent {
  if (message.includes('калор') && message.includes('остал')) {
    return 'CALORIES_LEFT';
  }

  if (message.includes('список покуп') || message.includes('продукт')) {
    return 'GROCERY_LIST';
  }

  if (message.includes('меню') || message.includes('недел')) {
    return 'WEEKLY_MENU';
  }

  if (message.includes('рецепт') || message.includes('приготов')) {
    return 'RECIPE';
  }

  if (message.includes('ингреди') || message.includes('разлож')) {
    return 'INGREDIENTS';
  }

  return 'DISH_RECOMMENDATIONS';
}

function normalize(value: string): string {
  return value.trim().toLocaleLowerCase('ru-RU');
}
