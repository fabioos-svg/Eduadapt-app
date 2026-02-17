
import { GoogleGenAI, Type } from "@google/genai";
import { AdaptedLesson, Discipline, Grade, LessonPlan, BNCCSearchResult, ProfessionalLesson, ExerciseSheet, ExerciseDifficulty } from "../types";

// Função para obter a instância do AI usando a chave mais atual do contexto
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
  adapted: boolean = false,
  difficulty: ExerciseDifficulty = 'Médio'
): Promise<ExerciseSheet> => {
  const ai = getAI();
  
  const typeRequirements = types.map(t => {
    if (t === 'multiple_choice') return "Múltipla Escolha (com exatamente 4 opções)";
    if (t === 'open') return "Dissertativa (pergunta aberta)";
    if (t === 'true_false') return "Verdadeiro ou Falso";
    return t;
  }).join(', ');

  const inclusionRules = adapted ? `
    REGRAS DE INCLUSÃO (ALUNO DI):
    1. LINGUAGEM: Use "Linguagem Simples" (frases curtas, diretas, literais).
    2. NÍVEIS DE SUPORTE (OBRIGATÓRIO):
       - level1 (A Pista): Dica visual ou gatilho mental sutil.
       - level2 (O Caminho): Guia do processo lógico para resolver, sem dar a resposta.
       - level3 (A Ponte): Explicação profunda, analogia e exemplo similar resolvido.
  ` : `
    REGRAS PADRÃO:
    1. LINGUAGEM: Adequada para a série ${grade} e nível ${difficulty}.
    2. SUPORTE: Não gere o objeto 'supports'.
  `;

  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Você é um especialista em avaliação pedagógica. Crie ${count} exercícios baseados no conteúdo abaixo.

    CONTEÚDO BASE: "${content}"

    REGRAS DE FORMULAÇÃO DE PERGUNTAS (CRÍTICO):
    - NÃO utilize frases genéricas como "De acordo com o texto", "Segundo o texto" ou "Com base no texto" se você estiver perguntando diretamente sobre o conceito.
    - SÓ utilize citações ao texto se você criar um pequeno parágrafo/texto de apoio dentro do enunciado da própria questão. Caso contrário, não cite "texto".
    - Foque o enunciado diretamente na situação-problema ou no conceito teórico de forma clara e objetiva.

    Componente: ${discipline} | Série: ${grade}
    ${inclusionRules}
    Tipos: [${typeRequirements}]

    Retorne em JSON.`,
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
  return JSON.parse(response.text);
};

export const generateProfessionalLesson = async (
  content: string,
  discipline: string,
  grade: string
): Promise<ProfessionalLesson> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Você é um designer instrucional sênior. Transforme o conteúdo abaixo em SLIDES PROFISSIONAIS para uma aula.
    
    CONTEÚDO: "${content}"
    DISCIPLINA: ${discipline}
    SÉRIE: ${grade}

    REQUISITOS FUNDAMENTAIS (NÃO IGNORE):
    1. Para cada slide, você DEVE gerar o campo "detailedContent".
    2. O "detailedContent" DEVE ser um texto explicativo longo (mínimo de 150 palavras por slide) que serve como base teórica completa para o professor. 
    3. Use linguagem acadêmica porém acessível no detailedContent, citando conceitos e explicando o "porquê" de cada tópico.
    4. O "realityBridge" deve conectar o tema à vida cotidiana do aluno.

    Retorne em JSON conforme o schema.`,
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
                detailedContent: { type: Type.STRING, description: "Explicação teórica densa para o professor." },
                realityBridge: { type: Type.STRING },
                imagePrompt: { type: Type.STRING },
                altText: { type: Type.STRING }
              },
              required: ["title", "topics", "detailedContent", "realityBridge", "imagePrompt"]
            }
          },
          applicationChallenge: {
            type: Type.OBJECT,
            properties: { scenario: { type: Type.STRING }, problem: { type: Type.STRING }, goal: { type: Type.STRING } },
            required: ["scenario", "problem", "goal"]
          },
          quizizzData: {
            type: Type.ARRAY,
            items: { type: Type.OBJECT, properties: { question: { type: Type.STRING }, options: { type: Type.ARRAY, items: { type: Type.STRING } }, answer: { type: Type.STRING }, explanation: { type: Type.STRING } } }
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
    contents: `Adapte pedagogicamente para aluno com Deficiência Intelectual (DI): "${originalContent}". 
    
    REGRAS DE OURO:
    1. FORMATO: NÃO CRIE SLIDES. Crie um material de leitura e atividades em formato de documento.
    2. LINGUAGEM: Simples, direta, literal, frases curtas.
    3. NÍVEIS DE SUPORTE (OBRIGATÓRIO PARA CADA SEÇÃO):
       - level1 (Nível 1 - A Pista): Dica visual/gatilho mental sutil.
       - level2 (Nível 2 - O Caminho): Guia passo a passo da lógica, sem dar a resposta.
       - level3 (Nível 3 - A Ponte): Explicação profunda, analogia concreta e exemplo resolvido similar.
    4. ATIVIDADES PRÁTICAS: Crie pelo menos 2 experiências concretas (campo 'practicalActivities').
    5. ATIVIDADE PARA CASA: Crie 1 missão lúdica para família (campo 'familyActivity').

    Retorne estritamente JSON conforme o schema.`,
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
                type: { type: Type.STRING, enum: ['explanation', 'activity'] },
                supports: {
                  type: Type.OBJECT,
                  properties: {
                    level1: { type: Type.STRING },
                    level2: { type: Type.STRING },
                    level3: { type: Type.STRING }
                  }
                }
              },
              required: ["title", "content", "imagePrompt", "type", "supports"]
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
              },
              required: ["title", "description", "materials"]
            } 
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
    // Use gemini-2.5-flash-image for more consistent educational illustrations
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash-image',
      contents: { parts: [{ text: `Educational illustration for school, clear colors, white background, no text, style: vector art for education. Prompt: ${prompt}` }] },
      config: { 
        imageConfig: { aspectRatio: "1:1" } 
      }
    });
    
    const candidate = response.candidates?.[0];
    if (candidate?.content?.parts) {
      for (const part of candidate.content.parts) {
        if (part.inlineData?.data) return `data:image/png;base64,${part.inlineData.data}`;
      }
    }
    return "";
  } catch (err: any) { 
    console.error("Erro na geração de imagem:", err);
    return ""; 
  }
};

export const generateLessonPlan = async (
  teacherName: string, school: string, discipline: Discipline, grade: Grade, lessonCount: string, bimester: string, bimesterLessonCount: string,
  startDate: string, endDate: string, bnccSkills: string[], bnccDescriptions: string[]
): Promise<LessonPlan> => {
  const ai = getAI();
  const response = await ai.models.generateContent({
    model: 'gemini-3-flash-preview',
    contents: `Gere um Plano de Aula estruturado para ${discipline} (${grade}). 
    Escola: ${school}. Professor: ${teacherName}. 
    Bimestre: ${bimester}. Período: de ${startDate} a ${endDate}.
    Habilidades BNCC selecionadas: ${bnccSkills.join(', ')} (${bnccDescriptions.join('; ')}).

    Retorne em JSON com os campos: title, objectives (array de strings), methodology (string), resources (array de strings), evaluation (string), activities (string).
    
    Importante: A metodologia deve ser detalhada e as atividades devem ser coerentes com as habilidades.`,
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
  return { 
    ...JSON.parse(response.text), 
    school, 
    teacherName, 
    discipline, 
    grade, 
    lessonCount, 
    bimester,
    bimesterLessonCount, 
    period: `de ${startDate} a ${endDate}`, 
    startDate, 
    endDate, 
    bnccSkills, 
    bnccDescriptions 
  };
};
