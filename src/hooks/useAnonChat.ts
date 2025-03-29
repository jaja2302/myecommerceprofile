import { useState, useEffect, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import { v4 as uuidv4 } from 'uuid';
import { Gender, PreferredGender } from '@/types';

// Helper to check if code is running in browser
const isBrowser = typeof window !== 'undefined';

export interface ChatMessage {
  id: string;
  text: string;
  sender: 'user' | 'partner' | 'system';
  timestamp: number;
}

export interface ChatHookReturn {
  loading: boolean;
  sessionId: string | null;
  partnerId: string | null;
  partnerGender: Gender | null;
  messages: ChatMessage[];
  startChat: (gender: Gender, preferredGender: PreferredGender) => Promise<boolean>;
  sendMessage: (text: string) => Promise<boolean>;
  endChat: () => Promise<boolean>;
  findPartner: (params: {gender: Gender, lookingFor: PreferredGender}) => void;
  isConnected: boolean;
  error: string | null;
}

export function useAnonChat(): ChatHookReturn {
  const [socket, setSocket] = useState<Socket | null>(null);
  const [socketInitialized, setSocketInitialized] = useState<boolean>(false);
  const [socketError, setSocketError] = useState<boolean>(false);
  const [reconnecting, setReconnecting] = useState<boolean>(false);
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [partnerId, setPartnerId] = useState<string | null>(null);
  const [partnerGender, setPartnerGender] = useState<Gender | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  
  // Flag untuk mencegah multiple initializations
  const initializingRef = useRef<boolean>(false);
  // Track socket initialization attempts
  const socketAttempts = useRef<number>(0);
  
  // Buat user ID yang konsisten untuk pengguna
  const userIdRef = useRef<string>(isBrowser ? localStorage.getItem('anonchat_user_id') || uuidv4() : uuidv4());
  useEffect(() => {
    if (!isBrowser) return; // Skip if not in browser
    
    try {
      // Coba ambil user ID dari localStorage
      let userId = localStorage.getItem('anon_chat_user_id');
      if (!userId) {
        // Jika tidak ada, buat baru
        userId = `user_${uuidv4()}`;
        localStorage.setItem('anon_chat_user_id', userId);
      }
      userIdRef.current = userId;
    } catch (e) {
      console.error('Error getting user ID:', e);
      // Fallback jika localStorage tidak tersedia
      if (!userIdRef.current) {
        userIdRef.current = `user_${uuidv4()}`;
      }
    }
  }, []);
  
  // Heartbeat timer reference
  const heartbeatTimerRef = useRef<NodeJS.Timeout | null>(null);
  
  // Cleanup function for timers and listeners
  const cleanup = useCallback(() => {
    // Clear heartbeat timer
    if (heartbeatTimerRef.current) {
      clearInterval(heartbeatTimerRef.current);
      heartbeatTimerRef.current = null;
    }
    
    // Clean up socket if it exists
    if (socket) {
      try {
        // console.log('Cleaning up socket connection');
        socket.removeAllListeners();
        socket.disconnect();
      } catch (e) {
        console.warn('Error during socket cleanup:', e);
      }
    }
  }, [socket]);
  
  // Cleanup on unmount
  useEffect(() => {
    return cleanup;
  }, [cleanup]);
  
  // Setup heartbeat when socket is connected
  useEffect(() => {
    // Start heartbeat only when socket is connected and session exists
    if (socket && socket.connected && sessionId) {
      // console.log('Starting heartbeat');
      
      // Send initial heartbeat
      socket.emit('heartbeat', { sessionId });
      
      // Set up heartbeat interval (every 30 seconds)
      heartbeatTimerRef.current = setInterval(() => {
        if (socket.connected) {
          socket.emit('heartbeat', { sessionId });
        }
      }, 30000);
      
      // Cleanup on dismount or when dependencies change
      return () => {
        if (heartbeatTimerRef.current) {
          clearInterval(heartbeatTimerRef.current);
          heartbeatTimerRef.current = null;
        }
      };
    }
  }, [socket, socketInitialized, sessionId]);
  
  // Socket setup dengan perlindungan race condition
  useEffect(() => {
    if (!isBrowser) return; // Skip if not in browser
    
    // Jangan inisialisasi socket jika:
    // 1. Belum ada userID
    // 2. Socket sudah diinisialisasi dan terkoneksi
    // 3. Sedang dalam proses inisialisasi
    if (!userIdRef.current || (socketInitialized && socket && socket.connected) || initializingRef.current) {
      return;
    }

    // Mencegah multiple socket initialisations
    initializingRef.current = true;
    
    // Maximum 5 inisialisasi socket (untuk mencegah loop tak terbatas)
    if (socketAttempts.current >= 5) {
      console.error('Maximum socket initialization attempts reached');
      setError('Gagal menghubungkan ke server chat setelah beberapa percobaan. Silakan muat ulang halaman.');
      initializingRef.current = false;
      
      // Add forced reload button functionality
      setTimeout(() => {
        initializingRef.current = false;
        socketAttempts.current = 0;
      }, 10000); // Reset after 10 seconds to allow one more attempt
      return;
    }

    socketAttempts.current++;
    
    const initSocket = async () => {
      try {
        // Hapus socket lama jika ada
        if (socket) {
          try {
            socket.removeAllListeners();
            socket.disconnect();
          } catch (e) {
            console.warn('Error disconnecting old socket:', e);
          }
        }

        setSocketError(false);
        setReconnecting(true);
        // console.log('Initializing WebSocket connection... Attempt:', socketAttempts.current);
        
        // Add network connection check
        if (isBrowser && navigator.onLine === false) {
          // console.warn('Browser reports offline status. Waiting for online status...');
          setError('Perangkat Anda sedang offline. Tunggu hingga koneksi tersedia.');
          
          // Wait for online status before continuing
          if (window) {
            const handleOnline = () => {
              // console.log('Device is now online, attempting connection...');
              window.removeEventListener('online', handleOnline);
              
              // Reset socket attempts for a fresh try
              socketAttempts.current = 0;
              initializingRef.current = false;
              setSocketInitialized(false); // Trigger a reconnect
            };
            
            window.addEventListener('online', handleOnline);
          }
          
          // Early return, we'll reconnect when online
          initializingRef.current = false;
          return;
        }
        
        // Pengujian koneksi HTTP sederhana terlebih dahulu
        try {
          const controller = new AbortController();
          const timeoutId = setTimeout(() => controller.abort(), 5000);
          
          // // console.log('Testing API endpoint before socket connection...');
          // const response = await fetch('/api/socket', { 
          //   method: 'GET',
          //   signal: controller.signal
          // });
          
          clearTimeout(timeoutId);
          // console.log('API endpoint test response:', response.status);
        } catch (error) {
          console.warn('API endpoint test failed, but continuing with socket connection:', error);
        }
        
        // Add a small delay before connection to avoid race conditions with server
        await new Promise(resolve => setTimeout(resolve, 100));
        
        // Dapatkan host URL dari window.location untuk memastikan koneksi ke host yang benar
        const origin = isBrowser ? window.location.origin : '';
        // console.log('Connecting to socket server at:', origin);
        
        // Buat instance Socket.io
        const connectionOpts = {
          path: '/api/socket',
          transports: ['polling', 'websocket'], // Coba polling dulu, lalu websocket
          timeout: 20000, // Increase timeout
          reconnection: true,
          reconnectionAttempts: 5,
          reconnectionDelay: 1000,
          reconnectionDelayMax: 5000,
          forceNew: true,
          autoConnect: true,
          rejectUnauthorized: false, // Add this for dev environment issues
          withCredentials: false, // May help with CORS
          addTrailingSlash: false, // Fix for Next.js 13.3+ issue with Socket.io
          cookie: false, // Disable cookies to avoid SameSite issues
          extraHeaders: {
            // Add custom headers to help with debugging
            'X-Client-Id': userIdRef.current,
            'X-Client-Time': Date.now().toString()
          }
        };
        
        // console.log('Socket.io connection options:', connectionOpts);
        
        // Create socket with optimized configuration
        const newSocket = io(origin, connectionOpts);
        
        // console.log('Socket.io instance created, waiting for connection...');
        
        // Add explicit error handler for XHR failures
        newSocket.io.on('error', (error: Error) => {
          console.error('Transport error:', error);
          // Don't disconnect - let the reconnection logic handle it
        });
        
        // Handle connection error events more gracefully
        // Using "on" with "as any" to handle type issues with Socket.io types
        /* eslint-disable @typescript-eslint/no-explicit-any */
        (newSocket.io.engine as any).on('transport_error', ((error: unknown) => {
          console.error('Transport error:', error);
          setSocketError(true);
          setError(`Tidak dapat terhubung ke server chat: ${error instanceof Error ? error.message : 'Unknown error'}`);
          setIsConnected(false);
        }) as (error: unknown) => void);
        
        (newSocket.io.engine as any).on('close', ((reason: string) => {
          console.warn('Engine close event:', reason);
        }) as (reason: string) => void);
        /* eslint-enable @typescript-eslint/no-explicit-any */
        
        // Tambahkan event listener
        newSocket.on('connect', () => {
          // console.log('Connected to WebSocket server with ID:', newSocket.id);
          setSocketInitialized(true);
          setReconnecting(false);
          setSocketError(false);
          // Koneksi berhasil, jadi reset attempt counter
          socketAttempts.current = 0;
          setIsConnected(true);
          setError(null);
          
          // Kirim login event untuk menguji koneksi
          // console.log('Sending test event to server...');
          newSocket.emit('test', { userId: userIdRef.current });
        });
        
        newSocket.on('connect_error', (err) => {
          console.error('Socket connection error:', err);
          setSocketError(true);
          setError(`Tidak dapat terhubung ke server chat: ${err.message}`);
          setIsConnected(false);
        });
        
        newSocket.io.on('reconnect_attempt', () => {
          // Log removed to avoid unused variable warning
        });
        
        newSocket.io.on('reconnect', (_attempt) => {
          console.log(`Socket.io reconnected after ${_attempt} attempts`);
          setIsConnected(true);
          setSocketError(false);
          setError(null);
        });
        
        // Event handler
        newSocket.on('error', (data) => {
          console.error('Socket error:', data);
          setError(typeof data === 'object' && data.message ? data.message : 'Terjadi kesalahan pada koneksi chat');
        });
        
        newSocket.on('session_created', (data) => {
          // console.log(`Session created:`, data);
          if (data && data.sessionId) {
            setSessionId(data.sessionId);
          }
        });
        
        newSocket.on('partner_found', (data) => {
          // console.log(`Partner found:`, data);
          if (data) {
            setPartnerId(data.partnerId);
            setPartnerGender(data.partnerGender);
            setLoading(false);
            setError(null);
          }
        });
        
        newSocket.on('no_partner_found', () => {
          // console.log('No partner found');
          setLoading(false);
          setError('Tidak ada partner yang tersedia saat ini. Coba lagi nanti.');
        });
        
        newSocket.on('new_message', (message) => {
          // console.log('Message received:', message);
          // Check if this message is already in our messages array
          setMessages(prev => {
            // Check if we already have this message (by id)
            if (prev.some(m => m.id === message.id)) {
              // console.log('Duplicate message detected, ignoring:', message.id);
              return prev;
            }
            return [...prev, message];
          });
        });
        
        newSocket.on('chat_ended', (data) => {
          // console.log('Chat ended event received:', data);
          
          // Immediately clear partner information
          setPartnerId(null);
          setPartnerGender(null);
          
          // Add a system message to the chat that partner left
          setMessages(prev => [
            ...prev, 
            {
              id: `system-chat-ended-${Date.now()}`,
              text: data?.message || 'Chat has ended. Your partner has left the conversation.',
              sender: 'system',
              timestamp: Date.now()
            }
          ]);
          
          // Set the error notification message
          setError(data && data.message ? data.message : 'Chat telah berakhir');
          
          // Send custom event for component to detect partner leaving
          if (isBrowser) {
            const customEvent = new CustomEvent('anonchat_partner_left', { 
              detail: { message: data?.message || 'Chat has ended' } 
            });
            window.dispatchEvent(customEvent);
            // console.log('Dispatched anonchat_partner_left event');
          }
        });
        
        newSocket.on('disconnect', (reason) => {
          // console.log('Disconnected from WebSocket server, reason:', reason);
          if (reason === 'io server disconnect') {
            // Server memutuskan koneksi, coba reconnect
            newSocket.connect();
          }
          setError('Terputus dari server. Mencoba menghubungkan kembali...');
          setReconnecting(true);
          setIsConnected(false);
        });
        
        // Set socket state
        setSocket(newSocket);
      } catch (err) {
        console.error('Error initializing socket:', err);
        setSocketError(true);
        setError('Gagal menghubungkan ke server chat.');
        setReconnecting(false);
        setIsConnected(false);
      } finally {
        // Reset initialization flag setelah selesai
        setTimeout(() => {
          initializingRef.current = false;
        }, 500);
      }
    };
    
    // Eksekusi dengan delay kecil untuk menghindari race condition pada client
    const timeoutId = setTimeout(initSocket, 500);
    
    return () => {
      clearTimeout(timeoutId);
      cleanup();
      setIsConnected(false);
    };
  }, [socketInitialized, socketError, cleanup]);
  
  // Coba terhubung kembali jika koneksi terputus
  useEffect(() => {
    // This effect is meant to reconnect when the socket connection has an error
    if (socketError && !reconnecting && !initializingRef.current) {
      const reconnectTimer = setTimeout(() => {
        // console.log('Attempting to reconnect...');
        setSocketInitialized(false); // Ini akan memicu useEffect di atas untuk menginisialisasi ulang socket
      }, 3000);
      
      return () => clearTimeout(reconnectTimer);
    }
  }, [socketError, reconnecting, socket]);
  
  // Fungsi untuk memulai chat
  const startChat = useCallback(async (gender: Gender, preferredGender: PreferredGender): Promise<boolean> => {
    if (!isBrowser) return false; // Skip if not in browser
    
    // Jika tidak ada socket, coba inisialisasi ulang
    if (!socket) {
      setError('Sedang menghubungkan ke server chat...');
      setSocketInitialized(false); // Memicu reconnect
      
      // Tunggu sebentar untuk socket terhubung (maksimal 3 detik)
      await new Promise(resolve => setTimeout(resolve, 3000));
      
      // Cek lagi setelah menunggu
      if (!socket) {
        setError('Tidak dapat terhubung ke server chat. Muat ulang halaman dan coba lagi.');
        return false;
      }
    }
    
    // Jika socket ada tapi tidak terhubung, coba hubungkan
    if (!socket.connected) {
      // console.log('Socket not connected, reconnecting...');
      setError('Menghubungkan ke server chat...');
      
      // Mencoba menghubungkan ulang
      socket.connect();
      
      // Tunggu socket terhubung (maksimal 3 detik)
      let attempts = 0;
      const maxAttempts = 6;
      while (!socket.connected && attempts < maxAttempts) {
        await new Promise(resolve => setTimeout(resolve, 500));
        attempts++;
      }
      
      // Jika masih gagal terhubung
      if (!socket.connected) {
        setError('Gagal terhubung ke server chat. Coba lagi nanti.');
        return false;
      }
      
      // Reset error jika berhasil terhubung
      setError(null);
    }
    
    try {
      setLoading(true);
      setError(null);
      
      // Reset state chat
      setSessionId(null);
      setPartnerId(null);
      setPartnerGender(null);
      setMessages([]);
      
      // console.log(`Starting chat: gender=${gender}, preferredGender=${preferredGender}`);
      
      // Buat session baru
      socket.emit('create_session', {
        userId: userIdRef.current,
        gender,
        lookingFor: preferredGender
      });
      
      return true;
    } catch (err) {
      console.error('Error starting chat:', err);
      setError('Gagal memulai chat. Silakan coba lagi.');
      setLoading(false);
      return false;
    }
  }, [socket]);
  
  // Fungsi untuk mencari partner chat
  const findPartner = useCallback(({ gender, lookingFor }: {gender: Gender, lookingFor: PreferredGender}): void => {
    // Simpan status pencarian ke localstorage
    localStorage.setItem('user-gender', gender);
    localStorage.setItem('looking-for', lookingFor);
    
    // Jika socket tidak terkoneksi, coba koneksi ulang
    if (!socket || !socket.connected) {
      // console.log('Socket not connected, reconnecting...');
      setError('Koneksi ke server terputus, mencoba menghubungkan ulang...');
      
      // Hapus socket lama jika ada
      if (socket) {
        socket.disconnect();
      }
      
      // Reset socket initialization untuk memicu reconnect
      setSocketInitialized(false);
      
      // Tunggu sebentar lalu panggil pencarian lagi
      setTimeout(() => findPartner({ gender, lookingFor }), 1500);
      return;
    }
    
    // Check if we have a valid sessionId
    if (!sessionId) {
      // console.error('Cannot find partner: No active session ID');
      setError('Tidak dapat mencari partner: Tidak ada sesi aktif. Silakan mulai chat baru.');
      setLoading(false);
      return;
    }
    
    setLoading(true);
    setError(null);
    setMessages([]);
    
    // Normalisasi parameter pencarian
    const normalizedLookingFor = lookingFor === 'both' ? 'any' : lookingFor;
    
    // console.log(`Emitting find_partner event with sessionId: ${sessionId}, gender: ${gender}, lookingFor: ${normalizedLookingFor}`);
    socket.emit('find_partner', { 
      sessionId, 
      gender, 
      lookingFor: normalizedLookingFor 
    }, (response: { error?: string }) => {
      if (response && response.error) {
        // console.error('Error finding partner:', response.error);
        setError(response.error);
        setLoading(false);
      } else {
        setError(null);
        // console.log('   partner request acknowledged by server');
      }
    });
  }, [socket, sessionId]);
  
  // Fungsi untuk mengirim pesan
  const sendMessage = useCallback(async (text: string): Promise<boolean> => {
    if (!socket || !sessionId) {
      setError('Tidak dapat mengirim pesan: Tidak ada sesi aktif');
      return false;
    }
    
    if (!partnerId) {
      setError('Tidak dapat mengirim pesan: Partner tidak tersedia');
      return false;
    }
    
    try {
      // console.log('Sending message to session:', sessionId, 'text:', text.substring(0, 20));
      
      // Kirim pesan ke server dengan format yang sesuai
      socket.emit('send_message', {
        sessionId,
        message: text // Pastikan parameter sesuai dengan yang diharapkan server
      }, (response: { error?: string }) => {
        // Optional callback to handle errors
        if (response && response.error) {
          // console.error('Error response from server:', response.error);
          setError(response.error);
          return false;
        }
      });
      
      return true;
    } catch (err) {
      console.error('Error sending message:', err);
      setError('Gagal mengirim pesan. Silakan coba lagi.');
      return false;
    }
  }, [socket, sessionId, partnerId]);
  
  // Fungsi untuk mengakhiri chat
  const endChat = useCallback(async (): Promise<boolean> => {
    if (!sessionId) {
      // Jika tidak ada session, langsung reset state lokal
      setPartnerId(null);
      setPartnerGender(null);
      return true;
    }
    
    if (!socket || !socket.connected) {
      // Jika tidak terhubung ke server, hanya reset state lokal
      setPartnerId(null);
      setPartnerGender(null);
      setSessionId(null);
      return true;
    }
    
    try {
      socket.emit('end_chat', { sessionId });
      
      // Reset state chat
      setPartnerId(null);
      setPartnerGender(null);
      
      // Add a system message that you ended the chat
      setMessages(prev => [
        ...prev, 
        {
          id: `system-chat-ended-by-user-${Date.now()}`,
          text: 'You ended the chat',
          sender: 'system',
          timestamp: Date.now()
        }
      ]);
      
      return true;
    } catch (err) {
      console.error('Error ending chat:', err);
      // Reset state lokal meskipun ada error
      setPartnerId(null);
      setPartnerGender(null);
      return false;
    }
  }, [socket, sessionId]);
  
  return {
    sessionId,
    partnerId,
    partnerGender,
    messages,
    loading,
    error,
    startChat,
    findPartner,
    sendMessage,
    endChat,
    isConnected,
  };
}

export default useAnonChat; 