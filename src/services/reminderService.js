/**
 * Enhanced Reminder Service with Firebase Integration
 * Replaces expo-notifications with Firebase push notifications
 */
import { Platform, Alert } from 'react-native';
import firebaseNotificationService from './firebaseNotification';
import StorageService from './storage';
import { parseReminderTime } from '../utils/reminderUtils';

class ReminderService {
  constructor() {
    this.isInitialized = false;
  }

  /**
   * Initialize the reminder service
   */
  async initialize() {
    try {
      console.log('🔧 Initializing Reminder Service...');
      
      // Initialize Firebase first
      const firebaseSuccess = await firebaseNotificationService.initialize();
      
      if (firebaseSuccess) {
        this.isInitialized = true;
        console.log('✅ Reminder Service initialized with Firebase');
        return true;
      } else {
        console.warn('⚠️ Firebase initialization failed, using local fallback');
        this.isInitialized = false;
        return false;
      }

    } catch (error) {
      console.error('❌ Reminder Service initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Schedule a reminder using Firebase push notifications
   */
  async scheduleReminder(userMessage, intentResult) {
    try {
      console.log(`🔔 Scheduling reminder with time: ${intentResult.time}`);
      
      // Parse the time
      const reminderTime = parseReminderTime(intentResult.time);
      if (!reminderTime) {
        throw new Error('Invalid time format received');
      }

      // Check if time is in the future
      const now = new Date();
      if (reminderTime <= now) {
        throw new Error('Reminder time must be in the future');
      }

      // Create reminder data
      const reminderData = {
        id: Date.now().toString(),
        userId: await this.getUserId(),
        text: userMessage.text,
        originalText: userMessage.text,
        time: reminderTime.toISOString(),
        confidence: intentResult.confidence,
        platform: Platform.OS,
        created: new Date().toISOString(),
        scheduled: false,
        method: 'none',
        remoteId: null,
        localId: null
      };

      // Save locally first (backup)
      await StorageService.saveLocalReminder(reminderData);
      console.log('💾 Reminder saved locally as backup');

      // Try Firebase push notification first
      if (this.isInitialized && firebaseNotificationService.isReady()) {
        try {
          const firebaseResult = await firebaseNotificationService.scheduleReminder(reminderData);
          
          if (firebaseResult.success) {
            // Update with Firebase info
            reminderData.scheduled = true;
            reminderData.method = 'firebase_push';
            reminderData.remoteId = firebaseResult.remoteId;
            
            await StorageService.updateLocalReminder(reminderData.id, reminderData);
            
            console.log('✅ Reminder scheduled via Firebase push');
            return {
              success: true,
              method: 'firebase_push',
              reminderData,
              message: `Firebase push notification scheduled for ${reminderTime.toLocaleString()}`
            };
          }
        } catch (firebaseError) {
          console.error('❌ Firebase scheduling failed:', firebaseError);
          // Continue to fallback
        }
      }

      // Fallback: No reliable method available
      console.warn('⚠️ No reliable notification method available');
      
      // Update with local-only status
      reminderData.scheduled = false;
      reminderData.method = 'local_only';
      await StorageService.updateLocalReminder(reminderData.id, reminderData);

      return {
        success: false,
        method: 'local_only',
        reminderData,
        message: `Reminder saved locally only. For push notifications, please enable Firebase setup.`,
        warning: true
      };

    } catch (error) {
      console.error('❌ Reminder scheduling failed:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled reminder
   */
  async cancelReminder(reminderId) {
    try {
      console.log(`🗑️ Canceling reminder: ${reminderId}`);
      
      // Get reminder details
      const reminders = await StorageService.getLocalReminders();
      const reminder = reminders.find(r => r.id === reminderId);
      
      if (!reminder) {
        throw new Error('Reminder not found');
      }

      let cancelSuccess = false;

      // Cancel Firebase reminder if it exists
      if (reminder.method === 'firebase_push' && reminder.remoteId) {
        try {
          cancelSuccess = await firebaseNotificationService.cancelReminder(reminder.remoteId);
          if (cancelSuccess) {
            console.log('✅ Firebase reminder canceled');
          }
        } catch (error) {
          console.error('❌ Firebase cancellation failed:', error);
        }
      }

      // Remove from local storage
      await StorageService.removeLocalReminder(reminderId);
      console.log('✅ Reminder removed from local storage');

      return {
        success: true,
        canceledRemote: cancelSuccess,
        method: reminder.method
      };

    } catch (error) {
      console.error('❌ Reminder cancellation failed:', error);
      throw error;
    }
  }

  /**
   * Get all reminders
   */
  async getReminders() {
    try {
      const reminders = await StorageService.getLocalReminders();
      
      // Filter out past reminders
      const now = new Date();
      const activeReminders = reminders.filter(reminder => {
        const reminderTime = new Date(reminder.time);
        return reminderTime > now;
      });

      // Clean up expired reminders
      const expiredReminders = reminders.filter(reminder => {
        const reminderTime = new Date(reminder.time);
        return reminderTime <= now;
      });

      for (const expired of expiredReminders) {
        await StorageService.removeLocalReminder(expired.id);
      }

      return activeReminders;

    } catch (error) {
      console.error('❌ Failed to get reminders:', error);
      return [];
    }
  }

  /**
   * Get reminder statistics
   */
  async getStats() {
    try {
      const reminders = await this.getReminders();
      
      const stats = {
        total: reminders.length,
        firebase: reminders.filter(r => r.method === 'firebase_push').length,
        localOnly: reminders.filter(r => r.method === 'local_only').length,
        scheduled: reminders.filter(r => r.scheduled).length,
        platforms: {
          android: reminders.filter(r => r.platform === 'android').length,
          ios: reminders.filter(r => r.platform === 'ios').length,
        }
      };

      return stats;

    } catch (error) {
      console.error('❌ Failed to get stats:', error);
      return { total: 0, firebase: 0, localOnly: 0, scheduled: 0, platforms: { android: 0, ios: 0 } };
    }
  }

  /**
   * Test the notification system
   */
  async testNotification() {
    try {
      console.log('🧪 Testing notification system...');
      
      if (!this.isInitialized || !firebaseNotificationService.isReady()) {
        throw new Error('Firebase not ready for testing');
      }

      const testData = {
        id: 'test_' + Date.now(),
        text: 'This is a test notification from JARVIS',
        originalText: 'Test notification',
        time: new Date(Date.now() + 10000).toISOString(), // 10 seconds from now
        userId: await this.getUserId(),
        platform: Platform.OS,
        created: new Date().toISOString()
      };

      const result = await firebaseNotificationService.scheduleReminder(testData);
      
      if (result.success) {
        Alert.alert(
          'Test Scheduled',
          'A test notification has been scheduled for 10 seconds from now via Firebase push notification.',
          [{ text: 'OK' }]
        );
        return true;
      } else {
        throw new Error('Test scheduling failed');
      }

    } catch (error) {
      console.error('❌ Test notification failed:', error);
      Alert.alert(
        'Test Failed',
        `Notification test failed: ${error.message}`,
        [{ text: 'OK' }]
      );
      return false;
    }
  }

  /**
   * Get debug information
   */
  async getDebugInfo() {
    try {
      const stats = await this.getStats();
      const fcmToken = firebaseNotificationService.getToken();
      
      return {
        isInitialized: this.isInitialized,
        firebaseReady: firebaseNotificationService.isReady(),
        fcmToken: fcmToken ? fcmToken.substring(0, 20) + '...' : 'None',
        platform: Platform.OS,
        reminders: stats,
        timestamp: new Date().toISOString()
      };

    } catch (error) {
      console.error('❌ Failed to get debug info:', error);
      return { error: error.message };
    }
  }

  /**
   * Get user ID
   */
  async getUserId() {
    try {
      return await StorageService.getUserId();
    } catch (error) {
      return 'anonymous';
    }
  }

  /**
   * Check if service is ready
   */
  isReady() {
    return this.isInitialized && firebaseNotificationService.isReady();
  }
}

// Create singleton instance
const reminderService = new ReminderService();

export default reminderService;