import { useState, useMemo } from 'react';
import {
  Menu,
  X,
  Sun,
  Moon,
  Search,
  ShoppingCart,
  Heart,
  ChevronDown,
  LogOut,
  Settings,
  GraduationCap,
  ShieldCheck,
} from 'lucide-react';

interface NavbarProps {
  theme: 'light' | 'dark';
  toggleTheme: () => void;
  currentPath: string;
  navigate: (path: string) => void;
  user: any;
  adminUser?: any;
  enrolledCoursesCount: number;
  courses?: any[];
  onOpenAuth: (mode: 'signin' | 'signup' | 'verify') => void;
  onOpenSettings: (tab?: 'profile' | 'security' | 'billing' | 'privacy') => void;
  onSignOut: () => void;
}

export default function Navbar({
  theme,
  toggleTheme,
  currentPath,
  navigate,
  user,
  adminUser,
  enrolledCoursesCount,
  courses = [],
  onOpenAuth,
  onOpenSettings,
  onSignOut,
}: NavbarProps) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [categoriesOpen, setCategoriesOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');

  const filteredCourses = useMemo(() => {
    if (!searchQuery.trim() || !courses) return [];
    const q = searchQuery.toLowerCase().trim();
    return courses.filter(
      (c) =>
        c.title?.toLowerCase().includes(q) ||
        c.category?.toLowerCase().includes(q) ||
        c.instructor?.toLowerCase().includes(q)
    );
  }, [searchQuery, courses]);

  const dynamicCategories = useMemo(() => {
    if (!courses || courses.length === 0) {
      return [{ name: 'All Courses', count: 'Explore' }];
    }
    const map: Record<string, number> = {};
    for (const c of courses) {
      if (c.category) {
        map[c.category] = (map[c.category] || 0) + 1;
      }
    }
    const entries = Object.entries(map);
    if (entries.length === 0) {
      return [{ name: 'All Courses', count: `${courses.length} courses` }];
    }
    return entries.map(([name, count]) => ({
      name,
      count: `${count} ${count === 1 ? 'course' : 'courses'}`,
    }));
  }, [courses]);

  const isDashboard = currentPath.startsWith('/dashboard');
  const isAdmin = currentPath.startsWith('/admin');
  const isStrictAdmin = (adminUser && adminUser.role === 'admin') || (user && user.role === 'admin');

  return (
    <header
      data-aos="fade-down"
      className="bg-white/95 dark:bg-[#0a0d16]/95 backdrop-blur-md border-b border-[#e2e8f0] dark:border-slate-800/80 sticky top-0 z-50 transition-colors duration-200"
    >
      <div className="max-w-[1440px] mx-auto px-4 sm:px-8 lg:px-[60px] h-[72px] sm:h-[80px] flex items-center justify-between gap-4">
        {/* Brand & Categories */}
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

          {/* Categories button */}
          <div className="relative hidden md:block">
            <button
              onClick={() => setCategoriesOpen(!categoriesOpen)}
              className="flex items-center gap-1.5 text-[14px] font-medium text-[#475569] dark:text-slate-300 hover:text-[#a435f0] dark:hover:text-[#a435f0] px-2.5 py-1.5 rounded transition cursor-pointer"
            >
              <span>Categories</span>
              <ChevronDown className={`size-3.5 transition-transform ${categoriesOpen ? 'rotate-180' : ''}`} />
            </button>

            {categoriesOpen && (
              <div className="absolute top-full left-0 mt-2 w-64 bg-white dark:bg-slate-900 border border-[#e2e8f0] dark:border-slate-800 rounded-xl shadow-xl p-2 z-50 animate-fadeIn">
                {dynamicCategories.map((cat, idx) => (
                  <button
                    key={idx}
                    onClick={() => {
                      setCategoriesOpen(false);
                      const el = document.getElementById('courses');
                      if (el) el.scrollIntoView({ behavior: 'smooth' });
                    }}
                    className="w-full text-left px-3 py-2 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 text-xs font-medium text-[#0f172a] dark:text-slate-200 flex items-center justify-between cursor-pointer"
                  >
                    <span>{cat.name}</span>
                    <span className="text-[10px] text-slate-400 font-semibold">{cat.count}</span>
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Global Search Bar */}
        <div className="flex-1 max-w-[540px] relative hidden lg:block">
          <Search className="absolute left-4 top-1/2 -translate-y-1/2 size-4 text-slate-400 pointer-events-none" />
          <input
            type="text"
            placeholder={
              courses.length > 0
                ? `Search across ${courses.length} courses (${courses.slice(0, 2).map((c) => c.title.split(',')[0]).join(', ')}...)`
                : 'Search for courses, skills, or topics...'
            }
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-11 pr-4 py-2.5 bg-[#f7f9fa] dark:bg-slate-900/80 border border-[#d1d7dc] dark:border-slate-700/80 rounded-full text-xs text-[#0f172a] dark:text-white placeholder:text-slate-400 focus:outline-none focus:border-[#2d2f31] dark:focus:border-[#a435f0] transition"
          />

          {searchQuery.trim() && (
            <div className="absolute top-full left-0 right-0 mt-2 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-xl shadow-xl overflow-hidden z-50 animate-fadeIn">
              {filteredCourses.length > 0 ? (
                <div className="p-2 space-y-1">
                  {filteredCourses.slice(0, 5).map((course) => (
                    <button
                      key={course.id}
                      onClick={() => {
                        setSearchQuery('');
                        navigate(`/course/${course.slug || course.id}`);
                      }}
                      className="w-full text-left p-2.5 rounded-lg hover:bg-slate-50 dark:hover:bg-slate-800 flex items-center justify-between transition cursor-pointer"
                    >
                      <div className="overflow-hidden pr-2">
                        <p className="font-bold text-xs text-slate-900 dark:text-white truncate">
                          {course.title}
                        </p>
                        <p className="text-[11px] text-slate-500 dark:text-slate-400">
                          {course.instructor} · {course.category || 'Skill'}
                        </p>
                      </div>
                      <span className="text-xs font-bold text-[#a435f0] shrink-0">
                        ${((course.priceCents ?? 20000) / 100).toFixed(0)}
                      </span>
                    </button>
                  ))}
                </div>
              ) : (
                <div className="p-4 text-center text-xs text-slate-400">
                  No courses found for "{searchQuery}"
                </div>
              )}
            </div>
          )}
        </div>

        {/* Actions & Profile */}
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          {/* Theme toggle */}
          <button
            onClick={toggleTheme}
            className="p-2 text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            title={`Switch to ${theme === 'light' ? 'dark' : 'light'} mode`}
          >
            {theme === 'light' ? <Moon className="size-4" /> : <Sun className="size-4 text-amber-400" />}
          </button>

          {/* Wishlist icon */}
          <button
            className="p-2 text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition relative hidden sm:inline-flex"
            title="Wishlist"
          >
            <Heart className="size-4" />
          </button>

          {/* Cart with enrolled badge */}
          <button
            onClick={() => {
              if (user) {
                navigate('/dashboard');
              } else {
                onOpenAuth('signin');
              }
            }}
            className="p-2 text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800 transition relative"
            title="My Courses / Cart"
          >
            <ShoppingCart className="size-4" />
            {enrolledCoursesCount > 0 && (
              <span className="absolute top-1 right-1 bg-[#a435f0] text-white font-bold text-[10px] size-4 rounded-full flex items-center justify-center">
                {enrolledCoursesCount}
              </span>
            )}
          </button>

          {/* Auth State Button Group */}
          {user ? (
            <div className="flex items-center gap-2 sm:gap-3">
              {/* Unverified email warning badge */}
              {!user.emailVerified && (
                <button
                  onClick={() => onOpenAuth('verify')}
                  className="hidden md:inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-amber-50 dark:bg-amber-950/80 text-amber-800 dark:text-amber-300 border border-amber-300 dark:border-amber-800 hover:bg-amber-100 transition"
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

              {/* STRICTLY ADMIN ONLY: Only visible if user.role === 'admin' */}
              {isStrictAdmin && (
                <button
                  onClick={() => navigate(isAdmin ? '/dashboard' : '/admin')}
                  className={`hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    isAdmin
                      ? 'bg-rose-600 text-white shadow-xs border-transparent'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border-rose-300 dark:border-rose-800'
                  }`}
                  title="InternWala Restricted Admin Studio"
                >
                  <ShieldCheck className="size-4 text-rose-500" />
                  <span>{isAdmin ? 'Exit Studio' : 'Admin Studio'}</span>
                </button>
              )}

              {/* Account profile card opening Settings */}
              <button
                onClick={() => onOpenSettings('profile')}
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
                onClick={() => onOpenSettings('profile')}
                className="p-2 text-slate-500 hover:text-[#4f46e5] dark:hover:text-[#818cf8] transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Account Settings"
                aria-label="Settings"
              >
                <Settings className="size-4" />
              </button>

              {/* Sign out button */}
              <button
                onClick={onSignOut}
                className="p-2 text-slate-500 hover:text-rose-600 dark:hover:text-rose-400 transition rounded-lg hover:bg-slate-100 dark:hover:bg-slate-800"
                title="Sign out"
                aria-label="Sign out"
              >
                <LogOut className="size-4" />
              </button>
            </div>
          ) : (
            <div className="hidden sm:flex items-center gap-2">
              {isStrictAdmin && (
                <button
                  onClick={() => navigate(isAdmin ? '/' : '/admin')}
                  className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer border ${
                    isAdmin
                      ? 'bg-rose-600 text-white shadow-xs border-transparent'
                      : 'bg-rose-50 dark:bg-rose-950/60 text-rose-700 dark:text-rose-300 hover:bg-rose-100 border-rose-300 dark:border-rose-800'
                  }`}
                  title="InternWala Restricted Admin Studio"
                >
                  <ShieldCheck className="size-4 text-rose-500" />
                  <span>{isAdmin ? 'Exit Studio' : 'Admin Studio'}</span>
                </button>
              )}
              <button
                onClick={() => onOpenAuth('signin')}
                className="border border-[#2d2f31] dark:border-slate-600 font-bold text-[13px] text-[#2d2f31] dark:text-white hover:bg-slate-50 dark:hover:bg-slate-800 px-3.5 py-2 rounded-[4px] transition cursor-pointer"
              >
                Sign in
              </button>
              <button
                onClick={() => onOpenAuth('signup')}
                className="bg-[#2d2f31] dark:bg-white hover:bg-black dark:hover:bg-slate-200 text-white dark:text-[#2d2f31] px-4 py-2 rounded-[4px] font-bold text-[13px] shadow-sm transition active:scale-[0.98] inline-flex items-center justify-center cursor-pointer"
              >
                Get started
              </button>
            </div>
          )}

          {/* Mobile Hamburger Button */}
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="xl:hidden p-2 rounded-lg text-[#475569] dark:text-slate-300 hover:text-[#0f172a] dark:hover:text-white hover:bg-slate-100 dark:hover:bg-slate-800 transition cursor-pointer"
            aria-label="Toggle Navigation Menu"
          >
            {mobileMenuOpen ? <X className="size-6" /> : <Menu className="size-6" />}
          </button>
        </div>
      </div>

      {/* Mobile Dropdown Menu */}
      {mobileMenuOpen && (
        <div className="xl:hidden border-t border-[#e2e8f0] dark:border-slate-800 bg-white dark:bg-[#0a0d16] px-6 py-4 flex flex-col gap-4 shadow-lg animate-fadeIn">
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
                onOpenAuth('signin');
              }
            }}
            className="text-left font-bold text-[#4f46e5] dark:text-[#a5b4fc] py-2 text-base cursor-pointer flex items-center justify-between"
          >
            <span>My learning (Dashboard)</span>
            {user && <span className="size-2 rounded-full bg-[#4f46e5] animate-pulse" />}
          </button>

          {/* STRICTLY ADMIN ONLY in mobile drawer */}
          {isStrictAdmin && (
            <button
              onClick={() => {
                setMobileMenuOpen(false);
                navigate('/admin');
              }}
              className="text-left font-bold text-rose-600 dark:text-rose-400 py-2 text-base cursor-pointer flex items-center justify-between"
            >
              <span>Admin Studio</span>
              <ShieldCheck className="size-4" />
            </button>
          )}

          <div className="pt-2 border-t border-slate-100 dark:border-slate-800 flex flex-col gap-3">
            {user ? (
              <div className="flex flex-col gap-2 py-2">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="font-bold text-sm text-[#0f172a] dark:text-white">{user.name}</p>
                    <p className="text-xs text-slate-500">{user.email}</p>
                  </div>
                  <button
                    onClick={() => {
                      onSignOut();
                      setMobileMenuOpen(false);
                    }}
                    className="text-xs font-bold text-rose-500 py-1 px-2 border border-rose-200 dark:border-rose-900 rounded"
                  >
                    Sign out
                  </button>
                </div>
              </div>
            ) : (
              <>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signin');
                  }}
                  className="w-full text-left font-medium text-[#475569] dark:text-slate-300 py-2 text-base"
                >
                  Sign in
                </button>
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    onOpenAuth('signup');
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
  );
}
