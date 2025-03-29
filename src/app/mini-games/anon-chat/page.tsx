"use client";

import React, { useState, useEffect, useRef } from 'react';
import { useAnonChat } from '@/hooks/useAnonChat';
import { Gender, PreferredGender } from '@/types';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function AnonChatPage() {
  const { 
    loading, 
    error, 
    sessionId, 
    partnerId, 
    partnerGender, 
    messages, 
    startChat, 
    sendMessage, 
    endChat,
    isConnected,
    findPartner
  } = useAnonChat();

  const [userGender, setUserGender] = useState<Gender | ''>('');
  const [preferredGender, setPreferredGender] = useState<PreferredGender>('both');
  const [showGenderSelection, setShowGenderSelection] = useState(true);
  const [findingPartner, setFindingPartner] = useState(false);
  const [retryCount, setRetryCount] = useState(0);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [partnerLeftNotification, setPartnerLeftNotification] = useState<string | null>(null);
  const lastPartnerIdRef = useRef<string | null>(null);

  // Force reconnect function
  const handleReconnect = async () => {
    if (window) {
      console.log("Trying to force reconnect...");
      localStorage.removeItem('anonchat_session_creation_lock');
      localStorage.removeItem('anonchat_last_session_id');
      
      // Force page reload after a delay
      setTimeout(() => {
        window.location.reload();
      }, 1000);
    }
  };

  // Effect to monitor sessionId changes and trigger partner finding
  useEffect(() => {
    let sessionCheckTimeout: NodeJS.Timeout | null = null;

    if (findingPartner) {
      if (sessionId) {
        console.log(`Session ID available: ${sessionId}, finding partner...`);
        findPartner({ gender: userGender as Gender, lookingFor: preferredGender });
      } else {
        // Set a timeout to check if session becomes available
        sessionCheckTimeout = setTimeout(() => {
          if (findingPartner && !sessionId) {
            console.error("Session creation timeout - session ID still not available after waiting");
            setErrorMessage("Connection issue: Unable to create a chat session. Please try again.");
            setFindingPartner(false);
          }
        }, 8000); // Wait 8 seconds for session creation
      }
    }

    // Cleanup
    return () => {
      if (sessionCheckTimeout) {
        clearTimeout(sessionCheckTimeout);
      }
    };
  }, [sessionId, findingPartner, findPartner, userGender, preferredGender]);

  // Effect to monitor when partner leaves chat
  useEffect(() => {
    // If we had a partner before (stored in ref) but now partnerId is null
    // and we're not actively looking for partners (not in findingPartner state)
    if (lastPartnerIdRef.current && !partnerId && !findingPartner) {
      // Show notification that partner left
      setPartnerLeftNotification("Your chat partner has left the conversation.");
      // Return to gender selection screen with notification
      setShowGenderSelection(true);
      
      // Clear the notification after some time
      const timer = setTimeout(() => {
        setPartnerLeftNotification(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
    
    // Update our reference when partnerId changes
    lastPartnerIdRef.current = partnerId;
  }, [partnerId, findingPartner]);

  // Effect to monitor error messages related to chat partner
  useEffect(() => {
    // If error contains specific message about partner not found, it means partner left
    if (error && (
      error.includes("partner tidak ditemukan") || 
      error.includes("No partner") ||
      error.includes("Chat telah berakhir") ||
      error.includes("Partner telah")
    )) {
      // Force end the current chat and reset UI state
      endChat();
      setShowGenderSelection(true);
      setPartnerLeftNotification("Your chat partner has left the conversation.");
      setErrorMessage(null); // Clear the error message
      
      // Clear the notification after some time
      const timer = setTimeout(() => {
        setPartnerLeftNotification(null);
      }, 5000);
      
      return () => clearTimeout(timer);
    }
  }, [error, endChat]);

  // Add custom listener for partner left event
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handlePartnerLeft = (event: Event) => {
      console.log('Received anonchat_partner_left event');
      const customEvent = event as CustomEvent;
      const message = customEvent.detail?.message || 'Your chat partner has left the conversation.';
      
      // Update UI to show partner left
      setShowGenderSelection(true);
      setPartnerLeftNotification(message);
      
      // Clear the notification after some time
      setTimeout(() => {
        setPartnerLeftNotification(null);
      }, 5000);
    };

    // Add event listener
    window.addEventListener('anonchat_partner_left', handlePartnerLeft);
    
    // Clean up
    return () => {
      window.removeEventListener('anonchat_partner_left', handlePartnerLeft);
    };
  }, []);

  // Fungsi untuk menangani mulai chat
  const handleStartChat = async () => {
    if (!userGender) {
      alert("Harap pilih gender kamu dulu!");
      return;
    }
    
    console.log("Starting chat with:", { userGender, preferredGender });
    setFindingPartner(true);
    setErrorMessage(null);

    // Create a session
    const success = await startChat(userGender, preferredGender);
    
    if (!success) {
      console.error("Failed to create chat session");
      setErrorMessage("Failed to create chat session. Please try again.");
      setFindingPartner(false);
    }
    // If successful, the useEffect will trigger findPartner when sessionId becomes available
  };

  // Fungsi untuk memilih gender
  const selectGender = (gender: Gender) => {
    console.log("Selecting gender:", gender);
    setUserGender(gender);
  };
  
  // Fungsi untuk memilih preferensi gender
  const selectPreferredGender = (preference: PreferredGender) => {
    console.log("Selecting preference:", preference);
    setPreferredGender(preference);
  };

  // Fungsi untuk menangani cancel mencari partner
  const handleCancel = () => {
    endChat();
    setFindingPartner(false);
  };

  // Saat partner ditemukan
  useEffect(() => {
    if (partnerId) {
      setFindingPartner(false);
      setShowGenderSelection(false);
      setPartnerLeftNotification(null); // Clear any previous notifications
    }
  }, [partnerId]);

  // Saat chat berakhir, kembali ke tampilan pemilihan gender
  useEffect(() => {
    if (!partnerId && !findingPartner && !showGenderSelection) {
      setShowGenderSelection(true);
    }
  }, [partnerId, findingPartner, showGenderSelection]);

  // Tampilkan status sedang mencari partner
  const renderFindingPartner = () => {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] space-y-6 px-4 text-center">
        <div className="flex flex-col items-center space-y-3">
          <div className="animate-pulse text-xl font-medium">Finding someone to chat with...</div>
          <div className="mt-2 flex gap-2 justify-center">
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
            <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '600ms' }}></div>
          </div>
        </div>
        <button 
          className="px-4 py-2 border border-gray-300 rounded-md hover:bg-gray-100 transition-colors max-w-xs w-full" 
          onClick={handleCancel}
          disabled={!isConnected}
        >
          Cancel
        </button>
      </div>
    );
  };

  // Tampilkan layar pemilihan profile
  const renderProfileSelection = () => {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] p-4 space-y-6">
        <div className="space-y-2 text-center">
          <h2 className="text-2xl font-bold">Anonymous Chat</h2>
          <p className="text-gray-500">
            Chat anonymously with random people
          </p>
          
          {/* Partner Left Notification */}
          {partnerLeftNotification && (
            <div className="mt-3 p-3 bg-amber-100 border border-amber-400 text-amber-700 rounded-md text-sm">
              <p>{partnerLeftNotification}</p>
            </div>
          )}
          
          {/* Connection Status */}
          <div className={`mt-2 py-2 px-3 rounded-md text-sm ${
            isConnected 
              ? "bg-green-100 text-green-800" 
              : "bg-amber-100 text-amber-800"
          }`}>
            {isConnected 
              ? "✓ Connected to chat server" 
              : (
                <div className="flex flex-col items-center">
                  <span>Connecting to chat server...</span>
                  <div className="mt-1 flex gap-2 justify-center">
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '0ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
                    <div className="w-2 h-2 rounded-full bg-amber-500 animate-bounce" style={{ animationDelay: '600ms' }}></div>
                  </div>
                  <button 
                    onClick={handleReconnect}
                    className="mt-2 px-3 py-1 text-xs bg-amber-500 text-white rounded hover:bg-amber-600 transition-colors"
                  >
                    Refresh Connection
                  </button>
                </div>
              )
            }
          </div>

          {(error || errorMessage) && (
            <div className="mt-3 p-3 bg-red-100 border border-red-400 text-red-700 rounded-md text-sm">
              <p>{error || errorMessage}</p>
              <button 
                onClick={handleReconnect}
                className="mt-2 px-3 py-1 text-xs bg-red-500 text-white rounded hover:bg-red-600 transition-colors"
              >
                Refresh Connection
              </button>
            </div>
          )}
        </div>

        <div className="space-y-8 w-full max-w-xs">
          {/* I am... selection */}
          <div className="space-y-4">
            <p className="block text-lg font-medium text-gray-700 text-center">I am a...</p>
            <div className="grid grid-cols-2 gap-4">
              <button
                type="button"
                onClick={() => selectGender('male')}
                className={`py-4 px-4 text-lg rounded-lg border-2 ${
                  userGender === 'male' 
                    ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Male
              </button>
              <button
                type="button"
                onClick={() => selectGender('female')}
                className={`py-4 px-4 text-lg rounded-lg border-2 ${
                  userGender === 'female' 
                    ? 'bg-pink-100 border-pink-500 text-pink-700 font-bold' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Female
              </button>
            </div>
          </div>

          {/* I want to chat with... selection */}
          <div className="space-y-4">
            <p className="block text-lg font-medium text-gray-700 text-center">I want to chat with...</p>
            <div className="grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => selectPreferredGender('male')}
                className={`py-3 px-2 text-lg rounded-lg border-2 ${
                  preferredGender === 'male' 
                    ? 'bg-blue-100 border-blue-500 text-blue-700 font-bold' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Males
              </button>
              <button
                type="button"
                onClick={() => selectPreferredGender('female')}
                className={`py-3 px-2 text-lg rounded-lg border-2 ${
                  preferredGender === 'female' 
                    ? 'bg-pink-100 border-pink-500 text-pink-700 font-bold' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Females
              </button>
              <button
                type="button"
                onClick={() => selectPreferredGender('both')}
                className={`py-3 px-2 text-lg rounded-lg border-2 ${
                  preferredGender === 'both' 
                    ? 'bg-purple-100 border-purple-500 text-purple-700 font-bold' 
                    : 'border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                Anyone
              </button>
            </div>
          </div>

          <button 
            className="w-full p-4 text-lg bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed mt-4"
            onClick={handleStartChat}
            disabled={loading || (!isConnected && !error)}
          >
            {loading ? "Connecting..." : "Find Partner"}
          </button>
        </div>
      </div>
    );
  };

  // Tampilkan chat window sederhana
  const renderChatWindow = () => {
    // If partnerId is null but this component is being rendered,
    // we need to force back to the gender selection screen
    if (!partnerId) {
      // Use setTimeout to avoid state changes during render
      setTimeout(() => {
        setShowGenderSelection(true);
        setPartnerLeftNotification("Your chat partner has left the conversation.");
      }, 0);
      
      // Return a loading state while the timeout executes
      return (
        <div className="flex items-center justify-center h-[calc(100vh-140px)]">
          <div className="text-center">
            <p>Chat has ended. Returning to selection screen...</p>
            <div className="mt-4 flex justify-center gap-2">
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce"></div>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '300ms' }}></div>
              <div className="w-2 h-2 rounded-full bg-blue-500 animate-bounce" style={{ animationDelay: '600ms' }}></div>
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="flex flex-col h-[calc(100vh-140px)]">
        <div className="p-4 bg-white shadow-sm flex items-center justify-between">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 rounded-full bg-blue-500 flex items-center justify-center text-white">
              {partnerGender === 'male' ? 'M' : partnerGender === 'female' ? 'F' : '?'}
            </div>
            <div>
              <div className="font-medium">Anonymous {partnerGender === 'male' ? 'Male' : partnerGender === 'female' ? 'Female' : 'Person'}</div>
              <div className="text-xs text-gray-500">Connected</div>
            </div>
          </div>
          
          <button 
            className="px-3 py-1 border border-red-500 text-red-500 rounded-md hover:bg-red-50"
            onClick={endChat}
          >
            End Chat
          </button>
        </div>
        
        <div className="flex-1 p-4 bg-gray-50 overflow-y-auto">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'} mb-3`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-blue-600 text-white'
                    : message.sender === 'system'
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-gray-300 text-gray-800'
                }`}
              >
                <div className="break-words">{message.text}</div>
                <div className="text-xs opacity-70 text-right mt-1">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
        </div>
        
        <form 
          onSubmit={(e) => {
            e.preventDefault();
            const input = e.currentTarget.elements.namedItem('message') as HTMLInputElement;
            if (input.value.trim()) {
              sendMessage(input.value);
              input.value = '';
            }
          }} 
          className="p-4 border-t bg-white"
        >
          <div className="flex space-x-2">
            <input
              type="text"
              name="message"
              placeholder="Type a message..."
              className="flex-1 p-2 border border-gray-300 rounded-md"
            />
            <button 
              type="submit" 
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Send
            </button>
          </div>
        </form>
      </div>
    );
  };

  return (
    <div className="flex flex-col min-h-screen bg-gray-50">
      <div className="sticky top-0 z-50">
        <Navbar showBackButton title="Anonymous Chat" />
      </div>

      <main className="flex-1 z-10">
        {partnerId ? (
          renderChatWindow()
        ) : (
          findingPartner ? renderFindingPartner() : renderProfileSelection()
        )}
      </main>

      <Footer />
    </div>
  );
} 