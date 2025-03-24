"use client";

import { useState, useEffect, useRef, useCallback, Suspense } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { motion } from "framer-motion";
import userIdentifier from "@/lib/userIdentifier";
import enhancedAnonChat, { ChatMessage } from "@/lib/enhancedAnonChat";
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
  // If session ID is provided in URL, use it
  const initialSessionId = searchParams.get('session') || null;
  
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  const [status, setStatus] = useState<'connecting' | 'waiting' | 'chatting' | 'disconnected'>('connecting');
  const [partnerStatus, setPartnerStatus] = useState<'typing' | 'online' | 'offline'>('online');
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [sessionId, setSessionId] = useState<string | null>(initialSessionId);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [retryCount, setRetryCount] = useState(0);
  const [isReconnecting, setIsReconnecting] = useState(false);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLTextAreaElement>(null);
  const heartbeatIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const messageSearchIntervalRef = useRef<NodeJS.Timeout | null>(null);
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
    if (messagesEndRef.current) {
      setTimeout(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth', block: 'end' });
      }, 100);
    }
  }, []);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    if (messages.length > 0 && messagesEndRef.current) {
      scrollToBottom();
    }
  }, [messages, scrollToBottom]);

  // Add a system message
  const addSystemMessage = useCallback((text: string) => {
    // Generate a truly unique ID with a timestamp plus random string
    const uniqueId = `system-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
    
    // Create the system message
    const systemMessage: ChatMessage = {
      id: uniqueId,
      text,
      senderId: 'system',
      timestamp: new Date(),
      isSystemMessage: true,
      user_id: userId,
      sessionId: sessionId || undefined
    };
    
    // Add to UI immediately
    setMessages(prevMessages => [...prevMessages, systemMessage]);
    
    // Only attempt to save to DB if we have an active chat with a partner
    if (sessionId && status === 'chatting' && partnerId) {
      try {
        enhancedAnonChat.sendMessage(sessionId, text, true).catch(error => {
          console.error("Error adding system message to DB:", error);
        });
      } catch (error) {
        console.error("Error calling sendMessage:", error);
      }
    }
  }, [sessionId, userId, status, partnerId]);

  // Set up listener for messages
  const setupMessagesListener = useCallback((sessionId: string) => {
    // Clean up any existing listener
    if (messagesListenerRef.current) {
      messagesListenerRef.current();
      messagesListenerRef.current = null;
    }
    
    // Set up new listener
    const unsubscribe = enhancedAnonChat.setupMessagesListener(sessionId, (newMessages) => {
      setMessages(newMessages);
    });
    
    messagesListenerRef.current = unsubscribe;
  }, []);

  // Set up listener for session changes
  const setupSessionListener = useCallback((sessionId: string) => {
    // Clean up any existing listener
    if (sessionListenerRef.current) {
      sessionListenerRef.current();
      sessionListenerRef.current = null;
    }
    
    const unsubscribe = enhancedAnonChat.setupSessionListener(sessionId, (session) => {
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
          
          // Stop retrying
          setRetryCount(0);
          setIsReconnecting(false);
          
          // Clear intervals
          if (messageSearchIntervalRef.current) {
            clearInterval(messageSearchIntervalRef.current);
            messageSearchIntervalRef.current = null;
          }
        }
        
        // If session changed from chatting to waiting (reconnect scenario)
        if (session.status === 'waiting' && status === 'chatting') {
          setPartnerStatus('offline');
          addSystemMessage("Lawan bicara terputus. Mencari lawan bicara baru...");
          
          // Start searching for a new partner
          startPartnerSearch(sessionId);
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
    
    // Set up heartbeat interval (every 5 seconds)
    heartbeatIntervalRef.current = setInterval(async () => {
      try {
        // Update our heartbeat
        await enhancedAnonChat.updateSessionHeartbeat(sessionId);
        
        // Check if partner is still active
        if (partnerId && status === 'chatting') {
          const partnerActivity = await enhancedAnonChat.checkPartnerActivity(partnerId, userId);
          
          if (!partnerActivity.isActive && !isReconnecting) {
            setPartnerStatus('offline');
            
            if (status === 'chatting') {
              // If partner inactive, try to reconnect to a new partner
              addSystemMessage("Lawan bicara terputus. Mencari lawan bicara baru...");
              
              // Set reconnecting state
              setIsReconnecting(true);
              
              // Recover session and look for a new partner
              const recovered = await enhancedAnonChat.recoverSession(sessionId);
              if (recovered) {
                startPartnerSearch(sessionId);
              } else {
                setStatus('disconnected');
                addSystemMessage("Tidak dapat terhubung kembali. Silakan coba lagi nanti.");
              }
            }
          }
        }
      } catch (error) {
        console.error("Error in heartbeat:", error);
      }
    }, 5000);
    
    // Also update immediately
    enhancedAnonChat.updateSessionHeartbeat(sessionId).catch(error => {
      console.error("Error updating initial heartbeat:", error);
    });
  }, [partnerId, status, userId, addSystemMessage, isReconnecting]);

  // Start the partner search process
  const startPartnerSearch = useCallback((sessionId: string) => {
    // Clear any existing search interval
    if (messageSearchIntervalRef.current) {
      clearInterval(messageSearchIntervalRef.current);
    }
    
    // Set up search interval (every 3 seconds)
    messageSearchIntervalRef.current = setInterval(async () => {
      if (status !== 'waiting') {
        // If not waiting anymore, stop searching
        if (messageSearchIntervalRef.current) {
          clearInterval(messageSearchIntervalRef.current);
          messageSearchIntervalRef.current = null;
        }
        return;
      }
      
      try {
        // Find a partner using our helper
        const result = await enhancedAnonChat.findChatPartner(sessionId, gender, lookingFor);
        
        if (result.partnerId && result.partnerSessionId) {
          // Connect with the partner
          const success = await enhancedAnonChat.connectChatPartners(
            sessionId,
            result.partnerId,
            result.partnerSessionId
          );
          
          if (success) {
            // Clear search interval
            if (messageSearchIntervalRef.current) {
              clearInterval(messageSearchIntervalRef.current);
              messageSearchIntervalRef.current = null;
            }
            
            // Set up chat state
            setPartnerId(result.partnerId);
            setStatus('chatting');
            setIsReconnecting(false);
            
            // Add system message
            addSystemMessage("Terhubung! Silakan mulai chat.");
            
            // Set up messages listener if not already set
            setupMessagesListener(sessionId);
          }
        } else {
          // Increment retry count every 3 attempts (9 seconds)
          if (retryCount % 3 === 0) {
            addSystemMessage(`Masih mencari lawan bicara... (${Math.floor(retryCount/3) + 1})`);
          }
          setRetryCount(prev => prev + 1);
        }
      } catch (error) {
        console.error("Error finding partner:", error);
      }
    }, 3000);
    
    // Also do an immediate search
    enhancedAnonChat.findChatPartner(sessionId, gender, lookingFor)
      .then(result => {
        if (result.partnerId && result.partnerSessionId) {
          enhancedAnonChat.connectChatPartners(
            sessionId,
            result.partnerId,
            result.partnerSessionId
          ).then(success => {
            if (success) {
              // Clear search interval
              if (messageSearchIntervalRef.current) {
                clearInterval(messageSearchIntervalRef.current);
                messageSearchIntervalRef.current = null;
              }
              
              // Set up chat state
              setPartnerId(result.partnerId);
              setStatus('chatting');
              setIsReconnecting(false);
              
              // Add system message
              addSystemMessage("Terhubung! Silakan mulai chat.");
              
              // Set up messages listener
              setupMessagesListener(sessionId);
            }
          }).catch(error => {
            console.error("Error connecting to partner:", error);
          });
        }
      })
      .catch(error => {
        console.error("Error in initial partner search:", error);
      });
  }, [status, gender, lookingFor, retryCount, setupMessagesListener, addSystemMessage, isReconnecting]);

  // Handle creating a new session or using an existing one
  useEffect(() => {
    async function initializeSession() {
      try {
        // Use existing session ID if provided in URL
        if (initialSessionId) {
          setSessionId(initialSessionId);
          setStatus('waiting');
          addSystemMessage("Memuat sesi chat yang ada...");
          
          // Set up session listener
          setupSessionListener(initialSessionId);
          
          // Start heartbeat
          startHeartbeat(initialSessionId);
          
          // Check session status and start search if needed
          const session = await enhancedAnonChat.findActiveSession(userId);
          if (session && session.status === 'waiting') {
            addSystemMessage("Mencari lawan bicara...");
            startPartnerSearch(initialSessionId);
          } else if (session && session.status === 'chatting' && session.partner_id) {
            // Already in an active chat, set up messages listener
            setPartnerId(session.partner_id);
            setStatus('chatting');
            setupMessagesListener(initialSessionId);
            addSystemMessage("Melanjutkan percakapan...");
          }
        } 
        // Create a new session
        else if (gender && lookingFor) {
          addSystemMessage("Membuat sesi chat baru...");
          
          const sessionId = await enhancedAnonChat.createChatSession(gender, lookingFor);
          
          if (sessionId) {
            setSessionId(sessionId);
            setStatus('waiting');
            
            // Set up session listener
            setupSessionListener(sessionId);
            
            // Start heartbeat
            startHeartbeat(sessionId);
            
            // Start search for partner
            addSystemMessage("Mencari lawan bicara...");
            startPartnerSearch(sessionId);
          } else {
            setErrorMessage("Gagal membuat sesi chat. Silakan coba lagi.");
            setStatus('disconnected');
          }
        } else {
          setErrorMessage("Informasi gender atau preferensi tidak lengkap.");
          setStatus('disconnected');
        }
      } catch (error) {
        console.error("Error initializing session:", error);
        setErrorMessage("Terjadi kesalahan saat memulai chat. Silakan coba lagi.");
        setStatus('disconnected');
      }
    }
    
    initializeSession();
    
    // Cleanup function
    return () => {
      // Clean up listeners
      if (messagesListenerRef.current) {
        messagesListenerRef.current();
      }
      
      if (sessionListenerRef.current) {
        sessionListenerRef.current();
      }
      
      // Clean up intervals
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
      }
      
      if (messageSearchIntervalRef.current) {
        clearInterval(messageSearchIntervalRef.current);
      }
    };
  }, [initialSessionId, gender, lookingFor, userId, setupSessionListener, startHeartbeat, startPartnerSearch, addSystemMessage, setupMessagesListener]);
  
  // Send message handler
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !sessionId) return;
    
    const text = newMessage.trim();
    setNewMessage('');
    
    // Optimistically add message to UI
    const optimisticId = `temp-${Date.now()}`;
    const optimisticMessage = {
      id: optimisticId,
      text,
      senderId: userId,
      timestamp: new Date(),
      isSystemMessage: false
    };
    
    setMessages(prev => [...prev, optimisticMessage]);
    
    // Send message to server
    try {
      const messageId = await enhancedAnonChat.sendMessage(sessionId, text);
      
      // Replace optimistic message with real one (if needed)
      // This is handled by the messages listener in most cases
    } catch (error) {
      console.error("Error sending message:", error);
      
      // Show error message
      addSystemMessage("Pesan gagal terkirim. Silakan coba lagi.");
    }
    
    // Focus on input field
    if (messageInputRef.current) {
      messageInputRef.current.focus();
    }
  };
  
  // Handle input changes
  const handleInputChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setNewMessage(e.target.value);
  };
  
  // Handle key press
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    // Send message on Enter (without shift)
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };
  
  // End chat handler
  const handleEndChat = async () => {
    if (!sessionId) return;
    
    try {
      // Update UI immediately
      setStatus('disconnected');
      setPartnerStatus('offline');
      addSystemMessage("Anda telah mengakhiri chat.");
      
      // End the session
      await enhancedAnonChat.endChatSession(sessionId);
      
      // Clean up listeners
      if (messagesListenerRef.current) {
        messagesListenerRef.current();
        messagesListenerRef.current = null;
      }
      
      if (sessionListenerRef.current) {
        sessionListenerRef.current();
        sessionListenerRef.current = null;
      }
      
      // Clean up intervals
      if (heartbeatIntervalRef.current) {
        clearInterval(heartbeatIntervalRef.current);
        heartbeatIntervalRef.current = null;
      }
      
      if (messageSearchIntervalRef.current) {
        clearInterval(messageSearchIntervalRef.current);
        messageSearchIntervalRef.current = null;
      }
    } catch (error) {
      console.error("Error ending chat:", error);
    }
  };
  
  // Start new chat handler
  const handleStartNewChat = () => {
    router.push('/mini-games/anon-chat');
  };

  // Render based on status
  return (
    <div className="min-h-screen flex flex-col bg-black">
      <Navbar />
      
      <div className="flex-grow max-w-4xl w-full mx-auto px-4 pt-24 pb-16 flex flex-col">
        <div className="bg-gradient-to-br from-green-900/40 to-black border border-green-500/30 rounded-2xl p-6 flex-grow flex flex-col">
          {/* Header with status */}
          <div className="flex justify-between items-center mb-6 pb-4 border-b border-green-500/30">
            <div>
              <h2 className="text-2xl font-bold text-white">Anon Chat</h2>
              <div className="flex items-center mt-1">
                <div className={`w-2 h-2 rounded-full mr-2 ${
                  status === 'chatting' 
                    ? 'bg-green-500' 
                    : status === 'waiting' 
                      ? 'bg-yellow-500' 
                      : 'bg-red-500'
                }`}></div>
                <p className="text-gray-300 text-sm">
                  {status === 'connecting' && 'Menyambungkan...'}
                  {status === 'waiting' && 'Mencari lawan bicara...'}
                  {status === 'chatting' && 'Terhubung'}
                  {status === 'disconnected' && 'Terputus'}
                </p>
              </div>
            </div>
            
            {status !== 'disconnected' ? (
              <button 
                onClick={handleEndChat}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors"
              >
                Akhiri Chat
              </button>
            ) : (
              <button 
                onClick={handleStartNewChat}
                className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors"
              >
                Chat Baru
              </button>
            )}
          </div>
          
          {/* Error message */}
          {errorMessage && (
            <div className="bg-red-500/20 border border-red-500 rounded-lg p-4 mb-6 text-white">
              <p>{errorMessage}</p>
              <button 
                onClick={handleStartNewChat}
                className="mt-2 px-4 py-2 bg-white text-red-600 rounded-lg hover:bg-gray-100 transition-colors"
              >
                Kembali
              </button>
            </div>
          )}
          
          {/* Chat messages */}
          <div className="flex-grow overflow-y-auto mb-4 space-y-3 pb-2" style={{ maxHeight: 'calc(100vh - 350px)' }}>
            {messages.map((message) => (
              <div key={message.id} className={`flex ${message.senderId === userId ? 'justify-end' : message.senderId === 'system' ? 'justify-center' : 'justify-start'}`}>
                {message.senderId === 'system' ? (
                  <div className="bg-gray-800/50 px-4 py-2 rounded-lg max-w-[80%]">
                    <p className="text-gray-300 text-sm">{message.text}</p>
                  </div>
                ) : (
                  <div className={`px-4 py-3 rounded-lg max-w-[80%] ${
                    message.senderId === userId 
                      ? 'bg-green-600 text-white' 
                      : 'bg-gray-700 text-gray-100'
                  }`}>
                    <p>{message.text}</p>
                    <p className="text-xs opacity-75 mt-1 text-right">
                      {formatTime(message.timestamp)}
                    </p>
                  </div>
                )}
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Message input */}
          <div className={`mt-auto ${status !== 'chatting' ? 'opacity-50 pointer-events-none' : ''}`}>
            <div className="flex items-end">
              <textarea 
                ref={messageInputRef}
                className="flex-grow bg-gray-800 text-white border border-green-500/30 rounded-lg p-3 resize-none focus:outline-none focus:ring-2 focus:ring-green-500"
                placeholder={status === 'chatting' ? "Ketik pesan..." : "Menunggu koneksi..."}
                rows={2}
                value={newMessage}
                onChange={handleInputChange}
                onKeyDown={handleKeyDown}
                disabled={status !== 'chatting'}
              />
              <button 
                onClick={handleSendMessage}
                disabled={status !== 'chatting'}
                className="ml-2 px-4 py-3 bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-8.707l-3-3a1 1 0 00-1.414 0l-3 3a1 1 0 001.414 1.414L9 9.414V13a1 1 0 102 0V9.414l1.293 1.293a1 1 0 001.414-1.414z" clipRule="evenodd" />
                </svg>
              </button>
            </div>
            
            <div className="mt-2 text-xs text-gray-400 flex justify-between">
              <span>
                {partnerStatus === 'typing' && status === 'chatting' && 'Lawan bicara sedang mengetik...'}
                {partnerStatus === 'offline' && status === 'chatting' && 'Lawan bicara terputus...'}
              </span>
              <span>
                {status === 'chatting' && 'Enter = kirim, Shift+Enter = baris baru'}
              </span>
            </div>
          </div>
          
          {/* Disconnected state info */}
          {status === 'disconnected' && !errorMessage && (
            <div className="text-center my-8">
              <p className="text-gray-300 mb-6">Chat telah berakhir</p>
              <button 
                onClick={handleStartNewChat}
                className="px-6 py-3 bg-gradient-to-r from-green-600 to-teal-600 text-white rounded-lg hover:opacity-90 transition-all"
              >
                Mulai Chat Baru
              </button>
            </div>
          )}
        </div>
      </div>
      
      <Footer />
    </div>
  );
}

// Main component with Suspense
export default function ChatRoomPage() {
  return (
    <Suspense fallback={<ChatRoomLoading />}>
      <ChatRoomContent />
    </Suspense>
  );
}
