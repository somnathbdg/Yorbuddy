import React, { useEffect, useRef, useState } from 'react';

/**
 * AmbientOrbs — lightweight decorative gradient orbs.
 *
 * Pure CSS radial-gradients + `transform` keyframes (no canvas/WebGL).
 * Purely presentational: `pointer-events: none` and `aria-hidden`, so it
 * never intercepts clicks or affects layout/behaviour.
 */
export const AmbientOrbs: React.FC = () => (
  <div className="absolute inset-0 overflow-hidden pointer-events-none" aria-hidden="true">
    <div className="orb orb-blue orb-drift-a top-[-14%] right-[-8%] w-[620px] h-[620px] opacity-70" />
    <div className="orb orb-purple orb-drift-b top-[18%] left-[-12%] w-[560px] h-[560px] opacity-65" />
    <div className="orb orb-pink orb-drift-c bottom-[-18%] right-[18%] w-[520px] h-[520px] opacity-60" />
    <div className="orb orb-cyan orb-drift-b top-[8%] left-[38%] w-[300px] h-[300px] opacity-55" />
    <div className="orb orb-amber orb-drift-a bottom-[6%] left-[8%] w-[240px] h-[240px] opacity-45" />
  </div>
);

/**
 * Reveal — fades + lifts children into view on scroll.
 *
 * Uses IntersectionObserver and only animates `opacity`/`transform`.
 * Falls back to "already visible" when the API is unavailable (SSR/tests),
 * and the `.reveal` class is neutralised under `prefers-reduced-motion`.
 */
interface RevealProps {
  children: React.ReactNode;
  className?: string;
  /** Stagger in seconds, applied as transition-delay. */
  delay?: number;
  as?: 'div' | 'section' | 'li';
}

export const Reveal: React.FC<RevealProps> = ({ children, className = '', delay = 0, as = 'div' }) => {
  const ref = useRef<HTMLElement | null>(null);
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setIsVisible(true);
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: '0px 0px -60px 0px' }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const Tag = as as React.ElementType;

  return (
    <Tag
      ref={ref as never}
      className={`reveal ${isVisible ? 'visible' : ''} ${className}`}
      style={delay ? { transitionDelay: `${delay}s` } : undefined}
    >
      {children}
    </Tag>
  );
};

/**
 * TiltCard — adds a subtle, pointer-driven 3D tilt.
 *
 * Transform-only, disabled entirely under `prefers-reduced-motion`.
 * Children keep their own click handlers; this wrapper never calls
 * preventDefault/stopPropagation.
 */
interface TiltCardProps {
  children: React.ReactNode;
  className?: string;
  /** Maximum rotation in degrees on each axis. */
  intensity?: number;
  /** Extra lift in px applied while hovered. */
  lift?: number;
}

export const TiltCard: React.FC<TiltCardProps> = ({
  children,
  className = '',
  intensity = 7,
  lift = 8,
}) => {
  const ref = useRef<HTMLDivElement>(null);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const node = ref.current;
    if (!node) return;
    if (window.matchMedia?.('(prefers-reduced-motion: reduce)').matches) return;

    const rect = node.getBoundingClientRect();
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    const rotateY = (px - 0.5) * intensity * 2;
    const rotateX = (0.5 - py) * intensity * 2;
    node.style.transform = `perspective(1100px) rotateX(${rotateX.toFixed(2)}deg) rotateY(${rotateY.toFixed(2)}deg) translateY(-${lift}px)`;
  };

  const handleMouseLeave = () => {
    const node = ref.current;
    if (!node) return;
    node.style.transform = '';
  };

  return (
    <div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      className={`preserve-3d transition-transform duration-500 ease-out ${className}`}
      style={{ willChange: 'transform' }}
    >
      {children}
    </div>
  );
};
