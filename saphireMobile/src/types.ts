export type SendTextPayload = {
  userId: string;
  text: string;
  classification: string;
};

export type Message = {
  messageId: string;
  userId: string;
  inputType: string;
  originalContent?: string;
  transcription?: string;
  classification?: string;
  timestamp: string;
};

export type AudioUploadPayload = {
  userId: string;
};

export type AudioProcessPayload = {
  userId: string;
  s3AudioUrl: string;
  classification: string;
};

export type RootStackParamList = {
  Home: undefined;
  History: undefined;
};
