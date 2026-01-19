'use client';

import * as React from 'react';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

interface CardProps extends React.HTMLAttributes<HTMLDivElement> {
  interactive?: boolean;
  hoverScale?: number;
  hoverY?: number;
}

const Card = React.forwardRef<HTMLDivElement, CardProps>(
  ({ className, interactive = false, hoverScale = 1.02, hoverY = -4, ...props }, ref) => {
    if (interactive) {
      return (
        <motion.div
          ref={ref}
          className={cn(
            'relative rounded-sm border-2 border-border bg-card text-card-foreground shadow-sm card-shine',
            'transition-colors hover:border-line/50',
            className
          )}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          whileHover={{
            scale: hoverScale,
            y: hoverY,
            transition: { duration: 0.2, ease: 'easeOut' },
          }}
          whileTap={{ scale: 0.98 }}
          transition={{ duration: 0.4 }}
          {...(props as HTMLMotionProps<'div'>)}
        />
      );
    }

    return (
      <div
        ref={ref}
        className={cn(
          'relative rounded-sm border-2 border-border bg-card text-card-foreground shadow-sm',
          className
        )}
        {...props}
      />
    );
  }
);
Card.displayName = 'Card';

const CardHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex flex-col space-y-1.5 p-6 border-b border-border', className)}
    {...props}
  />
));
CardHeader.displayName = 'CardHeader';

const CardTitle = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h3
    ref={ref}
    className={cn('font-mono font-semibold leading-none tracking-tight uppercase', className)}
    {...props}
  />
));
CardTitle.displayName = 'CardTitle';

const CardDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn('text-sm text-muted-foreground', className)}
    {...props}
  />
));
CardDescription.displayName = 'CardDescription';

const CardContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div ref={ref} className={cn('p-6 pt-0', className)} {...props} />
));
CardContent.displayName = 'CardContent';

const CardFooter = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn('flex items-center p-6 pt-0', className)}
    {...props}
  />
));
CardFooter.displayName = 'CardFooter';

// Animated card wrapper for stagger effects
interface AnimatedCardWrapperProps {
  children: React.ReactNode;
  index?: number;
  className?: string;
}

const AnimatedCardWrapper: React.FC<AnimatedCardWrapperProps> = ({
  children,
  index = 0,
  className,
}) => (
  <motion.div
    className={className}
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{
      duration: 0.4,
      delay: index * 0.1,
      ease: [0.25, 0.46, 0.45, 0.94],
    }}
  >
    {children}
  </motion.div>
);

export {
  Card,
  CardHeader,
  CardFooter,
  CardTitle,
  CardDescription,
  CardContent,
  AnimatedCardWrapper,
};
