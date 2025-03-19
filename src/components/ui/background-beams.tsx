"use client";

import React, { useEffect, useRef, useState } from "react";
import { cn } from "@/utils/cn";

export function BackgroundBeams({
  className,
  children,
}: {
  className?: string;
  children?: React.ReactNode;
}) {
  const [mousePosition, setMousePosition] = useState({ x: 0, y: 0 });
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const handleMouseMove = (event: MouseEvent) => {
      setMousePosition({ x: event.clientX, y: event.clientY });
    };

    const handleResize = () => {
      if (canvas) {
        canvas.width = window.innerWidth;
        canvas.height = window.innerHeight;
      }
    };

    window.addEventListener("mousemove", handleMouseMove);
    window.addEventListener("resize", handleResize);
    handleResize();

    const render = () => {
      if (!canvas || !ctx) return;

      ctx.clearRect(0, 0, canvas.width, canvas.height);
      
      // Draw beams
      const numBeams = 6;
      const beamColors = [
        "rgba(255, 100, 255, 0.2)",
        "rgba(120, 100, 255, 0.2)",
        "rgba(100, 100, 255, 0.2)",
        "rgba(100, 120, 255, 0.2)",
        "rgba(100, 255, 255, 0.2)",
        "rgba(255, 100, 120, 0.2)",
      ];

      for (let i = 0; i < numBeams; i++) {
        const angle = (i / numBeams) * Math.PI * 2;
        const offsetX = Math.cos(angle) * 300 + canvas.width / 2;
        const offsetY = Math.sin(angle) * 300 + canvas.height / 2;
        
        const gradient = ctx.createLinearGradient(
          canvas.width / 2,
          canvas.height / 2,
          offsetX,
          offsetY
        );
        
        gradient.addColorStop(0, "transparent");
        gradient.addColorStop(0.5, beamColors[i]);
        gradient.addColorStop(1, "transparent");
        
        ctx.beginPath();
        ctx.moveTo(canvas.width / 2, canvas.height / 2);
        ctx.lineTo(offsetX, offsetY);
        ctx.strokeStyle = gradient;
        ctx.lineWidth = 60;
        ctx.stroke();
        ctx.closePath();
      }

      // Add focal point glow
      const centerX = canvas.width / 2;
      const centerY = canvas.height / 2;
      const radius = 100;

      const glow = ctx.createRadialGradient(
        centerX,
        centerY,
        0,
        centerX,
        centerY,
        radius
      );
      
      glow.addColorStop(0, "rgba(100, 100, 255, 0.3)");
      glow.addColorStop(1, "transparent");
      
      ctx.beginPath();
      ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
      ctx.fillStyle = glow;
      ctx.fill();
    };

    const animationId = setInterval(render, 40);
    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      clearInterval(animationId);
    };
  }, []);

  return (
    <div className={cn("absolute inset-0 overflow-hidden", className)}>
      <canvas
        ref={canvasRef}
        className="absolute inset-0 w-full h-full"
      />
      {children}
    </div>
  );
} 