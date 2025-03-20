'use client';

import { useEffect, useRef } from 'react';
import { gsap } from 'gsap';
import Balloon from '@/components/Balloon';

const techStacks = [
  { name: 'JavaScript', color: '#f7df1e', icon: '/img/javascript.svg' },
  { name: 'PHP', color: '#777bb4', icon: '/img/php.svg' },
  { name: 'Node.js', color: '#339933', icon: '/img/nodejs.svg' },
  { name: 'Python', color: '#3776ab', icon: '/img/python.svg' },
  { name: 'TypeScript', color: '#3178c6', icon: '/img/typescript.svg' },
  { name: 'MySQL', color: '#4479a1', icon: '/img/mysql.svg' },
  { name: 'SQLite', color: '#003b57', icon: '/img/sqlite.svg' },
];

export function TechStack() {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container || typeof window === 'undefined') return;

    // Initial animation for the title
    gsap.from('.tech-title', {
      opacity: 0,
      y: -50,
      duration: 1,
      ease: 'power3.out',
    });

    // Make sure container is visible
    gsap.set('.balloons-container', {
      opacity: 1,
    });

    // Staggered animation for the balloons
    techStacks.forEach((_, index) => {
      gsap.from(`.balloon-${index}`, {
        opacity: 0,
        scale: 0,
        y: 100,
        duration: 0.5,
        delay: index * 0.2,
        ease: 'back.out(1.7)',
      });
    });
  }, []);

  return (
    <div ref={containerRef} className="relative w-full bg-gradient-to-b from-black via-purple-900/20 to-black py-16 z-10">
      <div className="balloons-container relative h-[500px] w-full max-w-full bg-gradient-to-b from-purple-900/10 to-black/50 rounded-xl overflow-hidden">
        {techStacks.map((tech, index) => (
          <Balloon 
            key={tech.name}
            tech={tech}
            index={index}
            className={`balloon-${index}`}
          />
        ))}
      </div>
    </div>
  );
} 