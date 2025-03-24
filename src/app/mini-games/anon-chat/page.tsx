"use client";

import { useState, useEffect, useCallback } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { getFirestore, query, collection, where, getDocs, deleteDoc, doc, updateDoc, setDoc, serverTimestamp, runTransaction } from "firebase/firestore";
import { firebaseApp } from "@/lib/firebase";
import userIdentifier from "@/lib/userIdentifier";
import enhancedAnonChat from "@/lib/enhancedAnonChat";

export default function AnonChatIntro() {
  const router = useRouter();
  const [gender, setGender] = useState<string | null>(null);
  const [lookingFor, setLookingFor] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const db = getFirestore(firebaseApp);

  // Create a new collection for matchmaking
  const matchmaking = collection(db, 'anon_matchmaking');

  // Clean up any stale sessions for this user
  const cleanupStaleSessions = useCallback(async () => {
    try {
      const userId = userIdentifier.getPermanentUserId();
      
      // Query for disconnected or old sessions by this user
      const staleSessions = query(
        collection(db, "anon_sessions"),
        where("user_id", "==", userId),
        where("status", "==", "disconnected")
      );
      
      const snapshot = await getDocs(staleSessions);
      
      // Delete all stale sessions
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
    } catch (error) {
      console.error("Error cleaning up stale sessions:", error);
    }
  }, [db]);

  // Use useCallback to prevent re-creation on every render
  const checkExistingSession = useCallback(async () => {
    try {
      const userId = userIdentifier.getPermanentUserId();
      
      // First clean up any disconnected sessions
      await cleanupStaleSessions();
      
      // Query for active sessions by this user
      const sessionsQuery = query(
        collection(db, "anon_sessions"),
        where("user_id", "==", userId),
        where("status", "in", ["waiting", "chatting"])
      );
      
      const snapshot = await getDocs(sessionsQuery);
      
      if (!snapshot.empty) {
        // User has an active session, redirect to the chat room
        const sessionId = snapshot.docs[0].id;
        const sessionData = snapshot.docs[0].data();
        
        // If they have an active session in chatting state, redirect them directly to the chat room
        if (sessionData.status === 'chatting') {
          setLoading(true);
          setTimeout(() => {
            router.push(`/mini-games/anon-chat/room?session=${sessionId}`);
          }, 300);
        } 
        // For waiting state, ask if they want to continue
        else if (sessionData.status === 'waiting') {
          if (confirm('Anda masih dalam pencarian lawan bicara. Lanjutkan pencarian?')) {
            setLoading(true);
            setTimeout(() => {
              router.push(`/mini-games/anon-chat/room?session=${sessionId}`);
            }, 300);
          } else {
            // If they don't want to continue, delete the session
            await deleteDoc(doc(db, "anon_sessions", sessionId));
          }
        }
      }
    } catch (error) {
      console.error("Error checking existing session:", error);
    }
  }, [router, cleanupStaleSessions, db]);

  // Check if user has an active session on component mount
  useEffect(() => {
    checkExistingSession();
  }, [checkExistingSession]);

  const handleStartChat = () => {
    if (!gender || !lookingFor) {
      alert("Silakan pilih gender dan preferensi lawan bicara terlebih dahulu!");
      return;
    }

    setLoading(true);
    
    // Clean up any stale sessions before starting a new one
    cleanupStaleSessions().then(() => {
      // Navigate to chat room with parameters and timestamp to ensure unique URL
      const timestamp = Date.now();
      router.push(`/mini-games/anon-chat/room?gender=${gender}&lookingFor=${lookingFor}&ts=${timestamp}`);
    }).catch(error => {
      console.error("Error cleaning up stale sessions:", error);
      // Continue with navigation anyway
      const timestamp = Date.now();
      router.push(`/mini-games/anon-chat/room?gender=${gender}&lookingFor=${lookingFor}&ts=${timestamp}`);
    });
  };


  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 pt-32 pb-20">
        <div className="bg-gradient-to-br from-green-900/40 to-black border border-green-500/30 rounded-2xl p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Anon Chat
          </h1>
          
          <div className="text-gray-300 space-y-4 mb-8">
            <p>
              Selamat datang di Anon Chat! Di sini kamu bisa mengobrol secara anonim dengan orang baru tanpa harus mengungkapkan identitas aslimu.
            </p>
            <p>
              Pilih preferensi gender dan lawan bicara yang kamu inginkan, lalu mulai mengobrol dengan orang yang dipilih secara acak berdasarkan preferensimu.
            </p>
            <p className="text-yellow-400">
              <strong>Catatan penting:</strong> Tetap jaga etika saat mengobrol. Jangan berbagi informasi pribadi dan laporkan pengguna yang tidak sesuai.
            </p>
          </div>
          
          <div className="space-y-6 mb-8">
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Pilih Gendermu:
              </h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setGender("male")}
                  className={`flex-1 py-3 px-4 rounded-lg transition-all ${
                    gender === "male" 
                      ? "bg-blue-600 text-white" 
                      : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
                  }`}
                >
                  Laki-laki
                </button>
                <button
                  onClick={() => setGender("female")}
                  className={`flex-1 py-3 px-4 rounded-lg transition-all ${
                    gender === "female" 
                      ? "bg-pink-600 text-white" 
                      : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
                  }`}
                >
                  Perempuan
                </button>
              </div>
            </div>
            
            <div>
              <h3 className="text-lg font-semibold text-white mb-3">
                Ingin Ngobrol Dengan:
              </h3>
              <div className="flex gap-4">
                <button
                  onClick={() => setLookingFor("male")}
                  className={`flex-1 py-3 px-4 rounded-lg transition-all ${
                    lookingFor === "male" 
                      ? "bg-blue-600 text-white" 
                      : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
                  }`}
                >
                  Laki-laki
                </button>
                <button
                  onClick={() => setLookingFor("female")}
                  className={`flex-1 py-3 px-4 rounded-lg transition-all ${
                    lookingFor === "female" 
                      ? "bg-pink-600 text-white" 
                      : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
                  }`}
                >
                  Perempuan
                </button>
                <button
                  onClick={() => setLookingFor("any")}
                  className={`flex-1 py-3 px-4 rounded-lg transition-all ${
                    lookingFor === "any" 
                      ? "bg-purple-600 text-white" 
                      : "bg-zinc-800 text-gray-300 hover:bg-zinc-700"
                  }`}
                >
                  Siapa saja
                </button>
              </div>
            </div>
          </div>
          
          <div className="flex justify-between items-center">
            <Link 
              href="/mini-games" 
              className="text-gray-400 hover:text-white transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kembali
            </Link>
            
            <motion.button 
              onClick={handleStartChat}
              disabled={!gender || !lookingFor || loading}
              whileHover={{ scale: loading ? 1 : 1.05 }}
              whileTap={{ scale: loading ? 1 : 0.95 }}
              className={`px-6 py-3 rounded-lg font-medium flex items-center ${
                !gender || !lookingFor || loading
                  ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-green-600 to-teal-600 text-white hover:opacity-90 transition-all"
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Mencari...
                </>
              ) : (
                <>
                  Mulai Chat
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </>
              )}
            </motion.button>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 