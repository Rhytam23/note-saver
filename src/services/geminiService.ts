import { supabase } from './supabase';

const generateContentWithRetry = async (prompt: string, systemInstruction?: string): Promise<string> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();
    
    if (!session) {
      return "You must be logged in to use AI features.";
    }

    // Call the Supabase Edge Function proxy
    const { data, error } = await supabase.functions.invoke('gemini-proxy', {
      body: { prompt, systemInstruction }
    });

    if (error) {
      console.error("Edge Function Error:", error);
      return "Sorry, there was an error communicating with the AI. Please try again later.";
    }

    // Adapt this based on the exact shape returned by your edge function.
    // The Deno proxy returns: { candidates: [ { content: { parts: [ { text: "..." } ] } } ] }
    return data?.candidates?.[0]?.content?.parts?.[0]?.text ?? "Sorry, the AI did not provide a response.";

  } catch (error) {
    console.error("Gemini Proxy Error:", error);
    return "Sorry, there was an error communicating with the AI proxy. Please try again later.";
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