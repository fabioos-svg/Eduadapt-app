
export interface LessonSection {
  title: string;
  content: string;
  imagePrompt: string;
  imageUrl?: string;
  isColoringPage?: boolean;
  type: 'explanation' | 'activity' | 'practical';
  supports?: {
    level1: string; // A Pista
    level2: string; // O Caminho
    level3: string; // A Ponte
  };
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
  practicalActivities: {
    title: string;
    description: string;
    materials: string[];
  }[];
  familyActivity: {
    title: string;
    description: string;
    instruction: string;
  };
}

export interface Slide {
  title: string;
  topics: string[];
  realityBridge: string;
  imagePrompt: string;
  imageUrl?: string;
  altText: string;
}

export interface QuizQuestion {
  question: string;
  options: string[];
  answer: string;
  explanation: string;
}

export interface VideoResource {
  title: string;
  description: string;
  promptForGeneration: string;
}

export interface ProfessionalLesson {
  title: string;
  targetAudience: string;
  slides: Slide[];
  applicationChallenge: {
    scenario: string;
    problem: string;
    goal: string;
  };
  suggestedVideos: VideoResource[];
  quizizzData: QuizQuestion[];
}

export interface ExerciseQuestion {
  type: 'multiple_choice' | 'open' | 'true_false';
  statement: string;
  options?: string[];
  answerKey: string;
  explanation?: string;
  supports?: {
    level1: string; // A Pista
    level2: string; // O Caminho
    level3: string; // A Ponte
  };
}

export interface ExerciseSheet {
  title: string;
  questions: ExerciseQuestion[];
}

export interface LessonPlan {
  school: string;
  teacherName: string;
  discipline: string;
  grade: string;
  lessonCount: string;
  bimester: string;
  bimesterLessonCount: string;
  period: string;
  startDate: string;
  endDate: string;
  bnccSkills: string[];
  bnccDescriptions: string[];
  title: string;
  objectives: string[];
  methodology: string;
  activities: string;
  resources: string[];
  evaluation: string;
}

export interface BNCCSearchResult {
  code: string;
  description: string;
  sources: { uri: string; title: string }[];
}

export type Discipline = 
  | 'Língua Portuguesa' 
  | 'Matemática' 
  | 'Ciências' 
  | 'Geografia' 
  | 'História' 
  | 'Educação Física' 
  | 'Arte' 
  | 'Ensino Religioso'
  | 'Língua Inglesa'
  | 'Biologia'
  | 'Física'
  | 'Química'
  | 'Sociologia'
  | 'Filosofia';

export type Grade = 
  | 'Educação Infantil'
  | '1º ao 5º ano (Fundamental - Iniciais)'
  | '6º ao 9º ano (Fundamental - Finais)'
  | 'Ensino Médio';

export type ExerciseDifficulty = 'Fácil' | 'Médio' | 'Desafiador';

export type AppStatus = 'idle' | 'adapting' | 'designing' | 'generating-images' | 'ready' | 'error' | 'planning' | 'searching-bncc' | 'generating-exercises';
export type AppMode = 'adaptation' | 'planning' | 'slides' | 'exercises';
