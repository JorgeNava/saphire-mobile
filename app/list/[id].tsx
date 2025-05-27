// app/list/[id].tsx
import {
  Box,
  HStack,
  Icon,
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
  StyleSheet,
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

  const [items, setItems] = useState<string[]>([]);
  const [newItem, setNewItem] = useState('');
  const [showItemInput, setShowItemInput] = useState(false);
  const itemInputRef = useRef<TextInput | null>(null);
  const listRef = useRef<FlatList<string>>(null);

  const [tags, setTags] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<number | null>(null);
  const [editingTag, setEditingTag] = useState<number | null>(null);
  const [editingTagText, setEditingTagText] = useState('');

  // Nombre de la lista para el header
  const [listName, setListName] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const res = await fetch(`${API_BASE}/lists?userId=user123`);
        const { lists } = await res.json();
        const lst = lists.find((l) => l.listId === listId);
        if (!lst) return router.back();
        setItems(lst.items);
        setTags(lst.tags);
        setListName(lst.name);
      } catch {
        Alert.alert('Error', 'No se pudo cargar la lista');
      }
    })();
  }, [listId]);

  const handleAddItem = async () => {
    if (!newItem.trim()) return;
    try {
      const res = await fetch(`${API_BASE}/lists/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user123', listId, newItem: newItem.trim() }),
      });
      if (!res.ok) throw new Error();
      const { items: updated } = await res.json();
      setItems(updated);
      setNewItem('');
      setShowItemInput(false);
      listRef.current?.scrollToEnd({ animated: true });
    } catch {
      Alert.alert('Error', 'No se pudo agregar el elemento');
    }
  };

  const deleteItem = async (itemToDelete: string) => {
    try {
      const res = await fetch(`${API_BASE}/lists/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user123', listId, item: itemToDelete }),
      });
      if (!res.ok) throw new Error();
      const { items: updated } = await res.json();
      setItems(updated);
    } catch {
      Alert.alert('Error', 'No se pudo eliminar el elemento');
    }
  };

  const selectTag = (idx: number) => {
    setSelectedTag(selectedTag === idx ? null : idx);
    setEditingTag(null);
  };
  const startEditingTag = (idx: number) => {
    setEditingTag(idx);
    setEditingTagText(tags[idx]);
  };
  const saveTag = (idx: number) => {
    const text = editingTagText.trim();
    setTags((prev) => {
      const copy = [...prev];
      if (text) copy[idx] = text;
      else copy.splice(idx, 1);
      return copy;
    });
    setEditingTag(null);
    setSelectedTag(null);
    setEditingTagText('');
  };
  const removeTag = (idx: number) => {
    setTags((prev) => prev.filter((_, i) => i !== idx));
    setSelectedTag(null);
  };
  const addTag = () => {
    setTags((prev) => [...prev, '']);
    const newIdx = tags.length;
    setEditingTag(newIdx);
    setEditingTagText('');
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
      <Stack.Screen options={{ title: listName || `Lista ${listId}` }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.select({ ios: 100, android: 0 })}
      >
        <Box sx={{ flex: 1, bg, px: '$4', pt: '$4' }}>
          <Text sx={{ color: '$white', fontSize: '$md', fontWeight: 'bold', mb: '$2' }}>
            Etiquetas
          </Text>
          <HStack sx={{ mb: '$4', flexWrap: 'wrap', gap: '$2' }}>
            {tags.map((tag, idx) =>
              editingTag === idx ? (
                <TextInput
                  key={idx}
                  style={styles.chipInput}
                  value={editingTagText}
                  onChangeText={setEditingTagText}
                  onSubmitEditing={() => saveTag(idx)}
                  onBlur={() => saveTag(idx)}
                  placeholder="Etiqueta"
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  autoFocus
                />
              ) : (
                <HStack
                  key={idx}
                  alignItems="center"
                  sx={{
                    borderWidth: 1,
                    borderColor: '$white',
                    borderRadius: '$full',
                    minWidth: 50,
                    height: '$6',
                    px: '$3',
                    justifyContent: 'center',
                  }}
                >
                  <Pressable onPress={() => selectTag(idx)}>
                    <Text sx={{ color: '$white', fontSize: '$xs' }}>{tag}</Text>
                  </Pressable>
                  {selectedTag === idx && (
                    <HStack sx={{ ml: '$1', gap: '$1' }}>
                      <Pressable onPress={() => startEditingTag(idx)}>
                        <Icon as={MaterialIcons} name="edit" size="xs" color="$white" />
                      </Pressable>
                      <Pressable onPress={() => removeTag(idx)}>
                        <Icon as={MaterialIcons} name="close" size="xs" color="$white" />
                      </Pressable>
                    </HStack>
                  )}
                </HStack>
              )
            )}
            <Pressable onPress={addTag}>
              <HStack
                alignItems="center"
                justifyContent="center"
                sx={{
                  width: '$6',
                  height: '$6',
                  borderRadius: '$full',
                  borderWidth: 1,
                  borderColor: '$white',
                }}
              >
                <Icon as={MaterialIcons} name="add" size="xs" color="$white" />
              </HStack>
            </Pressable>
          </HStack>

          <Box style={{ maxHeight: MAX_LIST_HEIGHT, borderRadius: 8, overflow: 'hidden' }}>
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

          {showItemInput && (
            <Box sx={{ width: '100%', px: '$4', mt: '$3' }}>
              <TextInput
                style={styles.newItemInput}
                ref={itemInputRef}
                value={newItem}
                onChangeText={setNewItem}
                onSubmitEditing={handleAddItem}
                placeholder="Nuevo elemento"
                placeholderTextColor="rgba(255,255,255,0.6)"
              />
            </Box>
          )}

          <Pressable
            onPress={() => {
              if (!showItemInput) {
                setShowItemInput(true);
                setTimeout(() => itemInputRef.current?.focus(), 50);
              } else {
                handleAddItem();
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
            }}
          >
            <Icon as={MaterialIcons} name="add" size="xl" color="$white" />
          </Pressable>
        </Box>
      </KeyboardAvoidingView>
    </>
  );
}

const styles = StyleSheet.create({
  chipInput: {
    backgroundColor: '#gray700',
    borderWidth: 1,
    borderColor: '#fff',
    borderRadius: 999,
    minWidth: 50,
    height: 32,
    paddingHorizontal: 12,
    paddingVertical: 6,
    color: '#fff',
    fontSize: 12,
    textAlignVertical: 'center',
    marginRight: 4,
  },
  newItemInput: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: 999,
    paddingHorizontal: 16,
    paddingVertical: 12,
    color: '#fff',
  },
});
