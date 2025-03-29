// components/GenderStats.tsx
import React, { useState, useEffect } from 'react';
import { getFirestore, collection, query, where, getDocs } from 'firebase/firestore';
import { Gender } from '@/types';

interface GenderStatsProps {
  userGender: Gender;
}

interface Stats {
  male: number;
  female: number;
  other: number;
}

export default function GenderStats({ userGender }: GenderStatsProps) {
  const [stats, setStats] = useState<Stats>({
    male: 0,
    female: 0,
    other: 0
  });
  const [loading, setLoading] = useState(true);
  
  useEffect(() => {
    const fetchStats = async () => {
      try {
        const db = getFirestore();
        
        // Query for male users
        const maleQuery = query(
          collection(db, "users"),
          where("isAvailable", "==", true),
          where("gender", "==", "male")
        );
        
        // Query for female users
        const femaleQuery = query(
          collection(db, "users"),
          where("isAvailable", "==", true),
          where("gender", "==", "female")
        );
        
        // Query for other gender users
        const otherQuery = query(
          collection(db, "users"),
          where("isAvailable", "==", true),
          where("gender", "==", "other")
        );
        
        // Execute queries
        const [maleSnapshot, femaleSnapshot, otherSnapshot] = await Promise.all([
          getDocs(maleQuery),
          getDocs(femaleQuery),
          getDocs(otherQuery)
        ]);
        
        // Update stats
        setStats({
          male: maleSnapshot.size,
          female: femaleSnapshot.size,
          other: otherSnapshot.size
        });
        
        setLoading(false);
      } catch (error) {
        console.error("Error fetching gender stats:", error);
        setLoading(false);
      }
    };
    
    fetchStats();
    
    // Fetch stats every 30 seconds
    const interval = setInterval(fetchStats, 30000);
    
    return () => clearInterval(interval);
  }, []);
  
  const total = stats.male + stats.female + stats.other;
  
  return (
    <div className="bg-gray-50 p-4 rounded-lg">
      <h3 className="font-medium text-gray-700 mb-2">Online Users</h3>
      
      {loading ? (
        <div className="flex justify-center py-2">
          <div className="animate-pulse h-4 bg-gray-200 rounded w-3/4"></div>
        </div>
      ) : (
        <div className="space-y-2">
          <div className="grid grid-cols-4 text-sm">
            <span className="text-gray-600">Male</span>
            <span className="text-gray-800 font-medium">{stats.male}</span>
            <span className="text-gray-600">Female</span>
            <span className="text-gray-800 font-medium">{stats.female}</span>
          </div>
          <div className="grid grid-cols-4 text-sm">
            <span className="text-gray-600">Other</span>
            <span className="text-gray-800 font-medium">{stats.other}</span>
            <span className="text-gray-600">Total</span>
            <span className="text-gray-800 font-medium">{total}</span>
          </div>
        </div>
      )}
    </div>
  );
}