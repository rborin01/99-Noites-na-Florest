import { GoogleGenAI } from "@google/genai";

// Safely retrieve API Key supporting both Node process and Vite import.meta
const getApiKey = () => {
  try {
    // Priority 1: Vite Environment Variable (Standard for Vercel/Vite)
    // Fix: cast import.meta to any to avoid TS error 'Property env does not exist on type ImportMeta'
    const meta = import.meta as any;
    if (meta.env && meta.env.VITE_API_KEY) {
      return meta.env.VITE_API_KEY;
    }
    // Priority 2: Process Environment (Standard for Node)
    if (typeof process !== 'undefined' && process.env && process.env.API_KEY) {
      return process.env.API_KEY;
    }
    return '';
  } catch (e) {
    return '';
  }
};

const API_KEY = getApiKey();

// Fallback logic in case no API key is provided, so the app remains functional as a demo
const MOCK_NARRATIVES = [
  "The wind howls outside. Something scratched the door, but the barricade held.",
  "Quiet. Too quiet. You survived another night, but supplies are running low.",
  "A pack of wolves circled the camp for hours. The fire kept them at bay.",
  "You heard whispering in the dark. It sounded like your own voice.",
  "Acid rain fell throughout the night. The shelter is damaging, but you are alive."
];

export const generateNightEvent = async (
  day: number, 
  baseHealth: number, 
  playerStatus: string
): Promise<string> => {
  if (!API_KEY) {
    console.warn("No API_KEY found. Using fallback narrative.");
    return MOCK_NARRATIVES[Math.floor(Math.random() * MOCK_NARRATIVES.length)];
  }

  try {
    const ai = new GoogleGenAI({ apiKey: API_KEY });
    
    const prompt = `
      You are the narrator of a gritty survival horror game called "99 Noites". 
      The player has survived Day ${day}. 
      Base Health: ${baseHealth}%. 
      Player Status: ${playerStatus}.
      
      Write a short, atmospheric, 2-sentence paragraph describing what happened during the night. 
      If Base Health is low, describe a close call or breach. 
      If Player Status is bad (hungry/freezing), describe the suffering.
      Make it scary but functional.
    `;

    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
    });

    return response.text || "The night passes... strictly.";
  } catch (error) {
    console.error("Gemini API Error:", error);
    return "The static in your radio prevents you from hearing the full report. You survived.";
  }
};