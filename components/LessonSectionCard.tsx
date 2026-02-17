
import React, { useState } from 'react';
import { LessonSection } from '../types';

interface Props {
  section: LessonSection;
  index: number;
  isEditing?: boolean;
  onContentChange?: (val: string) => void;
  onTitleChange?: (val: string) => void;
}

const LessonSectionCard: React.FC<Props> = ({ section, index, isEditing, onContentChange, onTitleChange }) => {
  const [activeSupport, setActiveSupport] = useState<number | null>(null);
  const isActivity = section.type === 'activity';

  const toggleSupport = (level: number) => {
    setActiveSupport(activeSupport === level ? null : level);
  };
  
  return (
    <div className={`flex flex-col gap-6 py-10 border-b-2 border-slate-50 last:border-0 break-inside-avoid`}>
      <div className="flex items-center gap-3">
        <span className="bg-blue-600 text-white font-black w-8 h-8 rounded-xl flex items-center justify-center text-sm shadow-md">
          {index + 1}
        </span>
        <span className={`px-4 py-1 rounded-full text-[10px] font-black uppercase tracking-widest shadow-sm border ${
          isActivity 
            ? 'bg-amber-100 text-amber-700 border-amber-200' 
            : 'bg-blue-100 text-blue-700 border-blue-200'
        }`}>
          {isActivity ? '✏️ Atividade Interativa' : '📖 Momento de Leitura'}
        </span>
      </div>
      
      {isEditing ? (
        <input 
          className="text-2xl font-black text-slate-800 leading-tight w-full bg-slate-50 p-4 rounded-2xl border-2 border-slate-100 focus:outline-none focus:border-blue-500"
          value={section.title}
          onChange={(e) => onTitleChange?.(e.target.value)}
        />
      ) : (
        <h3 className="text-3xl font-black text-slate-800 leading-tight">
          {section.title}
        </h3>
      )}

      <div className="w-full flex justify-center py-4">
        {section.imageUrl ? (
          <div className="max-w-md w-full relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-100 to-indigo-50 rounded-[2.5rem] blur opacity-30"></div>
            <img 
              src={section.imageUrl} 
              alt={section.title} 
              className="relative rounded-[2rem] shadow-xl w-full object-cover aspect-square bg-white border-8 border-white"
            />
          </div>
        ) : (
          <div className="max-w-md w-full aspect-square bg-slate-50 animate-pulse rounded-[2rem] flex flex-col items-center justify-center text-slate-300 border-4 border-dashed border-slate-100">
            <svg className="w-12 h-12 mb-3 opacity-20" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <p className="text-xs font-black uppercase tracking-widest opacity-40">Desenhando Lição...</p>
          </div>
        )}
      </div>
      
      <div className={`p-8 rounded-[2.5rem] border-2 leading-relaxed text-xl font-medium shadow-sm transition-all ${
        isActivity 
          ? 'bg-amber-50/60 border-amber-100 text-amber-900' 
          : 'bg-white border-blue-50 text-slate-700'
      }`}>
        {isEditing ? (
          <textarea 
            className="w-full bg-transparent border-none resize-none focus:outline-none min-h-[150px]"
            value={section.content}
            onChange={(e) => onContentChange?.(e.target.value)}
          />
        ) : (
          section.content
        )}
      </div>

      {section.supports && !isEditing && (
        <div className="no-print space-y-4 bg-slate-50/50 p-6 rounded-[2rem] border border-slate-100">
          <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mb-2">💡 Suporte Pedagógico:</p>
          <div className="flex flex-wrap gap-3">
            <button 
              onClick={() => toggleSupport(1)}
              className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tighter border-2 transition-all ${
                activeSupport === 1 ? 'bg-amber-500 text-white border-amber-600 shadow-lg' : 'bg-white text-amber-600 border-amber-100'
              }`}
            >
              Nível 1: A Pista
            </button>
            <button 
              onClick={() => toggleSupport(2)}
              className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tighter border-2 transition-all ${
                activeSupport === 2 ? 'bg-emerald-500 text-white border-emerald-600 shadow-lg' : 'bg-white text-emerald-600 border-emerald-100'
              }`}
            >
              Nível 2: O Caminho
            </button>
            <button 
              onClick={() => toggleSupport(3)}
              className={`px-5 py-3 rounded-2xl text-[10px] font-black uppercase tracking-tighter border-2 transition-all ${
                activeSupport === 3 ? 'bg-indigo-500 text-white border-indigo-600 shadow-lg' : 'bg-white text-indigo-600 border-indigo-100'
              }`}
            >
              Nível 3: A Ponte
            </button>
          </div>

          {activeSupport === 1 && (
            <div className="p-6 bg-amber-50 rounded-3xl text-base border-2 border-amber-200 animate-in slide-in-from-top-2 text-amber-900 font-bold italic">
              <span className="block text-[10px] uppercase font-black mb-1 text-amber-600">Dica Visual/Sutil:</span>
              {section.supports.level1}
            </div>
          )}
          {activeSupport === 2 && (
            <div className="p-6 bg-emerald-50 rounded-3xl text-base border-2 border-emerald-200 animate-in slide-in-from-top-2 text-emerald-900 font-bold italic">
              <span className="block text-[10px] uppercase font-black mb-1 text-emerald-600">Guia de Processo (Passo a Passo):</span>
              {section.supports.level2}
            </div>
          )}
          {activeSupport === 3 && (
            <div className="p-6 bg-indigo-50 rounded-3xl text-base border-2 border-indigo-200 animate-in slide-in-from-top-2 text-indigo-900 font-bold italic">
              <span className="block text-[10px] uppercase font-black mb-1 text-indigo-600">Explicação Profunda (Analogia e Exemplo):</span>
              {section.supports.level3}
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default LessonSectionCard;
