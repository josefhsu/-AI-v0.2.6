import React, { useState, useEffect, useCallback, useRef } from 'react';
import { ControlPanel } from './components/ControlPanel';
import { ResultPanel } from './components/ResultPanel';
import { HistoryPanel } from './components/HistoryPanel';
import { DrawingCanvas } from './components/DrawingCanvas';
import { Lightbox } from './components/Lightbox';
import type { 
    AppMode, GeneratedImage, UploadedImage, AspectRatio, HistoryItem, 
    DrawingCanvasRef, DrawTool, LightboxConfig, Toast
} from './types';
import * as geminiService from './services/geminiService';
import { dataURLtoFile, cropImageToAspectRatio, getOS } from './utils';
import { API_SUPPORTED_ASPECT_RATIOS, SUBJECTS, BACKGROUNDS, ACTIONS_POSES, EMOTIONS, CLOTHING, DETAILS_OBJECTS, ART_STYLES, LIGHTING, COMPOSITIONS, TONES_TEXTURES } from './constants';

const App: React.FC = () => {
    // Core State
    const [appMode, setAppMode] = useState<AppMode>('GENERATE');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [prompt, setPrompt] = useState('');

    // Image & Generation State
    const [generatedImages, setGeneratedImages] = useState<GeneratedImage[]>([]);
    const [uploadedImage, setUploadedImage] = useState<UploadedImage | null>(null);
    const [referenceImages, setReferenceImages] = useState<UploadedImage[]>([]);
    const [numImages, setNumImages] = useState(1);
    const [selectedAspectRatio, setSelectedAspectRatio] = useState<AspectRatio>('1:1');
    const [isOptimizing, setIsOptimizing] = useState(false);

    // Remove BG State
    const [addGreenScreen, setAddGreenScreen] = useState(false);

    // Drawing State
    const drawingCanvasRef = useRef<DrawingCanvasRef>(null);
    const [drawTool, setDrawTool] = useState<DrawTool>('brush');
    const [brushSize, setBrushSize] = useState(10);
    const [fillColor, setFillColor] = useState('transparent');
    const [strokeColor, setStrokeColor] = useState('#FFFFFF');
    const [drawAspectRatio, setDrawAspectRatio] = useState<AspectRatio>('1:1');
    const [canvasBackgroundColor, setCanvasBackgroundColor] = useState('#111827');
    const [drawBackgroundImage, setDrawBackgroundImage] = useState<string | null>(null);

    // History State
    const [history, setHistory] = useState<HistoryItem[]>([]);
    const [selectedHistoryItem, setSelectedHistoryItem] = useState<HistoryItem | null>(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);

    // UI State
    const [lightboxConfig, setLightboxConfig] = useState<LightboxConfig | null>(null);
    const [toasts, setToasts] = useState<Toast[]>([]);
    const [isControlPanelOpen, setIsControlPanelOpen] = useState(true);
    const [isMobile, setIsMobile] = useState(false);
    const [modifierKey, setModifierKey] = useState<'Ctrl' | '⌘'>('Ctrl');

    // --- Handlers ---
    
    const addToast = useCallback((message: string, type: Toast['type'] = 'info') => {
        const id = Date.now();
        setToasts(prev => [...prev, { id, message, type }]);
        setTimeout(() => {
            setToasts(prev => prev.filter(t => t.id !== id));
        }, 3000);
    }, [setToasts]);

    const addToHistory = useCallback((images: GeneratedImage[]) => {
        const newHistoryItems: HistoryItem[] = images.map(img => ({
            ...img,
            timestamp: Date.now(),
        }));
        setHistory(prev => [...newHistoryItems, ...prev]);
    }, [setHistory]);

    const handleGenerate = useCallback(async () => {
        if (!prompt && referenceImages.length === 0) {
            setError("請輸入提示詞或上傳參考圖。");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);

        try {
            const imageParts = await Promise.all(referenceImages.map(img => geminiService.fileToGenerativePart(img.file)));
            
            const results = await geminiService.generateImagesWithGemini(
                prompt,
                numImages,
                selectedAspectRatio,
                imageParts
            );

            let finalImages = results.map((base64, index) => {
                const id = `gen-${Date.now()}-${index}`;
                return {
                    id,
                    src: `data:image/png;base64,${base64}`,
                    alt: prompt,
                };
            });
            
            // Crop if aspect ratio is not API supported
            if (!API_SUPPORTED_ASPECT_RATIOS.includes(selectedAspectRatio) && referenceImages.length === 0) {
                finalImages = await Promise.all(finalImages.map(async (img) => {
                    const croppedSrc = await cropImageToAspectRatio(img.src, selectedAspectRatio);
                    return { ...img, src: croppedSrc };
                }));
            }

            setGeneratedImages(finalImages);
            addToHistory(finalImages);
        } catch (err) {
            const message = err instanceof Error ? err.message : "發生未知錯誤";
            setError(message);
            console.error("Generation failed:", err);
        } finally {
            setIsLoading(false);
        }
    }, [prompt, numImages, selectedAspectRatio, referenceImages, addToHistory]);

    const handleRemoveBackground = useCallback(async () => {
        if (!uploadedImage) {
            setError("請先上傳一張圖片。");
            return;
        }
        setIsLoading(true);
        setError(null);
        setGeneratedImages([]);
        try {
            const base64Data = uploadedImage.src.split(',')[1];
            const result = await geminiService.removeBackground(base64Data, uploadedImage.file.type, addGreenScreen);

            if (result.image) {
                const newImage: GeneratedImage = {
                    id: `bg-rem-${Date.now()}`,
                    src: `data:image/png;base64,${result.image}`,
                    alt: `Background removed from ${uploadedImage.file.name}`,
                };
                setGeneratedImages([newImage]);
                addToHistory([newImage]);
            } else {
                throw new Error(result.text || "模型未返回圖片。");
            }
        } catch (err) {
            const message = err instanceof Error ? err.message : "移除背景時發生錯誤";
            setError(message);
            console.error("Remove background failed:", err);
        } finally {
            setIsLoading(false);
        }
    }, [uploadedImage, addGreenScreen, addToHistory]);
    
    const handleUpscale = useCallback(async (src: string) => {
        setIsLoading(true);
        setError(null);
        addToast("正在提升畫質...");
        try {
            const file = dataURLtoFile(src, 'upscale-source.png');
            const base64Data = src.split(',')[1];
            const upscaledBase64 = await geminiService.upscaleImageWithGemini(base64Data, file.type);
            
            const newImage: GeneratedImage = {
                id: `upscaled-${Date.now()}`,
                src: `data:image/png;base64,${upscaledBase64}`,
                alt: 'Upscaled Image'
            };
            
            setGeneratedImages(prev => [newImage, ...prev]);
            addToHistory([newImage]);
            addToast("畫質提升成功！", 'success');
        } catch (err) {
            const message = err instanceof Error ? err.message : "發生未知錯誤";
            setError(message);
            console.error("Upscale failed:", err);
        } finally {
            setIsLoading(false);
        }
    }, [addToHistory, addToast]);

    const handleZoomOut = useCallback(async (src: string) => {
        setIsLoading(true);
        setError(null);
        addToast("正在擴展圖片 (Zoom Out)...");
        try {
            const file = dataURLtoFile(src, 'zoom-out-source.png');
            const imagePart = await geminiService.fileToGenerativePart(file);
            const zoomOutPrompt = "zoom out 2x, outpainting, expand the image, fill in the details seamlessly";
            const results = await geminiService.generateImagesWithGemini(zoomOutPrompt, 1, '1:1', [imagePart]);

            const newImage: GeneratedImage = {
                id: `zoomed-${Date.now()}`,
                src: `data:image/png;base64,${results[0]}`,
                alt: 'Zoomed Out Image'
            };

            setGeneratedImages(prev => [newImage, ...prev]);
            addToHistory([newImage]);
            addToast("圖片擴展成功！", 'success');
        } catch (err) {
            const message = err instanceof Error ? err.message : "發生未知錯誤";
            setError(message);
            console.error("Zoom out failed:", err);
        } finally {
            setIsLoading(false);
        }
    }, [addToHistory, addToast]);


    const handleOptimizePrompt = useCallback(async () => {
        if (!prompt) return;
        setIsOptimizing(true);
        try {
            const optimized = await geminiService.optimizePromptWithGemini(prompt);
            setPrompt(optimized);
        } catch (err) {
            console.error("Prompt optimization failed:", err);
            addToast('提示詞優化失敗', 'error');
        } finally {
            setIsOptimizing(false);
        }
    }, [prompt, addToast]);

    const getRandomItem = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    
    const handleInspirePrompt = useCallback(() => {
        const inspired = [
            getRandomItem(SUBJECTS),
            getRandomItem(BACKGROUNDS),
            getRandomItem(ACTIONS_POSES),
            getRandomItem(EMOTIONS),
            getRandomItem(CLOTHING),
            getRandomItem(DETAILS_OBJECTS),
            getRandomItem(ART_STYLES),
            getRandomItem(LIGHTING),
            getRandomItem(COMPOSITIONS),
            getRandomItem(TONES_TEXTURES)
        ].join(', ');
        setPrompt(inspired);
    }, []);

    const handleClearSettings = useCallback(() => {
        setPrompt('');
        setReferenceImages([]);
        setUploadedImage(null);
        setGeneratedImages([]);
        setError(null);
        setSelectedAspectRatio('1:1');
        setNumImages(1);
    }, []);

    const handleUseDrawing = useCallback(() => {
        const imageB64 = drawingCanvasRef.current?.exportImage();
        if (imageB64) {
            const file = dataURLtoFile(imageB64, `drawing-${Date.now()}.png`);
            setReferenceImages([{ src: imageB64, file }]);
            setAppMode('GENERATE');
            addToast("畫布已作為參考圖使用", 'success');
        }
    }, [addToast]);
    
    const handleUseHistoryItem = useCallback((item: HistoryItem) => {
        const file = dataURLtoFile(item.src, `history-${item.id}.png`);
        setReferenceImages(prev => [{ src: item.src, file }, ...prev].slice(0, 8));
        setPrompt(item.alt);
        setAppMode('GENERATE');
        addToast('歷史紀錄已作為參考圖與提示詞', 'success');
    }, [addToast]);
    
    const handleDeleteHistoryItem = useCallback((id: string) => {
        setHistory(prev => prev.filter(item => item.id !== id));
        if (selectedHistoryItem?.id === id) {
            setSelectedHistoryItem(null);
        }
        addToast('歷史紀錄已刪除', 'success');
    }, [selectedHistoryItem, addToast, setHistory, setSelectedHistoryItem]);
    
    const handleClearHistory = useCallback(() => {
        if (window.confirm('您確定要清除所有歷史紀錄嗎？此操作無法復原。')) {
            setHistory([]);
            setSelectedHistoryItem(null);
            addToast('所有歷史紀錄已清除', 'success');
        }
    }, [addToast, setHistory, setSelectedHistoryItem]);
    
    const handleUseImage = useCallback((src: string, targetMode: AppMode) => {
        const file = dataURLtoFile(src, `used-image-${Date.now()}.png`);
        const image = { src, file };
        if(targetMode === 'REMOVE_BG') {
            setUploadedImage(image);
        } else if (targetMode === 'DRAW') {
            setDrawBackgroundImage(src);
        }
        setAppMode(targetMode);
    }, []);

    // --- Effects ---

    // Load history from localStorage on mount
    useEffect(() => {
        try {
            const savedHistory = localStorage.getItem('bn-history');
            if (savedHistory) {
                setHistory(JSON.parse(savedHistory));
            }
        } catch (e) {
            console.error("Failed to load history from localStorage", e);
        }
        
        const os = getOS();
        setIsMobile(os === 'mobile');
        setModifierKey(os === 'mac' ? '⌘' : 'Ctrl');

        const handleResize = () => setIsMobile(window.innerWidth < 768);
        window.addEventListener('resize', handleResize);
        handleResize(); // initial check

        return () => window.removeEventListener('resize', handleResize);
    }, []);

    // Save history to localStorage when it changes
    useEffect(() => {
        try {
            localStorage.setItem('bn-history', JSON.stringify(history));
        } catch (e) {
            console.error("Failed to save history to localStorage", e);
        }
    }, [history]);
    
    // Aesthetic Analysis when history item is selected
    useEffect(() => {
        if (selectedHistoryItem && !selectedHistoryItem.analysis && !isAnalyzing) {
            const analyze = async () => {
                setIsAnalyzing(true);
                setAnalysisError(null);
                try {
                    const imageFile = dataURLtoFile(selectedHistoryItem.src, 'analysis-image.png');
                    const imagePart = await geminiService.fileToGenerativePart(imageFile);
                    const analysisResult = await geminiService.analyzeImageAesthetics(imagePart);
                    
                    const updatedHistoryItem = { ...selectedHistoryItem, analysis: analysisResult };
                    
                    setHistory(prev => prev.map(item => item.id === selectedHistoryItem.id ? updatedHistoryItem : item));
                    setSelectedHistoryItem(updatedHistoryItem);

                } catch (err) {
                    const message = err instanceof Error ? err.message : "Unknown analysis error";
                    setAnalysisError(message);
                    console.error("Aesthetic analysis failed:", err);
                } finally {
                    setIsAnalyzing(false);
                }
            };
            analyze();
        }
    }, [selectedHistoryItem, isAnalyzing]);

    // Keyboard Shortcuts
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            const modifier = (modifierKey === '⌘' ? e.metaKey : e.ctrlKey);

            if (modifier && e.key.toLowerCase() === 'enter') {
                e.preventDefault();
                if (appMode === 'GENERATE' || appMode === 'CHARACTER_CREATOR') handleGenerate();
                else if (appMode === 'REMOVE_BG') handleRemoveBackground();
                else if (appMode === 'DRAW') handleUseDrawing();
            }
            if (modifier && e.key.toLowerCase() === 'o') { e.preventDefault(); handleOptimizePrompt(); }
            if (modifier && e.key.toLowerCase() === 'i') { e.preventDefault(); handleInspirePrompt(); }
            if (modifier && e.key.toLowerCase() === 'backspace') { e.preventDefault(); handleClearSettings(); }
            if (e.altKey) {
                switch(e.key) {
                    case '1': e.preventDefault(); setAppMode('GENERATE'); break;
                    case '2': e.preventDefault(); setAppMode('CHARACTER_CREATOR'); break;
                    case '3': e.preventDefault(); setAppMode('REMOVE_BG'); break;
                    case '4': e.preventDefault(); setAppMode('DRAW'); break;
                    case '5': e.preventDefault(); setAppMode('HISTORY'); break;
                }
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => window.removeEventListener('keydown', handleKeyDown);
    }, [appMode, modifierKey, handleGenerate, handleRemoveBackground, handleOptimizePrompt, handleInspirePrompt, handleClearSettings, handleUseDrawing]);

    // Clipboard Paste
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
                            const uploaded: UploadedImage = { src, file };
                            if (appMode === 'GENERATE' || appMode === 'CHARACTER_CREATOR') {
                                setReferenceImages(prev => [...prev, uploaded].slice(0, 8));
                            } else if (appMode === 'REMOVE_BG') {
                                setUploadedImage(uploaded);
                            } else if (appMode === 'DRAW') {
                                setDrawBackgroundImage(src);
                            }
                            addToast('圖片已從剪貼簿貼上', 'success');
                        };
                        reader.readAsDataURL(file);
                    }
                }
            }
        };

        window.addEventListener('paste', handlePaste);
        return () => window.removeEventListener('paste', handlePaste);
    }, [appMode, addToast]);

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
                        onPromptSelect={(p) => { setPrompt(p); setAppMode('GENERATE'); }}
                        onUpscale={handleUpscale}
                        onZoomOut={handleZoomOut}
                        onSetLightboxConfig={(images, startIndex) => setLightboxConfig({ images, startIndex })}
                    />
                );
            case 'DRAW':
                return (
                    <DrawingCanvas
                        ref={drawingCanvasRef}
                        tool={drawTool}
                        brushSize={brushSize}
                        strokeColor={strokeColor}
                        fillColor={fillColor}
                        aspectRatio={drawAspectRatio}
                        backgroundColor={canvasBackgroundColor}
                        backgroundImage={drawBackgroundImage}
                    />
                );
            case 'HISTORY':
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
                        onSetLightboxConfig={(images, startIndex) => setLightboxConfig({ images: images as GeneratedImage[], startIndex })}
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
    
    const ToastContainer = () => (
        <div className="fixed top-4 right-4 z-50 space-y-2">
            {toasts.map(toast => (
                <div key={toast.id} className={`px-4 py-2 rounded-md shadow-lg text-white ${
                    toast.type === 'success' ? 'bg-green-600/80' :
                    toast.type === 'error' ? 'bg-red-600/80' : 'bg-blue-600/80'
                }`}>
                    {toast.message}
                </div>
            ))}
        </div>
    );

    return (
        <div className="flex h-screen bg-gray-900 text-white font-sans overflow-hidden">
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
                onUseDrawing={handleUseDrawing}
                onDrawBackgroundUpload={(file) => {
                    const reader = new FileReader();
                    reader.onload = (e) => setDrawBackgroundImage(e.target?.result as string);
                    reader.readAsDataURL(file);
                }}
                isControlPanelOpen={isControlPanelOpen}
                setIsControlPanelOpen={setIsControlPanelOpen}
                isMobile={isMobile}
                modifierKey={modifierKey}
            />

            <main className="flex-1 flex flex-col bg-black min-w-0">
                 {renderMainPanel()}
            </main>
            
            {lightboxConfig && (
                <Lightbox 
                    config={lightboxConfig} 
                    onClose={() => setLightboxConfig(null)} 
                    onUpscale={handleUpscale}
                    onZoomOut={handleZoomOut}
                />
            )}
            
            <ToastContainer />

            {!isControlPanelOpen && isMobile && (
                <button
                    onClick={() => setIsControlPanelOpen(true)}
                    className="fixed bottom-4 left-4 z-50 p-3 bg-fuchsia-600 rounded-full shadow-lg"
                >
                    <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16m-7 6h7" /></svg>
                </button>
            )}
        </div>
    );
};

export default App;