import React, { forwardRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { cn } from '@/lib/utils';

interface GlowButtonProps {
  label?: string;
  onClick?(): void;
  className?: string;
  children?: React.ReactNode;
}

export const GlowButton = forwardRef<HTMLButtonElement, GlowButtonProps>(
  ({ label = "Try LORE", onClick, className, children }, ref) => {
    const [isClicked, setIsClicked] = useState(false);

    const handleClick = () => {
      setIsClicked(true);
      setTimeout(() => setIsClicked(false), 200);
      onClick?.();
    };

    return (
      <button
        ref={ref}
        type="button"
        aria-label={typeof label === "string" ? label : "button"}
        className={cn("glow-btn", className)}
        onClick={handleClick}
        data-state={isClicked ? "clicked" : undefined}
      >
        <span className="flex items-center justify-center gap-1.5">
          {children || label}
          <Sparkles size={16} className="ml-0.5" />
        </span>
      </button>
    );
  }
);

GlowButton.displayName = "GlowButton";
export default GlowButton;
