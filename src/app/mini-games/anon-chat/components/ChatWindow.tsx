'use client';

import React, { useState, useRef, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Gender, ChatMessage } from '@/hooks/useAnonChat';
import { AlertCircle, Send, X } from 'lucide-react';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Alert, AlertTitle } from '@/components/ui/alert';

interface ChatWindowProps {
  sessionId: string;
  partnerId: string;
  partnerGender: Gender | null;
  messages: ChatMessage[];
  onSendMessage: (text: string) => Promise<boolean>;
  onEndChat: () => Promise<boolean>;
}

export function ChatWindow({
  sessionId,
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
    <div className="flex flex-col h-[calc(100vh-140px)]">
      <div className="p-4 bg-white shadow-sm flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <Avatar className={getPartnerColor()}>
            <AvatarFallback className="text-white">{getPartnerInitial()}</AvatarFallback>
          </Avatar>
          <div>
            <div className="font-medium">Anonymous {partnerGender === 'male' ? 'Male' : partnerGender === 'female' ? 'Female' : 'Person'}</div>
            <div className="text-xs text-muted-foreground">Connected</div>
          </div>
        </div>
        
        <Button variant="outline" size="sm" className="text-red-500" onClick={handleEndChat}>
          <X className="h-4 w-4 mr-2" />
          End Chat
        </Button>
      </div>
      
      <ScrollArea className="flex-1 p-4 bg-gray-50">
        <div className="space-y-4">
          {messages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[75%] px-4 py-2 rounded-lg ${
                  message.sender === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : message.sender === 'system'
                    ? 'bg-gray-200 text-gray-800'
                    : 'bg-secondary text-secondary-foreground'
                }`}
              >
                <div className="break-words">{message.text}</div>
                <div className="text-xs opacity-70 text-right mt-1">
                  {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </div>
              </div>
            </div>
          ))}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>
      
      {error && (
        <Alert variant="destructive" className="mx-4 mb-2">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>{error}</AlertTitle>
        </Alert>
      )}
      
      <form onSubmit={handleSendMessage} className="p-4 border-t bg-white">
        <div className="flex space-x-2">
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            disabled={sending}
            className="flex-1"
          />
          <Button type="submit" disabled={!newMessage.trim() || sending}>
            <Send className="h-4 w-4" />
          </Button>
        </div>
      </form>
    </div>
  );
} 