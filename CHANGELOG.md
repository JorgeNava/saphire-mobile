# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

---

## [1.2.0] - 2025-11-09

### ✨ Añadido

#### 📝 Nueva Pantalla de Notas
- **CRUD Completo**: Crear, leer, actualizar y eliminar notas
- **Búsqueda Full-Text**: Búsqueda en tiempo real en título y contenido
- **Paginación**: Navegación con botones Anterior/Siguiente
- **Modal de Edición**: Diseño moderno para editar notas
- **Sistema de Etiquetas**: Soporte completo para tags
- **Vista de Cards**: Preview del contenido con truncado
- **Integración Backend**: Endpoints `/notes`, `/notes/search`, `/notes/{noteId}`

#### 💭 Mejoras en Pensamientos
- **Modal de Edición/Eliminación**: Click en pensamiento abre modal
- **Paginación Bidireccional**: Navegación Anterior/Siguiente con historial
- **Filtro de Etiquetas Expandible**: Botón se transforma en box de filtros
- **Autocompletado de Tags**: Estilo idéntico a Chat con sugerencias en chips
- **Límite Editable**: Input para cambiar cantidad de resultados
- **Contador de Total**: Muestra total de pensamientos en BD (no solo página actual)
- **Limpieza Automática**: Filtros se limpian al cerrar el box
- **Botón Eliminar Mejorado**: Icono circular con Ionicons

#### 🎨 Tema Moderno Unificado
- **Nuevo Esquema de Colores**: Aplicado a todas las pantallas
  - Dark: `#0A0E27` (bg), `#1A1F3A` (cards), `#FFFFFF` (text)
  - Light: `#F5F7FA` (bg), `#FFFFFF` (cards), `#1A1F3A` (text)
- **Consistencia Visual**: Chat, Pensamientos, Notas, Listas e Info
- **Transiciones Suaves**: Animaciones con LayoutAnimation

#### 🧭 Navegación Mejorada
- **Nueva Pestaña Notas**: Icono `doc.text.fill` 📄
- **Iconos Actualizados**: 
  - Chat: `message.circle.fill` 💬
  - Pensamientos: `tray.full.fill` 📥
  - Notas: `doc.text.fill` 📄
  - Listas: `list.bullet` 📋
  - Info: `house.fill` 🏠
- **Mapeo de Iconos**: SF Symbols ↔ Material Icons correctamente mapeados

### 🔧 Corregido

#### Paginación
- **Thoughts**: Aplicar filtros ahora resetea a página 1
- **Navegación Bidireccional**: Historial de páginas para volver correctamente
- **LastKey Management**: Uso correcto de `lastKey` en paginación
- **Total Count**: Cálculo correcto del total de pensamientos (no cambia al filtrar)

#### UI/UX
- **Modal de Edición**: Botones bien alineados (Eliminar circular a la izquierda)
- **Icono de Eliminar**: Ionicons `trash` correctamente centrado
- **Filtros de Tags**: Se limpian automáticamente al cerrar
- **Iconos de Navegación**: Todos visibles y correctamente renderizados

### 🎨 Mejorado

#### Paginación Avanzada
- **Cursor-based Pagination**: Implementación completa con `lastKey`
- **Historial de Páginas**: Array `pageHistory` para navegación bidireccional
- **Reset Inteligente**: Aplicar filtros resetea paginación automáticamente
- **Custom LastKey**: Parámetro opcional para control fino de paginación

#### Sistema de Caché
- **Caché Inteligente**: No guarda resultados filtrados
- **Invalidación Automática**: Se limpia al aplicar filtros
- **TTL Configurable**: 2 minutos para thoughts
- **Logs Detallados**: Información clara de operaciones de caché

#### Búsqueda
- **Full-Text Search**: Implementado en Notas
- **Debouncing**: Búsqueda después de 300ms de inactividad
- **Resultados por Relevancia**: Ordenados por score
- **Snippets**: Contexto alrededor del match

### 📝 Cambios Técnicos

#### API Integration
- **Paginación Backend**: Respuestas con `{ items, count, hasMore, lastKey }`
- **Notes Endpoints**: GET, POST, PUT, DELETE, SEARCH
- **Thoughts Pagination**: Actualizado para usar respuesta paginada
- **Messages Pagination**: Actualizado para usar respuesta paginada

#### Componentes
- **IconSymbol**: Mapeo agregado para `doc.text.fill` y `list.bullet`
- **Modal Reutilizable**: Diseño consistente entre Thoughts y Notes
- **Theme Object**: Estructura unificada en todas las pantallas

#### Estado y Hooks
- **pageHistory**: Array para historial de navegación
- **isLoadingTotal**: Flag para prevenir múltiples cálculos
- **showEditModal**: Control de modal de edición
- **searchQuery**: Estado para búsqueda en tiempo real

### 📊 Estadísticas
- **Archivos Modificados**: 7
- **Líneas Agregadas**: 1,475
- **Líneas Eliminadas**: 102
- **Nuevo Archivo**: `app/(tabs)/notes.tsx` (631 líneas)

---

## [1.1.0] - 2025-11-09

### ✨ Añadido

#### Sistema de Etiquetas (Tags)
- **Pantalla de Listas**: Visualización de tags con `tagIds` y `tagNames` sincronizados con el backend
- **Pantalla de Detalle de Lista**: 
  - Gestión completa de tags (agregar/remover)
  - Selector de tags disponibles con scroll
  - Sincronización automática con el backend usando `PUT /lists/{listId}`
  - Validación para evitar tags duplicados
- **Mensajes de Audio**: Soporte para agregar tags al enviar mensajes de audio
  - Los tags se mantienen visibles durante la grabación
  - Se limpian automáticamente después de enviar exitosamente

#### Contadores de Elementos
- **Pantalla de Pensamientos**: Contador de mensajes mostrados (ej: "15 pensamientos")
- **Pantalla de Listas**: Contador de listas totales (ej: "4 listas")
- **Pantalla de Detalle de Lista**: Contador de elementos en la lista (ej: "8 elementos")

#### Recarga Automática
- **Pantalla de Listas**: Se recarga automáticamente al regresar de la pantalla de detalle usando `useFocusEffect`
- **Pantalla de Pensamientos**: Se recarga automáticamente al cambiar de tab

### 🔧 Corregido

#### Backend
- Corregido el bug donde el backend no devolvía `tagIds` y `tagNames` después de `PUT /lists/{listId}`
- Documentado y reportado bugs del backend para mensajes de texto y audio

#### Frontend
- **Items de Lista**: Soporte para items en formato objeto `{itemId, content}` además de strings simples
- **Tags en Audio**: Los tags ya no se borran al iniciar la grabación, solo después de enviar exitosamente
- **Crash en Detalle de Lista**: Corregido el error "Objects are not valid as a React child" al renderizar items

### 🎨 Mejorado

#### Interfaz de Usuario
- **Selector de Tags**: Implementado con scroll para manejar listas largas de tags disponibles
- **Feedback Visual**: Indicadores claros de estado (agregando, removiendo tags)
- **Contadores**: Información en tiempo real del número de elementos en cada pantalla

#### Código
- Limpieza masiva de logs de debug (~50 logs eliminados)
- Mantenidos solo logs de errores críticos
- Código más limpio y profesional
- Mejor manejo de errores con mensajes claros al usuario

### 📝 Cambios Técnicos

#### Estructura de Datos
- Migración de `tags: string[]` a `tagIds: string[]` + `tagNames: string[]`
- Soporte para backward compatibility con formato legacy
- Normalización de items de lista (strings y objetos)

#### API
- Actualización de endpoints a nuevo API Gateway: `zon9g6gx9k.execute-api.us-east-1.amazonaws.com`
- Implementación correcta de payloads para mensajes:
  - `content`, `inputType`, `sender`, `tagNames`, `tagSource`
- Envío de lista completa en actualizaciones (`PUT /lists/{listId}`)

#### Hooks y Estado
- Implementación de `useFocusEffect` para recarga automática
- Gestión de estado completo de listas con `fullListData`
- Sincronización de `tagIds` y `tagNames` en todas las operaciones

---

## [1.0.0] - 2025-05-27

### ✨ Inicial
- Implementación inicial de la aplicación móvil Saphire
- Pantalla de Chat con mensajes de texto y audio
- Pantalla de Pensamientos con filtros
- Pantalla de Listas básica
- Integración con backend AWS

---

## Tipos de Cambios

- **✨ Añadido**: Para nuevas funcionalidades
- **🔧 Corregido**: Para corrección de bugs
- **🎨 Mejorado**: Para mejoras en funcionalidades existentes
- **🗑️ Eliminado**: Para funcionalidades eliminadas
- **🔒 Seguridad**: Para correcciones de seguridad
- **📝 Documentación**: Para cambios en documentación
- **⚡ Rendimiento**: Para mejoras de rendimiento
