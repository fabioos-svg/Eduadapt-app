
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
    <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-6 items-center py-4 border-b border-blue-50 last:border-0 break-inside-avoid`}>
      <div className="flex-[1.2] space-y-2">
        <div className="flex items-center gap-3">
          <span className="bg-slate-800 text-white font-bold w-5 h-5 rounded-full flex items-center justify-center text-[9px] shadow-md">
            {index + 1}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest shadow-sm ${
            isActivity 
              ? 'bg-amber-100 text-amber-700 border border-amber-200' 
              : 'bg-blue-100 text-blue-700 border border-blue-200'
          }`}>
            {isActivity ? '✏️ Atividade' : '📖 Lição'}
          </span>
        </div>
        
        <h3 className="text-lg font-bold text-slate-800 leading-tight">
          {section.title}
        </h3>
        
        <div className={`p-4 rounded-2xl border leading-relaxed text-sm font-medium ${
          isActivity 
            ? 'bg-amber-50/40 border-amber-100 text-amber-900' 
            : 'bg-blue-50/40 border-blue-100 text-slate-700'
        }`}>
          {section.content}
        </div>
      </div>

      <div className="flex-1 w-full max-w-[200px] md:max-w-[240px]">
        {section.imageUrl ? (
          <div className="relative">
            <img 
              src={section.imageUrl} 
              alt={section.title} 
              className="relative rounded-2xl shadow-md w-full object-contain aspect-square bg-white border border-slate-100 max-h-[200px]"
            />
          </div>
        ) : (
          <div className="aspect-square bg-slate-50 animate-pulse rounded-2xl flex flex-col items-center justify-center text-slate-300 border border-dashed border-slate-200">
            <p className="text-[8px] font-bold text-center px-4 leading-tight uppercase">Gerando ilustração...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonSectionCard;
