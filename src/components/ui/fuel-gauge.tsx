
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Fuel } from 'lucide-react';

interface FuelGaugeProps {
  value: number; // 0 to 100
  onValueChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

export const FuelGauge = ({ value, onValueChange, className, disabled = false }: FuelGaugeProps) => {
  const percentage = Math.max(0, Math.min(100, value)) / 100;
  
  const getArcColor = (p: number) => {
      if (p <= 0.15) return 'hsl(var(--destructive))'; // red
      if (p <= 0.5) return '#f59e0b'; // amber-500
      return '#22c55e'; // green-500
  }

  return (
    <div className={cn("relative w-full max-w-xs mx-auto text-center", className)}>
        <div className="relative aspect-square">
            <svg viewBox="0 0 120 120" className="w-full h-full">
                {/* Background Track */}
                <path
                    d="M 20 100 A 50 50 0 0 1 100 100"
                    fill="none"
                    stroke="hsl(var(--muted))"
                    strokeWidth="12"
                    strokeLinecap="round"
                />
                {/* Filled Arc */}
                <path
                    d="M 20 100 A 50 50 0 0 1 100 100"
                    fill="none"
                    stroke={getArcColor(percentage)}
                    strokeWidth="12"
                    strokeLinecap="round"
                    strokeDasharray="157" // Circumference of semicircle (pi * r)
                    strokeDashoffset={157 * (1 - percentage)}
                    className="transition-all duration-300 ease-in-out"
                />
                <g className="text-muted-foreground text-[10px] font-semibold">
                    <text x="12" y="105" textAnchor="middle">E</text>
                    <text x="108" y="105" textAnchor="middle">F</text>
                </g>
                 <g className="text-foreground">
                    <Fuel x="49" y="45" width="22" height="22" className="text-muted-foreground" />
                    <text x="60" y="85" textAnchor="middle" className="text-2xl font-bold">
                        {Math.round(value)}%
                    </text>
                </g>
            </svg>
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
    </div>
  );
};
