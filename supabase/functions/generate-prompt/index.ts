// Deno standard library for serving HTTP.
import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
// Import Google GenAI library from npm.
import { GoogleGenAI } from 'npm:@google/genai@^1.20.0';

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
    const { image } = (await req.json()) as { image: GenerativePart };
    
    if (!image) {
      throw new Error('Missing image data');
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
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        status: 200,
      });
    }

    throw new Error("Prompt generation completed, but no text was returned.");

  } catch (error) {
    console.error("Error in generate-prompt function:", error);
    const message = error instanceof Error ? error.message : "An unknown error occurred";
    return new Response(JSON.stringify({ error: message }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      status: 500,
    });
  }
});