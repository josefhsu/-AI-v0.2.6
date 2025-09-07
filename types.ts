import { Part } from '@google/genai';

export type AppMode = 'GENERATE' | 'CHARACTER_CREATOR' | 'REMOVE_BG' | 'DRAW' | 'HISTORY';

export type AspectRatio = '1:1' | '3:4' | '4:3' | '9:16' | '16:9';

export interface UploadedImage {
  src: string;
  file: File;
}

export interface GeneratedImage {
  id: string;
  src: string;
  alt: string;
  width?: number;
  height?: number;
  size?: number; // size in bytes
}

export interface HistoryItem extends GeneratedImage {
  timestamp: number;
  analysis?: AestheticAnalysis;
}

export type DrawTool = 'brush' | 'rectangle' | 'circle' | 'arrow';

export interface DrawingCanvasRef {
  exportImage: () => string;
  clear: () => void;
  undo: () => void;
}

export interface AestheticAnalysis {
    score: string;
    analysis: string;
}

export interface Toast {
    id: number;
    message: string;
    type: 'success' | 'error' | 'info';
}

export type GenerativePart = Part;

export interface LightboxConfig {
    images: GeneratedImage[];
    startIndex: number;
}