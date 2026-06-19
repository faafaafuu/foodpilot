import { ApiPropertyOptional } from '@nestjs/swagger';
import { DietGoal } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class UpdateProfileDto {
  @ApiPropertyOptional({ example: 'FoodPilot Demo' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiPropertyOptional({ example: 90 })
  @IsOptional()
  @IsNumber()
  @Min(20)
  @Max(400)
  weightKg?: number;

  @ApiPropertyOptional({ example: 178 })
  @IsOptional()
  @IsInt()
  @Min(80)
  @Max(260)
  heightCm?: number;

  @ApiPropertyOptional({ example: 34 })
  @IsOptional()
  @IsInt()
  @Min(12)
  @Max(120)
  age?: number;

  @ApiPropertyOptional({ enum: DietGoal, example: DietGoal.WEIGHT_LOSS })
  @IsOptional()
  @IsEnum(DietGoal)
  goal?: DietGoal;

  @ApiPropertyOptional({ example: 1800 })
  @IsOptional()
  @IsInt()
  @Min(800)
  @Max(6000)
  dailyCalorieLimit?: number;

  @ApiPropertyOptional({ example: 3 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(8)
  desiredMealsPerDay?: number;

  @ApiPropertyOptional({ example: 700000 })
  @IsOptional()
  @IsInt()
  @Min(0)
  weeklyBudgetCents?: number;

  @ApiPropertyOptional({ example: 'Москва' })
  @IsOptional()
  @IsString()
  deliveryCity?: string;

  @ApiPropertyOptional({ example: ['mock-store'] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  preferredStores?: string[];
}
