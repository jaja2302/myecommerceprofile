'use client'

import { useState, useEffect } from 'react';

export function CookieConsent() {
  // State default diatur ke false untuk mencegah error hydration
  const [showConsent, setShowConsent] = useState(false);
  // Tambahkan state untuk melacak apakah sudah di-mount di klien
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Tandai bahwa komponen sudah di-mount di klien
    setMounted(true);
    
    // Cek cookies setelah komponen di-mount (hanya di klien)
    const cookieConsent = localStorage.getItem('cookie-consent');
    if (!cookieConsent) {
      setShowConsent(true);
    }
  }, []);

  const acceptCookies = () => {
    localStorage.setItem('cookie-consent', 'true');
    setShowConsent(false);
    
    if (typeof window.gtag === 'function') {
      window.gtag('consent', 'update', {
        'analytics_storage': 'granted'
      });
    }
  };

  // Jangan render apa-apa di server atau saat pertama kali di-mount
  if (!mounted) return null;
  // Setelah itu, gunakan state untuk menampilkan/menyembunyikan consent
  if (!showConsent) return null;

  return (
    <div className="fixed bottom-0 left-0 right-0 bg-gray-900 text-white p-4 z-50">
      <div className="container mx-auto flex justify-between items-center">
        <p>Website ini menggunakan cookies untuk meningkatkan pengalaman pengguna.</p>
        <button 
          onClick={acceptCookies}
          className="ml-4 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700"
        >
          Setuju
        </button>
      </div>
    </div>
  );
} 