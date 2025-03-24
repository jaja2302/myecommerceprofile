"use client";

import { useState, useEffect } from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import Link from 'next/link';

export default function DebugPage() {
  const [userId, setUserId] = useState<string | null>(null);
  const [deviceId, setDeviceId] = useState<string | null>(null);
  const [browserInfo, setBrowserInfo] = useState<string | null>(null);
  const [deviceSpecificId, setDeviceSpecificId] = useState<string | null>(null);
  const [token, setToken] = useState<string>(process.env.NEXT_PUBLIC_DEBUG_TOKEN || 'dev-debug-token');
  const [dbClearStatus, setDbClearStatus] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    // Ambil data dari localStorage
    if (typeof window !== 'undefined') {
      try {
        const userData = localStorage.getItem('anonchat_user_data');
        if (userData) {
          const parsed = JSON.parse(userData);
          setUserId(parsed.userId || null);
          setDeviceId(parsed.deviceFingerprint || null);
          setBrowserInfo(parsed.browser || null);
          setDeviceSpecificId(parsed.deviceUserId || null);
        }
      } catch (error) {
        console.error('Error reading user data:', error);
      }
    }
  }, []);

  // Fungsi untuk clear database
  const handleClearDb = async () => {
    if (!token) {
      setDbClearStatus('Error: Token is required');
      return;
    }

    setIsLoading(true);
    setDbClearStatus('Processing...');

    try {
      const response = await fetch(`/api/dev/clear-db?token=${token}`);
      const data = await response.json();

      if (response.ok) {
        setDbClearStatus(`Success: ${data.message}`);
      } else {
        setDbClearStatus(`Error: ${data.error || 'Unknown error'}`);
      }
    } catch (error) {
      setDbClearStatus(`Error: ${error instanceof Error ? error.message : 'Failed to clear database'}`);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col">
      <Navbar />
      
      <main className="flex-grow container mx-auto px-4 py-8 pt-24">
        <h1 className="text-3xl font-bold mb-6">Debug Tools</h1>
        
        <div className="bg-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">User Identification</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-zinc-700 rounded-lg p-4">
              <h3 className="font-medium mb-2">Permanent User ID</h3>
              <p className="bg-zinc-900 p-2 rounded text-xs overflow-auto">{userId || 'Not available'}</p>
            </div>
            
            <div className="bg-zinc-700 rounded-lg p-4">
              <h3 className="font-medium mb-2">Device Fingerprint</h3>
              <p className="bg-zinc-900 p-2 rounded text-xs overflow-auto">{deviceId || 'Not available'}</p>
            </div>
            
            <div className="bg-zinc-700 rounded-lg p-4">
              <h3 className="font-medium mb-2">Browser Info</h3>
              <p className="bg-zinc-900 p-2 rounded text-xs overflow-auto">{browserInfo || 'Not available'}</p>
            </div>
            
            <div className="bg-zinc-700 rounded-lg p-4">
              <h3 className="font-medium mb-2">Device-Specific User ID</h3>
              <p className="bg-zinc-900 p-2 rounded text-xs overflow-auto">{deviceSpecificId || 'Not available'}</p>
            </div>
          </div>
        </div>
        
        <div className="bg-zinc-800 rounded-lg p-6 mb-6">
          <h2 className="text-xl font-semibold mb-4">Debugging Tools</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="bg-zinc-700 rounded-lg p-4">
              <h3 className="font-medium mb-2">Browser Storage Cleaner</h3>
              <p className="text-sm mb-4">Hapus data yang tersimpan di browser (localStorage, sessionStorage, cookies)</p>
              
              <div className="flex gap-2">
                <Link 
                  href={`/api/dev/clear-browser-storage?token=${token}`}
                  className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
                  target="_blank"
                >
                  Open Storage Cleaner
                </Link>
              </div>
            </div>
            
            <div className="bg-zinc-700 rounded-lg p-4">
              <h3 className="font-medium mb-2">Firebase Database Cleaner</h3>
              <p className="text-sm mb-4">Hapus semua data di Firestore database (hati-hati!)</p>
              
              <div className="mb-3">
                <label className="block text-sm mb-1">Debug Token:</label>
                <input 
                  type="text" 
                  value={token} 
                  onChange={(e) => setToken(e.target.value)}
                  className="w-full bg-zinc-900 text-white p-2 rounded"
                />
              </div>
              
              <button
                onClick={handleClearDb}
                disabled={isLoading}
                className={`px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition disabled:opacity-50 disabled:cursor-not-allowed`}
              >
                {isLoading ? 'Processing...' : 'Clear All Database Data'}
              </button>
              
              {dbClearStatus && (
                <div className={`mt-3 p-2 rounded text-sm ${dbClearStatus.startsWith('Error') ? 'bg-red-900/50' : 'bg-green-900/50'}`}>
                  {dbClearStatus}
                </div>
              )}
            </div>
          </div>
        </div>
        
        <div className="bg-zinc-800 rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Anon Chat Testing</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Link 
              href="/mini-games/anon-chat"
              className="bg-zinc-700 hover:bg-zinc-600 transition p-4 rounded-lg flex items-center justify-between"
            >
              <div>
                <h3 className="font-medium">Open Anon Chat</h3>
                <p className="text-sm text-zinc-400">Buka halaman anon chat untuk testing</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
            
            <Link 
              href="http://localhost:3000/mini-games/anon-chat"
              className="bg-zinc-700 hover:bg-zinc-600 transition p-4 rounded-lg flex items-center justify-between"
              target="_blank"
            >
              <div>
                <h3 className="font-medium">Open in New Tab</h3>
                <p className="text-sm text-zinc-400">Buka di tab baru untuk test multi-device</p>
              </div>
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M10.293 5.293a1 1 0 011.414 0l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414-1.414L12.586 11H5a1 1 0 110-2h7.586l-2.293-2.293a1 1 0 010-1.414z" clipRule="evenodd" />
              </svg>
            </Link>
          </div>
        </div>
      </main>
      
      <Footer />
    </div>
  );
} 