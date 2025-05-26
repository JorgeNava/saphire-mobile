// ListsScreen.tsx
import {
  Box,
  Button,
  HStack,
  Icon,
  Input,
  InputField,
  Pressable,
  Text,
} from '@gluestack-ui/themed';
import React, { useRef, useState } from 'react';
import {
  FlatList,
  ListRenderItem,
  Modal,
  TextInput as RNTextInput,
  useColorScheme,
} from 'react-native';
import MaterialIcons from 'react-native-vector-icons/MaterialIcons';

interface List {
  id: string;
  name: string;
  tags: string[];
  items: string[];
}

export default function ListsScreen() {
  const colorScheme = useColorScheme();
  const theme = {
    background: colorScheme === 'dark' ? '#1D3D47' : '#A1CEDC',
  };

  const [lists, setLists] = useState<List[]>([]);
  const [modalVisible, setModalVisible] = useState(false);
  const [newName, setNewName] = useState('');
  const [newTags, setNewTags] = useState('');
  const [newItems, setNewItems] = useState<string[]>(['']);

  // Referencias para inputs de elementos
  const itemRefs = useRef<(RNTextInput | null)[]>([]);

  const openModal = () => setModalVisible(true);
  const closeModal = () => {
    setModalVisible(false);
    setNewName('');
    setNewTags('');
    setNewItems(['']);
    itemRefs.current = [];
  };

  const createList = () => {
    const id = Date.now().toString();
    const tags = newTags
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);
    const items = newItems.map(i => i.trim()).filter(Boolean);
    setLists(prev => [{ id, name: newName, tags, items }, ...prev]);
    closeModal();
  };

  const addItemField = () => {
    setNewItems(prev => {
      const next = [...prev, ''];
      setTimeout(() => {
        const ref = itemRefs.current[next.length - 1];
        ref && ref.focus();
      }, 50);
      return next;
    });
  };

  const renderListItem: ListRenderItem<List> = ({ item }) => (
    <Pressable
      sx={{ mb: '$2' }}
      onPress={() => { /* navegar o acción */ }}
    >
      <HStack
        justifyContent="space-between"
        alignItems="center"
        sx={{ bg: '$gray700', px: '$3', py: '$2', borderRadius: '$md' }}
      >
        <Text sx={{ color: '$white', fontSize: '$lg' }}>{item.name}</Text>
        <Icon
          as={MaterialIcons}
          name="chevron-right"
          size="md"
          color="$white"
        />
      </HStack>
    </Pressable>
  );

  return (
    <Box
      sx={{
        flex: 1,
        bg: theme.background,
        px: '$4',
        pt: '$4',
      }}
    >
      <Text
        sx={{
          color: '$white',
          fontSize: 24,
          fontWeight: 'bold',
          mb: '$3',
          mt: 40,
          textAlign: 'left',
        }}
      >
        Listas
      </Text>

      <FlatList
        data={lists}
        keyExtractor={l => l.id}
        renderItem={renderListItem}
        contentContainerStyle={{ paddingBottom: 80 }}
      />

      <Modal visible={modalVisible} transparent animationType="slide">
        <Box
          sx={{
            flex: 1,
            justifyContent: 'center',
            alignItems: 'center',
            bg: 'rgba(0,0,0,0.8)',
          }}
        >
          <Box sx={{ bg: '$card', p: '$4', borderRadius: '$lg', width: '90%' }}>
            <Input sx={{ mb: '$4', bg: 'transparent', borderWidth: 0 }}>
              <InputField
                value={newName}
                onChangeText={setNewName}
                placeholder="Nueva lista"
                sx={{
                  color: '$white',
                  fontSize: '$xl',
                  fontWeight: 'bold',
                  textAlign: 'left',
                }}
              />
            </Input>

            <Text sx={{ mb: '$1' }}>Etiquetas</Text>
            <Input sx={{ mb: '$3', borderWidth: 1, borderColor: '$white' }}>
              <InputField
                value={newTags}
                onChangeText={setNewTags}
                placeholder="Tareas, ideas, lugares para visitar, etc..."
                sx={{ color: '$white' }}
              />
            </Input>

            <Text sx={{ mb: '$1' }}>Elementos iniciales</Text>
            {newItems.map((val, idx) => (
              <Input
                key={idx}
                sx={{ mb: '$3', borderWidth: 1, borderColor: '$white' }}
              >
                <InputField
                  ref={(input: any) => {
                    if (input) {
                      itemRefs.current[idx] = input.getNativeRef();
                    }
                  }}
                  value={val}
                  onChangeText={text => {
                    const arr = [...newItems];
                    arr[idx] = text;
                    setNewItems(arr);
                  }}
                  placeholder={`Elemento ${idx + 1}`}
                  sx={{ color: '$white' }}
                />
              </Input>
            ))}
            <Pressable onPress={addItemField} sx={{ mb: '$4' }}>
              <Text sx={{ color: '$blue500', fontSize: '$md' }}>
                Añadir elemento +
              </Text>
            </Pressable>

            <HStack justifyContent="flex-end" sx={{ gap: '$3' }}>
              <Button variant="outline" onPress={closeModal} sx={{ borderColor: '$white', borderWidth: 1 }}>
                <Text sx={{ color: '$white' }}>Cancelar</Text>
              </Button>
              <Button onPress={createList} disabled={!newName.trim()}>
                <Text sx={{ color: '$white' }}>Crear</Text>
              </Button>
            </HStack>
          </Box>
        </Box>
      </Modal>

      <Pressable
        onPress={openModal}
        sx={{
          position: 'absolute',
          bottom: '$5',
          right: '$5',
          bg: '$blue500',
          width: '$12',
          height: '$12',
          borderRadius: '$full',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '$black',
          shadowOpacity: 0.3,
          shadowOffset: { width: 0, height: 2 },
          shadowRadius: 4,
        }}
      >
        <Icon as={MaterialIcons} name="add" size="xl" color="$white" />
      </Pressable>
    </Box>
  );
}
