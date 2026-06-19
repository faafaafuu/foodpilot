import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { DietGoal } from '@prisma/client';
import { IsEnum, IsInt, IsOptional, Max, Min } from 'class-validator';

export class SetCalorieGoalDto {
  @ApiPropertyOptional({ enum: DietGoal, example: DietGoal.WEIGHT_LOSS })
  @IsOptional()
  @IsEnum(DietGoal)
  goal?: DietGoal;

  @ApiProperty({ example: 1800 })
  @IsInt()
  @Min(800)
  @Max(6000)
  dailyCalories!: number;

  @ApiPropertyOptional({ example: 120 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(500)
  proteinGrams?: number;

  @ApiPropertyOptional({ example: 60 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(300)
  fatGrams?: number;

  @ApiPropertyOptional({ example: 170 })
  @IsOptional()
  @IsInt()
  @Min(0)
  @Max(800)
  carbGrams?: number;
}
