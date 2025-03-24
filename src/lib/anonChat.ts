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
  setDoc,
  getDoc
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
 * Create a chat session
 */
export const createChatSession = async (
  gender: string,
  lookingFor: string
): Promise<string | null> => {
  try {
    const userId = userIdentifier.getPermanentUserId();
    const sessionCreationKey = 'anonchat_session_creation_lock';
    
    // Check if session creation is already in progress
    const lockData = localStorage.getItem(sessionCreationKey);
    if (lockData) {
      const lockInfo = JSON.parse(lockData);
      const lockTimestamp = new Date(lockInfo.timestamp).getTime();
      const now = Date.now();
      
      // If lock is less than 10 seconds old, consider it valid
      if (now - lockTimestamp < 10000) {
        console.log('Session creation already in progress, waiting for existing process');
        
        // Wait for the lock to be released (poll every 500ms for up to 5 seconds)
        let attempts = 0;
        const maxAttempts = 10;
        
        return new Promise((resolve, reject) => {
          const checkLock = () => {
            attempts++;
            const currentLockData = localStorage.getItem(sessionCreationKey);
            
            if (!currentLockData) {
              // Lock has been released, check for the session ID
              const sessionIdData = localStorage.getItem('anonchat_last_session_id');
              if (sessionIdData) {
                try {
                  const sessionInfo = JSON.parse(sessionIdData);
                  if (sessionInfo.timestamp > lockTimestamp) {
                    console.log('Using existing session created by another process');
                    resolve(sessionInfo.sessionId);
                    return;
                  }
                } catch (e) {
                  console.error('Error parsing session ID data:', e);
                  // Invalid JSON, ignore
                }
              }
            }
            
            if (attempts >= maxAttempts) {
              // Timeout exceeded, clear the lock and proceed
              localStorage.removeItem(sessionCreationKey);
              reject(new Error('Timeout waiting for session creation'));
              return;
            }
            
            // Check again after delay
            setTimeout(checkLock, 500);
          };
          
          checkLock();
        });
      } else {
        // Lock is stale, remove it
        console.log('Removing stale session creation lock');
        localStorage.removeItem(sessionCreationKey);
      }
    }
    
    // Set session creation lock
    localStorage.setItem(sessionCreationKey, JSON.stringify({
      timestamp: new Date().toISOString(),
      userId
    }));
    
    try {
      // First clean up any existing disconnected sessions
      await cleanupStaleSessions(userId);
      
      // Create session data
      const sessionData = {
        user_id: userId,
        status: 'waiting',
        gender,
        lookingFor,
        created_at: serverTimestamp(),
        last_active: serverTimestamp(),
        partner_id: null,
        partner_session_id: null,
        device_info: {
          browser: userIdentifier.getBrowserInfo(),
          fingerprint: userIdentifier.getDeviceFingerprint()
        }
      };
      
      // Add to Firestore
      const docRef = await addDoc(collection(db, "anon_sessions"), sessionData);
      
      // Store the session ID
      const sessionId = docRef.id;
      localStorage.setItem('anonchat_last_session_id', JSON.stringify({
        sessionId,
        timestamp: Date.now()
      }));
      
      return sessionId;
    } finally {
      // Clear the lock regardless of success or failure
      localStorage.removeItem(sessionCreationKey);
    }
  } catch (error) {
    console.error('Error creating chat session:', error);
    localStorage.removeItem('anonchat_session_creation_lock');
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
    console.log(`Finding chat partner for user ${userId} with preferences: gender=${gender}, lookingFor=${lookingFor}`);
    
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
      try {
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
          console.log(`Found preferred partner: ${partnerId} (session: ${partnerDoc.id})`);
          
          return {
            partnerId,
            partnerSessionId: partnerDoc.id
          };
        }
      } catch (error) {
        console.error('Error finding preferred partner, falling back to basic search:', error);
        // Continue with regular search
      }
    }
    
    // If no preferred match, find any eligible partner
    try {
      const snapshot = await getDocs(partnerQuery);
      
      if (!snapshot.empty) {
        const partnerDoc = snapshot.docs[0];
        const partnerId = partnerDoc.data().user_id;
        console.log(`Found basic partner: ${partnerId} (session: ${partnerDoc.id})`);
        
        return {
          partnerId,
          partnerSessionId: partnerDoc.id
        };
      }
    } catch (error) {
      console.error('Error finding any partner:', error);
    }
    
    console.log('No partners found');
    return {
      partnerId: null,
      partnerSessionId: null
    };
  } catch (error) {
    console.error('Error in findChatPartner:', error);
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
      partner_session_id: partnerSessionId,
      status: 'chatting',
      last_active: serverTimestamp(),
      user_id: userId // Include user_id for security validation
    });
    
    // Update partner's session
    await updateDoc(doc(db, 'anon_sessions', partnerSessionId), {
      partner_id: userId,
      partner_session_id: sessionId,
      status: 'chatting',
      last_active: serverTimestamp(),
      user_id: partnerId // Include partner's user_id for security validation
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
    const userId = userIdentifier.getPermanentUserId();
    
    // Include the user_id for security rules verification
    await updateDoc(doc(db, 'anon_sessions', sessionId), {
      last_active: serverTimestamp(),
      user_id: userId  // Ensure user_id is included in every update to match security rules
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
 * Send a message to the chat
 */
export const sendMessage = async (
  sessionId: string,
  text: string,
  isSystemMessage: boolean = false
): Promise<string> => {
  // Generate a unique ID immediately for use in both success and failure cases
  const uniqueId = `${isSystemMessage ? 'system' : 'msg'}-${Date.now()}-${Math.random().toString(36).substring(2, 10)}`;
  
  try {
    const db = getFirestore(firebaseApp);
    const userId = userIdentifier.getPermanentUserId();
    
    // Reference to the messages collection for this session
    const messagesCollection = collection(db, "anon_sessions", sessionId, "messages");
    
    // Create the message data - make sure all security-related fields are included
    const messageData = {
      id: uniqueId,
      text,
      senderId: isSystemMessage ? 'system' : userId,
      timestamp: new Date(),
      isSystemMessage,
      user_id: userId,  // Always include the user's ID who created the message for permissions
      sessionId: sessionId,  // Include the session ID for easier reference
      // Include ownership info for security rules
      owner: userId
    };
    
    console.log(`Attempting to send ${isSystemMessage ? 'system' : 'user'} message to session ${sessionId}`);
    
    // Add the message to the database with a specific retry
    try {
      const docRef = doc(messagesCollection, uniqueId);
      await setDoc(docRef, messageData);
      console.log(`Successfully added message to Firestore: ${uniqueId}`);
      
      // Also update the session's last activity
      await updateSessionActivity(sessionId).catch(e => {
        console.warn("Failed to update session activity, but message was sent:", e);
      });
    } catch (innerError: unknown) {
      const errorMessage = innerError instanceof Error ? innerError.message : String(innerError);
      console.error(`Failed to add message to Firestore: ${errorMessage}`);
      // Just log the error but don't rethrow - we'll return the ID anyway
    }
    
    return uniqueId;
  } catch (error) {
    console.error(`Error in sendMessage (${isSystemMessage ? 'system' : 'user'}):`, error);
    // Return the generated ID anyway so UI doesn't break
    return uniqueId;
  }
};

/**
 * End chat session
 */
export const endChatSession = async (sessionId: string): Promise<boolean> => {
  try {
    const userId = userIdentifier.getPermanentUserId();
    
    // Check if the session exists first
    try {
      const sessionRef = doc(db, 'anon_sessions', sessionId);
      const docSnapshot = await getDoc(sessionRef);
      
      if (!docSnapshot.exists()) {
        console.log(`Session ${sessionId} no longer exists, nothing to end`);
        return true; // Consider it success since there's nothing to end
      }
      
      // Only update if the session still exists
      await updateDoc(sessionRef, {
        status: 'disconnected',
        last_active: serverTimestamp(),
        user_id: userId  // Include the user_id for security rules
      });
      
      console.log(`Successfully ended session ${sessionId}`);
      return true;
    } catch (innerError: unknown) {
      const errorMessage = innerError instanceof Error ? innerError.message : String(innerError);
      
      // If the error is about a missing document, log it but don't treat as an error
      if (errorMessage.includes('No document to update')) {
        console.log(`Session ${sessionId} was already removed`);
        return true;
      }
      
      // Re-throw other errors
      throw innerError;
    }
  } catch (error) {
    console.error('Error ending chat session:', error);
    return false;
  }
};

/**
 * Clean up stale sessions for a given user
 */
export const cleanupStaleSessions = async (userId: string): Promise<number> => {
  try {
    const db = getFirestore(firebaseApp);
    let deletedCount = 0;
    
    // Query for disconnected sessions by this user
    const disconnectedQuery = query(
      collection(db, "anon_sessions"),
      where("user_id", "==", userId),
      where("status", "==", "disconnected")
    );
    
    const disconnectedSnapshot = await getDocs(disconnectedQuery);
    
    // Delete disconnected sessions
    const disconnectedPromises = disconnectedSnapshot.docs.map(doc => {
      deletedCount++;
      return deleteDoc(doc.ref);
    });
    
    // Query for waiting sessions that are older than 30 minutes
    const thirtyMinutesAgo = new Date();
    thirtyMinutesAgo.setMinutes(thirtyMinutesAgo.getMinutes() - 30);
    
    const waitingQuery = query(
      collection(db, "anon_sessions"),
      where("user_id", "==", userId),
      where("status", "==", "waiting")
    );
    
    const waitingSnapshot = await getDocs(waitingQuery);
    
    // Delete old waiting sessions (those more than 30 mins old)
    const waitingPromises = waitingSnapshot.docs
      .filter(doc => {
        const createdAt = doc.data().created_at?.toDate?.();
        return createdAt && createdAt < thirtyMinutesAgo;
      })
      .map(doc => {
        deletedCount++;
        return deleteDoc(doc.ref);
      });
    
    // Execute all deletes in parallel
    await Promise.all([...disconnectedPromises, ...waitingPromises]);
    
    return deletedCount;
  } catch (error) {
    console.error("Error cleaning up stale sessions:", error);
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
  try {
    const messagesCollection = collection(db, 'anon_sessions', sessionId, 'messages');
    
    console.log(`Setting up messages listener for session ${sessionId}`);
    
    const unsubscribe = onSnapshot(
      messagesCollection, 
      (snapshot) => {
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
      },
      (error) => {
        console.error(`Error in messages listener for session ${sessionId}:`, error);
        // Return empty array on error to avoid breaking the UI
        callback([]);
      }
    );
    
    return unsubscribe;
  } catch (error) {
    console.error(`Error setting up messages listener for session ${sessionId}:`, error);
    // Return a no-op function as fallback
    return () => {};
  }
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

/**
 * Update a session's last activity timestamp
 */
export const updateSessionActivity = async (sessionId: string): Promise<void> => {
  try {
    const db = getFirestore(firebaseApp);
    const userId = userIdentifier.getPermanentUserId();
    
    // Include the user_id in the update to satisfy security rules
    await updateDoc(doc(db, 'anon_sessions', sessionId), {
      last_active: serverTimestamp(),
      user_id: userId  // Keep the original user_id to maintain permissions
    });
  } catch (error) {
    console.error('Error updating session activity:', error);
  }
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