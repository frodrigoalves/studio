
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Fuel, Plus, Minus } from 'lucide-react';
import { Button } from './button';

interface FuelGaugeProps {
  value: number; // Expects a value from 0 to 100
  onValueChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

export const FuelGauge = ({ value, onValueChange, className, disabled = false }: FuelGaugeProps) => {
  const percentage = Math.max(0, Math.min(100, value)) / 100;
  const angle = -90 + (percentage * 180);

  const handleValueChange = (newValue: number) => {
    onValueChange(Math.max(0, Math.min(100, newValue)));
  };

  const tickMarks = Array.from({ length: 11 }).map((_, i) => {
    const tickAngle = -90 + i * 18; // 180 degrees / 10 segments
    return (
      <line
        key={i}
        x1="60"
        y1="10"
        x2="60"
        y2="15"
        stroke="hsl(var(--muted-foreground))"
        strokeWidth="1"
        transform={`rotate(${tickAngle} 60 60)`}
      />
    );
  });

  return (
    <div className={cn("relative w-full max-w-sm mx-auto text-center font-sans p-4 rounded-2xl text-card-foreground", className)}>
       <div className="relative w-full h-36 flex items-center justify-center">
         <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 120 70">
           {/* Background Arc */}
           <path
             d="M 10 60 A 50 50 0 0 1 110 60"
             fill="none"
             stroke="hsl(var(--muted))"
             strokeWidth="8"
           />
           {/* Filled Arc */}
           <path
             d="M 10 60 A 50 50 0 0 1 110 60"
             fill="none"
             stroke="hsl(var(--primary))"
             strokeWidth="8"
             strokeLinecap="round"
             style={{
               strokeDasharray: 157.08, // PI * r
               strokeDashoffset: 157.08 * (1 - percentage),
               transition: 'stroke-dashoffset 0.3s ease-out'
             }}
           />

           {/* Tick Marks */}
           <g>{tickMarks}</g>
           
           {/* E and F labels */}
           <text x="5" y="65" fontSize="10" className="fill-current text-muted-foreground font-bold">E</text>
           <text x="115" y="65" fontSize="10" textAnchor="end" className="fill-current text-muted-foreground font-bold">F</text>

           {/* Fuel Icon in center */}
            <g transform="translate(0, 5)">
              <Fuel x="53" y="15" width="14" height="14" className="text-muted-foreground" />
            </g>
         </svg>
       </div>
       
        {/* Digital Readout */}
        <div className="mt-[-2rem] mb-4 text-center">
             <span className="text-4xl font-bold font-mono text-primary">{Math.round(value)}</span>
             <span className="text-xl font-mono text-primary/80">%</span>
        </div>

       {/* Control Buttons */}
       <div className="flex justify-center mt-4 space-x-4">
         <Button 
           type="button"
           variant="outline"
           size="icon"
           className="h-12 w-12 rounded-full"
           onClick={() => handleValueChange(value - 5)}
           disabled={disabled || value <= 0}
         >
           <Minus className="h-6 w-6" />
         </Button>
         <Button 
           type="button"
           variant="outline"
           size="icon"
           className="h-12 w-12 rounded-full"
           onClick={() => handleValueChange(value + 5)}
           disabled={disabled || value >= 100}
         >
           <Plus className="h-6 w-6" />
         </Button>
       </div>
    </div>
  );
};
