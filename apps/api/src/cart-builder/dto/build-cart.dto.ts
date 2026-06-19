import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString } from 'class-validator';

export class BuildCartDto {
  @ApiPropertyOptional({ example: 'mock-store' })
  @IsOptional()
  @IsString()
  storeCode?: string;
}
