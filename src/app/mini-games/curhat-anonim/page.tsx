'use client';

import { useState, useEffect } from 'react';
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { auth, db } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { collection, addDoc, query, orderBy, limit, getDocs, serverTimestamp, where, doc, updateDoc } from 'firebase/firestore';
import Link from 'next/link';
import FilteringWords from '@/data/filteringWords';
import { getPermanentUserId, mapFirebaseIdToPermanentId } from '@/lib/userIdentifier';
const { debugTextFilter } = FilteringWords;

// Types for our data
interface Curhat {
  id: string;
  text: string;
  user_id: string;
  created_at: {
    seconds: number;
    nanoseconds: number;
  };
  client_timestamp?: string;
  view_count: number;
  comment_count: number;
  created_week: string;
  anonymousId: string;
}

// Fungsi untuk mendapatkan nomor minggu dari tahun
const getWeekNumber = (date: Date): string => {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + 4 - (d.getDay() || 7));
  const yearStart = new Date(d.getFullYear(), 0, 1);
  const weekNo = Math.ceil((((d.getTime() - yearStart.getTime()) / 86400000) + 1) / 7);
  return `${d.getFullYear()}-${weekNo.toString().padStart(2, '0')}`;
};

export default function CurhatAnonim() {
  // Use combined permanent ID and Firebase anonymous auth
  const permanentId = getPermanentUserId();
  const [userId, setUserId] = useState<string | null>(null);
  const [curhatText, setCurhatText] = useState('');
  const [curhatList, setCurhatList] = useState<Curhat[]>([]);
  const [topCurhatList, setTopCurhatList] = useState<Curhat[]>([]);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [topLoading, setTopLoading] = useState(false);
  const [success, setSuccess] = useState(false);
  const [fixingComments, setFixingComments] = useState(false);

  // Fungsi untuk sign in secara anonim
  useEffect(() => {
    const signInAnon = async () => {
      try {
        // First, check if we already have a user ID from permanent ID
        if (permanentId && !userId) {
          // Use permanent ID as a fallback if Firebase auth fails
          setUserId(permanentId);
        }

        // Still try to sign in with Firebase for proper permissions
        const userCredential = await signInAnonymously(auth);
        setUserId(userCredential.user.uid);
        
        // Store the relationship between Firebase UID and permanent ID
        if (typeof window !== 'undefined') {
          localStorage.setItem('firebase_auth_id', userCredential.user.uid);
          localStorage.setItem('user_id_map', JSON.stringify({
            firebaseId: userCredential.user.uid,
            permanentId: permanentId
          }));
        }
      } catch (error: Error | unknown) {
        const firebaseError = error as { code?: string; message: string };
        setError(`Gagal masuk secara anonim: ${firebaseError.message}`);
      }
    };

    if (!auth.currentUser) {
      signInAnon();
    } else {
      setUserId(auth.currentUser.uid);
    }
    
    // Load curhat list
    fetchCurhatan();
    
    // Load top weekly curhat
    fetchTopWeeklyCurhatan();
    
    // Fix comment counts if needed
    fixCommentCounts();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Fungsi untuk mengambil daftar curhat
  const fetchCurhatan = async () => {
    try {
      setLoading(true);
      
      // Periksa apakah collection sudah ada
      const curhatRef = collection(db, "curhatan");
      
      const curhatQuery = query(
        curhatRef,
        orderBy("created_at", "desc"),
        limit(20)
      );
      
      // console.log("Fetching curhatan...");
      const querySnapshot = await getDocs(curhatQuery);
      // console.log("Fetched curhatan:", querySnapshot.size);
      
      const curhatan: Curhat[] = [];
      
      querySnapshot.forEach((doc) => {
        const data = doc.data();
        curhatan.push({
          id: doc.id,
          ...data,
          // Handle jika created_at masih null (dokumen baru ditambahkan)
          created_at: data.created_at || { seconds: Date.now() / 1000, nanoseconds: 0 },
          // Tambahkan anonymous user identifier (hanya 5 karakter pertama dari UID)
          anonymousId: data.user_id ? data.user_id.substring(0, 5) : 'anon'
        } as Curhat);
      });
      
      setCurhatList(curhatan);
    } catch (error: Error | unknown) {
      const firebaseError = error as { code?: string; message: string };
      // console.error("Error fetching curhatan:", firebaseError.code, firebaseError.message);
      setError(`Gagal mengambil data: ${firebaseError.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk mengambil daftar curhat teratas mingguan
  const fetchTopWeeklyCurhatan = async () => {
    try {
      setTopLoading(true);
      
      // Get current week number
      const currentWeek = getWeekNumber(new Date());
      
      // Query untuk mendapatkan top curhatan minggu ini berdasarkan jumlah komentar
      const curhatRef = collection(db, "curhatan");
      const topQuery = query(
        curhatRef,
        // Filter by current week
        where("created_week", "==", currentWeek),
        // Order by comment_count
        orderBy("comment_count", "desc"),
        // Limit to 10 results
        limit(10)
      );
      
      // console.log("Fetching top weekly curhatan...");
      
      // Try-catch untuk handling jika index belum ada
      try {
        const querySnapshot = await getDocs(topQuery);
        // console.log("Fetched top curhatan:", querySnapshot.size);
        
        const topCurhatan: Curhat[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          topCurhatan.push({
            id: doc.id,
            ...data,
            created_at: data.created_at || { seconds: Date.now() / 1000, nanoseconds: 0 },
            anonymousId: data.user_id ? data.user_id.substring(0, 5) : 'anon'
          } as Curhat);
        });
        
        setTopCurhatList(topCurhatan);
      } catch (error: Error | unknown) {
        // Jika index belum dibuat, gunakan fallback (tanpa filter week)
        const firebaseError = error as { message: string };
        if (firebaseError.message && firebaseError.message.includes('requires an index')) {
          // console.log("Index for top weekly query is being built, using simpler fallback query");
          
          // Fallback query tanpa filter week
          const fallbackQuery = query(
            curhatRef,
            orderBy("comment_count", "desc"),
            limit(10)
          );
          
          const fallbackSnapshot = await getDocs(fallbackQuery);
          const fallbackData: Curhat[] = [];
          
          fallbackSnapshot.forEach((doc) => {
            const data = doc.data();
            fallbackData.push({
              id: doc.id,
              ...data,
              created_at: data.created_at || { seconds: Date.now() / 1000, nanoseconds: 0 },
              anonymousId: data.user_id ? data.user_id.substring(0, 5) : 'anon'
            } as Curhat);
          });
          
          setTopCurhatList(fallbackData);
        } else {
          throw error;
        }
      }
    } catch (error: Error | unknown) {
      const firebaseError = error as { code?: string; message: string };
      // console.error("Error fetching top curhatan:", firebaseError.code, firebaseError.message);
      setError(`Gagal mengambil data: ${firebaseError.message}`);
    } finally {
      setTopLoading(false);
    }
  };

  // Modifikasi bagian handleSubmitCurhat untuk handle error lebih baik dan use permanent ID
  const handleSubmitCurhat = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Advanced debugging
    const debugResult = debugTextFilter(curhatText);
    
    // Validasi
    if (curhatText.trim().length < 10) {
      setError('Curhat minimal 10 karakter');
      return;
    }
    
    if (curhatText.trim().length > 300) {
      setError('Curhat maksimal 300 karakter');
      return;
    }
    
    // Check for overall filtering result
    if (debugResult.isFiltered) {
      if (debugResult.reason.includes("Contains inappropriate word")) {
        setError(`Tolong jaga bahasa kamu ya! Kata "${debugResult.match}" tidak diperbolehkan.`);
      } else if (debugResult.reason.includes("Contains link")) {
        setError(`Dilarang menyertakan link atau URL dalam curhat. Ditemukan: "${debugResult.match}"`);
      } else if (debugResult.reason.includes("Contains address")) {
        setError(`Dilarang menyertakan informasi alamat dalam curhat. Ditemukan: "${debugResult.match}"`);
      } else if (debugResult.reason.includes("Contains coordinates")) {
        setError(`Dilarang menyertakan koordinat lokasi dalam curhat. Ditemukan: "${debugResult.match}"`);
      } else {
        setError('Pesan tidak dapat dikirim karena melanggar aturan konten kami.');
      }
      return;
    }
    
    // Use a consistent user ID - either from Firebase auth or permanent ID
    const effectiveUserId = userId || permanentId;
    
    if (!effectiveUserId) {
      setError('Terjadi kesalahan autentikasi. Refresh halaman dan coba lagi.');
      return;
    }
    
    // If we have a Firebase auth ID, map it to our permanent ID
    if (userId && userId !== permanentId) {
      mapFirebaseIdToPermanentId(userId);
    }
    
    try {
      setLoading(true);
      setError('');
      
      // console.log("Submitting curhat...");
      
      // Tambahkan timestamp client-side sebagai fallback
      // dan tetap gunakan serverTimestamp untuk timestamp yang akurat
      const curhatData = {
        user_id: effectiveUserId,
        text: curhatText,
        created_at: serverTimestamp(),
        client_timestamp: new Date().toISOString(),
        view_count: 0,
        comment_count: 0,
        created_week: getWeekNumber(new Date())
      };
      
      // Simpan ke Firestore
      await addDoc(collection(db, "curhatan"), curhatData);
      
      // Reset form & tampilkan pesan sukses
      setCurhatText('');
      setSuccess(true);
      
      // Refresh daftar curhat dengan delay kecil untuk memastikan serverTimestamp sudah diproses
      setTimeout(() => fetchCurhatan(), 500);
      
      // Hilangkan pesan sukses setelah 3 detik
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (error: Error | unknown) {
      const firebaseError = error as { code?: string; message: string };
      // console.error("Error adding curhat:", firebaseError.code, firebaseError.message);
      setError(`Gagal mengirim curhat: ${firebaseError.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Fungsi untuk memperbaiki comment count untuk setiap curhat
  const fixCommentCounts = async () => {
    try {
      setFixingComments(true);
      // console.log("Checking and fixing comment counts for posts...");
      
      // Get all curhatan
      const curhatRef = collection(db, "curhatan");
      const curhatSnapshot = await getDocs(curhatRef);
      
      for (const curhatDoc of curhatSnapshot.docs) {
        const curhatId = curhatDoc.id;
        
        // Count comments for this curhat
        const commentsQuery = query(
          collection(db, "comments"),
          where("curhat_id", "==", curhatId)
        );
        
        const commentsSnapshot = await getDocs(commentsQuery);
        const commentCount = commentsSnapshot.size;
        
        // Update the curhat document with the correct comment count
        await updateDoc(doc(db, "curhatan", curhatId), {
          comment_count: commentCount
        });
        
        // console.log(`Updated comment count for curhat ${curhatId}: ${commentCount} comments`);
      }
      
      // console.log("Comment count fix completed");
      
      // Refresh the lists after fixing
      await fetchCurhatan();
      await fetchTopWeeklyCurhatan();
    } catch (error: Error | unknown) {
      const firebaseError = error as { code?: string; message: string };
      setError(`Gagal mengirim curhat: ${firebaseError.message}`);
      // Just ignore errors silently in production
    } finally {
      setFixingComments(false);
    }
  };

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="max-w-5xl mx-auto px-4 sm:px-6 pt-32 pb-20">
        <h1 className="text-4xl sm:text-6xl font-bold text-white text-center mb-4">
          Curhat <span className="text-blue-500">Anonim</span>
        </h1>
        <p className="text-gray-300 text-center mb-6 max-w-3xl mx-auto">
          Tempat aman untuk mencurahkan isi hati tanpa khawatir identitasmu terungkap.
          Bagikan ceritamu dan dapatkan tanggapan dari orang lain.
        </p>
        <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-12 max-w-3xl mx-auto">
          <div className="flex items-start">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <p className="text-yellow-300 text-sm">
              <span className="font-medium">Peringatan:</span> Jangan bagikan informasi pribadi seperti nama lengkap, nomor telepon, alamat rumah, lokasi, atau data sensitif lainnya. Kami memblokir otomatis konten yang mengandung tautan, koordinat, dan alamat untuk keamananmu.
            </p>
          </div>
        </div>

        {/* Form Curhat */}
        <div className="bg-gradient-to-br from-blue-900/30 to-black border border-blue-500/20 rounded-lg p-6 mb-10">
          <h2 className="text-xl font-bold text-white mb-4">Tulis Curhatanmu</h2>
          
          <form onSubmit={handleSubmitCurhat}>
            <textarea
              className="w-full bg-black/70 text-white border border-blue-500/30 rounded-lg p-4 min-h-[120px] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Apa yang ingin kamu ceritakan hari ini? (Anonim)"
              value={curhatText}
              onChange={(e) => setCurhatText(e.target.value)}
              maxLength={300}
            />
            
            <div className="flex justify-between items-center mt-2 mb-4">
              <span className="text-gray-400 text-sm">
                {curhatText.length}/300 karakter
              </span>
              <div></div>
            </div>
            
            {error && (
              <div className="bg-red-500/20 border border-red-500/30 text-red-300 px-4 py-2 rounded-lg mb-4">
                {error}
              </div>
            )}
            
            {success && (
              <div className="bg-green-500/20 border border-green-500/30 text-green-300 px-4 py-2 rounded-lg mb-4">
                Curhatanmu berhasil dikirim!
              </div>
            )}
            
            <button
              type="submit"
              disabled={loading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {loading ? 'Mengirim...' : 'Kirim Curhat'}
            </button>
          </form>
        </div>
        
        {/* Daftar Curhat */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 pb-2 border-b border-blue-500 inline-block">
            Curhatan Terbaru
          </h2>
          
          {loading && curhatList.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-400 mt-4">Memuat curhatan...</p>
            </div>
          ) : curhatList.length === 0 ? (
            <div className="text-center py-10 text-gray-400">
              Belum ada curhatan. Jadilah yang pertama!
            </div>
          ) : (
            <div className="space-y-6">
              {curhatList.map((curhat) => (
                <div key={curhat.id} className="bg-gradient-to-br from-gray-900/40 to-black border border-gray-700/30 rounded-lg p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <div className="bg-blue-600 rounded-full w-8 h-8 flex items-center justify-center text-white font-medium mr-2">
                        {curhat.anonymousId ? curhat.anonymousId.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div>
                        <div className="text-gray-300 font-medium">Anonim-{curhat.anonymousId || 'user'}</div>
                        <div className="text-gray-500 text-xs">
                          {curhat.created_at ? new Date(curhat.created_at.seconds * 1000).toLocaleString() : 'Baru saja'}
                        </div>
                      </div>
                    </div>
                    <Link href={`/mini-games/curhat-anonim/${curhat.id}`} className="text-blue-500 text-sm hover:underline">
                      Lihat Komentar
                    </Link>
                  </div>
                  <p className="text-white">{curhat.text}</p>
                  <div className="flex mt-3 text-xs text-gray-500">
                    <div className="flex items-center mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {curhat.view_count || 0} dilihat
                    </div>
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      {curhat.comment_count || 0} komentar
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Top Weekly Curhatan */}
        <div className="mb-12">
          <h2 className="text-2xl font-bold text-white mb-6 pb-2 border-b border-purple-500 inline-block">
            Curhat Terpopuler Minggu Ini
          </h2>
          
          {topLoading && topCurhatList.length === 0 ? (
            <div className="text-center py-10">
              <div className="w-8 h-8 border-4 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
              <p className="text-gray-400 mt-4">Memuat curhatan populer...</p>
            </div>
          ) : topCurhatList.length === 0 ? (
            <div className="bg-gradient-to-br from-gray-900/30 to-black border border-gray-700/30 rounded-lg p-6 text-center">
              <p className="text-gray-400">Belum ada curhatan populer minggu ini.</p>
              <p className="text-gray-500 text-sm mt-2">Berkomentar pada curhatan untuk meningkatkan popularitasnya.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {topCurhatList.map((curhat) => (
                <div key={curhat.id} className="bg-gradient-to-br from-purple-900/30 to-black border border-purple-500/20 rounded-lg p-5">
                  <div className="flex justify-between items-start mb-3">
                    <div className="flex items-center">
                      <div className="bg-purple-600 rounded-full w-8 h-8 flex items-center justify-center text-white font-medium mr-2">
                        {curhat.anonymousId ? curhat.anonymousId.charAt(0).toUpperCase() : 'A'}
                      </div>
                      <div>
                        <div className="text-gray-300 font-medium">Anonim-{curhat.anonymousId || 'user'}</div>
                        <div className="text-gray-500 text-xs">
                          {curhat.created_at ? new Date(curhat.created_at.seconds * 1000).toLocaleString() : 'Baru saja'}
                        </div>
                      </div>
                    </div>
                    <Link href={`/mini-games/curhat-anonim/${curhat.id}`} className="text-purple-500 text-sm hover:underline">
                      Lihat Komentar
                    </Link>
                  </div>
                  <p className="text-white">{curhat.text}</p>
                  <div className="flex mt-3 text-xs text-gray-500">
                    <div className="flex items-center mr-4">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                      </svg>
                      {curhat.view_count || 0} dilihat
                    </div>
                    <div className="flex items-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
                      </svg>
                      {curhat.comment_count || 0} komentar
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
        
        <div className="text-center mt-12">
          {fixingComments && (
            <div className="mb-6 bg-blue-900/20 border border-blue-500/30 rounded-lg p-3 inline-flex items-center">
              <div className="w-4 h-4 border-2 border-blue-500 border-t-transparent rounded-full animate-spin mr-2"></div>
              <span className="text-blue-400 text-sm">Menyinkronkan jumlah komentar...</span>
            </div>
          )}
          
          <a
            href="/mini-games"
            className="inline-flex items-center text-gray-400 hover:text-white transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Mini Games
          </a>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 