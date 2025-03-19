"use client";

import React from "react";
import { motion } from "framer-motion";
import { useTranslation } from 'react-i18next';
import { FaInstagram } from "react-icons/fa";
export function Footer() {
  const { t } = useTranslation();
  const currentYear = new Date().getFullYear();

  return (
    <footer className="w-full bg-black border-t border-white/10">
      <div className="max-w-7xl mx-auto px-4 py-12">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          <div>
            <h3 className="text-xl font-bold text-white mb-4">About Me</h3>
            <p className="text-gray-400 mb-4">
              A passionate developer creating high-quality applications and digital solutions.
              Let's work together to bring your ideas to life.
            </p>
            <div className="flex space-x-4">
                <a href="https://www.instagram.com/jaja_valentinoo/" target="_blank" rel="noopener noreferrer" className="text-gray-400 hover:text-white transition-colors">  <FaInstagram /> </a>
            </div>
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Quick Links</h3>
            <ul className="space-y-2">
              <li>
                <a href="#about" className="text-gray-400 hover:text-white transition-colors">About Me</a>
              </li>
              <li>
                <a href="#products" className="text-gray-400 hover:text-white transition-colors">My Apps</a>
              </li>
              <li>
                <a href="#testimonials" className="text-gray-400 hover:text-white transition-colors">Reviews</a>
              </li>
              <li>
                <a href="#contact" className="text-gray-400 hover:text-white transition-colors">Contact</a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-xl font-bold text-white mb-4">Contact Info</h3>
            <ul className="space-y-2">
              <li className="text-gray-400">
                <span className="text-purple-400">Email:</span> valentinojaja@gmail.com
              </li>
              <li className="text-gray-400">
                <span className="text-purple-400">Phone:</span> +62 858-4911-1906
              </li>
              <li className="text-gray-400">
                <span className="text-purple-400">Location:</span> Indonesia
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-12 pt-8 border-t border-white/10 text-center">
          <p className="text-gray-400">
            © {currentYear} El Shop. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  );
} 