import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export class AddPreferenceDto {
  @ApiProperty({ example: 'ленивые голубцы' })
  @IsString()
  value!: string;

  @ApiPropertyOptional({ example: 'Готовить на 2-3 дня' })
  @IsOptional()
  @IsString()
  notes?: string;

  @ApiPropertyOptional({ example: 5 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(10)
  weight?: number;

  @ApiPropertyOptional({ example: 2 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(30)
  repeatFrequency?: number;
}
