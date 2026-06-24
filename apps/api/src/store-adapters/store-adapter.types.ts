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

export type BrowserStoreAutomationProvider = 'yandex-eda' | 'yandex-go' | 'pyaterochka' | 'magnit';

export type BrowserStoreAutomationMode =
  | 'USER_OWNED_BROWSER_SESSION'
  | 'DIRECT_PAGE_PARSE'
  | 'OFFICIAL_REDIRECT';

export type BrowserStoreAutomationCapabilityStatus =
  | 'AVAILABLE'
  | 'REQUIRES_PLAYWRIGHT_SESSION'
  | 'REQUIRES_USER_CONFIRMATION'
  | 'BLOCKED';

export interface BrowserStoreAutomationCapability {
  code: string;
  status: BrowserStoreAutomationCapabilityStatus;
  description: string;
}

export interface BrowserStoreAutomationProviderStatus {
  provider: BrowserStoreAutomationProvider;
  displayName: string;
  mode: BrowserStoreAutomationMode;
  sessionPersistence: 'LOCAL_BROWSER_PROFILE' | 'NONE';
  capabilities: BrowserStoreAutomationCapability[];
  hardLimits: string[];
}

export interface BrowserStoreAutomationStatusResponse {
  providers: BrowserStoreAutomationProviderStatus[];
  globalRules: string[];
}

export interface BrowserStoreAutomationPlanStep {
  order: number;
  code: string;
  actor: 'USER' | 'FOODPILOT' | 'STORE_PROVIDER';
  description: string;
  requiresFreshUserAction: boolean;
}

export interface BrowserStoreAutomationPlanResponse {
  provider: BrowserStoreAutomationProvider;
  requested: {
    allowSearch: boolean;
    allowCartAssembly: boolean;
    allowOrderSubmission: boolean;
    allowPayment: boolean;
  };
  allowed: {
    canSearch: boolean;
    canAssembleCart: boolean;
    canSubmitOrder: boolean;
    canPay: boolean;
  };
  steps: BrowserStoreAutomationPlanStep[];
  warnings: string[];
}

export type BrowserStoreSessionStatus =
  | 'OPENING'
  | 'AWAITING_PROVIDER_LOGIN'
  | 'READY_FOR_CART_AUTOMATION'
  | 'CLOSED'
  | 'FAILED';

export interface BrowserStoreSessionResponse {
  id: string;
  provider: BrowserStoreAutomationProvider;
  displayName: string;
  status: BrowserStoreSessionStatus;
  loginUrl: string;
  profilePath: string;
  headless: boolean;
  createdAt: string;
  openedAt: string | null;
  closedAt: string | null;
  currentUrl: string | null;
  canSearch: boolean;
  canAssembleCart: boolean;
  canSubmitOrder: boolean;
  canPay: boolean;
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
