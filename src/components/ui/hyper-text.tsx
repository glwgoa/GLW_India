"use client";

import {
  AnimatePresence,
  motion,
  type UseInViewOptions,
  useInView,
} from "motion/react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

const DEFAULT_CHARACTER_SET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const MOTION_TAGS = {
  div: motion.div,
  span: motion.span,
  p: motion.p,
  h1: motion.h1,
  h2: motion.h2,
  h3: motion.h3,
} as const;

type MotionTag = keyof typeof MOTION_TAGS;

interface HyperTextProps {
  children: string;
  className?: string;
  duration?: number;
  delay?: number;
  as?: MotionTag;
  startOnView?: boolean;
  animateOnHover?: boolean;
  characterSet?: string[];
}

export function HyperText({
  children,
  className,
  duration = 800,
  delay = 0,
  as = "div",
  startOnView = true,
  animateOnHover = true,
  characterSet = DEFAULT_CHARACTER_SET,
}: HyperTextProps) {
  const MotionComponent = MOTION_TAGS[as];
  const [displayText, setDisplayText] = useState<string[]>(() => children.split(""));
  const [trigger, setTrigger] = useState(false);
  const iterationCount = useRef(0);
  const elementRef = useRef<HTMLElement | null>(null);

  useInView(elementRef, { once: true, margin: "-30%" as UseInViewOptions["margin"] });

  const handleAnimationTrigger = () => {
    if (animateOnHover && !trigger) {
      iterationCount.current = 0;
      setTrigger(true);
    }
  };

  useEffect(() => {
    if (!startOnView) {
      const startTimeout = setTimeout(() => {
        setTrigger(true);
      }, delay);
      return () => clearTimeout(startTimeout);
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setTimeout(() => {
            setTrigger(true);
          }, delay);
          observer.disconnect();
        }
      },
      { threshold: 0.1, rootMargin: "-30% 0px -30% 0px" },
    );

    if (elementRef.current) {
      observer.observe(elementRef.current);
    }

    return () => observer.disconnect();
  }, [delay, startOnView]);

  useEffect(() => {
    if (!trigger) return;

    const maxIterations = children.length;
    const startTime = performance.now();
    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime;
      const progress = Math.min(elapsed / duration, 1);
      iterationCount.current = progress * maxIterations;

      setDisplayText((currentText) =>
        currentText.map((letter, index) =>
          letter === " "
            ? letter
            : index <= iterationCount.current
              ? children[index]
              : characterSet[Math.floor(Math.random() * characterSet.length)],
        ),
      );

      if (progress < 1) {
        requestAnimationFrame(animate);
      } else {
        setTrigger(false);
      }
    };

    requestAnimationFrame(animate);
  }, [trigger, duration, children, characterSet]);

  return (
    <MotionComponent
      ref={elementRef as React.Ref<HTMLDivElement>}
      className={cn("overflow-hidden py-2 text-4xl font-bold", className)}
      onMouseEnter={handleAnimationTrigger}
    >
      <AnimatePresence>
        {displayText.map((letter, index) => (
          <motion.span key={index} className={cn("font-mono", letter === " " ? "w-3" : "")}>
            {letter}
          </motion.span>
        ))}
      </AnimatePresence>
    </MotionComponent>
  );
}
