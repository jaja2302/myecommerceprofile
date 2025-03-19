"use client";

import React from "react";
import { motion } from "framer-motion";
import { cn } from "@/utils/cn";
import { BackgroundGradient } from "@/components/ui/background-gradient";
import { SparklesCore } from "@/components/ui/sparkles";
import { TypewriterEffect } from "@/components/ui/typewriter-effect";
import { Navbar } from "@/components/Navbar";
import { useTranslation } from 'react-i18next';

export function HeroSection() {
  const { t } = useTranslation();

  const words = [
    { text: t('hero.words.innovative') },
    { text: t('hero.words.powerful') },
    { text: t('hero.words.seamless') },
    { text: t('hero.words.beautiful') },
  ];

  return (
    <div className="relative h-screen w-full bg-black flex flex-col items-center justify-center overflow-hidden">
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
      
      <div className="relative z-10 w-full max-w-7xl mx-auto flex flex-col lg:flex-row items-center justify-between gap-12 px-6 py-12 mt-16">
        <div className="flex-1 space-y-8">
          <h1 className="text-6xl font-bold text-white">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500">
              {t('hero.title')}
            </span>
          </h1>
          <div className="h-20">
            <TypewriterEffect
              words={words}
              cursorClassName="bg-purple-500"
            />
          </div>
          <p className="text-xl text-gray-300 max-w-xl">
            {t('hero.description')}
          </p>
          <div className="flex gap-4 pt-4">
            <motion.button 
              className="px-8 py-3 bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 text-white font-medium rounded-full hover:opacity-90 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
            >
              {t('hero.buttons.getStarted')}
            </motion.button>
            <motion.button 
              className="px-8 py-3 border border-white/30 text-white font-medium rounded-full hover:bg-white/10 transition-all backdrop-blur-sm"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                document.getElementById('about')?.scrollIntoView({ behavior: 'smooth' });
              }}
            >
              {t('hero.buttons.learnMore')}
            </motion.button>
          </div>
        </div>
        <div className="flex-1 flex justify-center items-center">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.2 }}
          >
            <BackgroundGradient className="rounded-[22px] max-w-sm p-4 bg-black/50 backdrop-blur-sm">
              <div className="bg-black/70 p-2 rounded-[20px] h-full">
                <img 
                  src="/app-screenshot.png" 
                  alt="Application Screenshot" 
                  className="rounded-[14px] w-full h-auto" 
                />
                <div className="p-4">
                  <h3 className="text-white font-medium text-lg">{t('hero.appCard.title')}</h3>
                  <p className="text-gray-300 text-sm">{t('hero.appCard.subtitle')}</p>
                </div>
              </div>
            </BackgroundGradient>
          </motion.div>
        </div>
      </div>
    </div>
  );
} 