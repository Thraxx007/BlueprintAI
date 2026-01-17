import * as React from 'react';
import { cn } from '@/lib/utils';

export interface TextareaProps
  extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({ className, ...props }, ref) => {
    return (
      <textarea
        className={cn(
          'flex min-h-[80px] w-full bg-background px-3 py-2 font-mono text-sm',
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
Textarea.displayName = 'Textarea';

export { Textarea };
