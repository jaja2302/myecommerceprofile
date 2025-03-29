import { useState, useEffect, useRef, useCallback } from 'react';
import { v4 as uuidv4 } from 'uuid';
import * as Ably from "ably";
import {
  ChatClient, 
  ConnectionStatus,
  ConnectionStatusChange,
  RoomStatusChange,
  Room,
  RoomOptions,
  PresenceMember
} from "@ably/chat";
import { Gender, PreferredGender } from '@/types';

// Chat message interface
export interface ChatMessage {
  id: string;
  text: string;
  senderId: string;
  timestamp: number;
  isSystem?: boolean;
}

export interface AblyUserMetadata {
  userId: string;
  nickname: string;
  gender: Gender;
  lookingFor: PreferredGender;
}

// Interfaces for Ably event types
interface TypingEvent {
  currentlyTyping: Set<string>;
}

interface MessageData {
  text?: string;
  message?: string;
  [key: string]: unknown;
}

interface MessageEvent {
  type?: string;
  id?: string;
  clientId?: string;
  connectionId?: string;
  data?: string | MessageData;
  text?: string;
  member?: { clientId?: string };
  message?: {
    id?: string;
    data?: string | MessageData;
    clientId?: string;
    connectionId?: string;
    text?: string;
    name?: string;
  };
}

export interface UseAblyChatReturn {
  // State
  userId: string;
  messages: ChatMessage[];
  connectionStatus: string;
  room: Room | null;
  isSearching: boolean;
  partnerIsTyping: boolean;
  error: string | null;
  
  // Actions
  startChat: (metadata: Omit<AblyUserMetadata, 'userId'>) => Promise<boolean | null | undefined>;
  sendMessage: (text: string) => Promise<void>;
  endChat: () => Promise<void>;
  handleTyping: (text: string) => void;
}

// Configure room options with all features enabled
const AllFeaturesEnabled = {
  presence: {
    enabled: true,
    memberLimit: 100,
  },
  typing: {
    enabled: true,
    timeoutMs: 10000
  },
  occupancy: {
    enabled: true,
    metrics: ["presence"],
    interval: 3000,
  },
  reactions: {
    enabled: true
  }
} as unknown as RoomOptions;

export function useAblyChat(): UseAblyChatReturn {
  // Get or generate user ID
  const [userId] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      const savedId = localStorage.getItem('anonchat_user_id');
      const newId = savedId || `user_${uuidv4()}`;
      if (!savedId) localStorage.setItem('anonchat_user_id', newId);
      return newId;
    }
    return `user_${uuidv4()}`;
  });
  
  // State
  const [chatClient, setChatClient] = useState<ChatClient | null>(null);
  const [ablyClient, setAblyClient] = useState<Ably.Realtime | null>(null);
  const [room, setRoom] = useState<Room | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<string>('initialized');
  const [isSearching, setIsSearching] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [partnerIsTyping, setPartnerIsTyping] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [foundPartner, setFoundPartner] = useState<boolean>(false);
  
  // Refs
  const typingTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const messageIdsRef = useRef<Set<string>>(new Set());
  const unsubscribersRef = useRef<(() => void)[]>([]);
  const messagesRef = useRef<ChatMessage[]>([]);
  
  // Update messages ref whenever the messages state changes
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);
  
  // Helper to clean up subscriptions
  const cleanUpSubscriptions = useCallback(() => {
    unsubscribersRef.current.forEach(unsub => unsub());
    unsubscribersRef.current = [];
  }, []);
  
  // End chat function - Moved up to avoid reference before declaration
  const endChat = useCallback(async () => {
    if (!room || !chatClient) return;
    
    try {
      console.log('Ending chat');
      
      // Try to leave presence before releasing room
      try {
        await room.presence.leave();
      } catch (leaveError) {
        console.warn('Error leaving presence:', leaveError);
      }
      
      // Clean up all event subscriptions
      cleanUpSubscriptions();
      
      // Release room
      await chatClient.rooms.release(room.roomId);
      
      // Reset state
      setRoom(null);
      setMessages([]);
      setPartnerIsTyping(false);
      setFoundPartner(false);
      messageIdsRef.current.clear();
      setIsTyping(false);
      
      if (typingTimeoutRef.current) {
        clearTimeout(typingTimeoutRef.current);
        typingTimeoutRef.current = null;
      }
      
      console.log('Chat ended successfully');
    } catch (err) {
      console.error('Error ending chat:', err);
      setError('Failed to end chat: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, [room, chatClient, cleanUpSubscriptions]);
  
  // Initialize Ably client
  const initializeAbly = useCallback(async () => {
    try {
      console.log("Initializing Ably client for user:", userId);
      
      // Gunakan konfigurasi yang sesuai dengan kebutuhan
      const client = new Ably.Realtime({
        key: '78Q3JA.LbgCBA:a_bsPMiu6aLhUJzOsQ8CKHSrnlHIKg5tjSeBvN6jj70',
        clientId: userId,
        autoConnect: true,
        echoMessages: false,
      });
      
      setAblyClient(client);
      
      // Create Chat client
      const chat = new ChatClient(client);
      setChatClient(chat);
      
      // Monitor Chat connection status (using proper SDK types)
      chat.connection.onStatusChange((change: ConnectionStatusChange) => {
        console.log('Ably Chat connection state changed:', change);
        
        // Update connection status 
        setConnectionStatus(change.current);
        
        // If disconnected or failed, show error
        if (change.current === ConnectionStatus.Failed) {
          setError('Connection failed: ' + (change.error?.message || 'Unknown error'));
        } else if (change.current === ConnectionStatus.Suspended) {
          setError('Connection suspended. Trying to reconnect...');
          
          // Try to reconnect after delay
          setTimeout(() => {
            if (client && client.connection && client.connection.state !== 'connected') {
              console.log('Attempting to reconnect...');
              client.connection.connect();
            }
          }, 3000);
        } else if (change.current === ConnectionStatus.Connected) {
          setError(null); // Clear error when connection restored
        }
      });
      
      return client;
    } catch (error) {
      console.error('Error initializing Ably:', error);
      throw error;
    }
  }, [userId]);
  
  // Auto-initialize Ably on component mount
  useEffect(() => {
    if (!chatClient && !ablyClient) {
      initializeAbly()
        .then(() => console.log('Ably initialized automatically'))
        .catch(err => {
          console.error('Failed to auto-initialize Ably:', err);
          setError('Connection failed. Please refresh the page and try again.');
        });
    }
    
    // Cleanup function
    return () => {
      cleanUpSubscriptions();
      if (ablyClient) {
        ablyClient.close();
      }
    };
  }, [chatClient, ablyClient, initializeAbly, cleanUpSubscriptions]);
  
  // Helper function to check if users are compatible matches
  const isCompatibleMatch = useCallback((userData: unknown, partnerData: unknown) => {
    // Simple compatibility check - can be expanded based on app requirements
    if (!userData || !partnerData) return false;
    
    // Example compatibility logic (everyone matches for now)
    return true;
  }, []);
  
  // Helper function to create or join a chat
  const createOrJoinChat = useCallback(async (
    partnerId: string,
    partnerData: unknown,
    userMetadata: unknown
  ) => {
    if (!chatClient || !ablyClient) return;
    
    try {
      // Special channel name format for the chat room
      const channelName = `chat:${[userId, partnerId].sort().join('-')}`;
      
      console.log(`Creating/joining chat room: ${channelName}`);
      
      // Get the chat room with all features enabled using standard API
      const chatRoom = await chatClient.rooms.get(channelName, AllFeaturesEnabled);
      
      console.log('Chat room created/joined:', chatRoom);
      
      // Monitor room status changes
      const { off: roomStatusOff } = chatRoom.onStatusChange((change: RoomStatusChange) => {
        console.log('Room state changed to:', change.current);
        
        if (change.current === 'failed') {
          setError(`Chat room connection failed: ${change.error?.message || 'Unknown error'}`);
        }
      });
      
      // Add to cleanup
      unsubscribersRef.current.push(roomStatusOff);
      
      // Attach to the channel to ensure we can use presence
      await chatRoom.attach();
      
      // Longer delay to ensure channel is ready for presence
      await new Promise(resolve => setTimeout(resolve, 1000));
      
      try {
        // Enter the presence with user metadata
        await chatRoom.presence.enter(userMetadata);
        console.log('Entered presence in chat room');
        
        // Monitor typing indicators - using proper structure from Ably docs
        const { unsubscribe: typingUnsubscribe } = chatRoom.typing.subscribe((event: TypingEvent) => {
          console.log('Typing event:', event);
          
          // Check the currently typing set of clientIds
          if (event && event.currentlyTyping) {
            // Check if partner is in the typing list (excluding ourselves)
            const partnerIsTyping = Array.from(event.currentlyTyping as Set<string>).some(
              (typingClientId: string) => typingClientId !== userId
            );
            
            setPartnerIsTyping(partnerIsTyping);
          }
        });
        
        // Add to cleanup
        unsubscribersRef.current.push(typingUnsubscribe);
        
        // Monitor presence (for user joining/leaving)
        const { unsubscribe: presenceUnsubscribe } = chatRoom.presence.subscribe((event) => {
          console.log('Presence event:', event);
          
          if (event.action === 'leave' && event.clientId !== userId) {
            // Partner left the chat
            setMessages(prev => [...prev, {
              id: uuidv4(),
              text: `${(partnerData as { nickname?: string })?.nickname || 'Your partner'} has left the chat`,
              senderId: 'system',
              timestamp: Date.now(),
              isSystem: true
            }]);
          }
        });
        
        // Add to cleanup
        unsubscribersRef.current.push(presenceUnsubscribe);
      } catch (presenceError) {
        console.error('Error entering presence in chat room:', presenceError);
        throw presenceError;
      }
      
      // Set current room and partner data
      setRoom(chatRoom);
      setFoundPartner(true);
      setIsSearching(false);
      
      // Subscribe to messages - use any type for now to avoid TypeScript errors
      const { unsubscribe: messageUnsubscribe } = chatRoom.messages.subscribe((event: MessageEvent) => {
        console.log('Message event received:', event);
        console.log('Event type:', event.type);
        if (event.message) {
          console.log('Message property:', event.message);
          if (event.message.data) {
            console.log('Message data:', event.message.data);
          }
        }
        
        // Extract message details, handling different message formats
        let messageText = '';
        let messageSender = '';
        let messageId = '';
        
        // First check if we have a nested message structure (typical Ably pattern)
        if (event.type === 'message.created' && event.message) {
          const msg = event.message;
          console.log('Nested message structure detected:', msg);
          
          // Extract message ID
          messageId = msg.id || String(Date.now());
          
          // Try to extract text from different possible formats in the message object
          if (msg.data) {
            if (typeof msg.data === 'string') {
              messageText = msg.data;
              console.log('Message data is string:', messageText);
            } else if (typeof msg.data === 'object') {
              // For JSON data
              if (msg.data.text) {
                messageText = msg.data.text;
                console.log('Found text in data object:', messageText);
              } else if (msg.data.message) {
                messageText = msg.data.message;
                console.log('Found message in data object:', messageText);
              } else {
                console.log('Data object without text or message:', msg.data);
                messageText = JSON.stringify(msg.data);
              }
            }
          } else if (msg.text) {
            messageText = msg.text;
            console.log('Using message.text:', messageText);
          } else {
            // Last resort, stringify the whole message
            messageText = `Message: ${msg.name || 'Unknown'}`;
            console.log('Using fallback text:', messageText);
          }
          
          // Try to extract the sender ID
          messageSender = msg.clientId || (msg.connectionId || '').split(':')[0] || 'unknown';
          console.log('Extracted message sender:', messageSender);
        } else {
          // Fallback to direct event properties
          messageId = event.id || String(Date.now());
          
          // Try to extract text from different possible message formats
          if (typeof event.data === 'string') {
            messageText = event.data;
            console.log('Message data is string:', messageText);
          } else if (event.data && typeof event.data === 'object') {
            messageText = event.data.text || '';
            console.log('Message data is object:', event.data, 'extracted text:', messageText);
          } else if (event.text) {
            messageText = event.text;
            console.log('Using event.text:', messageText);
          }
          
          // Try to extract the sender ID
          messageSender = event.clientId || (event.member && event.member.clientId) || 'unknown';
        }
        
        console.log('Processed message:', { id: messageId, text: messageText, sender: messageSender });
        
        // Only process messages from others, our own messages are handled locally
        if (messageSender === userId) {
          console.log('Ignoring echo of own message');
          return;
        }
        
        // Skip empty messages or already processed messages
        if (!messageText || messageIdsRef.current.has(messageId)) {
          console.log('Skipping message: empty or duplicate', messageId);
          return;
        }
        
        // Additional check for duplicate content in the last few seconds
        const now = Date.now();
        const recentContentDuplicate = messagesRef.current.some(msg => 
          msg.senderId === messageSender && 
          msg.text === messageText && 
          now - msg.timestamp < 3000
        );
        
        if (recentContentDuplicate) {
          console.log('Skipping recent duplicate content from same sender');
          return;
        }
        
        // Remember this message ID to prevent duplicates
        messageIdsRef.current.add(messageId);
        
        // Add message to the UI
        setMessages(prev => [...prev, {
          id: messageId,
          text: messageText,
          senderId: messageSender,
          timestamp: now
        }]);
      });
      
      // Add to cleanup
      unsubscribersRef.current.push(messageUnsubscribe);
      
      // Update UI with partner info
      setMessages([{
        id: uuidv4(),
        text: `You are now chatting with ${(partnerData as { nickname?: string })?.nickname || 'Anonymous'}`,
        senderId: 'system',
        timestamp: Date.now(),
        isSystem: true
      }]);
      
      console.log('Chat established with', partnerData);
    } catch (err) {
      console.error('Error creating/joining chat:', err);
      setError('Failed to establish chat connection: ' + (err instanceof Error ? err.message : 'Unknown error'));
    }
  }, [chatClient, ablyClient, userId]);
  
  // Check if there are other users in the waiting room
  const checkWaitingRoom = useCallback(async (userMetadata: AblyUserMetadata) => {
    try {
      if (!chatClient) {
        console.error('Chat client not initialized');
        return null;
      }
      
      console.log('Checking waiting room...');
      
      // Get the waiting room with all features enabled
      const waitingRoom = await chatClient.rooms.get('waiting:room', AllFeaturesEnabled);
      
      // Monitor waiting room status
      const { off: waitingRoomStatusOff } = waitingRoom.onStatusChange((change: RoomStatusChange) => {
        console.log('Waiting room state changed to:', change.current);
      });
      unsubscribersRef.current.push(waitingRoomStatusOff);
      
      // Attach to the channel to ensure we can use presence
      await waitingRoom.attach();
      
      // Longer delay to ensure channel is ready - critical for multi-device setups
      await new Promise(resolve => setTimeout(resolve, 2000));
      
      try {
        // Enter the waiting room with user metadata
        await waitingRoom.presence.enter(userMetadata);
        console.log('Entered waiting room presence');
        
        // Another delay to ensure other devices can see our presence
        await new Promise(resolve => setTimeout(resolve, 1000));
        
        try {
          // Get all members currently in the waiting room
          const members: PresenceMember[] = await waitingRoom.presence.get();
          console.log('Waiting room members:', members);
          
          // Filter out the current user
          const otherMembers = members.filter(
            member => member.clientId !== userId
          );
          
          console.log('Other members in waiting room:', otherMembers);
          
          if (otherMembers.length > 0) {
            // Find a compatible partner
            for (const partner of otherMembers) {
              const partnerData = partner.data || {};
              
              console.log('Checking compatibility with partner:', partner.clientId, partnerData);
              
              // Check for compatibility
              if (isCompatibleMatch(userMetadata, partnerData)) {
                console.log('Found compatible partner:', partner.clientId);
                
                // Create or join chat room with the partner
                await createOrJoinChat(
                  (partnerData as { userId?: string }).userId || partner.clientId,
                  partnerData,
                  userMetadata
                );
                
                // Leave waiting room since we found a match
                await waitingRoom.presence.leave();
                return true;
              }
            }
          }
          
          console.log('No compatible partners found in waiting room');
          
          // Set up presence handler for new people joining waiting room
          const { unsubscribe: presenceUnsubscribe } = waitingRoom.presence.subscribe((memberUpdate) => {
            if (memberUpdate.action === 'enter' && memberUpdate.clientId !== userId) {
              const newPartnerData = memberUpdate.data || {};
              console.log('New member in waiting room:', memberUpdate.clientId, newPartnerData);
              
              if (isCompatibleMatch(userMetadata, newPartnerData)) {
                console.log('Found compatible partner (via listener):', memberUpdate.clientId);
                
                // Create chat with new partner
                createOrJoinChat(
                  (newPartnerData as { userId?: string }).userId || memberUpdate.clientId,
                  newPartnerData,
                  userMetadata
                ).then(() => {
                  // Leave waiting room if match found
                  waitingRoom.presence.leave().catch(err => 
                    console.error('Error leaving waiting room:', err));
                });
              }
            }
          });
          
          // Register presence handler for cleanup
          unsubscribersRef.current.push(presenceUnsubscribe);
          
          return false;
        } catch (error) {
          console.error('Error checking waiting room members:', error);
          return false;
        }
      } catch (presenceError) {
        console.error('Error entering waiting room presence:', presenceError);
        setError('Failed to enter waiting room: ' + 
          (presenceError instanceof Error ? presenceError.message : 'Unknown error'));
        return null;
      }
    } catch (error) {
      console.error('Error checking waiting room:', error);
      setError(error instanceof Error ? error.message : 'Unknown error occurred');
      return false;
    }
  }, [chatClient, userId, createOrJoinChat, isCompatibleMatch]);
  
  // Start a chat
  const startChat = useCallback(async (metadata: Omit<AblyUserMetadata, 'userId'>) => {
    if (!chatClient || !ablyClient || connectionStatus !== 'connected') {
      setError('Chat client not connected. Please try again.');
      return;
    }
    
    try {
      // First, end any existing chat
      if (room) {
        await endChat();
      }
      
      // Reset state
      setIsSearching(true);
      setFoundPartner(false);
      messageIdsRef.current.clear();
      
      // Clear subscriptions
      cleanUpSubscriptions();
      
      // Complete user metadata
      const userMetadata = {
        userId,
        nickname: metadata.nickname,
        gender: metadata.gender,
        lookingFor: metadata.lookingFor
      };
      
      // Show searching message
      setMessages([{ 
        id: uuidv4(), 
        text: 'Looking for a chat partner...', 
        senderId: 'system', 
        timestamp: Date.now(),
        isSystem: true
      }]);
      
      console.log('Starting chat with profile:', userMetadata);
      
      // Check if there are other users in the waiting room
      const foundMatch = await checkWaitingRoom(userMetadata);
      
      if (!foundMatch) {
        console.log('No match found, entering waiting room');
      }
      
      return foundMatch;
    } catch (err) {
      console.error('Error starting chat:', err);
      setError('Failed to start chat: ' + (err instanceof Error ? err.message : 'Unknown error'));
      setIsSearching(false);
    }
  }, [chatClient, ablyClient, connectionStatus, userId, room, endChat, cleanUpSubscriptions, checkWaitingRoom]);
  
  // Send a message
  const sendMessage = useCallback(async (text: string) => {
    if (!room || !text.trim()) return;
    
    try {
      // Generate message ID to track duplicates
      const messageId = uuidv4();
      
      console.log('Preparing to send message:', text.trim());
      
      // Send to the room using Chat SDK first
      const response = await room.messages.send({
        text: text.trim()
      });
      
      console.log('Message send response:', response);
      
      // Now, check if we already have a message with the same text in the last 2 seconds (to handle potential echoes)
      const now = Date.now();
      const recentDuplicateExists = messagesRef.current.some(msg => 
        msg.senderId === userId && 
        msg.text === text.trim() && 
        now - msg.timestamp < 2000
      );
      
      // Only add to UI if not a duplicate
      if (!recentDuplicateExists) {
        // Add locally to UI for responsiveness
        setMessages(prev => [...prev, {
          id: messageId,
          text: text.trim(),
          senderId: userId,
          timestamp: now
        }]);
        
        // Track this message ID to prevent duplicates
        messageIdsRef.current.add(messageId);
      } else {
        console.log('Prevented duplicate local message:', text.trim());
      }
      
      // Stop typing indicator
      if (isTyping) {
        // Use the start/stop API from Ably docs
        try {
          await room.typing.stop();
          setIsTyping(false);
        } catch (e) {
          console.error('Error updating typing status:', e);
        }
      }
    } catch (error: unknown) {
      console.error('Error sending message:', error);
      setError('Failed to send message: ' + (error instanceof Error ? error.message : 'Unknown error'));
    }
  }, [room, isTyping, userId]);
  
  // Handle typing
  const handleTyping = useCallback((text: string) => {
    if (!room || !foundPartner) return;
    
    // Show typing indicator
    if (!isTyping && text.trim()) {
      // Use the start/stop API from Ably docs
      try {
        room.typing.start()
          .then(() => setIsTyping(true))
          .catch((error: unknown) => console.error('Error sending typing indicator:', error));
      } catch (e) {
        console.error('Error updating typing status:', e);
      }
    }
    
    // Clear previous timeout
    if (typingTimeoutRef.current) {
      clearTimeout(typingTimeoutRef.current);
    }
    
    // Set timeout to clear typing indicator after inactivity
    typingTimeoutRef.current = setTimeout(() => {
      if (isTyping && room) {
        // Use the start/stop API from Ably docs
        try {
          room.typing.stop()
            .then(() => setIsTyping(false))
            .catch((error: unknown) => console.error('Error clearing typing indicator:', error));
        } catch (e) {
          console.error('Error updating typing status:', e);
        }
      }
    }, 2000);
  }, [room, isTyping, foundPartner]);
  
  return {
    userId,
    messages,
    connectionStatus,
    room,
    isSearching,
    partnerIsTyping,
    error,
    startChat,
    sendMessage,
    endChat,
    handleTyping
  };
} 