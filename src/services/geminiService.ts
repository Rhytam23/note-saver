import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
let genAI: GoogleGenerativeAI | null = null;
if (apiKey) {
  genAI = new GoogleGenerativeAI(apiKey);
}

const generateContentWithRetry = async (prompt: string, systemInstruction?: string): Promise<string> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return "You must be logged in to use AI features.";
    }

    if (!genAI) {
      console.warn("Gemini API key is not configured.");
      return "AI features are currently unavailable. Please check configuration.";
    }

    const finalPrompt = systemInstruction ? `${systemInstruction}\n\n${prompt}` : prompt;
    const model = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });
    
    const result = await model.generateContent(finalPrompt);
    const response = await result.response;
    return response.text() || "Sorry, the AI did not provide a response.";

  } catch (error: any) {
    console.error("Gemini API Error:", error);
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
