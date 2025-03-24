/**
 * enhancedAnonChat.ts
 * 
 * Enhanced helper library for the anonymous chat feature using multiple collections
 * to prevent race conditions and handle disconnections more gracefully.
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
  getDoc,
  runTransaction,
  writeBatch
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
  partner_session_id?: string | null;
}

export interface AnonConnection {
  connection_id?: string;
  session1_id: string;
  session2_id: string;
  user1_id: string;
  user2_id: string;
  status: 'active' | 'disconnected';
  created_at: Timestamp;
  last_heartbeat: Timestamp;
}

export interface AnonHeartbeat {
  session_id: string;
  user_id: string;
  timestamp: Timestamp;
  status: 'online' | 'offline';
}

export interface ChatMessage {
  id?: string;
  text: string;
  senderId: string;
  timestamp: Timestamp | Date;
  isSystemMessage?: boolean;
  user_id?: string;
  sessionId?: string;
}

// Initialize Firestore
const db = getFirestore(firebaseApp);
const sessionsCollection = collection(db, 'anon_sessions');
const connectionsCollection = collection(db, 'anon_connections');
const heartbeatsCollection = collection(db, 'anon_heartbeats');

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
    
    // First clean up any existing sessions
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
    
    // Add session to Firestore
    const docRef = await addDoc(sessionsCollection, sessionData);
    
    // Create initial heartbeat record
    await setDoc(doc(heartbeatsCollection, docRef.id), {
      session_id: docRef.id,
      user_id: userId,
      timestamp: serverTimestamp(),
      status: 'online'
    });
    
    return docRef.id;
  } catch (error) {
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
 * Connect two users in a chat using a transaction to prevent race conditions
 */
export const connectChatPartners = async (
  sessionId: string,
  partnerId: string,
  partnerSessionId: string
): Promise<boolean> => {
  try {
    const userId = userIdentifier.getPermanentUserId();
    
    // Use a transaction to ensure both sessions are updated atomically
    await runTransaction(db, async (transaction) => {
      // Get current data for both sessions
      const sessionRef = doc(db, 'anon_sessions', sessionId);
      const partnerSessionRef = doc(db, 'anon_sessions', partnerSessionId);
      
      const sessionDoc = await transaction.get(sessionRef);
      const partnerSessionDoc = await transaction.get(partnerSessionRef);
      
      // Verify both sessions still exist and are in 'waiting' status
      if (!sessionDoc.exists() || !partnerSessionDoc.exists()) {
        throw new Error("One or both sessions no longer exist");
      }
      
      const sessionData = sessionDoc.data();
      const partnerSessionData = partnerSessionDoc.data();
      
      if (sessionData.status !== 'waiting' || partnerSessionData.status !== 'waiting') {
        throw new Error("One or both sessions are no longer in waiting status");
      }
      
      // Update our session
      transaction.update(sessionRef, {
        partner_id: partnerId,
        partner_session_id: partnerSessionId,
        status: 'chatting',
        last_active: serverTimestamp()
      });
      
      // Update partner's session
      transaction.update(partnerSessionRef, {
        partner_id: userId,
        partner_session_id: sessionId,
        status: 'chatting',
        last_active: serverTimestamp()
      });
      
      // Create a connection record
      const connectionId = `${sessionId}_${partnerSessionId}`;
      const connectionRef = doc(db, 'anon_connections', connectionId);
      
      transaction.set(connectionRef, {
        connection_id: connectionId,
        session1_id: sessionId,
        session2_id: partnerSessionId,
        user1_id: userId,
        user2_id: partnerId,
        status: 'active',
        created_at: serverTimestamp(),
        last_heartbeat: serverTimestamp()
      });
      
      // Update heartbeats
      transaction.update(doc(db, 'anon_heartbeats', sessionId), {
        timestamp: serverTimestamp(),
        status: 'online'
      });
      
      transaction.update(doc(db, 'anon_heartbeats', partnerSessionId), {
        timestamp: serverTimestamp(),
        status: 'online'
      });
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
    
    const batch = writeBatch(db);
    
    // Update session last_active
    batch.update(doc(db, 'anon_sessions', sessionId), {
      last_active: serverTimestamp(),
      user_id: userId  // Include for security rules
    });
    
    // Update heartbeat
    batch.set(doc(db, 'anon_heartbeats', sessionId), {
      session_id: sessionId,
      user_id: userId,
      timestamp: serverTimestamp(),
      status: 'online'
    });
    
    // If we have a connection, update it too
    const sessionSnap = await getDoc(doc(db, 'anon_sessions', sessionId));
    if (sessionSnap.exists()) {
      const sessionData = sessionSnap.data();
      if (sessionData.partner_session_id) {
        const connectionId = `${sessionId}_${sessionData.partner_session_id}`;
        const reversedConnectionId = `${sessionData.partner_session_id}_${sessionId}`;
        
        // Try both possible connection IDs
        try {
          const connSnap = await getDoc(doc(db, 'anon_connections', connectionId));
          if (connSnap.exists()) {
            batch.update(doc(db, 'anon_connections', connectionId), {
              last_heartbeat: serverTimestamp()
            });
          } else {
            const reversedConnSnap = await getDoc(doc(db, 'anon_connections', reversedConnectionId));
            if (reversedConnSnap.exists()) {
              batch.update(doc(db, 'anon_connections', reversedConnectionId), {
                last_heartbeat: serverTimestamp()
              });
            }
          }
        } catch (error) {
          console.error('Error updating connection heartbeat:', error);
          // Continue anyway
        }
      }
    }
    
    await batch.commit();
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
    const partnerSessionId = partnerDoc.id;
    
    if (partnerData.status === 'disconnected') {
      return { isActive: false, lastActive: null };
    }
    
    // Also check the heartbeat collection for more accurate status
    try {
      const heartbeatDoc = await getDoc(doc(db, 'anon_heartbeats', partnerSessionId));
      if (heartbeatDoc.exists()) {
        const heartbeatData = heartbeatDoc.data();
        if (heartbeatData.status === 'offline') {
          return { isActive: false, lastActive: null };
        }
        
        if (heartbeatData.timestamp) {
          const lastBeat = heartbeatData.timestamp.toDate();
          const currentTime = new Date();
          const inactiveTime = currentTime.getTime() - lastBeat.getTime();
          
          // If inactive for more than 15 seconds, consider partner disconnected
          if (inactiveTime > 15000) {
            // Mark the partner as disconnected
            try {
              await updateDoc(doc(db, 'anon_heartbeats', partnerSessionId), {
                status: 'offline'
              });
            } catch (e) {
              console.warn('Could not update partner heartbeat status', e);
            }
            return { isActive: false, lastActive: lastBeat };
          }
        }
      }
    } catch (error) {
      console.error('Error checking partner heartbeat:', error);
      // Continue to check the session's last_active as fallback
    }
    
    // Check last active timestamp from session as fallback
    const lastActive = partnerData.last_active;
    if (lastActive) {
      const lastActiveTime = lastActive.toDate();
      const currentTime = new Date();
      const inactiveTime = currentTime.getTime() - lastActiveTime.getTime();
      
      // If inactive for more than 20 seconds, consider partner disconnected
      if (inactiveTime > 20000) {
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
    const userId = userIdentifier.getPermanentUserId();
    
    // Reference to the messages collection for this session
    const messagesCollection = collection(db, "anon_sessions", sessionId, "messages");
    
    // Create the message data - make sure all security-related fields are included
    const messageData = {
      id: uniqueId,
      text,
      senderId: isSystemMessage ? 'system' : userId,
      timestamp: serverTimestamp(),
      isSystemMessage,
      user_id: userId,  // Include the user's ID for permissions
      sessionId: sessionId,  // Include the session ID for easier reference
      owner: userId     // Include ownership info for security rules
    };
    
    // Add the message to the database
    const docRef = doc(messagesCollection, uniqueId);
    await setDoc(docRef, messageData);
    
    // Also update the session's last activity
    await updateSessionHeartbeat(sessionId).catch(e => {
      console.warn("Failed to update session activity, but message was sent:", e);
    });
    
    return uniqueId;
  } catch (error) {
    console.error(`Error in sendMessage (${isSystemMessage ? 'system' : 'user'}):`, error);
    // Return the generated ID anyway so UI doesn't break
    return uniqueId;
  }
};

/**
 * End chat session with retry mechanism
 */
export const endChatSession = async (sessionId: string): Promise<boolean> => {
  try {
    const userId = userIdentifier.getPermanentUserId();
    const sessionRef = doc(db, 'anon_sessions', sessionId);
    
    // Get the current session data
    const sessionSnap = await getDoc(sessionRef);
    if (!sessionSnap.exists()) {
      console.log(`Session ${sessionId} no longer exists, nothing to end`);
      return true;
    }
    
    const sessionData = sessionSnap.data();
    const partnerSessionId = sessionData.partner_session_id;
    const partnerId = sessionData.partner_id;
    
    // Use a batch to update all related documents
    const batch = writeBatch(db);
    
    // Update our session
    batch.update(sessionRef, {
      status: 'disconnected',
      last_active: serverTimestamp(),
      user_id: userId
    });
    
    // Update heartbeat
    batch.update(doc(db, 'anon_heartbeats', sessionId), {
      status: 'offline',
      timestamp: serverTimestamp()
    });
    
    // If we have a partner and connection, update those too
    if (partnerSessionId && partnerId) {
      // Try to update the partner's session if it exists
      try {
        const partnerSessionRef = doc(db, 'anon_sessions', partnerSessionId);
        const partnerSnap = await getDoc(partnerSessionRef);
        
        if (partnerSnap.exists()) {
          batch.update(partnerSessionRef, {
            status: 'disconnected',
            last_active: serverTimestamp(),
            user_id: partnerId  // Include for security rules
          });
        }
      } catch (error) {
        console.warn('Could not update partner session:', error);
        // Continue with the rest of the updates
      }
      
      // Update connection status
      try {
        const connectionId = `${sessionId}_${partnerSessionId}`;
        const reversedConnectionId = `${partnerSessionId}_${sessionId}`;
        
        // Try both possible connection IDs
        const connSnap = await getDoc(doc(db, 'anon_connections', connectionId));
        if (connSnap.exists()) {
          batch.update(doc(db, 'anon_connections', connectionId), {
            status: 'disconnected',
            last_heartbeat: serverTimestamp()
          });
        } else {
          const reversedConnSnap = await getDoc(doc(db, 'anon_connections', reversedConnectionId));
          if (reversedConnSnap.exists()) {
            batch.update(doc(db, 'anon_connections', reversedConnectionId), {
              status: 'disconnected',
              last_heartbeat: serverTimestamp()
            });
          }
        }
      } catch (error) {
        console.warn('Could not update connection status:', error);
        // Continue with the rest of the updates
      }
    }
    
    // Commit all the updates
    await batch.commit();
    
    return true;
  } catch (error) {
    console.error('Error ending chat session:', error);
    
    // Retry with a simpler approach if the batch update failed
    try {
      await updateDoc(doc(db, 'anon_sessions', sessionId), {
        status: 'disconnected',
        last_active: serverTimestamp()
      });
      return true;
    } catch (retryError) {
      console.error('Error in retry ending chat session:', retryError);
      return false;
    }
  }
};

/**
 * Clean up stale sessions for a given user
 */
export const cleanupStaleSessions = async (userId: string): Promise<number> => {
  try {
    let deletedCount = 0;
    
    // Query for disconnected sessions by this user
    const disconnectedQuery = query(
      collection(db, "anon_sessions"),
      where("user_id", "==", userId),
      where("status", "==", "disconnected")
    );
    
    const disconnectedSnapshot = await getDocs(disconnectedQuery);
    
    // Delete disconnected sessions
    const disconnectedPromises = disconnectedSnapshot.docs.map(async (docSnap) => {
      deletedCount++;
      try {
        const batch = writeBatch(db);
        
        // Delete the session
        batch.delete(docSnap.ref);
        
        // Delete the session's heartbeat
        batch.delete(doc(db, 'anon_heartbeats', docSnap.id));
        
        // Also delete any messages
        // Note: This won't delete all messages if there are many,
        // but it helps clean up what we can
        const messagesRef = collection(db, 'anon_sessions', docSnap.id, 'messages');
        const messagesQuery = query(messagesRef);
        const messagesSnapshot = await getDocs(messagesQuery);
        
        messagesSnapshot.docs.forEach(messageDoc => {
          batch.delete(messageDoc.ref);
        });
        
        await batch.commit();
      } catch (error) {
        console.error(`Error deleting session ${docSnap.id}:`, error);
        // Try individual delete as fallback
        await deleteDoc(docSnap.ref).catch(e => console.error(`Fallback delete failed for ${docSnap.id}:`, e));
      }
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
      .map(async (docSnap) => {
        deletedCount++;
        try {
          const batch = writeBatch(db);
          
          // Delete the session
          batch.delete(docSnap.ref);
          
          // Delete the session's heartbeat
          batch.delete(doc(db, 'anon_heartbeats', docSnap.id));
          
          await batch.commit();
        } catch (error) {
          console.error(`Error deleting waiting session ${docSnap.id}:`, error);
          // Try individual delete as fallback
          await deleteDoc(docSnap.ref).catch(e => console.error(`Fallback delete failed for ${docSnap.id}:`, e));
        }
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
 * Set up a listener for session changes with connection monitoring
 */
export const setupSessionListener = (
  sessionId: string,
  callback: (session: AnonSession) => void
): (() => void) => {
  // Set up listeners for both the session and heartbeat
  const sessionRef = doc(db, 'anon_sessions', sessionId);
  const heartbeatRef = doc(db, 'anon_heartbeats', sessionId);
  
  // Listen for session changes
  const sessionUnsubscribe = onSnapshot(sessionRef, async (snapshot) => {
    if (snapshot.exists()) {
      const sessionData = snapshot.data() as AnonSession;
      const completeSessionData = {
        session_id: snapshot.id,
        ...sessionData
      };
      
      // If we have a partner, check their heartbeat status
      if (sessionData.partner_id && sessionData.partner_session_id) {
        try {
          const partnerHeartbeatRef = doc(db, 'anon_heartbeats', sessionData.partner_session_id);
          const partnerHeartbeatSnap = await getDoc(partnerHeartbeatRef);
          
          if (partnerHeartbeatSnap.exists()) {
            const heartbeatData = partnerHeartbeatSnap.data();
            
            // If partner's heartbeat is offline, mark the session as disconnected
            if (heartbeatData.status === 'offline') {
              completeSessionData.status = 'disconnected';
            }
            
            // Check heartbeat timestamp
            if (heartbeatData.timestamp) {
              const lastBeat = heartbeatData.timestamp.toDate();
              const currentTime = new Date();
              const inactiveTime = currentTime.getTime() - lastBeat.getTime();
              
              // If inactive for more than 15 seconds, consider partner disconnected
              if (inactiveTime > 15000) {
                completeSessionData.status = 'disconnected';
              }
            }
          }
        } catch (error) {
          console.error('Error checking partner heartbeat in session listener:', error);
        }
      }
      
      callback(completeSessionData);
    } else {
      // Session no longer exists, treat as disconnected
      callback({
        session_id: sessionId,
        user_id: userIdentifier.getPermanentUserId(),
        partner_id: null,
        status: 'disconnected',
        last_active: null
      });
    }
  }, (error) => {
    console.error(`Error in session listener for ${sessionId}:`, error);
  });
  
  // Set up a separate heartbeat listener
  const heartbeatUnsubscribe = onSnapshot(heartbeatRef, (snapshot) => {
    // Just log for debugging - session listener will handle the actual status
    if (snapshot.exists()) {
      console.log(`Heartbeat update for session ${sessionId}:`, snapshot.data().status);
    }
  }, (error) => {
    console.error(`Error in heartbeat listener for ${sessionId}:`, error);
  });
  
  // Return a function that unsubscribes from both listeners
  return () => {
    sessionUnsubscribe();
    heartbeatUnsubscribe();
  };
};

/**
 * Recover from a failed connection 
 */
export const recoverSession = async (sessionId: string): Promise<boolean> => {
  try {
    const userId = userIdentifier.getPermanentUserId();
    
    // Update session to waiting state and clear partner
    await updateDoc(doc(db, 'anon_sessions', sessionId), {
      status: 'waiting',
      partner_id: null,
      partner_session_id: null,
      last_active: serverTimestamp(),
      user_id: userId
    });
    
    // Update heartbeat
    await setDoc(doc(db, 'anon_heartbeats', sessionId), {
      session_id: sessionId,
      user_id: userId,
      timestamp: serverTimestamp(),
      status: 'online'
    });
    
    return true;
  } catch (error) {
    console.error('Error recovering session:', error);
    return false;
  }
};

// Export as a named export object
const enhancedAnonChat = {
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
  setupSessionListener,
  recoverSession
};

export default enhancedAnonChat; 