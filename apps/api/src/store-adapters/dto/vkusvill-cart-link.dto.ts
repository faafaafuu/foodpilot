import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsNumber,
  IsOptional,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { CART_LINK_LIMIT } from '../vkusvill-mcp.client';

export class VkusvillCartLinkItemDto {
  @ApiProperty({
    description: 'xml_id товара — его отдаёт поиск в поле externalId.',
    example: 36296,
  })
  @IsInt()
  @Min(1)
  xmlId!: number;

  @ApiPropertyOptional({
    description: 'Сколько взять: штуки или килограммы для весового товара.',
    default: 1,
    minimum: 0.01,
    maximum: 40,
  })
  @IsOptional()
  @IsNumber()
  @Min(0.01)
  // Потолок — ограничение самого MCP ВкусВилла.
  @Max(40)
  quantity?: number;
}

export class VkusvillCartLinkDto {
  @ApiProperty({ type: [VkusvillCartLinkItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(CART_LINK_LIMIT)
  @ValidateNested({ each: true })
  @Type(() => VkusvillCartLinkItemDto)
  items!: VkusvillCartLinkItemDto[];
}
