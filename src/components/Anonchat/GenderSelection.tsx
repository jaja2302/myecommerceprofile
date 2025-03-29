// components/GenderSelection.tsx
import { useState } from 'react';
import { Gender, PreferredGender } from '@/types';

interface GenderSelectionProps {
  userGender: Gender | '';
  setUserGender: (gender: Gender) => void;
  preferredGender: PreferredGender;
  setPreferredGender: React.Dispatch<React.SetStateAction<PreferredGender>>;
  onComplete: (gender: Gender, preferredGender: PreferredGender) => Promise<void>;
}

export default function GenderSelection({
  userGender,
  setUserGender,
  preferredGender,
  setPreferredGender,
  onComplete
}: GenderSelectionProps) {
  const [loading, setLoading] = useState(false);
  
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userGender) {
      alert('Please select your gender');
      return;
    }
    
    try {
      setLoading(true);
      await onComplete(userGender, preferredGender);
    } catch (error) {
      console.error('Error completing gender selection:', error);
      alert('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };
  
  return (
    <div className="bg-white p-6 rounded-lg shadow-md w-full max-w-md">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
        Complete Your Profile
      </h2>
      
      <form onSubmit={handleSubmit} className="space-y-6">
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
        
        <div>
          <button
            type="submit"
            disabled={!userGender || loading}
            className={`
              w-full py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white 
              ${
                !userGender || loading
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500'
              }
            `}
          >
            {loading ? 'Loading...' : 'Start Chatting'}
          </button>
        </div>
        
        <p className="text-xs text-gray-500 text-center">
          Your gender information is only used to match you with chat partners based on preferences.
        </p>
      </form>
    </div>
  );
}