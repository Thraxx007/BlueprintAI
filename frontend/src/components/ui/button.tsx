'use client';

import * as React from 'react';
import { Slot } from '@radix-ui/react-slot';
import { cva, type VariantProps } from 'class-variance-authority';
import { cn } from '@/lib/utils';
import { motion, HTMLMotionProps } from 'framer-motion';

const buttonVariants = cva(
  'inline-flex items-center justify-center whitespace-nowrap rounded-sm text-sm font-mono font-medium uppercase tracking-wide transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 relative overflow-hidden',
  {
    variants: {
      variant: {
        default:
          'bg-primary text-primary-foreground border-2 border-primary shadow hover:bg-primary/90 hover:shadow-blueprint',
        destructive:
          'bg-destructive text-destructive-foreground border-2 border-destructive shadow-sm hover:bg-destructive/90',
        outline:
          'border-2 border-line bg-transparent text-line hover:bg-line/10 hover:shadow-blueprint',
        secondary:
          'bg-secondary text-secondary-foreground border-2 border-border shadow-sm hover:bg-secondary/80',
        ghost:
          'hover:bg-accent/10 hover:text-accent-foreground',
        link:
          'text-line underline-offset-4 hover:underline normal-case tracking-normal',
        blueprint:
          'bg-transparent text-line border-2 border-line hover:bg-line/10 hover:shadow-blueprint',
      },
      size: {
        default: 'h-10 px-5 py-2',
        sm: 'h-8 px-4 text-xs',
        lg: 'h-12 px-8 text-base',
        icon: 'h-10 w-10',
      },
    },
    defaultVariants: {
      variant: 'default',
      size: 'default',
    },
  }
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
  animated?: boolean;
}

// Ripple effect component
const Ripple: React.FC<{ x: number; y: number; onComplete: () => void }> = ({
  x,
  y,
  onComplete,
}) => (
  <motion.span
    className="absolute bg-white/30 rounded-full pointer-events-none"
    style={{
      left: x,
      top: y,
      width: 10,
      height: 10,
      marginLeft: -5,
      marginTop: -5,
    }}
    initial={{ scale: 0, opacity: 1 }}
    animate={{ scale: 20, opacity: 0 }}
    transition={{ duration: 0.5, ease: 'easeOut' }}
    onAnimationComplete={onComplete}
  />
);

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, animated = true, onClick, children, ...props }, ref) => {
    const [ripples, setRipples] = React.useState<Array<{ x: number; y: number; id: number }>>([]);
    const rippleIdRef = React.useRef(0);

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
      if (animated && !asChild) {
        const rect = e.currentTarget.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;
        const id = rippleIdRef.current++;
        setRipples((prev) => [...prev, { x, y, id }]);
      }
      onClick?.(e);
    };

    const removeRipple = (id: number) => {
      setRipples((prev) => prev.filter((r) => r.id !== id));
    };

    if (asChild) {
      return (
        <Slot
          className={cn(buttonVariants({ variant, size, className }))}
          ref={ref}
          {...props}
        >
          {children}
        </Slot>
      );
    }

    return (
      <motion.button
        className={cn(buttonVariants({ variant, size, className }))}
        ref={ref}
        onClick={handleClick}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        transition={{ duration: 0.1 }}
        {...(props as HTMLMotionProps<'button'>)}
      >
        {ripples.map((ripple) => (
          <Ripple
            key={ripple.id}
            x={ripple.x}
            y={ripple.y}
            onComplete={() => removeRipple(ripple.id)}
          />
        ))}
        <span className="relative z-10 flex items-center justify-center gap-2">
          {children}
        </span>
      </motion.button>
    );
  }
);
Button.displayName = 'Button';

// Icon button with enhanced animations
interface IconButtonProps extends ButtonProps {
  icon: React.ReactNode;
  tooltip?: string;
}

const IconButton = React.forwardRef<HTMLButtonElement, IconButtonProps>(
  ({ icon, tooltip, className, ...props }, ref) => (
    <motion.div
      whileHover={{ scale: 1.1 }}
      whileTap={{ scale: 0.9 }}
      transition={{ type: 'spring', stiffness: 400, damping: 17 }}
    >
      <Button
        ref={ref}
        size="icon"
        variant="ghost"
        className={className}
        {...props}
      >
        {icon}
      </Button>
    </motion.div>
  )
);
IconButton.displayName = 'IconButton';

// Loading button state
interface LoadingButtonProps extends ButtonProps {
  loading?: boolean;
  loadingText?: string;
}

const LoadingButton = React.forwardRef<HTMLButtonElement, LoadingButtonProps>(
  ({ loading, loadingText, children, disabled, ...props }, ref) => (
    <Button ref={ref} disabled={disabled || loading} {...props}>
      {loading ? (
        <>
          <motion.div
            animate={{ rotate: 360 }}
            transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
            className="w-4 h-4 border-2 border-current border-t-transparent rounded-full mr-2"
          />
          {loadingText || 'Loading...'}
        </>
      ) : (
        children
      )}
    </Button>
  )
);
LoadingButton.displayName = 'LoadingButton';

export { Button, IconButton, LoadingButton, buttonVariants };
