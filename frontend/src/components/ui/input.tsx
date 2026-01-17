import * as React from 'react';
import { cn } from '@/lib/utils';

export interface InputProps
  extends React.InputHTMLAttributes<HTMLInputElement> {}

const Input = React.forwardRef<HTMLInputElement, InputProps>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        type={type}
        className={cn(
          'flex h-10 w-full bg-background px-3 py-2 font-mono text-sm',
          'border-2 border-input rounded-sm',
          'placeholder:text-muted-foreground placeholder:font-sans',
          'focus-visible:outline-none focus-visible:border-line focus-visible:ring-1 focus-visible:ring-line/20',
          'disabled:cursor-not-allowed disabled:opacity-50',
          'transition-colors duration-200',
          className
        )}
        ref={ref}
        {...props}
      />
    );
  }
);
Input.displayName = 'Input';

export { Input };
