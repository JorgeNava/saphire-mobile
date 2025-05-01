import { API_URL } from '@env';
import axios from 'axios';
import {
  SendTextPayload,
  AudioUploadPayload,
  AudioProcessPayload,
} from '../types';

const USE_MOCK = true;

const realApi = {
  sendTextMessage: async ({ userId, text, classification }: SendTextPayload) => {
    const response = await axios.post(`${API_URL}/text`, { userId, text, classification });
    return response.data;
  },

  getMessages: async (
    userId: string,
    classification: string | null = null,
    from: string | null = null
  ) => {
    const params: { [key: string]: string } = { userId };
    if (classification) params.classification = classification;
    if (from) params.from = from;

    const response = await axios.get(`${API_URL}/messages`, { params });
    return response.data.messages;
  },

  generateUploadUrl: async ({ userId }: AudioUploadPayload) => {
    const response = await axios.post(`${API_URL}/generate-upload-url`, { userId });
    return response.data;
  },

  sendAudioForProcessing: async ({ userId, s3AudioUrl, classification }: AudioProcessPayload) => {
    const response = await axios.post(`${API_URL}/audio`, { userId, s3AudioUrl, classification });
    return response.data;
  },
};

const mockApi = {
  sendTextMessage: async ({ userId, text, classification }: SendTextPayload) => {
    console.log('[MOCK] sendTextMessage', { userId, text, classification });
    return { success: true };
  },

  getMessages: async (
    userId: string,
    classification: string | null = null,
    from: string | null = null
  ) => {
    console.log('[MOCK] getMessages', { userId, classification, from });
    return [
      {
        messageId: '1',
        inputType: 'text',
        originalContent: 'Mensaje simulado',
        classification: 'notas',
      },
      {
        messageId: '2',
        inputType: 'audio',
        transcription: 'Audio de prueba',
        classification: 'ideas',
      },
    ];
  },

  generateUploadUrl: async ({ userId }: AudioUploadPayload) => {
    console.log('[MOCK] generateUploadUrl', { userId });
    return {
      uploadUrl: 'https://mock-url.com/upload',
      s3AudioUrl: 'https://mock-url.com/audio.m4a',
    };
  },

  sendAudioForProcessing: async ({ userId, s3AudioUrl, classification }: AudioProcessPayload) => {
    console.log('[MOCK] sendAudioForProcessing', { userId, s3AudioUrl, classification });
    return { success: true };
  },
};

// 👇 Exporta la versión real o mock según el flag
export const {
  sendTextMessage,
  getMessages,
  generateUploadUrl,
  sendAudioForProcessing,
} = USE_MOCK ? mockApi : realApi;
