export type AiIntent =
  | 'CALORIES_LEFT'
  | 'WEEKLY_MENU'
  | 'GROCERY_LIST'
  | 'RECIPE'
  | 'INGREDIENTS'
  | 'DISH_RECOMMENDATIONS';

export interface AiAssistantResponse {
  intent: AiIntent;
  reply: string;
  actions: string[];
  data: unknown;
}

export interface AiAdapter {
  handle(userId: string, message: string): Promise<AiAssistantResponse>;
}
