import { useCallback, useEffect, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Stack, useLocalSearchParams, useRouter } from 'expo-router';
import {
  ActivityIndicator,
  Alert,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
  useColorScheme,
} from 'react-native';
import { cacheService } from '../../services/cacheService';

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

export default function NoteDetailScreen() {
  const { id } = useLocalSearchParams<{ id: string }>();
  const router = useRouter();
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';

  const theme = {
    background: isDark ? '#0A0E27' : '#F5F7FA',
    card: isDark ? '#1A1F3A' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1F3A',
    textSecondary: isDark ? 'rgba(255,255,255,0.6)' : 'rgba(0,0,0,0.6)',
    border: isDark ? '#2A2F4A' : '#E5E7EB',
  };

  const [note, setNote] = useState<Note | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [deleting, setDeleting] = useState(false);

  // Estados editables
  const [title, setTitle] = useState('');
  const [content, setContent] = useState('');
  const [tags, setTags] = useState('');
  const [tagArray, setTagArray] = useState<string[]>([]);
  const [newTagInput, setNewTagInput] = useState('');

  // Cargar nota
  const fetchNote = useCallback(async () => {
    if (!id) return;
    
    setLoading(true);
    try {
      const response = await fetch(`${NOTES_ENDPOINT}/${id}?userId=${userId}`);
      if (!response.ok) {
        throw new Error('No se pudo cargar la nota');
      }

      const data = await response.json();
      setNote(data);
      setTitle(data.title);
      setContent(data.content);
      const tagsArray = data.tagNames || [];
      setTags(tagsArray.join(', '));
      setTagArray(tagsArray);
    } catch (err) {
      console.error('❌ Error:', err);
      Alert.alert('Error', 'No se pudo cargar la nota');
      router.back();
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchNote();
  }, [fetchNote]);

  // Agregar tag
  const addTag = () => {
    const trimmedTag = newTagInput.trim();
    if (trimmedTag && !tagArray.includes(trimmedTag)) {
      setTagArray([...tagArray, trimmedTag]);
      setNewTagInput('');
    }
  };

  // Eliminar tag
  const removeTag = (tagToRemove: string) => {
    setTagArray(tagArray.filter(tag => tag !== tagToRemove));
  };

  // Guardar cambios
  const saveNote = async () => {
    if (!note) return;
    if (!title.trim() || !content.trim()) {
      Alert.alert('Error', 'El título y contenido son requeridos');
      return;
    }

    setSaving(true);
    try {
      const response = await fetch(`${NOTES_ENDPOINT}/${note.noteId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          userId,
          title: title.trim(),
          content: content.trim(),
          tagNames: tagArray,
          tagSource: 'Manual',
        }),
      });

      if (response.ok) {
        console.log('✅ Nota actualizada');
        // Invalidar caché
        await cacheService.set('cache_notes', null, 0);
        Alert.alert('Éxito', 'Nota actualizada correctamente', [
          { text: 'OK', onPress: () => router.back() }
        ]);
      } else {
        throw new Error('Error al actualizar');
      }
    } catch (err) {
      console.error('❌ Error:', err);
      Alert.alert('Error', 'No se pudo actualizar la nota');
    } finally {
      setSaving(false);
    }
  };

  // Eliminar nota
  const deleteNote = () => {
    if (!note) return;

    Alert.alert(
      'Eliminar nota',
      '¿Estás seguro de eliminar esta nota?',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Eliminar',
          style: 'destructive',
          onPress: async () => {
            setDeleting(true);
            try {
              const response = await fetch(`${NOTES_ENDPOINT}/${note.noteId}?userId=${userId}`, {
                method: 'DELETE',
              });

              if (response.ok) {
                console.log('✅ Nota eliminada');
                // Invalidar caché
                await cacheService.set('cache_notes', null, 0);
                Alert.alert('Éxito', 'Nota eliminada correctamente', [
                  { text: 'OK', onPress: () => router.back() }
                ]);
              } else {
                throw new Error('Error al eliminar');
              }
            } catch (err) {
              console.error('❌ Error:', err);
              Alert.alert('Error', 'No se pudo eliminar la nota');
            } finally {
              setDeleting(false);
            }
          },
        },
      ]
    );
  };

  if (loading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <ActivityIndicator size="large" color="#3b82f6" style={{ marginTop: 100 }} />
      </View>
    );
  }

  if (!note) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        <Text style={[styles.errorText, { color: theme.text }]}>Nota no encontrada</Text>
      </View>
    );
  }

  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      
      <View style={[styles.container, { backgroundColor: theme.background }]}>
        {/* Header personalizado */}
        <View style={[styles.header, { backgroundColor: theme.card, borderBottomColor: theme.border }]}>
          <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={26} color={theme.text} />
          </TouchableOpacity>
          <View style={styles.headerCenter}>
            <Text style={[styles.headerTitle, { color: theme.text }]} numberOfLines={1}>
              {title || 'Nota'}
            </Text>
          </View>
          <View style={styles.headerActions}>
            <TouchableOpacity
              onPress={deleteNote}
              disabled={deleting}
              style={styles.deleteButton}
            >
              {deleting ? (
                <ActivityIndicator size="small" color="#ef4444" />
              ) : (
                <Ionicons name="trash-outline" size={24} color="#ef4444" />
              )}
            </TouchableOpacity>
            <TouchableOpacity
              onPress={saveNote}
              disabled={saving}
              style={[styles.saveIconButton, { opacity: saving ? 0.6 : 1 }]}
            >
              {saving ? (
                <ActivityIndicator size="small" color="#3b82f6" />
              ) : (
                <Ionicons name="checkmark-circle" size={26} color="#3b82f6" />
              )}
            </TouchableOpacity>
          </View>
        </View>

      <KeyboardAvoidingView
        style={{ flex: 1 }}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 0}
      >
        <ScrollView
          style={styles.content}
          contentContainerStyle={styles.contentContainer}
          keyboardShouldPersistTaps="handled"
        >
          {/* Título editable */}
          <TextInput
            value={title}
            onChangeText={setTitle}
            placeholder="Título de la nota"
            style={[styles.titleInput, { color: theme.text }]}
            placeholderTextColor={theme.textSecondary}
            multiline
          />

          {/* Etiquetas editables */}
          <View style={styles.tagsContainer}>
            {tagArray.map((tag, index) => (
              <View key={index} style={styles.tagChip}>
                <Text style={styles.tagText}>{tag}</Text>
                <TouchableOpacity onPress={() => removeTag(tag)} style={styles.removeTagButton}>
                  <Ionicons name="close-circle" size={16} color="#fff" />
                </TouchableOpacity>
              </View>
            ))}
            {/* Input para agregar nueva etiqueta */}
            <View style={styles.addTagContainer}>
              <TextInput
                value={newTagInput}
                onChangeText={setNewTagInput}
                placeholder="+ Agregar etiqueta"
                style={[styles.addTagInput, { color: theme.text }]}
                placeholderTextColor={theme.textSecondary}
                onSubmitEditing={addTag}
                returnKeyType="done"
              />
            </View>
          </View>

          {/* Contenido editable */}
          <TextInput
            value={content}
            onChangeText={setContent}
            multiline
            placeholder="Escribe el contenido de tu nota..."
            style={[styles.contentInput, { color: theme.text }]}
            placeholderTextColor={theme.textSecondary}
            textAlignVertical="top"
          />

          <View style={{ height: 50 }} />
        </ScrollView>
      </KeyboardAvoidingView>
      </View>
    </>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    paddingTop: 50,
    borderBottomWidth: 1,
  },
  backButton: {
    padding: 8,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
    paddingHorizontal: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '600',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  saveIconButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    padding: 20,
  },
  titleInput: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 16,
    paddingVertical: 8,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginBottom: 20,
  },
  tagChip: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#3b82f6',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    gap: 6,
  },
  tagText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '500',
  },
  removeTagButton: {
    marginLeft: 2,
  },
  addTagContainer: {
    borderWidth: 1,
    borderColor: 'rgba(59, 130, 246, 0.5)',
    borderStyle: 'dashed',
    borderRadius: 16,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  addTagInput: {
    fontSize: 12,
    minWidth: 100,
    padding: 0,
  },
  contentInput: {
    fontSize: 16,
    lineHeight: 24,
    minHeight: 200,
    paddingVertical: 8,
  },
  errorText: {
    fontSize: 16,
    textAlign: 'center',
    marginTop: 100,
  },
});
