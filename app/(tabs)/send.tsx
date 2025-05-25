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
import React, { useRef, useState } from 'react';
import { FlatList, ListRenderItem, Platform } from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface Message {
  id: string;
  text: string;
  fromMe: boolean;
}

export default function ChatScreen() {
  const [messages, setMessages] = useState<Message[]>([
    { id: '1', text: 'Hola, Jorge 👋', fromMe: false },
    { id: '2', text: '¡Hola! ¿Todo bien?', fromMe: true },
  ]);
  const [text, setText] = useState('');
  const flatListRef = useRef<FlatList<Message>>(null);

  const handleSend = () => {
    if (!text.trim()) return;
    setMessages(prev => [
      { id: Date.now().toString(), text, fromMe: true },
      ...prev,
    ]);
    setText('');
  };

  const renderItem: ListRenderItem<Message> = ({ item }) => (
    <HStack
      justifyContent={item.fromMe ? 'flex-end' : 'flex-start'}
      sx={{ mb: '$1' }}
    >
      <Box
        sx={{
          px: '$3',
          py: '$2',
          bg: item.fromMe ? '$blue500' : '$gray700',
          borderRadius: '$md',
          maxWidth: '80%',
        }}
      >
        <Text sx={{ color: '$white' }}>{item.text}</Text>
      </Box>
    </HStack>
  );

  return (
    <KeyboardAvoidingView
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      style={{ flex: 1 }}
      keyboardVerticalOffset={0}
    >
      <Box sx={{ flex: 1, bg: '$black', px: '$3', pb: '$2' }}>
        <FlatList<Message>
          ref={flatListRef}
          data={messages}
          inverted
          keyExtractor={item => item.id}
          renderItem={renderItem}
        />

        <HStack alignItems="center" sx={{ mt: '$2', gap: '$2' }}>
          <Input
            flex={1}
            sx={{
              bg: '$gray800',
              borderRadius: '$full',
              px: '$4',
              py: '$2',
            }}
          >
            <InputField
              value={text}
              onChangeText={setText}
              placeholder="Escribe tu mensaje..."
              sx={{ color: '$white' }}
            />
          </Input>

          <Pressable
            onPress={handleSend}
            sx={{
              bg: '$blue500',
              borderRadius: '$full',
              p: '$3',
              justifyContent: 'center',
              alignItems: 'center',
            }}
          >
            <Icon
              as={MaterialIcons}
              name={text.trim() ? 'send' : 'mic'}
              size="md"
              color="$white"
            />
          </Pressable>
        </HStack>
      </Box>
    </KeyboardAvoidingView>
  );
}
