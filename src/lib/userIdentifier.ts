/**
 * userIdentifier.ts
 * 
 * This utility handles consistent user identification across the application,
 * particularly for anonymous features like Anon Chat and Curhat Anonim.
 */

import { getAuth, signInAnonymously as firebaseSignInAnonymously, User } from 'firebase/auth';
import { firebaseApp } from './firebase';
import { v4 as uuidv4 } from 'uuid';

// Types for browser identification
type BrowserInfo = 'firefox' | 'chrome' | 'edge' | 'safari' | 'opera' | 'ie' | 'unknown' | 'server';

// Cache for storing user IDs to avoid regeneration
interface UserIdCache {
  permanentId: string | null;
  browserToken: string | null;
  sessionId: string | null;
}

// Module-level cache
const cache: UserIdCache = {
  permanentId: null,
  browserToken: null,
  sessionId: null
};

// Interface for mapping different ID types
interface UserIdMap {
  permanentId: string;
  firebaseId?: string;
  anonymousChatId?: string;
  sessionId?: string;
}

/**
 * Get information about the current browser
 */
export const getBrowserInfo = (): BrowserInfo => {
  if (typeof window === 'undefined') return 'server';
  
  const userAgent = window.navigator.userAgent;
  
  if (userAgent.indexOf("Firefox") > -1) {
    return "firefox";
  } else if (userAgent.indexOf("Edge") > -1) {
    return "edge";
  } else if (userAgent.indexOf("Chrome") > -1) {
    return "chrome";
  } else if (userAgent.indexOf("Safari") > -1) {
    return "safari";
  } else if (userAgent.indexOf("Opera") > -1) {
    return "opera";
  } else if (userAgent.indexOf("MSIE") > -1 || userAgent.indexOf("Trident") > -1) {
    return "ie";
  }
  
  return "unknown";
};

/**
 * Generate a unique device fingerprint to differentiate between devices
 * Even if browsers are the same type, this should generate different IDs for different devices
 */
export const getDeviceFingerprint = (): string => {
  if (typeof window === 'undefined') return 'server-device';
  
  try {
    // Combine various device-specific attributes
    const screenAttrs = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
    const timeZone = Intl.DateTimeFormat().resolvedOptions().timeZone || '';
    const languages = navigator.languages ? navigator.languages.join(',') : navigator.language || '';
    const platform = navigator.platform || '';
    const hardwareConcurrency = navigator.hardwareConcurrency || 0;
    const deviceMemory = (navigator as { deviceMemory?: number }).deviceMemory || 0;
    const pixelRatio = window.devicePixelRatio || 0;
    const vendor = navigator.vendor || '';
    
    // Create a fingerprint string
    const fingerprint = `${screenAttrs}|${timeZone}|${languages}|${platform}|${hardwareConcurrency}|${deviceMemory}|${pixelRatio}|${vendor}`;
    
    // Create a hash of the fingerprint
    let hash = 0;
    for (let i = 0; i < fingerprint.length; i++) {
      const char = fingerprint.charCodeAt(i);
      hash = ((hash << 5) - hash) + char;
      hash = hash & hash; // Convert to 32bit integer
    }
    
    return `device_${hash.toString(36)}`;
  } catch (_) {
    console.error('Error generating device fingerprint:', _);
    // Fallback to random ID if fingerprinting fails
    return `device_${Math.random().toString(36).substring(2, 10)}`;
  }
};

/**
 * Generate a unique browser fingerprint token
 */
export const generateBrowserToken = (): string => {
  if (typeof window === 'undefined') return '';
  
  // If we have a cached token, return it
  if (cache.browserToken) {
    return cache.browserToken;
  }
  
  // Check if token is stored in localStorage
  const storedToken = localStorage.getItem('app_browser_token');
  if (storedToken) {
    cache.browserToken = storedToken;
    return storedToken;
  }
  
  // Generate a new token with unique browser characteristics
  const screenInfo = `${window.screen.width}x${window.screen.height}x${window.screen.colorDepth}`;
  const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const browserInfo = getBrowserInfo();
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 10);
  const deviceId = getDeviceFingerprint(); // Add device fingerprint
  
  // Combine all information
  const rawToken = `${browserInfo}-${screenInfo}-${timezone}-${timestamp}-${random}-${deviceId}`;
  // Convert to base64 for easier storage
  const newToken = btoa(rawToken).replace(/=/g, '');
  
  // Store in localStorage for persistence
  localStorage.setItem('app_browser_token', newToken);
  
  // Cache the token
  cache.browserToken = newToken;
  
  return newToken;
};

/**
 * Get a permanent user ID that will be consistent across sessions
 */
export const getPermanentUserId = (): string => {
  if (typeof window === 'undefined') return `server_${uuidv4().substring(0, 8)}`;
  
  const storageKey = 'anonchat_permanent_user_id';
  let userId = localStorage.getItem(storageKey);
  
  if (!userId) {
    // Generate a more consistent ID based on browser and device fingerprint
    const browser = getBrowserInfo();
    const randomPart = Math.random().toString(36).substring(2, 8);
    
    // Create a consistent format for the user ID
    userId = `user_${browser}_${randomPart}_${Date.now()}`;
    localStorage.setItem(storageKey, userId);
  }
  
  return userId;
};

/**
 * Get a device-specific user ID that combines the permanent ID with device fingerprint
 */
export const getDeviceSpecificUserId = (): string => {
  if (typeof window === 'undefined') return `server_${uuidv4().substring(0, 8)}`;
  
  const basePermanentId = getPermanentUserId();
  const deviceFingerprint = getDeviceFingerprint();
  
  return `${basePermanentId}_device_${deviceFingerprint}`;
};

/**
 * Get a session ID that will be consistent within a browser session
 */
export const getSessionId = (): string => {
  if (typeof window === 'undefined') return '';
  
  const storageKey = 'anonchat_session_id';
  let sessionId = sessionStorage.getItem(storageKey);
  
  if (!sessionId) {
    sessionId = `session_${Date.now()}_${getRandomString(8)}`;
    sessionStorage.setItem(storageKey, sessionId);
  }
  
  return sessionId;
};

/**
 * Sign in anonymously with Firebase and return the user
 */
export const signInAnonymously = async (): Promise<User> => {
  const auth = getAuth(firebaseApp);
  
  // If already signed in, return current user
  if (auth.currentUser) {
    return auth.currentUser;
  }
  
  try {
    const result = await firebaseSignInAnonymously(auth);
    return result.user;
  } catch (error) {
    console.error('Error signing in anonymously:', error);
    throw error;
  }
};

/**
 * Store all user identifiers in one place for easy access
 */
export const storeUserIdentifiers = () => {
  if (typeof window === 'undefined') return null;
  
  const userId = getPermanentUserId();
  const deviceUserId = getDeviceSpecificUserId(); // Add the device-specific ID
  const browserToken = generateBrowserToken();
  const sessionId = getSessionId();
  const browser = getBrowserInfo();
  
  const userData = {
    userId,
    deviceUserId, // Include device-specific ID
    browserToken,
    sessionId,
    browser,
    deviceFingerprint: getDeviceFingerprint(),
    lastUpdated: new Date().toISOString()
  };
  
  localStorage.setItem('anonchat_user_data', JSON.stringify(userData));
  
  return userData;
};

/**
 * Map a Firebase auth ID to our permanent ID
 */
export const mapFirebaseIdToPermanentId = (firebaseId: string): void => {
  if (typeof window === 'undefined') return;
  
  const permanentId = getPermanentUserId();
  
  // Store the mapping
  try {
    // Get existing mappings or create new
    const existingMapJson = localStorage.getItem('user_id_mappings');
    let mappings: Record<string, UserIdMap> = {};
    
    if (existingMapJson) {
      mappings = JSON.parse(existingMapJson);
    }
    
    // Add or update the mapping
    mappings[firebaseId] = {
      ...mappings[firebaseId],
      permanentId,
      firebaseId
    };
    
    // Store updated mappings
    localStorage.setItem('user_id_mappings', JSON.stringify(mappings));
    
    // Also store the current mapping for quick access
    localStorage.setItem('current_firebase_id', firebaseId);
  } catch (error) {
    console.error('Error storing ID mapping:', error);
  }
};

/**
 * Get permanent ID from a Firebase auth ID
 */
export const getPermanentIdFromFirebaseId = (firebaseId: string): string | null => {
  if (typeof window === 'undefined') return null;
  
  try {
    const mappingsJson = localStorage.getItem('user_id_mappings');
    if (!mappingsJson) return null;
    
    const mappings: Record<string, UserIdMap> = JSON.parse(mappingsJson);
    return mappings[firebaseId]?.permanentId || null;
  } catch (error) {
    console.error('Error retrieving ID mapping:', error);
    return null;
  }
};

/**
 * Get current Firebase ID if available
 */
export const getCurrentFirebaseId = (): string | null => {
  if (typeof window === 'undefined') return null;
  return localStorage.getItem('current_firebase_id');
};

/**
 * Generate a security token to include in Firestore documents
 * This helps with security rules validation by creating a consistent 
 * ownership verification token
 */
export const generateSecurityToken = (userId: string, platform: string): string => {
  if (!userId) return '';
  
  // Create a hash-like token that combines userId with specific patterns
  // This isn't cryptographically secure, but provides a simple ownership verification
  const timestamp = Date.now();
  const randomPart = Math.random().toString(36).substring(2, 10);
  const input = `${userId}-${platform}-${timestamp}-${randomPart}`;
  
  // Create a simple hash
  let hash = 0;
  for (let i = 0; i < input.length; i++) {
    const char = input.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32bit integer
  }
  
  return `${platform}_${hash}_${timestamp}_${userId.substring(0, 5)}`;
};

/**
 * Create a document with security token for Firestore
 */
export const createSecureDocument = <T extends Record<string, unknown>>(data: T, userId: string, platform: string): T & {
  owner: string;
  securityToken: string;
  created: string;
  platform: string;
  ownerVerified: boolean;
} => {
  // Generate a token for document ownership verification in security rules
  const securityToken = generateSecurityToken(userId, platform);
  
  // Return document with added security fields
  return {
    ...data,
    // Security fields to help with Firestore security rules
    owner: userId,
    securityToken,
    created: new Date().toISOString(),
    platform,
    ownerVerified: true
  };
};

// Helper to generate random string
function getRandomString(length: number): string {
  const characters = 'abcdefghijklmnopqrstuvwxyz0123456789';
  let result = '';
  for (let i = 0; i < length; i++) {
    result += characters.charAt(Math.floor(Math.random() * characters.length));
  }
  return result;
}

// Check if a connection is already active to prevent duplicates
export function isConnectionActive(roomId: string | null): boolean {
  if (typeof window === 'undefined' || !roomId) return false;
  
  // Check if we already have an active connection for this room
  const activeConnectionKey = 'anonchat_active_connection';
  const storedConnection = localStorage.getItem(activeConnectionKey);
  
  if (storedConnection) {
    try {
      const connectionData = JSON.parse(storedConnection);
      
      // If the connection is for the same room, it's a duplicate
      if (connectionData.roomId === roomId) {
        // Check if the connection was established recently (within 10 seconds)
        const now = Date.now();
        const connectionTime = new Date(connectionData.timestamp).getTime();
        const timeDiff = now - connectionTime;
        
        // If connection is recent, consider it active
        if (timeDiff < 10000) {
          console.log(`Found active connection for room ${roomId} established ${timeDiff}ms ago`);
          return true;
        }
      }
    } catch (_) {
      console.error('Error checking active connection:', _);
      // Invalid JSON, ignore
    }
  }
  
  // Mark this connection as active
  const connectionData = {
    roomId,
    userId: getPermanentUserId(),
    deviceId: getDeviceFingerprint(),
    timestamp: new Date().toISOString(),
    browser: getBrowserInfo()
  };
  
  localStorage.setItem(activeConnectionKey, JSON.stringify(connectionData));
  return false;
}

// Initialize identifiers when the module is imported
if (typeof window !== 'undefined') {
  storeUserIdentifiers();
}

// Default export for convenience
const userIdentifierExport = {
  getPermanentUserId,
  getDeviceSpecificUserId,
  getBrowserInfo,
  generateBrowserToken,
  getSessionId,
  signInAnonymously,
  storeUserIdentifiers,
  mapFirebaseIdToPermanentId,
  getPermanentIdFromFirebaseId,
  getCurrentFirebaseId,
  generateSecurityToken,
  createSecureDocument,
  isConnectionActive,
  getDeviceFingerprint
};

export default userIdentifierExport; 