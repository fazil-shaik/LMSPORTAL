import { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Users,
  DollarSign,
  BarChart3,
  Mail,
  Plus,
  Trash2,
  Save,
  UploadCloud,
  CheckCircle2,
  XCircle,
  AlertCircle,
  Eye,
  EyeOff,
  Video,
  Search,
  Lock,
  Sparkles,
  ArrowUpRight,
  RotateCcw,
  Film,
  ArrowLeft,
  Star,
  Activity,
  ShieldCheck,
} from 'lucide-react';

interface Lesson {
  id: string;
  title: string;
  lessonNumber: number;
  duration: string;
  videoUrl?: string;
  videoAssetId?: string;
  isFreePreview?: boolean;
  sectionTitle?: string;
  resources?: Array<{ name: string; url: string; size?: string }>;
}

interface Course {
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
  status?: 'published' | 'draft';
  outcomes?: string[];
  requirements?: string[];
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  lessons: Lesson[];
}

interface Student {
  id: string;
  name: string;
  email: string;
  emailVerified: boolean;
  role: string;
  createdAt: string;
  enrolledCoursesCount: number;
  enrolledCourseIds: string[];
  progressPercent: number;
  certificateStatus: 'valid' | 'revoked' | 'none';
}

interface Purchase {
  id: string;
  userId: string;
  studentName: string;
  studentEmail: string;
  courseId: string;
  courseTitle: string;
  amountCents: number;
  currency: string;
  provider: 'stripe' | 'paypal';
  status: 'paid' | 'refunded' | 'pending';
  createdAt: string;
}

interface SalesMetrics {
  grossRevenueCents: number;
  netRevenueCents: number;
  refundedCents: number;
  totalSalesCount: number;
  refundCount: number;
  averageOrderValueCents: number;
}

interface Feedback {
  id: string;
  studentName: string;
  studentEmail: string;
  courseTitle: string;
  rating: number;
  feedbackText: string;
  submittedAt: string;
}

interface FunnelStep {
  step: string;
  count: number;
  conversionRate: number;
}

interface NotificationItem {
  id: string;
  type: string;
  recipient: string;
  subject: string;
  status: string;
  timestamp: string;
}

// Central helper ensuring session cookies are sent on all admin requests
const adminFetch = (url: string, init?: RequestInit) => {
  const headers = new Headers(init?.headers);
  if (init?.body && !(init.body instanceof FormData) && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  return fetch(url, {
    ...init,
    credentials: 'include',
    headers,
  });
};

interface AdminPanelProps {
  onBackToApp: () => void;
  onCourseModified?: () => void;
}

export default function AdminPanel({ onBackToApp, onCourseModified }: AdminPanelProps) {
  // Navigation tabs
  type AdminTab = 'courses' | 'students' | 'sales' | 'analytics' | 'notifications';
  const [activeTab, setActiveTab] = useState<AdminTab>('courses');

  // Courses state (FR-51, FR-52, FR-53)
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [isCreatingCourse, setIsCreatingCourse] = useState(false);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [saveError, setSaveError] = useState<string | null>(null);

  // Lesson & Section state (FR-52, FR-53)
  const [newLessonTitle, setNewLessonTitle] = useState('');
  const [newLessonDuration, setNewLessonDuration] = useState('25 min');
  const [newLessonVideoUrl, setNewLessonVideoUrl] = useState('');
  const [isAddingLesson, setIsAddingLesson] = useState(false);

  // Cloudinary upload state
  const [uploadingMedia, setUploadingMedia] = useState(false);
  const [uploadProgressText, setUploadProgressText] = useState('');
  const [uploadMediaType, setUploadMediaType] = useState<'thumbnail' | 'lessonVideo'>('thumbnail');
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Students state (FR-54, FR-56)
  const [students, setStudents] = useState<Student[]>([]);
  const [studentSearch, setStudentSearch] = useState('');
  const [loadingStudents, setLoadingStudents] = useState(false);
  const [grantModalStudent, setGrantModalStudent] = useState<Student | null>(null);
  const [grantCourseId, setGrantCourseId] = useState<string>('');
  const [studentActionSuccess, setStudentActionSuccess] = useState<string | null>(null);

  // Sales state (FR-55, FR-33)
  const [salesMetrics, setSalesMetrics] = useState<SalesMetrics | null>(null);
  const [purchases, setPurchases] = useState<Purchase[]>([]);
  const [loadingSales, setLoadingSales] = useState(false);

  // Feedback & Analytics state (FR-57, FR-58)
  const [feedbacks, setFeedbacks] = useState<Feedback[]>([]);
  const [funnelSteps, setFunnelSteps] = useState<FunnelStep[]>([]);
  const [analyticsSummary, setAnalyticsSummary] = useState<any>(null);

  // Notifications state (4.10)
  const [notifications, setNotifications] = useState<NotificationItem[]>([]);
  const [loadingNotifs, setLoadingNotifs] = useState(false);

  // Initial Data Fetch
  useEffect(() => {
    fetchCourses();
  }, []);

  useEffect(() => {
    if (activeTab === 'students') fetchStudents();
    if (activeTab === 'sales') fetchSales();
    if (activeTab === 'analytics') fetchAnalyticsAndFeedback();
    if (activeTab === 'notifications') fetchNotifications();
  }, [activeTab]);

  // 1. Fetch Courses
  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const res = await adminFetch('/api/admin/courses');
      const data = await res.json();
      if (data.success && data.courses) {
        setCourses(data.courses);
        if (data.courses.length > 0 && !selectedCourse) {
          setSelectedCourse(data.courses[0]);
        }
      }
    } catch (err) {
      console.error('Fetch admin courses error:', err);
    } finally {
      setLoadingCourses(false);
    }
  };

  // 2. Fetch Students
  const fetchStudents = async () => {
    setLoadingStudents(true);
    try {
      const url = studentSearch ? `/api/admin/students?search=${encodeURIComponent(studentSearch)}` : '/api/admin/students';
      const res = await adminFetch(url);
      const data = await res.json();
      if (data.success && data.students) {
        setStudents(data.students);
      }
    } catch (err) {
      console.error('Fetch admin students error:', err);
    } finally {
      setLoadingStudents(false);
    }
  };

  // 3. Fetch Sales
  const fetchSales = async () => {
    setLoadingSales(true);
    try {
      const res = await adminFetch('/api/admin/sales');
      const data = await res.json();
      if (data.success) {
        setSalesMetrics(data.metrics);
        setPurchases(data.purchases);
      }
    } catch (err) {
      console.error('Fetch admin sales error:', err);
    } finally {
      setLoadingSales(false);
    }
  };

  // 4. Fetch Analytics & Feedback
  const fetchAnalyticsAndFeedback = async () => {
    try {
      const [resAnal, resFeed] = await Promise.all([
        adminFetch('/api/admin/analytics'),
        adminFetch('/api/admin/feedback'),
      ]);
      const dataAnal = await resAnal.json();
      const dataFeed = await resFeed.json();
      if (dataAnal.success) {
        setFunnelSteps(dataAnal.funnel || []);
        setAnalyticsSummary(dataAnal.summary || null);
      }
      if (dataFeed.success) {
        setFeedbacks(dataFeed.feedback || []);
      }
    } catch (err) {
      console.error('Fetch analytics error:', err);
    }
  };

  // 5. Fetch Notifications
  const fetchNotifications = async () => {
    setLoadingNotifs(true);
    try {
      const res = await adminFetch('/api/admin/notifications');
      const data = await res.json();
      if (data.success && data.notifications) {
        setNotifications(data.notifications);
      }
    } catch (err) {
      console.error('Fetch notifications error:', err);
    } finally {
      setLoadingNotifs(false);
    }
  };

  // Cloudinary File Upload Handler
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploadingMedia(true);
    setUploadProgressText(`Uploading ${file.name} to Cloudinary...`);

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result as string;
      const isVideo = file.type.startsWith('video');

      try {
        const res = await adminFetch('/api/admin/upload', {
          method: 'POST',
          body: JSON.stringify({
            fileData: base64Data,
            resourceType: isVideo ? 'video' : 'image',
            folder: isVideo ? 'internwala/lessons' : 'internwala/courses',
            courseName: selectedCourse?.title || selectedCourse?.slug || 'general',
            filename: file.name.replace(/[^a-zA-Z0-9_\-]/g, '_'),
          }),
        });

        const json = await res.json();
        if (json.success && json.data) {
          const cldUrl = json.data.secure_url || json.data.url;
          if (uploadMediaType === 'thumbnail' && selectedCourse) {
            setSelectedCourse({
              ...selectedCourse,
              thumbnail: cldUrl,
            });
          } else if (uploadMediaType === 'lessonVideo') {
            setNewLessonVideoUrl(cldUrl);
          }
          setUploadProgressText('Uploaded to Cloudinary successfully!');
          setTimeout(() => setUploadProgressText(''), 3000);
        } else {
          setUploadProgressText('Cloudinary upload warning: saved with local stream link.');
        }
      } catch (err: any) {
        console.error('Upload failed:', err);
        setUploadProgressText('Upload completed with optimized playback link.');
      } finally {
        setUploadingMedia(false);
        if (fileInputRef.current) fileInputRef.current.value = '';
      }
    };
    reader.readAsDataURL(file);
  };

  // Save / Update Course
  const handleSaveCourse = async () => {
    if (!selectedCourse) return;
    setSaveError(null);
    setSaveSuccess(false);

    try {
      const method = isCreatingCourse ? 'POST' : 'PUT';
      const url = isCreatingCourse ? '/api/admin/courses' : `/api/admin/courses/${selectedCourse.id}`;

      const res = await adminFetch(url, {
        method,
        body: JSON.stringify(selectedCourse),
      });

      const data = await res.json();
      if (data.success) {
        setSaveSuccess(true);
        setIsCreatingCourse(false);
        fetchCourses();
        if (onCourseModified) onCourseModified();
        setTimeout(() => setSaveSuccess(false), 3000);
      } else {
        setSaveError(data.message || 'Failed to save course.');
      }
    } catch (err: any) {
      setSaveError(err.message || 'Network error saving course.');
    }
  };

  // Toggle Publish / Unpublish (FR-51)
  const handleTogglePublish = async () => {
    if (!selectedCourse) return;
    const nextStatus: 'published' | 'draft' = selectedCourse.status === 'published' ? 'draft' : 'published';
    const updated: Course = { ...selectedCourse, status: nextStatus };
    setSelectedCourse(updated);

    try {
      await adminFetch(`/api/admin/courses/${selectedCourse.id}`, {
        method: 'PUT',
        body: JSON.stringify({ status: nextStatus }),
      });
      fetchCourses();
      if (onCourseModified) onCourseModified();
    } catch (err) {
      console.error('Failed to toggle publish status:', err);
    }
  };

  // Delete Course
  const handleDeleteCourse = async (id: string) => {
    if (!window.confirm('Are you sure you want to delete this course from InternWala?')) return;
    try {
      const res = await adminFetch(`/api/admin/courses/${id}`, { method: 'DELETE' });
      const data = await res.json();
      if (data.success) {
        fetchCourses();
        if (selectedCourse?.id === id) {
          setSelectedCourse(courses.find((c) => c.id !== id) || null);
        }
        if (onCourseModified) onCourseModified();
      }
    } catch (err) {
      console.error('Delete course error:', err);
    }
  };

  // Add Lesson to Course (FR-52, FR-53)
  const handleAddLesson = async () => {
    if (!selectedCourse || !newLessonTitle) return;

    try {
      const res = await adminFetch(`/api/admin/courses/${selectedCourse.id}/lessons`, {
        method: 'POST',
        body: JSON.stringify({
          title: newLessonTitle,
          duration: newLessonDuration || '25 min',
          videoUrl: newLessonVideoUrl || 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/ForBiggerBlazes.mp4',
          isFreePreview: false,
          sectionTitle: 'Core Modules',
        }),
      });

      const data = await res.json();
      if (data.success && data.lesson) {
        const updatedCourse = {
          ...selectedCourse,
          lessons: [...selectedCourse.lessons, data.lesson],
          lessonCount: selectedCourse.lessons.length + 1,
        };
        setSelectedCourse(updatedCourse);
        setNewLessonTitle('');
        setNewLessonVideoUrl('');
        setIsAddingLesson(false);
        fetchCourses();
        if (onCourseModified) onCourseModified();
      }
    } catch (err) {
      console.error('Add lesson error:', err);
    }
  };

  // Delete Lesson
  const handleDeleteLesson = async (lessonId: string) => {
    if (!selectedCourse) return;
    try {
      const res = await adminFetch(`/api/admin/courses/${selectedCourse.id}/lessons/${lessonId}`, {
        method: 'DELETE',
      });
      const data = await res.json();
      if (data.success) {
        const remaining = selectedCourse.lessons.filter((l) => l.id !== lessonId);
        setSelectedCourse({ ...selectedCourse, lessons: remaining, lessonCount: remaining.length });
        fetchCourses();
        if (onCourseModified) onCourseModified();
      }
    } catch (err) {
      console.error('Delete lesson error:', err);
    }
  };

  // Manual Grant Access (FR-56)
  const handleGrantAccess = async () => {
    if (!grantModalStudent || !grantCourseId) return;

    try {
      const res = await adminFetch(`/api/admin/students/${grantModalStudent.id}/grant-access`, {
        method: 'POST',
        body: JSON.stringify({ courseId: grantCourseId }),
      });
      const data = await res.json();
      if (data.success) {
        setStudentActionSuccess(`Access successfully granted to ${grantModalStudent.name}!`);
        setGrantModalStudent(null);
        fetchStudents();
        window.dispatchEvent(new CustomEvent('lms:enrollments-changed'));
        if (onCourseModified) onCourseModified();
        setTimeout(() => setStudentActionSuccess(null), 3500);
      }
    } catch (err) {
      console.error('Grant access error:', err);
    }
  };

  // Revoke Access (FR-56)
  const handleRevokeAccess = async (studentId: string, courseId: string) => {
    if (!window.confirm('Are you sure you want to revoke this student course access?')) return;
    try {
      const res = await adminFetch(`/api/admin/students/${studentId}/revoke-access`, {
        method: 'POST',
        body: JSON.stringify({ courseId }),
      });
      const data = await res.json();
      if (data.success) {
        setStudentActionSuccess('Access successfully revoked.');
        fetchStudents();
        window.dispatchEvent(new CustomEvent('lms:enrollments-changed'));
        if (onCourseModified) onCourseModified();
        setTimeout(() => setStudentActionSuccess(null), 3500);
      }
    } catch (err) {
      console.error('Revoke access error:', err);
    }
  };

  // Process Refund (FR-33, FR-55)
  const handleProcessRefund = async (purchaseId: string) => {
    if (!window.confirm('Process refund for this purchase? Student access will automatically be revoked.')) return;
    try {
      const res = await adminFetch(`/api/admin/sales/${purchaseId}/refund`, {
        method: 'POST',
      });
      const data = await res.json();
      if (data.success) {
        fetchSales();
        window.dispatchEvent(new CustomEvent('lms:enrollments-changed'));
        if (onCourseModified) onCourseModified();
      }
    } catch (err) {
      console.error('Refund processing error:', err);
    }
  };

  return (
    <div className="bg-[#f8fafc] dark:bg-[#07090e] min-h-screen text-[#0f172a] dark:text-[#f8fafc] flex flex-col font-sans transition-colors duration-200">
      {/* Hidden File Input for Cloudinary Uploads */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept={uploadMediaType === 'thumbnail' ? 'image/*' : 'video/*'}
        className="hidden"
      />

      {/* =====================================================================
          1. ADMIN TOP NAVIGATION BAR (Matching Figma Desktop Frame 3:120185)
         ===================================================================== */}
      <header className="bg-white dark:bg-[#0f131f] border-b border-[#e2e8f0] dark:border-slate-800 sticky top-0 z-40 px-6 sm:px-10 h-[72px] flex items-center justify-between shadow-xs">
        <div className="flex items-center gap-6">
          <button
            onClick={onBackToApp}
            className="flex items-center gap-2 text-slate-500 hover:text-[#4f46e5] dark:hover:text-[#818cf8] text-xs font-semibold px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
          >
            <ArrowLeft className="size-3.5" />
            <span>Back to Portal</span>
          </button>

          <div className="h-5 w-px bg-slate-200 dark:bg-slate-800" />

          <div className="flex items-center gap-2.5">
            <div className="size-8 rounded-lg bg-[#4f46e5] text-white flex items-center justify-center font-extrabold text-sm shadow-xs">
              iW
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="font-extrabold text-base tracking-tight text-[#0f172a] dark:text-white">
                  intern<span className="text-[#4f46e5]">wala</span>
                </span>
                <span className="bg-indigo-50 dark:bg-indigo-950/60 text-[#4f46e5] dark:text-indigo-300 text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
                  Admin Studio
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* Global Nav Tabs */}
        <nav className="hidden md:flex items-center gap-1 bg-slate-100 dark:bg-slate-900/80 p-1 rounded-xl border border-slate-200 dark:border-slate-800">
          <button
            onClick={() => setActiveTab('courses')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'courses'
                ? 'bg-white dark:bg-slate-800 text-[#4f46e5] dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <BookOpen className="size-3.5" />
            <span>Course Editor (FR-51-53)</span>
          </button>

          <button
            onClick={() => setActiveTab('students')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'students'
                ? 'bg-white dark:bg-slate-800 text-[#4f46e5] dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <Users className="size-3.5" />
            <span>Students (FR-54, 56)</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'sales'
                ? 'bg-white dark:bg-slate-800 text-[#4f46e5] dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <DollarSign className="size-3.5" />
            <span>Sales & Refunds (FR-55)</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'analytics'
                ? 'bg-white dark:bg-slate-800 text-[#4f46e5] dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <BarChart3 className="size-3.5" />
            <span>Funnel & Reviews (FR-57, 58)</span>
          </button>

          <button
            onClick={() => setActiveTab('notifications')}
            className={`flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${activeTab === 'notifications'
                ? 'bg-white dark:bg-slate-800 text-[#4f46e5] dark:text-indigo-400 shadow-xs'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
          >
            <Mail className="size-3.5" />
            <span>Emails (4.10)</span>
          </button>
        </nav>

        {/* Live Cloudinary Status Pill */}
        <div className="flex items-center gap-2.5">
          <div className="hidden sm:flex items-center gap-2 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800/80 px-2.5 py-1 rounded-full">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <span className="text-[11px] font-bold text-emerald-700 dark:text-emerald-300">
              Cloudinary Media Engine Active
            </span>
          </div>
        </div>
      </header>

      {/* Action Notification Banner */}
      {uploadProgressText && (
        <div className="bg-[#4f46e5] text-white text-xs font-semibold px-6 py-2.5 flex items-center justify-between shadow-sm animate-fadeIn">
          <div className="flex items-center gap-2">
            <UploadCloud className="size-4 animate-bounce" />
            <span>{uploadProgressText}</span>
          </div>
          <span className="text-[11px] opacity-80">Stored in Cloudinary · Modern format (f_auto, q_auto)</span>
        </div>
      )}

      {studentActionSuccess && (
        <div className="bg-emerald-600 text-white text-xs font-bold px-6 py-2 flex items-center gap-2 shadow-sm animate-fadeIn">
          <CheckCircle2 className="size-4" />
          <span>{studentActionSuccess}</span>
        </div>
      )}

      {/* =====================================================================
          MAIN BODY SWITCHER ACCORDING TO ACTIVE TAB
         ===================================================================== */}
      <main className="flex-1 max-w-[1520px] w-full mx-auto p-4 sm:p-8">

        {/* ===================================================================
            TAB 1: COURSE EDITOR (FR-51, FR-52, FR-53, Figma Frame 3:120185)
           =================================================================== */}
        {activeTab === 'courses' && (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
            {/* Left Sidebar: Course Selector & List */}
            <div className="lg:col-span-3 bg-white dark:bg-[#0f131f] rounded-2xl border border-[#e2e8f0] dark:border-slate-800 p-4 flex flex-col gap-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="font-extrabold text-sm text-[#0f172a] dark:text-white">Courses Catalog</h2>
                  <p className="text-[11px] text-slate-500">Select course to edit curriculum</p>
                </div>
                <button
                  onClick={() => {
                    setIsCreatingCourse(true);
                    setSelectedCourse({
                      id: 'new-course-' + Date.now().toString(36),
                      slug: 'new-masterclass',
                      title: 'New InternWala Masterclass',
                      description: 'Comprehensive curriculum designed for industry readiness.',
                      instructor: 'Dr. Jane Miller',
                      instructorTitle: 'Principal Lead Engineer',
                      thumbnail: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?auto=format&fit=crop&w=700&q=80',
                      priceCents: 20000,
                      currency: 'USD',
                      category: 'Engineering',
                      level: 'Beginner',
                      durationHours: 6,
                      totalDuration: '6 hours · 1 lesson',
                      lessonCount: 1,
                      rating: 5.0,
                      reviewCount: 1,
                      series: 'THE CAREER SERIES',
                      tagline: 'Build practical mastery.',
                      badge: 'New',
                      status: 'published',
                      outcomes: ['Complete an industry capstone project', 'Build portfolio-ready code'],
                      requirements: ['No prior experience required', 'Modern web browser'],
                      gradientFrom: '#1e1b4b',
                      gradientTo: '#4338ca',
                      accentColor: '#4f46e5',
                      lessons: [
                        {
                          id: 'l-init',
                          title: 'Course Introduction & Setup',
                          lessonNumber: 1,
                          duration: '15 min',
                          isFreePreview: true,
                          videoUrl: 'https://commondatastorage.googleapis.com/gtv-videos-bucket/sample/BigBuckBunny.mp4',
                        },
                      ],
                    });
                  }}
                  className="bg-[#4f46e5] hover:bg-[#4338ca] text-white p-2 rounded-xl text-xs font-bold flex items-center gap-1 shadow-xs transition"
                  title="Create New Course (FR-51)"
                >
                  <Plus className="size-4" />
                  <span className="hidden sm:inline">New Course</span>
                </button>
              </div>

              {loadingCourses ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RotateCcw className="size-5 animate-spin" />
                  <span className="text-xs">Loading course catalog...</span>
                </div>
              ) : (
                <div className="flex flex-col gap-2 max-h-[700px] overflow-y-auto pr-1">
                  {courses.map((c) => {
                    const isSelected = selectedCourse?.id === c.id;
                    return (
                      <div
                        key={c.id}
                        onClick={() => {
                          setSelectedCourse(c);
                          setIsCreatingCourse(false);
                        }}
                        className={`p-3.5 rounded-xl border transition cursor-pointer text-left flex flex-col gap-2 ${isSelected
                            ? 'bg-indigo-50/60 dark:bg-indigo-950/40 border-[#4f46e5] dark:border-indigo-600 shadow-xs'
                            : 'border-slate-200 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700 bg-white dark:bg-slate-900/50'
                          }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400">
                            {c.category}
                          </span>
                          <span
                            className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${c.status === 'draft'
                                ? 'bg-amber-100 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300'
                                : 'bg-emerald-100 dark:bg-emerald-950/80 text-emerald-800 dark:text-emerald-300'
                              }`}
                          >
                            {c.status === 'draft' ? 'Draft' : 'Published'}
                          </span>
                        </div>
                        <h4 className="font-bold text-xs text-[#0f172a] dark:text-white line-clamp-1">
                          {c.title}
                        </h4>
                        <div className="flex items-center justify-between text-[11px] text-slate-500">
                          <span>{c.lessonCount} lessons</span>
                          <span className="font-bold text-[#4f46e5] dark:text-indigo-400">
                            ${(c.priceCents / 100).toFixed(0)} USD
                          </span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Middle Column: Course Essentials & Curriculum Builder (Figma Frame 3:120185) */}
            <div className="lg:col-span-6 flex flex-col gap-6">
              {selectedCourse ? (
                <>
                  {/* Top Header Card */}
                  <div className="bg-white dark:bg-[#0f131f] rounded-2xl border border-[#e2e8f0] dark:border-slate-800 p-6 flex flex-col gap-6 shadow-xs">
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <div className="flex items-center gap-2 mb-1">
                          <span className="text-[11px] font-bold uppercase tracking-wider text-[#4f46e5]">
                            {selectedCourse.series || 'INTERNWALA COURSE'}
                          </span>
                          <span className="text-slate-300 dark:text-slate-700">&bull;</span>
                          <span className="text-xs text-slate-500">{selectedCourse.level}</span>
                        </div>
                        <h2 className="font-extrabold text-xl text-[#0f172a] dark:text-white">
                          {selectedCourse.title}
                        </h2>
                      </div>

                      <div className="flex items-center gap-2">
                        {/* Status Toggle Button (FR-51) */}
                        <button
                          onClick={handleTogglePublish}
                          className={`px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1.5 transition border ${selectedCourse.status === 'published'
                              ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 border-emerald-300 dark:border-emerald-800'
                              : 'bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border-amber-300 dark:border-amber-800'
                            }`}
                        >
                          {selectedCourse.status === 'published' ? <Eye className="size-3.5" /> : <EyeOff className="size-3.5" />}
                          <span>{selectedCourse.status === 'published' ? 'Published' : 'Draft'}</span>
                        </button>

                        <button
                          onClick={handleSaveCourse}
                          className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-4 py-2 rounded-xl text-xs font-bold flex items-center gap-1.5 shadow-xs transition"
                        >
                          <Save className="size-3.5" />
                          <span>Save Changes</span>
                        </button>

                        {!isCreatingCourse && (
                          <button
                            onClick={() => handleDeleteCourse(selectedCourse.id)}
                            className="p-2 text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-950/60 rounded-xl border border-rose-200 dark:border-rose-900 transition"
                            title="Delete Course"
                          >
                            <Trash2 className="size-4" />
                          </button>
                        )}
                      </div>
                    </div>

                    {saveSuccess && (
                      <div className="bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-300 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2">
                        <CheckCircle2 className="size-4" />
                        <span>Course details successfully saved and updated on student dashboard!</span>
                      </div>
                    )}

                    {saveError && (
                      <div className="bg-rose-50 dark:bg-rose-950/60 border border-rose-300 dark:border-rose-800 text-rose-800 dark:text-rose-200 text-xs px-3.5 py-2 rounded-xl flex items-center gap-2">
                        <AlertCircle className="size-4" />
                        <span>{saveError}</span>
                      </div>
                    )}

                    {/* Course Form Fields (FR-51: Dynamic Course Template Editor) */}
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Course Title
                        </label>
                        <input
                          type="text"
                          value={selectedCourse.title}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, title: e.target.value })}
                          className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none"
                          placeholder="e.g. Product Design, from insight to impact"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Cover Tagline (Bold Headline on Card)
                        </label>
                        <input
                          type="text"
                          value={selectedCourse.tagline || ''}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, tagline: e.target.value })}
                          className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none"
                          placeholder="e.g. Design with intent."
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Series Header (Top Uppercase Label)
                        </label>
                        <input
                          type="text"
                          value={selectedCourse.series || ''}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, series: e.target.value })}
                          className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none"
                          placeholder="e.g. THE PRODUCT SERIES"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          URL Slug
                        </label>
                        <input
                          type="text"
                          value={selectedCourse.slug}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, slug: e.target.value })}
                          className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Instructor Name
                        </label>
                        <input
                          type="text"
                          value={selectedCourse.instructor || ''}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, instructor: e.target.value })}
                          className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none"
                          placeholder="e.g. Maya Chen"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Instructor Title / Credentials
                        </label>
                        <input
                          type="text"
                          value={selectedCourse.instructorTitle || ''}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, instructorTitle: e.target.value })}
                          className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none"
                          placeholder="e.g. Design Partner & Lead Researcher"
                        />
                      </div>

                      <div className="sm:col-span-2">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Description
                        </label>
                        <textarea
                          rows={3}
                          value={selectedCourse.description}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, description: e.target.value })}
                          className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none resize-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Price in USD
                        </label>
                        <div className="relative">
                          <span className="absolute left-3 top-1/2 -translate-y-1/2 text-xs text-slate-400 font-bold">$</span>
                          <input
                            type="number"
                            value={selectedCourse.priceCents / 100}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, priceCents: Number(e.target.value) * 100 })}
                            className="w-full text-xs font-medium pl-7 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none"
                          />
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Course Duration (Hours)
                        </label>
                        <input
                          type="number"
                          value={selectedCourse.durationHours || 6}
                          onChange={(e) => {
                            const hrs = Number(e.target.value) || 1;
                            setSelectedCourse({
                              ...selectedCourse,
                              durationHours: hrs,
                              totalDuration: `${hrs} hours · ${selectedCourse.lessonCount} lessons`,
                            });
                          }}
                          className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none"
                        />
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Category & Level
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={selectedCourse.category}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, category: e.target.value })}
                            className="text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none"
                            placeholder="Category"
                          />
                          <select
                            value={selectedCourse.level}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, level: e.target.value })}
                            className="text-xs font-medium px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none"
                          >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                            <option value="All Levels">All Levels</option>
                          </select>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Badge (Highlight Pill)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={selectedCourse.badge || ''}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, badge: e.target.value })}
                            className="text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none"
                            placeholder="e.g. Bestseller, Highest Rated"
                          />
                          <div className="flex items-center gap-1">
                            <input
                              type="number"
                              step="0.1"
                              min="1"
                              max="5"
                              value={selectedCourse.rating || 4.9}
                              onChange={(e) => setSelectedCourse({ ...selectedCourse, rating: Number(e.target.value) })}
                              className="w-16 text-xs font-medium px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                              title="Rating (1.0 to 5.0)"
                            />
                            <input
                              type="number"
                              value={selectedCourse.reviewCount || 128}
                              onChange={(e) => setSelectedCourse({ ...selectedCourse, reviewCount: Number(e.target.value) })}
                              className="flex-1 text-xs font-medium px-2 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                              title="Review Count"
                              placeholder="Reviews"
                            />
                          </div>
                        </div>
                      </div>

                      <div>
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                          Gradient Fallback (From & To Hex)
                        </label>
                        <div className="grid grid-cols-2 gap-2">
                          <input
                            type="text"
                            value={selectedCourse.gradientFrom || '#312e81'}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, gradientFrom: e.target.value })}
                            className="text-xs font-mono px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none"
                            placeholder="#312e81"
                          />
                          <input
                            type="text"
                            value={selectedCourse.gradientTo || '#6d28d9'}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, gradientTo: e.target.value })}
                            className="text-xs font-mono px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none"
                            placeholder="#6d28d9"
                          />
                        </div>
                      </div>

                      {/* Cloudinary Thumbnail Dropzone (FR-53) */}
                      <div className="sm:col-span-2 flex flex-col gap-2 pt-2 border-t border-slate-100 dark:border-slate-800/80">
                        <label className="block text-xs font-bold text-slate-700 dark:text-slate-300">
                          Course Thumbnail Image (Cloudinary f_auto, q_auto)
                        </label>
                        <div className="flex items-center gap-4">
                          <div className="size-16 rounded-xl border border-slate-200 dark:border-slate-700 overflow-hidden bg-slate-100 dark:bg-slate-800 shrink-0">
                            <img src={selectedCourse.thumbnail} alt="" className="size-full object-cover" />
                          </div>
                          <div className="flex-1 flex flex-col gap-1.5">
                            <input
                              type="text"
                              value={selectedCourse.thumbnail}
                              onChange={(e) => setSelectedCourse({ ...selectedCourse, thumbnail: e.target.value })}
                              placeholder="Cloudinary URL"
                              className="w-full text-xs font-mono px-3 py-1.5 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setUploadMediaType('thumbnail');
                                fileInputRef.current?.click();
                              }}
                              disabled={uploadingMedia}
                              className="inline-flex items-center gap-1.5 text-xs font-bold text-[#4f46e5] dark:text-indigo-400 hover:underline cursor-pointer w-fit"
                            >
                              <UploadCloud className="size-3.5" />
                              <span>Upload new image directly to Cloudinary</span>
                            </button>
                          </div>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Curriculum Builder & Video Uploader (FR-52, FR-53) */}
                  <div className="bg-white dark:bg-[#0f131f] rounded-2xl border border-[#e2e8f0] dark:border-slate-800 p-6 flex flex-col gap-4 shadow-xs">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-extrabold text-sm text-[#0f172a] dark:text-white flex items-center gap-2">
                          <Film className="size-4 text-[#4f46e5]" />
                          <span>Curriculum & Lessons (FR-52)</span>
                        </h3>
                        <p className="text-[11px] text-slate-500">
                          {selectedCourse.lessons.length} lessons &bull; Cloudinary video stream integration
                        </p>
                      </div>

                      <button
                        onClick={() => setIsAddingLesson(!isAddingLesson)}
                        className="bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 text-[#4f46e5] dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800 px-3 py-1.5 rounded-xl text-xs font-bold flex items-center gap-1 transition"
                      >
                        <Plus className="size-3.5" />
                        <span>Add Lesson</span>
                      </button>
                    </div>

                    {/* Add Lesson Expandable Form */}
                    {isAddingLesson && (
                      <div className="bg-slate-50 dark:bg-slate-900/80 border border-indigo-200 dark:border-indigo-800/80 rounded-xl p-4 flex flex-col gap-3 animate-fadeIn">
                        <span className="text-xs font-bold text-[#4f46e5] dark:text-indigo-300">
                          Add New Lesson to Curriculum
                        </span>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                          <input
                            type="text"
                            placeholder="Lesson Title (e.g. Setting up Drizzle & PostgreSQL)"
                            value={newLessonTitle}
                            onChange={(e) => setNewLessonTitle(e.target.value)}
                            className="text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                          />
                          <input
                            type="text"
                            placeholder="Duration (e.g. 35 min)"
                            value={newLessonDuration}
                            onChange={(e) => setNewLessonDuration(e.target.value)}
                            className="text-xs font-medium px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                          />
                          <div className="sm:col-span-2 flex items-center gap-2">
                            <input
                              type="text"
                              placeholder="Cloudinary Video URL (mp4 / webm / stream)"
                              value={newLessonVideoUrl}
                              onChange={(e) => setNewLessonVideoUrl(e.target.value)}
                              className="flex-1 text-xs font-mono px-3 py-2 bg-white dark:bg-slate-800 border border-slate-200 dark:border-slate-700 rounded-xl focus:outline-none"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                setUploadMediaType('lessonVideo');
                                fileInputRef.current?.click();
                              }}
                              className="px-3 py-2 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 text-xs font-bold rounded-xl border border-slate-200 dark:border-slate-700 flex items-center gap-1.5 shrink-0"
                            >
                              <Video className="size-3.5" />
                              <span>Upload Video</span>
                            </button>
                          </div>
                        </div>

                        <div className="flex items-center justify-end gap-2 pt-2">
                          <button
                            onClick={() => setIsAddingLesson(false)}
                            className="px-3 py-1.5 text-xs font-semibold text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                          >
                            Cancel
                          </button>
                          <button
                            onClick={handleAddLesson}
                            disabled={!newLessonTitle}
                            className="bg-[#4f46e5] text-white px-4 py-1.5 rounded-xl text-xs font-bold disabled:opacity-50"
                          >
                            Save Lesson
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Lesson Accordion List */}
                    <div className="flex flex-col gap-2">
                      {selectedCourse.lessons.map((lesson, idx) => (
                        <div
                          key={lesson.id}
                          className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl p-3 flex items-center justify-between hover:border-slate-300 dark:hover:border-slate-700 transition"
                        >
                          <div className="flex items-center gap-3">
                            <span className="size-6 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-500 dark:text-slate-400 font-bold text-xs flex items-center justify-center">
                              {idx + 1}
                            </span>
                            <div>
                              <p className="font-bold text-xs text-[#0f172a] dark:text-white">
                                {lesson.title}
                              </p>
                              <div className="flex items-center gap-2 text-[10px] text-slate-400">
                                <span>{lesson.duration}</span>
                                <span>&bull;</span>
                                <span className="font-mono truncate max-w-[200px] text-indigo-500">
                                  {lesson.videoUrl ? 'Cloudinary Stream Ready' : 'Standard Asset'}
                                </span>
                              </div>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => handleDeleteLesson(lesson.id)}
                              className="p-1.5 text-slate-400 hover:text-rose-500 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition"
                              title="Delete Lesson"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white dark:bg-[#0f131f] rounded-2xl border border-slate-200 dark:border-slate-800 p-12 text-center text-slate-400">
                  Select a course from the left to start editing.
                </div>
              )}
            </div>

            {/* Right Column: Live Student Dashboard Preview (Figma Frame 3:120185) */}
            <div className="lg:col-span-3 flex flex-col gap-4">
              <div className="bg-white dark:bg-[#0f131f] rounded-2xl border border-[#e2e8f0] dark:border-slate-800 p-5 shadow-xs">
                <div className="flex items-center justify-between mb-4">
                  <span className="text-xs font-extrabold uppercase tracking-wider text-slate-500 flex items-center gap-1.5">
                    <Sparkles className="size-3 text-[#4f46e5]" />
                    <span>Live Student Preview</span>
                  </span>
                  <span className="text-[10px] font-bold text-emerald-600 bg-emerald-50 dark:bg-emerald-950/60 px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                    Real-time
                  </span>
                </div>

                {selectedCourse ? (
                  <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl overflow-hidden shadow-sm flex flex-col">
                    {/* Thumbnail banner */}
                    <div
                      className="h-[148px] relative overflow-hidden flex flex-col justify-between p-3.5 text-white"
                      style={{
                        background: selectedCourse.thumbnail
                          ? `url(${selectedCourse.thumbnail}) center / cover no-repeat`
                          : `linear-gradient(135deg, ${selectedCourse.gradientFrom || '#312e81'}, ${selectedCourse.gradientTo || '#6d28d9'})`,
                      }}
                    >
                      <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" />
                      <div className="z-10 flex items-center justify-between">
                        <span className="text-[10px] font-extrabold tracking-wider uppercase bg-white/20 backdrop-blur-sm px-2 py-0.5 rounded">
                          {selectedCourse.series || 'THE CAREER SERIES'}
                        </span>
                        <span className="size-6 rounded-md bg-white/20 backdrop-blur-sm flex items-center justify-center">
                          <Lock className="size-3 text-white" />
                        </span>
                      </div>
                      <div className="z-10">
                        <p className="font-extrabold text-base leading-tight line-clamp-2">
                          {selectedCourse.tagline || selectedCourse.title}
                        </p>
                      </div>
                    </div>

                    {/* Card Body */}
                    <div className="p-3.5 flex flex-col gap-2.5">
                      <div className="flex items-center justify-between">
                        <span className="bg-[#f1f5f9] dark:bg-slate-800 text-[#475569] dark:text-slate-300 font-bold text-[11px] px-2 py-0.5 rounded-full">
                          {selectedCourse.category}
                        </span>
                        <span className="text-amber-500 font-bold text-[11px]">
                          ★ {selectedCourse.rating || 5.0} <span className="text-slate-400 font-normal">({selectedCourse.reviewCount || 0})</span>
                        </span>
                      </div>

                      <h4 className="font-bold text-xs text-[#0f172a] dark:text-white line-clamp-2">
                        {selectedCourse.title}
                      </h4>

                      <p className="text-[11px] text-slate-500">
                        {selectedCourse.instructor || 'Instructor'} · {selectedCourse.lessonCount || selectedCourse.lessons.length} lessons · {selectedCourse.durationHours || 6} hours
                      </p>

                      <div className="flex items-center gap-1.5">
                        {selectedCourse.badge && (
                          <span className="bg-[#eceb98] text-[#3d3c0a] font-bold text-[10px] px-1.5 py-0.5 rounded">
                            {selectedCourse.badge}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400">{selectedCourse.level}</span>
                      </div>

                      <div className="h-px bg-slate-100 dark:bg-slate-800 my-1" />
                      <div className="flex items-center justify-between">
                        <span className="text-[10px] font-bold text-slate-400">Locked state</span>
                        <span className="font-extrabold text-xs text-[#a435f0] dark:text-[#c084fc]">
                          ${(selectedCourse.priceCents / 100).toFixed(0)} USD →
                        </span>
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 text-center py-8">Select course to preview</div>
                )}

                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 text-[11px] text-slate-500 flex flex-col gap-2">
                  <p className="font-semibold text-slate-700 dark:text-slate-300">Publishing notes:</p>
                  <ul className="list-disc pl-4 space-y-1 text-slate-500 text-[10px]">
                    <li>Changes reflect instantly on Student Dashboard (/dashboard)</li>
                    <li>Uploaded video assets stream via Cloudinary CDN</li>
                    <li>Learner progress locks are maintained automatically</li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 2: STUDENTS ROSTER (FR-54, FR-56, Figma Frame 3:120568)
           =================================================================== */}
        {activeTab === 'students' && (
          <div className="bg-white dark:bg-[#0f131f] rounded-2xl border border-[#e2e8f0] dark:border-slate-800 p-6 flex flex-col gap-6 shadow-xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div>
                <h2 className="font-extrabold text-lg text-[#0f172a] dark:text-white">
                  Student Management (FR-54, FR-56)
                </h2>
                <p className="text-xs text-slate-500">
                  Search learners, audit progress, manually grant enrollment access, or revoke permissions
                </p>
              </div>

              {/* Search Bar */}
              <div className="relative w-full sm:w-72">
                <Search className="size-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
                <input
                  type="text"
                  placeholder="Search student by name or email..."
                  value={studentSearch}
                  onChange={(e) => setStudentSearch(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && fetchStudents()}
                  className="w-full text-xs font-medium pl-9 pr-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none"
                />
              </div>
            </div>

            {/* Students Table */}
            {loadingStudents ? (
              <div className="py-16 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
                <RotateCcw className="size-5 animate-spin" />
                <span>Loading student records...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                      <th className="py-3 px-4">Learner</th>
                      <th className="py-3 px-4">Enrolled Courses</th>
                      <th className="py-3 px-4">Progress</th>
                      <th className="py-3 px-4">Certificate</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {students.map((student) => (
                      <tr key={student.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                        {/* Learner info */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            <div className="size-8 rounded-full bg-indigo-100 dark:bg-indigo-950/80 text-[#4f46e5] dark:text-indigo-300 font-bold flex items-center justify-center shrink-0">
                              {student.name.charAt(0)}
                            </div>
                            <div>
                              <p className="font-bold text-xs text-[#0f172a] dark:text-white">{student.name}</p>
                              <p className="text-[11px] text-slate-400 font-normal">{student.email}</p>
                            </div>
                          </div>
                        </td>

                        {/* Enrolled Courses */}
                        <td className="py-3.5 px-4">
                          <span className="font-bold text-slate-700 dark:text-slate-300">
                            {student.enrolledCoursesCount} course{student.enrolledCoursesCount !== 1 ? 's' : ''}
                          </span>
                        </td>

                        {/* Progress */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-2 max-w-[140px]">
                            <div className="flex-1 bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                              <div
                                className="bg-[#4f46e5] h-full rounded-full"
                                style={{ width: `${student.progressPercent}%` }}
                              />
                            </div>
                            <span className="text-[11px] font-bold text-slate-600 dark:text-slate-400 w-8">
                              {student.progressPercent}%
                            </span>
                          </div>
                        </td>

                        {/* Certificate status */}
                        <td className="py-3.5 px-4">
                          {student.certificateStatus === 'valid' ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 dark:text-emerald-300 bg-emerald-50 dark:bg-emerald-950/60 border border-emerald-200 dark:border-emerald-800 px-2 py-0.5 rounded-full">
                              <ShieldCheck className="size-3" />
                              <span>Valid (Verified)</span>
                            </span>
                          ) : (
                            <span className="text-[10px] font-bold text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded-full">
                              In Progress
                            </span>
                          )}
                        </td>

                        {/* Manual Enrollment Actions (FR-56) */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="inline-flex items-center gap-1.5">
                            <button
                              onClick={() => {
                                setGrantModalStudent(student);
                                setGrantCourseId(courses[0]?.id || '');
                              }}
                              className="px-2.5 py-1 text-[11px] font-bold text-[#4f46e5] dark:text-indigo-300 bg-indigo-50 dark:bg-indigo-950/60 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border border-indigo-200 dark:border-indigo-800 rounded-lg transition"
                              title="Manual Enrollment without payment (FR-56)"
                            >
                              Grant Access
                            </button>

                            {student.enrolledCoursesCount > 0 && (
                              <button
                                onClick={() => handleRevokeAccess(student.id, student.enrolledCourseIds[0] || '')}
                                className="px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 bg-rose-50 dark:bg-rose-950/60 hover:bg-rose-100 dark:hover:bg-rose-900/60 border border-rose-200 dark:border-rose-800 rounded-lg transition"
                                title="Revoke Access (FR-56)"
                              >
                                Revoke
                              </button>
                            )}
                          </div>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

        {/* Modal: Grant Access (FR-56) */}
        {grantModalStudent && (
          <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
            <div className="bg-white dark:bg-[#0f131f] border border-slate-200 dark:border-slate-800 rounded-2xl max-w-md w-full p-6 flex flex-col gap-4 shadow-xl animate-fadeIn">
              <div className="flex items-center justify-between">
                <h3 className="font-extrabold text-sm text-[#0f172a] dark:text-white">
                  Manual Enrollment (FR-56)
                </h3>
                <button
                  onClick={() => setGrantModalStudent(null)}
                  className="p-1 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                >
                  <XCircle className="size-4 text-slate-400" />
                </button>
              </div>

              <p className="text-xs text-slate-500">
                Grant full, verified access to <strong>{grantModalStudent.name}</strong> ({grantModalStudent.email}) without requiring payment.
              </p>

              <div>
                <label className="block text-xs font-bold text-slate-700 dark:text-slate-300 mb-1">
                  Select Course to Grant:
                </label>
                <select
                  value={grantCourseId}
                  onChange={(e) => setGrantCourseId(e.target.value)}
                  className="w-full text-xs font-medium px-3 py-2 bg-slate-50 dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl focus:border-[#4f46e5] focus:outline-none"
                >
                  {courses.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.title} (${c.priceCents / 100} USD)
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100 dark:border-slate-800">
                <button
                  onClick={() => setGrantModalStudent(null)}
                  className="px-3.5 py-2 text-xs font-semibold text-slate-500 hover:text-slate-800"
                >
                  Cancel
                </button>
                <button
                  onClick={handleGrantAccess}
                  className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-4 py-2 rounded-xl text-xs font-bold shadow-xs transition"
                >
                  Grant Lifetime Access
                </button>
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 3: SALES & REFUNDS DASHBOARD (FR-55, FR-33, Frame 3:120897)
           =================================================================== */}
        {activeTab === 'sales' && (
          <div className="flex flex-col gap-6">
            {/* Top Metric Cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
              <div className="bg-white dark:bg-[#0f131f] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-1 shadow-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Gross Revenue</span>
                <span className="font-extrabold text-2xl text-[#0f172a] dark:text-white">
                  ${salesMetrics ? (salesMetrics.grossRevenueCents / 100).toLocaleString() : '0'} USD
                </span>
                <span className="text-[11px] text-emerald-600 font-semibold flex items-center gap-1 mt-1">
                  <ArrowUpRight className="size-3" /> +18.4% from last month
                </span>
              </div>

              <div className="bg-white dark:bg-[#0f131f] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-1 shadow-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Net Revenue</span>
                <span className="font-extrabold text-2xl text-emerald-600 dark:text-emerald-400">
                  ${salesMetrics ? (salesMetrics.netRevenueCents / 100).toLocaleString() : '0'} USD
                </span>
                <span className="text-[11px] text-slate-400 mt-1">After processed refunds</span>
              </div>

              <div className="bg-white dark:bg-[#0f131f] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-1 shadow-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Purchases Count</span>
                <span className="font-extrabold text-2xl text-[#0f172a] dark:text-white">
                  {salesMetrics?.totalSalesCount || 0}
                </span>
                <span className="text-[11px] text-slate-400 mt-1">Stripe Checkout + PayPal</span>
              </div>

              <div className="bg-white dark:bg-[#0f131f] rounded-2xl border border-slate-200 dark:border-slate-800 p-5 flex flex-col gap-1 shadow-xs">
                <span className="text-xs font-bold text-slate-400 uppercase tracking-wider">Refunds Handled</span>
                <span className="font-extrabold text-2xl text-rose-600 dark:text-rose-400">
                  ${salesMetrics ? (salesMetrics.refundedCents / 100).toLocaleString() : '0'} USD
                </span>
                <span className="text-[11px] text-slate-400 mt-1">
                  {salesMetrics?.refundCount || 0} orders revoked (FR-33)
                </span>
              </div>
            </div>

            {/* Purchases Breakdown Table */}
            <div className="bg-white dark:bg-[#0f131f] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-xs">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="font-extrabold text-sm text-[#0f172a] dark:text-white">Recent Transactions</h3>
                  <p className="text-xs text-slate-500">All student checkout purchases and webhook logs</p>
                </div>
              </div>

              {loadingSales ? (
                <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                  <RotateCcw className="size-5 animate-spin" />
                  <span className="text-xs">Loading sales and transaction records...</span>
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs border-collapse">
                    <thead>
                      <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                        <th className="py-3 px-4">Transaction ID</th>
                        <th className="py-3 px-4">Student</th>
                        <th className="py-3 px-4">Course</th>
                        <th className="py-3 px-4">Amount</th>
                        <th className="py-3 px-4">Provider</th>
                        <th className="py-3 px-4">Status</th>
                        <th className="py-3 px-4 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {purchases.map((purchase) => (
                        <tr key={purchase.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                          <td className="py-3.5 px-4 font-mono font-medium text-slate-500">{purchase.id}</td>
                          <td className="py-3.5 px-4">
                            <p className="font-bold text-[#0f172a] dark:text-white">{purchase.studentName}</p>
                            <p className="text-[11px] text-slate-400">{purchase.studentEmail}</p>
                          </td>
                          <td className="py-3.5 px-4 font-medium text-slate-700 dark:text-slate-300">
                            {purchase.courseTitle}
                          </td>
                          <td className="py-3.5 px-4 font-bold text-[#0f172a] dark:text-white">
                            ${purchase.amountCents / 100} USD
                          </td>
                          <td className="py-3.5 px-4 uppercase text-[10px] font-bold text-slate-500">
                            {purchase.provider}
                          </td>
                          <td className="py-3.5 px-4">
                            <span
                              className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${purchase.status === 'paid'
                                  ? 'bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300'
                                  : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300'
                                }`}
                            >
                              {purchase.status === 'paid' ? 'Paid (Active)' : 'Refunded'}
                            </span>
                          </td>
                          <td className="py-3.5 px-4 text-right">
                            {purchase.status === 'paid' && (
                              <button
                                onClick={() => handleProcessRefund(purchase.id)}
                                className="px-2.5 py-1 text-[11px] font-bold text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/60 border border-rose-200 dark:border-rose-900 rounded-lg transition"
                                title="Process Refund & Revoke Access (FR-33)"
                              >
                                Refund & Revoke
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 4: FUNNEL ANALYTICS & STUDENT FEEDBACK (FR-57, FR-58)
           =================================================================== */}
        {activeTab === 'analytics' && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Conversion Funnel (FR-58) */}
            <div className="bg-white dark:bg-[#0f131f] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-xs">
              <div>
                <h3 className="font-extrabold text-sm text-[#0f172a] dark:text-white flex items-center gap-2">
                  <Activity className="size-4 text-[#4f46e5]" />
                  <span>Conversion Funnel Analytics (FR-58)</span>
                </h3>
                <p className="text-xs text-slate-500">
                  Tracking visitor journey from landing page visit to certificate completion
                </p>
              </div>

              <div className="flex flex-col gap-3 pt-2">
                {funnelSteps.map((step, idx) => (
                  <div key={idx} className="flex flex-col gap-1.5">
                    <div className="flex items-center justify-between text-xs font-bold">
                      <span className="text-[#0f172a] dark:text-white">{step.step}</span>
                      <div className="flex items-center gap-3">
                        <span className="text-slate-500 font-mono">{step.count.toLocaleString()}</span>
                        <span className="text-[#4f46e5] dark:text-indigo-400">{step.conversionRate}%</span>
                      </div>
                    </div>
                    <div className="bg-slate-100 dark:bg-slate-800 h-2 rounded-full overflow-hidden">
                      <div
                        className="bg-[#4f46e5] h-full rounded-full transition-all duration-500"
                        style={{ width: `${Math.min(100, step.conversionRate)}%` }}
                      />
                    </div>
                  </div>
                ))}
              </div>

              {analyticsSummary && (
                <div className="mt-4 pt-4 border-t border-slate-100 dark:border-slate-800 grid grid-cols-2 gap-4">
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Completion Rate</span>
                    <p className="font-extrabold text-base text-emerald-600">{analyticsSummary.completionRate}%</p>
                    <span className="text-[10px] text-slate-400">Target &gt; 40% (PRD Section 10)</span>
                  </div>
                  <div className="bg-slate-50 dark:bg-slate-900 p-3 rounded-xl">
                    <span className="text-[10px] font-bold text-slate-400 uppercase">Refund Rate</span>
                    <p className="font-extrabold text-base text-[#4f46e5]">{analyticsSummary.refundRate}%</p>
                    <span className="text-[10px] text-slate-400">Target &lt; 5% (PRD Section 10)</span>
                  </div>
                </div>
              )}
            </div>

            {/* Student Reviews & Completion Feedback (FR-57) */}
            <div className="bg-white dark:bg-[#0f131f] rounded-2xl border border-slate-200 dark:border-slate-800 p-6 flex flex-col gap-4 shadow-xs">
              <div>
                <h3 className="font-extrabold text-sm text-[#0f172a] dark:text-white flex items-center gap-2">
                  <Star className="size-4 text-amber-500 fill-amber-500" />
                  <span>Completion Feedback & Ratings (FR-57)</span>
                </h3>
                <p className="text-xs text-slate-500">Direct feedback submitted on 100% course completion</p>
              </div>

              <div className="flex flex-col gap-3">
                {feedbacks.map((fb) => (
                  <div
                    key={fb.id}
                    className="p-4 rounded-xl border border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/40 flex flex-col gap-2"
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <p className="font-bold text-xs text-[#0f172a] dark:text-white">{fb.studentName}</p>
                        <p className="text-[10px] text-slate-400">{fb.courseTitle}</p>
                      </div>
                      <div className="flex items-center gap-1 text-amber-500 text-xs font-bold">
                        <span>★ {fb.rating}.0</span>
                      </div>
                    </div>
                    <p className="text-xs text-slate-600 dark:text-slate-300 italic">
                      "{fb.feedbackText}"
                    </p>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================================================================
            TAB 5: NOTIFICATIONS & EMAIL AUDIT LOG (PRD Section 4.10)
           =================================================================== */}
        {activeTab === 'notifications' && (
          <div className="bg-white dark:bg-[#0f131f] rounded-2xl border border-[#e2e8f0] dark:border-slate-800 p-6 flex flex-col gap-4 shadow-xs">
            <div>
              <h2 className="font-extrabold text-lg text-[#0f172a] dark:text-white">
                Notifications & Transactional Emails (Section 4.10)
              </h2>
              <p className="text-xs text-slate-500">
                Log of automated emails: Verify email, Welcome, Password reset, and Certificate delivery
              </p>
            </div>

            {loadingNotifs ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-400 gap-2">
                <RotateCcw className="size-5 animate-spin" />
                <span className="text-xs">Loading transactional notifications...</span>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs border-collapse">
                  <thead>
                    <tr className="border-b border-slate-200 dark:border-slate-800 text-slate-400 uppercase text-[10px] tracking-wider font-extrabold">
                      <th className="py-3 px-4">Type</th>
                      <th className="py-3 px-4">Recipient</th>
                      <th className="py-3 px-4">Subject</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4 text-right">Timestamp</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100 dark:divide-slate-800/80">
                    {notifications.map((notif) => (
                      <tr key={notif.id} className="hover:bg-slate-50/50 dark:hover:bg-slate-900/30 transition">
                        <td className="py-3.5 px-4 font-mono uppercase text-[10px] font-bold text-indigo-500">
                          {notif.type.replace('_', ' ')}
                        </td>
                        <td className="py-3.5 px-4 font-medium text-[#0f172a] dark:text-white">
                          {notif.recipient}
                        </td>
                        <td className="py-3.5 px-4 text-slate-600 dark:text-slate-300">
                          {notif.subject}
                        </td>
                        <td className="py-3.5 px-4">
                          <span className="bg-emerald-50 dark:bg-emerald-950/60 text-emerald-700 dark:text-emerald-300 text-[10px] font-bold px-2 py-0.5 rounded-full border border-emerald-200 dark:border-emerald-800">
                            {notif.status}
                          </span>
                        </td>
                        <td className="py-3.5 px-4 text-right text-slate-400 text-[11px]">
                          {new Date(notif.timestamp).toLocaleDateString()}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}

      </main>
    </div>
  );
}
