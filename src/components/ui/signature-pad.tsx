
'use client';

import React, { useRef, useEffect, useState } from 'react';
import { Button } from './button';
import { cn } from '@/lib/utils';
import { Eraser } from 'lucide-react';

interface SignaturePadProps {
  onSignatureEnd: (signature: string | null) => void;
  className?: string;
  penColor?: string;
}

export const SignaturePad = ({ onSignatureEnd, className, penColor = '#FFFFFF' }: SignaturePadProps) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasSigned, setHasSigned] = useState(false);

  const getCanvasContext = () => {
    const canvas = canvasRef.current;
    if (!canvas) return null;
    return canvas.getContext('2d');
  };

  const getCoordinates = (event: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ('touches' in event) {
      return { x: event.touches[0].clientX - rect.left, y: event.touches[0].clientY - rect.top };
    }
    return { x: event.clientX - rect.left, y: event.clientY - rect.top };
  };

  const startDrawing = (event: React.MouseEvent | React.TouchEvent) => {
    const context = getCanvasContext();
    if (!context) return;
    const { x, y } = getCoordinates(event);
    context.beginPath();
    context.moveTo(x, y);
    setIsDrawing(true);
    setHasSigned(true);
  };

  const draw = (event: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing) return;
    const context = getCanvasContext();
    if (!context) return;
    const { x, y } = getCoordinates(event);
    context.lineTo(x, y);
    context.stroke();
  };

  const stopDrawing = () => {
    const canvas = canvasRef.current;
    if (!canvas || !isDrawing) return;
    setIsDrawing(false);
    onSignatureEnd(canvas.toDataURL('image/png'));
  };

  const clearSignature = () => {
    const canvas = canvasRef.current;
    const context = getCanvasContext();
    if (canvas && context) {
      context.clearRect(0, 0, canvas.width, canvas.height);
      onSignatureEnd(null);
      setHasSigned(false);
    }
  };

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      const context = canvas.getContext('2d');
      if (context) {
        context.strokeStyle = penColor;
        context.lineWidth = 2;
        context.lineCap = 'round';
        context.lineJoin = 'round';
      }
      
      const resizeCanvas = () => {
        const parent = canvas.parentElement;
        if(parent) {
            canvas.width = parent.clientWidth;
            canvas.height = parent.clientHeight;
            if (context) {
                context.strokeStyle = penColor;
                context.lineWidth = 2;
                context.lineCap = 'round';
                context.lineJoin = 'round';
            }
        }
      }
      
      resizeCanvas();
      window.addEventListener('resize', resizeCanvas);
      
      return () => {
        window.removeEventListener('resize', resizeCanvas);
      }
    }
  }, [penColor]);

  return (
    <div className={cn("relative", className)}>
      <canvas
        ref={canvasRef}
        className="w-full h-full"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />
      {hasSigned && (
        <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={clearSignature}
            className="absolute top-2 right-2 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
            aria-label="Limpar assinatura"
        >
            <Eraser className="w-5 h-5" />
        </Button>
      )}
    </div>
  );
};
