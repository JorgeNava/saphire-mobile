# Changelog

Todos los cambios notables en este proyecto serán documentados en este archivo.

El formato está basado en [Keep a Changelog](https://keepachangelog.com/es-ES/1.0.0/),
y este proyecto adhiere a [Semantic Versioning](https://semver.org/lang/es/).

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
