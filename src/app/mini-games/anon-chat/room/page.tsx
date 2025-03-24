"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { motion } from "framer-motion";
import userIdentifier from "@/lib/userIdentifier";
import anonChat, { ChatMessage } from "@/lib/anonChat";
import { Timestamp } from "firebase/firestore";

// Loading component for Suspense fallback
function ChatRoomLoading() {
  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      
      <div className="flex-grow max-w-4xl w-full mx-auto px-4 pt-24 pb-16 flex items-center justify-center">
        <div className="text-center">
          <div className="inline-block animate-spin mb-4">
            <svg className="h-12 w-12 text-green-500" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          </div>
          <p className="text-white text-lg">Loading Chat Room...</p>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

// Chat room content component
function ChatRoomContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const gender = searchParams.get('gender') || '';
  const lookingFor = searchParams.get('lookingFor') || '';
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [status, setStatus] = useState<'connecting' | 'waiting' | 'chatting' | 'disconnected'>('connecting');
  const [partnerStatus, setPartnerStatus] = useState<'typing' | 'online' | 'offline'>('online');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messagesListenerRef = useRef<(() => void) | null>(null);
  const sessionListenerRef = useRef<(() => void) | null>(null);
  const userId = userIdentifier.getPermanentUserId();

  // Format timestamp for display
  const formatTime = (timestamp: Timestamp | Date | unknown): string => {
    if (!timestamp) return '';
    
    try {
      const date = timestamp instanceof Date 
        ? timestamp 
        : (timestamp as { toDate?: () => Date }).toDate 
          ? (timestamp as { toDate: () => Date }).toDate() 
          : new Date();
      
      return date.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    } catch (error: unknown) {
      console.error('Error formatting timestamp:', error);
      return new Date().toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'});
    }
  };

  // Scroll to bottom utility
  const scrollToBottom = useCallback(() => {
    // Add a check to make sure the ref exists
    if (messagesEndRef.current) {
      // Use scrollIntoView with a small timeout to avoid continuous scrolling
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    // Only scroll if there are messages and the component is mounted
    if (messages.length > 0 && messagesEndRef.current) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Add a system message
  const addSystemMessage = useCallback((text: string) => {
    // Generate a truly unique ID with a timestamp plus random string
    const uniqueId = `system-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    const systemMessage: ChatMessage = {
      id: uniqueId,
      text,
      senderId: 'system',
      timestamp: new Date(),
      isSystemMessage: true
    };
    
    setMessages(prevMessages => [...prevMessages, systemMessage]);
    
    // Save to DB if we have a session ID
    if (sessionId) {
      anonChat.sendMessage(sessionId, text, true).catch(error => {
        console.error("Error adding system message:", error);
      });
    }
  }, [sessionId]);

  // Set up listener for messages
  const setupMessagesListener = useCallback((sessionId: string) => {
    // Clean up any existing listener
    if (messagesListenerRef.current) {
      messagesListenerRef.current();
      messagesListenerRef.current = null;
    }
    
    // Set up new listener
    const unsubscribe = anonChat.setupMessagesListener(sessionId, (newMessages) => {
      setMessages(newMessages);
    });
    
    messagesListenerRef.current = unsubscribe;
  }, []);

  // Set up listener for session changes
  const setupSessionListener = useCallback((sessionId: string) => {
    const unsubscribe = anonChat.setupSessionListener(sessionId, (session) => {
      // Update our state based on session changes
      setStatus(session.status as 'connecting' | 'waiting' | 'chatting' | 'disconnected');
      
      if (session.partner_id !== partnerId) {
        setPartnerId(session.partner_id);
        
        // If we got a new partner, set up messages listener
        if (session.partner_id && session.status === 'chatting') {
          setupMessagesListener(sessionId);
          setPartnerStatus('online');
          
          // Add connection message if we're transitioning from waiting to chatting
          if (status === 'waiting') {
            addSystemMessage("Terhubung! Silakan mulai chat.");
          }
        }
      }
      
      // Handle status changes
      if (session.status !== status) {
        // If session changed to chatting
        if (session.status === 'chatting' && status !== 'chatting') {
          setPartnerStatus('online');
        }
        
        // If session changed to disconnected
        if (session.status === 'disconnected' && status !== 'disconnected') {
          setPartnerStatus('offline');
          addSystemMessage("Chat telah berakhir.");
        }
      }
    });
    
    sessionListenerRef.current = unsubscribe;
  }, [partnerId, status, addSystemMessage, setupMessagesListener]);

  // Start heartbeat interval to keep session active
  const startHeartbeat = useCallback((sessionId: string) => {
    // Clear any existing interval
    if (heartbeatIntervalRef.current) {
      clearInterval(heartbeatIntervalRef.current);
    }
    
    // Set up heartbeat interval
    heartbeatIntervalRef.current = setInterval(async () => {
      try {
        // Update our heartbeat
        await anonChat.updateSessionHeartbeat(sessionId);
        
        // Check if partner is still active
        if (partnerId) {
          const partnerActivity = await anonChat.checkPartnerActivity(partnerId, userId);
          
          if (!partnerActivity.isActive) {
            setPartnerStatus('offline');
            
            if (status !== 'disconnected') {
              setStatus('disconnected');
              addSystemMessage("Lawan bicara telah terputus.");
            }
          }
        }
      } catch (error) {
        console.error("Error in heartbeat:", error);
      }
    }, 10000); // every 10 seconds
    
    // Also update immediately
    anonChat.updateSessionHeartbeat(sessionId).catch(error => {
      console.error("Error updating initial heartbeat:", error);
    });
  }, [partnerId, status, userId, addSystemMessage]);

  // Find a partner for chat
  const findPartner = useCallback(async (currentSessionId: string) => {
    try {
      // Find a partner using our helper
      const result = await anonChat.findChatPartner(currentSessionId, gender, lookingFor);
      
      if (result.partnerId && result.partnerSessionId) {
        // Connect with the partner
        const success = await anonChat.connectChatPartners(
          currentSessionId,
          result.partnerId,
          result.partnerSessionId
        );
        
        if (success) {
          // Set up chat state
          setPartnerId(result.partnerId);
          setStatus('chatting');
          
          // Add system message
          addSystemMessage("Terhubung! Silakan mulai chat.");
          
          // Set up messages listener if not already set
          setupMessagesListener(currentSessionId);
        }
      } else {
        // No partner found, check again in a few seconds
        setTimeout(() => {
          if (status === 'waiting' && sessionId === currentSessionId) {
            findPartner(currentSessionId);
          }
        }, 3000);
      }
    } catch (error) {
      console.error("Error finding partner:", error);
      addSystemMessage("Terjadi kesalahan saat mencari lawan bicara. Silakan coba lagi.");
    }
  }, [gender, lookingFor, sessionId, status, addSystemMessage, setupMessagesListener]);

  // Create a new chat session
  const createNewSession = useCallback(async () => {
    try {
      // Create new session in Firestore
      const newSessionId = await anonChat.createChatSession(gender, lookingFor);
      
      if (!newSessionId) {
        throw new Error("Failed to create session");
      }
      
      setSessionId(newSessionId);
      setStatus('waiting');
      
      // Add system message
      addSystemMessage("Mencari lawan bicara untukmu...");
      
      // Start heartbeat
      startHeartbeat(newSessionId);
      
      // Set up session listener
      setupSessionListener(newSessionId);
      
      // Start matching process
      findPartner(newSessionId);
    } catch (error) {
      console.error("Error creating session:", error);
      setErrorMessage("Could not create chat session. Please try again later.");
      setStatus('disconnected');
    }
  }, [gender, lookingFor, addSystemMessage, startHeartbeat, setupSessionListener, findPartner]);

  // Resume an existing session
  const resumeExistingSession = useCallback(async (sessionId: string) => {
    try {
      setSessionId(sessionId);
      
      // Add system message
      addSystemMessage("Menghubungkan kembali ke chat...");
      
      // Set up session listener
      setupSessionListener(sessionId);
      
      // Set up messages listener
      setupMessagesListener(sessionId);
      
      // Start heartbeat
      startHeartbeat(sessionId);
    } catch (error) {
      console.error("Error resuming session:", error);
      setErrorMessage("Could not resume chat session. Starting a new one...");
      createNewSession();
    }
  }, [addSystemMessage, setupSessionListener, setupMessagesListener, startHeartbeat, createNewSession]);

  // Initialize session - either create a new one or join existing
  const initializeSession = useCallback(async () => {
    try {
      // Store user identifiers
      const userData = userIdentifier.storeUserIdentifiers();
      if (!userData) {
        setErrorMessage("Could not initialize user data. Please try again.");
        return;
      }
      
      // Check if this is a duplicate connection
      const sessionParam = searchParams.get('session');
      if (sessionParam && userIdentifier.isConnectionActive(sessionParam)) {
        setErrorMessage("Chat already open in another tab. Please use that instance.");
        setStatus('disconnected');
        return;
      }
      
      // Check if session ID is provided in URL
      if (sessionParam) {
        // Try to resume existing session
        await resumeExistingSession(sessionParam);
        return;
      }
      
      // Check if we have an active session
      const activeSession = await anonChat.findActiveSession(userId);
      
      if (activeSession && activeSession.session_id) {
        // Resume existing session
        await resumeExistingSession(activeSession.session_id);
      } else {
        // Create a new session
        await createNewSession();
      }
    } catch (error) {
      console.error("Error initializing session:", error);
      setErrorMessage("Could not connect to chat. Please try again later.");
      setStatus('disconnected');
    }
  }, [searchParams, userId, resumeExistingSession, createNewSession]);

  // Setup chat session and listeners on component mount
  useEffect(() => {
    initializeSession();

    return () => {
      // Clean up listeners and intervals on unmount
      if (messagesListenerRef.current) messagesListenerRef.current();
      if (sessionListenerRef.current) sessionListenerRef.current();
      if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
      
      // Update session status to disconnected when leaving
      if (sessionId) {
        anonChat.endChatSession(sessionId);
      }
    };
  }, [initializeSession, sessionId]);

  // Send a message
  const sendMessage = useCallback(async () => {
    if (!newMessage.trim() || !sessionId || status !== 'chatting') return;
    
    try {
      await anonChat.sendMessage(sessionId, newMessage.trim());
      setNewMessage('');
      
      // Focus back on input
      messageInputRef.current?.focus();
    } catch (error) {
      console.error("Error sending message:", error);
      setErrorMessage("Could not send message. Please try again.");
    }
  }, [newMessage, sessionId, status, setNewMessage, setErrorMessage]);

  // End chat session
  const endChat = async () => {
    if (!sessionId) return;
    
    try {
      // Update session status
      await anonChat.endChatSession(sessionId);
      
      // Add system message
      addSystemMessage("Chat telah berakhir.");
      
      // Update UI state
      setStatus('disconnected');
      
      // Redirect after 2 seconds
      setTimeout(() => {
        router.push('/mini-games/anon-chat');
      }, 2000);
    } catch (error) {
      console.error("Error ending chat:", error);
    }
  };

  // Start a new chat
  const startNewChat = () => {
    // Clean up current session
    if (sessionId) {
      anonChat.endChatSession(sessionId);
    }
    
    // Clean up listeners
    if (messagesListenerRef.current) messagesListenerRef.current();
    if (sessionListenerRef.current) sessionListenerRef.current();
    if (heartbeatIntervalRef.current) clearInterval(heartbeatIntervalRef.current);
    
    // Reset state
    setMessages([]);
    setSessionId(null);
    setPartnerId(null);
    setStatus('connecting');
    setPartnerStatus('online');
    
    // Initialize new session
    createNewSession();
  };

  // Handle message input key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  }, [sendMessage]);

  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      
      <div className="flex-grow max-w-4xl w-full mx-auto px-4 pt-24 pb-16">
        <div className="bg-gradient-to-br from-green-900/40 to-black border border-green-500/30 rounded-2xl h-full flex flex-col">
          {/* Chat header */}
          <div className="px-4 py-3 border-b border-green-500/30 flex justify-between items-center">
            <div className="flex items-center">
              <h2 className="text-xl font-semibold text-white">Anon Chat</h2>
              <div className="ml-4 flex items-center">
                {status === 'chatting' && (
                  <span className="flex items-center text-sm text-gray-300">
                    <span className={`w-2 h-2 rounded-full mr-2 ${
                      partnerStatus === 'online' ? 'bg-green-500' : 'bg-red-500'
                    }`}></span>
                    {partnerStatus === 'online' ? 'Online' : 'Offline'}
                  </span>
                )}
                {status === 'waiting' && (
                  <span className="flex items-center text-sm text-yellow-400">
                    <span className="w-2 h-2 rounded-full bg-yellow-400 mr-2 animate-pulse"></span>
                    Mencari...
                  </span>
                )}
                {status === 'disconnected' && (
                  <span className="flex items-center text-sm text-gray-400">
                    <span className="w-2 h-2 rounded-full bg-gray-400 mr-2"></span>
                    Terputus
                  </span>
                )}
                {status === 'connecting' && (
                  <span className="flex items-center text-sm text-blue-400">
                    <span className="w-2 h-2 rounded-full bg-blue-400 mr-2 animate-pulse"></span>
                    Menghubungkan...
                  </span>
                )}
              </div>
            </div>
            
            <div className="flex items-center space-x-2">
              {status === 'chatting' && (
                <button 
                  onClick={endChat}
                  className="text-red-400 hover:text-red-300 transition-colors text-sm flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Akhiri
                </button>
              )}
              {status === 'waiting' && (
                <button 
                  onClick={endChat}
                  className="text-yellow-400 hover:text-yellow-300 transition-colors text-sm flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Berhenti Mencari
                </button>
              )}
              {status === 'disconnected' && (
                <button 
                  onClick={startNewChat}
                  className="text-green-400 hover:text-green-300 transition-colors text-sm flex items-center"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                  </svg>
                  Chat Baru
                </button>
              )}
              <Link 
                href="/mini-games/anon-chat" 
                className="text-gray-400 hover:text-white transition-colors text-sm flex items-center"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
                </svg>
                Kembali
              </Link>
            </div>
          </div>
          
          {/* Messages area */}
          <div className="flex-grow overflow-y-auto p-4 space-y-3" style={{ overscrollBehavior: 'contain' }}>
            {messages.map((message) => (
              <div 
                key={message.id || `msg-${Date.now()}-${Math.random()}`}
                className={`max-w-[80%] ${
                  message.isSystemMessage 
                    ? 'mx-auto text-center' 
                    : message.senderId === userId 
                      ? 'ml-auto' 
                      : 'mr-auto'
                }`}
              >
                {message.isSystemMessage ? (
                  <div className="bg-gray-800/50 text-gray-300 text-sm py-1 px-3 rounded-md inline-block">
                    {message.text}
                  </div>
                ) : (
                  <div 
                    className={`py-2 px-3 rounded-lg ${
                      message.senderId === userId 
                        ? 'bg-green-600/40 text-white' 
                        : 'bg-zinc-800 text-gray-200'
                    }`}
                  >
                    {message.text}
                    <div 
                      className={`text-xs mt-1 ${
                        message.senderId === userId 
                          ? 'text-green-300/60' 
                          : 'text-gray-400'
                      }`}
                    >
                      {formatTime(message.timestamp)}
                    </div>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} className="h-1" />
          </div>
          
          {/* Message input */}
          <div className="p-3 border-t border-green-500/30">
            {errorMessage && (
              <div className="bg-red-900/60 border border-red-500/50 text-white text-sm py-2 px-3 rounded mb-3">
                {errorMessage}
              </div>
            )}
            
            {status === 'chatting' ? (
              <div className="flex">
                <textarea
                  ref={messageInputRef}
                  className="flex-grow bg-zinc-800 text-white border-none rounded-l-lg p-2 focus:outline-none focus:ring-1 focus:ring-green-500/50 resize-none"
                  placeholder="Ketik pesan..."
                  rows={1}
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={handleKeyPress}
                />
                <motion.button
                  onClick={sendMessage}
                  whileTap={{ scale: 0.95 }}
                  className="bg-green-600 hover:bg-green-500 text-white px-4 rounded-r-lg transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                  </svg>
                </motion.button>
              </div>
            ) : status === 'waiting' ? (
              <div className="bg-yellow-900/30 border border-yellow-500/30 text-yellow-300 py-2 px-3 rounded text-center">
                Sedang mencari lawan bicara untukmu... Mohon tunggu.
              </div>
            ) : status === 'disconnected' ? (
              <div className="bg-gray-800/50 text-gray-300 py-2 px-3 rounded text-center">
                Chat telah berakhir. 
                <button 
                  onClick={startNewChat}
                  className="text-green-400 hover:text-green-300 ml-2 transition-colors"
                >
                  Mulai chat baru
                </button>
              </div>
            ) : (
              <div className="bg-blue-900/30 border border-blue-500/30 text-blue-300 py-2 px-3 rounded text-center">
                Menghubungkan ke server...
              </div>
            )}
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

// The main component that wraps the ChatRoom with suspense
export default function AnonChatRoom() {
  return (
    <Suspense fallback={<ChatRoomLoading />}>
      <ChatRoomContent />
    </Suspense>
  );
}
