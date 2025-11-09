// app/list/[id].tsx
import {
  Box,
  HStack,
  Icon,
  Pressable,
  Text,
} from '@gluestack-ui/themed';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  KeyboardAvoidingView,
  ListRenderItem,
  Platform,
  ScrollView,
  StyleSheet,
  TextInput,
  useColorScheme,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

const API_BASE =
  'https://zon9g6gx9k.execute-api.us-east-1.amazonaws.com';
const MAX_LIST_HEIGHT = Dimensions.get('window').height * 0.8;

export default function ListDetailScreen() {
  const router = useRouter();
  const { id: listId } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const bg = colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC';

  const [items, setItems] = useState<Array<{itemId?: string; content: string} | string>>([]);
  const [newItem, setNewItem] = useState('');
  const [showItemInput, setShowItemInput] = useState(false);
  const itemInputRef = useRef<TextInput | null>(null);
  const listRef = useRef<FlatList<any>>(null);

  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<number | null>(null);
  const [availableTags, setAvailableTags] = useState<Array<{tagId: string; name: string}>>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  
  // Datos completos de la lista para actualizaciones
  const [fullListData, setFullListData] = useState<any>(null);

  // Nombre de la lista para el header
  const [listName, setListName] = useState<string>('');

  useEffect(() => {
    (async () => {
      try {
        const url = `${API_BASE}/lists?userId=user123`;
        const res = await fetch(url);
        
        if (!res.ok) {
          const errorText = await res.text();
          console.error('❌ Error response:', errorText);
          throw new Error(`HTTP ${res.status}: ${errorText}`);
        }
        
        const data = await res.json();
        const listsArray = Array.isArray(data) ? data : (data.lists || []);
        const lst = listsArray.find((l: any) => l.listId === listId || l.id === listId);
        
        if (!lst) {
          Alert.alert('Error', 'Lista no encontrada');
          return router.back();
        }
        
        // Normalizar items: pueden ser strings o objetos {itemId, content}
        const normalizedItems = (lst.items || []).map((item: any) => 
          typeof item === 'string' ? item : item.content
        );
        setItems(normalizedItems);
        setTagIds(lst.tagIds || []);
        setTagNames(lst.tagNames || lst.tags || []);
        setListName(lst.name || '');
        setFullListData(lst);
        loadAvailableTags();
      } catch (err) {
        console.error('❌ Error loading list:', err);
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

  const loadAvailableTags = async () => {
    try {
      const res = await fetch(`${API_BASE}/tags?userId=user123`);
      if (res.ok) {
        const tags = await res.json();
        setAvailableTags(tags);
      }
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  };

  const selectTag = (idx: number) => {
    setSelectedTag(selectedTag === idx ? null : idx);
  };

  const removeTag = async (idx: number) => {
    if (!fullListData) return;
    
    try {
      const updatedTagIds = [...tagIds];
      const updatedTagNames = [...tagNames];
      
      updatedTagIds.splice(idx, 1);
      updatedTagNames.splice(idx, 1);
      
      const updatedList = {
        ...fullListData,
        tagIds: updatedTagIds,
        tagNames: updatedTagNames,
        updatedAt: new Date().toISOString(),
        lastModifiedBy: 'user123'
      };
      
      const res = await fetch(`${API_BASE}/lists/${listId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Error removing tag:', errorText);
        throw new Error(errorText);
      }
      
      const result = await res.json();
      setTagIds(result.tagIds || []);
      setTagNames(result.tagNames || []);
      setFullListData(result);
      setSelectedTag(null);
    } catch (err) {
      console.error('❌ Error:', err);
      Alert.alert('Error', 'No se pudo remover el tag');
    }
  };

  const addTagToList = async (tag: {tagId: string; name: string}) => {
    if (!fullListData) {
      Alert.alert('Error', 'Datos de lista no disponibles');
      return;
    }
    
    if (tagIds.includes(tag.tagId)) {
      Alert.alert('Info', 'Este tag ya está en la lista');
      return;
    }
    
    try {
      const updatedList = {
        ...fullListData,
        tagIds: [...tagIds, tag.tagId],
        tagNames: [...tagNames, tag.name],
        tagSource: 'Manual',
        updatedAt: new Date().toISOString(),
        lastModifiedBy: 'user123'
      };
      
      const res = await fetch(`${API_BASE}/lists/${listId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updatedList)
      });
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Error adding tag:', errorText);
        throw new Error(errorText);
      }
      
      const result = await res.json();
      setTagIds(result.tagIds || []);
      setTagNames(result.tagNames || []);
      setFullListData(result);
      setShowTagPicker(false);
    } catch (err) {
      console.error('❌ Error:', err);
      Alert.alert('Error', 'No se pudo agregar el tag');
    }
  };

  const renderItem: ListRenderItem<{itemId?: string; content: string} | string> = ({ item }) => {
    const displayText = typeof item === 'string' ? item : item.content;
    return (
    <HStack
      justifyContent="space-between"
      alignItems="center"
      sx={{ mb: '$2', px: '$3', py: '$2', bg: '$gray700', borderRadius: '$md' }}
    >
      <Text sx={{ color: '$white' }}>{displayText}</Text>
      <Pressable onPress={() => deleteItem(displayText)}>
        <Icon as={MaterialIcons} name="delete" size="sm" color="$red500" />
      </Pressable>
    </HStack>
  );
  };

  return (
    <>
      <Stack.Screen options={{ title: listName || `Lista ${listId}` }} />

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
        keyboardVerticalOffset={Platform.select({ ios: 100, android: 0 })}
      >
        <Box sx={{ flex: 1, bg, px: '$4', pt: '$4' }}>
          <HStack justifyContent="space-between" alignItems="center" sx={{ mb: '$2' }}>
            <Text sx={{ color: '$white', fontSize: '$md', fontWeight: 'bold' }}>
              Etiquetas
            </Text>
            <Text sx={{ color: '$white', fontSize: '$sm', fontWeight: '600' }}>
              {items.length} {items.length === 1 ? 'elemento' : 'elementos'}
            </Text>
          </HStack>
          <HStack sx={{ mb: '$4', flexWrap: 'wrap', gap: '$2' }}>
            {tagNames.length > 0 ? (
              tagNames.map((tagName, idx) => (
                <HStack
                  key={tagIds[idx] || idx}
                  alignItems="center"
                  sx={{
                    bg: '$gray600',
                    borderRadius: '$full',
                    minWidth: 50,
                    height: '$6',
                    px: '$3',
                    justifyContent: 'center',
                  }}
                >
                  <Pressable onPress={() => selectTag(idx)}>
                    <Text sx={{ color: '$white', fontSize: '$xs' }}>{tagName}</Text>
                  </Pressable>
                  {selectedTag === idx && (
                    <Pressable onPress={() => removeTag(idx)} sx={{ ml: '$1' }}>
                      <Icon as={MaterialIcons} name="close" size="xs" color="$white" />
                    </Pressable>
                  )}
                </HStack>
              ))
            ) : (
              <Text sx={{ color: '$gray500', fontSize: '$xs' }}>Sin etiquetas</Text>
            )}
            <Pressable onPress={() => setShowTagPicker(!showTagPicker)}>
              <HStack
                alignItems="center"
                justifyContent="center"
                sx={{
                  width: '$6',
                  height: '$6',
                  borderRadius: '$full',
                  borderWidth: 1,
                  borderColor: '$white',
                  bg: showTagPicker ? '$blue500' : 'transparent',
                }}
              >
                <Icon as={MaterialIcons} name="add" size="xs" color="$white" />
              </HStack>
            </Pressable>
          </HStack>

          {showTagPicker && (() => {
            const filteredTags = availableTags.filter(t => !tagIds.includes(t.tagId));
            return (
              <Box sx={{ mb: '$4', bg: '$gray700', p: '$3', borderRadius: '$md' }}>
                <Text sx={{ color: '$white', fontSize: '$sm', fontWeight: 'bold', mb: '$2' }}>
                  Agregar etiqueta:
                </Text>
                <ScrollView 
                  style={{ maxHeight: 150 }}
                  showsVerticalScrollIndicator={true}
                >
                  <HStack sx={{ flexWrap: 'wrap', gap: '$2' }}>
                    {filteredTags.map(tag => (
                      <Pressable
                        key={tag.tagId}
                        onPress={() => addTagToList(tag)}
                        sx={{
                          bg: '$blue500',
                          px: '$3',
                          py: '$2',
                          borderRadius: '$full',
                          mb: '$1',
                        }}
                      >
                        <Text sx={{ color: '$white', fontSize: '$xs' }}>+ {tag.name}</Text>
                      </Pressable>
                    ))}
                  </HStack>
                  {filteredTags.length === 0 && (
                    <Text sx={{ color: '$gray400', fontSize: '$xs' }}>
                      No hay más tags disponibles
                    </Text>
                  )}
                </ScrollView>
              </Box>
            );
          })()}

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
