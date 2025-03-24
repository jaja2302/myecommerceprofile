import { Navbar } from "@/components/Navbar";
import { Footer } from "@/components/Footer";
import Link from "next/link";


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

        <div className="grid grid-cols-1 gap-8">
          {/* Main Games Section - Two main cards side by side */}
          <div className="col-span-full mb-12">
            <h2 className="text-2xl font-bold text-white mb-6 pb-2 border-b border-purple-500 inline-block">
              Tes Kepribadian
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Personality Test Card */}
              <Link 
                href="/mini-games/personality-intro" 
                className="bg-gradient-to-br from-purple-900/40 to-black border border-purple-500/30 rounded-lg p-6 hover:shadow-lg hover:shadow-purple-500/20 transition-all group"
              >
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-purple-400 transition-colors">
                  Tes Kepribadian
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Berbagai tes kepribadian seru dan absurd untuk mengetahui sisi tersembunyi dirimu, pasanganmu, dan lainnya!
                </p>
                <div className="text-purple-500 text-sm font-medium flex items-center">
                  Pilih Tes
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
              
              {/* Curhat Anonim Card */}
              <Link 
                href="/mini-games/curhat-anonim" 
                className="bg-gradient-to-br from-blue-900/40 to-black border border-blue-500/30 rounded-lg p-6 hover:shadow-lg hover:shadow-blue-500/20 transition-all group"
              >
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-blue-400 transition-colors">
                  Curhat Anonim
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Bagikan ceritamu secara anonim dan dapatkan tanggapan dari orang lain. Tempat aman untuk mencurahkan isi hati tanpa khawatir identitasmu terungkap.
                </p>
                <div className="text-blue-500 text-sm font-medium flex items-center">
                  Mulai Curhat
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
            </div>
          </div>
          
          {/* Future Games Section */}
          <div className="col-span-full">
            <h2 className="text-2xl font-bold text-white mb-6 pb-2 border-b border-purple-500 inline-block">
              Games Lainnya
            </h2>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Anon Chat Card - NEW ADDITION */}
              <Link 
                href="/mini-games/anon-chat" 
                className="bg-gradient-to-br from-green-900/40 to-black border border-green-500/30 rounded-lg p-6 hover:shadow-lg hover:shadow-green-500/20 transition-all group"
              >
                <h3 className="text-xl font-bold text-white mb-2 group-hover:text-green-400 transition-colors">
                  Anon Chat
                </h3>
                <p className="text-gray-400 text-sm mb-4">
                  Ngobrol anonim dengan orang baru! Pilih preferensi gender dan mulai percakapan menarik dengan siapa saja tanpa harus mengungkapkan identitasmu.
                </p>
                <div className="text-green-500 text-sm font-medium flex items-center">
                  Mulai Chat
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 ml-1 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                </div>
              </Link>
              
              {/* Coming Soon Card */}
              <div className="bg-gradient-to-br from-gray-900/40 to-black border border-gray-700/30 rounded-lg p-6 text-center">
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
      </div>
      
      <Footer />
    </div>
  );
} 