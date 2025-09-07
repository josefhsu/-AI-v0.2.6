/**
 * Downloads an image from a data URL or blob URL.
 * @param url The URL of the image to download.
 * @param filename The desired filename for the downloaded image.
 */
export const downloadImage = (url: string, filename: string): void => {
    const link = document.createElement('a');
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Converts a data URL string to a File object.
 * @param dataUrl The data URL to convert.
 * @param filename The desired filename for the new File object.
 * @returns A File object.
 */
export const dataURLtoFile = (dataUrl: string, filename: string): File => {
    const arr = dataUrl.split(',');
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error("Invalid data URL: MIME type not found.");
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while (n--) {
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, { type: mime });
};

/**
 * Converts a File to a base64 encoded string (without the data URL prefix).
 * @param file The file to convert.
 * @returns A promise that resolves with the base64 string.
 */
export const fileToBase64 = (file: File): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
        if (typeof reader.result === 'string') {
            resolve(reader.result.split(',')[1]);
        } else {
            reject(new Error('Failed to read file as base64 string.'));
        }
    };
    reader.onerror = error => reject(error);
  });
};

/**
 * Gets the MIME type from a data URL.
 * @param dataUrl The data URL.
 * @returns The MIME type string.
 */
export const getMimeTypeFromDataUrl = (dataUrl: string): string => {
    const mimeMatch = dataUrl.match(/data:(.*?);/);
    if (!mimeMatch) {
        throw new Error("Invalid data URL: MIME type not found.");
    }
    return mimeMatch[1];
};

/**
 * Creates a placeholder image with a solid color and specific aspect ratio.
 * @param aspectRatio The desired aspect ratio (e.g., '1:1', '16:9').
 * @param color The background color of the placeholder.
 * @returns A data URL string of the generated image.
 */
export const createPlaceholderImage = (aspectRatio: '1:1' | '3:4' | '4:3' | '9:16' | '16:9', color: string): string => {
    const [w, h] = aspectRatio.split(':').map(Number);
    // Use a small base size for efficiency
    const canvasWidth = w * 100;
    const canvasHeight = h * 100;

    const canvas = document.createElement('canvas');
    canvas.width = canvasWidth;
    canvas.height = canvasHeight;
    const ctx = canvas.getContext('2d');
    
    if (ctx) {
        ctx.fillStyle = color;
        ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    }
    
    return canvas.toDataURL('image/png');
};