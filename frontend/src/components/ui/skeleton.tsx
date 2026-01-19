'use client';

import { cn } from '@/lib/utils';
import { motion } from 'framer-motion';

interface SkeletonProps {
  className?: string;
}

function Skeleton({ className }: SkeletonProps) {
  return (
    <div
      className={cn(
        'relative overflow-hidden rounded-sm bg-muted skeleton-shimmer',
        className
      )}
    />
  );
}

// Card skeleton with multiple elements
function SkeletonCard({ className }: SkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('rounded-sm border-2 border-border bg-card p-6', className)}
    >
      <div className="flex items-center space-x-4">
        <Skeleton className="h-12 w-12 rounded-sm" />
        <div className="space-y-2 flex-1">
          <Skeleton className="h-4 w-3/4" />
          <Skeleton className="h-4 w-1/2" />
        </div>
      </div>
      <div className="mt-6 space-y-3">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </motion.div>
  );
}

// List item skeleton
function SkeletonListItem({ className }: SkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -10 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'flex items-center space-x-4 rounded-sm border-2 border-border bg-card p-4',
        className
      )}
    >
      <Skeleton className="h-10 w-10 rounded-sm" />
      <div className="space-y-2 flex-1">
        <Skeleton className="h-4 w-1/3" />
        <Skeleton className="h-3 w-1/2" />
      </div>
      <Skeleton className="h-8 w-20 rounded-sm" />
    </motion.div>
  );
}

// Table row skeleton
function SkeletonTableRow({ columns = 4 }: { columns?: number }) {
  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className="border-b border-border"
    >
      {Array.from({ length: columns }).map((_, i) => (
        <td key={i} className="p-4">
          <Skeleton className="h-4 w-full" />
        </td>
      ))}
    </motion.tr>
  );
}

// Page header skeleton
function SkeletonPageHeader({ className }: SkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, y: -10 }}
      animate={{ opacity: 1, y: 0 }}
      className={cn('space-y-4', className)}
    >
      <Skeleton className="h-8 w-1/4" />
      <Skeleton className="h-4 w-1/2" />
    </motion.div>
  );
}

// Full page loading skeleton
function SkeletonPage() {
  return (
    <div className="p-8 space-y-8">
      <SkeletonPageHeader />
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
        {[1, 2, 3, 4, 5, 6].map((i) => (
          <motion.div
            key={i}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: i * 0.1 }}
          >
            <SkeletonCard />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

// SOP step skeleton
function SkeletonSOPStep({ className }: SkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0, x: -20 }}
      animate={{ opacity: 1, x: 0 }}
      className={cn(
        'rounded-sm border-2 border-border bg-card p-6 space-y-4',
        className
      )}
    >
      <div className="flex items-center gap-4">
        <Skeleton className="h-8 w-8 rounded-full" />
        <Skeleton className="h-5 w-1/3" />
      </div>
      <Skeleton className="h-48 w-full rounded-sm" />
      <div className="space-y-2">
        <Skeleton className="h-4 w-full" />
        <Skeleton className="h-4 w-5/6" />
        <Skeleton className="h-4 w-4/6" />
      </div>
    </motion.div>
  );
}

// Video card skeleton
function SkeletonVideoCard({ className }: SkeletonProps) {
  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      className={cn('rounded-sm border-2 border-border bg-card overflow-hidden', className)}
    >
      <Skeleton className="h-40 w-full rounded-none" />
      <div className="p-4 space-y-3">
        <Skeleton className="h-5 w-3/4" />
        <div className="flex items-center gap-2">
          <Skeleton className="h-4 w-16" />
          <Skeleton className="h-4 w-20" />
        </div>
        <div className="flex gap-2 pt-2">
          <Skeleton className="h-8 w-24 rounded-sm" />
          <Skeleton className="h-8 w-24 rounded-sm" />
        </div>
      </div>
    </motion.div>
  );
}

// Staggered skeleton list
interface SkeletonListProps {
  count?: number;
  variant?: 'card' | 'list' | 'video';
  className?: string;
}

function SkeletonList({ count = 6, variant = 'card', className }: SkeletonListProps) {
  const SkeletonComponent = {
    card: SkeletonCard,
    list: SkeletonListItem,
    video: SkeletonVideoCard,
  }[variant];

  return (
    <div className={cn('space-y-4', className)}>
      {Array.from({ length: count }).map((_, i) => (
        <motion.div
          key={i}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{
            delay: i * 0.08,
            duration: 0.3,
          }}
        >
          <SkeletonComponent />
        </motion.div>
      ))}
    </div>
  );
}

export {
  Skeleton,
  SkeletonCard,
  SkeletonListItem,
  SkeletonTableRow,
  SkeletonPageHeader,
  SkeletonPage,
  SkeletonSOPStep,
  SkeletonVideoCard,
  SkeletonList,
};
