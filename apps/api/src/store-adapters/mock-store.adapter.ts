import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { Cart, CartItem, Prisma, Store, StoreProduct } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import {
  StoreAdapter,
  StoreAvailabilityResponse,
  StoreCartResponse,
  StoreProductResponse,
} from './store-adapter.types';

type StoreProductWithDecimal = StoreProduct & {
  packageSize: Prisma.Decimal;
};

type CartItemWithProduct = CartItem & {
  storeProduct: StoreProduct | null;
};

type CartWithItems = Cart & {
  items: CartItemWithProduct[];
};

@Injectable()
export class MockStoreAdapter implements StoreAdapter {
  constructor(private readonly prisma: PrismaService) {}

  async searchProduct(query: string): Promise<StoreProductResponse[]> {
    const store = await this.getMockStore();
    const normalizedQuery = query.trim();
    const products = await this.prisma.storeProduct.findMany({
      where: {
        storeId: store.id,
        ...(normalizedQuery
          ? {
              OR: [
                { name: { contains: normalizedQuery, mode: 'insensitive' } },
                { normalizedName: { contains: normalizedQuery.toLocaleLowerCase('ru-RU') } },
              ],
            }
          : {}),
      },
      orderBy: [{ available: 'desc' }, { priceCents: 'asc' }, { name: 'asc' }],
      take: 20,
    });

    return products.map((product) => toProductResponse(product));
  }

  async getProductDetails(productId: string): Promise<StoreProductResponse> {
    const product = await this.prisma.storeProduct.findUnique({ where: { id: productId } });

    if (!product) {
      throw new NotFoundException(`Store product ${productId} was not found`);
    }

    return toProductResponse(product);
  }

  async checkAvailability(productId: string): Promise<StoreAvailabilityResponse> {
    const product = await this.getProductDetails(productId);

    return {
      productId,
      available: product.available,
    };
  }

  async addToCart(input: {
    cartId?: string;
    userId?: string;
    groceryListId?: string;
    productId: string;
    quantity: number;
  }): Promise<StoreCartResponse> {
    const product = await this.getProduct(input.productId);
    if (!product.available) {
      throw new BadRequestException(`Product ${input.productId} is not available`);
    }

    const cart = await this.getOrCreateCart(input);
    if (cart.storeId !== product.storeId) {
      throw new BadRequestException('Cart and product belong to different stores');
    }

    const existingItem = await this.prisma.cartItem.findFirst({
      where: { cartId: cart.id, storeProductId: product.id },
    });

    if (existingItem) {
      await this.prisma.cartItem.update({
        where: { id: existingItem.id },
        data: {
          quantity: existingItem.quantity + input.quantity,
          totalPriceCents: (existingItem.quantity + input.quantity) * product.priceCents,
        },
      });
    } else {
      await this.prisma.cartItem.create({
        data: {
          cartId: cart.id,
          storeProductId: product.id,
          name: product.name,
          quantity: input.quantity,
          unitPriceCents: product.priceCents,
          totalPriceCents: input.quantity * product.priceCents,
        },
      });
    }

    await this.recalculateCart(cart.id);

    return this.getCart(cart.id);
  }

  async getCart(cartId: string): Promise<StoreCartResponse> {
    const cart = await this.prisma.cart.findUnique({
      where: { id: cartId },
      include: {
        items: {
          include: { storeProduct: true },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart) {
      throw new NotFoundException(`Cart ${cartId} was not found`);
    }

    return toCartResponse(cart);
  }

  async replaceProduct(
    cartId: string,
    oldProductId: string,
    newProductId: string,
  ): Promise<StoreCartResponse> {
    const [oldItem, newProduct] = await Promise.all([
      this.prisma.cartItem.findFirst({
        where: { cartId, storeProductId: oldProductId },
      }),
      this.getProduct(newProductId),
    ]);

    if (!oldItem) {
      throw new NotFoundException(`Product ${oldProductId} was not found in cart ${cartId}`);
    }

    if (!newProduct.available) {
      throw new BadRequestException(`Replacement product ${newProductId} is not available`);
    }

    await this.prisma.cartItem.update({
      where: { id: oldItem.id },
      data: {
        storeProductId: newProduct.id,
        name: newProduct.name,
        unitPriceCents: newProduct.priceCents,
        totalPriceCents: oldItem.quantity * newProduct.priceCents,
        replacementForName: oldItem.name,
        replacementReason: 'Manual replacement in mock store adapter',
      },
    });
    await this.recalculateCart(cartId);

    return this.getCart(cartId);
  }

  private async getMockStore(): Promise<Store> {
    const store = await this.prisma.store.findFirst({
      where: { adapterKey: 'mock', active: true },
      orderBy: { createdAt: 'asc' },
    });

    if (!store) {
      throw new NotFoundException('Active mock store was not found');
    }

    return store;
  }

  private async getProduct(productId: string): Promise<StoreProductWithDecimal> {
    const product = await this.prisma.storeProduct.findUnique({ where: { id: productId } });

    if (!product) {
      throw new NotFoundException(`Store product ${productId} was not found`);
    }

    return product;
  }

  private async getOrCreateCart(input: {
    cartId?: string;
    userId?: string;
    groceryListId?: string;
  }): Promise<Cart> {
    if (input.cartId) {
      const cart = await this.prisma.cart.findUnique({ where: { id: input.cartId } });
      if (!cart) {
        throw new NotFoundException(`Cart ${input.cartId} was not found`);
      }

      return cart;
    }

    const store = await this.getMockStore();

    return this.prisma.cart.create({
      data: {
        userId: input.userId,
        groceryListId: input.groceryListId,
        storeId: store.id,
        status: 'DRAFT',
        requiresConfirmation: true,
      },
    });
  }

  private async recalculateCart(cartId: string): Promise<void> {
    const items = await this.prisma.cartItem.findMany({ where: { cartId } });
    const subtotalCents = items.reduce((sum, item) => sum + item.totalPriceCents, 0);

    await this.prisma.cart.update({
      where: { id: cartId },
      data: { subtotalCents, requiresConfirmation: true },
    });
  }
}

function toProductResponse(product: StoreProductWithDecimal): StoreProductResponse {
  return {
    id: product.id,
    storeId: product.storeId,
    externalId: product.externalId,
    name: product.name,
    normalizedName: product.normalizedName,
    category: product.category,
    priceCents: product.priceCents,
    packageSize: product.packageSize.toNumber(),
    packageUnit: product.packageUnit,
    available: product.available,
    qualityTier: product.qualityTier,
  };
}

function toCartResponse(cart: CartWithItems): StoreCartResponse {
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
