// @ts-ignore
import { GoogleGenAI } from "@google/genai";

// Use localStorage as primary source for runtime flexibility, fallback to Vite env var
const getApiKey = () => localStorage.getItem('gemini_api_key') || import.meta.env.VITE_GEMINI_API_KEY;

if (!getApiKey()) {
  console.warn(
    "Gemini API key not found in localStorage or environment. AI features will be disabled."
  );
}

const ai = new GoogleGenAI({ apiKey: getApiKey() || 'PLACEHOLDER' });
const model = 'gemini-2.5-flash';

const generateContentWithRetry = async (prompt: string, systemInstruction?: string): Promise<string> => {
  const apiKey = getApiKey();
  if (!apiKey || apiKey === 'PLACEHOLDER_API_KEY') {
    return "AI key missing. Please set your Gemini API Key in Settings (Profile).";
  }
  try {
    // Re-initialize genAI instance with current key in case it changed
    const currentAi = new GoogleGenAI({ apiKey });
    const response = await currentAi.models.generateContent({
      model,
      contents: prompt,
      config: {
        ...(systemInstruction && { systemInstruction }),
      },
    });
    // Ensure we always return a string, even if the response is empty.
    return response.text ?? "Sorry, the AI did not provide a response.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    // Provide a user-friendly error message.
    return "Sorry, there was an error communicating with the AI. Please try again later.";
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
 * Generates creative ideas or next steps based on the provided text.
 */
export const generateIdeas = async (text: string): Promise<string> => {
  const prompt = `Based on the following text, generate a short, bulleted list of 3-5 creative ideas, next steps, or related concepts. \n\n---\n\n${text}`;
  return generateContentWithRetry(prompt, "You are a creative assistant designed to brainstorm and expand on ideas.");
};