/**
 * anonChat.ts
 * 
 * Helper library for the anonymous chat feature using the single-table approach.
 * Manages sessions, matchmaking, and chat operations.
 */

import { 
  getFirestore, 
  collection, 
  doc, 
  addDoc,
  updateDoc, 
  deleteDoc, 
  query, 
  where, 
  getDocs, 
  serverTimestamp, 
  onSnapshot,
  Timestamp,
  DocumentReference,
  setDoc
} from 'firebase/firestore';
import { firebaseApp } from './firebase';
import userIdentifier from './userIdentifier';

// Type definitions
export interface AnonSession {
  session_id?: string;
  user_id: string;
  partner_id: string | null;
  status: 'waiting' | 'chatting' | 'disconnected';
  last_active: Timestamp | null;
  gender?: string;
  lookingFor?: string;
  created_at?: Timestamp;
  device_fingerprint?: string;
  browser?: string;
}

export interface ChatMessage {
  id?: string;
  text: string;
  senderId: string;
  timestamp: Timestamp | Date;
  isSystemMessage?: boolean;
  user_id?: string;      // User ID of the sender (for security rules)
  sessionId?: string;    // Reference to parent session
}

// Initialize Firestore
const db = getFirestore(firebaseApp);
const sessionsCollection = collection(db, 'anon_sessions');

/**
 * Find an active session for a user
 */
export const findActiveSession = async (userId: string): Promise<AnonSession | null> => {
  try {
    const sessionsQuery = query(
      sessionsCollection,
      where('user_id', '==', userId),
      where('status', 'in', ['waiting', 'chatting'])
    );
    
    const snapshot = await getDocs(sessionsQuery);
    
    if (!snapshot.empty) {
      const sessionDoc = snapshot.docs[0];
      return { 
        session_id: sessionDoc.id, 
        ...sessionDoc.data() 
      } as AnonSession;
    }
    
    return null;
  } catch (error) {
    console.error('Error finding active session:', error);
    return null;
  }
};

/**
 * Create a new chat session
 */
export const createChatSession = async (
  gender: string,
  lookingFor: string
): Promise<string | null> => {
  try {
    const userId = userIdentifier.getPermanentUserId();
    
    // Check for duplicate session creation in progress
    const lockKey = 'anonchat_session_creation_lock';
    const lockData = localStorage.getItem(lockKey);
    
    if (lockData) {
      try {
        const lock = JSON.parse(lockData);
        const now = Date.now();
        // If the lock is less than 5 seconds old, assume session creation is in progress
        if (now - lock.timestamp < 5000 && lock.userId === userId) {
          console.log('Session creation already in progress, waiting for existing process');
          // Wait for the existing session creation to complete
          return new Promise((resolve) => {
            setTimeout(async () => {
              // Check again for active session
              const session = await findActiveSession(userId);
              resolve(session ? session.session_id || null : null);
            }, 1000);
          });
        }
      } catch (_) {
        console.error('Error finding active session:', _);
        // Invalid lock data, continue
      }
    }
    
    // Set a lock to prevent duplicate creation
    localStorage.setItem(lockKey, JSON.stringify({
      userId,
      timestamp: Date.now(),
      gender,
      lookingFor
    }));
    
    // Check if user already has an active session
    const existingSession = await findActiveSession(userId);
    if (existingSession) {
      // Clear the lock
      localStorage.removeItem(lockKey);
      return existingSession.session_id || null;
    }
    
    // Clean up any existing disconnected sessions for this user before creating a new one
    try {
      await cleanupStaleSessions(userId);
    } catch (error) {
      console.error('Error cleaning up stale sessions:', error);
    }
    
    // Create new session
    const sessionData: AnonSession = {
      user_id: userId,
      partner_id: null,
      status: 'waiting',
      last_active: Timestamp.now(),
      gender,
      lookingFor,
      created_at: Timestamp.now(),
      device_fingerprint: userIdentifier.getDeviceFingerprint(),
      browser: userIdentifier.getBrowserInfo()
    };
    
    const docRef = await addDoc(sessionsCollection, sessionData);
    
    // Clear the lock
    localStorage.removeItem(lockKey);
    
    return docRef.id;
  } catch (error) {
    // Clear the lock in case of error
    localStorage.removeItem('anonchat_session_creation_lock');
    console.error('Error creating chat session:', error);
    return null;
  }
};

/**
 * Find a chat partner based on preferences
 */
export const findChatPartner = async (
  sessionId: string,
  gender: string,
  lookingFor: string
): Promise<{ partnerId: string | null; partnerSessionId: string | null }> => {
  try {
    const userId = userIdentifier.getPermanentUserId();
    
    // Build query based on preferences
    let partnerQuery = query(
      sessionsCollection,
      where('status', '==', 'waiting'),
      where('user_id', '!=', userId)
    );
    
    // Add gender filter if not looking for any gender
    if (lookingFor !== 'any') {
      partnerQuery = query(
        sessionsCollection,
        where('status', '==', 'waiting'),
        where('user_id', '!=', userId),
        where('gender', '==', lookingFor)
      );
    }
    
    // If we have a gender-specific match, prioritize those looking for our gender
    if (gender && lookingFor !== 'any') {
      const preferredPartnersQuery = query(
        sessionsCollection,
        where('status', '==', 'waiting'),
        where('user_id', '!=', userId),
        where('gender', '==', lookingFor),
        where('lookingFor', 'in', [gender, 'any'])
      );
      
      const preferredSnapshot = await getDocs(preferredPartnersQuery);
      
      if (!preferredSnapshot.empty) {
        const partnerDoc = preferredSnapshot.docs[0];
        const partnerId = partnerDoc.data().user_id;
        
        return {
          partnerId,
          partnerSessionId: partnerDoc.id
        };
      }
    }
    
    // If no preferred match, find any eligible partner
    const snapshot = await getDocs(partnerQuery);
    
    if (!snapshot.empty) {
      const partnerDoc = snapshot.docs[0];
      const partnerId = partnerDoc.data().user_id;
      
      return {
        partnerId,
        partnerSessionId: partnerDoc.id
      };
    }
    
    return {
      partnerId: null,
      partnerSessionId: null
    };
  } catch (error) {
    console.error('Error finding chat partner:', error);
    return {
      partnerId: null,
      partnerSessionId: null
    };
  }
};

/**
 * Connect two users in a chat
 */
export const connectChatPartners = async (
  sessionId: string,
  partnerId: string,
  partnerSessionId: string
): Promise<boolean> => {
  try {
    const userId = userIdentifier.getPermanentUserId();
    
    // Update our session
    await updateDoc(doc(db, 'anon_sessions', sessionId), {
      partner_id: partnerId,
      status: 'chatting',
      last_active: serverTimestamp()
    });
    
    // Update partner's session
    await updateDoc(doc(db, 'anon_sessions', partnerSessionId), {
      partner_id: userId,
      status: 'chatting',
      last_active: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error connecting chat partners:', error);
    return false;
  }
};

/**
 * Update session heartbeat
 */
export const updateSessionHeartbeat = async (sessionId: string): Promise<boolean> => {
  try {
    await updateDoc(doc(db, 'anon_sessions', sessionId), {
      last_active: serverTimestamp()
    });
    return true;
  } catch (error) {
    console.error('Error updating session heartbeat:', error);
    return false;
  }
};

/**
 * Check if partner is still active
 */
export const checkPartnerActivity = async (
  partnerId: string,
  userId: string
): Promise<{ isActive: boolean; lastActive: Date | null }> => {
  try {
    // Find partner's session
    const partnersQuery = query(
      sessionsCollection,
      where('user_id', '==', partnerId),
      where('partner_id', '==', userId)
    );
    
    const snapshot = await getDocs(partnersQuery);
    
    if (snapshot.empty) {
      return { isActive: false, lastActive: null };
    }
    
    const partnerDoc = snapshot.docs[0];
    const partnerData = partnerDoc.data();
    
    if (partnerData.status === 'disconnected') {
      return { isActive: false, lastActive: null };
    }
    
    // Check last active timestamp
    const lastActive = partnerData.last_active;
    if (lastActive) {
      const lastActiveTime = lastActive.toDate();
      const currentTime = new Date();
      const inactiveTime = currentTime.getTime() - lastActiveTime.getTime();
      
      // If inactive for more than 30 seconds, consider partner disconnected
      if (inactiveTime > 30000) {
        return { isActive: false, lastActive: lastActiveTime };
      }
      
      return { isActive: true, lastActive: lastActiveTime };
    }
    
    return { isActive: true, lastActive: null };
  } catch (error) {
    console.error('Error checking partner activity:', error);
    return { isActive: false, lastActive: null };
  }
};

/**
 * Send a message
 */
export const sendMessage = async (
  sessionId: string,
  text: string,
  isSystemMessage = false
): Promise<string | null> => {
  try {
    // Get the current user ID
    const userId = userIdentifier.getPermanentUserId();
    
    // Create a unique ID for system messages to avoid React key conflicts
    const uniqueId = isSystemMessage ? 
      `system-${Date.now()}-${Math.random().toString(36).substring(2, 7)}` : null;
    
    // Create message data with required fields
    const messageData: ChatMessage = {
      text,
      senderId: isSystemMessage ? 'system' : userId,
      timestamp: serverTimestamp() as Timestamp,
      isSystemMessage: isSystemMessage || false,
      // Add these fields to ensure message permissions
      user_id: userId, // Adding this to help with security rules
      sessionId: sessionId // Reference to parent session
    };
    
    // Create a reference to the messages subcollection
    const messagesCollection = collection(db, 'anon_sessions', sessionId, 'messages');
    
    // Use the unique ID for system messages or let Firestore generate one
    let docRef: DocumentReference;
    
    if (uniqueId && isSystemMessage) {
      // Use the uniqueId as the document ID for system messages
      const messageDocRef = doc(messagesCollection, uniqueId);
      try {
        await setDoc(messageDocRef, messageData);
      } catch (error) {
        console.error("Error creating system message with fixed ID:", error);
      }
      docRef = messageDocRef;
    } else {
      // For regular messages, let Firestore generate the ID
      docRef = await addDoc(messagesCollection, messageData);
    }
    
    // Update the session's last activity timestamp
    await updateDoc(doc(db, 'anon_sessions', sessionId), {
      last_active: serverTimestamp()
    });
    
    return docRef.id;
  } catch (error) {
    console.error('Error sending message:', error);
    return null;
  }
};

/**
 * End chat session
 */
export const endChatSession = async (sessionId: string): Promise<boolean> => {
  try {
    // Update session status to disconnected
    await updateDoc(doc(db, 'anon_sessions', sessionId), {
      status: 'disconnected',
      last_active: serverTimestamp()
    });
    
    return true;
  } catch (error) {
    console.error('Error ending chat session:', error);
    return false;
  }
};

/**
 * Clean up stale sessions for a specific user
 */
export const cleanupStaleSessions = async (userId: string): Promise<number> => {
  try {
    // Query for any disconnected or old sessions for this user
    const staleSessionsQuery = query(
      sessionsCollection,
      where('user_id', '==', userId),
      where('status', 'in', ['disconnected', 'waiting'])
    );
    
    const snapshot = await getDocs(staleSessionsQuery);
    let count = 0;
    
    // Delete each stale session
    for (const sessionDoc of snapshot.docs) {
      const sessionData = sessionDoc.data() as AnonSession;
      
      // For waiting sessions, only cleanup if they're older than 30 minutes
      if (sessionData.status === 'waiting') {
        const lastActive = sessionData.last_active?.toDate?.() || new Date(0);
        const now = new Date();
        const timeDiff = now.getTime() - lastActive.getTime();
        
        // Skip if waiting session is still fresh (less than 30 minutes old)
        if (timeDiff < 30 * 60 * 1000) {
          continue;
        }
      }
      
      await deleteDoc(sessionDoc.ref);
      count++;
    }
    
    return count;
  } catch (error) {
    console.error('Error cleaning up stale sessions:', error);
    return 0;
  }
};

/**
 * Set up a listener for messages
 */
export const setupMessagesListener = (
  sessionId: string,
  callback: (messages: ChatMessage[]) => void
): (() => void) => {
  const messagesCollection = collection(db, 'anon_sessions', sessionId, 'messages');
  
  const unsubscribe = onSnapshot(messagesCollection, (snapshot) => {
    const newMessages: ChatMessage[] = [];
    snapshot.docs.forEach((doc) => {
      newMessages.push({
        id: doc.id,
        ...doc.data()
      } as ChatMessage);
    });
    
    // Sort messages by timestamp
    newMessages.sort((a, b) => {
      const aTime = a.timestamp instanceof Timestamp ? a.timestamp.toMillis() : 0;
      const bTime = b.timestamp instanceof Timestamp ? b.timestamp.toMillis() : 0;
      return aTime - bTime;
    });
    
    callback(newMessages);
  });
  
  return unsubscribe;
};

/**
 * Set up a listener for session changes
 */
export const setupSessionListener = (
  sessionId: string,
  callback: (session: AnonSession) => void
): (() => void) => {
  const sessionRef = doc(db, 'anon_sessions', sessionId);
  
  const unsubscribe = onSnapshot(sessionRef, (snapshot) => {
    if (snapshot.exists()) {
      const sessionData = snapshot.data() as AnonSession;
      callback({
        session_id: snapshot.id,
        ...sessionData
      });
    }
  });
  
  return unsubscribe;
};

// Create a named export object
const anonChatExport = {
  findActiveSession,
  createChatSession,
  findChatPartner,
  connectChatPartners,
  updateSessionHeartbeat,
  checkPartnerActivity,
  sendMessage,
  endChatSession,
  cleanupStaleSessions,
  setupMessagesListener,
  setupSessionListener
};

export default anonChatExport; 