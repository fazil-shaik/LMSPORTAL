import { useState, useEffect } from 'react';
import {
  BookOpen,
  DollarSign,
  BarChart3,
  Plus,
  Trash2,
  Save,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  Eye,
  Video,
  Search,
  Sparkles,
  RotateCcw,
  ArrowLeft,
  FileText,
  Headphones,
  Download,
  Layers,
  Check,
  MoveUp,
  MoveDown,
  X,
  Settings,
} from 'lucide-react';

// -------------------------------------------------------------
// Type Definitions matching PDF Section 2, 3, 4, 5, 6, 8, 11
// -------------------------------------------------------------

export interface QuizOption {
  id: string;
  optionText: string;
  isCorrect: boolean;
  position: number;
}

export interface QuizQuestion {
  id: string;
  type: 'single_choice' | 'multiple_choice' | 'true_false' | 'short_text';
  questionText: string;
  imageUrl?: string;
  explanation: string;
  points: number;
  position: number;
  options: QuizOption[];
  acceptedShortAnswers?: string[];
}

export interface Quiz {
  id: string;
  moduleId: string;
  title: string;
  instructions: string;
  isRequired: boolean;
  passingPercent: number;
  timeLimitMinutes: number;
  attemptsAllowed: number;
  shuffleQuestions: boolean;
  shuffleOptions: boolean;
  showResultsMode: 'score_only' | 'score_and_correct' | 'score_and_explanations';
  unlockNext: boolean;
  poolSize: number;
  status: 'draft' | 'published';
  questions: QuizQuestion[];
}

export interface Lesson {
  id: string;
  moduleId: string;
  title: string;
  description: string;
  type: 'video' | 'audio' | 'article' | 'resource';
  articleBody?: string;
  mediaAssetId?: string;
  mediaUrl?: string;
  videoUrl?: string;
  duration: string;
  durationSeconds: number;
  position: number;
  isFreePreview: boolean;
  isRequired: boolean;
  status: 'draft' | 'published';
  archived: boolean;
  resources?: Array<{ name: string; url: string; size?: string; type?: string }>;
}

export interface ModuleTimeline {
  id: string;
  moduleId: string;
  label: string;
  suggestedDuration: string;
  startOffsetDays: number;
  releaseMode: 'self_paced' | 'scheduled';
  releaseAfterDays: number;
  bufferMinutes: number;
  estimatedStudyTimeMinutes: number;
}

export interface Module {
  id: string;
  courseId: string;
  title: string;
  description: string;
  objectives: string[];
  position: number;
  completionRule: 'all_lessons' | 'all_lessons_plus_quiz';
  unlockRule: 'open' | 'previous_completed' | 'scheduled';
  status: 'draft' | 'published';
  archived: boolean;
  timeline: ModuleTimeline;
  lessons: Lesson[];
  quiz?: Quiz;
}

export interface Course {
  id: string;
  slug: string;
  title: string;
  subtitle: string;
  description: string;
  thumbnail: string;
  banner?: string;
  previewVideo?: string;
  priceCents: number;
  currency: string;
  category: string;
  tags: string[];
  level: 'Beginner' | 'Intermediate' | 'Advanced';
  language: string;
  status: 'draft' | 'published' | 'archived';
  contentVersion: number;
  publishedTime?: string;
  series: string;
  tagline: string;
  instructor: string;
  instructorTitle: string;
  instructorBio: string;
  instructorAvatar: string;
  lastUpdatedDate: string;
  badge?: string;
  rating: number;
  reviewCount: number;
  outcomes: string[];
  requirements: string[];
  whoIsItFor: string[];
  totalDuration: string;
  durationHours: number;
  lessonCount: number;
  moduleCount: number;
  gradientFrom: string;
  gradientTo: string;
  accentColor: string;
  modules: Module[];
}

interface AdminPanelProps {
  onBackToApp: () => void;
  onCourseModified?: () => void;
}

export default function AdminPanel({ onBackToApp, onCourseModified }: AdminPanelProps) {
  // Top Level Navigation Tabs
  const [activeTab, setActiveTab] = useState<'studio' | 'analytics' | 'sales'>('studio');

  // Studio Sub-Tabs for the Selected Course
  const [studioSubTab, setStudioSubTab] = useState<'details' | 'curriculum' | 'quizzes' | 'timeline' | 'media' | 'preview'>('details');

  // Courses state
  const [courses, setCourses] = useState<Course[]>([]);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);
  const [loadingCourses, setLoadingCourses] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  // Status banners
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);
  const [savingChanges, setSavingChanges] = useState(false);

  // Lesson Edit Modal State
  const [editingLesson, setEditingLesson] = useState<{
    lesson: Lesson;
    moduleId: string;
    isNew?: boolean;
  } | null>(null);

  // CSV Import Modal State
  const [csvModalOpen, setCsvModalOpen] = useState(false);
  const [csvText, setCsvText] = useState('');
  const [selectedQuizModuleId, setSelectedQuizModuleId] = useState<string>('');

  // Publish Change Summary Modal State
  const [publishModalOpen, setPublishModalOpen] = useState(false);

  // Cloudinary Upload progress indicator
  const [uploadProgress, setUploadProgress] = useState<{ uploading: boolean; percent: number; field?: string }>({
    uploading: false,
    percent: 0,
  });

  // Analytics state
  const [analyticsData, setAnalyticsData] = useState<any>(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);

  // Sales state
  const [salesList, setSalesList] = useState<any[]>([]);
  const [salesMetrics, setSalesMetrics] = useState<any>(null);

  // 1. Fetch courses list
  const fetchCourses = async () => {
    setLoadingCourses(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/courses', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success && data.courses) {
        setCourses(data.courses);
        if (data.courses.length > 0 && !selectedCourse) {
          setSelectedCourse(data.courses[0]);
          if (data.courses[0].modules?.[0]) {
            setSelectedQuizModuleId(data.courses[0].modules[0].id);
          }
        } else if (selectedCourse) {
          const updated = data.courses.find((c: Course) => c.id === selectedCourse.id);
          if (updated) setSelectedCourse(updated);
        }
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Failed to connect to Admin API.' });
    } finally {
      setLoadingCourses(false);
    }
  };

  useEffect(() => {
    fetchCourses();
  }, []);

  // Fetch Analytics
  const fetchAnalytics = async () => {
    setLoadingAnalytics(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/analytics', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setAnalyticsData(data.analytics);
      }
    } catch {
      // quiet handle
    } finally {
      setLoadingAnalytics(false);
    }
  };

  // Fetch Sales
  const fetchSales = async () => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/sales', {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setSalesList(data.purchases || []);
        setSalesMetrics(data.metrics || null);
      }
    } catch {
      // quiet handle
    }
  };

  useEffect(() => {
    if (activeTab === 'analytics') fetchAnalytics();
    if (activeTab === 'sales') fetchSales();
  }, [activeTab]);

  // Cloudinary Signed Upload Helper
  const handleCloudinaryUpload = async (file: File, field: string, resourceType: 'image' | 'video' | 'raw' = 'image') => {
    setUploadProgress({ uploading: true, percent: 15, field });
    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = async () => {
        const base64 = reader.result as string;
        setUploadProgress({ uploading: true, percent: 45, field });

        const token = localStorage.getItem('token');
        const res = await fetch('/api/admin/upload', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({
            fileData: base64,
            resourceType,
            filename: file.name.replace(/\.[^/.]+$/, ''),
            folder: `lms/courses/${selectedCourse?.slug || 'general'}`,
          }),
        });

        const data = await res.json();
        setUploadProgress({ uploading: true, percent: 100, field });
        setTimeout(() => setUploadProgress({ uploading: false, percent: 0 }), 500);

        if (res.ok && data.success && data.media) {
          if (field === 'thumbnail' && selectedCourse) {
            setSelectedCourse({ ...selectedCourse, thumbnail: data.media.secure_url });
          } else if (field === 'banner' && selectedCourse) {
            setSelectedCourse({ ...selectedCourse, banner: data.media.secure_url });
          } else if (field === 'previewVideo' && selectedCourse) {
            setSelectedCourse({ ...selectedCourse, previewVideo: data.media.secure_url });
          } else if (field === 'lessonMedia' && editingLesson) {
            setEditingLesson({
              ...editingLesson,
              lesson: {
                ...editingLesson.lesson,
                videoUrl: data.media.secure_url,
                mediaUrl: data.media.secure_url,
                mediaAssetId: data.media.public_id,
                durationSeconds: data.media.duration || editingLesson.lesson.durationSeconds,
                duration: data.media.duration
                  ? `${Math.round(data.media.duration / 60)} min`
                  : editingLesson.lesson.duration,
              },
            });
          }
          setStatusMessage({ type: 'success', text: `Uploaded to Cloudinary: ${data.media.public_id}` });
        } else {
          setStatusMessage({ type: 'error', text: data.message || 'Cloudinary upload failed.' });
        }
      };
    } catch {
      setUploadProgress({ uploading: false, percent: 0 });
      setStatusMessage({ type: 'error', text: 'Error preparing file for upload.' });
    }
  };

  // Save Course Overview Details
  const handleSaveCourseDetails = async () => {
    if (!selectedCourse) return;
    setSavingChanges(true);
    setStatusMessage(null);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/courses/${selectedCourse.id}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(selectedCourse),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({ type: 'success', text: 'Course details successfully saved to database.' });
        fetchCourses();
        if (onCourseModified) onCourseModified();
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'Failed to save course.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error saving course.' });
    } finally {
      setSavingChanges(false);
    }
  };

  // Publish Changes (Section 8.3 & 9.1: Bumps contentVersion, applies drafts, stamps publishedTime)
  const handlePublishCourse = async () => {
    if (!selectedCourse) return;
    setSavingChanges(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`/api/admin/courses/${selectedCourse.id}/publish`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok && data.success) {
        setStatusMessage({
          type: 'success',
          text: `🎉 Course published live! Version bumped to v${data.changeSummary?.version}. Students now see updated content automatically.`,
        });
        setPublishModalOpen(false);
        fetchCourses();
        if (onCourseModified) onCourseModified();
      } else {
        setStatusMessage({ type: 'error', text: data.message || 'Failed to publish course.' });
      }
    } catch {
      setStatusMessage({ type: 'error', text: 'Network error publishing course.' });
    } finally {
      setSavingChanges(false);
    }
  };

  // Reset Progress for Student (Section 8.2 & 12.2)
  const handleResetProgress = async (userId: string, courseId: string, type: 'lesson' | 'quiz' | 'course', targetId?: string) => {
    if (!confirm(`Are you sure you want to reset ${type} progress for this student?`)) return;
    try {
      const token = localStorage.getItem('token');
      const res = await fetch('/api/admin/reset-progress', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ userId, courseId, type, targetId }),
      });
      const data = await res.json();
      if (res.ok && data.success) {
        alert(`Successfully reset ${type} for student.`);
        fetchAnalytics();
      } else {
        alert(data.message || 'Reset failed.');
      }
    } catch {
      alert('Error during reset.');
    }
  };

  // Filtered courses
  const filteredCourses = courses.filter(
    (c) => !searchQuery || c.title.toLowerCase().includes(searchQuery.toLowerCase()) || c.category.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="min-h-screen bg-[#070a13] text-white flex flex-col font-sans selection:bg-indigo-600 selection:text-white">
      {/* 1. TOP COMMAND BAR */}
      <header className="border-b border-slate-800 bg-[#0d1222] px-4 sm:px-8 py-3.5 flex items-center justify-between sticky top-0 z-30 shadow-md">
        <div className="flex items-center gap-3">
          <button
            onClick={onBackToApp}
            className="p-2 rounded-xl bg-slate-800/80 hover:bg-slate-700 text-slate-300 hover:text-white transition flex items-center gap-1.5 text-xs font-bold cursor-pointer"
          >
            <ArrowLeft className="size-4" />
            <span className="hidden sm:inline">Exit Studio</span>
          </button>
          <div className="h-5 w-px bg-slate-800" />
          <div className="flex items-center gap-2">
            <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
            <h1 className="font-extrabold text-sm sm:text-base tracking-tight text-white flex items-center gap-2">
              <span>InternWala Admin Studio</span>
              <span className="text-[10px] uppercase font-mono px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-400 border border-indigo-500/30">
                Command Center
              </span>
            </h1>
          </div>
        </div>

        {/* Global Tab Switcher */}
        <div className="flex items-center gap-1 bg-slate-900 border border-slate-800 p-1 rounded-xl">
          <button
            onClick={() => setActiveTab('studio')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'studio' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <Layers className="size-3.5" />
            <span>Curriculum Builder</span>
          </button>

          <button
            onClick={() => setActiveTab('analytics')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'analytics' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <BarChart3 className="size-3.5" />
            <span>Studio Analytics</span>
          </button>

          <button
            onClick={() => setActiveTab('sales')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-bold transition flex items-center gap-1.5 cursor-pointer ${
              activeTab === 'sales' ? 'bg-indigo-600 text-white shadow-xs' : 'text-slate-400 hover:text-white'
            }`}
          >
            <DollarSign className="size-3.5" />
            <span>Orders & Sales</span>
          </button>
        </div>
      </header>

      {/* Notification Toast */}
      {statusMessage && (
        <div
          className={`mx-4 sm:mx-8 mt-3 p-3 rounded-xl border text-xs font-semibold flex items-center justify-between ${
            statusMessage.type === 'success'
              ? 'bg-emerald-950/80 border-emerald-500/40 text-emerald-200'
              : 'bg-rose-950/80 border-rose-500/40 text-rose-200'
          }`}
        >
          <div className="flex items-center gap-2">
            {statusMessage.type === 'success' ? (
              <CheckCircle2 className="size-4 text-emerald-400 shrink-0" />
            ) : (
              <AlertCircle className="size-4 text-rose-400 shrink-0" />
            )}
            <span>{statusMessage.text}</span>
          </div>
          <button onClick={() => setStatusMessage(null)} className="p-1 hover:opacity-75">
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* Upload Progress Bar if active */}
      {uploadProgress.uploading && (
        <div className="mx-4 sm:mx-8 mt-2 p-3 bg-indigo-950/60 border border-indigo-500/40 rounded-xl flex items-center gap-3">
          <UploadCloud className="size-5 text-indigo-400 animate-bounce" />
          <div className="flex-1">
            <div className="flex justify-between text-xs text-indigo-200 mb-1">
              <span>Uploading binary media directly to Cloudinary CDN ({uploadProgress.field})...</span>
              <span>{uploadProgress.percent}%</span>
            </div>
            <div className="w-full bg-slate-800 h-1.5 rounded-full overflow-hidden">
              <div
                className="bg-indigo-500 h-full transition-all duration-300"
                style={{ width: `${uploadProgress.percent}%` }}
              />
            </div>
          </div>
        </div>
      )}

      {/* 2. MAIN WORKSPACE */}
      {activeTab === 'studio' ? (
        <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 overflow-hidden">
          {/* LEFT SIDEBAR: Courses Catalog */}
          <div className="lg:col-span-3 border-r border-slate-800 bg-[#0b0f1a] p-4 flex flex-col gap-4 max-h-[calc(100vh-65px)] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-extrabold text-sm text-white">Course Catalog</h2>
                <p className="text-[11px] text-slate-400">All courses in database</p>
              </div>
              <button
                onClick={async () => {
                  const title = prompt('Enter Course Title:', 'New Masterclass');
                  if (!title) return;
                  const token = localStorage.getItem('token');
                  const res = await fetch('/api/admin/courses', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ title }),
                  });
                  const data = await res.json();
                  if (res.ok && data.success) {
                    fetchCourses();
                    setSelectedCourse(data.course);
                  }
                }}
                className="px-2.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                title="Create New Course"
              >
                <Plus className="size-3.5" />
                <span>New</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="size-3.5 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                placeholder="Search courses..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full bg-slate-900 border border-slate-800 rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-slate-500 focus:outline-none focus:border-indigo-500"
              />
            </div>

            {/* Courses List */}
            {loadingCourses ? (
              <div className="py-12 flex flex-col items-center justify-center text-slate-500 text-xs gap-2">
                <RotateCcw className="size-4 animate-spin" />
                <span>Loading courses...</span>
              </div>
            ) : (
              <div className="flex flex-col gap-2">
                {filteredCourses.map((c) => {
                  const isSelected = selectedCourse?.id === c.id;
                  return (
                    <div
                      key={c.id}
                      onClick={() => {
                        setSelectedCourse(c);
                        if (c.modules?.[0]) setSelectedQuizModuleId(c.modules[0].id);
                      }}
                      className={`p-3 rounded-xl border text-left cursor-pointer transition flex flex-col gap-1.5 ${
                        isSelected
                          ? 'bg-indigo-950/60 border-indigo-500 text-white shadow-xs'
                          : 'bg-slate-900/40 border-slate-800 hover:border-slate-700 text-slate-300'
                      }`}
                    >
                      <div className="flex items-center justify-between text-[10px]">
                        <span className="font-extrabold uppercase text-slate-400">{c.category}</span>
                        <div className="flex items-center gap-1.5">
                          <span className="text-slate-400 font-mono">v{c.contentVersion || 1}</span>
                          <span
                            className={`px-1.5 py-0.5 rounded font-bold uppercase ${
                              c.status === 'published'
                                ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                                : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                            }`}
                          >
                            {c.status}
                          </span>
                        </div>
                      </div>
                      <h4 className="font-bold text-xs line-clamp-1">{c.title}</h4>
                      <div className="flex items-center justify-between text-[11px] text-slate-400">
                        <span>{c.modules?.length || 0} modules · {c.lessonCount} lessons</span>
                        <span className="font-bold text-indigo-400">${(c.priceCents / 100).toFixed(0)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* RIGHT WORKBENCH: Selected Course Details & Builders */}
          {selectedCourse ? (
            <div className="lg:col-span-9 flex flex-col max-h-[calc(100vh-65px)] overflow-y-auto bg-[#070a13]">
              {/* Studio Header Bar for Selected Course */}
              <div className="p-4 sm:p-6 border-b border-slate-800 bg-[#0e1322] flex flex-col sm:flex-row sm:items-center justify-between gap-4 sticky top-0 z-20 shadow-md">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-[10px] font-mono uppercase px-2 py-0.5 rounded bg-indigo-500/20 text-indigo-300 border border-indigo-500/30">
                      Version v{selectedCourse.contentVersion || 1}
                    </span>
                    <span
                      className={`text-[10px] font-bold uppercase px-2 py-0.5 rounded ${
                        selectedCourse.status === 'published'
                          ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/30'
                          : 'bg-amber-500/20 text-amber-300 border border-amber-500/30'
                      }`}
                    >
                      {selectedCourse.status}
                    </span>
                  </div>
                  <h2 className="text-lg sm:text-xl font-extrabold text-white mt-1 line-clamp-1">
                    {selectedCourse.title}
                  </h2>
                </div>

                {/* Main Actions */}
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setStudioSubTab('preview')}
                    className="px-3.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                    title="Preview as enrolled student (Section 8.1)"
                  >
                    <Eye className="size-3.5" />
                    <span>Preview as Student</span>
                  </button>

                  <button
                    onClick={handleSaveCourseDetails}
                    disabled={savingChanges}
                    className="px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer"
                  >
                    <Save className="size-3.5" />
                    <span>Save Draft</span>
                  </button>

                  <button
                    onClick={() => setPublishModalOpen(true)}
                    className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-extrabold transition flex items-center gap-1.5 shadow-lg shadow-emerald-600/20 cursor-pointer"
                    title="Publish changes to students (Section 8.3 & 9.1)"
                  >
                    <Sparkles className="size-3.5" />
                    <span>Publish Changes</span>
                  </button>
                </div>
              </div>

              {/* Sub-Tab Navigation Bar */}
              <div className="border-b border-slate-800 bg-[#0b0f1a] px-4 sm:px-6 flex items-center gap-2 overflow-x-auto scrollbar-none">
                <button
                  onClick={() => setStudioSubTab('details')}
                  className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                    studioSubTab === 'details'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  1. Details Tab (Section 3)
                </button>

                <button
                  onClick={() => setStudioSubTab('curriculum')}
                  className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                    studioSubTab === 'curriculum'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  2. Curriculum & Lessons (Section 4)
                </button>

                <button
                  onClick={() => setStudioSubTab('quizzes')}
                  className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                    studioSubTab === 'quizzes'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  3. Module Quizzes (Section 6)
                </button>

                <button
                  onClick={() => setStudioSubTab('timeline')}
                  className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                    studioSubTab === 'timeline'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  4. Timeline & Drip (Section 5)
                </button>

                <button
                  onClick={() => setStudioSubTab('media')}
                  className={`py-3 px-3 text-xs font-bold border-b-2 transition whitespace-nowrap cursor-pointer ${
                    studioSubTab === 'media'
                      ? 'border-indigo-500 text-indigo-400'
                      : 'border-transparent text-slate-400 hover:text-white'
                  }`}
                >
                  5. Cloudinary Media (Section 10)
                </button>
              </div>

              {/* SUB-TAB CONTENTS */}
              <div className="p-4 sm:p-6 lg:p-8 flex flex-col gap-8">
                {/* -------------------------------------------------------------
                    SUB-TAB 1: DETAILS TAB (PDF Section 3 & 8.1)
                   ------------------------------------------------------------- */}
                {studioSubTab === 'details' && (
                  <div className="flex flex-col gap-6">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                      {/* Course Title */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Course Title *
                        </label>
                        <input
                          type="text"
                          value={selectedCourse.title}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, title: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Subtitle: One-line promise (Section 3) */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Subtitle (One-line promise) *
                        </label>
                        <input
                          type="text"
                          placeholder="e.g. From user research to scalable production design tokens"
                          value={selectedCourse.subtitle || ''}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, subtitle: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Slug */}
                      <div className="flex flex-col gap-1.5">
                        <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                          Unique URL Slug *
                        </label>
                        <input
                          type="text"
                          value={selectedCourse.slug}
                          onChange={(e) => setSelectedCourse({ ...selectedCourse, slug: e.target.value })}
                          className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                        />
                      </div>

                      {/* Category & Level */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Category
                          </label>
                          <select
                            value={selectedCourse.category}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, category: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="Engineering">Engineering</option>
                            <option value="Product design">Product design</option>
                            <option value="Web development">Web development</option>
                            <option value="Product strategy">Product strategy</option>
                          </select>
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Level
                          </label>
                          <select
                            value={selectedCourse.level}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, level: e.target.value as any })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="Beginner">Beginner</option>
                            <option value="Intermediate">Intermediate</option>
                            <option value="Advanced">Advanced</option>
                          </select>
                        </div>
                      </div>

                      {/* Price & Currency */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Price (in cents)
                          </label>
                          <input
                            type="number"
                            value={selectedCourse.priceCents}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, priceCents: Number(e.target.value) })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>

                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Currency
                          </label>
                          <select
                            value={selectedCourse.currency}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, currency: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                          >
                            <option value="USD">USD ($)</option>
                            <option value="INR">INR (₹)</option>
                          </select>
                        </div>
                      </div>

                      {/* Instructor info */}
                      <div className="grid grid-cols-2 gap-4">
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Instructor Name
                          </label>
                          <input
                            type="text"
                            value={selectedCourse.instructor}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, instructor: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                        <div className="flex flex-col gap-1.5">
                          <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                            Instructor Title
                          </label>
                          <input
                            type="text"
                            value={selectedCourse.instructorTitle}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, instructorTitle: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                          />
                        </div>
                      </div>
                    </div>

                    {/* Rich text Description */}
                    <div className="flex flex-col gap-1.5">
                      <label className="text-xs font-bold uppercase tracking-wider text-slate-400">
                        Description (Rich text)
                      </label>
                      <textarea
                        rows={4}
                        value={selectedCourse.description}
                        onChange={(e) => setSelectedCourse({ ...selectedCourse, description: e.target.value })}
                        className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-sm text-white focus:outline-none focus:border-indigo-500"
                      />
                    </div>

                    {/* What you will learn Checklist Editor */}
                    <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col gap-3">
                      <div className="flex items-center justify-between">
                        <h3 className="font-extrabold text-sm text-white">What you will learn (Checklist)</h3>
                        <button
                          onClick={() => {
                            const item = prompt('Add learning outcome:');
                            if (item) {
                              setSelectedCourse({
                                ...selectedCourse,
                                outcomes: [...(selectedCourse.outcomes || []), item],
                              });
                            }
                          }}
                          className="px-2.5 py-1 bg-indigo-600 text-white rounded-lg text-xs font-bold flex items-center gap-1"
                        >
                          <Plus className="size-3" />
                          <span>Add Item</span>
                        </button>
                      </div>

                      <div className="flex flex-col gap-2">
                        {selectedCourse.outcomes?.map((out, idx) => (
                          <div key={idx} className="flex items-center justify-between p-2.5 bg-slate-900 border border-slate-800 rounded-xl text-xs">
                            <span className="flex items-center gap-2">
                              <Check className="size-3.5 text-emerald-400 shrink-0" />
                              <span>{out}</span>
                            </span>
                            <button
                              onClick={() => {
                                const copy = [...selectedCourse.outcomes];
                                copy.splice(idx, 1);
                                setSelectedCourse({ ...selectedCourse, outcomes: copy });
                              }}
                              className="text-slate-500 hover:text-rose-400 p-1"
                            >
                              <Trash2 className="size-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Cloudinary Media References (Section 10.1) */}
                    <div className="p-5 rounded-2xl bg-slate-900/40 border border-slate-800 flex flex-col gap-4">
                      <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                        <UploadCloud className="size-4 text-indigo-400" />
                        <span>Cloudinary Assets (Thumbnail, Banner, Preview Video)</span>
                      </h3>

                      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        {/* Thumbnail */}
                        <div className="flex flex-col gap-2">
                          <label className="text-[11px] font-bold text-slate-400">Course Thumbnail (Cloudinary)</label>
                          <input
                            type="text"
                            value={selectedCourse.thumbnail}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, thumbnail: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                          />
                          <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold text-center transition flex items-center justify-center gap-1.5">
                            <UploadCloud className="size-3.5" />
                            <span>Upload Thumbnail</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleCloudinaryUpload(f, 'thumbnail', 'image');
                              }}
                            />
                          </label>
                        </div>

                        {/* Banner */}
                        <div className="flex flex-col gap-2">
                          <label className="text-[11px] font-bold text-slate-400">Course Banner (Cloudinary)</label>
                          <input
                            type="text"
                            value={selectedCourse.banner || ''}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, banner: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                          />
                          <label className="cursor-pointer px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold text-center transition flex items-center justify-center gap-1.5">
                            <UploadCloud className="size-3.5" />
                            <span>Upload Banner</span>
                            <input
                              type="file"
                              accept="image/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleCloudinaryUpload(f, 'banner', 'image');
                              }}
                            />
                          </label>
                        </div>

                        {/* Preview Video */}
                        <div className="flex flex-col gap-2">
                          <label className="text-[11px] font-bold text-slate-400">Preview Promo Video (Cloudinary)</label>
                          <input
                            type="text"
                            value={selectedCourse.previewVideo || ''}
                            onChange={(e) => setSelectedCourse({ ...selectedCourse, previewVideo: e.target.value })}
                            className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-xs text-white"
                          />
                          <label className="cursor-pointer px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-bold text-center transition flex items-center justify-center gap-1.5">
                            <Video className="size-3.5" />
                            <span>Upload Preview Video</span>
                            <input
                              type="file"
                              accept="video/*"
                              className="hidden"
                              onChange={(e) => {
                                const f = e.target.files?.[0];
                                if (f) handleCloudinaryUpload(f, 'previewVideo', 'video');
                              }}
                            />
                          </label>
                        </div>
                      </div>
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------------
                    SUB-TAB 2: CURRICULUM & LESSON BUILDER (Section 4 & 8.1)
                   ------------------------------------------------------------- */}
                {studioSubTab === 'curriculum' && (
                  <div className="flex flex-col gap-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-extrabold text-base text-white">Curriculum Modules & Lessons</h3>
                        <p className="text-xs text-slate-400">
                          Reorder, duplicate, move lessons between modules, and configure completion criteria
                        </p>
                      </div>

                      <button
                        onClick={async () => {
                          const title = prompt('Module title:');
                          if (!title) return;
                          const token = localStorage.getItem('token');
                          const res = await fetch(`/api/admin/courses/${selectedCourse.id}/modules`, {
                            method: 'POST',
                            headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                            body: JSON.stringify({ title }),
                          });
                          const data = await res.json();
                          if (res.ok && data.success) {
                            fetchCourses();
                          }
                        }}
                        className="px-3.5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5"
                      >
                        <Plus className="size-3.5" />
                        <span>Add Module</span>
                      </button>
                    </div>

                    {/* Modules List */}
                    <div className="flex flex-col gap-6">
                      {selectedCourse.modules?.filter((m) => !m.archived).map((mod, mIdx) => (
                        <div
                          key={mod.id}
                          className="rounded-2xl border border-slate-800 bg-[#0e1322] p-5 flex flex-col gap-4 shadow-sm"
                        >
                          {/* Module Header */}
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-slate-800 pb-4">
                            <div className="flex items-center gap-3">
                              <span className="text-xs font-mono font-bold bg-indigo-500/20 text-indigo-400 px-2.5 py-1 rounded-lg border border-indigo-500/30">
                                {mod.timeline?.label || `Module ${mIdx + 1}`}
                              </span>
                              <input
                                type="text"
                                value={mod.title}
                                onChange={(e) => {
                                  mod.title = e.target.value;
                                  setSelectedCourse({ ...selectedCourse });
                                }}
                                className="bg-transparent font-extrabold text-base text-white focus:outline-none focus:border-b focus:border-indigo-500"
                              />
                            </div>

                            <div className="flex items-center gap-2">
                              {/* Reorder Up/Down */}
                              <button
                                disabled={mIdx === 0}
                                onClick={async () => {
                                  const list = [...selectedCourse.modules];
                                  const temp = list[mIdx];
                                  list[mIdx] = list[mIdx - 1];
                                  list[mIdx - 1] = temp;
                                  const token = localStorage.getItem('token');
                                  await fetch(`/api/admin/courses/${selectedCourse.id}/modules/reorder`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ moduleIds: list.map((m) => m.id) }),
                                  });
                                  fetchCourses();
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
                                title="Move Module Up"
                              >
                                <MoveUp className="size-3.5" />
                              </button>

                              <button
                                disabled={mIdx === selectedCourse.modules.length - 1}
                                onClick={async () => {
                                  const list = [...selectedCourse.modules];
                                  const temp = list[mIdx];
                                  list[mIdx] = list[mIdx + 1];
                                  list[mIdx + 1] = temp;
                                  const token = localStorage.getItem('token');
                                  await fetch(`/api/admin/courses/${selectedCourse.id}/modules/reorder`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ moduleIds: list.map((m) => m.id) }),
                                  });
                                  fetchCourses();
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 disabled:opacity-40 text-slate-300"
                                title="Move Module Down"
                              >
                                <MoveDown className="size-3.5" />
                              </button>

                              {/* Archive module */}
                              <button
                                onClick={async () => {
                                  if (!confirm(`Archive module "${mod.title}"?`)) return;
                                  const token = localStorage.getItem('token');
                                  await fetch(`/api/admin/modules/${mod.id}`, {
                                    method: 'DELETE',
                                    headers: { Authorization: `Bearer ${token}` },
                                  });
                                  fetchCourses();
                                }}
                                className="p-1.5 rounded-lg bg-slate-800 hover:bg-rose-900/60 text-slate-300 hover:text-rose-400"
                                title="Archive Module (Section 9.2)"
                              >
                                <Trash2 className="size-3.5" />
                              </button>
                            </div>
                          </div>

                          {/* Module Settings Row (Completion Rule & Unlock Rule - Section 4) */}
                          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                              <span className="text-slate-400 font-semibold">Completion Rule:</span>
                              <select
                                value={mod.completionRule}
                                onChange={(e) => {
                                  mod.completionRule = e.target.value as any;
                                  setSelectedCourse({ ...selectedCourse });
                                }}
                                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white"
                              >
                                <option value="all_lessons">All lessons only</option>
                                <option value="all_lessons_plus_quiz">All lessons + pass quiz</option>
                              </select>
                            </div>

                            <div className="flex items-center justify-between p-3 rounded-xl bg-slate-900/60 border border-slate-800">
                              <span className="text-slate-400 font-semibold">Unlock Rule:</span>
                              <select
                                value={mod.unlockRule}
                                onChange={(e) => {
                                  mod.unlockRule = e.target.value as any;
                                  setSelectedCourse({ ...selectedCourse });
                                }}
                                className="bg-slate-800 border border-slate-700 rounded-lg px-2 py-1 text-white"
                              >
                                <option value="open">Open immediately</option>
                                <option value="previous_completed">After previous module complete</option>
                                <option value="scheduled">Scheduled drip</option>
                              </select>
                            </div>
                          </div>

                          {/* Lessons inside Module */}
                          <div className="flex flex-col gap-2 pt-2">
                            <div className="flex items-center justify-between">
                              <span className="text-xs font-extrabold text-slate-300 uppercase tracking-wider">
                                Lessons ({mod.lessons?.filter((l) => !l.archived).length || 0})
                              </span>
                              <button
                                onClick={() => {
                                  setEditingLesson({
                                    moduleId: mod.id,
                                    isNew: true,
                                    lesson: {
                                      id: '',
                                      moduleId: mod.id,
                                      title: 'New Lesson',
                                      description: '',
                                      type: 'video',
                                      duration: '15 min',
                                      durationSeconds: 900,
                                      position: mod.lessons.length + 1,
                                      isFreePreview: false,
                                      isRequired: true,
                                      status: 'published',
                                      archived: false,
                                    },
                                  });
                                }}
                                className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                              >
                                <Plus className="size-3" />
                                <span>Add Lesson</span>
                              </button>
                            </div>

                            {mod.lessons?.filter((l) => !l.archived).map((les, lIdx) => (
                              <div
                                key={les.id}
                                className="p-3 rounded-xl border border-slate-800 bg-slate-900/50 flex items-center justify-between gap-3 text-xs"
                              >
                                <div className="flex items-center gap-3 min-w-0">
                                  {les.type === 'article' ? (
                                    <FileText className="size-4 text-amber-400 shrink-0" />
                                  ) : les.type === 'audio' ? (
                                    <Headphones className="size-4 text-purple-400 shrink-0" />
                                  ) : les.type === 'resource' ? (
                                    <Download className="size-4 text-blue-400 shrink-0" />
                                  ) : (
                                    <Video className="size-4 text-indigo-400 shrink-0" />
                                  )}
                                  <div className="min-w-0">
                                    <p className="font-bold text-white truncate">
                                      {lIdx + 1}. {les.title}
                                    </p>
                                    <div className="flex items-center gap-2 text-[10px] text-slate-400 mt-0.5">
                                      <span className="capitalize">{les.type}</span>
                                      <span>·</span>
                                      <span>{les.duration}</span>
                                      {les.isFreePreview && (
                                        <span className="text-purple-400 font-bold bg-purple-950/60 px-1.5 py-0.2 rounded">
                                          Free Preview
                                        </span>
                                      )}
                                      {!les.isRequired && (
                                        <span className="text-amber-400 bg-amber-950/60 px-1.5 py-0.2 rounded">
                                          Optional
                                        </span>
                                      )}
                                    </div>
                                  </div>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <button
                                    onClick={() => setEditingLesson({ moduleId: mod.id, lesson: { ...les } })}
                                    className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-white rounded-lg text-xs font-bold transition"
                                  >
                                    Edit
                                  </button>
                                  <button
                                    onClick={async () => {
                                      if (!confirm(`Archive lesson "${les.title}"?`)) return;
                                      const token = localStorage.getItem('token');
                                      await fetch(`/api/admin/lessons/${les.id}`, {
                                        method: 'DELETE',
                                        headers: { Authorization: `Bearer ${token}` },
                                      });
                                      fetchCourses();
                                    }}
                                    className="p-1 hover:text-rose-400 text-slate-500"
                                  >
                                    <Trash2 className="size-3.5" />
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------------
                    SUB-TAB 3: MODULE QUIZZES BUILDER (Section 6 & 8.1)
                   ------------------------------------------------------------- */}
                {studioSubTab === 'quizzes' && (
                  <div className="flex flex-col gap-6">
                    {/* Module Selector Dropdown */}
                    <div className="p-4 rounded-xl bg-[#0e1322] border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                      <div>
                        <label className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block mb-1">
                          Select Module Quiz to Manage
                        </label>
                        <select
                          value={selectedQuizModuleId}
                          onChange={(e) => setSelectedQuizModuleId(e.target.value)}
                          className="bg-slate-900 border border-slate-700 rounded-xl px-3 py-2 text-sm text-white font-bold"
                        >
                          {selectedCourse.modules?.map((m) => (
                            <option key={m.id} value={m.id}>
                              {m.timeline?.label || 'Module'} - {m.title}
                            </option>
                          ))}
                        </select>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => setCsvModalOpen(true)}
                          className="px-3 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-xl text-xs font-bold flex items-center gap-1.5 cursor-pointer shadow-md shadow-purple-600/20"
                        >
                          <FileText className="size-3.5" />
                          <span>Import Questions from CSV</span>
                        </button>
                      </div>
                    </div>

                    {/* Quiz Settings & Questions Editor */}
                    {(() => {
                      const currentModule = selectedCourse.modules?.find((m) => m.id === selectedQuizModuleId);
                      if (!currentModule) {
                        return <p className="text-slate-400 text-xs">Please select a module above.</p>;
                      }

                      const quiz = currentModule.quiz || {
                        id: 'quiz-' + currentModule.id,
                        moduleId: currentModule.id,
                        title: `${currentModule.title} Assessment`,
                        instructions: 'Test your understanding. 70% required to pass.',
                        isRequired: true,
                        passingPercent: 70,
                        timeLimitMinutes: 15,
                        attemptsAllowed: 3,
                        shuffleQuestions: false,
                        shuffleOptions: false,
                        showResultsMode: 'score_and_correct',
                        unlockNext: true,
                        poolSize: 0,
                        status: 'published',
                        questions: [],
                      };

                      return (
                        <div className="flex flex-col gap-6">
                          {/* Quiz Settings Card (Section 6.1) */}
                          <div className="p-5 rounded-2xl bg-[#0e1322] border border-slate-800 flex flex-col gap-4">
                            <h3 className="font-extrabold text-sm text-white flex items-center gap-2">
                              <Settings className="size-4 text-purple-400" />
                              <span>Quiz Settings (Section 6.1)</span>
                            </h3>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 text-xs">
                              <div className="flex flex-col gap-1.5">
                                <label className="text-slate-400 font-semibold">Quiz Title</label>
                                <input
                                  type="text"
                                  value={quiz.title}
                                  onChange={(e) => {
                                    quiz.title = e.target.value;
                                    currentModule.quiz = quiz;
                                    setSelectedCourse({ ...selectedCourse });
                                  }}
                                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                                />
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="text-slate-400 font-semibold">Passing Score (%)</label>
                                <input
                                  type="number"
                                  value={quiz.passingPercent}
                                  onChange={(e) => {
                                    quiz.passingPercent = Number(e.target.value);
                                    currentModule.quiz = quiz;
                                    setSelectedCourse({ ...selectedCourse });
                                  }}
                                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                                />
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="text-slate-400 font-semibold">Time Limit (Minutes, 0 = None)</label>
                                <input
                                  type="number"
                                  value={quiz.timeLimitMinutes}
                                  onChange={(e) => {
                                    quiz.timeLimitMinutes = Number(e.target.value);
                                    currentModule.quiz = quiz;
                                    setSelectedCourse({ ...selectedCourse });
                                  }}
                                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                                />
                              </div>

                              <div className="flex flex-col gap-1.5">
                                <label className="text-slate-400 font-semibold">Show Results Mode</label>
                                <select
                                  value={quiz.showResultsMode}
                                  onChange={(e) => {
                                    quiz.showResultsMode = e.target.value as any;
                                    currentModule.quiz = quiz;
                                    setSelectedCourse({ ...selectedCourse });
                                  }}
                                  className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-white"
                                >
                                  <option value="score_only">Score only</option>
                                  <option value="score_and_correct">Score and correct answers</option>
                                  <option value="score_and_explanations">Score, answers and explanations</option>
                                </select>
                              </div>

                              <div className="flex items-center gap-2 pt-4">
                                <input
                                  type="checkbox"
                                  id="reqQuiz"
                                  checked={quiz.isRequired}
                                  onChange={(e) => {
                                    quiz.isRequired = e.target.checked;
                                    currentModule.quiz = quiz;
                                    setSelectedCourse({ ...selectedCourse });
                                  }}
                                  className="size-4 rounded accent-purple-600"
                                />
                                <label htmlFor="reqQuiz" className="text-white font-bold cursor-pointer">
                                  Required to complete module
                                </label>
                              </div>

                              <div className="flex items-center gap-2 pt-4">
                                <input
                                  type="checkbox"
                                  id="shuffleQ"
                                  checked={quiz.shuffleQuestions}
                                  onChange={(e) => {
                                    quiz.shuffleQuestions = e.target.checked;
                                    currentModule.quiz = quiz;
                                    setSelectedCourse({ ...selectedCourse });
                                  }}
                                  className="size-4 rounded accent-purple-600"
                                />
                                <label htmlFor="shuffleQ" className="text-white font-bold cursor-pointer">
                                  Shuffle questions
                                </label>
                              </div>
                            </div>
                          </div>

                          {/* Questions List (Section 6.2) */}
                          <div className="flex flex-col gap-4">
                            <div className="flex items-center justify-between">
                              <h3 className="font-extrabold text-sm text-white">
                                Questions ({quiz.questions?.length || 0})
                              </h3>
                              <button
                                onClick={async () => {
                                  const token = localStorage.getItem('token');
                                  const res = await fetch(`/api/admin/quizzes/${quiz.id}/questions`, {
                                    method: 'POST',
                                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                                    body: JSON.stringify({ questionText: 'New Assessment Question' }),
                                  });
                                  const data = await res.json();
                                  if (res.ok && data.success) {
                                    fetchCourses();
                                  }
                                }}
                                className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs font-bold flex items-center gap-1 transition"
                              >
                                <Plus className="size-3.5" />
                                <span>Add Question</span>
                              </button>
                            </div>

                            {quiz.questions?.map((q, qIdx) => (
                              <div
                                key={q.id}
                                className="p-5 rounded-2xl bg-[#0e1322] border border-slate-800 flex flex-col gap-3 text-xs"
                              >
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex-1 flex flex-col gap-1.5">
                                    <div className="flex items-center gap-2">
                                      <span className="font-mono text-purple-400 font-bold">Q{qIdx + 1}.</span>
                                      <input
                                        type="text"
                                        value={q.questionText}
                                        onChange={(e) => {
                                          q.questionText = e.target.value;
                                          setSelectedCourse({ ...selectedCourse });
                                        }}
                                        className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-white font-bold flex-1"
                                      />
                                    </div>
                                    <input
                                      type="text"
                                      placeholder="Explanation shown after submission..."
                                      value={q.explanation || ''}
                                      onChange={(e) => {
                                        q.explanation = e.target.value;
                                        setSelectedCourse({ ...selectedCourse });
                                      }}
                                      className="bg-slate-900 border border-slate-800 rounded-lg p-2 text-slate-300"
                                    />
                                  </div>

                                  <div className="flex items-center gap-2">
                                    <select
                                      value={q.type}
                                      onChange={(e) => {
                                        q.type = e.target.value as any;
                                        setSelectedCourse({ ...selectedCourse });
                                      }}
                                      className="bg-slate-900 border border-slate-800 rounded-lg px-2 py-1 text-white"
                                    >
                                      <option value="single_choice">Single Choice</option>
                                      <option value="multiple_choice">Multiple Choice</option>
                                      <option value="true_false">True / False</option>
                                      <option value="short_text">Short Text</option>
                                    </select>

                                    <button
                                      onClick={async () => {
                                        if (!confirm('Delete question?')) return;
                                        const token = localStorage.getItem('token');
                                        await fetch(`/api/admin/quiz-questions/${q.id}`, {
                                          method: 'DELETE',
                                          headers: { Authorization: `Bearer ${token}` },
                                        });
                                        fetchCourses();
                                      }}
                                      className="p-1 hover:text-rose-400 text-slate-500"
                                    >
                                      <Trash2 className="size-4" />
                                    </button>
                                  </div>
                                </div>

                                {/* Options list */}
                                {q.type !== 'short_text' && (
                                  <div className="flex flex-col gap-2 pt-2 border-t border-slate-800">
                                    <div className="flex items-center justify-between text-slate-400 font-bold text-[11px]">
                                      <span>Options (Select correct radio)</span>
                                      <button
                                        onClick={() => {
                                          q.options.push({
                                            id: crypto.randomUUID(),
                                            optionText: 'New Option',
                                            isCorrect: false,
                                            position: q.options.length + 1,
                                          });
                                          setSelectedCourse({ ...selectedCourse });
                                        }}
                                        className="text-purple-400 hover:underline"
                                      >
                                        + Add Option
                                      </button>
                                    </div>

                                    {q.options?.map((opt, oIdx) => (
                                      <div key={opt.id} className="flex items-center gap-2.5">
                                        <input
                                          type={q.type === 'multiple_choice' ? 'checkbox' : 'radio'}
                                          name={`q-${q.id}`}
                                          checked={opt.isCorrect}
                                          onChange={(e) => {
                                            if (q.type === 'multiple_choice') {
                                              opt.isCorrect = e.target.checked;
                                            } else {
                                              q.options.forEach((o) => (o.isCorrect = o.id === opt.id));
                                            }
                                            setSelectedCourse({ ...selectedCourse });
                                          }}
                                          className="size-4 accent-purple-600"
                                        />
                                        <input
                                          type="text"
                                          value={opt.optionText}
                                          onChange={(e) => {
                                            opt.optionText = e.target.value;
                                            setSelectedCourse({ ...selectedCourse });
                                          }}
                                          className="bg-slate-900 border border-slate-800 rounded-lg p-1.5 text-xs text-white flex-1"
                                        />
                                        <button
                                          onClick={() => {
                                            q.options.splice(oIdx, 1);
                                            setSelectedCourse({ ...selectedCourse });
                                          }}
                                          className="p-1 text-slate-500 hover:text-rose-400"
                                        >
                                          <X className="size-3" />
                                        </button>
                                      </div>
                                    ))}
                                  </div>
                                )}
                              </div>
                            ))}
                          </div>
                        </div>
                      );
                    })()}
                  </div>
                )}

                {/* -------------------------------------------------------------
                    SUB-TAB 4: MODULE TIMELINE & DRIP (PDF Section 5 & 8.1)
                   ------------------------------------------------------------- */}
                {studioSubTab === 'timeline' && (
                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="font-extrabold text-base text-white">Module Timeline & Pacing Master View</h3>
                      <p className="text-xs text-slate-400">
                        Set Week/Phase label, suggested duration, start offset, release mode (Self-paced vs Scheduled drip), and buffer minutes (Section 5)
                      </p>
                    </div>

                    <div className="rounded-2xl border border-slate-800 bg-[#0e1322] overflow-hidden">
                      <table className="w-full text-left text-xs">
                        <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase tracking-wider text-[10px]">
                          <tr>
                            <th className="p-3.5">Module</th>
                            <th className="p-3.5">Label</th>
                            <th className="p-3.5">Suggested Duration</th>
                            <th className="p-3.5">Start Offset (Day #)</th>
                            <th className="p-3.5">Release Mode</th>
                            <th className="p-3.5">Release After (Days)</th>
                            <th className="p-3.5">Estimated Study Time</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-800">
                          {selectedCourse.modules?.filter((m) => !m.archived).map((mod) => (
                            <tr key={mod.id} className="hover:bg-slate-800/40 transition">
                              <td className="p-3.5 font-bold text-white max-w-[200px] truncate">
                                {mod.title}
                              </td>
                              <td className="p-3.5">
                                <input
                                  type="text"
                                  value={mod.timeline?.label || 'Week 1'}
                                  onChange={(e) => {
                                    if (mod.timeline) mod.timeline.label = e.target.value;
                                    setSelectedCourse({ ...selectedCourse });
                                  }}
                                  className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white w-24"
                                />
                              </td>
                              <td className="p-3.5">
                                <input
                                  type="text"
                                  value={mod.timeline?.suggestedDuration || '3 days'}
                                  onChange={(e) => {
                                    if (mod.timeline) mod.timeline.suggestedDuration = e.target.value;
                                    setSelectedCourse({ ...selectedCourse });
                                  }}
                                  className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white w-24"
                                />
                              </td>
                              <td className="p-3.5">
                                <input
                                  type="number"
                                  value={mod.timeline?.startOffsetDays || 1}
                                  onChange={(e) => {
                                    if (mod.timeline) mod.timeline.startOffsetDays = Number(e.target.value);
                                    setSelectedCourse({ ...selectedCourse });
                                  }}
                                  className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white w-16"
                                />
                              </td>
                              <td className="p-3.5">
                                <select
                                  value={mod.timeline?.releaseMode || 'self_paced'}
                                  onChange={(e) => {
                                    if (mod.timeline) mod.timeline.releaseMode = e.target.value as any;
                                    setSelectedCourse({ ...selectedCourse });
                                  }}
                                  className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white"
                                >
                                  <option value="self_paced">Self-paced</option>
                                  <option value="scheduled">Scheduled (drip)</option>
                                </select>
                              </td>
                              <td className="p-3.5">
                                <input
                                  type="number"
                                  value={mod.timeline?.releaseAfterDays || 0}
                                  onChange={(e) => {
                                    if (mod.timeline) mod.timeline.releaseAfterDays = Number(e.target.value);
                                    setSelectedCourse({ ...selectedCourse });
                                  }}
                                  className="bg-slate-900 border border-slate-700 rounded p-1 text-xs text-white w-16"
                                />
                              </td>
                              <td className="p-3.5 font-mono text-indigo-400 font-bold">
                                {mod.timeline?.estimatedStudyTimeMinutes || 60} min
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    <div className="flex justify-end">
                      <button
                        onClick={handleSaveCourseDetails}
                        className="px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                      >
                        <Save className="size-4" />
                        <span>Save Timeline Changes</span>
                      </button>
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------------
                    SUB-TAB 5: MEDIA LIBRARY (PDF Section 8.1 & 10)
                   ------------------------------------------------------------- */}
                {studioSubTab === 'media' && (
                  <div className="flex flex-col gap-6">
                    <div>
                      <h3 className="font-extrabold text-base text-white">Course Cloudinary Media Library</h3>
                      <p className="text-xs text-slate-400">
                        Binary files are stored on Cloudinary; database maintains references (Section 10)
                      </p>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                      {/* Course Thumbnail */}
                      <div className="p-4 rounded-xl bg-[#0e1322] border border-slate-800 flex flex-col gap-2">
                        <span className="text-[10px] font-mono uppercase text-indigo-400">Course Thumbnail</span>
                        <div className="aspect-video bg-black rounded-lg overflow-hidden">
                          <img src={selectedCourse.thumbnail} alt="Thumbnail" className="w-full h-full object-cover" />
                        </div>
                        <p className="text-[11px] text-slate-400 truncate">{selectedCourse.thumbnail}</p>
                      </div>

                      {/* Course Banner */}
                      {selectedCourse.banner && (
                        <div className="p-4 rounded-xl bg-[#0e1322] border border-slate-800 flex flex-col gap-2">
                          <span className="text-[10px] font-mono uppercase text-indigo-400">Course Banner</span>
                          <div className="aspect-video bg-black rounded-lg overflow-hidden">
                            <img src={selectedCourse.banner} alt="Banner" className="w-full h-full object-cover" />
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{selectedCourse.banner}</p>
                        </div>
                      )}

                      {/* Preview Video */}
                      {selectedCourse.previewVideo && (
                        <div className="p-4 rounded-xl bg-[#0e1322] border border-slate-800 flex flex-col gap-2">
                          <span className="text-[10px] font-mono uppercase text-indigo-400">Promo Video</span>
                          <div className="aspect-video bg-black rounded-lg overflow-hidden flex items-center justify-center">
                            <video src={selectedCourse.previewVideo} controls className="w-full h-full object-contain" />
                          </div>
                          <p className="text-[11px] text-slate-400 truncate">{selectedCourse.previewVideo}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {/* -------------------------------------------------------------
                    SUB-TAB 6: PREVIEW AS STUDENT (PDF Section 8.1)
                   ------------------------------------------------------------- */}
                {studioSubTab === 'preview' && (
                  <div className="p-6 rounded-2xl bg-[#0e1322] border border-slate-800 flex flex-col gap-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-extrabold text-base text-white">Student Experience Preview</h3>
                        <p className="text-xs text-slate-400">
                          Simulating enrolled student view of modules, timeline strip, lessons, and assessment
                        </p>
                      </div>
                      <button
                        onClick={() => setStudioSubTab('details')}
                        className="px-3 py-1.5 bg-slate-800 text-white rounded-lg text-xs font-bold"
                      >
                        Exit Preview
                      </button>
                    </div>

                    <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex items-center gap-3 text-xs">
                      <span className="font-bold text-emerald-400">Course Status:</span>
                      <span>{selectedCourse.status.toUpperCase()}</span>
                      <span className="text-slate-600">|</span>
                      <span className="font-bold text-indigo-400">Total Modules:</span>
                      <span>{selectedCourse.modules?.length}</span>
                      <span className="text-slate-600">|</span>
                      <span className="font-bold text-indigo-400">Total Duration:</span>
                      <span>{selectedCourse.totalDuration}</span>
                    </div>

                    <div className="border border-slate-800 rounded-xl overflow-hidden divide-y divide-slate-800">
                      {selectedCourse.modules?.map((m) => (
                        <div key={m.id} className="p-4 bg-slate-900/60 flex items-center justify-between">
                          <div>
                            <span className="text-[10px] font-mono text-indigo-400 uppercase font-bold mr-2">
                              {m.timeline?.label}
                            </span>
                            <span className="font-bold text-sm text-white">{m.title}</span>
                            <p className="text-xs text-slate-400 mt-0.5">{m.description}</p>
                          </div>
                          <span className="text-xs text-slate-400">{m.lessons?.length} lessons</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="lg:col-span-9 flex flex-col items-center justify-center py-20 text-slate-500">
              <BookOpen className="size-10 mb-2 opacity-50" />
              <p className="text-sm">Select a course from the left catalog to edit.</p>
            </div>
          )}
        </div>
      ) : activeTab === 'analytics' ? (
        /* -------------------------------------------------------------
           TAB 2: STUDIO ANALYTICS (PDF Section 8.2 & 12.2)
           ------------------------------------------------------------- */
        <div className="p-4 sm:p-8 flex flex-col gap-8 max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-xl font-extrabold text-white">Admin Studio Analytics & Tracking</h2>
            <p className="text-xs text-slate-400 mt-1">
              Per-course progress, module drop-off, quiz pass rates, and individual student progress resets (Section 8.2)
            </p>
          </div>

          {loadingAnalytics ? (
            <div className="py-20 flex flex-col items-center justify-center text-slate-400 gap-2">
              <RotateCcw className="size-6 animate-spin text-indigo-500" />
              <span className="text-xs">Computing analytics...</span>
            </div>
          ) : (
            <div className="flex flex-col gap-8">
              {/* Courses Analytics Summary */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                {analyticsData?.courses?.map((c: any) => (
                  <div key={c.courseId} className="p-5 rounded-2xl bg-[#0e1322] border border-slate-800 flex flex-col gap-3">
                    <span className="text-[10px] font-mono uppercase text-indigo-400">Course Tracking</span>
                    <h4 className="font-extrabold text-sm text-white line-clamp-1">{c.title}</h4>
                    <div className="grid grid-cols-2 gap-2 text-xs pt-2 border-t border-slate-800">
                      <div>
                        <span className="text-slate-500 text-[10px] block">Enrolled:</span>
                        <strong className="text-white text-sm">{c.enrolledStudents}</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Avg Progress:</span>
                        <strong className="text-emerald-400 text-sm">{c.averageProgress}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Completion:</span>
                        <strong className="text-indigo-400 text-sm">{c.completionRate}%</strong>
                      </div>
                      <div>
                        <span className="text-slate-500 text-[10px] block">Avg Time:</span>
                        <strong className="text-white text-xs">{c.averageTimeToComplete}</strong>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Student Progress List with RESET BUTTONS (Section 8.2 & 12.2) */}
              <div className="p-6 rounded-2xl bg-[#0e1322] border border-slate-800 flex flex-col gap-4">
                <div className="flex items-center justify-between">
                  <div>
                    <h3 className="font-extrabold text-sm text-white">Student Progress & Reset Studio</h3>
                    <p className="text-xs text-slate-400">
                      Reset a lesson, quiz, or entire course for any enrolled student (Section 8.2 & 12.2)
                    </p>
                  </div>
                </div>

                <div className="rounded-xl border border-slate-800 overflow-hidden">
                  <table className="w-full text-left text-xs">
                    <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                      <tr>
                        <th className="p-3.5">Student</th>
                        <th className="p-3.5">Enrolled Course</th>
                        <th className="p-3.5">Lessons Done</th>
                        <th className="p-3.5">Progress %</th>
                        <th className="p-3.5">Quiz Attempts</th>
                        <th className="p-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-800">
                      {analyticsData?.students?.flatMap((st: any) =>
                        st.courses.map((sc: any) => (
                          <tr key={`${st.id}-${sc.courseId}`} className="hover:bg-slate-800/40">
                            <td className="p-3.5 font-bold text-white">
                              {st.name}
                              <span className="block text-[10px] text-slate-500 font-normal">{st.email}</span>
                            </td>
                            <td className="p-3.5 text-slate-300 font-medium">{sc.courseTitle}</td>
                            <td className="p-3.5 font-mono text-slate-400">
                              {sc.completedLessons} / {sc.totalLessons}
                            </td>
                            <td className="p-3.5">
                              <span className="font-bold text-emerald-400">{sc.percent}%</span>
                            </td>
                            <td className="p-3.5 text-slate-400">
                              {Object.keys(sc.quizScores || {}).length} quizzes attempted
                            </td>
                            <td className="p-3.5 text-right">
                              <button
                                onClick={() => handleResetProgress(st.id, sc.courseId, 'course')}
                                className="px-3 py-1 bg-rose-950/60 hover:bg-rose-900/80 text-rose-300 border border-rose-500/40 rounded-lg text-[11px] font-bold transition cursor-pointer"
                              >
                                Reset Course
                              </button>
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      ) : (
        /* -------------------------------------------------------------
           TAB 3: ORDERS & SALES (Cashfree logs)
           ------------------------------------------------------------- */
        <div className="p-4 sm:p-8 flex flex-col gap-6 max-w-7xl mx-auto w-full">
          <div>
            <h2 className="text-xl font-extrabold text-white">Orders & Cashfree Transactions</h2>
            <p className="text-xs text-slate-400 mt-1">Live payments and student orders</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div className="p-5 rounded-2xl bg-[#0e1322] border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-bold">Gross Revenue</span>
              <p className="text-2xl font-extrabold text-emerald-400 mt-1">
                ${((salesMetrics?.grossRevenueCents || 0) / 100).toFixed(2)} USD
              </p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0e1322] border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-bold">Total Paid Orders</span>
              <p className="text-2xl font-extrabold text-white mt-1">{salesList.length}</p>
            </div>
            <div className="p-5 rounded-2xl bg-[#0e1322] border border-slate-800">
              <span className="text-xs text-slate-400 uppercase font-bold">Payment Gateway</span>
              <p className="text-2xl font-extrabold text-indigo-400 mt-1">Cashfree (Active)</p>
            </div>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-[#0e1322] overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-slate-900 border-b border-slate-800 text-slate-400 font-bold uppercase text-[10px]">
                <tr>
                  <th className="p-3.5">Student</th>
                  <th className="p-3.5">Course</th>
                  <th className="p-3.5">Amount</th>
                  <th className="p-3.5">Provider</th>
                  <th className="p-3.5">Status</th>
                  <th className="p-3.5">Date</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800">
                {salesList.map((pur) => (
                  <tr key={pur.id} className="hover:bg-slate-800/40">
                    <td className="p-3.5 font-bold text-white">
                      {pur.studentName}
                      <span className="block text-[10px] text-slate-500 font-normal">{pur.studentEmail}</span>
                    </td>
                    <td className="p-3.5 text-slate-300 font-medium">{pur.courseTitle}</td>
                    <td className="p-3.5 font-bold text-white">
                      ${(pur.amountCents / 100).toFixed(0)} {pur.currency}
                    </td>
                    <td className="p-3.5 font-mono text-indigo-400 uppercase">{pur.provider}</td>
                    <td className="p-3.5">
                      <span className="px-2 py-0.5 rounded font-bold uppercase bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 text-[10px]">
                        {pur.status}
                      </span>
                    </td>
                    <td className="p-3.5 text-slate-500">{new Date(pur.createdAt).toLocaleDateString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* 3. MODALS */}

      {/* A. EDIT LESSON MODAL (PDF Section 4.1 & 8.1) */}
      {editingLesson && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1322] border border-slate-800 rounded-2xl max-w-2xl w-full p-6 flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-white">
                {editingLesson.isNew ? 'Create New Lesson' : 'Edit Lesson'}
              </h3>
              <button onClick={() => setEditingLesson(null)} className="p-1 hover:text-white text-slate-400">
                <X className="size-4" />
              </button>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-semibold">Lesson Type</label>
                <select
                  value={editingLesson.lesson.type}
                  onChange={(e) =>
                    setEditingLesson({
                      ...editingLesson,
                      lesson: { ...editingLesson.lesson, type: e.target.value as any },
                    })
                  }
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                >
                  <option value="video">Video (Cloudinary)</option>
                  <option value="audio">Audio (Cloudinary)</option>
                  <option value="article">Article (Rich text in DB)</option>
                  <option value="resource">Resource (PDF, ZIP download)</option>
                </select>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-semibold">Duration (Formatted)</label>
                <input
                  type="text"
                  value={editingLesson.lesson.duration}
                  onChange={(e) =>
                    setEditingLesson({
                      ...editingLesson,
                      lesson: { ...editingLesson.lesson, duration: e.target.value },
                    })
                  }
                  className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
                />
              </div>
            </div>

            <div className="flex flex-col gap-1.5">
              <label className="text-slate-400 font-semibold">Lesson Title *</label>
              <input
                type="text"
                value={editingLesson.lesson.title}
                onChange={(e) =>
                  setEditingLesson({
                    ...editingLesson,
                    lesson: { ...editingLesson.lesson, title: e.target.value },
                  })
                }
                className="bg-slate-900 border border-slate-800 rounded-lg p-2.5 text-white"
              />
            </div>

            {/* Cloudinary Media Uploader for Video / Audio / Resource */}
            {(editingLesson.lesson.type === 'video' ||
              editingLesson.lesson.type === 'audio' ||
              editingLesson.lesson.type === 'resource') && (
              <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
                <label className="text-slate-400 font-semibold">
                  Media Source ({editingLesson.lesson.type.toUpperCase()})
                </label>
                <input
                  type="text"
                  placeholder="Cloudinary URL..."
                  value={editingLesson.lesson.videoUrl || editingLesson.lesson.mediaUrl || ''}
                  onChange={(e) =>
                    setEditingLesson({
                      ...editingLesson,
                      lesson: {
                        ...editingLesson.lesson,
                        videoUrl: e.target.value,
                        mediaUrl: e.target.value,
                      },
                    })
                  }
                  className="bg-slate-800 border border-slate-700 rounded-lg p-2 text-white"
                />
                <label className="cursor-pointer px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold text-center transition flex items-center justify-center gap-2">
                  <UploadCloud className="size-4" />
                  <span>Upload to Cloudinary with Progress Bar</span>
                  <input
                    type="file"
                    accept={
                      editingLesson.lesson.type === 'video'
                        ? 'video/*'
                        : editingLesson.lesson.type === 'audio'
                        ? 'audio/*'
                        : '*/*'
                    }
                    className="hidden"
                    onChange={(e) => {
                      const f = e.target.files?.[0];
                      if (f) {
                        handleCloudinaryUpload(
                          f,
                          'lessonMedia',
                          editingLesson.lesson.type === 'resource' ? 'raw' : (editingLesson.lesson.type as any)
                        );
                      }
                    }}
                  />
                </label>
              </div>
            )}

            {/* Article Rich Text Editor */}
            {editingLesson.lesson.type === 'article' && (
              <div className="flex flex-col gap-1.5">
                <label className="text-slate-400 font-semibold">Article Content (Markdown / Rich Text in DB)</label>
                <textarea
                  rows={6}
                  value={editingLesson.lesson.articleBody || ''}
                  onChange={(e) =>
                    setEditingLesson({
                      ...editingLesson,
                      lesson: { ...editingLesson.lesson, articleBody: e.target.value },
                    })
                  }
                  placeholder="Write article content here..."
                  className="bg-slate-900 border border-slate-800 rounded-lg p-3 text-white focus:outline-none focus:border-indigo-500 font-mono"
                />
              </div>
            )}

            <div className="flex items-center gap-6 pt-2">
              <label className="flex items-center gap-2 text-white font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingLesson.lesson.isFreePreview}
                  onChange={(e) =>
                    setEditingLesson({
                      ...editingLesson,
                      lesson: { ...editingLesson.lesson, isFreePreview: e.target.checked },
                    })
                  }
                  className="size-4 accent-purple-600"
                />
                <span>Free Preview Lesson</span>
              </label>

              <label className="flex items-center gap-2 text-white font-bold cursor-pointer">
                <input
                  type="checkbox"
                  checked={editingLesson.lesson.isRequired}
                  onChange={(e) =>
                    setEditingLesson({
                      ...editingLesson,
                      lesson: { ...editingLesson.lesson, isRequired: e.target.checked },
                    })
                  }
                  className="size-4 accent-indigo-600"
                />
                <span>Required for completion (Optional doesn't block completion)</span>
              </label>
            </div>

            <div className="flex justify-end gap-2 pt-4 border-t border-slate-800">
              <button
                onClick={() => setEditingLesson(null)}
                className="px-4 py-2 bg-slate-800 text-white rounded-lg font-bold"
              >
                Cancel
              </button>
              <button
                onClick={async () => {
                  const token = localStorage.getItem('token');
                  if (editingLesson.isNew) {
                    await fetch(`/api/admin/modules/${editingLesson.moduleId}/lessons`, {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify(editingLesson.lesson),
                    });
                  } else {
                    await fetch(`/api/admin/lessons/${editingLesson.lesson.id}`, {
                      method: 'PUT',
                      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                      body: JSON.stringify(editingLesson.lesson),
                    });
                  }
                  setEditingLesson(null);
                  fetchCourses();
                }}
                className="px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-bold"
              >
                Save Lesson
              </button>
            </div>
          </div>
        </div>
      )}

      {/* B. CSV QUESTION IMPORT MODAL (PDF Section 8.1) */}
      {csvModalOpen && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1322] border border-slate-800 rounded-2xl max-w-xl w-full p-6 flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <h3 className="font-extrabold text-sm text-white">Import Questions from CSV</h3>
              <button onClick={() => setCsvModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="size-4" />
              </button>
            </div>

            <p className="text-slate-400">
              Paste comma-separated rows. Expected format:
              <br />
              <code className="text-purple-300 font-mono text-[11px] block mt-1 bg-slate-900 p-2 rounded border border-slate-800">
                Question,Type,Option1,Option2,Option3,Option4,CorrectIndex(1-4),Explanation,Points
              </code>
            </p>

            <textarea
              rows={8}
              value={csvText}
              onChange={(e) => setCsvText(e.target.value)}
              placeholder="What is WCAG?,single_choice,Web Content Accessibility Guidelines,Web Cache Group,None,All,1,Accessibility standard,1"
              className="bg-slate-900 border border-slate-800 rounded-xl p-3 text-white font-mono text-xs focus:outline-none focus:border-purple-500"
            />

            <div className="flex justify-end gap-2">
              <button onClick={() => setCsvModalOpen(false)} className="px-4 py-2 bg-slate-800 text-white rounded-lg">
                Cancel
              </button>
              <button
                onClick={async () => {
                  const targetMod = selectedCourse?.modules?.find((m) => m.id === selectedQuizModuleId);
                  if (!targetMod?.quiz) return alert('No quiz found for selected module.');
                  const token = localStorage.getItem('token');
                  const res = await fetch(`/api/admin/quizzes/${targetMod.quiz.id}/import-csv`, {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
                    body: JSON.stringify({ csvText }),
                  });
                  const data = await res.json();
                  if (res.ok && data.success) {
                    alert(`Imported ${data.addedCount} questions successfully!`);
                    setCsvModalOpen(false);
                    fetchCourses();
                  } else {
                    alert(data.message || 'Import failed.');
                  }
                }}
                className="px-4 py-2 bg-purple-600 hover:bg-purple-700 text-white rounded-lg font-bold"
              >
                Import Questions
              </button>
            </div>
          </div>
        </div>
      )}

      {/* C. PUBLISH CHANGE SUMMARY MODAL (PDF Section 8.3 & 9.1) */}
      {publishModalOpen && selectedCourse && (
        <div className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-[#0e1322] border border-slate-800 rounded-2xl max-w-lg w-full p-6 flex flex-col gap-4 text-xs">
            <div className="flex items-center justify-between border-b border-slate-800 pb-3">
              <div className="flex items-center gap-2 text-emerald-400 font-bold">
                <Sparkles className="size-4" />
                <h3 className="font-extrabold text-sm text-white">Publish Course Changes</h3>
              </div>
              <button onClick={() => setPublishModalOpen(false)} className="p-1 text-slate-400 hover:text-white">
                <X className="size-4" />
              </button>
            </div>

            <p className="text-slate-300">
              Publishing will increment the content version from <strong className="text-white">v{selectedCourse.contentVersion || 1}</strong> to <strong className="text-emerald-400">v{(selectedCourse.contentVersion || 1) + 1}</strong>.
            </p>

            <div className="p-4 rounded-xl bg-slate-900 border border-slate-800 flex flex-col gap-2">
              <span className="font-bold text-white uppercase text-[10px] tracking-wider">Change Summary:</span>
              <ul className="list-disc list-inside space-y-1 text-slate-400">
                <li>Total Modules: {selectedCourse.modules?.length}</li>
                <li>Total Lessons: {selectedCourse.lessonCount}</li>
                <li>Estimated Duration: {selectedCourse.totalDuration}</li>
                <li>Live reflection: Enrolled students will immediately receive updates on their next load or tab focus without manual steps!</li>
              </ul>
            </div>

            <div className="p-3 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-200 text-[11px]">
              ⚠️ <strong>Rule 9.2 Note:</strong> Students who have already completed this course and earned certificates retain their completed status. Any newly added required lessons will appear as bonus content for them.
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <button onClick={() => setPublishModalOpen(false)} className="px-4 py-2 bg-slate-800 text-white rounded-lg">
                Cancel
              </button>
              <button
                onClick={handlePublishCourse}
                className="px-5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg font-bold"
              >
                Confirm & Publish Live
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
