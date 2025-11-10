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
  RefreshControl,
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
  createdFromTags?: boolean; // Indica si la lista fue creada usando "Crear desde Etiquetas"
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
  const [refreshing, setRefreshing] = useState(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newItems, setNewItems] = useState<string[]>(['']);

  // Estados para crear lista desde etiquetas
  const [showTagPicker, setShowTagPicker] = useState(false);
  const [showTagModal, setShowTagModal] = useState(false);
  const [showActionMenu, setShowActionMenu] = useState(false);
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
      // Generar nombre de lista: usar el personalizado o el nombre de las etiquetas
      const listName = customListName.trim() || selectedTags.join(', ');

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
          // El backend establece createdFromTags automáticamente
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
      setShowTagPicker(false);
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

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    await fetchLists();
    setRefreshing(false);
  };

  // Renderizar item de lista con UI mejorada
  const renderListItem = ({ item }: { item: List }) => {
    const displayTags = item.tagNames?.slice(0, 3) || [];
    const remainingCount = (item.tagNames?.length || 0) - 3;
    const itemCount = item.items?.length || 0;
    const completedCount = item.items?.filter((i: any) => i.completed).length || 0;
    const progress = itemCount > 0 ? (completedCount / itemCount) * 100 : 0;

    return (
      <Pressable 
        onPress={() => router.push(`/list/${item.listId}`)}
        sx={{ mb: '$3' }}
      >
        <Box
          sx={{ 
            bg: theme.card,
            borderRadius: '$2xl',
            p: '$4',
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: '$black',
            shadowOffset: { width: 0, height: 2 },
            shadowOpacity: 0.1,
            shadowRadius: 4,
            elevation: 3
          }}
        >
          {/* Header con título y botón eliminar */}
          <HStack justifyContent="space-between" alignItems="flex-start" sx={{ mb: '$3' }}>
            <VStack flex={1} sx={{ mr: '$2' }}>
              <Text sx={{ color: theme.text, fontSize: '$xl', fontWeight: 'bold', mb: '$1' }}>
                {item.name}
              </Text>
              
              {/* Estadísticas */}
              {itemCount > 0 && (
                <HStack alignItems="center" sx={{ gap: '$2' }}>
                  <Text sx={{ color: theme.text, fontSize: '$sm', opacity: 0.7 }}>
                    {completedCount}/{itemCount} completados
                  </Text>
                  <Box 
                    sx={{ 
                      width: 4, 
                      height: 4, 
                      borderRadius: '$full', 
                      bg: theme.text,
                      opacity: 0.3
                    }} 
                  />
                  <Text sx={{ color: theme.text, fontSize: '$sm', opacity: 0.7 }}>
                    {Math.round(progress)}%
                  </Text>
                </HStack>
              )}
            </VStack>

            <Pressable
              onPress={(e) => {
                e.stopPropagation();
                Alert.alert('Confirmar', '¿Eliminar esta lista?', [
                  { text: 'Cancelar', style: 'cancel' },
                  {
                    text: 'Eliminar',
                    style: 'destructive',
                    onPress: async () => {
                      try {
                        console.log('🗑️ Eliminando lista:', item.listId);
                        
                        const response = await fetch(`${API_BASE}/lists`, {
                          method: 'DELETE',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({ userId: 'user123', listId: item.listId }),
                        });

                        if (!response.ok) {
                          const errorText = await response.text();
                          console.error('❌ Error al eliminar:', response.status, errorText);
                          Alert.alert(
                            'Error al eliminar',
                            `No se pudo eliminar la lista.\nCódigo: ${response.status}`
                          );
                          return;
                        }

                        console.log('✅ Lista eliminada exitosamente:', item.listId);
                        await cacheService.invalidateLists();
                        setLists(prev => prev.filter(l => l.listId !== item.listId));
                        Alert.alert('Éxito', `Lista "${item.name}" eliminada correctamente`);
                      } catch (err: any) {
                        console.error('❌ Error completo al eliminar lista:', err);
                        Alert.alert('Error', `No se pudo eliminar la lista.\n\n${err.message || 'Error desconocido'}`);
                      }
                    },
                  },
                ]);
              }}
              sx={{
                width: 36,
                height: 36,
                borderRadius: '$full',
                bg: 'rgba(239, 68, 68, 0.1)',
                justifyContent: 'center',
                alignItems: 'center'
              }}
            >
              <Icon as={MaterialIcons} name="delete" size="sm" color="$red500" />
            </Pressable>
          </HStack>

          {/* Barra de progreso */}
          {itemCount > 0 && (
            <Box 
              sx={{ 
                height: 6, 
                bg: isDark ? '#1E293B' : '#E5E7EB',
                borderRadius: '$full',
                overflow: 'hidden',
                mb: '$3'
              }}
            >
              <Box 
                sx={{ 
                  height: '100%', 
                  width: `${progress}%`,
                  bg: progress === 100 ? '$green500' : '$blue600',
                  borderRadius: '$full'
                }} 
              />
            </Box>
          )}

          {/* Etiquetas */}
          <HStack sx={{ flexWrap: 'wrap', gap: '$2' }}>
            {displayTags.length > 0 ? (
              <>
                {displayTags.map((tagName, idx) => (
                  <Box 
                    key={item.tagIds[idx] || tagName} 
                    sx={{ 
                      bg: '$blue500',
                      px: '$3', 
                      py: '$1.5', 
                      borderRadius: '$full'
                    }}
                  >
                    <Text sx={{ color: '$white', fontSize: '$xs', fontWeight: '500' }}>
                      {tagName}
                    </Text>
                  </Box>
                ))}
                {remainingCount > 0 && (
                  <Box sx={{ bg: '$gray500', px: '$3', py: '$1.5', borderRadius: '$full' }}>
                    <Text sx={{ color: '$white', fontSize: '$xs', fontWeight: '500' }}>
                      +{remainingCount}
                    </Text>
                  </Box>
                )}
              </>
            ) : (
              <Text sx={{ color: theme.text, fontSize: '$xs', opacity: 0.5 }}>
                Sin etiquetas
              </Text>
            )}
          </HStack>

          {/* Indicador de más info */}
          <HStack 
            justifyContent="flex-end" 
            alignItems="center" 
            sx={{ mt: '$2', gap: '$1' }}
          >
            <Text sx={{ color: '$blue500', fontSize: '$xs', fontWeight: '600' }}>
              Ver detalles
            </Text>
            <Icon as={MaterialIcons} name="chevron-right" size="sm" color="$blue500" />
          </HStack>
        </Box>
      </Pressable>
    );
  };

  return (
    <Box sx={{ flex: 1, bg: theme.background, px: '$4', pt: '$4' }}>
      {/* Header */}
      <HStack justifyContent="space-between" alignItems="center" sx={{ mb: '$3', mt: 40 }}>
        <Text sx={{ color: theme.text, fontSize: 24, fontWeight: 'bold' }}>
          Listas
        </Text>
        <Text sx={{ color: theme.text, fontSize: 16, fontWeight: '600' }}>
          {lists.length} {lists.length === 1 ? 'lista' : 'listas'}
        </Text>
      </HStack>

      <FlatList
        data={lists}
        keyExtractor={l => l.listId}
        renderItem={renderListItem}
        contentContainerStyle={{ paddingBottom: 80 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <Box sx={{ flex: 1, justifyContent: 'center', alignItems: 'center', bg: 'rgba(0,0,0,0.8)' }}>
          <Box sx={{ bg: theme.card, p: '$5', borderRadius: '$2xl', width: '90%', maxHeight: '85%', borderWidth: 1, borderColor: theme.border }}>
            <Text sx={{ color: theme.text, fontSize: '$2xl', fontWeight: 'bold', mb: '$4' }}>
              Nueva Lista
            </Text>

            <Text sx={{ mb: '$2', color: theme.text, fontSize: '$sm', fontWeight: '600' }}>Nombre de la lista</Text>
            <Input sx={{ mb: '$4', bg: isDark ? '#1E293B' : '#F1F5F9', borderWidth: 1, borderColor: theme.border, borderRadius: '$xl' }}>
              <InputField
                value={newName}
                onChangeText={setNewName}
                placeholder="Mi lista de tareas"
                sx={{ color: theme.text, fontSize: '$md' }}
              />
            </Input>

            <Text sx={{ mb: '$2', color: theme.text, fontSize: '$sm', fontWeight: '600' }}>Etiquetas (separadas por coma)</Text>
            <Input sx={{ mb: '$4', bg: isDark ? '#1E293B' : '#F1F5F9', borderWidth: 1, borderColor: theme.border, borderRadius: '$xl' }}>
              <InputField
                value={newTags}
                onChangeText={setNewTags}
                placeholder="trabajo, personal, urgente..."
                sx={{ color: theme.text }}
              />
            </Input>

            <Text sx={{ mb: '$2', color: theme.text, fontSize: '$sm', fontWeight: '600' }}>Elementos iniciales</Text>
            {newItems.map((val, idx) => (
              <Input key={idx} sx={{ mb: '$3', bg: isDark ? '#1E293B' : '#F1F5F9', borderWidth: 1, borderColor: theme.border, borderRadius: '$xl' }}>
                <InputField
                  ref={(input: any) => { itemRefs.current[idx] = input?.getNativeRef(); }}
                  value={val}
                  onChangeText={text => { const arr = [...newItems]; arr[idx] = text; setNewItems(arr); }}
                  placeholder={`Elemento ${idx + 1}`}
                  sx={{ color: theme.text }}
                />
              </Input>
            ))}
            <Pressable onPress={addItemField} sx={{ mb: '$4', flexDirection: 'row', alignItems: 'center', gap: '$2' }}>
              <Icon as={MaterialIcons} name="add-circle" size="sm" color="$blue500" />
              <Text sx={{ color: '$blue500', fontSize: '$md', fontWeight: '600' }}>Añadir elemento</Text>
            </Pressable>

            <HStack justifyContent="flex-end" sx={{ gap: '$3', mt: '$2' }}>
              <Pressable
                onPress={closeModal}
                sx={{
                  px: '$5',
                  py: '$3',
                  borderRadius: '$xl',
                  borderWidth: 1,
                  borderColor: theme.border
                }}
              >
                <Text sx={{ color: theme.text, fontWeight: '600' }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={createList}
                disabled={!newName.trim()}
                sx={{
                  px: '$5',
                  py: '$3',
                  borderRadius: '$xl',
                  bg: newName.trim() ? '$blue600' : '$gray500',
                  opacity: newName.trim() ? 1 : 0.5
                }}
              >
                <Text sx={{ color: '$white', fontWeight: '600' }}>Crear Lista</Text>
              </Pressable>
            </HStack>
          </Box>
        </Box>
      </Modal>

      {/* Modal de crear desde etiquetas */}
      <Modal visible={showTagModal} transparent animationType="slide">
        <Box sx={{ flex: 1, justifyContent: 'flex-end', bg: 'rgba(0,0,0,0.8)' }}>
          <Box sx={{ bg: theme.card, p: '$5', borderTopLeftRadius: '$3xl', borderTopRightRadius: '$3xl', maxHeight: '90%', borderWidth: 1, borderColor: theme.border }}>
            <Text sx={{ color: theme.text, fontSize: '$2xl', fontWeight: 'bold', mb: '$4' }}>
              Crear desde Etiquetas
            </Text>

            <Text sx={{ color: theme.text, mb: '$2', fontSize: '$sm' }}>
              Selecciona hasta 5 etiquetas:
            </Text>

            {/* Input de búsqueda */}
            <Input sx={{ mb: '$3', bg: isDark ? '#1E293B' : '#F1F5F9', borderWidth: 1, borderColor: theme.border, borderRadius: '$xl' }}>
              <InputField
                value={tagSearchQuery}
                onChangeText={setTagSearchQuery}
                placeholder="Buscar etiquetas..."
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                sx={{ color: theme.text }}
              />
            </Input>

            <Box sx={{ maxHeight: 250, mb: '$3' }}>
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
              <Box sx={{ mb: '$3', p: '$3', bg: isDark ? '#1E293B' : '#F1F5F9', borderRadius: '$xl' }}>
                <Text sx={{ color: theme.text, mb: '$2', fontSize: '$sm', fontWeight: '600' }}>
                  Seleccionadas ({selectedTags.length}/5)
                </Text>
                <HStack sx={{ flexWrap: 'wrap', gap: '$2' }}>
                  {selectedTags.map((tag) => (
                    <Box key={tag} sx={{ bg: '$blue600', px: '$3', py: '$1.5', borderRadius: '$full' }}>
                      <Text sx={{ color: '$white', fontSize: '$sm', fontWeight: '500' }}>{tag}</Text>
                    </Box>
                  ))}
                </HStack>
              </Box>
            )}

            <Text sx={{ color: theme.text, mb: '$2', fontSize: '$sm', fontWeight: '600' }}>
              Nombre de la lista (opcional)
            </Text>
            <Input sx={{ mb: '$3', bg: isDark ? '#1E293B' : '#F1F5F9', borderWidth: 1, borderColor: theme.border, borderRadius: '$xl' }}>
              <InputField
                value={customListName}
                onChangeText={setCustomListName}
                placeholder="Se generará automáticamente si no especificas"
                placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
                sx={{ color: theme.text }}
              />
            </Input>

            <HStack justifyContent="flex-end" sx={{ gap: '$3' }}>
              <Pressable
                onPress={() => {
                  setShowTagModal(false);
                  setSelectedTags([]);
                  setCustomListName('');
                }}
                sx={{
                  px: '$4',
                  py: '$2.5',
                  borderRadius: '$xl',
                  borderWidth: 1,
                  borderColor: theme.border
                }}
              >
                <Text sx={{ color: theme.text, fontWeight: '600', fontSize: '$sm' }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={createListFromTags}
                disabled={selectedTags.length === 0 || isCreatingFromTags}
                sx={{
                  px: '$4',
                  py: '$2.5',
                  borderRadius: '$xl',
                  bg: (selectedTags.length === 0 || isCreatingFromTags) ? '$gray500' : '$blue600',
                  opacity: (selectedTags.length === 0 || isCreatingFromTags) ? 0.5 : 1
                }}
              >
                <Text sx={{ color: '$white', fontWeight: '600', fontSize: '$sm' }}>
                  {isCreatingFromTags ? 'Creando...' : `Crear (${selectedTags.length})`}
                </Text>
              </Pressable>
            </HStack>
          </Box>
        </Box>
      </Modal>

      {/* Overlay para cerrar el menú al tocar fuera */}
      {showActionMenu && (
        <Pressable
          onPress={() => setShowActionMenu(false)}
          sx={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 999
          }}
        />
      )}

      {/* Menú de acciones flotante */}
      {showActionMenu && (
        <Box
          sx={{
            position: 'absolute',
            bottom: 100,
            right: 20,
            bg: theme.card,
            borderRadius: '$xl',
            borderWidth: 1,
            borderColor: theme.border,
            shadowColor: '$black',
            shadowOpacity: 0.3,
            shadowOffset: { width: 0, height: 4 },
            shadowRadius: 8,
            elevation: 8,
            overflow: 'hidden',
            zIndex: 1000
          }}
        >
          <Pressable
            onPress={() => {
              setShowActionMenu(false);
              openModal();
            }}
            sx={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: '$3',
              px: '$4',
              py: '$3',
              borderBottomWidth: 1,
              borderBottomColor: theme.border
            }}
          >
            <Icon as={MaterialIcons} name="add" size="md" color="$green600" />
            <Text sx={{ color: theme.text, fontSize: '$md', fontWeight: '600' }}>Nueva Lista</Text>
          </Pressable>
          <Pressable
            onPress={() => {
              setShowActionMenu(false);
              openTagModal();
            }}
            sx={{
              flexDirection: 'row',
              alignItems: 'center',
              gap: '$3',
              px: '$4',
              py: '$3'
            }}
          >
            <Icon as={MaterialIcons} name="label" size="md" color="$blue600" />
            <Text sx={{ color: theme.text, fontSize: '$md', fontWeight: '600' }}>Desde Etiquetas</Text>
          </Pressable>
        </Box>
      )}

      {/* Botón flotante principal */}
      <Pressable
        onPress={() => setShowActionMenu(!showActionMenu)}
        sx={{
          position: 'absolute',
          bottom: 20,
          right: 20,
          bg: '$blue600',
          width: 56,
          height: 56,
          borderRadius: '$full',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '$black',
          shadowOpacity: 0.3,
          shadowOffset: { width: 0, height: 4 },
          shadowRadius: 8,
          elevation: 8,
          zIndex: 1001,
          transform: [{ rotate: showActionMenu ? '45deg' : '0deg' }]
        }}
      >
        <Icon as={MaterialIcons} name="add" size="xl" color="$white" />
      </Pressable>
    </Box>
  );
}

const styles = StyleSheet.create({});