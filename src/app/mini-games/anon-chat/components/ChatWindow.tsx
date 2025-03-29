'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ChatMessage } from '@/hooks/useAnonChat';
import { Gender } from '@/types';
import { AlertCircle, Send, X, Info } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle } from '@/components/ui/alert';

interface ChatWindowProps {
  partnerId: string;
  partnerGender: Gender | null;
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<boolean>;
  onEndChat: () => Promise<boolean>;
}

export function ChatWindow({
  partnerId,
  partnerGender,
  messages,
  onSendMessage,
  onEndChat
}: ChatWindowProps) {
  const [newMessage, setNewMessage] = useState('');
  const [sending, setSending] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Scroll to bottom whenever messages change
  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!newMessage.trim()) return;
    
    try {
      setSending(true);
      setError(null);
      
      const success = await onSendMessage(newMessage);
      
      if (success) {
        setNewMessage('');
      } else {
        setError('Failed to send message. Please try again.');
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Error sending message. Please try again.');
    } finally {
      setSending(false);
    }
  };

  const handleEndChat = async () => {
    try {
      await onEndChat();
    } catch (err) {
      console.error('Error ending chat:', err);
    }
  };

  const getPartnerInitial = () => {
    return partnerGender === 'male' ? 'M' : partnerGender === 'female' ? 'F' : '?';
  };

  const getPartnerColor = () => {
    return partnerGender === 'male' ? 'bg-blue-500' : partnerGender === 'female' ? 'bg-pink-500' : 'bg-gray-500';
  };

  return (
    <div className="flex flex-col h-full max-h-[calc(100vh-120px)] sm:h-[calc(100vh-140px)]">
      <div className="p-2 sm:p-4 bg-white shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-2 sm:space-x-3">
          <Avatar className={getPartnerColor()}>
            <AvatarFallback className="text-white">{getPartnerInitial()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium text-sm sm:text-base">Anonymous {partnerGender === 'male' ? 'Male' : partnerGender === 'female' ? 'Female' : 'Person'}</div>
            <div className="text-xs text-muted-foreground">
              {partnerId ? 'Connected' : 'Disconnected'}
            </div>
          </div>
        </div>
        
        <Button variant="outline" size="sm" className="text-red-500 px-2 py-1 sm:px-3 sm:py-2" onClick={handleEndChat}>
          <X className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
          <span className="text-xs sm:text-sm">End Chat</span>
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-2 sm:p-4 bg-gray-50">
        <div className="space-y-3">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'system' ? 'justify-center' : message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              {message.sender === 'system' ? (
                <div className="bg-muted px-2 py-1 sm:px-3 sm:py-2 rounded-md text-xs text-muted-foreground flex items-center space-x-1 max-w-[85%]">
                  <Info className="h-3 w-3" />
                  <span>{message.text}</span>
                </div>
              ) : (
                <div
                  className={`max-w-[80%] px-3 py-1.5 sm:px-4 sm:py-2 rounded-lg ${
                    message.sender === 'user'
                      ? 'bg-primary text-primary-foreground'
                      : 'bg-secondary text-secondary-foreground'
                  }`}
                >
                  <div className="break-words text-sm">{message.text}</div>
                  <div className="text-xs opacity-70 text-right mt-0.5 sm:mt-1">
                    {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </div>
                </div>
              )}
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {error && (
        <Alert variant="destructive" className="mx-2 sm:mx-4 mb-1 sm:mb-2 py-1.5 sm:py-2">
          <AlertCircle className="h-3 w-3 sm:h-4 sm:w-4" />
          <AlertTitle className="text-xs sm:text-sm">{error}</AlertTitle>
        </Alert>
      )}
      
      <form onSubmit={handleSendMessage} className="p-2 sm:p-4 border-t bg-white">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending || !partnerId}
            className="flex-1 h-9 sm:h-10 text-sm"
          />
          <Button type="submit" size="sm" className="h-9 sm:h-10 w-9 sm:w-10 p-0" disabled={!newMessage.trim() || sending || !partnerId}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
        {!partnerId && (
          <div className="mt-1 sm:mt-2 text-center text-xs text-red-500">
            Chat has ended. The message input is disabled.
          </div>
        )}
      </form>
    </div>
  );
} 