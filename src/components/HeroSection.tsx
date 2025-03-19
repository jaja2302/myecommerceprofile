"use client";

import React from "react";
import { motion } from "framer-motion";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { SparklesCore } from "@/components/ui/sparkles";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import { useTranslation } from 'react-i18next';
import Image from "next/image";

export function HeroSection() {
  const { t } = useTranslation();

  const words = [
    { text: t('hero.words.innovative') },
    { text: t('hero.words.powerful') },
    { text: t('hero.words.seamless') },
    { text: t('hero.words.beautiful') },
  ];

  return (
    <div className="relative min-h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden pt-16 sm:pt-20">
      <div className="absolute inset-0 w-full h-full">
        <SparklesCore
          id="tsparticlesfullpage"
          background="transparent"
          minSize={0.6}
          maxSize={1.2}
          particleDensity={100}
          className="w-full h-full"
          particleColor="#FFFFFF"
        />
      </div>
      
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-8 px-4 sm:px-6 py-8">
        <div className="flex-1 space-y-6 sm:space-y-8 text-center lg:text-left mt-4 sm:mt-0">
          <div className="space-y-2">
            <h1 className="text-5xl sm:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              Developer
            </h1>
            <h2 className="text-4xl sm:text-6xl font-bold text-white">
              Solution<span className="text-purple-500">.</span>
            </h2>
          </div>
          <div className="h-16 sm:h-20">
            <TypewriterEffect
              words={words}
              cursorClassName="bg-purple-500"
            />
          </div>
          <p className="text-lg sm:text-xl text-gray-300 max-w-xl mx-auto lg:mx-0">
            {t('hero.description')}
          </p>
          <div className="flex flex-col sm:flex-row gap-4 pt-4 items-center justify-center lg:justify-start">
            <motion.button 
              className="w-full sm:w-auto px-6 sm:px-8 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium rounded-full hover:opacity-90 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              View Apps
            </motion.button>
            <motion.button 
              className="w-full sm:w-auto px-6 sm:px-8 py-3 border border-white/30 text-white font-medium rounded-full hover:bg-white/10 transition-all backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              About Me
            </motion.button>
          </div>
        </div>
        <div className="flex-1 flex justify-center items-center w-full max-w-[90%] mx-auto lg:max-w-none">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
            className="w-full"
          >
            <BackgroundGradient className="rounded-[22px] max-w-sm mx-auto p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-black/70 p-2 rounded-[20px] h-full">
                <Image 
                  src="/img/image.png" 
                  alt="Application Screenshot" 
                  width={400}
                  height={300}
                  className="rounded-[14px] w-full h-auto" 
                />
                <div className="p-4">
                  <h3 className="text-white font-medium text-lg">Featured App</h3>
                  <p className="text-gray-300 text-sm">Check out my latest creation</p>
                </div>
              </div>
            </BackgroundGradient>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 