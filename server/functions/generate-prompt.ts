// This file represents a backend serverless function (e.g., on Vercel, Netlify, or Google Cloud Functions)
// The route for this function would be configured to `/api/generate-prompt`

import { GoogleGenAI } from "@google/genai";
import type { GenerativePart } from '../../types';

// The API key is now securely stored as an environment variable on the server
if (!process.env.API_KEY) {
    throw new Error("API_KEY environment variable not set on the server");
}

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });

// This is the handler for your API endpoint
export default async function handler(request: Request) {
    if (request.method !== 'POST') {
        return new Response(JSON.stringify({ error: 'Method not allowed' }), {
            status: 405,
            headers: { 'Content-Type': 'application/json' },
        });
    }

    try {
        const { image } = (await request.json()) as { image: GenerativePart };
        
        if (!image) {
            return new Response(JSON.stringify({ error: 'Missing image data' }), {
                status: 400,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        const textPart = {
            text: 'Analyze this image and generate a concise, descriptive prompt suitable for an AI image generator to recreate it. The prompt should capture the essence of the subject, setting, style, and lighting. Do not mention the person\'s race or ethnicity. Do not include any introductory phrases or explanations. Output only the prompt text.',
        };
        const imagePart = {
            inlineData: {
                mimeType: image.mimeType,
                data: image.data,
            },
        };

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash',
            contents: { parts: [textPart, imagePart] },
        });
        
        const text = response.text;
        if (text) {
             return new Response(JSON.stringify({ prompt: text.trim() }), {
                status: 200,
                headers: { 'Content-Type': 'application/json' },
            });
        }

        throw new Error("Prompt generation completed, but no text was returned.");

    } catch (error) {
        console.error("Error in generate-prompt function:", error);
        const message = error instanceof Error ? error.message : "An unknown error occurred";
        return new Response(JSON.stringify({ error: message }), {
            status: 500,
            headers: { 'Content-Type': 'application/json' },
        });
    }
}
