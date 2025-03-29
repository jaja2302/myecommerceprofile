// types/index.ts
import { Timestamp } from 'firebase/firestore';

export type Gender = 'male' | 'female' | 'other';
export type PreferredGender = Gender | 'any' | 'both';

export interface User {
  userId: string;
  username: string;
  gender: Gender;
  createdAt: Timestamp;
  isAvailable: boolean;
  currentChatId: string | null;
  preferredGender: PreferredGender;
  lastStatusUpdate?: Timestamp;
  lastSearchedAt?: Timestamp;
  lastSeen?: Timestamp;
  isOnline?: boolean;
  lastMatchedWith?: string;
  lastMatchTime?: Timestamp;
  deviceId?: string;
  lastCleanup?: Timestamp;
  currentMatchRequestId?: string;
  isMatchmaking?: boolean;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: Timestamp;
}

export interface Chat {
  id: string;
  participants: string[];
  createdAt: Timestamp;
  isActive: boolean;
  user1Gender?: Gender;
  user2Gender?: Gender;
  typing?: Record<string, boolean>;
  endedAt?: Timestamp;
  endedBy?: string;
  matchRequestId1?: string;
  matchRequestId2?: string;
  user1DeviceId?: string;
  user2DeviceId?: string;
}

export interface TypingIndicator {
  startTyping: () => Promise<void>;
  stopTyping: () => Promise<void>;
  cleanup: () => void;
}

export interface AuthContextType {
  user: any;
  loading: boolean;
  login: () => Promise<any>;
}

export interface ChatHookReturn {
  chatId: string | null;
  partnerId: string | null;
  partnerGender: Gender | null;
  messages: Message[];
  loading: boolean;
  error: string | null;
  startChat: (preferredGender?: PreferredGender) => Promise<boolean>;
  sendChatMessage: (text: string) => Promise<boolean>;
  endChat: () => Promise<boolean>;
}

export interface MatchRequest {
  id: string;
  userId: string;
  deviceId: string;
  preferredGender: PreferredGender;
  gender: Gender;
  username: string;
  createdAt: Timestamp;
  status: 'pending' | 'matched' | 'completed' | 'cancelled' | 'expired';
  expiresAt: Date | Timestamp;
  matchAttempts: number;
  lastAttempt: Timestamp;
  matchedWith?: string;
  matchedDeviceId?: string;
  matchedAt?: Timestamp;
  chatId?: string;
  completedAt?: Timestamp;
}