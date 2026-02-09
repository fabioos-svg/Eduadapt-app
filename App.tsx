
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
      setError('Por favor, preencha o nome da Instituição, do Professor e o conteúdo da aula.');
      return;
    }

    try {
      setStatus('adapting');
      setError(null);
      setLesson(null);
      
      const adapted = await adaptLessonContent(inputText, discipline, teacherName, school, chapter, grade);
      setLesson(adapted); // Exibe o texto imediatamente
      
      setStatus('generating-images');
      
      // Gera imagens de forma assíncrona para não travar a visualização do texto
      const updatedSections = await Promise.all(
        adapted.sections.map(async (sec) => {
          try {
            const url = await generateLessonImage(sec.imagePrompt, false);
            return { ...sec, imageUrl: url };
          } catch (imgErr) {
            console.warn("Falha ao gerar imagem de uma seção:", imgErr);
            return sec;
          }
        })
      );

      let coloringUrl = undefined;
      try {
        coloringUrl = await generateLessonImage(adapted.coloringChallenge.prompt, true);
      } catch (imgErr) {
        console.warn("Falha ao gerar imagem de colorir:", imgErr);
      }

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
      console.error("Erro no fluxo principal:", err);
      let errorMsg = 'Ocorreu um erro ao adaptar sua aula. Tente reduzir o tamanho do texto ou verificar sua conexão.';
      if (err.message?.includes('entity was not found')) {
        errorMsg = 'Erro de autenticação da API. Por favor, recarregue a página ou selecione sua chave novamente.';
      }
      setError(errorMsg);
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
      alert("A biblioteca de PDF ainda está carregando. Tente em 2 segundos.");
      return;
    }

    const opt = {
      margin: [10, 10, 10, 10],
      filename: `Aula_${lesson.chapter}_${lesson.grade.replace(' ', '_')}.pdf`,
      image: { type: 'jpeg', quality: 0.98 },
      html2canvas: { scale: 2, useCORS: true },
      jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' },
      pagebreak: { mode: 'avoid-all' }
    };

    h2p().set(opt).from(element).save();
  };

  const handlePrint = () => {
    window.print();
  };

  const gradesEF: Grade[] = ['6º EF', '7º EF', '8º EF', '9º EF'];
  const gradesEM: Grade[] = ['1º EM', '2º EM', '3º EM'];
  
  const disciplines: {id: Discipline, label: string, emoji: string}[] = [
    { id: 'Língua Portuguesa', label: 'Língua Portuguesa', emoji: '📚' },
    { id: 'Matemática', label: 'Matemática', emoji: '➕' },
    { id: 'Ciência', label: 'Ciência', emoji: '🧪' },
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
                Aulas <span className="text-blue-500 italic">Inclusivas</span>
              </h2>
              <p className="text-lg text-slate-600">
                Transforme conteúdos complexos em lições acessíveis para alunos com DI.
              </p>
            </div>

            {error && (
              <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-xl shadow-sm">
                <p className="text-red-700 font-medium">{error}</p>
              </div>
            )}

            <form onSubmit={handleAdapt} className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {/* Nome do Professor */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-3">
                  <label className="block text-slate-700 font-bold uppercase text-xs tracking-widest">Nome do Professor</label>
                  <input 
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Ex: João da Silva"
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-700 focus:ring-4 focus:ring-blue-100 outline-none"
                    required
                  />
                </div>

                {/* Instituição de Ensino */}
                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-3">
                  <label className="block text-slate-700 font-bold uppercase text-xs tracking-widest">Instituição / Escola</label>
                  <input 
                    type="text"
                    value={school}
                    onChange={(e) => setSchool(e.target.value)}
                    placeholder="Nome da Escola ou Instituição"
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-200 rounded-2xl font-medium text-slate-700 focus:ring-4 focus:ring-blue-100 outline-none"
                    required
                  />
                </div>
              </div>

              {/* Seleção de Série / Ano */}
              <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                <label className="block text-slate-700 font-bold mb-2 text-center uppercase text-sm tracking-widest">Série / Ano</label>
                <div className="space-y-4">
                  <div className="flex flex-wrap justify-center gap-2">
                    {gradesEF.map((g) => (
                      <button
                        key={g}
                        type="button"
                        onClick={() => setGrade(g)}
                        className={`py-2 px-5 rounded-xl font-bold text-sm transition-all ${
                          grade === g 
                            ? 'bg-blue-500 text-white shadow-md' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
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
                        className={`py-2 px-5 rounded-xl font-bold text-sm transition-all ${
                          grade === g 
                            ? 'bg-purple-500 text-white shadow-md' 
                            : 'bg-slate-100 text-slate-500 hover:bg-slate-200'
                        }`}
                      >
                        {g}
                      </button>
                    ))}
                  </div>
                </div>
              </div>

              {/* Disciplina e Capítulo */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="md:col-span-2 bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4">
                  <label className="block text-slate-700 font-bold mb-2 text-center uppercase text-sm tracking-widest">Disciplina</label>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                    {disciplines.map((d) => (
                      <button
                        key={d.id}
                        type="button"
                        onClick={() => setDiscipline(d.id)}
                        className={`py-2 px-2 rounded-xl font-bold text-[10px] sm:text-xs transition-all flex flex-col items-center gap-1 ${
                          discipline === d.id 
                            ? 'bg-blue-600 text-white shadow-lg ring-4 ring-blue-100' 
                            : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
                        }`}
                      >
                        <span className="text-lg">{d.emoji}</span>
                        <span className="text-center leading-tight">{d.label}</span>
                      </button>
                    ))}
                  </div>
                </div>

                <div className="bg-white p-6 rounded-3xl shadow-sm border border-slate-200 space-y-4 flex flex-col justify-center">
                  <label className="block text-slate-700 font-bold mb-2 text-center uppercase text-sm tracking-widest">Aula / Capítulo</label>
                  <select 
                    value={chapter}
                    onChange={(e) => setChapter(Number(e.target.value))}
                    className="w-full py-4 px-4 bg-slate-100 border-none rounded-2xl font-bold text-slate-700 outline-none appearance-none cursor-pointer text-center text-lg"
                  >
                    {Array.from({ length: 27 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>Capítulo {n}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Conteúdo Original */}
              <div className="relative">
                <textarea
                  className="w-full h-64 p-6 rounded-3xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-100 outline-none transition-all text-lg resize-none shadow-sm bg-white"
                  placeholder="Cole aqui o conteúdo original da sua aula..."
                  value={inputText}
                  onChange={(e) => setInputText(e.target.value)}
                  disabled={status === 'adapting'}
                />
              </div>

              <button
                type="submit"
                disabled={status === 'adapting' || !inputText.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-5 rounded-2xl text-xl transition-all shadow-lg hover:shadow-xl active:scale-[0.98] flex items-center justify-center gap-3"
              >
                {status === 'adapting' ? (
                  <>
                    <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Adaptando Pedagogia...
                  </>
                ) : (
                  <>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 10V3L4 14h7v7l9-11h-7z" />
                    </svg>
                    Adaptar Aula Agora
                  </>
                )}
              </button>
            </form>
          </div>
        ) : null}

        {status === 'generating-images' && lesson && !lesson.sections[0].imageUrl ? (
          <div className="fixed bottom-10 left-1/2 -translate-x-1/2 z-[60] bg-blue-600 text-white px-8 py-4 rounded-full shadow-2xl flex items-center gap-4 animate-bounce">
             <svg className="animate-spin h-5 w-5 text-white" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" fill="none"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
              </svg>
              <span className="font-bold">Didática pronta! Ilustrando a aula...</span>
          </div>
        ) : null}

        {lesson && (
          <div className="animate-in fade-in zoom-in-95 duration-500 print:p-0">
            <div className="no-print flex flex-col sm:flex-row gap-4 justify-between items-center mb-12 bg-white p-5 rounded-3xl shadow-md border border-slate-100">
              <button 
                onClick={reset}
                className="flex items-center gap-2 text-slate-600 hover:text-blue-600 font-bold px-4 py-3 rounded-2xl transition-all bg-slate-50 hover:bg-blue-50"
              >
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M9.707 16.707a1 1 0 01-1.414 0l-6-6a1 1 0 010-1.414l6-6a1 1 0 011.414 1.414L5.414 9H17a1 1 0 110 2H5.414l4.293 4.293a1 1 0 010 1.414z" clipRule="evenodd" />
                </svg>
                Nova Aula
              </button>
              
              <div className="flex gap-4 w-full sm:w-auto">
                <button 
                  onClick={handleSavePDF}
                  className="flex-1 sm:flex-initial bg-blue-600 hover:bg-blue-700 text-white font-bold px-8 py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                  </svg>
                  Salvar PDF
                </button>
                <button 
                  onClick={handlePrint}
                  className="flex-1 sm:flex-initial bg-green-500 hover:bg-green-600 text-white font-bold px-8 py-4 rounded-2xl shadow-lg transition-all flex items-center justify-center gap-3 active:scale-95"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 17h2a2 2 0 002-2v-4a2 2 0 00-2-2H5a2 2 0 00-2 2v4a2 2 0 002 2h2m2 4h6a2 2 0 002-2v-4a2 2 0 00-2-2H9a2 2 0 00-2 2v4a2 2 0 002 2zm8-12V5a2 2 0 00-2-2H9a2 2 0 00-2 2v4h10z" />
                  </svg>
                  Imprimir
                </button>
              </div>
            </div>

            <article id="printable-lesson" className="bg-white rounded-[3rem] shadow-2xl p-8 md:p-16 space-y-12 border-8 border-blue-100 overflow-hidden relative print:border-0 print:shadow-none print:p-4">
              <div className="border-b-2 border-slate-100 pb-8 mb-8">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-6 items-start">
                  <div className="space-y-2">
                    <p className="text-slate-500 font-bold uppercase tracking-wider text-xs">Informações da Aula Adaptada</p>
                    <p className="text-xl font-bold text-slate-800 leading-tight">{lesson.school}</p>
                    <p className="text-lg font-bold text-slate-700">Prof: <span className="text-blue-600">{lesson.teacherName}</span></p>
                    <div className="flex items-center gap-2 mt-2">
                      <span className={`px-3 py-1 rounded-full text-xs font-bold text-white ${lesson.grade.includes('EM') ? 'bg-purple-500' : 'bg-blue-500'}`}>
                        {lesson.grade}
                      </span>
                      <span className="px-3 py-1 rounded-full text-xs font-bold bg-slate-200 text-slate-700">
                        {lesson.discipline}
                      </span>
                    </div>
                  </div>
                  <div className="flex justify-end gap-3 text-right">
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center min-w-[100px]">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Capítulo</p>
                      <p className="text-xl font-bold text-slate-800">{lesson.chapter}</p>
                    </div>
                    <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 text-center min-w-[100px]">
                      <p className="text-[10px] text-slate-400 font-bold uppercase">Data</p>
                      <p className="text-lg font-bold text-slate-800">{new Date().toLocaleDateString()}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="text-center space-y-4">
                <h1 className="text-5xl md:text-6xl font-bold text-slate-800 leading-tight">
                  {lesson.adaptedTitle}
                </h1>
                <p className="text-2xl text-slate-500 italic max-w-2xl mx-auto leading-relaxed">
                  {lesson.summary}
                </p>
              </div>

              <div className="divide-y divide-blue-50">
                {lesson.sections.map((section, idx) => (
                  <LessonSectionCard key={idx} section={section} index={idx} />
                ))}
              </div>

              <div className="bg-slate-50 rounded-[2.5rem] p-10 space-y-8 border-4 border-dashed border-slate-300 break-inside-avoid page-break-inside-avoid">
                <div className="flex flex-col md:flex-row items-center gap-10">
                  <div className="flex-1 space-y-4">
                    <h3 className="text-4xl font-bold text-slate-800">🖌️ Momento da Cor</h3>
                    <p className="text-xl text-slate-600 font-medium leading-relaxed">
                      {lesson.coloringChallenge.description}
                    </p>
                  </div>
                  
                  <div className="flex-1 w-full max-w-md bg-white p-6 rounded-3xl shadow-sm border border-slate-200">
                    {lesson.coloringChallenge.imageUrl ? (
                      <img 
                        src={lesson.coloringChallenge.imageUrl} 
                        alt="Atividade de colorir" 
                        className="w-full aspect-square object-contain"
                      />
                    ) : (
                      <div className="aspect-square w-full bg-slate-100 animate-pulse rounded-2xl flex items-center justify-center text-slate-400 text-center p-4">
                        Gerando desenho exclusivo...
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div className="bg-orange-50 rounded-[2.5rem] p-10 space-y-6 border-4 border-orange-200 relative overflow-hidden break-inside-avoid page-break-inside-avoid">
                <div className="absolute top-2 right-4 text-6xl opacity-10 no-print">🏡</div>
                <h3 className="text-4xl font-bold text-orange-800">🏠 Desafio em Família</h3>
                <div className="space-y-4">
                  <p className="text-2xl font-bold text-orange-700">{lesson.familyActivity.title}</p>
                  <p className="text-xl text-slate-700 leading-relaxed font-medium">
                    {lesson.familyActivity.description}
                  </p>
                  <div className="bg-white/80 p-8 rounded-3xl border-2 border-orange-100 shadow-sm">
                    <p className="text-xl text-orange-900 leading-relaxed">
                      <strong>💡 Como participar:</strong> {lesson.familyActivity.instruction}
                    </p>
                  </div>
                </div>
              </div>

              <div className="pt-16 border-t-2 border-slate-100">
                <div className="max-w-md mx-auto text-center space-y-2">
                  <div className="border-b-2 border-slate-300 w-full h-8"></div>
                  <p className="text-slate-400 font-bold uppercase tracking-widest text-sm">Assinatura do Aluno</p>
                </div>
              </div>
            </article>

            <div className="no-print mt-12 bg-blue-50 p-8 rounded-3xl border border-blue-100 max-w-3xl mx-auto text-center">
              <p className="text-blue-800 text-lg font-medium leading-relaxed">
                <strong>💡 Nota Pedagógica:</strong> Olá {lesson.teacherName}, esta lição para o {lesson.grade} foi preparada com foco no Capítulo {lesson.chapter} para a instituição {lesson.school}. Lembre-se que o reforço positivo estimula a autonomia do aluno.
              </p>
            </div>
          </div>
        )}
      </main>

      <footer className="bg-white border-t border-slate-100 py-10 px-6 no-print">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row justify-between items-center gap-8">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-blue-600 rounded-xl flex items-center justify-center shadow-lg">
              <span className="text-white font-bold text-xl">E</span>
            </div>
            <div>
              <p className="font-bold text-slate-800">EduAdapt</p>
              <p className="text-xs text-slate-400">© 2024 - Tecnologia Assistiva</p>
            </div>
          </div>
          <p className="text-slate-500 font-medium text-center">Inclusão é o caminho para uma educação de qualidade para todos.</p>
        </div>
      </footer>
    </div>
  );
};

export default App;
