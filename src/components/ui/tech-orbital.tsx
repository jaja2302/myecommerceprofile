"use client";

import { useRef, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import gsap from "gsap";

interface TechOrbitalProps {
  techStack: {
    name: string;
    icon: string;
    color: string;
    orbit: {
      radius: number;
      speed: number;
      inclination: number;
      startPosition: number;
    };
  }[];
}

export function TechOrbital({ techStack }: TechOrbitalProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const orbitRef = useRef<HTMLDivElement>(null);
  
  useEffect(() => {
    if (!orbitRef.current) return;
    
    // Create mouse parallax effect
    const handleMouseMove = (e: MouseEvent) => {
      if (!containerRef.current || !orbitRef.current) return;
      
      const { left, top, width, height } = containerRef.current.getBoundingClientRect();
      const centerX = left + width / 2;
      const centerY = top + height / 2;
      
      // Calculate mouse distance from center
      const moveX = (e.clientX - centerX) / 25;
      const moveY = (e.clientY - centerY) / 25;
      
      // Apply tilt effect based on mouse position
      gsap.to(containerRef.current, {
        rotateX: -moveY,
        rotateY: moveX,
        duration: 1,
        ease: "power2.out"
      });
    };
    
    window.addEventListener("mousemove", handleMouseMove);
    
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
    };
  }, []);
  
  return (
    <div 
      ref={containerRef}
      className="w-full h-96 relative flex items-center justify-center perspective-1000"
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Center sphere (Sun) */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: 1 }}
        transition={{ duration: 1, delay: 0.2 }}
        className="w-24 h-24 rounded-full bg-yellow-500 absolute z-10 flex items-center justify-center"
        style={{ boxShadow: "0 0 60px rgba(255, 196, 0, 0.3)" }}
      >
        <span className="text-gray-900 font-bold">TECH</span>
      </motion.div>
      
      {/* Orbital paths */}
      <div 
        ref={orbitRef}
        className="absolute w-full h-full preserve-3d"
      >
        {techStack.map((tech, index) => {
          // Memberikan radius orbit yang berbeda untuk setiap tech
          const radius = 120 + (index * 40); // Jarak antar orbit 40px
          const speed = 20 + (index * 5); // Kecepatan orbit berbeda
          const angle = (index / techStack.length) * Math.PI * 2;
          
          // Calculate 3D position on the orbit
          const x = Math.sin(angle) * radius;
          const z = Math.cos(angle) * radius;
          
          // Animasi orbit individual
          useEffect(() => {
            if (!orbitRef.current) return;
            gsap.to(`#tech-${index}`, {
              rotateZ: 360,
              duration: speed,
              ease: "linear",
              repeat: -1,
              transformOrigin: "center center"
            });
          }, []);

          return (
            <div key={tech.name} id={`tech-${index}`} className="absolute w-full h-full">
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.1 * index }}
                className="absolute left-1/2 top-1/2 w-16 h-16 flex items-center justify-center"
                style={{ 
                  transform: `translate(-50%, -50%) translate3d(${x}px, 0, ${z}px)`,
                  zIndex: z < 0 ? 0 : 20
                }}
              >
                {/* Tech planet */}
                <div 
                  className="w-12 h-12 rounded-full flex items-center justify-center"
                  style={{ 
                    backgroundColor: `${tech.color}20`, 
                    boxShadow: `0 0 20px ${tech.color}40`,
                    transform: `scale(${1 - index * 0.1})` // Ukuran planet mengecil
                  }}
                >
                  <div className="relative w-8 h-8">
                    <Image
                      src={tech.icon}
                      alt={tech.name}
                      fill
                      className="object-contain"
                    />
                  </div>
                </div>
                
                {/* Orbit path visualization */}
                <div 
                  className="absolute left-1/2 top-1/2 rounded-full border border-gray-600 opacity-20"
                  style={{
                    width: radius * 2,
                    height: radius * 2,
                    transform: 'translate(-50%, -50%)'
                  }}
                />

                {/* Tech name tooltip */}
                <div 
                  className="absolute top-full mt-1 px-2 py-1 rounded text-xs font-bold"
                  style={{ 
                    backgroundColor: tech.color,
                    color: '#000',
                    opacity: z > 0 ? 1 : 0.3,
                    transform: `scale(${z > 0 ? 1 : 0.8})`
                  }}
                >
                  {tech.name}
                </div>
              </motion.div>
            </div>
          );
        })}
      </div>
      
      {/* Particle effects */}
      {Array.from({ length: 50 }).map((_, i) => (
        <motion.div
          key={i}
          className="absolute rounded-full"
          initial={{ 
            opacity: 0,
            x: (Math.random() - 0.5) * 400, 
            y: (Math.random() - 0.5) * 400,
            z: (Math.random() - 0.5) * 400,
            scale: Math.random() * 0.5 + 0.5
          }}
          animate={{ 
            opacity: [0, 0.5, 0],
            scale: [0, Math.random() * 0.5 + 0.5, 0]
          }}
          transition={{
            duration: 2 + Math.random() * 4,
            repeat: Infinity,
            delay: Math.random() * 5,
            ease: "easeInOut"
          }}
          style={{
            width: Math.random() * 3 + 1,
            height: Math.random() * 3 + 1,
            backgroundColor: techStack[i % techStack.length].color,
            transform: `translate3d(0, 0, ${(Math.random() - 0.5) * 200}px)`
          }}
        />
      ))}
    </div>
  );
} 