import type { Metadata } from 'next';
import './styles.css';

export const metadata: Metadata = {
  title: 'FoodPilot',
  description: 'Meal planning and calorie tracking for practical home cooking.',
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  );
}
