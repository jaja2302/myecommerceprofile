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
  
  const messageEndRef = useRef<HTMLDivElement>(null);
  
  // Auto scroll to bottom when messages change
  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Save nickname to localStorage when it changes
  useEffect(() => {
    if (typeof window !== 'undefined' && nickname) {
      localStorage.setItem('anonchat_nickname', nickname);
    }
  }, [nickname]);
  
  // Handle starting a new chat
  const handleStartChat = async () => {
    await startChat({
      nickname,
      gender,
      lookingFor
    });
  };
  
  // Handle sending a message
  const handleSendMessage = async () => {
    const trimmedMessage = newMessage.trim();
    if (!trimmedMessage) return;
    
    console.log('Sending message:', trimmedMessage);
    await sendMessage(trimmedMessage);
    setNewMessage('');
  };
  
  // Handle input change
  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setNewMessage(e.target.value);
    handleTyping(e.target.value);
  };
  
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-32 pb-20">
        <h1 className="text-4xl sm:text-6xl font-bold text-white text-center mb-4">
          Anonymous <span className="text-blue-500">Chat</span>
        </h1>
        <p className="text-gray-300 text-center mb-6 max-w-3xl mx-auto">
          Chat secara anonim dengan orang lain berdasarkan preferensi kamu.
          Temukan teman bicara baru tanpa perlu khawatir identitasmu terungkap.
        </p>
        
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-12 max-w-3xl mx-auto">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-yellow-300 text-sm">
              <span className="font-medium">Peringatan:</span> Jangan bagikan informasi pribadi seperti nama lengkap, nomor telepon, alamat rumah, lokasi, atau data sensitif lainnya. Jagalah privasi dan keamananmu saat chatting dengan orang yang tidak dikenal.
            </p>
          </div>
        </div>

        <div className="bg-gradient-to-br from-blue-900/30 to-black border border-blue-500/20 rounded-lg p-6 mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Profil & Preferensi Chat</h2>
          
          <div className="mb-4">
            <div className="flex flex-col md:flex-row gap-4 mb-4">
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-gray-300">Nickname</label>
                <input
                  type="text"
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  className="w-full bg-black/70 text-white border border-blue-500/30 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  placeholder="Your nickname"
                  disabled={!!room}
                />
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-gray-300">Gender</label>
                <select
                  value={gender}
                  onChange={(e) => setGender(e.target.value as Gender)}
                  className="w-full bg-black/70 text-white border border-blue-500/30 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  disabled={!!room}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                </select>
              </div>
              
              <div className="flex-1">
                <label className="block text-sm font-medium mb-1 text-gray-300">Looking For</label>
                <select
                  value={lookingFor}
                  onChange={(e) => setLookingFor(e.target.value as PreferredGender)}
                  className="w-full bg-black/70 text-white border border-blue-500/30 rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
                  disabled={!!room}
                >
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="other">Other</option>
                  <option value="any">Anyone</option>
                </select>
              </div>
            </div>
            
            <div className="flex justify-between items-center">
              <div>
                <span className="text-sm font-medium mr-2 text-gray-400">Status:</span>
                <span className={`inline-block px-2 py-1 rounded text-xs ${
                  connectionStatus === 'connected' ? 'bg-green-100 text-green-800' : 
                  connectionStatus === 'connecting' ? 'bg-yellow-100 text-yellow-800' : 
                  'bg-red-100 text-red-800'
                }`}>
                  {connectionStatus}
                </span>
              </div>
              
              {!room && (
                <button
                  onClick={handleStartChat}
                  disabled={connectionStatus !== 'connected' || isSearching}
                  className={`px-4 py-2 rounded ${
                    connectionStatus === 'connected' && !isSearching 
                      ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                      : 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  } transition-colors`}
                >
                  {isSearching ? 'Searching...' : 'Mulai Chat'}
                </button>
              )}
              
              {room && (
                <button
                  onClick={endChat}
                  className="px-4 py-2 rounded bg-red-600 hover:bg-red-700 text-white transition-colors"
                >
                  Akhiri Chat
                </button>
              )}
            </div>
          </div>

          {error && (
            <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg mb-4">
              {error}
            </div>
          )}
        </div>
        
        <div className="bg-gradient-to-br from-gray-900/30 to-black border border-gray-700/30 rounded-lg p-6 mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Chat</h2>
        
          <div className="flex-1 bg-black/50 border border-gray-700/50 rounded-lg p-4 overflow-y-auto mb-4 min-h-[300px] max-h-[500px]">
            {messages.length === 0 ? (
              <div className="flex items-center justify-center h-full text-gray-500">
                {isSearching ? 'Mencari partner chat...' : 'Mulai chat untuk mengobrol dengan seseorang.'}
              </div>
            ) : (
              <div className="space-y-3">
                {messages.map((msg) => (
                  <div 
                    key={msg.id}
                    className={`p-3 rounded max-w-[80%] ${
                      msg.isSystem 
                        ? 'bg-gray-800 text-gray-300 mx-auto text-center' 
                        : msg.senderId === userId
                          ? 'bg-blue-600 text-white ml-auto' 
                          : 'bg-gray-700 text-white'
                    }`}
                  >
                    <p>{msg.text || '(empty message)'}</p>
                    <span className="text-xs opacity-75 block text-right">
                      {new Date(msg.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                ))}
                {partnerIsTyping && (
                  <div className="p-3 rounded bg-gray-800 text-gray-300 max-w-[80%]">
                    <span className="inline-block">
                      <span className="typing-dot">.</span>
                      <span className="typing-dot">.</span>
                      <span className="typing-dot">.</span>
                    </span>
                  </div>
                )}
                <div ref={messageEndRef} />
              </div>
            )}
          </div>
          
          <div className="flex gap-2">
            <input
              type="text"
              value={newMessage}
              onChange={handleInputChange}
              onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
              className="flex-1 bg-black/70 text-white border border-gray-700/50 rounded-lg p-3 focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder={room ? "Ketik pesan..." : "Mulai chat untuk mengirim pesan"}
              disabled={!room}
            />
            <button
              onClick={handleSendMessage}
              disabled={!room || !newMessage.trim()}
              className={`px-6 py-3 rounded ${
                room && newMessage.trim() 
                  ? 'bg-blue-600 hover:bg-blue-700 text-white' 
                  : 'bg-gray-700 text-gray-400 cursor-not-allowed'
              } transition-colors`}
            >
              Kirim
            </button>
          </div>
        </div>
        
        <div className="text-center mt-12">
          <Link
            href="/mini-games"
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Mini Games
          </Link>
        </div>
      </div>
      
      <style jsx>{`
        .typing-dot {
          animation: typing 1.4s infinite ease-in-out;
          animation-fill-mode: both;
          font-size: 1.5rem;
          display: inline-block;
        }
        .typing-dot:nth-child(2) {
          animation-delay: 0.2s;
        }
        .typing-dot:nth-child(3) {
          animation-delay: 0.4s;
        }
        @keyframes typing {
          0% { opacity: 0.2; }
          20% { opacity: 1; }
          100% { opacity: 0.2; }
        }
      `}</style>
      
      <Footer />
    </div>
  );
}
