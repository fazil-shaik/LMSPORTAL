import { useState, useEffect } from 'react';
import {
  Menu,
  X,
  VolumeX,
  Sun,
  Moon,
  Sparkles,
  Search,
  ShoppingCart,
  Heart,
  Globe,
  ChevronDown,
  LogOut,
  Settings,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import AccountSettingsModal from './components/AccountSettingsModal';
import StudentDashboard from './components/StudentDashboard';
import AdminPanel from './components/AdminPanel';

export default function App() {
  // Theme state: light or dark
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

  // Apply theme to document element
  useEffect(() => {
    const root = document.documentElement;
    if (theme === 'dark') {
      root.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      root.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [theme]);

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'));
  };

  // Initialize AOS animations on mount
  useEffect(() => {
    AOS.init({
      duration: 750,
      easing: 'ease-out-cubic',
      once: false,
      mirror: true,
      offset: 40,
    });
  }, []);

  // Re-refresh AOS when theme changes to ensure layout offsets are clean
  useEffect(() => {
    AOS.refresh();
  }, [theme]);

  // Mobile navigation state
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  // URL Path router state (defaulting to window.location.pathname, e.g. '/' or '/dashboard')
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');

  // Navigation helper that updates browser history and view state
  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Listen to browser Back and Forward navigation buttons
  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // Authentication Context Hook
  const { user, openAuthModal, openSettingsModal, signOut, enrolledCourses, enrollInCourse } = useAuth();

  // Once user logs in, automatically navigate to '/dashboard' pathway
  useEffect(() => {
    if (user && currentPath === '/') {
      navigate('/dashboard');
    }
  }, [user]);

  const isDashboard = currentPath.startsWith('/dashboard');
  const isAdmin = currentPath.startsWith('/admin');

  // Dynamic Landing Page Courses State (Eliminating static courses)
  const [landingCourses, setLandingCourses] = useState<any[]>([]);
  const [loadingLandingCourses, setLoadingLandingCourses] = useState(false);

  const fetchLandingCourses = async () => {
    setLoadingLandingCourses(true);
    try {
      const res = await fetch('/api/courses/public');
      const data = await res.json();
      if (data.success && data.courses) {
        setLandingCourses(data.courses);
      }
    } catch (err) {
      console.error('Error fetching public courses:', err);
    } finally {
      setLoadingLandingCourses(false);
    }
  };

  useEffect(() => {
    fetchLandingCourses();
  }, []);
  const cartCount = enrolledCourses.length;
  const [wishlistActive, setWishlistActive] = useState<Record<string, boolean>>({});
  const [bannerVisible, setBannerVisible] = useState(true);

  // Video player interactive state
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(768); // 12:48 in seconds
  const [activeStep, setActiveStep] = useState<number>(3); // 1: Observation, 2: Human need, 3: Opportunity
  const [playbackSpeed, setPlaybackSpeed] = useState<string>('1×');
  const [isMuted, setIsMuted] = useState(false);
  const [captionsOn, setCaptionsOn] = useState(true);

  // Accordion state (Q1 and Q2 open by default matching Figma design)
  const [openFaq, setOpenFaq] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: false,
    3: false,
    4: false,
  });

  // Video progress animation when playing
  useEffect(() => {
    let interval: any;
    if (isPlaying) {
      interval = setInterval(() => {
        setCurrentTime((prev) => {
          if (prev >= 1800) {
            setIsPlaying(false);
            return 0;
          }
          return prev + 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isPlaying]);

  const formatTime = (secs: number) => {
    const m = Math.floor(secs / 60);
    const s = Math.floor(secs % 60);
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const toggleFaq = (idx: number) => {
    setOpenFaq((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const cycleSpeed = () => {
    const speeds = ['1×', '1.25×', '1.5×', '2×'];
    const curIdx = speeds.indexOf(playbackSpeed);
    setPlaybackSpeed(speeds[(curIdx + 1) % speeds.length]);
  };

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlistActive((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  // Step information for interactive video slide
  const stepContents: Record<number, { title: string; subtitle: string; tag: string }> = {
    1: {
      tag: "LESSON 04 / RESEARCH FOUNDATIONS",
      title: "Active listening.",
      subtitle: "Uncovering quiet friction points.",
    },
    2: {
      tag: "LESSON 05 / SYNTHESIS & NEEDS",
      title: "Human empathy.",
      subtitle: "Designing for real behavior.",
    },
    3: {
      tag: "LESSON 06 / RESEARCH TO INSIGHT",
      title: "Better questions.",
      subtitle: "Bigger possibilities.",
    },
  };

  return (
    <div className="bg-white dark:bg-[#0a0d16] text-[#0f172a] dark:text-[#f1f5f9] font-sans antialiased min-h-screen flex flex-col selection:bg-[#a435f0] selection:text-white transition-colors duration-300">

      {/* =========================================================================
          UDEMY-STYLE FLASH PROMOTIONAL TOP BAR
         ========================================================================= */}
      {bannerVisible && (
        <div className="bg-[#a435f0] text-white text-[12px] sm:text-[13px] px-4 py-2 font-medium flex items-center justify-between relative z-50">
          <div className="max-w-[1440px] mx-auto flex items-center justify-center gap-2 text-center">
            <span className="font-bold">⚡ Flash Sale:</span>
            <span>Get in-demand skills & launch your career with InternWala courses from $12.99.</span>
          </div>
          <button
            onClick={() => setBannerVisible(false)}
            className="p-1 hover:bg-white/20 rounded transition shrink-0 ml-2"
            aria-label="Dismiss banner"
          >
            <X className="size-3.5" />
          </button>
        </div>
      )}

      {/* =========================================================================
          1. NAVIGATION BAR (Udemy-inspired layout + InternWala Branding)
         ========================================================================= */}
      <header
        data-aos="fade-down"
        className="bg-white/95 dark:bg-[#0a0d16]/95 backdrop-blur-md border-b border-[#e2e8f0] dark:border-slate-800/80 sticky top-0 z-50 transition-colors duration-200"
      >
        <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[60px] h-[72px] sm:h-[80px] flex items-center justify-between gap-4">

          {/* InternWala Brand & Udemy Categories */}
          <div className="flex items-center gap-4 sm:gap-6 shrink-0">
            <a
              href="/"
              onClick={(e) => {
                e.preventDefault();
                navigate('/');
              }}
              className="flex items-center gap-[10px] group focus:outline-none cursor-pointer"
            >
              <div className="bg-[#a435f0] rounded-[9px] size-[34px] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform text-white font-extrabold text-[15px]">
                iW
              </div>
              <div className="flex flex-col">
                <span className="font-extrabold text-[20px] tracking-tight text-[#0f172a] dark:text-white transition-colors leading-none">
                  intern<span className="text-[#a435f0]">wala</span>
                </span>
                <span className="text-[9px] font-semibold tracking-wider uppercase text-slate-400 mt-0.5">
                  Learn &bull; Build &bull; Intern
                </span>
              </div>
            </a>

            {/* Udemy-style Categories button */}
            <div className="relative hidden md:block">
              <button
                onClick={() => setCategoriesOpen(!categoriesOpen)}
                className="flex items-center gap-1.5 text-[14px] font-medium text-[#475569] dark:text-slate-300 hover:text-[#a435f0] dark:hover:text-[#a435f0] px-2.5 py-1.5 rounded transition"
              >
                <span>Categories</span>
                <ChevronDown className="size-3.5" />
              </button>

              {categoriesOpen && (
                <div
                  onMouseLeave={() => setCategoriesOpen(false)}
                  className="absolute left-0 top-full mt-2 w-56 bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-lg shadow-xl py-2 z-50 text-[13px]"
                >
                  <a
                    href="#courses"
                    onClick={() => setCategoriesOpen(false)}
                    className="block px-4 py-2 hover:bg-[#f6ecfd] dark:hover:bg-purple-950/40 hover:text-[#a435f0] font-medium transition"
                  >
                    Product Design
                  </a>
                  <a
                    href="#courses"
                    onClick={() => setCategoriesOpen(false)}
                    className="block px-4 py-2 hover:bg-[#f6ecfd] dark:hover:bg-purple-950/40 hover:text-[#a435f0] font-medium transition"
                  >
                    Product Strategy & Systems
                  </a>
                  <a
                    href="#courses"
                    onClick={() => setCategoriesOpen(false)}
                    className="block px-4 py-2 hover:bg-[#f6ecfd] dark:hover:bg-purple-950/40 hover:text-[#a435f0] font-medium transition"
                  >
                    Brand & Creative Design
                  </a>
                  <a
                    href="#how-it-works"
                    onClick={() => setCategoriesOpen(false)}
                    className="block px-4 py-2 hover:bg-[#f6ecfd] dark:hover:bg-purple-950/40 hover:text-[#a435f0] font-medium transition"
                  >
                    Internship Pathways
                  </a>
                </div>
              )}
            </div>
          </div>

          {/* Udemy-style Search Bar */}
          <div className="hidden lg:flex flex-1 max-w-md mx-2">
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search for courses, skills, tools..."
                className="w-full pl-10 pr-4 py-2 bg-[#f7f9fa] dark:bg-slate-900 border border-[#d1d7dc] dark:border-slate-700 rounded-full text-[13px] text-[#0f172a] dark:text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#a435f0] focus:border-transparent transition"
              />
            </div>
          </div>

          {/* Desktop Navigation Links */}
          <nav className="hidden xl:flex items-center gap-[24px] text-[14px]">
            <button
              onClick={() => navigate('/')}
              className={`font-bold transition-colors cursor-pointer ${
                !isDashboard
                  ? 'text-[#a435f0] dark:text-[#c084fc]'
                  : 'text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white'
              }`}
            >
              Explore courses
            </button>
            <button
              onClick={() => {
                if (user) {
                  navigate('/dashboard');
                } else {
                  openAuthModal('signin');
                }
              }}
              className={`transition-colors cursor-pointer flex items-center gap-1.5 ${
                isDashboard
                  ? 'font-bold text-[#4f46e5] dark:text-[#a5b4fc]'
                  : 'font-medium text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white'
              }`}
            >
              <span>My learning</span>
              {user && (
                <span className="size-2 rounded-full bg-[#4f46e5] animate-pulse" />
              )}
            </button>
            <a
              href="#how-it-works"
              onClick={() => navigate('/')}
              className="font-medium text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white transition-colors"
            >
              How it works
            </a>
            <a
              href="#our-story"
              onClick={() => navigate('/')}
              className="font-medium text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white transition-colors"
            >
              Our story
            </a>
          </nav>

          {/* Account Actions & Dark Mode Toggle (Udemy-styled buttons) */}
          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {/* Wishlist Icon */}
            <a
              href="#courses"
              className="hidden sm:inline-flex p-2 text-[#475569] dark:text-slate-300 hover:text-[#a435f0] dark:hover:text-[#a435f0] transition"
              title="Wishlist"
              aria-label="Wishlist"
            >
              <Heart className="size-4" />
            </a>

            {/* Shopping Cart Icon */}
            <a
              href="#courses"
              className="relative p-2 text-[#475569] dark:text-slate-300 hover:text-[#a435f0] dark:hover:text-[#a435f0] transition"
              title="Cart"
              aria-label="Cart"
            >
              <ShoppingCart className="size-4" />
              {cartCount > 0 && (
                <span className="absolute top-1 right-1 size-3.5 bg-[#a435f0] text-white text-[9px] font-bold rounded-full flex items-center justify-center">
                  {cartCount}
                </span>
              )}
            </a>

            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              className="p-2 rounded-lg border border-[#e2e8f0] dark:border-slate-800 text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="size-4 text-amber-400" />
              ) : (
                <Moon className="size-4 text-slate-700" />
              )}
            </button>

            {/* User Account / Auth Actions */}
            {user ? (
              <div className="flex items-center gap-2 sm:gap-2.5">
                {/* Email Verification Banner indicator if not verified */}
                {!user.emailVerified && (
                  <button
                    onClick={() => openAuthModal('verify')}
                    className="hidden lg:inline-flex items-center gap-1.5 px-2.5 py-1 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-full text-xs font-semibold hover:bg-amber-100 transition shadow-xs"
                    title="Email verification required before purchasing courses"
                  >
                    <span className="size-2 rounded-full bg-amber-500 animate-pulse" />
                    <span>Verify Email</span>
                  </button>
                )}

                {/* Student Dashboard toggle button */}
                <button
                  onClick={() => navigate(isDashboard ? '/' : '/dashboard')}
                  className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                    isDashboard
                      ? 'bg-[#4f46e5] text-white shadow-xs'
                      : 'bg-[#eef2ff] dark:bg-indigo-950 text-[#4f46e5] dark:text-[#a5b4fc] hover:bg-[#e0e7ff] dark:hover:bg-indigo-900'
                  }`}
                  title="Navigate between Catalog and Student Dashboard"
                >
                  <GraduationCap className="size-4" />
                  <span>{isDashboard ? 'Explore Catalog' : 'My Dashboard'}</span>
                </button>

                {/* Admin Studio Navigation Button */}
                <button
                  onClick={() => navigate(isAdmin ? '/dashboard' : '/admin')}
                  className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    isAdmin
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-xs border-transparent'
                      : 'bg-indigo-50 dark:bg-indigo-950/60 text-[#4f46e5] dark:text-indigo-300 hover:bg-indigo-100 dark:hover:bg-indigo-900/60 border-indigo-200 dark:border-indigo-800'
                  }`}
                  title="InternWala Admin Studio (FR-51-58)"
                >
                  <ShieldCheck className="size-4" />
                  <span>{isAdmin ? 'Exit Studio' : 'Admin Studio'}</span>
                </button>

                {/* Account profile card opening Settings */}
                <button
                  onClick={() => openSettingsModal('profile')}
                  className="flex items-center gap-2 bg-slate-100 dark:bg-slate-800/80 hover:bg-slate-200 dark:hover:bg-slate-700 px-2.5 py-1.5 rounded-lg border border-slate-200 dark:border-slate-700 transition cursor-pointer text-left"
                  title="Open Account Settings"
                >
                  <div className="size-6 rounded-full bg-[#4f46e5] text-white flex items-center justify-center text-xs font-bold uppercase overflow-hidden">
                    {user.avatarUrl ? (
                      <img src={user.avatarUrl} alt={user.name} className="size-full object-cover" />
                    ) : (
                      user.name.charAt(0)
                    )}
                  </div>
                  <div className="hidden sm:flex flex-col text-left">
                    <span className="font-bold text-xs leading-none text-[#0f172a] dark:text-white max-w-[100px] truncate">
                      {user.name}
                    </span>
                    <span className="text-[10px] text-[#4f46e5] dark:text-[#a5b4fc] capitalize font-medium flex items-center gap-1">
                      <span>{user.role}</span>
                      {user.emailVerified && <span className="text-emerald-500 font-bold">✓</span>}
                    </span>
                  </div>
                </button>

                {/* Settings shortcut button */}
                <button
                  onClick={() => openSettingsModal('profile')}
                  className="p-2 text-slate-500 hover:text-[#4f46e5] dark:hover:text-[#818cf8] transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Account Settings (FR-10, FR-11, FR-13)"
                  aria-label="Settings"
                >
                  <Settings className="size-4" />
                </button>

                {/* Sign out button */}
                <button
                  onClick={signOut}
                  className="p-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                  title="Sign out"
                  aria-label="Sign out"
                >
                  <LogOut className="size-4" />
                </button>
              </div>
            ) : (
              <div className="hidden sm:flex items-center gap-2">
                <button
                  onClick={() => openAuthModal('signin')}
                  className="border border-[#2d2f31] dark:border-slate-600 font-bold text-[13px] text-[#2d2f31] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-2 rounded-[4px] transition cursor-pointer"
                >
                  Sign in
                </button>
                <button
                  onClick={() => openAuthModal('signup')}
                  className="bg-[#2d2f31] dark:bg-white hover:bg-black dark:hover:bg-slate-200 text-white dark:text-[#2d2f31] px-4 py-2 rounded-[4px] font-bold text-[13px] shadow-sm transition active:scale-[0.98] inline-flex items-center justify-center cursor-pointer"
                >
                  Get started
                </button>
                <button
                  onClick={() => navigate('/admin')}
                  className="hidden md:inline-flex items-center gap-1 text-xs font-semibold text-slate-500 hover:text-[#4f46e5] px-2 py-2 cursor-pointer"
                  title="Admin Studio"
                >
                  <ShieldCheck className="size-3.5" />
                  <span>Admin</span>
                </button>
              </div>
            )}

            {/* Language Globe icon */}
            <button
              className="hidden md:inline-flex border border-[#2d2f31] dark:border-slate-600 p-2 rounded-[4px] text-[#2d2f31] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              title="English"
              aria-label="Language selection"
            >
              <Globe className="size-4" />
            </button>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="xl:hidden p-2 rounded-lg text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="xl:hidden border-t border-[#e2e8f0] dark:border-slate-800 bg-white dark:bg-[#0a0d16] px-6 py-4 flex flex-col gap-4 shadow-lg animate-fadeIn">
            {/* Mobile search */}
            <div className="relative w-full">
              <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
              <input
                type="text"
                placeholder="Search for courses..."
                className="w-full pl-10 pr-4 py-2 bg-[#f7f9fa] dark:bg-slate-900 border border-[#d1d7dc] dark:border-slate-700 rounded-full text-xs text-[#0f172a] dark:text-white"
              />
            </div>

            <button
              onClick={() => {
                navigate('/');
                setMobileMenuOpen(false);
              }}
              className="text-left font-bold text-[#a435f0] dark:text-[#c084fc] py-2 text-base cursor-pointer"
            >
              Explore courses
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                if (user) {
                  navigate('/dashboard');
                } else {
                  openAuthModal('signin');
                }
              }}
              className="text-left font-bold text-[#4f46e5] dark:text-[#a5b4fc] py-2 text-base cursor-pointer flex items-center justify-between"
            >
              <span>My learning (Dashboard)</span>
              {user && <span className="size-2 rounded-full bg-[#4f46e5] animate-pulse" />}
            </button>
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/admin');
              }}
              className="text-left font-bold text-slate-700 dark:text-slate-200 py-2 text-base cursor-pointer flex items-center justify-between"
            >
              <span>Admin Studio</span>
              <ShieldCheck className="size-4 text-[#4f46e5]" />
            </button>
            <a
              href="#how-it-works"
              onClick={() => {
                navigate('/');
                setMobileMenuOpen(false);
              }}
              className="font-medium text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white py-2 text-base"
            >
              How it works
            </a>
            <a
              href="#our-story"
              onClick={() => {
                navigate('/');
                setMobileMenuOpen(false);
              }}
              className="font-medium text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white py-2 text-base"
            >
              Our story
            </a>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
              {user ? (
                <div className="flex flex-col gap-2 py-2">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <div className="size-8 rounded-full bg-[#4f46e5] text-white flex items-center justify-center font-bold">
                        {user.name.charAt(0)}
                      </div>
                      <div>
                        <p className="font-bold text-sm text-[#0f172a] dark:text-white">{user.name}</p>
                        <p className="text-xs text-slate-500">{user.email}</p>
                      </div>
                    </div>
                    <button
                      onClick={() => {
                        signOut();
                        setMobileMenuOpen(false);
                      }}
                      className="text-xs font-bold text-rose-500 py-1 px-2 border border-rose-200 dark:border-rose-900 rounded"
                    >
                      Sign out
                    </button>
                  </div>

                  {!user.emailVerified && (
                    <button
                      onClick={() => {
                        setMobileMenuOpen(false);
                        openAuthModal('verify');
                      }}
                      className="w-full text-center py-2 bg-amber-50 dark:bg-amber-950/60 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 rounded-lg text-xs font-semibold"
                    >
                      ⚠️ Verify email to unlock course purchases
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openSettingsModal('profile');
                    }}
                    className="w-full text-center py-2 bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 rounded-lg text-xs font-semibold"
                  >
                    Account Settings
                  </button>
                </div>
              ) : (
                <>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('signin');
                    }}
                    className="w-full text-left font-medium text-[#475569] dark:text-slate-300 py-2 text-base"
                  >
                    Sign in
                  </button>
                  <button
                    onClick={() => {
                      setMobileMenuOpen(false);
                      openAuthModal('signup');
                    }}
                    className="bg-[#a435f0] text-white py-3 rounded-lg text-center font-bold text-sm"
                  >
                    Get started
                  </button>
                </>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main View Router: Admin Studio (/admin), Student Dashboard (/dashboard) or Landing Page (/) */}
      {isAdmin ? (
        <AdminPanel
          onBackToApp={() => navigate(user ? '/dashboard' : '/')}
          onCourseModified={() => {
            fetchLandingCourses();
          }}
        />
      ) : isDashboard ? (
        <StudentDashboard onBackToExplore={() => navigate('/')} />
      ) : (
        <>
          {/* =========================================================================
              2. GRADIENT MESH HERO SECTION (Top-down & Bottom-up AOS)
             ========================================================================= */}
          <section className="bg-gradient-to-r from-[#f8faff] via-[#fbf8ff] via-[60%] to-[#f5f3ff] dark:from-[#080b14] dark:via-[#0e1224] dark:via-[60%] dark:to-[#110e24] relative overflow-hidden pb-[64px] pt-[60px] md:pt-[80px] transition-colors duration-300">
            {/* Violet mesh glow background decoration */}
            <div className="absolute right-[-100px] lg:right-[-50px] top-[40px] size-[600px] pointer-events-none opacity-80 dark:opacity-40 z-0 select-none">
              <img
                src="/assets/violet-mesh-glow.svg"
                alt=""
                className="w-full h-full object-contain"
              />
            </div>

            <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-[80px] relative z-10 flex flex-col gap-[48px]">
              {/* Main Hero Split Content */}
              <div className="flex flex-col lg:flex-row gap-[48px] items-center lg:items-start justify-between">
                {/* Left Column: Copy & Actions */}
                <div className="w-full lg:w-[560px] flex flex-col gap-[24px] items-start shrink-0">
                  {/* Status Badge (AOS: fade-down) */}
                  <div
                    data-aos="fade-down"
                    className="bg-[#f6ecfd] dark:bg-purple-950/60 border border-[#e9d5ff] dark:border-purple-800/80 px-[10px] py-[5px] rounded-[100px] inline-flex items-center gap-[6px] shadow-sm"
                  >
                    <img
                      src="/assets/sparkles.svg"
                      alt=""
                      className="size-[14px]"
                      onError={(e) => {
                        (e.target as HTMLElement).style.display = 'none';
                      }}
                    />
                    <Sparkles className="size-[13px] text-[#a435f0] dark:text-[#c084fc] hidden" />
                    <span className="font-bold text-[#a435f0] dark:text-[#c084fc] text-[12px] tracking-wider uppercase">
                      LEARN WITH INTENTION &bull; INTERNWALA
                    </span>
                  </div>

                  {/* High Impact Headline (AOS: fade-up) */}
                  <h1
                    data-aos="fade-up"
                    data-aos-delay="100"
                    className="font-extrabold text-[44px] sm:text-[56px] lg:text-[68px] leading-[1.08] tracking-[-2px] lg:tracking-[-3px] text-[#0f172a] dark:text-white transition-colors"
                  >
                    Build skills.<br />
                    Find your edge.<br />
                    Make your mark.
                  </h1>

                  {/* Subheading (AOS: fade-up) */}
                  <p
                    data-aos="fade-up"
                    data-aos-delay="150"
                    className="text-[16px] sm:text-[18px] text-[#475569] dark:text-slate-300 leading-[1.5] max-w-[500px] transition-colors"
                  >
                    Expert-led courses for people who want to do meaningful work. Learn at your pace. Put it into practice.
                  </p>

                  {/* Primary Call to Action (AOS: fade-up) */}
                  <div data-aos="fade-up" data-aos-delay="200" className="flex flex-wrap items-center gap-3">
                    {user ? (
                      <button
                        onClick={() => navigate('/dashboard')}
                        className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-[22px] py-[13px] min-h-[48px] rounded-[6px] font-bold text-[14px] inline-flex items-center justify-center gap-[8px] transition-all shadow-md hover:shadow-lg active:scale-[0.98] cursor-pointer"
                      >
                        <GraduationCap className="size-4" />
                        <span>Go to Student Dashboard →</span>
                      </button>
                    ) : (
                      <a
                        href="#courses"
                        className="bg-[#a435f0] hover:bg-[#8710d8] text-white px-[22px] py-[13px] min-h-[48px] rounded-[6px] font-bold text-[14px] inline-flex items-center justify-center gap-[8px] transition-all shadow-md hover:shadow-lg active:scale-[0.98] group"
                      >
                        <img
                          src="/assets/arrow-right.svg"
                          alt=""
                          className="size-[18px] group-hover:translate-x-1 transition-transform"
                        />
                        <span>Explore courses</span>
                      </a>
                    )}
                  </div>

                  {/* Social Proof (AOS: fade-up) */}
                  <div
                    data-aos="fade-up"
                    data-aos-delay="250"
                    className="flex items-center gap-[12px] pt-1"
                  >
                    <span className="text-[#b4690e] dark:text-amber-400 text-[18px] tracking-[2px] select-none font-bold">
                      ★★★★★
                    </span>
                    <span className="text-[#475569] dark:text-slate-400 text-[12px] font-medium transition-colors">
                      Loved by 2,400+ curious minds on InternWala
                    </span>
                  </div>
                </div>

                {/* Right Column: Interactive Player Preview (AOS: fade-up) */}
                <div
                  data-aos="fade-up"
                  data-aos-delay="150"
                  className="w-full lg:flex-1 max-w-[620px] bg-white dark:bg-slate-900 rounded-[16px] p-[12px] shadow-[0px_16px_48px_0px_rgba(49,46,129,0.13)] dark:shadow-[0px_16px_48px_0px_rgba(0,0,0,0.5)] border border-[#e2e8f0]/80 dark:border-slate-800 transition-colors duration-300"
                >
                  {/* Preview Toolbar (AOS: fade-down) */}
                  <div className="flex items-center justify-between px-2 pt-2 pb-3">
                    <p className="font-bold text-[#0f172a] dark:text-white text-[12px] tracking-tight">
                      A better way to learn
                    </p>
                    <div className="bg-[#f6ecfd] dark:bg-purple-950/70 border border-transparent dark:border-purple-800/50 px-[10px] py-[4px] rounded-[100px]">
                      <span className="font-bold text-[#a435f0] dark:text-[#c084fc] text-[12px]">
                        A peek inside
                      </span>
                    </div>
                  </div>

                  {/* Video Lesson Screen (Dark Navy Canvas) */}
                  <div className="bg-[#171538] rounded-[12px] p-6 sm:p-[40px] min-h-[440px] sm:h-[500px] flex flex-col justify-between relative overflow-hidden text-white shadow-inner">
                    {/* Top Video Header */}
                    <div className="flex items-center justify-between">
                      <p className="font-bold text-[#c4b5fd] text-[11px] tracking-[1px] uppercase">
                        {stepContents[activeStep].tag}
                      </p>
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="text-[#c4b5fd] hover:text-white transition p-1 hover:bg-white/10 rounded"
                        title="Toggle fullscreen / expand"
                      >
                        <img src="/assets/expand.svg" alt="Expand" className="size-[16px]" />
                      </button>
                    </div>

                    {/* Presentation Slide */}
                    <div className="flex flex-col gap-[28px] my-auto py-4">
                      <div className="font-extrabold text-[30px] sm:text-[44px] leading-[1.15] tracking-[-1px] text-white">
                        <p>{stepContents[activeStep].title}</p>
                        <p className="text-white/90">{stepContents[activeStep].subtitle}</p>
                      </div>

                      {/* Interactive Opportunity Framework Steps */}
                      <div className="grid grid-cols-3 gap-2 sm:gap-[16px]">
                        {/* Step 01 */}
                        <button
                          onClick={() => setActiveStep(1)}
                          className={`text-left p-3 sm:p-[20px] rounded-[12px] border transition-all cursor-pointer ${activeStep === 1
                            ? 'bg-[#a435f0] border-[#c084fc] shadow-lg shadow-purple-950/50 scale-[1.02]'
                            : 'bg-white/[0.04] border-[#7062a5]/50 hover:bg-white/[0.08]'
                            }`}
                        >
                          <p className="text-[#ddd6fe] text-[11px] sm:text-[12px] font-normal mb-1">
                            01
                          </p>
                          <p className="text-white text-[13px] sm:text-[16px] font-bold leading-[1.3]">
                            Observation
                          </p>
                        </button>

                        {/* Step 02 */}
                        <button
                          onClick={() => setActiveStep(2)}
                          className={`text-left p-3 sm:p-[20px] rounded-[12px] border transition-all cursor-pointer ${activeStep === 2
                            ? 'bg-[#a435f0] border-[#c084fc] shadow-lg shadow-purple-950/50 scale-[1.02]'
                            : 'bg-white/[0.04] border-[#7062a5]/50 hover:bg-white/[0.08]'
                            }`}
                        >
                          <p className="text-[#ddd6fe] text-[11px] sm:text-[12px] font-normal mb-1">
                            02
                          </p>
                          <p className="text-white text-[13px] sm:text-[16px] font-bold leading-[1.3]">
                            Human need
                          </p>
                        </button>

                        {/* Step 03 */}
                        <button
                          onClick={() => setActiveStep(3)}
                          className={`text-left p-3 sm:p-[20px] rounded-[12px] border transition-all cursor-pointer ${activeStep === 3
                            ? 'bg-[#a435f0] border-[#c084fc] shadow-lg shadow-purple-950/50 scale-[1.02]'
                            : 'bg-white/[0.04] border-[#7062a5]/50 hover:bg-white/[0.08]'
                            }`}
                        >
                          <p className="text-[#ddd6fe] text-[11px] sm:text-[12px] font-normal mb-1">
                            03
                          </p>
                          <p className="text-white text-[13px] sm:text-[16px] font-bold leading-[1.3]">
                            Opportunity
                          </p>
                        </button>
                      </div>
                    </div>

                    {/* Playback Controls Bar */}
                    <div className="flex flex-col gap-[16px] pt-2">
                      {/* Seek Bar */}
                      <div
                        onClick={(e) => {
                          const rect = e.currentTarget.getBoundingClientRect();
                          const clickX = e.clientX - rect.left;
                          const percentage = Math.max(0, Math.min(1, clickX / rect.width));
                          setCurrentTime(Math.round(percentage * 1800));
                        }}
                        className="w-full h-[4px] bg-white/20 rounded-full cursor-pointer relative overflow-hidden group"
                      >
                        <div
                          className="h-full bg-[#c084fc] rounded-full transition-all duration-150"
                          style={{ width: `${(currentTime / 1800) * 100}%` }}
                        />
                      </div>

                      {/* Actions Row */}
                      <div className="flex items-center justify-between text-white text-[12px]">
                        <div className="flex items-center gap-[16px]">
                          {/* Play/Pause Button */}
                          <button
                            onClick={() => setIsPlaying(!isPlaying)}
                            className="hover:text-[#c084fc] transition focus:outline-none"
                            aria-label={isPlaying ? 'Pause' : 'Play'}
                          >
                            {isPlaying ? (
                              <img src="/assets/pause.svg" alt="Pause" className="size-[20px]" />
                            ) : (
                              <img src="/assets/circle-play-1.svg" alt="Play" className="size-[20px]" />
                            )}
                          </button>

                          {/* Volume Mute Toggle */}
                          <button
                            onClick={() => setIsMuted(!isMuted)}
                            className="hover:text-[#c084fc] transition focus:outline-none"
                            aria-label={isMuted ? 'Unmute' : 'Mute'}
                          >
                            {isMuted ? (
                              <VolumeX className="size-[18px]" />
                            ) : (
                              <img src="/assets/volume-2.svg" alt="Volume" className="size-[20px]" />
                            )}
                          </button>

                          {/* Time progress */}
                          <span className="font-mono text-[11px] text-white/80">
                            {formatTime(currentTime)} / 30:00
                          </span>
                        </div>

                        <div className="flex items-center gap-[16px]">
                          <button
                            onClick={cycleSpeed}
                            className="font-bold text-[11px] bg-white/10 hover:bg-white/20 px-[8px] py-[3px] rounded transition"
                            title="Playback speed"
                          >
                            {playbackSpeed}
                          </button>

                          <button
                            onClick={() => setCaptionsOn(!captionsOn)}
                            className={`transition focus:outline-none ${captionsOn ? 'text-[#c084fc]' : 'text-white/60'}`}
                            title="Captions"
                          >
                            <img src="/assets/captions.svg" alt="Captions" className="size-[20px]" />
                          </button>

                          <button
                            onClick={() => {
                              const elem = document.documentElement;
                              if (!document.fullscreenElement) {
                                elem.requestFullscreen?.().catch(() => { });
                              } else {
                                document.exitFullscreen?.().catch(() => { });
                              }
                            }}
                            className="hover:text-[#c084fc] transition focus:outline-none"
                            title="Fullscreen"
                          >
                            <img src="/assets/maximize.svg" alt="Maximize" className="size-[20px]" />
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Bottom Card Footer: Course & Instructor Meta */}
                  <div className="flex items-center gap-[12px] px-2 pt-3 pb-1">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="hover:scale-105 transition-transform shrink-0"
                    >
                      <img src="/assets/circle-play.svg" alt="Play" className="size-[36px]" />
                    </button>
                    <div className="flex flex-col">
                      <p className="font-bold text-[#0f172a] dark:text-white text-[14px] leading-[1.3] transition-colors">
                        From insight to impact
                      </p>
                      <p className="text-[#475569] dark:text-slate-400 text-[12px] transition-colors">
                        Maya Chen · Product Design &bull; InternWala Mentor
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Hero Bottom Benefits Pills (AOS: fade-up) */}
              <div
                data-aos="fade-up"
                data-aos-delay="200"
                className="flex flex-wrap gap-6 sm:gap-[48px] items-center pt-4 border-t border-slate-200/60 dark:border-slate-800 transition-colors"
              >
                <div className="flex items-center gap-[8px]">
                  <img src="/assets/clock-3.svg" alt="" className="size-[18px] text-[#475569] dark:brightness-125" />
                  <span className="font-semibold text-[#475569] dark:text-slate-300 text-[12px]">
                    Learn on your schedule
                  </span>
                </div>
                <div className="flex items-center gap-[8px]">
                  <img src="/assets/graduation-cap.svg" alt="" className="size-[18px] text-[#475569] dark:brightness-125" />
                  <span className="font-semibold text-[#475569] dark:text-slate-300 text-[12px]">
                    Taught by working experts
                  </span>
                </div>
                <div className="flex items-center gap-[8px]">
                  <img src="/assets/badge-check.svg" alt="" className="size-[18px] text-[#475569] dark:brightness-125" />
                  <span className="font-semibold text-[#475569] dark:text-slate-300 text-[12px]">
                    Certificates worth sharing
                  </span>
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================================
          3. TRUSTED BY AMBITIOUS TEAMS (Top-down header & Bottom-up logos)
         ========================================================================= */}
          <section className="border-b border-[#e2e8f0] dark:border-slate-800 py-[40px] px-6 sm:px-10 lg:px-[80px] bg-white dark:bg-[#0a0d16] transition-colors duration-300">
            <div className="max-w-[1440px] mx-auto flex flex-col items-center gap-[24px]">
              <p
                data-aos="fade-down"
                className="font-semibold text-[#64748b] dark:text-slate-400 text-[12px] tracking-[1.5px] uppercase text-center"
              >
                WHERE INTERNWALA LEARNERS MAKE AN IMPACT
              </p>

              <div
                data-aos="fade-up"
                data-aos-delay="100"
                className="flex flex-wrap items-center justify-center gap-10 sm:gap-16 lg:gap-[80px] font-extrabold text-[#475569] dark:text-slate-400 text-[22px] sm:text-[24px] tracking-[-1px] select-none"
              >
                <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">Notion</span>
                <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">stripe</span>
                <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">Linear</span>
                <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">webflow</span>
                <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">Figma</span>
              </div>
            </div>
          </section>

          {/* =========================================================================
          4. FEATURED COURSES SECTION (Original 3 Courses with Subtle Udemy UI Styling)
         ========================================================================= */}
          <section id="courses" className="py-[64px] px-6 sm:px-10 lg:px-[80px] bg-white dark:bg-[#0a0d16] transition-colors duration-300">
            <div className="max-w-[1440px] mx-auto flex flex-col gap-[32px]">
              {/* Header (Top-down & Bottom-up) */}
              <div className="flex flex-col gap-[12px]">
                <p
                  data-aos="fade-down"
                  className="font-bold text-[#a435f0] dark:text-[#c084fc] text-[12px] tracking-wider uppercase"
                >
                  CURATED FOR YOUR NEXT CHAPTER &bull; INTERNWALA
                </p>
                <div data-aos="fade-up" className="flex flex-col gap-[8px]">
                  <h2 className="font-extrabold text-[32px] sm:text-[40px] leading-[1.2] tracking-[-1.2px] text-[#0f172a] dark:text-white transition-colors">
                    Small investment. Lasting impact.
                  </h2>
                  <p className="text-[#475569] dark:text-slate-300 text-[16px] transition-colors">
                    Go deeper with practical, beautifully structured courses.
                  </p>
                </div>
              </div>

              {/* Dynamic Course Cards Grid (Synchronized with Admin Studio & Cloudinary) */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
                {loadingLandingCourses ? (
                  <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
                    <div className="size-6 border-2 border-[#a435f0] border-t-transparent rounded-full animate-spin" />
                    <span className="text-xs font-semibold">Loading courses from InternWala engine...</span>
                  </div>
                ) : landingCourses.length === 0 ? (
                  <div className="col-span-full py-16 text-center text-slate-400 text-sm">
                    No courses published yet. Use Admin Studio to publish your first masterclass!
                  </div>
                ) : (
                  landingCourses.map((course, idx) => {
                    const isEnrolled = enrolledCourses.includes(course.id);
                    return (
                      <div
                        key={course.id}
                        data-aos="fade-up"
                        data-aos-delay={(idx + 1) * 100}
                        className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-[12px] overflow-hidden shadow-[0px_4px_16px_0px_rgba(15,23,42,0.03)] dark:shadow-none hover:-translate-y-1 transition-all duration-200 flex flex-col select-none relative group"
                      >
                        {/* Thumbnail banner with Cloudinary support */}
                        <div
                          className="h-[176px] p-[24px] relative overflow-hidden flex flex-col justify-between text-white"
                          style={{
                            background: course.thumbnail
                              ? `url(${course.thumbnail}) center / cover no-repeat`
                              : `linear-gradient(to right, ${course.gradientFrom || "#312e81"}, ${course.gradientTo || "#6d28d9"})`,
                          }}
                        >
                          <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" />
                          <div className="flex items-center justify-between z-10">
                            <p className="font-bold text-[11px] tracking-[2px] text-white/90 uppercase">
                              {course.series || "THE CAREER SERIES"}
                            </p>
                            <button
                              onClick={(e) => toggleWishlist(course.id, e)}
                              className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition"
                              title="Save to wishlist"
                            >
                              <Heart className={`size-3.5 ${wishlistActive[course.id] ? "fill-white" : ""}`} />
                            </button>
                          </div>

                          <div className="flex items-end justify-between z-10">
                            <div className="font-extrabold text-[24px] leading-[1.1] tracking-[-1px] line-clamp-2">
                              {course.tagline || course.title}
                            </div>
                            <div className="size-[42px] rounded-[10px] border border-white/40 flex items-center justify-center bg-white/10 backdrop-blur-sm shrink-0">
                              <img src="/assets/lock.svg" alt="Lock status" className="size-[22px]" />
                            </div>
                          </div>
                        </div>

                        {/* Course Information */}
                        <div className="p-[24px] flex flex-col gap-[16px] flex-1 justify-between">
                          <div className="flex flex-col gap-[12px]">
                            <div className="flex items-center justify-between">
                              <span className="bg-[#f1f5f9] dark:bg-slate-800 text-[#475569] dark:text-slate-300 font-bold text-[12px] px-[10px] py-[5px] rounded-[100px]">
                                {course.category || "Professional Skill"}
                              </span>
                              <span className="text-[#b4690e] dark:text-amber-400 text-[12px] font-bold">
                                ★ {course.rating || "4.9"} <span className="text-slate-400 font-normal">({course.reviewCount || 128})</span>
                              </span>
                            </div>

                            <h3 className="font-bold text-[#0f172a] dark:text-white text-[19px] leading-[1.3] transition-colors group-hover:text-[#a435f0] line-clamp-2">
                              {course.title}
                            </h3>

                            <p className="text-[#475569] dark:text-slate-400 text-[14px]">
                              {course.instructor || "Lead Instructor"} · {course.lessonCount || 12} lessons · {course.durationHours || 6} hours
                            </p>

                            <div className="flex items-center gap-2">
                              <span className="bg-[#eceb98] text-[#3d3c0a] font-bold text-[11px] px-2 py-0.5 rounded">
                                {course.badge || "Bestseller"}
                              </span>
                              <span className="text-[11px] text-slate-400">{course.level || "All Levels"}</span>
                            </div>
                          </div>

                          <div className="flex flex-col gap-[16px] pt-2">
                            <div className="h-px bg-[#e2e8f0] dark:bg-slate-800" />
                            <div className="flex items-center justify-between">
                              <div className="bg-[#f1f5f9] dark:bg-slate-800 flex items-center gap-[6px] px-[10px] py-[5px] rounded-[100px]">
                                <img src="/assets/lock-1.svg" alt="" className="size-[14px] dark:brightness-125" />
                                <span className="font-bold text-[#475569] dark:text-slate-300 text-[12px]">
                                  {isEnrolled ? "Unlocked" : "Locked"}
                                </span>
                              </div>
                              <div className="flex items-center gap-2">
                                <span className="font-bold text-[#a435f0] dark:text-[#c084fc] text-[15px]">
                                  ${((course.priceCents || 20000) / 100).toFixed(0)} →
                                </span>
                                <button
                                  onClick={() => {
                                    if (isEnrolled) {
                                      navigate("/dashboard");
                                    } else {
                                      enrollInCourse(course.id);
                                    }
                                  }}
                                  className={`text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer ${
                                    isEnrolled
                                      ? "bg-emerald-600 text-white"
                                      : "bg-[#2d2f31] dark:bg-white text-white dark:text-[#2d2f31] hover:bg-black dark:hover:bg-slate-200"
                                  }`}
                                >
                                  {isEnrolled ? "✓ Unlocked" : "Enroll"}
                                </button>
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })
                )}
              </div>

              {/* Explore all courses text button (AOS: fade-up) */}
              <div data-aos="fade-up" className="pt-2">
                <a
                  href="#courses"
                  className="font-bold text-[#a435f0] dark:text-[#c084fc] hover:text-[#8710d8] dark:hover:text-[#d8b4fe] text-[14px] inline-flex items-center gap-1 group"
                >
                  <span>Explore all InternWala courses</span>
                  <span className="group-hover:translate-x-1 transition-transform">→</span>
                </a>
              </div>
            </div>
          </section>

          {/* =========================================================================
          5. HOW LEARNING WORKS (Top-down header & Bottom-up step cards)
         ========================================================================= */}
          <section id="how-it-works" className="bg-[#f8fafc] dark:bg-[#0c101c] py-[64px] px-6 sm:px-10 lg:px-[80px] border-y border-[#e2e8f0] dark:border-slate-800 transition-colors duration-300">
            <div className="max-w-[1440px] mx-auto flex flex-col gap-[40px]">
              {/* Section heading */}
              <div className="flex flex-col gap-[12px]">
                <p
                  data-aos="fade-down"
                  className="font-bold text-[#a435f0] dark:text-[#c084fc] text-[12px] tracking-wider uppercase"
                >
                  A CLEAR PATH FORWARD &bull; INTERNWALA
                </p>
                <div data-aos="fade-up" className="flex flex-col gap-[8px]">
                  <h2 className="font-extrabold text-[32px] sm:text-[40px] leading-[1.2] tracking-[-1.2px] text-[#0f172a] dark:text-white transition-colors">
                    From curious to capable.
                  </h2>
                  <p className="text-[#475569] dark:text-slate-300 text-[16px] transition-colors">
                    Four simple steps. A new set of possibilities.
                  </p>
                </div>
              </div>

              {/* 4 Steps Grid (AOS: fade-up staggered) */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-[32px]">
                {/* Step 1 */}
                <div
                  data-aos="fade-up"
                  data-aos-delay="100"
                  className="flex flex-col gap-[16px] bg-white dark:bg-slate-900/60 lg:bg-transparent dark:lg:bg-transparent p-6 lg:p-0 rounded-xl border border-slate-200/80 dark:border-slate-800 lg:border-none shadow-sm lg:shadow-none hover:-translate-y-1 transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <div className="size-[28px] text-[#0f172a] dark:text-white flex items-center justify-center">
                      <img src="/assets/compass.svg" alt="" className="size-[28px] dark:brightness-125" />
                    </div>
                    <span className="font-normal text-[#64748b] dark:text-slate-400 text-[14px] font-mono">
                      01
                    </span>
                  </div>
                  <h3 className="font-bold text-[#0f172a] dark:text-white text-[20px] leading-[1.3] transition-colors">
                    Find your course
                  </h3>
                  <p className="text-[#475569] dark:text-slate-400 text-[16px] leading-[1.5] transition-colors">
                    Choose the skill that moves you closer to your goals.
                  </p>
                </div>

                {/* Step 2 */}
                <div
                  data-aos="fade-up"
                  data-aos-delay="200"
                  className="flex flex-col gap-[16px] bg-white dark:bg-slate-900/60 lg:bg-transparent dark:lg:bg-transparent p-6 lg:p-0 rounded-xl border border-slate-200/80 dark:border-slate-800 lg:border-none shadow-sm lg:shadow-none hover:-translate-y-1 transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <div className="size-[28px] text-[#0f172a] dark:text-white flex items-center justify-center">
                      <img src="/assets/credit-card.svg" alt="" className="size-[28px] dark:brightness-125" />
                    </div>
                    <span className="font-normal text-[#64748b] dark:text-slate-400 text-[14px] font-mono">
                      02
                    </span>
                  </div>
                  <h3 className="font-bold text-[#0f172a] dark:text-white text-[20px] leading-[1.3] transition-colors">
                    Make it yours
                  </h3>
                  <p className="text-[#475569] dark:text-slate-400 text-[16px] leading-[1.5] transition-colors">
                    One secure payment. Lifetime access. No subscription.
                  </p>
                </div>

                {/* Step 3 */}
                <div
                  data-aos="fade-up"
                  data-aos-delay="300"
                  className="flex flex-col gap-[16px] bg-white dark:bg-slate-900/60 lg:bg-transparent dark:lg:bg-transparent p-6 lg:p-0 rounded-xl border border-slate-200/80 dark:border-slate-800 lg:border-none shadow-sm lg:shadow-none hover:-translate-y-1 transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <div className="size-[28px] text-[#0f172a] dark:text-white flex items-center justify-center">
                      <img src="/assets/circle-play-1.svg" alt="" className="size-[28px] dark:brightness-125" />
                    </div>
                    <span className="font-normal text-[#64748b] dark:text-slate-400 text-[14px] font-mono">
                      03
                    </span>
                  </div>
                  <h3 className="font-bold text-[#0f172a] dark:text-white text-[20px] leading-[1.3] transition-colors">
                    Learn by doing
                  </h3>
                  <p className="text-[#475569] dark:text-slate-400 text-[16px] leading-[1.5] transition-colors">
                    Watch, practice, and build momentum one lesson at a time.
                  </p>
                </div>

                {/* Step 4 */}
                <div
                  data-aos="fade-up"
                  data-aos-delay="400"
                  className="flex flex-col gap-[16px] bg-white dark:bg-slate-900/60 lg:bg-transparent dark:lg:bg-transparent p-6 lg:p-0 rounded-xl border border-slate-200/80 dark:border-slate-800 lg:border-none shadow-sm lg:shadow-none hover:-translate-y-1 transition-transform"
                >
                  <div className="flex items-center justify-between">
                    <div className="size-[28px] text-[#0f172a] dark:text-white flex items-center justify-center">
                      <img src="/assets/award.svg" alt="" className="size-[28px] dark:brightness-125" />
                    </div>
                    <span className="font-normal text-[#64748b] dark:text-slate-400 text-[14px] font-mono">
                      04
                    </span>
                  </div>
                  <h3 className="font-bold text-[#0f172a] dark:text-white text-[20px] leading-[1.3] transition-colors">
                    Share your growth
                  </h3>
                  <p className="text-[#475569] dark:text-slate-400 text-[16px] leading-[1.5] transition-colors">
                    Finish your course and earn a verifiable certificate.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================================
          6. LEARNER TESTIMONIALS (Top-down title & Bottom-up cards)
         ========================================================================= */}
          <section className="py-[64px] px-6 sm:px-10 lg:px-[80px] bg-white dark:bg-[#0a0d16] transition-colors duration-300">
            <div className="max-w-[1440px] mx-auto flex flex-col gap-[40px]">
              {/* Header */}
              <div className="flex flex-col gap-[12px]">
                <p
                  data-aos="fade-down"
                  className="font-bold text-[#a435f0] dark:text-[#c084fc] text-[12px] tracking-wider uppercase"
                >
                  REAL LEARNERS. REAL MOMENTUM.
                </p>
                <h2
                  data-aos="fade-up"
                  className="font-extrabold text-[32px] sm:text-[40px] leading-[1.2] tracking-[-1.2px] text-[#0f172a] dark:text-white transition-colors"
                >
                  Good things happen when you keep learning.
                </h2>
              </div>

              {/* Testimonials 3 Columns (AOS: fade-up staggered) */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-[24px]">
                {/* Testimonial 1 */}
                <div
                  data-aos="fade-up"
                  data-aos-delay="100"
                  className="border border-[#e2e8f0] dark:border-slate-800 p-[24px] rounded-[12px] flex flex-col justify-between gap-[24px] hover:shadow-lg transition-shadow bg-white dark:bg-slate-900"
                >
                  <div className="flex flex-col gap-[20px]">
                    <p className="text-[#b4690e] dark:text-amber-400 text-[18px] tracking-[2px] font-bold select-none">
                      ★★★★★
                    </p>
                    <p className="font-medium text-[#0f172a] dark:text-slate-200 text-[18px] leading-[1.5] transition-colors">
                      “This wasn’t just theory. I redesigned our onboarding flow the same week. The difference in clarity was immediate.”
                    </p>
                  </div>

                  <div className="flex flex-col gap-[4px] pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors">
                    <p className="font-bold text-[#0f172a] dark:text-white text-[14px]">
                      Marcus Vance
                    </p>
                    <p className="text-[#475569] dark:text-slate-400 text-[12px]">
                      Product lead at Webflow
                    </p>
                  </div>
                </div>

                {/* Testimonial 2 */}
                <div
                  data-aos="fade-up"
                  data-aos-delay="200"
                  className="border border-[#e2e8f0] dark:border-slate-800 p-[24px] rounded-[12px] flex flex-col justify-between gap-[24px] hover:shadow-lg transition-shadow bg-white dark:bg-slate-900"
                >
                  <div className="flex flex-col gap-[20px]">
                    <p className="text-[#b4690e] dark:text-amber-400 text-[18px] tracking-[2px] font-bold select-none">
                      ★★★★★
                    </p>
                    <p className="font-medium text-[#0f172a] dark:text-slate-200 text-[18px] leading-[1.5] transition-colors">
                      “Clear, considered, and genuinely useful. I went from second-guessing my process to leading our next discovery sprint.”
                    </p>
                  </div>

                  <div className="flex flex-col gap-[4px] pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors">
                    <p className="font-bold text-[#0f172a] dark:text-white text-[14px]">
                      Priya Patel
                    </p>
                    <p className="text-[#475569] dark:text-slate-400 text-[12px]">
                      Senior designer at Linear
                    </p>
                  </div>
                </div>

                {/* Testimonial 3 */}
                <div
                  data-aos="fade-up"
                  data-aos-delay="300"
                  className="border border-[#e2e8f0] dark:border-slate-800 p-[24px] rounded-[12px] flex flex-col justify-between gap-[24px] hover:shadow-lg transition-shadow bg-white dark:bg-slate-900"
                >
                  <div className="flex flex-col gap-[20px]">
                    <p className="text-[#b4690e] dark:text-amber-400 text-[18px] tracking-[2px] font-bold select-none">
                      ★★★★★
                    </p>
                    <p className="font-medium text-[#0f172a] dark:text-slate-200 text-[18px] leading-[1.5] transition-colors">
                      “The pace, the examples, the little details. It feels like learning from a brilliant colleague, not watching a lecture.”
                    </p>
                  </div>

                  <div className="flex flex-col gap-[4px] pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors">
                    <p className="font-bold text-[#0f172a] dark:text-white text-[14px]">
                      Daniel Kim
                    </p>
                    <p className="text-[#475569] dark:text-slate-400 text-[12px]">
                      Founder at Fieldwork
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================================
          7. FREQUENTLY ASKED QUESTIONS (FAQ) (Top-down & Bottom-up)
         ========================================================================= */}
          <section className="py-[64px] px-6 sm:px-10 lg:px-[80px] bg-slate-50/50 dark:bg-[#0c101c]/50 border-t border-[#e2e8f0] dark:border-slate-800 transition-colors duration-300">
            <div className="max-w-[1440px] mx-auto flex flex-col lg:flex-row gap-12 lg:gap-[80px]">
              {/* FAQ Intro Left Column (AOS: fade-down) */}
              <div
                data-aos="fade-down"
                className="w-full lg:w-[400px] flex flex-col gap-[16px] shrink-0"
              >
                <div className="flex flex-col gap-[12px]">
                  <p className="font-bold text-[#a435f0] dark:text-[#c084fc] text-[12px] tracking-wider uppercase">
                    A FEW THINGS TO KNOW
                  </p>
                  <h2 className="font-extrabold text-[32px] sm:text-[40px] leading-[1.2] tracking-[-1.2px] text-[#0f172a] dark:text-white transition-colors">
                    Learning, without the guesswork.
                  </h2>
                </div>
                <p className="text-[#475569] dark:text-slate-300 text-[16px] leading-[1.5] transition-colors">
                  Still curious? We’re here to help.
                </p>
                <a
                  href="mailto:hello@internwala.com"
                  className="font-bold text-[#a435f0] dark:text-[#c084fc] hover:text-[#8710d8] dark:hover:text-[#d8b4fe] text-[14px] inline-flex items-center gap-1 group"
                >
                  <span>hello@internwala.com</span>
                  <span className="group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform">↗</span>
                </a>
              </div>

              {/* FAQ Accordion Items (AOS: fade-up) */}
              <div
                data-aos="fade-up"
                data-aos-delay="150"
                className="flex-1 flex flex-col divide-y divide-[#e2e8f0] dark:divide-slate-800 transition-colors"
              >
                {/* FAQ 1 */}
                <div className="py-[24px]">
                  <button
                    onClick={() => toggleFaq(0)}
                    className="w-full flex items-start justify-between gap-[16px] text-left group focus:outline-none cursor-pointer"
                  >
                    <span className="font-bold text-[#0f172a] dark:text-white text-[16px] leading-[1.5] group-hover:text-[#a435f0] dark:group-hover:text-[#c084fc] transition-colors">
                      How long do I have access?
                    </span>
                    <span className="shrink-0 pt-0.5">
                      {openFaq[0] ? (
                        <img src="/assets/minus.svg" alt="Collapse" className="size-[20px] dark:brightness-125" />
                      ) : (
                        <img src="/assets/plus.svg" alt="Expand" className="size-[20px] dark:brightness-125" />
                      )}
                    </span>
                  </button>
                  {openFaq[0] && (
                    <p className="text-[#475569] dark:text-slate-300 text-[16px] leading-[1.5] pt-[12px] animate-fadeIn">
                      Your course is yours for life, including future updates. Revisit lessons whenever you need a little inspiration.
                    </p>
                  )}
                </div>

                {/* FAQ 2 */}
                <div className="py-[24px]">
                  <button
                    onClick={() => toggleFaq(1)}
                    className="w-full flex items-start justify-between gap-[16px] text-left group focus:outline-none cursor-pointer"
                  >
                    <span className="font-bold text-[#0f172a] dark:text-white text-[16px] leading-[1.5] group-hover:text-[#a435f0] dark:group-hover:text-[#c084fc] transition-colors">
                      Do I need any previous experience?
                    </span>
                    <span className="shrink-0 pt-0.5">
                      {openFaq[1] ? (
                        <img src="/assets/minus.svg" alt="Collapse" className="size-[20px] dark:brightness-125" />
                      ) : (
                        <img src="/assets/plus.svg" alt="Expand" className="size-[20px] dark:brightness-125" />
                      )}
                    </span>
                  </button>
                  {openFaq[1] && (
                    <p className="text-[#475569] dark:text-slate-300 text-[16px] leading-[1.5] pt-[12px] animate-fadeIn">
                      Each course clearly lists its level. Product Design is beginner-friendly; bring curiosity and a willingness to practice.
                    </p>
                  )}
                </div>

                {/* FAQ 3 */}
                <div className="py-[24px]">
                  <button
                    onClick={() => toggleFaq(2)}
                    className="w-full flex items-start justify-between gap-[16px] text-left group focus:outline-none cursor-pointer"
                  >
                    <span className="font-bold text-[#0f172a] dark:text-white text-[16px] leading-[1.5] group-hover:text-[#a435f0] dark:group-hover:text-[#c084fc] transition-colors">
                      Will I get a certificate?
                    </span>
                    <span className="shrink-0 pt-0.5">
                      {openFaq[2] ? (
                        <img src="/assets/minus.svg" alt="Collapse" className="size-[20px] dark:brightness-125" />
                      ) : (
                        <img src="/assets/plus.svg" alt="Expand" className="size-[20px] dark:brightness-125" />
                      )}
                    </span>
                  </button>
                  {openFaq[2] && (
                    <p className="text-[#475569] dark:text-slate-300 text-[16px] leading-[1.5] pt-[12px] animate-fadeIn">
                      Yes, upon completing all lessons and assignments, you will earn an authentic, verifiable certificate you can add to LinkedIn, share with managers, or showcase in your portfolio.
                    </p>
                  )}
                </div>

                {/* FAQ 4 */}
                <div className="py-[24px]">
                  <button
                    onClick={() => toggleFaq(3)}
                    className="w-full flex items-start justify-between gap-[16px] text-left group focus:outline-none cursor-pointer"
                  >
                    <span className="font-bold text-[#0f172a] dark:text-white text-[16px] leading-[1.5] group-hover:text-[#a435f0] dark:group-hover:text-[#c084fc] transition-colors">
                      What if the course isn’t right for me?
                    </span>
                    <span className="shrink-0 pt-0.5">
                      {openFaq[3] ? (
                        <img src="/assets/minus.svg" alt="Collapse" className="size-[20px] dark:brightness-125" />
                      ) : (
                        <img src="/assets/plus.svg" alt="Expand" className="size-[20px] dark:brightness-125" />
                      )}
                    </span>
                  </button>
                  {openFaq[3] && (
                    <p className="text-[#475569] dark:text-slate-300 text-[16px] leading-[1.5] pt-[12px] animate-fadeIn">
                      We offer a 30-day money-back guarantee. If you decide the course isn’t a fit, send an email to support within 30 days of purchase for a complete refund.
                    </p>
                  )}
                </div>

                {/* FAQ 5 */}
                <div className="py-[24px]">
                  <button
                    onClick={() => toggleFaq(4)}
                    className="w-full flex items-start justify-between gap-[16px] text-left group focus:outline-none cursor-pointer"
                  >
                    <span className="font-bold text-[#0f172a] dark:text-white text-[16px] leading-[1.5] group-hover:text-[#a435f0] dark:group-hover:text-[#c084fc] transition-colors">
                      Can my company pay for this?
                    </span>
                    <span className="shrink-0 pt-0.5">
                      {openFaq[4] ? (
                        <img src="/assets/minus.svg" alt="Collapse" className="size-[20px] dark:brightness-125" />
                      ) : (
                        <img src="/assets/plus.svg" alt="Expand" className="size-[20px] dark:brightness-125" />
                      )}
                    </span>
                  </button>
                  {openFaq[4] && (
                    <p className="text-[#475569] dark:text-slate-300 text-[16px] leading-[1.5] pt-[12px] animate-fadeIn">
                      Most employers are happy to cover learning expenses through learning and development budgets. We provide automated itemized invoices with your company’s VAT/tax number.
                    </p>
                  )}
                </div>
              </div>
            </div>
          </section>

          {/* =========================================================================
          8. CALL TO ACTION BANNER (AOS: fade-up)
         ========================================================================= */}
          <section
            data-aos="fade-up"
            className="bg-[#0f172a] dark:bg-[#070912] py-[64px] px-6 sm:px-12 md:px-[160px] text-center text-white relative overflow-hidden transition-colors duration-300"
          >
            {/* Subtle decorative glow */}
            <div className="absolute left-1/2 -top-40 -translate-x-1/2 size-[500px] bg-[#a435f0]/10 rounded-full blur-3xl pointer-events-none" />

            <div className="max-w-[700px] mx-auto flex flex-col items-center gap-[24px] relative z-10">
              <p className="font-bold text-[#c084fc] text-[12px] tracking-wider uppercase">
                YOUR TURN TO BEGIN &bull; INTERNWALA
              </p>

              <h2 className="font-extrabold text-[32px] sm:text-[48px] leading-[1.1] tracking-[-1.5px]">
                Ready to find your edge?
              </h2>

              <p className="text-slate-300 text-[16px] sm:text-[18px] leading-[1.5] max-w-[500px]">
                Explore our practical courses, learn at your pace, and build skills that last a career.
              </p>

              <div className="pt-2">
                <a
                  href="#courses"
                  className="bg-[#a435f0] hover:bg-[#8710d8] text-white px-[24px] py-[12px] min-h-[48px] rounded-[6px] font-bold text-[14px] inline-flex items-center justify-center gap-[8px] transition-all shadow-lg hover:shadow-purple-500/25 active:scale-[0.98] mt-2 group"
                >
                  <img
                    src="/assets/arrow-right.svg"
                    alt=""
                    className="size-[18px] group-hover:translate-x-1 transition-transform"
                  />
                  <span>Find your next course</span>
                </a>
              </div>
            </div>
          </section>
        </>
      )}

      {/* =========================================================================
          9. FOOTER (AOS: fade-up, with Udemy-inspired clean multi-columns)
         ========================================================================= */}
      <footer
        data-aos="fade-up"
        className="bg-white dark:bg-[#0a0d16] py-[48px] px-6 sm:px-10 lg:px-[80px] border-t border-[#e2e8f0] dark:border-slate-800 transition-colors duration-300"
      >
        <div className="max-w-[1440px] mx-auto flex flex-col gap-[40px]">
          {/* Main Footer Links */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-8 lg:gap-[48px]">
            {/* Brand column */}
            <div className="lg:col-span-2 flex flex-col gap-[16px]">
              <div className="flex items-center gap-[10px]">
                <div className="bg-[#a435f0] rounded-[9px] size-[32px] flex items-center justify-center shrink-0 text-white font-black text-sm">
                  iW
                </div>
                <span className="font-extrabold text-[19px] tracking-tight text-[#0f172a] dark:text-white transition-colors">
                  intern<span className="text-[#a435f0]">wala</span>
                </span>
              </div>
              <p className="text-[#475569] dark:text-slate-400 text-[15px] leading-[1.5] max-w-[340px] transition-colors">
                Learn with intention. Build projects. Land your dream internship.
              </p>
            </div>

            {/* Column 1: Learn */}
            <div className="flex flex-col gap-[16px] text-[14px] leading-[1.5]">
              <p className="font-bold text-[#0f172a] dark:text-white">
                Learn
              </p>
              <a href="#courses" className="text-[#475569] dark:text-slate-400 hover:text-[#a435f0] dark:hover:text-[#c084fc] transition-colors">
                Explore courses
              </a>
              <a href="#courses" className="text-[#475569] dark:text-slate-400 hover:text-[#a435f0] dark:hover:text-[#c084fc] transition-colors">
                My learning
              </a>
              <a href="#courses" className="text-[#475569] dark:text-slate-400 hover:text-[#a435f0] dark:hover:text-[#c084fc] transition-colors">
                Certificates
              </a>
            </div>

            {/* Column 2: Company */}
            <div className="flex flex-col gap-[16px] text-[14px] leading-[1.5]">
              <p className="font-bold text-[#0f172a] dark:text-white">
                Company
              </p>
              <a href="#our-story" className="text-[#475569] dark:text-slate-400 hover:text-[#a435f0] dark:hover:text-[#c084fc] transition-colors">
                Our story
              </a>
              <a href="#courses" className="text-[#475569] dark:text-slate-400 hover:text-[#a435f0] dark:hover:text-[#c084fc] transition-colors">
                Become an instructor
              </a>
              <a href="mailto:hello@internwala.com" className="text-[#475569] dark:text-slate-400 hover:text-[#a435f0] dark:hover:text-[#c084fc] transition-colors">
                Contact us
              </a>
            </div>

            {/* Column 3: Support */}
            <div className="flex flex-col gap-[16px] text-[14px] leading-[1.5]">
              <p className="font-bold text-[#0f172a] dark:text-white">
                Support
              </p>
              <a href="#" className="text-[#475569] dark:text-slate-400 hover:text-[#a435f0] dark:hover:text-[#c084fc] transition-colors">
                Help center
              </a>
              <a href="#" className="text-[#475569] dark:text-slate-400 hover:text-[#a435f0] dark:hover:text-[#c084fc] transition-colors">
                Accessibility
              </a>
              <a href="#" className="text-[#475569] dark:text-slate-400 hover:text-[#a435f0] dark:hover:text-[#c084fc] transition-colors">
                Refund policy
              </a>
            </div>
          </div>

          {/* Legal / Copyright Bottom Bar with Udemy Globe language button */}
          <div className="border-t border-[#e2e8f0] dark:border-slate-800 pt-[24px] flex flex-col sm:flex-row items-center justify-between gap-4 transition-colors">
            <p className="text-[#64748b] dark:text-slate-500 text-[12px] leading-[1.5]">
              © 2026 InternWala. Keep growing. · Privacy policy · Terms of service
            </p>
            <div className="flex items-center gap-2 text-xs text-slate-500">
              <Globe className="size-3.5" />
              <span>English (US)</span>
            </div>
          </div>
        </div>
      </footer>

      {/* Authentication & Authorization Modal (Figma Sign In & Sign Up) */}
      <AuthModal />

      {/* Account Settings Modal (Figma 3:119960 - Desktop Account Settings) */}
      <AccountSettingsModal />
    </div>
  );
}