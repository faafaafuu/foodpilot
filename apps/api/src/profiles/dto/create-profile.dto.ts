import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DietGoal } from '@prisma/client';
import {
  ArrayUnique,
  IsArray,
  IsEmail,
  IsEnum,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class CreateProfileDto {
  @ApiPropertyOptional({ example: 'demo@foodpilot.local' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'FoodPilot Demo' })
  @IsOptional()
  @IsString()
  displayName?: string;

  @ApiProperty({ example: 92 })
  @IsNumber()
  @Min(20)
  @Max(400)
  weightKg!: number;

  @ApiProperty({ example: 178 })
  @IsInt()
  @Min(80)
  @Max(260)
  heightCm!: number;

  @ApiProperty({ example: 34 })
  @IsInt()
  @Min(12)
  @Max(120)
  age!: number;

  @ApiProperty({ enum: DietGoal, example: DietGoal.WEIGHT_LOSS })
  @IsEnum(DietGoal)
  goal!: DietGoal;

  @ApiProperty({ example: 1800 })
  @IsInt()
  @Min(800)
  @Max(6000)
  dailyCalorieLimit!: number;

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

  @ApiPropertyOptional({ example: ['ленивые голубцы', 'холодный свекольник'] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  favoriteDishes?: string[];

  @ApiPropertyOptional({ example: ['яйца', 'каши', 'авокадо'] })
  @IsOptional()
  @IsArray()
  @ArrayUnique()
  @IsString({ each: true })
  dislikedProducts?: string[];
}
