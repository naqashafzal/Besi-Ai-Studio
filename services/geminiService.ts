import { GenerativePart } from '../types';
import { supabase } from '../lib/supabaseClient';

// Generates an image by calling our Supabase Edge Function
export const generateImage = async (
    prompt: string, 
    baseImage: GenerativePart, 
    styleImage: GenerativePart | null
): Promise<string[]> => {
    try {
        const { data, error } = await supabase.functions.invoke('generate-image', {
            body: { prompt, baseImage, styleImage },
        });

        if (error) {
            // The error object might contain more specific details
            const errorMessage = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : `Supabase function 'generate-image' failed.`;
            throw new Error(errorMessage);
        }

        if (data.imageUrls && data.imageUrls.length > 0) {
            return data.imageUrls;
        }
        
        throw new Error("Image generation completed, but no image was returned from the server.");

    } catch (error) {
        console.error("Error invoking Supabase function for image generation:", error);
        if (error instanceof Error) {
          throw new Error(`Image generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during image generation.");
    }
};

// Generates a text prompt by calling our Supabase Edge Function
export const generatePromptFromImage = async (image: GenerativePart): Promise<string> => {
    try {
        const { data, error } = await supabase.functions.invoke('generate-prompt', {
            body: { image },
        });
        
        if (error) {
            const errorMessage = typeof error === 'object' && error !== null && 'message' in error ? (error as any).message : `Supabase function 'generate-prompt' failed.`;
            throw new Error(errorMessage);
        }
        
        if (data.prompt) {
            return data.prompt;
        }

        throw new Error("Prompt generation completed, but no text was returned from the server.");

    } catch (error) {
        console.error("Error invoking Supabase function for prompt generation:", error);
        if (error instanceof Error) {
            throw new Error(`Prompt generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during prompt generation.");
    }
};