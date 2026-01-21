
import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY || '' });

/**
 * Robustly extracts JSON from a string that might contain other text or conversational filler.
 * Avoids direct JSON.parse on strings that might start with a JSON atom followed by text.
 */
function extractJSON(text: string) {
  if (!text) return [];

  // Clean common markdown and code block markers
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json/i, '');
  cleaned = cleaned.replace(/^```/i, '');
  cleaned = cleaned.replace(/```$/i, '');
  cleaned = cleaned.trim();

  // Try to find structural JSON characters first to avoid parsing atoms (like 'true' or '123') 
  // followed by text, which triggers "Unexpected non-whitespace character after JSON".
  const firstBrace = cleaned.indexOf('{');
  const firstBracket = cleaned.indexOf('[');

  let start = -1;
  let end = -1;

  if (firstBrace !== -1 && (firstBracket === -1 || firstBrace < firstBracket)) {
    start = firstBrace;
    end = cleaned.lastIndexOf('}');
  } else if (firstBracket !== -1) {
    start = firstBracket;
    end = cleaned.lastIndexOf(']');
  }

  // If structural markers found, prefer extracting that substring
  if (start !== -1 && end !== -1 && end > start) {
    const jsonStr = cleaned.substring(start, end + 1);
    try {
      return JSON.parse(jsonStr);
    } catch (innerError) {
      console.error("Failed to parse structural JSON substring:", jsonStr, innerError);
    }
  }

  // Fallback: try parsing the whole cleaned string if no markers were found or parsing failed
  try {
    return JSON.parse(cleaned);
  } catch (e) {
    // Final fallback: regex match for arrays or objects
    const arrayMatch = cleaned.match(/\[[\s\S]*\]/);
    if (arrayMatch) {
      try { return JSON.parse(arrayMatch[0]); } catch (err) { }
    }

    const objectMatch = cleaned.match(/\{[\s\S]*\}/);
    if (objectMatch) {
      try { return JSON.parse(objectMatch[0]); } catch (err) { }
    }
    console.error("All JSON extraction methods failed for input:", cleaned);
    return [];
  }
}

export const getOKRSuggestions = async (objective: string) => {
  if (!process.env.API_KEY) {
    console.error("Gemini API key is missing.");
    return [];
  }

  try {
    const response = await ai.models.generateContent({
      model: "gemini-3-flash-preview",
      contents: `Suggest 3-5 measurable Key Results for the following objective: "${objective}". For each Key Result, provide just a title. Respond strictly in valid JSON format only.`,
      config: {
        responseMimeType: "application/json",
        thinkingConfig: { thinkingBudget: 0 },
        responseSchema: {
          type: Type.ARRAY,
          items: {
            type: Type.OBJECT,
            properties: {
              title: { type: Type.STRING }
            },
            required: ["title"]
          }
        }
      }
    });

    const text = response.text || '';
    return extractJSON(text);
  } catch (error) {
    console.error("Gemini API error:", error);
    return [];
  }
};
