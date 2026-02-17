// ChatScreen.tsx
import { Ionicons } from '@expo/vector-icons';
import {
  Box,
  HStack,
  KeyboardAvoidingView,
  Pressable,
  Text
} from '@gluestack-ui/themed';
import { Buffer } from 'buffer';
import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';
import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Clipboard,
  FlatList,
  GestureResponderEvent,
  LayoutAnimation,
  ListRenderItem,
  Platform,
  RefreshControl,
  ScrollView,
  TextInput,
  TouchableOpacity,
  useColorScheme,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { cacheService } from '../../services/cacheService';
import { networkService } from '../../services/networkService';
import { offlineQueue } from '../../services/offlineQueue';
import { logger } from '../../utils/logger';

// @ts-ignore - no type declarations available
const Markdown = require('react-native-markdown-display').default;

interface Message {
  id: string;
  text: string;
  fromMe: boolean;
  status?: 'sending' | 'sent' | 'failed';
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

const getDayLabel = (timestamp: number) => {
  const d = new Date(timestamp);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const msgDay = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diffDays = Math.floor((today.getTime() - msgDay.getTime()) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Hoy';
  if (diffDays === 1) return 'Ayer';
  return d.toLocaleDateString('es-MX', { day: '2-digit', month: '2-digit', year: 'numeric' });
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

  const markdownStyles = {
    body: { color: theme.text, fontSize: 15, lineHeight: 22 },
    heading1: { color: theme.text, fontSize: 20, fontWeight: '700' as const, marginBottom: 4 },
    heading2: { color: theme.text, fontSize: 18, fontWeight: '700' as const, marginBottom: 4 },
    heading3: { color: theme.text, fontSize: 16, fontWeight: '600' as const, marginBottom: 2 },
    strong: { fontWeight: '700' as const },
    em: { fontStyle: 'italic' as const },
    bullet_list: { marginVertical: 4 },
    ordered_list: { marginVertical: 4 },
    list_item: { marginVertical: 1 },
    paragraph: { marginTop: 0, marginBottom: 6 },
    link: { color: '#60A5FA' },
    blockquote: { 
      backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.04)',
      borderLeftColor: '#60A5FA',
      borderLeftWidth: 3,
      paddingLeft: 8,
      paddingVertical: 4,
      marginVertical: 4,
    },
    code_inline: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(0,0,0,0.06)',
      color: '#F472B6',
      fontSize: 13,
      paddingHorizontal: 4,
      borderRadius: 3,
    },
    fence: {
      backgroundColor: isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.04)',
      borderRadius: 8,
      padding: 8,
      marginVertical: 4,
    },
    code_block: {
      color: theme.text,
      fontSize: 13,
    },
  };

  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hola, Jorge 👋', fromMe: false },
  ]);
  const [text, setText] = useState('');
  const [tags, setTags] = useState('');
  const [selectedTagNames, setSelectedTagNames] = useState<string[]>([]);
  const [showTagsInput, setShowTagsInput] = useState(false);
  const [tagSearch, setTagSearch] = useState('');
  const [sendingText, setSendingText] = useState(false);
  const [sendingAudio, setSendingAudio] = useState(false);
  const [recording, setRecording] = useState<Audio.Recording | null>(null);
  const [micPressed, setMicPressed] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [selectedMessage, setSelectedMessage] = useState<string | null>(null);
  const [showMessageMenu, setShowMessageMenu] = useState(false);
  const [menuPosition, setMenuPosition] = useState<{x: number, y: number} | null>(null);
  const [showDeleteModal, setShowDeleteModal] = useState(false);
  const audioPlaceholderId = useRef<string | null>(null);
  const flatListRef = useRef<FlatList<Message>>(null);
  const messageRefs = useRef<{[key: string]: any}>({});
  
  // Estados para etiquetas (manejadas por TagSelector)
  const [availableTags, setAvailableTags] = useState<Array<{tagId: string; name: string}>>([]);

  // Cargar mensajes y etiquetas iniciales
  useEffect(() => {
    loadMessages();
    loadTags();
  }, []);

  const loadTags = async () => {
    try {
      const cachedTags = await cacheService.getTags();
      if (cachedTags && cachedTags.length > 0) {
        setAvailableTags(cachedTags);
      }
      if (!networkService.isConnected) return;
      const res = await fetch(`${API_BASE}/tags?userId=user123&limit=1000`);
      if (res.ok) {
        const data = await res.json();
        const tagsArray = Array.isArray(data) ? data : (data.items || []);
        setAvailableTags(tagsArray);
        await cacheService.setTags(tagsArray);
        logger.log('✅ Tags cargados:', tagsArray.length);
      }
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  };

  const loadMessages = async () => {
    try {
      // Mostrar caché mientras cargamos del servidor (optimistic UI)
      const cachedMessages = await cacheService.getMessages();
      if (cachedMessages && cachedMessages.length > 0) {
        setMessages(cachedMessages);
        logger.log('✅ Mensajes cargados desde caché (temporal)');
      }

      // Sin internet: usar solo caché
      if (!networkService.isConnected) return;

      const res = await fetch(`${TEXT_ENDPOINT}?conversationId=${CONVERSATION_ID}&limit=100&sortOrder=desc`);
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
        
        // Actualizar estado con mensajes del servidor
        setMessages(formattedMessages);
        
        // Guardar en caché
        await cacheService.setMessages(formattedMessages);
        logger.log(`✅ ${formattedMessages.length} mensajes cargados desde servidor`);
      }
    } catch (err) {
      console.error('Error loading messages:', err);
      // Si hay error y no hay caché, mostrar mensaje de bienvenida
      const cachedMessages = await cacheService.getMessages();
      if (!cachedMessages || cachedMessages.length === 0) {
        setMessages([{ id: '1', text: 'Hola, Jorge 👋', fromMe: false }]);
      }
    }
  };

  // Iniciar sincronización en background de mensajes
  useEffect(() => {
    cacheService.startMessagesSync(async () => {
      // sortOrder=desc para traer los más recientes primero
      const res = await fetch(`${TEXT_ENDPOINT}?conversationId=${CONVERSATION_ID}&limit=100&sortOrder=desc`);
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
      
      // Solo actualizar si los datos cambiaron
      setMessages(prev => {
        const prevIds = prev.map(m => m.id).join(',');
        const newIds = formattedMessages.map(m => m.id).join(',');
        return prevIds === newIds ? prev : formattedMessages;
      });
      if (__DEV__) logger.log(`🔄 Sincronización: ${formattedMessages.length} mensajes`);
      return formattedMessages;
    });

    return () => {
      cacheService.stopBackgroundSync('cache_messages');
    };
  }, []);

  // Cargar etiquetas desde caché
  useEffect(() => {
    loadCachedTags();
  }, []);

  const loadCachedTags = async () => {
    try {
      const cachedTags = await cacheService.getTags();
      if (cachedTags && Array.isArray(cachedTags)) {
        setAvailableTags(cachedTags);
        logger.log('✅ Tags cargados desde caché:', cachedTags.length);
      }
    } catch (err) {
      console.error('❌ Error loading cached tags:', err);
    }
  };

  // Callback cuando TagSelector carga las etiquetas
  const handleTagsLoaded = async (loadedTags: Array<{tagId: string; name: string}>) => {
    setAvailableTags(loadedTags);
    await cacheService.setTags(loadedTags);
    logger.log('✅ Tags cargados y guardados en caché:', loadedTags.length);
  };

  // Iniciar sincronización en background de etiquetas
  useEffect(() => {
    cacheService.startTagsSync(async () => {
      const res = await fetch(`${API_BASE}/tags?userId=user123`);
      const data = await res.json();
      const tagsArray = Array.isArray(data) ? data : (data.items || []);
      setAvailableTags(tagsArray);
      return tagsArray;
    });

    return () => {
      cacheService.stopBackgroundSync('cache_tags');
    };
  }, []);

  // Toggle de visibilidad del selector de etiquetas
  const toggleTags = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowTagsInput(!showTagsInput);
    if (showTagsInput) setTagSearch('');
  };

  const toggleTagSelection = (tagName: string) => {
    setSelectedTagNames(prev => {
      const next = prev.includes(tagName)
        ? prev.filter(t => t !== tagName)
        : [...prev, tagName];
      setTags(next.join(', '));
      return next;
    });
  };

  const removeTag = (tagName: string) => {
    setSelectedTagNames(prev => {
      const next = prev.filter(t => t !== tagName);
      setTags(next.join(', '));
      return next;
    });
  };

  const filteredAvailableTags = useMemo(() =>
    availableTags.filter(t =>
      t.name.toLowerCase().includes(tagSearch.toLowerCase())
    ), [availableTags, tagSearch]);

  const pollForIAResponse = (previousCount: number) => {
    let attempts = 0;
    const maxAttempts = 6;
    const intervalMs = 3000;

    const poll = setInterval(async () => {
      attempts++;
      try {
        const res = await fetch(`${TEXT_ENDPOINT}?conversationId=${CONVERSATION_ID}&limit=100&sortOrder=desc`);
        if (res.ok) {
          const data = await res.json();
          const messagesArray = data.items || [];
          if (messagesArray.length > previousCount) {
            const formattedMessages: Message[] = messagesArray.map((msg: any) => ({
              id: msg.messageId || msg.id || String(Date.now()),
              text: msg.content || msg.text || '',
              fromMe: msg.sender === 'user123',
              status: 'sent' as const,
              sentAt: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(),
            }));
            setMessages(formattedMessages);
            await cacheService.setMessages(formattedMessages);
            clearInterval(poll);
            return;
          }
        }
      } catch (err) {
        logger.log('Poll error:', err);
      }
      if (attempts >= maxAttempts) clearInterval(poll);
    }, intervalMs);
  };

  // Pull-to-refresh para buscar nuevos mensajes
  const onRefresh = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`${TEXT_ENDPOINT}?conversationId=${CONVERSATION_ID}&limit=100&sortOrder=desc`);
      if (res.ok) {
        const data = await res.json();
        const messagesArray = data.items || [];
        const formattedMessages: Message[] = messagesArray.map((msg: any) => ({
          id: msg.messageId || msg.id || String(Date.now()),
          text: msg.content || msg.text || '',
          fromMe: msg.sender === 'user123',
          status: 'sent' as const,
          sentAt: msg.timestamp ? new Date(msg.timestamp).getTime() : Date.now(),
        }));
        setMessages(formattedMessages);
        await cacheService.setMessages(formattedMessages);
        logger.log(`✅ Refresh: ${formattedMessages.length} mensajes actualizados`);
      }
    } catch (err) {
      console.error('Error refreshing messages:', err);
    } finally {
      setRefreshing(false);
    }
  }, []);

  // Funciones para menú contextual de mensajes
  const handleMessagePressIn = (messageId: string) => {
    setSelectedMessage(messageId);
    setShowMessageMenu(true);
    
    // Obtener posición real del mensaje inmediatamente
    const messageRef = messageRefs.current[messageId];
    if (messageRef) {
      try {
        messageRef.measure((x: number, y: number, width: number, height: number, pageX: number, pageY: number) => {
          // Posicionar menú arriba del mensaje
          // Si es el último mensaje (index 0), subir más
          const messageIndex = messages.findIndex(m => m.id === messageId);
          const extraOffset = messageIndex === 0 ? 30 : 10; // Más espacio si es el último
          const menuY = Math.max((pageY || 0) - extraOffset, 80);
          const menuX = 40; // 40px desde la derecha
          setMenuPosition({ x: menuX, y: menuY });
        });
      } catch (error) {
        console.log('Error measuring message:', error);
        // Fallback a posición calculada
        setMenuPosition({ x: 40, y: 200 });
      }
    }
  };

  const handleMessagePressOut = () => {
    // NO cancelar el timer - el menú debe aparecer aunque se suelte
  };

  const handleCopyMessage = () => {
    if (selectedMessage) {
      const message = messages.find(m => m.id === selectedMessage);
      if (message) {
        Clipboard.setString(message.text);
      }
    }
    setShowMessageMenu(false);
    setSelectedMessage(null);
  };

  
  const handleDeleteMessage = async () => {
    if (!selectedMessage) return;
    
    // Obtener el mensaje seleccionado
    const message = messages.find(m => m.id === selectedMessage);
    if (!message) {
      return;
    }
    
    // Mostrar modal personalizado
    setShowDeleteModal(true);
  };

  const handleConfirmDelete = async () => {
    if (!selectedMessage) return;
    
    try {
      // Eliminar del backend primero
      const deleteEndpoint = `${API_BASE}/messages/${selectedMessage}`;
      const response = await fetch(deleteEndpoint, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
      });
      
      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Error eliminando mensaje:', errorText);
        Alert.alert('❌ Error', 'No se pudo eliminar el mensaje. Intenta de nuevo.');
        return;
      }
      
      // Si el backend eliminó correctamente, actualizar UI local
      setMessages(prev => prev.filter(m => m.id !== selectedMessage));
      
      // Invalidar caché para mantener sincronización
      await cacheService.invalidateMessages();
      
      // Cerrar menú y modal
      setShowMessageMenu(false);
      setShowDeleteModal(false);
      setSelectedMessage(null);
      
      console.log('✅ Mensaje eliminado exitosamente');
    } catch (error) {
      console.error('Error al eliminar mensaje:', error);
      Alert.alert('❌ Error', 'No se pudo eliminar el mensaje. Intenta de nuevo.');
    }
  };

  const handleCancelDelete = () => {
    setShowDeleteModal(false);
  };

  const handleShareMessage = () => {
    if (selectedMessage) {
      const message = messages.find(m => m.id === selectedMessage);
      if (message) {
        // Aquí podrías implementar compartir
        Alert.alert('Compartir', 'Función de compartir próximamente');
      }
    }
    setShowMessageMenu(false);
    setSelectedMessage(null);
  };

  const closeMessageMenu = () => {
    setShowMessageMenu(false);
    setSelectedMessage(null);
    setMenuPosition(null);
  };

  const handleSend = async () => {
    if (!text.trim()) return;
    const id = Date.now().toString();
    
    // Guardar tags antes de limpiar el estado
    const currentTags = tags.trim();
    const tagArray = currentTags ? currentTags.split(',').map(t => t.trim()).filter(t => t) : [];
    
    logger.log('📤 Enviando mensaje:', {
      content: text,
      tags: currentTags,
      tagArray: tagArray
    });
    
    setMessages(prev => [
      { id, text, fromMe: true, status: 'sending' },
      ...prev,
    ]);
    setText('');
    setTags('');
    setSelectedTagNames([]);
    setShowTagsInput(false);
    setSendingText(true);
    try {
      const payload = {
        userId: 'user123',
        content: text,
        inputType: 'text',
        sender: 'user123',
        ...(tagArray.length > 0 && {
          tagNames: tagArray,
          tagSource: 'Manual'
        })
      };
      
      logger.log('📦 Payload completo:', payload);

      // Si no hay internet, encolar y mostrar como enviado localmente
      if (!networkService.isConnected) {
        await offlineQueue.enqueue({
          url: TEXT_ENDPOINT,
          method: 'POST',
          body: payload,
          headers: { 'Content-Type': 'application/json' },
          description: `Enviar mensaje: "${text.substring(0, 30)}..."`,
        });
        setMessages(prev =>
          prev.map(m => m.id === id ? { ...m, status: 'sent' as const, sentAt: Date.now() } : m)
        );
        setSendingText(false);
        return;
      }
      
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
      
      // Actualizar el mensaje con el ID real del servidor si lo retorna
      const serverMessageId = result.messageId || result.id;
      
      setMessages(prev =>
        prev.map(m =>
          m.id === id ? { 
            ...m, 
            id: serverMessageId || id, // Usar ID del servidor si existe
            status: 'sent', 
            sentAt: Date.now() 
          } : m
        )
      );
      
      // Invalidar caché para que la próxima carga traiga datos frescos
      await cacheService.invalidateMessages();
      
      // Polling corto para captar la respuesta de IA (async, sin bloquear UI)
      pollForIAResponse(messages.length + 1);
    } catch (err) {
      console.error(err);
      // Marcar mensaje como fallido
      setMessages(prev =>
        prev.map(m =>
          m.id === id ? { ...m, status: 'failed' as const } : m
        )
      );
      Alert.alert('Error', 'No se pudo enviar el mensaje. Intenta de nuevo.');
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
      setSelectedTagNames([]);
      setShowTagsInput(false);
      
      // Polling corto para captar la respuesta de IA
      await cacheService.invalidateMessages();
      pollForIAResponse(messages.length + 1);
    } catch (err) {
      console.error('Error al procesar audio:', err);
    } finally {
      setSendingAudio(false);
    }
  };


  const handleMicPressIn = (e: GestureResponderEvent) => {
    if (!text.trim()) startRecording();
  };
  const handleMicPressOut = (e: GestureResponderEvent) => {
    if (!text.trim()) stopRecording();
  };

  const renderItem: ListRenderItem<Message> = useCallback(({ item, index }) => {
    // Day separator logic (FlatList is inverted, so index 0 = newest)
    const currentDay = item.sentAt ? getDayLabel(item.sentAt) : null;
    const nextItem = messages[index + 1]; // older message (inverted)
    const nextDay = nextItem?.sentAt ? getDayLabel(nextItem.sentAt) : null;
    const showDaySeparator = currentDay && currentDay !== nextDay;

    return (
      <View style={{ paddingHorizontal: 4 }}>
        {/* Day separator (rendered above this message in visual order since list is inverted) */}
        {showDaySeparator && (
          <View style={{ alignItems: 'center', marginVertical: 12 }}>
            <View style={{
              backgroundColor: isDark ? '#2A2F4A' : '#E5E7EB',
              borderRadius: 12,
              paddingHorizontal: 14,
              paddingVertical: 5,
            }}>
              <Text sx={{ color: '$white', fontSize: 12, fontWeight: '600' }}>
                {currentDay}
              </Text>
            </View>
          </View>
        )}

        <HStack 
          justifyContent={item.fromMe ? 'flex-end' : 'flex-start'}
          alignItems="flex-end"
          sx={{ gap: '$2', mb: '$2' }}
        >
          {/* Avatar para mensajes de Saphira */}
          {!item.fromMe && (
            <Box 
              sx={{ 
                width: 32, 
                height: 32, 
                borderRadius: '$full', 
                bg: '$purple500',
                justifyContent: 'center',
                alignItems: 'center',
                mb: '$1'
              }}
            >
              <Text sx={{ color: '$white', fontSize: '$sm', fontWeight: 'bold' }}>S</Text>
            </Box>
          )}

          {/* Burbuja del mensaje con hora inline */}
          <Pressable
            onPressIn={() => handleMessagePressIn(item.id)}
            onPressOut={handleMessagePressOut}
            style={{ maxWidth: '75%' }}
          >
            <Box
              ref={(ref) => { messageRefs.current[item.id] = ref; }}
              sx={{ 
                px: '$3', 
                pt: '$2.5', 
                pb: '$1.5', 
                bg: item.fromMe ? '$blue600' : theme.card,
                borderRadius: '$2xl',
                shadowColor: '$black',
                shadowOffset: { width: 0, height: 1 },
                shadowOpacity: 0.1,
                shadowRadius: 2,
                elevation: 2,
                ...(item.fromMe ? {
                  borderBottomRightRadius: '$sm'
                } : {
                  borderBottomLeftRadius: '$sm',
                  borderWidth: 1,
                  borderColor: theme.border
                })
              }}
            >
            {item.fromMe ? (
              <Text sx={{ 
                color: '$white',
                fontSize: '$md',
                lineHeight: 20
              }}>
                {item.text}
              </Text>
            ) : (
              <Markdown style={markdownStyles}>
                {item.text}
              </Markdown>
            )}
            {/* Hora inline abajo a la derecha */}
            <HStack justifyContent="flex-end" sx={{ mt: '$1', gap: '$1' }}>
              {item.fromMe && item.status === 'sending' && (
                <Text sx={{ color: 'rgba(255,255,255,0.5)', fontSize: 10 }}>🕒</Text>
              )}
              {item.fromMe && item.status === 'failed' && (
                <Text sx={{ color: '$red300', fontSize: 10 }}>❌</Text>
              )}
              {item.sentAt && (
                <Text sx={{ 
                  color: item.fromMe ? 'rgba(255,255,255,0.55)' : 'rgba(255,255,255,0.55)',
                  fontSize: 10,
                }}>
                  {formatTime(item.sentAt)}
                </Text>
              )}
              {item.fromMe && item.status === 'sent' && (
                <Text sx={{ color: 'rgba(255,255,255,0.55)', fontSize: 10 }}>✓</Text>
              )}
            </HStack>
          </Box>
          </Pressable>

          {/* Avatar para mensajes del usuario */}
          {item.fromMe && (
            <Box 
              sx={{ 
                width: 32, 
                height: 32, 
                borderRadius: '$full', 
                bg: '$blue500',
                justifyContent: 'center',
                alignItems: 'center',
                mb: '$1'
              }}
            >
              <Text sx={{ color: '$white', fontSize: '$sm', fontWeight: 'bold' }}>J</Text>
            </Box>
          )}
        </HStack>
      </View>
    );
  }, [messages, isDark, theme]);

  return (
    <KeyboardAvoidingView
      behavior="padding"
      style={{ flex: 1 }}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
    >
      <Box style={{ paddingTop: insets.top }} sx={{ flex: 1, bg: theme.background }}>
        {/* Header mejorado */}
        <Box sx={{ 
          px: '$4', 
          py: '$3',
          borderBottomWidth: 1,
          borderBottomColor: theme.border,
          bg: theme.card,
          shadowColor: '$black',
          shadowOffset: { width: 0, height: 2 },
          shadowOpacity: 0.05,
          shadowRadius: 3,
          elevation: 3
        }}>
          <HStack alignItems="center" sx={{ gap: '$3', mt: '$6' }}>
            <Box 
              sx={{ 
                width: 40, 
                height: 40, 
                borderRadius: '$full', 
                bg: '$purple500',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Text sx={{ color: '$white', fontSize: '$lg', fontWeight: 'bold' }}>S</Text>
            </Box>
            <Box flex={1}>
              <Text sx={{ color: theme.text, fontSize: '$xl', fontWeight: 'bold' }}>
                Saphira
              </Text>
              <Text sx={{ color: '$white', fontSize: '$xs' }}>
                Tu asistente inteligente
              </Text>
            </Box>
          </HStack>
        </Box>

        {/* Lista de mensajes */}
        <FlatList<Message>
          ref={flatListRef}
          data={messages}
          inverted
          keyExtractor={(item) => item.id}
          renderItem={renderItem}
          contentContainerStyle={{ 
            paddingHorizontal: 12,
            paddingTop: 16,
            paddingBottom: 8
          }}
          showsVerticalScrollIndicator={false}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor={isDark ? '#60A5FA' : '#3B82F6'}
              colors={[isDark ? '#60A5FA' : '#3B82F6']}
              progressBackgroundColor={isDark ? '#1F2937' : '#F3F4F6'}
            />
          }
        />

        {/* Sección de input */}
        <Box sx={{ px: '$3', pb: '$2', bg: theme.card, borderTopWidth: 1, borderTopColor: theme.border }}>

          {/* Selected tags chips */}
          {selectedTagNames.length > 0 && (
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={{ marginTop: 8, marginBottom: 4 }}
              contentContainerStyle={{ gap: 6, paddingHorizontal: 2 }}
            >
              {selectedTagNames.map((tag) => (
                <TouchableOpacity
                  key={tag}
                  onPress={() => removeTag(tag)}
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    backgroundColor: '#3b82f6',
                    borderRadius: 14,
                    paddingHorizontal: 10,
                    paddingVertical: 4,
                    gap: 4,
                  }}
                >
                  <Text style={{ color: '#fff', fontSize: 12, fontWeight: '600' }}>{tag}</Text>
                  <Ionicons name="close-circle" size={14} color="rgba(255,255,255,0.7)" />
                </TouchableOpacity>
              ))}
            </ScrollView>
          )}

          {/* Tag panel */}
          {showTagsInput && (
            <View style={{ marginTop: 8, marginBottom: 4 }}>
              <View style={{
                flexDirection: 'row',
                alignItems: 'center',
                backgroundColor: isDark ? '#1E293B' : '#F1F5F9',
                borderRadius: 10,
                paddingHorizontal: 10,
                marginBottom: 8,
              }}>
                <Ionicons name="search" size={16} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
                <TextInput
                  value={tagSearch}
                  onChangeText={setTagSearch}
                  placeholder="Buscar etiqueta..."
                  placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                  style={{
                    flex: 1,
                    color: theme.text,
                    fontSize: 13,
                    paddingVertical: 8,
                    paddingHorizontal: 8,
                  }}
                />
                {tagSearch.length > 0 && (
                  <TouchableOpacity onPress={() => setTagSearch('')}>
                    <Ionicons name="close-circle" size={16} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
                  </TouchableOpacity>
                )}
              </View>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={{ gap: 6, paddingHorizontal: 2, paddingBottom: 4 }}
                keyboardShouldPersistTaps="handled"
              >
                {filteredAvailableTags.slice(0, 30).map((tag) => {
                  const isSelected = selectedTagNames.includes(tag.name);
                  return (
                    <TouchableOpacity
                      key={tag.tagId}
                      onPress={() => toggleTagSelection(tag.name)}
                      style={{
                        backgroundColor: isSelected ? '#3b82f6' : (isDark ? '#2A2F4A' : '#E5E7EB'),
                        borderRadius: 14,
                        paddingHorizontal: 12,
                        paddingVertical: 5,
                        borderWidth: isSelected ? 0 : 1,
                        borderColor: isDark ? '#3A3F5A' : '#D1D5DB',
                      }}
                    >
                      <Text style={{
                        color: isSelected ? '#fff' : (isDark ? '#E5E7EB' : '#374151'),
                        fontSize: 12,
                        fontWeight: isSelected ? '600' : '400',
                      }}>
                        {tag.name}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </ScrollView>
            </View>
          )}

          <HStack alignItems="flex-end" sx={{ mt: '$2', gap: '$2' }}>
            {/* Tag toggle button */}
            <Pressable
              onPress={toggleTags}
              sx={{
                width: 40,
                height: 40,
                borderRadius: '$full',
                justifyContent: 'center',
                alignItems: 'center',
                bg: showTagsInput ? '$blue600' : (isDark ? '#1E293B' : '#F1F5F9'),
                borderWidth: showTagsInput ? 0 : 1,
                borderColor: theme.border,
              }}
            >
              <MaterialIcons name="label" size={20} color={showTagsInput ? '#FFFFFF' : theme.text} />
              {selectedTagNames.length > 0 && (
                <View style={{
                  position: 'absolute',
                  top: -2,
                  right: -2,
                  backgroundColor: '#ef4444',
                  borderRadius: 8,
                  width: 16,
                  height: 16,
                  justifyContent: 'center',
                  alignItems: 'center',
                }}>
                  <Text style={{ color: '#fff', fontSize: 9, fontWeight: '700' }}>{selectedTagNames.length}</Text>
                </View>
              )}
            </Pressable>

            <Box
              flex={1}
              sx={{ 
                bg: isDark ? '#1E293B' : '#F1F5F9',
                borderWidth: 1, 
                borderColor: theme.border, 
                borderRadius: '$2xl', 
                px: '$4', 
                py: '$3',
                minHeight: '$12',
                maxHeight: 144
              }}
            >
              <TextInput
                value={text}
                onChangeText={setText}
                placeholder="Escribe tu mensaje..."
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                style={{
                  color: theme.text,
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
              sx={{ 
                bg: text.trim() ? '$blue600' : '$purple500',
                borderRadius: '$full', 
                width: 48,
                height: 48,
                justifyContent: 'center', 
                alignItems: 'center',
                shadowColor: '$black',
                shadowOffset: { width: 0, height: 2 },
                shadowOpacity: 0.2,
                shadowRadius: 4,
                elevation: 4,
                transform: [{ scale: micPressed ? 1.15 : 1 }]
              }}
            >
              <MaterialIcons name={text.trim() ? 'send' : 'mic'} size={22} color="#FFFFFF" />
            </Pressable>
          </HStack>
        </Box>
      </Box>

      {/* Menú contextual estilo Gemini - UI Original */}
      {showMessageMenu && menuPosition && (
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.3)',
          }}
          onPress={closeMessageMenu}
        >
          <Pressable
            style={{
              position: 'absolute',
              top: menuPosition.y,
              left: menuPosition.x,
              backgroundColor: isDark ? '#2A2F4A' : '#FFFFFF',
              borderRadius: 12,
              padding: 8,
              minWidth: 200,
              maxWidth: 280,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 4 },
              shadowOpacity: 0.15,
              shadowRadius: 12,
              elevation: 8,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header del menú */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              paddingHorizontal: 12,
              paddingVertical: 8,
              borderBottomWidth: 1,
              borderBottomColor: isDark ? '#3A3F5A' : '#E5E7EB',
            }}>
              <Ionicons name="ellipsis-horizontal" size={20} color={isDark ? '#E5E7EB' : '#374151'} />
              <Text style={{
                color: isDark ? '#E5E7EB' : '#374151',
                fontSize: 14,
                fontWeight: '600',
                marginLeft: 8,
              }}>
                Opciones
              </Text>
            </View>

            {/* Opciones del menú */}
            <View>
              {/* Copiar */}
              <TouchableOpacity
                style={{
                  flexDirection: 'row',
                  alignItems: 'center',
                  paddingHorizontal: 12,
                  paddingVertical: 12,
                }}
                onPress={handleCopyMessage}
              >
                <Ionicons name="copy-outline" size={20} color={isDark ? '#E5E7EB' : '#374151'} />
                <Text style={{
                  color: isDark ? '#E5E7EB' : '#374151',
                  fontSize: 15,
                  marginLeft: 12,
                }}>
                  Copiar
                </Text>
              </TouchableOpacity>

              {/* Eliminar (todos los mensajes) */}
              {selectedMessage && (
                <TouchableOpacity
                  style={{
                    flexDirection: 'row',
                    alignItems: 'center',
                    paddingHorizontal: 12,
                    paddingVertical: 12,
                  }}
                  onPress={handleDeleteMessage}
                >
                  <Ionicons name="trash-outline" size={20} color="#EF4444" />
                  <Text style={{
                    color: '#EF4444',
                    fontSize: 15,
                    marginLeft: 12,
                  }}>
                    Eliminar
                  </Text>
                </TouchableOpacity>
              )}
            </View>
          </Pressable>
        </Pressable>
      )}

      {/* Modal personalizado para eliminar mensaje */}
      {showDeleteModal && (
        <Pressable
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            backgroundColor: 'rgba(0,0,0,0.5)',
            justifyContent: 'center',
            alignItems: 'center',
          }}
          onPress={handleCancelDelete}
        >
          <Pressable
            style={{
              backgroundColor: isDark ? '#2A2F4A' : '#FFFFFF',
              borderRadius: 16,
              padding: 24,
              margin: 20,
              minWidth: 300,
              maxWidth: 400,
              shadowColor: '#000',
              shadowOffset: { width: 0, height: 8 },
              shadowOpacity: 0.25,
              shadowRadius: 16,
              elevation: 12,
            }}
            onPress={(e) => e.stopPropagation()}
          >
            {/* Header */}
            <View style={{
              flexDirection: 'row',
              alignItems: 'center',
              marginBottom: 16,
            }}>
              <Text style={{
                fontSize: 24,
                marginRight: 8,
              }}>
                🗑️
              </Text>
              <Text style={{
                fontSize: 18,
                fontWeight: '600',
                color: isDark ? '#FFFFFF' : '#1F2937',
              }}>
                Eliminar mensaje
              </Text>
            </View>

            {/* Mensaje */}
            <Text style={{
              fontSize: 15,
              lineHeight: 22,
              color: isDark ? '#E5E7EB' : '#4B5563',
              marginBottom: 24,
              textAlign: 'center',
            }}>
              ¿Estás seguro de que quieres eliminar este mensaje?
              {'\n\n'}
              Esta acción no se puede deshacer y el mensaje se eliminará permanentemente.
            </Text>

            {/* Botones */}
            <View style={{
              flexDirection: 'row',
              gap: 12,
            }}>
              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  borderWidth: 1,
                  borderColor: isDark ? '#4B5563' : '#D1D5DB',
                  backgroundColor: 'transparent',
                }}
                onPress={handleCancelDelete}
              >
                <Text style={{
                  fontSize: 15,
                  fontWeight: '500',
                  color: isDark ? '#E5E7EB' : '#374151',
                  textAlign: 'center',
                }}>
                  Cancelar
                </Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={{
                  flex: 1,
                  paddingVertical: 12,
                  paddingHorizontal: 20,
                  borderRadius: 8,
                  backgroundColor: '#EF4444',
                }}
                onPress={handleConfirmDelete}
              >
                <Text style={{
                  fontSize: 15,
                  fontWeight: '500',
                  color: '#FFFFFF',
                  textAlign: 'center',
                }}>
                  Eliminar
                </Text>
              </TouchableOpacity>
            </View>
          </Pressable>
        </Pressable>
      )}
    </KeyboardAvoidingView>
  );
}
