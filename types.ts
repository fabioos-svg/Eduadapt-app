
export interface LessonSection {
  title: string;
  content: string;
  imagePrompt: string;
  imageUrl?: string;
  isColoringPage?: boolean;
  type: 'explanation' | 'activity';
}

export interface AdaptedLesson {
  originalTitle: string;
  adaptedTitle: string;
  discipline: string;
  teacherName: string;
  school: string;
  chapter: number;
  grade: string;
  summary: string;
  sections: LessonSection[];
  coloringChallenge: {
    description: string;
    prompt: string;
    imageUrl?: string;
  };
  familyActivity: {
    title: string;
    description: string;
    instruction: string;
  };
}

export type Discipline = 
  | 'Arte' 
  | 'Ciência' 
  | 'Língua Portuguesa' 
  | 'Sociologia' 
  | 'Filosofia' 
  | 'História' 
  | 'Geografia' 
  | 'Matemática'
  | 'Inglês'
  | 'Química'
  | 'Biologia'
  | 'Física'
  | 'Espanhol';

export type Grade = '6º EF' | '7º EF' | '8º EF' | '9º EF' | '1º EM' | '2º EM' | '3º EM';
export type AppStatus = 'idle' | 'adapting' | 'generating-images' | 'ready' | 'error';
