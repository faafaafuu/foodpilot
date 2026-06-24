import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import {
  GroceryList,
  GroceryListItem,
  MeasurementUnit,
  Prisma,
  Store,
  StoreProduct,
} from '@prisma/client';
import { GroceryListsService } from '../grocery-lists/grocery-lists.service';
import { PrismaService } from '../prisma/prisma.service';
import { StoreCartResponse } from '../store-adapters/store-adapter.types';
import { BuildCartDto } from './dto/build-cart.dto';
import { BuildCartFromMenuRequestDto } from './dto/build-cart-from-menu.dto';
import { MenuCartBuildResponse } from './cart-builder.types';

type GroceryListItemWithDecimal = GroceryListItem & {
  quantity: Prisma.Decimal;
  packageQuantity: Prisma.Decimal | null;
};

type GroceryListWithItems = GroceryList & {
  items: GroceryListItemWithDecimal[];
};

type StoreProductWithDecimal = StoreProduct & {
  packageSize: Prisma.Decimal;
};

@Injectable()
export class CartBuilderService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly groceryListsService: GroceryListsService,
  ) {}

  async buildCartFromMenu(dto: BuildCartFromMenuRequestDto): Promise<MenuCartBuildResponse> {
    const groceryList = await this.groceryListsService.generateFromMenu(dto.userId, dto.menu);
    const cart = await this.buildCartFromGroceryList(groceryList.id, {
      storeCode: dto.menu.storeCode,
    });

    return { groceryList, cart };
  }

  async buildCartFromGroceryList(
    groceryListId: string,
    dto: BuildCartDto = {},
  ): Promise<StoreCartResponse> {
    const [groceryList, store] = await Promise.all([
      this.getGroceryList(groceryListId),
      this.getStore(dto.storeCode ?? 'mock-store'),
    ]);

    if (groceryList.items.length === 0) {
      throw new BadRequestException('Cannot build a cart from an empty grocery list.');
    }

    const cart = await this.prisma.cart.create({
      data: {
        userId: groceryList.userId,
        groceryListId: groceryList.id,
        storeId: store.id,
        status: 'READY_FOR_CONFIRMATION',
        requiresConfirmation: true,
      },
    });
    let subtotalCents = 0;

    for (const item of groceryList.items) {
      const productMatch = await this.findProductForItem(store.id, item);
      if (!productMatch) {
        continue;
      }

      const quantity = packageCountForItem(item, productMatch.product);
      const totalPriceCents = quantity * productMatch.product.priceCents;
      subtotalCents += totalPriceCents;

      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          groceryListItemId: item.id,
          storeProductId: productMatch.product.id,
          name: productMatch.product.name,
          quantity,
          unitPriceCents: productMatch.product.priceCents,
          totalPriceCents,
          replacementForName: productMatch.isReplacement ? item.name : undefined,
          replacementReason: productMatch.isReplacement
            ? 'Exact ingredient product was unavailable; picked same-category mock replacement.'
            : undefined,
        },
      });
    }

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: { subtotalCents, requiresConfirmation: true },
    });

    return this.getCart(cart.id);
  }

  async getCart(cartId: string): Promise<StoreCartResponse> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} was not found`);
    }

    return {
      id: cart.id,
      userId: cart.userId,
      storeId: cart.storeId,
      groceryListId: cart.groceryListId,
      status: cart.status,
      subtotalCents: cart.subtotalCents,
      currency: cart.currency,
      requiresConfirmation: cart.requiresConfirmation,
      items: cart.items.map((item) => ({
        id: item.id,
        storeProductId: item.storeProductId,
        name: item.name,
        quantity: item.quantity,
        unitPriceCents: item.unitPriceCents,
        totalPriceCents: item.totalPriceCents,
        replacementForName: item.replacementForName,
        replacementReason: item.replacementReason,
      })),
    };
  }

  async confirmCart(cartId: string): Promise<StoreCartResponse> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: { items: true },
    });

    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} was not found`);
    }

    if (cart.status === 'CONFIRMED') {
      return this.getCart(cart.id);
    }

    if (cart.status !== 'READY_FOR_CONFIRMATION') {
      throw new BadRequestException('Only carts ready for confirmation can be confirmed.');
    }

    if (cart.items.length === 0) {
      throw new BadRequestException('Cannot confirm an empty cart.');
    }

    await this.prisma.cart.update({
      where: { id: cart.id },
      data: {
        status: 'CONFIRMED',
        requiresConfirmation: false,
        confirmedAt: new Date(),
      },
    });

    return this.getCart(cart.id);
  }

  private async getGroceryList(groceryListId: string): Promise<GroceryListWithItems> {
    const groceryList = await this.prisma.groceryList.findUnique({
      where: { id: groceryListId },
      include: {
        items: {
          orderBy: [{ category: 'asc' }, { name: 'asc' }],
        },
      },
    });

    if (!groceryList) {
      throw new NotFoundException(`Grocery list ${groceryListId} was not found`);
    }

    return groceryList;
  }

  private async getStore(storeCode: string): Promise<Store> {
    const store = await this.prisma.store.findUnique({ where: { code: storeCode } });

    if (!store || !store.active) {
      throw new NotFoundException(`Active store ${storeCode} was not found`);
    }

    return store;
  }

  private async findProductForItem(
    storeId: string,
    item: GroceryListItem,
  ): Promise<{ product: StoreProductWithDecimal; isReplacement: boolean } | null> {
    const exactProduct = item.ingredientId
      ? await this.prisma.storeProduct.findFirst({
          where: {
            storeId,
            ingredientId: item.ingredientId,
            available: true,
            qualityTier: { not: 'HIGH' },
          },
          orderBy: { priceCents: 'asc' },
        })
      : null;

    if (exactProduct) {
      return { product: exactProduct, isReplacement: false };
    }

    const replacement = await this.prisma.storeProduct.findFirst({
      where: {
        storeId,
        category: item.category,
        available: true,
        qualityTier: { not: 'HIGH' },
      },
      orderBy: { priceCents: 'asc' },
    });

    return replacement ? { product: replacement, isReplacement: true } : null;
  }
}

function packageCountForItem(
  item: GroceryListItemWithDecimal,
  product: StoreProductWithDecimal,
): number {
  const packageSize = product.packageSize.toNumber();
  const neededQuantity = convertQuantity(item.quantity.toNumber(), item.unit, product.packageUnit);

  return Math.max(1, Math.ceil(neededQuantity / packageSize));
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
