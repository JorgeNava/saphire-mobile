// app/lists/index.tsx (or ListsScreen.tsx)
import {
  Box,
  Button,
  HStack,
  Icon,
  Input,
  InputField,
  Pressable,
  Text,
  VStack,
} from '@gluestack-ui/themed';
import { useRouter } from 'expo-router';
import React, { useEffect, useRef, useState } from 'react';
import {
  Alert,
  FlatList,
  ListRenderItem,
  Modal,
  TextInput as RNTextInput,
  StyleSheet,
  useColorScheme,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

// Ajustamos interfaz para aceptar ambos props 'listId' o 'id' en respuesta API
interface List {
  listId: string;
  name: string;
  tags: string[];
  items: string[];
}

const API_BASE = 'https://vc3vjicxs9.execute-api.us-east-1.amazonaws.com/dev';

export default function ListsScreen() {
  const router = useRouter();
  const themeBg = useColorScheme() === 'dark' ? '#1D3D47' : '#A1CEDC';

  const [lists, setLists] = useState<List[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newItems, setNewItems] = useState<string[]>(['']);

  const itemRefs = useRef<(RNTextInput | null)[]>([]);

  useEffect(() => {
    fetchLists();
  }, []);

  async function fetchLists() {
    try {
      const res = await fetch(`${API_BASE}/lists?userId=user123`);
      const data = await res.json();
      // Mapeamos respuesta para normalizar field 'id' a 'listId'
      const parsed: List[] = (data.lists || []).map((l: any) => ({
        listId: l.listId ?? l.id,
        name: l.name,
        tags: l.tags || [],
        items: l.items || [],
      }));
      setLists(parsed);
    } catch {
      Alert.alert('Error', 'No se pudo cargar las listas');
    }
  }

  const openModal = () => setModalVisible(true);
  const closeModal = () => {
    setModalVisible(false);
    setNewName('');
    setNewTags('');
    setNewItems(['']);
    itemRefs.current = [];
  };

  const createList = async () => {
    const tagsArray = newTags.split(',').map(t => t.trim()).filter(Boolean);
    const itemsArray = newItems.map(i => i.trim()).filter(Boolean);
    const payload = { userId: 'user123', name: newName.trim(), tags: tagsArray, items: itemsArray };
    try {
      const res = await fetch(`${API_BASE}/lists`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      if (!res.ok) throw new Error();
      // Tras crear, recargamos todas las listas
      closeModal();
      await fetchLists();
    } catch {
      Alert.alert('Error', 'No se pudo crear la lista');
    }
  };

  const addItemField = () => {
    setNewItems(prev => {
      const next = [...prev, ''];
      setTimeout(() => {
        const ref = itemRefs.current[next.length - 1];
        ref && ref.focus();
      }, 50);
      return next;
    });
  };

  // Render proteg enkel si item existe
  const renderListItem: ListRenderItem<List> = ({ item }) => {
    if (!item || !item.listId) return null;
    return (
      <HStack
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: '$2', bg: '$gray700', px: '$3', py: '$2', borderRadius: '$md' }}
      >
        <Pressable onPress={() => router.push(`/list/${item.listId}`)}>
          <VStack>
            <Text sx={{ color: '$white', fontSize: '$lg' }}>{item.name}</Text>
            <HStack sx={{ flexWrap: 'wrap', gap: '$1', mt: '$1' }}>
              {item.tags.map(t => (
                <Box key={t} sx={{ bg: '$gray600', px: '$2', py: '$1', borderRadius: '$sm' }}>
                  <Text sx={{ color: '$white', fontSize: '$xs' }}>{t}</Text>
                </Box>
              ))}
            </HStack>
          </VStack>
        </Pressable>
        <HStack sx={{ gap: '$2', alignItems: 'center' }}>
          <Pressable onPress={() => router.push(`/list/${item.listId}`)}>
            <Icon as={MaterialIcons} name="chevron-right" size="md" color="$white" />
          </Pressable>
          <Pressable
            onPress={() => {
              Alert.alert('Confirmar', '¿Eliminar esta lista?', [
                { text: 'Cancelar', style: 'cancel' },
                {
                  text: 'Eliminar',
                  style: 'destructive',
                  onPress: async () => {
                    try {
                      await fetch(`${API_BASE}/lists`, {
                        method: 'DELETE',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({ userId: 'user123', listId: item.listId }),
                      });
                      setLists(prev => prev.filter(l => l.listId !== item.listId));
                    } catch {
                      Alert.alert('Error', 'No se pudo eliminar la lista');
                    }
                  },
                },
              ]);
            }}
          >
            <Icon as={MaterialIcons} name="delete" size="md" color="$red500" />
          </Pressable>
        </HStack>
      </HStack>
    );
  };

  return (
    <Box sx={{ flex: 1, bg: themeBg, px: '$4', pt: '$4' }}>
      <Text sx={{ color: '$white', fontSize: 24, fontWeight: 'bold', mb: '$3', mt: 40 }}>
        Listas
      </Text>

      <FlatList
        data={lists}
        keyExtractor={l => l.listId}
        renderItem={renderListItem}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <Box sx={{ flex: 1, justifyContent: 'center', alignItems: 'center', bg: 'rgba(0,0,0,0.8)' }}>
          <Box sx={{ bg: '$card', p: '$4', borderRadius: '$lg', width: '90%' }}>
            <Input sx={{ mb: '$4', bg: 'transparent', borderWidth: 0 }}>
              <InputField
                value={newName}
                onChangeText={setNewName}
                placeholder="Nueva lista"
                sx={{ color: '$white', fontSize: '$xl', fontWeight: 'bold', textAlign: 'left' }}
              />
            </Input>

            <Text sx={{ mb: '$1', color: '$white' }}>Etiquetas (separadas por coma)</Text>
            <Input sx={{ mb: '$3', borderWidth: 1, borderColor: '$white' }}>
              <InputField
                value={newTags}
                onChangeText={setNewTags}
                placeholder="Tag1, tag2, ..."
                sx={{ color: '$white' }}
              />
            </Input>

            <Text sx={{ mb: '$1', color: '$white' }}>Elementos iniciales</Text>
            {newItems.map((val, idx) => (
              <Input key={idx} sx={{ mb: '$3', borderWidth: 1, borderColor: '$white' }}>
                <InputField
                  ref={(input: any) => { itemRefs.current[idx] = input?.getNativeRef(); }}
                  value={val}
                  onChangeText={text => { const arr = [...newItems]; arr[idx] = text; setNewItems(arr); }}
                  placeholder={`Elemento ${idx + 1}`}
                  sx={{ color: '$white' }}
                />
              </Input>
            ))}
            <Pressable onPress={addItemField} sx={{ mb: '$4' }}>
              <Text sx={{ color: '$blue500', fontSize: '$md' }}>Añadir elemento +</Text>
            </Pressable>

            <HStack justifyContent="flex-end" sx={{ gap: '$3' }}>
              <Button variant="outline" onPress={closeModal} sx={{ borderColor: '$white', borderWidth: 1 }}>
                <Text sx={{ color: '$white' }}>Cancelar</Text>
              </Button>
              <Button onPress={createList} disabled={!newName.trim()}>
                <Text sx={{ color: '$white' }}>Crear</Text>
              </Button>
            </HStack>
          </Box>
        </Box>
      </Modal>

      <Pressable
        onPress={openModal}
        sx={{
          position: 'absolute',
          bottom: '$5',
          right: '$5',
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
  );
}

const styles = StyleSheet.create({});