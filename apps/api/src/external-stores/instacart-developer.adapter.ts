import { BadGatewayException, BadRequestException, Injectable } from '@nestjs/common';
import { MeasurementUnit } from '@prisma/client';
import { GroceryListsService } from '../grocery-lists/grocery-lists.service';
import { GroceryListItemResponse } from '../grocery-lists/grocery-lists.types';
import { CreateInstacartLinkDto } from './dto/create-instacart-link.dto';
import {
  ExternalStoreStatusResponse,
  InstacartRetailersResponse,
  InstacartShoppingListLinkResponse,
} from './external-stores.types';

interface InstacartRetailersApiResponse {
  retailers?: Array<{
    retailer_key: string;
    name: string;
    retailer_logo_url?: string;
  }>;
}

interface InstacartProductsLinkApiResponse {
  products_link_url?: string;
}

const INSTACART_DEVELOPMENT_BASE_URL = 'https://connect.dev.instacart.tools';
const INSTACART_PRODUCTION_BASE_URL = 'https://connect.instacart.com';

@Injectable()
export class InstacartDeveloperAdapter {
  constructor(private readonly groceryListsService: GroceryListsService) {}

  getStatus(): ExternalStoreStatusResponse {
    const baseUrl = this.baseUrl();
    const mode = this.mode();
    const missingEnv = this.missingEnv();
    const productionReady = missingEnv.length === 0;

    return {
      provider: 'instacart',
      configured: Boolean(this.apiKey()),
      productionReady,
      mode,
      baseUrl,
      capabilities: ['nearby_retailers', 'shopping_list_link', 'marketplace_checkout_redirect'],
      requiredEnv: ['INSTACART_API_KEY', 'INSTACART_ENV=production'],
      missingEnv,
      checkoutBehavior: 'REDIRECT_TO_PROVIDER',
    };
  }

  async getNearbyRetailers(
    postalCode: string,
    countryCode = 'US',
  ): Promise<InstacartRetailersResponse> {
    this.requireProductionReady();
    if (!postalCode?.trim()) {
      throw new BadRequestException('postalCode is required to query Instacart retailers.');
    }

    const url = new URL('/idp/v1/retailers', this.baseUrl());
    url.searchParams.set('postal_code', postalCode.trim());
    url.searchParams.set('country_code', countryCode);

    const response = await this.request<InstacartRetailersApiResponse>(url, { method: 'GET' });

    return {
      provider: 'instacart',
      retailers: response.retailers ?? [],
    };
  }

  async createShoppingListLink(
    groceryListId: string,
    dto: CreateInstacartLinkDto = {},
  ): Promise<InstacartShoppingListLinkResponse> {
    this.requireProductionReady();
    const groceryList = await this.groceryListsService.getGroceryList(groceryListId);
    const url = new URL('/idp/v1/products/products_link', this.baseUrl());
    const body = {
      title: dto.title ?? groceryList.title,
      link_type: 'shopping_list',
      expires_in: dto.expiresInDays ?? 30,
      instructions: [
        'FoodPilot prepared this grocery list from selected meal-prep dishes.',
        'Review substitutions, store choice, delivery slot, and payment inside Instacart before checkout.',
      ],
      line_items: groceryList.items.map(toInstacartLineItem),
      ...(dto.partnerLinkbackUrl
        ? {
            landing_page_configuration: {
              partner_linkback_url: dto.partnerLinkbackUrl,
            },
          }
        : {}),
    };
    const response = await this.request<InstacartProductsLinkApiResponse>(url, {
      body: JSON.stringify(body),
      method: 'POST',
    });

    if (!response.products_link_url) {
      throw new BadGatewayException('Instacart did not return a products link URL.');
    }

    return {
      provider: 'instacart',
      groceryListId,
      title: groceryList.title,
      productsLinkUrl: response.products_link_url,
      lineItemCount: groceryList.items.length,
      checkoutBehavior: 'REDIRECT_TO_PROVIDER',
    };
  }

  private async request<T>(url: URL, init: RequestInit): Promise<T> {
    const response = await fetch(url.toString(), {
      ...init,
      headers: {
        Accept: 'application/json',
        Authorization: `Bearer ${this.requireApiKey()}`,
        ...(init.body ? { 'Content-Type': 'application/json' } : {}),
      },
    });
    const text = await response.text();

    if (!response.ok) {
      throw new BadGatewayException(
        `Instacart API request failed: ${response.status} ${text.slice(0, 500)}`,
      );
    }

    return (text ? JSON.parse(text) : {}) as T;
  }

  private requireApiKey(): string {
    const key = this.apiKey();

    if (!key) {
      throw new BadRequestException(
        'INSTACART_API_KEY is required to use the real Instacart integration.',
      );
    }

    return key;
  }

  private requireProductionReady(): string {
    const key = this.requireApiKey();
    const missingEnv = this.missingEnv();

    if (missingEnv.length > 0) {
      throw new BadRequestException(
        `Instacart production checkout is not configured. Missing: ${missingEnv.join(', ')}.`,
      );
    }

    return key;
  }

  private missingEnv(): string[] {
    const missing: string[] = [];

    if (!this.apiKey()) {
      missing.push('INSTACART_API_KEY');
    }

    if (this.mode() !== 'production') {
      missing.push('INSTACART_ENV=production');
    }

    if (this.baseUrl().includes('.dev.')) {
      missing.push('INSTACART_API_BASE_URL=https://connect.instacart.com');
    }

    return missing;
  }

  private apiKey(): string | undefined {
    return process.env.INSTACART_API_KEY;
  }

  private mode(): 'development' | 'production' {
    return process.env.INSTACART_ENV === 'development' ? 'development' : 'production';
  }

  private baseUrl(): string {
    if (process.env.INSTACART_API_BASE_URL) {
      return process.env.INSTACART_API_BASE_URL;
    }

    return this.mode() === 'development'
      ? INSTACART_DEVELOPMENT_BASE_URL
      : INSTACART_PRODUCTION_BASE_URL;
  }
}

function toInstacartLineItem(item: GroceryListItemResponse) {
  return {
    name: item.name,
    display_text: item.name,
    line_item_measurements: [
      {
        quantity: roundInstacartQuantity(item.quantity),
        unit: toInstacartUnit(item.unit),
      },
    ],
  };
}

function roundInstacartQuantity(quantity: number): number {
  return Number(quantity.toFixed(2));
}

function toInstacartUnit(unit: MeasurementUnit): string {
  const units: Record<MeasurementUnit, string> = {
    BUNCH: 'bunch',
    CAN: 'can',
    GRAM: 'gram',
    KILOGRAM: 'kilogram',
    LITER: 'liter',
    MILLILITER: 'milliliter',
    PACK: 'package',
    PIECE: 'each',
  };

  return units[unit];
}
