import { useState } from 'react';

export default function FaqSection() {
  const [openFaq, setOpenFaq] = useState<Record<number, boolean>>({
    0: true,
    1: true,
    2: false,
    3: false,
    4: false,
  });

  const toggleFaq = (idx: number) => {
    setOpenFaq((prev) => ({
      ...prev,
      [idx]: !prev[idx],
    }));
  };

  const faqs = [
    {
      q: 'How long do I have access?',
      a: 'Your course is yours for life, including future updates. Revisit lessons whenever you need a little inspiration.',
    },
    {
      q: 'Do I need any previous experience?',
      a: 'Each course clearly lists its level. Product Design is beginner-friendly; bring curiosity and a willingness to practice.',
    },
    {
      q: 'Will I get a certificate?',
      a: 'Yes, upon completing all lessons and assignments, you will earn an authentic, verifiable certificate you can add to LinkedIn, share with managers, or showcase in your portfolio.',
    },
    {
      q: 'What if the course isn’t right for me?',
      a: 'We offer a 30-day money-back guarantee. If you decide the course isn’t a fit, send an email to support within 30 days of purchase for a complete refund.',
    },
    {
      q: 'Can my company pay for this?',
      a: 'Most employers are happy to cover learning expenses through learning and development budgets. We provide automated itemized invoices with your company’s VAT/tax number.',
    },
  ];

  return (
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
          {faqs.map((faq, idx) => (
            <div key={idx} className="py-[24px]">
              <button
                onClick={() => toggleFaq(idx)}
                className="w-full flex items-start justify-between gap-[16px] text-left group focus:outline-none cursor-pointer"
              >
                <span className="font-bold text-[#0f172a] dark:text-white text-[16px] leading-[1.5] group-hover:text-[#a435f0] dark:group-hover:text-[#c084fc] transition-colors">
                  {faq.q}
                </span>
                <span className="shrink-0 pt-0.5">
                  {openFaq[idx] ? (
                    <img src="/assets/minus.svg" alt="Collapse" className="size-[20px] dark:brightness-125" />
                  ) : (
                    <img src="/assets/plus.svg" alt="Expand" className="size-[20px] dark:brightness-125" />
                  )}
                </span>
              </button>
              {openFaq[idx] && (
                <p className="text-[#475569] dark:text-slate-300 text-[16px] leading-[1.5] pt-[12px] animate-fadeIn">
                  {faq.a}
                </p>
              )}
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
