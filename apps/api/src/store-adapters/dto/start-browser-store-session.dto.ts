import { ApiProperty, ApiPropertyOptional } from '@nestjs/swagger';
import { IsBoolean, IsIn, IsOptional } from 'class-validator';
import { BrowserStoreAutomationProvider } from '../store-adapter.types';

const BROWSER_SESSION_PROVIDERS: BrowserStoreAutomationProvider[] = [
  'yandex-eda',
  'yandex-go',
  'pyaterochka',
  'magnit',
];

export class StartBrowserStoreSessionDto {
  @ApiProperty({ enum: BROWSER_SESSION_PROVIDERS, example: 'yandex-eda' })
  @IsIn(BROWSER_SESSION_PROVIDERS)
  provider!: BrowserStoreAutomationProvider;

  @ApiPropertyOptional({
    default: false,
    description:
      'Use false for one-time provider login; true is mostly useful for CI smoke checks.',
  })
  @IsOptional()
  @IsBoolean()
  headless?: boolean;
}
