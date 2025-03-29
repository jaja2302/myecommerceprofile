import { useEffect } from 'react';

useEffect(() => {
  if (typeof window !== 'undefined') {
    // Enable Firebase debugging in development
    if (process.env.NODE_ENV === 'development') {
      window.localStorage.setItem('firebase:debug', '*');
    }
  }
}, []); 