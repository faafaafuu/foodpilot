import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  ArrayNotEmpty,
  IsArray,
  IsInt,
  IsOptional,
  IsString,
  IsUrl,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';

export class VkusvillCartItemDto {
  @ApiProperty({
    description: 'Адрес карточки товара — его отдаёт поиск в поле productUrl.',
    example: 'https://vkusvill.ru/goods/moloko-2-36296/',
  })
  @IsString()
  @IsUrl({ host_whitelist: ['vkusvill.ru', 'www.vkusvill.ru'] })
  productUrl!: string;

  @ApiPropertyOptional({ description: 'Сколько штук положить.', default: 1, minimum: 1, maximum: 20 })
  @IsOptional()
  @IsInt()
  @Min(1)
  // Потолок не от жадности: количество набирается нажатиями на плюс, и просьба
  // о сотне штук превратилась бы в сотню кликов по живому магазину.
  @Max(20)
  quantity?: number;
}

export class VkusvillCartDto {
  @ApiProperty({ description: 'Открытая сессия браузера, в которой человек уже вошёл в магазин.' })
  @IsString()
  sessionId!: string;

  @ApiProperty({ type: [VkusvillCartItemDto] })
  @IsArray()
  @ArrayNotEmpty()
  @ArrayMaxSize(30)
  @ValidateNested({ each: true })
  @Type(() => VkusvillCartItemDto)
  items!: VkusvillCartItemDto[];
}
