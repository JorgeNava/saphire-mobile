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
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  GestureResponderEvent,
  LayoutAnimation,
  ListRenderItem,
  Platform,
  ScrollView,
  TextInput,
  useColorScheme,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { cacheService } from '../../services/cacheService';

interface Message {
  id: string;
  text: string;
  fromMe: boolean;
  status?: 'sending' | 'sent';
  sentAt?: number;
}

// Endpoints para mensajes (temporalmente hasta migrar a thoughts)
const API_BASE = 'https://zon9g6gx9k.execute-api.us-east-1.amazonaws.com';
const TEXT_ENDPOINT = `${API_BASE}/messages`;
const AUDIO_UPLOAD_ENDPOINT = `${API_BASE}/messages/upload-url`;
const AUDIO_NOTIFY_ENDPOINT = `${API_BASE}/messages/audio`;

// ConversationId del usuario
const CONVERSATION_ID = 'user123';

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
  const isDark = colorScheme === 'dark';
  
  const theme = {
    background: isDark ? '#0A0E27' : '#F5F7FA',
    card: isDark ? '#1A1F3A' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1F3A',
    border: isDark ? '#2A2F4A' : '#E5E7EB',
  };
  const inputBg = isDark ? '#1A1F3A' : '#FFFFFF';
  const inputBorder = isDark ? '#2A2F4A' : '#E5E7EB';

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
  
  // Estados para autocompletado de etiquetas
  const [availableTags, setAvailableTags] = useState<Array<{tagId: string; name: string}>>([]);
  const [filteredTags, setFilteredTags] = useState<Array<{tagId: string; name: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

  // Cargar mensajes iniciales
  useEffect(() => {
    loadMessages();
  }, []);

  const loadMessages = async () => {
    try {
      // Intentar obtener del caché primero
      const cachedMessages = await cacheService.getMessages();
      if (cachedMessages && cachedMessages.length > 0) {
        setMessages(cachedMessages);
        console.log('✅ Mensajes cargados desde caché');
        return;
      }

      // Si no hay caché, obtener del servidor
      // NUEVO: API ahora retorna objeto paginado con { items, count, hasMore, lastKey }
      const res = await fetch(`${TEXT_ENDPOINT}?conversationId=${CONVERSATION_ID}&limit=50&sortOrder=asc`);
      if (res.ok) {
        const data = await res.json();
        
        // CAMBIO: Ahora data.items en lugar de array directo
        const messagesArray = data.items || [];
        
        // Convertir al formato esperado
        const formattedMessages: Message[] = messagesArray.map((msg: any) => ({
          id: msg.messageId || msg.id || String(Date.now()),
          text: msg.content || msg.text || '',
          fromMe: msg.sender === 'user123', // Determinar si es del usuario
          status: 'sent' as const,
          sentAt: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()
        }));
        
        setMessages(formattedMessages);
        
        // Guardar en caché
        await cacheService.setMessages(formattedMessages);
        console.log('✅ Mensajes guardados en caché');
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      // Si hay error, mantener el mensaje de bienvenida
      setMessages([{ id: '1', text: 'Hola, Jorge 👋', fromMe: false }]);
    }
  };

  // Iniciar sincronización en background de mensajes
  useEffect(() => {
    cacheService.startMessagesSync(async () => {
      const res = await fetch(`${TEXT_ENDPOINT}?conversationId=${CONVERSATION_ID}&limit=50&sortOrder=asc`);
      const data = await res.json();
      
      // CAMBIO: Usar data.items en lugar de array directo
      const messagesArray = data.items || [];
      
      const formattedMessages: Message[] = messagesArray.map((msg: any) => ({
        id: msg.messageId || msg.id || String(Date.now()),
        text: msg.content || msg.text || '',
        fromMe: msg.sender === 'user123',
        status: 'sent' as const,
        sentAt: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now()
      }));
      
      setMessages(formattedMessages);
      return formattedMessages;
    });

    return () => {
      cacheService.stopBackgroundSync('cache_messages');
    };
  }, []);

  // Cargar etiquetas disponibles
  useEffect(() => {
    loadAvailableTags();
  }, []);

  const loadAvailableTags = async () => {
    try {
      // Intentar obtener del caché primero
      const cachedTags = await cacheService.getTags();
      if (cachedTags) {
        setAvailableTags(cachedTags);
        console.log('✅ Tags cargados desde caché');
        return;
      }

      // Si no hay caché, obtener del servidor
      const res = await fetch(`${API_BASE}/tags?userId=user123`);
      if (res.ok) {
        const tags = await res.json();
        setAvailableTags(tags);
        
        // Guardar en caché
        await cacheService.setTags(tags);
        console.log('✅ Tags guardados en caché');
      }
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  };

  // Iniciar sincronización en background de etiquetas
  useEffect(() => {
    cacheService.startTagsSync(async () => {
      const res = await fetch(`${API_BASE}/tags?userId=user123`);
      const tags = await res.json();
      setAvailableTags(tags); // Actualizar estado con datos frescos
      return tags;
    });

    // Limpiar al desmontar el componente
    return () => {
      cacheService.stopBackgroundSync('cache_tags');
    };
  }, []);

  // Filtrar etiquetas basado en el input
  React.useEffect(() => {
    if (!tags.trim() || !showTagsInput) {
      if (showSuggestions) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setShowSuggestions(false);
      return;
    }

    const currentInput = tags.split(',').pop()?.trim().toLowerCase() || '';
    
    if (currentInput.length > 0) {
      const filtered = availableTags.filter(tag => 
        tag.name.toLowerCase().includes(currentInput)
      );
      setFilteredTags(filtered);
      const shouldShow = filtered.length > 0;
      if (shouldShow !== showSuggestions) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setShowSuggestions(shouldShow);
    } else {
      if (showSuggestions) {
        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      }
      setShowSuggestions(false);
    }
  }, [tags, showTagsInput, availableTags]);

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
      
      // Invalidar caché de mensajes y recargar
      await cacheService.invalidateMessages();
      await loadMessages();
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

  const selectTag = (tagName: string) => {
    const currentTags = tags.split(',').map(t => t.trim()).filter(t => t);
    // Remover el último tag incompleto y agregar el seleccionado
    currentTags.pop();
    currentTags.push(tagName);
    setTags(currentTags.join(', ') + ', ');
    setShowSuggestions(false);
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

        {showTagsInput && (
          <Box sx={{ mb: '$3', bg: inputBg, borderRadius: '$lg', borderWidth: 1, borderColor: inputBorder, p: '$3' }}>
            <HStack alignItems="center" justifyContent="space-between" sx={{ mb: '$2' }}>
              <HStack alignItems="center" sx={{ gap: '$2' }}>
                <Icon as={MaterialIcons} name="label" size="sm" color="$white" />
                <Text sx={{ color: '$white', fontSize: '$sm', fontWeight: '600' }}>
                  Etiquetas
                </Text>
              </HStack>
              <Pressable onPress={toggleTags}>
                <Icon as={MaterialIcons} name="close" size="sm" color="$white" />
              </Pressable>
            </HStack>
            <Input sx={{
              bg: 'transparent',
              borderRadius: '$md',
              borderWidth: 1,
              borderColor: 'rgba(255,255,255,0.3)'
            }}>
              <InputField
                value={tags}
                onChangeText={setTags}
                placeholder="trabajo, urgente, reunión..."
                placeholderTextColor="rgba(255,255,255,0.5)"
                sx={{ color: '$white', fontSize: '$sm' }}
              />
            </Input>
            <Text sx={{ color: 'rgba(255,255,255,0.6)', fontSize: '$xs', mt: '$2' }}>
              Separa las etiquetas con comas
            </Text>
            {showSuggestions && (
              <Box sx={{ mt: '$3', pt: '$3', borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
                <Text sx={{ color: '$white', fontSize: '$xs', fontWeight: '600', mb: '$2' }}>
                  Sugerencias:
                </Text>
                <ScrollView 
                  style={{ maxHeight: 120 }}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="always"
                >
                  <HStack sx={{ flexWrap: 'wrap', gap: '$2', pb: '$1' }}>
                    {filteredTags.map(tag => (
                      <Pressable
                        key={tag.tagId}
                        onPress={() => selectTag(tag.name)}
                        sx={{
                          bg: '$blue500',
                          px: '$3',
                          py: '$1.5',
                          borderRadius: '$full',
                        }}
                      >
                        <Text sx={{ color: '$white', fontSize: '$xs' }}>{tag.name}</Text>
                      </Pressable>
                    ))}
                  </HStack>
                </ScrollView>
              </Box>
            )}
          </Box>
        )}
        <Pressable 
          onPress={toggleTags} 
          sx={{ 
            mb: '$2',
            flexDirection: 'row',
            alignItems: 'center',
            gap: '$2',
            bg: showTagsInput ? 'transparent' : inputBg,
            px: '$3',
            py: '$2',
            borderRadius: '$md',
            borderWidth: 1,
            borderColor: showTagsInput ? 'transparent' : inputBorder
          }}
        >
          <Icon as={MaterialIcons} name="label-outline" size="sm" color={showTagsInput ? theme.text : '$white'} />
          <Text sx={{ color: showTagsInput ? theme.text : '$white', fontSize: '$sm' }}>
            {showTagsInput ? 'Ocultar etiquetas' : 'Agregar etiquetas'}
          </Text>
        </Pressable>

        <HStack alignItems="flex-end" sx={{ mt: '$2', gap: '$2' }}>
          <Box
            flex={1}
            sx={{ 
              bg: inputBg, 
              borderWidth: 1, 
              borderColor: inputBorder, 
              borderRadius: '$lg', 
              px: '$4', 
              py: '$2',
              minHeight: '$10',
              maxHeight: 144
            }}
          >
            <TextInput
              value={text}
              onChangeText={setText}
              placeholder="Escribe tu mensaje..."
              placeholderTextColor="rgba(255,255,255,0.6)"
              style={{
                color: '#fff',
                fontSize: 16,
                maxHeight: 128,
                textAlignVertical: 'top'
              }}
              multiline
            />
          </Box>

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
