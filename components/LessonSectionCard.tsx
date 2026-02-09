
import React from 'react';
import { LessonSection } from '../types';

interface Props {
  section: LessonSection;
  index: number;
}

const LessonSectionCard: React.FC<Props> = ({ section, index }) => {
  const isEven = index % 2 === 0;
  
  return (
    <div className={`flex flex-col ${isEven ? 'md:flex-row' : 'md:flex-row-reverse'} gap-8 items-center py-10 border-b border-blue-100 last:border-0`}>
      <div className="flex-1 space-y-4">
        <div className="inline-block bg-yellow-100 text-yellow-700 font-bold px-3 py-1 rounded-full text-sm mb-2">
          Parte {index + 1}
        </div>
        <h3 className="text-3xl font-bold text-slate-800">{section.title}</h3>
        <p className="text-xl text-slate-600 leading-relaxed font-medium">
          {section.content}
        </p>
      </div>
      <div className="flex-1 w-full max-w-md">
        {section.imageUrl ? (
          <div className="relative group">
            <div className="absolute -inset-2 bg-gradient-to-r from-blue-400 to-purple-400 rounded-3xl blur opacity-25 group-hover:opacity-50 transition duration-1000"></div>
            <img 
              src={section.imageUrl} 
              alt={section.title} 
              className="relative rounded-2xl shadow-xl w-full object-cover aspect-square border-4 border-white"
            />
          </div>
        ) : (
          <div className="aspect-square bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400">
            Gerando imagem...
          </div>
        )}
      </div>
    </div>
  );
};

export default LessonSectionCard;
