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

@Injectable()
export class InstacartDeveloperAdapter {
  constructor(private readonly groceryListsService: GroceryListsService) {}

  getStatus(): ExternalStoreStatusResponse {
    const baseUrl = this.baseUrl();

    return {
      provider: 'instacart',
      configured: Boolean(this.apiKey()),
      mode: baseUrl.includes('dev.') ? 'development' : 'production',
      baseUrl,
      capabilities: ['nearby_retailers', 'shopping_list_link', 'marketplace_checkout_redirect'],
      requiredEnv: ['INSTACART_API_KEY'],
      checkoutBehavior: 'REDIRECT_TO_PROVIDER',
    };
  }

  async getNearbyRetailers(
    postalCode: string,
    countryCode = 'US',
  ): Promise<InstacartRetailersResponse> {
    this.requireApiKey();
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
    this.requireApiKey();
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

  private apiKey(): string | undefined {
    return process.env.INSTACART_API_KEY;
  }

  private baseUrl(): string {
    return process.env.INSTACART_API_BASE_URL ?? 'https://connect.dev.instacart.tools';
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
