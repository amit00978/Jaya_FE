/**
 * API Service - Backend communication
 */
import axios from 'axios';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DEFAULT_API_URL, API_ENDPOINTS, API_CONFIG } from '../config/api';

class APIService {
  constructor() {
    this.baseURL = DEFAULT_API_URL;
    this.client = null;
    this.initClient();
  }

  async initClient() {
    // Load saved API URL from storage
    const savedURL = await AsyncStorage.getItem('api_url');
    if (savedURL) {
      this.baseURL = savedURL;
    }

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: API_CONFIG.timeout,
      headers: API_CONFIG.headers,
    });
  }

  async updateBaseURL(url) {
    this.baseURL = url;
    await AsyncStorage.setItem('api_url', url);
    this.initClient();
  }

  async sendMessage(userId, text, useWebSearch = true) {
    try {
      const response = await this.client.post(API_ENDPOINTS.CHAT, {
        user_id: userId,
        text: text,
        use_web_search: useWebSearch,
        include_context: true,
      });
      return response.data;
    } catch (error) {
      console.error('Send message error:', error);
      throw this.handleError(error);
    }
  }

  async sendAudio(userId, audioBase64, useWebSearch = true) {
    try {
      const response = await this.client.post(API_ENDPOINTS.CHAT, {
        user_id: userId,
        audio: audioBase64,
        use_web_search: useWebSearch,
        include_context: true,
      });
      return response.data;
    } catch (error) {
      console.error('Send audio error:', error);
      throw this.handleError(error);
    }
  }

  async clearHistory(userId) {
    try {
      const response = await this.client.delete(API_ENDPOINTS.CLEAR_HISTORY(userId));
      return response.data;
    } catch (error) {
      console.error('Clear history error:', error);
      throw this.handleError(error);
    }
  }

  async checkHealth() {
    try {
      const response = await this.client.get(API_ENDPOINTS.HEALTH);
      return response.data;
    } catch (error) {
      console.error('Health check error:', error);
      throw this.handleError(error);
    }
  }

  handleError(error) {
    if (error.response) {
      // Server responded with error
      return {
        message: error.response.data?.detail || error.response.data?.message || 'Server error',
        status: error.response.status,
      };
    } else if (error.request) {
      // No response from server
      return {
        message: 'Cannot connect to server. Please check your connection and API URL.',
        status: 0,
      };
    } else {
      // Request setup error
      return {
        message: error.message || 'An error occurred',
        status: -1,
      };
    }
  }
}

export default new APIService();
