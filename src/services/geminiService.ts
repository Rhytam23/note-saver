import { supabase } from './supabase';

const invokeGemini = async (prompt: string, systemInstruction?: string): Promise<string> => {
  try {
    const { data: { session } } = await supabase.auth.getSession();

    if (!session) {
      return "You must be logged in to use AI features.";
    }

    const { data, error } = await supabase.functions.invoke<{ text?: string; error?: string }>('gemini-proxy', {
      body: { prompt, systemInstruction },
    });

    if (error) {
      return `Error: ${error.message || "Connection failed"}`;
    }
    if (data?.error) {
      return `Error: ${data.error}`;
    }
    if (!data?.text) {
      return "Sorry, the AI did not provide a response.";
    }

    return data.text;

  } catch (error: any) {
    console.error("Gemini proxy call failed:", error);

    const errorMessage = error.message || "";
    if (errorMessage.includes('429')) return "Error: Rate limit exceeded.";
    if (errorMessage.includes('403')) return "Error: API Key permission denied.";

    return `Error: ${errorMessage || "Connection failed"}`;
  }
}

export const summarizeText = async (text: string): Promise<string> => {
  const prompt = `Please provide a concise summary of the following text. Use HTML tags for formatting (e.g., <b> for bold, <ul><li> for lists) if appropriate. Do not use Markdown like **.\n\n---\n\n${text}`;
  return invokeGemini(prompt, "You are a helpful assistant that provides summaries in clean HTML format.");
};

export const proofreadText = async (text: string): Promise<string> => {
  const prompt = `Please proofread and correct any grammatical errors, spelling mistakes, or typos in the following text. Use HTML tags like <b> or <i> only if they were present or needed for clarity. Only return the corrected text.\n\n---\n\n${text}`;
  return invokeGemini(prompt, "You are an expert proofreader. Your task is to correct text while preserving the original tone and meaning. Return the result in clean HTML format.");
};

export const generateIdeas = async (text: string): Promise<string> => {
  const prompt = `Based on the following text, generate a list of 3-5 creative ideas, next steps, or related concepts. Use <ul> and <li> tags for the list. Use <b> for emphasis. Do not use Markdown like * or **.\n\n---\n\n${text}`;
  return invokeGemini(prompt, "You are a creative assistant that brainstorms ideas and returns them in a structured HTML format.");
};

export const detectAiContent = async (text: string): Promise<string> => {
  const prompt = `Analyze the following text for AI-generated patterns.
  1. Provide a "Likelihood Score" (0-100%).
  2. Identify specific linguistic markers (e.g., perplexity, burstiness, transition patterns).
  3. Format the output in clean HTML.
  Use a <h2> for the score and a <ul> for the findings.

  Text to analyze:
  \n\n---\n\n${text}`;

  return invokeGemini(prompt, "You are a linguistic forensic expert. Analyze text for AI hallmarks and return a structured HTML report. Be objective and precise.");
};

