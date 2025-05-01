import React, { useEffect, useState } from 'react';
import { View, Text, FlatList, StyleSheet } from 'react-native';
import { getMessages } from '../services/api';

export default function MessageList() {
  type Message = {
    messageId: string;
    inputType: string;
    originalContent?: string;
    transcription?: string;
    classification?: string;
  };

  const [messages, setMessages] = useState<Message[]>([]);

  useEffect(() => {
    console.log('Obteniendo mensajes...');
    getMessages('abc123') // reemplazar con el ID del usuario
      .then(data => {
        console.log('Mensajes:', data);
        setMessages(data);
      })
    .catch(err => console.error('Error cargando mensajes:', err));
  }, []);

  return (
    <FlatList
      data={messages}
      keyExtractor={item => item.messageId}
      renderItem={({ item }) => (
        <View style={styles.card}>
          <Text style={styles.type}>{item.inputType}</Text>
          <Text>{item.transcription || item.originalContent}</Text>
          <Text style={styles.category}>{item.classification}</Text>
        </View>
      )}
    />
  );
}

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#e8e8e8',
    padding: 10,
    marginBottom: 10,
    borderRadius: 6,
  },
  type: {
    fontWeight: 'bold',
    textTransform: 'uppercase',
    marginBottom: 4,
  },
  category: {
    marginTop: 4,
    fontStyle: 'italic',
    color: '#777',
  },
});
