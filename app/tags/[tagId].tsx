import { useCallback, useState } from 'react';
import { useFocusEffect, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  FlatList,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
  useColorScheme,
} from 'react-native';
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
      onPress = () => {}; // Navegar a detalle de thought
    } else if (activeTab === 'lists') {
      title = item.name || 'Sin nombre';
      subtitle = `${item.items?.length || 0} elementos`;
      onPress = () => router.push(`/list/${item.listId}` as any);
    } else if (activeTab === 'notes') {
      title = item.title || 'Sin título';
      subtitle = new Date(item.createdAt).toLocaleDateString();
      onPress = () => {}; // Navegar a detalle de note
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
    <View style={[styles.container, { backgroundColor: theme.background }]}>
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
    </View>
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
});
