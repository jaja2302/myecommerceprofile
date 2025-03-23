"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";
import { PersonalityTest } from "@/components/PersonalityTest";
import { personalityTests } from "@/data/personalityTests";

export function PersonalityTestSelector() {
  const [selectedTestIndex, setSelectedTestIndex] = useState<number | null>(null);
  
  if (selectedTestIndex !== null) {
    return (
      <div>
        <div className="mb-6">
          <button 
            onClick={() => setSelectedTestIndex(null)}
            className="flex items-center gap-2 text-purple-400 hover:text-purple-300 transition-colors"
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 19l-7-7m0 0l7-7m-7 7h18" />
            </svg>
            Kembali ke pilihan tes
          </button>
        </div>
        <PersonalityTest testData={personalityTests[selectedTestIndex]} />
      </div>
    );
  }

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl sm:text-4xl font-bold text-center mb-6 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
        Pilih Tes Kepribadian
      </h2>
      
      <p className="text-center text-gray-300 mb-10">
        Mau tau lebih tentang dirimu? Pilih salah satu tes kepribadian absurd di bawah ini!
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {personalityTests.map((test, index) => (
          <motion.div
            key={index}
            whileHover={{ y: -5, scale: 1.02 }}
            whileTap={{ scale: 0.98 }}
            className="bg-gradient-to-br from-purple-900/40 to-indigo-900/40 backdrop-blur-sm rounded-xl overflow-hidden shadow-xl border border-purple-800/20 cursor-pointer transition-all"
            onClick={() => setSelectedTestIndex(index)}
          >
            <div className="p-6">
              <h3 className="text-xl font-bold mb-3 text-white">
                {test.title.replace(/\"([^\"]*)\"/g, '$1')}
              </h3>
              <p className="text-gray-300 text-sm mb-4">
                {test.description}
              </p>
              <div className="flex justify-between text-xs text-gray-400">
                <span>{test.questions.length} pertanyaan</span>
                <span>{test.results.length} kemungkinan hasil</span>
              </div>
            </div>
            <div className="bg-gradient-to-r from-indigo-600 to-purple-600 py-3 px-4 text-white text-center font-medium">
              Mulai Tes
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
} 