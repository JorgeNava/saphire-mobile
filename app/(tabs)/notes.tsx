import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useFocusEffect, useRouter } from 'expo-router';
import { useCallback, useEffect, useState } from 'react';
import {
    ActivityIndicator,
    Alert,
    FlatList,
    Modal,
    RefreshControl,
    ScrollView,
    StyleSheet,
    Text,
    TextInput,
    TouchableOpacity,
    View,
    useColorScheme
} from 'react-native';
import { cacheService } from '../../services/cacheService';
import { authenticateWithBiometrics } from '../../utils/biometricAuth';
import { ClipboardService } from '../../utils/clipboard';

const API_BASE = 'https://zon9g6gx9k.execute-api.us-east-1.amazonaws.com';
const NOTES_ENDPOINT = `${API_BASE}/notes`;
const userId = 'user123';

interface Note {
  noteId: string;
  userId: string;
  title: string;
  content: string;
  attachmentKeys: string[];
  tagIds: string[];
  tagNames: string[];
  tagSource: 'Manual' | 'AI' | null;
  createdAt: string;
  updatedAt: string;
  createdBy: string;
  lastModifiedBy: string;
  isLocked?: boolean;
  deletedAt?: string;
  deletedBy?: string;
}

export default function NotesScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#0A0E27' : '#F5F7FA',
    card: isDark ? '#1A1F3A' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1F3A',
    border: isDark ? '#2A2F4A' : '#E5E7EB',
  };

  const [notes, setNotes] = useState<Note[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Paginación
  const [limit, setLimit] = useState('20');
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [showLimitSelector, setShowLimitSelector] = useState(false);

  // Modal de crear/editar
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [modalTags, setModalTags] = useState('');
  const [modalIsLocked, setModalIsLocked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);

  // Cargar preferencia de límite al montar
  useEffect(() => {
    loadLimitPreference();
  }, []);

  const loadLimitPreference = async () => {
    try {
      const savedLimit = await AsyncStorage.getItem('notes_limit_preference');
      if (savedLimit) {
        setLimit(savedLimit);
      }
    } catch (error) {
      console.error('Error loading limit preference:', error);
    }
  };

  const saveLimitPreference = async (newLimit: string) => {
    try {
      await AsyncStorage.setItem('notes_limit_preference', newLimit);
      setLimit(newLimit);
      setCurrentPage(1);
      setLastKey(null);
      setShowLimitSelector(false);
      fetchNotes(true, null, true);
    } catch (error) {
      console.error('Error saving limit preference:', error);
    }
  };

  // Cargar notas
  const fetchNotes = async (resetPagination = false, customLastKey?: string | null, forceRefresh = false) => {
    setLoading(true);
    try {
      // Intentar obtener del caché primero (solo primera página sin filtros Y sin refresh manual)
      if (resetPagination && !searchQuery && !forceRefresh) {
        const cachedNotes = await cacheService.get('cache_notes');
        if (cachedNotes && Array.isArray(cachedNotes)) {
          setNotes(cachedNotes as Note[]);
          console.log('✅ Notas cargadas desde caché');
        }
      }

      const params = new URLSearchParams();
      params.append('userId', userId);
      params.append('limit', limit || '20');
      params.append('sortOrder', 'desc');

      const keyToUse = customLastKey !== undefined ? customLastKey : lastKey;
      if (keyToUse && !resetPagination) {
        params.append('lastKey', keyToUse);
      }

      const url = `${NOTES_ENDPOINT}?${params.toString()}`;
      console.log('🔍 Fetching notes:', url);

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setNotes(data.items || []);
      setLastKey(data.lastKey || null);
      setHasMore(data.hasMore || false);

      // Guardar en caché solo primera página sin filtros
      if (resetPagination && !searchQuery) {
        await cacheService.set('cache_notes', data.items || [], 5 * 60 * 1000); // 5 minutos
        console.log('✅ Notas guardadas en caché');
      }

      console.log(`✅ Loaded ${data.items?.length || 0} notes`);
    } catch (err) {
      console.error('❌ Error fetching notes:', err);
      Alert.alert('Error', 'No se pudieron cargar las notas');
    } finally {
      setLoading(false);
    }
  };

  // Buscar notas
  const searchNotes = async (query: string) => {
    if (!query.trim()) {
      fetchNotes(true);
      return;
    }

    setIsSearching(true);
    try {
      const url = `${NOTES_ENDPOINT}/search?userId=${userId}&q=${encodeURIComponent(query)}&limit=20`;
      console.log('🔍 Searching:', url);

      const res = await fetch(url);
      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`);
      }

      const data = await res.json();
      setNotes(data.results || []);
      console.log(`✅ Found ${data.results?.length || 0} results`);
    } catch (err) {
      console.error('❌ Error searching:', err);
      Alert.alert('Error', 'No se pudo realizar la búsqueda');
    } finally {
      setIsSearching(false);
    }
  };

  // Background sync para notas
  useEffect(() => {
    cacheService.startNotesSync(async () => {
      const res = await fetch(`${NOTES_ENDPOINT}?userId=${userId}&limit=20&sortOrder=desc`);
      const data = await res.json();
      setNotes(data.items || []); // Actualizar estado con datos frescos
      return data.items || [];
    });

    return () => {
      cacheService.stopBackgroundSync('cache_notes');
    };
  }, []);

  // Crear nota
  const createNote = async () => {
    if (!modalTitle.trim() || !modalContent.trim()) {
      Alert.alert('Error', 'El título y contenido son requeridos');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(NOTES_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: modalTitle,
          content: modalContent,
          tags: modalTags.split(',').map(t => t.trim()).filter(t => t),
          isLocked: modalIsLocked,
        }),
      });

      if (response.ok) {
        console.log('✅ Nota creada');
        // Invalidar caché para forzar recarga
        await cacheService.set('cache_notes', null, 0);
        closeModal();
        fetchNotes(true);
      } else {
        throw new Error('Error al crear nota');
      }
    } catch (err) {
      console.error('❌ Error:', err);
      Alert.alert('Error', 'No se pudo crear la nota');
    } finally {
      setIsSaving(false);
    }
  };


  // Eliminar nota
  const deleteNote = async (noteId: string) => {
    Alert.alert(
      'Eliminar nota',
      '¿Estás seguro de eliminar esta nota?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${NOTES_ENDPOINT}/${noteId}?userId=${userId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                console.log('✅ Nota eliminada');
                fetchNotes(false, lastKey);
              } else {
                throw new Error('Error al eliminar');
              }
            } catch (err) {
              console.error('❌ Error:', err);
              Alert.alert('Error', 'No se pudo eliminar la nota');
            }
          },
        },
      ]
    );
  };

  // Abrir modal para crear
  const openCreateModal = () => {
    setEditingNote(null);
    setModalTitle('');
    setModalContent('');
    setModalTags('');
    setModalIsLocked(false);
    setShowModal(true);
  };

  // Navegar a página de edición
  const openEditPage = async (note: Note) => {
    if (note.isLocked) {
      const authenticated = await authenticateWithBiometrics('Desbloquear nota');
      if (!authenticated) {
        Alert.alert('Acceso denegado', 'No se pudo verificar tu identidad biométrica.');
        return;
      }
    }

    router.push(`/note/${note.noteId}` as any);
  };

  // Cerrar modal
  const closeModal = () => {
    setShowModal(false);
    setEditingNote(null);
    setModalTitle('');
    setModalContent('');
    setModalTags('');
    setModalIsLocked(false);
  };

  // Paginación
  const goToNextPage = () => {
    if (hasMore && lastKey) {
      setCurrentPage(prev => prev + 1);
      fetchNotes(false);
    }
  };

  const goToPreviousPage = () => {
    if (currentPage > 1) {
      setCurrentPage(prev => prev - 1);
      setLastKey(null);
      fetchNotes(true);
    }
  };

  // Pull to refresh
  const onRefresh = async () => {
    setRefreshing(true);
    setCurrentPage(1);
    setLastKey(null);
    console.log('🔄 Pull-to-refresh: Cargando desde backend...');
    await fetchNotes(true, null, true); // forceRefresh = true
    setRefreshing(false);
  };

  // Cargar al montar
  useFocusEffect(
    useCallback(() => {
      fetchNotes(true);
    }, [])
  );

  // Función para insertar bullet point
  const insertBullet = () => {
    setModalContent(prev => {
      const lines = prev.split('\n');
      const lastLine = lines[lines.length - 1];
      
      // Si la última línea está vacía, agregar bullet
      if (!lastLine.trim()) {
        lines[lines.length - 1] = '• ';
        return lines.join('\n');
      }
      
      // Si no, agregar nueva línea con bullet
      return prev + '\n• ';
    });
  };

  // Copiar nota al portapapeles
  const copyNote = (note: Note) => {
    ClipboardService.copyTitleAndContent(note.title, note.content);
  };

  // Copiar solo contenido
  const copyNoteContent = (note: Note) => {
    ClipboardService.copyContent(note.content);
  };

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      <Text style={[styles.title, { color: theme.text }]}>Notas</Text>

      {/* Barra de búsqueda */}
      <View style={[styles.searchBar, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color={theme.text} />
        <TextInput
          placeholder="Buscar en notas..."
          value={searchQuery}
          onChangeText={(text) => {
            setSearchQuery(text);
            searchNotes(text);
          }}
          style={[styles.searchInput, { color: theme.text }]}
          placeholderTextColor="rgba(255,255,255,0.5)"
        />
      </View>

      {/* Controles */}
      <View style={{ flexDirection: 'row', gap: 8, marginBottom: 16 }}>
        <TouchableOpacity
          onPress={openCreateModal}
          style={[styles.createButton, { flex: 1 }]}
        >
          <Ionicons name="add" size={24} color="#fff" />
          <Text style={styles.createButtonText}>Nueva Nota</Text>
        </TouchableOpacity>
        
        <TouchableOpacity
          onPress={() => setShowLimitSelector(!showLimitSelector)}
          style={[styles.limitButton, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Ionicons name="options-outline" size={20} color={theme.text} />
          <Text style={[styles.limitButtonText, { color: theme.text }]}>{limit}</Text>
        </TouchableOpacity>
      </View>

      {/* Selector de límite */}
      {showLimitSelector && (
        <View style={[styles.limitSelector, { backgroundColor: theme.card, borderColor: theme.border }]}>
          <Text style={[styles.limitSelectorTitle, { color: theme.text }]}>Items por página:</Text>
          <View style={styles.limitOptions}>
            {['10', '20', '50', '100'].map(option => (
              <TouchableOpacity
                key={option}
                onPress={() => saveLimitPreference(option)}
                style={[
                  styles.limitOption,
                  { borderColor: theme.border },
                  limit === option && { backgroundColor: '#3b82f6', borderColor: '#3b82f6' }
                ]}
              >
                <Text style={{ color: limit === option ? '#fff' : theme.text, fontWeight: limit === option ? '600' : '400' }}>
                  {option}
                </Text>
              </TouchableOpacity>
            ))}
          </View>
        </View>
      )}

      {/* Lista de notas */}
      <FlatList
        data={notes}
        keyExtractor={(item) => item.noteId}
        contentContainerStyle={{ paddingBottom: 20, flexGrow: 1 }}
        refreshControl={
          <RefreshControl
            refreshing={refreshing}
            onRefresh={onRefresh}
            tintColor="#3b82f6"
            colors={['#3b82f6']}
          />
        }
        ListEmptyComponent={
          loading || isSearching ? (
            <ActivityIndicator style={{ marginTop: 20 }} />
          ) : (
            <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', paddingTop: 60 }}>
              <Ionicons name="document-text-outline" size={64} color={theme.border} />
              <Text style={{ color: theme.text, marginTop: 16, opacity: 0.6 }}>
                {searchQuery ? 'No se encontraron notas' : 'No hay notas'}
              </Text>
            </View>
          )
        }
        renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openEditPage(item)}
              style={[styles.noteCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.noteHeader}>
                <View style={styles.noteTitleRow}>
                  <Text style={[styles.noteTitle, { color: theme.text }]} numberOfLines={1}>
                    {item.title}
                  </Text>
                  {item.isLocked && (
                    <Ionicons name="lock-closed" size={16} color="#f59e0b" style={{ marginLeft: 6 }} />
                  )}
                </View>
                <View style={{ flexDirection: 'row', gap: 12 }}>
                  <TouchableOpacity onPress={() => copyNote(item)}>
                    <Ionicons name="copy-outline" size={20} color="#8b5cf6" />
                  </TouchableOpacity>
                  <TouchableOpacity onPress={() => deleteNote(item.noteId)}>
                    <Ionicons name="trash-outline" size={20} color="#ef4444" />
                  </TouchableOpacity>
                </View>
              </View>

              <Text style={[styles.noteContent, { color: theme.text }]} numberOfLines={3}>
                {item.isLocked ? '******' : item.content}
              </Text>

              {item.tagNames && item.tagNames.length > 0 && (
                <View style={styles.tagsContainer}>
                  {item.tagNames.map((tag, index) => (
                    <View key={index} style={styles.tag}>
                      <Text style={styles.tagText}>{tag}</Text>
                    </View>
                  ))}
                </View>
              )}

              <Text style={[styles.noteDate, { color: theme.text }]}>
                {new Date(item.createdAt).toLocaleDateString('es-MX', {
                  day: '2-digit',
                  month: 'short',
                  year: 'numeric',
                })}
              </Text>
            </TouchableOpacity>
          )}
        />

      {/* Paginación */}
      {!searchQuery && (
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
      )}

      {/* Modal de crear/editar */}
      <Modal
        visible={showModal}
        animationType="slide"
        transparent={true}
        onRequestClose={closeModal}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Nueva Nota
              </Text>
              <TouchableOpacity onPress={closeModal}>
                <Text style={{ color: theme.text, fontSize: 24 }}>✕</Text>
              </TouchableOpacity>
            </View>

            <ScrollView style={styles.modalBody}>
              <Text style={[styles.modalLabel, { color: theme.text }]}>Título:</Text>
              <TextInput
                value={modalTitle}
                onChangeText={setModalTitle}
                placeholder="Título de la nota"
                style={[styles.modalInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                placeholderTextColor="rgba(255,255,255,0.5)"
              />

              <View style={{ flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginTop: 16 }}>
                <Text style={[styles.modalLabel, { color: theme.text, marginBottom: 0 }]}>Contenido:</Text>
                <TouchableOpacity
                  onPress={insertBullet}
                  style={{ flexDirection: 'row', alignItems: 'center', gap: 4, padding: 8, borderRadius: 6, backgroundColor: 'rgba(59, 130, 246, 0.1)' }}
                >
                  <Ionicons name="list" size={16} color="#3b82f6" />
                  <Text style={{ color: '#3b82f6', fontSize: 12, fontWeight: '600' }}>Bullet</Text>
                </TouchableOpacity>
              </View>
              <TextInput
                value={modalContent}
                onChangeText={setModalContent}
                multiline
                numberOfLines={6}
                placeholder="Escribe el contenido de tu nota...\n\nUsa '•' para crear listas con viñetas"
                style={[styles.modalTextArea, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border, marginTop: 8 }]}
                placeholderTextColor="rgba(255,255,255,0.5)"
              />

              <Text style={[styles.modalLabel, { color: theme.text, marginTop: 16 }]}>Etiquetas:</Text>
              <TextInput
                value={modalTags}
                onChangeText={setModalTags}
                placeholder="trabajo, importante, proyecto..."
                style={[styles.modalInput, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
                placeholderTextColor="rgba(255,255,255,0.5)"
              />
              <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 }}>
                Separa las etiquetas con comas
              </Text>

              <TouchableOpacity
                onPress={() => setModalIsLocked((prev) => !prev)}
                style={[
                  styles.lockToggle,
                  {
                    backgroundColor: modalIsLocked ? 'rgba(245, 158, 11, 0.16)' : theme.background,
                    borderColor: modalIsLocked ? '#f59e0b' : theme.border,
                  }
                ]}
              >
                <Ionicons
                  name={modalIsLocked ? 'lock-closed' : 'lock-open-outline'}
                  size={18}
                  color={modalIsLocked ? '#f59e0b' : theme.text}
                />
                <Text style={{ color: theme.text, fontSize: 13, fontWeight: '600' }}>
                  {modalIsLocked ? 'Protegida con huella' : 'Proteger con huella'}
                </Text>
              </TouchableOpacity>
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={closeModal}
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.text, fontSize: 14 }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={createNote}
                disabled={isSaving}
                style={[styles.modalButton, styles.saveButton]}
              >
                <Text style={styles.saveButtonText}>
                  {isSaving ? 'Guardando...' : 'Crear'}
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
  container: {
    flex: 1,
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 16,
    marginTop: 40,
  },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
    gap: 8,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
  },
  createButton: {
    backgroundColor: '#3b82f6',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 14,
    borderRadius: 8,
    marginBottom: 16,
    gap: 8,
  },
  createButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  noteCard: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 16,
    marginBottom: 12,
  },
  noteHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  noteTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
    marginRight: 8,
  },
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
  },
  noteContent: {
    fontSize: 14,
    lineHeight: 20,
    marginBottom: 12,
    opacity: 0.8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 6,
    marginBottom: 8,
  },
  tag: {
    backgroundColor: '#3b82f6',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
  },
  noteDate: {
    fontSize: 12,
    opacity: 0.6,
  },
  paginationContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.1)',
  },
  paginationButton: {
    borderWidth: 1,
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 6,
  },
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
  lockToggle: {
    marginTop: 14,
    borderWidth: 1,
    borderRadius: 8,
    paddingVertical: 10,
    paddingHorizontal: 12,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
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
    minHeight: 120,
    textAlignVertical: 'top',
  },
  modalFooter: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: 12,
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
  limitButton: {
    borderWidth: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderRadius: 8,
    height: 48,
  },
  limitButtonText: {
    fontSize: 14,
    fontWeight: '600',
  },
  limitSelector: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    marginBottom: 16,
  },
  limitSelectorTitle: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 12,
  },
  limitOptions: {
    flexDirection: 'row',
    gap: 8,
  },
  limitOption: {
    flex: 1,
    borderWidth: 1,
    padding: 12,
    borderRadius: 6,
    alignItems: 'center',
  },
});
