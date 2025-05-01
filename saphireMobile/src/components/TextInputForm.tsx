import React, { useState } from 'react';
import { View, TextInput, Button, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { sendTextMessage } from '../services/api';
import { categories } from '../utils/categories';

export default function TextInputForm() {
  const [text, setText] = useState('');
  const [category, setCategory] = useState('notas');

  const handleSubmit = async () => {
    console.log('Enviando texto:', { text, category });
    try {
      await sendTextMessage({
        userId: 'abc123', // reemplazar con el ID del usuario real
        text,
        classification: category,
      });
      setText('');
    } catch (err) {
      console.error('Error enviando mensaje:', err);
    }
  };

  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        placeholder="Escribe tu nota..."
        value={text}
        onChangeText={setText}
      />
      <Picker
        selectedValue={category}
        onValueChange={setCategory}
        style={styles.picker}
      >
        {categories.map(cat => (
          <Picker.Item key={cat} label={cat} value={cat} />
        ))}
      </Picker>
      <Button title="Enviar texto" onPress={handleSubmit} />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginBottom: 20,
  },
  input: {
    borderColor: '#ccc',
    borderWidth: 1,
    padding: 10,
    marginBottom: 10,
  },
  picker: {
    marginBottom: 10,
  },
});
