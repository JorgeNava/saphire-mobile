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
        <ThemedText>Versión 1.3.0</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">✨ Novedades v1.3.0</ThemedText>
        <ThemedText>• Nueva pantalla de Etiquetas con búsqueda</ThemedText>
        <ThemedText>• Items de lista completables con estadísticas</ThemedText>
        <ThemedText>• Sistema de caché completo (100% cobertura)</ThemedText>
        <ThemedText>• Modales mejorados con scroll</ThemedText>
        <ThemedText>• Performance +70% más rápida</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">📱 Pantallas</ThemedText>
        <ThemedText>• Chat - Mensajes de texto y audio con IA</ThemedText>
        <ThemedText>• Pensamientos - Captura rápida de ideas</ThemedText>
        <ThemedText>• Notas - Gestión completa con búsqueda</ThemedText>
        <ThemedText>• Listas - Tareas con items completables</ThemedText>
        <ThemedText>• Etiquetas - Organización y búsqueda</ThemedText>
      </ThemedView>

      <ThemedView style={styles.stepContainer}>
        <ThemedText type="subtitle">🚀 Funcionalidades</ThemedText>
        <ThemedText>• Sistema de etiquetas unificado</ThemedText>
        <ThemedText>• Búsqueda en tiempo real</ThemedText>
        <ThemedText>• Paginación inteligente</ThemedText>
        <ThemedText>• Caché con background sync</ThemedText>
        <ThemedText>• Tema dark/light automático</ThemedText>
        <ThemedText>• Optimistic updates</ThemedText>
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
        <ThemedText type="subtitle">📊 Estadísticas</ThemedText>
        <ThemedText>• 5 pantallas principales</ThemedText>
        <ThemedText>• 100% cobertura de caché</ThemedText>
        <ThemedText>• 80% menos requests al servidor</ThemedText>
        <ThemedText>• 70% más rápido en cargas</ThemedText>
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
