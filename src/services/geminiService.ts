import { GoogleGenAI } from '@google/genai';
import { supabase } from './supabase';

const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
// Initialize the modern Unified SDK (v1.0+)
const client = apiKey ? new GoogleGenAI({ apiKey }) : null;

const generateContentWithRetry = async (prompt: string, systemInstruction?: string): Promise<string> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return "You must be logged in to use AI features.";
    }

    if (!apiKey || apiKey === 'your_gemini_api_key' || apiKey.includes('YOUR_')) {
      return "Error: Gemini API key is not configured. Please add VITE_GEMINI_API_KEY to your .env file.";
    }

    if (!client) {
      return "AI features are currently unavailable. Please check your configuration.";
    }

    // Use the 2026 standard model: gemini-2.5-flash
    const response = await client.models.generateContent({
      model: 'gemini-2.5-flash',
      systemInstruction: systemInstruction ? { role: 'system', parts: [{ text: systemInstruction }] } : undefined,
      contents: [{ role: 'user', parts: [{ text: prompt }] }],
    });

    const text = response.text;

    if (!text) {
      return "Sorry, the AI did not provide a response.";
    }

    return text;

  } catch (error: any) {
    console.error("Gemini 2.5 API Error:", error);
    
    const errorMessage = error.message || "";
    if (errorMessage.includes('429')) return "Error: Rate limit exceeded.";
    if (errorMessage.includes('403')) return "Error: API Key permission denied.";
    
    return `Error: ${errorMessage || "Connection failed"}`;
  }
}

/**
 * Summarizes the given text using the Gemini 2.5 API.
 */
export const summarizeText = async (text: string): Promise<string> => {
  const prompt = `Please provide a concise summary of the following text. Use HTML tags for formatting (e.g., <b> for bold, <ul><li> for lists) if appropriate. Do not use Markdown like **.\n\n---\n\n${text}`;
  return generateContentWithRetry(prompt, "You are a helpful assistant that provides summaries in clean HTML format.");
};

/**
 * Proofreads and corrects the given text using Gemini 2.5.
 */
export const proofreadText = async (text: string): Promise<string> => {
  const prompt = `Please proofread and correct any grammatical errors, spelling mistakes, or typos in the following text. Use HTML tags like <b> or <i> only if they were present or needed for clarity. Only return the corrected text.\n\n---\n\n${text}`;
  return generateContentWithRetry(prompt, "You are an expert proofreader. Your task is to correct text while preserving the original tone and meaning. Return the result in clean HTML format.");
};

/**
 * Generates creative ideas or next steps using Gemini 2.5.
 */
export const generateIdeas = async (text: string): Promise<string> => {
  const prompt = `Based on the following text, generate a list of 3-5 creative ideas, next steps, or related concepts. Use <ul> and <li> tags for the list. Use <b> for emphasis. Do not use Markdown like * or **.\n\n---\n\n${text}`;
  return generateContentWithRetry(prompt, "You are a creative assistant that brainstorms ideas and returns them in a structured HTML format.");
};

/**
 * Detects AI-generated patterns in the text.
 */
export const detectAiContent = async (text: string): Promise<string> => {
  const prompt = `Analyze the following text for AI-generated patterns. 
  1. Provide a "Likelihood Score" (0-100%).
  2. Identify specific linguistic markers (e.g., perplexity, burstiness, transition patterns).
  3. Format the output in clean HTML. 
  Use a <h2> for the score and a <ul> for the findings.
  
  Text to analyze:
  \n\n---\n\n${text}`;
  
  return generateContentWithRetry(prompt, "You are a linguistic forensic expert. Analyze text for AI hallmarks and return a structured HTML report. Be objective and precise.");
};
