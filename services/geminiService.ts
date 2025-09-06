import { GoogleGenAI, Part, Modality, Type } from '@google/genai';
import type { AspectRatio } from '../types';

// FIX: Initialize GoogleGenAI with process.env.API_KEY as per the guidelines.
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

/**
 * Converts a File object to a GoogleGenerativeAI.Part object.
 * @param file The file to convert.
 * @returns A promise that resolves to a Part object.
 */
export const fileToGenerativePart = async (file: File): Promise<Part> => {
    const base64EncodedDataPromise = new Promise<string>((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
            if (typeof reader.result === 'string') {
                // The result includes the data URL prefix (e.g., "data:image/png;base64,"),
                // which needs to be removed.
                resolve(reader.result.split(',')[1]);
            } else {
                reject(new Error("Failed to read file as data URL."));
            }
        };
        reader.onerror = (error) => reject(error);
        reader.readAsDataURL(file);
    });

    return {
        inlineData: {
            data: await base64EncodedDataPromise,
            mimeType: file.type,
        },
    };
};


/**
 * Generates images using Gemini. Handles both text-to-image and image-to-image.
 * @param prompt Text prompt.
 * @param numImages Number of images to generate (for text-to-image).
 * @param aspectRatio Desired aspect ratio (for text-to-image).
 * @param referenceImageParts Array of reference image parts for image-to-image.
 * @returns A promise that resolves to an array of base64 image strings.
 */
export const generateImagesWithGemini = async (
    prompt: string,
    numImages: number,
    aspectRatio: AspectRatio,
    referenceImageParts: Part[]
): Promise<string[]> => {
    try {
        if (referenceImageParts && referenceImageParts.length > 0) {
            // This is an image editing/inspiration task using gemini-2.5-flash-image-preview
            const contents = {
                parts: [...referenceImageParts, { text: prompt }]
            };
            const response = await ai.models.generateContent({
                model: 'gemini-2.5-flash-image-preview',
                contents,
                config: {
                    responseModalities: [Modality.IMAGE, Modality.TEXT],
                },
            });
            
            const imageParts = response.candidates?.[0]?.content?.parts.filter(part => part.inlineData) ?? [];
            if (imageParts.length === 0) {
                const textResponse = response.text?.trim();
                if (textResponse) {
                    throw new Error(`Model returned a text response instead of an image: "${textResponse}"`);
                }
                throw new Error("Image editing failed: The model did not return an image.");
            }
            return imageParts.map(part => part.inlineData!.data);

        } else {
            // This is a pure text-to-image generation task using imagen-4.0-generate-001
            const response = await ai.models.generateImages({
                model: 'imagen-4.0-generate-001',
                prompt,
                config: {
                    numberOfImages: numImages,
                    aspectRatio: aspectRatio ?? '1:1',
                    outputMimeType: 'image/png',
                },
            });
            return response.generatedImages.map(img => img.image.imageBytes);
        }
    } catch (error) {
        console.error("Error in generateImagesWithGemini:", error);
        if (error instanceof Error) {
            throw new Error(`Image generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during image generation.");
    }
};

/**
 * Removes the background from an image.
 * @param base64ImageData The base64 encoded image data.
 * @param mimeType The MIME type of the image.
 * @param addGreenScreen Whether to add a green screen background.
 * @returns A promise that resolves to the processed image data.
 */
export const removeBackground = async (
    base64ImageData: string,
    mimeType: string,
    addGreenScreen: boolean
): Promise<{ image: string | null; text: string | null }> => {
    const prompt = addGreenScreen
        ? "Remove the background and replace it with a solid green screen (hex #00ff00). Keep the subject perfectly intact and centered."
        : "Remove the background completely, leaving only the main subject with a transparent background. Do not add any new background.";

    const imagePart: Part = {
        inlineData: {
            data: base64ImageData,
            mimeType: mimeType,
        },
    };
    
    const contents = { parts: [imagePart, { text: prompt }] };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents,
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        }
    });

    const resultImagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);
    const resultTextPart = response.candidates?.[0]?.content?.parts.find(part => part.text);

    return {
        image: resultImagePart?.inlineData?.data ?? null,
        text: resultTextPart?.text ?? null,
    };
};

/**
 * Optimizes a user's prompt for better image generation results.
 * @param prompt The user's prompt.
 * @returns A promise that resolves to an optimized prompt string.
 */
export const optimizePromptWithGemini = async (prompt: string): Promise<string> => {
    const systemInstruction = "You are an expert prompt engineer for generative AI image models. Your task is to take a user's simple prompt and expand it into a rich, detailed, and vivid prompt that will generate a high-quality, visually stunning image. Focus on adding details about subject, style, lighting, composition, and mood. The output should be only the optimized prompt, in a single line of comma-separated keywords and phrases, in Traditional Chinese. Do not add any conversational text or explanations.";
    
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `Optimize this prompt in Traditional Chinese: "${prompt}"`,
        config: {
            systemInstruction: systemInstruction,
            temperature: 0.8,
            topP: 0.9,
        },
    });

    return response.text.trim().replace(/^"|"$/g, ''); // Remove potential quotes
};

/**
 * Upscales an image to a higher resolution.
 * @param base64ImageData The base64 encoded image data.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the upscaled base64 image string.
 */
export const upscaleImageWithGemini = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const prompt = "Upscale this image to a higher resolution, enhancing details and clarity without altering the content. The output should be a crisper, more detailed version of the original image.";
    
    const imagePart: Part = {
        inlineData: {
            data: base64ImageData,
            mimeType: mimeType,
        },
    };

    const contents = { parts: [imagePart, { text: prompt }] };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents,
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    const resultImagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);

    if (!resultImagePart || !resultImagePart.inlineData?.data) {
        const textResponse = response.text?.trim();
        if (textResponse) {
            throw new Error(`Upscaling failed: ${textResponse}`);
        }
        throw new Error("Upscaling failed: The model did not return an image.");
    }
    
    return resultImagePart.inlineData.data;
};

/**
 * Enhances a webcam image by adjusting brightness, contrast, and color.
 * @param base64ImageData The base64 encoded image data from the webcam.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the enhanced base64 image string.
 */
export const enhanceWebcamImage = async (base64ImageData: string, mimeType: string): Promise<string> => {
    const prompt = "Enhance this webcam photo. Adjust brightness, contrast, and color balance for a more natural, well-lit, and clear image. Reduce noise if present. Do not crop or alter the composition.";
    
    const imagePart: Part = {
        inlineData: {
            data: base64ImageData,
            mimeType: mimeType,
        },
    };

    const contents = { parts: [imagePart, { text: prompt }] };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents,
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });
    
    const resultImagePart = response.candidates?.[0]?.content?.parts.find(part => part.inlineData);

    if (!resultImagePart || !resultImagePart.inlineData?.data) {
        const textResponse = response.text?.trim();
        if (textResponse) {
            throw new Error(`Image enhancement failed: ${textResponse}`);
        }
        throw new Error("Image enhancement failed: The model did not return an image.");
    }
    
    return resultImagePart.inlineData.data;
};

/**
 * Analyzes the aesthetics of an image and provides a score and critique.
 * @param imagePart The image to analyze as a GoogleGenerativeAI.Part.
 * @returns A promise that resolves to an object with a score and analysis.
 */
export const analyzeImageAesthetics = async (imagePart: Part): Promise<{ score: string; analysis: string; }> => {
    const prompt = "Act as an expert art critic. Analyze this image for its aesthetic qualities. Provide a score out of 10 (e.g., '8.5/10') and a concise analysis covering composition, color, lighting, subject, and overall style. Respond in Traditional Chinese.";

    const contents = { parts: [imagePart, { text: prompt }] };

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents,
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.STRING, description: 'The aesthetic score out of 10, e.g., "8.5/10".' },
                    analysis: { type: Type.STRING, description: 'A detailed critique of the image in Traditional Chinese.' },
                },
                propertyOrdering: ["score", "analysis"],
            },
        },
    });

    try {
        const jsonString = response.text.trim();
        const result = JSON.parse(jsonString);
        return {
            score: result.score || "N/A",
            analysis: result.analysis || "No analysis provided."
        };
    } catch (e) {
        console.error("Failed to parse AI analysis response:", e);
        throw new Error("The AI provided an invalid analysis format.");
    }
};
