import React, { useEffect, useRef, useState } from 'react';
import {
  LayoutAnimation,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  UIManager,
  useColorScheme,
  View
} from 'react-native';

if (Platform.OS === 'android') {
  UIManager.setLayoutAnimationEnabledExperimental?.(true);
}

const API_BASE = 'https://zon9g6gx9k.execute-api.us-east-1.amazonaws.com';

interface Tag {
  tagId: string;
  name: string;
}

export interface TagSelectorProps {
  /**
   * Valor actual de las etiquetas (separadas por comas)
   */
  value: string;
  
  /**
   * Callback cuando cambia el valor
   */
  onChangeText: (text: string) => void;
  
  /**
   * Modo de visualización: 'inline' siempre visible, 'toggle' con botón para mostrar/ocultar
   */
  mode?: 'inline' | 'toggle';
  
  /**
   * Placeholder del input
   */
  placeholder?: string;
  
  /**
   * Título que se muestra en el header (solo para modo toggle)
   */
  title?: string;
  
  /**
   * Texto del botón toggle (solo para modo toggle)
   */
  toggleButtonText?: string;
  
  /**
   * Icono del botón toggle (emoji)
   */
  toggleIcon?: string;
  
  /**
   * Usuario ID para cargar las etiquetas
   */
  userId: string;
  
  /**
   * Si debe estar visible al inicio (solo para modo toggle)
   */
  initiallyVisible?: boolean;
  
  /**
   * Máximo de sugerencias a mostrar
   */
  maxSuggestions?: number;
  
  /**
   * Tiempo de debounce para búsqueda (ms)
   */
  debounceTime?: number;
  
  /**
   * Array de etiquetas disponibles (opcional, si no se provee se cargan del backend)
   */
  availableTags?: Tag[];
  
  /**
   * Callback cuando se cargan las etiquetas desde el backend
   */
  onTagsLoaded?: (tags: Tag[]) => void;
  
  /**
   * Estilo personalizado del contenedor
   */
  containerStyle?: any;
  
  /**
   * Estilo personalizado del input
   */
  inputStyle?: any;
  
  /**
   * Mostrar texto de ayuda
   */
  showHelpText?: boolean;
  
  /**
   * Tema personalizado
   */
  customTheme?: {
    background?: string;
    card?: string;
    text?: string;
    border?: string;
    primary?: string;
  };
}

export const TagSelector: React.FC<TagSelectorProps> = ({
  value,
  onChangeText,
  mode = 'inline',
  placeholder = 'trabajo, urgente, reunión...',
  title = 'Etiquetas',
  toggleButtonText = 'Filtrar por etiquetas',
  toggleIcon = '🏷️',
  userId,
  initiallyVisible = false,
  maxSuggestions = 15,
  debounceTime = 300,
  availableTags: providedTags,
  onTagsLoaded,
  containerStyle,
  inputStyle,
  showHelpText = true,
  customTheme,
}) => {
  const colorScheme = useColorScheme();
  const isDark = colorScheme === 'dark';
  
  const defaultTheme = {
    background: isDark ? '#0A0E27' : '#F5F7FA',
    card: isDark ? '#1A1F3A' : '#FFFFFF',
    text: isDark ? '#FFFFFF' : '#1A1F3A',
    border: isDark ? '#2A2F4A' : '#E5E7EB',
    primary: '#3b82f6',
  };
  
  const theme = { ...defaultTheme, ...customTheme };
  
  const [isVisible, setIsVisible] = useState(mode === 'inline' ? true : initiallyVisible);
  const [availableTags, setAvailableTags] = useState<Tag[]>(providedTags || []);
  const [filteredTags, setFilteredTags] = useState<Tag[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const searchTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Cargar etiquetas del backend si no se proporcionaron
  useEffect(() => {
    if (!providedTags || providedTags.length === 0) {
      loadTags();
    }
  }, [userId, providedTags]);

  const loadTags = async () => {
    try {
      const res = await fetch(`${API_BASE}/tags?userId=${userId}&limit=1000`);
      if (res.ok) {
        const data = await res.json();
        const tagsArray = Array.isArray(data) ? data : (data.items || []);
        setAvailableTags(tagsArray);
        onTagsLoaded?.(tagsArray);
      }
    } catch (err) {
      console.error('Error loading tags:', err);
    }
  };

  // Filtrar etiquetas con debouncing
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!value.trim()) {
      setShowSuggestions(false);
      setFilteredTags([]);
      return;
    }

    const tagsList = value.split(',').map(t => t.trim());
    const lastTag = tagsList[tagsList.length - 1];

    if (!lastTag || lastTag.length < 2) {
      setShowSuggestions(false);
      setFilteredTags([]);
      return;
    }

    searchTimeoutRef.current = setTimeout(async () => {
      try {
        // Buscar en backend con searchTerm
        const res = await fetch(
          `${API_BASE}/tags?userId=${userId}&searchTerm=${encodeURIComponent(lastTag)}&limit=${maxSuggestions}`
        );
        if (res.ok) {
          const data = await res.json();
          const tagsArray = Array.isArray(data) ? data : (data.items || []);
          setFilteredTags(tagsArray.slice(0, maxSuggestions));
          setShowSuggestions(tagsArray.length > 0);
        }
      } catch (err) {
        console.error('Error searching tags:', err);
        setShowSuggestions(false);
      }
    }, debounceTime);

    return () => {
      if (searchTimeoutRef.current) {
        clearTimeout(searchTimeoutRef.current);
      }
    };
  }, [value, userId, maxSuggestions, debounceTime]);

  const toggleVisibility = () => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    
    // Si se está cerrando, limpiar el input
    if (isVisible) {
      onChangeText('');
      setShowSuggestions(false);
    }
    
    setIsVisible(!isVisible);
  };

  const selectTag = (tagName: string) => {
    const currentTags = value.split(',').map(t => t.trim()).filter(t => t);
    // Remover el último tag incompleto y agregar el seleccionado
    currentTags.pop();
    currentTags.push(tagName);
    onChangeText(currentTags.join(', ') + ', ');
    setShowSuggestions(false);
  };

  // Modo toggle: botón que expande/contrae
  if (mode === 'toggle' && !isVisible) {
    return (
      <TouchableOpacity
        onPress={toggleVisibility}
        style={[
          styles.toggleButton,
          { backgroundColor: theme.card, borderColor: theme.border },
          containerStyle,
        ]}
      >
        <Text style={{ color: theme.text, fontSize: 14 }}>
          {toggleIcon} {toggleButtonText}
        </Text>
      </TouchableOpacity>
    );
  }

  // Renderizar el selector completo
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: theme.card, borderColor: theme.border },
        containerStyle,
      ]}
    >
      {/* Header (solo en modo toggle) */}
      {mode === 'toggle' && (
        <View style={styles.header}>
          <View style={{ flexDirection: 'row', alignItems: 'center', gap: 8 }}>
            <Text style={{ fontSize: 20 }}>{toggleIcon}</Text>
            <Text style={{ color: theme.text, fontSize: 14, fontWeight: '600' }}>
              {title}
            </Text>
          </View>
          <TouchableOpacity onPress={toggleVisibility}>
            <Text style={{ color: theme.text, fontSize: 20 }}>✕</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Input de etiquetas */}
      <TextInput
        placeholder={placeholder}
        value={value}
        onChangeText={onChangeText}
        style={[
          styles.input,
          {
            color: theme.text,
            backgroundColor: mode === 'inline' ? (isDark ? '#1E293B' : '#F1F5F9') : 'transparent',
            borderColor: mode === 'inline' ? theme.border : 'rgba(255,255,255,0.3)',
          },
          inputStyle,
        ]}
        placeholderTextColor={isDark ? 'rgba(255,255,255,0.5)' : 'rgba(0,0,0,0.4)'}
      />

      {/* Texto de ayuda */}
      {showHelpText && (
        <Text style={{ color: 'rgba(255,255,255,0.6)', fontSize: 11, marginTop: 4 }}>
          Separa las etiquetas con comas
        </Text>
      )}

      {/* Sugerencias */}
      {showSuggestions && filteredTags.length > 0 && (
        <View style={styles.suggestionsContainer}>
          <Text style={{ color: theme.text, fontSize: 12, fontWeight: '600', marginBottom: 8 }}>
            Sugerencias ({filteredTags.length}):
          </Text>
          <ScrollView
            style={{ maxHeight: 150 }}
            showsVerticalScrollIndicator={true}
            keyboardShouldPersistTaps="handled"
            nestedScrollEnabled={true}
          >
            <View style={{ flexDirection: 'row', flexWrap: 'wrap', gap: 8 }}>
              {filteredTags.map((tag) => (
                <TouchableOpacity
                  key={tag.tagId}
                  onPress={() => selectTag(tag.name)}
                  style={[styles.tagChip, { backgroundColor: theme.primary }]}
                >
                  <Text style={{ color: '#fff', fontSize: 12 }}>{tag.name}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </ScrollView>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: 12,
    borderRadius: 12,
    borderWidth: 1,
  },
  toggleButton: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 8,
  },
  input: {
    padding: 12,
    borderRadius: 8,
    borderWidth: 1,
    fontSize: 14,
  },
  suggestionsContainer: {
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: 'rgba(255,255,255,0.2)',
  },
  tagChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    marginBottom: 8,
    marginRight: 8,
  },
});
