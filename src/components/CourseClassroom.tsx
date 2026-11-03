import { useState, useEffect, useRef } from 'react';
import {
  Play,
  CheckCircle2,
  Lock,
  Clock,
  BookOpen,
  FileText,
  Headphones,
  Download,
  HelpCircle,
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Sparkles,
  AlertCircle,
  Check,
} from 'lucide-react';

interface TimelineData {
  id: string;
  label?: string;
  suggestedDuration?: string;
  startOffsetDays?: number;
  releaseMode?: string;
  estimatedStudyTimeMinutes?: number;
}

interface QuizQuestion {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_text';
  questionText: string;
  imageUrl?: string;
  points: number;
  position: number;
  options: Array<{ id: string; optionText: string; position: number }>;
}

interface QuizContext {
  id: string;
  moduleId: string;
  title: string;
  instructions: string;
  isRequired: boolean;
  passingPercent: number;
  timeLimitMinutes: number;
  attemptsAllowed: number;
  attemptNumber: number;
  questions: QuizQuestion[];
  savedAnswers: Record<string, any>;
  alreadyPassed: boolean;
}

interface LessonItem {
  id: string;
  title: string;
  description?: string;
  type: 'video' | 'audio' | 'article' | 'resource';
  duration: string;
  durationSeconds?: number;
  position: number;
  isFreePreview?: boolean;
  isRequired?: boolean;
  completed: boolean;
  lastPosition?: number;
  secondsWatched?: number;
  locked?: boolean;
}

interface ModuleItem {
  id: string;
  title: string;
  description?: string;
  objectives?: string[];
  position: number;
  status: 'not_started' | 'in_progress' | 'completed' | 'locked';
  lockReason?: string;
  percent: number;
  timeline?: TimelineData;
  lessons: LessonItem[];
  quiz?: {
    id: string;
    title: string;
    instructions?: string;
    isRequired: boolean;
    passingPercent: number;
    timeLimitMinutes: number;
    questionCount: number;
    passed: boolean;
    locked?: boolean;
  };
}

interface ClassroomProps {
  courseId: string;
  onBackToDashboard: () => void;
}

export default function CourseClassroom({ courseId, onBackToDashboard }: ClassroomProps) {
  const [courseData, setCourseData] = useState<any>(null);
  const [modules, setModules] = useState<ModuleItem[]>([]);
  const [progressSummary, setProgressSummary] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active item in classroom: lesson or quiz
  const [activeLessonId, setActiveLessonId] = useState<string | null>(null);
  const [activeLessonContent, setActiveLessonContent] = useState<any>(null);

  // Quiz mode state
  const [activeQuizModuleId, setActiveQuizModuleId] = useState<string | null>(null);
  const [quizContext, setQuizContext] = useState<QuizContext | null>(null);
  const [quizAnswers, setQuizAnswers] = useState<Record<string, any>>({});
  const [quizTimerSeconds, setQuizTimerSeconds] = useState<number | null>(null);
  const [submittingQuiz, setSubmittingQuiz] = useState(false);
  const [quizResult, setQuizResult] = useState<any>(null);

  // Video / Audio player state
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [playbackSeconds, setPlaybackSeconds] = useState(0);

  // Accordion state
  const [expandedModules, setExpandedModules] = useState<Record<string, boolean>>({});

  // 1. Fetch full learning context
  const fetchClassroom = async () => {
    try {
      const token = localStorage.getItem('student_token') || localStorage.getItem('token');
      const res = await fetch(`/api/courses/${courseId}/learn`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setCourseData(data.course);
        setModules(data.modules || []);
        setProgressSummary(data.progress || null);

        // Auto-expand all modules
        const expanded: Record<string, boolean> = {};
        data.modules?.forEach((m: any) => {
          expanded[m.id] = true;
        });
        setExpandedModules(expanded);

        // Select initial lesson if none selected
        if (!activeLessonId && !activeQuizModuleId) {
          const firstUnlockedLesson = data.modules
            ?.find((m: any) => m.status !== 'locked')
            ?.lessons?.find((l: any) => !l.locked);
          if (firstUnlockedLesson) {
            selectLesson(firstUnlockedLesson.id);
          }
        }
      } else {
        setError(data.message || 'Failed to load classroom.');
      }
    } catch (err: any) {
      setError('Network error loading classroom.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchClassroom();
  }, [courseId]);

  // Live reflection: refetch on window focus
  useEffect(() => {
    const handleFocus = () => {
      fetchClassroom();
    };
    window.addEventListener('focus', handleFocus);
    return () => window.removeEventListener('focus', handleFocus);
  }, [courseId]);

  // 2. Select Lesson
  const selectLesson = async (lessonId: string) => {
    setActiveQuizModuleId(null);
    setQuizContext(null);
    setQuizResult(null);
    setActiveLessonId(lessonId);

    try {
      const token = localStorage.getItem('student_token') || localStorage.getItem('token');
      const res = await fetch(`/api/courses/${courseId}/lessons/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success && data.lesson) {
        setActiveLessonContent(data.lesson);
        setPlaybackSeconds(data.lesson.lastPosition || 0);

        // If media player exists, resume from last position
        setTimeout(() => {
          if (videoRef.current && data.lesson.lastPosition) {
            videoRef.current.currentTime = data.lesson.lastPosition;
          }
          if (audioRef.current && data.lesson.lastPosition) {
            audioRef.current.currentTime = data.lesson.lastPosition;
          }
        }, 150);
      }
    } catch {
      console.warn('Failed to load lesson content');
    }
  };

  // 3. Save progress on interval (PDF Section 7.1: saves position every 10-15s, on pause, page leave)
  const saveLessonProgress = async (currentSec: number, markComplete: boolean = false) => {
    if (!activeLessonId) return;
    try {
      const token = localStorage.getItem('student_token') || localStorage.getItem('token');
      const res = await fetch(`/api/courses/${courseId}/lessons/${activeLessonId}/progress`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          secondsWatched: Math.round(currentSec),
          lastPosition: Math.round(currentSec),
          markCompleted: markComplete,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        if (data.courseProgress) {
          setProgressSummary(data.courseProgress);
        }
        // Update local lesson status
        setModules((prev) =>
          prev.map((mod) => ({
            ...mod,
            lessons: mod.lessons.map((l) =>
              l.id === activeLessonId
                ? {
                    ...l,
                    completed: data.lessonProgress?.completed || l.completed,
                    secondsWatched: data.lessonProgress?.secondsWatched || l.secondsWatched,
                  }
                : l
            ),
          }))
        );
      }
    } catch {
      // Background auto-save fails gracefully
    }
  };

  // Interval timer for playback position auto-save
  useEffect(() => {
    if (!isPlaying) return;
    const interval = setInterval(() => {
      const current = videoRef.current ? videoRef.current.currentTime : audioRef.current ? audioRef.current.currentTime : 0;
      if (current > 0) {
        setPlaybackSeconds(current);
        saveLessonProgress(current, false);
      }
    }, 10000); // Every 10 seconds (Section 7.1)
    return () => clearInterval(interval);
  }, [isPlaying, activeLessonId]);

  // Video timeupdate check for 90% watched (Section 7.1 & 4.1)
  const handleVideoTimeUpdate = () => {
    if (!videoRef.current || !activeLessonContent) return;
    const current = videoRef.current.currentTime;
    const duration = videoRef.current.duration || activeLessonContent.durationSeconds || 900;
    setPlaybackSeconds(current);

    if (duration > 0 && current / duration >= 0.9 && !activeLessonContent.completed) {
      activeLessonContent.completed = true;
      saveLessonProgress(current, true);
    }
  };

  // 4. Start Quiz Attempt (Section 6.3)
  const startQuiz = async (moduleId: string) => {
    setActiveLessonId(null);
    setActiveLessonContent(null);
    setActiveQuizModuleId(moduleId);
    setQuizResult(null);

    try {
      const token = localStorage.getItem('student_token') || localStorage.getItem('token');
      const res = await fetch(`/api/courses/${courseId}/modules/${moduleId}/quiz`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success && data.quiz) {
        setQuizContext(data.quiz);
        setQuizAnswers(data.quiz.savedAnswers || {});

        if (data.quiz.timeLimitMinutes > 0) {
          setQuizTimerSeconds(data.quiz.timeLimitMinutes * 60);
        } else {
          setQuizTimerSeconds(null);
        }
      } else {
        alert(data.message || 'Quiz could not be loaded.');
      }
    } catch {
      alert('Network error loading quiz.');
    }
  };

  // Quiz Countdown Timer
  useEffect(() => {
    if (quizTimerSeconds === null || quizTimerSeconds <= 0 || quizResult) return;
    const timer = setInterval(() => {
      setQuizTimerSeconds((prev) => {
        if (prev !== null && prev <= 1) {
          clearInterval(timer);
          handleSubmitQuiz();
          return 0;
        }
        return prev !== null ? prev - 1 : null;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [quizTimerSeconds, quizResult]);

  // Auto-save quiz answers (Section 6.3)
  const handleOptionSelect = async (questionId: string, answer: any) => {
    const updated = { ...quizAnswers, [questionId]: answer };
    setQuizAnswers(updated);

    if (activeQuizModuleId) {
      try {
        const token = localStorage.getItem('student_token') || localStorage.getItem('token');
        await fetch(`/api/courses/${courseId}/modules/${activeQuizModuleId}/quiz/save-answer`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ questionId, answer }),
        });
      } catch {
        // quiet auto-save
      }
    }
  };

  // Submit Quiz for server-side grading (Section 6.3)
  const handleSubmitQuiz = async () => {
    if (!activeQuizModuleId || submittingQuiz) return;
    setSubmittingQuiz(true);

    try {
      const token = localStorage.getItem('student_token') || localStorage.getItem('token');
      const res = await fetch(`/api/courses/${courseId}/modules/${activeQuizModuleId}/quiz/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ answers: quizAnswers, timeTakenSeconds: 60 }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setQuizResult(data.result);
        if (data.courseProgress) {
          setProgressSummary(data.courseProgress);
        }
        // Refresh modules to update lock status
        fetchClassroom();
      } else {
        alert(data.message || 'Failed to grade quiz.');
      }
    } catch {
      alert('Error submitting quiz.');
    } finally {
      setSubmittingQuiz(false);
    }
  };

  if (loading) {
    return (
      <div className="flex-1 min-h-[600px] flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="size-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <span className="text-sm">Entering Classroom...</span>
      </div>
    );
  }

  if (error || !courseData) {
    return (
      <div className="flex-1 max-w-2xl mx-auto py-20 px-4 text-center">
        <AlertCircle className="size-12 text-rose-500 mx-auto mb-3" />
        <h2 className="text-xl font-bold text-slate-900 dark:text-white mb-2">Classroom Access Error</h2>
        <p className="text-slate-500 text-sm mb-6">{error || 'Could not verify student access.'}</p>
        <button
          onClick={onBackToDashboard}
          className="px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-700 transition"
        >
          Return to Dashboard
        </button>
      </div>
    );
  }

  const percent = progressSummary?.percent || 0;

  return (
    <div className="flex-1 bg-[#0b0f19] text-white flex flex-col min-h-screen">
      {/* 1. TOP HEADER WITH TIMELINE STRIP (PDF Section 5.3 & 7.4) */}
      <div className="border-b border-slate-800 bg-[#0e1322] px-4 sm:px-6 py-4 flex flex-col gap-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <button
              onClick={onBackToDashboard}
              className="p-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 hover:text-white transition cursor-pointer"
              title="Back to Dashboard"
            >
              <ArrowLeft className="size-4" />
            </button>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                  Classroom
                </span>
                <span className="text-xs text-slate-400">v{courseData.contentVersion || 1}</span>
              </div>
              <h1 className="text-base sm:text-lg font-extrabold text-white line-clamp-1">
                {courseData.title}
              </h1>
            </div>
          </div>

          {/* Course Progress Summary Widget (Section 7.3 & 7.4) */}
          <div className="flex items-center gap-4">
            {/* Gentle Pace Indicator (Section 5.3) */}
            <span
              className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold ${
                progressSummary?.paceIndicator === 'on_track'
                  ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                  : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
              }`}
            >
              <Sparkles className="size-3.5" />
              <span>{progressSummary?.paceIndicator === 'on_track' ? 'On Track' : 'Behind Pace'}</span>
            </span>

            {/* Circular Progress (Section 7.4) */}
            <div className="flex items-center gap-2.5">
              <div className="relative size-10">
                <svg className="size-full -rotate-90" viewBox="0 0 36 36">
                  <path
                    className="text-slate-800"
                    strokeWidth="3.5"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                  <path
                    className="text-indigo-500 transition-all duration-500"
                    strokeDasharray={`${percent}, 100`}
                    strokeWidth="3.5"
                    strokeLinecap="round"
                    stroke="currentColor"
                    fill="none"
                    d="M18 2.0845 a 15.9155 15.9155 0 0 1 0 31.831 a 15.9155 15.9155 0 0 1 0 -31.831"
                  />
                </svg>
                <span className="absolute inset-0 flex items-center justify-center text-[10px] font-extrabold text-white">
                  {percent}%
                </span>
              </div>
              <div className="hidden md:flex flex-col text-[11px] text-slate-400">
                <span className="font-bold text-white">
                  {progressSummary?.completedLessons || 0} / {progressSummary?.totalLessons || 0} Lessons
                </span>
                <span>{progressSummary?.timeRemainingFormatted || '0 min'} left</span>
              </div>
            </div>
          </div>
        </div>

        {/* Course Timeline Strip (PDF Section 5.3) */}
        <div className="flex items-center gap-3 overflow-x-auto pb-1 scrollbar-none border-t border-slate-800/60 pt-3">
          {modules.map((m, idx) => {
            const isCompleted = m.status === 'completed';
            const isLocked = m.status === 'locked';
            const isInProgress = m.status === 'in_progress';

            return (
              <div
                key={m.id}
                className={`flex items-center gap-2 px-3 py-1.5 rounded-xl border text-xs font-semibold shrink-0 transition ${
                  isCompleted
                    ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-300'
                    : isInProgress
                    ? 'bg-indigo-950/60 border-indigo-500/50 text-indigo-200'
                    : isLocked
                    ? 'bg-slate-900 border-slate-800 text-slate-500'
                    : 'bg-slate-900/60 border-slate-800 text-slate-400'
                }`}
              >
                <span className="font-extrabold text-[10px] uppercase text-slate-400">
                  {m.timeline?.label || `M${idx + 1}`}
                </span>
                <span className="max-w-[140px] truncate">{m.title}</span>
                {isCompleted ? (
                  <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                ) : isLocked ? (
                  <Lock className="size-3 text-slate-500 shrink-0" />
                ) : (
                  <span className="text-[10px] font-bold text-indigo-400">{m.percent}%</span>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* 2. MAIN LEARNING AREA & SIDEBAR */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 overflow-hidden">
        {/* CENTER COLUMN: Lesson Player / Quiz Area */}
        <div className="lg:col-span-8 p-4 sm:p-6 lg:p-8 flex flex-col gap-6 overflow-y-auto max-h-[calc(100vh-140px)]">
          {activeQuizModuleId && quizContext ? (
            /* MODULE QUIZ ATTEMPT VIEW (PDF Section 6.3) */
            <div className="bg-[#121829] border border-slate-800 rounded-2xl p-6 sm:p-8 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-slate-800 pb-5">
                <div>
                  <span className="text-xs font-bold text-purple-400 uppercase tracking-wider block">
                    Module Assessment (Attempt #{quizContext.attemptNumber})
                  </span>
                  <h2 className="text-xl sm:text-2xl font-extrabold text-white mt-1">
                    {quizContext.title}
                  </h2>
                  <p className="text-xs sm:text-sm text-slate-400 mt-1">
                    {quizContext.instructions || 'Passing score is 70%. Answers auto-save as you go.'}
                  </p>
                </div>

                {/* Quiz Countdown Timer if limit set */}
                {quizTimerSeconds !== null && !quizResult && (
                  <div className="px-4 py-2 bg-purple-950/60 border border-purple-500/40 rounded-xl flex items-center gap-2 text-purple-300 font-mono font-bold text-sm shrink-0">
                    <Clock className="size-4 text-purple-400" />
                    <span>
                      {Math.floor(quizTimerSeconds / 60)}:
                      {(quizTimerSeconds % 60).toString().padStart(2, '0')}
                    </span>
                  </div>
                )}
              </div>

              {quizResult ? (
                /* QUIZ RESULT SCREEN (PDF Section 6.3) */
                <div className="flex flex-col gap-6">
                  <div
                    className={`p-6 rounded-2xl border flex flex-col items-center text-center gap-3 ${
                      quizResult.passed
                        ? 'bg-emerald-950/40 border-emerald-500/40 text-emerald-200'
                        : 'bg-rose-950/40 border-rose-500/40 text-rose-200'
                    }`}
                  >
                    {quizResult.passed ? (
                      <CheckCircle2 className="size-12 text-emerald-400" />
                    ) : (
                      <AlertCircle className="size-12 text-rose-400" />
                    )}
                    <div>
                      <h3 className="text-2xl font-extrabold text-white">
                        {quizResult.passed ? 'Assessment Passed!' : 'Assessment Failed'}
                      </h3>
                      <p className="text-sm mt-1">
                        You scored <strong className="text-white text-base">{quizResult.scorePercent}%</strong> (Passing requirement: {quizResult.passingPercent}%)
                      </p>
                      {quizResult.passed && (
                        <p className="text-xs text-emerald-300 mt-1 font-semibold">
                          🎉 Module marked as complete! The next module is now unlocked.
                        </p>
                      )}
                    </div>
                  </div>

                  {/* Review breakdown if allowed */}
                  {quizResult.review && (
                    <div className="flex flex-col gap-4">
                      <h4 className="font-extrabold text-sm text-white">Question Review & Explanations:</h4>
                      {quizResult.review.map((item: any, qIdx: number) => (
                        <div
                          key={item.questionId}
                          className="p-4 rounded-xl border border-slate-800 bg-[#0e1322] flex flex-col gap-2 text-xs"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-bold text-white">
                              {qIdx + 1}. {item.questionText}
                            </span>
                            <span
                              className={`font-bold px-2 py-0.5 rounded ${
                                item.isCorrect ? 'bg-emerald-500/20 text-emerald-400' : 'bg-rose-500/20 text-rose-400'
                              }`}
                            >
                              {item.isCorrect ? 'Correct (+1 pt)' : 'Incorrect (0 pt)'}
                            </span>
                          </div>
                          {item.explanation && (
                            <p className="text-slate-400 italic bg-slate-900/80 p-2.5 rounded-lg border border-slate-800">
                              💡 <strong>Explanation:</strong> {item.explanation}
                            </p>
                          )}
                        </div>
                      ))}
                    </div>
                  )}

                  <button
                    onClick={() => {
                      // Return to next lesson
                      const nextMod = modules[modules.findIndex((m) => m.id === activeQuizModuleId) + 1];
                      if (nextMod && nextMod.lessons[0]) {
                        selectLesson(nextMod.lessons[0].id);
                      } else {
                        onBackToDashboard();
                      }
                    }}
                    className="py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl font-bold text-sm transition"
                  >
                    Continue to Next Module
                  </button>
                </div>
              ) : (
                /* QUIZ QUESTIONS FORM */
                <div className="flex flex-col gap-8">
                  {quizContext.questions.map((q, idx) => {
                    const currentSelection = quizAnswers[q.id];

                    return (
                      <div key={q.id} className="flex flex-col gap-3">
                        <div className="flex items-start justify-between gap-4">
                          <h4 className="font-bold text-sm sm:text-base text-white">
                            <span className="text-purple-400 mr-2">Q{idx + 1}.</span>
                            {q.questionText}
                          </h4>
                          <span className="text-[11px] text-slate-400 shrink-0 font-semibold">
                            {q.points} pt{q.points > 1 ? 's' : ''}
                          </span>
                        </div>

                        {q.imageUrl && (
                          <img
                            src={q.imageUrl}
                            alt="Question diagram"
                            className="max-h-60 rounded-xl object-contain border border-slate-800"
                          />
                        )}

                        {q.type === 'short_text' ? (
                          <input
                            type="text"
                            placeholder="Type your answer here..."
                            value={currentSelection || ''}
                            onChange={(e) => handleOptionSelect(q.id, e.target.value)}
                            className="bg-[#0e1322] border border-slate-700 rounded-xl px-4 py-3 text-sm text-white focus:outline-none focus:border-purple-500"
                          />
                        ) : (
                          <div className="flex flex-col gap-2">
                            {q.options.map((opt) => {
                              const isSelected =
                                q.type === 'multiple_choice'
                                  ? Array.isArray(currentSelection) && currentSelection.includes(opt.id)
                                  : currentSelection === opt.id;

                              return (
                                <button
                                  key={opt.id}
                                  onClick={() => {
                                    if (q.type === 'multiple_choice') {
                                      const arr = Array.isArray(currentSelection) ? [...currentSelection] : [];
                                      const next = arr.includes(opt.id)
                                        ? arr.filter((x) => x !== opt.id)
                                        : [...arr, opt.id];
                                      handleOptionSelect(q.id, next);
                                    } else {
                                      handleOptionSelect(q.id, opt.id);
                                    }
                                  }}
                                  className={`p-3.5 rounded-xl border text-left text-xs sm:text-sm font-medium transition flex items-center justify-between cursor-pointer ${
                                    isSelected
                                      ? 'bg-purple-950/60 border-purple-500 text-white shadow-xs'
                                      : 'bg-[#0e1322] border-slate-800 hover:border-slate-700 text-slate-300'
                                  }`}
                                >
                                  <span>{opt.optionText}</span>
                                  <div
                                    className={`size-4 rounded-full border flex items-center justify-center shrink-0 ${
                                      isSelected
                                        ? 'bg-purple-600 border-purple-500 text-white'
                                        : 'border-slate-600'
                                    }`}
                                  >
                                    {isSelected && <Check className="size-2.5 stroke-[3]" />}
                                  </div>
                                </button>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  })}

                  <div className="border-t border-slate-800 pt-5 flex items-center justify-between">
                    <span className="text-xs text-slate-400">
                      Answered {Object.keys(quizAnswers).length} of {quizContext.questions.length} questions
                    </span>
                    <button
                      onClick={handleSubmitQuiz}
                      disabled={submittingQuiz}
                      className="px-6 py-3 bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white rounded-xl font-bold text-sm transition cursor-pointer shadow-lg shadow-purple-600/30"
                    >
                      {submittingQuiz ? 'Grading on Server...' : 'Submit Assessment'}
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : activeLessonContent ? (
            /* LESSON VIEW (VIDEO / AUDIO / ARTICLE / RESOURCE) */
            <div className="flex flex-col gap-6">
              {/* Media Player Box */}
              {activeLessonContent.type === 'video' ? (
                <div className="relative rounded-2xl overflow-hidden aspect-video bg-black border border-slate-800 shadow-2xl">
                  <video
                    ref={videoRef}
                    src={activeLessonContent.videoUrl || activeLessonContent.mediaUrl}
                    controls
                    className="w-full h-full object-contain"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => {
                      setIsPlaying(false);
                      if (videoRef.current) saveLessonProgress(videoRef.current.currentTime, false);
                    }}
                    onTimeUpdate={handleVideoTimeUpdate}
                  />
                </div>
              ) : activeLessonContent.type === 'audio' ? (
                <div className="p-8 rounded-2xl bg-[#121829] border border-slate-800 flex flex-col items-center justify-center gap-4 text-center">
                  <div className="size-16 rounded-full bg-purple-500/20 text-purple-400 flex items-center justify-center border border-purple-500/30">
                    <Headphones className="size-8" />
                  </div>
                  <div>
                    <h3 className="font-extrabold text-lg text-white">{activeLessonContent.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">Audio Masterclass Lecture</p>
                  </div>
                  <audio
                    ref={audioRef}
                    src={activeLessonContent.mediaUrl || activeLessonContent.videoUrl}
                    controls
                    className="w-full max-w-md mt-2"
                    onPlay={() => setIsPlaying(true)}
                    onPause={() => {
                      setIsPlaying(false);
                      if (audioRef.current) saveLessonProgress(audioRef.current.currentTime, false);
                    }}
                    onTimeUpdate={() => {
                      if (audioRef.current) {
                        const cur = audioRef.current.currentTime;
                        const dur = audioRef.current.duration || 900;
                        if (dur > 0 && cur / dur >= 0.9 && !activeLessonContent.completed) {
                          activeLessonContent.completed = true;
                          saveLessonProgress(cur, true);
                        }
                      }
                    }}
                  />
                </div>
              ) : activeLessonContent.type === 'article' ? (
                /* Rich Article Viewer */
                <div className="p-6 sm:p-10 rounded-2xl bg-[#121829] border border-slate-800 flex flex-col gap-6">
                  <div className="flex items-center gap-2 text-amber-400 font-bold text-xs uppercase tracking-wider">
                    <FileText className="size-4" />
                    <span>Article Lesson</span>
                  </div>
                  <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
                    {activeLessonContent.title}
                  </h2>
                  <div className="prose prose-invert max-w-none text-slate-300 text-sm sm:text-base leading-relaxed whitespace-pre-line border-t border-slate-800 pt-6">
                    {activeLessonContent.articleBody || 'Article contents loaded directly from database.'}
                  </div>
                </div>
              ) : (
                /* Resource Download Lesson */
                <div className="p-8 rounded-2xl bg-[#121829] border border-slate-800 flex flex-col gap-6">
                  <div className="flex items-center gap-2 text-blue-400 font-bold text-xs uppercase tracking-wider">
                    <Download className="size-4" />
                    <span>Downloadable Resources</span>
                  </div>
                  <h2 className="text-2xl font-extrabold text-white">{activeLessonContent.title}</h2>
                  <p className="text-sm text-slate-400">
                    {activeLessonContent.description || 'Download module attachments, project starters, and templates.'}
                  </p>

                  <div className="flex flex-col gap-2 mt-2">
                    {(activeLessonContent.resources && activeLessonContent.resources.length > 0
                      ? activeLessonContent.resources
                      : [{ name: 'Project_Assets_Bundle.zip', url: '#', size: '12 MB' }]
                    ).map((r: any, idx: number) => (
                      <div
                        key={idx}
                        className="p-4 rounded-xl bg-[#0e1322] border border-slate-800 flex items-center justify-between"
                      >
                        <div className="flex items-center gap-3">
                          <Download className="size-5 text-indigo-400" />
                          <div>
                            <p className="font-bold text-xs sm:text-sm text-white">{r.name}</p>
                            <span className="text-[10px] text-slate-400">{r.size || 'Downloadable attachment'}</span>
                          </div>
                        </div>
                        <a
                          href={r.url}
                          target="_blank"
                          rel="noreferrer"
                          onClick={() => saveLessonProgress(0, true)}
                          className="px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold transition"
                        >
                          Download
                        </a>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Lesson Actions & Mark as Complete */}
              <div className="p-5 rounded-xl bg-[#121829] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h3 className="font-extrabold text-base text-white">{activeLessonContent.title}</h3>
                  <p className="text-xs text-slate-400 mt-0.5">
                    {activeLessonContent.moduleTitle} · {activeLessonContent.duration}
                  </p>
                </div>

                <div className="flex items-center gap-3">
                  <button
                    onClick={() => saveLessonProgress(playbackSeconds, true)}
                    className={`px-4 py-2.5 rounded-xl font-bold text-xs transition flex items-center gap-2 cursor-pointer ${
                      activeLessonContent.completed
                        ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                        : 'bg-indigo-600 hover:bg-indigo-700 text-white shadow-xs'
                    }`}
                  >
                    <CheckCircle2 className="size-4" />
                    <span>{activeLessonContent.completed ? 'Completed' : 'Mark as Completed'}</span>
                  </button>
                </div>
              </div>
            </div>
          ) : (
            <div className="py-20 text-center text-slate-400">
              <BookOpen className="size-10 mx-auto mb-2 opacity-50" />
              <p>Select a lesson from the curriculum sidebar to begin.</p>
            </div>
          )}
        </div>

        {/* RIGHT COLUMN: Curriculum Navigation Sidebar (Section 7.4) */}
        <div className="lg:col-span-4 border-l border-slate-800 bg-[#0e1322] flex flex-col overflow-y-auto max-h-[calc(100vh-140px)]">
          <div className="p-4 border-b border-slate-800 sticky top-0 bg-[#0e1322] z-10 flex items-center justify-between">
            <h3 className="font-extrabold text-sm text-white">Course Curriculum</h3>
            <span className="text-xs text-slate-400">{modules.length} modules</span>
          </div>

          <div className="divide-y divide-slate-800/80">
            {modules.map((m, mIdx) => {
              const isOpen = expandedModules[m.id] !== false;
              const isLocked = m.status === 'locked';

              return (
                <div key={m.id} className="flex flex-col">
                  {/* Module header accordion */}
                  <button
                    onClick={() => setExpandedModules((prev) => ({ ...prev, [m.id]: !prev[m.id] }))}
                    className="p-4 flex items-center justify-between text-left hover:bg-slate-850 transition cursor-pointer"
                  >
                    <div className="flex items-center gap-2.5">
                      {isOpen ? (
                        <ChevronUp className="size-4 text-slate-500 shrink-0" />
                      ) : (
                        <ChevronDown className="size-4 text-slate-500 shrink-0" />
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <span className="text-[10px] font-bold text-slate-400 uppercase">
                            {m.timeline?.label || `Module ${mIdx + 1}`}
                          </span>
                          {isLocked && <Lock className="size-3 text-slate-500" />}
                        </div>
                        <h4 className="font-bold text-xs sm:text-sm text-white line-clamp-1">{m.title}</h4>
                      </div>
                    </div>

                    <span className="text-xs font-bold text-indigo-400">{m.percent}%</span>
                  </button>

                  {/* Lessons list */}
                  {isOpen && (
                    <div className="divide-y divide-slate-800/40 bg-[#0a0e19]">
                      {m.lessons.map((lesson, lIdx) => {
                        const isSelected = activeLessonId === lesson.id;
                        return (
                          <button
                            key={lesson.id}
                            disabled={isLocked}
                            onClick={() => selectLesson(lesson.id)}
                            className={`w-full px-5 py-3 flex items-center justify-between text-left text-xs transition cursor-pointer ${
                              isSelected
                                ? 'bg-indigo-950/70 text-white font-bold border-l-2 border-indigo-500'
                                : 'hover:bg-slate-800/40 text-slate-300'
                            }`}
                          >
                            <div className="flex items-center gap-2.5 overflow-hidden">
                              {lesson.completed ? (
                                <CheckCircle2 className="size-3.5 text-emerald-400 shrink-0" />
                              ) : isLocked ? (
                                <Lock className="size-3.5 text-slate-600 shrink-0" />
                              ) : lesson.type === 'article' ? (
                                <FileText className="size-3.5 text-amber-400 shrink-0" />
                              ) : (
                                <Play className="size-3.5 text-indigo-400 shrink-0" />
                              )}
                              <span className="truncate">
                                {lIdx + 1}. {lesson.title}
                              </span>
                            </div>
                            <span className="text-[11px] text-slate-500 shrink-0">{lesson.duration}</span>
                          </button>
                        );
                      })}

                      {/* Module Quiz item in sidebar */}
                      {m.quiz && (
                        <button
                          disabled={isLocked}
                          onClick={() => startQuiz(m.id)}
                          className={`w-full px-5 py-3 flex items-center justify-between text-left text-xs transition cursor-pointer ${
                            activeQuizModuleId === m.id
                              ? 'bg-purple-950/80 text-white font-bold border-l-2 border-purple-500'
                              : 'hover:bg-purple-950/30 text-purple-300'
                          }`}
                        >
                          <div className="flex items-center gap-2.5 truncate">
                            <HelpCircle className="size-3.5 text-purple-400 shrink-0" />
                            <span className="truncate">{m.quiz.title}</span>
                          </div>
                          {m.quiz.passed ? (
                            <span className="text-[10px] font-bold text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded">
                              Passed
                            </span>
                          ) : (
                            <span className="text-[10px] text-purple-400 bg-purple-950/60 px-2 py-0.5 rounded">
                              Quiz
                            </span>
                          )}
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
