// ChatScreen.tsx
import {
  Box,
  HStack,
  Icon,
  Input,
  InputField,
  KeyboardAvoidingView,
  Pressable,
  Text,
} from '@gluestack-ui/themed';
import { Buffer } from 'buffer';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useRef, useState } from 'react';
import {
  FlatList,
  GestureResponderEvent,
  LayoutAnimation,
  ListRenderItem,
  Platform,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Message {
  id: string;
  text: string;
  fromMe: boolean;
  status?: 'sending' | 'sent';
  sentAt?: number;
}

// Endpoints correctos para mensajes
const TEXT_ENDPOINT =
  'https://zon9g6gx9k.execute-api.us-east-1.amazonaws.com/messages';
const AUDIO_UPLOAD_ENDPOINT =
  'https://zon9g6gx9k.execute-api.us-east-1.amazonaws.com/messages/upload-url';
const AUDIO_NOTIFY_ENDPOINT =
  'https://zon9g6gx9k.execute-api.us-east-1.amazonaws.com/messages/audio';

// Formatea timestamp como HH:mm
const formatTime = (timestamp: number) => {
  const d = new Date(timestamp);
  const h = d.getHours().toString().padStart(2, '0');
  const m = d.getMinutes().toString().padStart(2, '0');
  return `${h}:${m}`;
};

export default function ChatScreen() {
  const insets = useSafeAreaInsets();
  const colorScheme = useColorScheme();
  const theme = {
    background: colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC',
    text: colorScheme === 'dark' ? '$white' : '$black',
  };
  const inputBg = colorScheme === 'dark' ? '#162E3C' : '#7DAEB5';
  const inputBorder = colorScheme === 'dark' ? '#0F2128' : '#6B8B90';

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hola, Jorge 👋', fromMe: false },
  ]);
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [showTagsInput, setShowTagsInput] = useState(false);
  const [sendingText, setSendingText] = useState(false);
  const [sendingAudio, setSendingAudio] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [micPressed, setMicPressed] = useState(false);
  const audioPlaceholderId = useRef<string | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);

  const handleSend = async () => {
    if (!text.trim()) return;
    const id = Date.now().toString();
    setMessages(prev => [
      { id, text, fromMe: true, status: 'sending' },
      ...prev,
    ]);
    setText('');
    setTags('');
    setShowTagsInput(false);
    setSendingText(true);
    try {
      const payload = {
        userId: 'user123',
        content: text,
        inputType: 'text',
        sender: 'user123',
        ...(tags.trim() && {
          tagNames: tags.split(',').map(t => t.trim()).filter(t => t),
          tagSource: 'Manual'
        })
      };
      const response = await fetch(TEXT_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }
      
      const result = await response.json();
      setMessages(prev =>
        prev.map(m =>
          m.id === id ? { ...m, status: 'sent', sentAt: Date.now() } : m
        )
      );
    } catch (err) {
      console.error(err);
    } finally {
      setSendingText(false);
    }
  };

  const startRecording = async () => {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
      const rec = new Audio.Recording();
      await rec.prepareToRecordAsync(Audio.RecordingOptionsPresets.HIGH_QUALITY);
      await rec.startAsync();
      setRecording(rec);
      setMicPressed(true);
      // No limpiar tags aquí - se limpiarán después de enviar exitosamente
    } catch (error) {
      console.error('Error al iniciar grabación:', error);
    }
  };

  const stopRecording = async () => {
    if (!recording) return;
    setMicPressed(false);
    try {
      await recording.stopAndUnloadAsync();
      const uri = recording.getURI();
      if (!uri) return;
      setSendingAudio(true);
      const placeholderId = Date.now().toString();
      audioPlaceholderId.current = placeholderId;
      setMessages(prev => [
        { id: placeholderId, text: '...', fromMe: true, status: 'sending' },
        ...prev,
      ]);
      setRecording(null);

      const uploadResp = await fetch(AUDIO_UPLOAD_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user123' })
      });
      
      if (!uploadResp.ok) {
        const errorText = await uploadResp.text();
        console.error('❌ Error al obtener URL:', errorText);
        throw new Error(`HTTP ${uploadResp.status}: ${errorText}`);
      }
      
      const { uploadUrl, s3Key } = await uploadResp.json();
      const base64 = await FileSystem.readAsStringAsync(uri, { encoding: FileSystem.EncodingType.Base64 });
      const buffer = Buffer.from(base64, 'base64');
      await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': 'audio/mpeg' },
        body: buffer,
      });
      const audioPayload = {
        userId: 'user123',
        s3Key,
        sender: 'user123',
        ...(tags.trim() && {
          tagNames: tags.split(',').map(t => t.trim()).filter(t => t),
          tagSource: 'Manual'
        })
      };
      const notifyResp = await fetch(AUDIO_NOTIFY_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(audioPayload),
      });
      
      if (!notifyResp.ok) {
        const errorText = await notifyResp.text();
        console.error('❌ Error en audio:', errorText);
        throw new Error(`HTTP ${notifyResp.status}: ${errorText}`);
      }
      
      const audioResult = await notifyResp.json();
      const { transcription } = audioResult;
      setMessages(prev =>
        prev.map(m =>
          m.id === placeholderId
            ? { ...m, text: transcription || 'Audio enviado', status: 'sent', sentAt: Date.now() }
            : m
        )
      );
      // Limpiar tags después de enviar exitosamente
      setTags('');
      setShowTagsInput(false);
    } catch (err) {
      console.error('Error al procesar audio:', err);
    } finally {
      setSendingAudio(false);
    }
  };

  const toggleTags = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowTagsInput(!showTagsInput);
  };

  const handleMicPressIn = (e: GestureResponderEvent) => {
    if (!text.trim()) startRecording();
  };
  const handleMicPressOut = (e: GestureResponderEvent) => {
    if (!text.trim()) stopRecording();
  };

  const renderItem: ListRenderItem<Message> = ({ item }) => (
    <Box sx={{ mb: '$2' }}>
      <HStack justifyContent={item.fromMe ? 'flex-end' : 'flex-start'}>
        <Box
          sx={{ px: '$3', py: '$2', bg: item.fromMe ? '$blue500' : '$gray700', borderRadius: '$md', maxWidth: '80%' }}
        >
          <Text sx={{ color: '$white' }}>{item.text}</Text>
        </Box>
      </HStack>
      {item.fromMe && item.status && (
        <HStack justifyContent={item.fromMe ? 'flex-end' : 'flex-start'} sx={{ mt: '$1' }}>
          <Text sx={{ color: '$gray400', fontSize: '$xs' }}>
            {item.status === 'sending'
              ? 'Enviando...'
              : `Enviado ${item.sentAt ? formatTime(item.sentAt) : ''}`}
          </Text>
        </HStack>
      )}
    </Box>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={0}
    >
      <Box style={{ paddingTop: insets.top }} sx={{ flex: 1, bg: theme.background, px: '$3', pb: '$2' }}>
        <Text sx={{ color: theme.text, fontSize: 24, fontWeight: 'bold', mb: 16, mt: 30 }}>
          Saphire Chat
        </Text>

        <FlatList<Message>
          ref={flatListRef}
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
        />

        <Pressable onPress={toggleTags} sx={{ mb: '$2' }}>
          <Text sx={{ color: theme.text, ml: '$2' }}>
            Etiquetas {showTagsInput ? '▲' : '▼'}
          </Text>
        </Pressable>
        {showTagsInput && (
          <Input sx={{
            bg: '$gray800',
            borderRadius: '$md',
            borderWidth: 1,
            borderColor: '$white',
            mb: '$3'
          }}>
            <InputField
              value={tags}
              onChangeText={setTags}
              placeholder="Añade etiquetas a tu mensaje... (ej: trabajo, urgente, reunión)"
              sx={{ color: '$white' }}
            />
          </Input>
        )}

        <HStack alignItems="center" sx={{ mt: '$2', gap: '$2' }}>
          <Input
            flex={1}
            sx={{ bg: inputBg, borderWidth: 1, borderColor: inputBorder, borderRadius: '$full', px: '$4', py: '$2' }}
          >
            <InputField
              value={text}
              onChangeText={setText}
              placeholder="Escribe tu mensaje..."
              sx={{ color: '$white' }}
            />
          </Input>

          <Pressable
            onPressIn={!text.trim() ? handleMicPressIn : undefined}
            onPressOut={!text.trim() ? handleMicPressOut : undefined}
            onPress={text.trim() ? handleSend : undefined}
            disabled={sendingText || sendingAudio}
            sx={{ bg: '$blue500', borderRadius: '$full', p: '$3', justifyContent: 'center', alignItems: 'center', transform: [{ scale: micPressed ? 1.25 : 1 }] }}
          >
            <Icon as={MaterialIcons} name={text.trim() ? 'send' : 'mic'} size="md" color="$white" />
          </Pressable>
        </HStack>
      </Box>
    </KeyboardAvoidingView>
  );
}
