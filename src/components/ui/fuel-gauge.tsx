
'use client';

import React from 'react';
import { cn } from '@/lib/utils';

interface FuelGaugeProps {
  value: number; // 0 to 100
  onValueChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

export const FuelGauge = ({ value, onValueChange, className, disabled = false }: FuelGaugeProps) => {
  const percentage = Math.max(0, Math.min(100, value)) / 100;
  // Angle from -90 (empty) to 90 (full)
  const angle = percentage * 180 - 90;

  return (
    <div className={cn("relative w-full max-w-xs mx-auto text-center", className)}>
      <div className="relative aspect-[2/1] overflow-hidden">
        {/* Background Arc */}
        <div
          className="absolute bottom-0 left-0 w-full h-[200%] rounded-t-full border-[20px] box-border"
          style={{
            borderColor: '#e5e7eb', // gray-200
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 50%, 0% 50%)',
          }}
        />

        {/* Color Indicator Arcs */}
        <div
          className="absolute bottom-0 left-0 w-full h-[200%] rounded-t-full border-[20px] box-border transition-all duration-300"
          style={{
            borderColor:
              percentage <= 0.2 ? 'hsl(var(--destructive))' : // Red
              percentage <= 0.5 ? '#f59e0b' : // Orange-400
              percentage <= 0.8 ? '#facc15' : // Yellow-400
              '#22c55e', // Green-500
            clipPath: 'polygon(0% 0%, 100% 0%, 100% 50%, 0% 50%)',
            clip: `rect(0, ${percentage * 200}px, 200px, 0)`
          }}
        />
        
        {/* Center Icon */}
         <div className="absolute bottom-0 left-1/2 -translate-x-1/2 flex flex-col items-center justify-end h-1/2 pb-2">
            <svg xmlns="http://www.w3.org/2000/svg" width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-fuel text-muted-foreground">
                <path d="M3 22a1 1 0 0 0 1 1h16a1 1 0 0 0 1-1V3a1 1 0 0 0-1-1H4a1 1 0 0 0-1 1Z"/>
                <path d="M14 7h4"/>
                <path d="M14 11h4"/>
                <path d="M14 15h4"/>
                <path d="M5 15h4"/>
            </svg>
            <span className="font-bold text-lg">{value}%</span>
        </div>

        {/* Needle */}
        <div
          className="absolute bottom-0 left-1/2 w-1/2 h-1.5 bg-foreground rounded-l-full origin-left transition-transform duration-300"
          style={{
            transform: `rotate(${angle}deg)`,
            transformOrigin: '0% 50%',
            left: '50%',
          }}
        >
             <div className="absolute left-0 top-1/2 -translate-y-1/2 w-4 h-4 bg-foreground rounded-full" />
        </div>
      </div>
      
       <div className="flex justify-between font-bold text-muted-foreground -mt-2 px-1">
          <span>E</span>
          <span>F</span>
      </div>

      <input
        type="range"
        min="0"
        max="100"
        value={value}
        onChange={(e) => onValueChange(Number(e.target.value))}
        className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
        disabled={disabled}
      />
    </div>
  );
};

