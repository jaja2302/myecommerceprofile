// components/ChatUI.tsx
import React, { useState, useRef, useEffect } from 'react';
import { Gender, Message } from '@/types';
import PartnerInfo from '@/components/Anonchat/PartnerInfo';
import { Timestamp } from 'firebase/firestore';

interface ChatUIProps {
  messages: Message[];
  userId: string;
  partnerGender: Gender | null;
  onSendMessage: (message: string) => Promise<void>;
  onEndChat: () => Promise<void>;
}

export default function ChatUI({ messages, userId, partnerGender, onSendMessage, onEndChat }: ChatUIProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [isOnline, setIsOnline] = useState<boolean>(true);
  
  // Log messages untuk debugging
  useEffect(() => {
    console.log("ChatUI received messages:", messages.length);
    messages.forEach(msg => {
      console.log(`Message ${msg.id}: ${msg.senderId === userId ? 'Me' : 'Partner'} - ${msg.text}`);
    });
  }, [messages, userId]);
  
  // Scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);
  
  // Tambahkan debug info
  useEffect(() => {
    console.log(`ChatUI: User ${userId}, Partner Gender: ${partnerGender}`);
    console.log(`Messages count: ${messages.length}`);
    
    // Print all messages for debugging
    messages.forEach((msg, i) => {
      console.log(`Message ${i+1}: ${msg.id}`);
      console.log(`  From: ${msg.senderId} (${msg.senderId === userId ? 'Me' : 'Partner'})`);
      console.log(`  Text: ${msg.text}`);
      console.log(`  Time: ${msg.timestamp ? new Date(msg.timestamp.toMillis()).toLocaleString() : 'No timestamp'}`);
    });
  }, [messages, userId, partnerGender]);
  
  // Tambahkan useEffect untuk memonitor status koneksi
  useEffect(() => {
    const handleOnline = () => {
      console.log("[NETWORK] Browser is online");
      setIsOnline(true);
    };
    
    const handleOffline = () => {
      console.log("[NETWORK] Browser is offline");
      setIsOnline(false);
    };
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    if (newMessage.trim() === '' || sending) return;
    
    try {
      setSending(true);
      console.log("Sending message:", newMessage);
      await onSendMessage(newMessage);
      setNewMessage('');
    } catch (error) {
      console.error('Error sending message:', error);
    } finally {
      setSending(false);
    }
  };
  
  const handleEndChat = async () => {
    try {
      await onEndChat();
    } catch (error) {
      console.error('Error ending chat:', error);
    }
  };
  
  const formatTimestamp = (timestamp: Timestamp | null | undefined) => {
    if (!timestamp) return 'Sending...';
    try {
      return new Date(timestamp.toMillis()).toLocaleTimeString([], {
        hour: '2-digit', 
        minute: '2-digit'
      });
    } catch (error) {
      console.error("Error formatting timestamp:", error);
      return 'Time error';
    }
  };
  
  // System message rendering
  const renderMessage = (message: Message) => {
    if (message.senderId === 'system') {
      return (
        <div key={message.id} className="flex justify-center my-2">
          <div className="bg-gray-100 text-gray-600 text-xs px-3 py-1 rounded-full">
            {message.text}
          </div>
        </div>
      );
    }
    
    return (
      <div
        key={message.id}
        className={`flex ${
          message.senderId === userId ? 'justify-end' : 'justify-start'
        }`}
      >
        <div
          className={`max-w-xs md:max-w-md px-4 py-2 rounded-lg ${
            message.senderId === userId
              ? 'bg-blue-500 text-white rounded-br-none'
              : 'bg-gray-200 text-gray-800 rounded-bl-none'
          }`}
        >
          <p>{message.text}</p>
          <p className="text-xs mt-1 opacity-70">
            {formatTimestamp(message.timestamp)}
          </p>
        </div>
      </div>
    );
  };
  
  return (
    <div className="flex flex-col h-full">
      <div className="border-b p-4 flex justify-between items-center">
        <PartnerInfo partnerGender={partnerGender} />
        <button
          onClick={handleEndChat}
          className="bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded-md text-sm"
        >
          End Chat
        </button>
      </div>
      
      {/* Messages area */}
      <div className="flex-grow p-4 overflow-y-auto">
        <div className="space-y-4">
          {messages.length === 0 ? (
            <div className="text-center text-gray-500 my-4">
              Start a conversation! Say hello to your chat partner.
            </div>
          ) : (
            messages.map((message) => renderMessage(message))
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>
      
      {/* Message input */}
      <div className="border-t p-4">
        <form onSubmit={handleSendMessage} className="flex gap-2">
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            className="flex-grow p-2 border rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
            disabled={sending}
          />
          <button
            type="submit"
            disabled={newMessage.trim() === '' || sending}
            className={`px-4 py-2 rounded-md text-white ${
              sending || newMessage.trim() === ''
                ? 'bg-blue-300 cursor-not-allowed'
                : 'bg-blue-500 hover:bg-blue-600'
            }`}
          >
            {sending ? 'Sending...' : 'Send'}
          </button>
        </form>
      </div>
      
      {/* Tampilkan status koneksi di UI jika offline */}
      {!isOnline && (
        <div className="bg-yellow-100 p-2 text-center text-yellow-800 text-sm">
          You are currently offline. Messages will be sent when you reconnect.
        </div>
      )}
    </div>
  );
}