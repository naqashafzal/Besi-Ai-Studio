

import { GoogleGenAI, Modality, Chat } from "@google/genai";
import { GenerativePart } from '../types';

if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// Creates a new chat session
export const createChat = (): Chat => {
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: "You are a helpful and friendly AI assistant for the BestAI Portrait Generator app. Your goal is to assist users. You can suggest creative prompts, explain features, and answer questions about the app. Keep your answers concise and friendly. When asked for a prompt, provide it in a way that the user can directly copy and use. You cannot generate images yourself."
        }
    });
};

// Generates a text prompt from an image
export const generatePromptFromImage = async (
    image: GenerativePart, 
    focus: {
        realism: boolean;
        style: boolean;
        background: boolean;
        clothing: boolean;
        lighting: boolean;
    },
    keywords: string
): Promise<string> => {
    try {
        const systemInstruction = `You are a world-class AI prompt engineer, specializing in creating hyper-realistic and detailed prompts for advanced image generation models. Your task is to analyze a user-provided image and generate a new, masterfully crafted prompt that describes a scene based on that image and the user's focus points.

**Core Principles:**
1.  **Photorealism is Key:** Every prompt must aim for the highest degree of realism. Describe textures, materials, subtle imperfections, and how light interacts with surfaces.
2.  **Structured Output:** Follow this strict format: [Subject/Action], [Attire], [Setting/Background], [Lighting], [Camera/Composition], [Style/Mood].
3.  **Focus on Transformation, Not Duplication:** You are describing a *new scene* inspired by the image, not just listing what's in it.
4.  **NEVER Describe Identity:** Do not mention the person's physical characteristics (age, race, gender, specific facial features). The prompt's primary function is to build a world *around* the person from the photo.
5.  **Mandatory Subject Instruction:** Every prompt MUST include an explicit instruction to use the person from the uploaded base photo. The instruction MUST state to "strictly use the face, expression, and all facial details from the uploaded base photo." This is the most critical rule.

**Example of High-Quality Output:**
"A professional corporate headshot of a person, where you must strictly use the face, expression, and all facial details from the uploaded base photo. They are wearing a sharp, dark navy suit with a crisp white shirt. The background is a modern, softly blurred office environment with architectural lines and hints of natural light. The lighting is a soft, diffused three-point studio setup, creating a gentle key light on the face and eliminating harsh shadows. Close-up shot, captured with a DSLR and an 85mm f/1.4 lens, resulting in a shallow depth of field. The style is professional, confident, and clean."`;

        let userInstruction = "Generate a new prompt based on the image provided.";

        const focusMapping = {
            realism: "photorealistic details, textures, and imperfections",
            style: "the overall style and mood",
            background: "the background and setting",
            clothing: "the clothing and attire",
            lighting: "the lighting details",
        };
        
        const selectedFocus = (Object.keys(focus) as Array<keyof typeof focus>)
            .filter((key) => focus[key])
            .map((key) => focusMapping[key]);

        if (selectedFocus.length > 0) {
            userInstruction += ` The prompt should primarily describe ${selectedFocus.join(' and ')}.`;
        }

        if (keywords.trim()) {
            userInstruction += ` Incorporate these artistic keywords: "${keywords.trim()}".`;
        }
            
        userInstruction += ` Your response must ONLY be the prompt text itself, with no extra conversational text or explanations.`;


        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: {
                parts: [
                    { inlineData: { data: image.data, mimeType: image.mimeType } },
                    { text: userInstruction },
                ],
            },
             config: {
                systemInstruction: systemInstruction,
            },
        });
        return response.text.trim();
    } catch (error) {
        console.error("Error generating prompt from image:", error);
        if (error instanceof Error) {
          throw new Error(`Prompt generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during prompt generation.");
    }
};


// Generates an image using the Gemini API by editing a reference image
export const generateImage = async (
    prompt: string, 
    baseImage: GenerativePart,
    imageSize: '1024' | '2048' = '1024',
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' = '1:1'
): Promise<string[]> => {
    try {
        let finalPrompt = prompt;
        if (imageSize === '2048') {
            finalPrompt = `${prompt}, high resolution, 4K, ultra-detailed, 2048x2048 pixels`;
        }

        // Add aspect ratio instruction if not default, as this model doesn't have a direct parameter.
        if (aspectRatio !== '1:1') {
            finalPrompt = `${finalPrompt}. The final image must have a ${aspectRatio} aspect ratio.`;
        }


        const parts: ({ inlineData: { data: string; mimeType: string; } } | { text: string; })[] = [
            { inlineData: { data: baseImage.data, mimeType: baseImage.mimeType } },
            { text: finalPrompt },
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: parts,
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imageParts: string[] = [];
        let textPart = "";
        
        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData?.data) {
                const base64ImageBytes = part.inlineData.data;
                imageParts.push(`data:${part.inlineData.mimeType};base64,${base64ImageBytes}`);
            }
            if (part.text) {
                textPart = part.text;
            }
        }

        if (imageParts.length > 0) {
            return imageParts;
        }

        if (textPart) {
            throw new Error(`Image generation failed: ${textPart}`);
        }
        
        throw new Error("Image generation completed, but no image was returned from the model.");
        
    } catch (error) {
        console.error("Error generating image:", error);
        if (error instanceof Error) {
          throw new Error(`Image generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during image generation.");
    }
};

// Generates an image with two people from two reference images
export const generateMultiPersonImage = async (
    prompt: string, 
    baseImage1: GenerativePart,
    baseImage2: GenerativePart,
    imageSize: '1024' | '2048' = '1024',
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' = '1:1'
): Promise<string[]> => {
    try {
        let finalPrompt = `Using the two people from the two separate uploaded images, place them together in a new scene. The scene should be: "${prompt}". The final image must be a cohesive single scene.`;

        if (imageSize === '2048') {
            finalPrompt = `${finalPrompt}, high resolution, 4K, ultra-detailed, 2048x2048 pixels`;
        }

        if (aspectRatio !== '1:1') {
            finalPrompt = `${finalPrompt}. The final image must have a ${aspectRatio} aspect ratio.`;
        }

        const parts = [
            { inlineData: { data: baseImage1.data, mimeType: baseImage1.mimeType } },
            { inlineData: { data: baseImage2.data, mimeType: baseImage2.mimeType } },
            { text: finalPrompt },
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: {
                parts: parts,
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });

        const imageParts: string[] = [];
        let textPart = "";
        
        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData?.data) {
                const base64ImageBytes = part.inlineData.data;
                imageParts.push(`data:${part.inlineData.mimeType};base64,${base64ImageBytes}`);
            }
            if (part.text) {
                textPart = part.text;
            }
        }

        if (imageParts.length > 0) {
            return imageParts;
        }

        if (textPart) {
            throw new Error(`Image generation failed: ${textPart}`);
        }
        
        throw new Error("Image generation completed, but no image was returned from the model.");

    } catch (error) {
        console.error("Error generating multi-person image:", error);
        if (error instanceof Error) {
          throw new Error(`Image generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during image generation.");
    }
};

const sleep = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

// Generates a video from a text prompt and an optional image
export const generateVideo = async (
    prompt: string, 
    baseImage: GenerativePart | null
): Promise<string> => {
    try {
        let operation;
        if (baseImage) {
            operation = await ai.models.generateVideos({
                model: 'veo-2.0-generate-001',
                prompt: prompt,
                image: {
                    imageBytes: baseImage.data,
                    mimeType: baseImage.mimeType,
                },
                config: {
                    numberOfVideos: 1
                }
            });
        } else {
            operation = await ai.models.generateVideos({
                model: 'veo-2.0-generate-001',
                prompt: prompt,
                config: {
                    numberOfVideos: 1
                }
            });
        }

        while (!operation.done) {
            await sleep(10000); // Poll every 10 seconds
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        
        if (!downloadLink) {
            throw new Error("Video generation completed, but no video was returned from the model.");
        }
        
        return downloadLink;

    } catch (error) {
        console.error("Error generating video:", error);
        if (error instanceof Error) {
          throw new Error(`Video generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during video generation.");
    }
};
