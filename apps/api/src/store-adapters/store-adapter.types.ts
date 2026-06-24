import { BudgetTier, CartStatus, GroceryCategory, MeasurementUnit } from '@prisma/client';

export interface StoreProductResponse {
  id: string;
  storeId: string;
  externalId: string | null;
  name: string;
  normalizedName: string;
  category: GroceryCategory;
  priceCents: number;
  packageSize: number;
  packageUnit: MeasurementUnit;
  available: boolean;
  qualityTier: BudgetTier;
}

export interface ParsedStoreProductResponse {
  id: string;
  provider: string;
  externalId: string;
  name: string;
  category: string | null;
  priceCents: number | null;
  priceText: string | null;
  productUrl: string;
  imageUrl: string | null;
  available: boolean;
  source: 'PAGE_PARSE';
}

export interface ParsedStoreSearchResponse {
  provider: string;
  query: string;
  searchUrl: string;
  products: ParsedStoreProductResponse[];
  warnings: string[];
}

export interface StoreAvailabilityResponse {
  productId: string;
  available: boolean;
}

export interface StoreCartItemResponse {
  id: string;
  storeProductId: string | null;
  name: string;
  quantity: number;
  unitPriceCents: number;
  totalPriceCents: number;
  replacementForName: string | null;
  replacementReason: string | null;
}

export interface StoreCartResponse {
  id: string;
  userId: string | null;
  storeId: string;
  groceryListId: string | null;
  status: CartStatus;
  subtotalCents: number;
  currency: string;
  requiresConfirmation: boolean;
  items: StoreCartItemResponse[];
}

export interface StoreAdapter {
  searchProduct(query: string): Promise<StoreProductResponse[]>;
  getProductDetails(productId: string): Promise<StoreProductResponse>;
  checkAvailability(productId: string): Promise<StoreAvailabilityResponse>;
  addToCart(input: {
    cartId?: string;
    userId?: string;
    groceryListId?: string;
    productId: string;
    quantity: number;
  }): Promise<StoreCartResponse>;
  getCart(cartId: string): Promise<StoreCartResponse>;
  replaceProduct(
    cartId: string,
    oldProductId: string,
    newProductId: string,
  ): Promise<StoreCartResponse>;
}
