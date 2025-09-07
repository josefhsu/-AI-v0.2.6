import React, { forwardRef, useImperativeHandle, useRef, useEffect, useCallback } from 'react';
import type { DrawTool, AspectRatio, DrawingCanvasRef } from '../types';

// Let TypeScript know that fabric is available on the global scope
declare const fabric: any;

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
      isPreviewingBrushSize,
    },
    ref
  ) => {
    const canvasRef = useRef<HTMLCanvasElement>(null);
    const fabricCanvasRef = useRef<any>(null);
    const containerRef = useRef<HTMLDivElement>(null);
    const historyRef = useRef<string[]>([]);
    const isDrawingRef = useRef(false);
    const startPointRef = useRef<{x: number, y: number} | null>(null);
    const currentShapeRef = useRef<any>(null);
    const previewCursorRef = useRef<HTMLDivElement>(null);

    const saveState = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        if (canvas) {
            const json = canvas.toJSON();
            historyRef.current.push(json);
            if (historyRef.current.length > MAX_UNDO_STEPS) {
                historyRef.current.shift();
            }
        }
    }, []);

    const updateCanvasView = useCallback(() => {
        const canvas = fabricCanvasRef.current;
        const container = containerRef.current;
        if (!canvas || !container) return;

        // --- Sizing logic ---
        const [aspectW, aspectH] = aspectRatio.split(':').map(Number);
        const containerW = container.clientWidth;
        const containerH = container.clientHeight;
        
        let newW = containerW;
        let newH = containerW / (aspectW / aspectH);

        if (newH > containerH) {
            newH = containerH;
            newW = containerH * (aspectW / aspectH);
        }
        
        canvas.setWidth(newW);
        canvas.setHeight(newH);
        canvas.calcOffset();

        // --- Background and color logic ---
        canvas.backgroundColor = backgroundColor;

        if (backgroundImage) {
            fabric.Image.fromURL(backgroundImage, (img:any) => {
                canvas.setBackgroundImage(img, canvas.renderAll.bind(canvas), {
                    scaleX: canvas.width / img.width,
                    scaleY: canvas.height / img.height,
                });
            });
        } else {
            canvas.setBackgroundImage(null, canvas.renderAll.bind(canvas));
        }

        // Final render
        canvas.renderAll();
    }, [aspectRatio, backgroundColor, backgroundImage]);

    useEffect(() => {
        if (!canvasRef.current) return;
        const canvas = new fabric.Canvas(canvasRef.current, {
            selection: false,
        });
        fabricCanvasRef.current = canvas;
        historyRef.current = [];
        
        updateCanvasView();
        saveState();

        return () => {
            canvas.dispose();
            fabricCanvasRef.current = null;
        };
    }, []); // Only on mount
    
    // --- Effects to trigger canvas updates ---
    
    // Update on prop changes
    useEffect(() => {
        if (fabricCanvasRef.current) {
            updateCanvasView();
        }
    }, [updateCanvasView]);

    // Update on window resize
    useEffect(() => {
        window.addEventListener('resize', updateCanvasView);
        return () => window.removeEventListener('resize', updateCanvasView);
    }, [updateCanvasView]);
    
    // Tool and brush settings
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas) return;
        
        canvas.isDrawingMode = tool === 'brush';

        if (tool === 'brush') {
            canvas.freeDrawingBrush.width = brushSize;
            canvas.freeDrawingBrush.color = strokeColor;
        }

    }, [tool, brushSize, strokeColor]);
    
    // Brush Preview (HTML Overlay)
    useEffect(() => {
        const container = containerRef.current;
        const previewEl = previewCursorRef.current;

        if (!container || !previewEl || tool !== 'brush') {
            if (previewEl) previewEl.style.display = 'none';
            return;
        }

        const handleMouseMove = (e: MouseEvent) => {
            const canvasEl = fabricCanvasRef.current?.getElement();
            if (!canvasEl) return;

            const containerRect = container.getBoundingClientRect();
            const canvasRect = canvasEl.getBoundingClientRect();
            
            const x = e.clientX;
            const y = e.clientY;

            // Check if cursor is within the canvas element's bounds
            if (x >= canvasRect.left && x <= canvasRect.right && y >= canvasRect.top && y <= canvasRect.bottom) {
                previewEl.style.display = 'block';
                previewEl.style.left = `${x - containerRect.left}px`;
                previewEl.style.top = `${y - containerRect.top}px`;
                previewEl.style.width = `${brushSize}px`;
                previewEl.style.height = `${brushSize}px`;
                previewEl.style.backgroundColor = strokeColor;
                previewEl.style.transform = 'translate(-50%, -50%)';
            } else {
                previewEl.style.display = 'none';
            }
        };

        const handleMouseLeave = () => {
            previewEl.style.display = 'none';
        };
        
        previewEl.style.borderRadius = '50%';
        previewEl.style.pointerEvents = 'none';
        previewEl.style.position = 'absolute';
        previewEl.style.opacity = '0.3';
        previewEl.style.border = '1px solid rgba(255, 255, 255, 0.5)';

        container.addEventListener('mousemove', handleMouseMove);
        container.addEventListener('mouseleave', handleMouseLeave);

        return () => {
            container.removeEventListener('mousemove', handleMouseMove);
            container.removeEventListener('mouseleave', handleMouseLeave);
        };
    }, [tool, brushSize, strokeColor]);


    // Shape drawing logic
    useEffect(() => {
        const canvas = fabricCanvasRef.current;
        if (!canvas || tool === 'brush') return;

        const handleMouseDown = (opt: any) => {
            isDrawingRef.current = true;
            const pointer = canvas.getPointer(opt.e);
            startPointRef.current = { x: pointer.x, y: pointer.y };

            let shape;
            const commonProps = {
                left: startPointRef.current.x,
                top: startPointRef.current.y,
                originX: 'left',
                originY: 'top',
                stroke: strokeColor,
                strokeWidth: brushSize,
                fill: fillColor,
                selectable: false,
                evented: false,
            };

            switch(tool) {
                case 'rectangle':
                    shape = new fabric.Rect({ ...commonProps, width: 0, height: 0 });
                    break;
                case 'circle':
                    shape = new fabric.Ellipse({ ...commonProps, rx: 0, ry: 0 });
                    break;
                case 'arrow':
                    // Arrow is a group of a line and a triangle
                    const line = new fabric.Line([pointer.x, pointer.y, pointer.x, pointer.y], {
                        stroke: strokeColor,
                        strokeWidth: brushSize,
                    });
                    const head = new fabric.Triangle({
                        left: pointer.x,
                        top: pointer.y,
                        originX: 'center',
                        originY: 'center',
                        selectable: false,
                        evented: false,
                        angle: -90,
                        width: brushSize * 3,
                        height: brushSize * 3,
                        fill: strokeColor,
                    });
                    shape = new fabric.Group([line, head], {
                        selectable: false,
                        evented: false,
                    });
                    break;
            }
            if (shape) {
                currentShapeRef.current = shape;
                canvas.add(shape);
            }
        };

        const handleMouseMove = (opt: any) => {
            if (!isDrawingRef.current || !currentShapeRef.current || !startPointRef.current) return;
            const pointer = canvas.getPointer(opt.e);
            const shape = currentShapeRef.current;
            const start = startPointRef.current;
            
            if (tool === 'rectangle') {
                shape.set({
                    width: Math.abs(pointer.x - start.x),
                    height: Math.abs(pointer.y - start.y),
                    originX: pointer.x < start.x ? 'right' : 'left',
                    originY: pointer.y < start.y ? 'bottom' : 'top',
                });
            } else if (tool === 'circle') {
                shape.set({
                    rx: Math.abs(pointer.x - start.x) / 2,
                    ry: Math.abs(pointer.y - start.y) / 2,
                    originX: 'center',
                    originY: 'center',
                    left: start.x + (pointer.x - start.x) / 2,
                    top: start.y + (pointer.y - start.y) / 2,
                });
            } else if (tool === 'arrow') {
                 const line = shape.item(0);
                 const head = shape.item(1);
                 line.set({ x2: pointer.x, y2: pointer.y });
                 
                 const angle = Math.atan2(pointer.y - start.y, pointer.x - start.x) * 180 / Math.PI;
                 head.set({ left: pointer.x, top: pointer.y, angle: angle + 90 });
            }
            canvas.renderAll();
        };

        const handleMouseUp = () => {
            isDrawingRef.current = false;
            if (currentShapeRef.current) {
                currentShapeRef.current.setCoords();
            }
            currentShapeRef.current = null;
            startPointRef.current = null;
            saveState();
        };

        canvas.on('mouse:down', handleMouseDown);
        canvas.on('mouse:move', handleMouseMove);
        canvas.on('mouse:up', handleMouseUp);
        // Also listen to path:created for free drawing
        canvas.on('path:created', saveState);

        return () => {
            canvas.off('mouse:down', handleMouseDown);
            canvas.off('mouse:move', handleMouseMove);
            canvas.off('mouse:up', handleMouseUp);
            canvas.off('path:created', saveState);
        };
    }, [tool, strokeColor, fillColor, brushSize, saveState]);
    

    useImperativeHandle(ref, () => ({
        exportImage: () => {
            return fabricCanvasRef.current?.toDataURL({ format: 'png' }) || '';
        },
        clear: () => {
            const canvas = fabricCanvasRef.current;
            if (canvas) {
                canvas.clear();
                // Re-apply background after clearing
                updateCanvasView();
                saveState();
            }
        },
        undo: () => {
            const canvas = fabricCanvasRef.current;
            if (canvas && historyRef.current.length > 1) {
                historyRef.current.pop(); // remove current state
                const lastState = historyRef.current[historyRef.current.length - 1];
                canvas.loadFromJSON(lastState, () => {
                    // Ensure view is updated correctly after loading state
                    updateCanvasView();
                });
            }
        }
    }));

    return (
      <div className="w-full h-full flex items-center justify-center relative overflow-hidden" ref={containerRef}>
        <canvas ref={canvasRef} />
        <div ref={previewCursorRef} style={{ display: 'none' }} />
        {isPreviewingBrushSize && (
            <div 
                className="absolute rounded-full pointer-events-none transition-all duration-75"
                style={{
                    width: `${brushSize}px`,
                    height: `${brushSize}px`,
                    backgroundColor: strokeColor,
                    border: tool !== 'brush' && brushSize > 0 ? `1px solid rgba(255, 255, 255, 0.5)` : 'none',
                    opacity: 0.5,
                }}
            />
        )}
      </div>
    );
  }
);

DrawingCanvas.displayName = 'DrawingCanvas';