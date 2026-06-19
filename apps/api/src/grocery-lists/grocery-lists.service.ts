import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  Dish,
  GroceryList,
  GroceryListItem,
  Ingredient,
  MeasurementUnit,
  Prisma,
  Recipe,
  RecipeIngredient,
  StoreProduct,
} from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { GenerateGroceryListDto } from './dto/generate-grocery-list.dto';
import {
  GroceryListExportResponse,
  GroceryListItemResponse,
  GroceryListResponse,
} from './grocery-lists.types';

type DishWithRecipe = Dish & {
  recipe:
    | (Recipe & {
        ingredients: Array<
          RecipeIngredient & {
            quantity: Prisma.Decimal;
            ingredient: Ingredient;
          }
        >;
      })
    | null;
};

type StoreProductWithDecimal = StoreProduct & {
  packageSize: Prisma.Decimal;
};

type GroceryListItemWithDecimal = GroceryListItem & {
  quantity: Prisma.Decimal;
  packageQuantity: Prisma.Decimal | null;
};

type GroceryListWithItems = GroceryList & {
  items: GroceryListItemWithDecimal[];
};

interface CombinedIngredient {
  ingredient: Ingredient;
  quantity: number;
  unit: MeasurementUnit;
}

interface PackagePlan {
  packageSize: number;
  packageUnit: MeasurementUnit;
  packageCount: number;
  roundedQuantity: number;
  estimatedPriceCents: number;
}

@Injectable()
export class GroceryListsService {
  constructor(private readonly prisma: PrismaService) {}

  async generateFromMenu(
    userId: string,
    dto: GenerateGroceryListDto,
  ): Promise<GroceryListResponse> {
    await this.ensureUser(userId);
    const dishes = await this.getDishes(dto.dishes.map((dish) => dish.slug));
    const combinedIngredients = this.combineIngredients(dishes, dto);
    const sourceMenu: Prisma.InputJsonObject = {
      dishes: dto.dishes.map((dish) => ({
        slug: dish.slug,
        servings: dish.servings ?? null,
      })),
    };
    const groceryList = await this.prisma.groceryList.create({
      data: {
        userId,
        title: dto.title ?? 'FoodPilot grocery list',
        status: 'READY',
        sourceMenuJson: sourceMenu,
      },
    });

    let totalEstimatedCents = 0;
    for (const ingredient of combinedIngredients) {
      const product = await this.findPackageProduct(ingredient.ingredient.id);
      const packagePlan = product ? buildPackagePlan(ingredient, product) : null;
      totalEstimatedCents += packagePlan?.estimatedPriceCents ?? 0;

      await this.prisma.groceryListItem.create({
        data: {
          groceryListId: groceryList.id,
          ingredientId: ingredient.ingredient.id,
          name: ingredient.ingredient.name,
          category: ingredient.ingredient.category,
          quantity: new Prisma.Decimal(roundQuantity(ingredient.quantity)),
          unit: ingredient.unit,
          packageQuantity: packagePlan ? new Prisma.Decimal(packagePlan.packageSize) : undefined,
          packageUnit: packagePlan?.packageUnit,
        },
      });
    }

    await this.prisma.groceryList.update({
      where: { id: groceryList.id },
      data: { totalEstimatedCents },
    });

    return this.getGroceryList(groceryList.id);
  }

  async getGroceryList(listId: string): Promise<GroceryListResponse> {
    const groceryList = await this.prisma.groceryList.findUnique({
      where: { id: listId },
      include: {
        items: {
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!groceryList) {
      throw new NotFoundException(`Grocery list ${listId} was not found`);
    }

    return this.toGroceryListResponse(groceryList);
  }

  async exportGroceryList(listId: string): Promise<GroceryListExportResponse> {
    const groceryList = await this.getGroceryList(listId);
    const lines = buildExportLines(groceryList);

    return {
      id: groceryList.id,
      title: groceryList.title,
      lines,
      text: lines.join('\n'),
    };
  }

  private async ensureUser(userId: string): Promise<void> {
    const user = await this.prisma.user.findUnique({ where: { id: userId }, select: { id: true } });

    if (!user) {
      throw new NotFoundException(`User ${userId} was not found`);
    }
  }

  private async getDishes(slugs: string[]): Promise<DishWithRecipe[]> {
    const uniqueSlugs = Array.from(new Set(slugs));
    const dishes = await this.prisma.dish.findMany({
      where: { slug: { in: uniqueSlugs } },
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
    const foundSlugs = new Set(dishes.map((dish) => dish.slug));
    const missingSlugs = uniqueSlugs.filter((slug) => !foundSlugs.has(slug));

    if (missingSlugs.length > 0) {
      throw new NotFoundException(`Dishes were not found: ${missingSlugs.join(', ')}`);
    }

    if (dishes.some((dish) => !dish.recipe)) {
      throw new BadRequestException('All dishes must have recipes to build a grocery list.');
    }

    return dishes;
  }

  private combineIngredients(
    dishes: DishWithRecipe[],
    dto: GenerateGroceryListDto,
  ): CombinedIngredient[] {
    const dishBySlug = new Map(dishes.map((dish) => [dish.slug, dish]));
    const combined = new Map<string, CombinedIngredient>();

    for (const menuDish of dto.dishes) {
      const dish = dishBySlug.get(menuDish.slug);
      if (!dish?.recipe) {
        continue;
      }

      const targetServings = menuDish.servings ?? dish.servings;
      const multiplier = targetServings / dish.servings;

      for (const recipeIngredient of dish.recipe.ingredients) {
        const key = `${recipeIngredient.ingredient.id}:${recipeIngredient.unit}`;
        const existing = combined.get(key);
        const quantity = recipeIngredient.quantity.toNumber() * multiplier;

        if (existing) {
          existing.quantity += quantity;
        } else {
          combined.set(key, {
            ingredient: recipeIngredient.ingredient,
            quantity,
            unit: recipeIngredient.unit,
          });
        }
      }
    }

    return [...combined.values()].sort((left, right) => {
      const categoryCompare = left.ingredient.category.localeCompare(right.ingredient.category);

      return categoryCompare !== 0
        ? categoryCompare
        : left.ingredient.name.localeCompare(right.ingredient.name, 'ru');
    });
  }

  private findPackageProduct(ingredientId: string): Promise<StoreProductWithDecimal | null> {
    return this.prisma.storeProduct.findFirst({
      where: {
        ingredientId,
        available: true,
        store: { active: true },
      },
      orderBy: { priceCents: 'asc' },
    });
  }

  private toGroceryListResponse(groceryList: GroceryListWithItems): GroceryListResponse {
    return {
      id: groceryList.id,
      userId: groceryList.userId,
      title: groceryList.title,
      status: groceryList.status,
      sourceMenu: groceryList.sourceMenuJson,
      totalEstimatedCents: groceryList.totalEstimatedCents,
      items: groceryList.items.map((item) => this.toItemResponse(item)),
    };
  }

  private toItemResponse(item: GroceryListItemWithDecimal): GroceryListItemResponse {
    const packageSize = item.packageQuantity?.toNumber() ?? null;

    return {
      id: item.id,
      ingredientId: item.ingredientId,
      name: item.name,
      category: item.category,
      quantity: item.quantity.toNumber(),
      unit: item.unit,
      package:
        packageSize && item.packageUnit
          ? {
              packageSize,
              packageUnit: item.packageUnit,
              packageCount: Math.ceil(
                convertQuantity(item.quantity.toNumber(), item.unit, item.packageUnit) /
                  packageSize,
              ),
              roundedQuantity:
                Math.ceil(
                  convertQuantity(item.quantity.toNumber(), item.unit, item.packageUnit) /
                    packageSize,
                ) * packageSize,
            }
          : null,
      checked: item.checked,
    };
  }
}

function buildPackagePlan(
  ingredient: CombinedIngredient,
  product: StoreProductWithDecimal,
): PackagePlan {
  const packageSize = product.packageSize.toNumber();
  const packageQuantity = convertQuantity(
    ingredient.quantity,
    ingredient.unit,
    product.packageUnit,
  );
  const packageCount = Math.max(1, Math.ceil(packageQuantity / packageSize));

  return {
    packageSize,
    packageUnit: product.packageUnit,
    packageCount,
    roundedQuantity: packageCount * packageSize,
    estimatedPriceCents: packageCount * product.priceCents,
  };
}

function buildExportLines(groceryList: GroceryListResponse): string[] {
  const lines = [groceryList.title];
  let currentCategory: string | null = null;

  for (const item of groceryList.items) {
    if (item.category !== currentCategory) {
      currentCategory = item.category;
      lines.push('', categoryLabel(item.category));
    }

    const packageText = item.package
      ? `; купить ${item.package.packageCount} x ${formatQuantity(item.package.packageSize, item.package.packageUnit)}`
      : '';
    lines.push(`- ${item.name}: ${formatQuantity(item.quantity, item.unit)}${packageText}`);
  }

  return lines;
}

function convertQuantity(quantity: number, from: MeasurementUnit, to: MeasurementUnit): number {
  if (from === to) {
    return quantity;
  }

  if (from === 'KILOGRAM' && to === 'GRAM') {
    return quantity * 1000;
  }

  if (from === 'GRAM' && to === 'KILOGRAM') {
    return quantity / 1000;
  }

  if (from === 'LITER' && to === 'MILLILITER') {
    return quantity * 1000;
  }

  if (from === 'MILLILITER' && to === 'LITER') {
    return quantity / 1000;
  }

  if ((from === 'MILLILITER' && to === 'GRAM') || (from === 'GRAM' && to === 'MILLILITER')) {
    return quantity;
  }

  return quantity;
}

function roundQuantity(quantity: number): number {
  return Number(quantity.toFixed(2));
}

function formatQuantity(quantity: number, unit: MeasurementUnit): string {
  const value = Number.isInteger(quantity) ? quantity.toString() : quantity.toFixed(2);

  return `${value} ${unitLabel(unit)}`;
}

function unitLabel(unit: MeasurementUnit): string {
  const labels: Record<MeasurementUnit, string> = {
    GRAM: 'г',
    KILOGRAM: 'кг',
    MILLILITER: 'мл',
    LITER: 'л',
    PIECE: 'шт',
    CAN: 'бан.',
    PACK: 'уп.',
    BUNCH: 'пуч.',
  };

  return labels[unit];
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    MEAT: 'Мясо',
    VEGETABLES: 'Овощи',
    DAIRY: 'Молочка',
    GRAINS: 'Крупы',
    PANTRY: 'Бакалея',
    DRINKS: 'Напитки',
    OTHER: 'Прочее',
  };

  return labels[category] ?? category;
}
