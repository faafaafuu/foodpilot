import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { MealType } from '@prisma/client';
import {
  IsEnum,
  IsISO8601,
  IsInt,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
} from 'class-validator';

export class AddProductMealDto {
  @ApiProperty({ example: 'Творог 5%' })
  @IsString()
  name!: string;

  @ApiPropertyOptional({ enum: MealType, example: MealType.SNACK })
  @IsOptional()
  @IsEnum(MealType)
  mealType?: MealType;

  @ApiPropertyOptional({ example: 1 })
  @IsOptional()
  @IsNumber()
  @Min(0.1)
  @Max(20)
  servings?: number;

  @ApiProperty({ example: 220 })
  @IsInt()
  @Min(0)
  @Max(5000)
  calories!: number;

  @ApiPropertyOptional({ example: 28 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(500)
  proteinGrams?: number;

  @ApiPropertyOptional({ example: 10 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(300)
  fatGrams?: number;

  @ApiPropertyOptional({ example: 8 })
  @IsOptional()
  @IsNumber()
  @Min(0)
  @Max(800)
  carbGrams?: number;

  @ApiPropertyOptional({ example: '2026-06-19T12:00:00.000Z' })
  @IsOptional()
  @IsISO8601()
  loggedAt?: string;

  @ApiPropertyOptional({ example: 'Перекус после обеда' })
  @IsOptional()
  @IsString()
  notes?: string;
}
