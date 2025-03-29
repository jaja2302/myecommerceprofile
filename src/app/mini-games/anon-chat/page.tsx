'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAblyChat } from '@/hooks/useAblyChat';
import { Gender, PreferredGender } from '@/types';
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from 'next/link';

export default function AnonChat() {
  const {
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
  } = useAblyChat();
  
  const [nickname, setNickname] = useState<string>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('anonchat_nickname') || 'Anonymous';
    }
    return 'Anonymous';
  });
  
  const [gender, setGender] = useState<Gender>('male');
  const [lookingFor, setLookingFor] = useState<PreferredGender>('female');
  const [newMessage, setNewMessage] = useState('');
  const [autoScroll, setAutoScroll] = useState(true);
  
  const messageEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Add state to track if this is the first chat session
  const [isFirstSession, setIsFirstSession] = useState<boolean>(() => {
    if (typeof window !== 'undefined') {
      return localStorage.getItem('anonchat_has_chatted') !== 'true';
    }
    return true;
  });
  
  // Auto scroll to bottom when messages change
  useEffect(() => {
    if (messageEndRef.current && chatContainerRef.current && autoScroll) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
    }
  }, [messages, autoScroll]);
  
  // Handle manual scrolling - detect if user has scrolled up
  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current;
      // If we're close to the bottom, enable auto-scroll
      const isNearBottom = scrollHeight - scrollTop - clientHeight < 50;
      setAutoScroll(isNearBottom);
    }
  };
  
  // Save nickname to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && nickname) {
      localStorage.setItem('anonchat_nickname', nickname);
    }
  }, [nickname]);

  // Focus input when room changes
  useEffect(() => {
    if (room) {
      setTimeout(() => {
        inputRef.current?.focus();
        
        // Ensure scroll to bottom when chat starts
        if (chatContainerRef.current) {
          chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
          setAutoScroll(true);
        }
      }, 300);
    }
  }, [room]);
  
  // Update localStorage when chat starts for the first time
  useEffect(() => {
    if (room && isFirstSession) {
      localStorage.setItem('anonchat_has_chatted', 'true');
      setIsFirstSession(false);
    }
  }, [room, isFirstSession]);
  
  // Handle starting a new chat
  const handleStartChat = async () => {
    await startChat({
      nickname,
      gender,
      lookingFor
    });
  };
  
  // Modify the handle chat functions
  const handleEndAndFindNew = async () => {
    // First end current chat if exists
    if (room) {
      await endChat();
    }
    
    // Then after a short delay, start a new chat with the same preferences
    setTimeout(() => {
      handleStartChat();
    }, 500);
  };
  
  // Handle sending a message
  const handleSendMessage = async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage) return;
    
    console.log('Sending message:', trimmedMessage);
    await sendMessage(trimmedMessage);
    setNewMessage('');
    
    // Always scroll to bottom when sending a message
    setAutoScroll(true);
    setTimeout(() => {
      if (chatContainerRef.current) {
        chatContainerRef.current.scrollTop = chatContainerRef.current.scrollHeight;
      }
    }, 100);
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping(e.target.value);
  };
  
  // Scroll to bottom button
  const scrollToBottom = () => {
    if (chatContainerRef.current) {
      chatContainerRef.current.scrollTo({
        top: chatContainerRef.current.scrollHeight,
        behavior: 'smooth'
      });
      setAutoScroll(true);
    }
  };
  
  // Add a function to reset preferences
  const handleResetPreferences = () => {
    setIsFirstSession(true);
  };
  
  return (
    <div className="min-h-screen bg-gradient-to-b from-gray-950 to-black">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-2 sm:px-6 pt-24 sm:pt-32 pb-16 sm:pb-20">
        <div className="text-center mb-6 sm:mb-10">
          <h1 className="text-3xl sm:text-4xl md:text-6xl font-bold text-white mb-3 sm:mb-4 tracking-tight">
            Anonymous <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-violet-500">Chat</span>
          </h1>
          <p className="text-gray-400 max-w-3xl mx-auto text-xs sm:text-sm md:text-base leading-relaxed px-2">
            Chat secara anonim dengan orang lain berdasarkan preferensi kamu.
            Temukan teman bicara baru tanpa perlu khawatir identitasmu terungkap.
          </p>
        </div>
        
        <div className="bg-amber-500/5 backdrop-blur-sm border border-amber-500/20 rounded-xl p-3 sm:p-4 mb-6 sm:mb-8 max-w-3xl mx-auto shadow-lg shadow-amber-900/5">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 text-amber-400 mr-2 sm:mr-3 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-amber-200/80 text-xs sm:text-sm">
              <span className="font-medium text-amber-200">Peringatan:</span> Jangan bagikan informasi pribadi seperti nama lengkap, nomor telepon, alamat rumah, lokasi, atau data sensitif lainnya.
            </p>
          </div>
        </div>

        <div className="bg-slate-900/50 backdrop-blur-sm border border-slate-800 rounded-xl shadow-xl shadow-blue-900/5 overflow-hidden">
          <div className="flex items-center justify-between px-3 sm:px-6 py-3 sm:py-4 border-b border-slate-800">
            <h2 className="text-lg sm:text-xl font-semibold text-white flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5 mr-2 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
              </svg>
              Chat
            </h2>
            {room && (
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-medium bg-green-400/10 text-green-400 border border-green-400/20">
                <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-green-400"></span>
                Connected
              </span>
            )}
          </div>
        
          <div 
            ref={chatContainerRef}
            onScroll={handleScroll}
            className="bg-slate-950/80 p-3 sm:p-6 overflow-y-auto h-[350px] sm:h-[400px] scrollbar-thin scrollbar-thumb-slate-700 scrollbar-track-slate-900 relative"
          >
            {messages.length === 0 ? (
              <div className="flex flex-col items-center justify-center h-full text-gray-500 space-y-3">
                {isSearching ? (
                  <>
                    <div className="w-12 h-12 rounded-full border-t-2 border-b-2 border-blue-500 animate-spin"></div>
                    <p>Mencari partner chat...</p>
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    <p>Mulai chat untuk mengobrol dengan seseorang.</p>
                  </>
                )}
              </div>
            ) : (
              <div className="space-y-3 pb-2">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`${
                      msg.isSystem 
                        ? 'bg-slate-800/50 text-slate-300 max-w-[90%] sm:max-w-lg mx-auto text-center rounded-lg px-3 py-2 text-xs sm:text-sm' 
                        : msg.senderId === userId
                          ? 'flex justify-end' 
                          : 'flex justify-start'
                    }`}
                  >
                    {!msg.isSystem && (
                      <div 
                        className={`relative px-3 sm:px-4 py-2 sm:py-3 rounded-2xl max-w-[85%] sm:max-w-[80%] ${
                          msg.senderId === userId
                            ? 'bg-gradient-to-br from-blue-600 to-indigo-600 text-white rounded-tr-none' 
                            : 'bg-slate-800 text-white rounded-tl-none'
                        }`}
                      >
                        <p className="text-sm sm:text-base mb-1">{msg.text || '(empty message)'}</p>
                        <span className={`text-[10px] sm:text-xs ${msg.senderId === userId ? 'text-blue-200/70' : 'text-slate-400'} block text-right`}>
                          {new Date(msg.timestamp).toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                        </span>
                      </div>
                    )}
                    {msg.isSystem && (
                      <div>
                        {msg.text}
                      </div>
                    )}
                  </div>
                ))}
                {partnerIsTyping && (
                  <div className="flex justify-start">
                    <div className="bg-slate-800 px-3 py-2 rounded-2xl rounded-tl-none flex items-center space-x-1 text-white">
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                      <div className="typing-dot"></div>
                    </div>
                  </div>
                )}
                <div ref={messageEndRef} className="h-0.5" />
              </div>
            )}
            
            {/* Scroll to bottom button */}
            {!autoScroll && messages.length > 3 && (
              <button 
                onClick={scrollToBottom}
                className="absolute bottom-3 right-3 sm:bottom-4 sm:right-4 bg-blue-500 hover:bg-blue-600 text-white rounded-full p-1.5 sm:p-2 shadow-lg transition-all focus:outline-none"
                aria-label="Scroll to bottom"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 sm:h-5 sm:w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 14l-7 7m0 0l-7-7m7 7V3" />
                </svg>
              </button>
            )}
          </div>
          
          <div className="p-3 sm:p-4 border-t border-slate-800">
            <div className="flex flex-col space-y-3">
              {!room && (
                <div className={`grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-3 bg-slate-900/70 rounded-lg p-2 sm:p-3 border border-slate-800 ${!isFirstSession ? 'hidden' : ''}`}>
                  <div className="sm:col-span-3 mb-1">
                    <h3 className="text-sm font-medium text-blue-400 flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5.121 17.804A13.937 13.937 0 0112 16c2.5 0 4.847.655 6.879 1.804M15 10a3 3 0 11-6 0 3 3 0 016 0zm6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Profil & Preferensi
                    </h3>
                  </div>
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-400">Nickname</label>
                    <input
                      type="text"
                      value={nickname}
                      onChange={(e) => setNickname(e.target.value)}
                      className="w-full bg-slate-800/70 text-white border border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                      placeholder="Your nickname"
                    />
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-400">Gender</label>
                    <select
                      value={gender}
                      onChange={(e) => setGender(e.target.value as Gender)}
                      className="w-full bg-slate-800/70 text-white border border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                    </select>
                  </div>
                  
                  <div className="space-y-1">
                    <label className="block text-xs font-medium text-gray-400">Looking For</label>
                    <select
                      value={lookingFor}
                      onChange={(e) => setLookingFor(e.target.value as PreferredGender)}
                      className="w-full bg-slate-800/70 text-white border border-slate-700 rounded-lg px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all"
                    >
                      <option value="male">Male</option>
                      <option value="female">Female</option>
                      <option value="other">Other</option>
                      <option value="any">Anyone</option>
                    </select>
                  </div>
                </div>
              )}
              
              <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 sm:gap-0">
                <div className="flex flex-wrap items-center gap-2 justify-between sm:justify-start sm:space-x-2 sm:gap-0">
                  <div className="flex items-center space-x-1 mr-2">
                    <span className={`inline-flex w-2 h-2 rounded-full ${
                      connectionStatus === 'connected' 
                        ? 'bg-green-400' 
                        : connectionStatus === 'connecting' 
                        ? 'bg-amber-400' 
                        : 'bg-red-400'
                    }`}></span>
                    <span className="text-xs text-gray-400">{connectionStatus}</span>
                  </div>
                  
                  {!room && !isFirstSession && !isSearching && (
                    <button
                      onClick={handleResetPreferences}
                      className="px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-all bg-slate-700 hover:bg-slate-600 text-gray-300"
                    >
                      <span className="flex items-center">
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        Preferensi
                      </span>
                    </button>
                  )}
                  
                  {!room ? (
                    <button
                      onClick={isFirstSession ? handleStartChat : handleEndAndFindNew}
                      disabled={connectionStatus !== 'connected' || isSearching}
                      className={`px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm transition-all ${
                        connectionStatus === 'connected' && !isSearching 
                          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20' 
                          : 'bg-gray-800 text-gray-500 cursor-not-allowed'
                      }`}
                    >
                      {isSearching ? (
                        <span className="flex items-center">
                          <svg className="animate-spin -ml-1 mr-2 h-3 w-3 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Searching...
                        </span>
                      ) : (
                        <span className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 8l4 4m0 0l-4 4m4-4H3" />
                          </svg>
                          {isFirstSession ? 'Mulai Chat' : 'Cari Pasangan'}
                        </span>
                      )}
                    </button>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      <button
                        onClick={endChat}
                        className="px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm bg-gradient-to-r from-red-500 to-rose-600 hover:from-red-600 hover:to-rose-700 text-white transition-all shadow-lg shadow-red-500/20"
                      >
                        <span className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                          </svg>
                          Akhiri Chat
                        </span>
                      </button>
                      
                      <button
                        onClick={handleEndAndFindNew}
                        className="px-3 py-1.5 rounded-lg font-medium text-xs sm:text-sm bg-gradient-to-r from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700 text-white transition-all shadow-lg shadow-indigo-500/20"
                      >
                        <span className="flex items-center">
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                          </svg>
                          Cari Pasangan Baru
                        </span>
                      </button>
                    </div>
                  )}
                </div>
                
                <div className="flex items-center space-x-2 w-full sm:w-auto sm:flex-1 sm:ml-2 mt-2 sm:mt-0">
                  <input
                    ref={inputRef}
                    type="text"
                    value={newMessage}
                    onChange={handleInputChange}
                    onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                    className="flex-1 bg-slate-800 text-white border border-slate-700 rounded-full px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500/40 focus:border-blue-500/40 transition-all placeholder-slate-500 text-sm"
                    placeholder={room ? "Ketik pesan..." : "Mulai chat untuk mengirim pesan"}
                    disabled={!room}
                  />
                  <button
                    onClick={handleSendMessage}
                    disabled={!room || !newMessage.trim()}
                    className={`p-2 rounded-full transition-all ${
                      room && newMessage.trim() 
                        ? 'bg-gradient-to-r from-blue-500 to-indigo-600 hover:from-blue-600 hover:to-indigo-700 text-white shadow-lg shadow-blue-500/20' 
                        : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                    }`}
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 19l9 2-9-18-9 18 9-2zm0 0v-8" />
                    </svg>
                  </button>
                </div>
              </div>
              
              {error && (
                <div className="bg-red-500/10 border border-red-500/20 text-red-400 px-3 py-2 rounded-lg text-xs mt-2">
                  <div className="flex">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-red-400 mr-2 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor">
                      <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                    </svg>
                    <span>{error}</span>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="text-center mt-6 sm:mt-10">
          <Link
            href="/mini-games"
            className="inline-flex items-center text-slate-400 hover:text-white transition-colors font-medium text-sm"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-3.5 w-3.5 sm:h-4 sm:w-4 mr-1.5 sm:mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Mini Games
          </Link>
        </div>
      </div>
      
      <style jsx>{`
        .typing-dot {
          width: 8px;
          height: 8px;
          background-color: #9ca3af;
          border-radius: 50%;
          animation: typing 1.4s infinite ease-in-out;
          animation-fill-mode: both;
        }
        .typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes typing {
          0% { transform: scale(0.8); opacity: 0.4; }
          20% { transform: scale(1); opacity: 1; }
          100% { transform: scale(0.8); opacity: 0.4; }
        }
        .scrollbar-thin::-webkit-scrollbar {
          width: 6px;
        }
        .scrollbar-thin::-webkit-scrollbar-track {
          background: transparent;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb {
          background-color: rgba(148, 163, 184, 0.2);
          border-radius: 20px;
        }
        .scrollbar-thin::-webkit-scrollbar-thumb:hover {
          background-color: rgba(148, 163, 184, 0.3);
        }
      `}</style>
      
      <Footer />
    </div>
  );
}
