import * as Ably from 'ably';
import { Gender, PreferredGender } from '@/types';
import { v4 as uuidv4 } from 'uuid';

// Helper for client-side and server-side environment detection
const isBrowser = typeof window !== 'undefined';

// Interface for message format
export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'partner' | 'system';
  timestamp: number;
}

// Interface for channel metadata
export interface ChannelMetadata {
  userId: string;
  partnerId: string | null;
  gender: Gender;
  lookingFor: PreferredGender;
  status: 'waiting' | 'chatting' | 'disconnected';
}

let ablyClient: Ably.Realtime | null = null;

// Function to get Ably client instance (singleton)
export function getAblyClient(): Ably.Realtime {
  // If client already exists, return it
  if (ablyClient && ablyClient.connection.state !== 'failed') {
    return ablyClient;
  }
  
  try {
    // For client-side
    if (isBrowser) {
      console.log("Creating new Ably client instance");
      
      // In browser, always use token auth for security
      ablyClient = new Ably.Realtime({ 
        authUrl: '/api/ably-token',
        clientId: localStorage.getItem('anonchat_user_id') || `user_${uuidv4()}`,
        autoConnect: true,
        recover: function(lastConnectionDetails, cb) {
          console.log('Ably recovery attempt:', lastConnectionDetails);
          // Always recover if connection was previously established
          cb(true);
        }
      });
      
      // Add detailed connection state logging
      ablyClient.connection.on((stateChange) => {
        console.log(`Ably connection state changed to: ${stateChange.current}`, {
          previous: stateChange.previous,
          reason: stateChange.reason
        });
        
        // For certain failures, force reconnection
        if (stateChange.current === 'failed' || stateChange.current === 'suspended') {
          console.warn('Critical connection issue - forcing reconnection in 3 seconds');
          setTimeout(() => {
            console.log('Attempting forced reconnection...');
            ablyClient?.connection.connect();
          }, 3000);
        }
      });
      
      // Add event listener for connection failures
      ablyClient.connection.on('failed', (stateChange) => {
        console.error('Ably connection failed:', stateChange.reason);
        
        // Log the detailed error for troubleshooting
        if (stateChange.reason && stateChange.reason.message) {
          if (stateChange.reason.message.includes('API key') || stateChange.reason.message.includes('401')) {
            console.error('ABLY API KEY ISSUE - Please check your environment variables', stateChange.reason);
          }
        }
      });
      
    } else {
      // For server-side with API key (only used in API routes)
      const apiKey = process.env.ABLY_API_KEY;
      
      if (!apiKey) {
        throw new Error('ABLY_API_KEY environment variable is not set');
      }
      
      ablyClient = new Ably.Realtime({ 
        key: apiKey,
        autoConnect: true
      });
    }
    
    return ablyClient;
  } catch (err) {
    console.error('Error creating Ably client:', err);
    
    // Create a fallback client that will just fail gracefully
    // This prevents the app from crashing completely
    ablyClient = new Ably.Realtime({ 
      authUrl: '/api/ably-token',
      autoConnect: false
    });
    
    return ablyClient;
  }
}

// Function to create a channel name for waiting users
export function getWaitingChannelName(gender: Gender, lookingFor: PreferredGender): string {
  return `waiting:${gender}:${lookingFor}`;
}

// Function to create a unique channel name for a chat between two users
export function getChatChannelName(userId1: string, userId2: string): string {
  // Sort the IDs to ensure the same channel name regardless of order
  const sortedIds = [userId1, userId2].sort();
  return `chat:${sortedIds[0]}:${sortedIds[1]}`;
}

// Function to cleanup resources when done
export function closeAblyConnection(): void {
  if (ablyClient) {
    ablyClient.close();
    ablyClient = null;
  }
} 