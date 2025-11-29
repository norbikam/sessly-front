import React, { useState } from 'react';
import { View, TextInput, StyleSheet } from 'react-native';

export default function LoginDebug() {
  const [v, setV] = useState('');
  return (
    <View style={styles.container}>
      <TextInput
        style={styles.input}
        value={v}
        onChangeText={setV}
        placeholder="Test"
        autoComplete="off"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', padding: 20 },
  input: { height: 52, borderWidth: 1, padding: 12 },
});