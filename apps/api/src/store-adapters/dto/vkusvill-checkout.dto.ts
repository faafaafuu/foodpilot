import { ApiProperty } from '@nestjs/swagger';
import { IsInt, IsString, Min } from 'class-validator';

export class VkusvillCheckoutPlanDto {
  @ApiProperty({ description: 'Открытая сессия браузера с выполненным входом в магазин.' })
  @IsString()
  sessionId!: string;
}

export class VkusvillCheckoutConfirmDto {
  @ApiProperty({ description: 'Открытая сессия браузера с выполненным входом в магазин.' })
  @IsString()
  sessionId!: string;

  @ApiProperty({
    description:
      'Сумма в рублях, которую человек уже увидел и одобрил. Несовпадение с суммой на ' +
      'странице отменяет оформление: это был бы заказ не на ту сумму, о которой договорились.',
  })
  @IsInt()
  @Min(1)
  expectedTotalRub!: number;
}
