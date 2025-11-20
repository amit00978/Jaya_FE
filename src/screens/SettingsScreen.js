/**
 * Settings Screen
 */
import React, { useState, useEffect } from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  Alert,
} from 'react-native';
import {
  Text,
  Surface,
  TextInput,
  Switch,
  Button,
  Divider,
  List,
} from 'react-native-paper';
import StorageService from '../services/storage';
import APIService from '../services/api';
import { colors, spacing, typography } from '../theme';
import { DEFAULT_API_URL, PRODUCTION_API_URL, LOCAL_API_URL } from '../config/api';

export default function SettingsScreen() {
  const [userId, setUserId] = useState('');
  const [apiUrl, setApiUrl] = useState(DEFAULT_API_URL);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const [connectionStatus, setConnectionStatus] = useState('unknown');

  useEffect(() => {
    loadSettings();
  }, []);

  const loadSettings = async () => {
    const id = await StorageService.getUserId();
    setUserId(id);

    const url = await StorageService.getApiUrl();
    if (url) setApiUrl(url);

    const webSearch = await StorageService.getWebSearchEnabled();
    setWebSearchEnabled(webSearch);

    const autoPlay = await StorageService.getAutoPlayAudio();
    setAutoPlayAudio(autoPlay);
  };

  const testConnection = async () => {
    setConnectionStatus('testing');
    try {
      await APIService.checkHealth();
      setConnectionStatus('connected');
      Alert.alert('Success', 'Connected to backend successfully!');
    } catch (error) {
      setConnectionStatus('failed');
      Alert.alert('Connection Failed', error.message);
    }
  };

  const saveApiUrl = async () => {
    if (!apiUrl.startsWith('http://') && !apiUrl.startsWith('https://')) {
      Alert.alert('Invalid URL', 'URL must start with http:// or https://');
      return;
    }
    await StorageService.setApiUrl(apiUrl);
    await APIService.updateBaseURL(apiUrl);
    Alert.alert('Success', 'API URL updated!');
    testConnection();
  };

  const generateNewUserId = async () => {
    Alert.alert(
      'Generate New User ID',
      'This will clear your conversation history on the backend. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Generate',
          style: 'destructive',
          onPress: async () => {
            const newId = await StorageService.generateNewUserId();
            setUserId(newId);
            Alert.alert('Success', `New User ID: ${newId.substring(0, 8)}...`);
          },
        },
      ]
    );
  };

  const clearAllHistory = async () => {
    Alert.alert(
      'Clear All History',
      'This will delete all local conversation history. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            await StorageService.clearConversationHistory();
            Alert.alert('Success', 'All history cleared!');
          },
        },
      ]
    );
  };

  const handleWebSearchToggle = async (value) => {
    setWebSearchEnabled(value);
    await StorageService.setWebSearchEnabled(value);
  };

  const handleAutoPlayToggle = async (value) => {
    setAutoPlayAudio(value);
    await StorageService.setAutoPlayAudio(value);
  };

  return (
    <ScrollView style={styles.container}>
      {/* Header */}
      <Surface style={styles.header}>
        <Text style={styles.headerTitle}>Settings</Text>
      </Surface>

      {/* Connection Status */}
      <Surface style={styles.section}>
        <List.Section>
          <List.Subheader style={styles.sectionTitle}>
            Backend Connection
          </List.Subheader>
          
          <View style={styles.connectionStatus}>
            <View style={[
              styles.statusDot,
              connectionStatus === 'connected' && styles.statusConnected,
              connectionStatus === 'failed' && styles.statusFailed,
              connectionStatus === 'testing' && styles.statusTesting,
            ]} />
            <Text style={styles.statusText}>
              {connectionStatus === 'connected' && 'Connected'}
              {connectionStatus === 'failed' && 'Connection Failed'}
              {connectionStatus === 'testing' && 'Testing...'}
              {connectionStatus === 'unknown' && 'Not Tested'}
            </Text>
          </View>

          <View style={styles.presetButtons}>
            <Button
              mode={apiUrl === PRODUCTION_API_URL ? "contained" : "outlined"}
              onPress={() => setApiUrl(PRODUCTION_API_URL)}
              style={styles.presetButton}
              compact
            >
              Production
            </Button>
            <Button
              mode={apiUrl === LOCAL_API_URL ? "contained" : "outlined"}
              onPress={() => setApiUrl(LOCAL_API_URL)}
              style={styles.presetButton}
              compact
            >
              Local
            </Button>
          </View>

          <TextInput
            label="Backend API URL"
            value={apiUrl}
            onChangeText={setApiUrl}
            mode="outlined"
            style={styles.input}
            placeholder="http://localhost:8000"
            autoCapitalize="none"
            autoCorrect={false}
          />
          
          <View style={styles.buttonRow}>
            <Button
              mode="contained"
              onPress={saveApiUrl}
              style={styles.button}
            >
              Save URL
            </Button>
            <Button
              mode="outlined"
              onPress={testConnection}
              style={styles.button}
              loading={connectionStatus === 'testing'}
            >
              Test Connection
            </Button>
          </View>
        </List.Section>
      </Surface>

      <Divider style={styles.divider} />

      {/* User Settings */}
      <Surface style={styles.section}>
        <List.Section>
          <List.Subheader style={styles.sectionTitle}>
            User Settings
          </List.Subheader>
          
          <View style={styles.userIdContainer}>
            <Text style={styles.label}>User ID</Text>
            <Text style={styles.userId}>{userId}</Text>
            <Button
              mode="text"
              onPress={generateNewUserId}
              compact
            >
              Generate New ID
            </Button>
          </View>
        </List.Section>
      </Surface>

      <Divider style={styles.divider} />

      {/* AI Settings */}
      <Surface style={styles.section}>
        <List.Section>
          <List.Subheader style={styles.sectionTitle}>
            AI Features
          </List.Subheader>
          
          <List.Item
            title="Web Search"
            description="Enable real-time web search for news, weather, etc."
            left={() => <List.Icon icon="web" color={colors.primary} />}
            right={() => (
              <Switch
                value={webSearchEnabled}
                onValueChange={handleWebSearchToggle}
                color={colors.primary}
              />
            )}
          />
          
          <List.Item
            title="Auto-play Audio Responses"
            description="Automatically play voice responses"
            left={() => <List.Icon icon="volume-high" color={colors.primary} />}
            right={() => (
              <Switch
                value={autoPlayAudio}
                onValueChange={handleAutoPlayToggle}
                color={colors.primary}
              />
            )}
          />
        </List.Section>
      </Surface>

      <Divider style={styles.divider} />

      {/* Data Management */}
      <Surface style={styles.section}>
        <List.Section>
          <List.Subheader style={styles.sectionTitle}>
            Data Management
          </List.Subheader>
          
          <Button
            mode="outlined"
            onPress={clearAllHistory}
            style={styles.dangerButton}
            textColor={colors.error}
          >
            Clear All History
          </Button>
        </List.Section>
      </Surface>

      {/* About */}
      <Surface style={styles.section}>
        <List.Section>
          <List.Subheader style={styles.sectionTitle}>About</List.Subheader>
          
          <List.Item
            title="JARVIS AI Assistant"
            description="Version 1.0.0"
            left={() => <List.Icon icon="robot" color={colors.primary} />}
          />
          
          <Text style={styles.aboutText}>
            Powered by OpenAI GPT-4 with real-time web search capabilities.
            {'\n\n'}
            Built with React Native and FastAPI.
          </Text>
        </List.Section>
      </Surface>

      <View style={styles.footer} />
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    padding: spacing.md,
    backgroundColor: colors.surface,
    elevation: 4,
  },
  headerTitle: {
    ...typography.title,
    color: colors.primary,
    fontWeight: 'bold',
  },
  section: {
    marginVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    paddingVertical: spacing.sm,
    backgroundColor: colors.surface,
  },
  sectionTitle: {
    ...typography.subtitle,
    color: colors.primary,
  },
  connectionStatus: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    marginBottom: spacing.sm,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
  },
  statusDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.onSurfaceVariant,
    marginRight: spacing.sm,
  },
  statusConnected: {
    backgroundColor: colors.success,
  },
  statusFailed: {
    backgroundColor: colors.error,
  },
  statusTesting: {
    backgroundColor: colors.warning,
  },
  statusText: {
    ...typography.body,
    color: colors.onSurface,
  },
  input: {
    marginBottom: spacing.md,
    backgroundColor: colors.surfaceVariant,
  },
  presetButtons: {
    flexDirection: 'row',
    gap: spacing.sm,
    marginBottom: spacing.md,
  },
  presetButton: {
    flex: 1,
  },
  buttonRow: {
    flexDirection: 'row',
    gap: spacing.sm,
  },
  button: {
    flex: 1,
  },
  userIdContainer: {
    padding: spacing.md,
    backgroundColor: colors.surfaceVariant,
    borderRadius: 8,
  },
  label: {
    ...typography.caption,
    marginBottom: spacing.xs,
  },
  userId: {
    ...typography.body,
    fontFamily: 'monospace',
    marginBottom: spacing.sm,
  },
  dangerButton: {
    borderColor: colors.error,
    marginVertical: spacing.sm,
  },
  aboutText: {
    ...typography.body,
    color: colors.onSurfaceVariant,
    padding: spacing.md,
    lineHeight: 24,
  },
  divider: {
    backgroundColor: colors.surfaceVariant,
  },
  footer: {
    height: spacing.xl,
  },
});
