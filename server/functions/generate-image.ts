// This file represents a backend serverless function (e.g., on Vercel, Netlify, or Google Cloud Functions)
// The route for this function would be configured to `/api/generate-image`

import { GoogleGenAI, Modality } from "@google/genai";
import type { GenerativePart } from '../../types';

// The API key is now securely stored as an environment variable on the server
if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set on the server");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

const REALISM_PROMPT_SUFFIX = " The final image must be a photorealistic photograph. Emphasize realistic lighting, textures, and details. Avoid any 3D, CGI, or cartoonish styles. The output must look like a real-life photo.";

// This is the handler for your API endpoint
export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { prompt, baseImage, styleImage } = (await request.json()) as {
            prompt: string;
            baseImage: GenerativePart;
            styleImage: GenerativePart | null;
        };
        
        if (!prompt || !baseImage) {
            return new Response(JSON.stringify({ error: 'Missing prompt or baseImage' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const enhancedPrompt = `${prompt}${REALISM_PROMPT_SUFFIX}`;

        const parts: ({ inlineData: { data: string; mimeType: string; } } | { text: string; })[] = [
            { inlineData: { data: baseImage.data, mimeType: baseImage.mimeType } },
        ];

        if (styleImage) {
            parts.push({ inlineData: { data: styleImage.data, mimeType: styleImage.mimeType } });
        }
        
        parts.push({ text: enhancedPrompt });

        // Using a stable, generally available model is recommended for production
        // Always check Google AI docs for the latest production-ready models.
        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview', // Replace with a stable model for production
            contents: {
                parts: parts,
            },
            config: {
                responseModalities: [Modality.IMAGE, Modality.TEXT],
            },
        });
        
        const imageUrls: string[] = [];
        for (const part of response.candidates?.[0]?.content?.parts ?? []) {
            if (part.inlineData?.data) {
                const base64ImageBytes = part.inlineData.data;
                imageUrls.push(`data:${part.inlineData.mimeType};base64,${base64ImageBytes}`);
            }
        }
        
        if (imageUrls.length > 0) {
            return new Response(JSON.stringify({ imageUrls }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        throw new Error("Image generation completed, but no image was returned from the model.");

    } catch (error) {
        console.error("Error in generate-image function:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred";
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
