"use client";

import React, { useRef, useState, useEffect } from "react";
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { OrbitControls, Stars } from "@react-three/drei";
import * as THREE from "three";
import gsap from "gsap";

interface ThreeBackgroundProps {
  colors: string[];
  focusedTech: number | null;
  onFocusComplete?: () => void;
  onOrbitClick?: (index: number) => void;
}

function Particles({ colors, focusedTech, onFocusComplete, onOrbitClick }: { 
  colors: string[]; 
  focusedTech: number | null; 
  onFocusComplete?: () => void;
  onOrbitClick?: (index: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const groupRef = useRef<THREE.Group>(null);
  const orbitRefs = useRef<(THREE.Group | null)[]>([]);
  const planetRefs = useRef<(THREE.Mesh | null)[]>([]);
  const hyperSpaceRef = useRef<THREE.Group>(null);
  const { camera, raycaster, gl, scene } = useThree();
  const [isAnimating, setIsAnimating] = useState(false);
  const [showHyperspace, setShowHyperspace] = useState(false);
  const [pointer] = useState(new THREE.Vector2());
  
  // Define orbit positions and properties
  const orbits = colors.map((_, i) => {
    const angle = (i / colors.length) * Math.PI * 2;
    const orbitRadius = 5; // Reduced orbit radius for better visibility
    const orbitX = Math.sin(angle) * orbitRadius;
    const orbitY = Math.cos(angle) * orbitRadius;
    const orbitZ = (Math.random() - 0.5) * 2; // Less variation in Z axis
    
    return {
      position: new THREE.Vector3(orbitX, orbitY, orbitZ),
      rotation: new THREE.Euler(
        0, // Keep rotation more flat for better visibility
        0,
        Math.random() * Math.PI * 0.5
      ),
      radius: 1.5 + Math.random() * 0.3, // Orbit path radius
      speed: 0.2 + Math.random() * 0.1
    };
  });
  
  // Convert string colors to THREE.Color objects
  const threeColors = colors.map(color => new THREE.Color(color));
  
  useFrame((_state, delta) => {
    // Central orbital system rotation
    if (!isAnimating && groupRef.current && focusedTech === null) {
      groupRef.current.rotation.y += delta * 0.1;
      groupRef.current.rotation.x += delta * 0.05;
    }
    
    // Individual orbit rotations
    orbitRefs.current.forEach((orbitGroup, index) => {
      if (orbitGroup) {
        // If we're focused on this orbit, rotate it more noticeably
        if (focusedTech === index) {
          orbitGroup.rotation.y += delta * orbits[index].speed * 2;
        } 
        // Otherwise rotate the orbit slightly if it's visible
        else if (focusedTech === null) {
          orbitGroup.rotation.y += delta * orbits[index].speed;
        }
      }
    });
    
    // Animate hyperspace effect when active
    if (showHyperspace && hyperSpaceRef.current) {
      hyperSpaceRef.current.rotation.z += delta * 2;
      
      // Get all hyperspace lines and animate them
      hyperSpaceRef.current.children.forEach((object) => {
        // Check if object is a Line
        if (object.type !== 'Line') return;
        
        const line = object as THREE.Line;
        const positions = (line.geometry as THREE.BufferGeometry).attributes.position;
        const vertex = new THREE.Vector3();
        
        for (let i = 0; i < positions.count; i++) {
          vertex.fromBufferAttribute(positions, i);
          
          // Animate points outward
          const distance = vertex.length();
          if (distance > 50) {
            // Reset line when it gets too far
            const direction = vertex.normalize();
            vertex.copy(direction.multiplyScalar(Math.random() * 5 + 0.5));
          } else {
            // Move outward
            vertex.multiplyScalar(1.05);
          }
          
          positions.setXYZ(i, vertex.x, vertex.y, vertex.z);
        }
        
        positions.needsUpdate = true;
      });
    }
  });

  // Handle mouse interactions with planets
  const handleCanvasClick = (event: React.MouseEvent) => {
    if (isAnimating || !onOrbitClick || focusedTech !== null) return;
    
    // Calculate mouse position
    const rect = gl.domElement.getBoundingClientRect();
    pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    
    // Update raycaster
    raycaster.setFromCamera(pointer, camera);
    
    // Check for intersections with planets
    let foundIntersection = false;
    
    // Check all planets
    planetRefs.current.forEach((planet, index) => {
      if (planet && !foundIntersection) {
        const intersects = raycaster.intersectObject(planet, true);
        if (intersects.length > 0) {
          // Planet clicked, call the handler
          onOrbitClick(index);
          foundIntersection = true;
        }
      }
    });
  };

  // Create hyperspace effect
  const createHyperSpace = () => {
    if (!hyperSpaceRef.current) return;
    
    // Clear existing children
    while (hyperSpaceRef.current.children.length > 0) {
      hyperSpaceRef.current.remove(hyperSpaceRef.current.children[0]);
    }
    
    // Create new hyperspace effect
    for (let i = 0; i < 200; i++) {
      const linePoints = [];
      const direction = new THREE.Vector3(
        Math.random() * 2 - 1,
        Math.random() * 2 - 1,
        Math.random() * 2 - 1
      ).normalize();
      
      // Start point (near center)
      const startPoint = direction.clone().multiplyScalar(Math.random() * 5 + 0.5);
      linePoints.push(startPoint.clone());
      
      // End point (extending outward)
      const endPoint = direction.clone().multiplyScalar(Math.random() * 20 + 30);
      linePoints.push(endPoint);
      
      const geometry = new THREE.BufferGeometry().setFromPoints(linePoints);
      const line = new THREE.Line(
        geometry,
        new THREE.LineBasicMaterial({ 
          color: focusedTech !== null ? 
            threeColors[focusedTech] : 
            threeColors[Math.floor(Math.random() * threeColors.length)],
          opacity: 0.6,
          transparent: true
        })
      );
      
      hyperSpaceRef.current.add(line);
    }
  };

  // Handle focusing on a specific orbit
  useEffect(() => {
    if (focusedTech !== null && orbitRefs.current[focusedTech]) {
      const targetOrbit = orbitRefs.current[focusedTech];
      if (targetOrbit) {
        setIsAnimating(true);
        
        // Get orbit position
        const orbitPosition = new THREE.Vector3();
        targetOrbit.getWorldPosition(orbitPosition);
        
        // Show hyperspace effect during travel
        setShowHyperspace(true);
        createHyperSpace();
        
        // Calculate camera position for viewing the orbit
        // Position slightly offset from orbit center to get a good view
        const orbitData = orbits[focusedTech];
        const cameraTarget = orbitPosition.clone().add(new THREE.Vector3(0, 0, 5));
        
        // Animate camera movement with travel effect
        const startPos = camera.position.clone();
        const duration = 3.0;
        let startTime = Date.now();
        
        const animateCamera = () => {
          const elapsed = (Date.now() - startTime) / 1000;
          const progress = Math.min(elapsed / duration, 1);
          
          // Different phases of travel
          if (progress < 0.4) {
            // Phase 1: Initial acceleration
            const p = progress / 0.4;
            const easeInQuad = p * p;
            
            // Move slightly away from center first
            const zoomOutPos = startPos.clone().multiplyScalar(1.2);
            camera.position.lerpVectors(startPos, zoomOutPos, easeInQuad);
            
          } else if (progress < 0.8) {
            // Phase 2: Hyperspace travel
            const p = (progress - 0.4) / 0.4;
            const hyperPos = startPos.clone().multiplyScalar(1.2).lerp(cameraTarget, p * 0.6);
            
            // Add wild shake during hyperspace
            const shake = Math.sin(p * Math.PI * 20) * 0.15 * (1 - p);
            const shakeY = Math.cos(p * Math.PI * 15) * 0.15 * (1 - p);
            
            camera.position.copy(hyperPos);
            camera.position.x += shake;
            camera.position.y += shakeY;
            
          } else {
            // Phase 3: Deceleration and arrival
            const p = (progress - 0.8) / 0.2;
            const easeOutQuad = 1 - (1 - p) * (1 - p);
            
            // Smoothly arrive at destination
            const arrivalPos = startPos.clone().multiplyScalar(1.2).lerp(cameraTarget, 0.6);
            camera.position.lerpVectors(arrivalPos, cameraTarget, easeOutQuad);
            
            // Reduce hyperspace effect
            if (progress > 0.9 && showHyperspace) {
              setShowHyperspace(false);
            }
          }
          
          // Always look at the orbit
          camera.lookAt(orbitPosition);
          
          if (progress < 1) {
            requestAnimationFrame(animateCamera);
          } else {
            setIsAnimating(false);
            if (onFocusComplete) onFocusComplete();
          }
        };
        
        // We no longer need to hide other orbits with scaling as we use the visible prop
        // Other orbits visibility is controlled by the visible attribute in render
        
        // Hide center sphere
        if (meshRef.current) {
          gsap.to(meshRef.current.scale, { 
            x: 0.01, y: 0.01, z: 0.01, 
            duration: 1.0,
            ease: "power2.out" 
          });
        }
        
        animateCamera();
      }
    } else if (focusedTech === null) {
      // We don't need to reset orbit scales anymore as visibility is controlled by props
      
      // Reset center sphere
      if (meshRef.current) {
        gsap.to(meshRef.current.scale, { 
          x: 1, y: 1, z: 1, 
          duration: 1.0,
          ease: "power2.out" 
        });
      }
      
      // Reset camera to original position
      gsap.to(camera.position, {
        x: 0,
        y: 0,
        z: 6,
        duration: 2.0,
        ease: "power2.inOut"
      });
      
      // Hide hyperspace effect
      setShowHyperspace(false);
    }
  }, [focusedTech, camera, onFocusComplete]);

  return (
    <>
      {/* Hyperspace effect */}
      <group ref={hyperSpaceRef} visible={showHyperspace} onClick={handleCanvasClick}>
        {/* This group handles click events */}
      </group>
      
      {/* Main galaxy group */}
      <group ref={groupRef} onClick={handleCanvasClick}>
        {/* Central Sun */}
        {focusedTech === null && (
          <mesh ref={meshRef}>
            <sphereGeometry args={[0.7, 32, 32]} />
            <meshStandardMaterial
              color="#ffffff"
              roughness={0.1}
              metalness={0.9}
              wireframe={true}
            />
          </mesh>
        )}
        
        {/* Create individual orbits for each tech */}
        {orbits.map((orbit, i) => (
          <group 
            key={`orbit-${i}`}
            position={orbit.position}
            rotation={orbit.rotation}
            ref={el => orbitRefs.current[i] = el}
            visible={focusedTech === null || focusedTech === i}
          >
            {/* Orbit path */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <ringGeometry args={[orbit.radius - 0.1, orbit.radius + 0.1, 64]} />
              <meshBasicMaterial 
                color={threeColors[i]} 
                transparent={true} 
                opacity={0.5} 
                side={THREE.DoubleSide}
              />
            </mesh>
            
            {/* Planet */}
            <mesh
              ref={el => planetRefs.current[i] = el}
              position={[orbit.radius, 0, 0]}
            >
              <sphereGeometry args={[0.6, 32, 32]} />
              <meshStandardMaterial
                color={threeColors[i]}
                emissive={threeColors[i]}
                emissiveIntensity={1.0}
                roughness={0.2}
                metalness={0.8}
              />
              
              {/* Planet glow */}
              <mesh scale={1.5}>
                <sphereGeometry args={[0.6, 32, 32]} />
                <meshStandardMaterial
                  color={threeColors[i]}
                  emissive={threeColors[i]}
                  emissiveIntensity={1.5}
                  transparent={true}
                  opacity={0.3}
                />
              </mesh>
              
              {/* Moons */}
              <mesh position={[0.8, 0.3, 0]} scale={0.15}>
                <sphereGeometry args={[1, 16, 16]} />
                <meshStandardMaterial color="#aaaaaa" roughness={0.8} />
              </mesh>
            </mesh>
            
            {/* Orbit dust particles */}
            {Array.from({ length: 20 }).map((_, particleIndex) => {
              const angle = (particleIndex / 20) * Math.PI * 2;
              const jitter = (Math.random() - 0.5) * 0.2;
              const rad = orbit.radius + jitter;
              return (
                <mesh
                  key={`orbit-particle-${i}-${particleIndex}`}
                  position={[
                    Math.cos(angle) * rad,
                    Math.sin(angle) * rad,
                    (Math.random() - 0.5) * 0.2
                  ]}
                  scale={0.05 + Math.random() * 0.05}
                >
                  <sphereGeometry args={[1, 8, 8]} />
                  <meshStandardMaterial
                    color={threeColors[i]}
                    emissive={threeColors[i]}
                    emissiveIntensity={2}
                  />
                </mesh>
              );
            })}
          </group>
        ))}
      </group>
      
      {/* Background stars - more visible during hyperspace travel */}
      <Stars 
        radius={100} 
        depth={50} 
        count={5000} 
        factor={4} 
        saturation={0} 
        fade 
        speed={focusedTech !== null ? 2 : 0.5} 
      />
    </>
  );
}

export function ThreeBackground({ colors, focusedTech = null, onFocusComplete, onOrbitClick }: ThreeBackgroundProps) {
  // No need for canvas click handler in this component as click detection
  // is already handled within the Particles component using raycasting

  return (
    <div className="absolute inset-0 -z-10">
      <Canvas camera={{ position: [0, 0, 6], fov: 60 }}>
        <ambientLight intensity={0.3} />
        <pointLight position={[10, 10, 10]} intensity={0.7} />
        <pointLight position={[-10, -10, -10]} intensity={0.2} />
        <Particles 
          colors={colors} 
          focusedTech={focusedTech} 
          onFocusComplete={onFocusComplete}
          onOrbitClick={onOrbitClick}
        />
        <OrbitControls 
          enableZoom={false} 
          autoRotate={focusedTech === null} 
          autoRotateSpeed={0.5}
          enableRotate={focusedTech === null}
        />
      </Canvas>
    </div>
  );
} 