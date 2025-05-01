
# 🧠 SaphireMobile — App de notas con IA

SaphireMobile es una aplicación móvil construida con React Native que permite a los usuarios **registrar y clasificar pensamientos, ideas y audios** usando texto o grabación de voz. Toda la información se almacena automáticamente en un backend sin servidor (serverless) construido con **AWS Lambda, API Gateway, S3 y DynamoDB**.

---

## 📦 Tecnologías utilizadas

### Frontend
- [React Native](https://reactnative.dev/)
- TypeScript
- React Navigation (stack)
- Axios
- Audio grabación: `react-native-audio-recorder-player`
- Picker UI: `@react-native-picker/picker`
- Variables de entorno: `react-native-dotenv`
- Permisos: `@react-native-community/datetimepicker`, `react-native-permissions`
- Archivos: `react-native-fs`

### Backend (integraciones ya implementadas)
- AWS Lambda
- Amazon API Gateway
- Amazon DynamoDB
- Amazon S3
- Amazon Transcribe

---

## ⚙️ Instalación y configuración

### 1. Clona el repositorio

```bash
git clone https://github.com/tu-usuario/saphire-mobile.git
cd saphire-mobile
```

### 2. Instala las dependencias

```bash
npm install
# o
yarn install
```

### 3. Inicia Metro

Metro es el servidor que empaca tu código JavaScript. Para iniciarlo desde la raíz del proyecto:

```bash
npm start
# o
yarn start
```

---

### 4. Compila y ejecuta la app

Abre una nueva terminal desde la raíz del proyecto y ejecuta:

#### ▶️ Android

```bash
npm run android
# o
yarn android
```

> Asegúrate de tener un emulador activo o un dispositivo conectado con depuración USB.

#### 🍏 iOS

Primero instala los pods:

```bash
cd ios && pod install && cd ..
```

Luego ejecuta:

```bash
npm run ios
# o
yarn ios
```

> Requiere tener Xcode y sus herramientas instaladas.

---

### 5. Configura el archivo `.env`

Crea un archivo `.env` en la raíz con tu endpoint de API Gateway:

```
API_URL=https://tu-api-id.execute-api.us-east-1.amazonaws.com/prod
```

> Este endpoint conecta tu app móvil con las funciones Lambda de backend ya desplegadas.

---

## 🚀 Funcionalidades actuales

✅ Entrada de texto con categoría  
✅ Grabación de audio, subida a S3 y transcripción automática  
✅ Guardado de datos en DynamoDB con clasificación  
✅ Historial de mensajes con filtros por categoría y fecha  
✅ Navegación entre pantallas (`Home`, `Historial`)  
✅ Tipado estricto con TypeScript  
✅ Variables de entorno con `@env`

---

## 🔧 Conexión con Backend Serverless

La app se conecta a un backend construido 100% con AWS Lambda, expuesto por Amazon API Gateway.

Endpoints disponibles:

- `POST /text` → Guarda nota escrita
- `POST /generate-upload-url` → Obtiene URL firmada para S3
- `POST /audio` → Procesa audio y guarda transcripción
- `GET /messages` → Devuelve mensajes filtrables por `userId`, `classification`, `from`

---

## 🧩 Recomendaciones pendientes

- [ ] ⚠️ **Autenticación real (AWS Cognito o local)**
- [ ] ⚠️ Guardar y cargar `userId` desde contexto o `AsyncStorage`
- [ ] ⚠️ Indicadores de carga en todos los componentes (especialmente en `MessageList`)
- [ ] ⚠️ Validación de formularios (no permitir textos vacíos)
- [ ] ⚠️ Control de permisos de audio / almacenamiento
- [ ] ⚠️ Toasts o feedback de error amigable
- [ ] ⚠️ Paginación en historial si crece
- [ ] ⚠️ Mejora de UI con `KeyboardAvoidingView`, accesibilidad, etc.

---

## 💡 Ideas opcionales (para futuras versiones)

- 🧠 **Resumen automático con IA** (Amazon Comprehend o OpenAI)
- 🧪 Tests unitarios con Jest
- 📤 Guardado local de último audio grabado
- 🧭 Reemplazar navegación por `BottomTabNavigator`
- 🗂️ Detalle individual por nota
- 📅 Agrupación de mensajes por fecha
- 🔐 Modo privado (protección con PIN)
- ☁️ Sincronización multi-dispositivo (usando Cognito + Dynamo)

---

## 🤖 Requisitos del sistema

- Node.js 18+
- React Native CLI
- Xcode (para iOS) o Android Studio (para Android)
- Acceso a AWS (para el backend y configuración de variables)

---

## 📄 Licencia

MIT — libre para uso personal y comercial.
