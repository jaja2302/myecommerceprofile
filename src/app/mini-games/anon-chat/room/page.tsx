"use client";

import { useState, useEffect, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { useAnonChat, Gender, PreferredGender } from '@/hooks/useAnonChat';
import { v4 as uuidv4 } from 'uuid';

export default function ChatRoom() {
  const router = useRouter();
  const [messageText, setMessageText] = useState<string>('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messageInputRef = useRef<HTMLInputElement>(null);
  const [userGender, setUserGender] = useState<Gender>('other');
  const [preferredGender, setPreferredGender] = useState<PreferredGender>('any');
  const [lastErrorTime, setLastErrorTime] = useState<number>(0);

  // Get chat functionality from our custom hook
  const { 
    sessionId, 
    partnerId, 
    partnerGender, 
    messages, 
    loading, 
    error, 
    startChat,
    findPartner,
    sendMessage, 
    endChat 
  } = useAnonChat();

  // Get user preferences from session storage
  useEffect(() => {
    const storedGender = sessionStorage.getItem('userGender') as Gender;
    const storedPreference = sessionStorage.getItem('preferredGender') as PreferredGender;
    
    if (storedGender) {
      setUserGender(storedGender);
    }
    
    if (storedPreference) {
      setPreferredGender(storedPreference);
    }
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Start chat on component mount
  useEffect(() => {
    if (userGender) {
      startChat(userGender, preferredGender);
    }
  }, [userGender, preferredGender, startChat]);

  // Focus input when partner is found
  useEffect(() => {
    if (partnerId && messageInputRef.current) {
      messageInputRef.current.focus();
    }
  }, [partnerId]);

  // Handle showing errors without disrupting the UI too much
  useEffect(() => {
    if (error) {
      const now = Date.now();
      // Only show error alert if it's been more than 5 seconds since the last one
      if (now - lastErrorTime > 5000) {
        setLastErrorTime(now);
        if (error.includes('partner disconnected') || error.includes('ended')) {
          // Partner left - show a temporary message instead of an alert
          console.log('Partner disconnected');
        } else {
          // For other errors, show alert
          alert(error);
        }
      }
    }
  }, [error, lastErrorTime]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!messageText.trim()) return;
    
    const success = await sendMessage(messageText);
    if (success) {
      setMessageText('');
      messageInputRef.current?.focus();
    }
  };

  const handleFindNewPartner = async () => {
    // First end current chat if there's a partner
    if (partnerId) {
      await endChat();
    }
    
    // Then find a new partner
    await startChat(userGender, preferredGender);
  };

  const handleLeaveChat = async () => {
    if (partnerId) {
      await endChat();
    }
    router.push('/mini-games/anon-chat');
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Space for navbar */}
      <div className="h-16"></div>
      
      {/* Navbar with highest possible z-index */}
      <div className="fixed top-0 left-0 right-0 z-[9999]">
        <Navbar />
      </div>
      
      {/* Main content - chat interface */}
      <main className="flex-grow flex flex-col p-4 bg-gray-100 z-10 pt-6">
        <div className="max-w-3xl w-full mx-auto bg-white rounded-lg shadow flex flex-col h-[calc(100vh-150px)]">
          {/* Header with partner info and controls */}
          <div className="p-4 border-b flex items-center justify-between bg-blue-600 text-white rounded-t-lg">
            <div className="flex items-center">
              <div className="h-10 w-10 rounded-full bg-blue-400 flex items-center justify-center text-white font-bold">
                {partnerGender ? partnerGender.charAt(0).toUpperCase() : '?'}
              </div>
              <div className="ml-3">
                <h3 className="font-medium">
                  {partnerId 
                    ? `Chatting with ${partnerGender === 'male' 
                        ? 'Male' 
                        : partnerGender === 'female' 
                          ? 'Female' 
                          : 'Anonymous'}`
                    : 'Finding someone to chat with...'}
                </h3>
                <p className="text-sm text-blue-200">
                  {loading 
                    ? 'Please wait...' 
                    : partnerId 
                      ? 'Connected' 
                      : 'Waiting for connection...'}
                </p>
              </div>
            </div>
            
            <div className="flex space-x-2">
              <button 
                onClick={handleFindNewPartner}
                disabled={loading}
                className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-sm transition-colors disabled:bg-blue-300"
              >
                {loading ? 'Finding...' : 'New Chat'}
              </button>
              <button 
                onClick={handleLeaveChat}
                className="bg-blue-700 hover:bg-blue-800 text-white px-3 py-1 rounded text-sm transition-colors"
              >
                Leave
              </button>
            </div>
          </div>
          
          {/* Messages area */}
          <div className="flex-grow overflow-y-auto p-4">
            {messages.length === 0 && !loading && !partnerId ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500">
                <p className="text-center max-w-sm">
                  Waiting to match you with someone to chat with. This may take a moment.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {/* System message at start */}
                {!loading && !partnerId && messages.length === 0 && (
                  <div className="bg-gray-100 p-3 rounded-lg text-center text-gray-600 text-sm">
                    Looking for someone to chat with...
                  </div>
                )}
                
                {/* Actual messages */}
                {messages.map((message) => {
                  const isOwnMessage = message.senderId !== 'system' && message.senderId !== partnerId;
                  const isSystemMessage = message.senderId === 'system';
                  
                  if (isSystemMessage) {
                    return (
                      <div key={message.id} className="bg-gray-100 p-3 rounded-lg text-center text-gray-600 text-sm">
                        {message.text}
                      </div>
                    );
                  }
                  
                  return (
                    <div 
                      key={message.id} 
                      className={`flex ${isOwnMessage ? 'justify-end' : 'justify-start'}`}
                    >
                      <div 
                        className={`max-w-[80%] p-3 rounded-lg ${
                          isOwnMessage 
                            ? 'bg-blue-600 text-white rounded-br-none' 
                            : 'bg-gray-200 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        {message.text}
                        <div 
                          className={`text-xs mt-1 ${
                            isOwnMessage ? 'text-blue-200' : 'text-gray-500'
                          }`}
                        >
                          {new Date(message.timestamp).toLocaleTimeString([], {
                            hour: '2-digit',
                            minute: '2-digit'
                          })}
                        </div>
                      </div>
                    </div>
                  );
                })}
                
                {/* Scroll anchor */}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
          
          {/* Message input area */}
          <form onSubmit={handleSendMessage} className="p-3 border-t flex items-center">
            <input
              type="text"
              ref={messageInputRef}
              value={messageText}
              onChange={(e) => setMessageText(e.target.value)}
              disabled={!partnerId || loading}
              placeholder={
                loading 
                  ? "Finding someone to chat with..." 
                  : !partnerId 
                    ? "Waiting for connection..." 
                    : "Type a message..."
              }
              className="flex-grow p-2 border rounded-full focus:outline-none focus:ring-2 focus:ring-blue-300 disabled:bg-gray-100"
            />
            <button
              type="submit"
              disabled={!messageText.trim() || !partnerId || loading}
              className="ml-2 bg-blue-600 text-white p-2 rounded-full w-10 h-10 flex items-center justify-center disabled:bg-gray-300"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path d="M10.894 2.553a1 1 0 00-1.788 0l-7 14a1 1 0 001.169 1.409l5-1.429A1 1 0 009 15.571V11a1 1 0 112 0v4.571a1 1 0 00.725.962l5 1.428a1 1 0 001.17-1.408l-7-14z" />
              </svg>
            </button>
          </form>
        </div>
      </main>
      
      {/* Footer fixed at bottom */}
      <Footer />
    </div>
  );
}