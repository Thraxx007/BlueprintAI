'use client';

import { motion, HTMLMotionProps, Variants, useInView, useAnimation } from 'framer-motion';
import React, { ReactNode, useEffect, useRef, useState } from 'react';

// ============================================
// Animation Variants
// ============================================

export const fadeIn: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: { duration: 0.5, ease: 'easeOut' }
  },
};

export const fadeInUp: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  },
};

export const fadeInDown: Variants = {
  hidden: { opacity: 0, y: -20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  },
};

export const fadeInLeft: Variants = {
  hidden: { opacity: 0, x: -20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  },
};

export const fadeInRight: Variants = {
  hidden: { opacity: 0, x: 20 },
  visible: {
    opacity: 1,
    x: 0,
    transition: { duration: 0.5, ease: 'easeOut' }
  },
};

export const scaleIn: Variants = {
  hidden: { opacity: 0, scale: 0.9 },
  visible: {
    opacity: 1,
    scale: 1,
    transition: { duration: 0.4, ease: [0.25, 0.46, 0.45, 0.94] }
  },
};

export const slideInFromBottom: Variants = {
  hidden: { opacity: 0, y: 60 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.6, ease: [0.25, 0.46, 0.45, 0.94] }
  },
};

export const staggerContainer: Variants = {
  hidden: { opacity: 0 },
  visible: {
    opacity: 1,
    transition: {
      staggerChildren: 0.1,
      delayChildren: 0.1,
    },
  },
};

export const staggerItem: Variants = {
  hidden: { opacity: 0, y: 20 },
  visible: {
    opacity: 1,
    y: 0,
    transition: { duration: 0.5, ease: 'easeOut' },
  },
};

// Card hover animation
export const cardHover: Variants = {
  rest: {
    scale: 1,
    y: 0,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  hover: {
    scale: 1.02,
    y: -4,
    transition: { duration: 0.2, ease: 'easeOut' }
  },
  tap: {
    scale: 0.98,
    transition: { duration: 0.1 }
  },
};

// Button press animation
export const buttonPress: Variants = {
  rest: { scale: 1 },
  hover: { scale: 1.02 },
  tap: { scale: 0.95 },
};

// ============================================
// Animation Components
// ============================================

interface MotionDivProps extends HTMLMotionProps<'div'> {
  children: ReactNode;
}

// Fade In component
export function FadeIn({ children, ...props }: MotionDivProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeIn}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Fade In Up component
export function FadeInUp({ children, ...props }: MotionDivProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={fadeInUp}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Scale In component
export function ScaleIn({ children, ...props }: MotionDivProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={scaleIn}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Scroll reveal component - animates when element comes into view
interface ScrollRevealProps extends MotionDivProps {
  delay?: number;
  direction?: 'up' | 'down' | 'left' | 'right' | 'none';
  distance?: number;
  once?: boolean;
  threshold?: number;
}

export function ScrollReveal({
  children,
  delay = 0,
  direction = 'up',
  distance = 30,
  once = true,
  threshold = 0.1,
  ...props
}: ScrollRevealProps) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once, amount: threshold });
  const controls = useAnimation();

  const getInitialPosition = () => {
    switch (direction) {
      case 'up': return { y: distance };
      case 'down': return { y: -distance };
      case 'left': return { x: distance };
      case 'right': return { x: -distance };
      default: return {};
    }
  };

  useEffect(() => {
    if (isInView) {
      controls.start({
        opacity: 1,
        x: 0,
        y: 0,
        transition: {
          duration: 0.6,
          delay,
          ease: [0.25, 0.46, 0.45, 0.94]
        }
      });
    }
  }, [isInView, controls, delay]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, ...getInitialPosition() }}
      animate={controls}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Stagger children container
interface StaggerContainerProps extends MotionDivProps {
  staggerDelay?: number;
  initialDelay?: number;
}

export function StaggerContainer({
  children,
  staggerDelay = 0.1,
  initialDelay = 0.1,
  ...props
}: StaggerContainerProps) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: { opacity: 0 },
        visible: {
          opacity: 1,
          transition: {
            staggerChildren: staggerDelay,
            delayChildren: initialDelay,
          },
        },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Stagger item (use inside StaggerContainer)
export function StaggerItem({ children, ...props }: MotionDivProps) {
  return (
    <motion.div
      variants={staggerItem}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Animated card with hover effects
interface AnimatedCardProps extends MotionDivProps {
  hoverScale?: number;
  hoverY?: number;
}

export function AnimatedCard({
  children,
  hoverScale = 1.02,
  hoverY = -4,
  className,
  ...props
}: AnimatedCardProps) {
  return (
    <motion.div
      className={className}
      initial="rest"
      whileHover="hover"
      whileTap="tap"
      variants={{
        rest: { scale: 1, y: 0 },
        hover: {
          scale: hoverScale,
          y: hoverY,
          transition: { duration: 0.2, ease: 'easeOut' }
        },
        tap: { scale: 0.98 },
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Page transition wrapper
interface PageTransitionProps extends MotionDivProps {
  className?: string;
}

export function PageTransition({ children, className, ...props }: PageTransitionProps) {
  return (
    <motion.div
      className={className}
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: -10 }}
      transition={{ duration: 0.3, ease: 'easeInOut' }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Hover glow effect wrapper
interface HoverGlowProps extends MotionDivProps {
  glowColor?: string;
}

export function HoverGlow({ children, glowColor = 'rgba(34, 211, 238, 0.3)', className, ...props }: HoverGlowProps) {
  return (
    <motion.div
      className={className}
      whileHover={{
        boxShadow: `0 0 20px ${glowColor}, 0 0 40px ${glowColor}`,
        transition: { duration: 0.3 }
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Pulse animation (for attention grabbing)
export function Pulse({ children, ...props }: MotionDivProps) {
  return (
    <motion.div
      animate={{
        scale: [1, 1.05, 1],
        opacity: [1, 0.8, 1],
      }}
      transition={{
        duration: 2,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Float animation (subtle floating effect)
export function Float({ children, ...props }: MotionDivProps) {
  return (
    <motion.div
      animate={{
        y: [0, -10, 0],
      }}
      transition={{
        duration: 3,
        repeat: Infinity,
        ease: 'easeInOut',
      }}
      {...props}
    >
      {children}
    </motion.div>
  );
}

// Shimmer effect for loading states
export function Shimmer({ className }: { className?: string }) {
  return (
    <div className={`relative overflow-hidden bg-muted ${className}`}>
      <motion.div
        className="absolute inset-0 -translate-x-full"
        style={{
          background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.1), transparent)',
        }}
        animate={{
          translateX: ['calc(-100%)', 'calc(100%)'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

// Skeleton loader with shimmer
interface SkeletonProps {
  className?: string;
  variant?: 'text' | 'circular' | 'rectangular';
  width?: string | number;
  height?: string | number;
}

export function Skeleton({
  className,
  variant = 'rectangular',
  width,
  height,
}: SkeletonProps) {
  const baseClass = 'bg-muted relative overflow-hidden';
  const variantClass = {
    text: 'rounded-sm h-4',
    circular: 'rounded-full',
    rectangular: 'rounded-sm',
  };

  return (
    <div
      className={`${baseClass} ${variantClass[variant]} ${className}`}
      style={{ width, height }}
    >
      <motion.div
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(90deg, transparent 0%, rgba(255,255,255,0.08) 50%, transparent 100%)',
        }}
        animate={{
          x: ['-100%', '100%'],
        }}
        transition={{
          duration: 1.5,
          repeat: Infinity,
          ease: 'linear',
        }}
      />
    </div>
  );
}

// Number counter animation using useMotionValue
interface CounterProps {
  from?: number;
  to: number;
  duration?: number;
  className?: string;
}

export function Counter({ from = 0, to, duration = 2, className }: CounterProps) {
  const [count, setCount] = React.useState(from);

  useEffect(() => {
    const startTime = Date.now();
    const endTime = startTime + duration * 1000;
    const diff = to - from;

    const updateCount = () => {
      const now = Date.now();
      const progress = Math.min((now - startTime) / (duration * 1000), 1);
      const easeProgress = 1 - Math.pow(1 - progress, 3); // easeOut cubic
      setCount(Math.round(from + diff * easeProgress));

      if (now < endTime) {
        requestAnimationFrame(updateCount);
      }
    };

    requestAnimationFrame(updateCount);
  }, [from, to, duration]);

  return (
    <motion.span
      className={className}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      {count}
    </motion.span>
  );
}

// Typewriter effect
interface TypewriterProps {
  text: string;
  delay?: number;
  className?: string;
}

export function Typewriter({ text, delay = 0.05, className }: TypewriterProps) {
  const characters = text.split('');

  return (
    <span className={className}>
      {characters.map((char, index) => (
        <motion.span
          key={index}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: index * delay }}
        >
          {char}
        </motion.span>
      ))}
    </span>
  );
}

// Ripple effect hook for buttons
export function useRipple() {
  const createRipple = (event: React.MouseEvent<HTMLElement>) => {
    const button = event.currentTarget;
    const rect = button.getBoundingClientRect();
    const x = event.clientX - rect.left;
    const y = event.clientY - rect.top;

    const ripple = document.createElement('span');
    ripple.style.cssText = `
      position: absolute;
      background: rgba(255, 255, 255, 0.3);
      border-radius: 50%;
      transform: scale(0);
      animation: ripple 0.6s linear;
      pointer-events: none;
      left: ${x}px;
      top: ${y}px;
      width: 100px;
      height: 100px;
      margin-left: -50px;
      margin-top: -50px;
    `;

    button.style.position = 'relative';
    button.style.overflow = 'hidden';
    button.appendChild(ripple);

    setTimeout(() => ripple.remove(), 600);
  };

  return createRipple;
}

// Export motion for custom usage
export { motion, AnimatePresence } from 'framer-motion';
export type { Variants };
