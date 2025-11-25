/**
 * Reminder Utilities - Helper functions for reminder management
 */
import * as Notifications from 'expo-notifications';

// Parse various time formats and return a proper Date object
export const parseReminderTime = (timeString) => {
  try {
    // Handle relative time formats
    if (timeString.includes('minutes') || timeString.includes('minute')) {
      const minutes = parseInt(timeString.match(/\d+/)?.[0] || '0');
      const futureTime = new Date();
      futureTime.setMinutes(futureTime.getMinutes() + minutes);
      return futureTime;
    }
    
    if (timeString.includes('hours') || timeString.includes('hour')) {
      const hours = parseInt(timeString.match(/\d+/)?.[0] || '0');
      const futureTime = new Date();
      futureTime.setHours(futureTime.getHours() + hours);
      return futureTime;
    }
    
    if (timeString.includes('seconds') || timeString.includes('second')) {
      const seconds = parseInt(timeString.match(/\d+/)?.[0] || '0');
      const futureTime = new Date();
      futureTime.setSeconds(futureTime.getSeconds() + seconds);
      return futureTime;
    }

    // Try parsing as ISO string or standard date format
    const parsedDate = new Date(timeString);
    if (!isNaN(parsedDate.getTime())) {
      return parsedDate;
    }

    // Parse time formats like "14:30", "2:30 PM", etc.
    const timeRegex = /(\d{1,2}):(\d{2})\s*(AM|PM)?/i;
    const match = timeString.match(timeRegex);
    if (match) {
      let hours = parseInt(match[1]);
      const minutes = parseInt(match[2]);
      const ampm = match[3]?.toUpperCase();
      
      if (ampm === 'PM' && hours !== 12) hours += 12;
      if (ampm === 'AM' && hours === 12) hours = 0;
      
      const targetTime = new Date();
      targetTime.setHours(hours, minutes, 0, 0);
      
      // If the time has passed today, set it for tomorrow
      if (targetTime <= new Date()) {
        targetTime.setDate(targetTime.getDate() + 1);
      }
      
      return targetTime;
    }

    return null;
  } catch (error) {
    console.error('Error parsing reminder time:', error);
    return null;
  }
};

// Schedule a notification for a reminder
export const scheduleNotification = async (reminder) => {
  try {
    const reminderTime = new Date(reminder.time);
    const now = new Date();
    
    if (reminderTime <= now) {
      throw new Error('Cannot schedule reminder for past time');
    }

    const secondsUntilReminder = Math.floor((reminderTime.getTime() - now.getTime()) / 1000);
    
    const notificationId = await Notifications.scheduleNotificationAsync({
      content: {
        title: '⏰ JARVIS Reminder',
        body: reminder.originalText,
        sound: 'default',
        categoryIdentifier: 'reminder',
        data: {
          reminderId: reminder.id,
          type: 'reminder',
        },
      },
      trigger: {
        seconds: secondsUntilReminder,
      },
    });

    return notificationId;
  } catch (error) {
    console.error('Error scheduling notification:', error);
    throw error;
  }
};

// Cancel a scheduled notification
export const cancelNotification = async (notificationId) => {
  try {
    if (notificationId) {
      await Notifications.cancelScheduledNotificationAsync(notificationId);
      return true;
    }
    return false;
  } catch (error) {
    console.error('Error canceling notification:', error);
    return false;
  }
};

// Format reminder time for display
export const formatReminderTime = (timeString) => {
  try {
    const date = new Date(timeString);
    const now = new Date();
    const diffMs = date.getTime() - now.getTime();
    
    if (diffMs <= 0) {
      return 'Past due';
    }
    
    const diffMinutes = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMinutes / 60);
    const diffDays = Math.floor(diffHours / 24);
    
    if (diffMinutes < 60) {
      return `In ${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''}`;
    } else if (diffHours < 24) {
      return `In ${diffHours} hour${diffHours !== 1 ? 's' : ''}`;
    } else if (diffDays < 7) {
      return `In ${diffDays} day${diffDays !== 1 ? 's' : ''}`;
    } else {
      return date.toLocaleDateString();
    }
  } catch (error) {
    return 'Invalid time';
  }
};

// Get all scheduled notifications for reminders
export const getScheduledReminderNotifications = async () => {
  try {
    const notifications = await Notifications.getAllScheduledNotificationsAsync();
    return notifications.filter(notification => 
      notification.content.categoryIdentifier === 'reminder'
    );
  } catch (error) {
    console.error('Error getting scheduled notifications:', error);
    return [];
  }
};