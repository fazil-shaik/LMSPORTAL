import { useState, useEffect } from 'react';
import {
  Star,
  Clock,
  BookOpen,
  Award,
  Globe,
  Calendar,
  ShieldCheck,
  CheckCircle2,
  ChevronDown,
  ChevronUp,
  PlayCircle,
  Lock,
  Users,
  ArrowLeft,
  Share2,
  Heart,
  Tag,
  AlertCircle,
  Check,
  Sparkles,
  X,
  CreditCard,
  FileText,
  Headphones,
  Download,
  HelpCircle,
  Layers,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CashfreeCheckoutModal from './CashfreeCheckoutModal';

interface Lesson {
  id: string;
  title: string;
  description?: string;
  type?: 'video' | 'audio' | 'article' | 'resource';
  duration: string;
  durationSeconds?: number;
  position?: number;
  lessonNumber?: number;
  isFreePreview?: boolean;
  isRequired?: boolean;
  videoUrl?: string;
  mediaUrl?: string;
}

interface ModuleTimeline {
  id: string;
  label?: string;
  suggestedDuration?: string;
  startOffsetDays?: number;
  releaseMode?: string;
  estimatedStudyTimeMinutes?: number;
}

interface ModuleQuiz {
  id: string;
  title: string;
  instructions?: string;
  isRequired?: boolean;
  questionCount?: number;
  passingPercent?: number;
  timeLimitMinutes?: number;
}

interface CourseModule {
  id: string;
  title: string;
  description?: string;
  objectives?: string[];
  position?: number;
  timeline?: ModuleTimeline;
  lessonCount?: number;
  lessons: Lesson[];
  quiz?: ModuleQuiz;
}

interface Review {
  id: string;
  studentName: string;
  studentRole?: string;
  rating: number;
  reviewText: string;
  date: string;
}

interface CourseDetail {
  id: string;
  slug: string;
  title: string;
  subtitle?: string;
  description: string;
  instructor: string;
  instructorTitle: string;
  instructorBio?: string;
  instructorAvatar?: string;
  thumbnail: string;
  banner?: string;
  previewVideo?: string;
  priceCents: number;
  currency: string;
  category: string;
  tags?: string[];
  level: string;
  durationHours: number;
  totalDuration: string;
  lessonCount: number;
  moduleCount?: number;
  rating: number;
  reviewCount: number;
  series: string;
  tagline: string;
  badge?: string;
  language?: string;
  lastUpdatedDate?: string;
  gradientFrom?: string;
  gradientTo?: string;
  outcomes?: string[];
  requirements?: string[];
  whoIsItFor?: string[];
  modules?: CourseModule[];
  sections?: any[];
  reviews?: Review[];
  isEnrolled?: boolean;
}

interface CourseDetailPageProps {
  slug: string;
  onBack: () => void;
  onNavigate: (path: string) => void;
}

export default function CourseDetailPage({ slug, onBack, onNavigate }: CourseDetailPageProps) {
  const { user, enrolledCourses, openAuthModal, enrollInCourse } = useAuth();
  const [course, setCourse] = useState<CourseDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Accordion open/collapse states
  const [openModules, setOpenModules] = useState<Record<string, boolean>>({});

  // Free preview video modal
  const [previewVideoModal, setPreviewVideoModal] = useState<{
    title: string;
    videoUrl: string;
    subtitle?: string;
  } | null>(null);

  // Cashfree Checkout modal state
  const [checkoutOpen, setCheckoutOpen] = useState(false);
  const [couponCodeInput, setCouponCodeInput] = useState('');
  const [appliedPromo, setAppliedPromo] = useState<string>('');

  // Wishlist state
  const [isWishlisted, setIsWishlisted] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    fetchCourseDetails();
  }, [slug]);

  const fetchCourseDetails = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = localStorage.getItem('student_token') || localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/courses/detail/${slug}`, { headers });
      const data = await res.json();
      if (res.ok && data.success && data.course) {
        setCourse(data.course);
        // Expand first module by default
        if (data.course.modules && data.course.modules.length > 0) {
          setOpenModules({ [data.course.modules[0].id]: true });
        } else if (data.course.sections && data.course.sections.length > 0) {
          setOpenModules({ [data.course.sections[0].id]: true });
        }
      } else {
        setError(data.message || 'Course details could not be found.');
      }
    } catch (err: any) {
      console.error('Failed to load course details:', err);
      setError('Unable to load course. Please check your network connection.');
    } finally {
      setLoading(false);
    }
  };

  const isEnrolled = course
    ? course.isEnrolled || enrolledCourses.includes(course.id) || (user && user.role === 'admin')
    : false;

  const toggleModule = (modId: string) => {
    setOpenModules((prev) => ({ ...prev, [modId]: !prev[modId] }));
  };

  const handleShare = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      setTimeout(() => setCopiedLink(false), 2000);
    }
  };

  const openFreePreview = (lesson: Lesson) => {
    setPreviewVideoModal({
      title: lesson.title,
      videoUrl: lesson.videoUrl || lesson.mediaUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
      subtitle: `${course?.title} · Free Preview`,
    });
  };

  const openPromoVideo = () => {
    if (course?.previewVideo) {
      setPreviewVideoModal({
        title: `${course.title} - Official Preview`,
        videoUrl: course.previewVideo,
        subtitle: course.subtitle || course.tagline,
      });
    } else {
      // Fallback to first preview lesson
      const firstPreview = displayModules
        .flatMap((m) => m.lessons)
        .find((l) => l.isFreePreview) || displayModules[0]?.lessons[0];
      if (firstPreview) openFreePreview(firstPreview);
    }
  };

  const handleBuyClick = () => {
    if (!user) {
      openAuthModal('signup');
      return;
    }
    setCheckoutOpen(true);
  };

  // Harmonize modules list (supports both new multi-module structure and legacy sections)
  const displayModules: CourseModule[] = course?.modules && course.modules.length > 0
    ? course.modules
    : course?.sections && course.sections.length > 0
    ? course.sections.map((s: any, idx: number) => ({
        id: s.id || `mod-${idx}`,
        title: s.title || `Module ${idx + 1}`,
        description: '',
        objectives: [],
        timeline: { id: `tl-${idx}`, label: `Week ${idx + 1}`, suggestedDuration: '3 days' },
        lessons: s.lessons || [],
      }))
    : [];

  if (loading) {
    return (
      <div className="flex-1 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20 flex flex-col items-center justify-center text-slate-400 gap-3">
        <div className="size-8 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
        <p className="text-sm">Loading course details...</p>
      </div>
    );
  }

  if (error || !course) {
    return (
      <div className="flex-1 max-w-4xl mx-auto px-4 py-20 text-center">
        <AlertCircle className="size-12 text-rose-500 mx-auto mb-4" />
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Course Not Found</h2>
        <p className="text-slate-600 dark:text-slate-400 mb-6">{error || 'This course may have been unpublished or moved.'}</p>
        <button
          onClick={onBack}
          className="inline-flex items-center gap-2 bg-[#2d2f31] dark:bg-white text-white dark:text-slate-900 px-5 py-2.5 rounded-lg font-bold text-sm hover:opacity-90 transition cursor-pointer"
        >
          <ArrowLeft className="size-4" />
          Back to Course Catalog
        </button>
      </div>
    );
  }

  const priceFormatted = `$${((course.priceCents ?? 20000) / 100).toFixed(0)} USD`;

  return (
    <div className="flex-1 bg-white dark:bg-[#0a0d16] text-slate-800 dark:text-slate-100">
      {/* 1. Breadcrumb and Action Bar */}
      <div className="border-b border-slate-200 dark:border-slate-800 bg-slate-50/70 dark:bg-slate-900/40">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-3.5 flex items-center justify-between text-xs sm:text-sm">
          <div className="flex items-center gap-2 overflow-hidden text-slate-500 dark:text-slate-400">
            <button
              onClick={onBack}
              className="hover:text-[#a435f0] dark:hover:text-[#c084fc] flex items-center gap-1 font-semibold transition cursor-pointer"
            >
              <ArrowLeft className="size-3.5" />
              Courses
            </button>
            <span>/</span>
            <span className="text-slate-400 hidden sm:inline">{course.category || 'Professional Skills'}</span>
            <span className="hidden sm:inline">/</span>
            <span className="font-semibold text-slate-800 dark:text-slate-200 truncate">{course.title}</span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => setIsWishlisted(!isWishlisted)}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer"
              title="Add to wishlist"
            >
              <Heart className={`size-4 ${isWishlisted ? 'fill-rose-500 text-rose-500' : ''}`} />
            </button>
            <button
              onClick={handleShare}
              className="p-2 rounded-lg border border-slate-200 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300 transition cursor-pointer relative"
              title="Share course"
            >
              <Share2 className="size-4" />
              {copiedLink && (
                <span className="absolute -bottom-8 right-0 bg-slate-900 text-white text-[10px] font-bold px-2 py-1 rounded shadow">
                  Copied!
                </span>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* 2. Udemy/Coursera Style Hero Header (PDF Section 3) */}
      <div
        className="relative overflow-hidden text-white py-12 lg:py-16"
        style={{
          background: `linear-gradient(135deg, ${course.gradientFrom || '#1e1b4b'} 0%, ${course.gradientTo || '#4c1d95'} 100%)`,
        }}
      >
        <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 grid grid-cols-1 lg:grid-cols-12 gap-8 items-center">
          <div className="lg:col-span-8 flex flex-col gap-4">
            <div className="flex flex-wrap items-center gap-2">
              <span className="bg-white/20 backdrop-blur-md text-white font-bold text-xs uppercase tracking-wider px-3 py-1 rounded-full">
                {course.series || 'THE CAREER SERIES'}
              </span>
              {course.badge && (
                <span className="bg-[#eceb98] text-[#3d3c0a] font-bold text-xs px-2.5 py-0.5 rounded">
                  {course.badge}
                </span>
              )}
              <span className="bg-indigo-500/20 text-indigo-200 text-xs font-semibold px-2.5 py-0.5 rounded border border-indigo-400/30">
                {course.level || 'Beginner'}
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              {course.title}
            </h1>

            {/* Subtitle: One-line promise (PDF Section 3) */}
            <p className="text-base sm:text-xl text-indigo-100 font-medium leading-relaxed max-w-3xl">
              {course.subtitle || course.tagline || 'Build practical mastery.'}
            </p>

            {/* Metadata Pill Row */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs sm:text-sm text-slate-200">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Star className="size-4 fill-amber-300" />
                <span>{course.rating || 4.9}</span>
                <span className="text-slate-300 font-normal">({course.reviewCount || 128} reviews)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Users className="size-4 text-slate-300" />
                <span>{(course.reviewCount || 128) * 3 + 64} enrolled</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Globe className="size-4 text-slate-300" />
                <span>{course.language || 'English'}</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Calendar className="size-4 text-slate-300" />
                <span>Updated {course.lastUpdatedDate || 'November 2026'}</span>
              </div>
            </div>

            <div className="text-xs sm:text-sm text-slate-300 pt-1">
              Created by <span className="font-bold text-white underline">{course.instructor}</span>
              {course.instructorTitle ? `, ${course.instructorTitle}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content Grid */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT COLUMN: Overview, Syllabus, Quizzes, Instructor */}
          <div className="lg:col-span-8 flex flex-col gap-10">
            {/* What you will learn (Section 3 Checklist) */}
            {course.outcomes && course.outcomes.length > 0 && (
              <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 sm:p-8 bg-slate-50/50 dark:bg-slate-900/30">
                <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-5 flex items-center gap-2">
                  <Sparkles className="size-5 text-[#a435f0]" />
                  What you will learn
                </h2>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
                  {course.outcomes.map((outcome, idx) => (
                    <div key={idx} className="flex items-start gap-3 text-sm text-slate-700 dark:text-slate-300">
                      <Check className="size-4 text-emerald-600 dark:text-emerald-400 shrink-0 mt-0.5" />
                      <span>{outcome}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Course Description */}
            <div className="flex flex-col gap-3">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Description</h2>
              <div className="text-sm sm:text-base text-slate-700 dark:text-slate-300 leading-relaxed whitespace-pre-line">
                {course.description}
              </div>
            </div>

            {/* Course Content / Module Hierarchy (PDF Section 2 & 4) */}
            <div className="flex flex-col gap-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Course Content</h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {displayModules.length} modules · {course.lessonCount} lessons · {course.totalDuration}
                  </p>
                </div>
                <button
                  onClick={() => {
                    const allOpen = displayModules.every((m) => openModules[m.id]);
                    const next: Record<string, boolean> = {};
                    displayModules.forEach((m) => {
                      next[m.id] = !allOpen;
                    });
                    setOpenModules(next);
                  }}
                  className="text-xs font-bold text-[#a435f0] hover:text-[#8710d8] dark:text-[#c084fc] transition cursor-pointer"
                >
                  Expand / Collapse All Modules
                </button>
              </div>

              {/* Module Cards Accordion */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800 shadow-xs">
                {displayModules.map((module) => {
                  const isOpen = !!openModules[module.id];
                  const lessonCount = module.lessons ? module.lessons.length : 0;
                  const timeline = module.timeline;

                  return (
                    <div key={module.id} className="bg-white dark:bg-slate-900">
                      {/* Module Header Trigger */}
                      <button
                        onClick={() => toggleModule(module.id)}
                        className="w-full px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
                      >
                        <div className="flex items-center gap-3">
                          {isOpen ? (
                            <ChevronUp className="size-4 text-slate-500 shrink-0" />
                          ) : (
                            <ChevronDown className="size-4 text-slate-500 shrink-0" />
                          )}
                          <div>
                            <div className="flex items-center gap-2">
                              {timeline?.label && (
                                <span className="text-[10px] font-extrabold uppercase px-2 py-0.5 rounded bg-indigo-50 dark:bg-indigo-950/70 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
                                  {timeline.label}
                                </span>
                              )}
                              <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                                {module.title}
                              </span>
                            </div>
                            {module.description && (
                              <p className="text-xs text-slate-500 dark:text-slate-400 mt-1 line-clamp-1">
                                {module.description}
                              </p>
                            )}
                          </div>
                        </div>

                        <div className="flex items-center gap-3 text-xs text-slate-500 shrink-0 pl-7 sm:pl-0">
                          {timeline?.suggestedDuration && (
                            <span className="hidden md:inline bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded text-[11px]">
                              {timeline.suggestedDuration}
                            </span>
                          )}
                          <span>{lessonCount} lessons</span>
                          {module.quiz && (
                            <span className="font-bold text-indigo-600 dark:text-indigo-400">
                              · Quiz
                            </span>
                          )}
                        </div>
                      </button>

                      {/* Expanded Module Lessons & Quiz */}
                      {isOpen && (
                        <div className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40">
                          {/* Module Objectives Checklist if available */}
                          {module.objectives && module.objectives.length > 0 && (
                            <div className="px-6 py-3 bg-indigo-50/30 dark:bg-indigo-950/20 text-xs text-slate-600 dark:text-slate-300">
                              <span className="font-bold text-indigo-600 dark:text-indigo-400 uppercase text-[10px] tracking-wider block mb-1">
                                Module Learning Objectives:
                              </span>
                              <ul className="list-disc list-inside space-y-0.5">
                                {module.objectives.map((obj, oIdx) => (
                                  <li key={oIdx}>{obj}</li>
                                ))}
                              </ul>
                            </div>
                          )}

                          {/* Lessons inside Module */}
                          {module.lessons.map((lesson, lIdx) => {
                            const isFree = !!lesson.isFreePreview;
                            return (
                              <div
                                key={lesson.id}
                                className="px-6 py-3.5 flex items-center justify-between text-xs sm:text-sm hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition"
                              >
                                <div className="flex items-center gap-3">
                                  {/* Lesson Type Icon */}
                                  {lesson.type === 'article' ? (
                                    <FileText className="size-4 text-amber-500 shrink-0" />
                                  ) : lesson.type === 'audio' ? (
                                    <Headphones className="size-4 text-purple-500 shrink-0" />
                                  ) : lesson.type === 'resource' ? (
                                    <Download className="size-4 text-blue-500 shrink-0" />
                                  ) : (
                                    <PlayCircle className="size-4 text-indigo-500 shrink-0" />
                                  )}

                                  {isFree ? (
                                    <button
                                      onClick={() => openFreePreview(lesson)}
                                      className="text-left font-semibold text-slate-900 dark:text-white hover:text-[#a435f0] dark:hover:text-[#c084fc] transition cursor-pointer flex items-center gap-2"
                                    >
                                      <span>{lIdx + 1}. {lesson.title}</span>
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                      {isEnrolled ? (
                                        <CheckCircle2 className="size-3.5 text-emerald-500 shrink-0" />
                                      ) : (
                                        <Lock className="size-3.5 text-slate-400 shrink-0" />
                                      )}
                                      <span>{lIdx + 1}. {lesson.title}</span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {isFree && (
                                    <button
                                      onClick={() => openFreePreview(lesson)}
                                      className="text-[11px] font-bold text-[#a435f0] dark:text-[#c084fc] hover:underline cursor-pointer"
                                    >
                                      Preview
                                    </button>
                                  )}
                                  <span className="text-slate-400 text-xs">{lesson.duration}</span>
                                </div>
                              </div>
                            );
                          })}

                          {/* Module Quiz Card */}
                          {module.quiz && (
                            <div className="px-6 py-3.5 flex items-center justify-between text-xs sm:text-sm bg-purple-50/40 dark:bg-purple-950/20">
                              <div className="flex items-center gap-3 text-purple-900 dark:text-purple-300 font-bold">
                                <HelpCircle className="size-4 text-purple-600 dark:text-purple-400 shrink-0" />
                                <span>{module.quiz.title}</span>
                              </div>
                              <div className="flex items-center gap-2 text-xs text-purple-700 dark:text-purple-400">
                                <span>{module.quiz.questionCount || 3} questions</span>
                                <span>· Pass: {module.quiz.passingPercent || 70}%</span>
                              </div>
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Requirements & Target Audience (Section 3) */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Requirements */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 bg-white dark:bg-slate-900">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-3">
                  Requirements
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  {(course.requirements || [
                    'Basic computer literacy and a modern web browser',
                    'Dedication to complete hands-on assignments',
                  ]).map((req, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Who this course is for */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 bg-white dark:bg-slate-900">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-3">
                  Who this course is for
                </h3>
                <ul className="space-y-2 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  {(course.whoIsItFor || [
                    'Early-career professionals looking to level up their skills',
                    'Developers and designers building production systems',
                  ]).map((aud, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-indigo-500 font-bold">•</span>
                      <span>{aud}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* Instructor Bio Section */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 bg-white dark:bg-slate-900">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4">Instructor</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                <img
                  src={course.instructorAvatar || 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'}
                  alt={course.instructor}
                  className="size-16 rounded-full object-cover ring-2 ring-indigo-600/20"
                />
                <div>
                  <h3 className="font-extrabold text-lg text-slate-900 dark:text-white">{course.instructor}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{course.instructorTitle}</p>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {course.instructorBio}
              </p>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Purchase Card */}
          <div className="lg:col-span-4 lg:sticky lg:top-24 flex flex-col gap-4">
            <div className="border border-slate-200 dark:border-slate-800 rounded-2xl p-6 bg-white dark:bg-slate-900 shadow-xl shadow-slate-200/50 dark:shadow-none flex flex-col gap-5">
              {/* Card Thumbnail / Preview trigger */}
              <div className="relative rounded-xl overflow-hidden aspect-video bg-slate-800 group">
                <img
                  src={course.thumbnail}
                  alt={course.title}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                />
                <div className="absolute inset-0 bg-black/40 flex items-center justify-center">
                  <button
                    onClick={openPromoVideo}
                    className="size-12 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg hover:scale-110 transition cursor-pointer"
                    title="Watch Course Preview"
                  >
                    <PlayCircle className="size-6 text-[#a435f0]" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  Course Preview
                </div>
              </div>

              {/* Price display */}
              <div className="flex items-baseline justify-between">
                <div>
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {priceFormatted}
                  </span>
                  <span className="text-xs text-slate-400 ml-2 line-through">$350 USD</span>
                </div>
                <span className="text-xs font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2.5 py-1 rounded-full">
                  42% OFF
                </span>
              </div>

              {/* Enrollment or Buy Button */}
              {isEnrolled ? (
                <div className="flex flex-col gap-2">
                  <div className="p-3 bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-200 dark:border-emerald-800 rounded-xl flex items-center gap-2.5 text-emerald-700 dark:text-emerald-300 text-xs font-semibold">
                    <CheckCircle2 className="size-4 shrink-0 text-emerald-500" />
                    <span>You are enrolled! Full course access is active.</span>
                  </div>
                  <button
                    onClick={() => onNavigate('/dashboard')}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <span>Enter Classroom</span>
                    <span>→</span>
                  </button>
                </div>
              ) : (
                <div className="flex flex-col gap-3">
                  <button
                    onClick={handleBuyClick}
                    className="w-full py-3.5 bg-[#a435f0] hover:bg-[#8710d8] text-white rounded-xl font-extrabold text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-purple-500/25 hover:shadow-purple-500/40"
                  >
                    <CreditCard className="size-4" />
                    <span>Buy Now with Cashfree</span>
                  </button>

                  <p className="text-[11px] text-center text-slate-400">
                    Supports UPI, Cards, Netbanking & Wallets
                  </p>
                </div>
              )}

              {/* Guarantee */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                <span className="leading-snug">
                  <strong>30-Day Money-Back Guarantee</strong>. Full refund anytime if not satisfied.
                </span>
              </div>

              {/* Promo Coupon Box */}
              {!isEnrolled && (
                <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                  <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5 block">
                    Have a promo coupon?
                  </label>
                  <div className="flex gap-2">
                    <div className="relative flex-1">
                      <Tag className="size-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                      <input
                        type="text"
                        placeholder="WELCOME20 or INTERN50"
                        value={couponCodeInput}
                        onChange={(e) => setCouponCodeInput(e.target.value.toUpperCase())}
                        className="w-full bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-lg pl-8 pr-2.5 py-1.5 text-xs text-slate-800 dark:text-slate-100 uppercase focus:outline-none focus:ring-1 focus:ring-[#a435f0]"
                      />
                    </div>
                    <button
                      onClick={() => {
                        if (couponCodeInput === 'WELCOME20' || couponCodeInput === 'INTERN50') {
                          setAppliedPromo(couponCodeInput);
                        } else {
                          alert('Invalid coupon code. Try WELCOME20 or INTERN50');
                        }
                      }}
                      className="px-3 py-1.5 bg-slate-200 dark:bg-slate-700 hover:bg-slate-300 text-xs font-bold rounded-lg transition"
                    >
                      Apply
                    </button>
                  </div>
                  {appliedPromo && (
                    <p className="text-[11px] text-emerald-600 dark:text-emerald-400 mt-1 font-semibold">
                      Coupon {appliedPromo} applied!
                    </p>
                  )}
                </div>
              )}

              {/* Course Features List */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4 flex flex-col gap-2.5 text-xs text-slate-600 dark:text-slate-300">
                <div className="flex items-center gap-2">
                  <Clock className="size-4 text-slate-400" />
                  <span>{course.totalDuration} on-demand video</span>
                </div>
                <div className="flex items-center gap-2">
                  <Layers className="size-4 text-slate-400" />
                  <span>{displayModules.length} comprehensive modules</span>
                </div>
                <div className="flex items-center gap-2">
                  <BookOpen className="size-4 text-slate-400" />
                  <span>Articles, quizzes & downloadable code templates</span>
                </div>
                <div className="flex items-center gap-2">
                  <Award className="size-4 text-slate-400" />
                  <span>Verified certificate of completion</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Preview Video Modal */}
      {previewVideoModal && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-slate-900 text-white rounded-2xl max-w-3xl w-full overflow-hidden shadow-2xl border border-slate-800">
            <div className="p-4 flex items-center justify-between border-b border-slate-800">
              <div>
                <h3 className="font-extrabold text-sm">{previewVideoModal.title}</h3>
                {previewVideoModal.subtitle && (
                  <p className="text-xs text-slate-400">{previewVideoModal.subtitle}</p>
                )}
              </div>
              <button
                onClick={() => setPreviewVideoModal(null)}
                className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400 hover:text-white transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>
            <div className="aspect-video bg-black flex items-center justify-center">
              <video
                src={previewVideoModal.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              />
            </div>
          </div>
        </div>
      )}

      {/* Cashfree Checkout Modal */}
      {checkoutOpen && course && (
        <CashfreeCheckoutModal
          isOpen={checkoutOpen}
          onClose={() => setCheckoutOpen(false)}
          course={{
            id: course.id,
            title: course.title,
            slug: course.slug,
            priceCents: course.priceCents,
            thumbnail: course.thumbnail,
            instructor: course.instructor,
          }}
          initialCouponCode={appliedPromo}
          onPaymentSuccess={() => {
            setCheckoutOpen(false);
            enrollInCourse(course.id);
            fetchCourseDetails();
          }}
        />
      )}
    </div>
  );
}
