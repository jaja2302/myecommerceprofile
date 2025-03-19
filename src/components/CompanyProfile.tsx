"use client";

import React from "react";
import { motion } from "framer-motion";
import { BackgroundBeams } from "@/components/ui/background-beams";
import { useTranslation } from 'react-i18next';

export function CompanyProfile() {
  const { t } = useTranslation();
  
  return (
    <div className="relative h-[100vh] w-full bg-neutral-950 flex flex-col items-center justify-center antialiased">
      <div className="max-w-2xl mx-auto p-4">
        <h1 className="relative z-10 text-5xl md:text-7xl bg-clip-text text-transparent bg-gradient-to-b from-neutral-200 to-neutral-600 text-center font-sans font-bold">
          About Me
        </h1>
        <p className="text-neutral-300 max-w-lg mx-auto my-8 text-lg relative z-10 text-center">
          I'm a passionate full-stack developer with expertise in web and mobile development. 
          Specializing in creating modern, efficient, and user-friendly applications.
        </p>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 relative z-10">
          <div className="bg-black/30 backdrop-blur-sm p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-purple-400 mb-4">Skills</h3>
            <ul className="space-y-2 text-neutral-300">
              <li>• Frontend: React, Next.js, React Native</li>
              <li>• Backend: Node.js, Python, Laravel</li>
              <li>• Database: MySQL, MongoDB, PostgreSQL</li>
              <li>• UI/UX Design & Development</li>
            </ul>
          </div>
          
          <div className="bg-black/30 backdrop-blur-sm p-6 rounded-lg">
            <h3 className="text-xl font-semibold text-purple-400 mb-4">Experience</h3>
            <ul className="space-y-2 text-neutral-300">
              <li>• 5+ years in Full-stack Development</li>
              <li>• 10+ Successful App Launches</li>
              <li>• Mobile & Web App Development</li>
              <li>• E-commerce Solutions</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 grid grid-cols-1 md:grid-cols-3 gap-4 relative z-10">
          <div className="bg-black/30 backdrop-blur-sm p-4 rounded-lg text-center">
            <h4 className="text-2xl font-bold text-purple-400">15+</h4>
            <p className="text-neutral-300">Projects Completed</p>
          </div>
          <div className="bg-black/30 backdrop-blur-sm p-4 rounded-lg text-center">
            <h4 className="text-2xl font-bold text-purple-400">100%</h4>
            <p className="text-neutral-300">Client Satisfaction</p>
          </div>
          <div className="bg-black/30 backdrop-blur-sm p-4 rounded-lg text-center">
            <h4 className="text-2xl font-bold text-purple-400">24/7</h4>
            <p className="text-neutral-300">Support Available</p>
          </div>
        </div>
      </div>
      <BackgroundBeams />
    </div>
  );
} 