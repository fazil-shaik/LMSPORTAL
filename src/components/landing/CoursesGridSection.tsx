import { useState } from 'react';
import { Heart } from 'lucide-react';

interface CourseItem {
  id: string;
  title: string;
  slug: string;
  category: string;
  level: string;
  rating: number;
  reviewCount: number;
  instructor: string;
  lessonCount: number;
  durationHours: number;
  badge?: string;
  tagline?: string;
  series?: string;
  thumbnail: string;
  priceCents: number;
  gradientFrom?: string;
  gradientTo?: string;
}

interface CoursesGridSectionProps {
  courses: CourseItem[];
  loading: boolean;
  enrolledCourses: string[];
  onEnroll: (courseId: string) => void;
  onNavigateToDashboard: () => void;
}

export default function CoursesGridSection({
  courses,
  loading,
  enrolledCourses,
  onEnroll,
  onNavigateToDashboard,
}: CoursesGridSectionProps) {
  const [wishlistActive, setWishlistActive] = useState<Record<string, boolean>>({});

  const toggleWishlist = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setWishlistActive((prev) => ({
      ...prev,
      [id]: !prev[id],
    }));
  };

  return (
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

        {/* Dynamic Course Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-[24px]">
          {loading ? (
            <div className="col-span-full py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
              <div className="size-6 border-2 border-[#a435f0] border-t-transparent rounded-full animate-spin" />
              <span className="text-xs font-semibold">Loading courses from InternWala engine...</span>
            </div>
          ) : courses.length === 0 ? (
            <div className="col-span-full py-16 text-center text-slate-400 text-sm">
              No courses published yet. Check back soon!
            </div>
          ) : (
            courses.map((course, idx) => {
              const isEnrolled = enrolledCourses.includes(course.id);
              return (
                <div
                  key={course.id}
                  data-aos="fade-up"
                  data-aos-delay={(idx + 1) * 100}
                  className="bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-[12px] overflow-hidden shadow-[0px_4px_16px_0px_rgba(15,23,42,0.03)] dark:shadow-none hover:-translate-y-1 transition-all duration-200 flex flex-col select-none relative group"
                >
                  {/* Thumbnail banner with Cloudinary format support */}
                  <div
                    className="h-[176px] p-[24px] relative overflow-hidden flex flex-col justify-between text-white"
                    style={{
                      background: course.thumbnail
                        ? `url(${course.thumbnail}) center / cover no-repeat`
                        : `linear-gradient(to right, ${course.gradientFrom || '#312e81'}, ${course.gradientTo || '#6d28d9'})`,
                    }}
                  >
                    <div className="absolute inset-0 bg-black/40 backdrop-blur-[0.5px]" />
                    <div className="flex items-center justify-between z-10">
                      <p className="font-bold text-[11px] tracking-[2px] text-white/90 uppercase">
                        {course.series || 'THE CAREER SERIES'}
                      </p>
                      <button
                        onClick={(e) => toggleWishlist(course.id, e)}
                        className="p-1.5 rounded-full bg-white/20 hover:bg-white/40 text-white transition cursor-pointer"
                        title="Save to wishlist"
                      >
                        <Heart className={`size-3.5 ${wishlistActive[course.id] ? 'fill-white' : ''}`} />
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
                          {course.category || 'Professional Skill'}
                        </span>
                        <span className="text-[#b4690e] dark:text-amber-400 text-[12px] font-bold">
                          ★ {course.rating || '4.9'} <span className="text-slate-400 font-normal">({course.reviewCount || 128})</span>
                        </span>
                      </div>

                      <h3 className="font-bold text-[#0f172a] dark:text-white text-[19px] leading-[1.3] transition-colors group-hover:text-[#a435f0] line-clamp-2">
                        {course.title}
                      </h3>

                      <p className="text-[#475569] dark:text-slate-400 text-[14px]">
                        {course.instructor || 'Lead Instructor'} · {course.lessonCount || 12} lessons · {course.durationHours || 6} hours
                      </p>

                      <div className="flex items-center gap-2">
                        <span className="bg-[#eceb98] text-[#3d3c0a] font-bold text-[11px] px-2 py-0.5 rounded">
                          {course.badge || 'Bestseller'}
                        </span>
                        <span className="text-[11px] text-slate-400">{course.level || 'All Levels'}</span>
                      </div>
                    </div>

                    <div className="flex flex-col gap-[16px] pt-2">
                      <div className="h-px bg-[#e2e8f0] dark:bg-slate-800" />
                      <div className="flex items-center justify-between">
                        <div className="bg-[#f1f5f9] dark:bg-slate-800 flex items-center gap-[6px] px-[10px] py-[5px] rounded-[100px]">
                          <img src="/assets/lock-1.svg" alt="" className="size-[14px] dark:brightness-125" />
                          <span className="font-bold text-[#475569] dark:text-slate-300 text-[12px]">
                            {isEnrolled ? 'Unlocked' : 'Locked'}
                          </span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="font-bold text-[#a435f0] dark:text-[#c084fc] text-[15px]">
                            ${((course.priceCents || 20000) / 100).toFixed(0)} →
                          </span>
                          <button
                            onClick={() => {
                              if (isEnrolled) {
                                onNavigateToDashboard();
                              } else {
                                onEnroll(course.id);
                              }
                            }}
                            className={`text-xs font-bold px-3 py-1.5 rounded transition cursor-pointer ${
                              isEnrolled
                                ? 'bg-emerald-600 text-white'
                                : 'bg-[#2d2f31] dark:bg-white text-white dark:text-[#2d2f31] hover:bg-black dark:hover:bg-slate-200'
                            }`}
                          >
                            {isEnrolled ? '✓ Unlocked' : 'Enroll'}
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

        {/* Explore link */}
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
  );
}
