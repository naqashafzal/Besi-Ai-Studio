import { GoogleGenAI, Modality, Chat } from "@google/genai";
import { GenerativePart } from '../types';

// Use a placeholder key. The actual key is added by the server proxy.
// The service worker intercepts the request and forwards it to our proxy.
const ai = new GoogleGenAI({ apiKey: "DUMMY_API_KEY" });

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
        pose: boolean;
        realism: boolean;
        style: boolean;
        background: boolean;
        clothing: boolean;
        lighting: boolean;
    },
    keywords: string
): Promise<string> => {
    try {
        const systemInstruction = `You are a world-class AI prompt engineer with an expert eye for visual detail. Your sole task is to meticulously analyze a user-provided image and generate a masterfully crafted, highly detailed prompt that describes the image with extreme precision. The generated prompt should allow another AI to recreate the image as closely as possible, focusing on photorealism and accuracy.

**Core Principles:**
1.  **Strict Description, Not Interpretation:** Your goal is to describe what is present in the image, not to interpret or transform it. Generate a prompt that serves as a blueprint for recreating the original image.
2.  **Exact Replication of Elements:** You MUST analyze and precisely describe the following key elements from the source image. Be specific and detailed.
    *   **Pose:** The subject's exact posture, body language, facial expression, and action.
    *   **Style:** The exact mood, genre, and aesthetic (e.g., cinematic, vintage, professional headshot).
    *   **Clothing & Attire:** The exact type, style, color, texture of the clothing, and any accessories.
    *   **Environment & Background:** The setting, background details, dominant shapes, and overall composition.
    *   **Lighting:** The precise quality, direction, and color of the light (e.g., soft studio light, hard side light, golden hour sunlight).
    *   **Camera & Composition:** The camera angle, shot type (e.g., close-up, medium shot, full-body shot), lens characteristics (e.g., shallow depth of field, wide-angle), and overall framing.
3.  **Photorealism is Paramount:** Every part of the prompt must aim for the highest degree of realism. Describe textures, materials, subtle imperfections, and how light interacts with surfaces.
4.  **Structured Output:** Follow this strict format for your output: \`[Subject/Action including Pose], [Attire/Clothing & Key Elements], [Setting/Environment & Background], [Lighting], [Camera/Composition], [Style/Mood].\`
5.  **NEVER Describe Identity or Facial Features:** You must NOT mention the person's physical characteristics. This includes age, race, gender, specific facial features like eye color, hair style, or any facial hair like beards or mustaches. The prompt builds a world *around* the person, relying entirely on the base photo for all facial information.
6.  **Mandatory Subject Instruction:** Every prompt MUST include the explicit instruction: "strictly use the face, expression, and all facial details from the uploaded base photo." This is the most critical rule.

**Example of High-Quality Output:**
"A professional corporate headshot of a person, where you must strictly use the face, expression, and all facial details from the uploaded base photo. The subject is posed with a confident, slight lean forward, head turned slightly to the left. They are wearing a sharp, dark navy suit with a crisp white shirt. The background is a modern, softly blurred office environment with strong vertical architectural lines. The lighting is a soft, diffused three-point studio setup, creating a gentle key light on the face. Close-up shot, captured with an 85mm lens at f/1.4, resulting in a shallow depth of field. The style is professional, confident, and clean."`;

        let userInstruction = "Generate a new prompt based on the image provided.";

        const focusMapping = {
            pose: "the subject's pose and action",
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
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' = '1:1',
    fidelity: 'creative' | 'fidelity' = 'creative',
    useCannyEdges: boolean = false
): Promise<string[]> => {
    try {
        let finalPrompt = '';
        const facialInstruction = "It is absolutely critical that you strictly use the face, expression, and all facial details from the uploaded base photo. Do not alter the subject's age, race, gender, or any physical characteristics. The original person must be perfectly preserved.";

        if (useCannyEdges) {
            finalPrompt = `INSTRUCTION: This is a high-priority Canny Edges task. You MUST apply Canny edge detection to the base photo to create a precise edge map. This edge map is a strict boundary. Your task is to use this map to perfectly and unalterably preserve the exact pose, composition, shape, and all structural details of the subject and their clothing. You are only permitted to change the style and texture as described in the user's prompt, rendered *within* these locked Canny edges. Any deviation from the edge map is a failure. ${facialInstruction}\nUSER PROMPT: "${prompt}"`;
        } else if (fidelity === 'creative') {
            finalPrompt = `INSTRUCTION: Creatively transform the provided image based on the user's prompt. ${facialInstruction}\nUSER PROMPT: "${prompt}"`;
        } else { // fidelity mode
            finalPrompt = `INSTRUCTION: Your highest priority is to maintain absolute fidelity to the provided base photo. You must EXACTLY replicate the pose, body shape, lighting, style, composition, and camera distance. The user's prompt should be interpreted as a minor stylistic adjustment or element addition ONLY. Do not change the core essence of the image. ${facialInstruction}\nUSER EDIT: "${prompt}"`;
        }

        if (aspectRatio !== '1:1') {
            finalPrompt += `\nASPECT RATIO: ${aspectRatio}`;
        }

        if (imageSize === '2048') {
            finalPrompt += `\nQUALITY: High resolution, 4K, ultra-detailed, 2048x2048 pixels.`;
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
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' = '1:1',
    styleReferenceImage: GenerativePart | null
): Promise<string[]> => {
    try {
        const facialInstruction = "It is absolutely critical that you strictly use the face, expression, and all facial details of BOTH people from their respective base photos (the first two images). Do not alter their age, race, gender, or any physical characteristics. The original people must be perfectly preserved.";
        let finalPrompt = '';

        const parts: ({ inlineData: { data: string; mimeType: string; } } | { text: string; })[] = [
            { inlineData: { data: baseImage1.data, mimeType: baseImage1.mimeType } }, // Person 1
            { inlineData: { data: baseImage2.data, mimeType: baseImage2.mimeType } }, // Person 2
        ];

        if (styleReferenceImage) {
            finalPrompt = `INSTRUCTION: This is an advanced multi-person style transfer task. You have been provided with three images. The first two images contain Person A and Person B respectively. The third image is a style reference. Your task is to generate a new image that places Person A and Person B into a scene described by the user's prompt. You MUST adopt the overall style, composition, mood, lighting, and background from the third style reference image. CRITICAL: You MUST IGNORE the people in the style reference image; only use its aesthetic qualities. ${facialInstruction}\nUSER PROMPT: "${prompt}"`;
            parts.push({ inlineData: { data: styleReferenceImage.data, mimeType: styleReferenceImage.mimeType } }); // Style Reference
        } else {
            finalPrompt = `INSTRUCTION: Combine the two people from the two separate uploaded images into one cohesive scene described by the user prompt. ${facialInstruction}\nUSER PROMPT: "${prompt}"`;
        }

        if (aspectRatio !== '1:1') {
            finalPrompt += `\nASPECT RATIO: ${aspectRatio}`;
        }

        if (imageSize === '2048') {
            finalPrompt += `\nQUALITY: High resolution, 4K, ultra-detailed, 2048x2048 pixels.`;
        }

        parts.push({ text: finalPrompt });

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
    baseImage: GenerativePart | null,
    aspectRatio: '16:9' | '9:16' | '1:1',
    motionLevel: number,
    seed: number
): Promise<string> => {
    try {
        const videoConfig: any = {
            numberOfVideos: 1,
            aspectRatio: aspectRatio,
            motionLevel: motionLevel,
        };

        if (seed > 0) {
            videoConfig.seed = seed;
        }

        let operation;
        if (baseImage) {
            operation = await ai.models.generateVideos({
                model: 'veo-2.0-generate-001',
                prompt: prompt,
                image: {
                    imageBytes: baseImage.data,
                    mimeType: baseImage.mimeType,
                },
                config: videoConfig
            });
        } else {
            operation = await ai.models.generateVideos({
                model: 'veo-2.0-generate-001',
                prompt: prompt,
                config: videoConfig
            });
        }

        while (!operation.done) {
            await sleep(10000); // Poll every 10 seconds
            operation = await ai.operations.getVideosOperation({ operation: operation });
        }

        if (operation.error) {
            console.error("Video generation operation failed:", operation.error);
            throw new Error(operation.error.message || `Video generation failed with code ${operation.error.code}.`);
        }

        const downloadLink = operation.response?.generatedVideos?.[0]?.video?.uri;
        
        if (!downloadLink) {
            console.error("Video generation completed without a download link. Full operation object:", JSON.stringify(operation, null, 2));
            throw new Error("Video generation completed, but no video was returned from the model.");
        }
        
        // The service worker will intercept this fetch and route it through our proxy.
        // The proxy will add the API key.
        const response = await fetch(downloadLink);
        if (!response.ok) {
            const errorText = await response.text();
            throw new Error(`Failed to download video file. Server responded with ${response.status}: ${errorText}`);
        }

        const videoBlob = await response.blob();
        // Create a local URL for the video blob to be used in the <video> tag.
        const blobUrl = URL.createObjectURL(videoBlob);
        
        return blobUrl;

    } catch (error) {
        console.error("Error generating video:", error);
        if (error instanceof Error) {
          throw new Error(`Video generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during video generation.");
    }
};