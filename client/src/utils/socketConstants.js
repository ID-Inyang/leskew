// client/src/utils/socketConstants.js

// Socket events - Client to Server
export const CLIENT_EVENTS = {
  JOIN_VENDOR_QUEUE: 'join-vendor-queue',
  LEAVE_VENDOR_QUEUE: 'leave-vendor-queue',
  CUSTOMER_JOIN_QUEUE: 'customer-join-queue',
  CALL_NEXT_CUSTOMER: 'call-next-customer',
  CUSTOMER_LEFT_QUEUE: 'customer-left-queue',
  PING: 'ping',
  DEBUG_ROOMS: 'debug-rooms',
};

// Socket events - Server to Client
export const SERVER_EVENTS = {
  CONNECTED: 'connected',
  ROOM_JOINED: 'room-joined',
  ROOM_LEFT: 'room-left',
  QUEUE_UPDATED: 'queue-updated',
  CUSTOMER_CALLED: 'customer-called',
  CUSTOMER_LEFT: 'customer-left',
  PONG: 'pong',
  DEBUG_RESPONSE: 'debug-response',
};

// Combined for convenience
export const SOCKET_EVENTS = {
  ...CLIENT_EVENTS,
  ...SERVER_EVENTS,
};

// Socket configuration - using Vite's import.meta.env
export const SOCKET_CONFIG = {
  // Use Vite environment variables
  URL: import.meta.env.VITE_SOCKET_URL || 'http://localhost:5000',
  TRANSPORTS: ['websocket', 'polling'],
  RECONNECTION_ATTEMPTS: 5,
  RECONNECTION_DELAY: 1000,
  TIMEOUT: 10000,
};

// Helper function to create user-specific event names
export const getUserEvent = (userId, eventType) => {
  return `customer-${userId}-${eventType}`;
};

// Common event types for user-specific events
export const USER_EVENT_TYPES = {
  QUEUE_UPDATE: 'queue-update',
  CALLED: 'called',
  LEFT: 'left',
};

// Queue update action types
export const QUEUE_ACTIONS = {
  JOINED: 'joined',
  CALLED: 'called',
  LEFT: 'left',
  SERVED: 'served',
  SKIPPED: 'skipped',
};