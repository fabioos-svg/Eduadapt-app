
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LessonSectionCard from './components/LessonSectionCard';
import { AdaptedLesson, AppStatus, Discipline, Grade, AppMode, LessonPlan, BNCCSearchResult, ProfessionalLesson, ExerciseSheet } from './types';
import { adaptLessonContent, generateLessonImage, generateLessonPlan, searchBNCCSkill, generateProfessionalLesson, generateExercises } from './services/geminiService';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(true); // Inicia como true para checar no useEffect
  const [appMode, setAppMode] = useState<AppMode | null>(null);
  const [inputText, setInputText] = useState('');
  const [discipline, setDiscipline] = useState<Discipline>('Ciências');
  const [school, setSchool] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [grade, setGrade] = useState<Grade>('8º ano (Fundamental - Finais)');
  const [status, setStatus] = useState<AppStatus>('idle');
  
  const [lesson, setLesson] = useState<AdaptedLesson | null>(null);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [proLesson, setProLesson] = useState<ProfessionalLesson | null>(null);
  const [exercises, setExercises] = useState<ExerciseSheet | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [bnccQuery, setBnccQuery] = useState('');
  const [bnccResult, setBnccResult] = useState<BNCCSearchResult | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<{code: string, desc: string}[]>([]);
  
  const [lessonCount, setLessonCount] = useState('1');
  const [bimesterLessonCount, setBimesterLessonCount] = useState('1');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  const [isAdaptedExercises, setIsAdaptedExercises] = useState(true);
  const [exerciseCount, setExerciseCount] = useState(5);
  const [selectedExerciseTypes, setSelectedExerciseTypes] = useState<string[]>(['multiple_choice']);
  const [visibleSupports, setVisibleSupports] = useState<Record<number, number>>({});
  
  const [isEditingPlan, setIsEditingPlan] = useState(false);

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      // @ts-ignore - aistudio é fornecido pelo ambiente
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    } catch (e) {
      // Se houver erro ou não estiver no ambiente AI Studio, assume que a chave injetada via env funcionará
      setHasApiKey(true);
    }
  };

  const handleSelectKey = async () => {
    // @ts-ignore - aistudio é fornecido pelo ambiente
    await window.aistudio.openSelectKey();
    setHasApiKey(true);
  };

  const disciplines: Discipline[] = [
    'Língua Portuguesa', 'Matemática', 'Ciências', 'Geografia', 'História', 
    'Educação Física', 'Arte', 'Ensino Religioso', 'Língua Inglesa',
    'Biologia', 'Física', 'Química', 'Sociologia', 'Filosofia'
  ];

  const grades: Grade[] = [
    'Educação Infantil',
    '1º ao 5º ano (Fundamental - Iniciais)',
    '6º ano (Fundamental - Finais)',
    '7º ano (Fundamental - Finais)',
    '8º ano (Fundamental - Finais)',
    '9º ano (Fundamental - Finais)',
    '1ª série (Ensino Médio)',
    '2ª série (Ensino Médio)',
    '3ª série (Ensino Médio)'
  ];

  const isLoading = status !== 'idle' && status !== 'ready' && status !== 'error' && status !== 'searching-bncc';
  const isSearchingBNCC = status === 'searching-bncc';

  const handleBNCCSearch = async () => {
    if (!bnccQuery.trim()) return;
    setStatus('searching-bncc');
    setError(null);
    try {
      const result = await searchBNCCSkill(bnccQuery);
      setBnccResult(result);
    } catch (err: any) { 
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
        setError("Erro de Chave de API. Por favor, selecione novamente.");
      } else {
        setError("Habilidade não encontrada."); 
      }
    }
    finally { setStatus('idle'); }
  };

  const addSkillToPlan = () => {
    if (!bnccResult) return;
    if (!selectedSkills.find(s => s.code === bnccResult.code)) {
      setSelectedSkills([...selectedSkills, { code: bnccResult.code, desc: bnccResult.description }]);
    }
    setBnccResult(null);
    setBnccQuery('');
  };

  const handlePlanning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSkills.length === 0 || !school.trim()) { setError('Preencha os campos obrigatórios.'); return; }
    setError(null); setStatus('planning');
    try {
      const res = await generateLessonPlan(teacherName, school, discipline, grade, lessonCount, bimesterLessonCount, "Geral", startDate, endDate, selectedSkills.map(s => s.code), selectedSkills.map(s => s.desc));
      setPlan(res); setStatus('ready');
      setIsEditingPlan(false);
    } catch (err: any) { 
      setError("Erro ao gerar plano BNCC."); 
      setStatus('idle');
      if (err.message?.includes("not found")) setHasApiKey(false);
    }
  };

  const handleAdapt = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim() || !school.trim()) { setError('Texto da aula e Escola são obrigatórios.'); return; }
    setError(null); setStatus('adapting');
    try {
      const adapted = await adaptLessonContent(inputText, discipline, teacherName, school, 1, grade);
      setLesson(adapted);
      setStatus('generating-images');
      const updatedSections = [...adapted.sections];
      for (let i = 0; i < updatedSections.length; i++) {
        const url = await generateLessonImage(updatedSections[i].imagePrompt);
        updatedSections[i].imageUrl = url;
        setLesson(prev => prev ? ({ ...prev, sections: [...updatedSections] }) : null);
      }
      setStatus('ready');
    } catch (err: any) { 
      setError("Erro na adaptação para DI."); 
      setStatus('idle'); 
      if (err.message?.includes("not found")) setHasApiKey(false);
    }
  };

  const handleProSlides = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) { setError('Conteúdo da aula é obrigatório.'); return; }
    setError(null); setStatus('designing');
    try {
      const res = await generateProfessionalLesson(inputText, discipline, grade);
      setProLesson(res); 
      setStatus('generating-images');
      const updatedSlides = [...res.slides];
      for (let i = 0; i < updatedSlides.length; i++) {
        const url = await generateLessonImage(updatedSlides[i].imagePrompt);
        updatedSlides[i].imageUrl = url;
        setProLesson(prev => prev ? ({ ...prev, slides: [...updatedSlides] }) : null);
      }
      setStatus('ready');
    } catch (err: any) { 
      setError("Erro ao desenhar slides."); 
      setStatus('idle'); 
      if (err.message?.includes("not found")) setHasApiKey(false);
    }
  };

  const handleExercisesGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) { setError('Conteúdo base é necessário.'); return; }
    if (selectedExerciseTypes.length === 0) { setError('Selecione pelo menos um tipo de exercício.'); return; }
    
    setError(null); setStatus('generating-exercises');
    try {
      const res = await generateExercises(inputText, discipline, grade, exerciseCount, selectedExerciseTypes, isAdaptedExercises);
      setExercises(res);
      setVisibleSupports({});
      setStatus('ready');
    } catch (err: any) { 
      setError("Erro ao criar exercícios."); 
      setStatus('idle'); 
      if (err.message?.includes("not found")) setHasApiKey(false);
    }
  };

  const toggleSupport = (qIdx: number, level: number) => {
    setVisibleSupports(prev => ({
      ...prev,
      [qIdx]: prev[qIdx] === level ? 0 : level
    }));
  };

  const reset = () => {
    setLesson(null); setPlan(null); setProLesson(null); setExercises(null); setInputText(''); setSelectedSkills([]); 
    setStatus('idle'); setError(null); setVisibleSupports({}); setIsEditingPlan(false);
  };

  const fullReset = () => {
    reset();
    setAppMode(null);
  }

  const handleSavePDF = (id: string, filename: string) => {
    const element = document.getElementById(id);
    if (!element) return;
    (window as any).html2pdf().set({ 
      margin: 10, 
      filename, 
      html2canvas: { scale: 2, useCORS: true }, 
      jsPDF: { format: 'a4', orientation: 'portrait' } 
    }).from(element).save();
  };

  const handleExportPPTX = () => {
    if (!proLesson) return;
    const pptx = new (window as any).PptxGenJS();
    const slideCapa = pptx.addSlide();
    slideCapa.background = { color: "0F172A" };
    slideCapa.addText(proLesson.title, { x: 0.5, y: 1.5, w: 9, align: "center", fontSize: 36, bold: true, color: "FFFFFF" });
    proLesson.slides.forEach((slide: any) => {
      const pSlide = pptx.addSlide();
      pSlide.addText(slide.title, { x: 0.5, y: 0.3, w: 9, fontSize: 24, bold: true, color: "1E293B" });
      pSlide.addText(slide.topics.join('\n'), { x: 0.5, y: 1.0, w: 4.5, h: 3.5, fontSize: 14, color: "475569" });
      if (slide.imageUrl) pSlide.addImage({ data: slide.imageUrl, x: 5.2, y: 1.0, w: 4.3, h: 4.4 });
    });
    pptx.writeFile({ fileName: `Aula_${proLesson.title}.pptx` });
  };

  const toggleExerciseType = (type: string) => {
    setSelectedExerciseTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const updatePlanField = (field: keyof LessonPlan, value: any) => {
    if (!plan) return;
    setPlan({ ...plan, [field]: value });
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl border border-blue-50 text-center">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">
            🔑
          </div>
          <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Configuração de Segurança</h2>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">
            Para proteger a privacidade e garantir o uso correto da ferramenta, selecione sua chave de API Google Cloud.
          </p>
          <div className="space-y-4">
            <button 
              onClick={handleSelectKey}
              className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all"
            >
              SELECIONAR MINHA CHAVE
            </button>
            <a 
              href="https://ai.google.dev/gemini-api/docs/billing" 
              target="_blank" 
              rel="noopener noreferrer"
              className="block text-xs font-black text-blue-400 uppercase tracking-widest hover:text-blue-600 transition-colors"
            >
              COMO OBTER UMA CHAVE PAGA?
            </a>
          </div>
        </div>
      </div>
    );
  }

  const features = [
    {
      id: 'adaptation',
      title: 'Aula Adaptada',
      desc: 'Adaptação pedagógica inclusiva para alunos com DI.',
      icon: '🧩',
      color: 'from-blue-500 to-cyan-400',
      shadow: 'shadow-blue-200'
    },
    {
      id: 'planning',
      title: 'Plano de Aula',
      desc: 'Planejamento completo estruturado nas normas BNCC.',
      icon: '📋',
      color: 'from-purple-500 to-pink-400',
      shadow: 'shadow-purple-200'
    },
    {
      id: 'slides',
      title: 'Criar Aulas',
      desc: 'Design instrucional de alto impacto e slides prontos.',
      icon: '🚀',
      color: 'from-indigo-600 to-blue-500',
      shadow: 'shadow-indigo-200'
    },
    {
      id: 'exercises',
      title: 'Criar Exercícios',
      desc: 'Listas de atividades com níveis de suporte inclusivo.',
      icon: '📝',
      color: 'from-emerald-500 to-teal-400',
      shadow: 'shadow-emerald-200'
    }
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20">
      <Header onLogoClick={fullReset} />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        
        {!appMode && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-16 mt-8">
              <h2 className="text-5xl font-black text-slate-800 mb-4 tracking-tight">O que vamos criar hoje?</h2>
              <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">Selecione uma ferramenta inteligente para transformar sua prática pedagógica e promover a inclusão.</p>
            </div>
            
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((f) => (
                <button
                  key={f.id}
                  onClick={() => setAppMode(f.id as AppMode)}
                  className={`group relative bg-white p-8 rounded-[2.5rem] text-left transition-all duration-300 hover:-translate-y-3 shadow-xl ${f.shadow} border border-slate-100 hover:border-transparent`}
                >
                  <div className={`absolute inset-0 bg-gradient-to-br ${f.color} opacity-0 group-hover:opacity-5 rounded-[2.5rem] transition-opacity`} />
                  <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${f.color} flex items-center justify-center text-3xl mb-6 shadow-lg transform transition-transform group-hover:scale-110 group-hover:rotate-6`}>
                    {f.icon}
                  </div>
                  <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight group-hover:text-blue-600 transition-colors">{f.title}</h3>
                  <p className="text-slate-500 font-bold leading-relaxed">{f.desc}</p>
                  <div className="mt-8 flex items-center gap-2 text-sm font-black text-blue-500 uppercase tracking-widest opacity-0 group-hover:opacity-100 transition-opacity">
                    Começar <span>→</span>
                  </div>
                </button>
              ))}
            </div>
            
            <div className="mt-20 text-center flex flex-col items-center gap-4">
               <button 
                 // @ts-ignore
                 onClick={() => window.aistudio.openSelectKey()}
                 className="text-blue-400 hover:text-blue-600 font-black text-[9px] uppercase tracking-widest transition-colors flex items-center gap-1"
               >
                 <span className="text-xs">⚙️</span> Configurações de API
               </button>
            </div>
          </div>
        )}

        {appMode && (
          <div className="no-print mb-8">
            <button 
              onClick={fullReset}
              className="flex items-center gap-2 text-slate-400 font-bold hover:text-blue-500 transition-colors"
            >
              ← Voltar ao Início
            </button>
          </div>
        )}

        {appMode && !lesson && !plan && !proLesson && !exercises && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-10 text-center">
              <span className="bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-blue-200">
                {features.find(f => f.id === appMode)?.title}
              </span>
              <h2 className="text-3xl font-black text-slate-800 mt-4">Preencha os detalhes da aula</h2>
            </div>

            <form onSubmit={
              appMode === 'adaptation' ? handleAdapt : 
              appMode === 'planning' ? handlePlanning : 
              appMode === 'slides' ? handleProSlides : 
              handleExercisesGeneration
            } className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-blue-50">
                  <label className="block text-blue-400 font-bold text-[10px] uppercase mb-2 tracking-widest">Professor(a)</label>
                  <input type="text" value={teacherName} onChange={e => setTeacherName(e.target.value)} className="w-full bg-blue-50/50 p-3 rounded-xl font-bold outline-none border border-blue-50" placeholder="Nome completo" />
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-blue-50">
                  <label className="block text-blue-400 font-bold text-[10px] uppercase mb-2 tracking-widest">Escola</label>
                  <input type="text" value={school} onChange={e => setSchool(e.target.value)} className="w-full bg-blue-50/50 p-3 rounded-xl font-bold outline-none border border-blue-50" placeholder="Unidade Escolar" />
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-blue-50">
                  <label className="block text-blue-400 font-bold text-[10px] uppercase mb-2 tracking-widest">Componente Curricular</label>
                  <select value={discipline} onChange={e => setDiscipline(e.target.value as Discipline)} className="w-full bg-blue-50/50 p-3 rounded-xl font-bold outline-none border border-blue-50">
                    {disciplines.map(d => <option key={d} value={d}>{d}</option>)}
                  </select>
                </div>
                <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-blue-50">
                  <label className="block text-blue-400 font-bold text-[10px] uppercase mb-2 tracking-widest">Série / Etapa</label>
                  <select value={grade} onChange={e => setGrade(e.target.value as Grade)} className="w-full bg-blue-50/50 p-3 rounded-xl font-bold outline-none border border-blue-50">
                    {grades.map(g => <option key={g} value={g}>{g}</option>)}
                  </select>
                </div>
              </div>

              {appMode === 'planning' && (
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-blue-50 space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                     <div className="bg-blue-50/50 p-4 rounded-xl">
                        <label className="block text-[8px] font-black uppercase text-blue-400 mb-1">Qtd. Aulas (Plano)</label>
                        <input type="number" min="1" value={lessonCount} onChange={e => setLessonCount(e.target.value)} className="w-full bg-transparent font-bold outline-none border-b border-blue-200" />
                     </div>
                     <div className="bg-blue-50/50 p-4 rounded-xl">
                        <label className="block text-[8px] font-black uppercase text-blue-400 mb-1">Qtd. Aulas (Bimestre)</label>
                        <input type="number" min="1" value={bimesterLessonCount} onChange={e => setBimesterLessonCount(e.target.value)} className="w-full bg-transparent font-bold outline-none border-b border-blue-200" />
                     </div>
                     <div className="bg-blue-50/50 p-4 rounded-xl">
                        <label className="block text-[8px] font-black uppercase text-blue-400 mb-1">Início / Fim</label>
                        <div className="flex gap-2">
                          <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full text-[10px] font-bold outline-none bg-transparent" />
                          <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full text-[10px] font-bold outline-none bg-transparent" />
                        </div>
                     </div>
                  </div>
                  <div className="flex gap-2 mt-4">
                    <input type="text" value={bnccQuery} onChange={e => setBnccQuery(e.target.value)} placeholder="Busque habilidade BNCC..." className="flex-1 bg-blue-50/50 p-3 rounded-xl font-bold border border-blue-50 outline-none" />
                    <button type="button" disabled={isSearchingBNCC} onClick={handleBNCCSearch} className="bg-blue-600 text-white px-8 rounded-xl font-bold hover:bg-blue-700 transition-colors disabled:opacity-50 min-w-[120px]">
                      {isSearchingBNCC ? (
                        <svg className="animate-spin h-4 w-4 mx-auto text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                      ) : 'Buscar'}
                    </button>
                  </div>
                  {bnccResult && (
                    <div className="bg-emerald-50 p-4 rounded-xl border border-emerald-100 animate-in fade-in slide-in-from-top-2">
                      <p className="font-bold text-emerald-800">{bnccResult.code}</p>
                      <p className="text-xs text-emerald-600 mb-2">{bnccResult.description}</p>
                      
                      {bnccResult.sources && bnccResult.sources.length > 0 && (
                        <div className="mt-2 mb-3 p-3 bg-white/60 rounded-xl border border-emerald-100 shadow-sm">
                          <p className="text-[10px] font-black text-emerald-700 uppercase tracking-widest mb-2 flex items-center gap-1">
                            <span>🔍</span> Fontes Verificadas:
                          </p>
                          <div className="flex flex-col gap-1.5">
                            {bnccResult.sources.map((source, i) => (
                              <a 
                                key={i} 
                                href={source.uri} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-[10px] text-blue-600 hover:text-blue-800 underline decoration-blue-200 transition-colors flex items-center gap-1"
                              >
                                <span className="opacity-50">🔗</span>
                                <span className="truncate max-w-[320px]">{source.title || source.uri}</span>
                              </a>
                            ))}
                          </div>
                        </div>
                      )}

                      <button type="button" onClick={addSkillToPlan} className="bg-emerald-500 text-white px-4 py-1.5 rounded-lg text-xs font-black hover:bg-emerald-600">ADICIONAR AO PLANO</button>
                    </div>
                  )}
                  <div className="flex flex-wrap gap-2 min-h-[40px]">
                    {selectedSkills.map(s => <div key={s.code} className="bg-blue-100 text-blue-700 px-3 py-1 rounded-full text-[10px] font-bold border border-blue-200 flex items-center gap-2">{s.code} <button onClick={() => setSelectedSkills(selectedSkills.filter(sk => sk.code !== s.code))} className="text-blue-400 hover:text-blue-700">×</button></div>)}
                  </div>
                </div>
              )}

              {appMode === 'exercises' && (
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-blue-50 space-y-8">
                   <div className="bg-blue-50/50 p-6 rounded-2xl border border-blue-100 text-center">
                     <label className="block text-blue-600 font-black text-xs uppercase mb-4 tracking-widest">Quantidade de Questões</label>
                     <input type="range" min="1" max="15" value={exerciseCount} onChange={e => setExerciseCount(parseInt(e.target.value))} className="w-full accent-blue-600 mb-2" />
                     <p className="font-black text-blue-600 text-2xl">{exerciseCount}</p>
                   </div>
                   <div className="flex flex-wrap justify-center gap-3">
                      {[
                        {id: 'multiple_choice', label: 'Alternativa'},
                        {id: 'true_false', label: 'V / F'},
                        {id: 'open', label: 'Dissertativa'}
                      ].map(t => (
                        <button key={t.id} type="button" onClick={() => toggleExerciseType(t.id)} className={`px-6 py-2 rounded-xl text-xs font-bold border transition-all ${selectedExerciseTypes.includes(t.id) ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-blue-400 border-blue-100 hover:border-blue-300'}`}>{t.label}</button>
                      ))}
                   </div>
                   <div className="flex items-center justify-center gap-4 bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-inner">
                      <div className="flex items-center gap-3 cursor-pointer">
                        <input type="checkbox" checked={isAdaptedExercises} onChange={e => setIsAdaptedExercises(e.target.checked)} id="adEx" className="w-5 h-5 accent-emerald-600 cursor-pointer" />
                        <label htmlFor="adEx" className="text-sm font-black text-emerald-800 cursor-pointer select-none uppercase">Adaptar para Inclusão (Níveis de Suporte)</label>
                      </div>
                   </div>
                </div>
              )}

              {(appMode === 'adaptation' || appMode === 'slides' || appMode === 'exercises') && (
                <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-blue-50">
                  <label className="block text-blue-400 font-bold text-[10px] uppercase mb-3 tracking-widest text-center">Conteúdo base da aula / apostila</label>
                  <textarea value={inputText} onChange={e => setInputText(e.target.value)} className="w-full h-64 bg-blue-50/50 p-6 rounded-3xl font-medium outline-none border border-blue-50 focus:ring-2 focus:ring-blue-100 transition-all" placeholder="Cole aqui o texto que será transformado..." />
                </div>
              )}

              {error && <div className="bg-red-50 text-red-500 p-4 rounded-2xl font-bold text-center border border-red-100 animate-pulse">{error}</div>}

              <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] text-2xl font-black shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50">
                {status === 'idle' || status === 'searching-bncc' ? 'GERAR AGORA' : (
                  <div className="flex items-center justify-center gap-3">
                    <svg className="animate-spin h-6 w-6 text-white" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path></svg>
                    <span>{status === 'generating-images' ? 'GERANDO ILUSTRAÇÕES...' : 'PROCESSANDO...'}</span>
                  </div>
                )}
              </button>
            </form>
          </div>
        )}

        {exercises && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex justify-center gap-4 no-print flex-wrap">
               <button onClick={fullReset} className="bg-white text-slate-400 px-8 py-3 rounded-2xl font-bold border border-slate-200">Novo Trabalho</button>
               <button onClick={() => handleSavePDF('printable-exercises', 'Exercicios.pdf')} className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-bold shadow-lg">Baixar Lista PDF</button>
            </div>
            <article id="printable-exercises" className="bg-white p-12 rounded-[2.5rem] shadow-2xl border border-slate-100 space-y-10">
               <div className="border-2 border-slate-100 p-6 rounded-3xl mb-10 space-y-4">
                  <div className="flex justify-between items-center border-b border-slate-100 pb-2">
                    <span className="font-bold text-slate-400 text-xs uppercase">{school}</span>
                    <span className="font-bold text-slate-400 text-xs">DATA: ____/____/____</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">ALUNO(A): ____________________________________________________</span>
                    <span className="font-bold text-slate-400 text-xs">{teacherName}</span>
                  </div>
               </div>

               <h1 className="text-3xl font-black text-center text-slate-800 uppercase underline decoration-4 decoration-blue-500 underline-offset-8 mb-16">{exercises.title}</h1>
               
               <div className="space-y-16">
                 {exercises.questions.map((q, idx) => (
                   <div key={idx} className="pb-10 border-b border-slate-50 last:border-0 break-inside-avoid">
                      <div className="flex items-start gap-4 mb-6">
                        <span className="bg-blue-600 text-white w-8 h-8 rounded-full flex items-center justify-center font-black flex-shrink-0">{idx + 1}</span>
                        <p className={`text-xl font-bold text-slate-800 leading-snug ${isAdaptedExercises ? 'text-2xl' : ''}`}>
                          {q.statement}
                        </p>
                      </div>
                      
                      {q.type === 'multiple_choice' && q.options && q.options.length > 0 && (
                        <div className="ml-12 space-y-3">
                          {q.options.map((o, oi) => (
                            <div key={oi} className="flex items-center gap-4 group cursor-pointer">
                               <div className="w-7 h-7 border-2 border-slate-200 rounded-full group-hover:border-blue-400 transition-colors" />
                               <span className="text-slate-700 text-lg font-medium">{o}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {q.type === 'true_false' && <div className="ml-12"><div className="w-16 h-8 border-2 border-slate-200 rounded flex items-center justify-center text-xs font-bold text-slate-300 uppercase">V / F</div></div>}
                      {q.type === 'open' && <div className="ml-12 h-20 border-b border-slate-100" />}
                      
                      {q.supports && isAdaptedExercises && (
                        <div className="mt-10 space-y-4 no-print ml-12 p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                           <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Suporte de Mediação Pedagógica</p>
                           <div className="flex flex-wrap gap-2">
                              <button onClick={() => toggleSupport(idx, 1)} className={`px-5 py-2.5 rounded-xl text-xs font-black border transition-all ${visibleSupports[idx] === 1 ? 'bg-amber-100 border-amber-300 text-amber-700 shadow-sm' : 'bg-white text-amber-500 border-amber-100 shadow-sm'}`}>NÍVEL 1 (Gatilho)</button>
                              <button onClick={() => toggleSupport(idx, 2)} className={`px-5 py-2.5 rounded-xl text-xs font-black border transition-all ${visibleSupports[idx] === 2 ? 'bg-emerald-100 border-emerald-300 text-emerald-700 shadow-sm' : 'bg-white text-emerald-500 border-emerald-100 shadow-sm'}`}>NÍVEL 2 (Caminho)</button>
                              <button onClick={() => toggleSupport(idx, 3)} className={`px-5 py-2.5 rounded-xl text-xs font-black border transition-all ${visibleSupports[idx] === 3 ? 'bg-indigo-100 border-indigo-300 text-indigo-700 shadow-sm' : 'bg-white text-indigo-500 border-indigo-100 shadow-sm'}`}>NÍVEL 3 (Exemplo)</button>
                           </div>
                           
                           {visibleSupports[idx] === 1 && <div className="p-5 bg-amber-50 rounded-2xl text-sm italic border border-amber-200 animate-in zoom-in-95 font-medium text-amber-900 leading-relaxed">💡 <span className="font-black uppercase text-[10px]">Dica Leve:</span> {q.supports.level1}</div>}
                           {visibleSupports[idx] === 2 && <div className="p-5 bg-emerald-50 rounded-2xl text-sm italic border border-emerald-200 animate-in zoom-in-95 font-medium text-emerald-900 leading-relaxed">👣 <span className="font-black uppercase text-[10px]">Processo:</span> {q.supports.level2}</div>}
                           {visibleSupports[idx] === 3 && <div className="p-5 bg-indigo-50 rounded-2xl text-sm italic border border-indigo-200 animate-in zoom-in-95 font-medium text-indigo-900 leading-relaxed">🌉 <span className="font-black uppercase text-[10px]">Facilitado:</span> {q.supports.level3}</div>}
                        </div>
                      )}
                   </div>
                 ))}
               </div>

               <div className="mt-20 pt-10 border-t-4 border-slate-100 break-before-page">
                  <h2 className="text-2xl font-black text-slate-800 uppercase mb-8 flex items-center gap-3">
                    <span className="bg-slate-800 text-white p-2 rounded-lg">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </span>
                    Gabarito e Orientações
                  </h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {exercises.questions.map((q, idx) => (
                      <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-100 flex flex-col gap-2">
                        <div className="flex items-center gap-2">
                          <span className="font-black text-blue-600">Questão {idx + 1}:</span>
                          <span className="font-bold text-slate-800">{q.answerKey}</span>
                        </div>
                        {q.explanation && (
                          <p className="text-xs text-slate-500 italic leading-relaxed">
                            <span className="font-bold uppercase text-[9px] block mb-1">Nota Pedagógica:</span>
                            {q.explanation}
                          </p>
                        )}
                      </div>
                    ))}
                  </div>
               </div>
            </article>
          </div>
        )}

        {lesson && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex justify-center gap-4 no-print">
               <button onClick={fullReset} className="bg-white text-slate-400 px-8 py-3 rounded-2xl font-bold border border-slate-200">Voltar</button>
               <button onClick={() => handleSavePDF('printable-lesson', 'Aula_DI.pdf')} className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-bold">Baixar PDF</button>
            </div>
            <article id="printable-lesson" className="bg-white p-12 rounded-[2.5rem] shadow-2xl border border-blue-50 space-y-10">
               <h1 className="text-4xl font-black text-center text-slate-800">{lesson.adaptedTitle}</h1>
               <div className="bg-blue-50/40 p-8 rounded-[2rem] text-center italic text-slate-600 border border-blue-100">
                 {lesson.summary}
               </div>
               
               <div className="space-y-6">
                  {lesson.sections.map((sec, idx) => (
                    <LessonSectionCard key={idx} section={sec} index={idx} />
                  ))}
               </div>

               {lesson.practicalActivities && lesson.practicalActivities.length > 0 && (
                 <section className="mt-12 space-y-8 break-before-page">
                    <h2 className="text-2xl font-black text-blue-600 uppercase border-b-4 border-blue-100 pb-2">🖐️ Atividades Práticas</h2>
                    {lesson.practicalActivities.map((act, idx) => (
                      <div key={idx} className="p-8 bg-blue-50/30 rounded-3xl border border-blue-100 space-y-4">
                        <h3 className="text-xl font-black text-slate-800">{act.title}</h3>
                        <p className="text-slate-700 leading-relaxed font-medium">{act.description}</p>
                        {act.materials && act.materials.length > 0 && (
                          <div className="flex flex-wrap gap-2 pt-2">
                            {act.materials.map((m, mi) => (
                              <span key={mi} className="bg-white px-3 py-1 rounded-full text-[10px] font-bold text-blue-500 border border-blue-100 uppercase">
                                {m}
                              </span>
                            ))}
                          </div>
                        )}
                      </div>
                    ))}
                 </section>
               )}

               {lesson.familyActivity && (
                 <section className="mt-12 break-before-page p-10 bg-emerald-50 rounded-[3rem] border-4 border-emerald-100 shadow-inner relative overflow-hidden">
                    <div className="absolute top-0 right-0 w-32 h-32 bg-emerald-100/50 rounded-full -mr-16 -mt-16" />
                    <div className="relative">
                      <h2 className="text-3xl font-black text-emerald-700 uppercase mb-6 flex items-center gap-3">
                         <span className="text-4xl">🏠</span> Atividade para Casa
                      </h2>
                      <div className="space-y-6">
                         <div className="space-y-2">
                            <h3 className="text-xl font-black text-emerald-800">{lesson.familyActivity.title}</h3>
                            <p className="text-emerald-900/80 font-medium leading-relaxed italic">{lesson.familyActivity.description}</p>
                         </div>
                         <div className="bg-white p-6 rounded-2xl border border-emerald-200 shadow-sm">
                            <p className="text-xs font-black text-emerald-400 uppercase tracking-widest mb-2">Instruções para o Aluno e Família</p>
                            <p className="text-slate-700 font-bold leading-relaxed">{lesson.familyActivity.instruction}</p>
                         </div>
                      </div>
                    </div>
                 </section>
               )}
            </article>
          </div>
        )}

        {proLesson && (
          <div className="space-y-10 animate-in fade-in duration-500">
            <div className="flex justify-center gap-4 no-print flex-wrap">
               <button onClick={fullReset} className="bg-white text-slate-400 px-8 py-3 rounded-2xl font-bold border border-slate-200">Voltar</button>
               <button onClick={handleExportPPTX} className="bg-orange-500 text-white px-8 py-3 rounded-2xl font-bold shadow-lg">PowerPoint (.pptx)</button>
               <button onClick={() => handleSavePDF('printable-slides', 'Aula_Apresentacao.pdf')} className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-bold shadow-lg">Salvar PDF</button>
            </div>
            <article id="printable-slides" className="space-y-12">
               <div className="bg-slate-900 p-20 rounded-[3rem] text-center min-h-[400px] flex flex-col justify-center shadow-2xl break-inside-avoid">
                  <h1 className="text-5xl font-black text-white mb-6 leading-tight">{proLesson.title}</h1>
                  <p className="text-blue-400 font-bold uppercase tracking-widest">{discipline} • {grade}</p>
                  <p className="mt-12 text-slate-400 font-medium">Professor: {teacherName}</p>
               </div>
               
               {proLesson.slides.map((slide, idx) => (
                 <div key={idx} className="bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[500px] break-inside-avoid border border-slate-100">
                    <div className="flex-1 p-12 flex flex-col justify-center space-y-8">
                       <h2 className="text-3xl font-black text-slate-800 leading-tight border-l-8 border-blue-500 pl-6">{slide.title}</h2>
                       <ul className="space-y-4">
                          {slide.topics.map((t, i) => (
                            <li key={i} className="text-slate-600 font-bold text-lg flex gap-4"><span className="text-blue-500 text-2xl">▸</span> {t}</li>
                          ))}
                       </ul>
                       <div className="p-6 bg-blue-50/50 border border-blue-100 rounded-3xl text-blue-900 font-bold italic shadow-sm">
                          💡 Ponte com a Realidade: {slide.realityBridge}
                       </div>
                    </div>
                    <div className="flex-1 bg-slate-50 flex items-center justify-center p-8">
                       {slide.imageUrl ? (
                         <img src={slide.imageUrl} className="max-w-full rounded-[2.5rem] shadow-2xl border-4 border-white" alt={slide.altText} />
                       ) : (
                         <div className="w-full aspect-square bg-white rounded-[2.5rem] flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 animate-pulse">
                            <svg className="w-12 h-12 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            <span className="font-bold text-xs uppercase tracking-widest">Criando Ilustração...</span>
                         </div>
                       )}
                    </div>
                 </div>
               ))}
               
               <div className="bg-emerald-600 p-16 rounded-[3rem] text-white shadow-2xl break-inside-avoid">
                  <h2 className="text-3xl font-black mb-8 border-b border-emerald-400 pb-4">🚀 Desafio de Aplicação</h2>
                  <div className="space-y-6">
                    <p className="text-xl font-bold"><span className="opacity-70 uppercase text-xs block mb-1">Cenário</span> {proLesson.applicationChallenge.scenario}</p>
                    <p className="text-xl font-bold"><span className="opacity-70 uppercase text-xs block mb-1">Problema</span> {proLesson.applicationChallenge.problem}</p>
                    <p className="text-xl font-black bg-white/20 p-6 rounded-2xl"><span className="opacity-70 uppercase text-xs block mb-1">Objetivo do Aluno</span> {proLesson.applicationChallenge.goal}</p>
                  </div>
               </div>
            </article>
          </div>
        )}

        {plan && (
          <div className="space-y-10 animate-in fade-in duration-500">
             <div className="flex justify-center gap-4 no-print flex-wrap">
                <button onClick={fullReset} className="bg-white text-slate-400 px-8 py-3 rounded-2xl font-bold border border-slate-200">Novo Plano</button>
                <button onClick={() => setIsEditingPlan(!isEditingPlan)} className={`px-8 py-3 rounded-2xl font-bold border transition-all ${isEditingPlan ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-blue-600 border-blue-600'}`}>
                  {isEditingPlan ? 'Finalizar Edição' : 'Editar Plano'}
                </button>
                <button onClick={() => handleSavePDF('printable-plan', 'Plano_BNCC.pdf')} className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-bold">Salvar PDF</button>
             </div>
             <article id="printable-plan" className="bg-white p-12 rounded-[2.5rem] shadow-2xl border border-slate-100">
                <div className="text-center mb-12 border-b-2 border-blue-600 pb-6">
                  <h2 className="text-4xl font-black text-slate-800 uppercase tracking-tighter">Plano de Aula BNCC</h2>
                  {isEditingPlan ? (
                    <input className="w-full text-center text-blue-500 font-bold mt-2 uppercase tracking-widest bg-blue-50 p-2 rounded-xl border border-blue-100 focus:outline-none" value={plan.title} onChange={(e) => updatePlanField('title', e.target.value)} />
                  ) : (
                    <p className="text-blue-500 font-bold mt-2 uppercase tracking-widest">{plan.title}</p>
                  )}
                </div>
                
                <div className="overflow-hidden border-2 border-slate-100 rounded-3xl mb-8">
                  <table className="w-full border-collapse text-sm">
                     <tbody>
                      <tr className="border-b border-slate-100">
                        <td className="p-4 font-black bg-slate-50 text-slate-500 uppercase text-[10px] w-1/4">Instituição</td>
                        <td className="p-4 font-bold text-slate-800" colSpan={3}>
                           {isEditingPlan ? <input className="w-full bg-blue-50/50 p-1 rounded" value={plan.school} onChange={(e) => updatePlanField('school', e.target.value)} /> : plan.school}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-4 font-black bg-slate-50 text-slate-500 uppercase text-[10px] w-1/4">Professor(a)</td>
                        <td className="p-4 font-bold text-slate-800 w-1/4">
                           {isEditingPlan ? <input className="w-full bg-blue-50/50 p-1 rounded" value={plan.teacherName} onChange={(e) => updatePlanField('teacherName', e.target.value)} /> : plan.teacherName}
                        </td>
                        <td className="p-4 font-black bg-slate-50 text-slate-500 uppercase text-[10px] w-1/4">Componente</td>
                        <td className="p-4 font-bold text-slate-800 w-1/4">
                           {isEditingPlan ? <input className="w-full bg-blue-50/50 p-1 rounded" value={plan.discipline} onChange={(e) => updatePlanField('discipline', e.target.value)} /> : plan.discipline}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-4 font-black bg-slate-50 text-slate-500 uppercase text-[10px]">Ano/Série</td>
                        <td className="p-4 font-bold text-slate-800">
                           {isEditingPlan ? <input className="w-full bg-blue-50/50 p-1 rounded" value={plan.grade} onChange={(e) => updatePlanField('grade', e.target.value)} /> : plan.grade}
                        </td>
                        <td className="p-4 font-black bg-slate-50 text-slate-500 uppercase text-[10px]">Período</td>
                        <td className="p-4 font-bold text-slate-800">
                           {isEditingPlan ? (
                             <div className="flex gap-1">
                               <input type="date" className="w-full bg-blue-50/50 p-1 rounded text-[10px]" value={plan.startDate} onChange={(e) => updatePlanField('startDate', e.target.value)} />
                               <input type="date" className="w-full bg-blue-50/50 p-1 rounded text-[10px]" value={plan.endDate} onChange={(e) => updatePlanField('endDate', e.target.value)} />
                             </div>
                           ) : (
                             `${new Date(plan.startDate).toLocaleDateString('pt-BR')} a ${new Date(plan.endDate).toLocaleDateString('pt-BR')}`
                           )}
                        </td>
                      </tr>
                      <tr className="border-b border-slate-100">
                        <td className="p-4 font-black bg-slate-50 text-slate-500 uppercase text-[10px]">Aulas (Plano)</td>
                        <td className="p-4 font-bold text-slate-800">
                           {isEditingPlan ? <input className="w-full bg-blue-50/50 p-1 rounded" value={plan.lessonCount} onChange={(e) => updatePlanField('lessonCount', e.target.value)} /> : plan.lessonCount}
                        </td>
                        <td className="p-4 font-black bg-slate-50 text-slate-500 uppercase text-[10px]">Aulas (Bimestre)</td>
                        <td className="p-4 font-bold text-slate-800">
                           {isEditingPlan ? <input className="w-full bg-blue-50/50 p-1 rounded" value={plan.bimesterLessonCount} onChange={(e) => updatePlanField('bimesterLessonCount', e.target.value)} /> : plan.bimesterLessonCount}
                        </td>
                      </tr>
                     </tbody>
                  </table>
                </div>

                <div className="space-y-8">
                   <section className="break-inside-avoid">
                      <h3 className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black uppercase mb-4">1. Habilidades BNCC</h3>
                      <div className="space-y-3">
                         {plan.bnccSkills.map((code, i) => (
                           <div key={i} className="flex gap-4 p-4 bg-blue-50/50 rounded-2xl border border-blue-100">
                              <span className="font-black text-blue-600 flex-shrink-0">{code}</span>
                              {isEditingPlan ? (
                                <textarea 
                                  className="w-full bg-transparent text-xs font-bold text-slate-600 outline-none border-none resize-none"
                                  value={plan.bnccDescriptions[i]}
                                  onChange={(e) => {
                                    const newDescs = [...plan.bnccDescriptions];
                                    newDescs[i] = e.target.value;
                                    updatePlanField('bnccDescriptions', newDescs);
                                  }}
                                />
                              ) : (
                                <p className="text-xs font-bold text-slate-600">{plan.bnccDescriptions[i]}</p>
                              )}
                           </div>
                         ))}
                      </div>
                   </section>

                   <section className="break-inside-avoid">
                      <h3 className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black uppercase mb-4">2. Objetivos de Aprendizagem</h3>
                      {isEditingPlan ? (
                        <textarea 
                          className="w-full p-4 bg-slate-50 rounded-2xl text-sm font-bold text-slate-700 border-none resize-none min-h-[100px]"
                          value={plan.objectives.join('\n')}
                          onChange={(e) => updatePlanField('objectives', e.target.value.split('\n'))}
                        />
                      ) : (
                        <ul className="list-disc list-inside space-y-2 p-4 bg-slate-50 rounded-2xl">
                           {plan.objectives.map((o, i) => <li key={i} className="text-sm font-bold text-slate-700">{o}</li>)}
                        </ul>
                      )}
                   </section>

                   <section className="break-inside-avoid">
                      <h3 className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black uppercase mb-4">3. Metodologia e Orientações</h3>
                      {isEditingPlan ? (
                        <textarea 
                          className="w-full p-6 border-2 border-blue-100 bg-blue-50/20 rounded-3xl text-sm leading-relaxed text-slate-600 min-h-[150px] outline-none"
                          value={plan.methodology}
                          onChange={(e) => updatePlanField('methodology', e.target.value)}
                        />
                      ) : (
                        <div className="p-6 border-2 border-slate-100 rounded-3xl text-sm leading-relaxed text-slate-600 whitespace-pre-line font-medium italic">
                          {plan.methodology}
                        </div>
                      )}
                   </section>

                   <section className="break-inside-avoid">
                      <h3 className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black uppercase mb-4">4. Atividades Desenvolvidas</h3>
                      {isEditingPlan ? (
                        <textarea 
                          className="w-full p-6 bg-emerald-50/30 border border-emerald-100 rounded-3xl text-sm leading-relaxed text-slate-700 min-h-[150px] outline-none"
                          value={plan.activities}
                          onChange={(e) => updatePlanField('activities', e.target.value)}
                        />
                      ) : (
                        <div className="p-6 bg-emerald-50/30 border border-emerald-100 rounded-3xl text-sm leading-relaxed text-slate-700 whitespace-pre-line font-bold">
                          {plan.activities}
                        </div>
                      )}
                   </section>

                   <section className="break-inside-avoid">
                      <h3 className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black uppercase mb-4">5. Recursos Didáticos</h3>
                      {isEditingPlan ? (
                        <textarea 
                          className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-xs font-bold text-slate-500 uppercase outline-none"
                          value={plan.resources.join(', ')}
                          onChange={(e) => updatePlanField('resources', e.target.value.split(',').map(s => s.trim()))}
                        />
                      ) : (
                        <div className="flex flex-wrap gap-2 p-4">
                          {plan.resources.map((r, i) => <span key={i} className="bg-white border border-slate-200 px-3 py-1 rounded-full text-[10px] font-bold text-slate-500 uppercase tracking-tighter shadow-sm">{r}</span>)}
                        </div>
                      )}
                   </section>

                   <section className="break-inside-avoid">
                      <h3 className="bg-slate-800 text-white px-4 py-2 rounded-xl text-xs font-black uppercase mb-4">6. Avaliação</h3>
                      {isEditingPlan ? (
                        <textarea 
                          className="w-full p-6 bg-amber-50/50 border border-amber-200 rounded-3xl text-sm leading-relaxed text-amber-900 outline-none"
                          value={plan.evaluation}
                          onChange={(e) => updatePlanField('evaluation', e.target.value)}
                        />
                      ) : (
                        <div className="p-6 bg-amber-50/50 border border-amber-200 rounded-3xl text-sm leading-relaxed text-amber-900 font-bold italic">
                          {plan.evaluation}
                        </div>
                      )}
                   </section>
                </div>
             </article>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
