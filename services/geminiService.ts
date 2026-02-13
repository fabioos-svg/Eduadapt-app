
import { GoogleGenAI, Type } from "@google/genai";
import { AdaptedLesson, Discipline, Grade } from "../types";

/**
 * Serviço responsável pela adaptação pedagógica utilizando IA.
 * A chave de API é obtida exclusivamente de process.env.API_KEY para garantir segurança máxima.
 */
export const adaptLessonContent = async (
  originalContent: string, 
  discipline: Discipline, 
  teacherName: string,
  school: string,
  chapter: number,
  grade: Grade
): Promise<AdaptedLesson> => {
  // Inicialização do cliente GenAI
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Como especialista em Educação Especial e Inclusiva (DI), sua missão é adaptar o conteúdo abaixo para o Capítulo ${chapter}.
    
    REGRAS DE OURO:
    1. FOCO VISUAL: O texto deve servir de apoio para imagens. Use sentenças curtas e objetivas.
    2. PEDAGOGIA: Aplique os princípios do Desenho Universal para Aprendizagem (DUA).
    3. BNCC: Alinhe o conteúdo às habilidades da BNCC de forma descritiva. NÃO mencione códigos numéricos (ex: EF05CI05).
    4. ESTRUTURA: Forneça 4 seções alternando entre 'explicação' (conceito) e 'atividade' (prática visual).
    5. IDIOMA: Português impecável, sem gírias, adaptado para a idade do aluno (${grade}).

    CONTEÚDO ORIGINAL:
    ${originalContent}

    Responda EXCLUSIVAMENTE em formato JSON.
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview',
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2500 },
        responseMimeType: "application/json",
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            originalTitle: { type: Type.STRING },
            adaptedTitle: { type: Type.STRING },
            summary: { type: Type.STRING },
            sections: {
              type: Type.ARRAY,
              items: {
                type: Type.OBJECT,
                properties: {
                  title: { type: Type.STRING },
                  content: { type: Type.STRING },
                  imagePrompt: { type: Type.STRING },
                  type: { type: Type.STRING, enum: ['explanation', 'activity'] }
                },
                required: ["title", "content", "imagePrompt", "type"]
              },
              minItems: 4,
              maxItems: 4
            },
            coloringChallenge: {
              type: Type.OBJECT,
              properties: {
                description: { type: Type.STRING },
                prompt: { type: Type.STRING }
              },
              required: ["description", "prompt"]
            },
            familyActivity: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                description: { type: Type.STRING },
                instruction: { type: Type.STRING }
              },
              required: ["title", "description", "instruction"]
            }
          },
          required: ["originalTitle", "adaptedTitle", "summary", "sections", "coloringChallenge", "familyActivity"]
        }
      }
    });

    const data = JSON.parse(response.text.replace(/```json|```/g, ''));
    return {
      ...data,
      discipline,
      teacherName,
      school,
      chapter: Number(chapter),
      grade
    };
  } catch (error) {
    console.error("Erro na adaptação Pedagógica:", error);
    throw error;
  }
};

export const generateLessonImage = async (prompt: string, isColoring: boolean = false): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const finalPrompt = isColoring 
    ? `Desenho linear simplificado para colorir, contornos pretos grossos e nítidos, fundo branco puro, estilo educativo para DI: ${prompt}`
    : `Ilustração educativa 3D de alta qualidade, estilo amigável, cores vivas, um único objeto central claro, fundo branco limpo, sem texto: ${prompt}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: finalPrompt }] },
      config: {
        imageConfig: { aspectRatio: "1:1" }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Imagem não encontrada na resposta.");
  } catch (error) {
    console.error("Erro na geração de imagem:", error);
    throw error;
  }
};
