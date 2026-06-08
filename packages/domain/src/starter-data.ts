export type StarterDietGoal = 'WEIGHT_LOSS' | 'MAINTENANCE' | 'MUSCLE_GAIN';
export type StarterBudgetTier = 'LOW' | 'NORMAL' | 'HIGH';
export type StarterGroceryCategory =
  | 'MEAT'
  | 'VEGETABLES'
  | 'DAIRY'
  | 'GRAINS'
  | 'PANTRY'
  | 'DRINKS'
  | 'OTHER';
export type StarterMeasurementUnit =
  | 'GRAM'
  | 'KILOGRAM'
  | 'MILLILITER'
  | 'LITER'
  | 'PIECE'
  | 'CAN'
  | 'PACK'
  | 'BUNCH';
export type StarterFoodPreferenceType =
  | 'FAVORITE_DISH'
  | 'DISLIKED_PRODUCT'
  | 'HARD_RESTRICTION'
  | 'SUCCESSFUL_RECOMMENDATION'
  | 'FAILED_RECOMMENDATION'
  | 'MEAL_STYLE'
  | 'PREFERRED_STORE';

export interface StarterIngredient {
  name: string;
  normalizedName: string;
  category: StarterGroceryCategory;
  defaultUnit: StarterMeasurementUnit;
  caloriesPer100g?: number;
  proteinPer100g?: number;
  fatPer100g?: number;
  carbPer100g?: number;
}

export interface StarterRecipeIngredient {
  normalizedName: string;
  quantity: number;
  unit: StarterMeasurementUnit;
  note?: string;
}

export interface StarterDish {
  slug: string;
  name: string;
  description: string;
  mealPrepFriendly: boolean;
  budgetTier: StarterBudgetTier;
  servings: number;
  caloriesPerServing: number;
  proteinGrams: number;
  fatGrams: number;
  carbGrams: number;
  tags: string[];
  recipe: {
    summary: string;
    prepMinutes: number;
    cookMinutes: number;
    instructions: string[];
    ingredients: StarterRecipeIngredient[];
  };
}

export interface StarterPreference {
  type: StarterFoodPreferenceType;
  value: string;
  notes?: string;
  weight?: number;
  repeatFrequency?: number;
}

export interface StarterStoreProduct {
  externalId: string;
  ingredientNormalizedName: string;
  name: string;
  category: StarterGroceryCategory;
  priceCents: number;
  packageSize: number;
  packageUnit: StarterMeasurementUnit;
  available: boolean;
  qualityTier: StarterBudgetTier;
}

export const starterUser = {
  email: 'demo@foodpilot.local',
  displayName: 'FoodPilot Demo',
  profile: {
    weightKg: 92,
    heightCm: 178,
    age: 34,
    goal: 'WEIGHT_LOSS' satisfies StarterDietGoal,
    dailyCalorieLimit: 1800,
    desiredMealsPerDay: 3,
    weeklyBudgetCents: 700000,
    deliveryCity: 'Москва',
    preferredStores: ['mock-store'],
  },
  calorieGoal: {
    goal: 'WEIGHT_LOSS' satisfies StarterDietGoal,
    dailyCalories: 1800,
    proteinGrams: 120,
    fatGrams: 60,
    carbGrams: 170,
  },
  preferences: [
    { type: 'FAVORITE_DISH', value: 'ленивые голубцы', weight: 5, repeatFrequency: 2 },
    { type: 'FAVORITE_DISH', value: 'холодный свекольник', weight: 5, repeatFrequency: 2 },
    { type: 'DISLIKED_PRODUCT', value: 'яйца', weight: 5 },
    { type: 'DISLIKED_PRODUCT', value: 'каши', weight: 5 },
    { type: 'DISLIKED_PRODUCT', value: 'авокадо', weight: 5 },
    { type: 'MEAL_STYLE', value: 'простая домашняя еда', weight: 5 },
    { type: 'MEAL_STYLE', value: 'готовка на несколько дней', weight: 5 },
  ] satisfies StarterPreference[],
};

export const starterIngredients: StarterIngredient[] = [
  ingredient('Фарш говяжий', 'фарш говяжий', 'MEAT', 250, 18, 20, 0),
  ingredient('Фарш индейки', 'фарш индейки', 'MEAT', 145, 20, 7, 0),
  ingredient('Говядина', 'говядина', 'MEAT', 190, 20, 12, 0),
  ingredient('Капуста', 'капуста', 'VEGETABLES', 27, 1.8, 0.1, 6),
  ingredient('Свекла', 'свекла', 'VEGETABLES', 43, 1.6, 0.2, 10),
  ingredient('Картофель', 'картофель', 'VEGETABLES', 77, 2, 0.1, 17),
  ingredient('Огурцы', 'огурцы', 'VEGETABLES', 15, 0.7, 0.1, 3.6),
  ingredient('Лук', 'лук', 'VEGETABLES', 40, 1.1, 0.1, 9.3),
  ingredient('Морковь', 'морковь', 'VEGETABLES', 41, 0.9, 0.2, 10),
  ingredient('Перец сладкий', 'перец сладкий', 'VEGETABLES', 27, 1, 0.2, 6),
  ingredient('Томаты в собственном соку', 'томаты в собственном соку', 'PANTRY', 24, 1.2, 0.2, 5),
  ingredient('Томатная паста', 'томатная паста', 'PANTRY', 82, 4.3, 0.5, 19),
  ingredient('Рис', 'рис', 'GRAINS', 344, 6.7, 0.7, 78),
  ingredient('Сметана 10%', 'сметана 10%', 'DAIRY', 119, 3, 10, 3),
  ingredient('Кефир 1%', 'кефир 1%', 'DAIRY', 40, 3, 1, 4),
  ingredient('Зелень', 'зелень', 'VEGETABLES', 36, 3, 0.5, 6),
  ingredient('Фасоль консервированная', 'фасоль консервированная', 'PANTRY', 90, 6, 0.5, 16),
  ingredient('Масло растительное', 'масло растительное', 'PANTRY', 899, 0, 99.9, 0),
  ingredient('Чеснок', 'чеснок', 'VEGETABLES', 149, 6.4, 0.5, 33),
  ingredient('Бульон', 'бульон', 'PANTRY', 15, 1, 0.5, 1),
];

export const starterDishes: StarterDish[] = [
  {
    slug: 'lazy-cabbage-rolls',
    name: 'Ленивые голубцы',
    description: 'Сытное блюдо из фарша, капусты, риса и томатов на несколько дней.',
    mealPrepFriendly: true,
    budgetTier: 'NORMAL',
    servings: 8,
    caloriesPerServing: 430,
    proteinGrams: 28,
    fatGrams: 21,
    carbGrams: 34,
    tags: ['meal-prep', 'home', 'filling'],
    recipe: recipe(
      'Большая кастрюля ленивых голубцов для контейнеров.',
      20,
      50,
      [
        'Обжарить лук и морковь.',
        'Добавить фарш.',
        'Добавить капусту, рис и томаты.',
        'Тушить 40-50 минут.',
        'Разложить по контейнерам.',
      ],
      [
        item('фарш говяжий', 1200),
        item('капуста', 1600),
        item('рис', 300),
        item('лук', 250),
        item('морковь', 250),
        item('томаты в собственном соку', 800, 'GRAM', '2 банки'),
      ],
    ),
  },
  {
    slug: 'cold-beet-soup',
    name: 'Холодный свекольник',
    description: 'Лёгкий холодный суп без яиц, похожий по настроению на формат Брусники.',
    mealPrepFriendly: true,
    budgetTier: 'LOW',
    servings: 4,
    caloriesPerServing: 230,
    proteinGrams: 10,
    fatGrams: 6,
    carbGrams: 34,
    tags: ['cold-soup', 'summer', 'no-eggs'],
    recipe: recipe(
      'Холодный свекольник без яиц с кефиром и зеленью.',
      20,
      35,
      [
        'Отварить свеклу и картофель.',
        'Нарезать овощи.',
        'Смешать с кефиром и зеленью.',
        'Охладить.',
        'Подать со сметаной.',
      ],
      [
        item('свекла', 600),
        item('картофель', 400),
        item('огурцы', 300),
        item('кефир 1%', 1000, 'MILLILITER'),
        item('сметана 10%', 120),
        item('зелень', 60),
      ],
    ),
  },
  dish('meatballs-tomato-sauce', 'Тефтели в томатном соусе', 6, 390, 30, 17, 31, [
    item('фарш индейки', 900),
    item('рис', 180),
    item('лук', 180),
    item('томаты в собственном соку', 800),
    item('томатная паста', 80),
  ]),
  dish('stuffed-peppers', 'Фаршированный перец', 6, 410, 27, 18, 35, [
    item('перец сладкий', 900),
    item('фарш говяжий', 800),
    item('рис', 200),
    item('морковь', 180),
    item('томаты в собственном соку', 600),
  ]),
  dish('braised-cabbage-meat', 'Тушёная капуста с мясом', 6, 360, 30, 20, 18, [
    item('капуста', 1400),
    item('говядина', 900),
    item('лук', 200),
    item('морковь', 200),
    item('томатная паста', 70),
  ]),
  dish('meatball-soup', 'Суп с фрикадельками', 6, 290, 24, 12, 24, [
    item('фарш индейки', 700),
    item('картофель', 500),
    item('морковь', 160),
    item('лук', 120),
    item('бульон', 1500, 'MILLILITER'),
  ]),
  dish('goulash', 'Гуляш', 6, 420, 34, 22, 20, [
    item('говядина', 1000),
    item('лук', 250),
    item('морковь', 200),
    item('томатная паста', 80),
    item('бульон', 600, 'MILLILITER'),
  ]),
  dish('shchi', 'Щи', 6, 260, 19, 12, 22, [
    item('капуста', 1000),
    item('говядина', 600),
    item('картофель', 400),
    item('морковь', 150),
    item('лук', 120),
  ]),
  dish('borscht', 'Борщ', 6, 310, 20, 13, 31, [
    item('свекла', 500),
    item('капуста', 600),
    item('говядина', 600),
    item('картофель', 400),
    item('морковь', 150),
    item('томатная паста', 60),
  ]),
  dish('okroshka-no-eggs', 'Окрошка без яиц', 4, 280, 16, 8, 36, [
    item('картофель', 450),
    item('огурцы', 350),
    item('кефир 1%', 1000, 'MILLILITER'),
    item('зелень', 60),
    item('сметана 10%', 100),
  ]),
];

export const starterMockStore = {
  code: 'mock-store',
  name: 'Mock Store',
  adapterKey: 'mock',
  city: 'Москва',
};

export const starterStoreProducts: StarterStoreProduct[] = starterIngredients.map(
  (ingredientValue) => ({
    externalId: `mock-${ingredientValue.normalizedName.replaceAll(' ', '-')}`,
    ingredientNormalizedName: ingredientValue.normalizedName,
    name: ingredientValue.name,
    category: ingredientValue.category,
    priceCents: mockPrice(ingredientValue.category),
    packageSize: packageSize(ingredientValue.category),
    packageUnit: ingredientValue.category === 'DRINKS' ? 'LITER' : ingredientValue.defaultUnit,
    available: true,
    qualityTier: 'NORMAL',
  }),
);

function ingredient(
  name: string,
  normalizedName: string,
  category: StarterGroceryCategory,
  caloriesPer100g: number,
  proteinPer100g: number,
  fatPer100g: number,
  carbPer100g: number,
): StarterIngredient {
  return {
    name,
    normalizedName,
    category,
    defaultUnit: category === 'DRINKS' ? 'MILLILITER' : 'GRAM',
    caloriesPer100g,
    proteinPer100g,
    fatPer100g,
    carbPer100g,
  };
}

function item(
  normalizedName: string,
  quantity: number,
  unit: StarterMeasurementUnit = 'GRAM',
  note?: string,
): StarterRecipeIngredient {
  return { normalizedName, quantity, unit, note };
}

function recipe(
  summary: string,
  prepMinutes: number,
  cookMinutes: number,
  instructions: string[],
  ingredients: StarterRecipeIngredient[],
): StarterDish['recipe'] {
  return { summary, prepMinutes, cookMinutes, instructions, ingredients };
}

function dish(
  slug: string,
  name: string,
  servings: number,
  caloriesPerServing: number,
  proteinGrams: number,
  fatGrams: number,
  carbGrams: number,
  ingredients: StarterRecipeIngredient[],
): StarterDish {
  return {
    slug,
    name,
    description: `${name}: простое домашнее блюдо для сытного меню.`,
    mealPrepFriendly: true,
    budgetTier: 'NORMAL',
    servings,
    caloriesPerServing,
    proteinGrams,
    fatGrams,
    carbGrams,
    tags: ['home', 'filling', 'simple'],
    recipe: recipe(
      `Короткий рецепт: ${name.toLocaleLowerCase('ru-RU')}.`,
      20,
      45,
      [
        'Подготовить овощи.',
        'Обжарить основу.',
        'Добавить остальные ингредиенты.',
        'Тушить или варить до готовности.',
        'Разложить по порциям.',
      ],
      ingredients,
    ),
  };
}

function mockPrice(category: StarterGroceryCategory): number {
  const prices: Record<StarterGroceryCategory, number> = {
    MEAT: 45000,
    VEGETABLES: 12000,
    DAIRY: 11000,
    GRAINS: 9000,
    PANTRY: 13000,
    DRINKS: 9000,
    OTHER: 10000,
  };

  return prices[category];
}

function packageSize(category: StarterGroceryCategory): number {
  return category === 'MEAT' ? 1000 : 500;
}
