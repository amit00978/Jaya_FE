/**
 * JARVIS AI Assistant - Main App Entry Point (Fixed)
 */
import React from 'react';
import { StatusBar } from 'expo-status-bar';
import { Provider as PaperProvider, DefaultTheme } from 'react-native-paper';
import { View, Text, StyleSheet } from 'react-native';

const customTheme = {
  ...DefaultTheme,
  colors: {
    ...DefaultTheme.colors,
    primary: '#00D9FF',
    background: '#0A0E27',
    surface: '#151B3D',
    onSurface: '#FFFFFF',
  },
};

export default function App() {
  return (
    <PaperProvider theme={customTheme}>
      <View style={styles.container}>
        <StatusBar style="light" />
        <Text style={styles.title}>JARVIS AI Assistant</Text>
        <Text style={styles.subtitle}>Loading...</Text>
      </View>
    </PaperProvider>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#0A0E27',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 20,
  },
  title: {
    fontSize: 28,
    fontWeight: '700',
    color: '#00D9FF',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 16,
    fontWeight: '400',
    color: '#B8C5D6',
    textAlign: 'center',
  },
});