import { BadRequestException, Injectable } from '@nestjs/common';
import { CreateBrowserAutomationPlanDto } from './dto/create-browser-automation-plan.dto';
import {
  BrowserStoreAutomationPlanResponse,
  BrowserStoreAutomationPlanStep,
  BrowserStoreAutomationProvider,
  BrowserStoreAutomationProviderStatus,
  BrowserStoreAutomationStatusResponse,
} from './store-adapter.types';

const GLOBAL_RULES = [
  'FoodPilot may reuse a user-owned browser session, but must not store raw store passwords.',
  'FoodPilot may search products and assemble a cart after user consent.',
  'FoodPilot must require a fresh user confirmation before submitting an external order.',
  'FoodPilot must not capture payment or bypass provider bank, 3DS, SMS, or captcha challenges.',
  'FoodPilot must not log cookies, session tokens, payment data, or delivery addresses.',
];

@Injectable()
export class BrowserStoreAutomationPolicyService {
  getStatus(): BrowserStoreAutomationStatusResponse {
    return {
      providers: providerStatuses(),
      globalRules: GLOBAL_RULES,
    };
  }

  createPlan(dto: CreateBrowserAutomationPlanDto): BrowserStoreAutomationPlanResponse {
    const allowSearch = dto.allowSearch ?? true;
    const allowCartAssembly = dto.allowCartAssembly ?? true;
    const allowOrderSubmission = dto.allowOrderSubmission ?? false;
    const allowPayment = dto.allowPayment ?? false;

    if (allowPayment) {
      throw new BadRequestException(
        'Automatic payment is not allowed. The provider checkout or bank challenge must be confirmed by the user.',
      );
    }

    const warnings: string[] = [];
    const steps: BrowserStoreAutomationPlanStep[] = [
      {
        order: 1,
        code: 'OPEN_USER_BROWSER_SESSION',
        actor: 'USER',
        description:
          'User opens a provider browser session and signs in directly with the provider.',
        requiresFreshUserAction: true,
      },
    ];

    if (allowSearch) {
      steps.push({
        order: steps.length + 1,
        code: 'SEARCH_PRODUCTS',
        actor: 'FOODPILOT',
        description: 'FoodPilot searches provider pages for grocery-list items.',
        requiresFreshUserAction: false,
      });
    }

    if (allowCartAssembly) {
      steps.push({
        order: steps.length + 1,
        code: 'ASSEMBLE_CART',
        actor: 'FOODPILOT',
        description: 'FoodPilot adds matched products to the provider cart in the user session.',
        requiresFreshUserAction: false,
      });
      steps.push({
        order: steps.length + 1,
        code: 'REVIEW_CART',
        actor: 'USER',
        description: 'User reviews products, replacements, delivery address, and total price.',
        requiresFreshUserAction: true,
      });
    }

    if (allowOrderSubmission) {
      warnings.push('Order submission is allowed only after the user confirms this exact cart.');
      steps.push({
        order: steps.length + 1,
        code: 'CONFIRM_EXTERNAL_ORDER',
        actor: 'USER',
        description:
          'User gives fresh confirmation for this exact external cart before order submission.',
        requiresFreshUserAction: true,
      });
      steps.push({
        order: steps.length + 1,
        code: 'SUBMIT_ORDER',
        actor: 'FOODPILOT',
        description:
          'FoodPilot may press the provider order button only after the fresh confirmation step.',
        requiresFreshUserAction: false,
      });
    } else {
      warnings.push('External order submission is disabled for this plan.');
    }

    steps.push({
      order: steps.length + 1,
      code: 'PROVIDER_PAYMENT_CONFIRMATION',
      actor: 'STORE_PROVIDER',
      description:
        'Payment remains inside the provider or bank flow and requires user interaction when requested.',
      requiresFreshUserAction: true,
    });

    return {
      provider: dto.provider,
      requested: {
        allowSearch,
        allowCartAssembly,
        allowOrderSubmission,
        allowPayment,
      },
      allowed: {
        canSearch: allowSearch,
        canAssembleCart: allowCartAssembly,
        canSubmitOrder: allowOrderSubmission,
        canPay: false,
      },
      steps,
      warnings,
    };
  }
}

function providerStatuses(): BrowserStoreAutomationProviderStatus[] {
  return [
    browserProvider('yandex-eda', 'Яндекс Еда'),
    browserProvider('yandex-go', 'Яндекс Go'),
    browserProvider('pyaterochka', 'Пятерочка'),
    browserProvider('magnit', 'Магнит'),
  ];
}

function browserProvider(
  provider: BrowserStoreAutomationProvider,
  displayName: string,
): BrowserStoreAutomationProviderStatus {
  return {
    provider,
    displayName,
    mode: 'USER_OWNED_BROWSER_SESSION',
    sessionPersistence: 'LOCAL_BROWSER_PROFILE',
    capabilities: [
      {
        code: 'AUTH_ONCE',
        status: 'REQUIRES_PLAYWRIGHT_SESSION',
        description: 'User signs in once in a local browser profile controlled by the user.',
      },
      {
        code: 'SEARCH_PRODUCTS',
        status: 'REQUIRES_PLAYWRIGHT_SESSION',
        description: 'FoodPilot can search products after the user session is available.',
      },
      {
        code: 'ASSEMBLE_CART',
        status: 'REQUIRES_PLAYWRIGHT_SESSION',
        description: 'FoodPilot can add matched products to the provider cart.',
      },
      {
        code: 'SUBMIT_ORDER',
        status: 'REQUIRES_USER_CONFIRMATION',
        description: 'External order submission requires fresh confirmation for the exact cart.',
      },
      {
        code: 'PAYMENT',
        status: 'BLOCKED',
        description:
          'Automatic payment capture is blocked; payment stays inside provider or bank confirmation.',
      },
    ],
    hardLimits: [
      'No raw password storage.',
      'No card data storage.',
      'No captcha, 3DS, SMS, or bank challenge bypass.',
      'No hidden external order submission.',
    ],
  };
}
