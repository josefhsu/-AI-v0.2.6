import { ASPECT_RATIOS } from './constants';

export type AppMode = 'GENERATE' | 'CHARACTER_CREATOR' | 'REMOVE_BG' | 'DRAW' | 'HISTORY';

export type AspectRatio = typeof ASPECT_RATIOS[number];

export type UploadedImage = {
    src: string;
    file: File;
};

export type GeneratedImage = {
    id: string;
    src: string;
    alt: string; // The prompt used
    width?: number;
    height?: number;
    size?: number; // in bytes
    analysis?: {
        score: string;
        analysis: string;
    } | null;
};

export type HistoryItem = GeneratedImage;

export type DrawTool = 'brush' | 'rectangle' | 'circle' | 'arrow';

export type LightboxConfig = {
    images: GeneratedImage[];
    startIndex: number;
} | null;

export type Toast = {
    id: string;
    message: string;
    type: 'success' | 'error' | 'info';
};

export type DrawingCanvasRef = {
    exportImage: () => string; // returns data URL
    clear: () => void;
    undo: () => void;
};
