import { NextRequest, NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { 
  collection, 
  getDocs, 
  writeBatch,
  query,
  limit
} from 'firebase/firestore';

// Daftar koleksi yang perlu dihapus (berdasarkan kode sebelumnya)
const COLLECTIONS = [
  'browserTokens',
  'chatRooms',
  'chatSessions',
  'comments',
  'curhatan',
  'waitingRooms'
];

// Fungsi untuk menghapus semua dokumen dalam koleksi tertentu
async function clearCollection(collectionName: string) {
  const collectionRef = collection(db, collectionName);
  let docsDeleted = 0;
  
  try {
    // Kita akan menghapus dokumen dalam batch untuk efisiensi
    // Firebase hanya mendukung hingga 500 operasi per batch
    const BATCH_SIZE = 250;
    
    let hasMoreDocs = true;
    
    while (hasMoreDocs) {
      // Ambil sejumlah dokumen terbatas
      const q = query(collectionRef, limit(BATCH_SIZE));
      const querySnapshot = await getDocs(q);
      
      // Jika tidak ada dokumen yang tersisa, keluar dari loop
      if (querySnapshot.empty) {
        hasMoreDocs = false;
        break;
      }
      
      // Buat batch baru
      const batch = writeBatch(db);
      
      // Tambahkan delete operation untuk setiap dokumen
      querySnapshot.forEach((doc) => {
        batch.delete(doc.ref);
        docsDeleted++;
      });
      
      // Jalankan batch
      await batch.commit();
      
      // Periksa apakah masih ada dokumen tersisa
      if (querySnapshot.size < BATCH_SIZE) {
        hasMoreDocs = false;
      }
    }
    
    return { 
      collection: collectionName, 
      docsDeleted,
      status: 'success' 
    };
    
  } catch (error) {
    console.error(`Error clearing collection ${collectionName}:`, error);
    return { 
      collection: collectionName, 
      docsDeleted,
      status: 'error',
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Fungsi untuk menghapus subcollection dari chatRooms
async function clearChatRoomMessages() {
  const chatRoomsRef = collection(db, 'chatRooms');
  const chatRoomsSnapshot = await getDocs(chatRoomsRef);
  let messagesDeleted = 0;
  
  try {
    // Untuk setiap chat room, hapus subcollection messages
    for (const chatRoom of chatRoomsSnapshot.docs) {
      const messagesRef = collection(db, 'chatRooms', chatRoom.id, 'messages');
      const messagesSnapshot = await getDocs(messagesRef);
      
      // Jika ada pesan, hapus dalam batch
      if (!messagesSnapshot.empty) {
        const batch = writeBatch(db);
        
        messagesSnapshot.forEach((doc) => {
          batch.delete(doc.ref);
          messagesDeleted++;
        });
        
        await batch.commit();
      }
    }
    
    return {
      collection: 'chatRooms/messages (subcollection)',
      docsDeleted: messagesDeleted,
      status: 'success'
    };
    
  } catch (error) {
    console.error(`Error clearing chat room messages:`, error);
    return { 
      collection: 'chatRooms/messages (subcollection)', 
      docsDeleted: messagesDeleted,
      status: 'error',
      error: error instanceof Error ? error.message : String(error) 
    };
  }
}

// Validasi token sederhana
const isValidToken = (token: string | null) => {
  // Dalam produksi, gunakan token yang lebih kuat dan tersimpan di env vars
  // Ini hanya untuk development
  const devToken = process.env.DEBUG_TOKEN || 'dev-debug-token';
  return token === devToken;
};

export async function GET(request: NextRequest) {
  // Cek apakah ini development environment
  if (process.env.NODE_ENV !== 'development') {
    return NextResponse.json(
      { error: 'This endpoint is only available in development mode' },
      { status: 403 }
    );
  }
  
  // Validasi token
  const token = request.nextUrl.searchParams.get('token');
  if (!isValidToken(token)) {
    return NextResponse.json(
      { error: 'Invalid token' },
      { status: 401 }
    );
  }
  
  try {
    // Kumpulkan hasil dari setiap operasi pembersihan
    const results = [];
    
    // Bersihkan subcollection messages terlebih dahulu
    const messagesResult = await clearChatRoomMessages();
    results.push(messagesResult);
    
    // Kemudian bersihkan koleksi utama
    for (const collectionName of COLLECTIONS) {
      const result = await clearCollection(collectionName);
      results.push(result);
    }
    
    // Tampilkan total yang dihapus
    const totalDeleted = results.reduce((total, result) => total + result.docsDeleted, 0);
    
    return NextResponse.json({
      success: true,
      message: `Successfully cleared ${totalDeleted} documents from all collections`,
      details: results
    });
    
  } catch (error) {
    console.error('Error clearing database:', error);
    return NextResponse.json(
      { 
        success: false, 
        error: 'An error occurred while clearing the database',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
} 