import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ResultPanel } from './components/ResultPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { DrawingCanvas } from './components/DrawingCanvas';
import { Lightbox } from './components/Lightbox';
import {
    AppMode, GeneratedImage, UploadedImage, AspectRatio,
    DrawTool, HistoryItem, LightboxConfig, Toast, DrawingCanvasRef
} from './types';
import { generateImagesWithGemini, removeBackground, optimizePromptWithGemini, upscaleImageWithGemini, fileToGenerativePart, analyzeImageAesthetics } from './services/geminiService';
import { dataURLtoFile, getImageDimensions, getFileSizeFromBase64, fileToBase64, createPlaceholderImage } from './utils';
import { SUBJECTS, BACKGROUNDS, ACTIONS_POSES, EMOTIONS, CLOTHING, DETAILS_OBJECTS, ART_STYLES, LIGHTING, COMPOSITIONS, TONES_TEXTURES, FUNCTION_BUTTONS } from './constants';

const App: React.FC = () => {
    // Main State
    const [appMode, setAppMode] = useState<AppMode>('GENERATE');
    const [images, setImages] = useState<GeneratedImage[]>([]);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [lightboxConfig, setLightboxConfig] = useState<LightboxConfig>(null);
    const [isControlPanelOpen, setIsControlPanelOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const modifierKey = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl';

    // Toast Notifications
    const [toasts, setToasts] = useState<Toast[]>([]);
    const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        const id = Date.now().toString();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, []);

    // Form State
    const [prompt, setPrompt] = useState('');
    const [numImages, setNumImages] = useState(1);
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('1:1');
    const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
    const [referenceImages, setReferenceImages] = useState<UploadedImage[]>([]);
    const [addGreenScreen, setAddGreenScreen] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    
    // Drawing Canvas State
    const drawCanvasRef = useRef<DrawingCanvasRef>(null);
    const [drawTool, setDrawTool] = useState<DrawTool>('brush');
    const [brushSize, setBrushSize] = useState(10);
    const [fillColor, setFillColor] = useState('#ffffff');
    const [strokeColor, setStrokeColor] = useState('#000000');
    const [drawAspectRatio, setDrawAspectRatio] = useState<AspectRatio>('1:1');
    const [canvasBackgroundColor, setCanvasBackgroundColor] = useState('#808080');
    const [drawBackground, setDrawBackground] = useState<string | null>(null);
    const [isPreviewingBrushSize, setIsPreviewingBrushSize] = useState(false);

    // Load history from localStorage
    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('b2n3a2-history');
            if (savedHistory) {
                setHistory(JSON.parse(savedHistory));
            }
        } catch (e) {
            console.error("Failed to load history from localStorage", e);
        }
        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Save history to localStorage
    useEffect(() => {
        try {
            localStorage.setItem('b2n3a2-history', JSON.stringify(history));
        } catch (e) {
            console.error("Failed to save history to localStorage", e);
        }
    }, [history]);

    const addImageToHistory = async (imageDataUrl: string, prompt: string) => {
        try {
            const { width, height } = await getImageDimensions(imageDataUrl);
            const size = getFileSizeFromBase64(imageDataUrl);
            const newItem: HistoryItem = {
                id: `hist-${Date.now()}`,
                src: imageDataUrl,
                alt: prompt,
                width,
                height,
                size,
                analysis: null,
            };
            setHistory(prev => [newItem, ...prev]);
            return newItem;
        } catch (error) {
            console.error("Error adding image to history:", error);
            return null;
        }
    };
    
    // -- API Handlers --
    const handleGenerate = useCallback(async (baseImage?: { dataUrl: string, prompt: string }) => {
        const currentPrompt = baseImage ? baseImage.prompt : prompt;
        if (!currentPrompt && referenceImages.length === 0 && !baseImage) {
            addToast('請輸入提示詞', 'error');
            return;
        }

        setIsLoading(true);
        setError(null);
        setAppMode('GENERATE');
        setIsControlPanelOpen(isMobile ? false : true);

        try {
            const imageParts = await Promise.all(referenceImages.map(img => fileToGenerativePart(img.file)));
            if (baseImage) {
                const baseFile = dataURLtoFile(baseImage.dataUrl, 'base-image.png');
                imageParts.unshift(await fileToGenerativePart(baseFile));
            }

            const results = await generateImagesWithGemini(currentPrompt, numImages, selectedAspectRatio, imageParts);
            
            const newImages: GeneratedImage[] = [];
            for (const base64 of results) {
                const src = `data:image/png;base64,${base64}`;
                const { width, height } = await getImageDimensions(src);
                const size = getFileSizeFromBase64(src);
                newImages.push({ id: `gen-${Date.now()}-${Math.random()}`, src, alt: currentPrompt, width, height, size });
                addImageToHistory(src, currentPrompt);
            }
            setImages(newImages);

        } catch (err: any) {
            setError(err.message || '發生未知錯誤');
            addToast(err.message || '發生未知錯誤', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, numImages, selectedAspectRatio, referenceImages, addToast, isMobile]);

    const handleRemoveBackground = useCallback(async () => {
        if (!uploadedImage) {
            addToast('請先上傳圖片', 'error');
            return;
        }
        setIsLoading(true);
        setError(null);
        try {
            const base64 = await fileToBase64(uploadedImage.file);
            const mimeType = uploadedImage.file.type;
            const result = await removeBackground(base64, mimeType, addGreenScreen);

            if (result.image) {
                const src = `data:image/png;base64,${result.image}`;
                const { width, height } = await getImageDimensions(src);
                const size = getFileSizeFromBase64(src);
                const newImage: GeneratedImage = { id: `rembg-${Date.now()}`, src, alt: `Background removed from ${uploadedImage.file.name}`, width, height, size };
                setImages([newImage]);
                addImageToHistory(src, `Removed background from original image. Green screen: ${addGreenScreen}`);
            } else {
                throw new Error(result.text || "模型未返回圖片，請稍後再試。");
            }
        } catch (err: any) {
            setError(err.message || '移除背景失敗');
            addToast(err.message || '移除背景失敗', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [uploadedImage, addGreenScreen, addToast]);

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
        } catch (err: any) {
            addToast(err.message || '優化失敗', 'error');
        } finally {
            setIsOptimizing(false);
        }
    }, [prompt, addToast]);

    const handleUpscale = useCallback(async (src: string) => {
        setIsLoading(true);
        setError(null);
        addToast('正在提升畫質...', 'info');
        setLightboxConfig(null);
        try {
            const base64 = src.split(',')[1];
            const mimeType = src.match(/data:(.*?);/)?.[1] || 'image/png';
            const upscaledBase64 = await upscaleImageWithGemini(base64, mimeType);
            const newSrc = `data:image/png;base64,${upscaledBase64}`;
            const { width, height } = await getImageDimensions(newSrc);
            const size = getFileSizeFromBase64(newSrc);
            const newImage: GeneratedImage = { id: `upscaled-${Date.now()}`, src: newSrc, alt: `Upscaled image`, width, height, size };
            setImages([newImage]);
            setAppMode('GENERATE');
            addImageToHistory(newSrc, 'Upscaled image');
            addToast('畫質提升成功！', 'success');
        } catch (err: any) {
            setError(err.message || '提升畫質失敗');
            addToast(err.message || '提升畫質失敗', 'error');
        } finally {
            setIsLoading(false);
        }
    }, [addToast]);

    const handleZoomOut = useCallback(async (src: string) => {
        addToast('Zoom Out 功能即將推出！', 'info');
        // Placeholder for future implementation
        console.log("Zoom out requested for:", src);
    }, [addToast]);
    
    // -- UI Handlers --
    const handleClearSettings = () => {
        setPrompt('');
        setReferenceImages([]);
        setUploadedImage(null);
    };

    const handleInspirePrompt = () => {
        const randomItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
        const newPrompt = [
            randomItem(SUBJECTS),
            randomItem(ACTIONS_POSES),
            'in', randomItem(BACKGROUNDS),
            'wearing', randomItem(CLOTHING),
            'with', randomItem(DETAILS_OBJECTS),
            'emotion of', randomItem(EMOTIONS),
            'style of', randomItem(ART_STYLES),
            'lighting of', randomItem(LIGHTING),
            'composition of', randomItem(COMPOSITIONS),
            'tone of', randomItem(TONES_TEXTURES),
        ].join(', ');
        setPrompt(newPrompt);
    };

    const handleUseDrawing = () => {
        if (!drawCanvasRef.current) return;
        const dataUrl = drawCanvasRef.current.exportImage();
        handleGenerate({ dataUrl, prompt });
    };

    const handleDrawBackgroundUpload = async (file: File) => {
        const reader = new FileReader();
        reader.onload = (e) => {
            setDrawBackground(e.target?.result as string);
            addToast('畫布背景已設定', 'success');
        };
        reader.readAsDataURL(file);
    };

    const handleGeneratePanelAspectRatioChange = useCallback((newRatio: AspectRatio) => {
        setSelectedAspectRatio(newRatio);
        setDrawAspectRatio(newRatio);

        const placeholderSrc = createPlaceholderImage(newRatio, '#808080');
        const placeholderFile = dataURLtoFile(placeholderSrc, `placeholder-${newRatio}.png`);
        const newReferenceImage: UploadedImage = { src: placeholderSrc, file: placeholderFile };
        
        setReferenceImages(prev => [newReferenceImage, ...prev].slice(0, 8));

        const outpaintingPrompt = FUNCTION_BUTTONS.find(b => b.label === '比例參考圖')?.prompt || '';
        if (outpaintingPrompt) {
            setPrompt(prev => prev.trim() ? `${prev.trim()}, ${outpaintingPrompt}` : outpaintingPrompt);
        }
        
        addToast(`已建立 ${newRatio} 參考背景`, 'success');
    }, [addToast]);
    
    // History Panel handlers
    const handleSelectHistoryItem = useCallback(async (item: HistoryItem) => {
        setSelectedHistoryItem(item);
        if (!item.analysis) {
            setIsAnalyzing(true);
            setAnalysisError(null);
            try {
                const file = dataURLtoFile(item.src, 'history-image.png');
                const imagePart = await fileToGenerativePart(file);
                const analysisResult = await analyzeImageAesthetics(imagePart);
                const updatedItem = { ...item, analysis: analysisResult };
                setHistory(prev => prev.map(h => h.id === item.id ? updatedItem : h));
                setSelectedHistoryItem(updatedItem);
            } catch (err: any) {
                setAnalysisError(err.message || "分析失敗");
            } finally {
                setIsAnalyzing(false);
            }
        }
    }, []);

    const handleUseHistoryItem = (item: HistoryItem) => {
        setReferenceImages(prev => [...prev, { src: item.src, file: dataURLtoFile(item.src, `history-ref-${item.id}.png`) }].slice(0, 8));
        setAppMode('GENERATE');
        addToast('圖片已加入參考圖', 'success');
    };
    
    const handleDeleteHistoryItem = (id: string) => {
        setHistory(prev => prev.filter(h => h.id !== id));
        if (selectedHistoryItem?.id === id) {
            setSelectedHistoryItem(null);
        }
        addToast('紀錄已刪除', 'success');
    };

    const handleClearHistory = () => {
        if (window.confirm('確定要清除所有歷史紀錄嗎？此操作無法復原。')) {
            setHistory([]);
            setSelectedHistoryItem(null);
            addToast('所有歷史紀錄已清除', 'success');
        }
    };
    
    const handleUseImage = (src: string, targetMode: AppMode) => {
        const file = dataURLtoFile(src, `image-from-history.png`);
        if (targetMode === 'REMOVE_BG') {
            setUploadedImage({ src, file });
        } else if (targetMode === 'DRAW') {
            setDrawBackground(src);
        }
        setAppMode(targetMode);
        addToast(`圖片已載入至 ${targetMode === 'REMOVE_BG' ? '背景移除' : '塗鴉板'}`, 'success');
    };
    
    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMac = navigator.platform.toUpperCase().indexOf('MAC') >= 0;
            const mod = isMac ? e.metaKey : e.ctrlKey;

            if (document.activeElement?.tagName === 'TEXTAREA' || document.activeElement?.tagName === 'INPUT') {
                if(e.key === 'Enter' && mod) {
                     e.preventDefault();
                } else {
                    return;
                }
            }

            if (mod && e.key === 'Enter') {
                e.preventDefault();
                if (appMode === 'GENERATE' || appMode === 'CHARACTER_CREATOR') handleGenerate();
                else if (appMode === 'REMOVE_BG') handleRemoveBackground();
                else if (appMode === 'DRAW') handleUseDrawing();
            }
            if (mod && e.key.toLowerCase() === 'o') { e.preventDefault(); handleOptimizePrompt(); }
            if (mod && e.key.toLowerCase() === 'i') { e.preventDefault(); handleInspirePrompt(); }
            if (mod && e.key === 'Backspace') { e.preventDefault(); handleClearSettings(); }

            if (mod && e.altKey) {
                if (e.key === '1') { e.preventDefault(); setAppMode('GENERATE'); }
                if (e.key === '2') { e.preventDefault(); setAppMode('CHARACTER_CREATOR'); }
                if (e.key === '3') { e.preventDefault(); setAppMode('REMOVE_BG'); }
                if (e.key === '4') { e.preventDefault(); setAppMode('DRAW'); }
                if (e.key === '5') { e.preventDefault(); setAppMode('HISTORY'); }
            }
            
            if (appMode === 'DRAW') {
                if (e.key === '[') setBrushSize(s => Math.max(1, s - 1));
                if (e.key === ']') setBrushSize(s => Math.min(100, s + 1));
                if (mod && e.key.toLowerCase() === 'z') { e.preventDefault(); drawCanvasRef.current?.undo(); }
            }
        };
        
        const handlePaste = (e: ClipboardEvent) => {
            const items = e.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.indexOf('image') !== -1) {
                    const file = item.getAsFile();
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (event) => {
                            const src = event.target?.result as string;
                            const uploaded = { src, file };
                            if (appMode === 'REMOVE_BG') {
                                setUploadedImage(uploaded);
                            } else if (appMode === 'GENERATE' || appMode === 'CHARACTER_CREATOR') {
                                setReferenceImages(prev => [...prev, uploaded].slice(0, 8));
                            } else if (appMode === 'DRAW') {
                                setDrawBackground(src);
                            }
                            addToast('已從剪貼簿貼上圖片', 'success');
                        };
                        reader.readAsDataURL(file);
                    }
                    break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('paste', handlePaste);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('paste', handlePaste);
        };
    }, [appMode, handleGenerate, handleRemoveBackground, handleUseDrawing, handleOptimizePrompt, handleInspirePrompt]);
    
    // Brush size preview effect
    useEffect(() => {
        let timer: NodeJS.Timeout;
        if (appMode === 'DRAW') {
            setIsPreviewingBrushSize(true);
            timer = setTimeout(() => setIsPreviewingBrushSize(false), 500);
        }
        return () => clearTimeout(timer);
    }, [brushSize, appMode]);

    const renderMainPanel = () => {
        switch (appMode) {
            case 'GENERATE':
            case 'CHARACTER_CREATOR':
            case 'REMOVE_BG':
                return (
                    <ResultPanel
                        images={images}
                        isLoading={isLoading}
                        error={error}
                        onPromptSelect={(p) => { setPrompt(p); setAppMode('GENERATE'); }}
                        onUpscale={handleUpscale}
                        onZoomOut={handleZoomOut}
                        onSetLightboxConfig={(imgs, idx) => setLightboxConfig({ images: imgs, startIndex: idx })}
                    />
                );
            case 'DRAW':
                return (
                    <DrawingCanvas
                        ref={drawCanvasRef}
                        tool={drawTool}
                        brushSize={brushSize}
                        strokeColor={strokeColor}
                        fillColor={fillColor}
                        aspectRatio={drawAspectRatio}
                        backgroundColor={canvasBackgroundColor}
                        backgroundImage={drawBackground}
                        isPreviewingBrushSize={isPreviewingBrushSize}
                    />
                );
            case 'HISTORY':
                return (
                    <HistoryPanel
                        history={history}
                        selectedItem={selectedHistoryItem}
                        onSelectItem={handleSelectHistoryItem}
                        isAnalyzing={isAnalyzing}
                        analysisError={analysisError}
                        onUseHistoryItem={handleUseHistoryItem}
                        onDeleteHistoryItem={handleDeleteHistoryItem}
                        onClearHistory={handleClearHistory}
                        onSetLightboxConfig={(imgs, idx) => setLightboxConfig({ images: imgs.map(i => i as GeneratedImage), startIndex: idx })}
                        addToast={addToast}
                        onUseImage={handleUseImage}
                        onUpscale={handleUpscale}
                        onZoomOut={handleZoomOut}
                    />
                );
            default:
                return null;
        }
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
            <ControlPanel
                appMode={appMode}
                setAppMode={setAppMode}
                onGenerate={() => handleGenerate()}
                onRemoveBackground={handleRemoveBackground}
                isLoading={isLoading}
                uploadedImage={uploadedImage}
                setUploadedImage={setUploadedImage}
                referenceImages={referenceImages}
                setReferenceImages={setReferenceImages}
                onRemoveReferenceImage={(index) => setReferenceImages(prev => prev.filter((_, i) => i !== index))}
                prompt={prompt}
                setPrompt={setPrompt}
                numImages={numImages}
                setNumImages={setNumImages}
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
                onBrushSizeChange={setBrushSize}
                fillColor={fillColor}
                setFillColor={setFillColor}
                strokeColor={strokeColor}
                setStrokeColor={setStrokeColor}
                drawAspectRatio={drawAspectRatio}
                setDrawAspectRatio={setDrawAspectRatio}
                canvasBackgroundColor={canvasBackgroundColor}
                setCanvasBackgroundColor={setCanvasBackgroundColor}
                onClearCanvas={() => drawCanvasRef.current?.clear()}
                onUndoCanvas={() => drawCanvasRef.current?.undo()}
                onUseDrawing={handleUseDrawing}
                onDrawBackgroundUpload={handleDrawBackgroundUpload}
                isControlPanelOpen={isControlPanelOpen}
                setIsControlPanelOpen={setIsControlPanelOpen}
                isMobile={isMobile}
                modifierKey={modifierKey}
            />
            
            <div className="flex-1 flex flex-col min-w-0">
                {!isMobile && (
                     <header className="flex-shrink-0 h-16 flex items-center justify-center border-b border-fuchsia-500/20 bg-black/30">
                        {/* Could be a global status bar or breadcrumbs */}
                     </header>
                )}
                <div className="flex-1 relative">
                    <button onClick={() => setIsControlPanelOpen(true)} className={`md:hidden absolute top-4 left-4 z-30 p-2 bg-gray-800/80 rounded-full transition-opacity ${isControlPanelOpen ? 'opacity-0' : 'opacity-100'}`}>
                         <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                    {renderMainPanel()}
                </div>
            </div>

            {lightboxConfig && (
                <Lightbox
                    config={lightboxConfig}
                    onClose={() => setLightboxConfig(null)}
                    onUpscale={handleUpscale}
                    onZoomOut={handleZoomOut}
                />
            )}
            
            {/* Toasts */}
            <div className="fixed bottom-4 right-4 z-50 space-y-2 w-72">
                {toasts.map(toast => (
                    <div key={toast.id} className={`p-3 rounded-lg shadow-lg text-sm text-white font-semibold ${toast.type === 'success' ? 'bg-green-600/80' : toast.type === 'error' ? 'bg-red-600/80' : 'bg-blue-600/80'}`}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default App;
