import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";
import { personalityTests } from "@/data/personalityTests";

export default function MiniGames() {
  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      
      <div className="max-w-7xl mx-auto px-4 sm:px-6 pt-32 pb-20">
        <h1 className="text-4xl sm:text-6xl font-bold text-white text-center mb-4">
          Mini <span className="text-purple-500">Games</span>
        </h1>
        <p className="text-gray-300 text-center mb-12 max-w-3xl mx-auto">
          Koleksi permainan singkat dan tes kepribadian seru untuk mengisi waktu luangmu.
          Pilih salah satu di bawah ini dan nikmati keseruannya!
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-8">
          {/* Personality Tests Section */}
          <div className="col-span-full mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 pb-2 border-b border-purple-500 inline-block">
              Tes Kepribadian
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {personalityTests.map((test, index) => (
                <Link 
                  href={`/mini-games/personality-test/${index}`} 
                  key={index}
                  className="bg-gradient-to-br from-purple-900/40 to-black border border-purple-500/30 rounded-lg p-6 hover:shadow-lg hover:shadow-purple-500/20 transition-all group"
                >
                  <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                    {test.title.replace(/\"([^\"]*)\"/g, '$1')}
                  </h3>
                  <p className="text-gray-400 text-sm mb-4">
                    {test.description.length > 100 
                      ? test.description.substring(0, 100) + '...' 
                      : test.description}
                  </p>
                  <div className="text-purple-500 text-sm font-medium flex items-center">
                    Mulai Tes
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                    </svg>
                  </div>
                </Link>
              ))}
            </div>
          </div>
          
          {/* Placeholder for future games */}
          <div className="col-span-full">
            <h2 className="text-2xl font-bold text-white mb-6 pb-2 border-b border-purple-500 inline-block">
              Games Lainnya
            </h2>
            
            <div className="bg-gradient-to-br from-gray-900/40 to-black border border-gray-700/30 rounded-lg p-8 text-center">
              <h3 className="text-xl font-bold text-gray-300 mb-2">
                Coming Soon!
              </h3>
              <p className="text-gray-400">
                Mini games lainnya akan segera hadir. Tunggu update selanjutnya!
              </p>
            </div>
          </div>
        </div>
      </div>
      
      <Footer />
    </div>
  );
} 