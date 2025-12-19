
import { GoogleGenAI, Type } from "@google/genai";
import { Question, Language } from "./types";

const usedQuestionTexts = new Set<string>();

export async function generateBoardQuestion(category: string, value: number, lang: Language): Promise<Question> {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const difficulty = value === 200 ? 'easy' : value === 400 ? 'medium' : 'hard';
  
  const systemInstruction = lang === 'ar' 
    ? "أنت خبير في المسابقات الثقافية. ولد سؤالاً واحداً جديداً تماماً لم يسبق ذكره."
    : "You are a trivia expert. Generate one unique, never-before-seen question.";

  const prompt = `Category: "${category}", Difficulty: "${difficulty}", Value: "${value}" points.
  Language: ${lang === 'ar' ? 'Arabic' : 'English'}.
  Requirements: 4 options, one correct answer (index 0-3), an explanation, and ensure it is different from common trivia.
  Excluded previous concepts: ${Array.from(usedQuestionTexts).slice(-20).join(', ')}`;

  const response = await ai.models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          id: { type: Type.STRING },
          text: { type: Type.STRING },
          options: {
            type: Type.ARRAY,
            items: { type: Type.STRING }
          },
          correctAnswer: { type: Type.INTEGER },
          explanation: { type: Type.STRING },
          category: { type: Type.STRING },
          difficulty: { type: Type.STRING }
        },
        required: ["id", "text", "options", "correctAnswer", "explanation"]
      }
    }
  });

  try {
    const jsonStr = (response.text || "").trim();
    const q = JSON.parse(jsonStr);
    usedQuestionTexts.add(q.text);
    return { ...q, value, category };
  } catch (error) {
    console.error("Failed to parse question:", error);
    throw new Error("API Error");
  }
}
