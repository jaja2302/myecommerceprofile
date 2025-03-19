"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const { t, i18n, ready } = useTranslation();
  
  useEffect(() => {
    const handleScroll = () => {
      if (window.scrollY > 50) {
        setIsScrolled(true);
      } else {
        setIsScrolled(false);
      }
    };
    
    window.addEventListener("scroll", handleScroll);
    return () => window.removeEventListener("scroll", handleScroll);
  }, []);

  const handleScrollToSection = (sectionId: string) => {
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: offsetTop - 80, // Adjust for navbar height
        behavior: "smooth"
      });
    }
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
  };
  
  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-md py-2' : 'bg-transparent py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        <div className="text-white font-bold text-2xl">El Shop<span className="text-purple-500">.</span></div>
        <div className="hidden md:flex items-center gap-8">
          <button 
            onClick={() => handleScrollToSection("about")}
            className="text-gray-300 hover:text-white transition-colors"
          >
            {t('nav.about')}
          </button>
          <button 
            onClick={() => handleScrollToSection("products")}
            className="text-gray-300 hover:text-white transition-colors"
          >
            {t('nav.products')}
          </button>
          <button 
            onClick={() => handleScrollToSection("testimonials")}
            className="text-gray-300 hover:text-white transition-colors"
          >
            {t('nav.testimonials')}
          </button>
          <button 
            onClick={() => handleScrollToSection("contact")}
            className="text-gray-300 hover:text-white transition-colors"
          >
            {t('nav.contact')}
          </button>
          <div className="flex items-center gap-2">
            <button
              onClick={() => changeLanguage('en')}
              className={`px-2 py-1 rounded ${i18n.language === 'en' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:text-white'}`}
            >
              EN
            </button>
            <button
              onClick={() => changeLanguage('id')}
              className={`px-2 py-1 rounded ${i18n.language === 'id' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:text-white'}`}
            >
              ID
            </button>
          </div>
        </div>
        <motion.button 
          className="px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-full hover:opacity-90 transition-all"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          {t('nav.download')}
        </motion.button>
      </div>
    </nav>
  );
} 