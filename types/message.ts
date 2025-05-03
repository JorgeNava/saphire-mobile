export type InputType = 'text' | 'audio';

export interface Message {
  userId: string;
  timestamp: string;
  messageId: string;
  inputType: InputType;
  originalContent: string;
  classification: string;
  usedAI: boolean;
  lastUpdated: string;
}
