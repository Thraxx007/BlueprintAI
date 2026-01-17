'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { FileVideo, FileText, Download, Settings, LogOut, Mic, Layers } from 'lucide-react';

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { user, clearAuth, isLoading } = useAuthStore();

  useEffect(() => {
    if (!isLoading && !user) {
      router.push('/login');
    }
  }, [user, isLoading, router]);

  if (isLoading || !user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-line"></div>
      </div>
    );
  }

  const handleLogout = () => {
    clearAuth();
    router.push('/login');
  };

  const navItems = [
    { href: '/videos', label: 'Videos', icon: FileVideo },
    { href: '/audio', label: 'Audio', icon: Mic },
    { href: '/sops', label: 'Blueprints', icon: FileText },
    { href: '/exports', label: 'Exports', icon: Download },
    { href: '/settings/integrations', label: 'Settings', icon: Settings },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Sidebar */}
      <aside className="fixed left-0 top-0 h-full w-64 bg-card border-r-2 border-border bg-blueprint-grid">
        <div className="p-6 border-b-2 border-border">
          <Link href="/videos" className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center border-2 border-line shadow-blueprint">
              <Layers className="h-5 w-5 text-primary-foreground stroke-[1.5]" />
            </div>
            <div className="flex flex-col">
              <span className="font-mono font-bold text-lg tracking-tight">
                <span className="text-foreground">Blueprint</span>
                <span className="text-line">AI</span>
              </span>
              <span className="text-[10px] text-muted-foreground font-mono uppercase tracking-[0.15em]">
                SOP System
              </span>
            </div>
          </Link>
        </div>

        <nav className="px-4 py-4 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                className={`flex items-center space-x-3 px-4 py-3 rounded-sm transition-all font-mono text-sm ${
                  isActive
                    ? 'bg-primary/10 text-primary border-l-2 border-line'
                    : 'text-muted-foreground hover:text-foreground hover:bg-accent/5'
                }`}
              >
                <Icon className="h-5 w-5 stroke-[1.5]" />
                <span className="uppercase tracking-wide">{item.label}</span>
              </Link>
            );
          })}
        </nav>

        <div className="absolute bottom-0 left-0 right-0 p-4 border-t-2 border-border">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="w-8 h-8 bg-secondary rounded-sm flex items-center justify-center border border-border">
                <span className="text-sm font-mono font-medium">
                  {user.name?.[0] || user.email[0].toUpperCase()}
                </span>
              </div>
              <div className="text-sm">
                <p className="font-mono font-medium truncate w-24">{user.name || user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <ThemeToggle />
              <Button variant="ghost" size="icon" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
              </Button>
            </div>
          </div>
        </div>
      </aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen bg-blueprint-dots">
        {children}
      </main>
    </div>
  );
}
