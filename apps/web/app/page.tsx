import { defaultFoodPilotContext } from '@foodpilot/domain';

const menu = [
  ['Пн', 'Ленивые голубцы', '430 ккал'],
  ['Вт', 'Холодный свекольник', '230 ккал'],
  ['Ср', 'Окрошка без яиц', '280 ккал'],
  ['Чт', 'Фаршированный перец', '410 ккал'],
  ['Пт', 'Тушёная капуста с мясом', '360 ккал'],
];

const groceries = [
  ['Мясо', 'Фарш говяжий', '2 x 1000 г'],
  ['Овощи', 'Капуста', '4 x 500 г'],
  ['Овощи', 'Свекла', '2 x 500 г'],
  ['Молочка', 'Кефир 1%', '2 x 500 г'],
  ['Крупы', 'Рис', '1 x 500 г'],
];

export default function HomePage() {
  return (
    <main className="dashboard">
      <header className="topbar">
        <div>
          <p className="eyebrow">FoodPilot</p>
          <h1>Панель питания</h1>
        </div>
        <div className="apiStatus">API: http://localhost:3001</div>
      </header>

      <section className="grid">
        <article className="panel profilePanel">
          <h2>Профиль</h2>
          <Metric label="Цель" value="Похудение" />
          <Metric label="Лимит" value="1800 ккал" />
          <Metric label="Бюджет" value="Нормальный" />
          <div className="tags">
            {defaultFoodPilotContext.favoriteDishes.map((dish) => (
              <span key={dish}>{dish}</span>
            ))}
          </div>
          <div className="tags muted">
            {defaultFoodPilotContext.dislikedProducts.map((product) => (
              <span key={product}>{product}</span>
            ))}
          </div>
        </article>

        <article className="panel caloriesPanel">
          <h2>Дневник калорий</h2>
          <div className="calorieNumber">1200</div>
          <p className="hint">ккал осталось сегодня</p>
          <div className="progress">
            <span />
          </div>
          <Metric label="Съедено" value="600 ккал" />
          <Metric label="БЖУ" value="48 / 26 / 38 г" />
        </article>

        <article className="panel menuPanel">
          <h2>Меню</h2>
          <Table rows={menu} />
        </article>

        <article className="panel groceryPanel">
          <h2>Список покупок</h2>
          <Table rows={groceries} />
        </article>

        <article className="panel recipePanel">
          <h2>Короткий рецепт</h2>
          <ol>
            <li>Обжарить лук и морковь.</li>
            <li>Добавить фарш.</li>
            <li>Добавить капусту, рис и томаты.</li>
            <li>Тушить 40-50 минут.</li>
            <li>Разложить по контейнерам.</li>
          </ol>
        </article>

        <article className="panel cartPanel">
          <h2>Корзина</h2>
          <Metric label="Магазин" value="Mock Store" />
          <Metric label="Статус" value="Нужно подтверждение" />
          <Metric label="Итого" value="2900 руб." />
          <button type="button">Проверить корзину</button>
        </article>

        <article className="panel debugPanel">
          <h2>Debug</h2>
          <Metric label="User" value="demo@foodpilot.local" />
          <Metric label="AI" value="LocalAiAdapter" />
          <Metric label="Store" value="mock-store" />
          <Metric label="Last cart" value="READY_FOR_CONFIRMATION" />
        </article>
      </section>
    </main>
  );
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="metric">
      <span>{label}</span>
      <strong>{value}</strong>
    </div>
  );
}

function Table({ rows }: { rows: string[][] }) {
  return (
    <div className="table">
      {rows.map((row) => (
        <div className="tableRow" key={row.join(':')}>
          {row.map((cell) => (
            <span key={cell}>{cell}</span>
          ))}
        </div>
      ))}
    </div>
  );
}
