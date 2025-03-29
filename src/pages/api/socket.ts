import { Server as ServerIO } from 'socket.io'
import type { NextApiRequest } from 'next'
import { v4 as uuidv4 } from 'uuid'
import type { Server as NetServer } from 'http'
import type { Socket as NetSocket } from 'net'
import { NextApiResponseServerIO } from '@/types/socket'

// Memperluas interface NextApiResponse untuk mendukung Socket.io
export interface NextApiResponseWithSocket {
  socket: NetSocket & {
    server: NetServer & {
      io?: ServerIO;
    };
  };
  end: () => void;
  status: (statusCode: number) => NextApiResponseWithSocket;
}

// Tipe untuk session chat
interface ChatSession {
  id: string
  userId: string
  gender: string
  lookingFor: string
  partnerId: string | null
  status: 'waiting' | 'chatting' | 'disconnected'
  lastActivity: number
}

// Menyimpan sessions dalam memory (untuk development)
// Untuk produksi, gunakan database seperti Redis
const chatSessions: Record<string, ChatSession> = {}
const userSessions: Record<string, string> = {} // userId -> sessionId

// Fungsi untuk membersihkan sessions yang tidak aktif
const cleanupStaleSessions = () => {
  const now = Date.now()
  Object.entries(chatSessions).forEach(([id, session]) => {
    // Session tidak aktif selama 5 menit
    if (now - session.lastActivity > 5 * 60 * 1000) {
      // Jika chatting, putus koneksi dengan partner
      if (session.status === 'chatting' && session.partnerId) {
        const partnerSession = chatSessions[session.partnerId]
        if (partnerSession) {
          partnerSession.status = 'disconnected'
          partnerSession.partnerId = null
        }
      }
      // Hapus session
      delete chatSessions[id]
      delete userSessions[session.userId]
    }
  })
}

// Jalankan cleanup setiap menit
let cleanupInterval: NodeJS.Timeout | null = null

// Variabel untuk mencegah race conditions
let isInitializing = false;
let initializationTimeout: NodeJS.Timeout | null = null;

// Helper untuk mengatur socket server
const SocketHandler = (req: NextApiRequest, res: NextApiResponseServerIO) => {
  console.log('Socket handler called');
  
  // Make sure we're running in a proper API route context
  if (typeof window !== 'undefined') {
    console.error('Socket handler called in browser context');
    return { error: 'Cannot run socket server in browser context' };
  }
  
  if (req.method !== 'GET') {
    console.log(`Invalid method: ${req.method}`);
    res.status(400).json({ error: 'Invalid method' });
    return;
  }

  // Pastikan bahwa res.socket tidak null
  if (!res.socket?.server) {
    console.error('Socket server not found');
    res.status(500).end();
    return;
  }

  // Periksa apakah Socket.io sudah diinisialisasi
  if (res.socket.server.io) {
    console.log('Socket.io already initialized');
    res.end();
    return;
  }

  // Periksa race condition
  if (isInitializing) {
    console.log('Socket initialization already in progress');
    res.end();
    return;
  }

  // Set flag bahwa kita sedang menginisialisasi
  isInitializing = true;

  // Buat timeout untuk mencegah hanging jika terjadi error
  initializationTimeout = setTimeout(() => {
    console.error('Socket initialization timeout');
    isInitializing = false;
    res.status(500).end();
  }, 5000);

  try {
    console.log('Setting up socket.io server');
    const io = new ServerIO(res.socket.server, {
      path: '/api/socket',
      addTrailingSlash: false,
      cors: {
        origin: '*', // Allow all origins
        methods: ['GET', 'POST', 'OPTIONS'],
        credentials: true,
        allowedHeaders: ['Content-Type', 'Authorization', 'X-Client-Id', 'X-Client-Time'],
      },
      allowEIO3: true, // Allow compatibility with older clients
      connectTimeout: 30000, // Reduced from 60000 to 30000ms
      transports: ['polling', 'websocket'], // Try polling first as it's more reliable for initial connection
      pingTimeout: 60000, // Reduced from 120000 to 60000ms
      pingInterval: 25000, // Increased from 20000 to 25000ms
      cookie: false, // Disable socket.io cookies to avoid SameSite issues
      // Increase socket server stability
      maxHttpBufferSize: 1e8, // 100 MB
      perMessageDeflate: {
        threshold: 1024, // 1KB
      },
      // Engine.IO options
      upgradeTimeout: 15000, // Reduced from 30000 to 15000ms
    });
    
    // Simpan instance io ke server untuk digunakan kembali
    res.socket.server.io = io;

    // Mulai interval pembersihan sesi
    if (!cleanupInterval) {
      cleanupInterval = setInterval(cleanupStaleSessions, 60 * 1000);
    }

    // Mulai mendengarkan koneksi
    io.on('connection', socket => {
      console.log(`Client connected: ${socket.id} from ${socket.request.headers.origin || 'unknown origin'}`);
      
      // Track the user ID for this socket connection
      let currentUserId: string | null = null;
      
      // Event test untuk mengecek koneksi
      socket.on('test', (data) => {
        console.log(`Test event received from client ${socket.id}:`, data);
        if (data && data.userId) {
          currentUserId = data.userId;
          console.log(`Associating socket ${socket.id} with user ${currentUserId}`);
        }
        socket.emit('test_response', { success: true, message: 'Connection successful', serverTime: Date.now() });
      });
      
      // Tangani koneksi
      socket.on('create_session', (data: { userId: string, gender: string, lookingFor: string }) => {
        try {
          const { userId, gender, lookingFor } = data;
          
          console.log(`Creating session for user ${userId}, gender: ${gender}, looking for: ${lookingFor}`);
          
          // Hapus semua session lama untuk user ini dan pasangannya
          Object.entries(chatSessions).forEach(([id, session]) => {
            if (session.userId === userId) {
              console.log(`Removing old session ${id} for user ${userId}`);
              
              // If this user was in a chat with someone, notify the partner
              if (session.status === 'chatting' && session.partnerId) {
                const partnerSessions = Object.values(chatSessions).filter(s => 
                  s.userId === session.partnerId && s.partnerId === userId
                );
                
                partnerSessions.forEach(partnerSession => {
                  console.log(`Notifying partner ${partnerSession.userId} that chat has ended`);
                  io.to(partnerSession.id).emit('chat_ended', {
                    message: 'Partner telah meninggalkan chat'
                  });
                  
                  // Update partner session
                  partnerSession.status = 'disconnected';
                  partnerSession.partnerId = null;
                });
              }
              
              // Remove the old session
              delete chatSessions[id];
              // Leave the socket room for this session
              socket.leave(id);
            }
          });
          
          // Remove user from map
          delete userSessions[userId];
          
          // Buat session baru
          const sessionId = uuidv4();
          const session: ChatSession = {
            id: sessionId,
            userId,
            gender,
            lookingFor,
            partnerId: null,
            status: 'waiting',
            lastActivity: Date.now()
          };
          
          chatSessions[sessionId] = session;
          userSessions[userId] = sessionId;
          
          // Track this sessionId for the current socket
          currentUserId = userId;
          
          // Join room socket dengan ID session
          console.log(`Joining socket ${socket.id} to room ${sessionId}`);
          socket.join(sessionId);
          
          // Beri tahu client
          socket.emit('session_created', { sessionId });
          
          console.log(`Session ${sessionId} created successfully for user ${userId}`);
          
          // Don't automatically search for a partner here
          // Let the client explicitly call find_partner with the session ID
        } catch (err) {
          console.error('Error creating session:', err);
          socket.emit('error', { message: 'Error creating session' });
        }
      });
      
      // Handle saat user mencari partner
      socket.on('find_partner', (data: { sessionId: string, gender: string, lookingFor: string }) => {
        try {
          const { sessionId, gender, lookingFor } = data;
          
          // Make sure we're in the right room
          console.log(`Socket ${socket.id} joining room ${sessionId} for find_partner`);
          socket.join(sessionId);
          
          // Check if session exists and update current user if needed
          const session = chatSessions[sessionId];
          if (session) {
            currentUserId = session.userId;
            console.log(`Updated currentUserId to ${currentUserId} for socket ${socket.id}`);
          }
          
          findChatPartner(io, sessionId, gender, lookingFor);
        } catch (err) {
          console.error('Error finding partner:', err);
          socket.emit('error', { message: 'Error finding partner' });
        }
      });
      
      // Handle saat user mengirim pesan
      socket.on('send_message', (data: { sessionId: string, message: string }) => {
        try {
          const { sessionId, message } = data;
          const session = chatSessions[sessionId];
          
          if (!session) {
            console.error(`Cannot send message: Session ${sessionId} not found`);
            socket.emit('error', { message: 'Tidak dapat mengirim pesan: sesi tidak ditemukan' });
            return;
          }
          
          if (session.status !== 'chatting' || !session.partnerId) {
            console.error(`Cannot send message: Session ${sessionId} not in chatting state or no partner. Status: ${session.status}, partnerId: ${session.partnerId}`);
            socket.emit('error', { message: 'Tidak dapat mengirim pesan: tidak ada chat aktif' });
            return;
          }
          
          // Find all sessions where this partner is chatting
          console.log(`Looking for partner session with userId = ${session.partnerId}`);
          
          // Log all sessions for debugging
          console.log('All active chat sessions:');
          Object.entries(chatSessions).forEach(([id, s]) => {
            if (s.status === 'chatting') {
              console.log(`- Session ${id}: user=${s.userId}, partner=${s.partnerId}, status=${s.status}`);
            }
          });
          
          // Find partner's session(s) - there should be exactly one matching session
          const partnerSessions = Object.values(chatSessions).filter(s => 
            s.userId === session.partnerId && 
            s.status === 'chatting' && 
            s.partnerId === session.userId
          );
          
          if (partnerSessions.length === 0) {
            console.error(`Cannot send message: No partner session found for ${session.partnerId}`);
            socket.emit('error', { message: 'Tidak dapat mengirim pesan: partner tidak ditemukan' });
            return;
          }
          
          // Use the first matching partner session
          const partnerSession = partnerSessions[0];
          console.log(`Found partner session: ${partnerSession.id}`);
          
          // Update last active
          session.lastActivity = Date.now();
          
          // Generate a unique message ID
          const messageId = uuidv4();
          
          console.log(`Sending message from ${session.userId} to ${session.partnerId}`);
          
          // Create message for the sender - this is marked as from 'user'
          const senderMessageObj = {
            id: `${messageId}-sender`,
            text: message,
            sender: 'user',  // This is what the UI expects - 'user', 'partner', or 'system'
            timestamp: Date.now()
          };
          
          // Create message for the recipient - this is marked as from 'partner'
          const recipientMessageObj = {
            id: `${messageId}-recipient`,
            text: message,
            sender: 'partner',  // This is what the UI expects - 'user', 'partner', or 'system'
            timestamp: Date.now()
          };
          
          // Log message delivery
          console.log(`Delivering message to sender room: ${sessionId}`);
          console.log(`Delivering message to recipient room: ${partnerSession.id}`);
          
          // Debug emit status
          const senderRoomCount = io.sockets.adapter.rooms.get(sessionId)?.size || 0;
          const receiverRoomCount = io.sockets.adapter.rooms.get(partnerSession.id)?.size || 0;
          console.log(`Sender room ${sessionId} has ${senderRoomCount} sockets`);
          console.log(`Receiver room ${partnerSession.id} has ${receiverRoomCount} sockets`);
          
          // Send to the sender (shows as their own message)
          io.to(sessionId).emit('new_message', senderMessageObj);
          
          // Send to the recipient (shows as message from partner)
          io.to(partnerSession.id).emit('new_message', recipientMessageObj);
        } catch (err) {
          console.error('Error sending message:', err);
          socket.emit('error', { message: 'Error sending message' });
        }
      });
      
      // Handle saat user memutus chat
      socket.on('end_chat', (data: { sessionId: string }) => {
        try {
          const { sessionId } = data;
          
          // Log the request with more detail
          console.log(`[END_CHAT] Received end_chat request for session ${sessionId}`);
          
          const session = chatSessions[sessionId];
          
          if (!session) {
            console.log(`[END_CHAT] Session ${sessionId} not found, cannot end chat`);
            socket.emit('error', { message: 'Session not found' });
            return;
          }
          
          console.log(`[END_CHAT] Processing end_chat for session ${sessionId}, user ${session.userId}, status: ${session.status}, partner: ${session.partnerId}`);
          
          // Jika sedang chatting, putus koneksi dengan partner
          if (session.status === 'chatting' && session.partnerId) {
            console.log(`[END_CHAT] Looking for partner sessions for user ${session.partnerId}`);
            
            // Log all sessions for debugging
            console.log('[END_CHAT] All active chat sessions:');
            Object.entries(chatSessions).forEach(([id, s]) => {
              if (s.status === 'chatting') {
                console.log(`- Session ${id}: user=${s.userId}, partner=${s.partnerId}, status=${s.status}`);
              }
            });
            
            // Find all partner sessions - there should be exactly one where this partner is active
            const partnerSessions = Object.values(chatSessions).filter(s => 
              s.userId === session.partnerId && 
              s.status === 'chatting' && 
              s.partnerId === session.userId
            );
            
            console.log(`[END_CHAT] Found ${partnerSessions.length} partner sessions`);
            
            partnerSessions.forEach(partnerSession => {
              console.log(`[END_CHAT] Notifying partner in session ${partnerSession.id} that chat has ended`);
              
              // Update partner session
              partnerSession.status = 'disconnected';
              partnerSession.partnerId = null;
              
              // Debug emit status
              const partnerRoomCount = io.sockets.adapter.rooms.get(partnerSession.id)?.size || 0;
              console.log(`[END_CHAT] Partner room ${partnerSession.id} has ${partnerRoomCount} sockets`);
              
              // Use broadcast to ensure all sockets in the room get the message
              io.to(partnerSession.id).emit('chat_ended', {
                message: 'Partner telah mengakhiri chat'
              });
              
              // Emit a system message about the chat ending
              io.to(partnerSession.id).emit('new_message', {
                id: `system-chat-ended-${Date.now()}`,
                text: 'Your chat partner has ended the conversation',
                sender: 'system',
                timestamp: Date.now()
              });
            });
          } else {
            console.log(`[END_CHAT] Session ${sessionId} is not in chatting state or has no partner`);
          }
          
          // Ubah status session
          session.status = 'disconnected';
          session.partnerId = null;
          
          // Beri tahu user bahwa chat telah berakhir
          socket.emit('chat_ended', { message: 'Chat telah berakhir' });
          
          // Log completion
          console.log(`[END_CHAT] Successfully ended chat for session ${sessionId}`);
        } catch (err) {
          console.error('[END_CHAT] Error ending chat:', err);
          socket.emit('error', { message: 'Error ending chat' });
        }
      });
      
      // Handle disconnect
      socket.on('disconnect', () => {
        console.log(`Client disconnected: ${socket.id}`);
        
        // Find sessions associated with this socket
        const sessionsToCleanup: string[] = [];
        
        // This is just a best-effort approach since we don't store socket.id in sessions
        Object.entries(chatSessions).forEach(([sessionId]) => {
          // If we find a session that might be associated with this socket
          try {
            // We can check if the socket is in the room for this session
            if (socket.rooms && socket.rooms.has(sessionId)) {
              console.log(`Found session ${sessionId} for disconnected socket ${socket.id}`);
              sessionsToCleanup.push(sessionId);
            }
          } catch (e) {
            console.error(`Error checking socket room for session ${sessionId}:`, e);
            // Ignore errors in socket room checking
          }
        });
        
        // Clean up identified sessions
        sessionsToCleanup.forEach(sessionId => {
          try {
            const session = chatSessions[sessionId];
            if (!session) return;
            
            console.log(`Cleaning up session ${sessionId} for user ${session.userId}`);
            
            // If this user was in a chat with someone, notify the partner
            if (session.status === 'chatting' && session.partnerId) {
              const partnerSessions = Object.values(chatSessions).filter(s => 
                s.userId === session.partnerId && s.partnerId === session.userId
              );
              
              partnerSessions.forEach(partnerSession => {
                console.log(`Notifying partner ${partnerSession.userId} that chat has ended due to disconnection`);
                io.to(partnerSession.id).emit('chat_ended', {
                  message: 'Partner telah terputus dari chat'
                });
                
                // Update partner session
                partnerSession.status = 'disconnected';
                partnerSession.partnerId = null;
              });
            }
            
            // Mark session as disconnected
            session.status = 'disconnected';
            session.partnerId = null;
          } catch (error) {
            console.error(`Error cleaning up session ${sessionId}:`, error);
          }
        });
      });

      // Heartbeat untuk memastikan koneksi tetap hidup
      socket.on('heartbeat', (data: { sessionId?: string }) => {
        try {
          const { sessionId } = data;
          if (sessionId && chatSessions[sessionId]) {
            chatSessions[sessionId].lastActivity = Date.now();
          }
          socket.emit('heartbeat_response', { timestamp: Date.now() });
        } catch (err) {
          console.error('Error handling heartbeat:', err);
        }
      });
    });

    // Bersihkan timeout
    if (initializationTimeout) {
      clearTimeout(initializationTimeout);
      initializationTimeout = null;
    }

    // Reset flag
    isInitializing = false;

    // Selesaikan request
    res.end();

    // Log server information for debugging
    console.log('Socket.io server initialized with URL:', req.headers.host);
  } catch (e) {
    console.error('Socket initialization error:', e);

    // Reset flag
    isInitializing = false;

    // Bersihkan timeout
    if (initializationTimeout) {
      clearTimeout(initializationTimeout);
      initializationTimeout = null;
    }

    res.status(500).end();
  }
};

// Fungsi untuk mencari partner chat
function findChatPartner(io: ServerIO, sessionId: string, gender: string, lookingFor: string) {
  try {
    const session = chatSessions[sessionId];
    if (!session || session.status !== 'waiting') {
      console.log(`Cannot find partner: Session ${sessionId} is not in waiting state or does not exist`);
      io.to(sessionId).emit('error', { message: 'Sesi tidak valid atau tidak dalam status menunggu' });
      return { partnerId: null, partnerSessionId: null };
    }
    
    console.log(`Finding partner for session ${sessionId}, user ${session.userId}, gender: ${gender}, looking for: ${lookingFor}`);
    
    // Update last active
    session.lastActivity = Date.now();
    
    // Normalisasi parameter pencarian untuk menangani 'both' dan 'any'
    const normalizedLookingFor = lookingFor === 'both' ? 'any' : lookingFor;
    
    // Log all waiting sessions for debugging
    console.log(`All waiting sessions (${Object.values(chatSessions).filter(s => s.status === 'waiting').length}):`);
    Object.values(chatSessions)
      .filter(s => s.status === 'waiting')
      .forEach(s => {
        console.log(`- Session ${s.id}: user=${s.userId}, gender=${s.gender}, lookingFor=${s.lookingFor}`);
      });
    
    // Cari partner yang sesuai
    const potentialPartners = Object.values(chatSessions).filter(partner => {
      // Jangan cocokkan dengan diri sendiri
      if (partner.id === sessionId) return false;
      
      // Pastikan partner sedang menunggu
      if (partner.status !== 'waiting') return false;
      
      // Aturan pencocokan gender
      const matchesGenderPreference = 
        normalizedLookingFor === 'any' || normalizedLookingFor === 'both' || partner.gender === normalizedLookingFor;
      
      // Pastikan partner juga menginginkan gender kita
      const partnerWantsMyGender = 
        partner.lookingFor === 'any' || partner.lookingFor === 'both' || partner.lookingFor === gender;
      
      const isMatch = matchesGenderPreference && partnerWantsMyGender;
      
      // Debug log for each potential partner evaluation
      console.log(
        `Evaluating partner ${partner.id} (${partner.userId}): gender=${partner.gender}, lookingFor=${partner.lookingFor}, ` +
        `matches our preference: ${matchesGenderPreference}, wants our gender: ${partnerWantsMyGender}, ` +
        `overall match: ${isMatch}`
      );
      
      return isMatch;
    });
    
    // Jika tidak ada partner, beritahu user
    if (potentialPartners.length === 0) {
      console.log(`No partners found for session ${sessionId} (${session.userId})`);
      io.to(sessionId).emit('no_partner_found');
      return { partnerId: null, partnerSessionId: null };
    }
    
    // Pilih partner paling lama menunggu
    const partner = potentialPartners.sort((a, b) => a.lastActivity - b.lastActivity)[0];
    
    console.log(`Found partner for session ${sessionId} (${session.userId}): ${partner.id} (${partner.userId}), gender: ${partner.gender}`);
    
    // Store both session ID and user ID for proper references
    session.status = 'chatting';
    session.partnerId = partner.userId; // Store partner's user ID for client reference
    
    partner.status = 'chatting';
    partner.partnerId = session.userId; // Store our user ID for partner reference
    
    // Beri tahu kedua user
    io.to(sessionId).emit('partner_found', { 
      partnerId: partner.userId,
      partnerGender: partner.gender
    });
    
    io.to(partner.id).emit('partner_found', {
      partnerId: session.userId,
      partnerGender: session.gender
    });
    
    // Kirim pesan sistem
    const systemMessageId = uuidv4();
    const systemMessage = {
      id: systemMessageId,
      text: 'Anda telah terhubung dengan partner chat baru',
      sender: 'system',
      timestamp: Date.now()
    };
    
    io.to(sessionId).emit('new_message', systemMessage);
    io.to(partner.id).emit('new_message', {
      ...systemMessage,
      id: `${systemMessageId}-partner`  // Different ID to prevent duplicate detection
    });
    
    return { partnerId: partner.userId, partnerSessionId: partner.id };
  } catch (error) {
    console.error('Error in findChatPartner:', error);
    io.to(sessionId).emit('error', { message: 'Terjadi kesalahan saat mencari partner' });
    return { partnerId: null, partnerSessionId: null };
  }
}

export default SocketHandler 

// Disable body parsing, we just need the raw stream
export const config = {
  api: {
    bodyParser: false,
  },
};