import { useEffect } from 'react';

// Create a component to hold the useEffect hook
export default function FirebaseDebugger() {
  useEffect(() => {
    if (typeof window !== 'undefined') {
      // Enable Firebase debugging in development
      if (process.env.NODE_ENV === 'development') {
        window.localStorage.setItem('firebase:debug', '*');
      }
    }
  }, []); 
  
  return null;
} 