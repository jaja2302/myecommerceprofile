'use client';

import { useState, useEffect } from 'react';
import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { auth, db } from '@/lib/firebase';
import { signInAnonymously } from 'firebase/auth';
import { 
  doc, 
  getDoc, 
  collection, 
  addDoc, 
  query, 
  where, 
  orderBy, 
  getDocs, 
  serverTimestamp,
  updateDoc,
  increment
} from 'firebase/firestore';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import FilteringWords from '@/data/filteringWords';
const { containsKataKasar, containsLink, containsKoordinat, containsAlamat } = FilteringWords;

// Define types for our data
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
  created_week?: string;
  anonymousId: string;
}

interface Comment {
  id: string;
  curhat_id: string;
  user_id: string;
  text: string;
  created_at: {
    seconds: number;
    nanoseconds: number;
  };
  client_timestamp?: string;
  anonymousId: string;
}

export default function CurhatDetail() {
  const params = useParams();
  const curhatId = params.id as string;

  const [userId, setUserId] = useState<string | null>(null);
  const [curhat, setCurhat] = useState<Curhat | null>(null);
  const [comments, setComments] = useState<Comment[]>([]);
  const [commentText, setCommentText] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const [commentLoading, setCommentLoading] = useState(false);
  const [success, setSuccess] = useState(false);

  // Fetch curhat detail
  const fetchCurhatDetail = async () => {
    try {
      const curhatDocRef = doc(db, "curhatan", curhatId);
      const curhatDoc = await getDoc(curhatDocRef);
      
      if (!curhatDoc.exists()) {
        setError("Curhat tidak ditemukan");
        return;
      }
      
      const curhatData = curhatDoc.data();
      
      // Increment view count
      try {
        await updateDoc(curhatDocRef, {
          view_count: increment(1)
        });
        console.log("View count incremented for curhat:", curhatId);
      } catch (e) {
        console.error("Error incrementing view count:", e);
        // Continue even if view count update fails
      }
      
      setCurhat({
        id: curhatDoc.id,
        ...curhatData,
        // Update the view count locally for immediate UI update
        view_count: (curhatData.view_count || 0) + 1,
        created_at: curhatData.created_at || { seconds: Date.now() / 1000, nanoseconds: 0 },
        anonymousId: curhatData.user_id ? curhatData.user_id.substring(0, 5) : 'anon'
      } as Curhat);
    } catch (error: Error | unknown) {
      const firebaseError = error as { message: string };
      console.error("Error fetching curhat:", firebaseError);
      setError("Gagal memuat detail curhat");
    }
  };

  // Fetch comments
  const fetchComments = async () => {
    try {
      const commentsQuery = query(
        collection(db, "comments"),
        where("curhat_id", "==", curhatId),
        orderBy("created_at", "asc")
      );
      
      try {
        const querySnapshot = await getDocs(commentsQuery);
        const commentsData: Comment[] = [];
        
        querySnapshot.forEach((doc) => {
          const data = doc.data();
          commentsData.push({
            id: doc.id,
            ...data,
            created_at: data.created_at || { seconds: Date.now() / 1000, nanoseconds: 0 },
            anonymousId: data.user_id ? data.user_id.substring(0, 5) : 'anon'
          } as Comment);
        });
        
        setComments(commentsData);
      } catch (error: Error | unknown) {
        // Handle missing index error gracefully
        const firebaseError = error as { message: string };
        if (firebaseError.message && firebaseError.message.includes('requires an index')) {
          // Silencing the console.error to prevent cluttering the console
          console.log("Index is being built. Using fallback query...");
          // Try a simpler query without ordering
          const simpleQuery = query(
            collection(db, "comments"),
            where("curhat_id", "==", curhatId)
          );
          
          const simpleSnapshot = await getDocs(simpleQuery);
          const fallbackData: Comment[] = [];
          
          simpleSnapshot.forEach((doc) => {
            const data = doc.data();
            fallbackData.push({
              id: doc.id,
              ...data,
              created_at: data.created_at || { seconds: Date.now() / 1000, nanoseconds: 0 },
              anonymousId: data.user_id ? data.user_id.substring(0, 5) : 'anon'
            } as Comment);
          });
          
          // Sort client-side as a temporary solution until index is built
          fallbackData.sort((a, b) => {
            const timeA = a.created_at?.seconds || 0;
            const timeB = b.created_at?.seconds || 0;
            return timeA - timeB;
          });
          
          setComments(fallbackData);
          // Set a more friendly message that doesn't suggest an error
          setError("Komentar ditampilkan berdasarkan waktu pengiriman (sistem sedang ditingkatkan)");
        } else {
          // Rethrow if not an index error
          throw error;
        }
      }
    } catch (error: Error | unknown) {
      console.error("Error fetching comments:", error);
      setError("Gagal memuat komentar");
    }
  };

  // Sign in anonymously and fetch data
  useEffect(() => {
    const initPage = async () => {
      try {
        // Sign in anonymously if not already signed in
        if (!auth.currentUser) {
          const userCredential = await signInAnonymously(auth);
          setUserId(userCredential.user.uid);
        } else {
          setUserId(auth.currentUser.uid);
        }

        // Fetch curhat detail
        await fetchCurhatDetail();

        // Fetch comments
        await fetchComments();
      } catch (error: Error | unknown) {
        console.error("Error initializing page:", error);
        setError("Terjadi kesalahan dalam memuat halaman");
      } finally {
        setLoading(false);
      }
    };

    initPage();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [curhatId]);

  // Submit comment
  const handleSubmitComment = async (e: React.FormEvent) => {
    e.preventDefault();
    
    // Validation
    if (commentText.trim().length < 3) {
      setError('Komentar minimal 3 karakter');
      return;
    }
    
    if (commentText.trim().length > 200) {
      setError('Komentar maksimal 200 karakter');
      return;
    }
    
    if (containsKataKasar(commentText)) {
      setError('Tolong jaga bahasa kamu ya!');
      return;
    }
    
    // Validasi tambahan untuk keamanan
    if (containsLink(commentText)) {
      setError('Dilarang menyertakan link atau URL dalam komentar');
      return;
    }
    
    if (containsKoordinat(commentText)) {
      setError('Dilarang menyertakan koordinat lokasi dalam komentar');
      return;
    }
    
    if (containsAlamat(commentText)) {
      setError('Dilarang menyertakan informasi alamat dalam komentar');
      return;
    }
    
    if (!userId) {
      setError('Terjadi kesalahan autentikasi. Refresh halaman dan coba lagi.');
      return;
    }
    
    try {
      setCommentLoading(true);
      setError('');
      
      // Add comment to Firestore
      const commentData = {
        curhat_id: curhatId,
        user_id: userId,
        text: commentText,
        created_at: serverTimestamp(),
        client_timestamp: new Date().toISOString()
      };
      
      // Save comment
      await addDoc(collection(db, "comments"), commentData);
      
      // Increment comment count in curhat document
      try {
        const curhatDocRef = doc(db, "curhatan", curhatId);
        
        // Get current comment count first
        const curhatSnapshot = await getDoc(curhatDocRef);
        if (curhatSnapshot.exists()) {
          const curhatData = curhatSnapshot.data();
          const currentCommentCount = curhatData.comment_count || 0;
          
          // Update with the accurate count
          await updateDoc(curhatDocRef, {
            comment_count: currentCommentCount + 1
          });
          
          console.log(`Comment count incremented for curhat ${curhatId}: ${currentCommentCount + 1}`);
          
          // Update local state to reflect the new comment count
          if (curhat) {
            setCurhat({
              ...curhat,
              comment_count: currentCommentCount + 1
            });
          }
        } else {
          // Fallback to increment if document can't be read for some reason
          await updateDoc(curhatDocRef, {
            comment_count: increment(1)
          });
        }
      } catch (e) {
        console.error("Error incrementing comment count:", e);
        // Continue even if comment count update fails
      }
      
      // Reset form & show success message
      setCommentText('');
      setSuccess(true);
      
      // Refresh comments
      await fetchComments();
      
      // Hide success message after 3 seconds
      setTimeout(() => setSuccess(false), 3000);
      
    } catch (error: Error | unknown) {
      const firebaseError = error as { message: string };
      console.error("Error adding comment:", error);
      setError(`Gagal mengirim komentar: ${firebaseError.message}`);
    } finally {
      setCommentLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-20 text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto"></div>
          <p className="text-gray-300 mt-4">Memuat...</p>
        </div>
        <Footer />
      </div>
    );
  }

  if (error === "Curhat tidak ditemukan") {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-20 text-center">
          <h1 className="text-3xl font-bold text-white mb-6">Curhat tidak ditemukan</h1>
          <p className="text-gray-300 mb-8">Maaf, curhat yang kamu cari tidak tersedia.</p>
          <Link 
            href="/mini-games/curhat-anonim"
            className="px-6 py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
          >
            Kembali ke Curhat Anonim
          </Link>
        </div>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-20">
        <div className="mb-6">
          <Link 
            href="/mini-games/curhat-anonim"
            className="inline-flex items-center text-blue-400 hover:text-blue-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Curhat Anonim
          </Link>
        </div>
        
        {/* Curhat Detail */}
        <div className="bg-gradient-to-br from-blue-900/30 to-black border border-blue-500/20 rounded-lg p-6 mb-10">
          <div className="flex items-center mb-4">
            <div className="bg-blue-600 rounded-full w-10 h-10 flex items-center justify-center text-white font-medium mr-3">
              {curhat?.anonymousId ? curhat.anonymousId.charAt(0).toUpperCase() : 'A'}
            </div>
            <div>
              <div className="text-gray-300 font-medium">Anonim-{curhat?.anonymousId || 'user'}</div>
              <div className="text-gray-500 text-xs">
                {curhat?.created_at ? new Date(curhat.created_at.seconds * 1000).toLocaleString() : 'Baru saja'}
              </div>
            </div>
          </div>
          <p className="text-white text-lg mb-4">{curhat?.text}</p>
          
          {/* Stats */}
          <div className="flex text-xs text-gray-500 border-t border-gray-800 pt-3">
            <div className="flex items-center mr-4">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
              </svg>
              {curhat?.view_count || 0} dilihat
            </div>
            <div className="flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" />
              </svg>
              {curhat?.comment_count || 0} komentar
            </div>
          </div>
        </div>
        
        {/* Comments Section */}
        <div className="mb-10">
          <h2 className="text-2xl font-bold text-white mb-6 pb-2 border-b border-blue-500 inline-block">
            Komentar ({comments.length})
          </h2>
          
          {comments.length === 0 ? (
            <div className="bg-gray-900/40 border border-gray-700/30 rounded-lg p-5 text-center">
              <p className="text-gray-400">Belum ada komentar. Jadilah yang pertama!</p>
            </div>
          ) : (
            <div className="space-y-4">
              {comments.map((comment) => (
                <div key={comment.id} className="bg-gray-900/40 border border-gray-700/30 rounded-lg p-4">
                  <div className="flex items-center mb-3">
                    <div className="bg-gray-700 rounded-full w-8 h-8 flex items-center justify-center text-white font-medium mr-2">
                      {comment.anonymousId ? comment.anonymousId.charAt(0).toUpperCase() : 'A'}
                    </div>
                    <div>
                      <div className="text-gray-300 text-sm font-medium">Anonim-{comment.anonymousId || 'user'}</div>
                      <div className="text-gray-500 text-xs">
                        {comment.created_at ? new Date(comment.created_at.seconds * 1000).toLocaleString() : 'Baru saja'}
                      </div>
                    </div>
                  </div>
                  <p className="text-white pl-10">{comment.text}</p>
                </div>
              ))}
            </div>
          )}
        </div>
        
        {/* Add Comment Form */}
        <div className="bg-gradient-to-br from-blue-900/20 to-black border border-blue-500/20 rounded-lg p-6">
          <h3 className="text-xl font-bold text-white mb-4">Tambahkan Komentar</h3>
          
          <div className="bg-yellow-500/10 border border-yellow-500/30 rounded-lg p-3 mb-4">
            <div className="flex items-start">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-yellow-500 mr-2 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
              </svg>
              <p className="text-yellow-300 text-sm">
                <span className="font-medium">Peringatan:</span> Jangan bagikan informasi pribadi dalam komentar. Semua konten yang mengandung tautan, koordinat, dan alamat akan diblokir otomatis.
              </p>
            </div>
          </div>
          
          <form onSubmit={handleSubmitComment}>
            <textarea
              className="w-full bg-black/70 text-white border border-blue-500/30 rounded-lg p-4 min-h-[80px] focus:outline-none focus:ring-2 focus:ring-blue-500/50"
              placeholder="Tulis komentarmu di sini..."
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              maxLength={200}
            />
            
            <div className="flex justify-between items-center mt-2 mb-4">
              <span className="text-gray-400 text-sm">
                {commentText.length}/200 karakter
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
                Komentarmu berhasil dikirim!
              </div>
            )}
            
            <button
              type="submit"
              disabled={commentLoading}
              className="bg-blue-600 hover:bg-blue-700 text-white font-medium py-2 px-6 rounded-lg transition-colors disabled:opacity-50"
            >
              {commentLoading ? 'Mengirim...' : 'Kirim Komentar'}
            </button>
          </form>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 