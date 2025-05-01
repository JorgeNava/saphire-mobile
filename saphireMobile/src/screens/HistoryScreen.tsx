import React, { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Platform,
  Button,
} from 'react-native';
import { Picker } from '@react-native-picker/picker';
import DateTimePicker from '@react-native-community/datetimepicker';
import { getMessages } from '../services/api';
import { Message } from '../types';

export default function HistoryScreen() {
  const [messages, setMessages] = useState<Message[]>([]);
  const [category, setCategory] = useState<string | null>(null);
  const [fromDate, setFromDate] = useState<Date | null>(null);
  const [showDatePicker, setShowDatePicker] = useState(false);

  useEffect(() => {
    const fetchMessages = async () => {
      try {
        const formattedDate = fromDate ? fromDate.toISOString() : null;
        const data = await getMessages('abc123', category, formattedDate);
        setMessages(data);
      } catch (err) {
        console.error('Error cargando historial:', err);
      }
    };
    fetchMessages();
  }, [category, fromDate]);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Filtrar mensajes</Text>

      <Text style={styles.label}>Categoría:</Text>
      <Picker
        selectedValue={category}
        onValueChange={(value) => setCategory(value || null)}
        style={styles.picker}
      >
        <Picker.Item label="Todas" value={null} />
        <Picker.Item label="Notas" value="notas" />
        <Picker.Item label="Ideas" value="ideas" />
        <Picker.Item label="Lista de deseos" value="lista de deseos" />
        <Picker.Item label="Lugares por visitar" value="lugares por visitar" />
      </Picker>

      <Text style={styles.label}>Desde fecha:</Text>
      {fromDate && <Text style={styles.dateText}>{fromDate.toDateString()}</Text>}
      <Button title="Seleccionar fecha" onPress={() => setShowDatePicker(true)} />

      {showDatePicker && (
        <DateTimePicker
          value={fromDate || new Date()}
          mode="date"
          display={Platform.OS === 'ios' ? 'spinner' : 'default'}
          onChange={(_, selectedDate) => {
            setShowDatePicker(false);
            if (selectedDate) setFromDate(selectedDate);
          }}
        />
      )}

      <Text style={styles.label}>Resultados:</Text>
      <FlatList
        data={messages}
        keyExtractor={(item) => item.messageId}
        renderItem={({ item }) => (
          <View style={styles.card}>
            <Text style={styles.category}>{item.classification}</Text>
            <Text>{item.transcription || item.originalContent}</Text>
            <Text style={styles.timestamp}>{new Date(item.timestamp).toLocaleString()}</Text>
          </View>
        )}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { padding: 16, flex: 1, backgroundColor: '#fff' },
  title: { fontSize: 20, fontWeight: 'bold', marginBottom: 12 },
  label: { marginTop: 10, fontWeight: '600' },
  picker: { marginVertical: 8 },
  dateText: { marginBottom: 8, fontStyle: 'italic' },
  card: {
    padding: 10,
    backgroundColor: '#e8e8e8',
    marginVertical: 6,
    borderRadius: 6,
  },
  category: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  timestamp: {
    marginTop: 4,
    fontSize: 12,
    color: '#555',
  },
});
