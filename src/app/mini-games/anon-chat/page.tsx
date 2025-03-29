"use client";

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { loginAnonymously } from '@/lib/firebase';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';
import { Gender, PreferredGender } from '@/types';

export default function AnonChatIntro() {
  const router = useRouter();
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [showGenderSelection, setShowGenderSelection] = useState<boolean>(false);
  const [userGender, setUserGender] = useState<Gender | ''>('');
  const [preferredGender, setPreferredGender] = useState<PreferredGender>('any');

  const handleShowGenderSelection = () => {
    setShowGenderSelection(true);
  };

  const handleAnonymousLogin = async (): Promise<void> => {
    if (!userGender) {
      setError("Please select your gender first");
      return;
    }

    try {
      setLoading(true);
      setError(null);
      console.log("Starting new anonymous login with gender:", userGender, "preferred:", preferredGender);
      
      // Login anonymously
      const user = await loginAnonymously();
      console.log("Login successful, user:", user?.uid);
      
      // Store gender preferences in sessionStorage to retrieve in room page
      sessionStorage.setItem('userGender', userGender);
      sessionStorage.setItem('preferredGender', preferredGender);
      
      // Navigate to the chat room
      router.push('/mini-games/anon-chat/room');
    } catch (err) {
      console.error("Login error:", err);
      setError("Failed to login anonymously. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col min-h-screen">
      {/* Navbar fixed at top */}
      <Navbar />
      
      {/* Main content with proper spacing */}
      <main className="flex-grow flex items-center justify-center py-12 px-4 sm:px-6 lg:px-8 bg-gray-100">
        <div className="w-full max-w-md">
          <div className="text-center mb-8">
            <h1 className="text-3xl font-extrabold text-gray-900">
              Anonymous Random Chat
            </h1>
            <p className="mt-2 text-gray-600">
              Chat with random strangers anonymously
            </p>
          </div>

          <div className="bg-white py-8 px-6 shadow rounded-lg">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4" role="alert">
                <span className="block sm:inline">{error}</span>
              </div>
            )}

            {showGenderSelection ? (
              <div className="space-y-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Your Gender
                  </label>
                  <div className="grid grid-cols-3 gap-3">
                    {['male', 'female', 'other'].map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        onClick={() => setUserGender(gender as Gender)}
                        className={`
                          py-2 px-4 border rounded-md text-sm font-medium
                          ${
                            userGender === gender
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        {gender.charAt(0).toUpperCase() + gender.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    I Want to Chat With
                  </label>
                  <div className="grid grid-cols-4 gap-2">
                    {['male', 'female', 'other', 'any'].map((gender) => (
                      <button
                        key={gender}
                        type="button"
                        onClick={() => setPreferredGender(gender as PreferredGender)}
                        className={`
                          py-2 px-3 border rounded-md text-sm font-medium
                          ${
                            preferredGender === gender
                              ? 'bg-blue-600 text-white border-blue-600'
                              : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
                          }
                        `}
                      >
                        {gender === 'any' 
                          ? 'Anyone' 
                          : gender.charAt(0).toUpperCase() + gender.slice(1)}
                      </button>
                    ))}
                  </div>
                </div>
                
                <button
                  onClick={handleAnonymousLogin}
                  disabled={!userGender || loading}
                  className={`w-full py-3 px-4 flex justify-center rounded-md text-sm font-medium text-white
                    ${!userGender || loading 
                      ? 'bg-gray-400 cursor-not-allowed' 
                      : 'bg-blue-600 hover:bg-blue-700'
                    }
                  `}
                >
                  {loading ? 'Connecting...' : 'Start Anonymous Chat'}
                </button>
              </div>
            ) : (
              <div className="space-y-6">
                <button
                  onClick={handleShowGenderSelection}
                  className="w-full py-3 px-4 bg-blue-600 hover:bg-blue-700 text-white rounded-md font-medium transition-colors"
                >
                  Start Anonymous Chat
                </button>
                
                <div className="relative">
                  <div className="absolute inset-0 flex items-center">
                    <div className="w-full border-t border-gray-300"></div>
                  </div>
                  <div className="relative flex justify-center text-sm">
                    <span className="px-2 bg-white text-gray-500">How it works</span>
                  </div>
                </div>

                <ul className="list-disc pl-5 text-sm text-gray-600 space-y-2">
                  <li>Click the button above to start</li>
                  <li>Choose your gender and chat preferences</li>
                  <li>You'll be connected with a random person</li>
                  <li>Chat anonymously - no registration required</li>
                  <li>End the chat anytime and find someone new</li>
                  <li>Your conversations are not stored permanently</li>
                </ul>
              </div>
            )}
          </div>
        </div>
      </main>
      
      {/* Footer fixed at bottom */}
      <Footer />
    </div>
  );
} 