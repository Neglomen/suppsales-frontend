"use client";

import React, { useEffect, useRef } from "react";

interface Point3D {
  x: number;
  y: number;
  z: number;
  px?: number; // projected x
  py?: number; // projected y
}

export function ThreeDGlobe() {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    let animationId: number;
    let width = (canvas.width = canvas.offsetWidth);
    let height = (canvas.height = canvas.offsetHeight);

    // Generate points on a sphere
    const points: Point3D[] = [];
    const numPoints = 120;
    const radius = Math.min(width, height) * 0.28; // Sphere radius

    for (let i = 0; i < numPoints; i++) {
      const theta = Math.acos(Math.random() * 2 - 1);
      const phi = Math.random() * Math.PI * 2;

      points.push({
        x: radius * Math.sin(theta) * Math.cos(phi),
        y: radius * Math.sin(theta) * Math.sin(phi),
        z: radius * Math.cos(theta),
      });
    }

    // Keep track of angles
    let angleX = 0.002;
    let angleY = 0.003;

    // Mouse control
    let targetAngleX = 0;
    let targetAngleY = 0;
    let currentAngleX = 0;
    let currentAngleY = 0;

    const handleMouseMove = (e: MouseEvent) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left - width / 2;
      const my = e.clientY - rect.top - height / 2;
      
      // Calculate tilt based on mouse distance from center
      targetAngleY = (mx / width) * 0.8;
      targetAngleX = -(my / height) * 0.8;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Resize handler
    const handleResize = () => {
      if (!canvas) return;
      width = canvas.width = canvas.offsetWidth;
      height = canvas.height = canvas.offsetHeight;
    };
    window.addEventListener("resize", handleResize);

    // Render loop
    const render = () => {
      ctx.clearRect(0, 0, width, height);

      // Smoothly interpolate current angles to target mouse angles
      currentAngleX += (targetAngleX - currentAngleX) * 0.05;
      currentAngleY += (targetAngleY - currentAngleY) * 0.05;

      // Base auto-rotation + mouse rotation
      const finalAngleX = 0.0015 + currentAngleX * 0.01;
      const finalAngleY = 0.002 + currentAngleY * 0.01;

      // Cosines and sines of rotation angles
      const cosX = Math.cos(finalAngleX);
      const sinX = Math.sin(finalAngleX);
      const cosY = Math.cos(finalAngleY);
      const sinY = Math.sin(finalAngleY);

      // Rotate and project points
      const projectedPoints = points.map((p) => {
        // Rotate X
        let y1 = p.y * cosX - p.z * sinX;
        let z1 = p.z * cosX + p.y * sinX;

        // Rotate Y
        let x2 = p.x * cosY - z1 * sinY;
        let z2 = z1 * cosY + p.x * sinY;

        // Update point's actual coords to store state
        p.x = x2;
        p.y = y1;
        p.z = z2;

        // Perspective projection formula
        const fov = 400; // Field of view
        const cameraDistance = 500;
        const scale = fov / (fov + z2);

        // Project coordinates
        return {
          ...p,
          px: x2 * scale + width / 2,
          py: y1 * scale + height / 2,
          scale,
        };
      });

      // Sort by depth (Z-buffer) so back particles are drawn first
      projectedPoints.sort((a, b) => b.z - a.z);

      // Detect theme dynamically
      const isDark = typeof document !== "undefined" && document.documentElement.classList.contains("dark");

      // Draw connections/constellations
      ctx.lineWidth = 0.5;
      for (let i = 0; i < projectedPoints.length; i++) {
        const p1 = projectedPoints[i];
        
        // Connect to nearest neighbors
        let connections = 0;
        for (let j = i + 1; j < projectedPoints.length; j++) {
          if (connections > 2) break; // Limit lines for cleaner aesthetic
          const p2 = projectedPoints[j];
          
          // Calculate distance in 3D space
          const dx = p1.x - p2.x;
          const dy = p1.y - p2.y;
          const dz = p1.z - p2.z;
          const dist = Math.sqrt(dx * dx + dy * dy + dz * dz);

          if (dist < 120) {
            connections++;
            // Opacity based on distance and depth
            const depthOpacity = Math.max(0, (p1.z + radius) / (2 * radius));
            const distOpacity = 1 - dist / 120;
            const opacity = distOpacity * depthOpacity * 0.18;

            ctx.strokeStyle = isDark 
              ? `rgba(168, 85, 247, ${opacity})` 
              : `rgba(147, 51, 234, ${opacity * 1.3})`; // Darker violet for better visibility in light mode
            ctx.beginPath();
            ctx.moveTo(p1.px!, p1.py!);
            ctx.lineTo(p2.px!, p2.py!);
            ctx.stroke();
          }
        }
      }

      // Draw points
      projectedPoints.forEach((p) => {
        // Opacity based on depth (z-coordinate)
        const depthOpacity = Math.max(0.1, (p.z + radius) / (2 * radius));
        const pointRadius = Math.max(0.8, p.scale * 2);

        // Gradient color for points (front is violet/pink, back is dark blue)
        const gradient = ctx.createRadialGradient(p.px!, p.py!, 0, p.px!, p.py!, pointRadius * 2);
        
        if (p.z > 0) {
          // Back particles
          gradient.addColorStop(0, isDark 
            ? `rgba(100, 116, 139, ${depthOpacity * 0.5})`
            : `rgba(148, 163, 184, ${depthOpacity * 0.3})`);
          gradient.addColorStop(1, "rgba(100, 116, 139, 0)");
        } else {
          // Front particles (glowing violet)
          gradient.addColorStop(0, `rgba(168, 85, 247, ${depthOpacity * 0.9})`);
          gradient.addColorStop(0.5, `rgba(236, 72, 153, ${depthOpacity * 0.5})`);
          gradient.addColorStop(1, "rgba(236, 72, 153, 0)");
        }

        ctx.fillStyle = gradient;
        ctx.beginPath();
        ctx.arc(p.px!, p.py!, pointRadius * 2.5, 0, Math.PI * 2);
        ctx.fill();

        // Draw tiny solid core
        ctx.fillStyle = p.z > 0 
          ? (isDark ? `rgba(100, 116, 139, ${depthOpacity * 0.6})` : `rgba(148, 163, 184, ${depthOpacity * 0.4})`) 
          : (isDark ? `rgba(255, 255, 255, ${depthOpacity * 0.8})` : `rgba(147, 51, 234, ${depthOpacity * 0.95})`);
        ctx.beginPath();
        ctx.arc(p.px!, p.py!, pointRadius * 0.7, 0, Math.PI * 2);
        ctx.fill();
      });

      animationId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationId);
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
    };
  }, []);

  return <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />;
}
