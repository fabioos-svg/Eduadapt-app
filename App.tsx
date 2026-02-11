
import React, { useState } from 'react';
import Header from './components/Header';
import LessonSectionCard from './components/LessonSectionCard';
import { AdaptedLesson, AppStatus, Discipline, Grade } from './types';
import { adaptLessonContent, generateLessonImage } from './services/geminiService';

const SobreProjeto: React.FC = () => (
  <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-slate-200 space-y-6 text-slate-700 animate-in fade-in slide-in-from-bottom-4 duration-500">
    <div className="flex items-center gap-4 border-b pb-4 border-slate-100">
      <div className="bg-blue-600 text-white p-3 rounded-2xl">
        <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      </div>
      <h2 className="text-3xl font-bold text-slate-800">EduAdapt: Apostila Pedagógica Inclusiva</h2>
    </div>
    
    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
      <div className="space-y-4">
        <div className="bg-slate-50 p-4 rounded-2xl">
          <p className="font-bold text-blue-600 uppercase text-xs tracking-widest mb-1">Responsáveis</p>
          <p className="text-lg font-bold">Fábio Oliveira da Silva e Andreia</p>
        </div>
        <div className="bg-slate-50 p-4 rounded-2xl">
          <p className="font-bold text-blue-600 uppercase text-xs tracking-widest mb-1">Vínculo</p>
          <p className="text-lg font-bold">IFMG / UFRN (Pós-Graduação Lato Sensu)</p>
        </div>
      </div>
      
      <div className="space-y-4">
        <h3 className="font-bold text-xl text-slate-800 border-l-4 border-blue-500 pl-3">Proposta de Inovação</h3>
        <ul className="space-y-2 list-disc list-inside text-slate-600 font-medium">
          <li>Banco de Dados de plataformas parceiras.</li>
          <li>Ficha Diagnóstica personalizada.</li>
          <li>Algoritmo Adaptativo de acessibilidade.</li>
          <li>Desenho Universal para Aprendizagem (DUA).</li>
        </ul>
      </div>
    </div>

    <div className="bg-blue-50 p-6 rounded-[1.5rem] border border-blue-100">
      <h3 className="font-bold text-xl text-blue-800 mb-2">Aplicação Prática</h3>
      <p className="text-lg leading-relaxed">
        O sistema converte conteúdos complexos em formatos acessíveis: texto simplificado, pictogramas e sugestões lúdicas alinhadas às <strong>Habilidades da BNCC</strong>.
      </p>
    </div>
    
    <footer className="pt-4 text-center text-xs text-slate-400 font-bold border-t border-slate-100">
      © 2025-2026 EduAdapt - Todos os direitos reservados aos autores.
    </footer>
  </div>
);

const App: React.FC = () => {
  const [inputText, setInputText] = useState('');
  const [discipline, setDiscipline] = useState<Discipline>('Língua Portuguesa');
  const [school, setSchool] = useState<string>('');
  const [teacherName, setTeacherName] = useState<string>('');
  const [chapter, setChapter] = useState<number>(1);
  const [grade, setGrade] = useState<Grade>('6º EF');
  const [status, setStatus] = useState<AppStatus>('idle');
  const [lesson, setLesson] = useState<AdaptedLesson | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [showAbout, setShowAbout] = useState(false);

  const handleAdapt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !school.trim() || !teacherName.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios (Instituição, Professor e Conteúdo).');
      return;
    }

    try {
      setStatus('adapting');
      setError(null);
      setLesson(null);
      
      // Armazena o capítulo selecionado para garantir que não seja perdido
      const currentSelectedChapter = chapter;
      
      const adapted = await adaptLessonContent(inputText, discipline, teacherName, school, currentSelectedChapter, grade);
      setLesson(adapted);
      setStatus('generating-images');
      
      const updatedSections = await Promise.all(
        adapted.sections.map(async (sec) => {
          try {
            const url = await generateLessonImage(sec.imagePrompt, false);
            return { ...sec, imageUrl: url };
          } catch (imgErr) {
            return sec;
          }
        })
      );

      let coloringUrl = undefined;
      try {
        coloringUrl = await generateLessonImage(adapted.coloringChallenge.prompt, true);
      } catch (imgErr) {}

      setLesson(prev => prev ? ({
        ...prev,
        sections: updatedSections,
        coloringChallenge: { ...prev.coloringChallenge, imageUrl: coloringUrl }
      }) : null);

      setStatus('ready');
    } catch (err: any) {
      setError('Ocorreu uma falha na adaptação. Tente um texto menor.');
      setStatus('error');
    }
  };

  const reset = () => {
    setLesson(null);
    setInputText('');
    setStatus('idle');
    setError(null);
  };

  const handleSavePDF = () => {
    const element = document.getElementById('printable-lesson');
    if (!element || !lesson) return;
    const h2p = (window as any).html2pdf;
    if (!h2p) {
      alert("Aguarde o carregamento do sistema de PDF.");
      return;
    }
    const opt = {
      margin: [10, 5, 10, 5],
      filename: `Aula_${lesson.discipline}_Cap${lesson.chapter}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true, letterRendering: true, scrollY: 0 },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: ['avoid-all', 'css', 'legacy'] }
    };
    h2p().set(opt).from(element).save();
  };

  const disciplinesList: {id: Discipline, label: string, emoji: string}[] = [
    { id: 'Língua Portuguesa', label: 'Português', emoji: '📚' },
    { id: 'Matemática', label: 'Matemática', emoji: '➕' },
    { id: 'Inglês', label: 'Inglês', emoji: '🇬🇧' },
    { id: 'Ciência', label: 'Ciência', emoji: '🧪' },
    { id: 'Química', label: 'Química', emoji: '⚗️' },
    { id: 'História', label: 'História', emoji: '⏳' },
    { id: 'Geografia', label: 'Geografia', emoji: '🌍' },
    { id: 'Arte', label: 'Arte', emoji: '🎨' },
    { id: 'Sociologia', label: 'Sociologia', emoji: '👥' },
    { id: 'Filosofia', label: 'Filosofia', emoji: '🧠' },
  ];

  return (
    <div className="min-h-screen flex flex-col bg-slate-50">
      <Header />

      <main className="flex-1 max-w-5xl mx-auto w-full px-4 sm:px-6 py-8 md:py-12">
        <div className="flex justify-center mb-8 no-print">
          <button 
            onClick={() => setShowAbout(!showAbout)}
            className={`px-6 py-2 rounded-full font-bold text-sm transition-all flex items-center gap-2 border ${
              showAbout ? 'bg-blue-600 text-white shadow-lg border-blue-600' : 'bg-white text-slate-500 hover:bg-slate-100 border-slate-200'
            }`}
          >
            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            {showAbout ? 'Ocultar Sobre o Projeto' : 'Sobre o Projeto'}
          </button>
        </div>

        {showAbout && <div className="mb-12 no-print"><SobreProjeto /></div>}

        {(status === 'idle' || status === 'error' || status === 'adapting') && !lesson ? (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">
                Aulas <span className="text-blue-600 italic">Adaptadas</span>
              </h2>
              <p className="text-lg text-slate-600 font-medium">
                Crie lições visuais e objetivas para alunos com DI de forma rápida e segura.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-2xl shadow-sm">
                <p className="text-red-700 font-bold">{error}</p>
              </div>
            )}

            <form onSubmit={handleAdapt} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 space-y-3">
                  <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Professor(a)</label>
                  <input 
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Nome do docente"
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-100 rounded-2xl font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 space-y-3">
                  <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-[0.2em]">Escola / Instituição</label>
                  <input 
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="Nome da escola"
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-100 rounded-2xl font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 space-y-4">
                <label className="block text-slate-700 font-bold text-center uppercase text-xs tracking-widest">Série / Ano Letivo</label>
                <div className="flex flex-wrap justify-center gap-2">
                  {['6º EF', '7º EF', '8º EF', '9º EF'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g as Grade)}
                      className={`py-2 px-5 rounded-xl font-bold text-sm transition-all ${grade === g ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {g}
                    </button>
                  ))}
                  {['1º EM', '2º EM', '3º EM'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g as Grade)}
                      className={`py-2 px-5 rounded-xl font-bold text-sm transition-all ${grade === g ? 'bg-purple-600 text-white shadow-md' : 'bg-slate-100 text-slate-500 hover:bg-slate-200'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 space-y-4">
                <label className="block text-slate-700 font-bold text-center uppercase text-xs tracking-widest">Componente Curricular</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {disciplinesList.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDiscipline(d.id)}
                      className={`py-3 px-1 rounded-2xl font-bold text-[10px] transition-all flex flex-col items-center gap-2 border-2 ${discipline === d.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'bg-white text-slate-500 border-slate-50 hover:border-slate-200'}`}
                    >
                      <span className="text-2xl">{d.emoji}</span>
                      <span className="text-center leading-tight">{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 space-y-4 flex flex-col justify-center">
                <label className="block text-slate-700 font-bold mb-2 text-center uppercase text-xs tracking-widest">Aula / Capítulo</label>
                <select 
                  value={chapter}
                  onChange={(e) => setChapter(Number(e.target.value))}
                  className="w-full py-3 px-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none appearance-none cursor-pointer text-center text-xl shadow-inner"
                >
                  {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>Capítulo {n}</option>
                  ))}
                </select>
              </div>

              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200">
                <label className="block text-slate-700 font-bold text-center uppercase text-xs tracking-widest mb-4">Conteúdo Original da Aula</label>
                <textarea
                  className="w-full h-64 p-6 rounded-[1.5rem] border-2 border-slate-50 focus:border-blue-500 outline-none text-lg resize-none shadow-inner bg-slate-50/50"
                  placeholder="Cole aqui o conteúdo que deseja adaptar..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={status === 'adapting'}
                />
              </div>

              <button
                type="submit"
                disabled={status === 'adapting' || !inputText.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-6 rounded-[2rem] text-2xl transition-all shadow-xl active:scale-[0.98]"
              >
                {status === 'adapting' ? 'Processando...' : 'Gerar Aula Adaptada'}
              </button>
            </form>
          </div>
        ) : null}

        {lesson && (
          <div className="animate-in fade-in zoom-in-95 duration-700">
            <div className="no-print flex flex-col sm:flex-row gap-4 mb-8 justify-center items-center">
              <button onClick={reset} className="w-full sm:w-auto bg-slate-200 px-8 py-4 rounded-2xl font-bold hover:bg-slate-300 transition-all">Nova Aula</button>
              <button onClick={handleSavePDF} className="w-full sm:w-auto bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg transition-all flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Salvar PDF
              </button>
              <button onClick={() => window.print()} className="w-full sm:w-auto bg-emerald-500 text-white px-10 py-4 rounded-2xl font-bold hover:bg-emerald-600 shadow-lg transition-all flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm-1 9H8v3h4v-3z" clipRule="evenodd" />
                </svg>
                Imprimir
              </button>
            </div>

            <article id="printable-lesson" className="bg-white rounded-[3rem] p-8 md:p-14 border-[10px] border-blue-50 shadow-2xl space-y-10 mx-auto max-w-[210mm] min-h-[297mm]">
              <div className="border-b-2 border-slate-100 pb-8 flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                  <h2 className="text-xl font-bold text-slate-800">{lesson.school}</h2>
                  <p className="text-lg font-bold text-slate-600 leading-none">Prof(a): <span className="text-blue-600">{lesson.teacherName}</span></p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[10px] font-bold bg-blue-100 px-2 py-1 rounded text-blue-700 uppercase">{lesson.discipline}</span>
                    <span className="text-[10px] font-bold bg-slate-100 px-2 py-1 rounded text-slate-500 uppercase">{lesson.grade}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-slate-200 uppercase leading-none">CAP. {lesson.chapter}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="text-center space-y-4">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 leading-tight">{lesson.adaptedTitle}</h1>
                <p className="text-xl text-slate-400 italic font-medium max-w-2xl mx-auto">{lesson.summary}</p>
              </div>

              <div className="space-y-4">
                {lesson.sections.map((section, idx) => (
                  <div key={idx} className="break-inside-avoid">
                    <LessonSectionCard section={section} index={idx} />
                  </div>
                ))}
              </div>

              <div className="bg-slate-50 p-8 rounded-[2.5rem] border-4 border-dashed border-slate-200 break-inside-avoid">
                <h3 className="text-2xl font-bold text-slate-800 mb-6 flex items-center gap-3">
                   <span className="bg-pink-100 p-2 rounded-xl text-xl">🎨</span> Momento de Colorir
                </h3>
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <p className="flex-1 text-lg font-medium text-slate-600">{lesson.coloringChallenge.description}</p>
                  <div className="w-full max-w-[280px] bg-white p-4 rounded-[1.5rem] shadow-lg border-2 border-slate-100">
                    {lesson.coloringChallenge.imageUrl ? (
                      <img src={lesson.coloringChallenge.imageUrl} alt="Desenho para colorir" className="w-full aspect-square object-contain" />
                    ) : <div className="aspect-square flex items-center justify-center text-slate-300 text-xs italic">Criando desenho...</div>}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 p-8 rounded-[2.5rem] border-4 border-emerald-100 space-y-4 break-inside-avoid">
                <h3 className="text-2xl font-bold text-emerald-800 flex items-center gap-3">
                  <span className="bg-emerald-100 p-2 rounded-xl text-xl">🏡</span> Para Fazer em Casa
                </h3>
                <p className="text-xl font-bold text-emerald-700 leading-tight">{lesson.familyActivity.title}</p>
                <p className="text-lg text-slate-700">{lesson.familyActivity.description}</p>
                <div className="bg-white/80 p-5 rounded-2xl border border-emerald-100 italic text-emerald-900 text-base">
                  <strong>Dica para a Família:</strong> {lesson.familyActivity.instruction}
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex justify-center">
                 <div className="w-full max-w-xs text-center">
                    <div className="border-b-2 border-slate-200 h-8 mb-2"></div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Visto do Aluno(a)</p>
                 </div>
              </div>
            </article>
          </div>
        )}
      </main>

      <footer className="py-12 border-t text-center no-print bg-white">
        <p className="text-slate-400 font-bold tracking-widest text-[10px] uppercase">EduAdapt - Inclusão Criativa e Digital</p>
      </footer>
    </div>
  );
};

export default App;
