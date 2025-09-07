
import React, { useRef, useEffect, useImperativeHandle, useState, forwardRef, useCallback } from 'react';
import type { DrawTool, AspectRatio, DrawingCanvasRef } from '../types';

interface DrawingCanvasProps {
    tool: DrawTool;
    brushSize: number;
    fillColor: string;
    strokeColor: string;
    backgroundColor: string;
    aspectRatio: AspectRatio;
    backgroundImage: string | null;
    isPreviewingBrushSize: boolean;
}

// A simple in-memory history stack for undo functionality
const MAX_HISTORY = 20;

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(
    ({ tool, brushSize, fillColor, strokeColor, backgroundColor, aspectRatio, backgroundImage, isPreviewingBrushSize }, ref) => {
        const canvasRef = useRef<HTMLCanvasElement>(null);
        const contextRef = useRef<CanvasRenderingContext2D | null>(null);
        const [isDrawing, setIsDrawing] = useState(false);
        const [history, setHistory] = useState<ImageData[]>([]);
        const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
        const lastSnapshot = useRef<ImageData | null>(null);

        const getCanvasAndContext = useCallback(() => {
            const canvas = canvasRef.current;
            if (!canvas) return { canvas: null, ctx: null };
            const ctx = contextRef.current;
            return { canvas, ctx };
        }, []);

        const saveState = useCallback(() => {
            const { canvas, ctx } = getCanvasAndContext();
            if (!canvas || !ctx) return;
            const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
            setHistory(prev => [...prev.slice(prev.length > MAX_HISTORY ? 1 : 0), data]);
        }, [getCanvasAndContext]);
        
        const drawBackgroundImage = useCallback(() => {
            const { canvas, ctx } = getCanvasAndContext();
            if (!canvas || !ctx) return;
            
            ctx.fillStyle = backgroundColor;
            ctx.fillRect(0, 0, canvas.width, canvas.height);

            if (backgroundImage) {
                const img = new Image();
                img.crossOrigin = 'anonymous';
                img.src = backgroundImage;
                img.onload = () => {
                    ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                    saveState();
                };
            } else {
                 saveState();
            }
        }, [getCanvasAndContext, backgroundColor, backgroundImage, saveState]);

        useEffect(() => {
            const canvas = canvasRef.current;
            if (!canvas) return;

            const [w, h] = aspectRatio.split(':').map(Number);
            const parent = canvas.parentElement;
            if (!parent) return;

            const parentWidth = parent.clientWidth;
            const parentHeight = parent.clientHeight;
            
            const parentRatio = parentWidth / parentHeight;
            const canvasRatio = w / h;

            if (parentRatio > canvasRatio) {
                canvas.height = parentHeight;
                canvas.width = parentHeight * canvasRatio;
            } else {
                canvas.width = parentWidth;
                canvas.height = parentWidth / canvasRatio;
            }
            
            const context = canvas.getContext('2d');
            if (context) {
                context.lineCap = 'round';
                context.lineJoin = 'round';
                contextRef.current = context;
                
                // Redraw background when aspect ratio changes
                setHistory([]);
                drawBackgroundImage();
            }
        }, [aspectRatio, drawBackgroundImage]);
        
        useEffect(() => {
            drawBackgroundImage();
        // eslint-disable-next-line react-hooks/exhaustive-deps
        }, [backgroundColor, backgroundImage]);

        const getMousePos = (e: React.MouseEvent): { x: number, y: number } => {
            const canvas = canvasRef.current;
            if (!canvas) return { x: 0, y: 0 };
            const rect = canvas.getBoundingClientRect();
            return {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        };

        const startDrawing = (e: React.MouseEvent) => {
            const { ctx } = getCanvasAndContext();
            if (!ctx) return;
            const { x, y } = getMousePos(e);
            
            saveState(); // Save state before starting a new shape/line
            
            setIsDrawing(true);
            
            if (tool === 'brush') {
                ctx.beginPath();
                ctx.moveTo(x, y);
            } else {
                const { canvas } = getCanvasAndContext();
                if (!canvas) return;
                lastSnapshot.current = ctx.getImageData(0, 0, canvas.width, canvas.height);
                setStartPoint({ x, y });
            }
        };

        const draw = (e: React.MouseEvent) => {
            if (!isDrawing) return;
            const { ctx } = getCanvasAndContext();
            if (!ctx) return;
            const { x, y } = getMousePos(e);

            ctx.lineWidth = brushSize;
            ctx.strokeStyle = strokeColor;
            ctx.fillStyle = fillColor;

            if (tool === 'brush') {
                ctx.lineTo(x, y);
                ctx.stroke();
            } else if (startPoint) {
                 if (lastSnapshot.current) {
                    ctx.putImageData(lastSnapshot.current, 0, 0);
                }
                ctx.beginPath();
                const dx = x - startPoint.x;
                const dy = y - startPoint.y;

                switch (tool) {
                    case 'rectangle':
                        ctx.rect(startPoint.x, startPoint.y, dx, dy);
                        break;
                    case 'circle':
                        const radius = Math.sqrt(dx * dx + dy * dy);
                        ctx.arc(startPoint.x, startPoint.y, radius, 0, 2 * Math.PI);
                        break;
                    case 'arrow':
                        const headlen = Math.max(10, brushSize * 2);
                        const angle = Math.atan2(dy, dx);
                        ctx.moveTo(startPoint.x, startPoint.y);
                        ctx.lineTo(x, y);
                        ctx.lineTo(x - headlen * Math.cos(angle - Math.PI / 6), y - headlen * Math.sin(angle - Math.PI / 6));
                        ctx.moveTo(x, y);
                        ctx.lineTo(x - headlen * Math.cos(angle + Math.PI / 6), y - headlen * Math.sin(angle + Math.PI / 6));
                        break;
                }
                if (fillColor !== 'transparent') ctx.fill();
                if (brushSize > 0) ctx.stroke();
            }
        };

        const stopDrawing = () => {
            if (!isDrawing) return;
            setIsDrawing(false);
            setStartPoint(null);
            lastSnapshot.current = null;
        };

        const clearCanvas = () => {
             const { canvas, ctx } = getCanvasAndContext();
             if (!canvas || !ctx) return;
             ctx.clearRect(0, 0, canvas.width, canvas.height);
             setHistory([]);
             drawBackgroundImage();
        };

        const undo = () => {
            if (history.length <= 1) { // Keep the initial background state
                clearCanvas();
                return;
            }
            const { canvas, ctx } = getCanvasAndContext();
            if (!canvas || !ctx) return;
            const lastState = history[history.length - 2];
            ctx.putImageData(lastState, 0, 0);
            setHistory(prev => prev.slice(0, prev.length - 1));
        };
        
        useImperativeHandle(ref, () => ({
            exportImage: () => {
                const canvas = canvasRef.current;
                return canvas ? canvas.toDataURL('image/png') : '';
            },
            clear: clearCanvas,
            undo,
        }));

        return (
            <div className="w-full h-full flex items-center justify-center relative">
                 <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing}
                    className="rounded-lg shadow-lg"
                 />
                 {isPreviewingBrushSize && tool === 'brush' && (
                     <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 bg-transparent rounded-full pointer-events-none border border-dashed border-white/50"
                        style={{ width: brushSize, height: brushSize }}
                     />
                 )}
            </div>
        );
    }
);
