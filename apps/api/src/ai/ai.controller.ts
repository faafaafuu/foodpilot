import { Body, Controller, Param, Post } from '@nestjs/common';
import { ApiCreatedResponse, ApiTags } from '@nestjs/swagger';
import { AiAssistantResponse } from './ai.types';
import { AiService } from './ai.service';
import { AiMessageDto } from './dto/ai-message.dto';

@ApiTags('ai')
@Controller('ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post(':userId/messages')
  @ApiCreatedResponse({ description: 'Handled a natural-language FoodPilot request.' })
  handleMessage(
    @Param('userId') userId: string,
    @Body() dto: AiMessageDto,
  ): Promise<AiAssistantResponse> {
    return this.aiService.handleMessage(userId, dto.message);
  }
}
