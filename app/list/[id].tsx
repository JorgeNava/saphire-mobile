// app/list/[id].tsx
import {
  Box,
  HStack,
  Icon,
  Input,
  InputField,
  Pressable,
  Text,
} from '@gluestack-ui/themed';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  TextInput,
  useColorScheme,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const API_BASE =
  'https://vc3vjicxs9.execute-api.us-east-1.amazonaws.com/dev';
const MAX_LIST_HEIGHT = Dimensions.get('window').height * 0.8;

export default function ListDetailScreen() {
  const router = useRouter();
  const { id: listId } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const bg = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';

  const [name, setName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [showInput, setShowInput] = useState(false);

  const inputRef = useRef<TextInput | null>(null);
  const listRef = useRef<FlatList<string>>(null);

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/lists?userId=user123`);
        const { lists } = await res.json();
        const lst = lists.find((l) => l.listId === listId);
        if (!lst) return router.back();
        setName(lst.name);
        setTags(lst.tags);
        setItems(lst.items);
      } catch {
        Alert.alert('Error', 'No se pudo cargar la lista');
      }
    })();
  }, [listId]);

  const handleAdd = async () => {
    if (!newItem.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/lists/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user123',
          listId,
          newItem: newItem.trim(),
        }),
      });
      if (!res.ok) throw new Error();
      const { items: updated } = await res.json();
      setItems(updated);
      setNewItem('');
      listRef.current?.scrollToEnd({ animated: true });
      setShowInput(false);
    } catch {
      Alert.alert('Error', 'No se pudo agregar el elemento');
    }
  };

  const deleteItem = async (itemToDelete: string) => {
    try {
      const res = await fetch(`${API_BASE}/lists/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user123',
          listId,
          item: itemToDelete,
        }),
      });
      if (!res.ok) throw new Error();
      const { items: updated } = await res.json();
      setItems(updated);
    } catch {
      Alert.alert('Error', 'No se pudo eliminar el elemento');
    }
  };

  const renderItem: ListRenderItem<string> = ({ item }) => (
    <HStack
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: '$2', px: '$3', py: '$2', bg: '$gray700', borderRadius: '$md' }}
    >
      <Text sx={{ color: '$white' }}>{item}</Text>
      <Pressable onPress={() => deleteItem(item)}>
        <Icon as={MaterialIcons} name="delete" size="sm" color="$red500" />
      </Pressable>
    </HStack>
  );

  return (
    <>
      <Stack.Screen options={{ title: name || `Lista ${listId}` }} />
      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.select({ ios: 100, android: 0 })}
      >
        <Box sx={{ flex: 1, bg, px: '$4', pt: '$4' }}>
          {/* Etiquetas */}
          <HStack sx={{ mb: '$3', flexWrap: 'wrap', gap: '$2' }}>
            {tags.map((t) => (
              <Box
                key={t}
                sx={{ bg: '$gray600', px: '$2', py: '$1', borderRadius: '$sm' }}
              >
                <Text sx={{ color: '$white', fontSize: '$xs' }}>{t}</Text>
              </Box>
            ))}
          </HStack>

          {/* Wrapper con altura máxima del 80%, borde blanco */}
          <Box
            style={{
              maxHeight: MAX_LIST_HEIGHT,
              borderWidth: 1,
              borderColor: '#FFFFFF',
              borderRadius: 8,
              overflow: 'hidden',
            }}
          >
            <FlatList
              ref={listRef}
              data={items}
              keyExtractor={(_, i) => i.toString()}
              renderItem={renderItem}
              contentContainerStyle={{ padding: 12 }}
              showsVerticalScrollIndicator
              keyboardShouldPersistTaps="always"
            />
          </Box>

          {/* TextInput debajo de la lista, sin borde */}
          {showInput && (
            <Box sx={{ width: '100%', px: '$4', mt: '$3' }}>
              <Input sx={{ bg: 'transparent', borderWidth: 0 }}>
                <InputField
                  ref={inputRef}
                  value={newItem}
                  onChangeText={setNewItem}
                  placeholder="Nuevo elemento"
                  blurOnSubmit={false}
                  returnKeyType="done"
                  onSubmitEditing={handleAdd}
                  sx={{
                    color: '$white',
                    bg: '$gray800',
                    borderWidth: 0,
                    borderRadius: '$full',
                    px: '$4',
                    py: '$2',
                  }}
                />
              </Input>
            </Box>
          )}

          {/* Botón flotante */}
          <Pressable
            onPress={() => {
              if (!showInput) {
                setShowInput(true);
                setTimeout(() => inputRef.current?.focus(), 50);
              } else {
                handleAdd();
              }
            }}
            sx={{
              position: 'absolute',
              bottom: 15,
              right: 15,
              bg: '$blue500',
              width: '$12',
              height: '$12',
              borderRadius: '$full',
              justifyContent: 'center',
              alignItems: 'center',
              shadowColor: '$black',
              shadowOpacity: 0.3,
              shadowOffset: { width: 0, height: 2 },
              shadowRadius: 4,
            }}
          >
            <Icon as={MaterialIcons} name="add" size="xl" color="$white" />
          </Pressable>
        </Box>
      </KeyboardAvoidingView>
    </>
  );
}
