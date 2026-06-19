import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { CaloriesController } from './calories.controller';
import { CaloriesService } from './calories.service';

@Module({
  imports: [PrismaModule],
  controllers: [CaloriesController],
  providers: [CaloriesService],
})
export class CaloriesModule {}
