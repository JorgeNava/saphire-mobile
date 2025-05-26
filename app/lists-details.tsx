// ListDetailScreen.tsx
import {
  Box,
  HStack,
  Icon,
  Input,
  InputField,
  Pressable,
  Text,
} from '@gluestack-ui/themed';
import { useRouter, useSearchParams } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  TextInput as RNTextInput,
  useColorScheme,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const API_BASE = 'https://vc3vjicxs9.execute-api.us-east-1.amazonaws.com/dev';

export default function ListDetailScreen() {
  const { id: listId } = useSearchParams();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const theme = { background: colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC' };

  const [name, setName] = useState('');
  const [tags, setTags] = useState<string[]>([]);
  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const itemRef = useRef<RNTextInput | null>(null);

  useEffect(() => {
    (async () => {
      // 1) Traer la lista
      const res = await fetch(`${API_BASE}/lists?userId=user123`);
      const { lists } = await res.json();
      const lst = lists.find(l => l.listId === listId);
      if (!lst) return router.back();
      setName(lst.name);
      setTags(lst.tags);
      setItems(lst.items);
    })();
  }, []);

  const addItem = async () => {
    if (!newItem.trim()) return;
    // 2) Añadir elemento
    const res = await fetch(`${API_BASE}/lists/items`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user123', listId, newItem }),
    });
    const { items: updated } = await res.json();
    setItems(updated);
    setNewItem('');
    itemRef.current?.focus();
  };

  const deleteItem = async (itemToDelete: string) => {
    // 3) Eliminar elemento
    const res = await fetch(`${API_BASE}/lists/items`, {
      method: 'DELETE', // o DELETE según tu diseño
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId: 'user123', listId, item: itemToDelete }),
    });
    const { items: updated } = await res.json();
    setItems(updated);
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
    <Box sx={{ flex: 1, bg: theme.background, px: '$4', pt: '$4' }}>
      {/* Título */}
      <Text sx={{ color: '$white', fontSize: '$xl', fontWeight: 'bold', mb: '$3' }}>
        {name}
      </Text>

      {/* Etiquetas */}
      <HStack sx={{ mb: '$3', flexWrap: 'wrap', gap: '$2' }}>
        {tags.map(t => (
          <Box key={t} sx={{ bg: '$gray600', px: '$2', py: '$1', borderRadius: '$sm' }}>
            <Text sx={{ color: '$white', fontSize: '$xs' }}>{t}</Text>
          </Box>
        ))}
      </HStack>

      {/* Listado de items con delete */}
      <FlatList
        data={items}
        keyExtractor={(_, i) => i.toString()}
        renderItem={renderItem}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      {/* Input fijo en pie */}
      <HStack
        alignItems="center"
        sx={{
          position: 'absolute',
          bottom: '$5',
          width: '100%',
          px: '$4',
          gap: '$2',
        }}
      >
        <Input
          flex={1}
          sx={{
            bg: '$gray800',
            borderWidth: 1,
            borderColor: '$gray600',
            borderRadius: '$full',
            px: '$4',
            py: '$2',
          }}
        >
          <InputField
            ref={itemRef}
            value={newItem}
            onChangeText={setNewItem}
            placeholder="Nuevo elemento"
            sx={{ color: '$white' }}
          />
        </Input>
        <Pressable
          onPress={addItem}
          sx={{
            bg: '$blue500',
            borderRadius: '$full',
            p: '$3',
            justifyContent: 'center',
            alignItems: 'center',
          }}
        >
          <Icon as={MaterialIcons} name="add" size="md" color="$white" />
        </Pressable>
      </HStack>
    </Box>
  );
}
