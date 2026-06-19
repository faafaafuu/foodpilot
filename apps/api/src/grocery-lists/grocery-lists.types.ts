import { GroceryCategory, GroceryListStatus, MeasurementUnit } from '@prisma/client';

export interface GroceryListPackageResponse {
  packageSize: number;
  packageUnit: MeasurementUnit;
  packageCount: number;
  roundedQuantity: number;
}

export interface GroceryListItemResponse {
  id: string;
  ingredientId: string | null;
  name: string;
  category: GroceryCategory;
  quantity: number;
  unit: MeasurementUnit;
  package: GroceryListPackageResponse | null;
  checked: boolean;
}

export interface GroceryListResponse {
  id: string;
  userId: string | null;
  title: string;
  status: GroceryListStatus;
  sourceMenu: unknown;
  totalEstimatedCents: number | null;
  items: GroceryListItemResponse[];
}

export interface GroceryListExportResponse {
  id: string;
  title: string;
  lines: string[];
  text: string;
}
