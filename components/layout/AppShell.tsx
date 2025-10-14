"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { primaryNavigation } from "@/config/navigation";
import { useAuth } from "@/hooks/useAuth";
import type { AppUser } from "@/components/providers/AuthProvider";

interface AppShellProps {
  title: string;
  description?: string;
  actions?: React.ReactNode;
  children: React.ReactNode;
  user?: AppUser | null;
  onSignOut?: () => void;
}

export default function AppShell({
  title,
  description,
  actions,
  children,
  user: providedUser,
  onSignOut,
}: AppShellProps) {
  const router = useRouter();
  const pathname = usePathname();
  const { user: contextUser, logout } = useAuth();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const user = providedUser ?? contextUser;

  if (!user) {
    return null;
  }

  const initials = (user.name || user.email || "U")
    .split(" ")
    .map((segment) => segment.charAt(0))
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const handleLogout = () => {
    if (onSignOut) {
      onSignOut();
      return;
    }

    logout();
    router.replace("/login");
  };

  const isActive = (href: string) => {
    if (href === "/dashboard") {
      return pathname === href;
    }

    return pathname === href || pathname.startsWith(`${href}/`);
  };

  return (
    <div className="flex min-h-screen bg-gradient-to-br from-slate-50 via-slate-100 to-slate-50">
      {isSidebarOpen && (
        <button
          type="button"
          className="fixed inset-0 z-40 bg-gray-900/60 backdrop-blur-sm transition-all duration-300 lg:hidden"
          onClick={() => setIsSidebarOpen(false)}
          aria-label="Close navigation menu"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 w-72 transform border-r border-slate-200/80 bg-white shadow-2xl transition-all duration-300 ease-out lg:static lg:z-auto lg:translate-x-0 lg:shadow-xl ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex h-full flex-col">
          <div className="border-b border-slate-200/50 bg-gradient-to-br from-slate-50 to-white px-6 py-6">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-sky-500 to-blue-600 text-lg font-bold text-white shadow-lg shadow-blue-500/30">
                EMS
              </div>
              <div>
                <p className="text-base font-bold tracking-tight text-slate-900">
                  e-निरीक्षण
                </p>
                <p className="text-xs font-medium text-slate-500">
                  Performance &amp; AI workspace
                </p>
              </div>
            </div>
          </div>

          <nav className="mt-4 flex-1 space-y-1 px-4">
            {primaryNavigation.map((item) => {
              // Check if user has access to this navigation item
              if (item.roles && !item.roles.includes(user.role)) {
                return null;
              }
              
              const active = isActive(item.href);
              const Icon = item.icon;
              return (
                <Link
                  key={item.href}
                  href={item.href}
                  onClick={() => setIsSidebarOpen(false)}
                  className={`group flex items-center justify-between rounded-xl px-4 py-3 text-sm font-semibold transition-all duration-200 ${
                    active
                      ? "bg-gradient-to-r from-blue-500 to-blue-600 text-white shadow-lg shadow-blue-500/30"
                      : "text-slate-700 hover:bg-gray-100 hover:text-slate-900 active:scale-[0.98]"
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Icon className="h-5 w-5" />
                    <span>{item.name}</span>
                  </div>
                  {active && (
                    <span className="flex h-2 w-2 animate-pulse rounded-full bg-white" />
                  )}
                </Link>
              );
            })}
          </nav>

          <div className="mt-auto border-t border-slate-200/50 bg-gradient-to-br from-slate-50 to-white px-6 py-5">
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Signed in as
            </p>
            <p className="mt-2 text-sm font-bold text-slate-900">{user.name}</p>
            <p className="text-xs font-medium text-slate-500">{user.email}</p>
            <span
              className={`mt-3 inline-flex rounded-full px-3 py-1 text-xs font-bold shadow-sm ${
                user.role === "admin"
                  ? "bg-gradient-to-r from-amber-500 to-orange-600 text-white"
                  : "bg-gradient-to-r from-blue-500 to-cyan-600 text-white"
              }`}
            >
              {user.role}
            </span>
          </div>
        </div>
      </aside>

      <div className="flex flex-1 flex-col lg:pl-0">
        <header className="sticky top-0 z-30 border-b border-slate-200/50 bg-white/90 shadow-sm backdrop-blur-xl">
          <div className="mx-auto flex w-full max-w-7xl items-center justify-between px-4 py-4 sm:px-6 lg:px-8">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="inline-flex items-center justify-center rounded-xl border border-slate-200 bg-white p-2.5 text-slate-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md active:scale-95 lg:hidden"
                onClick={() => setIsSidebarOpen((prev) => !prev)}
                aria-label="Toggle navigation menu"
              >
                <span className="sr-only">Toggle menu</span>
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                  className="h-5 w-5"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M4 6h16M4 12h16M4 18h16"
                  />
                </svg>
              </button>
              <div>
                <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
                  Control Center
                </p>
                <p className="text-base font-bold tracking-tight text-slate-900">
                  {title}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="hidden text-right sm:block">
                <p className="text-sm font-bold text-slate-900">{user.name}</p>
                <p className="text-xs font-medium text-slate-500">
                  {user.role}
                </p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-full bg-gradient-to-br from-sky-500 to-blue-600 text-sm font-bold text-white shadow-lg shadow-blue-500/30 ring-2 ring-white">
                {initials}
              </div>
              <button
                type="button"
                onClick={handleLogout}
                className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:bg-gray-50 hover:shadow-md active:scale-95"
              >
                Sign out
              </button>
            </div>
          </div>
        </header>

        <main className="flex flex-1 flex-col">
          <div className="mx-auto flex w-full max-w-7xl flex-1 flex-col px-4 py-6 sm:px-6 lg:px-8">
            <div className="mb-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h1 className="text-3xl font-bold tracking-tight text-slate-900">
                  {title}
                </h1>
                {description && (
                  <p className="mt-2 text-sm font-medium text-slate-600">
                    {description}
                  </p>
                )}
              </div>
              {actions && (
                <div className="flex items-center gap-2">{actions}</div>
              )}
            </div>
            <div className="flex-1">{children}</div>
          </div>
        </main>
      </div>
    </div>
  );
}
