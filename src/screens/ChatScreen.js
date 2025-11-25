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
  Linking,
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
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import * as IntentLauncher from 'expo-intent-launcher';
import APIService from '../services/api';
import StorageService from '../services/storage';
import VoiceService from '../services/voice';
import { parseReminderTime, scheduleNotification } from '../utils/reminderUtils';
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
    setupNotifications();
  }, []);

  const setupNotifications = async () => {
    try {
      // Check if we're running in Expo Go
      const isExpoGo = __DEV__ && !Device.isDevice;
      
      if (isExpoGo) {
        console.warn('⚠️ Running in Expo Go - Notifications are limited');
        return;
      }

      // Configure notification behavior
      Notifications.setNotificationHandler({
        handleNotification: async () => ({
          shouldShowAlert: true,
          shouldPlaySound: true,
          shouldSet1Badge: false,
        }),
      });

      // Request permissions
      if (Device.isDevice) {
        const { status: existingStatus } = await Notifications.getPermissionsAsync();
        let finalStatus = existingStatus;
        
        if (existingStatus !== 'granted') {
          const { status } = await Notifications.requestPermissionsAsync();
          finalStatus = status;
        }
        
        if (finalStatus !== 'granted') {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in Settings to receive reminders.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Open Settings', onPress: () => Linking.openSettings() }
            ]
          );
          return;
        }

        // For Android, configure notification channel
        if (Platform.OS === 'android') {
          await Notifications.setNotificationChannelAsync('default', {
            name: 'JARVIS Reminders',
            importance: Notifications.AndroidImportance.MAX,
            vibrationPattern: [0, 250, 250, 250],
            lightColor: '#FF231F7C',
            sound: 'default',
          });
        }
      }
    } catch (error) {
      console.error('Error setting up notifications:', error);
    }
  };

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

  // New method to handle alarm/reminder setting
  const handleAlarmReminder = async (userMessage, intentResult) => {
    try {
      console.log(`🔔 Detected REMINDER intent with time: ${intentResult.time}`);
      
      // Parse the time string to create a proper Date object
      const reminderTime = parseReminderTime(intentResult.time);
      if (!reminderTime) {
        throw new Error('Invalid time format received');
      }

      // Check if the reminder time is in the future
      if (reminderTime <= new Date()) {
        Alert.alert(
          'Invalid Time',
          'The reminder time must be in the future. Please try again with a future time.',
          [{ text: 'OK' }]
        );
        return;
      }

      // Check if we're running in Expo Go
      const isExpoGo = __DEV__ && !Device.isDevice;

      // Save reminder locally
      const reminderData = {
        id: Date.now().toString(),
        text: `Reminder: ${userMessage.text}`,
        time: reminderTime.toISOString(),
        originalText: userMessage.text,
        confidence: intentResult.confidence,
        scheduled: false,
        notificationId: null,
      };

      await StorageService.saveLocalReminder(reminderData);

      // Schedule notification
      let notificationId = null;
      let scheduleSuccess = false;

      try {
        if (Device.isDevice && !isExpoGo) {
          notificationId = await scheduleNotification(reminderData);
          scheduleSuccess = true;
          
          // Update reminder with notification ID
          if (notificationId) {
            reminderData.notificationId = notificationId;
            reminderData.scheduled = true;
            await StorageService.updateLocalReminder(reminderData.id, reminderData);
          }
        } else if (isExpoGo) {
          console.warn('⚠️ Notifications not supported in Expo Go - reminder saved locally only');
        }
      } catch (notificationError) {
        console.error('Failed to schedule notification:', notificationError);
        scheduleSuccess = false;
      }

      // Show success alert
      const alertTitle = scheduleSuccess ? '⏰ Reminder Set & Scheduled' : '⏰ Reminder Saved';
      const alertMessage = scheduleSuccess 
        ? `✅ I'll remind you: "${userMessage.text}" at ${reminderTime.toLocaleString()}\n\n🔔 Notification scheduled successfully!`
        : isExpoGo
        ? `✅ I've saved your reminder: "${userMessage.text}" for ${reminderTime.toLocaleString()}\n\n⚠️ Note: Running in Expo Go - notifications are not supported. Use a development build for full notification functionality.`
        : `✅ I've saved your reminder: "${userMessage.text}" for ${reminderTime.toLocaleString()}\n\n⚠️ Note: Notification scheduling failed, but the reminder is saved.`;

      Alert.alert(alertTitle, alertMessage, [{ text: 'OK' }]);

      // Create assistant response message
      const assistantMessage = {
        id: (Date.now() + 1).toString(),
        text: scheduleSuccess 
          ? `✅ **Reminder set and scheduled for ${reminderTime.toLocaleString()}**\n\nI've saved your reminder: "${userMessage.text}"\n\n🔔 **You'll receive a notification at the scheduled time!**\n\n${Platform.OS === 'ios' ? '*For iOS: Make sure notifications are enabled in Settings > Notifications > Your App*' : '*For Android: Notification scheduled and will appear at the set time*'}`
          : isExpoGo
          ? `✅ **Reminder saved for ${reminderTime.toLocaleString()}**\n\nI've saved your reminder: "${userMessage.text}"\n\n⚠️ *Note: You're using Expo Go which doesn't support notifications. To get real push notifications, create a development build using:*\n\n\`npx expo run:android\` or \`npx expo run:ios\``
          : `✅ **Reminder saved for ${reminderTime.toLocaleString()}**\n\nI've saved your reminder: "${userMessage.text}"\n\n⚠️ *Note: Notification scheduling failed, but the reminder is saved locally.*`,
        isUser: false,
        timestamp: new Date().toISOString(),
        isLocalReminder: true,
        reminderScheduled: scheduleSuccess,
      };

      setMessages((prev) => [...prev, assistantMessage]);
      
      // Save to storage
      await StorageService.addMessageToHistory(userMessage);
      await StorageService.addMessageToHistory(assistantMessage);

    } catch (reminderError) {
      console.error('Failed to save reminder:', reminderError);
      
      // Show error alert
      Alert.alert(
        'Reminder Failed',
        `Sorry, I couldn't set your reminder: ${reminderError.message}`,
        [{ text: 'OK' }]
      );
      
      throw reminderError; // Re-throw to allow fallback in calling function
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
      // Step 1: Call intent classification first
      const intentResult = await APIService.classifyIntent(userId, userMessage.text);
      
      if (intentResult.success && intentResult.intent === 'REMINDER' && intentResult.time && intentResult.confidence >= 0.8) {
        // Handle REMINDER intent using dedicated method
        try {
          await handleAlarmReminder(userMessage, intentResult);
        } catch (reminderError) {
          console.error('Failed to handle reminder, falling back to normal chat:', reminderError);
          // Fallback to normal chat if reminder fails
          await handleNormalChat(userMessage);
        }
      } else {
        // Step 2: For non-REMINDER or low confidence, use normal chat
        await handleNormalChat(userMessage);
      }

    } catch (error) {
      console.error('Intent classification failed, falling back to chat:', error);
      // Fallback to normal chat if intent API fails
      await handleNormalChat(userMessage);
    } finally {
      setLoading(false);
    }
  };

  // Helper function for normal chat flow
  const handleNormalChat = async (userMessage) => {
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
