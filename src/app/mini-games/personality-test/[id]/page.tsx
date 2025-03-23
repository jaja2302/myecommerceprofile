"use client";

import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import { personalityTests } from "@/data/personalityTests";
import { PersonalityTest } from "@/components/PersonalityTest";
import { useParams } from "next/navigation";
import Link from "next/link";

export default function PersonalityTestPage() {
  const params = useParams();
  const id = typeof params.id === 'string' ? parseInt(params.id) : -1;
  
  // Validasi ID test
  if (id < 0 || id >= personalityTests.length) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-20 text-center">
          <h1 className="text-3xl font-bold text-white mb-6">Test tidak ditemukan</h1>
          <p className="text-gray-300 mb-8">Maaf, tes kepribadian yang kamu cari tidak tersedia.</p>
          <Link 
            href="/mini-games"
            className="px-6 py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition-colors"
          >
            Kembali ke Mini Games
          </Link>
        </div>
        <Footer />
      </div>
    );
  }
  
  const test = personalityTests[id];
  
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="max-w-4xl mx-auto px-4 sm:px-6 pt-32 pb-20">
        <div className="mb-6">
          <Link 
            href="/mini-games"
            className="inline-flex items-center text-purple-400 hover:text-purple-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            Kembali ke Mini Games
          </Link>
        </div>
        
        <PersonalityTest testData={test} />
      </div>
      
      <Footer />
    </div>
  );
} 