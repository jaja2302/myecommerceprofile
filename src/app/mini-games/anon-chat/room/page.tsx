"use client";

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/context/AuthContext';
import { useChat } from '@/hooks/useChat';
import { createUserInDb, db, cleanupStaleUserStates } from '@/lib/firebase';
import { doc, updateDoc, getDoc } from 'firebase/firestore';
import ChatUI from '@/components/Anonchat/ChatUI';
import WaitingScreen from '@/components/Anonchat/WaitingScreen';
import ErrorMessage from '@/components/Anonchat/ErrorMessage';
import { Gender, PreferredGender } from '@/types';
import { getDatabase, ref, onValue } from "firebase/database";
import { collection, query, where, limit, getDocs } from 'firebase/firestore';

// Random username generator
const generateRandomUsername = (): string => {
  const adjectives = ['Happy', 'Funny', 'Clever', 'Brave', 'Gentle', 'Calm', 'Eager', 'Kind', 'Smart', 'Witty'];
  const nouns = ['Panda', 'Tiger', 'Dolphin', 'Eagle', 'Fox', 'Wolf', 'Rabbit', 'Koala', 'Parrot', 'Turtle'];
  
  const randomAdjective = adjectives[Math.floor(Math.random() * adjectives.length)];
  const randomNoun = nouns[Math.floor(Math.random() * nouns.length)];
  const randomNumber = Math.floor(Math.random() * 1000);
  
  return `${randomAdjective}${randomNoun}${randomNumber}`;
};

export default function ChatPage() {
  const router = useRouter();
  const { user, loading: authLoading } = useAuth();
  const [username, setUsername] = useState<string>('');
  const [searching, setSearching] = useState<boolean>(false);
  const [initialized, setInitialized] = useState<boolean>(false);
  const [isInitializing, setIsInitializing] = useState<boolean>(false);
  const [userGender, setUserGender] = useState<Gender | ''>('');
  const [preferredGender, setPreferredGender] = useState<PreferredGender>('any');
  const [localError, setLocalError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<string>('checking');
  const [shouldUseChat, setShouldUseChat] = useState<boolean>(false);
  const [retryCount, setRetryCount] = useState<number>(0);
  const [matchStatus, setMatchStatus] = useState<string>('idle'); // idle, requesting, matching, matched, failed
  
  // Penting: hooks harus dipanggil secara unconditional (tidak dalam if statement)
  // Gunakan variable state untuk menentukan apakah hook harus aktif
  const {
    chatId,
    messages,
    partnerGender,
    loading: chatLoading,
    error: chatError,
    startChat,
    sendChatMessage,
    endChat,
  } = useChat(shouldUseChat ? user?.uid : undefined);
  
  // Start by getting gender preferences from sessionStorage
  useEffect(() => {
    if (typeof window !== 'undefined' && !userGender) {
      try {
        const storedUserGender = sessionStorage.getItem('userGender') as Gender | null;
        const storedPreferredGender = sessionStorage.getItem('preferredGender') as PreferredGender | null;
        
        console.log("Retrieved from session storage:", { storedUserGender, storedPreferredGender });
        
        if (storedUserGender) {
          setUserGender(storedUserGender);
        }
        
        if (storedPreferredGender) {
          setPreferredGender(storedPreferredGender);
        }
      } catch (e) {
        console.error("Error accessing sessionStorage:", e);
      }
    }
  }, [userGender]);
  
  // Check connection status - ALWAYS include this effect, don't make it conditional
  useEffect(() => {
    const checkOnlineStatus = () => {
      setConnectionStatus(navigator.onLine ? 'online' : 'offline');
    };
    
    window.addEventListener('online', checkOnlineStatus);
    window.addEventListener('offline', checkOnlineStatus);
    checkOnlineStatus();
    
    return () => {
      window.removeEventListener('online', checkOnlineStatus);
      window.removeEventListener('offline', checkOnlineStatus);
    };
  }, []);
  
  // Redirect to login if not authenticated
  useEffect(() => {
    let redirectTimer: NodeJS.Timeout | null = null;
    
    if (!authLoading && !user) {
      console.log("User not authenticated, redirecting to login page");
      setLocalError("You need to be logged in. Redirecting to login page...");
      
      redirectTimer = setTimeout(() => {
        router.push('/mini-games/anon-chat');
      }, 2000);
    }
    
    return () => {
      if (redirectTimer) clearTimeout(redirectTimer);
    };
  }, [user, authLoading, router]);
  
  // Initialize user profile after authentication is complete
  useEffect(() => {
    const initializeUserProfile = async () => {
      if (user && !initialized && !isInitializing && userGender) {
        setIsInitializing(true);
        try {
          console.log("Initializing user with gender:", userGender);
        const generatedUsername = generateRandomUsername();
        setUsername(generatedUsername);
          
          // Check if user already exists
          const userRef = doc(db, "users", user.uid);
          const userDoc = await getDoc(userRef);
          
          if (userDoc.exists()) {
            console.log("User already exists, updating preferences");
            await updateDoc(userRef, {
              preferredGender: preferredGender
            });
            setUsername(userDoc.data().username || generatedUsername);
          } else {
            console.log("Creating new user");
            await createUserInDb(user.uid, generatedUsername, userGender as Gender);
        
        // Update user preferences in database
        await updateDoc(userRef, {
              preferredGender: preferredGender
        });
            console.log("User preferences updated");
          }
        
        setInitialized(true);
          // Only now enable the chat hook
          setShouldUseChat(true);
      } catch (err) {
        console.error("Failed to initialize user:", err);
          setLocalError("Failed to initialize user. Please try again.");
        } finally {
          setIsInitializing(false);
        }
      }
    };
    
    initializeUserProfile();
  }, [user, initialized, isInitializing, userGender, preferredGender]);
  
  // For multi-device testing with same account
  useEffect(() => {
    // Check if we're in a multi-device test scenario
    const checkMultiDeviceTest = async () => {
      if (user && initialized) {
        try {
          // Query for other sessions with the same userId
          const userSessionsQuery = query(
            collection(db, "users"),
            where("userId", "==", user.uid),
            limit(5)
          );
          
          const sessionsSnapshot = await getDocs(userSessionsQuery);
          
          if (sessionsSnapshot.size > 1) {
            console.log(`[MULTI-DEVICE] Detected ${sessionsSnapshot.size} sessions with same userId`);
            
            // Get the sessions that aren't this one
            const otherSessions = sessionsSnapshot.docs
              .map(doc => doc.data())
              .filter(session => {
                // Filter based on a unique browser fingerprint or timestamp
                // This is a simplified example
                if (typeof window !== 'undefined') {
                  const deviceId = localStorage.getItem(`anonchat_device_${user.uid}`);
                  return session.deviceId && session.deviceId !== deviceId;
                }
                return true;
              });
            
            if (otherSessions.length > 0) {
              console.log(`[MULTI-DEVICE] Found ${otherSessions.length} other sessions`);
              
              // Display a warning
              setLocalError("Warning: Multiple sessions detected with the same account. This may cause unexpected behavior.");
            }
          }
        } catch (error) {
          console.error("[MULTI-DEVICE] Error checking for multiple sessions:", error);
        }
      }
    };
    
    checkMultiDeviceTest();
  }, [user, initialized]);
  
  const handleStartChat = useCallback(async (): Promise<void> => {
    setSearching(true);
    setLocalError(null); // Clear any previous local errors
    setMatchStatus('requesting');
    
    // Reset retry counter if this is a new chat attempt (not a retry)
    if (retryCount === 0) {
      console.log("[CHAT] Starting new chat search with preferred gender:", preferredGender);
    } else {
      console.log(`[CHAT] Retry attempt ${retryCount} with preferred gender:`, preferredGender);
    }
    
    try {
      // Start matching process
      setMatchStatus('matching');
      const success = await startChat(preferredGender);
      
      if (!success) {
        console.log("[CHAT] Failed to find chat partner");
        setMatchStatus('failed');
        
        // Implement escalating retry wait times
        const maxRetries = 3;
        if (retryCount < maxRetries) {
          const nextRetry = retryCount + 1;
          const waitTime = Math.min(2000 * nextRetry, 6000); // Escalating delay: 2s, 4s, 6s
          
          setLocalError(`No users available right now. Retrying in ${waitTime/1000} seconds... (${nextRetry}/${maxRetries})`);
          setRetryCount(nextRetry);
          
          // Schedule retry
          setTimeout(() => {
            if (document.visibilityState === 'visible') {
              handleStartChat();
            } else {
              setLocalError("Paused retrying because tab is in background. Click 'Start Chat' to try again.");
              setSearching(false);
              setRetryCount(0);
            }
          }, waitTime);
        } else {
          setLocalError("No users available right now. Try again later.");
          setSearching(false);
          setRetryCount(0);
        }
      } else {
        // Match successful
        setMatchStatus('matched');
        setRetryCount(0);
        setSearching(false);
      }
    } catch (error) {
      console.error("[CHAT] Error starting chat:", error);
      setMatchStatus('failed');
      
      // Show more specific error message based on error
      const errorMessage = error instanceof Error ? error.message : "Unknown error";
      if (errorMessage.includes("not available")) {
        setLocalError("User is no longer available. Please try again.");
      } else if (errorMessage.includes("timeout") || errorMessage.includes("deadline-exceeded")) {
        setLocalError("Connection timeout. Please check your internet and try again.");
      } else {
        setLocalError(`Error starting chat: ${errorMessage}. Please try again.`);
      }
      
      setSearching(false);
      setRetryCount(0);
    }
  }, [preferredGender, startChat, retryCount]);
  
  const handleSendMessage = useCallback(async (message: string): Promise<void> => {
    if (!sendChatMessage) return; // Guard clause
    
    try {
    await sendChatMessage(message);
    } catch (error) {
      console.error("Error sending message:", error);
      setLocalError("Failed to send message. Please try again.");
    }
  }, [sendChatMessage]);
  
  const handleEndChat = useCallback(async (): Promise<void> => {
    if (!endChat) return; // Guard clause
    
    try {
    await endChat();
    } catch (error) {
      console.error("Error ending chat:", error);
      setLocalError("Failed to end chat. Please try again.");
    }
  }, [endChat]);

  const handleBackToHome = useCallback(() => {
    // Clear session storage
    if (typeof window !== 'undefined') {
      try {
        sessionStorage.removeItem('userGender');
        sessionStorage.removeItem('preferredGender');
      } catch (e) {
        console.error("Error accessing sessionStorage:", e);
      }
    }
    router.push('/mini-games/anon-chat');
  }, [router]);
  
  // Tambahkan efek untuk membersihkan stale users saat komponen dimount
  useEffect(() => {
    // Run cleanup when component mounts
    const runCleanup = async () => {
      try {
        console.log("[PAGE] Running stale user cleanup");
        await cleanupStaleUserStates();
      } catch (error) {
        console.error("[PAGE] Error during cleanup:", error);
      }
    };
    
    runCleanup();
  }, []);
  
  // Display loading state
  if (authLoading || isInitializing) {
    return (
      <div className="flex flex-col min-h-screen bg-gray-100">
        <div className="flex items-center justify-center flex-grow">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-gray-900 mx-auto"></div>
            <p className="mt-4 text-gray-700">
              {authLoading ? 'Authenticating...' : 'Setting up your chat profile...'}
            </p>
            <p className="mt-2 text-sm text-gray-500">
              {user ? `User ID: ${user.uid.slice(0, 8)}...` : 'Waiting for authentication...'}
            </p>
          </div>
        </div>
      </div>
    );
  }
  
  // If user is logged in but no gender is selected, redirect back
  if (!authLoading && user && !userGender) {
  return (
      <div className="flex flex-col min-h-screen bg-gray-100">
          <div className="flex items-center justify-center flex-grow">
          <div className="text-center max-w-md p-6 bg-white rounded-lg shadow-md">
            <div className="text-red-600 text-xl mb-4">Missing Gender Selection</div>
            <p className="mb-6">You need to select your gender before starting a chat.</p>
            <button
              onClick={handleBackToHome}
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-md"
            >
              Go Back to Setup
            </button>
          </div>
        </div>
      </div>
    );
  }
  
  // Connection warning if offline
  const connectionWarning = connectionStatus === 'offline' && (
    <div className="bg-yellow-100 border-l-4 border-yellow-500 text-yellow-700 p-4 mb-4">
      <p className="font-bold">You are offline</p>
      <p>Messages will be sent when your connection is restored.</p>
    </div>
  );
  
  // Main UI - after initialization is complete
  return (
    <div className="flex flex-col min-h-screen bg-gray-100">
      <div className="p-4 bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto flex justify-between items-center">
          <div className="font-bold text-xl">Anonymous Chat</div>
          <button
            onClick={handleBackToHome}
            className="bg-gray-200 hover:bg-gray-300 text-gray-800 px-3 py-1 rounded-md text-sm"
          >
            New Chat
          </button>
        </div>
          </div>
    
      <div className="flex-grow p-4">
        <div className="max-w-4xl mx-auto h-full flex flex-col">
          {connectionWarning}
          {localError && <ErrorMessage message={localError} />}
          {chatError && <ErrorMessage message={chatError} />}
          
          <div className="bg-white rounded-lg shadow-md overflow-hidden flex-grow flex flex-col">
            {chatId ? (
              <ChatUI
                messages={messages}
                userId={user?.uid || ''}
                partnerGender={partnerGender}
                onSendMessage={handleSendMessage}
                onEndChat={handleEndChat}
              />
            ) : (
              <WaitingScreen
                username={username}
                userGender={userGender as Gender}
                preferredGender={preferredGender}
                setPreferredGender={setPreferredGender}
                onStartChat={handleStartChat}
                searching={searching}
                matchStatus={matchStatus}
                retryCount={retryCount}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}