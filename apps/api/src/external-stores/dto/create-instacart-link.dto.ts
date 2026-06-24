import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsInt, IsOptional, IsString, IsUrl, Max, Min } from 'class-validator';

export class CreateInstacartLinkDto {
  @ApiPropertyOptional({ example: 'FoodPilot weekly groceries' })
  @IsOptional()
  @IsString()
  title?: string;

  @ApiPropertyOptional({ example: 30 })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(365)
  expiresInDays?: number;

  @ApiPropertyOptional({ example: 'https://foodpilot.local/grocery-list/123' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  partnerLinkbackUrl?: string;
}
