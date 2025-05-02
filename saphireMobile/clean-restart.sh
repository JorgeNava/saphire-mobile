#!/bin/bash

echo "🧹 Limpiando cachés, procesos y carpetas..."

# Eliminar cachés y procesos relacionados
watchman watch-del-all
watchman shutdown-server
rm -rf node_modules
rm -rf /tmp/metro-*
rm -rf ios/build

echo "🔧 Reinstalando dependencias..."
npm install

echo "🛑 Cerrando procesos en el puerto 8081..."
PID=$(lsof -ti :8081)
if [ -n "$PID" ]; then
  kill -9 $PID
  echo "✅ Proceso $PID en el puerto 8081 detenido"
else
  echo "ℹ️ No había proceso en el puerto 8081"
fi

echo "🚀 Reiniciando Metro con cache limpio..."
npm start -- --reset-cache 

sleep 5

echo "📱 Ejecutando app en iOS..."
npx react-native run-ios
