
import React from 'react';

const Header: React.FC = () => {
  return (
    <header className="bg-white shadow-sm py-4 px-6 sticky top-0 z-50 no-print">
      <div className="max-w-6xl mx-auto flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="bg-blue-500 p-2 rounded-xl">
            <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.747 0 3.332.477 4.5 1.253v13C19.832 18.477 18.247 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
            </svg>
          </div>
          <div>
            <h1 className="text-2xl font-bold text-slate-800">EduAdapt</h1>
            <p className="text-xs text-blue-600 font-medium tracking-wide uppercase">Inclusão Criativa</p>
          </div>
        </div>
        <nav className="hidden md:flex gap-6 text-slate-600 font-medium">
          <a href="#" className="hover:text-blue-500 transition-colors">Início</a>
          <a href="#" className="hover:text-blue-500 transition-colors">Como Funciona</a>
          <a href="#" className="hover:text-blue-500 transition-colors">Sobre DI</a>
        </nav>
      </div>
    </header>
  );
};

export default Header;
