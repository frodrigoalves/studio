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
  const STEP_VALUE = 5; // Adjust by 5%

  // Ensure value is within the 0-100 range
  const percentage = Math.max(0, Math.min(100, value)) / 100;
  
  // Map percentage to an angle from 0 to 180 degrees
  const angle = percentage * 180;
  
  // Define the indicator color based on percentage
  const indicatorColor = percentage <= 0.2 ? 'hsl(var(--destructive))' : percentage <= 0.5 ? '#f59e0b' : 'hsl(var(--primary))';

  const handleValueChange = (newValue: number) => {
    onValueChange(Math.max(0, Math.min(100, newValue)));
  };

  return (
    <div className={cn("relative w-full max-w-sm mx-auto text-center font-sans p-4 bg-card rounded-2xl text-card-foreground shadow-lg border", className)}>
      <div className="relative w-full h-36 flex items-center justify-center">
        {/* SVG do medidor */}
        <svg className="absolute top-0 left-0 w-full h-full" viewBox="0 0 120 70">
          {/* Fundo do arco (cinza) */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke="hsl(var(--muted))"
            strokeWidth="12"
          />
          {/* Arco colorido de acordo com o nível de combustível */}
          <path
            d="M 10 60 A 50 50 0 0 1 110 60"
            fill="none"
            stroke={indicatorColor}
            strokeWidth="12"
            strokeLinecap="round"
            style={{
              strokeDasharray: '157.08', // Perímetro do semicírculo (PI * r)
              strokeDashoffset: `${157.08 * (1 - percentage)}`,
            }}
          />

          {/* Rótulos de "E" e "F" */}
          <text x="8" y="65" fontSize="10" className="fill-current text-muted-foreground font-bold">E</text>
          <text x="112" y="65" fontSize="10" textAnchor="end" className="fill-current text-muted-foreground font-bold">F</text>
          
          <g transform="translate(0, 5)">
            <Fuel x="53" y="15" width="14" height="14" className="text-muted-foreground" />
             <text x="60" y="55" textAnchor="middle" className="text-4xl font-bold">
                {Math.round(value)}
                <tspan dy="-10" fontSize="24px">%</tspan>
            </text>
          </g>
        </svg>

        {/* Ponteiro */}
        <div className="absolute w-40 h-40" style={{bottom: '-58%'}}>
          <div
            className="absolute left-1/2 w-0.5 h-12 bg-foreground rounded-full transition-transform duration-300 ease-out origin-bottom"
            style={{
              transform: `translateX(-50%) rotate(${angle - 90}deg)`,
            }}
          />
          <div className="absolute left-1/2 top-1/2 w-4 h-4 bg-background border-2 border-foreground rounded-full transform -translate-x-1/2 -translate-y-1/2" />
        </div>
      </div>

      {/* Botões de controle */}
      <div className="flex justify-center mt-12 space-x-4">
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
          disabled={disabled || value >= 100}
        >
          <Plus className="h-6 w-6" />
        </Button>
      </div>
    </div>
  );
};
