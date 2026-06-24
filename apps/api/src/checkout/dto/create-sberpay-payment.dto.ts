import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsEmail, IsOptional, IsPhoneNumber, IsString, IsUrl, MaxLength } from 'class-validator';

export class CreateSberPayPaymentDto {
  @ApiPropertyOptional({ example: 'https://foodpilot.example/checkout/success' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  returnUrl?: string;

  @ApiPropertyOptional({ example: 'https://foodpilot.example/checkout/fail' })
  @IsOptional()
  @IsUrl({ require_tld: false })
  failUrl?: string;

  @ApiPropertyOptional({ example: 'FoodPilot cart payment' })
  @IsOptional()
  @IsString()
  @MaxLength(512)
  description?: string;

  @ApiPropertyOptional({ example: '+79991234567' })
  @IsOptional()
  @IsPhoneNumber()
  phone?: string;

  @ApiPropertyOptional({ example: 'customer@example.com' })
  @IsOptional()
  @IsEmail()
  email?: string;

  @ApiPropertyOptional({ example: 'foodpilot-user-123' })
  @IsOptional()
  @IsString()
  @MaxLength(255)
  clientId?: string;
}
