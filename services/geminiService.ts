
import { GoogleGenAI, Part, Modality, Type } from "@google/genai";
import { fileToBase64 } from '../utils';
import { SUBJECTS, BACKGROUNDS, ACTIONS_POSES, EMOTIONS, CLOTHING, DETAILS_OBJECTS, ART_STYLES, LIGHTING, COMPOSITIONS, TONES_TEXTURES, API_SUPPORTED_ASPECT_RATIOS } from '../constants';
import type { AspectRatio } from "../types";


// Initialize the Google Gemini AI client
const ai = new GoogleGenAI({ apiKey: process.env.API_KEY! });

/**
 * Converts a File object to a Gemini GenerativePart object.
 * @param file The file to convert.
 * @returns A promise that resolves to a GenerativePart object.
 */
export async function fileToGenerativePart(file: File): Promise<Part> {
    const base64EncodedData = await fileToBase64(file);
    return {
        inlineData: {
            data: base64EncodedData,
            mimeType: file.type,
        },
    };
}

/**
 * Generates images using the Gemini API.
 * @param prompt The text prompt for image generation.
 * @param imageParts An array of reference image parts.
 * @param selectedAspectRatio The desired aspect ratio for the generated images.
 * @returns A promise that resolves to an array of base64 encoded image strings.
 */
export const generateImagesWithGemini = async (
    prompt: string,
    imageParts: Part[],
    selectedAspectRatio: AspectRatio
): Promise<string[]> => {
    
    // The Imagen API has a limited set of supported aspect ratios.
    // We find the closest supported ratio if the selected one isn't directly supported.
    const aspectRatio = API_SUPPORTED_ASPECT_RATIOS.includes(selectedAspectRatio) ? selectedAspectRatio : "1:1";

    const contents = imageParts.length > 0
        ? { parts: [...imageParts, { text: prompt }] }
        : prompt;

    // Use generateContent for multimodal prompts (text + image)
    if (imageParts.length > 0) {
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview', // Use the image editing model for multimodal input
            contents: contents,
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            }
        });

        const imagePartsFromResponse = response.candidates?.[0]?.content?.parts.filter(part => part.inlineData);
        if (imagePartsFromResponse && imagePartsFromResponse.length > 0) {
            return imagePartsFromResponse.map(part => part.inlineData!.data);
        }
        throw new Error("Image generation with reference failed to produce an image.");

    } else {
        // Use generateImages for text-only prompts
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: prompt,
            config: {
                numberOfImages: 4, // Let's generate 4 images at a time
                outputMimeType: 'image/png',
                aspectRatio: aspectRatio as "1:1" | "3:4" | "4:3" | "9:16" | "16:9",
            },
        });
    
        if (response.generatedImages && response.generatedImages.length > 0) {
            return response.generatedImages.map(img => img.image.imageBytes);
        }
    }
    
    throw new Error("Image generation failed to produce any images.");
};


/**
 * Removes the background from an image using Gemini.
 * @param base64 The base64 encoded image data.
 * @param mimeType The MIME type of the image.
 * @param addGreenScreen Whether to add a green screen background.
 * @returns A promise that resolves to an object containing the new image base64 and any text response.
 */
export const removeBackground = async (
    base64: string,
    mimeType: string,
    addGreenScreen: boolean
): Promise<{ image: string | null; text: string | null }> => {
    const promptText = addGreenScreen
        ? "Remove the background of this image and replace it with a solid green screen (#00FF00). Keep the subject perfectly intact."
        : "Remove the background of this image, making it transparent. Keep the subject perfectly intact.";

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                { inlineData: { data: base64, mimeType } },
                { text: promptText },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE, Modality.TEXT],
        },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) {
        throw new Error("Background removal failed: No response from model.");
    }
    
    const imagePart = candidate.content.parts.find(p => p.inlineData);
    const textPart = candidate.content.parts.find(p => p.text);

    return {
        image: imagePart?.inlineData?.data || null,
        text: textPart?.text || null,
    };
};

/**
 * Optimizes a user's prompt using Gemini.
 * @param prompt The prompt to optimize.
 * @returns A promise that resolves to the optimized prompt string.
 */
export const optimizePromptWithGemini = async (prompt: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: `You are an expert prompt engineer for text-to-image models.
        Rewrite the following user prompt to be more descriptive, vivid, and effective for generating a high-quality, detailed image.
        Focus on adding details about subject, style, lighting, and composition.
        Return ONLY the rewritten prompt, without any explanation or preamble.
        
        User prompt: "${prompt}"
        
        Optimized prompt:`,
    });

    return response.text.trim();
};

/**
 * Upscales an image using Gemini.
 * @param base64 The base64 encoded image data.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the base64 encoded upscaled image string.
 */
export const upscaleImageWithGemini = async (base64: string, mimeType: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                { inlineData: { data: base64, mimeType } },
                { text: "Upscale this image to a higher resolution, enhancing details and clarity without changing the content. Make it sharper and more defined." },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);

    if (imagePart?.inlineData?.data) {
        return imagePart.inlineData.data;
    }

    throw new Error("Upscaling failed to produce an image.");
};

/**
 * Analyzes the aesthetics of an image using Gemini.
 * @param imagePart The image part to analyze.
 * @returns A promise that resolves to an object with a score and detailed analysis.
 */
export const analyzeImageAesthetics = async (imagePart: Part): Promise<{ score: string; analysis: string }> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash',
        contents: {
            parts: [
                imagePart,
                { text: "You are an art critic. Analyze this image for its aesthetic qualities. Provide a score out of 100 and a brief analysis covering composition, lighting, color, and subject matter. Return the response as a JSON object with two keys: 'score' (string, e.g., '85/100') and 'analysis' (string)." },
            ]
        },
        config: {
            responseMimeType: "application/json",
            responseSchema: {
                type: Type.OBJECT,
                properties: {
                    score: { type: Type.STRING, description: "A score out of 100, e.g. '85/100'" },
                    analysis: { type: Type.STRING, description: "A brief analysis of the image's aesthetics." },
                },
                required: ["score", "analysis"],
            }
        },
    });

    const jsonString = response.text.trim();
    try {
        const result = JSON.parse(jsonString);
        if (result.score && result.analysis) {
            return result;
        }
        throw new Error("Invalid JSON format from analysis API.");
    } catch (e) {
        console.error("Failed to parse analysis JSON:", jsonString, e);
        throw new Error("Failed to analyze image aesthetics.");
    }
};

/**
 * Gets an inspiration prompt snippet.
 * @returns A promise that resolves to a string with an inspiration snippet.
 */
export const getInspiration = async (): Promise<string> => {
    const getRandom = (arr: string[]) => arr[Math.floor(Math.random() * arr.length)];
    const inspiration = [
        getRandom(SUBJECTS),
        getRandom(BACKGROUNDS),
        getRandom(ACTIONS_POSES),
        getRandom(EMOTIONS),
        getRandom(ART_STYLES),
        getRandom(LIGHTING),
    ].join(', ');
    return inspiration;
};


/**
 * Enhances a webcam image using Gemini.
 * @param base64 The base64 encoded image data from the webcam.
 * @param mimeType The MIME type of the image.
 * @returns A promise that resolves to the base64 encoded enhanced image string.
 */
export const enhanceWebcamImage = async (base64: string, mimeType: string): Promise<string> => {
    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: {
            parts: [
                { inlineData: { data: base64, mimeType } },
                { text: "This is a raw webcam photo. Please enhance it to look like a professionally shot portrait. Adjust lighting, color balance, and sharpness. Fix any minor blemishes. Do not change the person's features or the background." },
            ],
        },
        config: {
            responseModalities: [Modality.IMAGE],
        },
    });

    const imagePart = response.candidates?.[0]?.content?.parts.find(p => p.inlineData);

    if (imagePart?.inlineData?.data) {
        return imagePart.inlineData.data;
    }

    throw new Error("Webcam image enhancement failed.");
};
