
'use client';

import React from 'react';
import { cn } from '@/lib/utils';
import { Fuel, Plus, Minus } from 'lucide-react';
import { Button } from './button';

interface FuelGaugeProps {
  value: number; // 0 to 100
  onValueChange: (value: number) => void;
  className?: string;
  disabled?: boolean;
}

const TOTAL_SEGMENTS = 20;

export const FuelGauge = ({ value, onValueChange, className, disabled = false }: FuelGaugeProps) => {
  const percentage = Math.max(0, Math.min(100, value)) / 100;
  const filledSegments = Math.round(percentage * TOTAL_SEGMENTS);

  const handleValueChange = (newValue: number) => {
    onValueChange(Math.max(0, Math.min(100, newValue)));
  };

  const getSegmentColor = (index: number) => {
    if (index >= filledSegments) return 'hsl(var(--muted))';
    const segmentPercentage = (index + 1) / TOTAL_SEGMENTS;
    if (segmentPercentage <= 0.2) return 'hsl(var(--destructive))';
    if (segmentPercentage <= 0.5) return '#f59e0b'; // amber-500
    return 'hsl(var(--primary))';
  };

  const segments = Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => {
    const startAngle = -90; // Start from the left (180 degrees)
    const angleRange = 180; // Total arc is a semi-circle
    const angle = startAngle + (i / TOTAL_SEGMENTS) * angleRange;
    const nextAngle = startAngle + ((i + 0.9) / TOTAL_SEGMENTS) * angleRange; // Small gap
    
    // Center at (60, 60) in a 120x120 viewbox
    const startX = 60 + 50 * Math.cos((angle * Math.PI) / 180);
    const startY = 60 + 50 * Math.sin((angle * Math.PI) / 180);
    const endX = 60 + 50 * Math.cos((nextAngle * Math.PI) / 180);
    const endY = 60 + 50 * Math.sin((nextAngle * Math.PI) / 180);

    return (
      <path
        key={i}
        d={`M ${startX} ${startY} A 50 50 0 0 1 ${endX} ${endY}`}
        fill="none"
        stroke={getSegmentColor(i)}
        strokeWidth="12"
        strokeLinecap="butt"
      />
    );
  });

  return (
    <div className={cn("relative w-full max-w-xs mx-auto", className)}>
        <div className="flex items-center justify-center gap-2">
            <Button
                type="button"
                variant="outline"
                size="icon"
                className="h-12 w-12 rounded-full"
                onClick={() => handleValueChange(value - 5)}
                disabled={disabled}
            >
                <Minus className="h-6 w-6" />
            </Button>
            <div className="relative aspect-square flex-grow">
                <svg viewBox="0 0 120 120" className="w-full h-full">
                    <g>
                        {segments}

                        <g className="text-muted-foreground text-[14px] font-semibold fill-current">
                          {/* "E" at the start of the arc */}
                          <text x="5" y="65" textAnchor="start">E</text>
                          {/* "F" at the end of the arc */}
                          <text x="115" y="65" textAnchor="end">F</text>
                        </g>
                        
                        <g className="text-foreground fill-current">
                            <Fuel x="52" y="45" width="16" height="16" className="text-muted-foreground" />
                             <text x="60" y="85" textAnchor="middle" className="text-4xl font-bold">
                                {Math.round(value)}
                                <tspan dy="-10" className="text-2xl">%</tspan>
                            </text>
                        </g>
                    </g>
                </svg>
                <input
                    type="range"
                    min="0"
                    max="100"
                    value={value}
                    onChange={(e) => handleValueChange(Number(e.target.value))}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
                    disabled={disabled}
                />
            </div>
            <Button
                 type="button"
                 variant="outline"
                 size="icon"
                 className="h-12 w-12 rounded-full"
                 onClick={() => handleValueChange(value + 5)}
                 disabled={disabled}
            >
                <Plus className="h-6 w-6" />
            </Button>
        </div>
    </div>
  );
};
