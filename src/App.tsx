import { useState, useEffect } from 'react';
import {
  Menu,
  X,
  VolumeX,
  Sun,
  Moon,
  Sparkles,
} from 'lucide-react';
import AOS from 'aos';
import 'aos/dist/aos.css';

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
    <div className="bg-white dark:bg-[#0a0d16] text-[#0f172a] dark:text-[#f1f5f9] font-sans antialiased min-h-screen flex flex-col selection:bg-[#4f46e5] selection:text-white transition-colors duration-300">
      {/* =========================================================================
          1. NAVIGATION BAR (with AOS fade-down)
         ========================================================================= */}
      <header
        data-aos="fade-down"
        className="bg-white/95 dark:bg-[#0a0d16]/95 backdrop-blur-md border-b border-[#e2e8f0] dark:border-slate-800/80 sticky top-0 z-50 transition-colors duration-200"
      >
        <div className="max-w-[1440px] mx-auto px-6 sm:px-10 lg:px-[80px] h-[80px] flex items-center justify-between">
          {/* LMS Portal Brand */}
          <a href="#" className="flex items-center gap-[10px] group focus:outline-none">
            <div className="bg-[#4f46e5] rounded-[9px] size-[32px] flex items-center justify-center shrink-0 shadow-sm group-hover:scale-105 transition-transform">
              <img
                src="/assets/layers-2.svg"
                alt="LMS Portal"
                className="size-[20px]"
                onError={(e) => {
                  (e.target as HTMLElement).style.display = 'none';
                }}
              />
            </div>
            <span className="font-extrabold text-[19px] tracking-[-0.5px] text-[#0f172a] dark:text-white transition-colors">
              LMS Portal
            </span>
          </a>

          {/* Desktop Navigation Links */}
          <nav className="hidden md:flex items-center gap-[32px] text-[14px]">
            <a
              href="#courses"
              className="font-bold text-[#4f46e5] dark:text-[#818cf8] transition-colors"
            >
              Explore courses
            </a>
            <a
              href="#how-it-works"
              className="font-medium text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white transition-colors"
            >
              How it works
            </a>
            <a
              href="#our-story"
              className="font-medium text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white transition-colors"
            >
              Our story
            </a>
          </nav>

          {/* Account Actions & Dark Mode Toggle */}
          <div className="flex items-center gap-[12px] sm:gap-[16px]">
            {/* Theme Toggle Button */}
            <button
              onClick={toggleTheme}
              aria-label="Toggle Dark Mode"
              className="p-2.5 rounded-lg border border-[#e2e8f0] dark:border-slate-800 text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white bg-slate-50 dark:bg-slate-900/80 hover:bg-slate-100 dark:hover:bg-slate-800 transition-all duration-200"
              title={theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {theme === 'dark' ? (
                <Sun className="size-[18px] text-amber-400 animate-spin-slow" />
              ) : (
                <Moon className="size-[18px] text-slate-700" />
              )}
            </button>

            <button
              className="hidden sm:inline-flex font-normal text-[14px] text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white px-3 py-2 transition-colors cursor-pointer"
            >
              Sign in
            </button>
            <a
              href="#courses"
              className="bg-white dark:bg-slate-900 hover:bg-slate-50 dark:hover:bg-slate-800 border border-[#e2e8f0] dark:border-slate-700 px-[20px] py-[12px] rounded-[8px] font-bold text-[14px] text-[#0f172a] dark:text-white shadow-sm transition hover:border-slate-300 dark:hover:border-slate-600 active:scale-[0.98] inline-flex items-center justify-center"
            >
              Get started
            </a>

            {/* Mobile Hamburger Button */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-2 rounded-lg text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition"
              aria-label="Toggle Navigation Menu"
            >
              {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-[#e2e8f0] dark:border-slate-800 bg-white dark:bg-[#0a0d16] px-6 py-4 flex flex-col gap-4 shadow-lg animate-fadeIn">
            <a
              href="#courses"
              onClick={() => setMobileMenuOpen(false)}
              className="font-bold text-[#4f46e5] dark:text-[#818cf8] py-2 text-base"
            >
              Explore courses
            </a>
            <a
              href="#how-it-works"
              onClick={() => setMobileMenuOpen(false)}
              className="font-medium text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white py-2 text-base"
            >
              How it works
            </a>
            <a
              href="#our-story"
              onClick={() => setMobileMenuOpen(false)}
              className="font-medium text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white py-2 text-base"
            >
              Our story
            </a>
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
              <button
                onClick={() => setMobileMenuOpen(false)}
                className="w-full text-left font-medium text-[#475569] dark:text-slate-300 py-2 text-base"
              >
                Sign in
              </button>
              <a
                href="#courses"
                onClick={() => setMobileMenuOpen(false)}
                className="bg-[#4f46e5] text-white py-3 rounded-lg text-center font-bold text-sm"
              >
                Get started
              </a>
            </div>
          </div>
        )}
      </header>

      {/* =========================================================================
          2. GRADIENT MESH HERO SECTION (Top-down & Bottom-up AOS)
         ========================================================================= */}
      <section className="bg-gradient-to-r from-[#f8faff] via-[#eef2ff] via-[60%] to-[#f5f3ff] dark:from-[#080b14] dark:via-[#0e1224] dark:via-[60%] dark:to-[#110e24] relative overflow-hidden pb-[64px] pt-[60px] md:pt-[80px] transition-colors duration-300">
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
                className="bg-[#eef2ff] dark:bg-indigo-950/60 border border-[#e0e7ff] dark:border-indigo-800/80 px-[10px] py-[5px] rounded-[100px] inline-flex items-center gap-[6px] shadow-sm"
              >
                <img
                  src="/assets/sparkles.svg"
                  alt=""
                  className="size-[14px]"
                  onError={(e) => {
                    (e.target as HTMLElement).style.display = 'none';
                  }}
                />
                <Sparkles className="size-[13px] text-[#4f46e5] dark:text-[#818cf8] hidden" />
                <span className="font-bold text-[#4f46e5] dark:text-[#a5b4fc] text-[12px] tracking-wider uppercase">
                  LEARN WITH INTENTION
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
              <div data-aos="fade-up" data-aos-delay="200">
                <a
                  href="#courses"
                  className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-[20px] py-[12px] min-h-[48px] rounded-[8px] font-bold text-[14px] inline-flex items-center justify-center gap-[8px] transition-all shadow-md hover:shadow-lg active:scale-[0.98] group"
                >
                  <img
                    src="/assets/arrow-right.svg"
                    alt=""
                    className="size-[18px] group-hover:translate-x-1 transition-transform"
                  />
                  <span>Explore courses</span>
                </a>
              </div>

              {/* Social Proof (AOS: fade-up) */}
              <div
                data-aos="fade-up"
                data-aos-delay="250"
                className="flex items-center gap-[12px] pt-1"
              >
                <span className="text-[#b45309] dark:text-amber-500 text-[18px] tracking-[2px] select-none font-bold">
                  ★★★★★
                </span>
                <span className="text-[#475569] dark:text-slate-400 text-[12px] font-medium transition-colors">
                  Loved by 2,400+ curious minds
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
                <div className="bg-[#eef2ff] dark:bg-indigo-950/70 border border-transparent dark:border-indigo-800/50 px-[10px] py-[4px] rounded-[100px]">
                  <span className="font-bold text-[#4f46e5] dark:text-[#a5b4fc] text-[12px]">
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
                      className={`text-left p-3 sm:p-[20px] rounded-[12px] border transition-all cursor-pointer ${
                        activeStep === 1
                          ? 'bg-[#4f46e5] border-[#a5b4fc] shadow-lg shadow-indigo-950/50 scale-[1.02]'
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
                      className={`text-left p-3 sm:p-[20px] rounded-[12px] border transition-all cursor-pointer ${
                        activeStep === 2
                          ? 'bg-[#4f46e5] border-[#a5b4fc] shadow-lg shadow-indigo-950/50 scale-[1.02]'
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
                      className={`text-left p-3 sm:p-[20px] rounded-[12px] border transition-all cursor-pointer ${
                        activeStep === 3
                          ? 'bg-[#4f46e5] border-[#a5b4fc] shadow-lg shadow-indigo-950/50 scale-[1.02]'
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
                      className="h-full bg-[#a78bfa] rounded-full transition-all duration-150"
                      style={{ width: `${(currentTime / 1800) * 100}%` }}
                    />
                  </div>

                  {/* Actions Row */}
                  <div className="flex items-center justify-between text-white text-[12px]">
                    <div className="flex items-center gap-[16px]">
                      {/* Play/Pause Button */}
                      <button
                        onClick={() => setIsPlaying(!isPlaying)}
                        className="hover:text-[#a78bfa] transition focus:outline-none"
                        aria-label={isPlaying ? 'Pause' : 'Play'}
                      >
                        {isPlaying ? (
                          <img src="/assets/pause.svg" alt="Pause" className="size-[20px]" />
                        ) : (
                          <img src="/assets/circle-play.svg" alt="Play" className="size-[20px]" />
                        )}
                      </button>

                      {/* Volume / Mute Button */}
                      <button
                        onClick={() => setIsMuted(!isMuted)}
                        className="hover:text-[#a78bfa] transition focus:outline-none"
                        aria-label={isMuted ? 'Unmute' : 'Mute'}
                      >
                        {isMuted ? (
                          <VolumeX className="size-[20px]" />
                        ) : (
                          <img src="/assets/volume-2.svg" alt="Volume" className="size-[20px]" />
                        )}
                      </button>

                      {/* Timestamp */}
                      <span className="font-mono text-white/90">
                        {formatTime(currentTime)} / 30:00
                      </span>
                    </div>

                    {/* Secondary Actions */}
                    <div className="flex items-center gap-[12px]">
                      <button
                        onClick={cycleSpeed}
                        className="px-2 py-0.5 rounded bg-white/10 hover:bg-white/20 transition text-[11px] font-semibold"
                        title="Playback speed"
                      >
                        {playbackSpeed}
                      </button>

                      <button
                        onClick={() => setCaptionsOn(!captionsOn)}
                        className={`transition focus:outline-none ${captionsOn ? 'text-[#a78bfa]' : 'text-white/60'}`}
                        title="Captions"
                      >
                        <img src="/assets/captions.svg" alt="Captions" className="size-[20px]" />
                      </button>

                      <button
                        onClick={() => {
                          const elem = document.documentElement;
                          if (!document.fullscreenElement) {
                            elem.requestFullscreen?.().catch(() => {});
                          } else {
                            document.exitFullscreen?.().catch(() => {});
                          }
                        }}
                        className="hover:text-[#a78bfa] transition focus:outline-none"
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
                    Maya Chen · Product Design
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
            WHERE OUR LEARNERS MAKE AN IMPACT
          </p>

          <div
            data-aos="fade-up"
            data-aos-delay="100"
            className="flex flex-wrap items-center justify-center gap-10 sm:gap-16 lg:gap-[80px] font-extrabold text-[#475569] dark:text-slate-400 text-[22px] sm:text-[24px] tracking-[-1px] select-none"
          >
            <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">Notion</span>
            <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default lowercase font-bold tracking-normal">stripe</span>
            <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">Linear</span>
            <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">Webflow</span>
            <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">Figma</span>
          </div>
        </div>
      </section>

      {/* =========================================================================
          4. FEATURED COURSES SECTION (Clicking on course does NOTHING as requested)
         ========================================================================= */}
      <section id="courses" className="py-[64px] px-6 sm:px-10 lg:px-[80px] bg-white dark:bg-[#0a0d16] transition-colors duration-300">
        <div className="max-w-[1440px] mx-auto flex flex-col gap-[32px]">
          {/* Header (Top-down & Bottom-up) */}
          <div className="flex flex-col gap-[12px]">
            <p
              data-aos="fade-down"
              className="font-bold text-[#4f46e5] dark:text-[#818cf8] text-[12px] tracking-wider uppercase"
            >
              CURATED FOR YOUR NEXT CHAPTER
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

          {/* 3 Course Cards Grid (AOS: fade-up staggered, NO CLICK ACTION) */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
            {/* COURSE CARD 1: Product Design */}
            <div
              data-aos="fade-up"
              data-aos-delay="100"
              className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-[12px] overflow-hidden shadow-[0px_4px_16px_0px_rgba(15,23,42,0.03)] dark:shadow-none hover:-translate-y-1 transition-all duration-200 flex flex-col select-none"
            >
              {/* Thumbnail banner */}
              <div className="bg-gradient-to-r from-[#312e81] to-[#6d28d9] h-[176px] p-[24px] relative overflow-hidden flex flex-col justify-between text-white">
                <div className="absolute right-[-40px] top-[-80px] size-[340px] pointer-events-none opacity-80">
                  <img src="/assets/ambient-glow.svg" alt="" className="w-full h-full" />
                </div>
                <div className="absolute inset-0 bg-[#0f172a]/25 pointer-events-none" />

                <p className="font-bold text-[11px] tracking-[2px] text-white/90 uppercase z-10">
                  THE PRODUCT SERIES
                </p>

                <div className="flex items-end justify-between z-10">
                  <div className="font-extrabold text-[27px] leading-[1.06] tracking-[-1px]">
                    <p>Design with</p>
                    <p>intent.</p>
                  </div>
                  <div className="size-[48px] rounded-[12px] border border-white/40 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                    <img src="/assets/lock.svg" alt="Locked" className="size-[26px]" />
                  </div>
                </div>
              </div>

              {/* Course information */}
              <div className="p-[24px] flex flex-col gap-[16px] flex-1 justify-between">
                <div className="flex flex-col gap-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="bg-[#f1f5f9] dark:bg-slate-800 text-[#475569] dark:text-slate-300 font-bold text-[12px] px-[10px] py-[5px] rounded-[100px]">
                      Product design
                    </span>
                    <span className="text-[#b45309] dark:text-amber-500 text-[12px] font-normal">
                      ★ 4.9 (128)
                    </span>
                  </div>

                  <h3 className="font-bold text-[#0f172a] dark:text-white text-[20px] leading-[1.3] transition-colors">
                    Product Design, from insight to impact
                  </h3>

                  <p className="text-[#475569] dark:text-slate-400 text-[14px]">
                    Maya Chen · 12 lessons · 6 hours
                  </p>
                </div>

                <div className="flex flex-col gap-[16px] pt-2">
                  <div className="h-px bg-[#e2e8f0] dark:bg-slate-800" />
                  <div className="flex items-center justify-between">
                    <div className="bg-[#f1f5f9] dark:bg-slate-800 flex items-center gap-[6px] px-[10px] py-[5px] rounded-[100px]">
                      <img src="/assets/lock-1.svg" alt="" className="size-[14px] dark:brightness-125" />
                      <span className="font-bold text-[#475569] dark:text-slate-300 text-[12px]">
                        Locked
                      </span>
                    </div>
                    <span className="font-bold text-[#4f46e5] dark:text-[#818cf8] text-[14px]">
                      $200 →
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* COURSE CARD 2: Systems Thinking */}
            <div
              data-aos="fade-up"
              data-aos-delay="200"
              className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-[12px] overflow-hidden shadow-[0px_4px_16px_0px_rgba(15,23,42,0.03)] dark:shadow-none hover:-translate-y-1 transition-all duration-200 flex flex-col select-none"
            >
              {/* Thumbnail banner */}
              <div className="bg-[#0f766e] h-[176px] p-[24px] relative overflow-hidden flex flex-col justify-between text-white">
                <div className="absolute right-[-40px] top-[-80px] size-[340px] pointer-events-none opacity-80">
                  <img src="/assets/ambient-glow.svg" alt="" className="w-full h-full" />
                </div>
                <div className="absolute inset-0 bg-[#0f172a]/25 pointer-events-none" />

                <p className="font-bold text-[11px] tracking-[2px] text-white/90 uppercase z-10">
                  THE STRATEGY SERIES
                </p>

                <div className="flex items-end justify-between z-10">
                  <div className="font-extrabold text-[27px] leading-[1.06] tracking-[-1px]">
                    <p>Think in</p>
                    <p>systems.</p>
                  </div>
                  <div className="size-[48px] rounded-[12px] border border-white/40 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                    <img src="/assets/lock.svg" alt="Locked" className="size-[26px]" />
                  </div>
                </div>
              </div>

              {/* Course information */}
              <div className="p-[24px] flex flex-col gap-[16px] flex-1 justify-between">
                <div className="flex flex-col gap-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="bg-[#f1f5f9] dark:bg-slate-800 text-[#475569] dark:text-slate-300 font-bold text-[12px] px-[10px] py-[5px] rounded-[100px]">
                      Product strategy
                    </span>
                    <span className="text-[#b45309] dark:text-amber-500 text-[12px] font-normal">
                      ★ 4.9 (128)
                    </span>
                  </div>

                  <h3 className="font-bold text-[#0f172a] dark:text-white text-[20px] leading-[1.3] transition-colors">
                    Systems thinking for product teams
                  </h3>

                  <p className="text-[#475569] dark:text-slate-400 text-[14px]">
                    Jordan Lee · 12 lessons · 6 hours
                  </p>
                </div>

                <div className="flex flex-col gap-[16px] pt-2">
                  <div className="h-px bg-[#e2e8f0] dark:bg-slate-800" />
                  <div className="flex items-center justify-between">
                    <div className="bg-[#f1f5f9] dark:bg-slate-800 flex items-center gap-[6px] px-[10px] py-[5px] rounded-[100px]">
                      <img src="/assets/lock-1.svg" alt="" className="size-[14px] dark:brightness-125" />
                      <span className="font-bold text-[#475569] dark:text-slate-300 text-[12px]">
                        Locked
                      </span>
                    </div>
                    <span className="font-bold text-[#4f46e5] dark:text-[#818cf8] text-[14px]">
                      $200 →
                    </span>
                  </div>
                </div>
              </div>
            </div>

            {/* COURSE CARD 3: Brand Design */}
            <div
              data-aos="fade-up"
              data-aos-delay="300"
              className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-[12px] overflow-hidden shadow-[0px_4px_16px_0px_rgba(15,23,42,0.03)] dark:shadow-none hover:-translate-y-1 transition-all duration-200 flex flex-col select-none"
            >
              {/* Thumbnail banner */}
              <div className="bg-gradient-to-r from-[#7c2d12] to-[#b45309] h-[176px] p-[24px] relative overflow-hidden flex flex-col justify-between text-white">
                <div className="absolute right-[-40px] top-[-80px] size-[340px] pointer-events-none opacity-80">
                  <img src="/assets/ambient-glow.svg" alt="" className="w-full h-full" />
                </div>
                <div className="absolute inset-0 bg-[#0f172a]/25 pointer-events-none" />

                <p className="font-bold text-[11px] tracking-[2px] text-white/90 uppercase z-10">
                  THE CREATIVE SERIES
                </p>

                <div className="flex items-end justify-between z-10">
                  <div className="font-extrabold text-[27px] leading-[1.06] tracking-[-1px]">
                    <p>Make it</p>
                    <p>meaningful.</p>
                  </div>
                  <div className="size-[48px] rounded-[12px] border border-white/40 flex items-center justify-center bg-white/10 backdrop-blur-sm">
                    <img src="/assets/lock.svg" alt="Locked" className="size-[26px]" />
                  </div>
                </div>
              </div>

              {/* Course information */}
              <div className="p-[24px] flex flex-col gap-[16px] flex-1 justify-between">
                <div className="flex flex-col gap-[12px]">
                  <div className="flex items-center justify-between">
                    <span className="bg-[#f1f5f9] dark:bg-slate-800 text-[#475569] dark:text-slate-300 font-bold text-[12px] px-[10px] py-[5px] rounded-[100px]">
                      Brand design
                    </span>
                    <span className="text-[#b45309] dark:text-amber-500 text-[12px] font-normal">
                      ★ 4.9 (128)
                    </span>
                  </div>

                  <h3 className="font-bold text-[#0f172a] dark:text-white text-[20px] leading-[1.3] transition-colors">
                    Build a brand people believe in
                  </h3>

                  <p className="text-[#475569] dark:text-slate-400 text-[14px]">
                    Jordan Lee · 12 lessons · 6 hours
                  </p>
                </div>

                <div className="flex flex-col gap-[16px] pt-2">
                  <div className="h-px bg-[#e2e8f0] dark:bg-slate-800" />
                  <div className="flex items-center justify-between">
                    <div className="bg-[#f1f5f9] dark:bg-slate-800 flex items-center gap-[6px] px-[10px] py-[5px] rounded-[100px]">
                      <img src="/assets/lock-1.svg" alt="" className="size-[14px] dark:brightness-125" />
                      <span className="font-bold text-[#475569] dark:text-slate-300 text-[12px]">
                        Locked
                      </span>
                    </div>
                    <span className="font-bold text-[#4f46e5] dark:text-[#818cf8] text-[14px]">
                      $200 →
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Explore all courses text button (AOS: fade-up) */}
          <div data-aos="fade-up" className="pt-2">
            <a
              href="#courses"
              className="font-bold text-[#4f46e5] dark:text-[#818cf8] hover:text-[#4338ca] dark:hover:text-[#a5b4fc] text-[14px] inline-flex items-center gap-1 group"
            >
              <span>Explore all courses</span>
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
              className="font-bold text-[#4f46e5] dark:text-[#818cf8] text-[12px] tracking-wider uppercase"
            >
              A CLEAR PATH FORWARD
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
              className="font-bold text-[#4f46e5] dark:text-[#818cf8] text-[12px] tracking-wider uppercase"
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
                <p className="text-[#b45309] dark:text-amber-500 text-[18px] tracking-[2px] font-bold select-none">
                  ★★★★★
                </p>
                <p className="font-medium text-[#0f172a] dark:text-slate-200 text-[18px] leading-[1.5] transition-colors">
                  “This is the first course that made research feel actionable. I used the framework with my team the very next day.”
                </p>
              </div>

              <div className="flex flex-col gap-[4px] pt-4 border-t border-slate-100 dark:border-slate-800 transition-colors">
                <p className="font-bold text-[#0f172a] dark:text-white text-[14px]">
                  Sam Rivera
                </p>
                <p className="text-[#475569] dark:text-slate-400 text-[12px]">
                  Product designer at Webflow
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
                <p className="text-[#b45309] dark:text-amber-500 text-[18px] tracking-[2px] font-bold select-none">
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
                <p className="text-[#b45309] dark:text-amber-500 text-[18px] tracking-[2px] font-bold select-none">
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
              <p className="font-bold text-[#4f46e5] dark:text-[#818cf8] text-[12px] tracking-wider uppercase">
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
              href="mailto:hello@lmsportal.com"
              className="font-bold text-[#4f46e5] dark:text-[#818cf8] hover:text-[#4338ca] dark:hover:text-[#a5b4fc] text-[14px] inline-flex items-center gap-1 group"
            >
              <span>hello@lmsportal.com</span>
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
                className="w-full flex items-start justify-between gap-[16px] text-left group focus:outline-none"
              >
                <span className="font-bold text-[#0f172a] dark:text-white text-[16px] leading-[1.5] group-hover:text-[#4f46e5] dark:group-hover:text-[#818cf8] transition-colors">
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
                className="w-full flex items-start justify-between gap-[16px] text-left group focus:outline-none"
              >
                <span className="font-bold text-[#0f172a] dark:text-white text-[16px] leading-[1.5] group-hover:text-[#4f46e5] dark:group-hover:text-[#818cf8] transition-colors">
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
                className="w-full flex items-start justify-between gap-[16px] text-left group focus:outline-none"
              >
                <span className="font-bold text-[#0f172a] dark:text-white text-[16px] leading-[1.5] group-hover:text-[#4f46e5] dark:group-hover:text-[#818cf8] transition-colors">
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
                className="w-full flex items-start justify-between gap-[16px] text-left group focus:outline-none"
              >
                <span className="font-bold text-[#0f172a] dark:text-white text-[16px] leading-[1.5] group-hover:text-[#4f46e5] dark:group-hover:text-[#818cf8] transition-colors">
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
                  We stand by the quality of our content. If you find the course doesn't meet your expectations, we offer a hassle-free 14-day refund policy.
                </p>
              )}
            </div>

            {/* FAQ 5 */}
            <div className="py-[24px]">
              <button
                onClick={() => toggleFaq(4)}
                className="w-full flex items-start justify-between gap-[16px] text-left group focus:outline-none"
              >
                <span className="font-bold text-[#0f172a] dark:text-white text-[16px] leading-[1.5] group-hover:text-[#4f46e5] dark:group-hover:text-[#818cf8] transition-colors">
                  Can I learn on my phone?
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
                  Yes! The platform is designed from the ground up to be responsive on phones, tablets, and desktops so you can study comfortably wherever you are.
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
        <div className="absolute left-1/2 -top-40 -translate-x-1/2 size-[500px] bg-[#4f46e5]/10 rounded-full blur-3xl pointer-events-none" />

        <div className="max-w-[900px] mx-auto flex flex-col items-center gap-[24px] relative z-10">
          <h2
            data-aos="fade-down"
            data-aos-delay="100"
            className="font-extrabold text-[36px] sm:text-[44px] lg:text-[52px] leading-[1.15] tracking-[-1.5px] text-white"
          >
            Your next breakthrough starts with a little curiosity.
          </h2>
          <p
            data-aos="fade-up"
            data-aos-delay="150"
            className="text-[#cbd5e1] dark:text-slate-300 text-[16px] leading-[1.5] max-w-[600px]"
          >
            Make room for the work you want to do. We’ll help you get there.
          </p>
          <div data-aos="fade-up" data-aos-delay="200">
            <a
              href="#courses"
              className="bg-[#4f46e5] hover:bg-[#4338ca] text-white px-[20px] py-[12px] min-h-[48px] rounded-[8px] font-bold text-[14px] inline-flex items-center justify-center gap-[8px] transition-all shadow-lg hover:shadow-indigo-500/25 active:scale-[0.98] mt-2 group"
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

      {/* =========================================================================
          9. FOOTER (AOS: fade-up)
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
                <div className="bg-[#4f46e5] rounded-[9px] size-[32px] flex items-center justify-center shrink-0">
                  <img src="/assets/layers-2.svg" alt="LMS Portal" className="size-[20px]" />
                </div>
                <span className="font-extrabold text-[19px] tracking-[-0.5px] text-[#0f172a] dark:text-white transition-colors">
                  LMS Portal
                </span>
              </div>
              <p className="text-[#475569] dark:text-slate-400 text-[16px] leading-[1.5] max-w-[340px] transition-colors">
                Learn with intention. Build what comes next.
              </p>
            </div>

            {/* Column 1: Learn */}
            <div className="flex flex-col gap-[16px] text-[14px] leading-[1.5]">
              <p className="font-bold text-[#0f172a] dark:text-white">
                Learn
              </p>
              <a href="#courses" className="text-[#475569] dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-white transition-colors">
                Explore courses
              </a>
              <a href="#courses" className="text-[#475569] dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-white transition-colors">
                My learning
              </a>
              <a href="#courses" className="text-[#475569] dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-white transition-colors">
                Certificates
              </a>
            </div>

            {/* Column 2: Company */}
            <div className="flex flex-col gap-[16px] text-[14px] leading-[1.5]">
              <p className="font-bold text-[#0f172a] dark:text-white">
                Company
              </p>
              <a href="#our-story" className="text-[#475569] dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-white transition-colors">
                Our story
              </a>
              <a href="#courses" className="text-[#475569] dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-white transition-colors">
                Become an instructor
              </a>
              <a href="mailto:hello@lmsportal.com" className="text-[#475569] dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-white transition-colors">
                Contact us
              </a>
            </div>

            {/* Column 3: Support */}
            <div className="flex flex-col gap-[16px] text-[14px] leading-[1.5]">
              <p className="font-bold text-[#0f172a] dark:text-white">
                Support
              </p>
              <a href="#" className="text-[#475569] dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-white transition-colors">
                Help center
              </a>
              <a href="#" className="text-[#475569] dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-white transition-colors">
                Accessibility
              </a>
              <a href="#" className="text-[#475569] dark:text-slate-400 hover:text-[#0f172a] dark:hover:text-white transition-colors">
                Refund policy
              </a>
            </div>
          </div>

          {/* Legal / Copyright Bottom Bar */}
          <div className="border-t border-[#e2e8f0] dark:border-slate-800 pt-[24px] transition-colors">
            <p className="text-[#64748b] dark:text-slate-500 text-[12px] leading-[1.5]">
              © 2026 LMS Portal. Keep growing. · Privacy policy · Terms of service
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
