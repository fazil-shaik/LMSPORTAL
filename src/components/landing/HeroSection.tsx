import { useState, useEffect } from 'react';
import { Sparkles, GraduationCap } from 'lucide-react';

interface HeroSectionProps {
  user: any;
  navigate: (path: string) => void;
}

export default function HeroSection({ user, navigate }: HeroSectionProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(768); // 12:48 in seconds
  const [activeStep, setActiveStep] = useState<number>(3);
  const [playbackSpeed, setPlaybackSpeed] = useState<string>('1×');

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

  const cycleSpeed = () => {
    const speeds = ['1×', '1.25×', '1.5×', '2×'];
    const curIdx = speeds.indexOf(playbackSpeed);
    setPlaybackSpeed(speeds[(curIdx + 1) % speeds.length]);
  };

  const stepContents: Record<number, { title: string; subtitle: string; tag: string }> = {
    1: {
      tag: 'LESSON 04 / RESEARCH FOUNDATIONS',
      title: 'Active listening.',
      subtitle: 'Uncovering quiet friction points.',
    },
    2: {
      tag: 'LESSON 05 / SYNTHESIS & NEEDS',
      title: 'Human empathy.',
      subtitle: 'Designing for real behavior.',
    },
    3: {
      tag: 'LESSON 06 / RESEARCH TO INSIGHT',
      title: 'Better questions.',
      subtitle: 'Bigger possibilities.',
    },
  };

  return (
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
                  className="text-[#c4b5fd] hover:text-white transition p-1 hover:bg-white/10 rounded cursor-pointer"
                  title="Toggle play/pause"
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
                  <button
                    onClick={() => setActiveStep(1)}
                    className={`text-left p-3 sm:p-[20px] rounded-[12px] border transition-all cursor-pointer ${
                      activeStep === 1
                        ? 'bg-[#a435f0] border-[#c084fc] shadow-lg shadow-purple-950/50 scale-[1.02]'
                        : 'bg-white/[0.04] border-[#7062a5]/50 hover:bg-white/[0.08]'
                    }`}
                  >
                    <p className="text-[#ddd6fe] text-[11px] sm:text-[12px] font-normal mb-1">01</p>
                    <p className="text-white text-[13px] sm:text-[16px] font-bold leading-[1.3]">
                      Observation
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveStep(2)}
                    className={`text-left p-3 sm:p-[20px] rounded-[12px] border transition-all cursor-pointer ${
                      activeStep === 2
                        ? 'bg-[#a435f0] border-[#c084fc] shadow-lg shadow-purple-950/50 scale-[1.02]'
                        : 'bg-white/[0.04] border-[#7062a5]/50 hover:bg-white/[0.08]'
                    }`}
                  >
                    <p className="text-[#ddd6fe] text-[11px] sm:text-[12px] font-normal mb-1">02</p>
                    <p className="text-white text-[13px] sm:text-[16px] font-bold leading-[1.3]">
                      Human need
                    </p>
                  </button>

                  <button
                    onClick={() => setActiveStep(3)}
                    className={`text-left p-3 sm:p-[20px] rounded-[12px] border transition-all cursor-pointer ${
                      activeStep === 3
                        ? 'bg-[#a435f0] border-[#c084fc] shadow-lg shadow-purple-950/50 scale-[1.02]'
                        : 'bg-white/[0.04] border-[#7062a5]/50 hover:bg-white/[0.08]'
                    }`}
                  >
                    <p className="text-[#ddd6fe] text-[11px] sm:text-[12px] font-normal mb-1">03</p>
                    <p className="text-white text-[13px] sm:text-[16px] font-bold leading-[1.3]">
                      Opportunity
                    </p>
                  </button>
                </div>
              </div>

              {/* Bottom Video Controls & Scrub Bar */}
              <div className="flex flex-col gap-[12px] bg-black/40 backdrop-blur-md p-3 sm:p-4 rounded-[12px] border border-white/10">
                {/* Scrub line */}
                <div
                  onClick={(e) => {
                    const rect = e.currentTarget.getBoundingClientRect();
                    const clickX = e.clientX - rect.left;
                    const percent = clickX / rect.width;
                    setCurrentTime(Math.floor(percent * 1800));
                  }}
                  className="h-[6px] bg-white/20 rounded-full overflow-hidden relative cursor-pointer"
                >
                  <div
                    className="h-full bg-gradient-to-r from-[#a435f0] to-[#c084fc] transition-all duration-150"
                    style={{ width: `${(currentTime / 1800) * 100}%` }}
                  />
                </div>

                <div className="flex items-center justify-between text-xs text-white/80">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setIsPlaying(!isPlaying)}
                      className="size-7 rounded-full bg-white text-[#171538] flex items-center justify-center font-bold text-[10px] hover:scale-105 transition cursor-pointer"
                    >
                      {isPlaying ? '❚❚' : '▶'}
                    </button>
                    <span className="font-mono text-[11px]">
                      {formatTime(currentTime)} / 30:00
                    </span>
                  </div>

                  <div className="flex items-center gap-3">
                    <button
                      onClick={cycleSpeed}
                      className="font-bold hover:text-white transition cursor-pointer bg-white/10 px-2 py-0.5 rounded text-[11px]"
                    >
                      {playbackSpeed}
                    </button>
                    <span className="text-[11px] bg-purple-900/60 px-2 py-0.5 rounded border border-purple-500/30 font-semibold text-purple-200">
                      Figma Capstone
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
