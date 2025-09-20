// Deno standard library for serving HTTP.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// Import Google GenAI library from npm.
import { GoogleGenAI, Modality } from 'npm:@google/genai@^1.20.0';

// FIX: Declare Deno to provide a type definition for the Deno global object,
// resolving "Cannot find name 'Deno'" errors in environments where Deno types are not automatically recognized.
declare const Deno: {
  env: {
    get: (key: string) => string | undefined;
  };
};

// Define GenerativePart type, mirroring the one from the frontend.
interface GenerativePart {
  mimeType: string;
  data: string; // base64 encoded string
}

// The API key is securely stored as a Supabase environment variable.
const apiKey = Deno.env.get('API_KEY');
if (!apiKey) {
  console.error("API_KEY environment variable not set in Supabase Function.");
  throw new Error("API_KEY environment variable not set in Supabase Function.");
}
const ai = new GoogleGenAI({ apiKey });

const REALISM_PROMPT_SUFFIX = " The final image must be a photorealistic photograph. Emphasize realistic lighting, textures, and details. Avoid any 3D, CGI, or cartoonish styles. The output must look like a real-life photo.";

// Standard CORS headers required by Supabase client.
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

serve(async (req) => {
  // Handle CORS preflight requests.
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { prompt, baseImage, styleImage } = (await req.json()) as {
        prompt: string;
        baseImage: GenerativePart;
        styleImage: GenerativePart | null;
    };
    
    if (!prompt || !baseImage) {
      throw new Error('Missing prompt or baseImage');
    }

    const enhancedPrompt = `${prompt}${REALISM_PROMPT_SUFFIX}`;

    const parts: ({ inlineData: { data: string; mimeType: string; } } | { text: string; })[] = [
        { inlineData: { data: baseImage.data, mimeType: baseImage.mimeType } },
    ];

    if (styleImage) {
        parts.push({ inlineData: { data: styleImage.data, mimeType: styleImage.mimeType } });
    }
    
    parts.push({ text: enhancedPrompt });

    const response = await ai.models.generateContent({
        model: 'gemini-2.5-flash-image-preview',
        contents: { parts: parts },
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    throw new Error("Image generation completed, but no image was returned from the model.");

  } catch (error) {
    console.error("Error in generate-image function:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});