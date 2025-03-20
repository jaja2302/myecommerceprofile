"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import { Canvas } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import type { TechStackItem } from "../TechStack";

interface TechDetailOrbitalProps {
  tech: TechStackItem;
  onBack: () => void;
}

export function TechDetailOrbital({ tech, onBack }: TechDetailOrbitalProps) {
  const [activeFeature, setActiveFeature] = useState(0);

  return (
    <div className="relative min-h-[600px]">
      <div className="absolute inset-0">
        <Canvas camera={{ position: [0, 0, 6], fov: 60 }}>
          <ambientLight intensity={0.3} />
          <pointLight position={[10, 10, 10]} intensity={0.7} />
          <pointLight position={[-10, -10, -10]} intensity={0.2} />
          <Stars radius={300} depth={60} count={1000} factor={7} />
          <OrbitControls enableZoom={false} />
        </Canvas>
      </div>

      {/* Content overlay */}
      <div className="relative z-10 flex items-center justify-center py-16">
        {/* Main content */}
        <div className="container max-w-2xl mx-auto px-4">
          <div className="bg-black/30 backdrop-blur-sm rounded-2xl p-6">
            {/* Header section */}
            <motion.div 
              className="flex items-center justify-between mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5 }}
            >
              <div className="flex items-center gap-4">
                <div 
                  className="w-16 h-16 rounded-full flex items-center justify-center"
                  style={{ backgroundColor: `${tech.color}20` }}
                >
                  <div className="relative w-10 h-10">
                    <Image
                      src={tech.icon}
                      alt={tech.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
                <div>
                  <h1 className="text-2xl font-bold text-white mb-1">{tech.name}</h1>
                  <p className="text-gray-400">{tech.experience}</p>
                </div>
              </div>
              
              <motion.button
                className="bg-black/50 hover:bg-black/70 text-white px-4 py-2 rounded-lg backdrop-blur-sm flex items-center gap-2 text-sm h-10"
                onClick={onBack}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <span>Back</span>
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </motion.button>
            </motion.div>

            {/* Usage Stats */}
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.2 }}
            >
              <h2 className="text-lg font-semibold text-white mb-3">Usage Stats</h2>
              <div className="space-y-2">
                <div>
                  <div className="flex justify-between text-sm text-gray-300 mb-1">
                    <span>{tech.usageStats.category}</span>
                    <span>{tech.usageStats.percentage}%</span>
                  </div>
                  <div className="h-2 bg-gray-700 rounded-full overflow-hidden">
                    <motion.div
                      className="h-full rounded-full"
                      style={{ backgroundColor: tech.color }}
                      initial={{ width: 0 }}
                      animate={{ width: `${tech.usageStats.percentage}%` }}
                      transition={{ duration: 1, delay: 0.5 }}
                    />
                  </div>
                </div>
              </div>
            </motion.div>

            {/* Description */}
            <motion.div
              className="mb-6"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.3 }}
            >
              <h2 className="text-lg font-semibold text-white mb-2">Description</h2>
              <p className="text-gray-300 text-sm leading-relaxed">{tech.description}</p>
            </motion.div>

            {/* Features */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.4 }}
            >
              <h2 className="text-lg font-semibold text-white mb-3">Key Features</h2>
              <div className="flex gap-2 mb-3">
                {tech.features.map((_, index) => (
                  <button
                    key={index}
                    className={`w-2 h-2 rounded-full transition-colors ${
                      activeFeature === index ? 'bg-white' : 'bg-gray-600'
                    }`}
                    onClick={() => {
                      setActiveFeature(index);
                      setTimeout(() => setActiveFeature(0), 5000);
                    }}
                  />
                ))}
              </div>
              <motion.div
                key={activeFeature}
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3 }}
                className="bg-black/30 backdrop-blur-sm rounded-lg p-4"
              >
                <p className="text-white text-sm">{tech.features[activeFeature]}</p>
              </motion.div>
            </motion.div>
          </div>
        </div>
      </div>
    </div>
  );
} 