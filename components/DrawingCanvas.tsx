
import React, { forwardRef, useImperativeHandle, useRef, useEffect, useState, useCallback } from 'react';
import type { DrawTool, AspectRatio, DrawingCanvasRef } from '../types';

interface Point {
  x: number;
  y: number;
}

interface DrawingCanvasProps {
  tool: DrawTool;
  brushSize: number;
  strokeColor: string;
  fillColor: string;
  aspectRatio: AspectRatio;
  backgroundColor: string;
  backgroundImage: string | null;
}

const MAX_UNDO_STEPS = 20;

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
  (
    {
      tool,
      brushSize,
      strokeColor,
      fillColor,
      aspectRatio,
      backgroundColor,
      backgroundImage,
    },
    ref
  ) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const tempCanvasRef = useRef<HTMLCanvasElement>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [startPoint, setStartPoint] = useState<Point | null>(null);
    const [history, setHistory] = useState<string[]>([]);

    const getCanvasContext = (canvas: HTMLCanvasElement | null) => canvas?.getContext('2d');

    const saveState = useCallback(() => {
        const canvas = canvasRef.current;
        if (canvas) {
            const dataUrl = canvas.toDataURL();
            setHistory(prev => [...prev.slice(-MAX_UNDO_STEPS + 1), dataUrl]);
        }
    }, []);
    
    // --- Canvas Setup and Resizing ---
    const setupCanvas = useCallback(() => {
        const container = containerRef.current;
        const canvas = canvasRef.current;
        const tempCanvas = tempCanvasRef.current;
        if (!container || !canvas || !tempCanvas) return;

        const [aspectW, aspectH] = aspectRatio.split(':').map(Number);
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;
        
        let newW = containerW;
        let newH = containerW / (aspectW / aspectH);

        if (newH > containerH) {
            newH = containerH;
            newW = containerH * (aspectW / aspectH);
        }

        canvas.width = tempCanvas.width = newW;
        canvas.height = tempCanvas.height = newH;
        
        const ctx = getCanvasContext(canvas);
        if(ctx) {
            ctx.lineCap = 'round';
            ctx.lineJoin = 'round';
        }
        
        // Redraw content after resize
        if (history.length > 0) {
            const lastState = new Image();
            lastState.onload = () => ctx?.drawImage(lastState, 0, 0, newW, newH);
            lastState.src = history[history.length - 1];
        } else {
             const img = new Image();
             img.onload = () => {
                 if(ctx) {
                    ctx.fillStyle = backgroundColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    saveState();
                 }
             };
             if (backgroundImage) {
                 img.src = backgroundImage;
             } else {
                 if(ctx) {
                    ctx.fillStyle = backgroundColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    saveState();
                 }
             }
        }

    }, [aspectRatio, backgroundColor, backgroundImage, history, saveState]);

    useEffect(() => {
        setupCanvas();
        const observer = new ResizeObserver(setupCanvas);
        if (containerRef.current) {
            observer.observe(containerRef.current);
        }
        return () => observer.disconnect();
    }, [setupCanvas]);
    
    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = getCanvasContext(canvas);
        if (!ctx || !canvas) return;
        
        const img = new Image();
        img.onload = () => {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
            saveState();
        };

        if (backgroundImage) {
            img.src = backgroundImage;
        } else {
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);
            saveState();
        }

    }, [backgroundColor, backgroundImage, saveState]);


    const getMousePos = (e: React.MouseEvent | React.TouchEvent): Point => {
        const canvas = tempCanvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        const touch = 'touches' in e ? e.touches[0] : null;
        const clientX = touch ? touch.clientX : (e as React.MouseEvent).clientX;
        const clientY = touch ? touch.clientY : (e as React.MouseEvent).clientY;
        return {
            x: clientX - rect.left,
            y: clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
        e.preventDefault();
        setIsDrawing(true);
        const pos = getMousePos(e);
        setStartPoint(pos);
        
        if (tool === 'brush') {
            const ctx = getCanvasContext(canvasRef.current);
            if (ctx) {
                ctx.beginPath();
                ctx.moveTo(pos.x, pos.y);
            }
        }
    };
    
    const draw = (e: React.MouseEvent | React.TouchEvent) => {
        if (!isDrawing) return;
        e.preventDefault();
        const pos = getMousePos(e);
        const mainCtx = getCanvasContext(canvasRef.current);
        const tempCtx = getCanvasContext(tempCanvasRef.current);

        if (!mainCtx || !tempCtx || !tempCanvasRef.current) return;
        
        tempCtx.lineWidth = brushSize;
        tempCtx.strokeStyle = strokeColor;
        tempCtx.fillStyle = fillColor;

        tempCtx.clearRect(0, 0, tempCtx.canvas.width, tempCtx.canvas.height);

        switch(tool) {
            case 'brush':
                mainCtx.lineWidth = brushSize;
                mainCtx.strokeStyle = strokeColor;
                mainCtx.lineTo(pos.x, pos.y);
                mainCtx.stroke();
                break;
            case 'rectangle':
                if (startPoint) {
                    tempCtx.beginPath();
                    tempCtx.rect(startPoint.x, startPoint.y, pos.x - startPoint.x, pos.y - startPoint.y);
                    if (fillColor !== 'transparent') tempCtx.fill();
                    if (strokeColor !== 'transparent' && brushSize > 0) tempCtx.stroke();
                }
                break;
            case 'circle':
                 if (startPoint) {
                    const radiusX = Math.abs(pos.x - startPoint.x) / 2;
                    const radiusY = Math.abs(pos.y - startPoint.y) / 2;
                    const centerX = startPoint.x + (pos.x - startPoint.x) / 2;
                    const centerY = startPoint.y + (pos.y - startPoint.y) / 2;
                    tempCtx.beginPath();
                    tempCtx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                    if (fillColor !== 'transparent') tempCtx.fill();
                    if (strokeColor !== 'transparent' && brushSize > 0) tempCtx.stroke();
                }
                break;
            case 'arrow':
                if (startPoint) {
                    const headlen = brushSize * 2;
                    const dx = pos.x - startPoint.x;
                    const dy = pos.y - startPoint.y;
                    const angle = Math.atan2(dy, dx);
                    tempCtx.beginPath();
                    tempCtx.moveTo(startPoint.x, startPoint.y);
                    tempCtx.lineTo(pos.x, pos.y);
                    tempCtx.lineTo(pos.x - headlen * Math.cos(angle - Math.PI / 6), pos.y - headlen * Math.sin(angle - Math.PI / 6));
                    tempCtx.moveTo(pos.x, pos.y);
                    tempCtx.lineTo(pos.x - headlen * Math.cos(angle + Math.PI / 6), pos.y - headlen * Math.sin(angle + Math.PI / 6));
                    tempCtx.stroke();
                }
                break;
        }
    };
    
    const stopDrawing = () => {
        if (!isDrawing) return;
        const mainCtx = getCanvasContext(canvasRef.current);
        const tempCtx = getCanvasContext(tempCanvasRef.current);
        const tempCanvas = tempCanvasRef.current;
        if (mainCtx && tempCanvas) {
            mainCtx.drawImage(tempCanvas, 0, 0);
            tempCtx?.clearRect(0, 0, tempCanvas.width, tempCanvas.height);
        }
        
        setIsDrawing(false);
        setStartPoint(null);
        if (tool === 'brush') mainCtx?.closePath();
        
        saveState();
    };

    useImperativeHandle(ref, () => ({
        exportImage: () => {
            return canvasRef.current?.toDataURL('image/png') || '';
        },
        clear: () => {
            const canvas = canvasRef.current;
            const ctx = getCanvasContext(canvas);
            if (canvas && ctx) {
                ctx.clearRect(0, 0, canvas.width, canvas.height);
                 const img = new Image();
                 img.onload = () => {
                     ctx.fillStyle = backgroundColor;
                     ctx.fillRect(0, 0, canvas.width, canvas.height);
                     if (backgroundImage) {
                         ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                     }
                     saveState();
                 };
                 if (backgroundImage) {
                    img.src = backgroundImage;
                 } else {
                    ctx.fillStyle = backgroundColor;
                    ctx.fillRect(0, 0, canvas.width, canvas.height);
                    saveState();
                 }
            }
        },
        undo: () => {
            if (history.length <= 1) return; // Keep initial state
            const prevHistory = history.slice(0, -1);
            const lastStateUrl = prevHistory[prevHistory.length - 1];
            
            const canvas = canvasRef.current;
            const ctx = getCanvasContext(canvas);
            if (canvas && ctx && lastStateUrl) {
                const img = new Image();
                img.onload = () => {
                    ctx.clearRect(0, 0, canvas.width, canvas.height);
                    ctx.drawImage(img, 0, 0);
                };
                img.src = lastStateUrl;
                setHistory(prevHistory);
            }
        }
    }));

    return (
      <div className="relative w-full h-full bg-black/20 flex items-center justify-center p-2" ref={containerRef}>
        <canvas 
            ref={canvasRef} 
            className="absolute"
        />
        <canvas
          ref={tempCanvasRef}
          className="absolute cursor-crosshair"
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
        />
      </div>
    );
  }
);

DrawingCanvas.displayName = 'DrawingCanvas';

