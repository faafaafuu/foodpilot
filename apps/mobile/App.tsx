import { StatusBar } from 'expo-status-bar';
import { StyleSheet, Text, View } from 'react-native';
import { defaultFoodPilotContext } from '@foodpilot/domain';

export default function App() {
  return (
    <View style={styles.container}>
      <StatusBar style="dark" />
      <Text style={styles.eyebrow}>FoodPilot MVP</Text>
      <Text style={styles.title}>Простое меню и калории</Text>
      <Text style={styles.body}>
        Стартовый Expo-клиент готов к экранам onboarding, профиля, дневника, меню, рецепта, списка
        покупок и корзины.
      </Text>
      <Text style={styles.caption}>
        Любимые блюда: {defaultFoodPilotContext.favoriteDishes.join(', ')}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    padding: 24,
    backgroundColor: '#f6f7f9',
  },
  eyebrow: {
    color: '#51606f',
    fontSize: 13,
    fontWeight: '700',
    marginBottom: 12,
    textTransform: 'uppercase',
  },
  title: {
    color: '#18202a',
    fontSize: 30,
    fontWeight: '800',
    lineHeight: 36,
    marginBottom: 12,
  },
  body: {
    color: '#3f4b58',
    fontSize: 16,
    lineHeight: 24,
  },
  caption: {
    color: '#18202a',
    fontSize: 15,
    marginTop: 24,
  },
});
