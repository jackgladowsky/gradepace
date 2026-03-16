"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState, useEffect, useCallback } from "react";
import { ThemeToggle } from "@/components/theme-toggle";
import { disconnect } from "@/app/connect/actions";

interface SidebarCourse {
  id: number;
  name: string;
}

interface SidebarProps {
  courses: SidebarCourse[];
  userName: string | null;
  children: React.ReactNode;
}

interface NavItem {
  label: string;
  href: string;
  icon: React.ReactNode;
}

/* ------------------------------------------------------------------ */
/*  Nav structure                                                      */
/* ------------------------------------------------------------------ */

const MAIN_NAV: NavItem[] = [
  {
    label: "Dashboard",
    href: "/",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m2.25 12 8.954-8.955a1.126 1.126 0 0 1 1.591 0L21.75 12M4.5 9.75v10.125c0 .621.504 1.125 1.125 1.125H9.75v-4.875c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125V21h4.125c.621 0 1.125-.504 1.125-1.125V9.75M8.25 21h8.25" />
      </svg>
    ),
  },
  {
    label: "Assignments",
    href: "/assignments",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h3.75M9 15h3.75M9 18h3.75m3 .75H18a2.25 2.25 0 0 0 2.25-2.25V6.108c0-1.135-.845-2.098-1.976-2.192a48.424 48.424 0 0 0-1.123-.08m-5.801 0c-.065.21-.1.433-.1.664 0 .414.336.75.75.75h4.5a.75.75 0 0 0 .75-.75 2.25 2.25 0 0 0-.1-.664m-5.8 0A2.251 2.251 0 0 1 13.5 2.25H15a2.25 2.25 0 0 1 2.15 1.586m-5.8 0c-.376.023-.75.05-1.124.08C9.095 4.01 8.25 4.973 8.25 6.108V8.25m0 0H4.875c-.621 0-1.125.504-1.125 1.125v11.25c0 .621.504 1.125 1.125 1.125h9.75c.621 0 1.125-.504 1.125-1.125V9.375c0-.621-.504-1.125-1.125-1.125H8.25ZM6.75 12h.008v.008H6.75V12Zm0 3h.008v.008H6.75V15Zm0 3h.008v.008H6.75V18Z" />
      </svg>
    ),
  },
  {
    label: "Grades",
    href: "/grades",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 0 1 3 19.875v-6.75ZM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V8.625ZM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 0 1-1.125-1.125V4.125Z" />
      </svg>
    ),
  },
  {
    label: "Calendar",
    href: "/calendar",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M6.75 3v2.25M17.25 3v2.25M3 18.75V7.5a2.25 2.25 0 0 1 2.25-2.25h13.5A2.25 2.25 0 0 1 21 7.5v11.25m-18 0A2.25 2.25 0 0 0 5.25 21h13.5A2.25 2.25 0 0 0 21 18.75m-18 0v-7.5A2.25 2.25 0 0 1 5.25 9h13.5A2.25 2.25 0 0 1 21 11.25v7.5" />
      </svg>
    ),
  },
  {
    label: "Courses",
    href: "/courses",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a23.54 23.54 0 0 0-2.688 6.413A23.654 23.654 0 0 0 12 23.25a23.654 23.654 0 0 0 8.429-3.69 23.54 23.54 0 0 0-2.688-6.413m-15.482 0A47.71 47.71 0 0 1 12 7.443a47.71 47.71 0 0 1 7.741 2.704M12 2.25c-2.676 0-5.216.584-7.499 1.632m14.998 0A17.919 17.919 0 0 0 12 2.25" />
      </svg>
    ),
  },
];

const TOOLS_NAV: NavItem[] = [
  {
    label: "GPA",
    href: "/gpa",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
      </svg>
    ),
  },
  {
    label: "Trends",
    href: "/trends",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 18 9 11.25l4.306 4.306a11.95 11.95 0 0 1 5.814-5.518l2.74-1.22m0 0-5.94-2.281m5.94 2.28-2.28 5.941" />
      </svg>
    ),
  },
  {
    label: "Calculator",
    href: "/calculator",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 15.75V18m-7.5-6.75h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V13.5Zm0 2.25h.008v.008H8.25v-.008Zm0 2.25h.008v.008H8.25V18Zm2.498-6.75h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V13.5Zm0 2.25h.007v.008h-.007v-.008Zm0 2.25h.007v.008h-.007V18Zm2.504-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5Zm0 2.25h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V18Zm2.498-6.75h.008v.008h-.008v-.008Zm0 2.25h.008v.008h-.008V13.5ZM8.25 6h7.5v2.25h-7.5V6ZM12 2.25c-1.892 0-3.758.11-5.593.322C5.307 2.7 4.5 3.65 4.5 4.757V19.5a2.25 2.25 0 0 0 2.25 2.25h10.5a2.25 2.25 0 0 0 2.25-2.25V4.757c0-1.108-.806-2.057-1.907-2.185A48.507 48.507 0 0 0 12 2.25Z" />
      </svg>
    ),
  },
  {
    label: "Priorities",
    href: "/priorities",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M3 4.5h14.25M3 9h9.75M3 13.5h9.75m4.5-4.5v12m0 0-3.75-3.75M17.25 21 21 17.25" />
      </svg>
    ),
  },
  {
    label: "Todos",
    href: "/todos",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75 11.25 15 15 9.75M21 12a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
  {
    label: "Notes",
    href: "/notes",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="m16.862 4.487 1.687-1.688a1.875 1.875 0 1 1 2.652 2.652L10.582 16.07a4.5 4.5 0 0 1-1.897 1.13L6 18l.8-2.685a4.5 4.5 0 0 1 1.13-1.897l8.932-8.931Zm0 0L19.5 7.125M18 14v4.75A2.25 2.25 0 0 1 15.75 21H5.25A2.25 2.25 0 0 1 3 18.75V8.25A2.25 2.25 0 0 1 5.25 6H10" />
      </svg>
    ),
  },
  {
    label: "Timer",
    href: "/timer",
    icon: (
      <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" d="M12 6v6h4.5m4.5 0a9 9 0 1 1-18 0 9 9 0 0 1 18 0Z" />
      </svg>
    ),
  },
];

/* ------------------------------------------------------------------ */
/*  Persisted section toggle state                                     */
/* ------------------------------------------------------------------ */

const STORAGE_KEY = "studyhub_sidebar";

interface SidebarState {
  tools: boolean;
  courses: boolean;
}

const DEFAULTS: SidebarState = { tools: false, courses: true };

function loadSidebarState(): SidebarState {
  if (typeof window === "undefined") return DEFAULTS;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? { ...DEFAULTS, ...JSON.parse(raw) } : DEFAULTS;
  } catch {
    return DEFAULTS;
  }
}

function saveSidebarState(state: SidebarState) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

/* ------------------------------------------------------------------ */
/*  Chevron icon                                                       */
/* ------------------------------------------------------------------ */

function Chevron({ open }: { open: boolean }) {
  return (
    <svg
      className={`h-3 w-3 text-muted-foreground/50 transition-transform duration-150 ${open ? "rotate-90" : ""}`}
      fill="none"
      viewBox="0 0 24 24"
      strokeWidth={2}
      stroke="currentColor"
    >
      <path strokeLinecap="round" strokeLinejoin="round" d="m8.25 4.5 7.5 7.5-7.5 7.5" />
    </svg>
  );
}

/* ------------------------------------------------------------------ */
/*  Component                                                          */
/* ------------------------------------------------------------------ */

export function SidebarLayout({ courses, userName, children }: SidebarProps) {
  const pathname = usePathname();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [sections, setSections] = useState<SidebarState>(DEFAULTS);

  useEffect(() => {
    setSections(loadSidebarState());
  }, []);

  const toggle = useCallback((key: keyof SidebarState) => {
    setSections((prev) => {
      const next = { ...prev, [key]: !prev[key] };
      saveSidebarState(next);
      return next;
    });
  }, []);

  function isActive(href: string) {
    if (href === "/") return pathname === "/";
    return pathname.startsWith(href);
  }

  function NavLink({ item }: { item: NavItem }) {
    const active = isActive(item.href);
    return (
      <Link
        href={item.href}
        onClick={() => setMobileOpen(false)}
        className={`relative flex items-center gap-2.5 rounded-md px-2.5 py-1.5 text-[13px] font-medium transition-all duration-150 ${
          active
            ? "bg-accent text-foreground"
            : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
        }`}
      >
        {active && (
          <span className="absolute left-0 top-1/2 h-3.5 w-[2px] -translate-y-1/2 rounded-full bg-primary" />
        )}
        {item.icon}
        {item.label}
      </Link>
    );
  }

  // Auto-expand a section if the current page is inside it
  useEffect(() => {
    const inTools = TOOLS_NAV.some((item) => isActive(item.href));
    const inCourse = pathname.startsWith("/course/");
    if (inTools && !sections.tools) toggle("tools");
    if (inCourse && !sections.courses) toggle("courses");
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  const sidebar = (
    <div className="flex h-full flex-col">
      {/* Logo */}
      <div className="flex h-12 items-center gap-2 border-b border-border/40 px-4">
        <div className="flex h-5.5 w-5.5 items-center justify-center rounded bg-primary">
          <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a23.54 23.54 0 0 0-2.688 6.413A23.654 23.654 0 0 0 12 23.25a23.654 23.654 0 0 0 8.429-3.69 23.54 23.54 0 0 0-2.688-6.413m-15.482 0A47.71 47.71 0 0 1 12 7.443a47.71 47.71 0 0 1 7.741 2.704M12 2.25c-2.676 0-5.216.584-7.499 1.632m14.998 0A17.919 17.919 0 0 0 12 2.25" />
          </svg>
        </div>
        <span className="text-sm font-bold tracking-tight">GradePace</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 overflow-y-auto px-2.5 py-3">
        {/* Main */}
        <div className="space-y-0.5">
          {MAIN_NAV.map((item) => (
            <NavLink key={item.href} item={item} />
          ))}
        </div>

        {/* Course list */}
        {courses.length > 0 && (
          <div className="mt-4">
            <button
              onClick={() => toggle("courses")}
              className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors hover:bg-accent/50"
            >
              <Chevron open={sections.courses} />
              <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
                Your Courses
              </span>
            </button>
            {sections.courses && (
              <div className="mt-0.5 space-y-px">
                {courses.map((course) => (
                  <Link
                    key={course.id}
                    href={`/course/${course.id}`}
                    onClick={() => setMobileOpen(false)}
                    className={`block truncate rounded-md px-2.5 py-1.5 text-[12px] transition-colors ${
                      pathname === `/course/${course.id}`
                        ? "bg-accent font-medium text-foreground"
                        : "text-muted-foreground hover:bg-accent/50 hover:text-foreground"
                    }`}
                  >
                    {course.name}
                  </Link>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Tools section */}
        <div className="mt-2">
          <button
            onClick={() => toggle("tools")}
            className="flex w-full items-center gap-1.5 rounded-md px-2.5 py-1 transition-colors hover:bg-accent/50"
          >
            <Chevron open={sections.tools} />
            <span className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground/70">
              Tools
            </span>
          </button>
          {sections.tools && (
            <div className="mt-0.5 space-y-0.5">
              {TOOLS_NAV.map((item) => (
                <NavLink key={item.href} item={item} />
              ))}
            </div>
          )}
        </div>
      </nav>

      {/* Footer */}
      <div className="border-t border-border/40 px-2.5 py-2.5">
        <div className="flex items-center justify-between px-1.5">
          <span className="truncate text-[11px] text-muted-foreground/70">{userName}</span>
          <div className="flex items-center gap-px">
            <ThemeToggle />
            <form action={disconnect}>
              <button
                type="submit"
                className="rounded-md p-1.5 text-muted-foreground/60 transition-colors hover:bg-accent hover:text-foreground"
                title="Log out"
              >
                <svg className="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 9V5.25A2.25 2.25 0 0 0 13.5 3h-6a2.25 2.25 0 0 0-2.25 2.25v13.5A2.25 2.25 0 0 0 7.5 21h6a2.25 2.25 0 0 0 2.25-2.25V15m3 0 3-3m0 0-3-3m3 3H9" />
                </svg>
              </button>
            </form>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="flex min-h-screen">
      {/* Desktop sidebar */}
      <aside className="sticky top-0 hidden h-screen w-52 shrink-0 border-r border-border/40 bg-card md:block">
        {sidebar}
      </aside>

      {/* Mobile header + overlay */}
      <div className="flex min-w-0 flex-1 flex-col">
        <header className="sticky top-0 z-30 flex h-12 items-center gap-2.5 border-b border-border/40 bg-background/80 px-4 backdrop-blur-md md:hidden">
          <button
            onClick={() => setMobileOpen(!mobileOpen)}
            className="rounded-md p-1 text-muted-foreground hover:bg-accent"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" strokeWidth={1.5} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6.75h16.5M3.75 12h16.5m-16.5 5.25h16.5" />
            </svg>
          </button>
          <div className="flex h-5 w-5 items-center justify-center rounded bg-primary">
            <svg className="h-3 w-3 text-primary-foreground" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4.26 10.147a60.438 60.438 0 0 0-.491 6.347A48.62 48.62 0 0 1 12 20.904a48.62 48.62 0 0 1 8.232-4.41 60.46 60.46 0 0 0-.491-6.347m-15.482 0a23.54 23.54 0 0 0-2.688 6.413A23.654 23.654 0 0 0 12 23.25a23.654 23.654 0 0 0 8.429-3.69 23.54 23.54 0 0 0-2.688-6.413m-15.482 0A47.71 47.71 0 0 1 12 7.443a47.71 47.71 0 0 1 7.741 2.704M12 2.25c-2.676 0-5.216.584-7.499 1.632m14.998 0A17.919 17.919 0 0 0 12 2.25" />
            </svg>
          </div>
          <span className="text-sm font-bold tracking-tight">GradePace</span>
        </header>

        {/* Mobile drawer */}
        {mobileOpen && (
          <>
            <div className="fixed inset-0 z-40 bg-black/50 md:hidden" onClick={() => setMobileOpen(false)} />
            <aside className="fixed inset-y-0 left-0 z-50 w-56 bg-card shadow-xl md:hidden">
              {sidebar}
            </aside>
          </>
        )}

        {/* Page content */}
        <main className="flex-1">{children}</main>
      </div>
    </div>
  );
}
