# 📱 Saphire Mobile - Tu Segundo Cerebro

Aplicación móvil desarrollada con **React Native** y **Expo** que funciona como tu asistente personal inteligente. Permite gestionar mensajes, pensamientos, notas y listas, todo integrado con IA y sincronizado con un backend serverless en AWS.

> **Versión actual**: 1.7.0  
> **Backend**: Saphire Backend v0.0.4

---

## 🚀 Tecnologías usadas

### Frontend
- **React Native** (Expo SDK 52)
- **TypeScript** para tipado estático
- **expo-router** para navegación con tabs
- **@expo/vector-icons** (Ionicons, MaterialIcons)
- **@react-native-community/datetimepicker** para selección de fechas
- **react-native-reanimated** para animaciones
- **@gluestack-ui/themed** para componentes UI

### Backend
- **AWS API Gateway** (HTTP API)
- **AWS Lambda** (Node.js 18.x)
- **Amazon DynamoDB** para persistencia
- **Amazon S3** para archivos adjuntos
- **OpenAI GPT-4 Turbo** para clasificación IA
- **OpenAI Whisper** para transcripción de audio

### Características Técnicas
- ✅ Cursor-based pagination
- ✅ Full-text search
- ✅ Real-time tag autocomplete
- ✅ Offline-first con caché local
- ✅ Dark/Light theme support

---

## 🛠 Instalación del proyecto

```bash
# Clonar el repositorio
$ git clone <tu-url-de-repo>
$ cd <proyecto>

# Instalar dependencias
$ npm install

# Instalar Expo CLI si no lo tienes
$ npm install -g expo-cli

# Instalar dependencias nativas (si aplica)
$ npx expo install react-native-toast-message @react-native-community/datetimepicker
```

---

## 📲 Ejecutar en dispositivo físico

1. **Instalar la app de Expo Go** en tu dispositivo (iOS o Android).
2. Ejecutar el siguiente comando:

```bash
npx expo start
```

3. Escanear el **QR Code** que aparece en consola o navegador con Expo Go.

> ⚠️ Asegúrate de que el celular y la PC estén en la misma red Wi-Fi.

---

## 🏗 Build de la app

Usamos **EAS Build** para generar versiones nativas:

```bash
npx expo install eas-cli
npx eas login
npx eas build -p android --profile preview
```

Si se instala una nueva dependencia nativa, es recomendable ejecutar:

```bash
npx expo prebuild
```

Y luego hacer el build con EAS.

---

## 🧭 Pantallas disponibles

### 💬 Chat
- Envío de mensajes de texto y audio
- Grabación de voz con visualización en tiempo real
- **Separadores por día** estilo WhatsApp (Hoy, Ayer, fecha)
- **Hora dentro de burbuja** de cada mensaje
- **Selector de etiquetas con chips** (toggle, búsqueda, horizontal scroll)
- Historial de conversación con paginación
- Integración con IA para clasificación automática

### 💭 Pensamientos
- Lista de pensamientos con paginación bidireccional
- **Modal de edición/eliminación** al hacer click
- **Búsqueda por contenido** con filtrado instantáneo
- Filtros avanzados:
  - Por etiquetas (con autocompletado)
  - Por fecha de creación
  - Por contenido (texto libre)
- Límite de resultados editable
- Contador de total en BD
- Caché inteligente (no guarda resultados filtrados)
- Edición/eliminación local sin re-fetch (orden consistente)

### 📝 Notas
- **CRUD completo**: Crear, editar, eliminar notas
- **Página dedicada** para editar notas (no modal)
- **UI limpia** sin apariencia de formulario
- **Etiquetas editables** como chips interactivos
- Agregar/eliminar etiquetas directamente
- **Búsqueda full-text** en tiempo real
- Paginación fija en la parte inferior
- Pull-to-refresh para actualizar
- Vista de cards con preview del contenido

### 📋 Listas
- Gestión de listas con items
- **Crear listas desde etiquetas**
- **Botón de refresh** para listas creadas desde tags
- **Bloqueo biométrico** con degradación graciosa
- **Botón compartir** directo en detalle de lista
- Agregar/eliminar items dinámicamente
- Marcar items como completados
- Sistema de etiquetas
- Pull-to-refresh para actualizar
- Vista detallada por lista

### ℹ️ Info
- Información de la aplicación
- Tecnologías utilizadas
- Pantallas disponibles

---

## ✨ Funcionalidades Destacadas

### 🎯 Sistema de Etiquetas
- Autocompletado inteligente mientras escribes
- Creación automática de tags si no existen
- Filtrado por múltiples etiquetas (lógica OR)
- Origen de tags: Manual o IA
- Contador de uso por tag

### 📄 Paginación Avanzada
- **Cursor-based pagination** con `lastKey`
- Navegación bidireccional (Anterior/Siguiente)
- Historial de páginas para volver atrás
- Límite de resultados configurable
- Indicador de página actual

### 🔍 Búsqueda Inteligente
- Full-text search en notas
- Búsqueda en título y contenido
- Resultados ordenados por relevancia
- Snippets con contexto del match
- Búsqueda en tiempo real (debounced)

### 💾 Caché Local
- Almacenamiento offline-first
- Sincronización en background
- Invalidación inteligente
- TTL configurable por recurso
- No cachea resultados filtrados

### 🎨 Tema Moderno
- Soporte Dark/Light mode
- Colores consistentes en toda la app
- Transiciones suaves
- Diseño Material Design
- SF Symbols en iOS, Material Icons en Android

---

## 🔌 Integración con Backend

### Endpoints Implementados

#### Messages
```
GET    /messages?conversationId=X&limit=50&sortOrder=asc
POST   /messages
POST   /messages/audio
GET    /messages/upload-url
PUT    /messages/{conversationId}/{timestamp}
DELETE /messages/{conversationId}/{timestamp}
```

#### Thoughts
```
GET    /thoughts?userId=X&limit=50&sortOrder=desc&tagNames=trabajo
POST   /thoughts
GET    /thoughts/{thoughtId}
PUT    /thoughts/{thoughtId}
DELETE /thoughts/{thoughtId}
```

#### Notes (NUEVO)
```
GET    /notes?userId=X&limit=20&sortOrder=desc
GET    /notes/search?userId=X&q=query
POST   /notes
GET    /notes/{noteId}
PUT    /notes/{noteId}
DELETE /notes/{noteId}
```

#### Lists
```
GET    /lists?userId=X
POST   /lists
GET    /lists/{listId}
PUT    /lists/{listId}
DELETE /lists/{listId}
POST   /lists/{listId}/items
DELETE /lists/{listId}/items/{itemId}
```

#### Tags
```
GET    /tags?userId=X
POST   /tags
GET    /tags/{tagId}
PUT    /tags/{tagId}
DELETE /tags/{tagId}
```

### Formato de Respuesta Paginada

```typescript
{
  items: T[],              // Items de la página actual
  count: number,           // Cantidad retornada
  scannedCount: number,    // Items evaluados
  lastKey: string | null,  // Token para siguiente página
  hasMore: boolean         // true si hay más páginas
}
```

---

## 📝 Roadmap

### ✅ Completado (v1.6.0)
- ✅ UI del Chat completamente rediseñada
- ✅ Búsqueda de etiquetas con filtrado local
- ✅ Eliminación múltiple de pensamientos
- ✅ Modales modernos con mejor UX
- ✅ Botón flotante con menú de acciones
- ✅ Mensajes persistentes en el chat
- ✅ Pantalla de Notas con CRUD completo
- ✅ Búsqueda full-text en Notas
- ✅ Modal de edición en Pensamientos
- ✅ Paginación bidireccional
- ✅ Sistema de etiquetas con autocompletado
- ✅ Tema moderno Dark/Light
- ✅ Caché local inteligente (100% cobertura)
- ✅ Integración completa con backend v0.0.4
- ✅ Página dedicada para editar notas (v1.5.0)
- ✅ Etiquetas editables como chips (v1.5.0)
- ✅ Pull-to-refresh en todas las pantallas (v1.5.0)
- ✅ Crear listas desde etiquetas (v1.5.0)
- ✅ Botón de refresh en listas con tags (v1.5.0)
- ✅ Búsqueda optimizada de tags con debouncing (v1.5.0)
- ✅ Navegación a nota desde detalle de etiqueta (v1.5.0)
- ✅ Agregar pensamiento a nota existente (v1.5.0)
- ✅ Chat con separadores por día y hora en burbuja (v1.6.0)
- ✅ Selector de etiquetas con chips en chat (v1.6.0)
- ✅ Búsqueda por contenido en pensamientos (v1.6.0)
- ✅ Bloqueo biométrico con degradación graciosa (v1.6.0)
- ✅ Tab bar se oculta con teclado sin flicker (v1.6.0)
- ✅ KeyboardAvoidingView unificado en toda la app (v1.6.0)

### 🚧 En Progreso
- [ ] Adjuntar archivos a notas (imágenes, PDFs)
- [ ] Soft delete y papelera de reciclaje
- [ ] Sincronización offline mejorada
- [ ] Tests unitarios y E2E

### 🔮 Futuro
- [ ] Autenticación con AWS Cognito
- [ ] Soporte multi-usuario
- [ ] Notificaciones push
- [ ] Versión web con expo-web
- [ ] Dashboard de estadísticas
- [ ] Encriptación end-to-end
- [ ] Base de conocimientos
- [ ] Exportar/Importar datos
- [ ] Compartir notas y listas
- [ ] Widgets para iOS/Android

---

## 🎨 Diseño y UX

### Paleta de Colores

**Dark Mode** 🌙
```
Background: #0A0E27
Cards:      #1A1F3A
Text:       #FFFFFF
Border:     #2A2F4A
Accent:     #3B82F6
```

**Light Mode** ☀️
```
Background: #F5F7FA
Cards:      #FFFFFF
Text:       #1A1F3A
Border:     #E5E7EB
Accent:     #3B82F6
```

### Iconografía
- **Chat**: `message.circle.fill` 💬
- **Pensamientos**: `tray.full.fill` 📥
- **Notas**: `doc.text.fill` 📄
- **Listas**: `list.bullet` 📋
- **Info**: `house.fill` 🏠

---

## 🤝 Contribuir

Cualquier contribución, idea o sugerencia es bienvenida 🙌

### Proceso
1. Fork el proyecto
2. Crea tu feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit tus cambios (`git commit -m 'feat: Add some AmazingFeature'`)
4. Push a la branch (`git push origin feature/AmazingFeature`)
5. Abre un Pull Request

---

## 📄 Licencia

Este proyecto es privado y de uso personal.

---

## 👤 Autor

**Jorge Nava**
- GitHub: [@JorgeNava](https://github.com/JorgeNava)
