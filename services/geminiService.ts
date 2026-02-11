
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
    Como especialista sênior em Educação Especial (DI), sua tarefa é adaptar o conteúdo abaixo.
    FOCO: Visual máximo, texto mínimo (2-3 frases curtas por bloco) e correção gramatical absoluta.

    ESTRUTURA OBRIGATÓRIA (4 SEÇÕES):
    1. EXPLICAÇÃO (Teoria básica com imagem literal).
    2. ATIVIDADE PRÁTICA (Desafio de identificação, marcação ou ação).
    3. EXPLICAÇÃO (Aplicação prática no cotidiano).
    4. ATIVIDADE FINAL (Exercício de fixação lúdico).

    ESTRATÉGIAS ESPECÍFICAS PARA ${discipline}:
    - Inglês: Use palavras-chave (cores, saudações, animais) ligadas diretamente a figuras. Evite gramática complexa.
    - Química: Foco em reações visíveis, estados da matéria (gelo, vapor) e segurança. Use analogias concretas.
    - Matemática: Use contagem de objetos reais.
    - Português: Foco em interpretação direta.
    - Outras: Mantenha a simplicidade e o apoio visual constante.

    DIRETRIZES DE PORTUGUÊS:
    - Revise rigorosamente a ortografia e concordância.
    - Não utilize gírias. Use linguagem clara e respeitosa.

    CONTEÚDO ORIGINAL:
    ${originalContent}

    Responda em JSON seguindo o esquema. Identifique cada seção como 'explanation' ou 'activity'.
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
      chapter,
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
    ? `Desenho linear simplificado para colorir, contornos pretos grossos, fundo branco puro, estilo educativo para alunos com DI: ${prompt}`
    : `Ilustração educativa 3D, estilo amigável, um único objeto central claro, fundo branco limpo, cores vivas, sem detalhes confusos: ${prompt}`;

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
