'use client';

import { useEffect, useRef, useState } from 'react';
import { gsap } from 'gsap';
import Image from 'next/image';

interface BalloonProps {
  tech: {
    name: string;
    color: string;
    icon: string;
  };
  index: number;
  className?: string;
}

export default function Balloon({ tech, index, className = '' }: BalloonProps) {
  const balloonRef = useRef<HTMLDivElement>(null);
  const [popped, setPopped] = useState(false);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const balloon = balloonRef.current;
    if (!balloon || popped) return;

    // Random initial position
    const startX = 20 + Math.random() * 60; // 20-80% across
    const startY = 40 + Math.random() * 40; // 40-80% down
    
    // Initialize balloon position with immediate visibility
    gsap.set(balloon, {
      x: `${startX}%`,
      y: `${startY}%`,
      scale: 1,
      rotation: -10 + Math.random() * 20,
      opacity: 1,
      immediateRender: true,
    });

    // Create floating animation
    const floatTl = gsap.timeline({ repeat: -1, yoyo: true });
    
    floatTl.to(balloon, {
      y: `${startY - 10 - Math.random() * 10}%`,
      x: `${startX - 5 + Math.random() * 10}%`,
      rotation: -5 + Math.random() * 10,
      duration: 3 + Math.random() * 2,
      ease: "sine.inOut",
      delay: index * 0.2,
    });

    // Create hover effect
    balloon.addEventListener('mouseenter', () => {
      if (!popped) {
        gsap.to(balloon, { 
          scale: 1.1, 
          duration: 0.3,
          boxShadow: '0 0 20px rgba(255,255,255,0.3)'
        });
      }
    });

    balloon.addEventListener('mouseleave', () => {
      if (!popped) {
        gsap.to(balloon, { 
          scale: 1, 
          duration: 0.3,
          boxShadow: 'none'
        });
      }
    });

    // Cleanup
    return () => {
      floatTl.kill();
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, [index, popped]);

  const popBalloon = () => {
    if (popped) return;
    
    const balloon = balloonRef.current;
    if (!balloon) return;
    
    setPopped(true);
    
    // Pop animation
    gsap.timeline()
      .to(balloon, {
        scale: 1.3,
        duration: 0.1,
        ease: "power1.in",
      })
      .to(balloon, {
        scale: 0,
        opacity: 0,
        duration: 0.3,
        ease: "power2.out",
      });
    
    // Create particles
    createParticles(balloon);
    
    // Respawn after delay
    timeoutRef.current = setTimeout(() => {
      setPopped(false);
      
      // Reset and make it appear again with animation
      gsap.fromTo(balloon, 
        { scale: 0, opacity: 0 },
        { 
          scale: 1, 
          opacity: 1, 
          duration: 0.5, 
          ease: "back.out(1.7)" 
        }
      );
    }, 3000 + Math.random() * 2000);
  };

  const createParticles = (element: HTMLElement) => {
    const rect = element.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    // Create particle container if it doesn't exist
    let particleContainer = document.getElementById('particle-container');
    if (!particleContainer) {
      particleContainer = document.createElement('div');
      particleContainer.id = 'particle-container';
      particleContainer.style.position = 'fixed';
      particleContainer.style.top = '0';
      particleContainer.style.left = '0';
      particleContainer.style.width = '100%';
      particleContainer.style.height = '100%';
      particleContainer.style.pointerEvents = 'none';
      particleContainer.style.zIndex = '1000';
      document.body.appendChild(particleContainer);
    }
    
    // Generate particles
    for (let i = 0; i < 12; i++) {
      const particle = document.createElement('div');
      particle.style.position = 'absolute';
      particle.style.width = '10px';
      particle.style.height = '10px';
      particle.style.borderRadius = '50%';
      particle.style.backgroundColor = tech.color;
      particle.style.left = `${centerX}px`;
      particle.style.top = `${centerY}px`;
      particle.style.boxShadow = `0 0 10px ${tech.color}`;
      
      particleContainer.appendChild(particle);
      
      // Animate particle
      gsap.to(particle, {
        x: -100 + Math.random() * 200,
        y: -100 + Math.random() * 200,
        opacity: 0,
        scale: 0,
        duration: 0.6 + Math.random() * 0.4,
        ease: "power2.out",
        onComplete: () => {
          if (particleContainer) {
            particleContainer.removeChild(particle);
          }
        }
      });
    }
  };

  if (popped) {
    return <div ref={balloonRef} className={`absolute ${className}`} />;
  }

  return (
    <div 
      ref={balloonRef}
      className={`balloon absolute cursor-pointer transition-transform ${className}`}
      onClick={popBalloon}
      style={{
        width: '120px',
        height: '160px',
        zIndex: 20,
      }}
    >
      <div 
        className="balloon-inner w-full h-4/5 rounded-full flex items-center justify-center relative shadow-lg"
        style={{ 
          backgroundColor: tech.color,
          boxShadow: `0 0 30px ${tech.color}40`
        }}
      >
        <div className="relative w-16 h-16 flex items-center justify-center bg-white/90 rounded-full p-3">
          {tech.icon && (
            <Image 
              src={tech.icon} 
              alt={tech.name} 
              width={40} 
              height={40} 
              className="object-contain"
              style={{ width: 'auto', height: 'auto' }}
            />
          )}
        </div>
        <div 
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rotate-45"
          style={{ backgroundColor: tech.color }}
        />
        <div 
          className="absolute -bottom-8 left-1/2 -translate-x-1/2 
                     text-xs font-bold text-white px-3 py-1 rounded-full
                     backdrop-blur-sm bg-black/50 whitespace-nowrap z-10
                     border border-white/20 shadow-xl"
        >
          {tech.name}
        </div>
      </div>
      <div 
        className="balloon-string h-1/5 w-[2px] mx-auto"
        style={{ 
          backgroundColor: `${tech.color}`,
          boxShadow: `0 0 5px ${tech.color}`
        }}
      />
    </div>
  );
} 