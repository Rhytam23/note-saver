import { GoogleGenAI } from '@google/genai';
import { supabase } from './supabase';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
let genAI: GoogleGenAI | null = null;
if (apiKey) {
  genAI = new GoogleGenAI({ apiKey, apiVersion: 'v1' });
}

let cachedModelName: string | null = null;

/**
 * Automatically discovers the best available Gemini model for the current API key.
 * This prevents 404 errors when specific models are deprecated or restricted.
 */
const getActiveModel = async (): Promise<string> => {
  if (cachedModelName) return cachedModelName;
  if (!genAI) return 'gemini-1.5-flash';

  try {
    const response = await (genAI as any).models.list();
    const models = response.models || response;
    
    // Prefer Flash models for speed, then Pro models.
    const bestModel = models.find((m: any) => 
      m.supportedMethods?.includes('generateContent') && 
      (m.name.includes('flash') || m.name.includes('pro'))
    );

    if (bestModel) {
      // The name might come back as "models/gemini-1.5-flash", we just need the ID if it has a prefix
      cachedModelName = bestModel.name.startsWith('models/') ? bestModel.name.split('/')[1] : bestModel.name;
      console.log(`Auto-detected model: ${cachedModelName}`);
      return cachedModelName!;
    }
  } catch (err) {
    console.error("Model discovery failed, falling back to gemini-1.5-flash", err);
  }
  
  return 'gemini-1.5-flash';
};

const generateContentWithRetry = async (prompt: string, systemInstruction?: string): Promise<string> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return "You must be logged in to use AI features.";
    }

    if (!apiKey || apiKey === 'your_gemini_api_key') {
      console.error("Gemini API Key is missing or using placeholder in .env");
      return "Error: Gemini API key is not configured. Please add your valid API key to the .env file as VITE_GEMINI_API_KEY and restart your development server.";
    }

    if (!genAI) {
      console.warn("Gemini API client not initialized.");
      return "AI features are currently unavailable. Please check your configuration.";
    }

    const modelName = await getActiveModel();
    console.log(`Attempting request with model: ${modelName}`);
    
    const finalPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
    
    const response = await genAI.models.generateContent({
      model: modelName,
      contents: [{ role: 'user', parts: [{ text: finalPrompt }] }],
    });

    if (!response.text) {
      console.warn("AI returned an empty response object:", response);
      return "Sorry, the AI did not provide a response.";
    }

    return response.text;

  } catch (error: any) {
    console.error("Gemini API Error Details:", error);
    
    // Check for specific error types to provide better user feedback
    if (error.message?.includes('429')) {
      return "Error: You've hit the Gemini API rate limit for this model. Please wait a moment or try again later.";
    }
    if (error.message?.includes('404')) {
      return `Error: The AI model '${cachedModelName || 'gemini-1.5-flash'}' was not found. Try restarting your server to refresh model discovery.`;
    }
    
    return `Error: ${error.message || "Unknown error communicating with the AI"}`;
  }
}

/**
 * Summarizes the given text using the Gemini API via secure proxy.
 */
export const summarizeText = async (text: string): Promise<string> => {
  const prompt = `Please provide a concise summary of the following text:\n\n---\n\n${text}`;
  return generateContentWithRetry(prompt);
};

/**
 * Proofreads and corrects the given text via secure proxy.
 */
export const proofreadText = async (text: string): Promise<string> => {
  const prompt = `Please proofread and correct any grammatical errors, spelling mistakes, or typos in the following text. Only return the corrected text, without any introductory phrases like "Here is the corrected text:".\n\n---\n\n${text}`;
  return generateContentWithRetry(prompt, "You are an expert proofreader. Your task is to correct text while preserving the original tone and meaning.");
};

/**
 * Generates creative ideas or next steps via secure proxy.
 */
export const generateIdeas = async (text: string): Promise<string> => {
  const prompt = `Based on the following text, generate a short, bulleted list of 3-5 creative ideas, next steps, or related concepts. \n\n---\n\n${text}`;
  return generateContentWithRetry(prompt, "You are a creative assistant designed to brainstorm and expand on ideas.");
};
