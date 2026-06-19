import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

export class ReplaceProductDto {
  @ApiProperty({ example: '4c0b8a50-0d11-4a1f-861d-64f345947d9d' })
  @IsUUID()
  oldProductId!: string;

  @ApiProperty({ example: '5f1c8a50-0d11-4a1f-861d-64f345947d9d' })
  @IsUUID()
  newProductId!: string;
}
