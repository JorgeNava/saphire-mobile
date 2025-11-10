import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';

const API_BASE = 'https://zon9g6gx9k.execute-api.us-east-1.amazonaws.com';
const userId = 'user123';

interface Tag {
  tagId: string;
  name: string;
  color: string;
  usageCount: number;
}

interface TagResources {
  tag: Tag;
  thoughts: any[];
  lists: any[];
  notes: any[];
  counts: {
    thoughts: number;
    lists: number;
    notes: number;
    total: number;
  };
}

type TabType = 'thoughts' | 'lists' | 'notes';

export default function TagDetailScreen() {
  const router = useRouter();
  const { tagId } = useLocalSearchParams();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#0A0E27' : '#F5F7FA',
    card: isDark ? '#1A1F3A' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1F3A',
    border: isDark ? '#2A2F4A' : '#E5E7EB',
    placeholder: isDark ? '#6B7280' : '#9CA3AF',
  };

  const [resources, setResources] = useState<TagResources | null>(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<TabType>('thoughts');
  
  // Estados para modal de pensamiento
  const [showThoughtModal, setShowThoughtModal] = useState(false);
  const [selectedThought, setSelectedThought] = useState<any>(null);
  const [editContent, setEditContent] = useState('');
  const [editTags, setEditTags] = useState('');
  const [isSaving, setIsSaving] = useState(false);

  // Cargar recursos
  const fetchResources = async () => {
    setLoading(true);
    try {
      const response = await fetch(
        `${API_BASE}/tags/${tagId}/resources?userId=${userId}`
      );
      
      if (!response.ok) throw new Error('Error al cargar recursos');
      
      const data = await response.json();
      setResources(data);
      console.log('✅ Recursos cargados:', data.counts);
    } catch (err) {
      console.error('❌ Error:', err);
      // Si el endpoint no existe aún, mostrar mensaje
      setResources({
        tag: { tagId: tagId as string, name: 'Etiqueta', color: '#3B82F6', usageCount: 0 },
        thoughts: [],
        lists: [],
        notes: [],
        counts: { thoughts: 0, lists: 0, notes: 0, total: 0 },
      });
    } finally {
      setLoading(false);
    }
  };

  useFocusEffect(
    useCallback(() => {
      fetchResources();
    }, [tagId])
  );

  // Actualizar título cuando se carguen los recursos
  useEffect(() => {
    if (resources?.tag?.name) {
      // El título se actualiza automáticamente con Stack.Screen
    }
  }, [resources]);

  // Abrir modal de pensamiento
  const openThoughtModal = (thought: any) => {
    setSelectedThought(thought);
    setEditContent(thought.content || '');
    setEditTags(thought.tagNames?.join(', ') || '');
    setShowThoughtModal(true);
  };

  // Guardar pensamiento editado
  const saveThought = async () => {
    if (!selectedThought || !editContent.trim()) {
      Alert.alert('Error', 'El contenido es requerido');
      return;
    }

    setIsSaving(true);
    try {
      const response = await fetch(
        `${API_BASE}/thoughts/${selectedThought.thoughtId}`,
        {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            userId,
            content: editContent.trim(),
            tagNames: editTags.split(',').map(t => t.trim()).filter(t => t),
            tagSource: 'Manual',
          }),
        }
      );

      if (response.ok) {
        console.log('✅ Pensamiento actualizado');
        setShowThoughtModal(false);
        fetchResources(); // Recargar recursos
      } else {
        throw new Error('Error al actualizar');
      }
    } catch (err) {
      console.error('❌ Error:', err);
      Alert.alert('Error', 'No se pudo actualizar el pensamiento');
    } finally {
      setIsSaving(false);
    }
  };

  // Eliminar pensamiento
  const deleteThought = async () => {
    if (!selectedThought) return;

    Alert.alert(
      'Eliminar Pensamiento',
      '¿Estás seguro de eliminar este pensamiento?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(
                `${API_BASE}/thoughts/${selectedThought.thoughtId}`,
                {
                  method: 'DELETE',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ userId }),
                }
              );

              if (response.ok) {
                console.log('✅ Pensamiento eliminado');
                setShowThoughtModal(false);
                fetchResources();
              } else {
                throw new Error('Error al eliminar');
              }
            } catch (err) {
              console.error('❌ Error:', err);
              Alert.alert('Error', 'No se pudo eliminar el pensamiento');
            }
          },
        },
      ]
    );
  };


  // Obtener datos del tab activo
  const getActiveData = () => {
    if (!resources) return [];
    return resources[activeTab] || [];
  };

  // Render item según tipo
  const renderItem = ({ item }: { item: any }) => {
    let title = '';
    let subtitle = '';
    let onPress = () => {};

    if (activeTab === 'thoughts') {
      title = item.content?.substring(0, 100) || 'Sin contenido';
      subtitle = new Date(item.createdAt).toLocaleDateString();
      onPress = () => openThoughtModal(item);
    } else if (activeTab === 'lists') {
      title = item.name || 'Sin nombre';
      subtitle = `${item.items?.length || 0} elementos`;
      onPress = () => router.push(`/list/${item.listId}` as any);
    } else if (activeTab === 'notes') {
      title = item.title || 'Sin título';
      subtitle = new Date(item.createdAt).toLocaleDateString();
      onPress = () => router.push(`/note/${item.noteId}` as any);
    }

    return (
      <Pressable
        onPress={onPress}
        style={[styles.resourceCard, { backgroundColor: theme.card, borderColor: theme.border }]}
      >
        <View style={styles.resourceContent}>
          <Text style={[styles.resourceTitle, { color: theme.text }]} numberOfLines={2}>
            {title}
          </Text>
          <Text style={[styles.resourceSubtitle, { color: theme.placeholder }]}>
            {subtitle}
          </Text>
        </View>
        <Ionicons name="chevron-forward" size={20} color={theme.placeholder} />
      </Pressable>
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#3B82F6" />
      </View>
    );
  }

  if (!resources) {
    return (
      <View style={[styles.container, styles.centered, { backgroundColor: theme.background }]}>
        <Text style={[styles.emptyText, { color: theme.placeholder }]}>
          No se pudo cargar la información
        </Text>
      </View>
    );
  }

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      {/* Header */}
      <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Pressable onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color={theme.text} />
        </Pressable>
        
        <View style={styles.headerContent}>
          <View style={styles.headerTop}>
            <View style={[styles.colorDot, { backgroundColor: resources.tag.color }]} />
            <Text style={[styles.headerTitle, { color: theme.text }]}>
              {resources.tag.name}
            </Text>
          </View>
          <Text style={[styles.headerSubtitle, { color: theme.placeholder }]}>
            {resources.counts.total} recursos totales
          </Text>
        </View>
      </View>

      {/* Tabs */}
      <View style={[styles.tabs, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
        <Pressable
          onPress={() => setActiveTab('thoughts')}
          style={[
            styles.tab,
            activeTab === 'thoughts' && { borderBottomColor: '#3B82F6', borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'thoughts' ? '#3B82F6' : theme.placeholder },
            ]}
          >
            Pensamientos ({resources.counts.thoughts})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('lists')}
          style={[
            styles.tab,
            activeTab === 'lists' && { borderBottomColor: '#3B82F6', borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'lists' ? '#3B82F6' : theme.placeholder },
            ]}
          >
            Listas ({resources.counts.lists})
          </Text>
        </Pressable>

        <Pressable
          onPress={() => setActiveTab('notes')}
          style={[
            styles.tab,
            activeTab === 'notes' && { borderBottomColor: '#3B82F6', borderBottomWidth: 2 },
          ]}
        >
          <Text
            style={[
              styles.tabText,
              { color: activeTab === 'notes' ? '#3B82F6' : theme.placeholder },
            ]}
          >
            Notas ({resources.counts.notes})
          </Text>
        </Pressable>
      </View>

      {/* Content */}
      <FlatList
        data={getActiveData()}
        renderItem={renderItem}
        keyExtractor={(item) => item.thoughtId || item.listId || item.noteId}
        contentContainerStyle={styles.listContent}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Ionicons name="folder-open-outline" size={64} color={theme.placeholder} />
            <Text style={[styles.emptyText, { color: theme.placeholder }]}>
              No hay {activeTab === 'thoughts' ? 'pensamientos' : activeTab === 'lists' ? 'listas' : 'notas'}
            </Text>
          </View>
        }
      />

      {/* Modal de Pensamiento */}
      <Modal
        visible={showThoughtModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowThoughtModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <View style={styles.modalHeader}>
              <Text style={[styles.modalTitle, { color: theme.text }]}>
                Editar Pensamiento
              </Text>
              <Pressable onPress={() => setShowThoughtModal(false)}>
                <Ionicons name="close" size={24} color={theme.text} />
              </Pressable>
            </View>

            <ScrollView style={styles.modalScroll}>
              <Text style={[styles.label, { color: theme.text }]}>Contenido:</Text>
              <TextInput
                style={[styles.textArea, { color: theme.text, borderColor: theme.border }]}
                value={editContent}
                onChangeText={setEditContent}
                placeholder="Escribe tu pensamiento..."
                placeholderTextColor={theme.placeholder}
                multiline
                textAlignVertical="top"
              />

              <Text style={[styles.label, { color: theme.text }]}>Etiquetas (separadas por comas):</Text>
              <TextInput
                style={[styles.input, { color: theme.text, borderColor: theme.border }]}
                value={editTags}
                onChangeText={setEditTags}
                placeholder="trabajo, personal, importante"
                placeholderTextColor={theme.placeholder}
              />

              <Text style={[styles.dateText, { color: theme.placeholder }]}>
                Creado: {selectedThought?.createdAt ? new Date(selectedThought.createdAt).toLocaleString() : ''}
              </Text>
            </ScrollView>

            <View style={styles.modalActions}>
              <Pressable
                onPress={deleteThought}
                style={[styles.deleteButton, { backgroundColor: '#EF4444' }]}
              >
                <Ionicons name="trash" size={18} color="#FFFFFF" />
              </Pressable>

              <View style={styles.rightButtons}>
                <Pressable
                  onPress={() => setShowThoughtModal(false)}
                  style={[styles.cancelButton, { backgroundColor: theme.card, borderColor: theme.border }]}
                >
                  <Text style={[styles.cancelButtonText, { color: theme.text }]}>Cancelar</Text>
                </Pressable>
                <Pressable
                  onPress={saveThought}
                  disabled={isSaving || !editContent.trim()}
                  style={[
                    styles.saveButton,
                    { 
                      backgroundColor: isSaving || !editContent.trim() ? '#6B7280' : '#3B82F6',
                      opacity: isSaving || !editContent.trim() ? 0.6 : 1 
                    }
                  ]}
                >
                  <Ionicons name="checkmark" size={18} color="#FFFFFF" style={{ marginRight: 6 }} />
                  <Text style={styles.buttonText}>
                    {isSaving ? 'Guardando...' : 'Guardar'}
                  </Text>
                </Pressable>
              </View>
            </View>
          </View>
        </View>
      </Modal>

    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  centered: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    paddingTop: 60,
    borderBottomWidth: 1,
  },
  backButton: {
    marginRight: 12,
  },
  headerContent: {
    flex: 1,
  },
  headerTop: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 4,
  },
  colorDot: {
    width: 20,
    height: 20,
    borderRadius: 10,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  headerSubtitle: {
    fontSize: 14,
  },
  tabs: {
    flexDirection: 'row',
    borderBottomWidth: 1,
  },
  tab: {
    flex: 1,
    paddingVertical: 12,
    alignItems: 'center',
  },
  tabText: {
    fontSize: 14,
    fontWeight: '600',
  },
  listContent: {
    padding: 16,
  },
  resourceCard: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  resourceContent: {
    flex: 1,
  },
  resourceTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 4,
  },
  resourceSubtitle: {
    fontSize: 14,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    marginTop: 16,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.7)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 500,
    maxHeight: '90%',
    borderRadius: 12,
    padding: 20,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 16,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
  },
  modalScroll: {
    maxHeight: 400,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
    marginTop: 12,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  textArea: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    minHeight: 150,
  },
  dateText: {
    fontSize: 12,
    marginTop: 12,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 24,
    paddingTop: 16,
    borderTopWidth: 1,
    borderTopColor: 'rgba(107, 114, 128, 0.2)',
  },
  deleteButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: 24,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  rightButtons: {
    flexDirection: 'row',
    gap: 10,
  },
  cancelButton: {
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 100,
  },
  cancelButtonText: {
    fontSize: 15,
    fontWeight: '600',
  },
  saveButton: {
    flexDirection: 'row',
    paddingVertical: 12,
    paddingHorizontal: 24,
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    minWidth: 120,
    shadowColor: '#3B82F6',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: {
    color: '#FFFFFF',
    fontSize: 15,
    fontWeight: '600',
  },
});
