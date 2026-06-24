export interface ExternalStoreStatusResponse {
  provider: 'instacart';
  configured: boolean;
  productionReady: boolean;
  mode: 'development' | 'production';
  baseUrl: string;
  capabilities: string[];
  requiredEnv: string[];
  missingEnv: string[];
  checkoutBehavior: 'REDIRECT_TO_PROVIDER';
}

export interface InstacartRetailerResponse {
  retailer_key: string;
  name: string;
  retailer_logo_url?: string;
}

export interface InstacartRetailersResponse {
  provider: 'instacart';
  retailers: InstacartRetailerResponse[];
}

export interface InstacartShoppingListLinkResponse {
  provider: 'instacart';
  groceryListId: string;
  title: string;
  productsLinkUrl: string;
  lineItemCount: number;
  checkoutBehavior: 'REDIRECT_TO_PROVIDER';
}
