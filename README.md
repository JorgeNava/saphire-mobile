# 📱 App de Mensajes - React Native + Expo

Aplicación móvil desarrollada con **React Native** y **Expo** que permite a los usuarios enviar mensajes de texto o grabaciones de voz, los cuales son enviados a una API gestionada por AWS API Gateway. Además, permite consultar, filtrar y editar los mensajes enviados.

---

## 🚀 Tecnologías usadas

- **React Native** (Expo)
- **expo-router** para navegación
- **react-native-reanimated** para animaciones
- **@react-native-community/datetimepicker** para selección de fechas
- **react-native-toast-message** para notificaciones
- **TypeScript** para tipado estático
- **AWS API Gateway** como backend de servicios
- **UUID** para identificación única de mensajes

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

### 1. **Enviar mensaje (`/send`)**

- Campo de texto para mensaje.
- Botón para enviar texto (POST a `/text`).
- Grabadora de audio y envío (POST a endpoint de archivo).
- Acordeón para agregar `classification` si se desea.
- Loader durante envíos.

### 2. **Mensajes (`/messages`)**

- Lista de todos los mensajes recibidos desde la API.
- Filtros:
  - Tipo de entrada (texto / audio).
  - Clasificación.
  - `usedAI`: cualquiera / sí / no.
  - Rango de fechas de creación y última actualización.
- Se oculta el campo "Actualizado" si `lastUpdated` está vacío.
- Dropdown animado para filtros por fecha.

---

## ✅ Funcionalidades actuales

- ✅ Envío de mensajes de texto a AWS API Gateway
- ✅ Envío de audios usando FormData con metadatos
- ✅ Filtros dinámicos con query params
- ✅ Visualización de mensajes en lista
- ✅ Layout responsive y estilizado
- ✅ Uso de Toasts para feedback al usuario
- ✅ Acordeón animado para mostrar campos opcionales

---

## 📝 Lista de tareas por hacer

- [ ] Integrar autenticación (Firebase/Auth0/etc.)
- [ ] Permitir edición de mensajes de texto
- [ ] Permitir reemplazar audio por uno nuevo
- [ ] Soporte para múltiples usuarios
- [ ] Subir grabaciones de audio a S3 directamente
- [ ] Mejorar interfaz para modo oscuro
- [ ] Agregar tests unitarios
- [ ] Guardar clasificaciones previas en local storage
- [ ] Implementar estado global (Zustand o Redux)
- [ ] Agregar loader general y control de errores global

---

## 💡 Ideas por integrar

- 🎙 Transcripción automática de mensajes de voz usando AWS Transcribe
- 🧠 Clasificador con IA en frontend para sugerir clasificación
- 📊 Dashboard de uso por usuario
- 📎 Adjuntar imágenes a mensajes
- 🔔 Notificaciones push usando Expo Notifications
- 🌐 Versión web usando `expo-router` y `expo-web`
- Sistema de Notas
    - Contraseña y encriptacion de datos
- Base de Conocimientos (tecnicos y diarios - aws, recetas, etc...)
    - Generar conocimiento a traves de mis interacciones diarias

---

Cualquier contribución, idea o sugerencia es bienvenida 🙌
