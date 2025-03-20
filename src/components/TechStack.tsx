"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ThreeBackground } from "./ui/ThreeBackground";
import { TechOrbital } from "./ui/tech-orbital";

// Tech icons
const techStack = [
  {
    name: "PHP",
    icon: "/img/php.svg",
    color: "#8892BF",
    orbit: {
      radius: 50,
      speed: 15,
      inclination: 5,
      startPosition: 0
    }
  },
  {
    name: "JavaScript",
    icon: "/img/javascript.svg",
    color: "#F7DF1E",
    orbit: {
      radius: 75,
      speed: 20,
      inclination: -3,
      startPosition: 72
    }
  },
  {
    name: "Node.js",
    icon: "/img/nodejs.svg",
    color: "#339933",
    orbit: {
      radius: 100,
      speed: 25,
      inclination: 7,
      startPosition: 144
    }
  },
  {
    name: "MySQL",
    icon: "/img/mysql.svg",
    color: "#4479A1",
    orbit: {
      radius: 125,
      speed: 30,
      inclination: -4,
      startPosition: 216
    }
  },
  {
    name: "SQLite",
    icon: "/img/sqlite.svg",
    color: "#003B57",
    orbit: {
      radius: 150,
      speed: 35,
      inclination: 6,
      startPosition: 288
    }
  }
];

export function TechStack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [selectedTech, setSelectedTech] = useState<number | null>(null);
  const [isZoomed, setIsZoomed] = useState(false);

  // Define addToRefs function here, before the useEffect
  const addToRefs = (el: HTMLDivElement | null, index: number) => {
    if (el && !textRefs.current.includes(el)) {
      textRefs.current[index] = el;
    }
  };
  
  useEffect(() => {
    // GSAP animation for floating text
    if (textRefs.current.length > 0) {
      textRefs.current.forEach((el, index) => {
        if (el) {
          gsap.to(el, {
            y: -15,
            duration: 1.5 + index * 0.2,
            repeat: -1,
            yoyo: true,
            ease: "power1.inOut",
            delay: index * 0.3
          });
        }
      });
    }
  }, []);

  const handleTechClick = (index: number) => {
    setSelectedTech(index);
    setIsZoomed(true);
  };

  // Extract colors for Three.js background
  const techColors = techStack.map(tech => tech.color);

  return (
    <div className="py-16 relative" ref={containerRef}>
      {/* Make the ThreeBackground interactive with onClick */}
      <ThreeBackground 
        colors={techColors} 
        focusedTech={selectedTech}
        onFocusComplete={() => {}} 
        onOrbitClick={handleTechClick}
      />
      
      {/* Alternative orbit visualization for fallback */}
      {selectedTech === null && (
        
        <div className="relative z-10 opacity-70 pointer-events-none">
            <div className="text-center mb-16 relative z-10">
          <motion.h2 
            className="text-4xl font-bold text-white mb-4"
            initial={{ opacity: 0, y: -20 }}
            whileInView={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            viewport={{ once: true }}
          >
            Our Tech Stack
          </motion.h2>
          <motion.p 
            className="text-gray-400 max-w-2xl mx-auto"
            initial={{ opacity: 0 }}
            whileInView={{ opacity: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            viewport={{ once: true }}
          >
            We use cutting-edge technologies to build robust and scalable solutions.
            <span className="block mt-2 text-sm text-gray-500">Click on any planet to explore its orbit.</span>
          </motion.p>
        </div>
          <TechOrbital 
            techStack={techStack} />
        </div>
      )}
      

  
    </div>
  );
} 