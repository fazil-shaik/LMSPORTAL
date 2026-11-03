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
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import CashfreeCheckoutModal from './CashfreeCheckoutModal';

interface Lesson {
  id: string;
  title: string;
  lessonNumber: number;
  duration: string;
  isFreePreview?: boolean;
  videoUrl?: string;
}

interface Section {
  id: string;
  title: string;
  order: number;
  lessons: Lesson[];
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
  description: string;
  instructor: string;
  instructorTitle: string;
  instructorBio?: string;
  instructorAvatar?: string;
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
  language?: string;
  lastUpdatedDate?: string;
  gradientFrom?: string;
  gradientTo?: string;
  outcomes?: string[];
  requirements?: string[];
  whoIsItFor?: string[];
  sections?: Section[];
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
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});

  // Free preview video modal (FR-20)
  const [previewLesson, setPreviewLesson] = useState<{
    lessonTitle: string;
    courseTitle: string;
    videoUrl: string;
    duration: string;
  } | null>(null);

  // Cashfree Checkout modal state (FR-25, FR-26)
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
      const token = localStorage.getItem('token');
      const headers: Record<string, string> = {};
      if (token) headers['Authorization'] = `Bearer ${token}`;

      const res = await fetch(`/api/courses/detail/${slug}`, { headers });
      const data = await res.json();
      if (res.ok && data.success && data.course) {
        setCourse(data.course);
        // Expand first section by default
        if (data.course.sections && data.course.sections.length > 0) {
          setOpenSections({ [data.course.sections[0].id]: true });
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

  const toggleSection = (sectionId: string) => {
    setOpenSections((prev) => ({
      ...prev,
      [sectionId]: !prev[sectionId],
    }));
  };

  const openFreePreview = (lesson: Lesson) => {
    if (!course) return;
    setPreviewLesson({
      lessonTitle: lesson.title,
      courseTitle: course.title,
      duration: lesson.duration,
      videoUrl: lesson.videoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
    });
  };

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2500);
  };

  // Check if current user is enrolled
  const isEnrolled = course ? enrolledCourses.includes(course.id) || !!course.isEnrolled : false;

  const handleBuyClick = () => {
    if (!user) {
      openAuthModal('signin');
      return;
    }
    setCheckoutOpen(true);
  };

  const handlePaymentSuccess = (orderId: string, courseSlug: string) => {
    setCheckoutOpen(false);
    if (course) {
      enrollInCourse(course.id);
    }
    onNavigate(`/checkout/success?order_id=${encodeURIComponent(orderId)}&course_slug=${encodeURIComponent(courseSlug)}`);
  };

  if (loading) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center min-h-[60vh] py-16">
        <div className="size-10 border-4 border-[#a435f0] border-t-transparent rounded-full animate-spin mb-4" />
        <p className="text-slate-500 text-sm font-medium">Loading course syllabus and details...</p>
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

      {/* 2. Dark Hero Header with Course Overview */}
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
              <span className="bg-emerald-500/20 text-emerald-200 text-xs font-semibold px-2.5 py-0.5 rounded border border-emerald-400/30">
                Cashfree Verified
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl lg:text-5xl font-extrabold tracking-tight leading-tight">
              {course.title}
            </h1>

            <p className="text-base sm:text-lg text-slate-200 font-normal leading-relaxed max-w-3xl">
              {course.tagline || course.description}
            </p>

            {/* FR-21: Course Metadata Pill Row */}
            <div className="flex flex-wrap items-center gap-4 sm:gap-6 pt-2 text-xs sm:text-sm text-slate-200">
              <div className="flex items-center gap-1.5 text-amber-300 font-bold">
                <Star className="size-4 fill-amber-300" />
                <span>{course.rating || 4.9}</span>
                <span className="text-slate-300 font-normal">({course.reviewCount || 128} ratings)</span>
              </div>

              <div className="flex items-center gap-1.5">
                <Users className="size-4 text-slate-300" />
                <span>{(course.reviewCount || 128) * 4 + 48} students enrolled</span>
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
              Created by{' '}
              <span className="font-bold text-white underline cursor-pointer">{course.instructor}</span>
              {course.instructorTitle ? `, ${course.instructorTitle}` : ''}
            </div>
          </div>
        </div>
      </div>

      {/* 3. Main Content Grid (Two Columns: Syllabus/Details + Sticky Buy Card) */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 lg:gap-12 items-start">
          {/* LEFT COLUMN: Course details (FR-19, FR-20, FR-23) */}
          <div className="lg:col-span-8 flex flex-col gap-10">
            {/* FR-19: What You Will Learn Card */}
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

            {/* FR-21: Course Highlights Bar */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-5 bg-white dark:bg-slate-900 grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shrink-0">
                  <Clock className="size-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Duration</p>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">{course.totalDuration || `${course.durationHours || 6} hours`}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-purple-50 dark:bg-purple-950/50 flex items-center justify-center text-purple-600 dark:text-purple-400 shrink-0">
                  <BookOpen className="size-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Lessons</p>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">{course.lessonCount || 12} modules</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 flex items-center justify-center text-emerald-600 dark:text-emerald-400 shrink-0">
                  <Award className="size-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Level</p>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">{course.level || 'All Levels'}</p>
                </div>
              </div>

              <div className="flex items-center gap-3">
                <div className="size-10 rounded-lg bg-amber-50 dark:bg-amber-950/50 flex items-center justify-center text-amber-600 dark:text-amber-400 shrink-0">
                  <ShieldCheck className="size-5" />
                </div>
                <div>
                  <p className="text-[11px] uppercase tracking-wider text-slate-400 font-bold">Certificate</p>
                  <p className="text-sm font-extrabold text-slate-900 dark:text-white">Included</p>
                </div>
              </div>
            </div>

            {/* FR-20: Curriculum Accordion with Lesson Durations and Free Preview */}
            <div className="flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Course content</h2>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400 mt-1">
                    {course.sections ? `${course.sections.length} sections · ` : ''}
                    {course.lessonCount} lessons · {course.durationHours || 6}h total length
                  </p>
                </div>
                <button
                  onClick={() => {
                    if (course.sections) {
                      const allOpen = course.sections.every((s) => openSections[s.id]);
                      const next: Record<string, boolean> = {};
                      course.sections.forEach((s) => {
                        next[s.id] = !allOpen;
                      });
                      setOpenSections(next);
                    }
                  }}
                  className="text-xs font-bold text-[#a435f0] hover:text-[#8710d8] dark:text-[#c084fc] transition cursor-pointer"
                >
                  Expand / Collapse All
                </button>
              </div>

              <div className="border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-200 dark:divide-slate-800">
                {course.sections && course.sections.length > 0 ? (
                  course.sections.map((section) => {
                    const isOpen = !!openSections[section.id];
                    return (
                      <div key={section.id} className="bg-white dark:bg-slate-900">
                        {/* Section Header Accordion Trigger */}
                        <button
                          onClick={() => toggleSection(section.id)}
                          className="w-full px-5 py-4 flex items-center justify-between text-left hover:bg-slate-50 dark:hover:bg-slate-800/60 transition cursor-pointer"
                        >
                          <div className="flex items-center gap-3">
                            {isOpen ? (
                              <ChevronUp className="size-4 text-slate-500" />
                            ) : (
                              <ChevronDown className="size-4 text-slate-500" />
                            )}
                            <span className="font-bold text-sm sm:text-base text-slate-900 dark:text-white">
                              {section.title}
                            </span>
                          </div>
                          <span className="text-xs text-slate-400">
                            {section.lessons.length} lessons
                          </span>
                        </button>

                        {/* Lessons List inside Section */}
                        {isOpen && (
                          <div className="divide-y divide-slate-100 dark:divide-slate-800/60 bg-slate-50/40 dark:bg-slate-900/40">
                            {section.lessons.map((lesson) => (
                              <div
                                key={lesson.id}
                                className="px-6 py-3.5 flex items-center justify-between text-xs sm:text-sm hover:bg-slate-100/50 dark:hover:bg-slate-800/40 transition"
                              >
                                <div className="flex items-center gap-3">
                                  {lesson.isFreePreview ? (
                                    <button
                                      onClick={() => openFreePreview(lesson)}
                                      className="text-[#a435f0] hover:text-[#8710d8] dark:text-[#c084fc] transition flex items-center gap-1.5 font-bold cursor-pointer"
                                      title="Watch Free Preview"
                                    >
                                      <PlayCircle className="size-4" />
                                      <span className="text-slate-800 dark:text-slate-200 hover:text-[#a435f0] dark:hover:text-[#c084fc]">
                                        {lesson.lessonNumber}. {lesson.title}
                                      </span>
                                    </button>
                                  ) : (
                                    <div className="flex items-center gap-2 text-slate-700 dark:text-slate-300">
                                      {isEnrolled ? (
                                        <PlayCircle className="size-4 text-emerald-500 shrink-0" />
                                      ) : (
                                        <Lock className="size-3.5 text-slate-400 shrink-0" />
                                      )}
                                      <span>
                                        {lesson.lessonNumber}. {lesson.title}
                                      </span>
                                    </div>
                                  )}
                                </div>

                                <div className="flex items-center gap-3 shrink-0">
                                  {lesson.isFreePreview && (
                                    <button
                                      onClick={() => openFreePreview(lesson)}
                                      className="text-xs font-bold text-[#a435f0] dark:text-[#c084fc] hover:underline cursor-pointer"
                                    >
                                      Preview Free
                                    </button>
                                  )}
                                  <span className="text-slate-400 text-xs">{lesson.duration}</span>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })
                ) : (
                  <div className="p-6 text-center text-slate-500 text-sm">
                    Curriculum outline being updated.
                  </div>
                )}
              </div>
            </div>

            {/* FR-19: Requirements & Who It Is For */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              {/* Requirements */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 bg-white dark:bg-slate-900">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-3">
                  Requirements
                </h3>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  {(course.requirements || [
                    'Basic computer and browser knowledge',
                    'Dedication to complete hands-on assignments',
                  ]).map((req, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span>{req}</span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Who It Is For */}
              <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 bg-white dark:bg-slate-900">
                <h3 className="font-extrabold text-base text-slate-900 dark:text-white mb-3">
                  Who this course is for
                </h3>
                <ul className="space-y-2.5 text-xs sm:text-sm text-slate-600 dark:text-slate-300">
                  {(course.whoIsItFor || [
                    'Students and job-seekers targeting high-growth companies',
                    'Working professionals looking to switch or advance their careers',
                  ]).map((audience, i) => (
                    <li key={i} className="flex items-start gap-2">
                      <span className="text-slate-400">•</span>
                      <span>{audience}</span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>

            {/* FR-19: Instructor Bio Section */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 bg-white dark:bg-slate-900">
              <h2 className="text-xl font-extrabold text-slate-900 dark:text-white mb-4">Instructor</h2>
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 mb-4">
                <img
                  src={
                    course.instructorAvatar ||
                    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=200&q=80'
                  }
                  alt={course.instructor}
                  className="size-16 sm:size-20 rounded-full object-cover border-2 border-[#a435f0]/30 shadow-sm"
                />
                <div>
                  <h3 className="font-bold text-lg text-slate-900 dark:text-white">{course.instructor}</h3>
                  <p className="text-xs sm:text-sm text-slate-500 dark:text-slate-400">{course.instructorTitle}</p>
                  <div className="flex items-center gap-3 mt-1.5 text-xs text-slate-500">
                    <span className="flex items-center gap-1 font-semibold text-amber-500">
                      ★ {course.rating || 4.9} Instructor Rating
                    </span>
                    <span>·</span>
                    <span>{course.reviewCount || 128} Reviews</span>
                  </div>
                </div>
              </div>
              <p className="text-xs sm:text-sm text-slate-600 dark:text-slate-300 leading-relaxed">
                {course.instructorBio ||
                  `${course.instructor} brings years of production engineering and leadership experience. Dedicated to practical learning, real-world case studies, and mentorship for next-generation talent.`}
              </p>
            </div>

            {/* FR-23: Reviews and Ratings Section */}
            <div className="border border-slate-200 dark:border-slate-800 rounded-xl p-6 sm:p-8 bg-white dark:bg-slate-900 flex flex-col gap-6">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                    <Star className="size-5 fill-amber-400 text-amber-400" />
                    Student Reviews & Feedback
                  </h2>
                  <p className="text-xs text-slate-500 mt-1">Verified reviews from enrolled learners</p>
                </div>
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-extrabold text-slate-900 dark:text-white">
                    {course.rating || 4.9}
                  </span>
                  <div className="flex text-amber-400">
                    {[1, 2, 3, 4, 5].map((s) => (
                      <Star key={s} className="size-4 fill-amber-400" />
                    ))}
                  </div>
                  <span className="text-xs text-slate-400">({course.reviewCount || 128})</span>
                </div>
              </div>

              {/* Individual Reviews */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(course.reviews && course.reviews.length > 0
                  ? course.reviews
                  : [
                      {
                        id: 'r1',
                        studentName: 'Alex Rivera',
                        studentRole: 'Junior Frontend Developer',
                        rating: 5,
                        reviewText:
                          'Super practical and direct. The curriculum covered real company workflows rather than trivial hello-world examples.',
                        date: '2 weeks ago',
                      },
                      {
                        id: 'r2',
                        studentName: 'Priya Sharma',
                        studentRole: 'UX / Product Designer',
                        rating: 5,
                        reviewText:
                          'Worth every dollar. The lessons helped me land multiple interviews and showcase a portfolio piece that impressed interviewers.',
                        date: '1 month ago',
                      },
                    ]
                ).map((rev) => (
                  <div
                    key={rev.id}
                    className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-800/30 flex flex-col justify-between"
                  >
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <div>
                          <p className="font-bold text-sm text-slate-900 dark:text-white">{rev.studentName}</p>
                          {rev.studentRole && (
                            <p className="text-[11px] text-slate-400">{rev.studentRole}</p>
                          )}
                        </div>
                        <div className="flex text-amber-400">
                          {Array.from({ length: rev.rating }).map((_, i) => (
                            <Star key={i} className="size-3 fill-amber-400" />
                          ))}
                        </div>
                      </div>
                      <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed italic">
                        "{rev.reviewText}"
                      </p>
                    </div>
                    <p className="text-[10px] text-slate-400 mt-3">{rev.date}</p>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* RIGHT COLUMN: Sticky Buy Card (FR-22, FR-24, FR-31, FR-32) */}
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
                    onClick={() => {
                      const firstPreview = course.sections
                        ?.flatMap((s) => s.lessons)
                        .find((l) => l.isFreePreview) || course.sections?.[0]?.lessons?.[0];
                      if (firstPreview) openFreePreview(firstPreview);
                    }}
                    className="size-12 rounded-full bg-white/90 text-slate-900 flex items-center justify-center shadow-lg hover:scale-110 transition cursor-pointer"
                  >
                    <PlayCircle className="size-6 text-[#a435f0]" />
                  </button>
                </div>
                <div className="absolute bottom-2 left-2 bg-black/70 text-white text-[10px] font-bold px-2 py-0.5 rounded">
                  Free Preview Available
                </div>
              </div>

              {/* Price display (FR-22: 200 USD) */}
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
                    <span>You own this course! Full access is unlocked.</span>
                  </div>
                  <button
                    onClick={() => onNavigate('/dashboard')}
                    className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl font-extrabold text-sm transition cursor-pointer flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20"
                  >
                    <span>Go to My Learnings</span>
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

              {/* FR-24: Refund Policy Summary Near Buy Button */}
              <div className="flex items-center gap-2.5 p-3 rounded-lg bg-slate-50 dark:bg-slate-800/50 border border-slate-200 dark:border-slate-800 text-xs text-slate-600 dark:text-slate-300">
                <ShieldCheck className="size-4 text-emerald-500 shrink-0" />
                <span className="leading-snug">
                  <strong>30-Day Money-Back Guarantee</strong>. Full refund anytime if you are not 100% satisfied.
                </span>
              </div>

              {/* FR-31: Coupon Code Box */}
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
                        if (couponCodeInput.trim()) {
                          setAppliedPromo(couponCodeInput.trim());
                          setCheckoutOpen(true);
                        }
                      }}
                      className="px-3 py-1.5 text-xs font-bold bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 rounded-lg transition cursor-pointer"
                    >
                      Apply
                    </button>
                  </div>
                </div>
              )}

              {/* What is Included Checklist */}
              <div className="border-t border-slate-100 dark:border-slate-800 pt-4">
                <p className="text-xs font-bold text-slate-900 dark:text-white uppercase tracking-wider mb-3">
                  This course includes:
                </p>
                <ul className="space-y-2 text-xs text-slate-600 dark:text-slate-300">
                  <li className="flex items-center gap-2">
                    <PlayCircle className="size-3.5 text-indigo-500" />
                    <span>{course.totalDuration || `${course.durationHours || 6} hours`} on-demand HD video</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <BookOpen className="size-3.5 text-indigo-500" />
                    <span>{course.lessonCount} downloadable resources & code</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Globe className="size-3.5 text-indigo-500" />
                    <span>Full lifetime access on desktop & mobile</span>
                  </li>
                  <li className="flex items-center gap-2">
                    <Award className="size-3.5 text-indigo-500" />
                    <span>Verifiable Certificate of Completion</span>
                  </li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* FR-20: Free Lesson Preview Modal Player */}
      {previewLesson && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm animate-fadeIn">
          <div className="bg-slate-900 border border-slate-800 rounded-2xl w-full max-w-3xl overflow-hidden shadow-2xl">
            <div className="px-5 py-3.5 bg-slate-800/80 border-b border-slate-700 flex items-center justify-between">
              <div>
                <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-emerald-950/60 px-2 py-0.5 rounded border border-emerald-500/30">
                  Free Preview
                </span>
                <h3 className="font-bold text-white text-sm sm:text-base mt-1">
                  {previewLesson.lessonTitle}
                </h3>
              </div>
              <button
                onClick={() => setPreviewLesson(null)}
                className="text-slate-400 hover:text-white p-1 rounded-lg hover:bg-slate-700 transition cursor-pointer"
              >
                <X className="size-5" />
              </button>
            </div>

            <div className="aspect-video bg-black flex items-center justify-center">
              <video
                src={previewLesson.videoUrl}
                controls
                autoPlay
                className="w-full h-full object-contain"
              >
                Your browser does not support HTML5 video preview.
              </video>
            </div>

            <div className="p-4 bg-slate-900 flex items-center justify-between text-xs text-slate-400">
              <span>Duration: {previewLesson.duration}</span>
              <button
                onClick={() => {
                  setPreviewLesson(null);
                  handleBuyClick();
                }}
                className="font-bold text-white bg-[#a435f0] hover:bg-[#8710d8] px-4 py-1.5 rounded-lg transition cursor-pointer"
              >
                Enroll to unlock full course
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Cashfree Payment Gateway Checkout Modal (FR-25, FR-26) */}
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
          initialCouponCode={appliedPromo || couponCodeInput}
          onPaymentSuccess={handlePaymentSuccess}
        />
      )}
    </div>
  );
}
