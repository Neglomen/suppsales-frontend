"use client";

import React from "react";
import { cn } from "@/lib/utils";

import { motion, AnimatePresence } from "framer-motion";

interface LogoProps {
  className?: string;
  iconClassName?: string;
  textClassName?: string;
  showText?: boolean;
}

export function Logo({
  className,
  iconClassName,
  textClassName,
  showText = true,
}: LogoProps) {
  return (
    <div className={cn("flex items-center gap-2 select-none", className)}>
      <div className="relative flex items-center justify-center">
        {/* Glow behind the logo */}
        <div className="absolute inset-0 bg-primary/20 blur-md rounded-full scale-110 opacity-70" />
        
        <svg
          viewBox="0 0 40 40"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className={cn("h-7 w-7 relative z-10 transition-transform duration-500 hover:rotate-12", iconClassName)}
        >
          <defs>
            <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="var(--primary)" />
              <stop offset="50%" stopColor="oklch(0.60 0.18 290)" /> {/* Violet */}
              <stop offset="100%" stopColor="oklch(0.65 0.22 320)" /> {/* Vivid Magenta */}
            </linearGradient>
            <filter id="logo-glow">
              <feGaussianBlur stdDeviation="1" result="blur" />
              <feComposite in="SourceGraphic" in2="blur" operator="over" />
            </filter>
          </defs>
          
          {/* Outer elegant path representing infinity loop / flow of sales and supply */}
          <path
            d="M 12 12 C 12 6, 28 6, 28 16 C 28 26, 12 22, 12 30 C 12 34, 28 34, 28 30"
            stroke="url(#logo-grad)"
            strokeWidth="4"
            strokeLinecap="round"
            strokeLinejoin="round"
            filter="url(#logo-glow)"
          />
          {/* Subtle accent dot inside the loop */}
          <circle cx="28" cy="30" r="2.5" fill="var(--color-primary-foreground)" className="animate-pulse" />
        </svg>
      </div>
      
      <AnimatePresence initial={false}>
        {showText && (
          <motion.span
            initial={{ opacity: 0, width: 0 }}
            animate={{ opacity: 1, width: "auto" }}
            exit={{ opacity: 0, width: 0 }}
            transition={{ duration: 0.2, ease: "easeInOut" }}
            className={cn(
              "font-bold tracking-tight text-lg bg-clip-text text-transparent bg-gradient-to-r from-foreground via-foreground/90 to-muted-foreground overflow-hidden whitespace-nowrap",
              textClassName
            )}
          >
            Supp<span className="text-primary">Sales</span>
          </motion.span>
        )}
      </AnimatePresence>
    </div>
  );
}
