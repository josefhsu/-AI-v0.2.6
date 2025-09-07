import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ResultPanel } from './components/ResultPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { Lightbox } from './components/Lightbox';
import { DrawingCanvas } from './components/DrawingCanvas';
import type { AppMode, AspectRatio, UploadedImage, GeneratedImage, HistoryItem, Toast, LightboxConfig, DrawTool, DrawingCanvasRef } from './types';
import * as gemini from './services/geminiService';
import { dataURLtoFile, fileToBase64, getMimeTypeFromDataUrl } from './utils';
import { SUBJECTS, BACKGROUNDS, ACTIONS_POSES, EMOTIONS, CLOTHING, DETAILS_OBJECTS, ART_STYLES, LIGHTING, COMPOSITIONS, TONES_TEXTURES } from './constants';

const HISTORY_STORAGE_KEY = 'bn-cyberpunk-history-v1';
const MAX_HISTORY_ITEMS = 50;

const App: React.FC = () => {
    // Core State
    const [appMode, setAppMode] = useState<AppMode>('GENERATE');
    const [isLoading, setIsLoading] = useState(false);
    const [isOptimizing, setIsOptimizing] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);

    // Prompt & Generation State
    const [prompt, setPrompt] = useState('');
    const [numImages, setNumImages] = useState(1);
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('1:1');
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);

    // Image & Asset State
    const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
    const [referenceImages, setReferenceImages] = useState<UploadedImage[]>([]);
    const [addGreenScreen, setAddGreenScreen] = useState(false);

    // History State
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    // Drawing Canvas State
    const drawingCanvasRef = useRef<DrawingCanvasRef>(null);
    const [drawTool, setDrawTool] = useState<DrawTool>('brush');
    const [brushSize, setBrushSize] = useState(10);
    const [strokeColor, setStrokeColor] = useState('#FFFFFF');
    const [fillColor, setFillColor] = useState('transparent');
    const [drawAspectRatio, setDrawAspectRatio] = useState<AspectRatio>('1:1');
    const [canvasBackgroundColor, setCanvasBackgroundColor] = useState('#121212');
    const [drawBackgroundImage, setDrawBackgroundImage] = useState<string | null>(null);

    // UI State
    const [lightboxConfig, setLightboxConfig] = useState<LightboxConfig | null>(null);
    const [isControlPanelOpen, setIsControlPanelOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(window.innerWidth < 768);
    const modifierKey = navigator.platform.toUpperCase().indexOf('MAC') >= 0 ? '⌘' : 'Ctrl';

    // --- Effects ---

    // Load/Save History
    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem(HISTORY_STORAGE_KEY);
            if (savedHistory) {
                setHistory(JSON.parse(savedHistory));
            }
        } catch (e) {
            console.error("Failed to load history from localStorage", e);
        }
    }, []);

    useEffect(() => {
        try {
            localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(history));
        } catch (e) {
            console.error("Failed to save history to localStorage", e);
        }
    }, [history]);

    // Handle mobile view
    useEffect(() => {
        const handleResize = () => {
            const mobile = window.innerWidth < 768;
            setIsMobile(mobile);
            if (!mobile) setIsControlPanelOpen(true);
        };
        window.addEventListener('resize', handleResize);
        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Analyze selected history item
    useEffect(() => {
        if (selectedHistoryItem && !selectedHistoryItem.analysis && !isAnalyzing) {
            const analyze = async () => {
                setIsAnalyzing(true);
                setAnalysisError(null);
                try {
                    const file = dataURLtoFile(selectedHistoryItem.src, 'history-item.png');
                    const imagePart = await gemini.fileToGenerativePart(file);
                    const analysisResult = await gemini.analyzeImageAesthetics(imagePart);
                    
                    setHistory(prev => prev.map(item => 
                        item.id === selectedHistoryItem.id ? { ...item, analysis: analysisResult } : item
                    ));
                    setSelectedHistoryItem(prev => prev ? { ...prev, analysis: analysisResult } : null);
                    
                } catch (err) {
                    console.error("Aesthetic analysis failed:", err);
                    const message = err instanceof Error ? err.message : "Unknown error";
                    setAnalysisError(`分析失敗: ${message}`);
                } finally {
                    setIsAnalyzing(false);
                }
            };
            analyze();
        }
    }, [selectedHistoryItem, isAnalyzing]);

    // --- Toast Management ---
    const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(toast => toast.id !== id));
        }, 3000);
    }, []);

    // --- Core Action Handlers ---

    const handleGenerate = useCallback(async () => {
        setError(null);
        if (!prompt.trim() && referenceImages.length === 0 && appMode !== 'DRAW') {
            setError("請輸入提示詞或上傳參考圖。");
            return;
        }

        setIsLoading(true);
        setGeneratedImages([]);
        if (isMobile) setIsControlPanelOpen(false);

        try {
            let combinedReferenceParts = [];
            
            // Handle drawing canvas input
            if (appMode === 'DRAW') {
                const drawingDataUrl = drawingCanvasRef.current?.exportImage();
                if (drawingDataUrl) {
                    const drawingFile = dataURLtoFile(drawingDataUrl, 'drawing.png');
                    const drawingPart = await gemini.fileToGenerativePart(drawingFile);
                    combinedReferenceParts.push(drawingPart);
                }
            }

            // Handle uploaded reference images
            for (const img of referenceImages) {
                const part = await gemini.fileToGenerativePart(img.file);
                combinedReferenceParts.push(part);
            }
            
            const imageDatas = await gemini.generateImagesWithGemini(prompt, numImages, selectedAspectRatio, combinedReferenceParts);

            const newImages: GeneratedImage[] = imageDatas.map((base64) => ({
                id: crypto.randomUUID(),
                src: `data:image/png;base64,${base64}`,
                alt: prompt,
            }));

            setGeneratedImages(newImages);
            setAppMode('GENERATE'); // Switch back to generate mode if needed
            
            // Add to history
            const newHistoryItems: HistoryItem[] = newImages.map(img => ({
                ...img,
                timestamp: Date.now(),
            }));
            setHistory(prev => [...newHistoryItems, ...prev].slice(0, MAX_HISTORY_ITEMS));

        } catch (err) {
            console.error("Generation failed:", err);
            const message = err instanceof Error ? err.message : "Unknown error";
            setError(`生成失敗: ${message}`);
            addToast(`生成失敗: ${message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [prompt, numImages, selectedAspectRatio, referenceImages, isMobile, appMode, addToast]);

    const handleRemoveBackground = useCallback(async () => {
        if (!uploadedImage) {
            setError("請先上傳圖片。");
            return;
        }
        setIsLoading(true);
        setError(null);
        if (isMobile) setIsControlPanelOpen(false);

        try {
            const base64Data = await fileToBase64(uploadedImage.file);
            const result = await gemini.removeBackground(base64Data, uploadedImage.file.type, addGreenScreen);

            if (!result.image) {
                throw new Error(result.text || "模型未返回圖片。");
            }

            const newImage: GeneratedImage = {
                id: crypto.randomUUID(),
                src: `data:image/png;base64,${result.image}`,
                alt: `Background removed from ${uploadedImage.file.name}`,
            };
            setGeneratedImages([newImage]);
            setAppMode('GENERATE');

            const newHistoryItem: HistoryItem = { ...newImage, timestamp: Date.now() };
            setHistory(prev => [newHistoryItem, ...prev].slice(0, MAX_HISTORY_ITEMS));

        } catch (err) {
            console.error("Background removal failed:", err);
            const message = err instanceof Error ? err.message : "Unknown error";
            setError(`背景移除失敗: ${message}`);
            addToast(`背景移除失敗: ${message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [uploadedImage, addGreenScreen, isMobile, addToast]);

    const handleOptimizePrompt = useCallback(async () => {
        if (!prompt.trim()) {
            addToast("請先輸入提示詞。", 'info');
            return;
        }
        setIsOptimizing(true);
        try {
            const optimized = await gemini.optimizePromptWithGemini(prompt);
            setPrompt(optimized);
            addToast("提示詞已優化！", 'success');
        } catch (err) {
            console.error("Prompt optimization failed:", err);
            const message = err instanceof Error ? err.message : "Unknown error";
            addToast(`優化失敗: ${message}`, 'error');
        } finally {
            setIsOptimizing(false);
        }
    }, [prompt, addToast]);
    
    // --- UI & Helper Handlers ---

    const handleClearSettings = useCallback(() => {
        setPrompt('');
        setReferenceImages([]);
        setUploadedImage(null);
    }, []);

    const handleInspirePrompt = useCallback(() => {
        const randomItem = (arr: any[]) => arr[Math.floor(Math.random() * arr.length)];
        const newPrompt = [
            randomItem(SUBJECTS),
            randomItem(ACTIONS_POSES),
            `在${randomItem(BACKGROUNDS)}`,
            `(${randomItem(ART_STYLES)})`,
            `燈光是${randomItem(LIGHTING)}`,
            `構圖為${randomItem(COMPOSITIONS)}`,
            `${randomItem(TONES_TEXTURES)}`,
        ].join(', ');
        setPrompt(newPrompt);
    }, []);

    const handleRemoveReferenceImage = (index: number) => {
        setReferenceImages(prev => prev.filter((_, i) => i !== index));
    };
    
    const handleUpscale = useCallback(async (src: string) => {
        setIsLoading(true);
        setError(null);
        if (isMobile) setIsControlPanelOpen(false);
        addToast("正在提升畫質...", 'info');
        
        try {
            const base64 = src.split(',')[1];
            const mimeType = getMimeTypeFromDataUrl(src);
            const upscaledBase64 = await gemini.upscaleImageWithGemini(base64, mimeType);
            
            const newImage: GeneratedImage = {
                id: crypto.randomUUID(),
                src: `data:image/png;base64,${upscaledBase64}`,
                alt: `Upscaled image`,
            };
            setGeneratedImages([newImage]);
            setAppMode('GENERATE');
            
            const newHistoryItem: HistoryItem = { ...newImage, timestamp: Date.now() };
            setHistory(prev => [newHistoryItem, ...prev].slice(0, MAX_HISTORY_ITEMS));
            addToast("畫質提升成功！", 'success');

        } catch(err) {
            console.error("Upscale failed:", err);
            const message = err instanceof Error ? err.message : "Unknown error";
            setError(`提升畫質失敗: ${message}`);
            addToast(`提升畫質失敗: ${message}`, 'error');
        } finally {
            setIsLoading(false);
        }
    }, [isMobile, addToast]);

    const handleZoomOut = useCallback(async (src: string) => {
        addToast("Zoom Out 功能即將推出！", 'info');
        console.log("Zoom Out requested for:", src);
    }, [addToast]);
    
    // History Panel Handlers
    const handleUseHistoryItem = (item: HistoryItem) => {
        const file = dataURLtoFile(item.src, `history-${item.id}.png`);
        setReferenceImages(prev => [...prev, { src: item.src, file }].slice(0, 8));
        setAppMode('GENERATE');
        addToast("圖片已添加至參考圖", 'success');
    };

    const handleDeleteHistoryItem = (id: string) => {
        setHistory(prev => prev.filter(item => item.id !== id));
        if (selectedHistoryItem?.id === id) {
            setSelectedHistoryItem(null);
        }
        addToast("紀錄已刪除", 'success');
    };

    const handleClearHistory = () => {
        if (window.confirm("確定要清除所有歷史紀錄嗎？此操作無法復原。")) {
            setHistory([]);
            setSelectedHistoryItem(null);
            addToast("歷史紀錄已清除", 'success');
        }
    };
    
    const handleUseImage = (src: string, targetMode: AppMode) => {
        const file = dataURLtoFile(src, 'reused-image.png');
        const uploaded: UploadedImage = { src, file };
        
        if (targetMode === 'REMOVE_BG') {
            setUploadedImage(uploaded);
        } else if (targetMode === 'DRAW') {
            setDrawBackgroundImage(src);
        }
        
        setAppMode(targetMode);
        addToast(`圖片已載入至 ${targetMode === 'REMOVE_BG' ? '背景移除' : '塗鴉板'}`, 'success');
    };

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const isMod = e.ctrlKey || e.metaKey;
            
            if (isMod && e.key.toLowerCase() === 'enter') {
                e.preventDefault();
                if (appMode === 'GENERATE' || appMode === 'CHARACTER_CREATOR' || appMode === 'DRAW') handleGenerate();
                if (appMode === 'REMOVE_BG') handleRemoveBackground();
            }
            if (isMod && e.key.toLowerCase() === 'backspace') {
                e.preventDefault();
                handleClearSettings();
            }
            if (isMod && e.key.toLowerCase() === 'o') {
                e.preventDefault();
                handleOptimizePrompt();
            }
             if (isMod && e.key.toLowerCase() === 'i') {
                e.preventDefault();
                handleInspirePrompt();
            }
            if (isMod && e.altKey) {
                switch(e.key) {
                    case '1': setAppMode('GENERATE'); break;
                    case '2': setAppMode('CHARACTER_CREATOR'); break;
                    case '3': setAppMode('REMOVE_BG'); break;
                    case '4': setAppMode('DRAW'); break;
                    case '5': setAppMode('HISTORY'); break;
                }
            }
        };
        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [appMode, handleGenerate, handleRemoveBackground, handleClearSettings, handleOptimizePrompt, handleInspirePrompt]);
    
    // Paste from clipboard
    useEffect(() => {
        const handlePaste = (event: ClipboardEvent) => {
            const items = event.clipboardData?.items;
            if (!items) return;
            for (const item of items) {
                if (item.type.startsWith('image/')) {
                    const file = item.getAsFile();
                    if (file) {
                        const reader = new FileReader();
                        reader.onload = (e) => {
                            const src = e.target?.result as string;
                            const newImage = { src, file };
                            if (appMode === 'REMOVE_BG') {
                                setUploadedImage(newImage);
                            } else {
                                setReferenceImages(prev => [...prev, newImage].slice(0, 8));
                            }
                            addToast('圖片已從剪貼簿貼上', 'success');
                        };
                        reader.readAsDataURL(file);
                        event.preventDefault();
                        return;
                    }
                }
            }
        };
        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [appMode, addToast]);


    const renderMainPanel = () => {
        if (appMode === 'HISTORY') {
            return (
                <HistoryPanel
                    history={history}
                    selectedItem={selectedHistoryItem}
                    onSelectItem={setSelectedHistoryItem}
                    isAnalyzing={isAnalyzing}
                    analysisError={analysisError}
                    onUseHistoryItem={handleUseHistoryItem}
                    onDeleteHistoryItem={handleDeleteHistoryItem}
                    onClearHistory={handleClearHistory}
                    onSetLightboxConfig={(images, startIndex) => setLightboxConfig({ images, startIndex })}
                    addToast={addToast}
                    onUseImage={handleUseImage}
                    onUpscale={handleUpscale}
                    onZoomOut={handleZoomOut}
                />
            );
        }
        if (appMode === 'DRAW') {
            return <DrawingCanvas 
                        ref={drawingCanvasRef}
                        tool={drawTool}
                        brushSize={brushSize}
                        strokeColor={strokeColor}
                        fillColor={fillColor}
                        aspectRatio={drawAspectRatio}
                        backgroundColor={canvasBackgroundColor}
                        backgroundImage={drawBackgroundImage}
                    />;
        }
        return (
            <ResultPanel
                images={generatedImages}
                isLoading={isLoading}
                error={error}
                onPromptSelect={(p) => { setPrompt(p); setAppMode('GENERATE'); }}
                onUpscale={handleUpscale}
                onZoomOut={handleZoomOut}
                onSetLightboxConfig={(images, startIndex) => setLightboxConfig({ images, startIndex })}
            />
        );
    };

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans antialiased overflow-hidden">
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
                onRemoveReferenceImage={handleRemoveReferenceImage}
                prompt={prompt}
                setPrompt={setPrompt}
                numImages={numImages}
                setNumImages={setNumImages}
                selectedAspectRatio={selectedAspectRatio}
                onAspectRatioSelect={setSelectedAspectRatio}
                isOptimizing={isOptimizing}
                onOptimizePrompt={handleOptimizePrompt}
                onInspirePrompt={handleInspirePrompt}
                onClearSettings={handleClearSettings}
                addGreenScreen={addGreenScreen}
                setAddGreenScreen={setAddGreenScreen}
                drawTool={drawTool}
                setDrawTool={setDrawTool}
                brushSize={brushSize}
                setBrushSize={setBrushSize}
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
                onUseDrawing={() => handleGenerate()}
                onDrawBackgroundUpload={(file: File) => {
                    const reader = new FileReader();
                    reader.onload = (e) => setDrawBackgroundImage(e.target?.result as string);
                    reader.readAsDataURL(file);
                }}
                isControlPanelOpen={isControlPanelOpen}
                setIsControlPanelOpen={setIsControlPanelOpen}
                isMobile={isMobile}
                modifierKey={modifierKey}
            />

            <div className="flex-1 flex flex-col min-w-0">
                {!isControlPanelOpen && isMobile && (
                    <button onClick={() => setIsControlPanelOpen(true)} className="fixed top-2 left-2 z-50 p-2 bg-gray-800/80 rounded-full">
                        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h16"></path></svg>
                    </button>
                )}
                {renderMainPanel()}
            </div>
            
            {lightboxConfig && (
                <Lightbox 
                    config={lightboxConfig} 
                    onClose={() => setLightboxConfig(null)}
                    onUpscale={handleUpscale}
                    onZoomOut={handleZoomOut}
                />
            )}
            
            {/* Toast Container */}
            <div className="fixed bottom-4 right-4 z-[100] space-y-2">
                {toasts.map(toast => (
                    <div key={toast.id} className={`px-4 py-2 rounded-lg text-sm font-semibold shadow-lg animate-fade-in-out
                        ${toast.type === 'success' && 'bg-green-600'}
                        ${toast.type === 'error' && 'bg-red-600'}
                        ${toast.type === 'info' && 'bg-cyan-600'}
                    `}>
                        {toast.message}
                    </div>
                ))}
            </div>
        </div>
    );
};

export default App;
