import { Injectable } from '@nestjs/common';
import { AiAssistantResponse } from './ai.types';
import { LocalAiAdapter } from './local-ai.adapter';

@Injectable()
export class AiService {
  constructor(private readonly adapter: LocalAiAdapter) {}

  handleMessage(userId: string, message: string): Promise<AiAssistantResponse> {
    return this.adapter.handle(userId, message);
  }
}
