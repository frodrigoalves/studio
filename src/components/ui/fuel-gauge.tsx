
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Button } from './button';
import { Plus, Minus } from 'lucide-react';

interface FuelGaugeProps {
  value: number; 
  onValueChange: (value: number) => void;
  maxValue?: number;
  className?: string;
  disabled?: boolean;
}

const STEP_VALUE = 10;

export const FuelGauge = ({ value, onValueChange, maxValue = 300, className, disabled = false }: FuelGaugeProps) => {

  const percentage = Math.max(0, Math.min(maxValue, value)) / maxValue;
  const angle = percentage * 180;
  const indicatorColor = percentage <= 0.2 ? 'hsl(var(--destructive))' : percentage <= 0.5 ? '#f59e0b' : 'hsl(var(--primary))';

  const handleValueChange = (newValue: number) => {
    onValueChange(Math.max(0, Math.min(maxValue, newValue)));
  };

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
             stroke={indicatorColor}
             strokeWidth="8"
             strokeLinecap="round"
             style={{
               strokeDasharray: 157.08, // PI * r
               strokeDashoffset: 157.08 * (1 - percentage),
               transition: 'stroke-dashoffset 0.3s ease-out'
             }}
           />

           {/* E and F labels */}
           <text x="5" y="65" fontSize="10" className="fill-current text-muted-foreground font-bold">E</text>
           <text x="115" y="65" fontSize="10" textAnchor="end" className="fill-current text-muted-foreground font-bold">F</text>
         </svg>

        {/* Pointer */}
        <div
          className="absolute w-1 h-14 bg-card-foreground rounded-full transition-transform duration-300 ease-in-out origin-bottom"
          style={{
            bottom: '28%',
            transform: `rotate(${angle - 90}deg)`,
          }}
        />
        {/* Pointer Hub */}
        <div className="absolute w-4 h-4 bg-card-foreground rounded-full" style={{ bottom: '26%' }} />
       </div>
       
        {/* Digital Readout */}
        <div className="mt-[-2rem] mb-4 text-center">
             <span className="text-4xl font-bold font-mono text-primary">{Math.round(value)}</span>
             <span className="text-xl font-mono text-primary/80"> L</span>
        </div>

       {/* Control Buttons */}
       <div className="flex justify-center mt-4 space-x-4">
         <Button 
           type="button"
           variant="outline"
           size="icon"
           className="h-12 w-12 rounded-full"
           onClick={() => handleValueChange(value - STEP_VALUE)}
           disabled={disabled || value <= 0}
         >
           <Minus className="h-6 w-6" />
         </Button>
         <Button 
           type="button"
           variant="outline"
           size="icon"
           className="h-12 w-12 rounded-full"
           onClick={() => handleValueChange(value + STEP_VALUE)}
           disabled={disabled || value >= maxValue}
         >
           <Plus className="h-6 w-6" />
         </Button>
       </div>
    </div>
  );
};
