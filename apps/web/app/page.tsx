import { defaultFoodPilotContext } from '@foodpilot/domain';

export default function HomePage() {
  return (
    <main className="shell">
      <section className="panel">
        <p className="eyebrow">FoodPilot MVP</p>
        <h1>Питание, калории и покупки без сложных рецептов</h1>
        <p>
          Стартовый web dashboard подключён к monorepo. Следующие этапы добавят профиль, дневник
          калорий, меню, список покупок и debug panel.
        </p>
        <dl>
          <div>
            <dt>Цель</dt>
            <dd>{defaultFoodPilotContext.goal}</dd>
          </div>
          <div>
            <dt>Любимые блюда</dt>
            <dd>{defaultFoodPilotContext.favoriteDishes.join(', ')}</dd>
          </div>
          <div>
            <dt>Не предлагать</dt>
            <dd>{defaultFoodPilotContext.dislikedProducts.join(', ')}</dd>
          </div>
        </dl>
      </section>
    </main>
  );
}
