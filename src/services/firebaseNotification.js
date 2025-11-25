/**
 * Firebase Push Notification Service
 * Complete implementation for JARVIS alarm system
 */
import messaging from '@react-native-firebase/messaging';
import { Platform, Alert, PermissionsAndroid } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import APIService from './api';

class FirebaseNotificationService {
  constructor() {
    this.isInitialized = false;
    this.fcmToken = null;
  }

  /**
   * Initialize Firebase messaging
   */
  async initialize() {
    try {
      console.log('🔥 Initializing Firebase Messaging...');
      
      // Request permissions first
      const hasPermission = await this.requestPermission();
      if (!hasPermission) {
        throw new Error('Notification permissions denied');
      }

      // Get FCM token
      await this.getFCMToken();

      // Set up message handlers
      this.setupMessageHandlers();

      // Register with backend
      if (this.fcmToken) {
        await this.registerWithBackend();
      }

      this.isInitialized = true;
      console.log('✅ Firebase Messaging initialized successfully');
      return true;

    } catch (error) {
      console.error('❌ Firebase initialization failed:', error);
      this.isInitialized = false;
      return false;
    }
  }

  /**
   * Request notification permissions
   */
  async requestPermission() {
    try {
      if (Platform.OS === 'android' && Platform.Version >= 33) {
        // Android 13+ requires explicit permission
        const granted = await PermissionsAndroid.request(
          PermissionsAndroid.PERMISSIONS.POST_NOTIFICATIONS,
        );
        if (granted !== PermissionsAndroid.RESULTS.GRANTED) {
          Alert.alert(
            'Permission Required',
            'Please enable notifications in Settings to receive reminders.',
            [
              { text: 'Cancel', style: 'cancel' },
              { text: 'Settings', onPress: () => this.openAppSettings() }
            ]
          );
          return false;
        }
      }

      // Request Firebase messaging permission
      const authStatus = await messaging().requestPermission();
      const enabled = 
        authStatus === messaging.AuthorizationStatus.AUTHORIZED ||
        authStatus === messaging.AuthorizationStatus.PROVISIONAL;

      if (!enabled) {
        Alert.alert(
          'Permission Denied',
          'Notification permissions are required for reminders to work.',
          [{ text: 'OK' }]
        );
        return false;
      }

      console.log('✅ Notification permissions granted');
      return true;

    } catch (error) {
      console.error('❌ Permission request failed:', error);
      return false;
    }
  }

  /**
   * Get FCM token for this device
   */
  async getFCMToken() {
    try {
      // Check if we have a cached token
      const cachedToken = await AsyncStorage.getItem('fcm_token');
      
      // Get fresh token
      const token = await messaging().getToken();
      
      if (token) {
        this.fcmToken = token;
        console.log('🔑 FCM Token obtained:', token.substring(0, 20) + '...');
        
        // Cache the token
        await AsyncStorage.setItem('fcm_token', token);
        
        // If token changed, notify backend
        if (cachedToken !== token) {
          console.log('🔄 FCM Token updated');
          await this.registerWithBackend();
        }
        
        return token;
      } else {
        throw new Error('Failed to get FCM token');
      }

    } catch (error) {
      console.error('❌ FCM Token error:', error);
      return null;
    }
  }

  /**
   * Set up message handlers for different app states
   */
  setupMessageHandlers() {
    // Handle notification when app is in background
    messaging().setBackgroundMessageHandler(async (remoteMessage) => {
      console.log('📱 Background message received:', remoteMessage);
      this.handleReminderNotification(remoteMessage);
    });

    // Handle notification when app is in foreground
    messaging().onMessage(async (remoteMessage) => {
      console.log('📱 Foreground message received:', remoteMessage);
      this.handleReminderNotification(remoteMessage);
      
      // Show local notification for foreground messages
      this.showLocalNotification(remoteMessage);
    });

    // Handle notification when app is opened from quit state
    messaging().getInitialNotification().then((remoteMessage) => {
      if (remoteMessage) {
        console.log('📱 App opened from quit state by notification:', remoteMessage);
        this.handleReminderNotification(remoteMessage);
      }
    });

    // Handle notification when app is opened from background
    messaging().onNotificationOpenedApp((remoteMessage) => {
      console.log('📱 App opened from background by notification:', remoteMessage);
      this.handleReminderNotification(remoteMessage);
    });

    // Listen for token refresh
    messaging().onTokenRefresh(async (token) => {
      console.log('🔄 FCM Token refreshed:', token.substring(0, 20) + '...');
      this.fcmToken = token;
      await AsyncStorage.setItem('fcm_token', token);
      await this.registerWithBackend();
    });
  }

  /**
   * Handle received reminder notifications
   */
  handleReminderNotification(remoteMessage) {
    try {
      const { data, notification } = remoteMessage;
      
      if (data?.type === 'reminder') {
        console.log('⏰ Reminder notification received:', notification.title);
        
        // You can add custom logic here like:
        // - Playing custom sound
        // - Updating app state
        // - Logging reminder completion
        // - Showing in-app notification
      }
    } catch (error) {
      console.error('❌ Error handling notification:', error);
    }
  }

  /**
   * Show local notification for foreground messages
   */
  showLocalNotification(remoteMessage) {
    Alert.alert(
      remoteMessage.notification?.title || '⏰ JARVIS Reminder',
      remoteMessage.notification?.body || 'You have a reminder!',
      [{ text: 'OK' }],
      { cancelable: true }
    );
  }

  /**
   * Register device with backend server
   */
  async registerWithBackend() {
    try {
      if (!this.fcmToken) {
        throw new Error('No FCM token available');
      }

      const deviceInfo = {
        fcmToken: this.fcmToken,
        platform: Platform.OS,
        version: Platform.Version,
        userId: await this.getUserId(),
        timestamp: new Date().toISOString()
      };

      console.log('📡 Registering device with backend...');
      const response = await APIService.registerDeviceToken(deviceInfo);
      
      if (response.success) {
        console.log('✅ Device registered with backend');
        await AsyncStorage.setItem('device_registered', 'true');
      } else {
        throw new Error('Backend registration failed');
      }

    } catch (error) {
      console.error('❌ Backend registration failed:', error);
      // Don't throw - app should work without backend
    }
  }

  /**
   * Schedule reminder via backend
   */
  async scheduleReminder(reminderData) {
    try {
      if (!this.isInitialized) {
        throw new Error('Firebase not initialized');
      }

      if (!this.fcmToken) {
        throw new Error('No FCM token available');
      }

      console.log('📅 Scheduling reminder via Firebase backend...');
      
      const payload = {
        ...reminderData,
        fcmToken: this.fcmToken,
        platform: Platform.OS,
        userId: await this.getUserId(),
        scheduledAt: new Date().toISOString()
      };

      const response = await APIService.scheduleFirebaseReminder(payload);
      
      if (response.success) {
        console.log('✅ Reminder scheduled via Firebase backend');
        return {
          success: true,
          method: 'firebase_push',
          remoteId: response.remoteId,
          scheduledFor: reminderData.time
        };
      } else {
        throw new Error(response.error || 'Backend scheduling failed');
      }

    } catch (error) {
      console.error('❌ Firebase reminder scheduling failed:', error);
      throw error;
    }
  }

  /**
   * Cancel a scheduled reminder
   */
  async cancelReminder(remoteId) {
    try {
      console.log('🗑️ Canceling reminder via Firebase backend...');
      
      const response = await APIService.cancelFirebaseReminder({
        remoteId,
        fcmToken: this.fcmToken,
        userId: await this.getUserId()
      });

      if (response.success) {
        console.log('✅ Reminder canceled via Firebase backend');
        return true;
      } else {
        throw new Error('Backend cancellation failed');
      }

    } catch (error) {
      console.error('❌ Firebase reminder cancellation failed:', error);
      return false;
    }
  }

  /**
   * Get user ID from storage
   */
  async getUserId() {
    try {
      return await AsyncStorage.getItem('user_id') || 'anonymous';
    } catch (error) {
      return 'anonymous';
    }
  }

  /**
   * Open app settings (platform-specific)
   */
  openAppSettings() {
    // This would need native modules for each platform
    Alert.alert(
      'Open Settings',
      'Please manually enable notifications in your device settings.',
      [{ text: 'OK' }]
    );
  }

  /**
   * Check if Firebase is properly initialized
   */
  isReady() {
    return this.isInitialized && this.fcmToken !== null;
  }

  /**
   * Get current FCM token
   */
  getToken() {
    return this.fcmToken;
  }
}

// Create singleton instance
const firebaseNotificationService = new FirebaseNotificationService();

export default firebaseNotificationService;