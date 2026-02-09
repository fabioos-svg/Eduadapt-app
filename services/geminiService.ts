
import { GoogleGenAI, Type } from "@google/genai";
import { AdaptedLesson, Discipline, Grade } from "../types";

/**
 * Função para adaptar o conteúdo da aula usando o modelo Gemini 3 Pro.
 * O modelo Pro é utilizado aqui por se tratar de uma tarefa de raciocínio complexo (pedagogia).
 */
export const adaptLessonContent = async (
  originalContent: string, 
  discipline: Discipline, 
  teacherName: string,
  school: string,
  chapter: number,
  grade: Grade
): Promise<AdaptedLesson> => {
  // Inicialização local para garantir a chave API mais recente
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const prompt = `
    Como um especialista em educação especial e tecnologia assistiva, sua tarefa é adaptar o conteúdo abaixo para um aluno com Deficiência Intelectual (DI).
    
    Contexto:
    - Disciplina: ${discipline}
    - Nível: ${grade}
    - Professor: ${teacherName}
    - Instituição: ${school}
    - Capítulo: ${chapter}
    
    Diretrizes de Adaptação:
    1. Linguagem Simples: Use frases curtas (máximo 10 palavras), voz ativa e vocabulário concreto.
    2. Foco: Extraia APENAS o conceito principal. Elimine distrações e detalhes secundários.
    3. Respeito: O conteúdo deve ser adequado à idade (${grade}), evitando tom infantilizado demais se for Ensino Médio.
    4. Visual: Crie descrições de imagens literais para os prompts.
    
    Conteúdo Original:
    ${originalContent}
  `;

  try {
    const response = await ai.models.generateContent({
      model: 'gemini-3-pro-preview', // Modelo Pro para tarefas complexas
      contents: prompt,
      config: {
        thinkingConfig: { thinkingBudget: 2000 }, // Adiciona orçamento de pensamento para melhor adaptação
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
                },
                required: ["title", "content", "imagePrompt"]
              }
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
    
    // Limpeza de possíveis blocos de código Markdown que o modelo possa retornar por engano
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
    console.error("Erro ao processar adaptação pedagógica:", error);
    throw error;
  }
};

/**
 * Função para gerar imagens ilustrativas usando o modelo Flash Image.
 */
export const generateLessonImage = async (prompt: string, isColoring: boolean = false): Promise<string> => {
  const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
  
  const finalPrompt = isColoring 
    ? `Line art coloring page, very simple bold black outlines, white background, no shading, no gray, for students with DI: ${prompt}`
    : `Educational cartoon 3D, very simple and clear subject, white background, friendly, bright colors: ${prompt}`;

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
    throw new Error("Imagem não encontrada na resposta");
  } catch (error) {
    console.error("Erro na geração de imagem:", error);
    throw error;
  }
};
