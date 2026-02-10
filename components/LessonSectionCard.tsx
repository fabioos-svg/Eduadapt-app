
import React from 'react';
import { LessonSection } from '../types';

interface Props {
  section: LessonSection;
  index: number;
}

const LessonSectionCard: React.FC<Props> = ({ section, index }) => {
  const isEven = index % 2 === 0;
  const isActivity = section.type === 'activity';
  
  return (
    <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-10 items-center py-12 border-b border-blue-50 last:border-0`}>
      <div className="flex-1 space-y-6">
        <div className="flex items-center gap-3">
          <span className="bg-slate-800 text-white font-bold w-8 h-8 rounded-full flex items-center justify-center text-sm shadow-md">
            {index + 1}
          </span>
          <span className={`px-4 py-1 rounded-full text-xs font-bold uppercase tracking-widest shadow-sm ${
            isActivity 
              ? 'bg-amber-100 text-amber-700 border border-amber-200' 
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {isActivity ? '✏️ Atividade Prática' : '📖 Explicação'}
          </span>
        </div>
        
        <h3 className="text-3xl font-bold text-slate-800 leading-tight">
          {section.title}
        </h3>
        
        <div className={`p-6 rounded-3xl border-2 leading-relaxed text-xl font-medium ${
          isActivity 
            ? 'bg-amber-50/50 border-amber-100 text-amber-900' 
            : 'bg-blue-50/50 border-blue-100 text-slate-700'
        }`}>
          {section.content}
        </div>
      </div>

      <div className="flex-1 w-full max-w-lg">
        {section.imageUrl ? (
          <div className="relative">
            <div className={`absolute -inset-4 rounded-[2.5rem] blur-xl opacity-20 transition-all duration-500 ${
              isActivity ? 'bg-amber-400' : 'bg-blue-400'
            }`}></div>
            <img 
              src={section.imageUrl} 
              alt={section.title} 
              className="relative rounded-[2rem] shadow-2xl w-full object-contain aspect-square bg-white border-4 border-white"
            />
          </div>
        ) : (
          <div className="aspect-square bg-slate-50 animate-pulse rounded-[2rem] flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mb-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="font-bold">Gerando suporte visual...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonSectionCard;
