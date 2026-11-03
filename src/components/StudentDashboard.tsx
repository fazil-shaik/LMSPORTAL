import { useState, useEffect, useCallback, useMemo } from 'react';
import {
  BookOpen,
  Play,
  Sparkles,
  Award,
  CheckCircle2,
  Clock,
  X,
  ExternalLink,
  GraduationCap,
  ShieldCheck,
  Search,
  Download,
  ListOrdered,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CourseClassroom from './CourseClassroom';

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

interface StudentDashboardProps {
  onBackToExplore?: () => void;
}

export default function StudentDashboard({ onBackToExplore }: StudentDashboardProps) {
  const { user, adminUser, openAuthModal } = useAuth();

  // Search filter inside student's enrolled courses
  const [searchQuery, setSearchQuery] = useState('');

  // Data states from backend
  const [courses, setCourses] = useState<DashboardCourse[]>([]);
  const [stats, setStats] = useState<DashboardStats>({
    enrolledCount: 0,
    completedLessonsCount: 0,
    learningTimeFormatted: '0m',
    certificatesCount: 0,
  });
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Active classroom state
  const [activeClassroomCourseId, setActiveClassroomCourseId] = useState<string | null>(null);

  // Lesson player interactive preview modal state
  const [activeLessonModal, setActiveLessonModal] = useState<{
    course: DashboardCourse;
    lessonNumber: number;
    lessonTitle: string;
  } | null>(null);
  const [updatingProgress, setUpdatingProgress] = useState(false);

  // Certificate Modal state
  const [certificateModal, setCertificateModal] = useState<{
    course: DashboardCourse;
  } | null>(null);

  // Fetch Dashboard data from backend API
  const fetchDashboardData = useCallback(async () => {
    try {
      setLoading(true);
      setError(null);

      const params = new URLSearchParams({
        tab: 'my-courses',
        search: searchQuery,
      });

      const token = localStorage.getItem('student_token') || localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        headers['X-Student-Token'] = token;
      }

      const res = await fetch(`/api/courses/dashboard?${params.toString()}`, {
        credentials: 'include',
        headers,
      });

      if (res.ok) {
        const data = await res.json();
        if (data.success) {
          // Strictly only include enrolled courses
          const enrolledOnly: DashboardCourse[] = (data.courses || data.enrolledCourses || []).filter(
            (c: DashboardCourse) => c.isEnrolled !== false
          );
          setCourses(enrolledOnly);
          if (data.stats) setStats(data.stats);
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
  }, [searchQuery, openAuthModal]);

  useEffect(() => {
    fetchDashboardData();

    const handleUpdate = () => {
      fetchDashboardData();
    };
    window.addEventListener('lms:enrollments-changed', handleUpdate);
    return () => window.removeEventListener('lms:enrollments-changed', handleUpdate);
  }, [fetchDashboardData]);

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
          setActiveLessonModal(null);
          setCertificateModal({ course: activeLessonModal.course });
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

  // Two columns separation:
  // 1. My Learnings: Courses in progress (or not yet 100% completed)
  // 2. Enrolled Courses: All enrolled courses in the student's library
  const myLearningsCourses = useMemo(() => {
    return courses.filter((c) => !c.progress?.isCompleted && (c.progress?.percent || 0) < 100);
  }, [courses]);

  const completedCourses = useMemo(() => {
    return courses.filter((c) => c.progress?.isCompleted || (c.progress?.percent || 0) >= 100);
  }, [courses]);

  if (activeClassroomCourseId) {
    return (
      <CourseClassroom
        courseId={activeClassroomCourseId}
        onBackToDashboard={() => {
          setActiveClassroomCourseId(null);
          fetchDashboardData();
        }}
      />
    );
  }

  return (
    <div className="min-h-screen bg-[#f8fafc] dark:bg-[#07090e] text-[#0f172a] dark:text-slate-100 font-['Plus_Jakarta_Sans'] pb-20">
      {/* =========================================================================
          1. HEADER & WELCOME SECTION
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

            <div className="flex items-center gap-2 self-start sm:self-auto">
              {(adminUser?.role === 'admin' || user?.role === 'admin') && (
                <button
                  onClick={() => {
                    window.history.pushState({}, '', '/admin');
                    window.dispatchEvent(new PopStateEvent('popstate'));
                  }}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold transition shadow-xs cursor-pointer"
                  title="Open InternWala Admin Studio"
                >
                  <ShieldCheck className="size-3.5" />
                  <span>Admin Studio</span>
                </button>
              )}

              {onBackToExplore && (
                <button
                  onClick={onBackToExplore}
                  className="inline-flex items-center gap-2 px-4 py-2 border border-slate-200 dark:border-slate-800 rounded-lg text-xs font-bold text-slate-700 dark:text-slate-300 hover:bg-white dark:hover:bg-slate-900 transition shadow-xs cursor-pointer"
                >
                  <span>Explore more courses</span>
                  <ExternalLink className="size-3.5" />
                </button>
              )}
            </div>
          </div>
        </div>

        {/* =========================================================================
            2. METRIC STATS CARDS
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
              {courses.length}
            </span>
            <span className="font-normal text-[12px] text-[#15803d] dark:text-emerald-400 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {courses.length > 0 ? 'Active learning pathways' : 'No courses enrolled yet'}
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
              {completedCourses.length}
            </span>
            <span className="font-normal text-[12px] text-[#15803d] dark:text-emerald-400 flex items-center gap-1">
              <span className="size-1.5 rounded-full bg-emerald-500" />
              {completedCourses.length > 0 ? 'Verified & available to share' : 'Complete a course to earn'}
            </span>
          </div>
        </div>

        {/* Quick Search Bar within Enrolled Library */}
        {courses.length > 0 && (
          <div className="mt-8 relative max-w-md">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search your courses by title or topic..."
              className="w-full pl-10 pr-4 h-[42px] bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-lg text-xs text-[#0f172a] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#4f46e5]"
            />
            {searchQuery && (
              <button
                onClick={() => setSearchQuery('')}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        )}

        {/* =========================================================================
            3. TWO COLUMNS ONLY: "MY LEARNINGS" AND "ENROLLED COURSES"
           ========================================================================= */}
        {loading ? (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 animate-pulse">
            <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl" />
            <div className="h-96 bg-slate-200 dark:bg-slate-800 rounded-xl" />
          </div>
        ) : error ? (
          <div className="mt-8 p-8 text-center bg-rose-50 dark:bg-rose-950/40 border border-rose-200 dark:border-rose-900 rounded-xl text-rose-700 dark:text-rose-300">
            <p className="font-semibold">{error}</p>
            <button onClick={fetchDashboardData} className="mt-3 text-xs font-bold underline">
              Retry
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-8 items-start">
            {/* ===================================================================
                COLUMN 1: MY LEARNINGS (Active Ongoing Coursework & Progress)
               =================================================================== */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/80 text-[#4f46e5] dark:text-[#a5b4fc] flex items-center justify-center">
                    <Sparkles className="size-4" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-[#0f172a] dark:text-white">
                      My Learnings
                    </h2>
                    <p className="text-[12px] text-slate-500">
                      Ongoing coursework and lessons in progress
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-[#eef2ff] dark:bg-indigo-950 text-[#4f46e5] dark:text-[#a5b4fc]">
                  {myLearningsCourses.length} active
                </span>
              </div>

              {myLearningsCourses.length === 0 ? (
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3">
                  {completedCourses.length > 0 ? (
                    <>
                      <div className="size-12 rounded-full bg-emerald-50 dark:bg-emerald-950/60 text-emerald-600 flex items-center justify-center">
                        <Award className="size-6" />
                      </div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        All enrolled coursework completed!
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm">
                        You have successfully completed every enrolled course. Revisit any lesson in the Enrolled Courses column or explore new certifications.
                      </p>
                      {onBackToExplore && (
                        <button
                          onClick={onBackToExplore}
                          className="mt-2 text-xs font-bold px-4 py-2 bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] transition"
                        >
                          Explore new courses
                        </button>
                      )}
                    </>
                  ) : (
                    <>
                      <div className="size-12 rounded-full bg-indigo-50 dark:bg-indigo-950/60 text-indigo-500 flex items-center justify-center">
                        <BookOpen className="size-6" />
                      </div>
                      <h3 className="font-bold text-base text-slate-900 dark:text-white">
                        No active learnings yet
                      </h3>
                      <p className="text-xs text-slate-500 max-w-sm">
                        Enroll in a course from our catalog to unlock video lessons, assignments, and verified certificates.
                      </p>
                      {onBackToExplore && (
                        <button
                          onClick={onBackToExplore}
                          className="mt-2 text-xs font-bold px-4 py-2 bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] transition"
                        >
                          Find a course to start
                        </button>
                      )}
                    </>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {myLearningsCourses.map((course) => {
                    const currentLessonNum = course.progress?.lastOpenedLessonNumber || 1;
                    const currentLessonTitle =
                      course.progress?.lastOpenedLessonTitle ||
                      course.lessons?.[0]?.title ||
                      'Lesson 1';
                    const percent = course.progress?.percent || 0;

                    return (
                      <div
                        key={course.id}
                        className="bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                      >
                        {/* Course Cover Banner */}
                        <div
                          className="h-[140px] p-5 relative overflow-hidden flex flex-col justify-between text-white"
                          style={{
                            background: course.thumbnail
                              ? `url(${course.thumbnail}) center / cover no-repeat`
                              : `linear-gradient(135deg, ${course.gradientFrom || '#312e81'}, ${course.gradientTo || '#6d28d9'})`,
                          }}
                        >
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" />
                          <div className="flex items-center justify-between z-10">
                            <span className="font-bold text-[10px] tracking-wider uppercase text-white/90">
                              {course.series || 'THE CAREER SERIES'}
                            </span>
                            <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold">
                              {percent}% Complete
                            </span>
                          </div>
                          <div className="z-10">
                            <h3 className="font-extrabold text-lg leading-tight line-clamp-1">
                              {course.tagline || course.title}
                            </h3>
                            <p className="text-xs text-white/80 line-clamp-1">{course.title}</p>
                          </div>
                        </div>

                        {/* Progress and Resume Action */}
                        <div className="p-5 flex flex-col gap-4">
                          {/* Next Lesson Indicator */}
                          <div className="bg-slate-50 dark:bg-slate-900 border border-slate-100 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between gap-3">
                            <div className="flex items-center gap-2.5 min-w-0">
                              <span className="size-6 rounded-full bg-[#eef2ff] dark:bg-indigo-950 text-[#4f46e5] dark:text-[#a5b4fc] text-xs font-bold flex items-center justify-center shrink-0">
                                {currentLessonNum}
                              </span>
                              <div className="min-w-0">
                                <p className="text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                                  Current Lesson
                                </p>
                                <p className="text-xs font-bold text-slate-900 dark:text-white truncate">
                                  {currentLessonTitle}
                                </p>
                              </div>
                            </div>
                            <span className="text-[11px] text-slate-400 shrink-0">
                              {course.durationHours || 6}h track
                            </span>
                          </div>

                          {/* Progress bar */}
                          <div className="flex flex-col gap-1.5">
                            <div className="flex items-center justify-between text-xs">
                              <span className="text-slate-500 dark:text-slate-400">
                                {course.progress?.completedLessons || 0} of {course.lessonCount} lessons completed
                              </span>
                              <span className="font-bold text-emerald-600 dark:text-emerald-400">
                                {percent}%
                              </span>
                            </div>
                            <div className="w-full h-2 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden">
                              <div
                                className="h-full bg-emerald-500 rounded-full transition-all duration-500"
                                style={{ width: `${Math.max(5, percent)}%` }}
                              />
                            </div>
                          </div>

                          {/* Action Button */}
                          <button
                            onClick={() => setActiveClassroomCourseId(course.id)}
                            className="w-full bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-xs py-2.5 px-4 rounded-xl transition inline-flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                          >
                            <Play className="size-3.5 fill-white" />
                            <span>
                              {percent > 0 ? `Resume Lesson ${currentLessonNum}` : 'Start Lesson 1'}
                            </span>
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* ===================================================================
                COLUMN 2: ENROLLED COURSES (All Unlocked Courses in Account)
               =================================================================== */}
            <div className="flex flex-col gap-5">
              <div className="flex items-center justify-between pb-2 border-b border-[#e2e8f0] dark:border-slate-800">
                <div className="flex items-center gap-2">
                  <div className="size-8 rounded-lg bg-emerald-50 dark:bg-emerald-950/80 text-emerald-600 dark:text-emerald-400 flex items-center justify-center">
                    <GraduationCap className="size-4" />
                  </div>
                  <div>
                    <h2 className="font-extrabold text-lg text-[#0f172a] dark:text-white">
                      Enrolled Courses
                    </h2>
                    <p className="text-[12px] text-slate-500">
                      All courses unlocked in your account
                    </p>
                  </div>
                </div>
                <span className="text-xs font-bold px-2.5 py-1 rounded-full bg-emerald-50 dark:bg-emerald-950/80 text-emerald-700 dark:text-emerald-300">
                  {courses.length} enrolled
                </span>
              </div>

              {courses.length === 0 ? (
                <div className="bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 rounded-2xl p-8 text-center flex flex-col items-center justify-center gap-3">
                  <div className="size-12 rounded-full bg-slate-100 dark:bg-slate-800 text-slate-400 flex items-center justify-center">
                    <GraduationCap className="size-6" />
                  </div>
                  <h3 className="font-bold text-base text-slate-900 dark:text-white">
                    No courses enrolled yet
                  </h3>
                  <p className="text-xs text-slate-500 max-w-sm">
                    Discover practical, beautifully structured courses with verified certificates on the landing page.
                  </p>
                  {onBackToExplore && (
                    <button
                      onClick={onBackToExplore}
                      className="mt-2 text-xs font-bold px-4 py-2 bg-[#4f46e5] text-white rounded-lg hover:bg-[#4338ca] transition"
                    >
                      Browse course catalog
                    </button>
                  )}
                </div>
              ) : (
                <div className="flex flex-col gap-5">
                  {courses.map((course) => {
                    const isCompleted =
                      course.progress?.isCompleted || (course.progress?.percent || 0) >= 100;

                    return (
                      <div
                        key={course.id}
                        className="bg-white dark:bg-slate-950 border border-[#e2e8f0] dark:border-slate-800 rounded-2xl overflow-hidden shadow-xs hover:shadow-md transition-all flex flex-col"
                      >
                        {/* Course Header Banner */}
                        <div
                          className="h-[120px] p-4 relative overflow-hidden flex flex-col justify-between text-white"
                          style={{
                            background: course.thumbnail
                              ? `url(${course.thumbnail}) center / cover no-repeat`
                              : `linear-gradient(135deg, ${course.gradientFrom || '#312e81'}, ${course.gradientTo || '#6d28d9'})`,
                          }}
                        >
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" />
                          <div className="flex items-center justify-between z-10">
                            <span className="font-bold text-[10px] tracking-wider uppercase text-white/90">
                              {course.category}
                            </span>
                            {isCompleted ? (
                              <span className="bg-emerald-500/90 text-white px-2 py-0.5 rounded text-[10px] font-bold flex items-center gap-1">
                                <CheckCircle2 className="size-3" />
                                <span>Completed</span>
                              </span>
                            ) : (
                              <span className="bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded text-[10px] font-bold">
                                {course.progress?.percent || 0}% Done
                              </span>
                            )}
                          </div>
                          <div className="z-10">
                            <h3 className="font-extrabold text-base leading-tight line-clamp-1">
                              {course.title}
                            </h3>
                            <p className="text-[11px] text-white/80">
                              {course.instructor} · {course.lessonCount} lessons
                            </p>
                          </div>
                        </div>

                        {/* Card Content & Action Bar */}
                        <div className="p-4 flex flex-col gap-3">
                          <p className="text-xs text-slate-600 dark:text-slate-400 line-clamp-2">
                            {course.description}
                          </p>

                          <div className="flex items-center justify-between pt-2 border-t border-slate-100 dark:border-slate-800">
                            <div className="flex items-center gap-1.5">
                              {course.badge && (
                                <span className="bg-[#eceb98] text-[#3d3c0a] font-bold text-[10px] px-1.5 py-0.5 rounded">
                                  {course.badge}
                                </span>
                              )}
                              <span className="text-[11px] text-slate-400">{course.level}</span>
                            </div>

                            <div className="flex items-center gap-2">
                              {isCompleted && (
                                <button
                                  onClick={() => setCertificateModal({ course })}
                                  className="text-xs font-bold px-3 py-1.5 rounded-lg border border-amber-300 dark:border-amber-800 text-amber-700 dark:text-amber-300 bg-amber-50 dark:bg-amber-950/40 hover:bg-amber-100 transition inline-flex items-center gap-1 cursor-pointer"
                                  title="View verified certificate"
                                >
                                  <Award className="size-3.5" />
                                  <span>Certificate</span>
                                </button>
                              )}

                              <button
                                onClick={() => setActiveClassroomCourseId(course.id)}
                                className="text-xs font-bold px-3.5 py-1.5 rounded-lg bg-[#2d2f31] dark:bg-white text-white dark:text-[#2d2f31] hover:bg-black dark:hover:bg-slate-200 transition inline-flex items-center gap-1.5 cursor-pointer"
                              >
                                <ListOrdered className="size-3.5" />
                                <span>{isCompleted ? 'Review Syllabus' : 'Open Course'}</span>
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
        )}
      </section>

      {/* =========================================================================
          4. INTERACTIVE LESSON PLAYER MODAL
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

            {/* Video Lesson Area */}
            <div className="p-6 overflow-y-auto flex flex-col gap-6">
              <div className="aspect-video bg-slate-900 rounded-xl relative overflow-hidden flex flex-col justify-between p-6 text-white shadow-inner">
                <div className="flex items-center justify-between text-xs text-white/70">
                  <span className="font-semibold uppercase tracking-wider">
                    {activeLessonModal.course.series || 'INTERNWALA CURRICULUM'}
                  </span>
                  <span className="bg-white/20 px-2 py-0.5 rounded text-[11px]">1080p Stream</span>
                </div>

                <div className="text-center my-auto">
                  <div className="size-16 rounded-full bg-white/20 hover:bg-white/30 backdrop-blur-md text-white flex items-center justify-center mx-auto cursor-pointer transition shadow-lg">
                    <Play className="size-8 fill-white ml-1" />
                  </div>
                  <h2 className="font-extrabold text-xl sm:text-2xl mt-4 text-white">
                    {activeLessonModal.lessonTitle}
                  </h2>
                  <p className="text-xs text-white/80 mt-1">
                    Instructor: {activeLessonModal.course.instructor}
                  </p>
                </div>

                <div className="flex items-center justify-between text-xs text-white/80 border-t border-white/10 pt-3">
                  <span>Interactive Lecture · 30:00</span>
                  <span className="text-emerald-400 font-bold">Auto-synced with progress engine</span>
                </div>
              </div>

              {/* Lesson Objectives and Action to Complete */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 rounded-xl bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800">
                <div>
                  <h4 className="font-bold text-sm text-slate-900 dark:text-white">
                    Finished this lesson?
                  </h4>
                  <p className="text-xs text-slate-500 dark:text-slate-400">
                    Marking complete updates your progress bar and advances your coursework.
                  </p>
                </div>

                <button
                  onClick={handleCompleteLesson}
                  disabled={updatingProgress}
                  className="bg-[#16a34a] hover:bg-[#15803d] text-white font-bold text-xs px-5 py-2.5 rounded-lg transition inline-flex items-center gap-2 shrink-0 disabled:opacity-50 cursor-pointer"
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
                      className={`p-3.5 flex items-center justify-between cursor-pointer transition text-xs ${
                        les.lessonNumber === activeLessonModal.lessonNumber
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

      {/* =========================================================================
          5. VERIFIED COMPLETION CERTIFICATE MODAL
         ========================================================================= */}
      {certificateModal && (
        <div
          className="fixed inset-0 z-50 bg-black/75 backdrop-blur-sm flex items-center justify-center p-4 sm:p-6 overflow-y-auto animate-in fade-in"
          onClick={() => setCertificateModal(null)}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="bg-white dark:bg-slate-900 border-2 border-amber-300 dark:border-amber-700/80 rounded-2xl max-w-2xl w-full p-8 shadow-2xl flex flex-col items-center text-center relative my-auto"
          >
            <button
              onClick={() => setCertificateModal(null)}
              className="absolute top-4 right-4 p-1.5 text-slate-400 hover:text-slate-600 dark:hover:text-white rounded-full hover:bg-slate-100 dark:hover:bg-slate-800"
            >
              <X className="size-5" />
            </button>

            <div className="size-16 rounded-full bg-amber-100 dark:bg-amber-950/80 text-amber-600 dark:text-amber-400 flex items-center justify-center mb-4">
              <Award className="size-8" />
            </div>

            <span className="font-bold text-[11px] uppercase tracking-widest text-amber-600 dark:text-amber-400">
              VERIFIED INTERNWALA CERTIFICATE
            </span>

            <h2 className="font-extrabold text-2xl sm:text-3xl text-slate-900 dark:text-white mt-1">
              Certificate of Completion
            </h2>

            <p className="text-xs text-slate-500 mt-2">This certifies that</p>
            <p className="font-extrabold text-xl sm:text-2xl text-[#4f46e5] dark:text-[#818cf8] mt-1 border-b-2 border-slate-200 dark:border-slate-800 pb-2 px-8">
              {user?.name || 'InternWala Student'}
            </p>

            <p className="text-xs text-slate-500 mt-3">has successfully mastered and completed</p>
            <h3 className="font-bold text-lg text-slate-900 dark:text-white mt-1">
              {certificateModal.course.title}
            </h3>

            <p className="text-xs text-slate-400 mt-1">
              Curriculum by {certificateModal.course.instructor} · {certificateModal.course.lessonCount} lessons
            </p>

            <div className="mt-6 pt-4 border-t border-slate-100 dark:border-slate-800 w-full flex items-center justify-between text-xs text-slate-400">
              <span className="font-mono">
                ID: IW-CERT-{certificateModal.course.id.slice(0, 8).toUpperCase()}
              </span>
              <span>Issued: {new Date().toLocaleDateString()}</span>
            </div>

            <div className="flex items-center gap-3 mt-6">
              <button
                onClick={() => {
                  window.print();
                }}
                className="bg-[#4f46e5] hover:bg-[#4338ca] text-white font-bold text-xs px-5 py-2.5 rounded-xl transition inline-flex items-center gap-2 cursor-pointer"
              >
                <Download className="size-3.5" />
                <span>Print / Save Certificate</span>
              </button>
              <button
                onClick={() => setCertificateModal(null)}
                className="text-xs font-bold px-4 py-2.5 rounded-xl border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
