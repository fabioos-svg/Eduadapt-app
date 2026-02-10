
import React, { useState } from 'react';
import Header from './components/Header';
import LessonSectionCard from './components/LessonSectionCard';
import { AdaptedLesson, AppStatus, Discipline, Grade } from './types';
import { adaptLessonContent, generateLessonImage } from './services/geminiService';

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

  const handleAdapt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !school.trim() || !teacherName.trim()) {
      setError('Por favor, preencha todos os campos obrigatórios e insira o conteúdo da aula.');
      return;
    }

    try {
      setStatus('adapting');
      setError(null);
      setLesson(null);
      
      const adapted = await adaptLessonContent(inputText, discipline, teacherName, school, chapter, grade);
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
        coloringChallenge: {
          ...prev.coloringChallenge,
          imageUrl: coloringUrl
        }
      }) : null);

      setStatus('ready');
    } catch (err: any) {
      setError('Ocorreu uma falha no processamento. Tente um texto mais curto ou verifique sua conexão.');
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
      alert("Aguarde o carregamento dos recursos do sistema.");
      return;
    }

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Aula_Adaptada_${lesson.discipline}_Cap${lesson.chapter}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
    };

    h2p().set(opt).from(element).save();
  };

  const gradesEF: Grade[] = ['6º EF', '7º EF', '8º EF', '9º EF'];
  const gradesEM: Grade[] = ['1º EM', '2º EM', '3º EM'];
  
  const disciplines: {id: Discipline, label: string, emoji: string}[] = [
    { id: 'Língua Portuguesa', label: 'Língua Port.', emoji: '📚' },
    { id: 'Inglês', label: 'Inglês', emoji: '🇬🇧' },
    { id: 'Matemática', label: 'Matemática', emoji: '➕' },
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
        {(status === 'idle' || status === 'error' || status === 'adapting') && !lesson ? (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800">
                Aulas <span className="text-blue-600 italic">Acessíveis</span>
              </h2>
              <p className="text-lg text-slate-600 font-medium">
                Transforme conteúdos complexos em lições altamente visuais para alunos com deficiência intelectual.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-5 rounded-2xl shadow-sm animate-shake">
                <p className="text-red-700 font-bold">{error}</p>
              </div>
            )}

            <form onSubmit={handleAdapt} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 space-y-3">
                  <label className="block text-slate-500 font-bold uppercase text-xs tracking-widest">Professor(a)</label>
                  <input 
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Nome completo do regente"
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-100 rounded-2xl font-semibold text-slate-700 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>

                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 space-y-3">
                  <label className="block text-slate-500 font-bold uppercase text-xs tracking-widest">Instituição de Ensino</label>
                  <input 
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="Nome da unidade escolar"
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-100 rounded-2xl font-semibold text-slate-700 focus:ring-4 focus:ring-blue-100 outline-none transition-all"
                  />
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 space-y-4">
                <label className="block text-slate-700 font-bold mb-2 text-center uppercase text-sm tracking-widest">Série / Ano Letivo</label>
                <div className="space-y-6">
                  <div className="flex flex-wrap justify-center gap-2">
                    {gradesEF.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGrade(g)}
                        className={`py-2 px-6 rounded-xl font-bold text-sm transition-all ${
                          grade === g 
                            ? 'bg-blue-600 text-white shadow-lg scale-105' 
                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    {gradesEM.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGrade(g)}
                        className={`py-2 px-6 rounded-xl font-bold text-sm transition-all ${
                          grade === g 
                            ? 'bg-purple-600 text-white shadow-lg scale-105' 
                            : 'bg-slate-50 text-slate-400 hover:bg-slate-100 border border-slate-100'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 space-y-4">
                  <label className="block text-slate-700 font-bold mb-2 text-center uppercase text-sm tracking-widest">Componente Curricular</label>
                  <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                    {disciplines.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDiscipline(d.id)}
                        className={`py-3 px-1 rounded-2xl font-bold text-[10px] sm:text-xs transition-all flex flex-col items-center gap-2 border-2 ${
                          discipline === d.id 
                            ? 'bg-blue-600 text-white border-blue-600 shadow-xl scale-105' 
                            : 'bg-white text-slate-500 border-slate-100 hover:border-blue-200'
                        }`}
                      >
                        <span className="text-2xl">{d.emoji}</span>
                        <span className="text-center leading-tight">{d.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 space-y-4 flex flex-col justify-center">
                  <label className="block text-slate-700 font-bold mb-2 text-center uppercase text-sm tracking-widest">Aula / Capítulo</label>
                  <select 
                    value={chapter}
                    onChange={(e) => setChapter(Number(e.target.value))}
                    className="w-full py-4 px-4 bg-slate-50 border border-slate-100 rounded-2xl font-bold text-slate-700 outline-none appearance-none cursor-pointer text-center text-2xl shadow-inner"
                  >
                    {Array.from({ length: 30 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>Capítulo {n}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="relative group">
                <div className="absolute -inset-1 bg-gradient-to-r from-blue-400 to-blue-600 rounded-[2.5rem] blur opacity-10 group-focus-within:opacity-20 transition duration-500"></div>
                <textarea
                  className="relative w-full h-72 p-8 rounded-[2rem] border-2 border-slate-100 focus:border-blue-500 outline-none transition-all text-xl font-medium resize-none shadow-sm bg-white placeholder:text-slate-300"
                  placeholder="Cole aqui o texto da aula original para iniciarmos a adaptação visual..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={status === 'adapting'}
                />
              </div>

              <button
                type="submit"
                disabled={status === 'adapting' || !inputText.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-6 rounded-[2rem] text-2xl transition-all shadow-xl hover:shadow-2xl active:scale-[0.98] flex items-center justify-center gap-4"
              >
                {status === 'adapting' ? (
                  <>
                    <svg className="animate-spin h-8 w-8 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adaptando Pedagogia...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    Gerar Material Inclusivo
                  </>
                )}
              </button>
            </form>
          </div>
        ) : null}

        {lesson && (
          <div className="animate-in fade-in zoom-in-95 duration-700 print:p-0">
            <div className="no-print flex flex-col sm:flex-row gap-6 justify-between items-center mb-16 bg-white p-6 rounded-[2.5rem] shadow-xl border border-blue-50">
              <button 
                onClick={reset}
                className="flex items-center gap-3 text-slate-500 hover:text-blue-600 font-bold px-6 py-4 rounded-[1.5rem] transition-all bg-slate-50 hover:bg-blue-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Nova Adaptação
              </button>
              
              <div className="flex gap-4 w-full sm:w-auto">
                <button 
                  onClick={handleSavePDF}
                  className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white font-bold px-10 py-5 rounded-[1.5rem] shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Baixar PDF
                </button>
                <button 
                  onClick={() => window.print()}
                  className="flex-1 sm:flex-initial bg-emerald-500 hover:bg-emerald-600 text-white font-bold px-10 py-5 rounded-[1.5rem] shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir
                </button>
              </div>
            </div>

            <article id="printable-lesson" className="bg-white rounded-[3.5rem] shadow-2xl p-10 md:p-20 space-y-16 border-[12px] border-blue-50 overflow-hidden relative print:border-0 print:shadow-none print:p-6">
              <div className="border-b-4 border-slate-50 pb-10">
                <div className="flex flex-col md:flex-row justify-between items-start gap-8">
                  <div className="space-y-3">
                    <p className="text-slate-400 font-bold uppercase tracking-[0.2em] text-[10px]">Material Pedagógico Adaptado</p>
                    <h2 className="text-2xl font-bold text-slate-800 leading-tight">{lesson.school}</h2>
                    <p className="text-xl font-bold text-slate-600">Professor(a): <span className="text-blue-600">{lesson.teacherName}</span></p>
                    <div className="flex items-center gap-3 mt-4">
                      <span className={`px-5 py-2 rounded-2xl text-sm font-bold text-white shadow-sm ${lesson.grade.includes('EM') ? 'bg-purple-600' : 'bg-blue-600'}`}>
                        {lesson.grade}
                      </span>
                      <span className="px-5 py-2 rounded-2xl text-sm font-bold bg-slate-100 text-slate-600 border border-slate-200">
                        {lesson.discipline}
                      </span>
                    </div>
                  </div>
                  <div className="flex gap-4">
                    <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 text-center min-w-[120px]">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Capítulo</p>
                      <p className="text-3xl font-black text-slate-800">{lesson.chapter}</p>
                    </div>
                    <div className="bg-slate-50 p-5 rounded-[1.5rem] border border-slate-100 text-center min-w-[120px]">
                      <p className="text-[10px] text-slate-400 font-bold uppercase mb-1">Data</p>
                      <p className="text-xl font-bold text-slate-800">{new Date().toLocaleDateString('pt-BR')}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-6">
                <h1 className="text-6xl md:text-7xl font-bold text-slate-800 leading-[1.1]">
                  {lesson.adaptedTitle}
                </h1>
                <p className="text-3xl text-slate-400 italic font-medium max-w-3xl mx-auto leading-relaxed">
                  {lesson.summary}
                </p>
              </div>

              <div className="space-y-6">
                {lesson.sections.map((section, idx) => (
                  <LessonSectionCard key={idx} section={section} index={idx} />
                ))}
              </div>

              <div className="bg-slate-50 rounded-[3rem] p-12 space-y-10 border-4 border-dashed border-slate-200 break-inside-avoid page-break-inside-avoid">
                <div className="flex flex-col md:flex-row items-center gap-12">
                  <div className="flex-1 space-y-6">
                    <div className="inline-block bg-pink-100 text-pink-700 px-6 py-2 rounded-full font-bold text-sm tracking-widest uppercase shadow-sm">
                      🎨 Atividade de Expressão
                    </div>
                    <h3 className="text-5xl font-bold text-slate-800">Momento do Lúdico</h3>
                    <p className="text-2xl text-slate-600 font-medium leading-relaxed">
                      {lesson.coloringChallenge.description}
                    </p>
                  </div>
                  
                  <div className="flex-1 w-full max-w-md bg-white p-8 rounded-[2.5rem] shadow-xl border-4 border-white ring-1 ring-slate-100">
                    {lesson.coloringChallenge.imageUrl ? (
                      <img 
                        src={lesson.coloringChallenge.imageUrl} 
                        alt="Desenho para colorir" 
                        className="w-full aspect-square object-contain"
                      />
                    ) : (
                      <div className="aspect-square w-full bg-slate-50 animate-pulse rounded-3xl flex items-center justify-center text-slate-300">
                         Gerando imagem de colorir...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 rounded-[3rem] p-12 space-y-8 border-4 border-emerald-100 relative overflow-hidden break-inside-avoid page-break-inside-avoid shadow-inner">
                <div className="flex items-center gap-4">
                  <span className="text-4xl">🏡</span>
                  <h3 className="text-4xl font-bold text-emerald-800">Caminho para Casa</h3>
                </div>
                <div className="space-y-6">
                  <p className="text-3xl font-bold text-emerald-700">{lesson.familyActivity.title}</p>
                  <p className="text-2xl text-slate-700 leading-relaxed font-medium">
                    {lesson.familyActivity.description}
                  </p>
                  <div className="bg-white/90 p-8 rounded-[2rem] border-2 border-emerald-100 shadow-sm">
                    <p className="text-2xl text-emerald-900 leading-relaxed">
                      <strong>💡 Guia para o mediador:</strong> {lesson.familyActivity.instruction}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-20 border-t-4 border-slate-50">
                <div className="max-w-md mx-auto text-center space-y-4">
                  <div className="border-b-4 border-slate-200 w-full h-10"></div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-xs">Visto do Aluno(a)</p>
                </div>
              </div>
            </article>

            <div className="no-print mt-16 bg-blue-600 p-10 rounded-[3rem] text-white shadow-2xl max-w-4xl mx-auto text-center relative overflow-hidden">
               <div className="absolute top-0 right-0 p-8 text-8xl opacity-10 rotate-12">✨</div>
               <p className="text-2xl font-bold leading-relaxed relative z-10">
                "O aprendizado visual e prático é a chave para a autonomia."
               </p>
               <p className="mt-4 text-blue-100 font-medium relative z-10">
                Este material foi otimizado para o Capítulo {lesson.chapter} de {lesson.discipline}.
               </p>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-12 px-6 no-print text-center">
        <p className="text-slate-400 font-bold tracking-widest text-xs uppercase">EduAdapt - Tecnologia em Prol da Inclusão</p>
      </footer>
    </div>
  );
};

export default App;
