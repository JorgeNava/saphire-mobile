export type InputType = 'text' | 'audio';

export interface Message {
  userId: string;
  timestamp?: string;
  messageId: string;
  inputType: InputType;
  // Campos de contenido (nuevo backend usa 'content', viejo usa 'originalContent')
  content?: string;
  originalContent?: string;
  // Legacy field - mantener para backward compatibility
  classification?: string;
  // Nuevos campos del sistema de tags
  tagIds?: string[];
  tagNames?: string[];
  tagSource?: 'Manual' | 'AI' | 'Hybrid' | null;
  usedAI: boolean;
  // Campos de fecha (nuevo backend usa createdAt/updatedAt, viejo usa timestamp/lastUpdated)
  createdAt?: string;
  updatedAt?: string;
  lastUpdated?: string;
}
