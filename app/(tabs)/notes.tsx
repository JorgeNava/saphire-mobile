import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';

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
  deletedAt?: string;
  deletedBy?: string;
}

export default function NotesScreen() {
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
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearching, setIsSearching] = useState(false);

  // Paginación
  const [limit, setLimit] = useState('20');
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);

  // Modal de crear/editar
  const [showModal, setShowModal] = useState(false);
  const [editingNote, setEditingNote] = useState<Note | null>(null);
  const [modalTitle, setModalTitle] = useState('');
  const [modalContent, setModalContent] = useState('');
  const [modalTags, setModalTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Cargar notas
  const fetchNotes = async (resetPagination = false, customLastKey?: string | null) => {
    setLoading(true);
    try {
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
        }),
      });

      if (response.ok) {
        console.log('✅ Nota creada');
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

  // Actualizar nota
  const updateNote = async () => {
    if (!editingNote) return;

    setIsSaving(true);
    try {
      const response = await fetch(`${NOTES_ENDPOINT}/${editingNote.noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: modalTitle,
          content: modalContent,
          tagNames: modalTags.split(',').map(t => t.trim()).filter(t => t),
          tagSource: 'Manual',
        }),
      });

      if (response.ok) {
        console.log('✅ Nota actualizada');
        closeModal();
        fetchNotes(false, lastKey);
      } else {
        throw new Error('Error al actualizar nota');
      }
    } catch (err) {
      console.error('❌ Error:', err);
      Alert.alert('Error', 'No se pudo actualizar la nota');
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
    setShowModal(true);
  };

  // Abrir modal para editar
  const openEditModal = (note: Note) => {
    setEditingNote(note);
    setModalTitle(note.title);
    setModalContent(note.content);
    setModalTags((note.tagNames || []).join(', '));
    setShowModal(true);
  };

  // Cerrar modal
  const closeModal = () => {
    setShowModal(false);
    setEditingNote(null);
    setModalTitle('');
    setModalContent('');
    setModalTags('');
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

  // Cargar al montar
  useFocusEffect(
    useCallback(() => {
      fetchNotes(true);
    }, [])
  );

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

      {/* Botón crear */}
      <TouchableOpacity
        onPress={openCreateModal}
        style={styles.createButton}
      >
        <Ionicons name="add" size={24} color="#fff" />
        <Text style={styles.createButtonText}>Nueva Nota</Text>
      </TouchableOpacity>

      {/* Lista de notas */}
      {loading || isSearching ? (
        <ActivityIndicator style={{ marginTop: 20 }} />
      ) : (
        <FlatList
          data={notes}
          keyExtractor={(item) => item.noteId}
          contentContainerStyle={{ paddingBottom: 100 }}
          renderItem={({ item }) => (
            <TouchableOpacity
              onPress={() => openEditModal(item)}
              style={[styles.noteCard, { backgroundColor: theme.card, borderColor: theme.border }]}
            >
              <View style={styles.noteHeader}>
                <Text style={[styles.noteTitle, { color: theme.text }]} numberOfLines={1}>
                  {item.title}
                </Text>
                <TouchableOpacity onPress={() => deleteNote(item.noteId)}>
                  <Ionicons name="trash-outline" size={20} color="#ef4444" />
                </TouchableOpacity>
              </View>

              <Text style={[styles.noteContent, { color: theme.text }]} numberOfLines={3}>
                {item.content}
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
      )}

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
                {editingNote ? 'Editar Nota' : 'Nueva Nota'}
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

              <Text style={[styles.modalLabel, { color: theme.text, marginTop: 16 }]}>Contenido:</Text>
              <TextInput
                value={modalContent}
                onChangeText={setModalContent}
                multiline
                numberOfLines={6}
                placeholder="Escribe el contenido de tu nota..."
                style={[styles.modalTextArea, { color: theme.text, backgroundColor: theme.background, borderColor: theme.border }]}
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
            </ScrollView>

            <View style={styles.modalFooter}>
              <TouchableOpacity
                onPress={closeModal}
                style={[styles.modalButton, styles.cancelButton, { borderColor: theme.border }]}
              >
                <Text style={{ color: theme.text, fontSize: 14 }}>Cancelar</Text>
              </TouchableOpacity>

              <TouchableOpacity
                onPress={editingNote ? updateNote : createNote}
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
  noteTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    flex: 1,
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
});
