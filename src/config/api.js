/**
 * API Configuration
 */

// Production API URL
export const PRODUCTION_API_URL = 'http://159.65.159.82:8001';

// Local development API URL
export const LOCAL_API_URL = 'http://159.65.159.82:8001';

// Default to production API
export const DEFAULT_API_URL = PRODUCTION_API_URL;

export const API_ENDPOINTS = {
  CHAT: '/api/chat/',
  CLEAR_HISTORY: (userId) => `/api/chat/history/${userId}`,
  HEALTH: '/health',
};

export const API_CONFIG = {
  timeout: 30000, // 30 seconds
  headers: {
    'Content-Type': 'application/json',
  },
};
