
import { GoogleGenAI, Type } from "@google/genai";
import { AdaptedLesson, Discipline, Grade, LessonPlan, BNCCSearchResult, ProfessionalLesson, ExerciseSheet } from "../types";

const getAI = () => new GoogleGenAI({ apiKey: process.env.API_KEY });

export const searchBNCCSkill = async (query: string): Promise<BNCCSearchResult> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Pesquise a descrição oficial da BNCC para: "${query}". 
    Retorne no formato exato: CÓDIGO: DESCRIÇÃO COMPLETA. 
    Use estritamente Português Brasileiro com rigor gramatical absoluto.`,
    config: { tools: [{ googleSearch: {} }], temperature: 0.1 },
  });
  
  const text = response.text || "";
  if (!text) throw new Error("Não foi possível encontrar a habilidade BNCC.");

  const codeMatch = text.match(/[A-Z]{2}\d{2}[A-Z]{2}\d{2,3}/);
  const code = codeMatch ? codeMatch[0] : (query.length <= 10 ? query.toUpperCase() : "BNCC-INFO");
  let description = text.split(code).pop()?.replace(/^[:\-\s\.]+/g, '').trim() || "Descrição não encontrada.";
  
  return {
    code,
    description: description.split('\n')[0],
    sources: (response.candidates?.[0]?.groundingMetadata?.groundingChunks || []).filter((c: any) => c.web).map((c: any) => ({ uri: c.web.uri, title: c.web.title }))
  };
};

export const generateExercises = async (
  content: string,
  discipline: string,
  grade: string,
  count: number,
  types: string[],
  adapted: boolean = false
): Promise<ExerciseSheet> => {
  const ai = getAI();
  
  const typeRequirements = types.map(t => {
    if (t === 'multiple_choice') return "Múltipla Escolha (com exatamente 4 opções no campo 'options')";
    if (t === 'open') return "Dissertativa (pergunta aberta)";
    if (t === 'true_false') return "Verdadeiro ou Falso";
    return t;
  }).join(', ');

  const inclusionRules = adapted ? `
    REGRAS DE INCLUSÃO (OBRIGATÓRIO):
    1. LINGUAGEM: Use "Linguagem Simples" (frases curtas, diretas, sem abstrações).
    2. NÍVEIS DE SUPORTE (Deve preencher o objeto 'supports'):
       - level1 (Suporte Nível 1 - LEVE): Apenas um gatilho mental ou dica visual (ex: "Lembre da cor do sol").
       - level2 (Suporte Nível 2 - MÉDIO): Guia de processo. Mostre o caminho/lógica, mas não a resposta (ex: "Primeiro você soma, depois subtrai").
       - level3 (Suporte Nível 3 - INTENSO): Explicação objetiva e um exemplo resolvido similar.
  ` : `
    REGRAS PADRÃO:
    1. LINGUAGEM: Use linguagem adequada para a série ${grade}.
    2. SUPORTE: NÃO gere o objeto 'supports'. Deixe-o nulo ou vazio.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Crie uma lista com ${count} exercícios sobre o conteúdo: "${content}"
    
    Componente Curricular: ${discipline}
    Série/Etapa: ${grade}
    Tipos permitidos: [${typeRequirements}]

    ${inclusionRules}

    IMPORTANTE: 
    - Se o tipo for 'multiple_choice', o array 'options' deve ter obrigatoriamente 4 itens.
    - O campo 'answerKey' deve conter a resposta correta de forma clara.
    - O campo 'explanation' deve conter uma breve justificativa pedagógica da resposta.
    Retorne estritamente JSON.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          questions: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                type: { type: Type.STRING, enum: ['multiple_choice', 'open', 'true_false'] },
                statement: { type: Type.STRING },
                options: { type: Type.ARRAY, items: { type: Type.STRING } },
                answerKey: { type: Type.STRING },
                explanation: { type: Type.STRING },
                supports: {
                  type: Type.OBJECT,
                  properties: {
                    level1: { type: Type.STRING },
                    level2: { type: Type.STRING },
                    level3: { type: Type.STRING }
                  }
                }
              },
              required: ["type", "statement", "answerKey", "explanation"]
            }
          }
        },
        required: ["title", "questions"]
      }
    }
  });

  if (!response.text) throw new Error("Falha ao gerar exercícios.");
  const data = JSON.parse(response.text);
  
  data.questions = data.questions
    .filter((q: any) => types.includes(q.type))
    .map((q: any) => {
      if (q.type === 'multiple_choice' && (!q.options || q.options.length < 4)) {
        q.options = ["Opção 1", "Opção 2", "Opção 3", "Opção 4"];
      }
      if (!adapted) {
        delete q.supports;
      }
      return q;
    });

  return data;
};

export const generateProfessionalLesson = async (
  content: string,
  discipline: string,
  grade: string
): Promise<ProfessionalLesson> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Você é um Designer Instrucional de elite. Transforme o conteúdo abaixo em um conjunto de SLIDES PROFISSIONAIS IMPACTANTES.
    
    CONTEÚDO: "${content}". 
    Componente Curricular: ${discipline}, Etapa: ${grade}. 
    
    REGRAS:
    1. Crie títulos chamativos e tópicos curtos (máximo 4 por slide).
    2. Crie um 'imagePrompt' ALTAMENTE DESCRITIVO E VISUAL para cada slide. 
       Exemplo bom: "Ilustração 3D detalhada de uma célula animal colorida, estilo laboratório moderno, luz volumétrica, 4k, sem texto".
       Evite: "uma imagem de célula".
    3. Use Português Brasileiro impecável.
    4. NÃO inclua texto dentro dos imagePrompts.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          targetAudience: { type: Type.STRING },
          slides: {
            type: Type.ARRAY,
            items: {
              type: Type.OBJECT,
              properties: {
                title: { type: Type.STRING },
                topics: { type: Type.ARRAY, items: { type: Type.STRING } },
                realityBridge: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
                altText: { type: Type.STRING }
              }
            }
          },
          applicationChallenge: {
            type: Type.OBJECT,
            properties: { scenario: { type: Type.STRING }, problem: { type: Type.STRING }, goal: { type: Type.STRING } }
          },
          quizizzData: {
            type: Type.ARRAY,
            items: { 
              type: Type.OBJECT, 
              properties: { 
                question: { type: Type.STRING }, 
                options: { type: Type.ARRAY, items: { type: Type.STRING } }, 
                answer: { type: Type.STRING }, 
                explanation: { type: Type.STRING } 
              } 
            }
          },
          suggestedVideos: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, promptForGeneration: { type: Type.STRING } } }
          }
        },
        required: ["title", "slides", "applicationChallenge", "quizizzData", "suggestedVideos"]
      }
    }
  });

  if (!response.text) throw new Error("Falha ao gerar slides.");
  return JSON.parse(response.text);
};

export const adaptLessonContent = async (
  originalContent: string, 
  discipline: Discipline, 
  teacherName: string, 
  school: string, 
  chapter: number, 
  grade: Grade
): Promise<AdaptedLesson> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Adapte pedagogicamente para aluno com DI: "${originalContent}". 
    Linguagem simples (Easy-to-read), lúdica e image prompts visuais.`,
    config: {
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
              } 
            } 
          },
          practicalActivities: { 
            type: Type.ARRAY, 
            items: { 
              type: Type.OBJECT, 
              properties: { 
                title: { type: Type.STRING }, 
                description: { type: Type.STRING }, 
                materials: { type: Type.ARRAY, items: { type: Type.STRING } } 
              } 
            } 
          },
          familyActivity: { type: Type.OBJECT, properties: { title: { type: Type.STRING }, description: { type: Type.STRING }, instruction: { type: Type.STRING } } }
        },
        required: ["originalTitle", "adaptedTitle", "summary", "sections", "practicalActivities", "familyActivity"]
      }
    }
  });
  if (!response.text) throw new Error("Falha ao adaptar conteúdo.");
  return { ...JSON.parse(response.text), discipline, teacherName, school, chapter, grade };
};

export const generateLessonImage = async (prompt: string): Promise<string> => {
  if (!prompt) return "";
  try {
    const ai = getAI();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Imagem pedagógica vibrante, artística e de alta qualidade, 4k, sem nenhum texto, letras ou marcas d'água: ${prompt}` }] },
      config: { imageConfig: { aspectRatio: "1:1" } }
    });
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) {
          return `data:image/png;base64,${part.inlineData.data}`;
        }
      }
    }
    return "";
  } catch (err) { 
    console.error("Erro na geração de imagem:", err);
    return ""; 
  }
};

export const generateLessonPlan = async (
  teacherName: string, 
  school: string, 
  discipline: Discipline, 
  grade: Grade, 
  lessonCount: string, 
  bimesterLessonCount: string,
  period: string, 
  startDate: string,
  endDate: string,
  bnccSkills: string[], 
  bnccDescriptions: string[]
): Promise<LessonPlan> => {
  const ai = getAI();
  const skillsContext = bnccSkills.map((code, i) => `${code}: ${bnccDescriptions[i]}`).join('\n');
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Gere um Plano de Aula BNCC completo e detalhado: ${discipline} para ${grade}. 
    Habilidades BNCC: ${skillsContext}. 
    Número de aulas previstas para este plano: ${lessonCount}.
    
    O plano deve ser pedagógico e contemplar:
    - Metodologia: Orientação passo a passo da aula.
    - Atividades: Descrição das atividades que os alunos irão desenvolver.
    - Recursos: Materiais necessários.
    - Avaliação: Como o aluno será avaliado.`,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          title: { type: Type.STRING },
          objectives: { type: Type.ARRAY, items: { type: Type.STRING } },
          methodology: { type: Type.STRING },
          activities: { type: Type.STRING },
          resources: { type: Type.ARRAY, items: { type: Type.STRING } },
          evaluation: { type: Type.STRING }
        },
        required: ["title", "objectives", "methodology", "activities", "resources", "evaluation"]
      }
    }
  });
  if (!response.text) throw new Error("Falha ao gerar plano.");
  return { 
    ...JSON.parse(response.text), 
    school, teacherName, discipline, grade, lessonCount, bimesterLessonCount, period, startDate, endDate, bnccSkills, 
    bnccDescriptions: bnccDescriptions.map(d => d || "Descrição não disponível.") 
  };
};
