
import React from 'react';
import { LessonSection } from '../types';

interface Props {
  section: LessonSection;
  index: number;
  isEditing?: boolean;
  onContentChange?: (val: string) => void;
  onTitleChange?: (val: string) => void;
}

const LessonSectionCard: React.FC<Props> = ({ section, index, isEditing, onContentChange, onTitleChange }) => {
  const isEven = index % 2 === 0;
  const isActivity = section.type === 'activity';
  
  return (
    <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-6 items-center py-6 border-b border-blue-50 last:border-0 break-inside-avoid`}>
      <div className="flex-[1.2] space-y-3 w-full">
        <div className="flex items-center gap-3">
          <span className="bg-slate-800 text-white font-bold w-6 h-6 rounded-full flex items-center justify-center text-[10px] shadow-md">
            {index + 1}
          </span>
          <span className={`px-2 py-0.5 rounded-full text-[8px] font-bold uppercase tracking-widest shadow-sm border ${
            isActivity 
              ? 'bg-amber-100 text-amber-700 border-amber-200' 
              : 'bg-blue-100 text-blue-700 border-blue-200'
          }`}>
            {isActivity ? '✏️ Atividade' : '📖 Lição'}
          </span>
        </div>
        
        {isEditing ? (
          <input 
            className="text-lg font-bold text-slate-800 leading-tight w-full bg-blue-50/50 p-2 rounded-lg border border-blue-100 focus:outline-none focus:ring-2 focus:ring-blue-200"
            value={section.title}
            onChange={(e) => onTitleChange?.(e.target.value)}
          />
        ) : (
          <h3 className="text-lg font-bold text-slate-800 leading-tight">
            {section.title}
          </h3>
        )}
        
        <div className={`p-5 rounded-2xl border leading-relaxed text-sm font-medium shadow-sm ${
          isActivity 
            ? 'bg-amber-50/40 border-amber-100 text-amber-900' 
            : 'bg-blue-50/40 border-blue-100 text-slate-700'
        }`}>
          {isEditing ? (
            <textarea 
              className="w-full bg-transparent border-none resize-none focus:outline-none min-h-[80px]"
              value={section.content}
              onChange={(e) => onContentChange?.(e.target.value)}
            />
          ) : (
            section.content
          )}
        </div>
      </div>

      <div className="flex-1 w-full max-w-[200px] md:max-w-[240px]">
        {section.imageUrl ? (
          <div className="relative group">
            <img 
              src={section.imageUrl} 
              alt={section.title} 
              className="relative rounded-2xl shadow-md w-full object-contain aspect-square bg-white border border-slate-100 max-h-[220px] transition-transform group-hover:scale-105"
            />
          </div>
        ) : (
          <div className="aspect-square bg-slate-50 animate-pulse rounded-2xl flex flex-col items-center justify-center text-slate-300 border border-dashed border-slate-200">
            <p className="text-[9px] font-bold text-center px-4 leading-tight uppercase">Gerando ilustração...</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonSectionCard;
