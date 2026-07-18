"use client";

import React from "react";
import { ThreeDGlobe } from "./three-d-globe";

export function AnimatedBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center justify-center min-h-screen w-full overflow-hidden bg-slate-950">
      {/* Animated background radial glows */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_30%_30%,rgba(99,102,241,0.15),transparent_60%)]" />
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_75%_75%,rgba(236,72,153,0.08),transparent_60%)]" />

      {/* Grid pattern overlay */}
      <div className="absolute inset-0 bg-grid-premium opacity-25" />

      {/* Interactive 3D Sphere */}
      <ThreeDGlobe />

      {/* Content container */}
      <div className="relative z-20 w-full flex items-center justify-center p-4">
        {children}
      </div>
    </div>
  );
}
