
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

const TOTAL_SEGMENTS = 20; // Number of segments in the gauge

export const FuelGauge = ({ value, onValueChange, className, disabled = false }: FuelGaugeProps) => {
  const percentage = Math.max(0, Math.min(100, value)) / 100;
  const filledSegments = Math.round(percentage * TOTAL_SEGMENTS);

  const getSegmentColor = (index: number) => {
    if (index >= filledSegments) return 'hsl(var(--muted))';
    const segmentPercentage = (index + 1) / TOTAL_SEGMENTS;
    if (segmentPercentage <= 0.2) return 'hsl(var(--destructive))';
    if (segmentPercentage <= 0.5) return '#f59e0b'; // amber-500
    return 'hsl(var(--primary))';
  };

  // Create segments for the arc
  const segments = Array.from({ length: TOTAL_SEGMENTS }).map((_, i) => {
    const startAngle = -120;
    const angleRange = 240;
    const angle = startAngle + (i / TOTAL_SEGMENTS) * angleRange;
    const nextAngle = startAngle + ((i + 1) / TOTAL_SEGMENTS) * angleRange;
    
    // Calculate start and end points of the arc segment
    const startX = 60 + 45 * Math.cos((angle * Math.PI) / 180);
    const startY = 60 + 45 * Math.sin((angle * Math.PI) / 180);
    const endX = 60 + 45 * Math.cos((nextAngle * Math.PI) / 180);
    const endY = 60 + 45 * Math.sin((nextAngle * Math.PI) / 180);

    return (
      <path
        key={i}
        d={`M ${startX} ${startY} A 45 45 0 0 1 ${endX} ${endY}`}
        fill="none"
        stroke={getSegmentColor(i)}
        strokeWidth="12"
        strokeLinecap="butt" // Use butt for distinct segments
      />
    );
  });

  return (
    <div className={cn("relative w-full max-w-xs mx-auto text-center", className)}>
        <div className="relative aspect-square">
            <svg viewBox="0 0 120 120" className="w-full h-full transform -rotate-90">
                <g className="origin-center transform rotate-90">
                    {segments}

                    <g className="text-muted-foreground text-[10px] font-semibold">
                       <text x="20" y="95" textAnchor="middle" transform="rotate(-30, 20, 95)">E</text>
                       <text x="100" y="95" textAnchor="middle" transform="rotate(30, 100, 95)">F</text>
                    </g>
                    
                    <g className="text-foreground">
                        <Fuel x="49" y="45" width="22" height="22" className="text-muted-foreground" />
                        <text x="60" y="85" textAnchor="middle" className="text-2xl font-bold">
                            {Math.round(value)}%
                        </text>
                    </g>
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
