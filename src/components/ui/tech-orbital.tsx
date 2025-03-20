"use client";

import { useRef, useEffect, useState } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import gsap from "gsap";

interface TechOrbitalProps {
  techStack: {
    name: string;
    icon: string;
    color: string;
    description?: string;
    features?: string[];
    experience?: string;
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
  const [hoveredTech, setHoveredTech] = useState<number | null>(null);
  const [isBurstActive, setIsBurstActive] = useState(false);
  
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

  // Periodic burst animation
  useEffect(() => {
    const interval = setInterval(() => {
      setIsBurstActive(true);
      setTimeout(() => setIsBurstActive(false), 1500);
    }, 10000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div 
      ref={containerRef}
      className="w-full h-96 relative flex items-center justify-center perspective-1000"
      style={{ transformStyle: "preserve-3d" }}
    >
      {/* Center sphere (Sun) with pulsating effect */}
      <motion.div
        initial={{ scale: 0 }}
        animate={{ scale: [1, 1.1, 1], boxShadow: ["0 0 30px rgba(255, 196, 0, 0.3)", "0 0 45px rgba(255, 196, 0, 0.5)", "0 0 30px rgba(255, 196, 0, 0.3)"] }}
        transition={{ 
          duration: 3, 
          repeat: Infinity,
          repeatType: "loop"
        }}
        className="w-16 h-16 rounded-full bg-gradient-to-br from-yellow-400 to-orange-500 absolute z-10 flex items-center justify-center"
      >
        <motion.span 
          animate={{ 
            scale: [1, 1.05, 1],
            textShadow: ["0 0 5px rgba(255,255,255,0.5)", "0 0 20px rgba(255,255,255,0.8)", "0 0 5px rgba(255,255,255,0.5)"]
          }}
          transition={{ duration: 2, repeat: Infinity }}
          className="text-gray-900 text-sm font-bold"
        >
          TECH
        </motion.span>
        
        {/* Burst animation */}
        {isBurstActive && (
          <motion.div
            initial={{ scale: 0, opacity: 0.8 }}
            animate={{ scale: 3, opacity: 0 }}
            transition={{ duration: 1.5, ease: "easeOut" }}
            className="absolute w-full h-full rounded-full bg-gradient-to-br from-yellow-300 to-orange-400 z-0"
          />
        )}
      </motion.div>
      
      {/* Orbital paths */}
      <div 
        ref={orbitRef}
        className="absolute w-full h-full preserve-3d"
      >
        {techStack.map((tech, index) => {
          // Menggunakan radius dari konfigurasi orbit
          const radius = tech.orbit.radius;
          const speed = tech.orbit.speed;
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

          const isHovered = hoveredTech === index;

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
                onMouseEnter={() => setHoveredTech(index)}
                onMouseLeave={() => setHoveredTech(null)}
              >
                {/* Tech planet with hover effect */}
                <motion.div 
                  animate={isHovered ? {
                    scale: 1.2,
                    boxShadow: `0 0 30px ${tech.color}80`,
                    backgroundColor: `${tech.color}40`,
                  } : {
                    scale: 1 - index * 0.1,
                    boxShadow: `0 0 20px ${tech.color}40`,
                    backgroundColor: `${tech.color}20`,
                  }}
                  transition={{ duration: 0.3 }}
                  className="w-12 h-12 rounded-full flex items-center justify-center cursor-pointer"
                >
                  <motion.div 
                    className="relative w-8 h-8"
                    animate={isHovered ? { rotate: 360 } : {}}
                    transition={{ duration: 2, ease: "linear" }}
                  >
                    <Image
                      src={tech.icon}
                      alt={tech.name}
                      fill
                      className="object-contain"
                    />
                  </motion.div>
                </motion.div>
                
                {/* Orbit path visualization with interactivity */}
                <motion.div 
                  className="absolute left-1/2 top-1/2 rounded-full border opacity-20"
                  style={{
                    width: radius * 2,
                    height: radius * 2,
                    transform: 'translate(-50%, -50%)'
                  }}
                  animate={{
                    borderColor: isHovered ? tech.color : 'rgb(75,85,99)',
                    opacity: isHovered ? 0.4 : 0.2,
                    borderWidth: isHovered ? '2px' : '1px',
                  }}
                  transition={{ duration: 0.3 }}
                />

                {/* Tech name tooltip with animation */}
                <motion.div 
                  className="absolute top-full mt-1 px-2 py-1 rounded text-xs font-bold pointer-events-none"
                  style={{ 
                    backgroundColor: tech.color,
                    color: '#000',
                  }}
                  animate={{ 
                    opacity: z > 0 ? (isHovered ? 1 : 0.7) : (isHovered ? 0.7 : 0.3),
                    scale: isHovered ? 1.1 : (z > 0 ? 1 : 0.8),
                    y: isHovered ? -5 : 0,
                    boxShadow: isHovered ? `0 0 15px ${tech.color}60` : 'none'
                  }}
                  transition={{ duration: 0.3 }}
                >
                  {tech.name}
                </motion.div>
                
                {/* Tech preview card on hover */}
                {isHovered && z > 0 && (
                  <motion.div
                    initial={{ opacity: 0, scale: 0.8, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    transition={{ duration: 0.2 }}
                    className="absolute top-full mt-6 left-1/2 transform -translate-x-1/2 bg-black/80 backdrop-blur-sm rounded-lg p-3 w-40 z-30 pointer-events-none"
                  >
                    <div className="text-xs text-gray-200 leading-tight">
                      {tech.description?.substring(0, 60)}...
                    </div>
                    {tech.experience && (
                      <div className="mt-2 text-xs text-white font-semibold">
                        Experience: {tech.experience}
                      </div>
                    )}
                    <div className="mt-1 text-[10px] text-gray-400 text-center">
                      Click to explore
                    </div>
                  </motion.div>
                )}
              </motion.div>
            </div>
          );
        })}
      </div>
      
      {/* Interactive particle effects */}
      <div className="absolute inset-0 overflow-hidden">
        {Array.from({ length: 50 }).map((_, i) => {
          const speed = 2 + Math.random() * 4;
          const size = Math.random() * 3 + 1;
          const delay = Math.random() * 5;
          const techIndex = i % techStack.length;
          const isHighlighted = hoveredTech === techIndex;
          
          return (
            <motion.div
              key={i}
              className="absolute rounded-full pointer-events-none"
              initial={{ 
                opacity: 0,
                x: (Math.random() - 0.5) * 400, 
                y: (Math.random() - 0.5) * 400,
                z: (Math.random() - 0.5) * 400,
                scale: Math.random() * 0.5 + 0.5
              }}
              animate={{ 
                opacity: isHighlighted ? [0, 0.8, 0] : [0, 0.5, 0],
                scale: [0, isHighlighted ? Math.random() * 0.8 + 0.7 : Math.random() * 0.5 + 0.5, 0]
              }}
              transition={{
                duration: isHighlighted ? speed * 0.8 : speed,
                repeat: Infinity,
                delay: delay,
                ease: "easeInOut"
              }}
              style={{
                width: size,
                height: size,
                backgroundColor: techStack[techIndex].color,
                transform: `translate3d(0, 0, ${(Math.random() - 0.5) * 200}px)`
              }}
            />
          );
        })}
      </div>
    </div>
  );
} 