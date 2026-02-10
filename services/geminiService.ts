
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
    Você é um especialista em Educação Inclusiva (DI). Adapte a aula abaixo com FOCO VISUAL MÁXIMO e TEXTO MÍNIMO.
    
    REGRAS DE OURO:
    1. PORTUGUÊS IMPECÁVEL: Revise cada palavra. Sem erros de concordância ou ortografia.
    2. MENOS É MAIS: Use no máximo 2 ou 3 frases curtas por seção. O foco é a IMAGEM e a AÇÃO.
    3. ALTERNÂNCIA PEDAGÓGICA OBRIGATÓRIA:
       - Seção 1 (Explicação): O que é o conceito? (Texto simples + Imagem literal)
       - Seção 2 (Atividade): Um desafio prático, pergunta de identificar ou exercício de ligar/marcar.
       - Seção 3 (Explicação): Como isso se aplica no dia a dia?
       - Seção 4 (Atividade): Um exercício final de reflexão prática ou desenho.
    
    ESTRATÉGIA POR COMPONENTE (${discipline}):
    - Matemática: Use contagem de objetos, formas geométricas ou situações de compra.
    - Língua Portuguesa: Use palavras-chave, letras grandes e associações diretas.
    - Inglês: Foco em vocabulário básico (cores, animais, saudações) associado diretamente a imagens.
    - Química: Foco em transformações visíveis (mudança de cor, estados da matéria) e segurança laboratorial.
    - História/Geografia: Use figuras de "antes e depois", fotos de lugares ou mapas muito simplificados.
    - Ciências: Foco em observação da natureza, corpo humano e hábitos saudáveis.
    - Filosofia/Sociologia: Situações de convivência, emoções humanas (emojis) e regras de respeito.

    CONTEÚDO PARA ADAPTAR:
    ${originalContent}

    Responda em JSON seguindo estritamente o esquema. No campo 'type', use 'explanation' para teoria e 'activity' para prática.
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
    console.error("Erro na adaptação:", error);
    throw error;
  }
};

export const generateLessonImage = async (prompt: string, isColoring: boolean = false): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const finalPrompt = isColoring 
    ? `Desenho linear para colorir, contornos pretos grossos e nítidos, fundo branco puro, sem sombras, estilo minimalista educativo para alunos com DI: ${prompt}`
    : `Ilustração 3D educativa, estilo Pixar/Disney, fundo branco limpo, cores vibrantes, um único objeto central claro e grande, sem poluição visual: ${prompt}`;

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
    throw new Error("Imagem não gerada.");
  } catch (error) {
    console.error("Erro na imagem:", error);
    throw error;
  }
};
