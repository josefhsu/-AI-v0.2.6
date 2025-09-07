import React from 'react';
import type { GeneratedImage, AppMode } from '../types';
import { EyeIcon, DownloadIcon, ExpandIcon, ZoomOutIcon } from './Icon';
import { downloadImage, formatFileSize } from '../utils';
import { EXAMPLE_PROMPTS } from '../constants';

interface ResultPanelProps {
  images: GeneratedImage[];
  isLoading: boolean;
  error: string | null;
  onPromptSelect: (prompt: string) => void;
  onUpscale: (src: string) => void;
  onZoomOut: (src: string) => void;
  onSetLightboxConfig: (images: GeneratedImage[], startIndex: number) => void;
}

const CyberpunkLogo: React.FC = () => (
    <svg width="200" height="200" viewBox="0 0 240 240" fill="none" xmlns="http://www.w3.org/2000/svg" className="mx-auto mb-6">
        <defs>
            <linearGradient id="grad-cyber" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#d946ef" />
                <stop offset="100%" stopColor="#22d3ee" />
            </linearGradient>
        </defs>
        <path d="M40 8 L200 8 Q232 8 232 40 L232 200 Q232 232 200 232 L40 232 Q8 232 8 200 L8 40 Q8 8 40 8" stroke="url(#grad-cyber)" strokeWidth="4" fill="none" />
        <path d="M16 16 L224 16 L224 224 L16 224 L16 16" stroke="#d946ef" strokeOpacity="0.2" strokeWidth="16" fill="none" />
        <text x="50%" y="45%" dominantBaseline="middle" textAnchor="middle" fontSize="80" fill="url(#grad-cyber)" fontFamily="monospace" fontWeight="bold">B</text>
        <text x="50%" y="75%" dominantBaseline="middle" textAnchor="middle" fontSize="80" fill="url(#grad-cyber)" fontFamily="monospace" fontWeight="bold">N</text>
        <path d="M40 8 L200 8" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.5" />
        <path d="M8 40 L8 200" stroke="#ffffff" strokeWidth="1" strokeOpacity="0.5" />
    </svg>
);

const ImageCard: React.FC<{
    image: GeneratedImage;
    index: number;
    images: GeneratedImage[];
    onUpscale: (src: string) => void;
    onZoomOut: (src: string) => void;
    onSetLightboxConfig: (images: GeneratedImage[], startIndex: number) => void;
}> = ({ image, index, images, onUpscale, onZoomOut, onSetLightboxConfig }) => {
    
    const handleDownload = () => {
        const safeFilename = image.alt.replace(/[^a-z0-9\u4e00-\u9fa5]/gi, '_').toLowerCase();
        downloadImage(image.src, `${safeFilename.slice(0, 30)}.png`);
    };

    return (
        <div className="relative group aspect-square bg-black rounded-lg overflow-hidden">
            <img src={image.src} alt={image.alt} className="w-full h-full object-contain transition-transform group-hover:scale-105" />
            <div className="absolute inset-0 bg-black/70 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-2">
                <p className="text-xs text-center text-slate-300 mb-3 max-h-20 overflow-hidden">{image.alt}</p>
                <div className="flex flex-wrap justify-center gap-3">
                    <button onClick={handleDownload} title="下載圖片" className="p-2 text-white bg-slate-800/80 rounded-full hover:bg-fuchsia-600 transition-colors">
                        <DownloadIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => onSetLightboxConfig(images, index)} title="放大檢視" className="p-2 text-white bg-slate-800/80 rounded-full hover:bg-fuchsia-600 transition-colors">
                        <EyeIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => onUpscale(image.src)} title="提升畫質" className="p-2 text-white bg-slate-800/80 rounded-full hover:bg-fuchsia-600 transition-colors">
                        <ExpandIcon className="w-5 h-5" />
                    </button>
                    <button onClick={() => onZoomOut(image.src)} title="Zoom out 2x" className="p-2 text-white bg-slate-800/80 rounded-full hover:bg-fuchsia-600 transition-colors">
                        <ZoomOutIcon className="w-5 h-5" />
                    </button>
                </div>
            </div>
            {image.width && image.height && image.size && (
                <div className="absolute bottom-1 right-1 bg-black/60 text-white text-[10px] px-1.5 py-0.5 rounded pointer-events-none">
                    {image.width}x{image.height} | {formatFileSize(image.size)}
                </div>
            )}
        </div>
    );
};


export const ResultPanel: React.FC<ResultPanelProps> = ({ images, isLoading, error, onPromptSelect, onUpscale, onZoomOut, onSetLightboxConfig }) => {

  const hasContent = images.length > 0 || isLoading || error;

  return (
    <main className="flex-1 flex flex-col p-2 md:p-4 bg-black min-w-0 overflow-y-auto">
      {hasContent ? (
        <div className="flex-1">
          {isLoading && (
            <div className="absolute inset-0 flex flex-col items-center justify-center bg-black/50 z-10">
              <div className="w-16 h-16 border-4 border-dashed rounded-full animate-spin border-fuchsia-500 mb-4"></div>
              <p className="text-lg font-semibold text-white">圖片生成中...</p>
            </div>
          )}
          {error && (
            <div className="flex items-center justify-center h-full">
              <div className="bg-red-900/50 border border-red-500 text-red-300 p-4 rounded-lg text-center">
                <h3 className="font-bold mb-2">發生錯誤</h3>
                <p className="text-sm">{error}</p>
              </div>
            </div>
          )}
          {images.length > 0 && (
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-4">
              {images.map((image, index) => (
                <ImageCard 
                    key={image.id} 
                    image={image}
                    index={index}
                    images={images}
                    onUpscale={onUpscale} 
                    onZoomOut={onZoomOut} 
                    onSetLightboxConfig={onSetLightboxConfig}
                />
              ))}
            </div>
          )}
        </div>
      ) : (
        <div className="flex flex-col items-center justify-center text-center h-full text-slate-400 p-4">
          <CyberpunkLogo />
          <h2 className="text-2xl font-bold mb-2 bg-gradient-to-r from-fuchsia-400 to-cyan-300 text-transparent bg-clip-text">鳥巢AI包娜娜，包生的啦！</h2>
          <p className="max-w-md mb-6 text-slate-500">從控制台開始，或試試下方的靈感來激發創意。</p>
          <div className="flex flex-wrap justify-center gap-2 max-w-2xl">
            {EXAMPLE_PROMPTS.map((prompt, index) => (
              <button
                key={index}
                onClick={() => onPromptSelect(prompt)}
                className="px-4 py-2 bg-gray-800/50 text-slate-300 text-sm rounded-full hover:bg-fuchsia-600 hover:text-white transition-colors"
              >
                {prompt}
              </button>
            ))}
          </div>
        </div>
      )}
    </main>
  );
};