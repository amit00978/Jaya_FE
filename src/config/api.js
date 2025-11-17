/**
 * API Configuration
 */

// Change this to your computer's local IP address when testing on physical device
// Find your IP: Run `ipconfig getifaddr en0` on Mac or `ipconfig` on Windows
export const DEFAULT_API_URL = 'http://localhost:8000';

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
