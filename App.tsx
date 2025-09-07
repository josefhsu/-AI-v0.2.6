
import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ResultPanel } from './components/ResultPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { DrawingCanvas } from './components/DrawingCanvas';
import { Lightbox } from './components/Lightbox';

import {
  generateImagesWithGemini,
  removeBackground,
  optimizePromptWithGemini,
  upscaleImageWithGemini,
  analyzeImageAesthetics,
  fileToGenerativePart,
  // FIX: Import getInspiration function
  getInspiration,
} from './services/geminiService';

import {
  AppMode,
  UploadedImage,
  GeneratedImage,
  HistoryItem,
  AspectRatio,
  DrawTool,
  LightboxConfig,
  Toast,
  DrawingCanvasRef,
} from './types';
// FIX: Import getMimeTypeFromDataUrl utility
import { dataURLtoFile, createPlaceholderImage, getImageDimensions, getFileSizeFromBase64, getMimeTypeFromDataUrl } from './utils';
import { FUNCTION_BUTTONS } from './constants';

const ToastComponent: React.FC<{ toast: Toast; onRemove: (id: string) => void }> = ({ toast, onRemove }) => {
    useEffect(() => {
        const timer = setTimeout(() => {
            onRemove(toast.id);
        }, 5000);
        return () => clearTimeout(timer);
    }, [toast, onRemove]);

    const baseClasses = 'px-4 py-2 rounded-lg shadow-lg text-sm font-semibold transition-all duration-300 transform';
    const typeClasses = {
        success: 'bg-green-600/80 backdrop-blur-sm text-white',
        error: 'bg-red-600/80 backdrop-blur-sm text-white',
        info: 'bg-blue-600/80 backdrop-blur-sm text-white',
    };

    return (
        <div className={`${baseClasses} ${typeClasses[toast.type]}`}>
            {toast.message}
        </div>
    );
};

const ToastContainer: React.FC<{ toasts: Toast[]; onRemove: (id: string) => void }> = ({ toasts, onRemove }) => {
    return (
        <div className="fixed top-4 right-4 z-[100] space-y-2">
            {toasts.map(toast => (
                <ToastComponent key={toast.id} toast={toast} onRemove={onRemove} />
            ))}
        </div>
    );
};


const App: React.FC = () => {
    const [appMode, setAppMode] = useState<AppMode>('GENERATE');
    const [isControlPanelOpen, setIsControlPanelOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const [modifierKey, setModifierKey] = useState<'Ctrl' | '⌘'>('Ctrl');

    const [isLoading, setIsLoading] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');
    const [referenceImages, setReferenceImages] = useState<UploadedImage[]>([]);
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('1:1');

    const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
    const [addGreenScreen, setAddGreenScreen] = useState(true);

    const drawingCanvasRef = useRef<DrawingCanvasRef>(null);
    const [drawTool, setDrawTool] = useState<DrawTool>('brush');
    const [brushSize, setBrushSize] = useState(10);
    const [fillColor, setFillColor] = useState('transparent');
    const [strokeColor, setStrokeColor] = useState('#FFFFFF');
    const [canvasBackgroundColor, setCanvasBackgroundColor] = useState('#808080');
    const [drawAspectRatio, setDrawAspectRatio] = useState<AspectRatio>('1:1');
    const [drawBackground, setDrawBackground] = useState<string | null>(null);
    const [isPreviewingBrushSize, setIsPreviewingBrushSize] = useState(false);
    const brushPreviewTimerRef = useRef<number | null>(null);

    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    
    const [lightboxConfig, setLightboxConfig] = useState<LightboxConfig>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);

    const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        const id = crypto.randomUUID();
        setToasts(prev => [...prev, { id, message, type }]);
    }, []);

    const removeToast = useCallback((id: string) => {
        setToasts(prev => prev.filter(t => t.id !== id));
    }, []);

    const addToHistory = useCallback(async (images: Omit<GeneratedImage, 'width' | 'height' | 'size'>[]) => {
        const newHistoryItems: HistoryItem[] = [];
        for (const image of images) {
            try {
                const { width, height } = await getImageDimensions(image.src);
                const size = getFileSizeFromBase64(image.src);
                const fullImage: GeneratedImage = { ...image, width, height, size };
                newHistoryItems.push(fullImage);
            } catch (e) {
                console.error("Could not get image dimensions for history", e);
                newHistoryItems.push({ ...image, width: 0, height: 0, size: 0 });
            }
        }

        setHistory(prev => {
            const updatedHistory = [...newHistoryItems, ...prev].slice(0, 50);
            localStorage.setItem('generationHistory', JSON.stringify(updatedHistory));
            return updatedHistory;
        });
    }, []);

    const handleGenerate = useCallback(async (overrideParams?: { prompt?: string, referenceImages?: UploadedImage[] }) => {
        const currentPrompt = overrideParams?.prompt ?? prompt;
        const currentRefImages = overrideParams?.referenceImages ?? referenceImages;

        if (!currentPrompt && currentRefImages.length === 0) {
            addToast("請輸入提示詞或上傳參考圖", 'error');
            return;
        }

        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        if (appMode !== 'HISTORY') setAppMode('GENERATE');

        try {
            const imageParts = await Promise.all(currentRefImages.map(img => fileToGenerativePart(img.file)));
            const resultBase64s = await generateImagesWithGemini(currentPrompt, imageParts, selectedAspectRatio);
            
            const newImages: GeneratedImage[] = resultBase64s.map(base64 => ({
                id: crypto.randomUUID(),
                src: `data:image/png;base64,${base64}`,
                alt: currentPrompt,
                prompt: currentPrompt
            }));
            
            setGeneratedImages(newImages);
            addToHistory(newImages);

        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : '發生未知錯誤';
            setError(errorMessage);
            addToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, referenceImages, selectedAspectRatio, appMode, addToast, addToHistory]);
    
    const handleGeneratePanelAspectRatioChange = useCallback((ratio: AspectRatio) => {
        setSelectedAspectRatio(ratio);
        setDrawAspectRatio(ratio);

        const placeholderUrl = createPlaceholderImage(ratio, '#808080');
        const placeholderFile = dataURLtoFile(placeholderUrl, `placeholder-${ratio}.png`);
        const placeholderImage: UploadedImage = {
            src: placeholderUrl,
            file: placeholderFile,
            isPlaceholder: true
        };

        setReferenceImages(prev => {
            const otherImages = prev.filter(img => !img.isPlaceholder);
            return [placeholderImage, ...otherImages].slice(0, 8);
        });

        const outpaintingPrompt = FUNCTION_BUTTONS.find(b => b.label === '比例參考圖')?.prompt || '';
        if (!prompt.includes(outpaintingPrompt)) {
            setPrompt(prev => prev ? `${prev}, ${outpaintingPrompt}` : outpaintingPrompt);
        }
    }, [prompt]);

    const handleRemoveBackground = useCallback(async () => {
        if (!uploadedImage) {
            addToast('請先上傳圖片', 'error');
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        try {
            const base64 = uploadedImage.src.split(',')[1];
            const mimeType = uploadedImage.file.type;
            const result = await removeBackground(base64, mimeType, addGreenScreen);

            if (!result.image) {
                throw new Error(result.text || "Background removal failed: no image returned.");
            }

            const newImage: GeneratedImage = {
                id: crypto.randomUUID(),
                src: `data:${mimeType};base64,${result.image}`,
                alt: `${prompt || 'Remove background'}, green screen: ${addGreenScreen}`,
                prompt: prompt
            };
            setGeneratedImages([newImage]);
            addToHistory([newImage]);
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : '發生未知錯誤';
            setError(errorMessage);
            addToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [uploadedImage, addGreenScreen, prompt, addToast, addToHistory]);

    const handleOptimizePrompt = useCallback(async () => {
        if (!prompt) {
            addToast('請先輸入提示詞', 'error');
            return;
        }
        setIsOptimizing(true);
        try {
            const optimized = await optimizePromptWithGemini(prompt);
            setPrompt(optimized);
            addToast('提示詞已優化', 'success');
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : '優化失敗';
            addToast(errorMessage, 'error');
        } finally {
            setIsOptimizing(false);
        }
    }, [prompt, addToast]);

    const handleInspirePrompt = useCallback(async () => {
        setIsOptimizing(true);
        try {
            const inspiration = await getInspiration();
            setPrompt(prev => prev ? `${prev}, ${inspiration}` : inspiration);
            addToast('靈感提示已生成！');
        } catch (e) {
             const errorMessage = e instanceof Error ? e.message : '獲取靈感失敗';
            addToast(errorMessage, 'error');
        } finally {
            setIsOptimizing(false);
        }
    }, [addToast]);
    
    const handleClearSettings = useCallback(() => {
        setPrompt('');
        setReferenceImages([]);
        setUploadedImage(null);
        addToast('設定已清除');
    }, [addToast]);

    const handleBrushSizeChange = useCallback((size: number) => {
        setBrushSize(size);
        setIsPreviewingBrushSize(true);
        if (brushPreviewTimerRef.current) {
            clearTimeout(brushPreviewTimerRef.current);
        }
        brushPreviewTimerRef.current = window.setTimeout(() => {
            setIsPreviewingBrushSize(false);
            brushPreviewTimerRef.current = null;
        }, 2000);
    }, []);
    
    const handleUpscale = useCallback(async (src: string) => {
        setIsLoading(true);
        setError(null);
        addToast("正在提升畫質...", 'info');
        if (lightboxConfig) setLightboxConfig(null);
        try {
            const mimeType = getMimeTypeFromDataUrl(src);
            const base64 = src.split(',')[1];
            const upscaledBase64 = await upscaleImageWithGemini(base64, mimeType);
            const newImage: GeneratedImage = {
                id: crypto.randomUUID(),
                src: `data:${mimeType};base64,${upscaledBase64}`,
                alt: 'Upscaled image',
                prompt: 'Upscaled image'
            };
            setGeneratedImages(prev => [newImage, ...prev]);
            addToHistory([newImage]);
            addToast("畫質提升完成！", 'success');
        } catch (e) {
            const errorMessage = e instanceof Error ? e.message : '提升畫質失敗';
            setError(errorMessage);
            addToast(errorMessage, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast, addToHistory, lightboxConfig]);

    const handleZoomOut = useCallback(async (item: GeneratedImage) => {
        addToast("正在擴展圖片 (Zoom Out)...", 'info');
        if (lightboxConfig) setLightboxConfig(null);
        const file = dataURLtoFile(item.src, 'zoom-out-source.png');
        const image: UploadedImage = { src: item.src, file };
        await handleGenerate({ 
            prompt: "zoom out 2x, outpainting",
            referenceImages: [image]
        });
    }, [addToast, handleGenerate, lightboxConfig]);

    const handleUseDrawing = useCallback(() => {
        if (drawingCanvasRef.current) {
            const dataUrl = drawingCanvasRef.current.exportImage();
            const file = dataURLtoFile(dataUrl, `drawing-${Date.now()}.png`);
            const drawingImage = { src: dataUrl, file };
            setReferenceImages(prev => [drawingImage, ...prev.filter(img => !img.isPlaceholder)].slice(0, 8));
            setAppMode('GENERATE');
            addToast('畫布已作為參考圖', 'success');
        }
    }, [addToast]);

    const handleDrawBackgroundUpload = useCallback(async (file: File) => {
        const reader = new FileReader();
        reader.onload = e => setDrawBackground(e.target?.result as string);
        reader.readAsDataURL(file);
    }, []);

    const handleDeleteHistoryItem = useCallback((id: string) => {
        setHistory(prev => {
            const newHistory = prev.filter(item => item.id !== id);
            localStorage.setItem('generationHistory', JSON.stringify(newHistory));
            if (selectedHistoryItem?.id === id) {
                setSelectedHistoryItem(null);
            }
            return newHistory;
        });
        addToast('已刪除一筆歷史紀錄');
    }, [addToast, selectedHistoryItem, setHistory, setSelectedHistoryItem]);

    const handleClearHistory = useCallback(() => {
        setHistory([]);
        localStorage.removeItem('generationHistory');
        setSelectedHistoryItem(null);
        addToast('所有歷史紀錄已清除');
    }, [addToast, setHistory, setSelectedHistoryItem]);

    const handleUseGeneratedImage = useCallback((image: GeneratedImage, action: 'reference' | 'remove_bg' | 'draw_bg') => {
        const file = dataURLtoFile(image.src, 'generated-image.png');
        const uploaded: UploadedImage = { src: image.src, file };

        switch(action) {
            case 'reference':
                setPrompt(image.prompt || image.alt);
                setReferenceImages([uploaded]);
                setAppMode('GENERATE');
                addToast('已設為參考圖');
                break;
            case 'remove_bg':
                setUploadedImage(uploaded);
                setAppMode('REMOVE_BG');
                break;
            case 'draw_bg':
                setDrawBackground(image.src);
                setAppMode('DRAW');
                break;
        }
        if (lightboxConfig) setLightboxConfig(null);
    }, [addToast, lightboxConfig]);
    
    const analyzeSelectedItem = useCallback(async (item: HistoryItem) => {
        if (item.analysis) {
             setSelectedHistoryItem(item);
             return;
        }
        setIsAnalyzing(true);
        setAnalysisError(null);
        setSelectedHistoryItem(item);

        try {
            const file = dataURLtoFile(item.src, 'image.png');
            const imagePart = await fileToGenerativePart(file);
            const analysisResult = await analyzeImageAesthetics(imagePart);
            setHistory(prev => {
                const newHistory = prev.map(h => h.id === item.id ? { ...h, analysis: analysisResult } : h);
                localStorage.setItem('generationHistory', JSON.stringify(newHistory));
                if (selectedHistoryItem?.id === item.id) {
                     setSelectedHistoryItem(newHistory.find(h => h.id === item.id) || null);
                }
                return newHistory;
            });

        } catch (e) {
            const msg = e instanceof Error ? e.message : '分析失敗';
            setAnalysisError(msg);
            addToast(msg, 'error');
        } finally {
            setIsAnalyzing(false);
        }
    }, [addToast, selectedHistoryItem]);
    
    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('generationHistory');
            if (savedHistory) {
                setHistory(JSON.parse(savedHistory));
            }
        } catch (e) {
            console.error("Failed to load history from localStorage", e);
            localStorage.removeItem('generationHistory');
        }

        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        
        setModifierKey(navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl');

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            const items = event.clipboardData?.items;
            if (!items) return;

            for (let i = 0; i < items.length; i++) {
                if (items[i].type.indexOf('image') !== -1) {
                    const file = items[i].getAsFile();
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const src = e.target?.result as string;
                            const newImage = { src, file };
                             if (appMode === 'REMOVE_BG') {
                                setUploadedImage(newImage);
                            } else {
                                setReferenceImages(prev => [newImage, ...prev.filter(img => !img.isPlaceholder)].slice(0, 8));
                            }
                            addToast('圖片已從剪貼簿貼上', 'success');
                        };
                        reader.readAsDataURL(file);
                    }
                    event.preventDefault();
                    break;
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [appMode, addToast]);

    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const target = e.target as HTMLElement;
            const isTyping = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA';

            const isMac = modifierKey === '⌘';
            const ctrlOrCmd = isMac ? e.metaKey : e.ctrlKey;

            if (ctrlOrCmd && e.key === 'Enter') {
                e.preventDefault();
                if (appMode === 'GENERATE' || appMode === 'CHARACTER_CREATOR') handleGenerate();
                else if (appMode === 'REMOVE_BG') handleRemoveBackground();
                else if (appMode === 'DRAW') handleUseDrawing();
                return;
            }
            
            if (isTyping) return;

            if (ctrlOrCmd && e.key === 'o') { e.preventDefault(); handleOptimizePrompt(); } 
            else if (ctrlOrCmd && e.key === 'i') { e.preventDefault(); handleInspirePrompt(); } 
            else if (ctrlOrCmd && e.key === 'Backspace') {
                e.preventDefault();
                if (appMode === 'DRAW') drawingCanvasRef.current?.clear();
                else handleClearSettings();
            } else if (ctrlOrCmd && e.altKey && e.key >= '1' && e.key <= '5') {
                 e.preventDefault();
                 const modes: AppMode[] = ['GENERATE', 'CHARACTER_CREATOR', 'REMOVE_BG', 'DRAW', 'HISTORY'];
                 setAppMode(modes[parseInt(e.key, 10) - 1]);
            } else if (appMode === 'DRAW') {
                if (e.key === '[') { e.preventDefault(); handleBrushSizeChange(Math.max(1, brushSize - 1)); }
                else if (e.key === ']') { e.preventDefault(); handleBrushSizeChange(Math.min(100, brushSize + 1)); }
                else if (e.key.toLowerCase() === 'b') { e.preventDefault(); setDrawTool('brush'); }
                else if (e.key.toLowerCase() === 'r') { e.preventDefault(); setDrawTool('rectangle'); }
                else if (e.key.toLowerCase() === 'c') { e.preventDefault(); setDrawTool('circle'); }
                else if (e.key.toLowerCase() === 'a') { e.preventDefault(); setDrawTool('arrow'); }
                else if (ctrlOrCmd && e.key.toLowerCase() === 'z') { e.preventDefault(); drawingCanvasRef.current?.undo(); }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [appMode, modifierKey, handleGenerate, handleRemoveBackground, handleUseDrawing, handleOptimizePrompt, handleInspirePrompt, handleClearSettings, brushSize, handleBrushSizeChange]);


    const renderMainPanel = () => {
        switch (appMode) {
            case 'GENERATE':
            case 'CHARACTER_CREATOR':
            case 'REMOVE_BG':
                return (
                     <ResultPanel
                        images={generatedImages}
                        isLoading={isLoading}
                        error={error}
                        onPromptSelect={setPrompt}
                        onUpscale={handleUpscale}
                        onZoomOut={handleZoomOut}
                        onSetLightboxConfig={(images, startIndex) => setLightboxConfig({ images, startIndex })}
                        onUseImage={handleUseGeneratedImage}
                     />
                );
            case 'DRAW':
                return (
                    <main className="flex-1 flex flex-col p-4 bg-black min-w-0">
                        <DrawingCanvas 
                            ref={drawingCanvasRef}
                            tool={drawTool}
                            brushSize={brushSize}
                            fillColor={fillColor}
                            strokeColor={strokeColor}
                            backgroundColor={canvasBackgroundColor}
                            aspectRatio={drawAspectRatio}
                            backgroundImage={drawBackground}
                            isPreviewingBrushSize={isPreviewingBrushSize}
                        />
                    </main>
                );
            case 'HISTORY':
                return (
                    <HistoryPanel
                        history={history}
                        selectedItem={selectedHistoryItem}
                        onSelectItem={analyzeSelectedItem}
                        isAnalyzing={isAnalyzing}
                        analysisError={analysisError}
                        onDeleteHistoryItem={handleDeleteHistoryItem}
                        onClearHistory={handleClearHistory}
                        onSetLightboxConfig={(images, startIndex) => setLightboxConfig({ images, startIndex })}
                        addToast={addToast}
                        onUseHistoryItem={(item) => handleUseGeneratedImage(item, 'reference')}
                        onUseImage={(src, mode) => {
                             const item = history.find(h => h.src === src);
                             if (item) handleUseGeneratedImage(item, mode === 'REMOVE_BG' ? 'remove_bg' : 'draw_bg');
                        }}
                        onUpscale={handleUpscale}
                        onZoomOut={(src) => {
                             const item = history.find(h => h.src === src);
                             if (item) handleZoomOut(item);
                        }}
                    />
                );
            default:
                return null;
        }
    }

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden antialiased">
            <ControlPanel
                appMode={appMode}
                setAppMode={setAppMode}
                onGenerate={handleGenerate}
                onRemoveBackground={handleRemoveBackground}
                isLoading={isLoading}
                uploadedImage={uploadedImage}
                setUploadedImage={setUploadedImage}
                referenceImages={referenceImages}
                setReferenceImages={setReferenceImages}
                onRemoveReferenceImage={(index) => setReferenceImages(prev => prev.filter((_, i) => i !== index))}
                prompt={prompt}
                setPrompt={setPrompt}
                selectedAspectRatio={selectedAspectRatio}
                onAspectRatioSelect={handleGeneratePanelAspectRatioChange}
                isOptimizing={isOptimizing}
                onOptimizePrompt={handleOptimizePrompt}
                onInspirePrompt={handleInspirePrompt}
                onClearSettings={handleClearSettings}
                addGreenScreen={addGreenScreen}
                setAddGreenScreen={setAddGreenScreen}
                drawTool={drawTool}
                setDrawTool={setDrawTool}
                brushSize={brushSize}
                onBrushSizeChange={handleBrushSizeChange}
                fillColor={fillColor}
                setFillColor={setFillColor}
                strokeColor={strokeColor}
                setStrokeColor={setStrokeColor}
                drawAspectRatio={drawAspectRatio}
                setDrawAspectRatio={setDrawAspectRatio}
                canvasBackgroundColor={canvasBackgroundColor}
                setCanvasBackgroundColor={setCanvasBackgroundColor}
                onClearCanvas={() => drawingCanvasRef.current?.clear()}
                onUndoCanvas={() => drawingCanvasRef.current?.undo()}
                onUseDrawing={handleUseDrawing}
                onDrawBackgroundUpload={handleDrawBackgroundUpload}
                isControlPanelOpen={isControlPanelOpen}
                setIsControlPanelOpen={setIsControlPanelOpen}
                isMobile={isMobile}
                modifierKey={modifierKey}
            />
            {renderMainPanel()}
            {lightboxConfig && <Lightbox 
                config={lightboxConfig} 
                onClose={() => setLightboxConfig(null)} 
                onUpscale={handleUpscale}
                onZoomOut={handleZoomOut}
                onUseImage={handleUseGeneratedImage}
            />}
            <ToastContainer toasts={toasts} onRemove={removeToast} />
        </div>
    );
};

export default App;
