import { ApiProperty } from '@nestjs/swagger';
import { IsString, MinLength } from 'class-validator';

export class AiMessageDto {
  @ApiProperty({ example: 'Хочу меню на неделю. Люблю ленивые голубцы и холодный свекольник.' })
  @IsString()
  @MinLength(2)
  message!: string;
}
