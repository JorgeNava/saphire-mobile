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
import { useFocusEffect, useRouter } from 'expo-router';
import React, { useCallback, useEffect, useRef, useState } from 'react';
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
import { cacheService } from '../../services/cacheService';

// Interfaz actualizada para manejar tags del backend
interface List {
  listId: string;
  name: string;
  tagIds: string[];      // UUIDs de los tags
  tagNames: string[];    // Nombres de los tags (para mostrar)
  items: string[];
  description?: string;
  tagSource?: string;
  createdAt?: string;
  updatedAt?: string;
}

const API_BASE = 'https://zon9g6gx9k.execute-api.us-east-1.amazonaws.com';

export default function ListsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const theme = {
    background: isDark ? '#0A0E27' : '#F5F7FA',
    card: isDark ? '#1A1F3A' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1F3A',
    border: isDark ? '#2A2F4A' : '#E5E7EB',
  };

  const [lists, setLists] = useState<List[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newItems, setNewItems] = useState<string[]>(['']);

  // Estados para crear lista desde etiquetas
  const [showTagModal, setShowTagModal] = useState(false);
  const [availableTags, setAvailableTags] = useState<Array<{tagId: string; name: string}>>([]);
  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [customListName, setCustomListName] = useState('');
  const [isCreatingFromTags, setIsCreatingFromTags] = useState(false);
  const [tagSearchQuery, setTagSearchQuery] = useState('');
  const [filteredTagsForModal, setFilteredTagsForModal] = useState<Array<{tagId: string; name: string}>>([]);

  const itemRefs = useRef<(RNTextInput | null)[]>([]);

  useEffect(() => {
    fetchLists();
  }, []);

  // Recargar listas cuando la pantalla se enfoca (al regresar de detalle)
  useFocusEffect(
    useCallback(() => {
      fetchLists();
    }, [])
  );

  // Iniciar sincronización en background de listas
  useEffect(() => {
    cacheService.startListsSync(async () => {
      const res = await fetch(`${API_BASE}/lists?userId=user123&limit=50`);
      const data = await res.json();
      
      // Soportar tanto respuesta paginada como array directo
      const listsArray = data.items || (Array.isArray(data) ? data : (data.lists || []));
      
      const parsed: List[] = listsArray.map((l: any) => ({
        listId: l.listId ?? l.id,
        name: l.name,
        tagIds: l.tagIds || [],
        tagNames: l.tagNames || l.tags || [],
        items: l.items || [],
        description: l.description,
        tagSource: l.tagSource,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      }));
      
      setLists(parsed); // Actualizar estado con datos frescos
      return parsed;
    });

    // Limpiar al desmontar el componente
    return () => {
      cacheService.stopBackgroundSync('cache_lists');
    };
  }, []);

  async function fetchLists() {
    try {
      // Intentar obtener del caché primero
      const cachedLists = await cacheService.getLists();
      if (cachedLists) {
        setLists(cachedLists);
        console.log('✅ Listas cargadas desde caché');
        return;
      }

      // Si no hay caché, obtener del servidor
      // Nota: Lists puede o no tener paginación según la API, mantenemos compatibilidad
      const res = await fetch(`${API_BASE}/lists?userId=user123&limit=50`);
      
      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      
      // Soportar tanto respuesta paginada como array directo
      const listsArray = data.items || (Array.isArray(data) ? data : (data.lists || []));
      
      const parsed: List[] = listsArray.map((l: any) => ({
        listId: l.listId ?? l.id,
        name: l.name,
        tagIds: l.tagIds || [],
        tagNames: l.tagNames || l.tags || [],
        items: l.items || [],
        description: l.description,
        tagSource: l.tagSource,
        createdAt: l.createdAt,
        updatedAt: l.updatedAt,
      }));
      
      setLists(parsed);
      
      // Guardar en caché
      await cacheService.setLists(parsed);
      console.log('✅ Listas guardadas en caché');
    } catch (err) {
      console.error('❌ Error fetching lists:', err);
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

  // Cargar etiquetas disponibles
  const fetchAvailableTags = async () => {
    try {
      const res = await fetch(`${API_BASE}/tags?userId=user123&limit=100`);
      if (!res.ok) throw new Error();
      const data = await res.json();
      const tagsArray = data.items || data.tags || [];
      setAvailableTags(tagsArray);
    } catch (err) {
      console.error('❌ Error fetching tags:', err);
      Alert.alert('Error', 'No se pudieron cargar las etiquetas');
    }
  };

  // Filtrar etiquetas cuando cambia el query de búsqueda
  useEffect(() => {
    if (tagSearchQuery.trim()) {
      const filtered = availableTags.filter(tag =>
        tag.name.toLowerCase().includes(tagSearchQuery.toLowerCase())
      );
      setFilteredTagsForModal(filtered);
    } else {
      setFilteredTagsForModal(availableTags);
    }
  }, [tagSearchQuery, availableTags]);

  // Abrir modal de crear desde etiquetas
  const openTagModal = () => {
    fetchAvailableTags();
    setTagSearchQuery('');
    setShowTagModal(true);
  };

  // Crear lista desde etiquetas seleccionadas
  const createListFromTags = async () => {
    if (selectedTags.length === 0) {
      Alert.alert('Error', 'Selecciona al menos una etiqueta');
      return;
    }

    if (selectedTags.length > 5) {
      Alert.alert('Error', 'Máximo 5 etiquetas permitidas');
      return;
    }

    setIsCreatingFromTags(true);
    try {
      // Generar nombre de lista si no se proporcionó
      const listName = customListName.trim() || undefined;

      console.log('📤 Creando lista desde etiquetas:', {
        userId: 'user123',
        tagNames: selectedTags,
        listName,
        includeCompleted: false,
      });

      // Usar endpoint especializado del backend
      const createRes = await fetch(`${API_BASE}/lists/from-tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user123',
          tagNames: selectedTags,
          listName,
          includeCompleted: false,
        }),
      });

      console.log('📥 Response status:', createRes.status);

      if (!createRes.ok) {
        const error = await createRes.json();
        console.log('❌ Error response:', error);
        
        if (error.error === 'NO_THOUGHTS_FOUND') {
          Alert.alert(
            'Sin resultados',
            `No se encontraron pensamientos con las etiquetas seleccionadas: ${selectedTags.join(', ')}\n\nAsegúrate de que existan pensamientos con estas etiquetas.`
          );
          setIsCreatingFromTags(false);
          return;
        }
        throw new Error(error.message || 'Error al crear lista');
      }

      const list = await createRes.json();
      console.log('✅ Lista creada desde etiquetas:', list);
      // Invalidar caché de listas
      await cacheService.set('cache_lists', null, 0);
      Alert.alert('Éxito', `Lista "${list.name}" creada con ${list.thoughtsFound} pensamientos`);

      // Limpiar y cerrar
      setShowTagModal(false);
      setSelectedTags([]);
      setCustomListName('');
      await fetchLists();
    } catch (err: any) {
      console.error('❌ Error completo:', err);
      Alert.alert('Error', err.message || 'No se pudo crear la lista desde etiquetas');
    } finally {
      setIsCreatingFromTags(false);
    }
  };

  // Generar nombre de lista automáticamente
  const generateListName = (tags: string[]): string => {
    if (tags.length === 1) {
      return `Lista: ${tags[0]}`;
    }
    if (tags.length === 2) {
      return `${tags[0]} y ${tags[1]}`;
    }
    return `${tags[0]}, ${tags[1]} y más`;
  };

  // Toggle selección de etiqueta
  const toggleTagSelection = (tagName: string) => {
    setSelectedTags(prev => {
      if (prev.includes(tagName)) {
        return prev.filter(t => t !== tagName);
      }
      if (prev.length >= 5) {
        Alert.alert('Límite alcanzado', 'Máximo 5 etiquetas permitidas');
        return prev;
      }
      return [...prev, tagName];
    });
  };

  // Render proteg enkel si item existe
  const renderListItem: ListRenderItem<List> = ({ item }) => {
    if (!item || !item.listId) return null;
    const MAX_TAGS_DISPLAY = 3;
    const displayTags = item.tagNames?.slice(0, MAX_TAGS_DISPLAY) || [];
    const remainingCount = (item.tagNames?.length || 0) - MAX_TAGS_DISPLAY;
    
    return (
      <HStack
        justifyContent="space-between"
        alignItems="center"
        sx={{ mb: '$2', bg: '$gray700', px: '$3', py: '$2', borderRadius: '$md' }}
      >
        <Pressable onPress={() => router.push(`/list/${item.listId}`)} style={{ flex: 1, marginRight: 8 }}>
          <VStack>
            <Text sx={{ color: '$white', fontSize: '$lg' }}>{item.name}</Text>
            <HStack sx={{ flexWrap: 'wrap', gap: '$1', mt: '$1' }}>
              {displayTags.length > 0 ? (
                <>
                  {displayTags.map((tagName, idx) => (
                    <Box key={item.tagIds[idx] || tagName} sx={{ bg: '$gray600', px: '$2', py: '$1', borderRadius: '$sm' }}>
                      <Text sx={{ color: '$white', fontSize: '$xs' }}>{tagName}</Text>
                    </Box>
                  ))}
                  {remainingCount > 0 && (
                    <Box sx={{ bg: '$gray600', px: '$2', py: '$1', borderRadius: '$sm' }}>
                      <Text sx={{ color: '$white', fontSize: '$xs' }}>+{remainingCount}</Text>
                    </Box>
                  )}
                </>
              ) : (
                <Text sx={{ color: '$gray500', fontSize: '$xs' }}>Sin etiquetas</Text>
              )}
            </HStack>
          </VStack>
        </Pressable>
        <HStack sx={{ gap: '$2', alignItems: 'center', flexShrink: 0 }}>
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
    <Box sx={{ flex: 1, bg: theme.background, px: '$4', pt: '$4' }}>
      <HStack justifyContent="space-between" alignItems="center" sx={{ mb: '$3', mt: 40 }}>
        <Text sx={{ color: '$white', fontSize: 24, fontWeight: 'bold' }}>
          Listas
        </Text>
        <Text sx={{ color: '$white', fontSize: 16, fontWeight: '600' }}>
          {lists.length} {lists.length === 1 ? 'lista' : 'listas'}
        </Text>
      </HStack>

      {/* Botones de acción */}
      <HStack sx={{ gap: '$2', mb: '$3' }}>
        <Button
          onPress={openTagModal}
          sx={{ flex: 1, bg: '$blue600', borderRadius: '$md' }}
        >
          <HStack sx={{ gap: '$2', alignItems: 'center' }}>
            <Icon as={MaterialIcons} name="label" size="md" color="$white" />
            <Text sx={{ color: '$white', fontWeight: '600' }}>Desde Etiquetas</Text>
          </HStack>
        </Button>
        <Button
          onPress={openModal}
          sx={{ flex: 1, bg: '$green600', borderRadius: '$md' }}
        >
          <HStack sx={{ gap: '$2', alignItems: 'center' }}>
            <Icon as={MaterialIcons} name="add" size="md" color="$white" />
            <Text sx={{ color: '$white', fontWeight: '600' }}>Nueva Lista</Text>
          </HStack>
        </Button>
      </HStack>

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

      {/* Modal de crear desde etiquetas */}
      <Modal visible={showTagModal} transparent animationType="slide">
        <Box sx={{ flex: 1, justifyContent: 'center', alignItems: 'center', bg: 'rgba(0,0,0,0.8)' }}>
          <Box sx={{ bg: '$card', p: '$4', borderRadius: '$lg', width: '90%', maxHeight: '80%' }}>
            <Text sx={{ color: '$white', fontSize: '$xl', fontWeight: 'bold', mb: '$3' }}>
              Crear lista desde etiquetas
            </Text>

            <Text sx={{ color: '$white', mb: '$2' }}>
              Selecciona las etiquetas (máximo 5):
            </Text>

            {/* Input de búsqueda */}
            <Input sx={{ mb: '$3', borderWidth: 1, borderColor: '$white' }}>
              <InputField
                value={tagSearchQuery}
                onChangeText={setTagSearchQuery}
                placeholder="Buscar etiquetas..."
                sx={{ color: '$white' }}
              />
            </Input>

            <Box sx={{ maxHeight: 300, mb: '$3' }}>
              <FlatList
                data={filteredTagsForModal}
                keyExtractor={(tag) => tag.tagId}
                renderItem={({ item: tag }) => (
                  <Pressable
                    onPress={() => toggleTagSelection(tag.name)}
                    sx={{
                      flexDirection: 'row',
                      alignItems: 'center',
                      py: '$2',
                      px: '$3',
                      mb: '$1',
                      bg: selectedTags.includes(tag.name) ? '$blue600' : '$gray700',
                      borderRadius: '$md',
                    }}
                  >
                    <Icon
                      as={MaterialIcons}
                      name={selectedTags.includes(tag.name) ? 'check-box' : 'check-box-outline-blank'}
                      size="md"
                      color="$white"
                    />
                    <Text sx={{ color: '$white', ml: '$2', fontSize: '$md' }}>
                      {tag.name}
                    </Text>
                  </Pressable>
                )}
              />
            </Box>

            {selectedTags.length > 0 && (
              <Box sx={{ mb: '$3' }}>
                <Text sx={{ color: '$white', mb: '$2' }}>
                  Seleccionadas ({selectedTags.length}/5):
                </Text>
                <HStack sx={{ flexWrap: 'wrap', gap: '$1' }}>
                  {selectedTags.map((tag) => (
                    <Box key={tag} sx={{ bg: '$blue600', px: '$2', py: '$1', borderRadius: '$sm' }}>
                      <Text sx={{ color: '$white', fontSize: '$sm' }}>{tag}</Text>
                    </Box>
                  ))}
                </HStack>
              </Box>
            )}

            <Text sx={{ color: '$white', mb: '$1' }}>
              Nombre de la lista (opcional):
            </Text>
            <Input sx={{ mb: '$3', borderWidth: 1, borderColor: '$white' }}>
              <InputField
                value={customListName}
                onChangeText={setCustomListName}
                placeholder="Se generará automáticamente si no especificas"
                sx={{ color: '$white' }}
              />
            </Input>

            <HStack justifyContent="flex-end" sx={{ gap: '$3' }}>
              <Button
                variant="outline"
                onPress={() => {
                  setShowTagModal(false);
                  setSelectedTags([]);
                  setCustomListName('');
                }}
                sx={{ borderColor: '$white', borderWidth: 1 }}
              >
                <Text sx={{ color: '$white' }}>Cancelar</Text>
              </Button>
              <Button
                onPress={createListFromTags}
                disabled={selectedTags.length === 0 || isCreatingFromTags}
                sx={{ bg: '$blue600' }}
              >
                <Text sx={{ color: '$white' }}>
                  {isCreatingFromTags ? 'Creando...' : `Crear (${selectedTags.length} tags)`}
                </Text>
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