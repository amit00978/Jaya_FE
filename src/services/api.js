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
    this.initialized = false;
    this.initClient();
  }

  async initClient() {
    // Load saved API URL from storage
    try {
      const savedURL = await AsyncStorage.getItem('api_url');
      if (savedURL) {
        this.baseURL = savedURL;
      }
    } catch (error) {
      console.log("Could not load saved API URL, using default");
    }

    console.log("Initializing API client with base URL:", this.baseURL);

    this.client = axios.create({
      baseURL: this.baseURL,
      timeout: API_CONFIG.timeout,
      headers: API_CONFIG.headers,
    });
    
    this.initialized = true;
    console.log("API client initialized successfully");
  }

  async ensureInitialized() {
    if (!this.initialized) {
      await this.initClient();
    }
  }

  async updateBaseURL(url) {
    this.baseURL = url;
    await AsyncStorage.setItem('api_url', url);
    this.initClient();
  }

  async sendMessage(userId, text, useWebSearch = true) {
    try {
      await this.ensureInitialized();
      
      console.log("========== Sending message to API ==========");
      
      const requestData = {
        user_id: 'user_123',
        text: text,
        use_web_search: useWebSearch,
        include_context: true,
      };
      
      console.log("=============API URL:", this.baseURL + API_ENDPOINTS.CHAT);
      console.log("=============Request data:", JSON.stringify(requestData, null, 2));
      console.log("=============Headers:", this.client.defaults.headers);
      
      const response = await this.client.post(API_ENDPOINTS.CHAT, requestData);

      console.log("========== Received response from API ==========", response.data);
      return response.data;
    } catch (error) {
      console.error('Send message error:', error);
      console.error('Error details:', {
        status: error.response?.status,
        statusText: error.response?.statusText,
        data: error.response?.data,
        config: error.config
      });
      throw this.handleError(error);
    }
  }

  async sendAudio(userId, audioBase64, useWebSearch = true) {
    try {
      await this.ensureInitialized();
      
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
      await this.ensureInitialized();
      
      const response = await this.client.delete(API_ENDPOINTS.CLEAR_HISTORY(userId));
      return response.data;
    } catch (error) {
      console.error('Clear history error:', error);
      throw this.handleError(error);
    }
  }

  async checkHealth() {
    try {
      await this.ensureInitialized();
      
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

  // Test method to verify API connectivity
  async testConnection() {
    try {
      await this.ensureInitialized();
      console.log("Testing API connection...");
      
      const testRequest = {
        user_id: "test_user_" + Date.now(),
        text: "Hello, this is a test message",
        use_web_search: false,
        include_context: true,
      };
      
      console.log("Test request:", JSON.stringify(testRequest, null, 2));
      
      const response = await this.client.post(API_ENDPOINTS.CHAT, testRequest);
      console.log("Test response:", response.data);
      return { success: true, data: response.data };
    } catch (error) {
      console.error("Test connection failed:", error);
      return { success: false, error: this.handleError(error) };
    }
  }
}

export default new APIService();
