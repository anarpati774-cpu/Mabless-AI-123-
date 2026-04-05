import { GoogleGenAI, Type } from "@google/genai";

const ai = new GoogleGenAI({ apiKey: import.meta.env.VITE_GEMINI_API_KEY });

export const CHAT_MODEL = "gemini-3-flash-preview";

export const responseSchema = {
  type: Type.OBJECT,
  properties: {
    answer: {
      type: Type.STRING,
      description: "The direct answer to the user's question, formatted in Markdown.",
    },
    explanation: {
      type: Type.STRING,
      description: "A simple or detailed explanation depending on the mode.",
    },
    websites: {
      type: Type.ARRAY,
      items: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          url: { type: Type.STRING },
          description: { type: Type.STRING },
        },
        required: ["title", "url", "description"],
      },
      description: "Top 3 relevant websites for the topic.",
    },
    relatedQuestions: {
      type: Type.ARRAY,
      items: { type: Type.STRING },
      description: "3-5 related follow-up questions.",
    },
  },
  required: ["answer", "explanation", "websites", "relatedQuestions"],
};

export const testSchema = {
  type: Type.ARRAY,
  items: {
    type: Type.OBJECT,
    properties: {
      question: { type: Type.STRING },
      options: { type: Type.ARRAY, items: { type: Type.STRING } },
      correctAnswer: { type: Type.STRING },
    },
    required: ["question", "options", "correctAnswer"],
  },
};

export async function generateAIResponse(prompt: string, studyMode: boolean = false, imageData?: { data: string; mimeType: string }) {
  const systemInstruction = `You are Mabless AI, a smart AI assistant. 
  Your goal is to provide accurate, helpful answers combined with website suggestions and related questions.
  
  Mode: ${studyMode ? "Study Mode (Detailed, examples, step-by-step)" : "Normal Mode (Direct, simple explanation)"}
  
  Always respond in JSON format matching the schema provided.
  For websites, suggest real, high-quality resources like Wikipedia, StackOverflow, MDN, GeeksforGeeks, etc.
  Format the 'answer' field using Markdown.`;

  const contents: any[] = [{ text: prompt }];
  if (imageData) {
    contents.push({
      inlineData: {
        data: imageData.data,
        mimeType: imageData.mimeType,
      },
    });
  }

  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: { parts: contents },
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: responseSchema,
    },
  });

  try {
    return JSON.parse(response.text || "{}");
  } catch (e) {
    console.error("Failed to parse AI response:", e);
    return {
      answer: "I'm sorry, I couldn't process that request properly.",
      explanation: "An error occurred while generating the response.",
      websites: [],
      relatedQuestions: [],
    };
  }
}

export async function generateTestAI(context: string) {
  const systemInstruction = `You are a study assistant. Based on the provided conversation, generate a 5-question multiple choice test.
  Return ONLY a JSON array of objects, each with 'question', 'options' (array of 4 strings), and 'correctAnswer' (string, must be one of the options).`;

  const response = await ai.models.generateContent({
    model: CHAT_MODEL,
    contents: `Conversation:\n${context}`,
    config: {
      systemInstruction,
      responseMimeType: "application/json",
      responseSchema: testSchema,
    },
  });

  try {
    return JSON.parse(response.text || "[]");
  } catch (e) {
    console.error("Failed to parse test response:", e);
    return [];
  }
}

export async function generateChatTitle(firstMessage: string) {
  const systemInstruction = `You are a helpful assistant that generates short, descriptive, and accurate titles for chat conversations based on the first message. 
  The title should be concise (max 5-6 words) and capture the essence of the user's request.
  Return ONLY the title string, no quotes or extra text.`;

  try {
    const response = await ai.models.generateContent({
      model: CHAT_MODEL,
      contents: `First Message: ${firstMessage}`,
      config: {
        systemInstruction,
      },
    });

    return response.text?.trim() || firstMessage.slice(0, 30) + (firstMessage.length > 30 ? "..." : "");
  } catch (e) {
    console.error("Failed to generate chat title:", e);
    return firstMessage.slice(0, 30) + (firstMessage.length > 30 ? "..." : "");
  }
}
