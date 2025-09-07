import React, { useRef, useEffect, useImperativeHandle, forwardRef, useState, useCallback } from 'react';
import type { DrawingCanvasRef, DrawTool, AspectRatio } from '../types';

interface DrawingCanvasProps {
    tool: DrawTool;
    brushSize: number;
    strokeColor: string;
    fillColor: string;
    aspectRatio: AspectRatio;
    backgroundColor: string;
    backgroundImage: string | null;
    isPreviewingBrushSize: boolean;
}

// Helper function to calculate aspect ratio dimensions
const getCanvasSize = (aspectRatio: AspectRatio, containerWidth: number, containerHeight: number) => {
    const [w, h] = aspectRatio.split(':').map(Number);
    const containerRatio = containerWidth / containerHeight;
    const imageRatio = w / h;

    if (containerRatio > imageRatio) {
        // Container is wider than the image
        const height = containerHeight;
        const width = height * imageRatio;
        return { width, height };
    } else {
        // Container is taller or same ratio
        const width = containerWidth;
        const height = width / imageRatio;
        return { width, height };
    }
};

export const DrawingCanvas = forwardRef<DrawingCanvasRef, DrawingCanvasProps>(({
    tool,
    brushSize,
    strokeColor,
    fillColor,
    aspectRatio,
    backgroundColor,
    backgroundImage,
    isPreviewingBrushSize,
}, ref) => {
    const containerRef = useRef<HTMLDivElement>(null);
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const contextRef = useRef<CanvasRenderingContext2D | null>(null);

    const [isDrawing, setIsDrawing] = useState(false);
    const [history, setHistory] = useState<ImageData[]>([]);
    
    // Start position for shapes/arrows
    const [startPoint, setStartPoint] = useState<{ x: number, y: number } | null>(null);
    const [snapshot, setSnapshot] = useState<ImageData | null>(null);


    const getContext = useCallback(() => {
        const canvas = canvasRef.current;
        if (!canvas) return null;
        if (!contextRef.current) {
            contextRef.current = canvas.getContext('2d');
        }
        return contextRef.current;
    }, []);

    // Function to redraw canvas from scratch
    const redrawCanvas = useCallback((preserveHistory = false) => {
        const canvas = canvasRef.current;
        const ctx = getContext();
        if (!canvas || !ctx) return;
        
        // Clear canvas
        ctx.clearRect(0, 0, canvas.width, canvas.height);

        // Draw background color
        ctx.fillStyle = backgroundColor;
        ctx.fillRect(0, 0, canvas.width, canvas.height);

        const restoreLastHistory = () => {
            if (preserveHistory && history.length > 0) {
                 ctx.putImageData(history[history.length - 1], 0, 0);
            }
        };

        // Draw background image if it exists
        if (backgroundImage) {
            const img = new Image();
            img.onload = () => {
                ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
                restoreLastHistory();
            };
            img.src = backgroundImage;
        } else {
            restoreLastHistory();
        }
    }, [backgroundColor, backgroundImage, history, getContext]);

    // Initialize and resize canvas
    useEffect(() => {
        const container = containerRef.current;
        if (!container) return;

        const handleResize = () => {
            if (!containerRef.current || !canvasRef.current) return;
            const { width, height } = getCanvasSize(aspectRatio, containerRef.current.offsetWidth, containerRef.current.offsetHeight);
            if (canvasRef.current.width !== width || canvasRef.current.height !== height) {
                 canvasRef.current.width = width;
                 canvasRef.current.height = height;
                 redrawCanvas(true); // Redraw preserving history
            }
        };

        handleResize();
        
        const resizeObserver = new ResizeObserver(handleResize);
        resizeObserver.observe(container);

        return () => resizeObserver.unobserve(container);
    }, [aspectRatio, redrawCanvas]);

    // Redraw when background changes, clearing history
    useEffect(() => {
        setHistory([]);
        redrawCanvas(false);
    }, [backgroundColor, backgroundImage]);


    const saveState = useCallback(() => {
        const canvas = canvasRef.current;
        const ctx = getContext();
        if (!canvas || !ctx) return;
        const data = ctx.getImageData(0, 0, canvas.width, canvas.height);
        setHistory(prev => [...prev, data]);
    }, [getContext]);

    const getMousePos = (e: MouseEvent | React.MouseEvent) => {
        const canvas = canvasRef.current;
        if (!canvas) return { x: 0, y: 0 };
        const rect = canvas.getBoundingClientRect();
        return {
            x: e.clientX - rect.left,
            y: e.clientY - rect.top
        };
    };

    const startDrawing = (e: React.MouseEvent) => {
        const ctx = getContext();
        if (!ctx) return;
        
        if (history.length === 0) { // Save initial state on first draw action
            saveState();
        }

        setIsDrawing(true);
        const { x, y } = getMousePos(e);
        
        if (tool === 'brush') {
            ctx.beginPath();
            ctx.moveTo(x, y);
        } else {
            setStartPoint({ x, y });
            const canvas = canvasRef.current;
            if (canvas) {
                setSnapshot(ctx.getImageData(0, 0, canvas.width, canvas.height));
            }
        }
    };
    
    const draw = (e: React.MouseEvent) => {
        if (!isDrawing) return;
        const ctx = getContext();
        const canvas = canvasRef.current;
        if (!ctx || !canvas) return;
        
        const { x, y } = getMousePos(e);
        
        ctx.lineCap = 'round';
        ctx.lineJoin = 'round';
        ctx.strokeStyle = strokeColor;
        ctx.lineWidth = brushSize;
        ctx.fillStyle = fillColor;

        if (tool === 'brush') {
            ctx.lineTo(x, y);
            ctx.stroke();
        } else if (startPoint && snapshot) {
            ctx.putImageData(snapshot, 0, 0); // Restore to pre-shape state
            
            if (tool === 'rectangle') {
                ctx.beginPath();
                ctx.rect(startPoint.x, startPoint.y, x - startPoint.x, y - startPoint.y);
                if (fillColor !== 'transparent') ctx.fill();
                if (strokeColor !== 'transparent' && brushSize > 0) ctx.stroke();
            } else if (tool === 'circle') {
                ctx.beginPath();
                const radiusX = Math.abs(x - startPoint.x) / 2;
                const radiusY = Math.abs(y - startPoint.y) / 2;
                const centerX = startPoint.x + (x - startPoint.x) / 2;
                const centerY = startPoint.y + (y - startPoint.y) / 2;
                ctx.ellipse(centerX, centerY, radiusX, radiusY, 0, 0, 2 * Math.PI);
                if (fillColor !== 'transparent') ctx.fill();
                if (strokeColor !== 'transparent' && brushSize > 0) ctx.stroke();
            } else if (tool === 'arrow') {
                ctx.beginPath();
                ctx.moveTo(startPoint.x, startPoint.y);
                ctx.lineTo(x, y);
                
                const headlen = Math.max(10, brushSize * 2.5);
                const angle = Math.atan2(y - startPoint.y, x - startPoint.x);
                ctx.moveTo(x, y);
                ctx.lineTo(x - headlen * Math.cos(angle - Math.PI / 7), y - headlen * Math.sin(angle - Math.PI / 7));
                ctx.moveTo(x, y);
                ctx.lineTo(x - headlen * Math.cos(angle + Math.PI / 7), y - headlen * Math.sin(angle + Math.PI / 7));
                
                ctx.stroke();
            }
        }
    };

    const stopDrawing = () => {
        if (!isDrawing) return;
        const ctx = getContext();
        if (!ctx) return;
        
        saveState();
        ctx.closePath();
        setIsDrawing(false);
        setStartPoint(null);
        setSnapshot(null);
    };

    // Imperative API
    useImperativeHandle(ref, () => ({
        exportImage: () => {
            const canvas = canvasRef.current;
            if (!canvas) return '';
            return canvas.toDataURL('image/png');
        },
        clear: () => {
            setHistory([]);
            redrawCanvas(false);
        },
        undo: () => {
             if (history.length <= 1) { 
                setHistory([]);
                redrawCanvas(false);
                return;
            }

            const newHistory = history.slice(0, -1);
            const lastState = newHistory[newHistory.length - 1];
            setHistory(newHistory);

            const ctx = getContext();
            if (ctx && lastState) {
                ctx.putImageData(lastState, 0, 0);
            }
        },
    }));

    return (
        <div ref={containerRef} className="w-full h-full flex items-center justify-center p-4 bg-black">
            <div className="relative">
                <canvas
                    ref={canvasRef}
                    onMouseDown={startDrawing}
                    onMouseMove={draw}
                    onMouseUp={stopDrawing}
                    onMouseLeave={stopDrawing} // Stop drawing if mouse leaves canvas
                    className="rounded-lg shadow-lg"
                    style={{ cursor: 'crosshair' }}
                />
                {isPreviewingBrushSize && (
                    <div 
                        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none transition-opacity duration-200"
                        style={{
                            width: brushSize,
                            height: brushSize,
                            background: tool === 'brush' || tool === 'arrow' ? strokeColor : (fillColor !== 'transparent' ? fillColor : 'rgba(0,0,0,0.3)'),
                            border: tool === 'rectangle' || tool === 'circle' ? `${Math.min(brushSize, 10)}px solid ${strokeColor}` : 'none'
                        }}
                    ></div>
                )}
            </div>
        </div>
    );
});

DrawingCanvas.displayName = 'DrawingCanvas';
