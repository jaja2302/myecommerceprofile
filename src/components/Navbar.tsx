"use client";

import React, { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';

export function Navbar() {
  const [isScrolled, setIsScrolled] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const { t, i18n } = useTranslation();
  
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
    // Check if we're on the homepage
    const isHomePage = window.location.pathname === '/';
    
    if (!isHomePage) {
      // If not on homepage, redirect to homepage with section hash
      window.location.href = `/#${sectionId}`;
      return;
    }
    
    // Existing scroll behavior for homepage
    const element = document.getElementById(sectionId);
    if (element) {
      const offsetTop = element.getBoundingClientRect().top + window.pageYOffset;
      window.scrollTo({
        top: offsetTop - 80,
        behavior: "smooth"
      });
    }
    setIsMobileMenuOpen(false);
  };

  const changeLanguage = (lng: string) => {
    i18n.changeLanguage(lng);
    setIsMobileMenuOpen(false);
  };

  // Tambahkan fungsi untuk navigasi ke halaman lain
  const navigateToPage = (path: string) => {
    window.location.href = path;
    setIsMobileMenuOpen(false);
  };
  
  return (
    <nav className={`fixed w-full z-50 transition-all duration-300 ${isScrolled ? 'bg-black/80 backdrop-blur-md py-2' : 'bg-transparent py-4'}`}>
      <div className="max-w-7xl mx-auto px-4 flex items-center justify-between">
        <div className="text-white font-bold text-xl sm:text-2xl">El Shop<span className="text-purple-500">.</span></div>
        
        {/* Desktop Menu */}
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
            onClick={() => handleScrollToSection("tech-stack")}
            className="text-gray-300 hover:text-white transition-colors"
          >
            Tech Stack
          </button>
          <button 
            onClick={() => navigateToPage('/mini-games')}
            className="text-gray-300 hover:text-white transition-colors"
          >
            Mini Games
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

        <div className="flex items-center gap-4">
          <motion.button 
            className="hidden sm:block px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-full hover:opacity-90 transition-all"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {t('nav.download')}
          </motion.button>

          {/* Mobile Menu Button */}
          <button
            onClick={() => setIsMobileMenuOpen(!isMobileMenuOpen)}
            className="md:hidden text-white p-2"
          >
            <svg
              className="w-6 h-6"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              {isMobileMenuOpen ? (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              ) : (
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M4 6h16M4 12h16M4 18h16"
                />
              )}
            </svg>
          </button>
        </div>
      </div>

      {/* Mobile Menu */}
      {isMobileMenuOpen && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="md:hidden absolute top-full left-0 w-full bg-black/95 backdrop-blur-md py-4 px-4"
        >
          <div className="flex flex-col gap-4">
            <button 
              onClick={() => handleScrollToSection("about")}
              className="text-gray-300 hover:text-white transition-colors py-2"
            >
              {t('nav.about')}
            </button>
            <button 
              onClick={() => handleScrollToSection("products")}
              className="text-gray-300 hover:text-white transition-colors py-2"
            >
              {t('nav.products')}
            </button>
            <button 
              onClick={() => handleScrollToSection("tech-stack")}
              className="text-gray-300 hover:text-white transition-colors py-2"
            >
              Tech Stack
            </button>
            <button 
              onClick={() => navigateToPage('/mini-games')}
              className="text-gray-300 hover:text-white transition-colors py-2"
            >
              Mini Games
            </button>
            <button 
              onClick={() => handleScrollToSection("testimonials")}
              className="text-gray-300 hover:text-white transition-colors py-2"
            >
              {t('nav.testimonials')}
            </button>
            <button 
              onClick={() => handleScrollToSection("contact")}
              className="text-gray-300 hover:text-white transition-colors py-2"
            >
              {t('nav.contact')}
            </button>
            <div className="flex items-center gap-2 py-2">
              <button
                onClick={() => changeLanguage('en')}
                className={`px-4 py-2 rounded ${i18n.language === 'en' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:text-white'}`}
              >
                EN
              </button>
              <button
                onClick={() => changeLanguage('id')}
                className={`px-4 py-2 rounded ${i18n.language === 'id' ? 'bg-purple-500 text-white' : 'text-gray-300 hover:text-white'}`}
              >
                ID
              </button>
            </div>
            <motion.button 
              className="w-full px-5 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white font-medium rounded-full hover:opacity-90 transition-all"
              whileHover={{ scale: 1.05 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => setIsMobileMenuOpen(false)}
            >
              {t('nav.download')}
            </motion.button>
          </div>
        </motion.div>
      )}
    </nav>
  );
} 