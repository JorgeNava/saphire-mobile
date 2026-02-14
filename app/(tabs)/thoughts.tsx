import { TagSelector } from '@/components/tag-selector';
import { InputType, Message } from '@/types/message';
import { Ionicons } from '@expo/vector-icons';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    LayoutAnimation,
    Modal,
    Platform,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    UIManager,
    View,
    useColorScheme
} from 'react-native';
import { cacheService } from '../../services/cacheService';
import { networkService } from '../../services/networkService';
import { logger } from '../../utils/logger';

const API_BASE = 'https://zon9g6gx9k.execute-api.us-east-1.amazonaws.com';
const THOUGHTS_ENDPOINT = `${API_BASE}/thoughts`;

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

function toISOStringWithZ(date: Date) {
  return new Date(date).toISOString().split('.')[0] + 'Z';
}

export default function ThoughtsScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [usedAI, setUsedAI] = useState<boolean | null>(null);
  const [tags, setTags] = useState('');
  const [contentSearch, setContentSearch] = useState('');
  const [inputType, setInputType] = useState<InputType>('text');
  const userId = 'user123';

  // Estados para etiquetas (manejadas por TagSelector)
  const [availableTags, setAvailableTags] = useState<Array<{tagId: string; name: string}>>([]);

  // Estados para paginación
  const [limit, setLimit] = useState('50');
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showTagsInput, setShowTagsInput] = useState(false);
  const [totalThoughtsInDB, setTotalThoughtsInDB] = useState<number>(0);
  const [isLoadingTotal, setIsLoadingTotal] = useState(false);
  
  // Historial de lastKeys para navegar hacia atrás
  const [pageHistory, setPageHistory] = useState<Array<string | null>>([null]);
  
  // Estados para el modal de edición
  const [selectedThought, setSelectedThought] = useState<any>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const [dateFrom, setDateFrom] = useState<Date | null>(null);
  const [dateTo, setDateTo] = useState<Date | null>(null);
  const [lastUpdatedFrom, setLastUpdatedFrom] = useState<Date | null>(null);
  const [lastUpdatedTo, setLastUpdatedTo] = useState<Date | null>(null);
  const [showDateFilters, setShowDateFilters] = useState(false);

  const [pickerVisible, setPickerVisible] = useState<{
    field: string;
    show: boolean;
  }>({ field: '', show: false });

  // Estados para selección múltiple y conversión
  const [selectionMode, setSelectionMode] = useState(false);
  const [selectedThoughts, setSelectedThoughts] = useState<Set<string>>(new Set());
  const [showConvertToListModal, setShowConvertToListModal] = useState(false);
  const [showConvertToNoteModal, setShowConvertToNoteModal] = useState(false);
  const [convertListName, setConvertListName] = useState('');
  const [convertListTags, setConvertListTags] = useState('');
  const [convertNoteTitle, setConvertNoteTitle] = useState('');
  const [convertNoteTags, setConvertNoteTags] = useState('');
  const [thoughtToConvert, setThoughtToConvert] = useState<any>(null);
  const [isConverting, setIsConverting] = useState(false);
  const [addToExistingNote, setAddToExistingNote] = useState(false);
  const [availableNotes, setAvailableNotes] = useState<Array<{noteId: string; title: string}>>([]);
  const [selectedNoteId, setSelectedNoteId] = useState('');

  const theme = {
    background: isDark ? '#0A0E27' : '#F5F7FA',
    card: isDark ? '#1A1F3A' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1F3A',
    border: isDark ? '#2A2F4A' : '#E5E7EB',
  };

  // Helper para verificar si hay filtros activos
  const checkActiveFilters = () => Boolean(tags.trim() || dateFrom || contentSearch.trim());

  const showPicker = (field: string) => {
    setPickerVisible({ field, show: true });
  };

  const onChangeDate = (event: any, selectedDate?: Date) => {
    if (Platform.OS === 'android' && event?.type === 'dismissed') {
      setPickerVisible({ field: '', show: false });
      return;
    }

    if (selectedDate) {
      switch (pickerVisible.field) {
        case 'dateFrom':
          setDateFrom(selectedDate);
          break;
        case 'dateTo':
          setDateTo(selectedDate);
          break;
        case 'lastUpdatedFrom':
          setLastUpdatedFrom(selectedDate);
          break;
        case 'lastUpdatedTo':
          setLastUpdatedTo(selectedDate);
          break;
      }
    }

    setPickerVisible({ field: '', show: false });
  };

  const fetchMessages = async (applyFilters = true, resetPagination = false, customLastKey?: string | null, forceRefresh = false) => {
    setLoading(true);
    try {
      // IMPORTANTE: NO usar caché cuando hay filtros activos O cuando es refresh manual
      if (!applyFilters && !checkActiveFilters() && !forceRefresh) {
        const cachedThoughts = await cacheService.get('cache_thoughts');
        if (cachedThoughts && Array.isArray(cachedThoughts)) {
          setMessages(cachedThoughts as Message[]);
          logger.log('✅ Thoughts cargados desde caché');
          setLoading(false);
          return;
        }
      }

      // Sin internet: usar solo caché
      if (!networkService.isConnected) {
        const cachedThoughts = await cacheService.get('cache_thoughts');
        if (cachedThoughts && Array.isArray(cachedThoughts)) {
          setMessages(cachedThoughts as Message[]);
        }
        setLoading(false);
        return;
      }

      const params = new URLSearchParams();
      params.append('userId', userId);
      params.append('limit', limit || '50');
      params.append('sortOrder', 'desc');

      // Usar customLastKey si se proporciona, sino usar el del estado
      const keyToUse = customLastKey !== undefined ? customLastKey : lastKey;

      // Agregar lastKey para paginación SOLO si NO estamos reseteando
      if (keyToUse && !resetPagination) {
        params.append('lastKey', keyToUse);
        logger.log('🔑 Usando lastKey:', keyToUse);
      } else {
        logger.log('🔑 Sin lastKey (página 1)');
      }

      if (applyFilters) {
        if (contentSearch.trim()) {
          params.append('searchTerm', contentSearch.trim());
        }
        // Thoughts solo soporta: tagIds, tagSource, createdAt, searchTerm
        if (tags.trim()) {
          // ✅ Convertir nombres de tags a tagIds para evitar falsos positivos
          const tagNamesArray = tags.split(',').map(t => t.trim()).filter(Boolean);
          const tagIdsArray: string[] = [];
          
          // Verificar que availableTags esté cargado
          if (!availableTags || availableTags.length === 0) {
            console.warn('⚠️ availableTags no está cargado, usando tagNames como fallback');
            params.append('tagNames', tags.trim());
          } else {
            // Buscar tagIds correspondientes a los nombres ingresados
            for (const tagName of tagNamesArray) {
              const matchingTag = availableTags.find(
                tag => tag.name.toLowerCase() === tagName.toLowerCase()
              );
              if (matchingTag) {
                tagIdsArray.push(matchingTag.tagId);
              }
            }
            
            if (tagIdsArray.length > 0) {
              params.append('tagIds', tagIdsArray.join(','));
              logger.log('🏷️ Filtrando por tags:', tagNamesArray.join(', '));
              logger.log('🔑 Tag IDs:', tagIdsArray.join(', '));
            } else {
              console.warn('⚠️ No se encontraron tagIds para los nombres:', tagNamesArray);
              console.warn('⚠️ Usando tagNames como fallback');
              params.append('tagNames', tags.trim());
            }
          }
        }
        if (dateFrom) params.append('createdAt', toISOStringWithZ(dateFrom));
        // Nota: Thoughts no tiene inputType ni usedAI
      }

      const url = `${THOUGHTS_ENDPOINT}?${params.toString()}`;
      logger.log('🔍 Fetching:', url);
      logger.log('📋 Parámetros de filtro:', {
        tags: tags.trim() || 'ninguno',
        dateFrom: dateFrom || 'ninguno',
        usingTagIds: url.includes('tagIds=')
      });
      const res = await fetch(url);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Error response:', errorText);
        console.error('❌ Status code:', res.status);
        console.error('❌ URL que falló:', url);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      logger.log('📦 Respuesta del backend:', {
        totalItems: data.items?.length || 0,
        hasMore: data.hasMore,
        lastKey: data.lastKey ? 'presente' : 'null',
        count: data.count
      });
      
      // NUEVO: API ahora retorna objeto paginado con { items, count, hasMore, lastKey }
      let thoughtsArray = (data.items || []).sort((a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      
      // Filtrado por contenido del lado del cliente (solo si applyFilters=true)
      if (applyFilters && contentSearch.trim()) {
        const searchLower = contentSearch.trim().toLowerCase();
        thoughtsArray = thoughtsArray.filter((t: any) =>
          (t.content || '').toLowerCase().includes(searchLower)
        );
      }
      
      setMessages(thoughtsArray);
      
      // Actualizar estado de paginación
      const newLastKey = data.lastKey || null;
      setLastKey(newLastKey);
      setHasMore(data.hasMore || false);
      
      // Si estamos avanzando y hay un nuevo lastKey, agregarlo al historial
      if (newLastKey && !resetPagination && !pageHistory.includes(newLastKey)) {
        setPageHistory(prev => [...prev, newLastKey]);
      }
      
      // Si estamos reseteando, limpiar el historial
      if (resetPagination) {
        setPageHistory([null]);
      }

      // Guardar en caché solo si no hay filtros activos
      if (!checkActiveFilters()) {
        await cacheService.set('cache_thoughts', thoughtsArray, 2 * 60 * 1000); // 2 minutos
        logger.log('✅ Thoughts guardados en caché');
      } else {
        logger.log('🔍 Resultados filtrados (no se guardan en caché)');
      }
    } catch (err) {
      console.error('❌ Error fetching thoughts:', err);
    } finally {
      setLoading(false);
    }
  };

  // Cargar total de pensamientos en BD (solo una vez)
  const fetchTotalThoughts = async () => {
    // Evitar múltiples ejecuciones simultáneas
    if (isLoadingTotal) {
      logger.log('⏳ Ya se está cargando el total, saltando...');
      return;
    }
    
    setIsLoadingTotal(true);
    logger.log('🔄 Iniciando cálculo del total de pensamientos...');
    
    try {
      let total = 0;
      let currentLastKey = null;
      let currentHasMore = true;
      let pageCount = 0;
      
      while (currentHasMore) {
        pageCount++;
        const params = new URLSearchParams();
        params.append('userId', userId);
        params.append('limit', '100'); // Usar límite alto para contar más rápido
        params.append('sortOrder', 'desc');
        if (currentLastKey) params.append('lastKey', currentLastKey);
        
        const countRes = await fetch(`${THOUGHTS_ENDPOINT}?${params.toString()}`);
        if (countRes.ok) {
          const countData = await countRes.json();
          const itemsCount = (countData.items || []).length;
          total += itemsCount;
          currentLastKey = countData.lastKey;
          currentHasMore = countData.hasMore || false;
          
          logger.log(`📄 Página ${pageCount}: ${itemsCount} items (Total acumulado: ${total})`);
        } else {
          console.error('❌ Error en página', pageCount);
          break;
        }
      }
      
      setTotalThoughtsInDB(total);
      logger.log(`✅ Total FINAL de pensamientos en BD: ${total}`);
    } catch (err) {
      console.error('❌ Error fetching total thoughts:', err);
    } finally {
      setIsLoadingTotal(false);
    }
  };

  // Cargar etiquetas y total solo una vez al inicio
  useEffect(() => {
    const loadTags = async () => {
      try {
        logger.log('📦 Cargando etiquetas disponibles...');
        const res = await fetch(`${API_BASE}/tags?userId=${userId}&limit=1000`);
        if (res.ok) {
          const data = await res.json();
          // Soportar tanto array directo como objeto paginado
          const tagsArray = Array.isArray(data) ? data : (data.items || []);
          logger.log('✅ Etiquetas cargadas:', tagsArray.length);
          setAvailableTags(tagsArray);
        } else {
          console.error('❌ Error al cargar etiquetas:', res.status);
        }
      } catch (err) {
        console.error('❌ Error loading tags:', err);
      }
    };
    
    loadTags();
    
    // Cargar total de pensamientos (solo una vez al inicio)
    // No se vuelve a calcular con filtros
    fetchTotalThoughts();
  }, []); // Array vacío = solo se ejecuta una vez

  // Background sync para pensamientos
  useEffect(() => {
    cacheService.startThoughtsSync(async () => {
      const res = await fetch(`${THOUGHTS_ENDPOINT}?userId=${userId}&limit=50&sortOrder=desc`);
      const data = await res.json();
      const thoughtsArray = (data.items || []).sort((a: any, b: any) =>
        new Date(b.createdAt || 0).getTime() - new Date(a.createdAt || 0).getTime()
      );
      // Solo actualizar si los datos cambiaron
      setMessages(prev => {
        const prevIds = prev.map((m: any) => (m.thoughtId || m.messageId) + (m.updatedAt || '')).join(',');
        const newIds = thoughtsArray.map((m: any) => (m.thoughtId || m.messageId) + (m.updatedAt || '')).join(',');
        return prevIds === newIds ? prev : thoughtsArray;
      });
      return thoughtsArray;
    });

    return () => {
      cacheService.stopBackgroundSync('cache_thoughts');
    };
  }, []);

  // Callback cuando TagSelector carga las etiquetas
  const handleTagsLoaded = (loadedTags: Array<{tagId: string; name: string}>) => {
    setAvailableTags(loadedTags);
    logger.log('✅ Tags cargados:', loadedTags.length);
  };

  // Cargar mensajes al montar y cuando el usuario regresa (con cooldown de 30s)
  useFocusEffect(
    useCallback(() => {
      if (cacheService.shouldFetch('thoughts', 30000)) {
        fetchMessages(false);
        cacheService.markFetched('thoughts');
      }
    }, [])
  );

  const toggleInputType = () => {
    setInputType((prev) => (prev === 'audio' ? 'text' : 'audio'));
  };

  const toggleUsedAI = () => {
    setUsedAI((prev) => (prev === null ? true : prev === true ? false : null));
  };

  const toggleDateFilters = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowDateFilters(!showDateFilters);
  };

  const formatDateDisplay = (date: Date | null) =>
    date ? toISOStringWithZ(date) : 'Seleccionar fecha';

  // Funciones de paginación
  const goToNextPage = () => {
    if (hasMore && lastKey) {
      setCurrentPage(prev => prev + 1);
      // NO resetear paginación, usar lastKey existente
      fetchMessages(true, false);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      const newPage = currentPage - 1;
      
      // Obtener el lastKey de la página anterior del historial
      const previousLastKey = pageHistory[newPage - 1] || null;
      
      logger.log(`⬅️ Retrocediendo a página ${newPage}, lastKey:`, previousLastKey);
      logger.log('📚 Historial actual:', pageHistory);
      
      // Actualizar estados
      setCurrentPage(newPage);
      setLastKey(previousLastKey);
      
      // Remover el último elemento del historial
      setPageHistory(prev => prev.slice(0, -1));
      
      // Hacer fetch con el lastKey de la página anterior (pasarlo directamente)
      fetchMessages(true, false, previousLastKey);
    }
  };

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setLastKey(null);
    setPageHistory([null]);
    logger.log('🔄 Pull-to-refresh: Cargando desde backend...');
    await fetchMessages(true, true, null, true); // forceRefresh = true
    setRefreshing(false);
  };

  const toggleTags = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setShowTagsInput(!showTagsInput);
  };

  // Abrir modal de edición
  const openEditModal = (thought: any) => {
    setSelectedThought(thought);
    setEditContent(thought.content || '');
    setEditTags((thought.tagNames || []).join(', '));
    setShowEditModal(true);
  };

  // Cerrar modal
  const closeEditModal = () => {
    setShowEditModal(false);
    setSelectedThought(null);
    setEditContent('');
    setEditTags('');
  };

  // Guardar cambios
  const saveThought = async () => {
    if (!selectedThought) return;
    
    setIsSaving(true);
    try {
      const thoughtId = selectedThought.thoughtId;
      const tagArray = editTags.split(',').map(t => t.trim()).filter(t => t);
      
      logger.log('📤 Actualizando pensamiento:', {
        thoughtId,
        content: editContent,
        tags: tagArray
      });
      
      const response = await fetch(`${THOUGHTS_ENDPOINT}/${thoughtId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId: userId,
          content: editContent,
          tags: tagArray,
          tagSource: 'Manual',
        }),
      });

      if (response.ok) {
        logger.log('✅ Pensamiento actualizado');
        // Actualizar localmente sin re-fetch para mantener el orden
        const updatedThought = await response.json();
        setMessages(prev => prev.map(m =>
          (m as any).thoughtId === thoughtId ? { ...m, ...updatedThought } : m
        ));
        await cacheService.set('cache_thoughts', null, 0);
        closeEditModal();
      } else {
        const error = await response.text();
        console.error('❌ Error al actualizar:', error);
        alert('Error al actualizar el pensamiento');
      }
    } catch (err) {
      console.error('❌ Error:', err);
      alert('Error al actualizar el pensamiento');
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar pensamiento
  const deleteThought = async () => {
    if (!selectedThought) return;
    
    Alert.alert(
      'Eliminar pensamiento',
      '¿Estás seguro de eliminar este pensamiento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const thoughtId = selectedThought.thoughtId;
              const response = await fetch(`${THOUGHTS_ENDPOINT}/${thoughtId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                logger.log('✅ Pensamiento eliminado');
                // Eliminar localmente sin re-fetch para mantener el orden
                setMessages(prev => prev.filter(m => (m as any).thoughtId !== thoughtId));
                await cacheService.set('cache_thoughts', null, 0);
                closeEditModal();
              } else {
                const error = await response.text();
                console.error('❌ Error al eliminar:', error);
                Alert.alert('Error', 'No se pudo eliminar el pensamiento');
              }
            } catch (err) {
              console.error('❌ Error:', err);
              Alert.alert('Error', 'No se pudo eliminar el pensamiento');
            } finally {
              setIsDeleting(false);
            }
          },
        },
      ]
    );
  };

  // Funciones de selección múltiple
  const toggleSelectionMode = () => {
    setSelectionMode(!selectionMode);
    setSelectedThoughts(new Set());
  };

  const toggleThoughtSelection = (thoughtId: string) => {
    const newSelection = new Set(selectedThoughts);
    if (newSelection.has(thoughtId)) {
      newSelection.delete(thoughtId);
    } else {
      newSelection.add(thoughtId);
    }
    setSelectedThoughts(newSelection);
  };

  // Eliminar pensamientos seleccionados
  const deleteSelectedThoughts = async () => {
    if (selectedThoughts.size === 0) {
      Alert.alert('Error', 'Selecciona al menos un pensamiento');
      return;
    }

    Alert.alert(
      'Confirmar eliminación',
      `¿Estás seguro de eliminar ${selectedThoughts.size} ${selectedThoughts.size === 1 ? 'pensamiento' : 'pensamientos'}?`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setIsDeleting(true);
            try {
              const thoughtIds = Array.from(selectedThoughts);
              let deletedCount = 0;
              let failedCount = 0;

              // Eliminar cada pensamiento
              for (const thoughtId of thoughtIds) {
                try {
                  const response = await fetch(`${THOUGHTS_ENDPOINT}/${thoughtId}`, {
                    method: 'DELETE',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({ userId })
                  });

                  if (response.ok) {
                    deletedCount++;
                  } else {
                    failedCount++;
                    console.error(`Error al eliminar pensamiento ${thoughtId}:`, response.status);
                  }
                } catch (err) {
                  failedCount++;
                  console.error(`Error al eliminar pensamiento ${thoughtId}:`, err);
                }
              }

              // Mostrar resultado
              if (deletedCount > 0) {
                Alert.alert(
                  'Éxito',
                  `${deletedCount} ${deletedCount === 1 ? 'pensamiento eliminado' : 'pensamientos eliminados'}${failedCount > 0 ? `\n${failedCount} fallaron` : ''}`
                );
                
                // Invalidar caché y recargar
                await cacheService.set('cache_thoughts', null, 0);
                setSelectedThoughts(new Set());
                setSelectionMode(false);
                fetchMessages(true, true);
              } else {
                Alert.alert('Error', 'No se pudo eliminar ningún pensamiento');
              }
            } catch (err) {
              console.error('Error al eliminar pensamientos:', err);
              Alert.alert('Error', 'Ocurrió un error al eliminar los pensamientos');
            } finally {
              setIsDeleting(false);
            }
          }
        }
      ]
    );
  };

  // Convertir pensamientos seleccionados a lista
  const openConvertToListModal = () => {
    if (selectedThoughts.size === 0) {
      Alert.alert('Error', 'Selecciona al menos un pensamiento');
      return;
    }
    if (selectedThoughts.size > 50) {
      Alert.alert('Error', 'Máximo 50 pensamientos permitidos');
      return;
    }
    setShowConvertToListModal(true);
  };

  const convertToList = async () => {
    if (!convertListName.trim()) {
      Alert.alert('Error', 'Ingresa un nombre para la lista');
      return;
    }

    setIsConverting(true);
    try {
      const thoughtIds = Array.from(selectedThoughts);
      const tags = convertListTags.split(',').map(t => t.trim()).filter(t => t);

      // Usar endpoint especializado del backend
      const response = await fetch(`${API_BASE}/lists/from-thoughts`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          thoughtIds,
          listName: convertListName,
          tags,
        }),
      });

      if (response.ok) {
        const list = await response.json();
        logger.log('✅ Lista creada:', list);
        // Invalidar caché de listas
        await cacheService.set('cache_lists', null, 0);
        Alert.alert('Éxito', `Lista "${list.name}" creada con ${thoughtIds.length} pensamientos`);
        setShowConvertToListModal(false);
        setConvertListName('');
        setConvertListTags('');
        setSelectedThoughts(new Set());
        setSelectionMode(false);
      } else {
        const error = await response.json();
        console.error('❌ Error:', error);
        Alert.alert('Error', error.message || 'No se pudo crear la lista');
      }
    } catch (err) {
      console.error('❌ Error:', err);
      Alert.alert('Error', 'No se pudo crear la lista');
    } finally {
      setIsConverting(false);
    }
  };

  // Convertir pensamiento individual a nota
  const openConvertToNoteModal = async (thought: any) => {
    setThoughtToConvert(thought);
    setConvertNoteTitle('');
    setConvertNoteTags((thought.tagNames || []).join(', '));
    setAddToExistingNote(false);
    setSelectedNoteId('');
    
    // Cargar notas disponibles
    try {
      const response = await fetch(`${API_BASE}/notes?userId=${userId}&limit=50&sortOrder=desc`);
      if (response.ok) {
        const data = await response.json();
        const notesArray = data.items || [];
        setAvailableNotes(notesArray.map((n: any) => ({
          noteId: n.noteId,
          title: n.title
        })));
      }
    } catch (err) {
      console.error('Error loading notes:', err);
    }
    
    setShowConvertToNoteModal(true);
  };

  const convertToNote = async () => {
    if (!thoughtToConvert) return;

    // Validar si se está agregando a nota existente
    if (addToExistingNote && !selectedNoteId) {
      Alert.alert('Error', 'Selecciona una nota');
      return;
    }

    setIsConverting(true);
    try {
      if (addToExistingNote) {
        // Agregar a nota existente
        logger.log('📝 Adding thought to note:', {
          noteId: selectedNoteId,
          thoughtId: thoughtToConvert.thoughtId,
          userId
        });

        const response = await fetch(`${API_BASE}/notes/${selectedNoteId}/add-thought`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            thoughtId: thoughtToConvert.thoughtId,
          }),
        });

        logger.log('📥 Response status:', response.status);

        if (response.ok) {
          const result = await response.json();
          logger.log('✅ Pensamiento agregado a nota:', result);
          await cacheService.set('cache_notes', null, 0);
          Alert.alert('Éxito', 'Pensamiento agregado a la nota');
          setShowConvertToNoteModal(false);
          setThoughtToConvert(null);
        } else {
          const errorData = await response.json().catch(() => ({}));
          console.error('❌ Error response:', {
            status: response.status,
            statusText: response.statusText,
            error: errorData
          });
          Alert.alert(
            'Error', 
            errorData.message || errorData.error || `Error ${response.status}: No se pudo agregar a la nota`
          );
        }
      } else {
        // Crear nota nueva
        const tags = convertNoteTags.split(',').map(t => t.trim()).filter(t => t);
        
        const response = await fetch(`${API_BASE}/notes/from-thought`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            thoughtId: thoughtToConvert.thoughtId,
            title: convertNoteTitle.trim() || undefined,
            tags: tags.length > 0 ? tags : undefined,
          }),
        });

        if (response.ok) {
          const note = await response.json();
          logger.log('✅ Nota creada:', note);
          await cacheService.set('cache_notes', null, 0);
          Alert.alert('Éxito', `Nota "${note.title}" creada exitosamente`);
          setShowConvertToNoteModal(false);
          setConvertNoteTitle('');
          setConvertNoteTags('');
          setThoughtToConvert(null);
        } else {
          const error = await response.json();
          console.error('❌ Error:', error);
          Alert.alert('Error', error.message || 'No se pudo crear la nota');
        }
      }
    } catch (err) {
      console.error('❌ Error:', err);
      Alert.alert('Error', 'No se pudo procesar la solicitud');
    } finally {
      setIsConverting(false);
    }
  };

  const getPickerValue = (): Date => {
    switch (pickerVisible.field) {
      case 'dateFrom': return dateFrom ?? new Date();
      case 'dateTo': return dateTo ?? new Date();
      case 'lastUpdatedFrom': return lastUpdatedFrom ?? new Date();
      case 'lastUpdatedTo': return lastUpdatedTo ?? new Date();
      default: return new Date();
    }
  };

  const thoughtKeyExtractor = useCallback(
    (item: Message) => (item as any).thoughtId || item.messageId || (item as any).id || `thought-${(item as any).createdAt}`,
    []
  );

  const renderThoughtItem = useCallback(({ item }: { item: Message }) => {
    const thought = item as any;
    const content = thought.content || thought.originalContent || 'Sin contenido';
    const thoughtTags = thought.tagNames || [];
    
    return (
      <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
          {selectionMode && (
            <TouchableOpacity
              onPress={() => toggleThoughtSelection(thought.thoughtId)}
              style={{ marginRight: 12, marginTop: 2 }}
            >
              <Ionicons
                name={selectedThoughts.has(thought.thoughtId) ? "checkbox" : "square-outline"}
                size={24}
                color={selectedThoughts.has(thought.thoughtId) ? '#3b82f6' : theme.text}
              />
            </TouchableOpacity>
          )}

          <TouchableOpacity 
            onPress={() => !selectionMode && openEditModal(thought)}
            style={{ flex: 1 }}
          >
            <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 8 }}>
              {content}
            </Text>
            
            {thoughtTags.length > 0 && (
              <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                {thoughtTags.map((tag: string, index: number) => (
                  <View 
                    key={index}
                    style={{ 
                      backgroundColor: theme.border, 
                      paddingHorizontal: 8, 
                      paddingVertical: 4, 
                      borderRadius: 12,
                      marginRight: 6,
                      marginBottom: 4
                    }}
                  >
                    <Text style={{ color: theme.text, fontSize: 12 }}>
                      {tag}
                    </Text>
                  </View>
                ))}
              </View>
            )}
            
            {thought.tagSource && (
              <Text style={{ color: theme.text, fontSize: 12, fontStyle: 'italic', marginBottom: 4 }}>
                Origen tags: {thought.tagSource}
              </Text>
            )}
            
            {thought.createdAt && (
              <Text style={{ color: theme.text, fontSize: 12, opacity: 0.7 }}>
                {new Date(thought.createdAt).toLocaleString('es-MX', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                  hour: '2-digit',
                  minute: '2-digit'
                })}
              </Text>
            )}
          </TouchableOpacity>

          {!selectionMode && (
            <TouchableOpacity
              onPress={() => openConvertToNoteModal(thought)}
              style={{ marginLeft: 8, padding: 8 }}
            >
              <Ionicons name="document-text-outline" size={20} color="#3b82f6" />
            </TouchableOpacity>
          )}
        </View>
      </View>
    );
  }, [theme, selectionMode, selectedThoughts]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
        <Text style={[styles.title, { color: theme.text, marginBottom: 0 }]}>Pensamientos</Text>
        <TouchableOpacity
          onPress={toggleSelectionMode}
          style={[styles.selectionButton, { backgroundColor: selectionMode ? '#3b82f6' : theme.card, borderColor: theme.border }]}
        >
          <Ionicons name={selectionMode ? "checkmark-circle" : "checkmark-circle-outline"} size={20} color={selectionMode ? '#fff' : theme.text} />
          <Text style={{ color: selectionMode ? '#fff' : theme.text, fontSize: 14, fontWeight: '600', marginLeft: 6 }}>
            {selectionMode ? 'Cancelar' : 'Seleccionar'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Botones flotantes de acción */}
      {selectionMode && selectedThoughts.size > 0 && (
        <View style={styles.floatingActionsContainer}>
          {/* Botón de eliminar */}
          <TouchableOpacity
            onPress={deleteSelectedThoughts}
            disabled={isDeleting}
            style={[
              styles.floatingActionButton,
              { 
                backgroundColor: isDeleting ? '#9CA3AF' : '#EF4444',
                flex: 1
              }
            ]}
          >
            <Ionicons name="trash" size={22} color="#fff" />
            <Text style={styles.floatingButtonText}>
              {isDeleting ? 'Eliminando...' : `Eliminar (${selectedThoughts.size})`}
            </Text>
          </TouchableOpacity>

          {/* Botón de convertir a lista */}
          <TouchableOpacity
            onPress={openConvertToListModal}
            style={[
              styles.floatingActionButton,
              { 
                backgroundColor: '#3b82f6',
                flex: 1
              }
            ]}
          >
            <Ionicons name="list" size={22} color="#fff" />
            <Text style={styles.floatingButtonText}>
              Crear Lista ({selectedThoughts.size})
            </Text>
          </TouchableOpacity>
        </View>
      )}

      <View style={styles.filters}>
        {/* Header con contadores */}
        <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 }}>
          <View>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
              Total de {totalThoughtsInDB} {totalThoughtsInDB === 1 ? 'pensamiento' : 'pensamientos'}
            </Text>
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 2 }}>
              Mostrando {messages.length} en esta página
            </Text>
          </View>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ color: theme.text, fontSize: 12 }}>Límite:</Text>
            <TextInput
              value={limit}
              onChangeText={setLimit}
              keyboardType="number-pad"
              style={[styles.limitInput, { color: theme.text, backgroundColor: theme.card, borderColor: theme.border }]}
            />
          </View>
        </View>

        {/* Búsqueda por contenido */}
        <View style={{
          flexDirection: 'row',
          alignItems: 'center',
          backgroundColor: theme.card,
          borderRadius: 12,
          borderWidth: 1,
          borderColor: theme.border,
          paddingHorizontal: 12,
          marginBottom: 12,
        }}>
          <Ionicons name="search" size={18} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
          <TextInput
            value={contentSearch}
            onChangeText={setContentSearch}
            placeholder="Buscar por contenido..."
            placeholderTextColor={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'}
            style={{
              flex: 1,
              color: theme.text,
              fontSize: 14,
              paddingVertical: 10,
              paddingHorizontal: 8,
            }}
            returnKeyType="search"
            onSubmitEditing={() => {
              setLastKey(null);
              setCurrentPage(1);
              fetchMessages(true, true);
            }}
          />
          {contentSearch.length > 0 && (
            <TouchableOpacity onPress={() => {
              setContentSearch('');
              setTags('');
              setDateFrom(null);
              setLastKey(null);
              setCurrentPage(1);
              setPageHistory([null]);
              fetchMessages(false, true, null, true);
            }}>
              <Ionicons name="close-circle" size={18} color={isDark ? 'rgba(255,255,255,0.4)' : 'rgba(0,0,0,0.4)'} />
            </TouchableOpacity>
          )}
        </View>

        {/* Selector de etiquetas */}
        <TagSelector
          value={tags}
          onChangeText={setTags}
          mode="toggle"
          userId={userId}
          initiallyVisible={showTagsInput}
          availableTags={availableTags}
          onTagsLoaded={handleTagsLoaded}
          toggleButtonText="Filtrar por etiquetas"
          title="Etiquetas"
          containerStyle={{ marginBottom: 12 }}
          customTheme={{
            card: theme.card,
            text: theme.text,
            border: theme.border,
            primary: '#3b82f6'
          }}
        />

        {/* Botón aplicar filtros */}
        <TouchableOpacity 
          onPress={() => {
            // Resetear paginación al aplicar filtros
            setLastKey(null);
            setCurrentPage(1);
            fetchMessages(true, true); // true = aplicar filtros, true = resetear paginación
          }}
          style={[styles.applyButton, { backgroundColor: '#3b82f6' }]}
        >
          <Text style={{ color: '#fff', fontWeight: '600' }}>Aplicar filtros</Text>
        </TouchableOpacity>

        {/* Controles de paginación */}
        <View style={styles.paginationContainer}>
          <TouchableOpacity 
            onPress={goToPreviousPage}
            disabled={currentPage === 1}
            style={[styles.paginationButton, { opacity: currentPage === 1 ? 0.5 : 1, backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={{ color: theme.text }}>← Anterior</Text>
          </TouchableOpacity>
          
          <Text style={{ color: theme.text, fontWeight: '600' }}>Página {currentPage}</Text>
          
          <TouchableOpacity 
            onPress={goToNextPage}
            disabled={!hasMore}
            style={[styles.paginationButton, { opacity: !hasMore ? 0.5 : 1, backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={{ color: theme.text }}>Siguiente →</Text>
          </TouchableOpacity>
        </View>
      </View>

      {pickerVisible.show && (
        <DateTimePicker
          value={getPickerValue()}
          mode="datetime"
          display={Platform.OS === 'ios' ? 'inline' : 'spinner'}
          onChange={onChangeDate}
        />
      )}

      {loading ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={messages}
          keyExtractor={thoughtKeyExtractor}
          contentContainerStyle={{ paddingBottom: 50 }}
          refreshControl={
            <RefreshControl
              refreshing={refreshing}
              onRefresh={onRefresh}
              tintColor="#3b82f6"
              colors={['#3b82f6']}
            />
          }
          renderItem={renderThoughtItem}
        />
      )}

      {/* Modal de edición */}
      <Modal
        visible={showEditModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeEditModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            {/* Header */}
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>Editar Pensamiento</Text>
              <TouchableOpacity onPress={closeEditModal}>
                <Text style={{ color: theme.text, fontSize: 24 }}>✕</Text>
              </TouchableOpacity>
            </View>

            {/* Contenido */}
            <ScrollView style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: theme.text }]}>Contenido:</Text>
              <TextInput
                value={editContent}
                onChangeText={setEditContent}
                multiline
                numberOfLines={4}
                style={[styles.modalTextArea, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                placeholderTextColor="rgba(255,255,255,0.5)"
              />

              <Text style={[styles.modalLabel, { color: theme.text, marginTop: 16 }]}>Etiquetas:</Text>
              <TagSelector
                value={editTags}
                onChangeText={setEditTags}
                mode="inline"
                userId={userId}
                availableTags={availableTags}
                containerStyle={{ marginBottom: 0 }}
                customTheme={{
                  card: theme.background,
                  text: theme.text,
                  border: theme.border,
                  primary: '#3b82f6'
                }}
              />
            </ScrollView>

            {/* Botones */}
            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={deleteThought}
                disabled={isDeleting}
                style={[styles.modalButton, styles.deleteButton]}
              >
                {isDeleting ? (
                  <ActivityIndicator color="#fff" size="small" />
                ) : (
                  <Ionicons name="trash" size={20} color="#fff" style={{ marginLeft: -2 }} />
                )}
              </TouchableOpacity>

              <View style={{ flexDirection: 'row', gap: 12 }}>
                <TouchableOpacity
                  onPress={closeEditModal}
                  style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
                >
                  <Text style={{ color: theme.text, fontSize: 14 }}>Cancelar</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  onPress={saveThought}
                  disabled={isSaving}
                  style={[styles.modalButton, styles.saveButton]}
                >
                  <Text style={styles.saveButtonText}>
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </Text>
                </TouchableOpacity>
              </View>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de conversión a lista */}
      <Modal
        visible={showConvertToListModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConvertToListModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Convertir a Lista
              </Text>
              <TouchableOpacity onPress={() => setShowConvertToListModal(false)}>
                <Text style={{ color: theme.text, fontSize: 24 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={{ color: theme.text, marginBottom: 8 }}>
                Convertir {selectedThoughts.size} pensamientos en una lista
              </Text>

              <Text style={[styles.modalLabel, { color: theme.text }]}>Nombre de la lista:</Text>
              <TextInput
                value={convertListName}
                onChangeText={setConvertListName}
                placeholder="Ej: Tareas pendientes"
                style={[styles.modalInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                placeholderTextColor="rgba(255,255,255,0.5)"
              />

              <Text style={[styles.modalLabel, { color: theme.text, marginTop: 16 }]}>
                Etiquetas adicionales (opcional):
              </Text>
              <TagSelector
                value={convertListTags}
                onChangeText={setConvertListTags}
                mode="inline"
                userId={userId}
                availableTags={availableTags}
                placeholder="trabajo, importante..."
                containerStyle={{ marginBottom: 0 }}
                customTheme={{
                  card: theme.background,
                  text: theme.text,
                  border: theme.border,
                  primary: '#3b82f6'
                }}
              />
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setShowConvertToListModal(false)}
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.text, fontSize: 14 }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={convertToList}
                disabled={isConverting}
                style={[styles.modalButton, styles.saveButton]}
              >
                <Text style={styles.saveButtonText}>
                  {isConverting ? 'Convirtiendo...' : 'Crear Lista'}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Modal de conversión a nota */}
      <Modal
        visible={showConvertToNoteModal}
        animationType="slide"
        transparent={true}
        onRequestClose={() => setShowConvertToNoteModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Convertir a Nota
              </Text>
              <TouchableOpacity onPress={() => setShowConvertToNoteModal(false)}>
                <Text style={{ color: theme.text, fontSize: 24 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={{ color: theme.text, marginBottom: 16 }}>
                Pensamiento: "{thoughtToConvert?.content?.substring(0, 50)}..."
              </Text>

              {/* Toggle entre crear nueva o agregar a existente */}
              <View style={{ flexDirection: 'row', marginBottom: 16, gap: 8 }}>
                <TouchableOpacity
                  onPress={() => setAddToExistingNote(false)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: !addToExistingNote ? '#3b82f6' : theme.card,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text style={{ color: !addToExistingNote ? '#fff' : theme.text, textAlign: 'center', fontWeight: '600' }}>
                    Nueva Nota
                  </Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setAddToExistingNote(true)}
                  style={{
                    flex: 1,
                    padding: 12,
                    borderRadius: 8,
                    backgroundColor: addToExistingNote ? '#3b82f6' : theme.card,
                    borderWidth: 1,
                    borderColor: theme.border,
                  }}
                >
                  <Text style={{ color: addToExistingNote ? '#fff' : theme.text, textAlign: 'center', fontWeight: '600' }}>
                    Agregar a Nota
                  </Text>
                </TouchableOpacity>
              </View>

              {addToExistingNote ? (
                /* Selector de nota existente */
                <>
                  <Text style={[styles.modalLabel, { color: theme.text }]}>
                    Selecciona una nota:
                  </Text>
                  <ScrollView style={{ maxHeight: 200, marginBottom: 16 }}>
                    {availableNotes.map((note) => (
                      <TouchableOpacity
                        key={note.noteId}
                        onPress={() => setSelectedNoteId(note.noteId)}
                        style={{
                          padding: 12,
                          borderRadius: 8,
                          marginBottom: 8,
                          backgroundColor: selectedNoteId === note.noteId ? '#3b82f6' : theme.card,
                          borderWidth: 1,
                          borderColor: theme.border,
                        }}
                      >
                        <Text style={{ color: selectedNoteId === note.noteId ? '#fff' : theme.text }}>
                          {note.title}
                        </Text>
                      </TouchableOpacity>
                    ))}
                  </ScrollView>
                  <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11 }}>
                    El pensamiento se agregará como bullet point (•) al final de la nota
                  </Text>
                </>
              ) : (
                /* Formulario para crear nueva nota */
                <>
                  <Text style={[styles.modalLabel, { color: theme.text }]}>
                    Título (opcional):
                  </Text>
                  <TextInput
                    value={convertNoteTitle}
                    onChangeText={setConvertNoteTitle}
                    placeholder="Se generará automáticamente si no especificas"
                    style={[styles.modalInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                    placeholderTextColor="rgba(255,255,255,0.5)"
                  />

                  <Text style={[styles.modalLabel, { color: theme.text, marginTop: 16 }]}>
                    Etiquetas:
                  </Text>
                  <TagSelector
                    value={convertNoteTags}
                    onChangeText={setConvertNoteTags}
                    mode="inline"
                    userId={userId}
                    availableTags={availableTags}
                    placeholder="trabajo, ideas..."
                    containerStyle={{ marginBottom: 0 }}
                    customTheme={{
                      card: theme.background,
                      text: theme.text,
                      border: theme.border,
                      primary: '#3b82f6'
                    }}
                  />
                </>
              )}
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={() => setShowConvertToNoteModal(false)}
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.text, fontSize: 14 }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={convertToNote}
                disabled={isConverting}
                style={[styles.modalButton, styles.saveButton]}
              >
                <Text style={styles.saveButtonText}>
                  {isConverting ? 'Procesando...' : (addToExistingNote ? 'Agregar' : 'Crear Nota')}
                </Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, padding: 16 },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 16, marginTop: 40 },
  filters: { marginBottom: 20 },
  label: { marginBottom: 4, fontWeight: '600' },
  input: { borderWidth: 1, padding: 8, borderRadius: 6 },
  limitInput: {
    borderWidth: 1,
    padding: 6,
    borderRadius: 6,
    width: 60,
    textAlign: 'center',
  },
  tagToggleButton: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
    alignItems: 'center',
  },
  tagFilterBox: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 12,
  },
  tagChip: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  applyButton: {
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
    marginBottom: 16,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 8,
  },
  paginationButton: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
  switchContainer: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 },
  toggleButton: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 6 },
  toggleText: { fontWeight: '500' },
  dateButton: { borderWidth: 1, padding: 10, borderRadius: 6, marginBottom: 10 },
  dropdownContainer: { marginBottom: 16 },
  dropdownToggle: { paddingVertical: 6 },
  card: { padding: 12, borderWidth: 1, borderRadius: 8, marginBottom: 12 },
  suggestionsContainer: {
    borderWidth: 1,
    borderRadius: 6,
    marginBottom: 10,
    maxHeight: 150,
  },
  suggestionItem: {
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#444',
  },
  // Estilos del modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '80%',
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalBody: {
    marginBottom: 20,
  },
  modalLabel: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  modalInput: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
  },
  modalTextArea: {
    borderWidth: 1,
    padding: 12,
    borderRadius: 8,
    fontSize: 14,
    minHeight: 100,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  modalButton: {
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  deleteButton: {
    backgroundColor: '#ef4444',
    width: 48,
    height: 48,
    borderRadius: 24,
    padding: 0,
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'visible',
  },
  deleteButtonText: {
    fontSize: 22,
    textAlign: 'center',
  },
  cancelButton: {
    backgroundColor: 'transparent',
    borderWidth: 1,
    paddingHorizontal: 20,
  },
  saveButton: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 24,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    fontSize: 14,
  },
  // Estilos para selección múltiple y conversión
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
  },
  floatingActionsContainer: {
    position: 'absolute',
    bottom: 20,
    left: 16,
    right: 16,
    flexDirection: 'row',
    gap: 12,
    zIndex: 1000,
  },
  floatingActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
    borderRadius: 12,
    elevation: 6,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '700',
    marginLeft: 6,
  },
});
