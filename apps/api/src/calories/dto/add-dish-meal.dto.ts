import { ApiPropertyOptional } from '@nestjs/swagger';
import { MealType } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsNumber,
  IsOptional,
  IsString,
  IsUUID,
  Max,
  Min,
} from 'class-validator';

export class AddDishMealDto {
  @ApiPropertyOptional({ example: 'lazy-cabbage-rolls' })
  @IsOptional()
  @IsString()
  dishSlug?: string;

  @ApiPropertyOptional({ example: '4c0b8a50-0d11-4a1f-861d-64f345947d9d' })
  @IsOptional()
  @IsUUID()
  dishId?: string;

  @ApiPropertyOptional({ example: 'Ленивые голубцы' })
  @IsOptional()
  @IsString()
  name?: string;

  @ApiPropertyOptional({ enum: MealType, example: MealType.LUNCH })
  @IsOptional()
  @IsEnum(MealType)
  mealType?: MealType;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(10)
  servings?: number;

  @ApiPropertyOptional({ example: 430 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(5000)
  calories?: number;

  @ApiPropertyOptional({ example: '2026-06-19T12:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  loggedAt?: string;

  @ApiPropertyOptional({ example: 'Без сметаны' })
  @IsOptional()
  @IsString()
  notes?: string;
}
