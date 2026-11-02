export default function HowItWorksSection() {
  return (
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
  );
}
