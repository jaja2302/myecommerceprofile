"use client";

import { useRef, useState, useEffect } from "react";
import { motion } from "framer-motion";
import Image from "next/image";
import gsap from "gsap";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars, Text } from "@react-three/drei";
import * as THREE from "three";
import type { TechStackItem } from "../TechStack";

interface TechDetailOrbitalProps {
  tech: TechStackItem;
  onBack: () => void;
}

export function TechDetailOrbital({ tech, onBack }: TechDetailOrbitalProps) {
  const [activeFeature, setActiveFeature] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);

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
                      setIsInteracting(true);
                      setTimeout(() => setIsInteracting(false), 5000);
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

// Component to render the 3D planet in detail
function PlanetDetail({ tech }: { tech: TechDetailOrbitalProps['tech'] }) {
  const planetRef = useRef<THREE.Group>(null);
  const atmosphereRef = useRef<THREE.Mesh>(null);
  const ringRef = useRef<THREE.Mesh>(null);
  const textRef = useRef<THREE.Mesh>(null);
  const particlesRef = useRef<THREE.Points>(null);
  const moonGroup = useRef<THREE.Group>(null);
  const { camera, scene } = useThree();
  
  const color = new THREE.Color(tech.color);
  
  // Create initial animation
  useEffect(() => {
    if (planetRef.current) {
      // Animate planet in
      gsap.from(planetRef.current.scale, {
        x: 0.1, y: 0.1, z: 0.1,
        duration: 2,
        ease: "elastic.out(1, 0.5)"
      });
      
      // Move camera in slightly
      gsap.to(camera.position, {
        z: 8,
        duration: 2,
        ease: "power2.out"
      });
    }
  }, [camera]);
  
  // Create particles for the planet atmosphere
  useEffect(() => {
    if (particlesRef.current && planetRef.current) {
      const geometry = new THREE.BufferGeometry();
      const particleCount = 1000;
      
      const positions = new Float32Array(particleCount * 3);
      const colors = new Float32Array(particleCount * 3);
      
      for (let i = 0; i < particleCount; i++) {
        // Random position around a sphere
        const radius = 3.5 + Math.random() * 4;
        const theta = Math.random() * Math.PI * 2;
        const phi = Math.acos(2 * Math.random() - 1);
        
        const x = radius * Math.sin(phi) * Math.cos(theta);
        const y = radius * Math.sin(phi) * Math.sin(theta);
        const z = radius * Math.cos(phi);
        
        positions[i * 3] = x;
        positions[i * 3 + 1] = y;
        positions[i * 3 + 2] = z;
        
        // Particle color based on tech color but with variance
        colors[i * 3] = color.r * (0.5 + Math.random() * 0.5);
        colors[i * 3 + 1] = color.g * (0.5 + Math.random() * 0.5);
        colors[i * 3 + 2] = color.b * (0.5 + Math.random() * 0.5);
      }
      
      geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
      geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));
      
      const material = new THREE.PointsMaterial({
        size: 0.15,
        vertexColors: true,
        transparent: true,
        opacity: 0.7
      });
      
      particlesRef.current.geometry = geometry;
      particlesRef.current.material = material;
    }
  }, [color]);
  
  // Handle planet rotation and animation
  useFrame((_, delta) => {
    // Rotate the planet slowly
    if (planetRef.current) {
      planetRef.current.rotation.y += delta * 0.1;
    }
    
    // Pulsate the atmosphere
    if (atmosphereRef.current && atmosphereRef.current.material instanceof THREE.MeshStandardMaterial) {
      atmosphereRef.current.material.emissiveIntensity = 1 + Math.sin(Date.now() * 0.001) * 0.3;
    }
    
    // Rotate the ring
    if (ringRef.current) {
      ringRef.current.rotation.z += delta * 0.05;
    }
    
    // Keep text facing the camera
    if (textRef.current) {
      textRef.current.lookAt(camera.position);
    }
    
    // Rotate moons
    if (moonGroup.current) {
      moonGroup.current.rotation.y += delta * 0.2;
      moonGroup.current.rotation.x += delta * 0.05;
    }
    
    // Animate particles
    if (particlesRef.current) {
      // Slow gentle swirling of particles
      particlesRef.current.rotation.y += delta * 0.02;
      
      // Pulsating size of particles
      if (particlesRef.current.material instanceof THREE.PointsMaterial) {
        particlesRef.current.material.size = 0.15 + Math.sin(Date.now() * 0.001) * 0.05;
      }
    }
  });
  
  return (
    <group>
      {/* Main planet group */}
      <group ref={planetRef}>
        {/* Planet core */}
        <mesh>
          <sphereGeometry args={[2.5, 64, 64]} />
          <meshStandardMaterial
            color={color}
            metalness={0.8}
            roughness={0.2}
            emissive={color}
            emissiveIntensity={0.2}
          />
        </mesh>
        
        {/* Atmosphere */}
        <mesh ref={atmosphereRef}>
          <sphereGeometry args={[3, 64, 64]} />
          <meshStandardMaterial
            color={color}
            emissive={color}
            emissiveIntensity={1}
            transparent={true}
            opacity={0.3}
          />
        </mesh>
        
        {/* Rings (if appropriate for this tech) */}
        <mesh ref={ringRef} rotation={[Math.PI / 3, 0, 0]}>
          <ringGeometry args={[4, 6, 64]} />
          <meshBasicMaterial 
            color={color} 
            transparent={true} 
            opacity={0.4} 
            side={THREE.DoubleSide}
          />
        </mesh>
        
        {/* Planet surface details */}
        <mesh rotation={[0, Math.PI / 2, 0]}>
          <sphereGeometry args={[2.51, 64, 64]} />
          <meshStandardMaterial
            color={color}
            wireframe={true}
            transparent={true}
            opacity={0.3}
          />
        </mesh>
        
        {/* Technology label */}
        <group position={[0, 4, 0]}>
          <mesh ref={textRef}>
            <Text
              color="white"
              fontSize={0.8}
              maxWidth={200}
              lineHeight={1}
              textAlign="center"
              font="/fonts/roboto-medium.woff"
              anchorX="center"
              anchorY="middle"
            >
              {tech.name}
            </Text>
          </mesh>
        </group>
        
        {/* Moons representing features */}
        <group ref={moonGroup}>
          {[...Array(3)].map((_, i) => {
            const angle = (i / 3) * Math.PI * 2;
            const radius = 4 + i * 0.5;
            const x = Math.cos(angle) * radius;
            const z = Math.sin(angle) * radius;
            
            return (
              <mesh key={i} position={[x, 0, z]}>
                <sphereGeometry args={[0.3, 32, 32]} />
                <meshStandardMaterial
                  color="white"
                  emissive={color}
                  emissiveIntensity={0.5}
                />
                {/* Moon trail */}
                <mesh rotation={[Math.PI / 2, 0, 0]}>
                  <ringGeometry args={[radius - 0.05, radius + 0.05, 64]} />
                  <meshBasicMaterial
                    color={color}
                    transparent={true}
                    opacity={0.2}
                    side={THREE.DoubleSide}
                  />
                </mesh>
              </mesh>
            );
          })}
        </group>
      </group>
      
      {/* Particle system for atmosphere */}
      <points ref={particlesRef}>
        {/* Geometry and material set via useEffect */}
      </points>
      
      {/* Shooting stars in background */}
      {[...Array(10)].map((_, i) => {
        const startPos = new THREE.Vector3(
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 50,
          (Math.random() - 0.5) * 50
        );
        
        const endPos = startPos.clone().multiplyScalar(-1);
        
        return (
          <ShootingStar 
            key={i} 
            startPosition={startPos} 
            endPosition={endPos} 
            color={color}
            speed={0.5 + Math.random() * 2}
            delay={i * 2}
          />
        );
      })}
    </group>
  );
}

// Shooting star component
function ShootingStar({ 
  startPosition, 
  endPosition, 
  color,
  speed = 1,
  delay = 0
}: { 
  startPosition: THREE.Vector3; 
  endPosition: THREE.Vector3;
  color: THREE.Color;
  speed?: number;
  delay?: number;
}) {
  const ref = useRef<THREE.Mesh>(null);
  const trailRef = useRef<THREE.Mesh>(null);
  const time = useRef(delay);
  
  useFrame((_, delta) => {
    if (ref.current && trailRef.current) {
      time.current += delta * speed;
      
      // Loop animation
      if (time.current > 5 + delay) {
        time.current = delay;
      }
      
      // Only show during certain part of animation cycle
      const visible = time.current > delay && time.current < 3 + delay;
      ref.current.visible = visible;
      trailRef.current.visible = visible;
      
      if (visible) {
        // Calculate position along path
        const t = (time.current - delay) / 3;
        const position = startPosition.clone().lerp(endPosition, t);
        
        ref.current.position.copy(position);
        trailRef.current.position.copy(position);
        
        // Orient trail to follow path
        if (trailRef.current) {
          const direction = endPosition.clone().sub(startPosition).normalize();
          trailRef.current.lookAt(position.clone().add(direction));
        }
      }
    }
  });
  
  return (
    <group>
      <mesh ref={ref}>
        <sphereGeometry args={[0.2, 8, 8]} />
        <meshBasicMaterial color="white" />
      </mesh>
      <mesh ref={trailRef} position={[0, 0, -2]} scale={[1, 1, 10]}>
        <cylinderGeometry args={[0, 0.1, 2, 8]} />
        <meshBasicMaterial 
          color={color}
          transparent={true}
          opacity={0.6}
        />
      </mesh>
    </group>
  );
} 