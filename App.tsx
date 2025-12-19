
import React, { useState, useEffect, useRef, useMemo } from 'react';
import { 
  GameState, Team, AVAILABLE_TOOLS, ToolId, CATEGORY_POOL, VALUES, Question, Tool, Language, Category
} from './types';
import { generateBoardQuestion } from './geminiService';
import { 
  Users, Settings2, CheckCircle2, XCircle, Loader2, Trophy, RotateCcw, ChevronLeft, Timer, BrainCircuit, Languages, Sparkles, Target, ArrowRight, MousePointer2, AlertCircle, Info, Search, ChevronRight, Undo2
} from 'lucide-react';

const App: React.FC = () => {
  const [gameState, setGameState] = useState<GameState>('START');
  const [lang, setLang] = useState<Language>('ar');
  const [teams, setTeams] = useState<Team[]>([]);
  const [teamCount, setTeamCount] = useState(2);
  const [currentTeamIndex, setCurrentTeamIndex] = useState(0);
  const [selectedCategories, setSelectedCategories] = useState<Category[]>([]);
  
  // Search & Navigation for Categories
  const [searchTerm, setSearchTerm] = useState('');
  const [activeGroup, setActiveGroup] = useState<string | null>(null);

  // Board selection
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null);
  const [selectedValue, setSelectedValue] = useState<number | null>(null);
  const [currentQuestion, setCurrentQuestion] = useState<Question | null>(null);
  const [isLoadingQuestion, setIsLoadingQuestion] = useState(false);
  
  // Question & Tool State
  const [isAnswered, setIsAnswered] = useState(false);
  const [selectedOptions, setSelectedOptions] = useState<number[]>([]);
  const [activeTools, setActiveTools] = useState<ToolId[]>([]);
  const [pitTargetTeam, setPitTargetTeam] = useState<number | null>(null);
  const [timeLeft, setTimeLeft] = useState(40);
  
  // Alert system
  const [alert, setAlert] = useState<{message: string, type: 'error' | 'info' | 'success'} | null>(null);

  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const t = (ar: string, en: string) => lang === 'ar' ? ar : en;

  const showAlert = (message: string, type: 'error' | 'info' | 'success' = 'error') => {
    setAlert({ message, type });
    setTimeout(() => setAlert(null), 3500);
  };

  const handleBack = () => {
    if (gameState === 'SETUP') setGameState('START');
    else if (gameState === 'CATEGORY_SELECTION') setGameState('SETUP');
    else if (gameState === 'PLAYING') setGameState('CATEGORY_SELECTION');
  };

  const initSetup = () => {
    const initialTeams: Team[] = Array.from({ length: teamCount }, (_, i) => ({
      id: i,
      name: t(`فريق ${i + 1}`, `Team ${i + 1}`),
      score: 0,
      tools: [],
      usedTools: [],
      completedCells: {}
    }));
    setTeams(initialTeams);
    setGameState('SETUP');
  };

  const handleToolToggleSetup = (teamId: number, toolId: ToolId) => {
    setTeams(prev => prev.map(team => {
      if (team.id === teamId) {
        const has = team.tools.includes(toolId);
        if (has) return { ...team, tools: team.tools.filter(id => id !== toolId) };
        if (team.tools.length >= 3) {
          showAlert(t("أقصى عدد للمساعدات هو 3 لكل فريق", "Max 3 powers allowed per team"));
          return team;
        }
        return { ...team, tools: [...team.tools, toolId] };
      }
      return team;
    }));
  };

  const validateNamesAndProceed = () => {
    const names = teams.map(team => team.name.trim());
    if (new Set(names).size !== names.length) {
      showAlert(t("يجب أن تكون أسماء الفرق مختلفة", "Team names must be unique"));
      return;
    }
    setGameState('CATEGORY_SELECTION');
  };

  const toggleCategory = (cat: Category) => {
    setSelectedCategories(prev => {
      const exists = prev.find(c => c.id === cat.id);
      if (exists) return prev.filter(c => c.id !== cat.id);
      if (prev.length >= 6) {
        showAlert(t("لا يمكنك اختيار أكثر من 6 مجالات", "Max 6 categories allowed"));
        return prev;
      }
      return [...prev, cat];
    });
  };

  const startPlaying = () => {
    if (selectedCategories.length < 1) {
      showAlert(t("يرجى اختيار مجال واحد على الأقل للعب", "Select at least 1 category to play"));
      return;
    }
    setGameState('PLAYING');
  };

  const filteredCategories = useMemo(() => {
    let list = CATEGORY_POOL;
    if (searchTerm) {
      const s = searchTerm.toLowerCase();
      list = list.filter(c => 
        c.name.ar.includes(s) || 
        c.name.en.toLowerCase().includes(s) ||
        c.group.ar.includes(s) ||
        c.group.en.toLowerCase().includes(s)
      );
    } else if (activeGroup) {
      list = list.filter(c => c.group.ar === activeGroup || c.group.en === activeGroup);
    }
    return list;
  }, [searchTerm, activeGroup]);

  const uniqueGroups = useMemo(() => {
    const groups = new Set<string>();
    CATEGORY_POOL.forEach(c => groups.add(lang === 'ar' ? c.group.ar : c.group.en));
    return Array.from(groups);
  }, [lang]);

  const fetchQuestion = async () => {
    if (!selectedCategory || !selectedValue) {
      showAlert(t("اختر قيمة من الجدول أولاً", "Select a value from the table first"));
      return;
    }
    if (activeTools.includes('pit') && pitTargetTeam === null) {
      showAlert(t("يجب تحديد الفريق المستهدف للحفرة قبل السؤال", "Select a target team for Pit first"));
      return;
    }
    setIsLoadingQuestion(true);
    try {
      const q = await generateBoardQuestion(selectedCategory, selectedValue, lang);
      setCurrentQuestion(q);
      setIsAnswered(false);
      setSelectedOptions([]);
      setTimeLeft(40);
      startTimer();
    } catch (err) {
      showAlert(t("فشل في تحميل السؤال، جرب مرة أخرى", "Failed to load question, try again"));
    } finally {
      setIsLoadingQuestion(false);
    }
  };

  const startTimer = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    timerRef.current = setInterval(() => {
      setTimeLeft(prev => {
        if (prev <= 1) { handleTimeout(); return 0; }
        return prev - 1;
      });
    }, 1000);
  };

  const handleTimeout = () => {
    if (timerRef.current) clearInterval(timerRef.current);
    setIsAnswered(true);
    updateScore(false);
  };

  const handleToolUsageToggle = (toolId: ToolId) => {
    const tool = AVAILABLE_TOOLS.find(at => at.id === toolId)!;
    
    // Logic: Skip is used AFTER, others BEFORE.
    if (currentQuestion) {
      if (tool.usageTime === 'before') {
        showAlert(t("هذه المساعدة تستخدم فقط قبل ظهور السؤال", "This power must be used before the question"));
        return;
      }
      // If used after, allow Skip
      if (toolId === 'skip') {
        // Immediately skip
        nextTurn();
        return;
      }
    } else {
      if (tool.usageTime === 'after') {
        showAlert(t("هذه المساعدة تستخدم فقط بعد ظهور السؤال", "This power is only for after the question appears"));
        return;
      }
    }

    if (activeTools.includes(toolId)) {
      setActiveTools(prev => prev.filter(id => id !== toolId));
      if (toolId === 'pit') setPitTargetTeam(null);
    } else {
      setActiveTools(prev => [...prev, toolId]);
    }
  };

  const handleAnswer = (idx: number) => {
    if (isAnswered || !currentQuestion) return;
    
    const isDoubleTry = activeTools.includes('double_try');
    const newSelections = [...selectedOptions, idx];
    setSelectedOptions(newSelections);

    if (idx === currentQuestion.correctAnswer) {
      showAlert(t("إجابة صحيحة! أحسنت", "Correct Answer! Well done"), 'success');
      setIsAnswered(true);
      if (timerRef.current) clearInterval(timerRef.current);
      updateScore(true);
    } else {
      if (!isDoubleTry || (isDoubleTry && newSelections.length >= 2)) {
        setIsAnswered(true);
        if (timerRef.current) clearInterval(timerRef.current);
        updateScore(false);
      } else {
        showAlert(t("إجابة خاطئة! لديك محاولة أخرى", "Wrong! You have another attempt"), 'info');
      }
    }
  };

  const updateScore = (correct: boolean) => {
    if (!currentQuestion) return;
    let points = selectedValue || 0;
    if (activeTools.includes('double_points')) points *= 2;
    const usedThisTurn = [...activeTools];

    setTeams(prev => prev.map((team, idx) => {
      if (idx === currentTeamIndex) {
        const cells = { ...team.completedCells };
        if (!cells[selectedCategory!]) cells[selectedCategory!] = [];
        cells[selectedCategory!].push(selectedValue!);
        return { 
          ...team, 
          score: team.score + (correct ? points : 0), 
          completedCells: cells,
          usedTools: [...team.usedTools, ...usedThisTurn]
        };
      }
      if (idx === pitTargetTeam && correct && activeTools.includes('pit')) {
        return { ...team, score: team.score - points };
      }
      return team;
    }));
  };

  const nextTurn = () => {
    setCurrentQuestion(null);
    setSelectedCategory(null);
    setSelectedValue(null);
    setIsAnswered(false);
    setActiveTools([]);
    setPitTargetTeam(null);
    setCurrentTeamIndex((currentTeamIndex + 1) % teams.length);
  };

  const renderHeader = () => (
    <div className="fixed top-0 left-0 w-full h-16 bg-white/70 backdrop-blur-md border-b border-slate-200 z-50 flex items-center justify-between px-6 shadow-sm">
      <div className="flex items-center gap-3">
        <div className="bg-indigo-600 p-2 rounded-xl">
          <BrainCircuit className="text-white" size={24} />
        </div>
        <span className="font-black text-xl text-slate-800 tracking-tight">سـين جـيم</span>
      </div>
      {gameState !== 'START' && gameState !== 'SUMMARY' && (
        <button onClick={handleBack} className="flex items-center gap-2 px-4 py-2 bg-slate-100 rounded-xl text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 font-bold transition-all border border-slate-200">
          <Undo2 size={20} /> {t('رجوع', 'Back')}
        </button>
      )}
    </div>
  );

  const renderAlert = () => {
    if (!alert) return null;
    return (
      <div className={`fixed top-20 left-1/2 -translate-x-1/2 z-[100] px-6 py-4 rounded-2xl shadow-xl flex items-center gap-3 animate-fade-in border ${
        alert.type === 'error' ? 'bg-red-50 border-red-200 text-red-600 shadow-red-200/50' : 
        alert.type === 'success' ? 'bg-emerald-50 border-emerald-200 text-emerald-600 shadow-emerald-200/50' :
        'bg-indigo-50 border-indigo-200 text-indigo-600 shadow-indigo-200/50'
      }`}>
        {alert.type === 'error' ? <AlertCircle size={20}/> : alert.type === 'success' ? <CheckCircle2 size={20}/> : <Info size={20}/>}
        <span className="font-bold text-sm md:text-base">{alert.message}</span>
      </div>
    );
  };

  if (gameState === 'START') {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center p-6">
        {renderAlert()}
        <div className="max-w-xl w-full bg-white rounded-[3rem] p-12 border border-slate-100 shadow-2xl text-center animate-fade-in">
          <div className="inline-flex items-center justify-center p-7 bg-indigo-600 rounded-[2.5rem] mb-10 shadow-xl shadow-indigo-100">
            <BrainCircuit className="text-white" size={72} />
          </div>
          <h1 className="text-6xl font-black mb-12 text-slate-800 tracking-tighter">سـيـن جـيـم</h1>
          
          <div className="space-y-8">
            <div className="text-right">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">{t('لغة الأسئلة', 'Language')}</label>
              <div className="flex gap-4">
                {(['ar', 'en'] as Language[]).map(l => (
                  <button key={l} onClick={() => setLang(l)} className={`flex-1 py-5 rounded-[1.5rem] font-black text-lg border-2 transition-all ${lang === l ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                    {l === 'ar' ? 'العربية' : 'English'}
                  </button>
                ))}
              </div>
            </div>

            <div className="text-right">
              <label className="text-xs font-black text-slate-400 uppercase tracking-widest mb-3 block">{t('عدد الفرق', 'Teams')}</label>
              <div className="grid grid-cols-3 gap-4">
                {[2, 3, 4].map(n => (
                  <button key={n} onClick={() => setTeamCount(n)} className={`py-5 rounded-[1.5rem] font-black text-xl border-2 transition-all ${teamCount === n ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                    {n}
                  </button>
                ))}
              </div>
            </div>
            
            <button onClick={initSetup} className="w-full py-6 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[1.5rem] font-black text-2xl shadow-xl shadow-indigo-100 flex items-center justify-center gap-4 active:scale-95 transition-all">
              {t('بدء التحدي', 'Start Setup')} <ArrowRight size={28} />
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'SETUP') {
    return (
      <div className="min-h-screen pt-24 pb-12 px-8">
        {renderHeader()}
        {renderAlert()}
        <div className="max-w-5xl mx-auto">
          <h2 className="text-4xl font-black mb-10 text-indigo-900 flex items-center gap-4"><Settings2 size={40} /> {t('تجهيز الفرق', 'Setup Teams')}</h2>
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {teams.map((team, idx) => (
              <div key={team.id} className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
                <div className="mb-8">
                  <label className="block text-xs font-black text-slate-400 uppercase mb-3">{t(`اسم الفريق ${idx + 1}`, `Team ${idx + 1}`)}</label>
                  <input type="text" value={team.name} onChange={e => {
                        const nt = [...teams]; nt[idx].name = e.target.value; setTeams(nt);
                      }} className="w-full p-5 bg-slate-50 border-slate-200 border-2 rounded-2xl font-black text-xl focus:border-indigo-500 outline-none transition-all" />
                </div>
                <label className="text-xs font-black text-slate-400 uppercase mb-4 block">{t('اختر مساعداتك (أقصى 3)', 'Powers (Max 3)')}</label>
                <div className="grid grid-cols-2 gap-3">
                  {AVAILABLE_TOOLS.map(tool => (
                    <button key={tool.id} onClick={() => handleToolToggleSetup(team.id, tool.id)} className={`p-4 rounded-2xl border-2 text-sm font-black flex items-center gap-3 transition-all ${team.tools.includes(tool.id) ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:bg-slate-50'}`}>
                      <span className="text-2xl">{tool.icon}</span> 
                      <span>{t(tool.name.ar, tool.name.en)}</span>
                    </button>
                  ))}
                </div>
                <div className="mt-4 text-[10px] font-bold text-slate-300 uppercase tracking-widest">{team.tools.length} / 3 selected</div>
              </div>
            ))}
          </div>
          <button onClick={validateNamesAndProceed} className="mt-14 mx-auto block px-24 py-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-black text-2xl shadow-2xl active:scale-95 transition-all">
            {t('التالي: اختيار المجالات', 'Next: Choose Topics')}
          </button>
        </div>
      </div>
    );
  }

  if (gameState === 'CATEGORY_SELECTION') {
    return (
      <div className="min-h-screen pt-24 pb-12 px-8">
        {renderHeader()}
        {renderAlert()}
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between mb-12 gap-8">
            <h2 className="text-4xl font-black text-indigo-900 tracking-tight">{t('اختر مجالات اللعبة (1-6)', 'Game Categories (1-6)')}</h2>
            <div className="relative w-full md:w-96">
              <Search className="absolute right-5 top-1/2 -translate-y-1/2 text-slate-400" size={24} />
              <input 
                type="text" 
                placeholder={t('ابحث في 1000+ مجال...', 'Search 1000+ topics...')} 
                value={searchTerm} 
                onChange={e => setSearchTerm(e.target.value)}
                className="w-full pr-14 pl-6 py-5 rounded-[2rem] border-2 border-slate-100 bg-white focus:border-indigo-500 outline-none font-bold shadow-sm"
              />
            </div>
          </div>

          {!searchTerm && (
            <div className="flex gap-3 overflow-x-auto pb-6 mb-8 no-scrollbar scroll-smooth">
              <button 
                onClick={() => setActiveGroup(null)} 
                className={`px-8 py-4 rounded-full font-black text-sm whitespace-nowrap border-2 transition-all ${!activeGroup ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}
              >
                {t('جميع الأقسام', 'All Groups')}
              </button>
              {uniqueGroups.map(g => (
                <button 
                  key={g} 
                  onClick={() => setActiveGroup(g)} 
                  className={`px-8 py-4 rounded-full font-black text-sm whitespace-nowrap border-2 transition-all ${activeGroup === g ? 'bg-indigo-600 border-indigo-600 text-white shadow-lg' : 'bg-white border-slate-100 text-slate-400'}`}
                >
                  {g}
                </button>
              ))}
            </div>
          )}

          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-5 max-h-[55vh] overflow-y-auto p-6 bg-white/40 rounded-[3rem] border border-slate-200 custom-scrollbar shadow-inner">
            {filteredCategories.map(cat => {
              const sel = selectedCategories.find(c => c.id === cat.id);
              return (
                <button key={cat.id} onClick={() => toggleCategory(cat)} className={`p-8 rounded-[2.5rem] border-2 transition-all flex flex-col items-center gap-4 text-center ${sel ? 'bg-indigo-600 border-indigo-600 text-white scale-105 shadow-xl' : 'bg-white border-slate-100 text-slate-500 hover:border-slate-300'}`}>
                  <span className="text-4xl">{cat.icon}</span>
                  <div className="flex flex-col gap-1">
                    <p className="font-black text-xs md:text-sm leading-tight">{t(cat.name.ar, cat.name.en)}</p>
                    <p className="text-[10px] opacity-50 uppercase font-bold">{t(cat.group.ar, cat.group.en)}</p>
                  </div>
                </button>
              );
            })}
          </div>

          <div className="mt-14 flex flex-col items-center gap-8">
            <div className="flex flex-wrap items-center justify-center gap-3">
              {selectedCategories.length === 0 ? (
                <p className="text-slate-400 font-bold italic">{t('لم يتم اختيار أي مجال بعد', 'No categories selected yet')}</p>
              ) : (
                selectedCategories.map(c => (
                  <span key={c.id} className="bg-white text-indigo-600 px-5 py-3 rounded-full font-black text-xs border border-indigo-100 flex items-center gap-3 shadow-sm animate-fade-in">
                    {c.icon} {t(c.name.ar, c.name.en)} <XCircle size={16} className="text-red-400 cursor-pointer hover:text-red-600" onClick={() => toggleCategory(c)} />
                  </span>
                ))
              )}
            </div>
            <button onClick={startPlaying} className="px-32 py-7 bg-indigo-600 hover:bg-indigo-700 text-white rounded-full font-black text-3xl shadow-2xl active:scale-95 transition-all">
              {t('بدء المنافسة 🚀', 'Start Trivia 🚀')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'PLAYING') {
    const activeTeam = teams[currentTeamIndex];
    return (
      <div className="min-h-screen pt-24 px-8 pb-12">
        {renderHeader()}
        {renderAlert()}
        
        <div className="max-w-7xl mx-auto flex gap-6 mb-12 overflow-x-auto pb-6 no-scrollbar">
          {teams.map((team, idx) => (
            <div key={team.id} className={`min-w-[280px] flex-1 p-8 rounded-[2.5rem] border-2 transition-all relative ${idx === currentTeamIndex ? 'bg-indigo-600 border-indigo-600 shadow-2xl scale-[1.02]' : 'bg-white border-slate-100 opacity-60 shadow-sm'}`}>
              <h4 className={`text-xs font-black mb-2 flex items-center gap-2 ${idx === currentTeamIndex ? 'text-indigo-200' : 'text-slate-400'}`}>
                <Users size={16} /> {team.name}
              </h4>
              <p className={`text-6xl font-black ${idx === currentTeamIndex ? 'text-white' : team.score < 0 ? 'text-red-500' : 'text-slate-800'}`}>{team.score}</p>
            </div>
          ))}
        </div>

        <div className="max-w-7xl mx-auto grid grid-cols-12 gap-10">
          <div className="col-span-12 lg:col-span-3 space-y-6">
            <div className="bg-white p-10 rounded-[3rem] shadow-xl border border-slate-100">
              <h3 className="text-2xl font-black mb-8 text-indigo-600 flex items-center gap-3">
                <Sparkles size={28} /> {t('مساعدات الفريق', 'Team Powers')}
              </h3>
              <div className="space-y-4">
                {activeTeam.tools.length === 0 ? (
                  <p className="text-slate-300 text-sm font-bold italic text-center">{t('لا توجد مساعدات', 'No powers')}</p>
                ) : (
                  activeTeam.tools.map(tid => {
                    const tool = AVAILABLE_TOOLS.find(at => at.id === tid)!;
                    const used = activeTeam.usedTools.includes(tid);
                    const isActivated = activeTools.includes(tid);
                    return (
                      <div key={tid} className={`p-5 rounded-[1.5rem] border-2 transition-all ${used ? 'opacity-20 grayscale' : (isActivated ? 'bg-indigo-50 border-indigo-400 ring-4 ring-indigo-50' : 'bg-slate-50 border-transparent hover:border-slate-200')}`}>
                        <div className="flex items-center justify-between gap-4">
                          <div className="flex items-center gap-4">
                            <span className="text-3xl">{tool.icon}</span>
                            <div>
                              <p className="font-black text-sm text-slate-700">{t(tool.name.ar, tool.name.en)}</p>
                              <p className="text-[10px] text-slate-400 font-bold uppercase mt-1 leading-none">{t(tool.usageTime === 'before' ? 'قبل السؤال' : 'بعد السؤال', tool.usageTime)}</p>
                            </div>
                          </div>
                          {!used && (
                            <button onClick={() => handleToolUsageToggle(tid)} className={`p-4 rounded-2xl transition-all ${isActivated ? 'bg-red-500 text-white shadow-lg' : 'bg-indigo-600 text-white shadow-md shadow-indigo-100'}`}>
                              {isActivated ? <XCircle size={20} /> : <MousePointer2 size={20} />}
                            </button>
                          )}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
              {activeTools.includes('pit') && (
                <div className="mt-8 pt-8 border-t border-slate-100 animate-fade-in">
                  <p className="text-xs font-black mb-4 text-red-500 uppercase tracking-widest">{t('اختر الخصم:', 'Select Target:')}</p>
                  <div className="grid grid-cols-1 gap-2">
                    {teams.map((team, idx) => idx !== currentTeamIndex && (
                      <button key={team.id} onClick={() => setPitTargetTeam(idx)} className={`p-4 rounded-2xl text-sm font-black border-2 transition-all ${pitTargetTeam === idx ? 'bg-red-500 border-red-500 text-white shadow-lg shadow-red-100' : 'bg-slate-50 border-slate-100 text-slate-400 hover:bg-slate-100'}`}>{team.name}</button>
                    ))}
                  </div>
                </div>
              )}
            </div>
            <button onClick={() => setGameState('SUMMARY')} className="w-full py-5 bg-slate-100 hover:bg-slate-200 text-slate-500 rounded-[1.5rem] font-black text-sm flex items-center justify-center gap-3 transition-all border border-slate-200">🏁 {t('إنهاء المسابقة', 'End Game')}</button>
          </div>

          <div className="col-span-12 lg:col-span-9">
            {!currentQuestion ? (
              <div className="bg-white p-12 rounded-[3.5rem] shadow-xl border border-slate-100 animate-fade-in">
                <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-6">
                  {selectedCategories.map(cat => (
                    <div key={cat.id} className="space-y-6">
                      <div className="bg-slate-50 p-6 rounded-[2rem] text-center border border-slate-100 shadow-sm min-h-[140px] flex flex-col justify-center">
                        <span className="text-4xl block mb-3">{cat.icon}</span>
                        <span className="text-[11px] font-black text-slate-800 uppercase tracking-tight leading-tight">{t(cat.name.ar, cat.name.en)}</span>
                      </div>
                      {VALUES.map(val => {
                        const done = activeTeam.completedCells[cat.name.ar]?.includes(val);
                        const sel = selectedCategory === cat.name.ar && selectedValue === val;
                        return (
                          <button key={val} disabled={done} onClick={() => { setSelectedCategory(cat.name.ar); setSelectedValue(val); }} className={`w-full py-10 rounded-[2.5rem] font-black text-3xl transition-all border-2 ${done ? 'opacity-10 grayscale pointer-events-none' : (sel ? 'bg-amber-500 border-amber-500 text-white scale-105 shadow-2xl z-10' : 'bg-white border-slate-100 text-slate-400 hover:border-indigo-400 hover:text-indigo-600')}`}>{val}</button>
                        );
                      })}
                    </div>
                  ))}
                </div>
                <button disabled={!selectedCategory || !selectedValue || isLoadingQuestion} onClick={fetchQuestion} className="w-full mt-12 py-9 bg-indigo-600 hover:bg-indigo-700 text-white rounded-[2.5rem] font-black text-4xl flex items-center justify-center gap-6 shadow-2xl shadow-indigo-100 active:scale-95 transition-all disabled:opacity-30">
                  {isLoadingQuestion ? <Loader2 className="animate-spin" size={44} /> : t('إظهار السؤال ✨', 'Reveal Question ✨')}
                </button>
              </div>
            ) : (
              <div className="bg-white p-14 rounded-[4rem] shadow-2xl border border-slate-100 animate-fade-in relative overflow-hidden flex flex-col justify-between min-h-[650px]">
                <div className="absolute top-0 left-0 w-full h-2.5 bg-slate-100">
                  <div className={`h-full transition-all duration-1000 ${timeLeft < 10 ? 'bg-red-500 shadow-[0_0_15px_rgba(239,68,68,0.3)]' : 'bg-indigo-600'}`} style={{ width: `${(timeLeft / 40) * 100}%` }} />
                </div>
                <div>
                  <div className="flex justify-between items-center mb-14">
                    <div className="flex flex-wrap gap-3">
                      <span className="bg-indigo-50 px-7 py-3 rounded-full border border-indigo-100 text-indigo-600 font-black text-sm md:text-base">{selectedCategory} | {selectedValue}</span>
                      {activeTools.map(tid => (
                        <span key={tid} className="bg-amber-500 text-white px-5 py-3 rounded-full font-black text-sm shadow-lg animate-bounce flex items-center gap-3">
                          {AVAILABLE_TOOLS.find(at => at.id === tid)?.icon} {t(AVAILABLE_TOOLS.find(at => at.id === tid)?.name.ar!, AVAILABLE_TOOLS.find(at => at.id === tid)?.name.en!)}
                        </span>
                      ))}
                    </div>
                    <div className={`text-5xl font-black flex items-center gap-3 ${timeLeft < 10 ? 'text-red-500 animate-pulse' : 'text-slate-800'}`}><Timer size={48} /> {timeLeft}s</div>
                  </div>
                  <h2 className="text-4xl md:text-5xl lg:text-6xl font-black text-center mb-20 leading-tight text-slate-800 drop-shadow-sm">{currentQuestion.text}</h2>
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-12">
                    {currentQuestion.options.map((opt, idx) => {
                      let cls = "bg-white border-slate-100 hover:bg-slate-50 text-slate-700 shadow-sm";
                      let ico = null;
                      if (isAnswered) {
                        if (idx === currentQuestion.correctAnswer) { cls = "bg-emerald-500 border-emerald-500 text-white scale-105 shadow-xl ring-8 ring-emerald-50"; ico = <CheckCircle2 size={32} />; }
                        else if (selectedOptions.includes(idx)) { cls = "bg-red-500 border-red-500 text-white ring-8 ring-red-50"; ico = <XCircle size={32} />; }
                        else cls = "opacity-20 pointer-events-none";
                      } else if (selectedOptions.includes(idx)) cls = "bg-indigo-50 border-indigo-400 text-indigo-700 shadow-lg";
                      return (
                        <button key={idx} disabled={isAnswered} onClick={() => handleAnswer(idx)} className={`p-10 rounded-[2.5rem] border-2 text-right font-black text-2xl md:text-3xl transition-all flex items-center justify-between gap-6 ${cls}`}><span>{opt}</span>{ico}</button>
                      );
                    })}
                  </div>
                </div>
                {isAnswered && (
                  <div className="pt-10 border-t border-slate-100 animate-fade-in">
                    <div className="bg-slate-50 p-10 rounded-[3rem] mb-10 border border-slate-100 text-slate-500 italic text-xl leading-relaxed text-center shadow-inner">"{currentQuestion.explanation}"</div>
                    <button onClick={nextTurn} className="w-full py-8 bg-emerald-500 hover:bg-emerald-600 text-white rounded-[2rem] font-black text-3xl flex items-center justify-center gap-5 shadow-2xl active:scale-95 transition-all">{t('الفريق التالي', 'Next Team')} <ChevronRight size={44} /></button>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  }

  if (gameState === 'SUMMARY') {
    const sorted = [...teams].sort((a, b) => b.score - a.score);
    return (
      <div className="min-h-screen flex items-center justify-center p-8 bg-slate-50">
        <div className="max-w-3xl w-full bg-white rounded-[5rem] p-20 border border-slate-200 text-center shadow-2xl">
          <div className="p-12 bg-amber-100 inline-block rounded-full mb-12 shadow-2xl border border-amber-200">
            <Trophy size={140} className="text-amber-500 drop-shadow-lg" />
          </div>
          <h2 className="text-7xl font-black mb-16 text-indigo-900 tracking-tighter uppercase">{t('حصاد البطولة', 'The Champions')}</h2>
          <div className="space-y-8 mb-20">
            {sorted.map((team, idx) => (
              <div key={team.id} className={`p-10 rounded-[3rem] flex justify-between items-center border-2 transition-all ${idx === 0 ? 'bg-indigo-600 border-indigo-600 text-white scale-105 shadow-2xl shadow-indigo-200' : 'bg-slate-50 border-slate-100 opacity-70'}`}>
                <div className="flex items-center gap-8">
                  <span className={`w-20 h-20 rounded-full flex items-center justify-center font-black text-3xl ${idx === 0 ? 'bg-amber-500 text-white shadow-lg' : 'bg-slate-200 text-slate-500'}`}>{idx + 1}</span>
                  <span className="text-4xl font-black">{team.name}</span>
                </div>
                <span className={`text-5xl font-black ${team.score < 0 ? (idx === 0 ? 'text-white' : 'text-red-500') : 'text-inherit'}`}>{team.score}</span>
              </div>
            ))}
          </div>
          <button onClick={() => setGameState('START')} className="w-full py-8 bg-slate-800 text-white rounded-[2.5rem] font-black text-3xl flex items-center justify-center gap-6 hover:bg-slate-900 transition-all shadow-2xl active:scale-95"><RotateCcw size={40} /> {t('جولة جديدة', 'New Grand Game')}</button>
        </div>
      </div>
    );
  }

  return null;
};

export default App;
