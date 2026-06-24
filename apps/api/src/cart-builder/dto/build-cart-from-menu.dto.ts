import { Type } from 'class-transformer';
import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, ValidateNested } from 'class-validator';
import { GenerateGroceryListDto } from '../../grocery-lists/dto/generate-grocery-list.dto';

export class BuildCartFromMenuDto extends GenerateGroceryListDto {
  @ApiPropertyOptional({ example: 'mock-store' })
  @IsOptional()
  @IsString()
  storeCode?: string;
}

export class BuildCartFromMenuRequestDto {
  @ApiProperty({ example: '6c1b2a08-1d22-45c7-aed3-9ca00f8cc73f' })
  @IsString()
  userId!: string;

  @ApiProperty({ type: BuildCartFromMenuDto })
  @ValidateNested()
  @Type(() => BuildCartFromMenuDto)
  menu!: BuildCartFromMenuDto;
}
