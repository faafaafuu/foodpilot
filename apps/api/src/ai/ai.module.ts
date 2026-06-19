import { Module } from '@nestjs/common';
import { CaloriesModule } from '../calories/calories.module';
import { DishesModule } from '../dishes/dishes.module';
import { GroceryListsModule } from '../grocery-lists/grocery-lists.module';
import { PrismaModule } from '../prisma/prisma.module';
import { RecommendationsModule } from '../recommendations/recommendations.module';
import { AiController } from './ai.controller';
import { AiService } from './ai.service';
import { LocalAiAdapter } from './local-ai.adapter';

@Module({
  imports: [PrismaModule, CaloriesModule, DishesModule, RecommendationsModule, GroceryListsModule],
  controllers: [AiController],
  providers: [AiService, LocalAiAdapter],
})
export class AiModule {}
