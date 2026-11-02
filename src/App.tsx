import { useState, useEffect } from 'react';
import AOS from 'aos';
import 'aos/dist/aos.css';
import { useAuth } from './context/AuthContext';
import AuthModal from './components/AuthModal';
import AccountSettingsModal from './components/AccountSettingsModal';
import StudentDashboard from './components/StudentDashboard';
import AdminGuard from './components/AdminGuard';

// Modular Landing Page Components
import PromoBanner from './components/landing/PromoBanner';
import Navbar from './components/landing/Navbar';
import HeroSection from './components/landing/HeroSection';
import StatsAndLogos from './components/landing/StatsAndLogos';
import CoursesGridSection from './components/landing/CoursesGridSection';
import HowItWorksSection from './components/landing/HowItWorksSection';
import TestimonialsSection from './components/landing/TestimonialsSection';
import FaqSection from './components/landing/FaqSection';
import Footer from './components/landing/Footer';

export default function App() {
  // 1. Theme State (Light / Dark)
  const [theme, setTheme] = useState<'light' | 'dark'>(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('theme');
      if (saved === 'dark' || saved === 'light') return saved;
      return window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
    }
    return 'light';
  });

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

  // 2. AOS Scroll Animations
  useEffect(() => {
    AOS.init({
      duration: 750,
      easing: 'ease-out-cubic',
      once: false,
      mirror: true,
      offset: 40,
    });
  }, []);

  useEffect(() => {
    AOS.refresh();
  }, [theme]);

  // 3. Routing & History Navigation
  const [currentPath, setCurrentPath] = useState<string>(() => window.location.pathname || '/');

  const navigate = (path: string) => {
    if (window.location.pathname !== path) {
      window.history.pushState({}, '', path);
    }
    setCurrentPath(path);
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  useEffect(() => {
    const handlePopState = () => {
      setCurrentPath(window.location.pathname || '/');
    };
    window.addEventListener('popstate', handlePopState);
    return () => window.removeEventListener('popstate', handlePopState);
  }, []);

  // 4. Auth Context
  const { user, openAuthModal, openSettingsModal, signOut, enrolledCourses, enrollInCourse } = useAuth();

  // Auto-redirect to /dashboard when user logs in from landing page
  useEffect(() => {
    if (user && currentPath === '/') {
      navigate('/dashboard');
    }
  }, [user]);

  // 5. Promo Banner State
  const [bannerVisible, setBannerVisible] = useState(true);

  // 6. Dynamic Public Course Catalog State
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

  // Routing indicators
  const isDashboard = currentPath.startsWith('/dashboard');
  const isAdmin = currentPath.startsWith('/admin');

  return (
    <div className="bg-white dark:bg-[#0a0d16] text-[#0f172a] dark:text-[#f1f5f9] font-sans antialiased min-h-screen flex flex-col selection:bg-[#a435f0] selection:text-white transition-colors duration-300">
      {/* Promotional Top Flash Bar */}
      <PromoBanner visible={bannerVisible} onDismiss={() => setBannerVisible(false)} />

      {/* Global Navigation Bar */}
      <Navbar
        theme={theme}
        toggleTheme={toggleTheme}
        currentPath={currentPath}
        navigate={navigate}
        user={user}
        enrolledCoursesCount={enrolledCourses.length}
        onOpenAuth={openAuthModal}
        onOpenSettings={openSettingsModal}
        onSignOut={signOut}
      />

      {/* Main View Router */}
      {isAdmin ? (
        <AdminGuard
          onBackToApp={() => navigate(user ? '/dashboard' : '/')}
          onCourseModified={fetchLandingCourses}
        />
      ) : isDashboard ? (
        <StudentDashboard onBackToExplore={() => navigate('/')} />
      ) : (
        <>
          {/* Landing Page Content Sections */}
          <HeroSection user={user} navigate={navigate} />
          <StatsAndLogos />
          <CoursesGridSection
            courses={landingCourses}
            loading={loadingLandingCourses}
            enrolledCourses={enrolledCourses}
            onEnroll={enrollInCourse}
            onNavigateToDashboard={() => navigate('/dashboard')}
          />
          <HowItWorksSection />
          <TestimonialsSection />
          <FaqSection />
          <Footer />
        </>
      )}

      {/* Modals */}
      <AuthModal />
      <AccountSettingsModal />
    </div>
  );
}
