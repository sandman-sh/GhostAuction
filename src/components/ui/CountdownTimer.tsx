'use client';

import { useState, useEffect } from 'react';
import { getTimeRemaining } from '@/lib/solana';

interface CountdownTimerProps {
  targetTimestamp: number;
  label?: string;
  onComplete?: () => void;
  size?: 'sm' | 'md' | 'lg';
}

export default function CountdownTimer({ targetTimestamp, label, onComplete, size = 'md' }: CountdownTimerProps) {
  const [time, setTime] = useState(getTimeRemaining(targetTimestamp));

  useEffect(() => {
    const interval = setInterval(() => {
      const remaining = getTimeRemaining(targetTimestamp);
      setTime(remaining);
      if (remaining.total <= 0) {
        clearInterval(interval);
        onComplete?.();
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [targetTimestamp, onComplete]);

  const sizeClasses = {
    sm: 'text-xs gap-1',
    md: 'text-sm gap-2',
    lg: 'text-lg gap-3',
  };

  const boxClasses = {
    sm: 'w-8 h-8 text-xs',
    md: 'w-12 h-12 text-sm',
    lg: 'w-16 h-16 text-lg',
  };

  if (time.total <= 0) {
    return (
      <div className="font-mono text-[var(--accent-green)] font-bold animate-pulse">
        {label ? `${label}: ` : ''}ENDED
      </div>
    );
  }

  return (
    <div className="space-y-1">
      {label && (
        <div className="font-mono text-xs text-[var(--text-primary)]/50 uppercase tracking-wider">
          {label}
        </div>
      )}
      <div className={`flex items-center font-mono font-bold ${sizeClasses[size]}`}>
        {time.days > 0 && (
          <>
            <div className={`flex flex-col items-center justify-center border-2 border-[var(--border-color)] bg-[var(--bg-secondary)] ${boxClasses[size]}`}>
              <span className="text-[var(--accent-green)]">{String(time.days).padStart(2, '0')}</span>
              <span className="text-[6px] text-[var(--text-primary)]/40 uppercase">Days</span>
            </div>
            <span className="text-[var(--accent-green)]">:</span>
          </>
        )}
        <div className={`flex flex-col items-center justify-center border-2 border-[var(--border-color)] bg-[var(--bg-secondary)] ${boxClasses[size]}`}>
          <span className="text-[var(--accent-green)]">{String(time.hours).padStart(2, '0')}</span>
          <span className="text-[6px] text-[var(--text-primary)]/40 uppercase">Hrs</span>
        </div>
        <span className="text-[var(--accent-green)]">:</span>
        <div className={`flex flex-col items-center justify-center border-2 border-[var(--border-color)] bg-[var(--bg-secondary)] ${boxClasses[size]}`}>
          <span className="text-[var(--accent-purple)]">{String(time.minutes).padStart(2, '0')}</span>
          <span className="text-[6px] text-[var(--text-primary)]/40 uppercase">Min</span>
        </div>
        <span className="text-[var(--accent-purple)]">:</span>
        <div className={`flex flex-col items-center justify-center border-2 border-[var(--border-color)] bg-[var(--bg-secondary)] ${boxClasses[size]}`}>
          <span className="text-[var(--accent-purple)]">{String(time.seconds).padStart(2, '0')}</span>
          <span className="text-[6px] text-[var(--text-primary)]/40 uppercase">Sec</span>
        </div>
      </div>
    </div>
  );
}
