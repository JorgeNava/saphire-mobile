import { Image } from 'expo-image';
import { StyleSheet } from 'react-native';

import ParallaxScrollView from '@/components/ParallaxScrollView';
import { ThemedText } from '@/components/ThemedText';
import { ThemedView } from '@/components/ThemedView';

export default function HomeScreen() {
  return (
    <ParallaxScrollView
      headerBackgroundColor={{ light: '#F5F7FA', dark: '#0A0E27' }}
      headerImage={
        <Image
          source={require('@/assets/images/partial-react-logo.png')}
          style={styles.reactLogo}
        />
      }
    >
      <ThemedView style={styles.titleContainer}>
        <ThemedText type="title">Saphire Mobile</ThemedText>
        <ThemedText>Versión 1.5.1</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">✨ Novedades v1.5.1</ThemedText>
        <ThemedText>• Pull-to-refresh siempre carga desde backend</ThemedText>
        <ThemedText>• Filtrado de pensamientos por etiquetas mejorado</ThemedText>
        <ThemedText>• Fix de textos que se salen de contenedores</ThemedText>
        <ThemedText>• Validaciones y logs detallados</ThemedText>
        <ThemedText>• Mejor manejo de errores</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">💬 Chat Mejorado</ThemedText>
        <ThemedText>• Burbujas de mensaje estilo WhatsApp</ThemedText>
        <ThemedText>• Avatares para usuario y Zafira</ThemedText>
        <ThemedText>• Header con información del asistente</ThemedText>
        <ThemedText>• Estados visuales (enviando, enviado, error)</ThemedText>
        <ThemedText>• Historial completo de conversación</ThemedText>
        <ThemedText>• Sugerencias de etiquetas mejoradas</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">🏷️ Etiquetas Avanzadas</ThemedText>
        <ThemedText>• Filtrado local en tiempo real</ThemedText>
        <ThemedText>• Búsqueda en servidor con Enter</ThemedText>
        <ThemedText>• Indicadores visuales de búsqueda</ThemedText>
        <ThemedText>• Teclado permanece abierto al escribir</ThemedText>
        <ThemedText>• Botón de búsqueda rápida</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">📝 Pensamientos</ThemedText>
        <ThemedText>• Selección múltiple de pensamientos</ThemedText>
        <ThemedText>• Eliminación masiva con confirmación</ThemedText>
        <ThemedText>• Conversión a listas mejorada</ThemedText>
        <ThemedText>• Botones flotantes horizontales</ThemedText>
        <ThemedText>• Feedback detallado de operaciones</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">📋 Listas</ThemedText>
        <ThemedText>• Menú flotante con opciones</ThemedText>
        <ThemedText>• Modal "Nueva Lista" rediseñado</ThemedText>
        <ThemedText>• Modal "Desde Etiquetas" mejorado</ThemedText>
        <ThemedText>• Header con contador de listas</ThemedText>
        <ThemedText>• Inputs con mejor contraste</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">🔧 Tecnologías</ThemedText>
        <ThemedText>• React Native + Expo Router</ThemedText>
        <ThemedText>• TypeScript</ThemedText>
        <ThemedText>• AWS API Gateway + Lambda</ThemedText>
        <ThemedText>• DynamoDB</ThemedText>
        <ThemedText>• AsyncStorage para caché</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">🎨 Mejoras de UX/UI</ThemedText>
        <ThemedText>• Colores adaptativos (dark/light)</ThemedText>
        <ThemedText>• Bordes redondeados modernos</ThemedText>
        <ThemedText>• Sombras y elevaciones sutiles</ThemedText>
        <ThemedText>• Animaciones suaves (rotación, escala)</ThemedText>
        <ThemedText>• Feedback visual inmediato</ThemedText>
        <ThemedText>• Placeholders descriptivos</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">🔧 Correcciones v1.5.1</ThemedText>
        <ThemedText>• Pull-to-refresh ahora carga datos frescos del backend</ThemedText>
        <ThemedText>• Filtrado por etiquetas usa tagIds (sin falsos positivos)</ThemedText>
        <ThemedText>• Textos largos ya no se salen de contenedores</ThemedText>
        <ThemedText>• Tags en chat se guardan correctamente</ThemedText>
        <ThemedText>• Validación de arrays antes de filtrar</ThemedText>
        <ThemedText>• Logs detallados para debugging</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">📊 Estadísticas</ThemedText>
        <ThemedText>• 6 pantallas principales</ThemedText>
        <ThemedText>• 100% cobertura de caché</ThemedText>
        <ThemedText>• 80% menos requests al servidor</ThemedText>
        <ThemedText>• Historial completo de mensajes (100)</ThemedText>
        <ThemedText>• Búsqueda local instantánea</ThemedText>
      </ThemedView>
    </ParallaxScrollView>
  );
}

const styles = StyleSheet.create({
  titleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: 12,
  },
  stepContainer: {
    gap: 8,
    marginBottom: 12,
  },
  reactLogo: {
    height: 178,
    width: 290,
    bottom: 0,
    left: 0,
    position: 'absolute',
  },
});
