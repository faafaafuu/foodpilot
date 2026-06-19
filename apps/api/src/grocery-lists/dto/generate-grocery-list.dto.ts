import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import {
  ArrayNotEmpty,
  IsArray,
  IsNumber,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class MenuDishDto {
  @ApiProperty({ example: 'lazy-cabbage-rolls' })
  @IsString()
  slug!: string;

  @ApiPropertyOptional({ example: 8, description: 'Target portions. Defaults to recipe servings.' })
  @IsOptional()
  @IsNumber()
  @Min(0.5)
  @Max(50)
  servings?: number;
}

export class GenerateGroceryListDto {
  @ApiPropertyOptional({ example: 'Меню на неделю' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiProperty({ type: [MenuDishDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ValidateNested({ each: true })
  @Type(() => MenuDishDto)
  dishes!: MenuDishDto[];
}
