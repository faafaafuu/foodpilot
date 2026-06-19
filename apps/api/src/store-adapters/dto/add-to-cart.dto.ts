import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsUUID, Max, Min } from 'class-validator';

export class AddToCartDto {
  @ApiPropertyOptional({ example: '4c0b8a50-0d11-4a1f-861d-64f345947d9d' })
  @IsOptional()
  @IsUUID()
  cartId?: string;

  @ApiPropertyOptional({ example: '4c0b8a50-0d11-4a1f-861d-64f345947d9d' })
  @IsOptional()
  @IsUUID()
  userId?: string;

  @ApiPropertyOptional({ example: '4c0b8a50-0d11-4a1f-861d-64f345947d9d' })
  @IsOptional()
  @IsUUID()
  groceryListId?: string;

  @ApiProperty({ example: '4c0b8a50-0d11-4a1f-861d-64f345947d9d' })
  @IsUUID()
  productId!: string;

  @ApiProperty({ example: 2 })
  @IsInt()
  @Min(1)
  @Max(100)
  quantity!: number;
}
