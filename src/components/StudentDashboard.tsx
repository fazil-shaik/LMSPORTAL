import { useState, useEffect, useCallback } from 'react';
import {
  BookOpen,
  Lock,
  Play,
  Search,
  Sparkles,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  X,
  ChevronDown,
  ExternalLink,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export interface DashboardCourse {
  id: string;
  slug: string;
  title: string;
  description: string;
  instructor: string;
  instructorTitle: string;
  thumbnail: string;
  priceCents: number;
  currency: string;
  category: string;
  level: string;
  durationHours: number;
  totalDuration: string;
  lessonCount: number;
  rating: number;
  reviewCount: number;
  series: string;
  tagline: string;
  badge?: string;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  isEnrolled: boolean;
  progress: {
    completedLessons: number;
    totalLessons: number;
    percent: number;
    isCompleted: boolean;
    lastOpenedLessonNumber: number;
    lastOpenedLessonTitle: string;
  };
  lessons: Array<{ id: string; title: string; lessonNumber: number; duration: string }>;
}

export interface DashboardStats {
  enrolledCount: number;
  completedLessonsCount: number;
  learningTimeFormatted: string;
  certificatesCount: number;
}

export interface ContinueLearningData {
  courseId: string;
  courseTitle: string;
  series: string;
  tagline: string;
  lessonNumber: number;
  lessonTitle: string;
  completedLessons: number;
  totalLessons: number;
  percent: number;
  remainingTime: string;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
}

interface StudentDashboardProps {
  onBackToExplore?: () => void;
}

export default function StudentDashboard({ onBackToExplore }: StudentDashboardProps) {
  const { user, openAuthModal, enrollInCourse } = useAuth();

  // Tab state: 'all' | 'my-courses' | 'completed' (FR-16), initialized from URL query
  const [activeTab, setActiveTab] = useState<'all' | 'my-courses' | 'completed'>(() => {
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam === 'my-courses' || tabParam === 'completed') return tabParam;
    return 'all';
  });

  const handleTabChange = (tab: 'all' | 'my-courses' | 'completed') => {
    setActiveTab(tab);
    const url = new URL(window.location.href);
    if (tab === 'all') {
      url.searchParams.delete('tab');
    } else {
      url.searchParams.set('tab', tab);
    }
    window.history.replaceState({}, '', url.pathname + url.search);
  };

  // Search & Filters state (FR-17)
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState('all');
  const [selectedLevel, setSelectedLevel] = useState('all');
  const [selectedDuration, setSelectedDuration] = useState('all');
  const [selectedSort, setSelectedSort] = useState<'newest' | 'rating' | 'lessons'>('newest');

  // Data states from backend
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    enrolledCount: 0,
    completedLessonsCount: 0,
    learningTimeFormatted: '0m',
    certificatesCount: 0,
  });
  const [continueLearning, setContinueLearning] = useState<ContinueLearningData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Lesson player interactive preview modal state
  const [activeLessonModal, setActiveLessonModal] = useState<{
    course: DashboardCourse;
    lessonNumber: number;
    lessonTitle: string;
  } | null>(null);
  const [updatingProgress, setUpdatingProgress] = useState(false);

  // Fetch Dashboard data from backend API
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);
      const params = new URLSearchParams({
        tab: activeTab,
        search: searchQuery,
        category: selectedCategory,
        level: selectedLevel,
        duration: selectedDuration,
        sort: selectedSort,
      });

      const res = await fetch(`/api/courses/dashboard?${params.toString()}`, {
        credentials: 'include',
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          setCourses(data.courses || []);
          if (data.stats) setStats(data.stats);
          setContinueLearning(data.continueLearning || null);
        } else {
          setError(data.message || 'Failed to load courses');
        }
      } else {
        if (res.status === 401) {
          openAuthModal('signin');
        }
        setError('Failed to fetch dashboard data.');
      }
    } catch (err: any) {
      console.error('Error fetching dashboard:', err);
      setError('Could not connect to the backend API.');
    } finally {
      setLoading(false);
    }
  }, [activeTab, searchQuery, selectedCategory, selectedLevel, selectedDuration, selectedSort, openAuthModal]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Handle Unlocking / Enrolling into a locked course (FR-15)
  const handleEnroll = async (courseId: string) => {
    if (!user) {
      openAuthModal('signin');
      return;
    }
    const result = await enrollInCourse(courseId);
    if (result.success) {
      fetchDashboardData();
    }
  };

  // Mark Lesson as Completed in backend
  const handleCompleteLesson = async () => {
    if (!activeLessonModal) return;
    try {
      setUpdatingProgress(true);
      const res = await fetch(`/api/courses/${activeLessonModal.course.id}/progress`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        credentials: 'include',
        body: JSON.stringify({
          lessonNumber: activeLessonModal.lessonNumber,
          lessonTitle: activeLessonModal.lessonTitle,
          markCompleted: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        // Advance to next lesson if available
        const nextNum = activeLessonModal.lessonNumber + 1;
        const nextLesson = activeLessonModal.course.lessons?.find((l) => l.lessonNumber === nextNum);
        if (nextLesson) {
          setActiveLessonModal({
            course: activeLessonModal.course,
            lessonNumber: nextNum,
            lessonTitle: nextLesson.title,
          });
        } else {
          alert('Congratulations! You completed all lessons in this course!');
          setActiveLessonModal(null);
        }
        fetchDashboardData();
      }
    } catch (e) {
      console.error('Progress update error:', e);
    } finally {
      setUpdatingProgress(false);
    }
  };

  const getFirstName = () => {
    if (!user || !user.name) return 'Learner';
    return user.name.split(' ')[0];
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#07090e] text-[#0f172a] dark:text-slate-100 font-['Plus_Jakarta_Sans'] pb-20">
      {/* =========================================================================
          1. HEADER & WELCOME SECTION (Figma exact match: Frame 3:117767)
         ========================================================================= */}
      <section className="pt-10 pb-6 px-4 sm:px-8 lg:px-20 max-w-[1440px] mx-auto">
        <div className="flex flex-col gap-2 items-start">
          <div className="flex items-center gap-2">
            <span className="font-bold text-[12px] tracking-wider text-[#4f46e5] dark:text-[#818cf8] uppercase">
              YOUR LEARNING SPACE
            </span>
            <span className="size-1.5 rounded-full bg-[#4f46e5]" />
            <span className="text-xs text-slate-500 font-medium">InternWala Student Hub</span>
          </div>

          <div className="flex flex-col sm:flex-row sm:items-end justify-between w-full gap-4">
            <div>
              <h1 className="font-extrabold text-[32px] sm:text-[40px] leading-[1.15] tracking-[-1.2px] text-[#0f172a] dark:text-white">
                Good to see you, {getFirstName()}.
              </h1>
              <p className="font-normal text-[15px] sm:text-[16px] text-[#475569] dark:text-slate-400 mt-1">
                A little progress today. A new possibility tomorrow.
              </p>
            </div>

            {onBackToExplore && (
              <button
                onClick={onBackToExplore}
                className="self-start sm:self-auto inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition shadow-xs"
              >
                <span>Browse all public courses</span>
                <ExternalLink className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* =========================================================================
            2. METRIC STATS CARDS (Figma Frame 3:117773)
           ========================================================================= */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-8">
          {/* Metric 1: Enrolled courses */}
          <div className="bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800/80 rounded-[12px] p-6 flex flex-col gap-2 shadow-xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="font-normal text-[14px] text-[#475569] dark:text-slate-400">
                Enrolled courses
              </span>
              <BookOpen className="size-5 text-[#4f46e5] dark:text-[#818cf8]" />
            </div>
            <span className="font-extrabold text-[32px] text-[#0f172a] dark:text-white leading-tight">
              {stats.enrolledCount}
            </span>
            <span className="font-normal text-[12px] text-[#15803d] dark:text-emerald-400 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {stats.enrolledCount > 0 ? 'Active learning pathways' : 'One great place to start'}
            </span>
          </div>

          {/* Metric 2: Learning time */}
          <div className="bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800/80 rounded-[12px] p-6 flex flex-col gap-2 shadow-xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="font-normal text-[14px] text-[#475569] dark:text-slate-400">
                Learning time
              </span>
              <Clock className="size-5 text-indigo-500" />
            </div>
            <span className="font-extrabold text-[32px] text-[#0f172a] dark:text-white leading-tight">
              {stats.learningTimeFormatted}
            </span>
            <span className="font-normal text-[12px] text-[#15803d] dark:text-emerald-400 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {stats.completedLessonsCount} lessons completed
            </span>
          </div>

          {/* Metric 3: Certificates earned */}
          <div className="bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800/80 rounded-[12px] p-6 flex flex-col gap-2 shadow-xs transition hover:shadow-md">
            <div className="flex items-center justify-between">
              <span className="font-normal text-[14px] text-[#475569] dark:text-slate-400">
                Certificates earned
              </span>
              <Award className="size-5 text-amber-500" />
            </div>
            <span className="font-extrabold text-[32px] text-[#0f172a] dark:text-white leading-tight">
              {stats.certificatesCount}
            </span>
            <span className="font-normal text-[12px] text-[#15803d] dark:text-emerald-400 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {stats.certificatesCount > 0 ? 'Verified & shareable' : 'Your first is within reach'}
            </span>
          </div>
        </div>

        {/* =========================================================================
            3. CONTINUE LEARNING SHORTCUT BANNER (FR-18 & Figma 3:117786)
           ========================================================================= */}
        {continueLearning ? (
          <div className="mt-8 bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-[12px] p-6 sm:p-8 shadow-sm">
            <div className="flex flex-col md:flex-row gap-6 sm:gap-8 items-start">
              {/* Course cover thumbnail */}
              <div className="w-full md:w-[330px] shrink-0">
                <div
                  className="h-[176px] rounded-[12px] p-6 flex flex-col justify-between text-white relative overflow-hidden shadow-md"
                  style={{
                    background: `linear-gradient(135deg, ${continueLearning.gradientFrom || '#312e81'}, ${continueLearning.gradientTo || '#6d28d9'})`,
                  }}
                >
                  <p className="font-bold text-[11px] tracking-[2px] uppercase opacity-90 z-10">
                    {continueLearning.series || 'THE PRODUCT SERIES'}
                  </p>

                  <div className="flex items-end justify-between z-10">
                    <div className="font-extrabold text-[24px] sm:text-[27px] leading-[1.06] tracking-[-1px]">
                      {continueLearning.tagline ? (
                        continueLearning.tagline.split('.').map((chunk, i) => (
                          <p key={i} className="mb-0">
                            {chunk}
                            {i === 0 && chunk.trim() ? '.' : ''}
                          </p>
                        ))
                      ) : (
                        <p>Design with intent.</p>
                      )}
                    </div>
                    <div className="size-[44px] rounded-[12px] border border-white/40 flex items-center justify-center bg-white/10 backdrop-blur-xs">
                      <Sparkles className="size-5 text-white" />
                    </div>
                  </div>
                </div>
              </div>

              {/* Next lesson details & resume action */}
              <div className="flex-1 flex flex-col gap-3 min-w-0 w-full">
                <div className="bg-[#eef2ff] dark:bg-indigo-950/80 px-2.5 py-1 rounded-full self-start inline-flex items-center gap-1.5">
                  <span className="font-bold text-[11px] tracking-wider text-[#4f46e5] dark:text-[#a5b4fc] uppercase">
                    CONTINUE YOUR JOURNEY
                  </span>
                </div>

                <h3 className="font-extrabold text-[22px] sm:text-[26px] text-[#0f172a] dark:text-white tracking-tight leading-snug">
                  {continueLearning.courseTitle}
                </h3>

                <p className="text-[14px] sm:text-[15px] text-[#475569] dark:text-slate-300">
                  Lesson {continueLearning.lessonNumber} · {continueLearning.lessonTitle}
                </p>

                {/* Progress bar */}
                <div className="flex flex-col gap-2 w-full max-w-xl mt-1">
                  <div className="flex items-center justify-between text-xs">
                    <span className="font-semibold text-[#475569] dark:text-slate-400">
                      {continueLearning.completedLessons} of {continueLearning.totalLessons} lessons completed
                    </span>
                    <span className="font-bold text-[#15803d] dark:text-emerald-400">
                      {continueLearning.percent}%
                    </span>
                  </div>
                  <div className="w-full h-2 bg-[#e2e8f0] dark:bg-slate-800 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-[#16a34a] rounded-full transition-all duration-500"
                      style={{ width: `${Math.max(5, continueLearning.percent)}%` }}
                    />
                  </div>
                </div>

                {/* Action button */}
                <div className="flex items-center justify-between sm:justify-start gap-4 pt-2">
                  <span className="text-xs text-[#64748b] dark:text-slate-400">
                    {continueLearning.remainingTime}
                  </span>

                  <button
                    onClick={() => {
                      const matched = courses.find((c) => c.id === continueLearning.courseId);
                      if (matched) {
                        setActiveLessonModal({
                          course: matched,
                          lessonNumber: continueLearning.lessonNumber,
                          lessonTitle: continueLearning.lessonTitle,
                        });
                      }
                    }}
                    className="bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-[14px] px-5 py-2.5 rounded-[8px] transition inline-flex items-center gap-2 shadow-xs cursor-pointer"
                  >
                    <Play className="size-4 fill-white" />
                    <span>Continue learning</span>
                  </button>
                </div>
              </div>
            </div>
          </div>
        ) : (
          stats.enrolledCount === 0 && (
            <div className="mt-8 bg-gradient-to-r from-indigo-50 to-purple-50 dark:from-slate-900 dark:to-slate-900 border border-indigo-100 dark:border-slate-800 rounded-[12px] p-6 sm:p-8 flex flex-col sm:flex-row items-center justify-between gap-4">
              <div>
                <h3 className="font-bold text-lg text-slate-900 dark:text-white">
                  Start your first certified learning path
                </h3>
                <p className="text-sm text-slate-600 dark:text-slate-400 mt-1">
                  Enroll in a course below to unlock video curriculum, real-world assignments, and internship readiness.
                </p>
              </div>
              <button
                onClick={() => {
                  setActiveTab('all');
                }}
                className="bg-[#4f46e5] text-white font-bold text-xs px-5 py-2.5 rounded-lg shrink-0 hover:bg-[#4338ca] transition"
              >
                Browse catalog below
              </button>
            </div>
          )
        )}

        {/* =========================================================================
            4. TABS NAVIGATION (FR-16 & Figma Frame 3:117812)
           ========================================================================= */}
        <div className="mt-10 border-b border-[#e2e8f0] dark:border-slate-800 flex items-center gap-8">
          <button
            onClick={() => handleTabChange('all')}
            className={`pb-3 text-[14px] font-['Plus_Jakarta_Sans'] transition relative cursor-pointer ${
              activeTab === 'all'
                ? 'font-bold text-[#4f46e5] dark:text-[#a5b4fc]'
                : 'font-medium text-[#475569] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>All Courses</span>
            {activeTab === 'all' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4f46e5] dark:bg-[#a5b4fc] rounded-full" />
            )}
          </button>

          <button
            onClick={() => handleTabChange('my-courses')}
            className={`pb-3 text-[14px] font-['Plus_Jakarta_Sans'] transition relative cursor-pointer ${
              activeTab === 'my-courses'
                ? 'font-bold text-[#4f46e5] dark:text-[#a5b4fc]'
                : 'font-medium text-[#475569] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span className="flex items-center gap-1.5">
              <span>My Courses</span>
              {stats.enrolledCount > 0 && (
                <span className="size-5 rounded-full bg-[#eef2ff] dark:bg-indigo-950 text-[#4f46e5] dark:text-[#a5b4fc] text-xs font-bold flex items-center justify-center">
                  {stats.enrolledCount}
                </span>
              )}
            </span>
            {activeTab === 'my-courses' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4f46e5] dark:bg-[#a5b4fc] rounded-full" />
            )}
          </button>

          <button
            onClick={() => handleTabChange('completed')}
            className={`pb-3 text-[14px] font-['Plus_Jakarta_Sans'] transition relative cursor-pointer ${
              activeTab === 'completed'
                ? 'font-bold text-[#4f46e5] dark:text-[#a5b4fc]'
                : 'font-medium text-[#475569] dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            <span>Completed</span>
            {activeTab === 'completed' && (
              <span className="absolute bottom-0 left-0 right-0 h-0.5 bg-[#4f46e5] dark:bg-[#a5b4fc] rounded-full" />
            )}
          </button>
        </div>

        {/* =========================================================================
            5. SEARCH & FILTERS BAR (FR-17 & Figma Frame 3:117824)
           ========================================================================= */}
        <div className="mt-8 flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
          {/* Search Input */}
          <div className="relative flex-1 max-w-lg">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search courses by title, topic, or instructor..."
              className="w-full pl-10 pr-4 h-[46px] bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-[8px] text-[14px] text-[#0f172a] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] shadow-2xs"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-4" />
              </button>
            )}
          </div>

          {/* Filter Dropdowns */}
          <div className="flex flex-wrap items-center gap-2.5">
            {/* Category Filter */}
            <div className="relative">
              <select
                value={selectedCategory}
                onChange={(e) => setSelectedCategory(e.target.value)}
                className="h-[46px] px-3.5 pr-8 bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-[8px] text-[13px] font-bold text-[#0f172a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] appearance-none cursor-pointer shadow-2xs"
              >
                <option value="all">All categories</option>
                <option value="Product design">Product design</option>
                <option value="Product strategy">Product strategy</option>
                <option value="Brand design">Brand design</option>
                <option value="Web development">Web development</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Level Filter */}
            <div className="relative">
              <select
                value={selectedLevel}
                onChange={(e) => setSelectedLevel(e.target.value)}
                className="h-[46px] px-3.5 pr-8 bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-[8px] text-[13px] font-bold text-[#0f172a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] appearance-none cursor-pointer shadow-2xs"
              >
                <option value="all">All levels</option>
                <option value="Beginner">Beginner</option>
                <option value="Intermediate">Intermediate</option>
                <option value="Advanced">Advanced</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Duration Filter */}
            <div className="relative">
              <select
                value={selectedDuration}
                onChange={(e) => setSelectedDuration(e.target.value)}
                className="h-[46px] px-3.5 pr-8 bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-[8px] text-[13px] font-bold text-[#0f172a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] appearance-none cursor-pointer shadow-2xs"
              >
                <option value="all">All durations</option>
                <option value="short">≤ 6 hours</option>
                <option value="long">&gt; 6 hours</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>

            {/* Sort Filter */}
            <div className="relative">
              <select
                value={selectedSort}
                onChange={(e) => setSelectedSort(e.target.value as any)}
                className="h-[46px] px-3.5 pr-8 bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-[8px] text-[13px] font-bold text-[#0f172a] dark:text-slate-200 focus:outline-none focus:ring-2 focus:ring-[#4f46e5] appearance-none cursor-pointer shadow-2xs"
              >
                <option value="newest">Newest first</option>
                <option value="rating">Highest rated</option>
                <option value="lessons">Most lessons</option>
              </select>
              <ChevronDown className="absolute right-2.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            </div>
          </div>
        </div>

        {/* =========================================================================
            6. COURSES GRID (FR-14 & FR-15: Locked State vs Progress State)
           ========================================================================= */}
        <div className="mt-8">
          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 animate-pulse">
              {[1, 2, 3].map((n) => (
                <div key={n} className="h-80 bg-slate-200 dark:bg-slate-800 rounded-xl" />
              ))}
            </div>
          ) : error ? (
            <div className="p-8 text-center bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300">
              <p className="font-semibold">{error}</p>
              <button
                onClick={fetchDashboardData}
                className="mt-3 text-xs font-bold underline"
              >
                Retry
              </button>
            </div>
          ) : courses.length === 0 ? (
            <div className="p-12 text-center bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-xl">
              <GraduationCap className="size-12 text-slate-400 mx-auto mb-3" />
              <h4 className="font-bold text-lg text-slate-800 dark:text-slate-200">
                No courses match your criteria
              </h4>
              <p className="text-xs text-slate-500 mt-1">
                Try clearing your search query or reset filters to see all available learning tracks.
              </p>
              <button
                onClick={() => {
                  setSearchQuery('');
                  setSelectedCategory('all');
                  setSelectedLevel('all');
                  setSelectedDuration('all');
                  setActiveTab('all');
                }}
                className="mt-4 px-4 py-2 bg-[#4f46e5] text-white rounded-lg text-xs font-bold"
              >
                Reset all filters
              </button>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {courses.map((course) => {
                const isPurchased = course.isEnrolled; // FR-15: true = unlocked/progress, false = locked

                return (
                  <div
                    key={course.id}
                    className="bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-[12px] overflow-hidden flex flex-col justify-between shadow-[0px_4px_16px_0px_rgba(15,23,42,0.03)] hover:shadow-lg transition-all duration-200 group"
                  >
                    {/* Thumbnail Cover Header */}
                    <div
                      className="h-[176px] p-6 flex flex-col justify-between text-white relative overflow-hidden"
                      style={{
                        background: `linear-gradient(135deg, ${course.gradientFrom || '#312e81'}, ${course.gradientTo || '#6d28d9'})`,
                      }}
                    >
                      {/* Ambient Glow */}
                      <div className="absolute right-[-40px] top-[-80px] size-[240px] bg-white/10 rounded-full blur-2xl pointer-events-none" />

                      {/* Locked Scrim (FR-15: Locked state for unpurchased courses) */}
                      {!isPurchased && (
                        <div className="absolute inset-0 bg-[#0f172a]/30 backdrop-blur-[0.5px] z-5 pointer-events-none" />
                      )}

                      <p className="font-bold text-[11px] tracking-[2px] uppercase opacity-90 z-10">
                        {course.series || 'THE INTERNWALA SERIES'}
                      </p>

                      <div className="flex items-end justify-between z-10">
                        <div className="font-extrabold text-[24px] leading-[1.06] tracking-[-1px]">
                          {course.tagline ? (
                            course.tagline.split('.').map((chunk, i) => (
                              <p key={i} className="mb-0">
                                {chunk}
                                {i === 0 && chunk.trim() ? '.' : ''}
                              </p>
                            ))
                          ) : (
                            <p>Build with intent.</p>
                          )}
                        </div>

                        {/* Symbol: Lock badge for unpurchased, Sparkles for purchased */}
                        <div className="size-[44px] rounded-[12px] border border-white/40 flex items-center justify-center bg-white/10 backdrop-blur-xs">
                          {isPurchased ? (
                            <Sparkles className="size-5 text-white" />
                          ) : (
                            <Lock className="size-5 text-white" />
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Course Information Body */}
                    <div className="p-6 flex flex-col gap-4 flex-1 justify-between">
                      <div className="flex flex-col gap-3">
                        {/* Category & Rating Row */}
                        <div className="flex items-center justify-between">
                          <span className="bg-[#f1f5f9] dark:bg-slate-800 text-[#475569] dark:text-slate-300 font-bold text-[12px] px-2.5 py-1 rounded-full">
                            {course.category}
                          </span>
                          <span className="text-[#b45309] dark:text-amber-400 font-normal text-[12px]">
                            ★ {course.rating} ({course.reviewCount})
                          </span>
                        </div>

                        {/* Title */}
                        <h4 className="font-bold text-[18px] sm:text-[20px] text-[#0f172a] dark:text-white leading-[1.35] line-clamp-2">
                          {course.title}
                        </h4>

                        {/* Meta: Instructor, Lessons, Hours (FR-14) */}
                        <p className="font-normal text-[13px] sm:text-[14px] text-[#475569] dark:text-slate-400">
                          {course.instructor} · {course.lessonCount} lessons · {course.durationHours} hours
                        </p>
                      </div>

                      {/* Dynamic Footer: Progress Bar for Purchased vs Lock & Price for Unpurchased (FR-15) */}
                      <div className="pt-3 border-t border-[#e2e8f0] dark:border-slate-800">
                        {isPurchased ? (
                          <div className="flex flex-col gap-3">
                            {/* Progress details */}
                            <div className="flex flex-col gap-1.5">
                              <div className="flex items-center justify-between text-xs font-semibold text-[#475569] dark:text-slate-400">
                                <span>
                                  {course.progress?.completedLessons || 0} of {course.lessonCount} lessons completed
                                </span>
                                <span className="font-bold text-[#15803d] dark:text-emerald-400">
                                  {course.progress?.percent || 0}%
                                </span>
                              </div>
                              <div className="w-full h-1.5 bg-[#e2e8f0] dark:bg-slate-800 rounded-full overflow-hidden">
                                <div
                                  className="h-full bg-[#16a34a] rounded-full transition-all"
                                  style={{ width: `${Math.max(5, course.progress?.percent || 0)}%` }}
                                />
                              </div>
                            </div>

                            {/* Status badge & Resume button */}
                            <div className="flex items-center justify-between pt-1">
                              <div className="bg-[#eef2ff] dark:bg-indigo-950 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 text-xs font-bold text-[#4f46e5] dark:text-[#a5b4fc]">
                                <BookOpen className="size-3.5" />
                                <span>
                                  {course.progress?.isCompleted ? 'Completed' : 'In progress'}
                                </span>
                              </div>

                              <button
                                onClick={() => {
                                  setActiveLessonModal({
                                    course,
                                    lessonNumber: course.progress?.lastOpenedLessonNumber || 1,
                                    lessonTitle: course.progress?.lastOpenedLessonTitle || course.lessons[0]?.title || 'Lesson 1',
                                  });
                                }}
                                className="font-bold text-[14px] text-[#4f46e5] dark:text-[#818cf8] hover:underline inline-flex items-center gap-1 cursor-pointer"
                              >
                                <span>Resume</span>
                                <ArrowRight className="size-4" />
                              </button>
                            </div>
                          </div>
                        ) : (
                          /* Locked State for Unpurchased Courses (FR-15) */
                          <div className="flex items-center justify-between">
                            <div className="bg-[#f1f5f9] dark:bg-slate-800 px-2.5 py-1 rounded-full inline-flex items-center gap-1.5 text-xs font-bold text-[#475569] dark:text-slate-300">
                              <Lock className="size-3.5" />
                              <span>Locked</span>
                            </div>

                            <button
                              onClick={() => handleEnroll(course.id)}
                              className="font-bold text-[14px] text-[#4f46e5] dark:text-[#818cf8] hover:text-[#4338ca] hover:underline inline-flex items-center gap-1 cursor-pointer"
                            >
                              <span>${course.priceCents / 100} / ₹499 →</span>
                            </button>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </section>

      {/* =========================================================================
          7. INTERACTIVE LESSON WORKSPACE / PLAYER MODAL
         ========================================================================= */}
      {activeLessonModal && (
        <div
          className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in"
          onClick={() => setActiveLessonModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl max-w-4xl w-full overflow-hidden shadow-2xl flex flex-col relative my-auto max-h-[92vh]"
          >
            {/* Modal Header */}
            <div className="px-6 py-4 border-b border-slate-200 dark:border-slate-800 flex items-center justify-between bg-slate-50 dark:bg-slate-950">
              <div className="flex items-center gap-3">
                <span className="bg-[#eef2ff] dark:bg-indigo-950 text-[#4f46e5] dark:text-[#a5b4fc] text-xs font-bold px-2.5 py-1 rounded-full">
                  Lesson {activeLessonModal.lessonNumber} of {activeLessonModal.course.lessonCount}
                </span>
                <h3 className="font-bold text-sm sm:text-base text-slate-900 dark:text-white truncate max-w-md">
                  {activeLessonModal.course.title}
                </h3>
              </div>
              <button
                onClick={() => setActiveLessonModal(null)}
                className="p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Video Lesson Simulation Area */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              <div className="aspect-video bg-slate-900 rounded-xl relative overflow-hidden flex flex-col justify-between p-6 text-white shadow-inner">
                <div className="flex items-center justify-between text-xs text-white/70">
                  <span className="font-semibold uppercase tracking-wider">
                    {activeLessonModal.course.series}
                  </span>
                  <span className="bg-white/20 px-2 py-0.5 rounded text-[11px]">1080p HD</span>
                </div>

                <div className="text-center my-auto">
                  <div className="size-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center mx-auto cursor-pointer transition shadow-lg">
                    <Play className="size-8 fill-white ml-1" />
                  </div>
                  <h2 className="font-extrabold text-xl sm:text-2xl mt-4 text-white">
                    {activeLessonModal.lessonTitle}
                  </h2>
                  <p className="text-xs text-white/80 mt-1">
                    Taught by {activeLessonModal.course.instructor}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-white/80 border-t border-white/10 pt-3">
                  <span>Interactive Lecture · 32:45</span>
                  <span className="text-emerald-400 font-bold">Auto-synced with InternWala backend</span>
                </div>
              </div>

              {/* Lesson Objectives and Action to Complete */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Completed this lesson?
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Marking complete updates your course progress bar and moves your Continue Learning shortcut forward.
                  </p>
                </div>

                <button
                  onClick={handleCompleteLesson}
                  disabled={updatingProgress}
                  className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs px-5 py-2.5 rounded-lg transition inline-flex items-center gap-2 shrink-0 disabled:opacity-50"
                >
                  <CheckCircle2 className="size-4" />
                  <span>{updatingProgress ? 'Updating...' : 'Mark Lesson Complete & Next →'}</span>
                </button>
              </div>

              {/* Curriculum List */}
              <div className="flex flex-col gap-2">
                <h5 className="font-bold text-xs uppercase tracking-wider text-slate-500">
                  Course Lessons
                </h5>
                <div className="divide-y divide-slate-100 dark:divide-slate-800 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden">
                  {activeLessonModal.course.lessons?.map((les) => (
                    <div
                      key={les.id}
                      onClick={() =>
                        setActiveLessonModal({
                          course: activeLessonModal.course,
                          lessonNumber: les.lessonNumber,
                          lessonTitle: les.title,
                        })
                      }
                      className={`p-3.5 flex items-center justify-between cursor-pointer transition text-xs ${les.lessonNumber === activeLessonModal.lessonNumber
                          ? 'bg-[#eef2ff] dark:bg-indigo-950/60 font-bold text-[#4f46e5] dark:text-[#a5b4fc]'
                          : 'hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-300'
                        }`}
                    >
                      <div className="flex items-center gap-2.5">
                        <span className="size-5 rounded-full bg-slate-200 dark:bg-slate-800 text-slate-700 dark:text-slate-300 flex items-center justify-center text-[10px] font-bold">
                          {les.lessonNumber}
                        </span>
                        <span>{les.title}</span>
                      </div>
                      <span className="text-slate-400 font-normal">{les.duration}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
