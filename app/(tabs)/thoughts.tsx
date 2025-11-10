import { InputType, Message } from '@/types/message';
import DateTimePicker from '@react-native-community/datetimepicker';
import { useFocusEffect } from '@react-navigation/native';
import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { cacheService } from '../../services/cacheService';
import {
  ActivityIndicator,
  Alert,
  Button,
  FlatList,
  LayoutAnimation,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Switch,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  View,
  useColorScheme,
} from 'react-native';

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
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const [usedAI, setUsedAI] = useState<boolean | null>(null);
  const [tags, setTags] = useState('');
  const [inputType, setInputType] = useState<InputType>('text');
  const userId = 'user123';

  // Estados para autocompletado de etiquetas
  const [availableTags, setAvailableTags] = useState<Array<{tagId: string; name: string}>>([]);
  const [filteredTags, setFilteredTags] = useState<Array<{tagId: string; name: string}>>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);

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

  const theme = {
    background: isDark ? '#0A0E27' : '#F5F7FA',
    card: isDark ? '#1A1F3A' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1F3A',
    border: isDark ? '#2A2F4A' : '#E5E7EB',
  };

  // Helper para verificar si hay filtros activos
  const checkActiveFilters = () => Boolean(tags.trim() || dateFrom);

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

  const fetchMessages = async (applyFilters = true, resetPagination = false, customLastKey?: string | null) => {
    setLoading(true);
    try {
      // IMPORTANTE: NO usar caché cuando hay filtros activos
      if (!applyFilters && !checkActiveFilters()) {
        const cachedThoughts = await cacheService.get('cache_thoughts');
        if (cachedThoughts && Array.isArray(cachedThoughts)) {
          setMessages(cachedThoughts as Message[]);
          console.log('✅ Thoughts cargados desde caché');
          setLoading(false);
          return;
        }
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
        console.log('🔑 Usando lastKey:', keyToUse);
      } else {
        console.log('🔑 Sin lastKey (página 1)');
      }

      if (applyFilters) {
        // Thoughts solo soporta: tagIds, tagSource, createdAt
        if (tags.trim()) {
          // Buscar por nombres de tags (el backend debe soportar esto)
          params.append('tagNames', tags.trim());
        }
        if (dateFrom) params.append('createdAt', toISOStringWithZ(dateFrom));
        // Nota: Thoughts no tiene inputType ni usedAI
      }

      const url = `${THOUGHTS_ENDPOINT}?${params.toString()}`;
      console.log('🔍 Fetching:', url);
      const res = await fetch(url);

      if (!res.ok) {
        const errorText = await res.text();
        console.error('❌ Error response:', errorText);
        throw new Error(`HTTP ${res.status}: ${errorText}`);
      }
      
      const data = await res.json();
      // NUEVO: API ahora retorna objeto paginado con { items, count, hasMore, lastKey }
      const thoughtsArray = data.items || [];
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
        console.log('✅ Thoughts guardados en caché');
      } else {
        console.log('🔍 Resultados filtrados (no se guardan en caché)');
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
      console.log('⏳ Ya se está cargando el total, saltando...');
      return;
    }
    
    setIsLoadingTotal(true);
    console.log('🔄 Iniciando cálculo del total de pensamientos...');
    
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
          
          console.log(`📄 Página ${pageCount}: ${itemsCount} items (Total acumulado: ${total})`);
        } else {
          console.error('❌ Error en página', pageCount);
          break;
        }
      }
      
      setTotalThoughtsInDB(total);
      console.log(`✅ Total FINAL de pensamientos en BD: ${total}`);
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
        const res = await fetch(`${API_BASE}/tags?userId=${userId}`);
        if (res.ok) {
          const tags = await res.json();
          setAvailableTags(tags);
        }
      } catch (err) {
        console.error('Error loading tags:', err);
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
      const thoughtsArray = data.items || [];
      setMessages(thoughtsArray); // Actualizar estado con datos frescos
      return thoughtsArray;
    });

    return () => {
      cacheService.stopBackgroundSync('cache_thoughts');
    };
  }, []);

  // Filtrar etiquetas basado en el input (igual que en Chat)
  useEffect(() => {
    if (!tags.trim()) {
      setShowSuggestions(false);
      return;
    }

    // Obtener el último tag que se está escribiendo
    const tagsList = tags.split(',').map(t => t.trim());
    const lastTag = tagsList[tagsList.length - 1];

    if (!lastTag) {
      setShowSuggestions(false);
      return;
    }

    const filtered = availableTags.filter(tag =>
      tag.name.toLowerCase().includes(lastTag.toLowerCase())
    );
    setFilteredTags(filtered);
    setShowSuggestions(filtered.length > 0);
  }, [tags, availableTags]);

  // Cargar mensajes al montar el componente
  useEffect(() => {
    fetchMessages(false);
  }, []);

  // Recargar mensajes cada vez que el usuario regresa a esta pantalla
  useFocusEffect(
    useCallback(() => {
      fetchMessages(false);
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
      
      console.log(`⬅️ Retrocediendo a página ${newPage}, lastKey:`, previousLastKey);
      console.log('📚 Historial actual:', pageHistory);
      
      // Actualizar estados
      setCurrentPage(newPage);
      setLastKey(previousLastKey);
      
      // Remover el último elemento del historial
      setPageHistory(prev => prev.slice(0, -1));
      
      // Hacer fetch con el lastKey de la página anterior (pasarlo directamente)
      fetchMessages(true, false, previousLastKey);
    }
  };

  const toggleTags = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    // Si se está cerrando, limpiar el input de etiquetas
    if (showTagsInput) {
      setTags('');
      setShowSuggestions(false);
    }
    setShowTagsInput(!showTagsInput);
  };

  const selectTag = (tagName: string) => {
    const currentTags = tags.split(',').map(t => t.trim()).filter(t => t);
    // Remover el último tag incompleto y agregar el seleccionado
    currentTags.pop();
    currentTags.push(tagName);
    setTags(currentTags.join(', ') + ', ');
    setShowSuggestions(false);
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
      const response = await fetch(`${THOUGHTS_ENDPOINT}/${thoughtId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          content: editContent,
          tagNames: editTags.split(',').map(t => t.trim()).filter(t => t),
          tagSource: 'Manual',
        }),
      });

      if (response.ok) {
        console.log('✅ Pensamiento actualizado');
        closeEditModal();
        // Recargar pensamientos
        fetchMessages(true, false, lastKey);
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
                console.log('✅ Pensamiento eliminado');
                closeEditModal();
                // Recargar pensamientos
                fetchMessages(true, false, lastKey);
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
        console.log('✅ Lista creada:', list);
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
  const openConvertToNoteModal = (thought: any) => {
    setThoughtToConvert(thought);
    setConvertNoteTitle('');
    setConvertNoteTags((thought.tagNames || []).join(', '));
    setShowConvertToNoteModal(true);
  };

  const convertToNote = async () => {
    if (!thoughtToConvert) return;

    setIsConverting(true);
    try {
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
        console.log('✅ Nota creada:', note);
        // Invalidar caché de notas
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
    } catch (err) {
      console.error('❌ Error:', err);
      Alert.alert('Error', 'No se pudo crear la nota');
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

      {/* Botón flotante de conversión */}
      {selectionMode && selectedThoughts.size > 0 && (
        <TouchableOpacity
          onPress={openConvertToListModal}
          style={styles.floatingConvertButton}
        >
          <Ionicons name="list" size={24} color="#fff" />
          <Text style={styles.floatingButtonText}>
            Convertir {selectedThoughts.size} a lista
          </Text>
        </TouchableOpacity>
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

        {/* Botón que se transforma en box de filtro de etiquetas */}
        {!showTagsInput ? (
          <TouchableOpacity 
            onPress={toggleTags}
            style={[styles.tagToggleButton, { backgroundColor: theme.card, borderColor: theme.border }]}
          >
            <Text style={{ color: theme.text, fontSize: 14 }}>
              🏷️ Filtrar por etiquetas
            </Text>
          </TouchableOpacity>
        ) : (
          <View style={[styles.tagFilterBox, { backgroundColor: theme.card, borderColor: theme.border }]}>
            <View style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
              <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
                <Text style={{ fontSize: 20 }}>🏷️</Text>
                <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
                  Etiquetas
                </Text>
              </View>
              <TouchableOpacity onPress={toggleTags}>
                <Text style={{ color: theme.text, fontSize: 20 }}>✕</Text>
              </TouchableOpacity>
            </View>
            
            <TextInput
              placeholder="trabajo, urgente, reunión..."
              value={tags}
              onChangeText={setTags}
              style={[styles.input, { color: theme.text, backgroundColor: 'transparent', borderColor: 'rgba(255,255,255,0.3)' }]}
              placeholderTextColor="rgba(255,255,255,0.5)"
            />
            
            <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 }}>
              Separa las etiquetas con comas
            </Text>

            {/* Sugerencias EXACTAMENTE igual que Chat */}
            {showSuggestions && (
              <View style={{ marginTop: 12, paddingTop: 12, borderTopWidth: 1, borderTopColor: 'rgba(255,255,255,0.2)' }}>
                <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
                  Sugerencias:
                </Text>
                <ScrollView 
                  style={{ maxHeight: 120 }}
                  showsVerticalScrollIndicator={true}
                  nestedScrollEnabled={true}
                  keyboardShouldPersistTaps="always"
                >
                  <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8, paddingBottom: 4 }}>
                    {filteredTags.map((tag) => (
                      <TouchableOpacity
                        key={tag.tagId}
                        onPress={() => selectTag(tag.name)}
                        style={styles.tagChip}
                      >
                        <Text style={{ color: '#fff', fontSize: 12 }}>{tag.name}</Text>
                      </TouchableOpacity>
                    ))}
                  </View>
                </ScrollView>
              </View>
            )}
          </View>
        )}

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
          keyExtractor={(item) => (item as any).thoughtId || item.messageId || (item as any).id || String(Math.random())}
          contentContainerStyle={{ paddingBottom: 50 }}
          renderItem={({ item }) => {
            // Thoughts tienen estructura diferente a Messages
            const thought = item as any;
            const content = thought.content || thought.originalContent || 'Sin contenido';
            const tags = thought.tagNames || [];
            
            return (
              <View style={[styles.card, { backgroundColor: theme.card, borderColor: theme.border }]}>
                <View style={{ flexDirection: 'row', alignItems: 'flex-start' }}>
                  {/* Checkbox en modo selección */}
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

                  {/* Contenido del pensamiento */}
                  <TouchableOpacity 
                    onPress={() => !selectionMode && openEditModal(thought)}
                    style={{ flex: 1 }}
                  >
                    <Text style={{ color: theme.text, fontWeight: 'bold', marginBottom: 8 }}>
                      {content}
                    </Text>
                    
                    {tags.length > 0 && (
                      <View style={{ flexDirection: 'row', flexWrap: 'wrap', marginBottom: 8 }}>
                        {tags.map((tag: string, index: number) => (
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

                  {/* Botón de convertir a nota (solo cuando no está en modo selección) */}
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
          }}
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
              <TextInput
                value={editTags}
                onChangeText={setEditTags}
                placeholder="trabajo, urgente, reunión..."
                style={[styles.modalInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 }}>
                Separa las etiquetas con comas
              </Text>
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
              <TextInput
                value={convertListTags}
                onChangeText={setConvertListTags}
                placeholder="trabajo, importante..."
                style={[styles.modalInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 }}>
                Separa las etiquetas con comas
              </Text>
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
              <TextInput
                value={convertNoteTags}
                onChangeText={setConvertNoteTags}
                placeholder="trabajo, ideas..."
                style={[styles.modalInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 }}>
                Separa las etiquetas con comas
              </Text>
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
                  {isConverting ? 'Convirtiendo...' : 'Crear Nota'}
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
  floatingConvertButton: {
    position: 'absolute',
    bottom: 20,
    right: 20,
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderRadius: 30,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
    zIndex: 1000,
  },
  floatingButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
