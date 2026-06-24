import { GroceryListResponse } from '../grocery-lists/grocery-lists.types';
import { StoreCartResponse } from '../store-adapters/store-adapter.types';

export interface MenuCartBuildResponse {
  groceryList: GroceryListResponse;
  cart: StoreCartResponse;
}
