'use client';

import { FormEvent, useMemo, useState } from 'react';

type ProfileResponse = {
  user: {
    id: string;
    email: string | null;
    displayName: string | null;
  };
  profile: {
    dailyCalorieLimit: number | null;
    goal: string;
    weeklyBudgetCents: number | null;
    deliveryCity: string | null;
  } | null;
  tastes: Array<{
    id: string;
    type: string;
    value: string;
  }>;
};

type GroceryListResponse = {
  id: string;
  title: string;
  totalEstimatedCents: number | null;
  items: Array<{
    id: string;
    name: string;
    category: string;
    quantity: number;
    unit: string;
    package: null | {
      packageCount: number;
      packageSize: number;
      packageUnit: string;
    };
  }>;
};

type CartResponse = {
  id: string;
  status: string;
  subtotalCents: number;
  currency: string;
  requiresConfirmation: boolean;
  items: Array<{
    id: string;
    name: string;
    quantity: number;
    unitPriceCents: number;
    totalPriceCents: number;
    replacementForName: string | null;
    replacementReason: string | null;
  }>;
};

type AiResponse = {
  intent: string;
  reply: string;
  actions: string[];
};

type ExternalStoreStatusResponse = {
  provider: 'instacart';
  configured: boolean;
  productionReady: boolean;
  mode: 'development' | 'production';
  baseUrl: string;
  capabilities: string[];
  requiredEnv: string[];
  missingEnv: string[];
  checkoutBehavior: string;
};

type InstacartShoppingListLinkResponse = {
  provider: 'instacart';
  groceryListId: string;
  title: string;
  productsLinkUrl: string;
  lineItemCount: number;
  checkoutBehavior: string;
};

type SberPayStatusResponse = {
  provider: 'sberpay';
  configured: boolean;
  productionReady: boolean;
  mode: 'development' | 'production';
  baseUrl: string;
  endpoint: string;
  capabilities: string[];
  requiredEnv: string[];
  missingEnv: string[];
  checkoutBehavior: 'REDIRECT_TO_SBER';
};

type PaymentIntentResponse = {
  id: string;
  cartId: string;
  provider: 'MOCK' | 'SBERPAY';
  providerPaymentId: string;
  status: string;
  amountCents: number;
  currency: string;
  confirmationUrl: string | null;
  safetyNotes: string[];
  confirmedAt: string | null;
};

type BrowserSessionStatusResponse = {
  providers: Array<{
    provider: string;
    displayName: string;
    mode: string;
    capabilities: Array<{
      code: string;
      status: string;
      description: string;
    }>;
  }>;
  globalRules: string[];
};

type MenuCartResponse = {
  groceryList: GroceryListResponse;
  cart: CartResponse;
};

type ChatMessage = {
  role: 'user' | 'assistant';
  text: string;
};

type IntegrationState = 'ready' | 'mock' | 'blocked';

type SpeechRecognitionResultLike = {
  0: {
    transcript: string;
  };
};

type SpeechRecognitionEventLike = {
  results: {
    [index: number]: SpeechRecognitionResultLike;
    length: number;
  };
};

type SpeechRecognitionLike = {
  lang: string;
  interimResults: boolean;
  maxAlternatives: number;
  onend: (() => void) | null;
  onerror: (() => void) | null;
  onresult: ((event: SpeechRecognitionEventLike) => void) | null;
  start: () => void;
};

type BrowserWindow = Window & {
  SpeechRecognition?: new () => SpeechRecognitionLike;
  webkitSpeechRecognition?: new () => SpeechRecognitionLike;
};

const demoProfile = {
  email: 'demo@foodpilot.local',
  displayName: 'FoodPilot Demo',
  weightKg: 92,
  heightCm: 178,
  age: 34,
  goal: 'WEIGHT_LOSS',
  dailyCalorieLimit: 1800,
  desiredMealsPerDay: 3,
  weeklyBudgetCents: 700000,
  deliveryCity: 'Москва',
  preferredStores: ['mock-store'],
  favoriteDishes: ['ленивые голубцы', 'холодный свекольник'],
  dislikedProducts: ['яйца', 'каши', 'авокадо'],
};

const starterDishes = [
  { slug: 'lazy-cabbage-rolls', label: 'Ленивые голубцы', servings: 8 },
  { slug: 'cold-beet-soup', label: 'Холодный свекольник', servings: 4 },
  { slug: 'meatballs-tomato-sauce', label: 'Тефтели в томатном соусе', servings: 4 },
  { slug: 'stuffed-peppers', label: 'Фаршированный перец', servings: 4 },
];

const quickMessages = [
  'Хочу меню на неделю. Люблю ленивые голубцы и холодный свекольник. Хочу похудеть.',
  'Сколько калорий осталось?',
  'Собери список покупок',
  'Дай короткий рецепт ленивых голубцов',
];

export default function HomePage() {
  const [apiBase, setApiBase] = useState(defaultApiBase());
  const [profile, setProfile] = useState<ProfileResponse | null>(null);
  const [groceryList, setGroceryList] = useState<GroceryListResponse | null>(null);
  const [cart, setCart] = useState<CartResponse | null>(null);
  const [instacartStatus, setInstacartStatus] = useState<ExternalStoreStatusResponse | null>(null);
  const [instacartLink, setInstacartLink] = useState<InstacartShoppingListLinkResponse | null>(
    null,
  );
  const [sberPayStatus, setSberPayStatus] = useState<SberPayStatusResponse | null>(null);
  const [sberPayIntent, setSberPayIntent] = useState<PaymentIntentResponse | null>(null);
  const [browserSessionStatus, setBrowserSessionStatus] =
    useState<BrowserSessionStatusResponse | null>(null);
  const [chatInput, setChatInput] = useState(quickMessages[0]);
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Готов. Могу собрать меню, корзину, открыть магазин через браузерную сессию и создать СберПэй-ссылку, когда merchant credentials настроены.',
    },
  ]);
  const [status, setStatus] = useState('Ожидаю действие');
  const [busyAction, setBusyAction] = useState<string | null>(null);
  const [voiceActive, setVoiceActive] = useState(false);
  const [selectedDishes, setSelectedDishes] = useState(
    () => new Set(['lazy-cabbage-rolls', 'cold-beet-soup']),
  );

  const selectedMenu = useMemo(
    () => starterDishes.filter((dish) => selectedDishes.has(dish.slug)),
    [selectedDishes],
  );
  const cartReady = cart?.status === 'READY_FOR_CONFIRMATION';
  const cartConfirmed = cart?.status === 'CONFIRMED';
  const workflowSteps = [
    { label: 'Профиль', done: Boolean(profile) },
    { label: 'Корзина', done: Boolean(cart) },
    { label: 'Подтверждение', done: cartConfirmed },
    { label: 'Checkout', done: Boolean(sberPayIntent || instacartLink) },
  ];
  const integrations = useMemo(
    () => [
      {
        name: 'Mock Store',
        state: 'mock' as const,
        detail: 'Локальный fallback для разработки; не используется как реальный заказ',
      },
      {
        name: 'Instacart',
        state: (instacartStatus?.productionReady ? 'ready' : 'blocked') as IntegrationState,
        detail: instacartStatus?.productionReady
          ? `Production API готов: ${instacartStatus.baseUrl}`
          : `Нужны production credentials: ${
              instacartStatus?.missingEnv.join(', ') || 'INSTACART_API_KEY'
            }`,
      },
      {
        name: 'СберПэй',
        state: (sberPayStatus?.productionReady ? 'ready' : 'blocked') as IntegrationState,
        detail: sberPayStatus?.productionReady
          ? `Production endpoint готов: ${sberPayStatus.endpoint}`
          : `Нужны credentials: ${sberPayStatus?.missingEnv.join(', ') || 'SBERPAY_USER_NAME'}`,
      },
      {
        name: 'Браузерные магазины',
        state: (browserSessionStatus ? 'ready' : 'blocked') as IntegrationState,
        detail: browserSessionStatus
          ? `${browserSessionStatus.providers.length} провайдера: Яндекс, Пятерочка, Магнит`
          : 'Нужно проверить browser-session API',
      },
      {
        name: 'AI',
        state: 'mock' as const,
        detail: 'LocalAiAdapter; внешний LLM подключается через adapter',
      },
    ],
    [browserSessionStatus, instacartStatus, sberPayStatus],
  );

  async function apiFetch<T>(path: string, init?: RequestInit): Promise<T> {
    const headers = {
      ...(init?.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
      ...(init?.headers ?? {}),
    };
    const response = await fetch(`${apiBase}${path}`, {
      ...init,
      headers,
    });

    if (!response.ok) {
      const text = await response.text();
      throw new Error(text || `${response.status} ${response.statusText}`);
    }

    return response.json() as Promise<T>;
  }

  async function runAction<T>(label: string, action: () => Promise<T>): Promise<T | null> {
    setBusyAction(label);
    setStatus(label);

    try {
      const result = await action();
      setStatus(`${label}: готово`);

      return result;
    } catch (error) {
      const message = error instanceof Error ? error.message : 'Неизвестная ошибка';
      setStatus(`${label}: ошибка`);
      setChat((messages) => [
        ...messages,
        { role: 'assistant', text: `Ошибка: ${shortenError(message)}` },
      ]);

      return null;
    } finally {
      setBusyAction(null);
    }
  }

  async function ensureProfile(): Promise<ProfileResponse | null> {
    if (profile) {
      return profile;
    }

    const created = await runAction('Создаю профиль', () =>
      apiFetch<ProfileResponse>('/profiles', {
        method: 'POST',
        body: JSON.stringify(demoProfile),
      }),
    );

    if (created) {
      setProfile(created);
    }

    return created;
  }

  async function buildCart(): Promise<MenuCartResponse | null> {
    const currentProfile = await ensureProfile();
    if (!currentProfile) {
      return null;
    }

    const response = await runAction('Собираю корзину под блюда', () =>
      apiFetch<MenuCartResponse>('/cart-builder/menu/cart', {
        method: 'POST',
        body: JSON.stringify({
          userId: currentProfile.user.id,
          menu: {
            title: 'Меню FoodPilot',
            storeCode: 'mock-store',
            dishes: selectedMenu.map((dish) => ({
              slug: dish.slug,
              servings: dish.servings,
            })),
          },
        }),
      }),
    );

    if (response) {
      setGroceryList(response.groceryList);
      setCart(response.cart);
      setInstacartLink(null);
      setSberPayIntent(null);
    }

    return response;
  }

  async function confirmCart(): Promise<CartResponse | null> {
    if (!cart) {
      const response = await buildCart();

      return response ? confirmCartById(response.cart.id) : null;
    }

    return confirmCartById(cart.id);
  }

  async function confirmCartById(cartId: string): Promise<CartResponse | null> {
    const confirmed = await runAction('Подтверждаю корзину', () =>
      apiFetch<CartResponse>(`/cart-builder/carts/${cartId}/confirm`, { method: 'POST' }),
    );

    if (confirmed) {
      setCart(confirmed);
    }

    return confirmed;
  }

  async function checkInstacartStatus(): Promise<void> {
    const statusResponse = await runAction('Проверяю Instacart API', () =>
      apiFetch<ExternalStoreStatusResponse>('/external-stores/instacart/status'),
    );

    if (statusResponse) {
      setInstacartStatus(statusResponse);
    }
  }

  async function checkSberPayStatus(): Promise<void> {
    const statusResponse = await runAction('Проверяю СберПэй', () =>
      apiFetch<SberPayStatusResponse>('/checkout/sberpay/status'),
    );

    if (statusResponse) {
      setSberPayStatus(statusResponse);
    }
  }

  async function checkBrowserSessions(): Promise<void> {
    const statusResponse = await runAction('Проверяю браузерные магазины', () =>
      apiFetch<BrowserSessionStatusResponse>('/store-adapters/browser-session/status'),
    );

    if (statusResponse) {
      setBrowserSessionStatus(statusResponse);
    }
  }

  async function createInstacartLink(list = groceryList): Promise<void> {
    if (!list) {
      setStatus('Сначала собери список покупок');
      return;
    }

    const link = await runAction('Создаю Instacart checkout link', () =>
      apiFetch<InstacartShoppingListLinkResponse>(
        `/external-stores/instacart/grocery-lists/${list.id}/link`,
        {
          method: 'POST',
          body: JSON.stringify({
            expiresInDays: 30,
            partnerLinkbackUrl: window.location.href,
            title: 'FoodPilot weekly groceries',
          }),
        },
      ),
    );

    if (link) {
      setInstacartLink(link);
      setChat((messages) => [
        ...messages,
        {
          role: 'assistant',
          text: `Готова реальная Instacart-ссылка на ${link.lineItemCount} позиций. Открой её и заверши заказ на стороне Instacart.`,
        },
      ]);
    }
  }

  async function createSberPayIntent(currentCart = cart): Promise<void> {
    if (!currentCart) {
      setStatus('Сначала собери и подтверди корзину');
      return;
    }

    const paymentIntent = await runAction('Создаю СберПэй оплату', () =>
      apiFetch<PaymentIntentResponse>(`/checkout/carts/${currentCart.id}/sberpay-payment-intents`, {
        method: 'POST',
        body: JSON.stringify({
          returnUrl: window.location.href,
          failUrl: window.location.href,
          description: 'FoodPilot grocery cart',
        }),
      }),
    );

    if (paymentIntent) {
      setSberPayIntent(paymentIntent);
      setChat((messages) => [
        ...messages,
        {
          role: 'assistant',
          text: paymentIntent.confirmationUrl
            ? 'СберПэй-ссылка готова. Открой её и подтверди оплату на стороне Сбера.'
            : 'СберПэй intent создан, но провайдер не вернул ссылку оплаты.',
        },
      ]);
    }
  }

  async function runFullFlow(): Promise<void> {
    const response = await buildCart();
    if (!response) {
      return;
    }
    const confirmed =
      response.cart.status === 'CONFIRMED'
        ? response.cart
        : await confirmCartById(response.cart.id);
    if (!confirmed) {
      return;
    }
    await createSberPayIntent(confirmed);
  }

  async function sendChatMessage(message: string): Promise<void> {
    const trimmed = message.trim();
    if (!trimmed) {
      return;
    }

    const currentProfile = await ensureProfile();
    if (!currentProfile) {
      return;
    }

    setChat((messages) => [...messages, { role: 'user', text: trimmed }]);
    setChatInput('');
    const response = await runAction('AI отвечает', () =>
      apiFetch<AiResponse>(`/ai/${currentProfile.user.id}/messages`, {
        method: 'POST',
        body: JSON.stringify({ message: trimmed }),
      }),
    );

    if (response) {
      setChat((messages) => [...messages, { role: 'assistant', text: response.reply }]);
      speak(response.reply);
    }
  }

  function onChatSubmit(event: FormEvent<HTMLFormElement>): void {
    event.preventDefault();
    void sendChatMessage(chatInput);
  }

  function startVoice(): void {
    const browserWindow = window as BrowserWindow;
    const Recognition = browserWindow.SpeechRecognition ?? browserWindow.webkitSpeechRecognition;

    if (!Recognition) {
      setStatus('Голосовой ввод не поддерживается этим браузером');
      return;
    }

    const recognition = new Recognition();
    recognition.lang = 'ru-RU';
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;
    recognition.onresult = (event) => {
      const transcript = event.results[0]?.[0]?.transcript ?? '';
      setChatInput(transcript);
      void sendChatMessage(transcript);
    };
    recognition.onerror = () => {
      setVoiceActive(false);
      setStatus('Не удалось распознать голос');
    };
    recognition.onend = () => setVoiceActive(false);
    setVoiceActive(true);
    recognition.start();
  }

  function toggleDish(slug: string): void {
    setSelectedDishes((current) => {
      const next = new Set(current);

      if (next.has(slug)) {
        next.delete(slug);
      } else {
        next.add(slug);
      }

      return next.size > 0 ? next : current;
    });
  }

  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">FoodPilot</p>
          <h1>Питание, покупки и checkout</h1>
        </div>
        <label className="apiControl">
          API
          <input value={apiBase} onChange={(event) => setApiBase(event.target.value)} />
        </label>
      </header>

      <section className="heroBand">
        <div>
          <h2>Meal-prep, корзина и оплата без лишних шагов</h2>
          <p>
            Выбери блюда, собери продукты, подтверди корзину и создай ссылку оплаты. СберПэй
            работает через официальный платёжный шлюз, а магазины без API подключаются через
            пользовательскую браузерную сессию.
          </p>
        </div>
        <div className="heroActions">
          <button disabled={Boolean(busyAction)} type="button" onClick={() => void runFullFlow()}>
            Собрать и перейти к оплате
          </button>
          <button
            className="secondaryButton"
            disabled={Boolean(busyAction)}
            type="button"
            onClick={() => {
              void checkSberPayStatus();
              void checkBrowserSessions();
            }}
          >
            Проверить интеграции
          </button>
        </div>
      </section>

      <section className="statusStrip" aria-label="Статусы сценария">
        {workflowSteps.map((step, index) => (
          <div className={`stepPill ${step.done ? 'done' : ''}`} key={step.label}>
            <span>{index + 1}</span>
            <strong>{step.label}</strong>
          </div>
        ))}
      </section>

      <section className="grid">
        <article className="panel profilePanel">
          <div className="panelHeader">
            <div>
              <p className="sectionLabel">User Profile</p>
              <h2>Профиль</h2>
            </div>
            <StatusDot active={Boolean(profile)} />
          </div>
          <Metric label="Пользователь" value={profile?.user.email ?? 'не создан'} />
          <Metric label="Цель" value="Похудение" />
          <Metric label="Лимит" value={`${profile?.profile?.dailyCalorieLimit ?? 1800} ккал`} />
          <Metric label="Город" value={profile?.profile?.deliveryCity ?? 'Москва'} />
          <button disabled={Boolean(busyAction)} type="button" onClick={() => void ensureProfile()}>
            Создать профиль
          </button>
        </article>

        <article className="panel caloriesPanel">
          <div className="panelHeader">
            <div>
              <p className="sectionLabel">Menu</p>
              <h2>Блюда</h2>
            </div>
          </div>
          <div className="dishPicker">
            {starterDishes.map((dish) => (
              <label key={dish.slug}>
                <input
                  checked={selectedDishes.has(dish.slug)}
                  type="checkbox"
                  onChange={() => toggleDish(dish.slug)}
                />
                <span>{dish.label}</span>
              </label>
            ))}
          </div>
        </article>

        <article className="panel cartPanel">
          <div className="panelHeader">
            <div>
              <p className="sectionLabel">Actions</p>
              <h2>Workflow</h2>
            </div>
            <span className="stateText">{status}</span>
          </div>
          <div className="buttonStack">
            <button disabled={Boolean(busyAction)} type="button" onClick={() => void buildCart()}>
              1. Собрать корзину
            </button>
            <button
              disabled={Boolean(busyAction) || !cartReady}
              type="button"
              onClick={() => void confirmCart()}
            >
              2. Подтвердить корзину
            </button>
            <button
              disabled={Boolean(busyAction) || !cartConfirmed || !groceryList}
              type="button"
              onClick={() => void createInstacartLink()}
            >
              3. Создать Instacart checkout
            </button>
            <button
              disabled={Boolean(busyAction) || !cartConfirmed}
              type="button"
              onClick={() => void createSberPayIntent()}
            >
              4. Создать СберПэй оплату
            </button>
          </div>
        </article>

        <article className="panel menuPanel">
          <div className="panelHeader">
            <div>
              <p className="sectionLabel">Grocery List</p>
              <h2>Список покупок</h2>
            </div>
            <span className="amountBadge">
              {groceryList?.totalEstimatedCents ? money(groceryList.totalEstimatedCents) : '-'}
            </span>
          </div>
          {groceryList ? (
            <div className="table">
              {groceryList.items.map((item) => (
                <div className="tableRow" key={item.id}>
                  <span>{categoryLabel(item.category)}</span>
                  <span>{item.name}</span>
                  <span>
                    {item.package
                      ? `${item.package.packageCount} x ${item.package.packageSize} ${unitLabel(
                          item.package.packageUnit,
                        )}`
                      : `${item.quantity} ${unitLabel(item.unit)}`}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="emptyText">Нажми “Собрать корзину”.</p>
          )}
        </article>

        <article className="panel groceryPanel">
          <div className="panelHeader">
            <div>
              <p className="sectionLabel">Cart</p>
              <h2>Корзина</h2>
            </div>
            <StatusBadge value={cart?.status ?? 'EMPTY'} />
          </div>
          {cart ? (
            <>
              <Metric label="Статус" value={cart.status} />
              <Metric label="Итого" value={money(cart.subtotalCents)} />
              <div className="cartItems">
                {cart.items.map((item) => (
                  <div className="cartItem" key={item.id}>
                    <strong>{item.name}</strong>
                    <span>
                      {item.quantity} шт. · {money(item.totalPriceCents)}
                    </span>
                    {item.replacementForName ? (
                      <small>Замена для: {item.replacementForName}</small>
                    ) : null}
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p className="emptyText">Корзина ещё не собрана.</p>
          )}
        </article>

        <article className="panel recipePanel">
          <div className="panelHeader">
            <div>
              <p className="sectionLabel">Payment</p>
              <h2>Checkout</h2>
            </div>
            <StatusBadge value={sberPayIntent ? 'SBERPAY_READY' : 'NOT_CREATED'} />
          </div>
          <Metric label="Корзина" value={cart?.status ?? 'нет'} />
          <Metric label="Оплата" value={sberPayIntent ? 'СберПэй' : 'не создана'} />
          <Metric label="Сумма" value={cart ? money(cart.subtotalCents) : '-'} />
          {sberPayIntent ? (
            <div className="notice">
              <p>
                Открой ссылку СберПэй и заверши оплату на стороне Сбера. FoodPilot не хранит карту и
                не подтверждает платёж локально.
              </p>
            </div>
          ) : (
            <p className="emptyText">
              После подтверждения корзины FoodPilot создаст СберПэй-ссылку, если production
              credentials настроены.
            </p>
          )}
          {sberPayIntent?.confirmationUrl ? (
            <a
              className="checkoutLink"
              href={sberPayIntent.confirmationUrl}
              rel="noreferrer"
              target="_blank"
            >
              Открыть СберПэй
            </a>
          ) : null}
          <button
            className="secondaryButton fullWidth"
            disabled={Boolean(busyAction) || !cartConfirmed}
            type="button"
            onClick={() => void createSberPayIntent()}
          >
            Создать СберПэй ссылку
          </button>
        </article>

        <article className="panel chatPanel">
          <div className="panelHeader">
            <div>
              <p className="sectionLabel">Assistant</p>
              <h2>AI чат</h2>
            </div>
            <button
              className="smallButton"
              disabled={voiceActive || Boolean(busyAction)}
              type="button"
              onClick={startVoice}
            >
              {voiceActive ? 'Слушаю...' : 'Голос'}
            </button>
          </div>
          <div className="quickMessages">
            {quickMessages.map((message) => (
              <button
                className="ghostButton"
                key={message}
                type="button"
                onClick={() => setChatInput(message)}
              >
                {message}
              </button>
            ))}
          </div>
          <div className="chatLog">
            {chat.map((message, index) => (
              <div className={`message ${message.role}`} key={`${message.role}-${index}`}>
                {message.text}
              </div>
            ))}
          </div>
          <form className="chatForm" onSubmit={onChatSubmit}>
            <input
              placeholder="Напиши или нажми Голос"
              value={chatInput}
              onChange={(event) => setChatInput(event.target.value)}
            />
            <button disabled={Boolean(busyAction)} type="submit">
              Отправить
            </button>
          </form>
        </article>

        <article className="panel integrationsPanel">
          <div className="panelHeader">
            <div>
              <p className="sectionLabel">Production</p>
              <h2>Реальные интеграции</h2>
            </div>
          </div>
          <div className="integrationList">
            {integrations.map((integration) => (
              <div className="integrationItem" key={integration.name}>
                <div>
                  <strong>{integration.name}</strong>
                  <p>{integration.detail}</p>
                </div>
                <span className={`integrationBadge ${integration.state}`}>
                  {integrationLabel(integration.state)}
                </span>
              </div>
            ))}
          </div>
          <div className="integrationActions">
            <button
              disabled={Boolean(busyAction)}
              type="button"
              onClick={() => void checkInstacartStatus()}
            >
              Проверить Instacart
            </button>
            <button
              disabled={Boolean(busyAction) || !groceryList}
              type="button"
              onClick={() => void createInstacartLink()}
            >
              Создать Instacart checkout link
            </button>
            <button
              disabled={Boolean(busyAction)}
              type="button"
              onClick={() => void checkSberPayStatus()}
            >
              Проверить СберПэй
            </button>
            <button
              disabled={Boolean(busyAction) || !cartConfirmed}
              type="button"
              onClick={() => void createSberPayIntent()}
            >
              Создать СберПэй
            </button>
            <button
              className="secondaryButton"
              disabled={Boolean(busyAction)}
              type="button"
              onClick={() => void checkBrowserSessions()}
            >
              Проверить магазины
            </button>
          </div>
          {sberPayIntent?.confirmationUrl ? (
            <a
              className="checkoutLink"
              href={sberPayIntent.confirmationUrl}
              rel="noreferrer"
              target="_blank"
            >
              Перейти к оплате СберПэй
            </a>
          ) : instacartLink ? (
            <a
              className="checkoutLink"
              href={instacartLink.productsLinkUrl}
              rel="noreferrer"
              target="_blank"
            >
              Перейти к заказу в Instacart
            </a>
          ) : (
            <p className="integrationHint">
              Для реального checkout задай production `INSTACART_API_KEY`, `SBERPAY_USER_NAME`,
              `SBERPAY_PASSWORD` и перезапусти backend.
            </p>
          )}
        </article>

        <article className="panel debugPanel">
          <div className="panelHeader">
            <div>
              <p className="sectionLabel">Runtime</p>
              <h2>Debug</h2>
            </div>
          </div>
          <Metric label="API" value={apiBase} />
          <Metric label="User ID" value={profile?.user.id ?? '-'} />
          <Metric label="Grocery list" value={groceryList?.id ?? '-'} />
          <Metric label="Cart" value={cart?.id ?? '-'} />
          <Metric label="Instacart" value={instacartStatus?.mode ?? '-'} />
          <Metric label="SberPay" value={sberPayStatus?.mode ?? '-'} />
          <Metric label="Payment" value={sberPayIntent?.id ?? '-'} />
        </article>
      </section>
    </main>
  );
}

function StatusDot({ active }: { active: boolean }) {
  return <span className={`statusDot ${active ? 'active' : ''}`} />;
}

function StatusBadge({ value }: { value: string }) {
  return <span className={`statusBadge ${statusClass(value)}`}>{statusLabel(value)}</span>;
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function defaultApiBase(): string {
  if (process.env.NEXT_PUBLIC_API_URL) {
    return process.env.NEXT_PUBLIC_API_URL;
  }

  if (typeof window !== 'undefined') {
    return `${window.location.protocol}//${window.location.hostname}:3002`;
  }

  return 'http://localhost:3002';
}

function money(cents: number): string {
  return new Intl.NumberFormat('ru-RU', {
    currency: 'RUB',
    style: 'currency',
  }).format(cents / 100);
}

function categoryLabel(category: string): string {
  const labels: Record<string, string> = {
    DAIRY: 'Молочка',
    DRINKS: 'Напитки',
    GRAINS: 'Крупы',
    MEAT: 'Мясо',
    OTHER: 'Прочее',
    PANTRY: 'Бакалея',
    VEGETABLES: 'Овощи',
  };

  return labels[category] ?? category;
}

function unitLabel(unit: string): string {
  const labels: Record<string, string> = {
    BUNCH: 'пуч.',
    CAN: 'бан.',
    GRAM: 'г',
    KILOGRAM: 'кг',
    LITER: 'л',
    MILLILITER: 'мл',
    PACK: 'уп.',
    PIECE: 'шт.',
  };

  return labels[unit] ?? unit;
}

function statusClass(value: string): string {
  if (
    value === 'CAPTURED' ||
    value === 'CONFIRMED' ||
    value === 'EXTERNAL_CHECKOUT' ||
    value === 'SBERPAY_READY'
  ) {
    return 'success';
  }

  if (value === 'READY_FOR_CONFIRMATION' || value === 'REQUIRES_CONFIRMATION') {
    return 'warning';
  }

  return 'neutral';
}

function statusLabel(value: string): string {
  const labels: Record<string, string> = {
    CAPTURED: 'оплачено',
    CONFIRMED: 'подтверждено',
    EMPTY: 'пусто',
    EXTERNAL_CHECKOUT: 'готово',
    NOT_CREATED: 'нет',
    READY_FOR_CONFIRMATION: 'нужно подтвердить',
    REQUIRES_CONFIRMATION: 'нужно подтвердить',
    SBERPAY_READY: 'СберПэй готов',
  };

  return labels[value] ?? value;
}

function integrationLabel(state: IntegrationState): string {
  if (state === 'ready') {
    return 'готово';
  }

  if (state === 'mock') {
    return 'mock';
  }

  return 'нужны ключи';
}

function shortenError(message: string): string {
  return message.length > 320 ? `${message.slice(0, 320)}...` : message;
}

function speak(text: string): void {
  if (typeof window === 'undefined' || !('speechSynthesis' in window)) {
    return;
  }

  const utterance = new SpeechSynthesisUtterance(text);
  utterance.lang = 'ru-RU';
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(utterance);
}
