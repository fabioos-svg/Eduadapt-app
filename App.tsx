
import React, { useState, useRef } from 'react';
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
        <h3 className="font-bold text-xl text-slate-800 border-l-4 border-blue-500 pl-3">Inovação Pedagógica</h3>
        <ul className="space-y-2 list-disc list-inside text-slate-600 font-medium text-sm">
          <li>Integração de conteúdos de diversas plataformas de ensino.</li>
          <li>Ficha Diagnóstica inteligente para personalização real.</li>
          <li>Algoritmo Adaptativo baseado em acessibilidade visual.</li>
          <li>Aplicação do Desenho Universal para Aprendizagem (DUA).</li>
        </ul>
      </div>
    </div>

    <div className="bg-blue-50 p-6 rounded-[1.5rem] border border-blue-100">
      <h3 className="font-bold text-xl text-blue-800 mb-2">Objetivo Inclusivo</h3>
      <p className="text-lg leading-relaxed">
        Transformamos conteúdos densos em materiais com texto simplificado e pictogramas nítidos, sempre alinhados às competências da <strong>BNCC</strong>.
      </p>
    </div>
    
    <footer className="pt-4 text-center text-[10px] text-slate-400 font-bold border-t border-slate-100 uppercase tracking-widest">
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
  const [isExtractingPDF, setIsExtractingPDF] = useState(false);
  
  const fileInputRef = useRef<HTMLInputElement>(null);

  const extractTextFromPDF = async (file: File) => {
    setIsExtractingPDF(true);
    setError(null);
    try {
      const arrayBuffer = await file.arrayBuffer();
      // @ts-ignore
      const pdfjsLib = window['pdfjs-dist/build/pdf'];
      pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js';
      
      const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
      let fullText = '';
      
      for (let i = 1; i <= pdf.numPages; i++) {
        const page = await pdf.getPage(i);
        const textContent = await page.getTextContent();
        const pageText = textContent.items.map((item: any) => item.str).join(' ');
        fullText += pageText + '\n\n';
      }
      
      setInputText(fullText.trim());
      if (fullText.trim().length === 0) {
        setError('Não conseguimos extrair texto deste PDF. Tente colar o conteúdo manualmente.');
      }
    } catch (err) {
      console.error(err);
      setError('Erro ao processar o PDF. Certifique-se de que é um arquivo válido.');
    } finally {
      setIsExtractingPDF(false);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type === 'application/pdf') {
      extractTextFromPDF(file);
    } else if (file) {
      setError('Apenas arquivos PDF são aceitos.');
    }
  };

  const handleAdapt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !school.trim() || !teacherName.trim()) {
      setError('Atenção: Preencha Professor(a), Escola e o Conteúdo da aula.');
      return;
    }

    try {
      setStatus('adapting');
      setError(null);
      setLesson(null);
      
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
      setError('Ops! Tente um texto menor ou verifique sua conexão.');
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
      alert("Aguarde o carregamento do módulo de PDF.");
      return;
    }
    const opt = {
      margin: [10, 8, 10, 8],
      filename: `EduAdapt_${lesson.discipline}_Cap${lesson.chapter}.pdf`,
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
    { id: 'Espanhol', label: 'Espanhol', emoji: '🇪🇸' },
    { id: 'Ciência', label: 'Ciência', emoji: '🧪' },
    { id: 'Biologia', label: 'Biologia', emoji: '🧬' },
    { id: 'Química', label: 'Química', emoji: '⚗️' },
    { id: 'Física', label: 'Física', emoji: '⚡' },
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
            {showAbout ? 'Ocultar Projeto' : 'Sobre o Projeto'}
          </button>
        </div>

        {showAbout && <div className="mb-12 no-print"><SobreProjeto /></div>}

        {(status === 'idle' || status === 'error' || status === 'adapting') && !lesson ? (
          <div className="max-w-3xl mx-auto space-y-8 animate-in fade-in slide-in-from-bottom-4 duration-700">
            <div className="text-center space-y-4">
              <h2 className="text-4xl md:text-5xl font-bold text-slate-800 tracking-tight">
                Aulas <span className="text-blue-600 italic">Mais Acessíveis</span>
              </h2>
              <p className="text-lg text-slate-600 font-medium">
                Transforme conteúdos complexos em lições lúdicas e visuais.
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
                  <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-widest">Professor(a)</label>
                  <input 
                    type="text"
                    value={teacherName}
                    onChange={(e) => setTeacherName(e.target.value)}
                    placeholder="Seu nome"
                    className="w-full py-3 px-4 bg-slate-50 border border-slate-100 rounded-2xl font-semibold text-slate-700 outline-none focus:ring-4 focus:ring-blue-100"
                  />
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 space-y-3">
                  <label className="block text-slate-500 font-bold uppercase text-[10px] tracking-widest">Escola</label>
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
                <label className="block text-slate-700 font-bold text-center uppercase text-xs tracking-widest">Série / Ano</label>
                <div className="flex flex-wrap justify-center gap-2">
                  {['6º EF', '7º EF', '8º EF', '9º EF', '1º EM', '2º EM', '3º EM'].map((g) => (
                    <button
                      key={g}
                      type="button"
                      onClick={() => setGrade(g as Grade)}
                      className={`py-2 px-5 rounded-xl font-bold text-xs transition-all ${grade === g ? 'bg-blue-600 text-white shadow-md' : 'bg-slate-100 text-slate-400 hover:bg-slate-200'}`}
                    >
                      {g}
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 space-y-4">
                <label className="block text-slate-700 font-bold text-center uppercase text-xs tracking-widest">Disciplina</label>
                <div className="grid grid-cols-2 sm:grid-cols-5 gap-3">
                  {disciplinesList.map((d) => (
                    <button
                      key={d.id}
                      type="button"
                      onClick={() => setDiscipline(d.id)}
                      className={`py-3 px-1 rounded-2xl font-bold text-[10px] transition-all flex flex-col items-center gap-2 border-2 ${discipline === d.id ? 'bg-blue-600 text-white border-blue-600 shadow-lg scale-105' : 'bg-white text-slate-400 border-slate-50 hover:border-slate-100'}`}
                    >
                      <span className="text-2xl">{d.emoji}</span>
                      <span className="text-center leading-tight">{d.label}</span>
                    </button>
                  ))}
                </div>
              </div>

              <div className="bg-white p-8 rounded-[2rem] shadow-sm border border-slate-200 space-y-4">
                <label className="block text-slate-700 font-bold mb-2 text-center uppercase text-xs tracking-widest">Capítulo / Aula Nº</label>
                <select 
                  value={chapter}
                  onChange={(e) => setChapter(Number(e.target.value))}
                  className="w-full py-4 px-6 bg-slate-50 border border-slate-100 rounded-2xl font-black text-slate-700 outline-none appearance-none cursor-pointer text-center text-2xl shadow-inner transition-all hover:bg-slate-100"
                >
                  {Array.from({ length: 40 }, (_, i) => i + 1).map((n) => (
                    <option key={n} value={n}>Capítulo {n}</option>
                  ))}
                </select>
              </div>

              <div className="bg-white p-6 rounded-[2rem] shadow-sm border border-slate-200 space-y-4">
                <div className="flex flex-col sm:flex-row justify-between items-center gap-4 border-b border-slate-100 pb-4">
                  <label className="block text-slate-700 font-bold text-center uppercase text-xs tracking-widest">Conteúdo da Aula</label>
                  <div className="flex gap-2">
                    <input 
                      type="file" 
                      accept=".pdf" 
                      className="hidden" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload}
                    />
                    <button
                      type="button"
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isExtractingPDF || status === 'adapting'}
                      className="flex items-center gap-2 bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold hover:bg-blue-100 transition-all border border-blue-200"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                      </svg>
                      {isExtractingPDF ? 'Extraindo...' : 'Carregar PDF'}
                    </button>
                    {inputText && (
                      <button
                        type="button"
                        onClick={() => setInputText('')}
                        className="text-slate-400 hover:text-red-500 p-2 transition-colors"
                        title="Limpar conteúdo"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    )}
                  </div>
                </div>
                
                <div className="relative">
                  {isExtractingPDF && (
                    <div className="absolute inset-0 bg-white/60 backdrop-blur-sm z-10 flex flex-col items-center justify-center rounded-[1.5rem]">
                      <div className="w-8 h-8 border-4 border-blue-600 border-t-transparent rounded-full animate-spin mb-2"></div>
                      <p className="text-sm font-bold text-blue-800">Lendo seu PDF...</p>
                    </div>
                  )}
                  <textarea
                    className="w-full h-64 p-6 rounded-[1.5rem] border-2 border-slate-50 focus:border-blue-500 outline-none text-lg resize-none shadow-inner bg-slate-50/50"
                    placeholder="Cole aqui o texto da aula ou carregue um arquivo PDF..."
                    value={inputText}
                    onChange={(e) => setInputText(e.target.value)}
                    disabled={status === 'adapting' || isExtractingPDF}
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={status === 'adapting' || isExtractingPDF || !inputText.trim()}
                className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white font-bold py-6 rounded-[2rem] text-2xl transition-all shadow-xl active:scale-[0.98]"
              >
                {status === 'adapting' ? 'Adaptando Conteúdo...' : 'Gerar Aula Adaptada'}
              </button>
            </form>
          </div>
        ) : null}

        {lesson && (
          <div className="animate-in fade-in zoom-in-95 duration-700">
            <div className="no-print flex flex-col sm:flex-row gap-4 mb-8 justify-center items-center">
              <button onClick={reset} className="w-full sm:w-auto bg-slate-200 px-8 py-4 rounded-2xl font-bold hover:bg-slate-300 transition-all">Recomeçar</button>
              <button onClick={handleSavePDF} className="w-full sm:w-auto bg-blue-600 text-white px-10 py-4 rounded-2xl font-bold hover:bg-blue-700 shadow-lg transition-all flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
                Baixar PDF
              </button>
              <button onClick={() => window.print()} className="w-full sm:w-auto bg-emerald-500 text-white px-10 py-4 rounded-2xl font-bold hover:bg-emerald-600 shadow-lg transition-all flex items-center justify-center gap-2">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M5 4v3H4a2 2 0 00-2 2v3a2 2 0 002 2h1v2a2 2 0 002 2h6a2 2 0 002-2v-2h1a2 2 0 002-2V9a2 2 0 00-2-2h-1V4a2 2 0 00-2-2H7a2 2 0 00-2 2zm8 0H7v3h6V4zm-1 9H8v3h4v-3z" clipRule="evenodd" />
                </svg>
                Imprimir Material
              </button>
            </div>

            <article id="printable-lesson" className="bg-white rounded-[2rem] p-8 md:p-12 border-[10px] border-blue-50 shadow-2xl space-y-10 mx-auto max-w-[210mm] min-h-[297mm]">
              <div className="border-b-2 border-slate-100 pb-8 flex flex-col md:flex-row justify-between items-start gap-4">
                <div className="space-y-1">
                  <h2 className="text-lg font-bold text-slate-800">{lesson.school}</h2>
                  <p className="text-base font-bold text-slate-600 leading-none">Prof(a): <span className="text-blue-600">{lesson.teacherName}</span></p>
                  <div className="flex gap-2 mt-2">
                    <span className="text-[9px] font-bold bg-blue-100 px-2 py-0.5 rounded text-blue-700 uppercase">{lesson.discipline}</span>
                    <span className="text-[9px] font-bold bg-slate-100 px-2 py-0.5 rounded text-slate-500 uppercase">{lesson.grade}</span>
                  </div>
                </div>
                <div className="text-right">
                  <p className="text-3xl font-black text-slate-200 uppercase leading-none tracking-tighter">CAPÍTULO {lesson.chapter}</p>
                  <p className="text-[10px] font-bold text-slate-400 mt-1">{new Date().toLocaleDateString('pt-BR')}</p>
                </div>
              </div>

              <div className="text-center space-y-3">
                <h1 className="text-4xl md:text-5xl font-bold text-slate-800 leading-tight">{lesson.adaptedTitle}</h1>
                <p className="text-lg text-slate-400 italic font-medium max-w-2xl mx-auto">{lesson.summary}</p>
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
                   <span className="bg-pink-100 p-2 rounded-xl text-xl">🎨</span> Hora de Expressão Lúdica
                </h3>
                <div className="flex flex-col md:flex-row gap-8 items-center">
                  <p className="flex-1 text-lg font-medium text-slate-600 leading-relaxed">{lesson.coloringChallenge.description}</p>
                  <div className="w-full max-w-[260px] bg-white p-4 rounded-[1.5rem] shadow-lg border-2 border-slate-100">
                    {lesson.coloringChallenge.imageUrl ? (
                      <img src={lesson.coloringChallenge.imageUrl} alt="Desenho para colorir" className="w-full aspect-square object-contain" />
                    ) : <div className="aspect-square flex items-center justify-center text-slate-300 text-[10px] italic">Gerando imagem...</div>}
                  </div>
                </div>
              </div>

              <div className="bg-emerald-50 p-8 rounded-[2.5rem] border-4 border-emerald-100 space-y-4 break-inside-avoid">
                <h3 className="text-2xl font-bold text-emerald-800 flex items-center gap-3">
                  <span className="bg-emerald-100 p-2 rounded-xl text-xl">🏡</span> Integração com a Família
                </h3>
                <p className="text-xl font-bold text-emerald-700 leading-tight">{lesson.familyActivity.title}</p>
                <p className="text-lg text-slate-700">{lesson.familyActivity.description}</p>
                <div className="bg-white/80 p-5 rounded-2xl border border-emerald-100 italic text-emerald-900 text-sm">
                  <strong>💡 Dica de Mediação:</strong> {lesson.familyActivity.instruction}
                </div>
              </div>

              <div className="pt-8 border-t border-slate-100 flex justify-center">
                 <div className="w-full max-w-xs text-center">
                    <div className="border-b-2 border-slate-200 h-8 mb-2"></div>
                    <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Assinatura do Aluno(a)</p>
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
