// utils/typingIndicator.ts
import { getFirestore, doc, updateDoc, onSnapshot, Unsubscribe } from "firebase/firestore";
import { TypingIndicator } from "../types";

// This utility helps track and display typing indicators

export const setupTypingIndicator = (chatId: string | null, userId: string | undefined): TypingIndicator => {
  if (!chatId || !userId) return { 
    startTyping: async () => {}, 
    stopTyping: async () => {}, 
    cleanup: () => {} 
  };
  
  const firestore = getFirestore();
  const chatRef = doc(firestore, "chats", chatId);
  
  let typingTimeout: NodeJS.Timeout | null = null;
  
  // Start typing indicator
  const startTyping = async (): Promise<void> => {
    try {
      // Clear any existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Update the typing status
      await updateDoc(chatRef, {
        [`typing.${userId}`]: true
      });
      
      // Set timeout to auto-clear typing indicator after 5 seconds
      typingTimeout = setTimeout(async () => {
        await stopTyping();
      }, 5000);
    } catch (error) {
      console.error("Error setting typing indicator:", error);
    }
  };
  
  // Stop typing indicator
  const stopTyping = async (): Promise<void> => {
    try {
      // Clear any existing timeout
      if (typingTimeout) {
        clearTimeout(typingTimeout);
      }
      
      // Update the typing status
      await updateDoc(chatRef, {
        [`typing.${userId}`]: false
      });
    } catch (error) {
      console.error("Error clearing typing indicator:", error);
    }
  };
  
  // Cleanup function
  const cleanup = (): void => {
    if (typingTimeout) {
      clearTimeout(typingTimeout);
    }
    stopTyping();
  };
  
  return {
    startTyping,
    stopTyping,
    cleanup
  };
};

// Listen for typing indicators
export const listenToTypingIndicator = (
  chatId: string | null, 
  userId: string | undefined, 
  callback: (isTyping: boolean) => void
): Unsubscribe | (() => void) => {
  if (!chatId || !userId) return () => {};
  
  const firestore = getFirestore();
  const chatRef = doc(firestore, "chats", chatId);
  
  // Subscribe to changes in the chat document
  const unsubscribe = onSnapshot(chatRef, (doc) => {
    if (doc.exists()) {
      const chatData = doc.data();
      
      // Check if typing object exists
      if (chatData.typing) {
        // Get all the user IDs who are typing except the current user
        const typingUsers = Object.keys(chatData.typing)
          .filter(id => id !== userId && chatData.typing[id] === true);
        
        // Call the callback with typing status
        callback(typingUsers.length > 0);
      } else {
        callback(false);
      }
    } else {
      callback(false);
    }
  });
  
  return unsubscribe;
};