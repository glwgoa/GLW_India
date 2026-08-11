"use client";

import { useEffect, useRef, useState } from "react";
import { flushSync } from "react-dom";
import { useTheme } from "next-themes";
import { Moon, SunDim } from "lucide-react";
import { cn } from "@/lib/utils";

type AnimatedThemeTogglerProps = {
  className?: string;
};

export function AnimatedThemeToggler({ className }: AnimatedThemeTogglerProps) {
  const { resolvedTheme, setTheme } = useTheme();
  const buttonRef = useRef<HTMLButtonElement>(null);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setMounted(true);
  }, []);

  async function toggleTheme() {
    const next = resolvedTheme === "dark" ? "light" : "dark";

    // Firefox/older Safari don't support View Transitions — fall back to a
    // plain, instant theme switch rather than doing nothing.
    if (!buttonRef.current || !document.startViewTransition) {
      setTheme(next);
      return;
    }

    await document.startViewTransition(() => {
      flushSync(() => setTheme(next));
    }).ready;

    const { top, left, width, height } = buttonRef.current.getBoundingClientRect();
    const x = left + width / 2;
    const y = top + height / 2;
    const right = window.innerWidth - left;
    const bottom = window.innerHeight - top;
    const maxRadius = Math.hypot(Math.max(left, right), Math.max(top, bottom));

    document.documentElement.animate(
      {
        clipPath: [`circle(0px at ${x}px ${y}px)`, `circle(${maxRadius}px at ${x}px ${y}px)`],
      },
      {
        duration: 600,
        easing: "ease-in-out",
        pseudoElement: "::view-transition-new(root)",
      },
    );
  }

  if (!mounted) {
    return (
      <button
        className={cn("inline-flex size-8 items-center justify-center", className)}
        disabled
        aria-label="Toggle theme"
      >
        <SunDim className="size-4" />
      </button>
    );
  }

  return (
    <button
      ref={buttonRef}
      onClick={toggleTheme}
      className={cn(
        "inline-flex size-8 items-center justify-center rounded-md hover:bg-muted",
        className,
      )}
      aria-label="Toggle theme"
    >
      {resolvedTheme === "dark" ? <SunDim className="size-4" /> : <Moon className="size-4" />}
    </button>
  );
}
