// utils/firebase.ts
import { FirebaseApp, getApps, initializeApp } from "firebase/app";
import { getAuth, signInAnonymously, onAuthStateChanged, User as FirebaseUser } from "firebase/auth";
import { 
  getFirestore, 
  collection, 
  addDoc, 
  serverTimestamp, 
  query, 
  where, 
  onSnapshot, 
  doc, 
  getDoc, 
  updateDoc, 
  setDoc,
  Unsubscribe,
  orderBy,
  writeBatch,
  getDocs,
  limit,
} from "firebase/firestore";
import { Gender, PreferredGender, User, Message } from "@/types";
import { Timestamp } from "firebase/firestore";

// Your Firebase configuration
// Replace with your own Firebase config
const firebaseConfig = {
  apiKey: process.env.NEXT_PUBLIC_FIREBASE_API_KEY,
  authDomain: process.env.NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.NEXT_PUBLIC_FIREBASE_PROJECT_ID,
  storageBucket: process.env.NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.NEXT_PUBLIC_FIREBASE_APP_ID
};

let firebaseApp: FirebaseApp;
if (!getApps().length) {
  console.log("Initializing Firebase app...");
  firebaseApp = initializeApp(firebaseConfig);
  console.log("Firebase app initialized");
} else {
  console.log("Using existing Firebase app");
  firebaseApp = getApps()[0];
}
// Initialize Firebase
const auth = getAuth(firebaseApp);
const db = getFirestore(firebaseApp);

// Anonymous login function
export const loginAnonymously = async (): Promise<FirebaseUser> => {
  try {
    const userCredential = await signInAnonymously(auth);
    return userCredential.user;
  } catch (error) {
    console.error("Error signing in anonymously:", error);
    throw error;
  }
};

// Get current user
export const getCurrentUser = (): FirebaseUser | null => {
  return auth.currentUser;
};

// Listen to auth state changes
export const onAuthChange = (callback: (user: FirebaseUser | null) => void): Unsubscribe => {
  return onAuthStateChanged(auth, callback);
};

// Create a new user in the database
export const createUserInDb = async (userId: string, username: string, gender: Gender): Promise<void> => {
  try {
    console.log(`Creating user in database: ${userId}, ${username}, ${gender}`);
    await setDoc(doc(db, "users", userId), {
      userId,
      username,
      gender, // 'male', 'female', or 'other'
      createdAt: serverTimestamp(),
      isAvailable: true,
      currentChatId: null,
      preferredGender: 'any', // Default preference
    });
    console.log("User successfully created in database");
  } catch (error) {
    console.error("Error creating user in database:", error);
    throw error;
  }
};

// Add device fingerprinting to distinguish different devices with same userId
export const registerDevice = async (userId: string): Promise<string> => {
  try {
    // Generate a pseudo-unique device ID 
    const deviceId = `device_${Math.random().toString(36).substring(2, 15)}_${Date.now()}`;
    
    // Store device in Firestore
    await setDoc(doc(db, "devices", deviceId), {
      userId,
      deviceId,
      lastSeen: serverTimestamp(),
      userAgent: typeof navigator !== 'undefined' ? navigator.userAgent : 'unknown'
    });
    
    // Store in localStorage for persistence
    if (typeof window !== 'undefined') {
      localStorage.setItem(`anonchat_device_${userId}`, deviceId);
    }
    
    return deviceId;
  } catch (error) {
    console.error(`[DEVICE] Error registering device:`, error);
    return `fallback_${Date.now()}`;
  }
};

// New function to create a match request in a dedicated collection
export const createMatchRequest = async (
  userId: string, 
  deviceId: string, 
  preferredGender: PreferredGender
): Promise<string> => {
  try {
    console.log(`[MATCH] Creating match request for user ${userId} with device ${deviceId}`);
    
    // First get user data for providing gender info
    const userDoc = await getDoc(doc(db, "users", userId));
    if (!userDoc.exists()) {
      throw new Error("User not found");
    }
    
    const userData = userDoc.data() as User;
    
    // Create a match request document
    const matchRequestRef = await addDoc(collection(db, "matchRequests"), {
      userId,
      deviceId,
      preferredGender,
      gender: userData.gender,
      username: userData.username,
      createdAt: serverTimestamp(),
      status: 'pending', // pending, matched, cancelled, expired
      expiresAt: new Date(Date.now() + 2 * 60 * 1000), // expires in 2 minutes
      matchAttempts: 0,
      lastAttempt: serverTimestamp()
    });
    
    console.log(`[MATCH] Created match request with ID: ${matchRequestRef.id}`);
    
    // Update user to reference this match request
    await updateDoc(doc(db, "users", userId), {
      currentMatchRequestId: matchRequestRef.id,
      lastStatusUpdate: serverTimestamp(),
      isMatchmaking: true
    });
    
    return matchRequestRef.id;
  } catch (error) {
    console.error(`[MATCH] Error creating match request:`, error);
    throw error;
  }
};

// New function to find a match using the matchRequests collection
export const findMatchFromRequests = async (
  currentUserId: string,
  currentDeviceId: string,
  preferredGender: PreferredGender
): Promise<{matchedUserId: string, matchRequestId: string} | null> => {
  try {
    console.log(`[MATCH] Finding match for user ${currentUserId} from existing requests`);
    
    // First get current user data
    const currentUserDoc = await getDoc(doc(db, "users", currentUserId));
    if (!currentUserDoc.exists()) {
      throw new Error("Current user not found");
    }
    
    const currentUserData = currentUserDoc.data() as User;
    const currentUserGender = currentUserData.gender;
    
    // Build query based on gender preferences
    let matchQuery;
    
    if (preferredGender === 'any') {
      // User wants to chat with anyone
      matchQuery = query(
        collection(db, "matchRequests"),
        where("status", "==", "pending"),
        where("userId", "!=", currentUserId), // Don't match with self
        orderBy("userId"),
        orderBy("createdAt", "asc"), // Oldest first
        limit(20)
      );
    } else {
      // User wants specific gender
      matchQuery = query(
        collection(db, "matchRequests"),
        where("status", "==", "pending"),
        where("userId", "!=", currentUserId),
        where("gender", "==", preferredGender),
        orderBy("gender"),
        orderBy("createdAt", "asc"),
        limit(20)
      );
    }
    
    const matchSnapshot = await getDocs(matchQuery);
    console.log(`[MATCH] Found ${matchSnapshot.size} potential matches`);
    
    if (matchSnapshot.empty) {
      console.log(`[MATCH] No pending match requests found`);
      return null;
    }
    
    // Define a type for the match requests to avoid TypeScript errors
    interface MatchRequest {
      id: string;
      userId: string;
      deviceId: string;
      preferredGender: PreferredGender;
      gender: Gender;
      status: string;
      expiresAt: Date | Timestamp | undefined;
      createdAt: Date | Timestamp;
      matchAttempts: number;
    }
    
    // Filter possible matches
    const possibleMatches = matchSnapshot.docs
      .map(doc => ({id: doc.id, ...doc.data()} as MatchRequest))
      .filter(request => {
        // Skip expired requests
        const expiryTime = request.expiresAt;
        const expiryDate = expiryTime instanceof Timestamp ? expiryTime.toDate() : expiryTime;
        if (expiryDate && new Date(expiryDate) < new Date()) {
          console.log(`[MATCH] Request ${request.id} for user ${request.userId} is expired`);
          return false;
        }
        
        // Skip requests from same device
        if (request.deviceId === currentDeviceId) {
          console.log(`[MATCH] Request ${request.id} is from same device ${currentDeviceId}`);
          return false;
        }
        
        // Check if they want our gender
        if (request.preferredGender !== 'any' && request.preferredGender !== currentUserGender) {
          console.log(`[MATCH] User ${request.userId} prefers ${request.preferredGender}, we are ${currentUserGender}`);
          return false;
        }
        
        return true;
      });
    
    console.log(`[MATCH] ${possibleMatches.length} matches after filtering`);
    
    if (possibleMatches.length === 0) {
      return null;
    }
    
    // Select the oldest request
    const selectedMatch = possibleMatches[0];
    console.log(`[MATCH] Selected match: ${selectedMatch.id} for user ${selectedMatch.userId}`);
    
    // Mark this request as matched in a transaction
    const batch = writeBatch(db);
    
    batch.update(doc(db, "matchRequests", selectedMatch.id), {
      status: 'matched',
      matchedWith: currentUserId,
      matchedDeviceId: currentDeviceId,
      matchedAt: serverTimestamp()
    });
    
    // If there's a current match request for the initiating user, update it too
    if (currentUserData.currentMatchRequestId) {
      batch.update(doc(db, "matchRequests", currentUserData.currentMatchRequestId), {
        status: 'matched',
        matchedWith: selectedMatch.userId,
        matchedAt: serverTimestamp()
      });
    }
    
    await batch.commit();
    console.log(`[MATCH] Updated match request status`);
    
    // Return the matched user info
    return {
      matchedUserId: selectedMatch.userId,
      matchRequestId: selectedMatch.id
    };
  } catch (error) {
    console.error(`[MATCH] Error finding match from requests:`, error);
    throw error;
  }
};

// New version of findRandomUser that uses the matchRequest system
export const findRandomUser = async (currentUserId: string, preferredGender: PreferredGender): Promise<User | null> => {
  try {
    console.log(`[FIND] Looking for random user for ${currentUserId}, preference: ${preferredGender}`);
    
    // Get current device ID for multi-device handling
    let deviceId = 'unknown';
    if (typeof window !== 'undefined') {
      deviceId = localStorage.getItem(`anonchat_device_${currentUserId}`) || await registerDevice(currentUserId);
      console.log(`[FIND] Current device ID: ${deviceId}`);
    }
    
    // CRITICAL: First ensure this user is marked as available
    await updateDoc(doc(db, "users", currentUserId), {
      isAvailable: true,
      currentChatId: null,
      lastStatusUpdate: serverTimestamp(),
      lastSearchedAt: serverTimestamp(),
      deviceId // Store device ID to help with multi-device scenarios
    });
    
    console.log(`[FIND] Updated current user ${currentUserId} status to available`);
    
    // Create a match request
    const matchRequestId = await createMatchRequest(currentUserId, deviceId, preferredGender);
    console.log(`[FIND] Created match request ${matchRequestId}`);
    
    // Try to find an existing match request to pair with
    const match = await findMatchFromRequests(currentUserId, deviceId, preferredGender);
    
    if (!match) {
      console.log(`[FIND] No suitable match found at this time`);
      return null;
    }
    
    // Get the matched user data
    const matchedUserDoc = await getDoc(doc(db, "users", match.matchedUserId));
    if (!matchedUserDoc.exists()) {
      console.error(`[FIND] Matched user ${match.matchedUserId} not found in database`);
      throw new Error("Matched user not found in database");
    }
    
    const matchedUser = matchedUserDoc.data() as User;
    console.log(`[FIND] Successfully matched with user: ${matchedUser.userId}`);
    
    return matchedUser;
  } catch (error) {
    console.error(`[FIND] Error in findRandomUser:`, error);
    throw error;
  }
};

// Create a new chat session between two users
export const createChatSession = async (user1Id: string, user2Id: string): Promise<string> => {
  try {
    console.log(`[CREATE] Creating chat session between ${user1Id} and ${user2Id}`);
    
    // Get the match request IDs for both users
    const [user1Doc, user2Doc] = await Promise.all([
      getDoc(doc(db, "users", user1Id)),
      getDoc(doc(db, "users", user2Id))
    ]);
    
    if (!user1Doc.exists() || !user2Doc.exists()) {
      console.error(`[CREATE] One or both users not found`);
      throw new Error("One or both users not found");
    }
    
    const user1Data = user1Doc.data() as User;
    const user2Data = user2Doc.data() as User;
    
    // Log the current status for debugging
    console.log(`[CREATE] User status check:
      User1 (${user1Id}): isAvailable=${user1Data.isAvailable}, currentMatchRequestId=${user1Data.currentMatchRequestId || 'null'}
      User2 (${user2Id}): isAvailable=${user2Data.isAvailable}, currentMatchRequestId=${user2Data.currentMatchRequestId || 'null'}`);
    
    // Create the chat document
    const chatRef = await addDoc(collection(db, "chats"), {
      participants: [user1Id, user2Id],
      createdAt: serverTimestamp(),
      isActive: true,
      user1Gender: user1Data.gender,
      user2Gender: user2Data.gender,
      lastActivity: serverTimestamp(),
      user1Username: user1Data.username,
      user2Username: user2Data.username,
      matchTimestamp: serverTimestamp(),
      matchRequestId1: user1Data.currentMatchRequestId || null,
      matchRequestId2: user2Data.currentMatchRequestId || null,
      user1DeviceId: user1Data.deviceId || 'unknown',
      user2DeviceId: user2Data.deviceId || 'unknown'
    });
    
    console.log(`[CREATE] Created chat with ID: ${chatRef.id}`);
    
    // Update both users' status in a transaction to ensure atomicity
    const batch = writeBatch(db);
    
    // Update user1
    batch.update(doc(db, "users", user1Id), {
      isAvailable: false,
      isMatchmaking: false,
      currentChatId: chatRef.id,
      lastMatchedWith: user2Id,
      lastMatchTime: serverTimestamp()
    });
    
    // Update user2
    batch.update(doc(db, "users", user2Id), {
      isAvailable: false,
      isMatchmaking: false,
      currentChatId: chatRef.id,
      lastMatchedWith: user1Id,
      lastMatchTime: serverTimestamp()
    });
    
    // Update match requests to completed
    if (user1Data.currentMatchRequestId) {
      batch.update(doc(db, "matchRequests", user1Data.currentMatchRequestId), {
        status: 'completed',
        chatId: chatRef.id,
        completedAt: serverTimestamp()
      });
    }
    
    if (user2Data.currentMatchRequestId) {
      batch.update(doc(db, "matchRequests", user2Data.currentMatchRequestId), {
        status: 'completed',
        chatId: chatRef.id,
        completedAt: serverTimestamp()
      });
    }
    
    // Commit the batch
    await batch.commit();
    console.log(`[CREATE] Updated both users' status and completed match requests`);
    
    // Add system message to chat
    await addDoc(collection(db, "chats", chatRef.id, "messages"), {
      senderId: "system",
      text: "Chat started. Say hello!",
      timestamp: serverTimestamp(),
      isSystemMessage: true
    });
    
    console.log(`[CREATE] Added system message to chat`);
    
    return chatRef.id;
  } catch (error) {
    console.error(`[CREATE] Error creating chat session:`, error);
    throw error;
  }
};

// Send a message in a chat
export const sendMessage = async (chatId: string, senderId: string, text: string): Promise<void> => {
  try {
    console.log(`[SEND] Sending message in chat ${chatId} from ${senderId}: ${text}`);
    
    // Generate a unique ID for local reference
    const messageId = Math.random().toString(36).substring(2, 15) + Math.random().toString(36).substring(2, 15);
    
    const messageData = {
      senderId,
      text,
      timestamp: serverTimestamp(),
      clientTimestamp: new Date().toISOString(), // Backup client timestamp
      id: messageId, // Include local ID
      status: 'sending' // Track message status
    };
    
    console.log(`[SEND] Message data:`, messageData);
    
    // Add message to Firestore
    const docRef = await addDoc(collection(db, "chats", chatId, "messages"), messageData);
    
    console.log(`[SEND] Message sent with server ID: ${docRef.id}`);
    
    // Update the message with the server ID
    await updateDoc(doc(db, "chats", chatId, "messages", docRef.id), {
      status: 'sent',
      serverTimestamp: serverTimestamp()
    });
    
    console.log(`[SEND] Message status updated to 'sent'`);
    
    // Update the chat document with last message info
    await updateDoc(doc(db, "chats", chatId), {
      lastMessage: text.substring(0, 50) + (text.length > 50 ? '...' : ''),
      lastMessageTime: serverTimestamp(),
      lastActivity: serverTimestamp()
    });
    
    console.log(`[SEND] Chat document updated with last message info`);
  } catch (error) {
    console.error(`[ERROR] Failed to send message: ${error}`);
    throw error;
  }
};

// Listen to messages in a chat
export const listenToMessages = (chatId: string, callback: (messages: Message[]) => void): Unsubscribe => {
  console.log(`[LISTENER] Setting up message listener for chat: ${chatId}`);
  
  try {
  const messagesRef = collection(db, "chats", chatId, "messages");
    const q = query(messagesRef, orderBy("timestamp", "asc"));
    
    // Menggunakan includeMetadataChanges untuk menangkap perubahan secepat mungkin
    const unsubscribe = onSnapshot(q, { includeMetadataChanges: true }, (snapshot) => {
      console.log(`[SNAPSHOT] Received snapshot with ${snapshot.docs.length} messages`);
      console.log(`[SNAPSHOT] From cache: ${snapshot.metadata.fromCache}, Has pending writes: ${snapshot.metadata.hasPendingWrites}`);
      
      // Log setiap perubahan dokumen
      snapshot.docChanges().forEach((change) => {
        console.log(`[CHANGE] Type: ${change.type}, Doc ID: ${change.doc.id}`);
        console.log(`[CHANGE] Data:`, change.doc.data());
      });
      
    const messages = snapshot.docs.map(doc => ({
      id: doc.id,
      ...doc.data()
    })) as Message[];
      
      console.log(`[PROCESSED] Total messages: ${messages.length}`);
      
      // Pastikan messages diurutkan berdasarkan timestamp
      const sortedMessages = [...messages].sort((a, b) => {
        // Jika timestamp tidak ada, gunakan id sebagai fallback
        if (!a.timestamp && !b.timestamp) return a.id.localeCompare(b.id);
        if (!a.timestamp) return 1; // a goes after b
        if (!b.timestamp) return -1; // a goes before b
        
        return a.timestamp.toMillis() - b.timestamp.toMillis();
      });
      
      callback(sortedMessages);
    }, 
    (error) => {
      console.error(`[ERROR] Error in message listener: ${error.message}`);
    });
    
    return unsubscribe;
  } catch (error) {
    console.error(`[CRITICAL] Failed to set up listener: ${error}`);
    return () => {}; // Return empty function to avoid errors
  }
};

// End chat session
export const endChatSession = async (chatId: string, userId: string): Promise<void> => {
  try {
    // Get chat to check participants
    const chatDoc = await getDoc(doc(db, "chats", chatId));
    if (!chatDoc.exists()) {
      throw new Error("Chat not found");
    }
    
    const chatData = chatDoc.data();
    const participants = chatData.participants as string[];
    
    // Update chat status
    await updateDoc(doc(db, "chats", chatId), {
      isActive: false,
      endedAt: serverTimestamp(),
      endedBy: userId,
    });
    
    // Reset both participants' status
    for (const participantId of participants) {
      await updateDoc(doc(db, "users", participantId), {
        isAvailable: true,
        currentChatId: null,
      });
    }
  } catch (error) {
    console.error("Error ending chat session:", error);
    throw error;
  }
};

// Update user preferences
export const updateUserPreferences = async (userId: string, preferredGender: PreferredGender): Promise<void> => {
  try {
    const userRef = doc(db, "users", userId);
    await updateDoc(userRef, {
      preferredGender
    });
  } catch (error) {
    console.error("Error updating user preferences:", error);
    throw error;
  }
};

// Add this function to check if a user exists in the database
export const userExistsInDb = async (userId: string): Promise<boolean> => {
  try {
    const userDoc = await getDoc(doc(db, "users", userId));
    return userDoc.exists();
  } catch (error) {
    console.error("Error checking if user exists:", error);
    return false;
  }
};

// Send a system message in a chat
export const sendSystemMessage = async (chatId: string, text: string): Promise<void> => {
  try {
    console.log(`[SYSTEM] Sending system message to chat ${chatId}: ${text}`);
    
    await addDoc(collection(db, "chats", chatId, "messages"), {
      senderId: "system",
      text: text,
      timestamp: serverTimestamp(),
      isSystemMessage: true
    });
    
    console.log(`[SYSTEM] System message sent`);
  } catch (error) {
    console.error(`[SYSTEM] Error sending system message:`, error);
    throw error;
  }
};

// User heartbeat function to update online status
export const updateUserHeartbeat = async (userId: string): Promise<void> => {
  try {
    await updateDoc(doc(db, "users", userId), {
      lastSeen: serverTimestamp(),
      isOnline: true
    });
  } catch (error) {
    console.error("Error updating user heartbeat:", error);
  }
};

// Clean up stale user states - call this periodically
export const cleanupStaleUserStates = async (): Promise<void> => {
  try {
    console.log(`[CLEANUP] Starting cleanup of stale user states`);
    
    // Get users that have a currentChatId but the chat might be stale
    const staleUsersQuery = query(
      collection(db, "users"),
      where("isAvailable", "==", false),
      limit(50) // Limit to 50 users at a time for batch processing
    );
    
    const staleUsersSnapshot = await getDocs(staleUsersQuery);
    console.log(`[CLEANUP] Found ${staleUsersSnapshot.size} potentially stale users`);
    
    const batch = writeBatch(db);
    let updateCount = 0;
    
    // Also check for users with inactive/stale status updates
    const staleMaybeOnlineQuery = query(
      collection(db, "users"),
      limit(50) // Check another 50 users that might have stale state
    );
    
    const staleMaybeOnlineSnapshot = await getDocs(staleMaybeOnlineQuery);
    console.log(`[CLEANUP] Checking ${staleMaybeOnlineSnapshot.size} additional users for stale status`);
    
    // Process users that are marked as unavailable (first group)
    for (const userDoc of staleUsersSnapshot.docs) {
      const userData = userDoc.data();
      
      // If user has a chatId, check if that chat is still active
      if (userData.currentChatId) {
        try {
          const chatDoc = await getDoc(doc(db, "chats", userData.currentChatId));
          
          if (!chatDoc.exists() || !chatDoc.data().isActive) {
            console.log(`[CLEANUP] User ${userData.userId} has reference to inactive chat ${userData.currentChatId}`);
            
            // Reset user status
            batch.update(doc(db, "users", userData.userId), {
              isAvailable: true,
              currentChatId: null,
              lastStatusUpdate: serverTimestamp(),
              lastCleanup: serverTimestamp()
            });
            
            updateCount++;
          }
        } catch (error) {
          console.error(`[CLEANUP] Error checking chat for user ${userData.userId}:`, error);
          
          // Reset user status anyway if error occurred checking the chat
          batch.update(doc(db, "users", userData.userId), {
            isAvailable: true,
            currentChatId: null,
            lastStatusUpdate: serverTimestamp(),
            lastCleanup: serverTimestamp(),
            cleanupReason: "Error checking chat"
          });
          
          updateCount++;
        }
      }
    }
    
    // Process potential users with stale timestamps (second group)
    for (const userDoc of staleMaybeOnlineSnapshot.docs) {
      const userData = userDoc.data();
      const userId = userData.userId;
      
      // Skip users we already processed in the first group
      if (staleUsersSnapshot.docs.some(doc => doc.id === userDoc.id)) {
        continue;
      }
      
      // Check if the user's lastStatusUpdate is stale
      if (userData.lastStatusUpdate) {
        const lastUpdateTime = userData.lastStatusUpdate.toMillis ? 
          userData.lastStatusUpdate.toMillis() : 
          typeof userData.lastStatusUpdate === 'number' ? 
            userData.lastStatusUpdate : Date.now();
            
        const tenMinutesAgo = Date.now() - 10 * 60 * 1000;
        
        if (lastUpdateTime < tenMinutesAgo) {
          console.log(`[CLEANUP] User ${userId} has stale status update from ${new Date(lastUpdateTime).toLocaleString()}`);
          
          // If user is unavailable with a chat ID, check and possibly clean up
          if (userData.currentChatId && !userData.isAvailable) {
            try {
              const chatDoc = await getDoc(doc(db, "chats", userData.currentChatId));
              
              if (!chatDoc.exists() || !chatDoc.data().isActive) {
                console.log(`[CLEANUP] User ${userId} has reference to inactive chat ${userData.currentChatId}`);
                
                // Reset user status
                batch.update(doc(db, "users", userId), {
                  isAvailable: true,
                  currentChatId: null,
                  lastStatusUpdate: serverTimestamp(),
                  lastCleanup: serverTimestamp(),
                  cleanupReason: "Stale session with inactive chat"
                });
                
                updateCount++;
              }
            } catch (error) {
              console.error(`[CLEANUP] Error checking chat for user ${userId}:`, error);
              
              // Reset user status
              batch.update(doc(db, "users", userId), {
                isAvailable: true,
                currentChatId: null,
                lastStatusUpdate: serverTimestamp(),
                lastCleanup: serverTimestamp(),
                cleanupReason: "Error checking chat in stale cleanup"
              });
              
              updateCount++;
            }
          }
        }
      }
      
      // If batch is getting full, commit it and start a new one
      if (updateCount >= 20) {
        await batch.commit();
        console.log(`[CLEANUP] Committed batch with ${updateCount} updates`);
        updateCount = 0;
      }
    }
    
    // Commit any remaining updates
    if (updateCount > 0) {
      await batch.commit();
      console.log(`[CLEANUP] Committed final batch with ${updateCount} updates`);
    } else {
      console.log(`[CLEANUP] No updates needed during cleanup`);
    }
    
    console.log(`[CLEANUP] Cleanup completed successfully`);
  } catch (error) {
    console.error(`[CLEANUP] Error cleaning up stale user states:`, error);
    throw error;
  }
};

// Get device ID from localStorage or create new one
export const getDeviceId = async (userId: string): Promise<string> => {
  if (typeof window !== 'undefined') {
    const storedDeviceId = localStorage.getItem(`anonchat_device_${userId}`);
    if (storedDeviceId) {
      return storedDeviceId;
    }
  }
  
  return registerDevice(userId);
};

export { firebaseApp, db, auth }; 