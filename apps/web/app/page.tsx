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

type PaymentIntentResponse = {
  id: string;
  status: string;
  amountCents: number;
  currency: string;
  confirmationUrl: string | null;
  safetyNotes: string[];
};

type AiResponse = {
  intent: string;
  reply: string;
  actions: string[];
};

type ExternalStoreStatusResponse = {
  provider: 'instacart';
  configured: boolean;
  mode: 'development' | 'production';
  baseUrl: string;
  capabilities: string[];
  requiredEnv: string[];
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
  const [paymentIntent, setPaymentIntent] = useState<PaymentIntentResponse | null>(null);
  const [instacartStatus, setInstacartStatus] = useState<ExternalStoreStatusResponse | null>(null);
  const [instacartLink, setInstacartLink] = useState<InstacartShoppingListLinkResponse | null>(
    null,
  );
  const [chatInput, setChatInput] = useState(quickMessages[0]);
  const [chat, setChat] = useState<ChatMessage[]>([
    {
      role: 'assistant',
      text: 'Готов. Могу собрать меню, корзину и mock-оплату. Начни с кнопки "Полный сценарий".',
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
  const canPay = cartConfirmed && !paymentIntent;
  const captured = paymentIntent?.status === 'CAPTURED';
  const workflowSteps = [
    { label: 'Профиль', done: Boolean(profile) },
    { label: 'Корзина', done: Boolean(cart) },
    { label: 'Подтверждение', done: cartConfirmed },
    { label: 'Оплата', done: captured },
  ];
  const integrations = useMemo(
    () => [
      {
        name: 'Mock Store',
        state: 'ready' as const,
        detail: 'Рабочая сборка корзины и замены товаров',
      },
      {
        name: 'Instacart',
        state: (instacartStatus?.configured ? 'ready' : 'blocked') as IntegrationState,
        detail: instacartStatus?.configured
          ? `API настроен: ${instacartStatus.mode}, checkout через внешнюю ссылку`
          : 'Нужен INSTACART_API_KEY; после этого FoodPilot создаёт реальную shopping-list checkout ссылку',
      },
      {
        name: 'Оплата',
        state: 'mock' as const,
        detail: 'MockPaymentAdapter; реальные деньги только через PCI-провайдера',
      },
      {
        name: 'AI',
        state: 'mock' as const,
        detail: 'LocalAiAdapter; внешний LLM подключается через adapter',
      },
    ],
    [instacartStatus],
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

  async function buildCart(): Promise<CartResponse | null> {
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
      setPaymentIntent(null);
      setInstacartLink(null);
    }

    return response?.cart ?? null;
  }

  async function confirmCart(): Promise<CartResponse | null> {
    if (!cart) {
      return buildCart();
    }

    const confirmed = await runAction('Подтверждаю корзину', () =>
      apiFetch<CartResponse>(`/cart-builder/carts/${cart.id}/confirm`, { method: 'POST' }),
    );

    if (confirmed) {
      setCart(confirmed);
    }

    return confirmed;
  }

  async function createPayment(): Promise<PaymentIntentResponse | null> {
    let currentCart = cart;
    if (!currentCart) {
      currentCart = await buildCart();
    }
    if (!currentCart) {
      return null;
    }
    if (currentCart.status !== 'CONFIRMED') {
      currentCart = await confirmCart();
    }
    if (!currentCart) {
      return null;
    }

    const intent = await runAction('Создаю mock-платёж', () =>
      apiFetch<PaymentIntentResponse>(`/checkout/carts/${currentCart.id}/payment-intents`, {
        method: 'POST',
      }),
    );

    if (intent) {
      setPaymentIntent(intent);
    }

    return intent;
  }

  async function capturePayment(): Promise<void> {
    let intent = paymentIntent;
    if (!intent) {
      intent = await createPayment();
    }
    if (!intent) {
      return;
    }

    const capturedIntent = await runAction('Подтверждаю mock-оплату', () =>
      apiFetch<PaymentIntentResponse>(`/checkout/payment-intents/${intent.id}/confirm`, {
        method: 'POST',
      }),
    );

    if (capturedIntent) {
      setPaymentIntent(capturedIntent);
    }
  }

  async function checkInstacartStatus(): Promise<void> {
    const statusResponse = await runAction('Проверяю Instacart API', () =>
      apiFetch<ExternalStoreStatusResponse>('/external-stores/instacart/status'),
    );

    if (statusResponse) {
      setInstacartStatus(statusResponse);
    }
  }

  async function createInstacartLink(): Promise<void> {
    if (!groceryList) {
      setStatus('Сначала собери список покупок');
      return;
    }

    const link = await runAction('Создаю Instacart checkout link', () =>
      apiFetch<InstacartShoppingListLinkResponse>(
        `/external-stores/instacart/grocery-lists/${groceryList.id}/link`,
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

  async function runFullFlow(): Promise<void> {
    const currentCart = await buildCart();
    if (!currentCart) {
      return;
    }
    const confirmed = currentCart.status === 'CONFIRMED' ? currentCart : await confirmCart();
    if (!confirmed) {
      return;
    }
    const intent = await createPayment();
    if (!intent) {
      return;
    }
    await capturePayment();
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
          <h2>Сценарий meal-prep на неделю</h2>
          <p>
            Собираем меню из простых блюд, превращаем его в продукты, подбираем товары и проводим
            checkout. Реальные магазины и платежи включаются только после подключения credentials.
          </p>
        </div>
        <button disabled={Boolean(busyAction)} type="button" onClick={() => void runFullFlow()}>
          Полный сценарий
        </button>
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
              disabled={Boolean(busyAction) || !canPay}
              type="button"
              onClick={() => void createPayment()}
            >
              3. Создать mock-платёж
            </button>
            <button
              disabled={Boolean(busyAction) || !paymentIntent || captured}
              type="button"
              onClick={() => void capturePayment()}
            >
              4. Mock-оплатить
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
            <StatusBadge value={paymentIntent?.status ?? 'NOT_CREATED'} />
          </div>
          <Metric label="Корзина" value={cart?.status ?? 'нет'} />
          <Metric label="Оплата" value={paymentIntent?.status ?? 'нет'} />
          <Metric label="Сумма" value={paymentIntent ? money(paymentIntent.amountCents) : '-'} />
          {paymentIntent ? (
            <div className="notice">
              {paymentIntent.safetyNotes.map((note) => (
                <p key={note}>{note}</p>
              ))}
            </div>
          ) : (
            <p className="emptyText">Оплата появится после подтверждения корзины.</p>
          )}
          {instacartLink ? (
            <a
              className="checkoutLink"
              href={instacartLink.productsLinkUrl}
              rel="noreferrer"
              target="_blank"
            >
              Открыть Instacart checkout
            </a>
          ) : null}
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
          </div>
          {instacartLink ? (
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
              Для реального checkout задай `INSTACART_API_KEY` в env API-процесса и перезапусти
              backend.
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
          <Metric label="Payment" value={paymentIntent?.id ?? '-'} />
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
  if (value === 'CAPTURED' || value === 'CONFIRMED') {
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
    NOT_CREATED: 'нет',
    READY_FOR_CONFIRMATION: 'нужно подтвердить',
    REQUIRES_CONFIRMATION: 'нужно подтвердить',
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
