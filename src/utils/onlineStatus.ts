// utils/onlineStatus.ts
import { getFirestore, doc, updateDoc, getDoc, DocumentData, serverTimestamp } from "firebase/firestore";
import { getDatabase, ref, set, onDisconnect as rtdbOnDisconnect, serverTimestamp as rtdbServerTimestamp } from "firebase/database";


// This utility helps track online status using both Firestore and Realtime Database
// Realtime DB is better for presence but Firestore works well with the rest of our app

interface FirestoreStatus {
  isOnline: boolean;
  lastSeen: any; // We use any for serverTimestamp() return value
}

interface RtdbStatus {
  state: 'online' | 'offline';
  lastChanged: Object;
}

interface StatusUpdater {
  update(): Promise<any[]>;
}

export const setupOnlineStatus = (userId: string | undefined): (() => void) | null => {
  if (!userId) return null;
  
  // Get both database references
  const firestore = getFirestore();
  const rtdb = getDatabase();
  
  // Set up Firestore presence
  const userDocRef = doc(firestore, "users", userId);
  updateDoc(userDocRef, {
    lastSeen: serverTimestamp(),
    isOnline: true
  }).catch(error => console.error("Error updating online status:", error));
  
  // Set up Realtime Database presence (more efficient for online status)
  const userStatusRef = ref(rtdb, `/status/${userId}`);
  const userStatusFirestoreRef = doc(firestore, "status", userId);
  
  // When user goes offline
  const setOfflineStatus = (): StatusUpdater => {
    // Update Firestore
    const fireStoreStatus: FirestoreStatus = {
      isOnline: false,
      lastSeen: serverTimestamp()
    };
    
    // Update Realtime DB
    const rtdbStatus: RtdbStatus = {
      state: 'offline',
      lastChanged: rtdbServerTimestamp()
    };
    
    return {
      update() {
        return Promise.all([
          updateDoc(userDocRef, { isOnline: false, lastSeen: serverTimestamp() }),
          updateDoc(userStatusFirestoreRef, { isOnline: false, lastSeen: serverTimestamp() }),
          set(userStatusRef, rtdbStatus)
        ]);
      }
    };
  };
  
  // When user comes online
  const setOnlineStatus = (): StatusUpdater => {
    // Update Firestore
    const firestoreStatus: FirestoreStatus = {
      isOnline: true,
      lastSeen: serverTimestamp()
    };
    
    // Update Realtime DB
    const rtdbStatus: RtdbStatus = {
      state: 'online',
      lastChanged: rtdbServerTimestamp()
    };
    
    return {
      update() {
        return Promise.all([
          updateDoc(userDocRef, { isOnline: true, lastSeen: serverTimestamp() }),
          updateDoc(userStatusFirestoreRef, { isOnline: true, lastSeen: serverTimestamp() }),
          set(userStatusRef, rtdbStatus)
        ]);
      }
    };
  };
  
  // Set up disconnect hooks
  const onlineRef = setOnlineStatus();
  onlineRef.update().catch(error => console.error("Error setting online status:", error));
  
  // When user disconnects
  rtdbOnDisconnect(userStatusRef).set({
    state: 'offline',
    lastChanged: rtdbServerTimestamp()
  });
  
  // Handle browser events
  const handleWindowClose = () => {
    const offlineRef = setOfflineStatus();
    offlineRef.update().catch(error => console.error("Error setting offline status:", error));
  };
  
  window.addEventListener('beforeunload', handleWindowClose);
  
  // Return cleanup function
  return () => {
    window.removeEventListener('beforeunload', handleWindowClose);
    handleWindowClose();
  };
};

// Hook to get a user's online status
export const getUserOnlineStatus = async (userId: string): Promise<boolean> => {
  const firestore = getFirestore();
  const userStatusRef = doc(firestore, "status", userId);
  
  try {
    const statusDoc = await getDoc(userStatusRef);
    if (statusDoc.exists()) {
      const data = statusDoc.data() as FirestoreStatus;
      return data.isOnline;
    }
    return false;
  } catch (error) {
    console.error("Error getting user online status:", error);
    return false;
  }
};