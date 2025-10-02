import { GoogleGenAI, Modality, Chat } from "@google/genai";
import { GenerativePart, ArchitectureSuiteTool } from '../types';

// Use a placeholder key. The actual key is added by the server proxy.
// The service worker intercepts the request and forwards it to our proxy.
const ai = new GoogleGenAI({ apiKey: "DUMMY_API_KEY" });

// Creates a new chat session
export const createChat = (): Chat => {
    return ai.chats.create({
        model: 'gemini-2.5-flash',
        config: {
            systemInstruction: `You are a helpful and friendly AI assistant for the BestAI Portrait Generator app. Your goal is to be an expert guide for our users. You can suggest creative prompts, explain features, and answer questions about the app. Keep your answers concise and friendly. You cannot generate images yourself, but you can help users create the perfect prompt for their needs.

Here is key information about the app:

**Features:**
- **Single Person Mode:** Transform one photo. Offers 'Creative' mode for artistic changes and 'Fidelity' mode for more subtle edits. There's also a 'Canny Edges' option for strict pose replication.
- **Multi-person Mode:** Combine two people from two different photos into a single image. An optional third 'style reference' image can be used to guide the mood and background.
- **Video Generation:** An admin-only feature to create videos from a prompt and an optional image.
- **Image Quality:** Standard (1024px) is available to everyone. HD (2048px) is a Pro feature.
- **Aspect Ratios:** 1:1 is available to all users. Other ratios (16:9, 9:16, 4:3, 3:4) are exclusive to the Pro plan.
- **Prompt from Image:** An AI tool that analyzes an uploaded image to generate a detailed text prompt, which can then be edited and used.

**Credit Costs:**
- **Standard Image (1024px):** 10 credits
- **HD Image (2048px):** 20 credits (Pro feature)
- **Video Generation:** 250 credits (Admin feature)
- **Prompt from Image:** 2 credits
- **AI Assistant Chat:** 1 credit per message

**Plans & Pricing:**
- **Free Plan:** Perfect for trying us out! Users get 50 credits when they sign up. Visitors who don't sign up get a smaller number of credits daily.
- **Pro Plan:** The ultimate creative package. Costs about $5.99/month (price may vary by country) and includes 2500 monthly credits. Pro members unlock exclusive features like HD image generation, all aspect ratios, faster generation speeds, and priority access to new features.

**Contact Information:**
- For any support, questions, or feedback, users can reach out to the team via the contact form on the website or by emailing directly at support@bestai.website.

When a user asks about a feature, explain how it works. If they ask about limits or how to get more credits, explain the Free and Pro plans and gently encourage them to upgrade for the best experience. If they ask for help, provide the contact email.`
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
        dimension: boolean;
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
            dimension: "the camera angle, composition, and lens characteristics",
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


// Generates a scene description from a style reference image
export const generateSceneDescriptionFromImage = async (image: GenerativePart): Promise<string> => {
    try {
        const systemInstruction = `You are an expert art director and scene describer. Your task is to analyze the provided image and generate a rich, detailed description of its environment, mood, and style. This description will be used to create a new scene for different subjects.

**Core Principles:**
1.  **Focus on the Scene, Ignore the People:** You MUST completely ignore any people, figures, or characters in the image. Do not describe their pose, clothing, or faces. Your entire focus is on the environment.
2.  **Describe Key Elements:** Meticulously describe the following:
    *   **Environment & Background:** The setting (e.g., enchanted forest, futuristic city, cozy cafe), key background elements, and textures.
    *   **Lighting:** The quality, direction, and color of the light (e.g., dramatic backlighting, soft morning glow, neon city lights).
    *   **Style & Mood:** The overall aesthetic and feeling (e.g., cinematic fantasy, gritty cyberpunk, warm and nostalgic, professional studio portrait).
    *   **Color Palette:** The dominant colors and their interplay.
    *   **Composition:** General framing and compositional elements of the scene itself.
3.  **Output Format:** Provide the description as a cohesive paragraph, suitable for a text area. Example: 'At a beach during sunset, wearing casual summer clothes. The lighting is warm and golden. Style should be a candid, happy photograph.'
4.  **No Conversational Text:** Your response must ONLY be the descriptive text itself.`;
        
        const userInstruction = `Analyze this image and provide a scene description based on your system instructions.`;

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
        console.error("Error generating scene description from image:", error);
        if (error instanceof Error) {
          throw new Error(`Scene description generation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during scene description generation.");
    }
};

// Generates an image using the Gemini API by editing a reference image
export const generateImage = async (
    prompt: string, 
    baseImage: GenerativePart,
    imageSize: '1024' | '2048' = '1024',
    aspectRatio: '1:1' | '16:9' | '9:16' | '4:3' | '3:4' = '1:1',
    fidelity: 'creative' | 'fidelity' = 'creative',
    useCannyEdges: boolean = false,
    useStrictSizing: boolean = false
): Promise<string[]> => {
    try {
        let finalPrompt = '';
        const facialInstruction = "It is absolutely critical that you strictly use the face, expression, and all facial details from the uploaded base photo. Do not alter the subject's age, race, gender, or any physical characteristics. The original person must be perfectly preserved. Ensure the final image is clean and free of any watermarks, logos, timestamps, or graphical artifacts that may have been present in the original photo.";

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

        if (useStrictSizing) {
            finalPrompt += `\nSIZING: The output image must strictly adhere to the specified dimensions and aspect ratio. Do not crop the subject; fit the entire composition within the frame, letterboxing if necessary to preserve the composition.`;
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
    styleReferenceImage: GenerativePart | null,
    useStrictSizing: boolean = false
): Promise<string[]> => {
    try {
        const finalPrompt = `**Task: Advanced Photo Composition**
You are an expert photo composition AI. Your task is to composite the person from the first image ("Person 1") and the person from the second image ("Person 2") into a single, new, photorealistic scene. Follow the user's detailed instructions precisely.

**Core Directives:**
1.  **Identity Preservation (CRITICAL):** You must perfectly preserve the exact facial features, identity, expression, age, race, and gender of both individuals from their original source photos. DO NOT ALTER THEIR FACES. This is the most important rule.
2.  **Image Sources:**
    - The first image provided contains "Person 1".
    - The second image provided contains "Person 2".
    ${styleReferenceImage ? '- The third image is a STYLE REFERENCE. You must extract its aesthetic qualities (mood, lighting, color, background elements) and apply them to the new scene. CRITICALLY, YOU MUST IGNORE THE PEOPLE in the style reference image; do not use their faces or bodies.' : ''}
3.  **Follow User Prompt:** The user's prompt below provides specific instructions for placement, interaction, and the overall scene description. Adhere to it strictly.
4.  **Seamless Integration:** The final image must be photorealistic. Ensure lighting, shadows, and color grading are consistent across both individuals and the background to create a believable, unified image.
5.  **Artifact Removal:** The final image must be clean and free of any watermarks, logos, timestamps, or graphical artifacts that may have been present in the original photos.
---
**USER PROMPT:**
${prompt}
    `;
        const parts: ({ inlineData: { data: string; mimeType: string; } } | { text: string; })[] = [
            { inlineData: { data: baseImage1.data, mimeType: baseImage1.mimeType } }, // Person 1
            { inlineData: { data: baseImage2.data, mimeType: baseImage2.mimeType } }, // Person 2
        ];
        
        if (styleReferenceImage) {
            parts.push({ inlineData: { data: styleReferenceImage.data, mimeType: styleReferenceImage.mimeType } }); // Style Reference
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

// Restores an image based on selected options
export const restoreImage = async (
    baseImage: GenerativePart,
    options: {
        upscale: boolean;
        removeScratches: boolean;
        colorize: boolean;
        enhanceFaces: boolean;
    }
): Promise<string[]> => {
    try {
        let instructions: string[] = [];

        if (options.upscale) {
            instructions.push("Upscale this image to high resolution (4K). Enhance fine details, improve clarity, and sharpen the image without introducing artifacts.");
        }
        if (options.removeScratches) {
            instructions.push("Carefully remove any scratches, dust, tears, watermarks, logos, and blemishes from the photograph. Restore damaged areas seamlessly, preserving original textures.");
        }
        if (options.colorize) {
            instructions.push("Colorize this black and white photograph. Apply natural, realistic, and historically appropriate colors.");
        }
        if (options.enhanceFaces) {
            instructions.push("Significantly enhance any faces in the image. Restore and clarify facial features, improve sharpness, and ensure a natural, photorealistic result.");
        }

        if (instructions.length === 0) {
            throw new Error("No restoration options selected.");
        }

        const finalPrompt = `**Task: Advanced Image Restoration**\nFollow these instructions precisely:\n- ${instructions.join('\n- ')}\n\nPreserve the original composition and subjects of the image. The result should be a high-quality, restored version of the original photograph.`;

        const parts = [
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
            throw new Error(`Image restoration failed: ${textPart}`);
        }
        
        throw new Error("Image restoration completed, but no image was returned from the model.");
        
    } catch (error) {
        console.error("Error restoring image:", error);
        if (error instanceof Error) {
          throw new Error(`Image restoration failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during image restoration.");
    }
};

// Edits an image based on a prompt and an optional mask
export const editImage = async (
    prompt: string,
    baseImage: GenerativePart,
    maskImage: GenerativePart | null,
): Promise<string[]> => {
    try {
        const parts: ({ inlineData: { data: string; mimeType: string; } } | { text: string; })[] = [
            { inlineData: { data: baseImage.data, mimeType: baseImage.mimeType } },
        ];
        
        let finalPrompt: string;
        const baseInstruction = "You are a world-class photo editing AI, like Photoshop's generative fill. Your task is to apply the user's edit seamlessly and photorealistically. Ensure the final image is clean and free of any watermarks, logos, or artifacts from the original photo."

        if (maskImage) {
            parts.push({ inlineData: { data: maskImage.data, mimeType: maskImage.mimeType } });
            finalPrompt = `${baseInstruction} The user has provided a mask image. Apply the edit described in the text prompt *only* to the white areas of the mask. Do not change any other part of the image.\n\n**User's Edit Instruction:** "${prompt}"`;
        } else {
            finalPrompt = `${baseInstruction} Apply the edit described in the text prompt to the entire image.\n\n**User's Edit Instruction:** "${prompt}"`;
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
            throw new Error(`Image editing failed: ${textPart}`);
        }
        
        throw new Error("Image editing completed, but no image was returned from the model.");
        
    } catch (error) {
        console.error("Error editing image:", error);
        if (error instanceof Error) {
          throw new Error(`Image editing failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during image editing.");
    }
};

// --- GRAPHIC SUITE ---

// A generic helper for single-image generation tasks that return a single image result.
const generateSingleImage = async (
    prompt: string,
    baseImage: GenerativePart
): Promise<string[]> => {
    try {
        const parts = [
            { inlineData: { data: baseImage.data, mimeType: baseImage.mimeType } },
            { text: prompt },
        ];

        const response = await ai.models.generateContent({
            model: 'gemini-2.5-flash-image-preview',
            contents: { parts: parts },
            // FIX: Correctly define config object with responseModalities.
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
            throw new Error(`Image operation failed: ${textPart}`);
        }
        
        throw new Error("Image operation completed, but no image was returned from the model.");
        
    } catch (error) {
        console.error("Error in generateSingleImage:", error);
        if (error instanceof Error) {
          throw new Error(`Image operation failed: ${error.message}`);
        }
        throw new Error("An unknown error occurred during the image operation.");
    }
};

// FIX: Added missing function definitions and exports for graphic suite and architecture tools.
export const upscaleImage = (baseImage: GenerativePart): Promise<string[]> => {
    return generateSingleImage("Upscale this image to 4K resolution. Enhance fine details, improve clarity, and sharpen the image without introducing artifacts.", baseImage);
};

export const removeBackground = (baseImage: GenerativePart): Promise<string[]> => {
    return generateSingleImage("Remove the background from this image. The output should be the main subject on a transparent background.", baseImage);
};

export const replaceBackground = (baseImage: GenerativePart, newBackgroundPrompt: string): Promise<string[]> => {
    return generateSingleImage(`Seamlessly replace the background of this image with the following scene: "${newBackgroundPrompt}". Ensure the lighting on the subject matches the new background.`, baseImage);
};

export const colorizeGraphic = (baseImage: GenerativePart): Promise<string[]> => {
    return generateSingleImage("Colorize this black and white photograph. Apply natural, realistic, and historically appropriate colors.", baseImage);
};

export const generateGraphic = async (
    prompt: string,
    style: string,
    type: 'illustration' | 'icon' | 'logo_maker' | 'pattern',
    count: number,
    colorPalette?: string,
    negativePrompt?: string
): Promise<string[]> => {
     try {
        let finalPrompt = '';
        switch (type) {
            case 'illustration':
                finalPrompt = `A high-quality vector illustration of ${prompt}. Style: ${style}, clean lines, vibrant colors.`;
                break;
            case 'icon':
                finalPrompt = `A simple, clean, modern vector icon of ${prompt}. Style: ${style}, minimalist, easily recognizable.`;
                break;
            case 'pattern':
                finalPrompt = `A seamless, repeating pattern featuring ${prompt}. Style: ${style}.`;
                break;
            case 'logo_maker':
                finalPrompt = `A modern, professional logo for a brand or company. The logo should represent: ${prompt}. Style: ${style}. The logo MUST NOT contain any text or letters.`;
                if (colorPalette?.trim()) {
                    finalPrompt += ` Use a primary color palette of: ${colorPalette}.`;
                }
                if (negativePrompt?.trim()) {
                    finalPrompt += ` Avoid the following elements: ${negativePrompt}.`;
                }
                finalPrompt += ' The final logo must be on a clean, solid white background for easy usability.';
                break;
        }
        
        const response = await ai.models.generateImages({
            model: 'imagen-4.0-generate-001',
            prompt: finalPrompt,
            config: {
              numberOfImages: count,
              aspectRatio: '1:1',
            },
        });

        return response.generatedImages.map(img => `data:image/png;base64,${img.image.imageBytes}`);

    } catch (error) {
        console.error(`Error generating ${type}:`, error);
        if (error instanceof Error) {
            throw new Error(`Graphic generation failed: ${error.message}`);
        }
        throw new Error(`An unknown error occurred during ${type} generation.`);
    }
};

export const generateArchitectureImage = async (
    prompt: string,
    baseImage: GenerativePart,
    tool: ArchitectureSuiteTool
): Promise<string[]> => {
    const instruction = `You are a world-class architectural visualization AI. Your task is to reimagine the provided architectural photo based on the user's prompt. Preserve the core structure but apply the new design vision seamlessly and photorealistically. This is for a ${tool} design.`;
    return generateSingleImage(`${instruction}\n\nUSER PROMPT: "${prompt}"`, baseImage);
};