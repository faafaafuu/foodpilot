import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { BrowserStoreAutomationProvider } from '../store-adapter.types';

const BROWSER_AUTOMATION_PROVIDERS: BrowserStoreAutomationProvider[] = [
  'yandex-eda',
  'yandex-go',
  'pyaterochka',
  'magnit',
];

export class CreateBrowserAutomationPlanDto {
  @ApiProperty({ enum: BROWSER_AUTOMATION_PROVIDERS, example: 'yandex-eda' })
  @IsIn(BROWSER_AUTOMATION_PROVIDERS)
  provider!: BrowserStoreAutomationProvider;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowSearch?: boolean;

  @ApiPropertyOptional({ default: true })
  @IsOptional()
  @IsBoolean()
  allowCartAssembly?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowOrderSubmission?: boolean;

  @ApiPropertyOptional({ default: false })
  @IsOptional()
  @IsBoolean()
  allowPayment?: boolean;
}
