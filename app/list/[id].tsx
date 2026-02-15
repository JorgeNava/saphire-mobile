// app/list/[id].tsx
import {
    Box,
    HStack,
    Pressable,
    Text,
} from '@gluestack-ui/themed';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
    Alert,
    Animated,
    Dimensions,
    FlatList,
    KeyboardAvoidingView,
    ListRenderItem,
    Modal,
    ScrollView,
    StyleSheet,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';
import { cacheService } from '../../services/cacheService';
import { networkService } from '../../services/networkService';
import { offlineQueue } from '../../services/offlineQueue';
import { authenticateWithBiometrics } from '../../utils/biometricAuth';
import { ClipboardService } from '../../utils/clipboard';

const API_BASE =
  'https://zon9g6gx9k.execute-api.us-east-1.amazonaws.com';
const MAX_LIST_HEIGHT = Dimensions.get('window').height * 0.8;

export default function ListDetailScreen() {
  const router = useRouter();
  const { id: listId } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const theme = {
    background: isDark ? '#0A0E27' : '#F5F7FA',
    card: isDark ? '#1A1F3A' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1F3A',
    border: isDark ? '#2A2F4A' : '#E5E7EB',
  };

  const [items, setItems] = useState<Array<{itemId?: string; content: string; completed?: boolean; order?: number} | string>>([]);
  const [newItem, setNewItem] = useState('');
  const [showItemInput, setShowItemInput] = useState(false);
  const [editingItem, setEditingItem] = useState<{index: number; content: string} | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingItem, setViewingItem] = useState<string>('');
  const [filter, setFilter] = useState<'all' | 'completed' | 'pending'>('all');
  const itemInputRef = useRef<TextInput | null>(null);
  const listRef = useRef<FlatList<any>>(null);
  
  // Animación para el modal
  const slideAnim = useRef(new Animated.Value(300)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;

  const [tagIds, setTagIds] = useState<string[]>([]);
  const [tagNames, setTagNames] = useState<string[]>([]);
  const [selectedTag, setSelectedTag] = useState<number | null>(null);
  const [availableTags, setAvailableTags] = useState<Array<{tagId: string; name: string}>>([]);
  const [showTagPicker, setShowTagPicker] = useState(false);
  
  // Datos completos de la lista para actualizaciones
  const [fullListData, setFullListData] = useState<any>(null);

  // Nombre de la lista para el header
  const [listName, setListName] = useState<string>('');
  const [editingName, setEditingName] = useState(false);
  const [tempName, setTempName] = useState<string>('');
  
  // Indica si la lista fue creada desde etiquetas
  const [createdFromTags, setCreatedFromTags] = useState<boolean>(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [isLocked, setIsLocked] = useState(false);

  // Helper para cargar datos de lista desde caché
  const loadListFromCache = async () => {
    const cachedLists = await cacheService.getLists();
    if (cachedLists) {
      const lst = cachedLists.find((l: any) => l.listId === listId || l.id === listId);
      if (lst) return lst;
    }
    return null;
  };

  // Helper para guardar lista actualizada en caché
  const updateListInCache = async (updatedList: any) => {
    const cachedLists = await cacheService.getLists();
    if (cachedLists) {
      const updated = cachedLists.map((l: any) =>
        (l.listId === listId || l.id === listId) ? { ...l, ...updatedList } : l
      );
      await cacheService.setLists(updated);
    }
  };

  useEffect(() => {
    (async () => {
      try {
        let lst: any = null;

        // Si no hay internet, cargar desde caché
        if (!networkService.isConnected) {
          lst = await loadListFromCache();
          if (!lst) {
            Alert.alert('Sin conexión', 'No se pudo cargar la lista sin internet');
            return router.back();
          }
        } else {
          const url = `${API_BASE}/lists?userId=user123`;
          const res = await fetch(url);
          
          if (!res.ok) {
            const errorText = await res.text();
            console.error('❌ Error response:', errorText);
            throw new Error(`HTTP ${res.status}: ${errorText}`);
          }
          
          const data = await res.json();
          const listsArray = Array.isArray(data) ? data : (data.lists || []);
          lst = listsArray.find((l: any) => l.listId === listId || l.id === listId);
        }
        
        if (!lst) {
          Alert.alert('Error', 'Lista no encontrada');
          return router.back();
        }

        // Normalizar items: pueden ser strings o objetos {itemId, content, completed}
        const normalizedItems = (lst.items || []).map((item: any) => 
          typeof item === 'string' 
            ? { content: item, completed: false } 
            : { 
                itemId: item.itemId,
                content: item.content, 
                completed: item.completed || false,
                order: item.order
              }
        );
        setItems(normalizedItems);
        setTagIds(lst.tagIds || []);
        setTagNames(lst.tagNames || lst.tags || []);
        setListName(lst.name || '');
        setCreatedFromTags(lst.createdFromTags || false);
        setIsLocked(!!lst.isLocked);
        setFullListData(lst);
        loadAvailableTags();
      } catch (err) {
        console.error('❌ Error loading list:', err);
        // Fallback a caché
        const cached = await loadListFromCache();
        if (cached) {
          const normalizedItems = (cached.items || []).map((item: any) => 
            typeof item === 'string' 
              ? { content: item, completed: false } 
              : { itemId: item.itemId, content: item.content, completed: item.completed || false, order: item.order }
          );
          setItems(normalizedItems);
          setTagIds(cached.tagIds || []);
          setTagNames(cached.tagNames || cached.tags || []);
          setListName(cached.name || '');
          setCreatedFromTags(cached.createdFromTags || false);
          setIsLocked(!!cached.isLocked);
          setFullListData(cached);
          loadAvailableTags();
        } else {
          Alert.alert('Error', 'No se pudo cargar la lista');
        }
      }
    })();
  }, [listId]);

  // Manejar animación del modal
  useEffect(() => {
    if (showItemInput) {
      // Animar entrada
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 1,
          duration: 200,
          useNativeDriver: true,
        }),
        Animated.spring(slideAnim, {
          toValue: 0,
          tension: 50,
          friction: 8,
          useNativeDriver: true,
        }),
      ]).start();
      
      // Focus con delay para esperar la animación
      setTimeout(() => {
        itemInputRef.current?.focus();
      }, 250);
    } else {
      // Animar salida
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: 150,
          useNativeDriver: true,
        }),
        Animated.timing(slideAnim, {
          toValue: 300,
          duration: 150,
          useNativeDriver: true,
        }),
      ]).start();
    }
  }, [showItemInput]);

  const handleAddItem = async () => {
    if (!newItem.trim()) {
      Alert.alert('Error', 'El elemento no puede estar vacío');
      return;
    }

    console.log('➕ Adding item to list:', { listId, newItem: newItem.trim() });
    const trimmedItem = newItem.trim();

    try {
      // Optimistic: agregar localmente
      const localItem = { content: trimmedItem, completed: false };
      setItems(prev => [...prev, localItem]);
      setNewItem('');
      setShowItemInput(false);

      setTimeout(() => {
        listRef.current?.scrollToEnd({ animated: true });
      }, 100);

      // Actualizar caché
      await updateListInCache({ items: [...items, localItem], updatedAt: new Date().toISOString() });

      if (!networkService.isConnected) {
        await offlineQueue.enqueue({
          url: `${API_BASE}/lists/items`,
          method: 'PATCH',
          body: { userId: 'user123', listId, newItem: trimmedItem },
          headers: { 'Content-Type': 'application/json' },
          description: `Agregar item a lista: "${trimmedItem.substring(0, 30)}"`,
        });
        return;
      }

      const res = await fetch(`${API_BASE}/lists/items`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user123', listId, newItem: trimmedItem }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Error al agregar elemento');
      }

      const data = await res.json();
      const { items: updated } = data;
      setItems(updated);
    } catch (err) {
      console.error('❌ Error adding item:', err);
      const errorMessage = err instanceof Error ? err.message : 'No se pudo agregar el elemento';
      Alert.alert('Error', errorMessage);
    }
  };

  const deleteItem = async (itemToDelete: string) => {
    console.log('🗑️ Eliminando item:', { listId, item: itemToDelete });
    
    try {
      // Optimistic: eliminar localmente
      const updatedItems = items.filter((i: any) => {
        const content = typeof i === 'string' ? i : i.content;
        return content !== itemToDelete;
      });
      setItems(updatedItems);
      await updateListInCache({ items: updatedItems, updatedAt: new Date().toISOString() });

      if (!networkService.isConnected) {
        await offlineQueue.enqueue({
          url: `${API_BASE}/lists/items`,
          method: 'DELETE',
          body: { userId: 'user123', listId, item: itemToDelete },
          headers: { 'Content-Type': 'application/json' },
          description: `Eliminar item de lista: "${itemToDelete.substring(0, 30)}"`,
        });
        return;
      }

      const res = await fetch(`${API_BASE}/lists/items`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user123', listId, item: itemToDelete }),
      });

      if (!res.ok) {
        const errorData = await res.json().catch(() => ({}));
        throw new Error(errorData.message || errorData.error || 'Error al eliminar elemento');
      }

      const data = await res.json();
      const { items: updated } = data;
      setItems(updated);
    } catch (err) {
      console.error('❌ Error deleting item:', err);
      const errorMessage = err instanceof Error ? err.message : 'No se pudo eliminar el elemento';
      Alert.alert('Error', errorMessage);
    }
  };

  // Toggle completed status
  const toggleItemCompleted = async (index: number) => {
    const item = items[index];
    const itemObj = typeof item === 'string' ? { content: item, completed: false } : item;
    const newCompletedState = !itemObj.completed;
    
    // Optimistic update
    const updatedItems = [...items];
    const updatedItem = typeof item === 'string' 
      ? { content: item, completed: newCompletedState } 
      : { ...itemObj, completed: newCompletedState };
    updatedItems[index] = updatedItem;
    setItems(updatedItems);
    
    // Actualizar caché
    await updateListInCache({ items: updatedItems, updatedAt: new Date().toISOString() });

    if (!networkService.isConnected) {
      // Encolar la operación apropiada
      if (itemObj.itemId) {
        await offlineQueue.enqueue({
          url: `${API_BASE}/lists/${listId}/items/${itemObj.itemId}`,
          method: 'PUT',
          body: { userId: 'user123', completed: newCompletedState },
          headers: { 'Content-Type': 'application/json' },
          description: `Toggle item: "${itemObj.content.substring(0, 30)}"`,
        });
      } else {
        await offlineQueue.enqueue({
          url: `${API_BASE}/lists/${listId}`,
          method: 'PUT',
          body: { ...fullListData, items: updatedItems, updatedAt: new Date().toISOString(), lastModifiedBy: 'user123' },
          headers: { 'Content-Type': 'application/json' },
          description: `Actualizar items de lista`,
        });
      }
      return;
    }

    // Actualizar en el servidor
    try {
      if (itemObj.itemId) {
        const res = await fetch(`${API_BASE}/lists/${listId}/items/${itemObj.itemId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId: 'user123',
            completed: newCompletedState,
          }),
        });
        
        if (!res.ok) throw new Error('Failed to update item');
        
        const updatedList = await res.json();
        setItems(updatedList.items || []);
        setFullListData(updatedList);
      } else {
        await updateListItems(updatedItems);
      }
      
      await cacheService.set('cache_lists', null, 0);
    } catch (err) {
      console.error('❌ Error updating item:', err);
      setItems(items);
      Alert.alert('Error', 'No se pudo actualizar el elemento');
    }
  };

  // Abrir modal de vista completa
  const openViewItem = (content: string) => {
    setViewingItem(content);
    setShowViewModal(true);
  };

  // Abrir modal de edición
  const openEditItem = (index: number, content: string) => {
    setEditingItem({ index, content });
    setEditContent(content);
    setShowEditModal(true);
  };

  // Guardar edición
  const saveEditItem = async () => {
    if (!editContent.trim() || editingItem === null) return;
    
    const updatedItems = [...items];
    const item = updatedItems[editingItem.index];
    const itemObj = typeof item === 'string' ? { content: item, completed: false } : item;
    itemObj.content = editContent.trim();
    updatedItems[editingItem.index] = itemObj;
    
    setItems(updatedItems);
    setShowEditModal(false);
    setEditingItem(null);
    setEditContent('');
    
    // Actualizar caché
    await updateListInCache({ items: updatedItems, updatedAt: new Date().toISOString() });

    if (!networkService.isConnected) {
      const { isLocked: _lock, ...listDataWithoutLock } = fullListData || {};
      await offlineQueue.enqueue({
        url: `${API_BASE}/lists/${listId}`,
        method: 'PUT',
        body: { ...listDataWithoutLock, items: updatedItems, updatedAt: new Date().toISOString(), lastModifiedBy: 'user123' },
        headers: { 'Content-Type': 'application/json' },
        description: `Editar item en lista`,
      });
      return;
    }

    try {
      await updateListItems(updatedItems);
    } catch (err) {
      console.error('Error updating item:', err);
      Alert.alert('Error', 'No se pudo actualizar el elemento');
    }
  };

  // Actualizar items en el servidor
  const updateListItems = async (updatedItems: any[]) => {
    const { isLocked: _lock, ...listDataWithoutLock } = fullListData || {};
    const res = await fetch(`${API_BASE}/lists/${listId}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        ...listDataWithoutLock,
        items: updatedItems,
        updatedAt: new Date().toISOString(),
        lastModifiedBy: 'user123'
      }),
    });
    
    if (!res.ok) throw new Error('Failed to update');
    const result = await res.json();
    setFullListData(result);
    
    // Invalidar caché de listas para que se actualice en la pantalla principal
    await cacheService.set('cache_lists', null, 0);
  };

  // Estadísticas
  const getStats = useMemo(() => {
    const normalizedItems = items.map(item => 
      typeof item === 'string' ? { content: item, completed: false } : item
    );
    const total = normalizedItems.length;
    const completed = normalizedItems.filter(i => i.completed).length;
    const pending = total - completed;
    const percentage = total > 0 ? Math.round((completed / total) * 100) : 0;
    return { total, completed, pending, percentage };
  }, [items]);

  // Filtrar items
  const getFilteredItems = useMemo(() => {
    const normalizedItems = items.map(item => 
      typeof item === 'string' ? { content: item, completed: false } : item
    );
    switch (filter) {
      case 'completed': return normalizedItems.filter(i => i.completed);
      case 'pending': return normalizedItems.filter(i => !i.completed);
      default: return normalizedItems;
    }
  }, [items, filter]);

  const loadAvailableTags = async () => {
    try {
      // Intentar obtener del caché primero
      const cachedTags = await cacheService.getTags();
      if (cachedTags) {
        setAvailableTags(cachedTags);
        console.log('✅ Tags cargados desde caché (list detail)');
        return;
      }

      // Si no hay caché, obtener del servidor
      const res = await fetch(`${API_BASE}/tags?userId=user123`);
      if (res.ok) {
        const tags = await res.json();
        setAvailableTags(tags);
        
        // Guardar en caché
        await cacheService.setTags(tags);
        console.log('✅ Tags guardados en caché (list detail)');
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
      
      const { isLocked: _lock, ...listDataWithoutLock } = fullListData || {};
      const updatedList = {
        ...listDataWithoutLock,
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
      const { isLocked: _lock, ...listDataWithoutLock } = fullListData || {};
      const updatedList = {
        ...listDataWithoutLock,
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

  const renderItem: ListRenderItem<{itemId?: string; content: string; completed?: boolean} | string> = ({ item, index }) => {
    const itemObj = typeof item === 'string' ? { content: item, completed: false } : item;
    const displayText = itemObj.content;
    const isCompleted = itemObj.completed || false;
    
    return (
    <HStack
      justifyContent="space-between"
      alignItems="center"
      sx={{ 
        mb: '$2', 
        px: '$3', 
        py: '$3', 
        bg: theme.card, 
        borderRadius: '$md',
        borderWidth: 1,
        borderColor: theme.border,
        opacity: isCompleted ? 0.6 : 1
      }}
    >
      {/* Checkbox */}
      <Pressable 
        onPress={() => toggleItemCompleted(index)}
        sx={{ marginRight: '$3' }}
      >
        <MaterialIcons 
          name={isCompleted ? "check-box" : "check-box-outline-blank"} 
          size={22} 
          color={isCompleted ? "#22c55e" : theme.text} 
        />
      </Pressable>

      {/* Texto - Clickeable para ver completo */}
      <Pressable 
        onPress={() => openViewItem(displayText)}
        sx={{ flex: 1, marginRight: '$3' }}
      >
        <Text 
          sx={{ 
            color: theme.text, 
            fontSize: '$md',
            textDecorationLine: isCompleted ? 'line-through' : 'none'
          }}
          numberOfLines={2}
        >
          {displayText}
        </Text>
      </Pressable>

      {/* Botones de acción */}
      <HStack sx={{ gap: '$2' }}>
        <Pressable 
          onPress={() => openEditItem(index, displayText)}
          sx={{
            padding: '$2',
            borderRadius: '$md',
            bg: 'rgba(59, 130, 246, 0.1)'
          }}
        >
          <MaterialIcons name="edit" size={18} color="#3b82f6" />
        </Pressable>
        
        <Pressable 
          onPress={() => deleteItem(displayText)}
          sx={{
            padding: '$2',
            borderRadius: '$md',
            bg: 'rgba(239, 68, 68, 0.1)'
          }}
        >
          <MaterialIcons name="delete" size={18} color="#ef4444" />
        </Pressable>
      </HStack>
    </HStack>
  );
  };

  const renderHeader = () => (
    <Box sx={{ px: '$4', pt: '$4' }}>
      {/* Estadísticas y Progreso */}
      {getStats.total > 0 && (
        <Box sx={{ mb: '$4', bg: theme.card, p: '$3', borderRadius: '$lg', borderWidth: 1, borderColor: theme.border }}>
          <HStack justifyContent="space-between" alignItems="center" sx={{ mb: '$2' }}>
            <Text sx={{ color: theme.text, fontSize: '$md', fontWeight: '600' }}>
              {getStats.completed} de {getStats.total} completados
            </Text>
            <Text sx={{ color: '$green500', fontSize: '$lg', fontWeight: 'bold' }}>
              {getStats.percentage}%
            </Text>
          </HStack>
          
          {/* Barra de progreso */}
          <Box sx={{ 
            height: 8, 
            bg: isDark ? '$gray700' : '$gray200', 
            borderRadius: '$full', 
            overflow: 'hidden' 
          }}>
            <Box sx={{ 
              height: '100%', 
              width: `${getStats.percentage}%`, 
              bg: '$green500',
              borderRadius: '$full'
            }} />
          </Box>
        </Box>
      )}

      {/* Filtros */}
      <HStack sx={{ mb: '$4', gap: '$2' }}>
        <Pressable
          onPress={() => setFilter('all')}
          sx={{
            flex: 1,
            py: '$2',
            px: '$3',
            borderRadius: '$md',
            bg: filter === 'all' ? '$blue500' : theme.card,
            borderWidth: 1,
            borderColor: filter === 'all' ? '$blue500' : theme.border,
            alignItems: 'center'
          }}
        >
          <Text sx={{ color: filter === 'all' ? '$white' : theme.text, fontSize: '$sm', fontWeight: '600' }}>
            Todos ({getStats.total})
          </Text>
        </Pressable>
        
        <Pressable
          onPress={() => setFilter('pending')}
          sx={{
            flex: 1,
            py: '$2',
            px: '$3',
            borderRadius: '$md',
            bg: filter === 'pending' ? '$orange500' : theme.card,
            borderWidth: 1,
            borderColor: filter === 'pending' ? '$orange500' : theme.border,
            alignItems: 'center'
          }}
        >
          <Text sx={{ color: filter === 'pending' ? '$white' : theme.text, fontSize: '$sm', fontWeight: '600' }}>
            Pendientes ({getStats.pending})
          </Text>
        </Pressable>
        
        <Pressable
          onPress={() => setFilter('completed')}
          sx={{
            flex: 1,
            py: '$2',
            px: '$3',
            borderRadius: '$md',
            bg: filter === 'completed' ? '$green500' : theme.card,
            borderWidth: 1,
            borderColor: filter === 'completed' ? '$green500' : theme.border,
            alignItems: 'center'
          }}
        >
          <Text sx={{ color: filter === 'completed' ? '$white' : theme.text, fontSize: '$sm', fontWeight: '600' }}>
            Completados ({getStats.completed})
          </Text>
        </Pressable>
      </HStack>

      {/* Etiquetas */}
      <HStack justifyContent="space-between" alignItems="center" sx={{ mb: '$3' }}>
        <Text sx={{ color: theme.text, fontSize: '$lg', fontWeight: 'bold' }}>
          Etiquetas
        </Text>
        <Text sx={{ color: theme.text, fontSize: '$sm', fontWeight: '600', opacity: 0.7 }}>
          {getFilteredItems.length} {getFilteredItems.length === 1 ? 'elemento' : 'elementos'}
        </Text>
      </HStack>
      <HStack sx={{ mb: '$4', flexWrap: 'wrap', gap: '$2' }}>
        {tagNames.length > 0 ? (
          tagNames.map((tagName, idx) => (
            <HStack
              key={tagIds[idx] || idx}
              alignItems="center"
              sx={{
                bg: '#3b82f6',
                borderRadius: '$full',
                minWidth: 50,
                height: '$7',
                px: '$3',
                justifyContent: 'center',
              }}
            >
              <Pressable onPress={() => selectTag(idx)}>
                <Text sx={{ color: '$white', fontSize: '$sm', fontWeight: '500' }}>{tagName}</Text>
              </Pressable>
              {selectedTag === idx && (
                <Pressable onPress={() => removeTag(idx)} sx={{ ml: '$2' }}>
                  <MaterialIcons name="close" size={14} color="#FFFFFF" />
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
            <MaterialIcons name="add" size={14} color="#FFFFFF" />
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
    </Box>
  );

  const renderFooter = () => null;

  // Función para refrescar lista creada desde etiquetas
  const refreshListFromTags = async () => {
    if (!createdFromTags) {
      Alert.alert('Error', 'Esta lista no fue creada desde etiquetas');
      return;
    }

    setIsRefreshing(true);
    try {
      console.log('🔄 Refreshing list from tags:', listId);
      const response = await fetch(`${API_BASE}/lists/${listId}/refresh-from-tags`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: 'user123' }),
      });

      console.log('📥 Response status:', response.status);

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        console.error('❌ Error response:', errorData);
        throw new Error(errorData.message || errorData.error || 'Error al refrescar la lista');
      }

      const result = await response.json();
      console.log('✅ Refresh result:', result);
      
      Alert.alert(
        'Lista actualizada',
        `Se agregaron ${result.addedCount || 0} nuevos pensamientos a la lista`
      );

      // Recargar la lista
      const url = `${API_BASE}/lists?userId=user123`;
      const res = await fetch(url);
      if (res.ok) {
        const data = await res.json();
        const listsArray = Array.isArray(data) ? data : (data.lists || []);
        const lst = listsArray.find((l: any) => l.listId === listId || l.id === listId);
        if (lst) {
          const normalizedItems = (lst.items || []).map((item: any) => 
            typeof item === 'string' 
              ? { content: item, completed: false } 
              : { 
                  itemId: item.itemId,
                  content: item.content, 
                  completed: item.completed || false,
                  order: item.order
                }
          );
          setItems(normalizedItems);
          setFullListData(lst);
        }
      }

      // Invalidar caché
      await cacheService.set('cache_lists', null, 0);
    } catch (err) {
      console.error('❌ Error refreshing list:', err);
      const errorMessage = err instanceof Error ? err.message : 'No se pudo refrescar la lista';
      Alert.alert('Error', errorMessage);
    } finally {
      setIsRefreshing(false);
    }
  };

  // Editar nombre de lista
  const startEditingName = () => {
    setTempName(listName);
    setEditingName(true);
  };

  const saveListName = async () => {
    if (!tempName.trim()) {
      Alert.alert('Error', 'El nombre no puede estar vacío');
      return;
    }

    const newName = tempName.trim();
    // Optimistic
    setListName(newName);
    setEditingName(false);
    await updateListInCache({ name: newName, updatedAt: new Date().toISOString() });

    if (!networkService.isConnected) {
      await offlineQueue.enqueue({
        url: `${API_BASE}/lists/${listId}`,
        method: 'PUT',
        body: { userId: 'user123', name: newName },
        headers: { 'Content-Type': 'application/json' },
        description: `Renombrar lista: "${newName.substring(0, 30)}"`,
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/lists/${listId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: 'user123',
          name: newName,
        }),
      });

      if (response.ok) {
        await cacheService.invalidateLists();
      } else {
        Alert.alert('Error', 'No se pudo actualizar el nombre');
      }
    } catch (err) {
      console.error('❌ Error updating list name:', err);
      Alert.alert('Error', 'No se pudo actualizar el nombre');
    }
  };

  const cancelEditingName = () => {
    setEditingName(false);
    setTempName('');
  };

  const toggleListLock = async () => {
    if (!listId) return;

    const nextLockedState = !isLocked;

    // Solo pedir huella al DESBLOQUEAR, no al bloquear
    if (!nextLockedState) {
      const authenticated = await authenticateWithBiometrics('Desactivar protección de lista');
      if (!authenticated) {
        Alert.alert('Acceso denegado', 'No se pudo verificar tu identidad biométrica.');
        return;
      }
    }

    // Optimistic
    setIsLocked(nextLockedState);
    setFullListData((prev: any) => (prev ? { ...prev, isLocked: nextLockedState } : prev));
    await updateListInCache({ isLocked: nextLockedState, updatedAt: new Date().toISOString() });

    const { isLocked: _prevLock, listId: _id, createdAt: _ca, ...restData } = fullListData || {};
    const payload = {
      ...restData,
      userId: 'user123',
      name: listName || fullListData?.name || 'Lista',
      items: items.map((item: any) => 
        typeof item === 'string' 
          ? { content: item } 
          : { itemId: item.itemId, content: item.content, completed: item.completed, order: item.order }
      ),
      isLocked: nextLockedState,
    };

    if (!networkService.isConnected) {
      await offlineQueue.enqueue({
        url: `${API_BASE}/lists/${listId}`,
        method: 'PUT',
        body: payload,
        headers: { 'Content-Type': 'application/json' },
        description: `Toggle lock lista: ${nextLockedState ? 'bloquear' : 'desbloquear'}`,
      });
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/lists/${listId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('❌ Lock update error:', response.status, errorText);
        // Revertir
        setIsLocked(!nextLockedState);
        throw new Error(`HTTP ${response.status}: ${errorText}`);
      }

      await cacheService.invalidateLists();
    } catch (err: any) {
      console.error('❌ Error toggling list lock:', err);
      Alert.alert('Error', err.message || 'No se pudo actualizar el bloqueo de la lista');
    }
  };

  return (
    <>
      <Stack.Screen 
        options={{ 
          title: listName || `Lista ${listId}`,
          headerRight: () => (
            <HStack sx={{ gap: '$2', mr: '$2' }}>
              {/* Botón de editar nombre */}
              <Pressable
                onPress={startEditingName}
                sx={{
                  p: '$2',
                }}
              >
                <MaterialIcons
                  name="edit"
                  size={22}
                  color={isDark ? '#FFFFFF' : '#000000'}
                />
              </Pressable>

              {/* Botón de bloqueo */}
              <Pressable
                onPress={toggleListLock}
                sx={{ p: '$2' }}
              >
                <MaterialIcons
                  name={isLocked ? 'lock' : 'lock-open'}
                  size={22}
                  color={isLocked ? '#f59e0b' : (isDark ? '#FFFFFF' : '#000000')}
                />
              </Pressable>

              {/* Botón de compartir */}
              <Pressable
                onPress={() => ClipboardService.shareList(listName, items)}
                sx={{ p: '$2' }}
              >
                <MaterialIcons
                  name="share"
                  size={22}
                  color={isDark ? '#FFFFFF' : '#000000'}
                />
              </Pressable>
              
              {/* Botón de refresh (solo para listas creadas desde tags) */}
              {createdFromTags && (
                <Pressable
                  onPress={refreshListFromTags}
                  disabled={isRefreshing}
                  sx={{
                    p: '$2',
                    opacity: isRefreshing ? 0.5 : 1,
                  }}
                >
                  <MaterialIcons
                    name="refresh"
                    size={22}
                    color={isDark ? '#FFFFFF' : '#000000'}
                  />
                </Pressable>
              )}
            </HStack>
          ),
        }} 
      />

      {/* Modal de editar nombre */}
      <Modal
        visible={editingName}
        transparent
        animationType="fade"
        onRequestClose={cancelEditingName}
      >
        <KeyboardAvoidingView 
          behavior="padding"
          style={{ flex: 1 }}
        >
          <Pressable
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              justifyContent: 'center',
              alignItems: 'center',
            }}
            onPress={cancelEditingName}
          >
            <Pressable
              style={{
                width: '85%',
                backgroundColor: theme.card,
                borderRadius: 12,
                padding: 20,
              }}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={{ color: theme.text, fontSize: 18, fontWeight: 'bold', marginBottom: 16 }}>
                Editar Nombre
              </Text>
              
              <TextInput
                value={tempName}
                onChangeText={setTempName}
                placeholder="Nombre de la lista"
                placeholderTextColor="rgba(255,255,255,0.5)"
                style={{
                  backgroundColor: theme.background,
                  color: theme.text,
                  borderWidth: 1,
                  borderColor: theme.border,
                  borderRadius: 8,
                  padding: 12,
                  fontSize: 16,
                  marginBottom: 20,
                }}
                autoFocus
              />

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={cancelEditingName}
                  style={{
                    flex: 1,
                    backgroundColor: 'rgba(107, 114, 128, 0.2)',
                    padding: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: theme.text, fontWeight: '600' }}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={saveListName}
                  style={{
                    flex: 1,
                    backgroundColor: '#3b82f6',
                    padding: 12,
                    borderRadius: 8,
                    alignItems: 'center',
                  }}
                >
                  <Text style={{ color: '#fff', fontWeight: '600' }}>Guardar</Text>
                </TouchableOpacity>
              </View>
            </Pressable>
          </Pressable>
        </KeyboardAvoidingView>
      </Modal>

      <Box sx={{ flex: 1, bg: theme.background }}>
        <FlatList
          ref={listRef}
          data={getFilteredItems}
          keyExtractor={(_, i) => i.toString()}
          renderItem={renderItem}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={{ paddingBottom: 100 }}
          showsVerticalScrollIndicator
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        />

        <Pressable
          onPress={() => {
            setShowItemInput(true);
            setTimeout(() => {
              itemInputRef.current?.focus();
            }, 300);
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
          <MaterialIcons name="add" size={28} color="#FFFFFF" />
        </Pressable>
      </Box>

      <Modal
        visible={showItemInput}
        transparent
        animationType="none"
        onRequestClose={() => {
          setShowItemInput(false);
          setNewItem('');
        }}
      >
        <KeyboardAvoidingView
          behavior="padding"
          style={{ flex: 1 }}
        >
          <Animated.View
            style={{
              flex: 1,
              backgroundColor: 'rgba(0,0,0,0.5)',
              opacity: fadeAnim,
            }}
          >
            <Pressable
              style={{ flex: 1 }}
              onPress={() => {
                setShowItemInput(false);
                setNewItem('');
              }}
            />
          </Animated.View>
          <Animated.View
            style={{
              transform: [{ translateY: slideAnim }],
            }}
          >
            <Box 
              sx={{ 
                bg: theme.card,
                px: '$4',
                py: '$4',
                borderTopLeftRadius: '$2xl',
                borderTopRightRadius: '$2xl',
                shadowColor: '$black',
                shadowOpacity: 0.3,
                shadowOffset: { width: 0, height: -4 },
                shadowRadius: 8,
              }}
            >
            <Text sx={{ color: theme.text, fontSize: '$lg', fontWeight: 'bold', mb: '$3' }}>
              Agregar elemento
            </Text>
            <HStack sx={{ gap: '$2', alignItems: 'center', mb: '$2' }}>
              <Box flex={1}>
                <TextInput
                  style={styles.newItemInput}
                  ref={itemInputRef}
                  value={newItem}
                  onChangeText={setNewItem}
                  onSubmitEditing={handleAddItem}
                  placeholder="Escribe el nuevo elemento..."
                  placeholderTextColor="rgba(255,255,255,0.6)"
                  returnKeyType="done"
                />
              </Box>
            </HStack>
            <HStack sx={{ gap: '$2', mt: '$2' }}>
              <Pressable
                onPress={() => {
                  setShowItemInput(false);
                  setNewItem('');
                }}
                sx={{
                  flex: 1,
                  bg: '$gray600',
                  py: '$3',
                  borderRadius: '$md',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text sx={{ color: '$white', fontWeight: '600' }}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={handleAddItem}
                sx={{
                  flex: 1,
                  bg: '$blue500',
                  py: '$3',
                  borderRadius: '$md',
                  justifyContent: 'center',
                  alignItems: 'center',
                }}
              >
                <Text sx={{ color: '$white', fontWeight: '600' }}>Agregar</Text>
              </Pressable>
            </HStack>
            </Box>
          </Animated.View>
        </KeyboardAvoidingView>
      </Modal>

      {/* Modal de vista completa */}
      <Modal
        visible={showViewModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowViewModal(false)}
      >
        <Pressable 
          onPress={() => setShowViewModal(false)}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.7)', padding: 20 }}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 450 }}>
            <Box sx={{ bg: theme.card, p: '$4', borderRadius: '$lg', maxHeight: MAX_LIST_HEIGHT }}>
              <HStack sx={{ justifyContent: 'space-between', alignItems: 'center', mb: '$3' }}>
                <Text sx={{ color: theme.text, fontSize: '$lg', fontWeight: 'bold', flex: 1 }}>
                  Contenido completo
                </Text>
                <Pressable onPress={() => setShowViewModal(false)} sx={{ ml: '$2' }}>
                  <MaterialIcons name="close" size={22} color={theme.text} />
                </Pressable>
              </HStack>
              
              <ScrollView style={{ maxHeight: MAX_LIST_HEIGHT - 120 }}>
                <Text style={{ 
                  color: theme.text, 
                  fontSize: 16, 
                  lineHeight: 24,
                  flexWrap: 'wrap'
                }}>
                  {viewingItem}
                </Text>
              </ScrollView>
            </Box>
          </Pressable>
        </Pressable>
      </Modal>

      {/* Modal de edición */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => {
          setShowEditModal(false);
          setEditingItem(null);
          setEditContent('');
        }}
      >
        <Pressable 
          onPress={() => {
            setShowEditModal(false);
            setEditingItem(null);
            setEditContent('');
          }}
          style={{ flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.5)', padding: 20 }}
        >
          <Pressable onPress={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: 450 }}>
            <Box sx={{ bg: theme.card, p: '$4', borderRadius: '$lg', maxHeight: MAX_LIST_HEIGHT }}>
              <Text sx={{ color: theme.text, fontSize: '$lg', fontWeight: 'bold', mb: '$3' }}>
                Editar elemento
              </Text>
              
              <ScrollView style={{ maxHeight: MAX_LIST_HEIGHT - 200 }}>
                <TextInput
                  style={[styles.editInput, { color: theme.text, borderColor: theme.border, minHeight: 120 }]}
                  value={editContent}
                  onChangeText={setEditContent}
                  placeholder="Contenido del elemento"
                  placeholderTextColor="rgba(255,255,255,0.5)"
                  multiline
                  textAlignVertical="top"
                />
              </ScrollView>

              <HStack sx={{ gap: '$2', mt: '$4' }}>
                <Pressable
                  onPress={() => {
                    setShowEditModal(false);
                    setEditingItem(null);
                    setEditContent('');
                  }}
                  sx={{
                    flex: 1,
                    bg: '$gray600',
                    py: '$3',
                    borderRadius: '$md',
                    justifyContent: 'center',
                    alignItems: 'center',
                  }}
                >
                  <Text sx={{ color: '$white', fontWeight: '600' }}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={saveEditItem}
                  disabled={!editContent.trim()}
                  sx={{
                    flex: 1,
                    bg: '$blue500',
                    py: '$3',
                    borderRadius: '$md',
                    justifyContent: 'center',
                    alignItems: 'center',
                    opacity: !editContent.trim() ? 0.5 : 1,
                  }}
                >
                  <Text sx={{ color: '$white', fontWeight: '600' }}>Guardar</Text>
                </Pressable>
              </HStack>
            </Box>
          </Pressable>
        </Pressable>
      </Modal>
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
  editInput: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 12,
    fontSize: 16,
    width: '100%',
  },
});
