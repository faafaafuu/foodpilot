import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { CaloriesModule } from './calories/calories.module';
import { DishesModule } from './dishes/dishes.module';
import { GroceryListsModule } from './grocery-lists/grocery-lists.module';
import { HealthModule } from './health/health.module';
import { ProfilesModule } from './profiles/profiles.module';
import { RecommendationsModule } from './recommendations/recommendations.module';
import { StoreAdaptersModule } from './store-adapters/store-adapters.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    HealthModule,
    ProfilesModule,
    CaloriesModule,
    DishesModule,
    RecommendationsModule,
    GroceryListsModule,
    StoreAdaptersModule,
  ],
})
export class AppModule {}
