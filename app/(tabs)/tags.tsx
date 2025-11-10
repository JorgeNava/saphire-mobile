import { useCallback, useEffect, useState } from 'react';
import { useFocusEffect } from '@react-navigation/native';
import {
  ActivityIndicator,
  Alert,
  FlatList,
  Modal,
  Platform,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
  useColorScheme,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { cacheService } from '../../services/cacheService';

const API_BASE = 'https://zon9g6gx9k.execute-api.us-east-1.amazonaws.com';
const userId = 'user123';

interface Tag {
  tagId: string;
  userId: string;
  name: string;
  color: string;
  usageCount: number;
  createdAt: string;
  updatedAt: string;
}

export default function TagsScreen() {
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#0A0E27' : '#F5F7FA',
    card: isDark ? '#1A1F3A' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1F3A',
    border: isDark ? '#2A2F4A' : '#E5E7EB',
    placeholder: isDark ? '#6B7280' : '#9CA3AF',
  };

  // Estados
  const [tags, setTags] = useState<Tag[]>([]);
  const [loading, setLoading] = useState(false);
  const [refreshing, setRefreshing] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [limit, setLimit] = useState(25);
  const [lastKey, setLastKey] = useState<string | null>(null);
  const [hasMore, setHasMore] = useState(false);
  const [totalCount, setTotalCount] = useState(0);
  const [showLimitModal, setShowLimitModal] = useState(false);

  // Estados para editar
  const [editingTag, setEditingTag] = useState<Tag | null>(null);
  const [showEditModal, setShowEditModal] = useState(false);
  const [editName, setEditName] = useState('');
  const [editColor, setEditColor] = useState('');

  // Debounce para búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (searchTerm !== undefined) {
        fetchTags(true);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [searchTerm, limit]);

  // Cargar tags
  const fetchTags = async (reset = false) => {
    if (loading) return;
    
    setLoading(true);
    try {
      // Intentar caché solo en primera carga sin búsqueda
      if (reset && !searchTerm) {
        const cached = await cacheService.get('cache_tags');
        if (cached && Array.isArray(cached)) {
          setTags(cached as Tag[]);
          console.log('✅ Tags cargados desde caché');
        }
      }

      const params = new URLSearchParams({
        userId,
        limit: limit.toString(),
        sortOrder: 'desc',
      });

      if (searchTerm) params.append('searchTerm', searchTerm);
      if (!reset && lastKey) params.append('lastKey', lastKey);

      const response = await fetch(`${API_BASE}/tags?${params}`);
      if (!response.ok) throw new Error('Error al cargar tags');

      const data = await response.json();
      
      // Si es un array simple (formato antiguo)
      if (Array.isArray(data)) {
        const newTags = reset ? data : [...tags, ...data];
        setTags(newTags);
        setHasMore(false);
        // Para array simple, el total es lo que tenemos cargado
        setTotalCount(newTags.length);
      } else {
        // Formato nuevo con paginación
        const newTags = reset ? data.items : [...tags, ...data.items];
        setTags(newTags);
        setLastKey(data.lastKey || null);
        setHasMore(data.hasMore || false);
        // Si el backend provee totalCount, usarlo; si no, usar lo cargado
        setTotalCount(data.totalCount || newTags.length);
      }

      // Guardar en caché solo primera página sin búsqueda
      if (reset && !searchTerm) {
        const tagsToCache = Array.isArray(data) ? data : data.items;
        await cacheService.set('cache_tags', tagsToCache, 10 * 60 * 1000); // 10 minutos
        console.log('✅ Tags guardados en caché');
      }

      console.log(`✅ Loaded ${Array.isArray(data) ? data.length : data.items.length} tags`);
    } catch (err) {
      console.error('❌ Error fetching tags:', err);
      Alert.alert('Error', 'No se pudieron cargar las etiquetas');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  // Refresh
  const onRefresh = () => {
    setRefreshing(true);
    setLastKey(null);
    fetchTags(true);
  };

  // Load more
  const loadMore = () => {
    if (hasMore && !loading) {
      fetchTags(false);
    }
  };

  // Cargar al montar
  useFocusEffect(
    useCallback(() => {
      fetchTags(true);
    }, [])
  );

  // Abrir modal de edición
  const openEditModal = (tag: Tag) => {
    setEditingTag(tag);
    setEditName(tag.name);
    setEditColor(tag.color);
    setShowEditModal(true);
  };

  // Guardar edición
  const saveEdit = async () => {
    if (!editingTag || !editName.trim()) {
      Alert.alert('Error', 'El nombre es requerido');
      return;
    }

    try {
      const response = await fetch(`${API_BASE}/tags/${editingTag.tagId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          name: editName.trim(),
          color: editColor,
        }),
      });

      if (response.ok) {
        console.log('✅ Tag actualizado');
        // Invalidar caché
        await cacheService.set('cache_tags', null, 0);
        setShowEditModal(false);
        fetchTags(true);
      } else {
        throw new Error('Error al actualizar');
      }
    } catch (err) {
      console.error('❌ Error:', err);
      Alert.alert('Error', 'No se pudo actualizar la etiqueta');
    }
  };

  // Eliminar tag
  const handleDelete = async (tag: Tag) => {
    Alert.alert(
      'Eliminar Etiqueta',
      `¿Estás seguro de eliminar "${tag.name}"? Se eliminará de todos los recursos.`,
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            try {
              const response = await fetch(`${API_BASE}/tags/${tag.tagId}`, {
                method: 'DELETE',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ userId }),
              });

              if (response.ok) {
                console.log('✅ Tag eliminado');
                // Invalidar caché
                await cacheService.set('cache_tags', null, 0);
                fetchTags(true);
              } else {
                throw new Error('Error al eliminar');
              }
            } catch (err) {
              console.error('❌ Error:', err);
              Alert.alert('Error', 'No se pudo eliminar la etiqueta');
            }
          },
        },
      ]
    );
  };

  // Render tag card
  const renderTag = ({ item: tag }: { item: Tag }) => (
    <Pressable
      onPress={() => router.push(`/tags/${tag.tagId}`)}
      style={[styles.tagCard, { backgroundColor: theme.card, borderColor: theme.border }]}
    >
      <View style={styles.tagHeader}>
        <View style={styles.tagInfo}>
          <View style={[styles.colorDot, { backgroundColor: tag.color || '#3B82F6' }]} />
          <Text style={[styles.tagName, { color: theme.text }]}>{tag.name}</Text>
        </View>
        <Text style={[styles.usageCount, { color: theme.placeholder }]}>
          {tag.usageCount || 0} recursos
        </Text>
      </View>

      <View style={styles.tagActions}>
        <Pressable
          onPress={() => openEditModal(tag)}
          style={[styles.actionButton, { backgroundColor: 'rgba(59, 130, 246, 0.1)' }]}
        >
          <Ionicons name="pencil" size={16} color="#3B82F6" />
        </Pressable>
        <Pressable
          onPress={() => handleDelete(tag)}
          style={[styles.actionButton, { backgroundColor: 'rgba(239, 68, 68, 0.1)' }]}
        >
          <Ionicons name="trash" size={16} color="#EF4444" />
        </Pressable>
      </View>
    </Pressable>
  );

  // Render header
  const renderHeader = () => (
    <View style={styles.header}>
      {/* Search bar */}
      <View style={[styles.searchContainer, { backgroundColor: theme.card, borderColor: theme.border }]}>
        <Ionicons name="search" size={20} color={theme.placeholder} />
        <TextInput
          style={[styles.searchInput, { color: theme.text }]}
          placeholder="Buscar etiquetas..."
          placeholderTextColor={theme.placeholder}
          value={searchTerm}
          onChangeText={setSearchTerm}
        />
        {searchTerm ? (
          <Pressable onPress={() => setSearchTerm('')}>
            <Ionicons name="close-circle" size={20} color={theme.placeholder} />
          </Pressable>
        ) : null}
      </View>

      {/* Counter and limit selector */}
      <View style={styles.counterRow}>
        <Text style={[styles.counterText, { color: theme.text }]}>
          Mostrando {tags.length} de {totalCount} etiquetas
        </Text>
        <Pressable
          onPress={() => setShowLimitModal(true)}
          style={[styles.limitButton, { backgroundColor: theme.card, borderColor: theme.border }]}
        >
          <Text style={[styles.limitText, { color: theme.text }]}>{limit}</Text>
          <Ionicons name="chevron-down" size={16} color={theme.text} />
        </Pressable>
      </View>
    </View>
  );

  return (
    <SafeAreaView style={[styles.container, { backgroundColor: theme.background }]} edges={['top']}>
      <FlatList
        data={tags}
        renderItem={renderTag}
        keyExtractor={(item) => item.tagId}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.listContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={onRefresh} />
        }
        onEndReached={loadMore}
        onEndReachedThreshold={0.5}
        ListFooterComponent={
          loading && !refreshing ? (
            <ActivityIndicator size="large" color="#3B82F6" style={styles.loader} />
          ) : null
        }
        ListEmptyComponent={
          !loading ? (
            <View style={styles.emptyContainer}>
              <Ionicons name="pricetag-outline" size={64} color={theme.placeholder} />
              <Text style={[styles.emptyText, { color: theme.placeholder }]}>
                {searchTerm ? 'No se encontraron etiquetas' : 'No hay etiquetas'}
              </Text>
            </View>
          ) : null
        }
      />

      {/* Modal de límite */}
      <Modal
        visible={showLimitModal}
        transparent
        animationType="fade"
        onRequestClose={() => setShowLimitModal(false)}
      >
        <Pressable
          style={styles.modalOverlay}
          onPress={() => setShowLimitModal(false)}
        >
          <View style={[styles.modalContent, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Elementos por página
            </Text>
            {[10, 25, 50, 100].map((value) => (
              <Pressable
                key={value}
                onPress={() => {
                  setLimit(value);
                  setShowLimitModal(false);
                  setLastKey(null);
                }}
                style={[
                  styles.limitOption,
                  limit === value && { backgroundColor: 'rgba(59, 130, 246, 0.1)' },
                ]}
              >
                <Text style={[styles.limitOptionText, { color: theme.text }]}>
                  {value}
                </Text>
                {limit === value && <Ionicons name="checkmark" size={20} color="#3B82F6" />}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>

      {/* Modal de edición */}
      <Modal
        visible={showEditModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowEditModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.editModal, { backgroundColor: theme.card }]}>
            <Text style={[styles.modalTitle, { color: theme.text }]}>
              Editar Etiqueta
            </Text>

            <TextInput
              style={[styles.input, { color: theme.text, borderColor: theme.border }]}
              placeholder="Nombre"
              placeholderTextColor={theme.placeholder}
              value={editName}
              onChangeText={setEditName}
            />

            <Text style={[styles.label, { color: theme.text }]}>Color:</Text>
            <View style={styles.colorPicker}>
              {['#EF4444', '#F59E0B', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899'].map((color) => (
                <Pressable
                  key={color}
                  onPress={() => setEditColor(color)}
                  style={[
                    styles.colorOption,
                    { backgroundColor: color },
                    editColor === color && styles.colorOptionSelected,
                  ]}
                />
              ))}
            </View>

            <View style={styles.modalActions}>
              <Pressable
                onPress={() => setShowEditModal(false)}
                style={[styles.modalButton, { backgroundColor: '#6B7280' }]}
              >
                <Text style={styles.modalButtonText}>Cancelar</Text>
              </Pressable>
              <Pressable
                onPress={saveEdit}
                style={[styles.modalButton, { backgroundColor: '#3B82F6' }]}
              >
                <Text style={styles.modalButtonText}>Guardar</Text>
              </Pressable>
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
  listContent: {
    padding: 16,
  },
  header: {
    marginBottom: 16,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  searchInput: {
    flex: 1,
    marginLeft: 8,
    fontSize: 16,
  },
  counterRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  counterText: {
    fontSize: 14,
    fontWeight: '600',
  },
  limitButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 8,
    paddingHorizontal: 12,
    borderRadius: 8,
    borderWidth: 1,
    gap: 4,
  },
  limitText: {
    fontSize: 14,
    fontWeight: '600',
  },
  tagCard: {
    padding: 16,
    borderRadius: 12,
    borderWidth: 1,
    marginBottom: 12,
  },
  tagHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  tagInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  colorDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
  },
  tagName: {
    fontSize: 16,
    fontWeight: '600',
  },
  usageCount: {
    fontSize: 14,
  },
  tagActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    padding: 8,
    borderRadius: 8,
  },
  loader: {
    marginVertical: 20,
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
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    width: '100%',
    maxWidth: 300,
    borderRadius: 12,
    padding: 20,
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 16,
  },
  limitOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    marginBottom: 8,
  },
  limitOptionText: {
    fontSize: 16,
  },
  editModal: {
    width: '100%',
    maxWidth: 400,
    borderRadius: 12,
    padding: 20,
  },
  input: {
    borderWidth: 1,
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 16,
  },
  label: {
    fontSize: 14,
    fontWeight: '600',
    marginBottom: 8,
  },
  colorPicker: {
    flexDirection: 'row',
    gap: 12,
    marginBottom: 20,
  },
  colorOption: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  colorOptionSelected: {
    borderWidth: 3,
    borderColor: '#FFFFFF',
  },
  modalActions: {
    flexDirection: 'row',
    gap: 12,
  },
  modalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  modalButtonText: {
    color: '#FFFFFF',
    fontSize: 16,
    fontWeight: '600',
  },
});
