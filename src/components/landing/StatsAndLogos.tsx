export default function StatsAndLogos() {
  return (
    <>
      {/* 3 Metrics Strip */}
      <section className="border-y border-[#e2e8f0] dark:border-slate-800 bg-white dark:bg-[#0c101d] py-[32px] px-6 sm:px-10 lg:px-[80px] transition-colors duration-300">
        <div className="max-w-[1440px] mx-auto grid grid-cols-1 md:grid-cols-3 gap-8 text-center divide-y md:divide-y-0 md:divide-x divide-slate-100 dark:divide-slate-800">
          <div data-aos="fade-up" className="pt-2 md:pt-0">
            <p className="font-extrabold text-[32px] sm:text-[36px] text-[#0f172a] dark:text-white">
              12,400+
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1">
              Learners Enrolled & Building
            </p>
          </div>

          <div data-aos="fade-up" data-aos-delay="100" className="pt-6 md:pt-0">
            <p className="font-extrabold text-[32px] sm:text-[36px] text-[#a435f0] dark:text-[#c084fc]">
              4.9 / 5.0
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1">
              Average Student Feedback Rating
            </p>
          </div>

          <div data-aos="fade-up" data-aos-delay="200" className="pt-6 md:pt-0">
            <p className="font-extrabold text-[32px] sm:text-[36px] text-[#0f172a] dark:text-white">
              94%
            </p>
            <p className="text-xs sm:text-sm font-semibold text-slate-500 uppercase tracking-wider mt-1">
              Internship Placement Readiness
            </p>
          </div>
        </div>
      </section>

      {/* Brand Trust Strip */}
      <section className="py-[36px] px-6 sm:px-10 lg:px-[80px] bg-[#f8fafc] dark:bg-[#080b14] border-b border-[#e2e8f0] dark:border-slate-800/80 transition-colors duration-300">
        <div className="max-w-[1440px] mx-auto flex flex-col md:flex-row items-center justify-between gap-6 text-slate-400 dark:text-slate-500 text-xs font-bold uppercase tracking-wider">
          <span className="shrink-0 text-center md:text-left text-slate-500 dark:text-slate-400">
            Curriculum trusted by interns & mentors at:
          </span>
          <div className="flex flex-wrap items-center justify-center gap-8 sm:gap-12 text-[15px] sm:text-[18px] font-extrabold tracking-tight opacity-75 grayscale hover:grayscale-0 transition-all duration-300">
            <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">Google</span>
            <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">stripe</span>
            <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">airbnb</span>
            <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">Linear</span>
            <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">▲ Vercel</span>
            <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">webflow</span>
            <span className="hover:text-[#0f172a] dark:hover:text-white transition cursor-default">Figma</span>
          </div>
        </div>
      </section>
    </>
  );
}
