/**
 * Debug utility for testing notifications
 */
import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Alert } from 'react-native';

export const debugNotifications = async () => {
  console.log('🔧 Starting notification debug...');
  
  try {
    // Check device capabilities
    console.log('📱 Device info:');
    console.log('  - isDevice:', Device.isDevice);
    console.log('  - deviceName:', Device.deviceName);
    console.log('  - osName:', Device.osName);
    console.log('  - osVersion:', Device.osVersion);
    
    // Check permissions
    const { status, canAskAgain, granted } = await Notifications.getPermissionsAsync();
    console.log('🔐 Notification permissions:');
    console.log('  - status:', status);
    console.log('  - granted:', granted);
    console.log('  - canAskAgain:', canAskAgain);
    
    if (status !== 'granted') {
      console.log('⚠️ Permissions not granted, requesting...');
      const { status: newStatus } = await Notifications.requestPermissionsAsync();
      console.log('  - new status:', newStatus);
    }
    
    // Check scheduled notifications
    const scheduled = await Notifications.getAllScheduledNotificationsAsync();
    console.log('📅 Scheduled notifications:', scheduled.length);
    scheduled.forEach((notif, index) => {
      console.log(`  ${index + 1}. ID: ${notif.identifier}`);
      console.log(`     Title: ${notif.content.title}`);
      console.log(`     Trigger: ${JSON.stringify(notif.trigger)}`);
    });
    
    return {
      device: Device.isDevice,
      permissions: status === 'granted',
      scheduledCount: scheduled.length,
      details: {
        device: Device.deviceName,
        os: `${Device.osName} ${Device.osVersion}`,
        permissions: { status, granted, canAskAgain },
        scheduled: scheduled.map(n => ({
          id: n.identifier,
          title: n.content.title,
          trigger: n.trigger
        }))
      }
    };
    
  } catch (error) {
    console.error('❌ Debug failed:', error);
    return { error: error.message };
  }
};

export const testNotification = async () => {
  try {
    console.log('🧪 Testing immediate notification...');
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '🧪 Test Notification',
        body: 'This is a test notification from JARVIS',
        sound: 'default',
      },
      trigger: {
        seconds: 2, // 2 seconds from now
      },
    });
    
    console.log('✅ Test notification scheduled with ID:', notificationId);
    
    Alert.alert(
      'Test Notification',
      'A test notification has been scheduled for 2 seconds from now. You should receive it shortly if notifications are working.',
      [{ text: 'OK' }]
    );
    
    return notificationId;
  } catch (error) {
    console.error('❌ Test notification failed:', error);
    Alert.alert('Test Failed', `Could not schedule test notification: ${error.message}`);
    throw error;
  }
};

export const clearAllNotifications = async () => {
  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
    console.log('🧹 All scheduled notifications cleared');
    Alert.alert('Cleared', 'All scheduled notifications have been cleared.');
  } catch (error) {
    console.error('❌ Failed to clear notifications:', error);
    Alert.alert('Error', `Failed to clear notifications: ${error.message}`);
  }
};