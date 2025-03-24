"use client";

import { useState } from "react";
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { getFirestore, collection, query, where, getDocs, deleteDoc } from "firebase/firestore";
import { firebaseApp } from "@/lib/firebase";
import userIdentifier from "@/lib/userIdentifier";

export default function AnonChatCleanup() {
  const [loading, setLoading] = useState(false);
  const [deleted, setDeleted] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  const cleanupSessions = async () => {
    setLoading(true);
    setError(null);
    
    try {
      const db = getFirestore(firebaseApp);
      const userId = userIdentifier.getPermanentUserId();
      
      // Query for all sessions by this user
      const sessionsQuery = query(
        collection(db, "anon_sessions"),
        where("user_id", "==", userId)
      );
      
      const snapshot = await getDocs(sessionsQuery);
      
      if (snapshot.empty) {
        setSuccess(true);
        setDeleted(0);
        setLoading(false);
        return;
      }
      
      // Delete all sessions
      const deletePromises = snapshot.docs.map(doc => deleteDoc(doc.ref));
      await Promise.all(deletePromises);
      
      setDeleted(snapshot.docs.length);
      setSuccess(true);
    } catch (error) {
      console.error("Error cleaning up sessions:", error);
      setError("Terjadi kesalahan saat membersihkan data. Silakan coba lagi.");
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 pt-32 pb-20">
        <div className="bg-gradient-to-br from-green-900/40 to-black border border-green-500/30 rounded-2xl p-8 md:p-12">
          <h1 className="text-3xl md:text-4xl font-bold text-white mb-6">
            Pembersihan Data Chat
          </h1>
          
          <div className="text-gray-300 space-y-4 mb-8">
            <p>
              Halaman ini akan membersihkan semua data sesi chat anonim Anda dari server kami.
              Ini berguna jika Anda mengalami masalah dengan chat atau ingin menghapus semua riwayat chat.
            </p>
            <p className="text-yellow-400">
              <strong>Catatan penting:</strong> Tindakan ini tidak dapat dibatalkan. Semua sesi chat akan dihapus secara permanen.
            </p>
          </div>
          
          {error && (
            <div className="bg-red-900/60 border border-red-500/50 text-white py-3 px-4 rounded-lg mb-6">
              {error}
            </div>
          )}
          
          {success && (
            <div className="bg-green-900/60 border border-green-500/50 text-white py-3 px-4 rounded-lg mb-6">
              Berhasil membersihkan {deleted} sesi chat.
            </div>
          )}
          
          <div className="flex justify-between items-center">
            <Link 
              href="/mini-games/anon-chat" 
              className="text-gray-400 hover:text-white transition-colors flex items-center"
            >
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Kembali
            </Link>
            
            <button 
              onClick={cleanupSessions}
              disabled={loading}
              className={`px-6 py-3 rounded-lg font-medium flex items-center ${
                loading
                  ? "bg-gray-600 text-gray-300 cursor-not-allowed"
                  : "bg-gradient-to-r from-red-600 to-red-800 text-white hover:opacity-90 transition-all"
              }`}
            >
              {loading ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Membersihkan...
                </>
              ) : (
                <>
                  Bersihkan Semua Sesi Chat
                </>
              )}
            </button>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 