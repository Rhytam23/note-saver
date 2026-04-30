import { GoogleGenerativeAI } from '@google/generative-ai';
import { supabase } from './supabase';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
const genAI = apiKey ? new GoogleGenerativeAI(apiKey) : null;

const generateContentWithRetry = async (prompt: string, systemInstruction?: string): Promise<string> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return "You must be logged in to use AI features.";
    }

    if (!apiKey || apiKey === 'your_gemini_api_key' || apiKey.includes('YOUR_')) {
      console.error("Gemini API Key is missing or using placeholder in .env");
      return "Error: Gemini API key is not configured. Please add your valid API key to the .env file as VITE_GEMINI_API_KEY.";
    }

    if (!genAI) {
      return "AI features are currently unavailable. Please check your configuration.";
    }

    // Use gemini-1.5-flash which is fast and widely available
    const model = genAI.getGenerativeModel({ 
      model: "gemini-1.5-flash",
      systemInstruction: systemInstruction 
    });

    const result = await model.generateContent(prompt);
    const response = await result.response;
    const text = response.text();

    if (!text) {
      return "Sorry, the AI did not provide a response.";
    }

    return text;

  } catch (error: any) {
    console.error("Gemini API Error Details:", error);
    
    // Handle specific error codes
    const errorMessage = error.message || "";
    if (errorMessage.includes('429')) {
      return "Error: Rate limit exceeded. Please wait a moment.";
    }
    if (errorMessage.includes('403')) {
      return "Error: API Key permission denied. Ensure Gemini API is enabled in Google AI Studio.";
    }
    if (errorMessage.includes('API_KEY_INVALID')) {
      return "Error: The provided API Key is invalid.";
    }
    
    return `Error: ${errorMessage || "Connection failed"}`;
  }
}

/**
 * Summarizes the given text using the Gemini API.
 */
export const summarizeText = async (text: string): Promise<string> => {
  const prompt = `Please provide a concise summary of the following text:\n\n---\n\n${text}`;
  return generateContentWithRetry(prompt);
};

/**
 * Proofreads and corrects the given text.
 */
export const proofreadText = async (text: string): Promise<string> => {
  const prompt = `Please proofread and correct any grammatical errors, spelling mistakes, or typos in the following text. Only return the corrected text, without any introductory phrases like "Here is the corrected text:".\n\n---\n\n${text}`;
  return generateContentWithRetry(prompt, "You are an expert proofreader. Your task is to correct text while preserving the original tone and meaning.");
};

/**
 * Generates creative ideas or next steps.
 */
export const generateIdeas = async (text: string): Promise<string> => {
  const prompt = `Based on the following text, generate a short, bulleted list of 3-5 creative ideas, next steps, or related concepts. \n\n---\n\n${text}`;
  return generateContentWithRetry(prompt, "You are a creative assistant designed to brainstorm and expand on ideas.");
};
