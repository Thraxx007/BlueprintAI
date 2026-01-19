'use client';

import { useEffect } from 'react';
import { useRouter, usePathname } from 'next/navigation';
import Link from 'next/link';
import { useAuthStore } from '@/stores/authStore';
import { Button } from '@/components/ui/button';
import { ThemeToggle } from '@/components/ui/theme-toggle';
import { FileVideo, FileText, Download, Settings, LogOut, Mic, Layers } from 'lucide-react';
import { motion, AnimatePresence } from '@/components/ui/animations';

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
        <motion.div
          initial={{ opacity: 0, scale: 0.8 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.3 }}
          className="flex flex-col items-center gap-4"
        >
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-10 h-10 border-2 border-line border-t-transparent rounded-full"
          />
          <motion.span
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="text-sm font-mono text-muted-foreground"
          >
            Loading...
          </motion.span>
        </motion.div>
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
      <motion.aside
        initial={{ x: -264, opacity: 0 }}
        animate={{ x: 0, opacity: 1 }}
        transition={{ duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }}
        className="fixed left-0 top-0 h-full w-64 bg-card border-r-2 border-border bg-blueprint-grid z-40"
      >
        <div className="p-6 border-b-2 border-border">
          <Link href="/videos" className="flex items-center space-x-3 group">
            <motion.div
              whileHover={{ scale: 1.05, rotate: 5 }}
              whileTap={{ scale: 0.95 }}
              className="w-10 h-10 bg-primary rounded-sm flex items-center justify-center border-2 border-line shadow-blueprint transition-shadow group-hover:shadow-glow"
            >
              <Layers className="h-5 w-5 text-primary-foreground stroke-[1.5]" />
            </motion.div>
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
          {navItems.map((item, index) => {
            const Icon = item.icon;
            const isActive = pathname.startsWith(item.href);
            return (
              <motion.div
                key={item.href}
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                transition={{ duration: 0.3, delay: index * 0.05 }}
              >
                <Link
                  href={item.href}
                  className={`flex items-center space-x-3 px-4 py-3 rounded-sm transition-all font-mono text-sm relative overflow-hidden group ${
                    isActive
                      ? 'bg-primary/10 text-primary border-l-2 border-line'
                      : 'text-muted-foreground hover:text-foreground hover:bg-accent/5'
                  }`}
                >
                  {/* Hover background effect */}
                  <motion.div
                    className="absolute inset-0 bg-line/5 opacity-0 group-hover:opacity-100 transition-opacity"
                    layoutId={`nav-hover-${item.href}`}
                  />
                  <motion.div
                    whileHover={{ scale: 1.1 }}
                    whileTap={{ scale: 0.9 }}
                    className="relative z-10"
                  >
                    <Icon className="h-5 w-5 stroke-[1.5]" />
                  </motion.div>
                  <span className="uppercase tracking-wide relative z-10">{item.label}</span>
                  {isActive && (
                    <motion.div
                      layoutId="nav-active-indicator"
                      className="absolute left-0 top-0 bottom-0 w-0.5 bg-line"
                      transition={{ type: 'spring', stiffness: 500, damping: 30 }}
                    />
                  )}
                </Link>
              </motion.div>
            );
          })}
        </nav>

        <motion.div
          initial={{ y: 20, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          transition={{ duration: 0.4, delay: 0.3 }}
          className="absolute bottom-0 left-0 right-0 p-4 border-t-2 border-border"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <motion.div
                whileHover={{ scale: 1.05 }}
                className="w-8 h-8 bg-secondary rounded-sm flex items-center justify-center border border-border"
              >
                <span className="text-sm font-mono font-medium">
                  {user.name?.[0] || user.email[0].toUpperCase()}
                </span>
              </motion.div>
              <div className="text-sm">
                <p className="font-mono font-medium truncate w-24">{user.name || user.email}</p>
              </div>
            </div>
            <div className="flex items-center space-x-1">
              <ThemeToggle />
              <motion.div whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }}>
                <Button variant="ghost" size="icon" onClick={handleLogout}>
                  <LogOut className="h-4 w-4" />
                </Button>
              </motion.div>
            </div>
          </div>
        </motion.div>
      </motion.aside>

      {/* Main content */}
      <main className="ml-64 min-h-screen bg-blueprint-dots">
        <AnimatePresence mode="wait">
          <motion.div
            key={pathname}
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.3, ease: 'easeInOut' }}
          >
            {children}
          </motion.div>
        </AnimatePresence>
      </main>
    </div>
  );
}
