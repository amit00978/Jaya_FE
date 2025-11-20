/**
 * Chat Screen - Main conversation interface
 */
import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
} from 'react-native';
import {
  TextInput,
  IconButton,
  Text,
  Surface,
  Switch,
  Chip,
} from 'react-native-paper';
import Markdown from 'react-native-markdown-display';
import Animated, { FadeIn, FadeOut, useSharedValue, useAnimatedStyle, withSpring, withRepeat, withSequence } from 'react-native-reanimated';
import APIService from '../services/api';
import StorageService from '../services/storage';
import VoiceService from '../services/voice';
import { colors, spacing, typography } from '../theme';

export default function ChatScreen() {
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState('');
  const [loading, setLoading] = useState(false);
  const [userId, setUserId] = useState(null);
  const [webSearchEnabled, setWebSearchEnabled] = useState(true);
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [autoPlayAudio, setAutoPlayAudio] = useState(false);
  const flatListRef = useRef(null);
  const recordingInterval = useRef(null);
  const micScale = useSharedValue(1);

  useEffect(() => {
    initializeChat();
  }, []);

  const initializeChat = async () => {
    const id = await StorageService.getUserId();
    setUserId("user_123"); // Temporary hardcoded ID for testing
    
    const webSearch = await StorageService.getWebSearchEnabled();
    setWebSearchEnabled(webSearch);
    
    const autoPlay = await StorageService.getAutoPlayAudio();
    setAutoPlayAudio(autoPlay);
    
    const history = await StorageService.getConversationHistory();
    setMessages(history);
    
    // Test API connection
    console.log("Testing API connection on startup...");
    const testResult = await APIService.testConnection();
    if (testResult.success) {
      console.log("✅ API connection test successful");
    } else {
      console.error("❌ API connection test failed:", testResult.error);
    }
  };

  const sendMessage = async () => {
    if (!inputText.trim() || loading) return;

    const userMessage = {
      id: Date.now().toString(),
      text: inputText.trim(),
      isUser: true,
      timestamp: new Date().toISOString(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setLoading(true);

    try {
      const response = await APIService.sendMessage(
        userId,
        userMessage.text,
        webSearchEnabled
      );

      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        text: response.response,
        isUser: false,
        timestamp: new Date().toISOString(),
        tokensUsed: response.tokens_used,
        webSearchUsed: response.web_search_used,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Save to storage
      await StorageService.addMessageToHistory(userMessage);
      await StorageService.addMessageToHistory(assistantMessage);

    } catch (error) {
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        text: `Error: ${error.message}`,
        isUser: false,
        isError: true,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
    }
  };

  const clearHistory = async () => {
    try {
      await APIService.clearHistory(userId);
      await StorageService.clearConversationHistory();
      setMessages([]);
    } catch (error) {
      console.error('Error clearing history:', error);
    }
  };

  const toggleWebSearch = async () => {
    const newValue = !webSearchEnabled;
    setWebSearchEnabled(newValue);
    await StorageService.setWebSearchEnabled(newValue);
  };

  const startVoiceRecording = async () => {
    try {
      // Ask user for permission before starting recording
      Alert.alert(
        'Voice Recording',
        'Allow JARVIS to access your microphone for voice recording?',
        [
          {
            text: 'Cancel',
            style: 'cancel',
          },
          {
            text: 'Allow',
            onPress: async () => {
              try {
                await VoiceService.startRecording();
                setIsRecording(true);
                setRecordingDuration(0);

                // Animate microphone
                micScale.value = withRepeat(
                  withSequence(
                    withSpring(1.2),
                    withSpring(1.0)
                  ),
                  -1,
                  true
                );

                // Update duration
                recordingInterval.current = setInterval(async () => {
                  const duration = await VoiceService.getRecordingDuration();
                  setRecordingDuration(Math.floor(duration));
                }, 100);

              } catch (error) {
                console.error('Recording error:', error);
                Alert.alert('Error', 'Failed to start recording: ' + error.message);
              }
            },
          },
        ],
        { cancelable: false }
      );
    } catch (error) {
      console.error('Permission error:', error);
      Alert.alert('Error', 'Failed to request permission: ' + error.message);
    }
  };

  const stopVoiceRecording = async () => {
    try {
      if (recordingInterval.current) {
        clearInterval(recordingInterval.current);
      }

      micScale.value = withSpring(1);
      setIsRecording(false);
      setLoading(true);

      const audioUri = await VoiceService.stopRecording();
      const base64Audio = await VoiceService.convertAudioToBase64(audioUri);

      // Send to backend
      const response = await APIService.sendAudio(
        userId,
        base64Audio,
        webSearchEnabled
      );

      const assistantMessage = {
        id: Date.now().toString(),
        text: response.response,
        isUser: false,
        timestamp: new Date().toISOString(),
        tokensUsed: response.tokens_used,
        webSearchUsed: response.web_search_used,
        hasAudio: !!response.audio_response,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      await StorageService.addMessageToHistory(assistantMessage);

      // Play audio response if enabled
      if (autoPlayAudio && response.audio_response) {
        await VoiceService.playAudio(response.audio_response);
      }

    } catch (error) {
      const errorMessage = {
        id: Date.now().toString(),
        text: `Error: ${error.message}`,
        isUser: false,
        isError: true,
        timestamp: new Date().toISOString(),
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setLoading(false);
      setRecordingDuration(0);
    }
  };

  const micAnimatedStyle = useAnimatedStyle(() => ({
    transform: [{ scale: micScale.value }],
  }));

  const renderMessage = ({ item }) => (
    <Animated.View
      entering={FadeIn}
      style={[
        styles.messageContainer,
        item.isUser ? styles.userMessage : styles.assistantMessage,
      ]}
    >
      <Surface
        style={[
          styles.messageBubble,
          item.isUser ? styles.userBubble : styles.assistantBubble,
          item.isError && styles.errorBubble,
        ]}
      >
        {item.isUser ? (
          <Text style={styles.messageText}>{item.text}</Text>
        ) : (
          <Markdown style={markdownStyles}>{item.text}</Markdown>
        )}
        
        <View style={styles.messageFooter}>
          <Text style={styles.timestamp}>
            {new Date(item.timestamp).toLocaleTimeString([], {
              hour: '2-digit',
              minute: '2-digit',
            })}
          </Text>
          {item.tokensUsed && (
            <Text style={styles.tokens}>{item.tokensUsed} tokens</Text>
          )}
          {item.webSearchUsed && (
            <Text style={styles.webSearch}>🔍 Web</Text>
          )}
        </View>
      </Surface>
    </Animated.View>
  );

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={100}
    >
      {/* Header */}
      <Surface style={styles.header}>
        <View style={styles.headerContent}>
          <Text style={styles.headerTitle}>JARVIS</Text>
          <View style={styles.headerActions}>
            <Chip
              mode="flat"
              selected={webSearchEnabled}
              onPress={toggleWebSearch}
              style={styles.webSearchChip}
              textStyle={styles.chipText}
            >
              🔍 Web Search
            </Chip>
            <IconButton
              icon="delete-outline"
              size={24}
              iconColor={colors.onSurfaceVariant}
              onPress={clearHistory}
            />
          </View>
        </View>
      </Surface>

      {/* Messages */}
      <FlatList
        ref={flatListRef}
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        onContentSizeChange={() =>
          flatListRef.current?.scrollToEnd({ animated: true })
        }
        onLayout={() => flatListRef.current?.scrollToEnd({ animated: false })}
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>
              Hi! I'm JARVIS, your AI assistant.{'\n'}
              Ask me anything!
            </Text>
          </View>
        }
      />

      {/* Typing Indicator */}
      {loading && (
        <Animated.View entering={FadeIn} exiting={FadeOut} style={styles.typingContainer}>
          <Surface style={styles.typingBubble}>
            <ActivityIndicator size="small" color={colors.primary} />
            <Text style={styles.typingText}>JARVIS is thinking...</Text>
          </Surface>
        </Animated.View>
      )}

      {/* Input */}
      <Surface style={styles.inputContainer}>
        {!isRecording ? (
          <>
            <IconButton
              icon="microphone"
              size={24}
              iconColor={colors.primary}
              onPress={startVoiceRecording}
              disabled={loading}
              style={styles.micButton}
            />
            <TextInput
              value={inputText}
              onChangeText={setInputText}
              placeholder="Message JARVIS..."
              placeholderTextColor={colors.onSurfaceVariant}
              style={styles.input}
              mode="outlined"
              outlineColor="transparent"
              activeOutlineColor={colors.primary}
              multiline
              maxLength={1000}
              onSubmitEditing={sendMessage}
              disabled={loading}
            />
            <IconButton
              icon="send"
              size={24}
              iconColor={inputText.trim() ? colors.primary : colors.onSurfaceVariant}
              onPress={sendMessage}
              disabled={!inputText.trim() || loading}
              style={styles.sendButton}
            />
          </>
        ) : (
          <View style={styles.recordingContainer}>
            <Animated.View style={micAnimatedStyle}>
              <IconButton
                icon="microphone"
                size={32}
                iconColor={colors.error}
                onPress={stopVoiceRecording}
              />
            </Animated.View>
            <View style={styles.recordingInfo}>
              <Text style={styles.recordingText}>Recording...</Text>
              <Text style={styles.recordingDuration}>
                {Math.floor(recordingDuration / 60)}:{(recordingDuration % 60).toString().padStart(2, '0')}
              </Text>
            </View>
            <IconButton
              icon="stop"
              size={24}
              iconColor={colors.primary}
              onPress={stopVoiceRecording}
            />
          </View>
        )}
      </Surface>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: colors.background,
  },
  header: {
    paddingVertical: spacing.sm,
    paddingHorizontal: spacing.md,
    backgroundColor: colors.surface,
    elevation: 4,
  },
  headerContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  headerTitle: {
    ...typography.title,
    color: colors.primary,
    fontWeight: 'bold',
  },
  headerActions: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  webSearchChip: {
    backgroundColor: colors.surfaceVariant,
  },
  chipText: {
    fontSize: 12,
    color: colors.onSurface,
  },
  messagesList: {
    padding: spacing.md,
    flexGrow: 1,
  },
  messageContainer: {
    marginBottom: spacing.md,
    maxWidth: '80%',
  },
  userMessage: {
    alignSelf: 'flex-end',
  },
  assistantMessage: {
    alignSelf: 'flex-start',
  },
  messageBubble: {
    padding: spacing.md,
    borderRadius: 16,
    elevation: 2,
  },
  userBubble: {
    backgroundColor: colors.primary,
  },
  assistantBubble: {
    backgroundColor: colors.surfaceVariant,
  },
  errorBubble: {
    backgroundColor: colors.error + '20',
  },
  messageText: {
    ...typography.body,
    color: colors.background,
  },
  messageFooter: {
    flexDirection: 'row',
    marginTop: spacing.xs,
    gap: spacing.sm,
  },
  timestamp: {
    ...typography.small,
    opacity: 0.7,
  },
  tokens: {
    ...typography.small,
    opacity: 0.6,
  },
  webSearch: {
    ...typography.small,
    color: colors.success,
  },
  typingContainer: {
    paddingHorizontal: spacing.md,
    paddingBottom: spacing.sm,
  },
  typingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: spacing.md,
    borderRadius: 16,
    backgroundColor: colors.surfaceVariant,
    alignSelf: 'flex-start',
    gap: spacing.sm,
  },
  typingText: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    padding: spacing.sm,
    backgroundColor: colors.surface,
    elevation: 8,
  },
  input: {
    flex: 1,
    backgroundColor: colors.surfaceVariant,
    maxHeight: 120,
  },
  micButton: {
    margin: 0,
  },
  sendButton: {
    margin: 0,
  },
  recordingContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: spacing.md,
  },
  recordingInfo: {
    flex: 1,
    alignItems: 'center',
  },
  recordingText: {
    ...typography.body,
    color: colors.error,
    fontWeight: '600',
  },
  recordingDuration: {
    ...typography.caption,
    color: colors.onSurfaceVariant,
    fontFamily: 'monospace',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: spacing.xl * 3,
  },
  emptyText: {
    ...typography.subtitle,
    color: colors.onSurfaceVariant,
    textAlign: 'center',
  },
});

const markdownStyles = {
  body: {
    color: colors.onSurface,
    fontSize: 16,
  },
  heading1: {
    color: colors.primary,
    fontSize: 24,
    fontWeight: 'bold',
  },
  heading2: {
    color: colors.primary,
    fontSize: 20,
    fontWeight: 'bold',
  },
  code_inline: {
    backgroundColor: colors.background,
    color: colors.primary,
    padding: 4,
    borderRadius: 4,
  },
  code_block: {
    backgroundColor: colors.background,
    padding: spacing.sm,
    borderRadius: 8,
  },
  link: {
    color: colors.secondary,
  },
};
