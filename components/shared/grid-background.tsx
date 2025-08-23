"use client";

import React from "react";

export function AnimatedBackground({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="relative flex items-center justify-center h-screen w-full overflow-hidden bg-gradient-to-br from-blue-100 via-purple-100 to-pink-100 dark:from-gray-900 dark:via-black dark:to-gray-950">
      {/* animowane gradientowe fale */}
      <div className="absolute inset-0">
        <div className="absolute w-[200%] h-[200%] -left-1/2 -top-1/2 animate-wave bg-[radial-gradient(circle_at_50%_50%,rgba(255,255,255,0.08),transparent_70%)]" />
      </div>

      {/* maska żeby środek był bardziej czytelny */}
      <div className="absolute inset-0 [mask-image:radial-gradient(circle_at_center,black_60%,transparent)]" />

      {/* content */}
      <div className="relative z-20">{children}</div>
    </div>
  );
}
