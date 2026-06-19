import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { StatusBar } from 'expo-status-bar';
import {
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { defaultFoodPilotContext } from '@foodpilot/domain';

type ScreenKey = 'profile' | 'calories' | 'eaten' | 'cook' | 'recipe' | 'grocery' | 'cart';

const apiBaseUrl = process.env.EXPO_PUBLIC_API_URL ?? 'http://localhost:3001';

const screens: Array<{ key: ScreenKey; label: string }> = [
  { key: 'profile', label: 'Профиль' },
  { key: 'calories', label: 'Калории' },
  { key: 'eaten', label: 'Сегодня' },
  { key: 'cook', label: 'Готовить' },
  { key: 'recipe', label: 'Рецепт' },
  { key: 'grocery', label: 'Покупки' },
  { key: 'cart', label: 'Корзина' },
];

export default function App() {
  const [activeScreen, setActiveScreen] = useState<ScreenKey>('profile');
  const [health, setHealth] = useState<'checking' | 'online' | 'offline'>('checking');
  const [message, setMessage] = useState(
    'Хочу меню на неделю. Люблю ленивые голубцы и холодный свекольник.',
  );

  useEffect(() => {
    const controller = new AbortController();

    fetch(`${apiBaseUrl}/health`, { signal: controller.signal })
      .then((response) => setHealth(response.ok ? 'online' : 'offline'))
      .catch(() => setHealth('offline'));

    return () => controller.abort();
  }, []);

  const content = useMemo(() => {
    if (activeScreen === 'profile') {
      return (
        <Panel title="Профиль">
          <InfoRow label="Цель" value="Похудение" />
          <InfoRow label="Лимит" value="1800 ккал" />
          <InfoRow label="Приемы пищи" value="3 в день" />
          <InfoRow label="Бюджет" value="Нормальный" />
          <SectionTitle>Вкусы</SectionTitle>
          <TagList values={defaultFoodPilotContext.favoriteDishes} />
          <SectionTitle>Не предлагать</SectionTitle>
          <TagList values={defaultFoodPilotContext.dislikedProducts} muted />
        </Panel>
      );
    }

    if (activeScreen === 'calories') {
      return (
        <Panel title="Дневной калораж">
          <ProgressBar value={600} max={1800} />
          <InfoRow label="Съедено" value="600 ккал" />
          <InfoRow label="Осталось" value="1200 ккал" emphasis />
          <InfoRow label="БЖУ" value="48 / 26 / 38 г" />
        </Panel>
      );
    }

    if (activeScreen === 'eaten') {
      return (
        <Panel title="Что съел сегодня">
          <FoodLog name="Ленивые голубцы" meta="1 порция · 430 ккал" />
          <FoodLog name="Творог 5%" meta="170 ккал" />
          <PrimaryButton label="Добавить блюдо" />
        </Panel>
      );
    }

    if (activeScreen === 'cook') {
      return (
        <Panel title="Что приготовить">
          <TextInput value={message} onChangeText={setMessage} multiline style={styles.input} />
          <FoodLog name="Ленивые голубцы" meta="8 порций · 430 ккал · meal-prep" />
          <FoodLog name="Холодный свекольник" meta="4 порции · 230 ккал · без яиц" />
          <FoodLog name="Окрошка без яиц" meta="4 порции · 280 ккал" />
          <PrimaryButton label="Запросить меню" />
        </Panel>
      );
    }

    if (activeScreen === 'recipe') {
      return (
        <Panel title="Ленивые голубцы">
          {[
            'Обжарить лук и морковь.',
            'Добавить фарш.',
            'Добавить капусту, рис и томаты.',
            'Тушить 40-50 минут.',
            'Разложить по контейнерам.',
          ].map((step, index) => (
            <InfoRow key={step} label={`${index + 1}`} value={step} />
          ))}
        </Panel>
      );
    }

    if (activeScreen === 'grocery') {
      return (
        <Panel title="Список покупок">
          <FoodLog name="Фарш говяжий" meta="1200 г · купить 2 x 1000 г" />
          <FoodLog name="Капуста" meta="1600 г · купить 4 x 500 г" />
          <FoodLog name="Свекла" meta="600 г · купить 2 x 500 г" />
          <FoodLog name="Кефир 1%" meta="1000 мл · купить 2 x 500 г" />
        </Panel>
      );
    }

    return (
      <Panel title="Корзина">
        <InfoRow label="Статус" value="Нужно подтверждение" emphasis />
        <InfoRow label="Магазин" value="Mock Store" />
        <InfoRow label="Итого" value="2900 руб." />
        <PrimaryButton label="Проверить корзину" />
      </Panel>
    );
  }, [activeScreen, message]);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <View style={styles.header}>
        <View>
          <Text style={styles.brand}>FoodPilot</Text>
          <Text style={styles.subtitle}>Простая еда, калории, покупки</Text>
        </View>
        <View
          style={[styles.status, health === 'online' ? styles.statusOnline : styles.statusOffline]}
        >
          <Text style={styles.statusText}>
            {health === 'online' ? 'API online' : 'API offline'}
          </Text>
        </View>
      </View>
      <View style={styles.tabs}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {screens.map((screen) => (
            <Pressable
              key={screen.key}
              onPress={() => setActiveScreen(screen.key)}
              style={[styles.tab, activeScreen === screen.key ? styles.tabActive : null]}
            >
              <Text
                style={[styles.tabText, activeScreen === screen.key ? styles.tabTextActive : null]}
              >
                {screen.label}
              </Text>
            </Pressable>
          ))}
        </ScrollView>
      </View>
      <ScrollView contentContainerStyle={styles.content}>{content}</ScrollView>
    </SafeAreaView>
  );
}

function Panel({ title, children }: { title: string; children: ReactNode }) {
  return (
    <View style={styles.panel}>
      <Text style={styles.panelTitle}>{title}</Text>
      {children}
    </View>
  );
}

function SectionTitle({ children }: { children: ReactNode }) {
  return <Text style={styles.sectionTitle}>{children}</Text>;
}

function InfoRow({
  label,
  value,
  emphasis = false,
}: {
  label: string;
  value: string;
  emphasis?: boolean;
}) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={[styles.rowValue, emphasis ? styles.rowValueEmphasis : null]}>{value}</Text>
    </View>
  );
}

function FoodLog({ name, meta }: { name: string; meta: string }) {
  return (
    <View style={styles.foodLog}>
      <Text style={styles.foodName}>{name}</Text>
      <Text style={styles.foodMeta}>{meta}</Text>
    </View>
  );
}

function TagList({ values, muted = false }: { values: string[]; muted?: boolean }) {
  return (
    <View style={styles.tags}>
      {values.map((value) => (
        <View key={value} style={[styles.tag, muted ? styles.tagMuted : null]}>
          <Text style={[styles.tagText, muted ? styles.tagTextMuted : null]}>{value}</Text>
        </View>
      ))}
    </View>
  );
}

function ProgressBar({ value, max }: { value: number; max: number }) {
  return (
    <View style={styles.progressTrack}>
      <View style={[styles.progressFill, { width: `${Math.min(100, (value / max) * 100)}%` }]} />
    </View>
  );
}

function PrimaryButton({ label }: { label: string }) {
  return (
    <Pressable style={styles.primaryButton}>
      <Text style={styles.primaryButtonText}>{label}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#f5f7f3',
  },
  header: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingTop: 18,
    paddingBottom: 12,
  },
  brand: {
    color: '#162019',
    fontSize: 28,
    fontWeight: '800',
  },
  subtitle: {
    color: '#526054',
    fontSize: 14,
    marginTop: 2,
  },
  status: {
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  statusOnline: {
    backgroundColor: '#dcefe3',
  },
  statusOffline: {
    backgroundColor: '#f1dfd6',
  },
  statusText: {
    color: '#243126',
    fontSize: 12,
    fontWeight: '700',
  },
  tabs: {
    borderBottomColor: '#dde3da',
    borderBottomWidth: 1,
    borderTopColor: '#dde3da',
    borderTopWidth: 1,
    paddingVertical: 8,
  },
  tab: {
    borderRadius: 6,
    marginLeft: 10,
    paddingHorizontal: 14,
    paddingVertical: 9,
  },
  tabActive: {
    backgroundColor: '#1f6b45',
  },
  tabText: {
    color: '#445247',
    fontSize: 14,
    fontWeight: '700',
  },
  tabTextActive: {
    color: '#ffffff',
  },
  content: {
    padding: 20,
    paddingBottom: 40,
  },
  panel: {
    backgroundColor: '#ffffff',
    borderColor: '#dde3da',
    borderRadius: 8,
    borderWidth: 1,
    padding: 18,
  },
  panelTitle: {
    color: '#162019',
    fontSize: 22,
    fontWeight: '800',
    marginBottom: 16,
  },
  sectionTitle: {
    color: '#162019',
    fontSize: 15,
    fontWeight: '800',
    marginTop: 18,
    marginBottom: 10,
  },
  row: {
    alignItems: 'center',
    borderBottomColor: '#edf0ea',
    borderBottomWidth: 1,
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 11,
  },
  rowLabel: {
    color: '#627066',
    fontSize: 14,
    fontWeight: '700',
  },
  rowValue: {
    color: '#1f2b23',
    flex: 1,
    fontSize: 15,
    marginLeft: 18,
    textAlign: 'right',
  },
  rowValueEmphasis: {
    color: '#1f6b45',
    fontWeight: '800',
  },
  tags: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  tag: {
    backgroundColor: '#e5f0e8',
    borderRadius: 6,
    paddingHorizontal: 10,
    paddingVertical: 7,
  },
  tagMuted: {
    backgroundColor: '#f1e7e2',
  },
  tagText: {
    color: '#1f6b45',
    fontSize: 13,
    fontWeight: '700',
  },
  tagTextMuted: {
    color: '#8a4c38',
  },
  progressTrack: {
    backgroundColor: '#e6eadf',
    borderRadius: 6,
    height: 14,
    marginBottom: 16,
    overflow: 'hidden',
  },
  progressFill: {
    backgroundColor: '#1f6b45',
    height: '100%',
  },
  foodLog: {
    borderColor: '#e1e6de',
    borderRadius: 8,
    borderWidth: 1,
    marginBottom: 10,
    padding: 12,
  },
  foodName: {
    color: '#1d271f',
    fontSize: 16,
    fontWeight: '800',
  },
  foodMeta: {
    color: '#667368',
    fontSize: 14,
    marginTop: 4,
  },
  input: {
    backgroundColor: '#f8faf6',
    borderColor: '#dfe6dc',
    borderRadius: 8,
    borderWidth: 1,
    color: '#1d271f',
    fontSize: 15,
    lineHeight: 21,
    minHeight: 92,
    padding: 12,
    textAlignVertical: 'top',
    marginBottom: 14,
  },
  primaryButton: {
    alignItems: 'center',
    backgroundColor: '#1f6b45',
    borderRadius: 6,
    marginTop: 8,
    paddingVertical: 13,
  },
  primaryButtonText: {
    color: '#ffffff',
    fontSize: 15,
    fontWeight: '800',
  },
});
