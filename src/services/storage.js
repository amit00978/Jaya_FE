/**
 * Storage Service - AsyncStorage wrapper
 */
import AsyncStorage from '@react-native-async-storage/async-storage';
import { v4 as uuidv4 } from 'uuid';

const KEYS = {
  USER_ID: 'user_id',
  API_URL: 'api_url',
  WEB_SEARCH_ENABLED: 'web_search_enabled',
  AUTO_PLAY_AUDIO: 'auto_play_audio',
  CONVERSATION_HISTORY: 'conversation_history',
  LOCAL_REMINDERS: 'local_reminders',
};

class StorageService {
  // User ID
  async getUserId() {
    let userId = await AsyncStorage.getItem(KEYS.USER_ID);
    if (!userId) {
      userId = uuidv4();
      await this.setUserId(userId);
    }
    return userId;
  }

  async setUserId(userId) {
    await AsyncStorage.setItem(KEYS.USER_ID, userId);
  }

  async generateNewUserId() {
    const newId = uuidv4();
    await this.setUserId(newId);
    return newId;
  }

  // API URL
  async getApiUrl() {
    return await AsyncStorage.getItem(KEYS.API_URL);
  }

  async setApiUrl(url) {
    await AsyncStorage.setItem(KEYS.API_URL, url);
  }

  // Web Search Setting
  async getWebSearchEnabled() {
    const value = await AsyncStorage.getItem(KEYS.WEB_SEARCH_ENABLED);
    return value !== 'false'; // Default to true
  }

  async setWebSearchEnabled(enabled) {
    await AsyncStorage.setItem(KEYS.WEB_SEARCH_ENABLED, enabled.toString());
  }

  // Auto Play Audio
  async getAutoPlayAudio() {
    const value = await AsyncStorage.getItem(KEYS.AUTO_PLAY_AUDIO);
    return value === 'true'; // Default to false
  }

  async setAutoPlayAudio(enabled) {
    await AsyncStorage.setItem(KEYS.AUTO_PLAY_AUDIO, enabled.toString());
  }

  // Conversation History
  async getConversationHistory() {
    try {
      const history = await AsyncStorage.getItem(KEYS.CONVERSATION_HISTORY);
      return history ? JSON.parse(history) : [];
    } catch (error) {
      console.error('Error loading conversation history:', error);
      return [];
    }
  }

  async saveConversationHistory(history) {
    try {
      await AsyncStorage.setItem(KEYS.CONVERSATION_HISTORY, JSON.stringify(history));
    } catch (error) {
      console.error('Error saving conversation history:', error);
    }
  }

  async addMessageToHistory(message) {
    const history = await this.getConversationHistory();
    history.push(message);
    // Keep only last 100 messages
    if (history.length > 100) {
      history.shift();
    }
    await this.saveConversationHistory(history);
  }

  async clearConversationHistory() {
    await AsyncStorage.setItem(KEYS.CONVERSATION_HISTORY, JSON.stringify([]));
  }

  // Clear all data
  async clearAll() {
    await AsyncStorage.multiRemove([
      KEYS.CONVERSATION_HISTORY,
    ]);
  }

  // Local reminders for intent-based scheduling
  async getLocalReminders() {
    try {
      const reminders = await AsyncStorage.getItem(KEYS.LOCAL_REMINDERS);
      return reminders ? JSON.parse(reminders) : [];
    } catch (error) {
      console.error('Error loading local reminders:', error);
      return [];
    }
  }

  async saveLocalReminder(reminder) {
    try {
      const reminders = await this.getLocalReminders();
      const newReminder = {
        id: Date.now().toString(),
        text: reminder.text,
        time: reminder.time,
        originalText: reminder.originalText,
        created: new Date().toISOString(),
        ...reminder,
      };
      reminders.push(newReminder);
      await AsyncStorage.setItem(KEYS.LOCAL_REMINDERS, JSON.stringify(reminders));
      console.log('Saved local reminder:', newReminder);
      return newReminder;
    } catch (error) {
      console.error('Error saving local reminder:', error);
      throw error;
    }
  }

  async removeLocalReminder(id) {
    try {
      const reminders = await this.getLocalReminders();
      const filtered = reminders.filter(r => r.id !== id);
      await AsyncStorage.setItem(KEYS.LOCAL_REMINDERS, JSON.stringify(filtered));
    } catch (error) {
      console.error('Error removing local reminder:', error);
    }
  }

  async updateLocalReminder(id, updatedReminder) {
    try {
      const reminders = await this.getLocalReminders();
      const index = reminders.findIndex(r => r.id === id);
      if (index !== -1) {
        reminders[index] = { ...reminders[index], ...updatedReminder };
        await AsyncStorage.setItem(KEYS.LOCAL_REMINDERS, JSON.stringify(reminders));
        console.log('Updated local reminder:', reminders[index]);
        return reminders[index];
      }
      throw new Error('Reminder not found');
    } catch (error) {
      console.error('Error updating local reminder:', error);
      throw error;
    }
  }
}

export default new StorageService();
