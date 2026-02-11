
import { GoogleGenAI, Type } from "@google/genai";
import { AdaptedLesson, Discipline, Grade } from "../types";

export const adaptLessonContent = async (
  originalContent: string, 
  discipline: Discipline, 
  teacherName: string,
  school: string,
  chapter: number,
  grade: Grade
): Promise<AdaptedLesson> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Você é um especialista em Educação Especial (DI). Adapte este conteúdo de aula para o Capítulo ${chapter}.
    FOCO: Visual máximo, texto curtíssimo e gramática impecável.

    ESTRUTURA OBRIGATÓRIA:
    1. EXPLICAÇÃO (Conceito simples com imagem literal).
    2. ATIVIDADE PRÁTICA (Desafio de identificar ou agir).
    3. EXPLICAÇÃO (Uso no dia a dia).
    4. ATIVIDADE FINAL (Fixação lúdica).

    COMPONENTES ESPECÍFICOS PARA ${discipline}:
    - Inglês: Palavras soltas ligadas a imagens.
    - Química: Transformações visíveis e segurança.
    - Matemática: Contagem concreta.
    - Geral: Sem gírias, linguagem clara e acolhedora.

    CONTEÚDO ORIGINAL DA AULA:
    ${originalContent}

    Responda em JSON. Não inclua o campo "chapter" no JSON retornado, use apenas o esquema solicitado.
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

    let text = response.text;
    if (text.startsWith('```')) {
      text = text.replace(/^```json\n?/, '').replace(/\n?```$/, '');
    }

    const data = JSON.parse(text);
    return {
      ...data,
      discipline,
      teacherName,
      school,
      chapter: Number(chapter), // Garante que o capítulo selecionado seja respeitado
      grade
    };
  } catch (error) {
    console.error("Erro na adaptação pedagógica:", error);
    throw error;
  }
};

export const generateLessonImage = async (prompt: string, isColoring: boolean = false): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const finalPrompt = isColoring 
    ? `Desenho linear simplificado para colorir, contornos pretos grossos, fundo branco puro, estilo educativo: ${prompt}`
    : `Ilustração educativa 3D amigável, um único objeto central claro, fundo branco limpo, cores vivas: ${prompt}`;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: finalPrompt }] },
      config: {
        imageConfig: {
          aspectRatio: "1:1"
        }
      }
    });

    for (const part of response.candidates[0].content.parts) {
      if (part.inlineData) {
        return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    throw new Error("Falha na geração da imagem.");
  } catch (error) {
    console.error("Erro na imagem:", error);
    throw error;
  }
};
