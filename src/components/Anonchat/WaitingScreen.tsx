// components/WaitingScreen.tsx
import React, { useState, useEffect } from 'react';
import { Gender, PreferredGender } from '@/types';
import GenderStats from './GenderStats';

interface WaitingScreenProps {
  username: string;
  userGender: Gender;
  preferredGender: PreferredGender;
  setPreferredGender: React.Dispatch<React.SetStateAction<PreferredGender>>;
  onStartChat: () => Promise<void>;
  searching: boolean;
  matchStatus?: string;
  retryCount?: number;
}

export default function WaitingScreen({
  username,
  userGender,
  preferredGender,
  setPreferredGender,
  onStartChat,
  searching,
  matchStatus = 'idle',
  retryCount = 0
}: WaitingScreenProps) {
  const [error, setError] = useState<string | null>(null);
  const [localRetryCount, setLocalRetryCount] = useState(0);
  const [retryDelay, setRetryDelay] = useState(0);
  const [retryTimer, setRetryTimer] = useState<NodeJS.Timeout | null>(null);
  
  // Use the prop retry count if provided, otherwise use local state
  const effectiveRetryCount = retryCount || localRetryCount;

  useEffect(() => {
    return () => {
      if (retryTimer) clearTimeout(retryTimer);
    };
  }, [retryTimer]);
  
  const handlePreferredGenderChange = (gender: PreferredGender) => {
    setPreferredGender(gender);
  };
  
  const handleStartChat = async () => {
    try {
      setError(null);
      setLocalRetryCount(0);
      if (retryTimer) clearTimeout(retryTimer);
      
      await onStartChat();
    } catch (err) {
      console.error("Error starting chat:", err);
      setError("Failed to start chat. Please try again.");
    }
  };
  
  const handleRetry = () => {
    const newRetryCount = localRetryCount + 1;
    setLocalRetryCount(newRetryCount);
    
    // Exponential backoff - 2s, 4s, 8s, etc.
    const delay = Math.min(2000 * Math.pow(2, newRetryCount - 1), 30000);
    setRetryDelay(delay);
    
    console.log(`[WAITING] Retrying in ${delay}ms (attempt ${newRetryCount})`);
    
    const timer = setTimeout(() => {
      handleStartChat();
    }, delay);
    
    setRetryTimer(timer);
  };
  
  // Get status message based on matchStatus
  const getStatusMessage = () => {
    switch (matchStatus) {
      case 'requesting':
        return 'Preparing to search...';
      case 'matching':
        return 'Looking for someone to chat with...';
      case 'matched':
        return 'Match found! Connecting...';
      case 'failed':
        return 'Failed to find a match. Retrying...';
      default:
        return 'Looking for someone to chat with...';
    }
  };

  return (
    <div className="flex flex-col items-center justify-center h-full p-6">
      <div className="text-center mb-8">
        <h2 className="text-2xl font-bold text-gray-800 mb-2">
          {searching ? 'Searching for a chat partner...' : 'Start a New Chat'}
        </h2>
        <p className="text-gray-600">
          You're chatting as <span className="font-medium">{username}</span>
        </p>
      </div>
      
      {searching ? (
        <div className="flex flex-col items-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-500 mb-4"></div>
          <p className="text-gray-600">{getStatusMessage()}</p>
          <p className="text-sm text-gray-500 mt-2">
            {matchStatus === 'matching' && effectiveRetryCount > 0 
              ? `Retry attempt ${effectiveRetryCount}` 
              : 'This might take a moment'}
          </p>
          {matchStatus === 'matching' && (
            <div className="mt-4 text-xs text-gray-500">
              Match ID: {Math.random().toString(36).substring(2, 10)}
            </div>
          )}
        </div>
      ) : (
        <>
          <div className="w-full max-w-md mb-6">
            <div className="bg-gray-50 p-4 rounded-lg mb-4">
              <h3 className="font-medium text-gray-700 mb-2">Your Preferences</h3>
              <div className="flex flex-col space-y-2">
                <div className="flex justify-between">
                  <span className="text-gray-600">You are</span>
                  <span className="font-medium text-gray-800 capitalize">{userGender}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600">Looking to chat with</span>
                  <span className="font-medium text-gray-800 capitalize">
                    {preferredGender === 'any' ? 'Anyone' : preferredGender}
                  </span>
                </div>
              </div>
            </div>
            
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 mb-2">
                Change who you want to chat with
              </label>
              <div className="grid grid-cols-4 gap-2">
                {['male', 'female', 'other', 'any'].map((gender) => (
                  <button
                    key={gender}
                    onClick={() => handlePreferredGenderChange(gender as PreferredGender)}
                    className={`
                      py-2 px-3 border rounded-md text-sm font-medium
                      ${
                        preferredGender === gender
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                      }
                    `}
                  >
                    {gender === 'any' ? 'Anyone' : gender.charAt(0).toUpperCase() + gender.slice(1)}
                  </button>
                ))}
              </div>
            </div>
            
            {error && (
              <div className="bg-red-100 border-l-4 border-red-500 text-red-700 p-4 mb-4">
                <p className="font-medium">Error</p>
                <p>{error}</p>
                {retryDelay > 0 && (
                  <p className="text-sm mt-2">
                    Retrying in {Math.round(retryDelay / 1000)} seconds...
                  </p>
                )}
              </div>
            )}
            
            <GenderStats userGender={userGender} />
          </div>
          
          <div className="w-full max-w-md space-y-3">
            <button
              onClick={handleStartChat}
              className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
            >
              Find Someone to Chat With
            </button>
            
            {error && (
              <button
                onClick={handleRetry}
                className="w-full py-2 px-4 bg-gray-200 hover:bg-gray-300 text-gray-800 rounded-md font-medium transition-colors"
              >
                Retry Manually {effectiveRetryCount > 0 ? `(Attempt ${effectiveRetryCount})` : ''}
              </button>
            )}
          </div>
        </>
      )}
    </div>
  );
}