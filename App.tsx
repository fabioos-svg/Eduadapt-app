
import React, { useState, useEffect } from 'react';
import Header from './components/Header';
import LessonSectionCard from './components/LessonSectionCard';
import { AdaptedLesson, AppStatus, Discipline, Grade, AppMode, LessonPlan, BNCCSearchResult, ProfessionalLesson, ExerciseSheet, ExerciseDifficulty } from './types';
import { adaptLessonContent, generateLessonImage, generateLessonPlan, searchBNCCSkill, generateProfessionalLesson, generateExercises } from './services/geminiService';

const App: React.FC = () => {
  const [hasApiKey, setHasApiKey] = useState<boolean>(true); 
  const [appMode, setAppMode] = useState<AppMode | null>(null);
  const [inputText, setInputText] = useState('');
  const [discipline, setDiscipline] = useState<Discipline>('Ciências');
  const [school, setSchool] = useState('');
  const [teacherName, setTeacherName] = useState('');
  const [grade, setGrade] = useState<Grade>('6º ano (Fundamental II)');
  const [status, setStatus] = useState<AppStatus>('idle');
  
  const [lesson, setLesson] = useState<AdaptedLesson | null>(null);
  const [plan, setPlan] = useState<LessonPlan | null>(null);
  const [proLesson, setProLesson] = useState<ProfessionalLesson | null>(null);
  const [exercises, setExercises] = useState<ExerciseSheet | null>(null);
  
  const [error, setError] = useState<string | null>(null);
  const [bnccQuery, setBnccQuery] = useState('');
  const [bnccResult, setBnccResult] = useState<BNCCSearchResult | null>(null);
  const [selectedSkills, setSelectedSkills] = useState<{code: string, desc: string}[]>([]);
  
  const [lessonCount, setLessonCount] = useState('8');
  const [bimester, setBimester] = useState('1° Bimestre');
  const [bimesterLessonCount, setBimesterLessonCount] = useState('32');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [endDate, setEndDate] = useState(new Date().toISOString().split('T')[0]);

  // Exercise Configs
  const [isAdaptedExercises, setIsAdaptedExercises] = useState(true);
  const [exerciseCount, setExerciseCount] = useState(5);
  const [selectedExerciseTypes, setSelectedExerciseTypes] = useState<string[]>(['multiple_choice', 'open', 'true_false']);
  const [difficulty, setDifficulty] = useState<ExerciseDifficulty>('Médio');
  const [visibleSupports, setVisibleSupports] = useState<Record<number, number>>({});

  useEffect(() => {
    checkApiKey();
  }, []);

  const checkApiKey = async () => {
    try {
      // @ts-ignore
      const selected = await window.aistudio.hasSelectedApiKey();
      setHasApiKey(selected);
    } catch (e) {
      setHasApiKey(true);
    }
  };

  const handleSelectKey = async () => {
    // @ts-ignore
    await window.aistudio.openSelectKey();
    setHasApiKey(true);
  };

  const isLoading = status !== 'idle' && status !== 'ready' && status !== 'error' && status !== 'searching-bncc';

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
      }
      setError("Habilidade não encontrada."); 
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

  const removeSkill = (code: string) => {
    setSelectedSkills(selectedSkills.filter(s => s.code !== code));
  };

  const handlePlanning = async (e: React.FormEvent) => {
    e.preventDefault();
    if (selectedSkills.length === 0 || !school.trim()) { setError('Preencha os campos obrigatórios (Escola e Habilidades).'); return; }
    setError(null); setStatus('planning');
    try {
      const res = await generateLessonPlan(
        teacherName, 
        school, 
        discipline, 
        grade, 
        lessonCount, 
        bimester,
        bimesterLessonCount, 
        startDate, 
        endDate, 
        selectedSkills.map(s => s.code), 
        selectedSkills.map(s => s.desc)
      );
      setPlan(res); setStatus('ready');
    } catch (err: any) { 
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
      }
      setError("Erro ao gerar plano BNCC."); 
      setStatus('idle');
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
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
      }
      setError("Erro na adaptação para DI. Verifique sua chave."); 
      setStatus('idle'); 
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
        // Incrementally update slides to show progress
        setProLesson(prev => prev ? ({ ...prev, slides: [...updatedSlides] }) : null);
      }
      setStatus('ready');
    } catch (err: any) { 
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
      }
      setError("Erro ao desenhar slides."); 
      setStatus('idle'); 
    }
  };

  const handleExercisesGeneration = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!inputText.trim()) { setError('Conteúdo base é necessário.'); return; }
    if (selectedExerciseTypes.length === 0) { setError('Selecione pelo menos um tipo de exercício.'); return; }
    setError(null); setStatus('generating-exercises');
    try {
      const res = await generateExercises(inputText, discipline, grade, exerciseCount, selectedExerciseTypes, isAdaptedExercises, difficulty);
      setExercises(res);
      setVisibleSupports({});
      setStatus('ready');
    } catch (err: any) { 
      if (err.message?.includes("Requested entity was not found")) {
        setHasApiKey(false);
      }
      setError("Erro ao criar exercícios."); 
      setStatus('idle'); 
    }
  };

  const reset = () => {
    setLesson(null); setPlan(null); setProLesson(null); setExercises(null); setInputText(''); setSelectedSkills([]); 
    setStatus('idle'); setError(null); setVisibleSupports({});
  };

  const fullReset = () => { reset(); setAppMode(null); }

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
    
    // Slide de Capa
    const slideCapa = pptx.addSlide();
    slideCapa.background = { color: "0F172A" };
    slideCapa.addText(proLesson.title, { x: 0.5, y: 1.5, w: 9, align: "center", fontSize: 36, bold: true, color: "FFFFFF" });
    slideCapa.addText(`${discipline} • ${grade}`, { x: 0.5, y: 2.5, w: 9, align: "center", fontSize: 18, color: "3B82F6" });

    // Slides de Conteúdo
    proLesson.slides.forEach((slide: any) => {
      const pSlide = pptx.addSlide();
      pSlide.addText(slide.title, { x: 0.5, y: 0.3, w: 9, fontSize: 24, bold: true, color: "1E293B" });
      pSlide.addText(slide.topics.join('\n'), { x: 0.5, y: 1.0, w: 4.5, h: 3.5, fontSize: 14, color: "475569" });
      
      // Adicionar conteúdo detalhado nas notas de rodapé ou área oculta (usaremos uma caixa de texto menor)
      pSlide.addText("NOTAS DO PROFESSOR:\n" + slide.detailedContent, { x: 0.5, y: 4.5, w: 9, h: 1.0, fontSize: 10, color: "94A3B8", italic: true });

      if (slide.imageUrl) {
        pSlide.addImage({ data: slide.imageUrl, x: 5.2, y: 1.0, w: 4.3, h: 4.4 });
      }
    });

    pptx.writeFile({ fileName: `Aula_${proLesson.title}.pptx` });
  };

  const toggleExerciseType = (type: string) => {
    setSelectedExerciseTypes(prev => prev.includes(type) ? prev.filter(t => t !== type) : [...prev, type]);
  };

  const toggleSupport = (qIdx: number, level: number) => {
    setVisibleSupports(prev => ({
      ...prev,
      [qIdx]: prev[qIdx] === level ? 0 : level
    }));
  };

  const updatePlanField = (field: keyof LessonPlan, value: any) => {
    if (plan) setPlan({ ...plan, [field]: value });
  };

  if (!hasApiKey) {
    return (
      <div className="min-h-screen bg-[#f8fafc] flex items-center justify-center px-4">
        <div className="max-w-md w-full bg-white p-12 rounded-[3rem] shadow-2xl border border-blue-50 text-center">
          <div className="w-20 h-20 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto mb-6 text-3xl">🔑</div>
          <h2 className="text-2xl font-black text-slate-800 mb-4 tracking-tight">Configuração de Segurança</h2>
          <p className="text-slate-500 font-medium mb-8 leading-relaxed">Para proteger a privacidade e garantir o uso correto da ferramenta, selecione sua chave de API Google Cloud.</p>
          <a href="https://ai.google.dev/gemini-api/docs/billing" target="_blank" rel="noopener noreferrer" className="block text-xs text-blue-500 mb-6 hover:underline">Saiba mais sobre faturamento e chaves API</a>
          <button onClick={handleSelectKey} className="w-full bg-blue-600 text-white py-4 rounded-2xl font-black shadow-lg hover:bg-blue-700 transition-all">SELECIONAR MINHA CHAVE</button>
        </div>
      </div>
    );
  }

  const features = [
    { id: 'adaptation', title: 'Aula Adaptada', desc: 'Adaptação pedagógica inclusiva para alunos com DI.', icon: '🧩', color: 'from-blue-500 to-cyan-400', shadow: 'shadow-blue-200' },
    { id: 'planning', title: 'Plano de Aula', desc: 'Planejamento completo estruturado nas normas BNCC.', icon: '📋', color: 'from-purple-500 to-pink-400', shadow: 'shadow-purple-200' },
    { id: 'slides', title: 'Criar Aulas', desc: 'Design instrucional de alto impacto e slides prontos.', icon: '🚀', color: 'from-indigo-600 to-blue-500', shadow: 'shadow-indigo-200' },
    { id: 'exercises', title: 'Criar Exercícios', desc: 'Listas de atividades com níveis de suporte inclusivo.', icon: '📝', color: 'from-emerald-500 to-teal-400', shadow: 'shadow-emerald-200' }
  ];

  const disciplinesList = ['Língua Portuguesa', 'Matemática', 'Ciências', 'Geografia', 'História', 'Educação Física', 'Arte', 'Ensino Religioso', 'Língua Inglesa', 'Biologia', 'Física', 'Química', 'Sociologia', 'Filosofia'];
  
  const gradesList = [
    'Educação Infantil',
    '1º ano (Fundamental I)',
    '2º ano (Fundamental I)',
    '3º ano (Fundamental I)',
    '4º ano (Fundamental I)',
    '5º ano (Fundamental I)',
    '6º ano (Fundamental II)',
    '7º ano (Fundamental II)',
    '8º ano (Fundamental II)',
    '9º ano (Fundamental II)',
    '1ª série (Ensino Médio)',
    '2ª série (Ensino Médio)',
    '3ª série (Ensino Médio)'
  ];

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans pb-20">
      <Header onLogoClick={fullReset} />
      
      <main className="max-w-6xl mx-auto px-4 py-8">
        {!appMode && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-700">
            <div className="text-center mb-16 mt-8">
              <h2 className="text-5xl font-black text-slate-800 mb-4 tracking-tight">O que vamos criar hoje?</h2>
              <p className="text-xl text-slate-500 font-medium max-w-2xl mx-auto">Transforme sua prática pedagógica e promova a verdadeira inclusão.</p>
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
              {features.map((f) => (
                <button key={f.id} onClick={() => setAppMode(f.id as AppMode)} className={`group relative bg-white p-8 rounded-[2.5rem] text-left transition-all duration-300 hover:-translate-y-3 shadow-xl ${f.shadow} border border-slate-100`}>
                  <div className={`w-16 h-16 rounded-3xl bg-gradient-to-br ${f.color} flex items-center justify-center text-3xl mb-6 shadow-lg`}>{f.icon}</div>
                  <h3 className="text-2xl font-black text-slate-800 mb-3 tracking-tight group-hover:text-blue-600">{f.title}</h3>
                  <p className="text-slate-500 font-bold leading-relaxed">{f.desc}</p>
                </button>
              ))}
            </div>
          </div>
        )}

        {appMode && (
          <div className="no-print mb-8">
            <button onClick={fullReset} className="flex items-center gap-2 text-slate-400 font-bold hover:text-blue-500 transition-colors">← Voltar ao Início</button>
          </div>
        )}

        {appMode && !lesson && !plan && !proLesson && !exercises && (
          <div className="max-w-4xl mx-auto">
            <div className="mb-10 text-center">
              <span className="bg-blue-100 text-blue-600 px-4 py-1.5 rounded-full text-xs font-black uppercase tracking-widest border border-blue-200">{features.find(f => f.id === appMode)?.title}</span>
              <h2 className="text-3xl font-black text-slate-800 mt-4">Preencha os detalhes da aula</h2>
            </div>
            <form onSubmit={appMode === 'adaptation' ? handleAdapt : appMode === 'planning' ? handlePlanning : appMode === 'slides' ? handleProSlides : handleExercisesGeneration} className="space-y-6">
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
                    <label className="block text-blue-400 font-bold text-[10px] uppercase mb-2 tracking-widest">Disciplina</label>
                    <select value={discipline} onChange={e => setDiscipline(e.target.value as Discipline)} className="w-full bg-blue-50/50 p-3 rounded-xl font-bold outline-none border border-blue-50">
                      {disciplinesList.map(d => <option key={d} value={d}>{d}</option>)}
                    </select>
                  </div>
                  <div className="bg-white p-6 rounded-[2rem] shadow-xl border border-blue-50">
                    <label className="block text-blue-400 font-bold text-[10px] uppercase mb-2 tracking-widest">Etapa</label>
                    <select value={grade} onChange={e => setGrade(e.target.value as Grade)} className="w-full bg-blue-50/50 p-3 rounded-xl font-bold outline-none border border-blue-50">
                      {gradesList.map(g => <option key={g} value={g}>{g}</option>)}
                    </select>
                  </div>
               </div>

               {appMode === 'planning' && (
                 <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-blue-50 space-y-6">
                    <h3 className="text-xl font-black text-slate-800 border-b border-slate-100 pb-4">Configurações do Plano</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      <div>
                        <label className="block text-blue-400 font-bold text-[10px] uppercase mb-2 tracking-widest">Bimestre</label>
                        <select value={bimester} onChange={e => setBimester(e.target.value)} className="w-full bg-blue-50/50 p-3 rounded-xl font-bold outline-none border border-blue-50">
                          <option value="1° Bimestre">1° Bimestre</option>
                          <option value="2° Bimestre">2° Bimestre</option>
                          <option value="3° Bimestre">3° Bimestre</option>
                          <option value="4° Bimestre">4° Bimestre</option>
                        </select>
                      </div>
                      <div>
                        <label className="block text-blue-400 font-bold text-[10px] uppercase mb-2 tracking-widest">Aulas no Plano</label>
                        <input type="number" value={lessonCount} onChange={e => setLessonCount(e.target.value)} className="w-full bg-blue-50/50 p-3 rounded-xl font-bold outline-none border border-blue-50" />
                      </div>
                      <div>
                        <label className="block text-blue-400 font-bold text-[10px] uppercase mb-2 tracking-widest">Aulas no Bimestre</label>
                        <input type="number" value={bimesterLessonCount} onChange={e => setBimesterLessonCount(e.target.value)} className="w-full bg-blue-50/50 p-3 rounded-xl font-bold outline-none border border-blue-50" />
                      </div>
                      <div>
                        <label className="block text-blue-400 font-bold text-[10px] uppercase mb-2 tracking-widest">Início</label>
                        <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full bg-blue-50/50 p-3 rounded-xl font-bold outline-none border border-blue-50" />
                      </div>
                      <div>
                        <label className="block text-blue-400 font-bold text-[10px] uppercase mb-2 tracking-widest">Término</label>
                        <input type="date" value={endDate} onChange={e => setEndDate(e.target.value)} className="w-full bg-blue-50/50 p-3 rounded-xl font-bold outline-none border border-blue-50" />
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-blue-400 font-bold text-[10px] uppercase mb-2 tracking-widest">Adicionar Habilidades (BNCC)</label>
                      <div className="flex gap-2">
                        <input type="text" value={bnccQuery} onChange={e => setBnccQuery(e.target.value)} onKeyPress={e => e.key === 'Enter' && handleBNCCSearch()} className="flex-1 bg-blue-50/50 p-3 rounded-xl font-bold outline-none border border-blue-50" placeholder="Ex: EF07GE08 ou Industrialização" />
                        <button type="button" onClick={handleBNCCSearch} className="bg-blue-600 text-white px-6 rounded-xl font-bold">Buscar</button>
                      </div>
                      
                      {status === 'searching-bncc' && <p className="text-xs font-bold text-blue-400 animate-pulse">Buscando na BNCC...</p>}
                      
                      {bnccResult && (
                        <div className="p-4 bg-white border-2 border-blue-100 rounded-2xl flex flex-col gap-4 animate-in fade-in zoom-in-95">
                          <div className="flex items-center justify-between gap-4">
                            <div className="flex-1">
                              <span className="font-black text-blue-600 block">{bnccResult.code}</span>
                              <span className="text-sm font-medium text-slate-600">{bnccResult.description}</span>
                            </div>
                            <button type="button" onClick={addSkillToPlan} className="bg-emerald-500 text-white p-2 rounded-lg shadow-lg">Adicionar</button>
                          </div>
                          {bnccResult.sources && bnccResult.sources.length > 0 && (
                            <div className="border-t border-slate-100 pt-2">
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-2">Fontes consultadas:</p>
                              <div className="flex flex-wrap gap-2">
                                {bnccResult.sources.map((src, i) => (
                                  <a key={i} href={src.uri} target="_blank" rel="noopener noreferrer" className="text-[10px] text-blue-500 hover:underline flex items-center gap-1 bg-blue-50 px-2 py-1 rounded">
                                    <svg xmlns="http://www.w3.org/2000/svg" className="h-3 w-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                                    </svg>
                                    {src.title}
                                  </a>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      <div className="flex flex-wrap gap-2 pt-2">
                        {selectedSkills.map(s => (
                          <div key={s.code} className="bg-blue-50 text-blue-600 px-4 py-2 rounded-xl text-xs font-bold border border-blue-100 flex items-center gap-2">
                            {s.code}
                            <button type="button" onClick={() => removeSkill(s.code)} className="text-red-400 hover:text-red-600">×</button>
                          </div>
                        ))}
                      </div>
                    </div>
                 </div>
               )}

               {appMode === 'exercises' && (
                 <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-blue-50 space-y-8">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      <div className="space-y-4">
                        <label className="block text-blue-600 font-black text-xs uppercase tracking-widest">Quantidade: {exerciseCount}</label>
                        <input type="range" min="1" max="15" value={exerciseCount} onChange={e => setExerciseCount(parseInt(e.target.value))} className="w-full accent-blue-600" />
                      </div>
                      <div className={`space-y-4 transition-opacity ${isAdaptedExercises ? 'opacity-40 pointer-events-none' : 'opacity-100'}`}>
                        <label className="block text-blue-600 font-black text-xs uppercase tracking-widest">Dificuldade {isAdaptedExercises && '(Bloqueado em modo inclusivo)'}</label>
                        <div className="flex gap-2">
                          {(['Fácil', 'Médio', 'Desafiador'] as ExerciseDifficulty[]).map(d => (
                            <button 
                              key={d} 
                              type="button" 
                              disabled={isAdaptedExercises}
                              onClick={() => setDifficulty(d)} 
                              className={`flex-1 py-2 rounded-xl text-xs font-bold border transition-all ${difficulty === d ? 'bg-blue-600 text-white border-blue-600 shadow-md' : 'bg-white text-blue-400 border-blue-100'}`}
                            >
                              {d}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>

                    <div className="space-y-4">
                      <label className="block text-blue-600 font-black text-xs uppercase tracking-widest">Tipos de Questão</label>
                      <div className="flex flex-wrap gap-2">
                        {[
                          { id: 'multiple_choice', label: 'Alternativas' },
                          { id: 'open', label: 'Dissertativas' },
                          { id: 'true_false', label: 'Verdadeiro ou Falso' }
                        ].map(t => (
                          <button key={t.id} type="button" onClick={() => toggleExerciseType(t.id)} className={`px-4 py-2 rounded-xl text-xs font-bold border transition-all ${selectedExerciseTypes.includes(t.id) ? 'bg-indigo-500 text-white border-indigo-500 shadow-sm' : 'bg-white text-indigo-400 border-indigo-50'}`}>
                            {t.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 bg-emerald-50 p-6 rounded-3xl border border-emerald-100 shadow-inner">
                      <input type="checkbox" checked={isAdaptedExercises} onChange={e => setIsAdaptedExercises(e.target.checked)} id="adEx" className="w-5 h-5 accent-emerald-600 cursor-pointer" />
                      <label htmlFor="adEx" className="text-sm font-black text-emerald-800 cursor-pointer select-none uppercase">Adaptar para Inclusão (Níveis de Suporte)</label>
                    </div>
                 </div>
               )}

               {appMode !== 'planning' && (
                 <div className="bg-white p-8 rounded-[2rem] shadow-xl border border-blue-50">
                    <label className="block text-blue-400 font-bold text-[10px] uppercase mb-3 tracking-widest text-center">Conteúdo base da aula / apostila</label>
                    <textarea value={inputText} onChange={e => setInputText(e.target.value)} className="w-full h-64 bg-blue-50/50 p-6 rounded-3xl font-medium outline-none border border-blue-50" placeholder="Cole aqui o texto que será transformado..." />
                 </div>
               )}

               {error && <p className="text-red-500 text-center font-bold animate-pulse">{error}</p>}
               <button type="submit" disabled={isLoading} className="w-full bg-blue-600 text-white py-6 rounded-[2.5rem] text-2xl font-black shadow-2xl hover:scale-[1.02] transition-all disabled:opacity-50">
                {isLoading ? 'PROCESSANDO...' : 'GERAR AGORA'}
               </button>
            </form>
          </div>
        )}

        {plan && (
          <div className="space-y-10 animate-in fade-in duration-500 pb-20">
            <div className="flex justify-center gap-4 no-print flex-wrap">
               <button onClick={fullReset} className="bg-white text-slate-400 px-8 py-3 rounded-2xl font-bold border border-slate-200">Novo Plano</button>
               <button onClick={() => handleSavePDF('printable-plan', 'Plano_Aula.pdf')} className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-bold shadow-lg">Baixar PDF</button>
            </div>
            
            <article id="printable-plan" className="bg-white p-8 md:p-12 shadow-2xl border border-slate-200 text-slate-800 leading-tight">
              <div className="border-4 border-slate-800">
                <div className="bg-slate-800 text-white p-4 text-center">
                  <input 
                    className="bg-transparent text-white text-xl font-black text-center w-full uppercase outline-none"
                    value={plan.school}
                    onChange={e => updatePlanField('school', e.target.value)}
                  />
                </div>
                
                <div className="bg-slate-100 border-b-2 border-slate-800 p-4 text-center">
                  <input 
                    className="bg-transparent text-slate-800 text-2xl font-black text-center w-full outline-none"
                    value={`Plano de Aula – ${plan.bimester}`}
                    onChange={e => updatePlanField('bimester', e.target.value.replace('Plano de Aula – ', ''))}
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 border-b-2 border-slate-800">
                  <div className="p-3 border-r-2 border-slate-800 flex gap-2">
                    <span className="font-black whitespace-nowrap">Professor:</span>
                    <input className="w-full outline-none font-medium" value={plan.teacherName} onChange={e => updatePlanField('teacherName', e.target.value)} />
                  </div>
                  <div className="p-3 flex gap-2">
                    <span className="font-black whitespace-nowrap">Componente curricular:</span>
                    <input className="w-full outline-none font-medium" value={plan.discipline} onChange={e => updatePlanField('discipline', e.target.value)} />
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 border-b-2 border-slate-800">
                  <div className="p-3 border-r-2 border-slate-800 flex gap-2">
                    <span className="font-black whitespace-nowrap">Ano/Série:</span>
                    <input className="w-full outline-none font-medium" value={plan.grade} onChange={e => updatePlanField('grade', e.target.value)} />
                  </div>
                  <div className="p-3 flex gap-2">
                    <span className="font-black whitespace-nowrap">Quantidade de aulas do bimestre:</span>
                    <input className="w-full outline-none font-medium" value={plan.bimesterLessonCount} onChange={e => updatePlanField('bimesterLessonCount', e.target.value)} />
                  </div>
                </div>

                <div className="bg-slate-800 text-white p-2 font-black uppercase text-sm tracking-widest text-center">Detalhamento do Plano</div>

                <div className="grid grid-cols-1 md:grid-cols-2 border-b-2 border-slate-800">
                  <div className="p-3 border-r-2 border-slate-800 flex gap-2">
                    <span className="font-black whitespace-nowrap">Tempo de duração:</span>
                    <input className="w-full outline-none font-medium" value={plan.lessonCount + ' aulas'} onChange={e => updatePlanField('lessonCount', e.target.value.replace(' aulas', ''))} />
                  </div>
                  <div className="p-3 flex gap-2">
                    <span className="font-black whitespace-nowrap">Data/período:</span>
                    <input className="w-full outline-none font-medium" value={plan.period} onChange={e => updatePlanField('period', e.target.value)} />
                  </div>
                </div>

                <div className="p-4 border-b-2 border-slate-800">
                  <div className="font-black mb-2 uppercase text-sm flex items-center gap-2">
                    <span className="w-2 h-6 bg-slate-800"></span> Habilidades trabalhadas:
                  </div>
                  <div className="space-y-2 text-sm leading-relaxed">
                    {plan.bnccSkills.map((code, idx) => (
                      <p key={idx} className="flex gap-2">
                        <span className="font-bold">• {code}</span> 
                        <span className="text-slate-600">{plan.bnccDescriptions[idx]}</span>
                      </p>
                    ))}
                  </div>
                </div>

                <div className="p-4 border-b-2 border-slate-800">
                  <div className="font-black mb-2 uppercase text-sm flex items-center gap-2">
                    <span className="w-2 h-6 bg-slate-800"></span> Objetivos:
                  </div>
                  <ul className="list-disc ml-6 space-y-1 font-medium">
                    {plan.objectives.map((obj, i) => (
                      <li key={i}>{obj}</li>
                    ))}
                  </ul>
                </div>

                <div className="p-4 border-b-2 border-slate-800">
                  <div className="font-black mb-2 uppercase text-sm flex items-center gap-2">
                    <span className="w-2 h-6 bg-slate-800"></span> Metodologia / Orientações aos alunos:
                  </div>
                  <textarea 
                    className="w-full min-h-[120px] outline-none font-medium leading-relaxed resize-none"
                    value={plan.methodology}
                    onChange={e => updatePlanField('methodology', e.target.value)}
                  />
                </div>

                <div className="p-4 border-b-2 border-slate-800">
                  <div className="font-black mb-2 uppercase text-sm flex items-center gap-2">
                    <span className="w-2 h-6 bg-slate-800"></span> Recursos utilizados:
                  </div>
                  <div className="flex flex-wrap gap-x-6 gap-y-1 ml-6 list-disc">
                    {plan.resources.map((res, i) => (
                      <span key={i} className="font-medium">• {res}</span>
                    ))}
                  </div>
                </div>

                <div className="p-4">
                  <div className="font-black mb-2 uppercase text-sm flex items-center gap-2">
                    <span className="w-2 h-6 bg-slate-800"></span> Atividades desenvolvidas / Avaliação:
                  </div>
                  <textarea 
                    className="w-full min-h-[120px] outline-none font-medium leading-relaxed resize-none"
                    value={plan.evaluation}
                    onChange={e => updatePlanField('evaluation', e.target.value)}
                  />
                </div>
              </div>

              <footer className="mt-12 pt-6 border-t border-slate-100 text-center text-slate-300 font-black text-[9px] uppercase tracking-[0.4em]">
                Sistema de Gestão Pedagógica SalvaProf • Documento Oficial BNCC
              </footer>
            </article>
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
                    <span className="font-bold text-slate-400 text-xs uppercase">{school || 'UNIDADE ESCOLAR'}</span>
                    <span className="font-bold text-slate-400 text-xs">DATA: ____/____/____</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="font-bold text-slate-800">ALUNO(A): ____________________________________________________</span>
                    <span className="font-bold text-slate-400 text-xs">{teacherName || 'PROFESSOR'}</span>
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
                            <div key={oi} className="flex items-center gap-4 group">
                               <div className="w-7 h-7 border-2 border-slate-200 rounded-full" />
                               <span className="text-slate-700 text-lg font-medium">{o}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      
                      {q.type === 'true_false' && <div className="ml-12 flex gap-4"><div className="w-12 h-8 border-2 border-slate-200 rounded flex items-center justify-center text-xs font-bold text-slate-300">V</div><div className="w-12 h-8 border-2 border-slate-200 rounded flex items-center justify-center text-xs font-bold text-slate-300">F</div></div>}
                      {q.type === 'open' && <div className="ml-12 h-24 border-b border-slate-100" />}
                      
                      {q.supports && isAdaptedExercises && (
                        <div className="mt-10 space-y-4 no-print ml-12 p-6 bg-slate-50 rounded-3xl border border-slate-100 shadow-inner">
                           <p className="text-[10px] font-black text-blue-400 uppercase tracking-widest mb-4">Apoio Pedagógico:</p>
                           <div className="flex flex-wrap gap-2">
                              <button onClick={() => toggleSupport(idx, 1)} className={`px-5 py-2.5 rounded-xl text-xs font-black border transition-all ${visibleSupports[idx] === 1 ? 'bg-amber-500 text-white border-amber-600 shadow-sm' : 'bg-white text-amber-500 border-amber-100'}`}>Nível 1: A Pista</button>
                              <button onClick={() => toggleSupport(idx, 2)} className={`px-5 py-2.5 rounded-xl text-xs font-black border transition-all ${visibleSupports[idx] === 2 ? 'bg-emerald-500 text-white border-emerald-600 shadow-sm' : 'bg-white text-emerald-500 border-emerald-100'}`}>Nível 2: O Caminho</button>
                              <button onClick={() => toggleSupport(idx, 3)} className={`px-5 py-2.5 rounded-xl text-xs font-black border transition-all ${visibleSupports[idx] === 3 ? 'bg-indigo-500 text-white border-indigo-600 shadow-sm' : 'bg-white text-indigo-500 border-indigo-100'}`}>Nível 3: A Ponte</button>
                           </div>
                           
                           {visibleSupports[idx] === 1 && <div className="p-5 bg-amber-50 rounded-2xl text-sm italic border border-amber-200 text-amber-900 leading-relaxed"><span className="font-black uppercase text-[10px] block mb-1">Dica Visual/Sutil:</span> {q.supports.level1}</div>}
                           {visibleSupports[idx] === 2 && <div className="p-5 bg-emerald-50 rounded-2xl text-sm italic border border-emerald-200 text-emerald-900 leading-relaxed"><span className="font-black uppercase text-[10px] block mb-1">Guia de Processo:</span> {q.supports.level2}</div>}
                           {visibleSupports[idx] === 3 && <div className="p-5 bg-indigo-50 rounded-2xl text-sm italic border border-indigo-200 text-indigo-900 leading-relaxed"><span className="font-black uppercase text-[10px] block mb-1">Explicação Profunda:</span> {q.supports.level3}</div>}
                        </div>
                      )}
                   </div>
                 ))}
               </div>

               <div className="mt-20 pt-10 border-t-4 border-slate-100 break-before-page">
                  <h2 className="text-2xl font-black text-slate-800 uppercase mb-8">Gabarito para o Professor</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {exercises.questions.map((q, idx) => (
                      <div key={idx} className="bg-slate-50 p-6 rounded-3xl border border-slate-100">
                        <p className="font-black text-blue-600">Questão {idx + 1}: <span className="text-slate-800">{q.answerKey}</span></p>
                        <p className="text-xs text-slate-500 italic mt-2">{q.explanation}</p>
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
               <button onClick={() => handleSavePDF('printable-lesson', 'Aula_Adaptada.pdf')} className="bg-blue-600 text-white px-10 py-3 rounded-2xl font-bold">Baixar PDF</button>
            </div>
            <article id="printable-lesson" className="bg-white p-12 rounded-[2.5rem] shadow-2xl border border-blue-50 space-y-16">
               <div className="text-center space-y-4">
                  <h1 className="text-5xl font-black text-slate-800 tracking-tight">{lesson.adaptedTitle}</h1>
                  <p className="text-blue-500 font-black uppercase tracking-widest">{discipline} • {grade}</p>
                  <div className="bg-blue-50/40 p-10 rounded-[3rem] text-xl italic text-slate-600 border border-blue-100 leading-relaxed">
                    {lesson.summary}
                  </div>
               </div>
               
               <div className="space-y-2">
                  {lesson.sections.map((sec, idx) => (
                    <LessonSectionCard key={idx} section={sec} index={idx} />
                  ))}
               </div>

               {lesson.practicalActivities && lesson.practicalActivities.length > 0 && (
                 <section className="mt-20 space-y-10 break-before-page">
                    <div className="flex items-center gap-4 border-b-4 border-blue-600 pb-4">
                       <span className="text-4xl">🖐️</span>
                       <h2 className="text-4xl font-black text-slate-800 uppercase">Atividades Práticas</h2>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                      {lesson.practicalActivities.map((act, idx) => (
                        <div key={idx} className="p-10 bg-slate-50 rounded-[3rem] border-2 border-slate-100 space-y-6 flex flex-col shadow-sm">
                          <h3 className="text-2xl font-black text-blue-600 leading-tight">{act.title}</h3>
                          <p className="text-slate-700 leading-relaxed font-bold text-lg flex-1">{act.description}</p>
                          <div className="pt-6 border-t border-slate-200">
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-3">Materiais Necessários:</p>
                            <div className="flex flex-wrap gap-2">
                              {act.materials.map((m, mi) => (
                                <span key={mi} className="bg-white px-4 py-2 rounded-xl text-xs font-black text-slate-600 border border-slate-200 shadow-sm uppercase">
                                  {m}
                                </span>
                              ))}
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                 </section>
               )}

               {lesson.familyActivity && (
                 <section className="mt-20 break-before-page p-12 bg-emerald-50 rounded-[4rem] border-4 border-emerald-100 shadow-xl relative overflow-hidden">
                    <div className="relative space-y-8">
                      <div className="flex items-center gap-4">
                         <span className="text-5xl">🏠</span>
                         <h2 className="text-4xl font-black text-emerald-800 uppercase">Missão em Família</h2>
                      </div>
                      <div className="space-y-6 bg-white p-10 rounded-[3rem] shadow-inner border-2 border-emerald-100">
                         <h3 className="text-3xl font-black text-emerald-700">{lesson.familyActivity.title}</h3>
                         <p className="text-slate-700 text-xl font-medium leading-relaxed italic border-l-8 border-emerald-200 pl-6">
                           {lesson.familyActivity.description}
                         </p>
                         <div className="mt-8 p-8 bg-emerald-50 rounded-[2rem] border border-emerald-100">
                            <p className="text-[10px] font-black text-emerald-400 uppercase tracking-widest mb-3">Instruções para a família:</p>
                            <p className="text-slate-800 font-black text-lg leading-relaxed">{lesson.familyActivity.instruction}</p>
                         </div>
                      </div>
                    </div>
                 </section>
               )}
               
               <footer className="mt-20 pt-10 border-t-2 border-slate-100 text-center text-slate-400 font-black text-[10px] uppercase tracking-[0.3em]">
                  SalvaProf • Inclusão Criativa • 2025
               </footer>
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
                 <div key={idx} className="bg-white rounded-[3rem] shadow-2xl overflow-hidden flex flex-col md:flex-row min-h-[600px] break-inside-avoid border border-slate-100">
                    <div className="flex-1 p-12 flex flex-col justify-center space-y-8">
                       <h2 className="text-3xl font-black text-slate-800 leading-tight border-l-8 border-blue-500 pl-6">{slide.title}</h2>
                       <ul className="space-y-4">{slide.topics.map((t, i) => <li key={i} className="text-slate-600 font-bold text-lg flex gap-4"><span className="text-blue-500 text-2xl">▸</span> {t}</li>)}</ul>
                       
                       {/* Aprofundamento Visual Garantido */}
                       <div className="mt-6 p-8 bg-blue-50/50 rounded-[2.5rem] border-2 border-blue-200 shadow-inner">
                          <p className="text-[10px] font-black text-blue-600 uppercase tracking-widest mb-4">Aprofundamento para o Professor:</p>
                          <p className="text-slate-700 text-base font-medium leading-relaxed italic whitespace-pre-line">
                            {slide.detailedContent || "Conteúdo teórico em processamento..."}
                          </p>
                       </div>

                       <div className="flex items-center gap-4 p-4 bg-emerald-50 rounded-2xl border border-emerald-100">
                          <span className="text-2xl">🌍</span>
                          <p className="text-sm font-black text-emerald-800 italic">{slide.realityBridge}</p>
                       </div>
                    </div>
                    
                    {/* Imagem com Estado de Carregamento */}
                    <div className="flex-1 bg-slate-50 flex items-center justify-center p-8">
                       {slide.imageUrl ? (
                         <img src={slide.imageUrl} className="max-w-full rounded-[2.5rem] shadow-2xl border-4 border-white transition-all duration-500" alt={slide.altText} />
                       ) : (
                         <div className="w-full aspect-square bg-slate-100 animate-pulse rounded-[2.5rem] flex flex-col items-center justify-center border-4 border-dashed border-slate-200">
                           <div className="w-16 h-16 text-slate-300 mb-4">
                             <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                               <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                             </svg>
                           </div>
                           <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Gerando Ilustração...</p>
                         </div>
                       )}
                    </div>
                 </div>
               ))}
            </article>
          </div>
        )}
      </main>
    </div>
  );
};

export default App;
