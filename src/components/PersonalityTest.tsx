"use client";

import React, { useState } from "react";
import { motion } from "framer-motion";

interface Option {
  id: string;
  text: string;
}

interface Question {
  id: number;
  text: string;
  options: Option[];
}

interface Result {
  type: string;
  title: string;
  description: string;
}

export interface PersonalityTestData {
  title: string;
  description: string;
  questions: Question[];
  results: Result[];
  calculateResult?: (answers: { [key: number]: string }) => Result;
  generateResult?: (answers: { [key: number]: string }) => Result;
}

// Default test data
const defaultTestData: PersonalityTestData = {
  title: "Tes Kepribadian \"Apa Takdirmu di Dunia Ini?\"",
  description: "Yuk, cari tahu takdirmu yang sebenarnya di dunia ini lewat tes kepribadian super akurat ini!",
  questions: [
    {
      id: 1,
      text: "Kamu masuk ruangan kosong dan cuma ada kursi di tengah. Apa yang kamu lakukan?",
      options: [
        { id: "A", text: "Duduk dan menunggu sesuatu terjadi" },
        { id: "B", text: "Periksa kursinya, siapa tahu ada petunjuk" },
        { id: "C", text: "Dorong kursinya ke tembok, siapa tahu ada pintu rahasia" },
        { id: "D", text: "Langsung keluar, males drama" }
      ]
    },
    {
      id: 2,
      text: "Kamu menemukan sendok dan gelang karet di meja. Apa yang kamu lakukan?",
      options: [
        { id: "A", text: "Gunakan gelang buat nyetak pola di tangan, keren nih" },
        { id: "B", text: "Gabungin jadi alat buat eksperimen sesuatu" },
        { id: "C", text: "Lempar gelang ke sendok, lihat apakah bisa terbang" },
        { id: "D", text: "Gak peduli, mending makan pake sendoknya" }
      ]
    },
    {
      id: 3,
      text: "Kamu disuruh milih satu kekuatan super, tapi ada kelemahannya. Pilih mana?",
      options: [
        { id: "A", text: "Bisa terbang, tapi cuma setinggi 1 meter" },
        { id: "B", text: "Bisa baca pikiran, tapi cuma orang yang lagi ngigau" },
        { id: "C", text: "Bisa ngilang, tapi cuma waktu kamu tidur" },
        { id: "D", text: "Bisa ngeluarin api, tapi cuma di suhu -50°C" }
      ]
    },
    {
      id: 4,
      text: "Kamu ketemu alien di hutan. Apa yang kamu lakukan?",
      options: [
        { id: "A", text: "Ngajak ngobrol, siapa tahu jadi bestie" },
        { id: "B", text: "Lari, takut diculik buat eksperimen" },
        { id: "C", text: "Foto dulu buat bukti ke temen-temen" },
        { id: "D", text: "Tawarkan kerja sama buat bisnis MLM galaksi" }
      ]
    },
    {
      id: 5,
      text: "Kamu menang undian miliaran rupiah. Apa yang pertama kamu beli?",
      options: [
        { id: "A", text: "Rumah mewah dengan 100 kamar" },
        { id: "B", text: "Mobil sport yang gak bisa dikendarai" },
        { id: "C", text: "Investasi NFT kucing alien (harap untung)" },
        { id: "D", text: "Beli pulau buat bikin kerajaan sendiri" }
      ]
    }
  ],
  results: [
    {
      type: "A",
      title: "FILOSOF SOSMED",
      description: "Suka mikirin hal-hal random yang bikin orang lain bingung. Kemungkinan besar bakal jadi orang yang sering posting teori konspirasi di Twitter sambil minum kopi."
    },
    {
      type: "B",
      title: "SAINTIS GAGAL",
      description: "Suka eksperimen, tapi kebanyakan cuma sampe tahap ide doang. Gak heran kalau percobaanmu sering gagal gara-gara lupa baca manual book."
    },
    {
      type: "C",
      title: "KREATIF NGGAK JELAS",
      description: "Punya banyak ide unik, tapi sayangnya terlalu absurd buat direalisasikan. Cocok jadi content creator yang konsepnya bikin orang mikir, \"Ini otaknya gimana sih?\""
    },
    {
      type: "D",
      title: "NOTHING",
      description: "Udah berusaha keras, tapi takdir berkata lain. Mungkin memang hidupmu ditakdirkan untuk jadi penonton dalam drama kehidupan orang lain. Nikmati aja, bro."
    }
  ]
};

interface PersonalityTestProps {
  testData?: PersonalityTestData;
}

export function PersonalityTest({ testData = defaultTestData }: PersonalityTestProps) {
  const [currentQuestionIndex, setCurrentQuestionIndex] = useState(0);
  const [answers, setAnswers] = useState<{ [key: number]: string }>({});
  const [showResult, setShowResult] = useState(false);
  const [testStarted, setTestStarted] = useState(false);

  const handleAnswer = (questionId: number, optionId: string) => {
    setAnswers({
      ...answers,
      [questionId]: optionId
    });

    if (currentQuestionIndex < testData.questions.length - 1) {
      setCurrentQuestionIndex(currentQuestionIndex + 1);
    } else {
      setShowResult(true);
    }
  };

  const startTest = () => {
    setTestStarted(true);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowResult(false);
  };

  const resetTest = () => {
    setTestStarted(false);
    setCurrentQuestionIndex(0);
    setAnswers({});
    setShowResult(false);
  };

  const getResult = () => {
    // If there's a custom calculation function, use it
    if (testData.calculateResult) {
      return testData.calculateResult(answers);
    }
    
    const answerCounts: { [key: string]: number } = {};
    
    // Initialize counts for each option type
    testData.results.forEach(result => {
      answerCounts[result.type] = 0;
    });

    // Count answers
    Object.values(answers).forEach(answer => {
      if (answerCounts[answer] !== undefined) {
        answerCounts[answer]++;
      }
    });

    let maxCount = 0;
    let resultType = "";

    Object.entries(answerCounts).forEach(([type, count]) => {
      if (count > maxCount) {
        maxCount = count;
        resultType = type;
      }
    });

    return testData.results.find(result => result.type === resultType);
  };

  const currentQuestion = testData.questions[currentQuestionIndex];
  const result = getResult();

  const shareResult = async () => {
    const shareText = `🎯 Hasil Tes Kepribadianku:\n"${result?.title}"\n\n${result?.description}\n\nCoba tes kepribadianmu juga di: ${window.location.href}`;
    
    // Coba gunakan Web Share API dulu
    if (navigator.share) {
      try {
        await navigator.share({
          title: 'Hasil Tes Kepribadian',
          text: shareText,
        });
      } catch (error) {
        console.log('Error sharing:', error);
      }
    } else {
      // Fallback ke WhatsApp jika Web Share API tidak tersedia
      const whatsappUrl = `https://wa.me/?text=${encodeURIComponent(shareText)}`;
      window.open(whatsappUrl, '_blank');
    }
  };

  return (
    <div className="max-w-4xl mx-auto">
      <h2 className="text-3xl sm:text-4xl font-bold text-center mb-8 bg-gradient-to-r from-purple-400 via-pink-500 to-red-500 bg-clip-text text-transparent">
        {testData.title}
      </h2>

      <div className="bg-zinc-900/60 backdrop-blur-sm rounded-xl p-6 sm:p-8 shadow-xl border border-purple-800/20">
        {!testStarted ? (
          <div className="text-center">
            <p className="text-lg text-gray-300 mb-6">
              {testData.description}
            </p>
            <motion.button
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={startTest}
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-full hover:opacity-90 transition-all"
            >
              Mulai Tes
            </motion.button>
          </div>
        ) : showResult && result ? (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="text-center"
          >
            <div className="mb-4">
              <span className="inline-block bg-gradient-to-r from-pink-500 to-purple-500 p-1 px-3 rounded-full text-sm font-medium mb-2">
                Hasil Tes Kepribadian
              </span>
            </div>
            <h3 className="text-2xl sm:text-3xl font-bold mb-3">
              Result kamu adalah
            </h3>
            <div className="text-4xl sm:text-5xl font-extrabold mb-6 bg-gradient-to-r from-yellow-400 via-red-500 to-pink-500 bg-clip-text text-transparent">
              {result.title}
            </div>
            <p className="text-lg text-gray-300 mb-8 max-w-2xl mx-auto">
              {result.description}
            </p>
            <div className="flex justify-center gap-4">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={resetTest}
                className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-medium rounded-full hover:opacity-90 transition-all"
              >
                Coba Lagi
              </motion.button>
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={shareResult}
                className="px-6 py-2 bg-gradient-to-r from-blue-500 to-cyan-400 text-white font-medium rounded-full hover:opacity-90 transition-all flex items-center gap-2"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8.684 13.342C8.886 12.938 9 12.482 9 12c0-.482-.114-.938-.316-1.342m0 2.684a3 3 0 110-2.684m0 2.684l6.632 3.316m-6.632-6l6.632-3.316m0 0a3 3 0 105.367-2.684 3 3 0 00-5.367 2.684zm0 9.316a3 3 0 105.368 2.684 3 3 0 00-5.368-2.684z" />
                </svg>
                Bagikan
              </motion.button>
            </div>
          </motion.div>
        ) : (
          <>
            <div className="flex justify-between items-center mb-6">
              <span className="px-4 py-1 bg-purple-500/20 text-purple-300 rounded-full text-sm">
                Pertanyaan {currentQuestionIndex + 1} dari {testData.questions.length}
              </span>
            </div>
            <h3 className="text-xl sm:text-2xl font-semibold mb-6 text-white">
              {currentQuestion.text}
            </h3>
            <div className="space-y-3">
              {currentQuestion.options.map((option) => (
                <motion.button
                  key={option.id}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleAnswer(currentQuestion.id, option.id)}
                  className={`w-full text-left p-4 rounded-lg transition-all ${
                    answers[currentQuestion.id] === option.id
                      ? "bg-purple-600 text-white"
                      : "bg-zinc-800 text-gray-200 hover:bg-zinc-700"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <span className="flex-shrink-0 w-8 h-8 flex items-center justify-center rounded-full bg-zinc-700 font-medium">
                      {option.id}
                    </span>
                    <span>{option.text}</span>
                  </div>
                </motion.button>
              ))}
            </div>
            <div className="mt-8 flex justify-between">
              <button
                onClick={() => {
                  if (currentQuestionIndex > 0) {
                    setCurrentQuestionIndex(currentQuestionIndex - 1);
                  }
                }}
                className={`px-4 py-2 rounded-lg ${
                  currentQuestionIndex === 0 
                    ? "bg-zinc-700/50 text-zinc-500 cursor-not-allowed" 
                    : "bg-zinc-700 text-white hover:bg-zinc-600"
                }`}
                disabled={currentQuestionIndex === 0}
              >
                Sebelumnya
              </button>
              <div className="flex gap-2">
                {testData.questions.map((_, index) => (
                  <div 
                    key={index}
                    className={`w-3 h-3 rounded-full ${
                      index === currentQuestionIndex 
                        ? "bg-purple-500" 
                        : index < currentQuestionIndex 
                          ? "bg-purple-800" 
                          : "bg-zinc-700"
                    }`}
                  />
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
} 