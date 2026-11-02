export default function TestimonialsSection() {
  return (
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
  );
}
