'use client';

import {
  LazyMotion,
  animate,
  domAnimation,
  m,
  useInView,
  useMotionValue,
  useMotionValueEvent,
  useReducedMotion,
  useTransform,
} from 'motion/react';
import { useEffect, useRef, type ReactNode } from 'react';

const ease: [number, number, number, number] = [0.22, 1, 0.36, 1];

export function MotionProvider({ children }: { children: ReactNode }) {
  return (
    <LazyMotion features={domAnimation} strict>
      {children}
    </LazyMotion>
  );
}

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
  y?: number;
  amount?: number;
}

export function Reveal({ children, className, delay = 0, y = 20, amount = 0.2 }: RevealProps) {
  return (
    <m.div
      data-reveal
      className={className}
      initial={{ opacity: 0, y }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount }}
      transition={{ duration: 0.55, delay, ease }}
    >
      {children}
    </m.div>
  );
}

interface CountUpProps {
  value: number;
  suffix?: string;
  className?: string;
}

export function CountUp({ value, suffix = '', className }: CountUpProps) {
  const containerRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const inView = useInView(containerRef, { once: true, amount: 0.6 });
  const reduce = useReducedMotion();
  const count = useMotionValue(0);
  const rounded = useTransform(count, (latest) => `${Math.round(latest).toLocaleString('en-US')}${suffix}`);

  useMotionValueEvent(rounded, 'change', (latest) => {
    if (textRef.current) textRef.current.textContent = latest;
  });

  useEffect(() => {
    if (!textRef.current) return;
    textRef.current.textContent = reduce
      ? `${value.toLocaleString('en-US')}${suffix}`
      : `0${suffix}`;
  }, [reduce, suffix, value]);

  useEffect(() => {
    if (!inView || reduce) return;
    const controls = animate(count, value, { duration: 1.1, ease });
    return () => controls.stop();
  }, [count, inView, reduce, value]);

  return (
    <span ref={containerRef} className={className}>
      <span ref={textRef} aria-hidden="true">
        {value.toLocaleString('en-US')}
        {suffix}
      </span>
      <span className="sr-only">
        {value.toLocaleString('en-US')}
        {suffix}
      </span>
    </span>
  );
}
