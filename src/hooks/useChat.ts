// hooks/useChat.ts
import { useState, useEffect, useCallback } from 'react';
import {
  findRandomUser,
  createChatSession,
  sendMessage as sendMessageToFirebase,
  listenToMessages,
  endChatSession,
  updateUserHeartbeat
} from '@/lib/firebase';
import { Gender, PreferredGender, Message, ChatHookReturn } from '@/types';
import { setupTypingIndicator } from '@/utils/typingIndicator';
import { doc, updateDoc, getDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '@/lib/firebase';

export const useChat = (userId?: string): ChatHookReturn => {
  console.log("useChat hook initialized with userId:", userId);
  
  const [chatId, setChatId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerGender, setPartnerGender] = useState<Gender | null>(null);
  const [messages, setMessages] = useState<Message[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  // Heartbeat effect to mark user as online
  useEffect(() => {
    if (!userId) return;
    
    console.log(`[HEARTBEAT] Setting up heartbeat for user ${userId}`);
    // Update user heartbeat immediately
    updateUserHeartbeat(userId);
    
    // Set up interval to update heartbeat every 30 seconds
    const heartbeatInterval = setInterval(() => {
      updateUserHeartbeat(userId);
    }, 30000);
    
    return () => {
      console.log(`[HEARTBEAT] Cleaning up heartbeat interval for user ${userId}`);
      clearInterval(heartbeatInterval);
    };
  }, [userId]);

  // Message listener effect
  useEffect(() => {
    let unsubscribe: (() => void) | null = null;
    
    if (chatId && userId) {
      console.log(`[LISTENER] Setting up message listener for chatId: ${chatId}, userId: ${userId}`);
      
      try {
        unsubscribe = listenToMessages(chatId, (newMessages) => {
          console.log(`[LISTENER] Received ${newMessages.length} messages from listener`);
          
          // Check if the chat has been ended remotely
          const systemMessages = newMessages.filter(m => m.senderId === 'system' && m.text.includes('Chat ended'));
          
          if (systemMessages.length > 0 && systemMessages.some(m => m.text.includes('partner disconnected'))) {
            console.log(`[LISTENER] Detected chat ended by partner disconnecting`);
            // Reset chat state since partner disconnected
            setChatId(null);
            setPartnerId(null);
            setPartnerGender(null);
            setMessages([]);
            setError("Your chat partner disconnected.");
            return;
          }
          
          // Sort messages by timestamp
          const sortedMessages = [...newMessages].sort((a, b) => {
            if (!a.timestamp || !b.timestamp) return 0;
            return a.timestamp.toMillis() - b.timestamp.toMillis();
          });
          
          setMessages(sortedMessages);
        });
      } catch (error) {
        console.error("[LISTENER] Error setting up message listener:", error);
        setError("Failed to connect to chat. Please try again.");
      }
    }
    
    return () => {
      if (unsubscribe) {
        console.log("[LISTENER] Cleaning up message listener");
        unsubscribe();
      }
    };
  }, [chatId, userId]);

  // Start a new chat with retry mechanism
  const startChat = useCallback(async (preferredGender: PreferredGender = 'any'): Promise<boolean> => {
    if (!userId) {
      console.error("[START] Cannot start chat without userId");
      setError("You must be logged in and have a profile to start a chat");
      return false;
    }
    
    // Reset previous chat state if any
    if (chatId) {
      console.log(`[START] Ending previous chat ${chatId} before starting new one`);
      try {
        await endChatSession(chatId, userId);
      } catch (err) {
        console.warn("[START] Error ending previous chat, continuing anyway:", err);
      }
      
      // Clear previous chat data
      setChatId(null);
      setPartnerId(null);
      setPartnerGender(null);
      setMessages([]);
    }
    
    // Implement retry logic
    let attempts = 0;
    const maxAttempts = 3;
    
    while (attempts < maxAttempts) {
      attempts++;
      console.log(`[START] Attempt ${attempts} of ${maxAttempts} to start chat`);
      
      try {
        setLoading(true);
        setError(null);
        
        // Add a delay between retries
        if (attempts > 1) {
          console.log(`[START] Waiting before retry...`);
          await new Promise(resolve => setTimeout(resolve, 1000 * attempts));
        }
        
        console.log("[START] Finding random user with preference:", preferredGender);
        
        // Force update user status before finding a partner
        try {
          // Get device ID for better tracking
          let deviceId = "unknown";
          if (typeof window !== 'undefined') {
            deviceId = localStorage.getItem(`anonchat_device_${userId}`) || 
              `device_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
            
            // Store it if it was just generated
            if (!localStorage.getItem(`anonchat_device_${userId}`)) {
              localStorage.setItem(`anonchat_device_${userId}`, deviceId);
            }
          }
          
          const userRef = doc(db, "users", userId);
          await updateDoc(userRef, {
            isAvailable: true,
            currentChatId: null,
            lastStatusUpdate: serverTimestamp(),
            deviceId
          });
          console.log(`[START] Reset user availability status with deviceId: ${deviceId}`);
        } catch (err) {
          console.error("[START] Error resetting user status:", err);
        }
        
        // Find a random user
        const partner = await findRandomUser(userId, preferredGender);
        
        if (!partner) {
          console.log("[START] No available users found");
          setError("No users available right now. Try again later.");
          setLoading(false);
          return false;
        }
        
        console.log(`[START] Found partner: ${partner.userId}, with gender: ${partner.gender}`);
        
        // Create a chat session
        const newChatId = await createChatSession(userId, partner.userId);
        console.log(`[START] Created chat session: ${newChatId}`);
        
        // Verify that the chat was actually created
        try {
          const chatRef = doc(db, "chats", newChatId);
          const chatDoc = await getDoc(chatRef);
          
          if (!chatDoc.exists()) {
            throw new Error("Chat was not created successfully");
          }
          
          // Also verify that both users are marked as unavailable and have this chat ID
          const userDoc = await getDoc(doc(db, "users", userId));
          const partnerDoc = await getDoc(doc(db, "users", partner.userId));
          
          if (!userDoc.exists() || !partnerDoc.exists()) {
            throw new Error("User or partner document not found after chat creation");
          }
          
          const userData = userDoc.data();
          const partnerData = partnerDoc.data();
          
          // Log detailed status for debugging
          console.log(`[START] After chat creation:
             User (${userId}): isAvailable=${userData.isAvailable}, currentChatId=${userData.currentChatId || 'null'}
             Partner (${partner.userId}): isAvailable=${partnerData.isAvailable}, currentChatId=${partnerData.currentChatId || 'null'}`);
           
          // Verify chat is properly assigned
          if (userData.currentChatId !== newChatId || partnerData.currentChatId !== newChatId) {
            console.warn("[START] Chat assignment mismatch, but proceeding anyway");
          }
        } catch (verifyErr) {
          console.error("[START] Error verifying chat creation:", verifyErr);
          // Continue anyway as chat might still work
        }
        
        // Set the chat data
        setChatId(newChatId);
        setPartnerId(partner.userId);
        setPartnerGender(partner.gender);
        setLoading(false);
        
        return true;
      } catch (err) {
        console.error(`[START] Error starting chat (attempt ${attempts}):`, err);
        
        // If we're on the last attempt, show an error
        if (attempts >= maxAttempts) {
          const errorMessage = err instanceof Error ? err.message : "Unknown error";
          setError(`Failed to start chat: ${errorMessage}`);
          setLoading(false);
          return false;
        }
        
        // Otherwise, continue to the next attempt
        console.log(`[START] Will retry (${maxAttempts - attempts} attempts remaining)`);
      }
    }
    
    // If we get here, all attempts failed
    setLoading(false);
    return false;
  }, [userId, chatId, endChatSession]);

  // Send a message
  const sendChatMessage = useCallback(async (text: string): Promise<boolean> => {
    if (!userId || !chatId) {
      setError("Cannot send message: No active chat");
      return false;
    }
    
    try {
      console.log(`[SEND] Sending message in chat ${chatId}: ${text}`);
      await sendMessageToFirebase(chatId, userId, text);
      return true;
    } catch (err) {
      console.error("[SEND] Error sending message:", err);
      setError("Failed to send message. Please try again.");
      return false;
    }
  }, [userId, chatId]);

  // End the current chat
  const endChat = useCallback(async (): Promise<boolean> => {
    if (!userId || !chatId) {
      setError("No active chat to end");
      return false;
    }
    
    try {
      console.log(`[END] Ending chat ${chatId}`);
      await endChatSession(chatId, userId);
      
      // Add a system message that the chat was ended
      await sendMessageToFirebase(chatId, "system", "Chat ended by user.");
      
      // Reset states
      setChatId(null);
      setPartnerId(null);
      setPartnerGender(null);
      setMessages([]);
      
      return true;
    } catch (err) {
      console.error("[END] Error ending chat:", err);
      setError("Failed to end chat. Please try again.");
      return false;
    }
  }, [userId, chatId]);

  // Typing indicator setup
  useEffect(() => {
    const typingIndicator = setupTypingIndicator(chatId, userId);
    
    return () => {
      typingIndicator.cleanup();
    };
  }, [chatId, userId]);

  return {
    chatId,
    partnerId,
    partnerGender,
    messages,
    loading,
    error,
    startChat,
    sendChatMessage,
    endChat,
  };
};