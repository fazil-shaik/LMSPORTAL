import { Globe } from 'lucide-react';

export default function Footer() {
  return (
    <>
      {/* Call to Action Banner (AOS: fade-up) */}
      <section
        data-aos="fade-up"
        className="bg-[#0f172a] dark:bg-[#070912] py-[64px] px-6 sm:px-12 md:px-[160px] text-center text-white relative overflow-hidden transition-colors duration-300"
      >
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

      {/* Main Multi-Column Footer */}
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
              <p className="font-bold text-[#0f172a] dark:text-white">Learn</p>
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
              <p className="font-bold text-[#0f172a] dark:text-white">Company</p>
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
              <p className="font-bold text-[#0f172a] dark:text-white">Support</p>
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

          {/* Legal / Copyright Bottom Bar */}
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
    </>
  );
}
