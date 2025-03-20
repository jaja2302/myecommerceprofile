"use client";

import { motion } from "framer-motion";
import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ThreeBackground } from "./ui/ThreeBackground";
import { TechOrbital } from "./ui/tech-orbital";
import { TechDetailOrbital } from "./ui/tech-detail-orbital";

// Tech icons with descriptions and additional details
const techStack = [
  {
    name: "PHP",
    icon: "/img/icons8-php-96.png",
    color: "#8892BF",
    description: "Server-side scripting language designed for web development.",
    features: ["Fast", "Reliable", "Widely supported"],
    experience: "5+ years",
    usageStats: {
      category: "Backend" as const,
      percentage: 85
    },
    orbit: {
      radius: 50,
      speed: 15,
      inclination: 5,
      startPosition: 0
    }
  },
  {
    name: "JavaScript",
    icon: "/img/icons8-javascript-240.png",
    color: "#F7DF1E",
    description: "High-level programming language that enables interactive web pages.",
    features: ["Dynamic", "Client-side", "Versatile"],
    experience: "2+ years",
    usageStats: {
      category: "Frontend" as const,
      percentage: 40
    },
    orbit: {
      radius: 100,
      speed: 20,
      inclination: -8,
      startPosition: 72
    }
  },
  {
    name: "Node.js",
    icon: "/img/icons8-node-js-240.png",
    color: "#339933",
    description: "JavaScript runtime built on Chrome's V8 engine for building server-side applications.",
    features: ["Asynchronous", "Event-driven", "Scalable"],
    experience: "4+ years",
    usageStats: {
      category: "Backend" as const,
      percentage: 75
    },
    orbit: {
      radius: 150,
      speed: 25,
      inclination: 12,
      startPosition: 144
    }
  },
  {
    name: "MySQL",
    icon: "/img/icons8-mysql-500.png",
    color: "#4479A1",
    description: "Open-source relational database management system.",
    features: ["Reliable", "Secure", "Structured"],
    experience: "5+ years",
    usageStats: {
      category: "Database" as const,
      percentage: 65
    },
    orbit: {
      radius: 200,
      speed: 30,
      inclination: -15,
      startPosition: 216
    }
  },
  {
    name: "SQLite",
    icon: "/img/icons8-sqlite-500.png",
    color: "#003B57",
    description: "Self-contained, serverless, zero-configuration database engine.",
    features: ["Lightweight", "Embedded", "Portable"],
    experience: "3+ years",
    usageStats: {
      category: "Database" as const,
      percentage: 55
    },
    orbit: {
      radius: 250,
      speed: 35,
      inclination: 20,
      startPosition: 288
    }
  },
  {
    name: "Python",
    icon: "/img/icons8-python-240.png",
    color: "#306998",
    description: "High-level programming language that enables interactive web pages.",
    features: ["Dynamic", "Client-side", "Versatile"],
    experience: "3+ years",
    usageStats: {
      category: "Backend" as const,
      percentage: 60
    },
    orbit: {
      radius: 300,
      speed: 40,
      inclination: 25,
      startPosition: 360
    }
  },
  {
    name: "React",
    icon: "/img/icons8-react-480.png",
    color: "#61DAFB",
    description: "JavaScript library for building user interfaces.",
    features: ["Declarative", "Component-based", "Efficient"],
    experience: "2+ years",
    usageStats: {
      category: "Frontend" as const,
      percentage: 50
    },
    orbit: {
      radius: 350,
      speed: 45,
      inclination: 30,
      startPosition: 432
    }
  },
  {
    name: "Next.js",
    icon: "/img/icons8-nextjs-480.png",
    color: "#000000",
    description: "React framework for building server-side rendered (SSR) web applications.",
    features: ["Server-side rendering", "TypeScript support", "API routes"],
    experience: "1+ years",
    usageStats: {
      category: "Frontend" as const,
      percentage: 45
    },
    orbit: {
      radius: 400,
      speed: 50,
      inclination: 35,
      startPosition: 492
    }
  },
  {
    name: "Tailwind CSS",
    icon: "/img/icons8-tailwind-css-144.png",
    color: "#38BDF8",
    description: "Utility-first CSS framework for rapidly building custom designs.",
    features: ["Utility classes", "Responsive", "Dark mode support"],
    experience: "2+ years",
    usageStats: {
      category: "Frontend" as const,
      percentage: 60
    },
    orbit: {
      radius: 450,
      speed: 55,
      inclination: 40,
      startPosition: 552
    }
  },
  {
    name: "TypeScript",
    icon: "/img/icons8-typescript-240.png",
    color: "#3178C6",
    description: "Static type-checking superset of JavaScript that adds optional static types.",
    features: ["Type safety", "Object-oriented", "Modern"],
    experience: "2+ years",
    usageStats: {
      category: "Frontend" as const,
      percentage: 55
    },
    orbit: {
      radius: 500,
      speed: 60,
      inclination: 45,
      startPosition: 612
    }
  },
  {
    name: "Git",
    icon: "/img/icons8-git-480.png",
    color: "#F05032", 
    description: "Distributed version control system for tracking changes in any set of files.",
    features: ["Distributed", "Version control", "Collaborative"],
    experience: "3+ years",
    usageStats: {
      category: "Version Control" as const,
      percentage: 70
    },
    orbit: {
      radius: 550,
      speed: 65,
      inclination: 50,
      startPosition: 672
    }
  },  
  {
    name: "Flutter",
    icon: "/img/icons8-flutter-480.png",
    color: "#02569B",
    description: "UI software development kit for building cross-platform applications.",
    features: ["Cross-platform", "Declarative", "High performance"],
    experience: "2+ years",
    usageStats: {
      category: "Frontend" as const,
      percentage: 55
    },
    orbit: {
      radius: 600,
      speed: 70,
      inclination: 55,
      startPosition: 732
    }
  }
];

// Type definition for the tech stack data
export interface TechStackItem {
  name: string;
  icon: string;
  color: string;
  description: string;
  features: string[];
  experience: string;
  usageStats: {
    category: "Frontend" | "Backend" | "Database";
    percentage: number;
  };
  orbit: {
    radius: number;
    speed: number;
    inclination: number;
    startPosition: number;
  };
}

export { techStack };

export function TechStack() {
  const containerRef = useRef<HTMLDivElement>(null);
  const textRefs = useRef<(HTMLDivElement | null)[]>([]);
  const [selectedTech, setSelectedTech] = useState<number | null>(null);
  const [showDetailView, setShowDetailView] = useState(false);
  const [hoveredCard, setHoveredCard] = useState<number | null>(null);
  const [isTransitioning, setIsTransitioning] = useState(false);

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
    setShowDetailView(true);
    // Scroll to tech stack section smoothly
    const techStackSection = document.getElementById('tech-stack');
    if (techStackSection) {
      techStackSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  };

  // Function to handle back button click
  const handleBackClick = () => {
    setIsTransitioning(true);
    setShowDetailView(false);
    
    setTimeout(() => {
      setSelectedTech(null);
      setIsTransitioning(false);
      // Scroll to tech stack section smoothly when returning
      const techStackSection = document.getElementById('tech-stack');
      if (techStackSection) {
        techStackSection.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }
    }, 800);
  };

  // Extract colors for Three.js background
  const techColors = techStack.map(tech => tech.color);

  // If we're showing the detailed view, render the TechDetailOrbital component
  if (showDetailView && selectedTech !== null) {
    return (
      <TechDetailOrbital 
        tech={techStack[selectedTech] as TechStackItem} 
        onBack={handleBackClick} 
      />
    );
  }

  return (
    <div className="py-16 relative" ref={containerRef}>
      {/* Make the ThreeBackground interactive with onClick */}
      <ThreeBackground 
        colors={techColors} 
        focusedTech={isTransitioning ? null : selectedTech}
        onFocusComplete={() => {}} 
        onOrbitClick={handleTechClick}
      />
      
      {/* Alternative orbit visualization for fallback */}
      {(selectedTech === null || isTransitioning) && (
        <div className={`relative z-10 pointer-events-none opacity-70 transition-opacity duration-500 ${isTransitioning ? 'opacity-0' : 'opacity-70'}`}>
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
            
          {/* Tech cards for easy clicking */}
          <motion.div 
            className="max-w-4xl mx-auto mt-16 grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 gap-4 px-4 pointer-events-auto"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.8, delay: 0.5 }}
          >
            {techStack.map((tech, index) => (
              <motion.div
                key={index}
                className="bg-black/50 backdrop-blur-md rounded-xl p-4 flex flex-col items-center cursor-pointer transition-all hover:bg-black/70"
                whileHover={{ y: -5, scale: 1.03 }}
                onClick={() => handleTechClick(index)}
                onMouseEnter={() => setHoveredCard(index)}
                onMouseLeave={() => setHoveredCard(null)}
                style={{
                  boxShadow: hoveredCard === index ? `0 0 20px ${tech.color}60` : 'none',
                  border: `1px solid ${hoveredCard === index ? tech.color : 'transparent'}`
                }}
              >
                <div 
                  className="w-16 h-16 mb-3 rounded-full flex items-center justify-center"
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
                <h3 className="text-white font-medium text-center">{tech.name}</h3>
                <span className="text-xs text-gray-400 mt-1">{tech.experience}</span>
              </motion.div>
            ))}
          </motion.div>
        </div>
      )}
    </div>
  );
} 