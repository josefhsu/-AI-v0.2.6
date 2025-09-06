// Helper to convert dataURL to File object
export const dataURLtoFile = (dataurl: string, filename: string): File => {
    const arr = dataurl.split(',');
    // Check if the data URL format is valid
    if (arr.length < 2) {
        throw new Error('Invalid data URL format');
    }
    const mimeMatch = arr[0].match(/:(.*?);/);
    if (!mimeMatch) {
        throw new Error('Could not parse MIME type from data URL');
    }
    const mime = mimeMatch[1];
    const bstr = atob(arr[1]);
    let n = bstr.length;
    const u8arr = new Uint8Array(n);
    while(n--){
        u8arr[n] = bstr.charCodeAt(n);
    }
    return new File([u8arr], filename, {type:mime});
}

// Helper to download an image from a data URL
export const downloadImage = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
};

/**
 * Crops an image from its center to a target aspect ratio.
 * @param base64Src The base64 source of the image.
 * @param targetAspectRatio The desired aspect ratio string (e.g., '16:9').
 * @returns A promise that resolves to the new, cropped base64 data URL.
 */
export const cropImageToAspectRatio = (base64Src: string, targetAspectRatio: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        const img = new Image();
        img.onload = () => {
            const [targetW, targetH] = targetAspectRatio.split(':').map(Number);
            const targetRatio = targetW / targetH;
            
            const srcW = img.width;
            const srcH = img.height;
            const srcRatio = srcW / srcH;

            let cropW = srcW;
            let cropH = srcH;

            if (srcRatio > targetRatio) {
                // Source is wider than target, crop width
                cropW = srcH * targetRatio;
            } else if (srcRatio < targetRatio) {
                // Source is taller than target, crop height
                cropH = srcW / targetRatio;
            }

            const cropX = (srcW - cropW) / 2;
            const cropY = (srcH - cropH) / 2;

            const canvas = document.createElement('canvas');
            canvas.width = cropW;
            canvas.height = cropH;
            const ctx = canvas.getContext('2d');

            if (!ctx) {
                return reject(new Error('Could not get canvas context'));
            }

            ctx.drawImage(
                img,
                cropX,
                cropY,
                cropW,
                cropH,
                0,
                0,
                cropW,
                cropH
            );

            resolve(canvas.toDataURL('image/png'));
        };
        img.onerror = (err) => reject(err);
        img.src = base64Src;
    });
};

/**
 * Detects the user's operating system.
 * @returns 'mac', 'windows', or 'mobile'.
 */
export const getOS = (): 'mac' | 'windows' | 'mobile' => {
  const { userAgent, platform } = navigator;

  if (/Mobi|Android|iPhone|iPad|iPod/i.test(userAgent)) {
    return 'mobile';
  }
  if (/Mac/i.test(platform)) {
    return 'mac';
  }
  return 'windows';
};
