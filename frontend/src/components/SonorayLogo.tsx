import React from 'react';

interface SonorayLogoProps {
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

export default function SonorayLogo({ className = '', size = 'md' }: SonorayLogoProps) {
  const sizeClasses = {
    sm: {
      text: 'text-2xl',
      height: 'h-[1.5px]',
      sub: 'text-[9px] tracking-wider',
      gap: 'my-[1px]',
    },
    md: {
      text: 'text-[28px]',
      height: 'h-[2px]',
      sub: 'text-[11px] tracking-wider',
      gap: 'my-0.5',
    },
    lg: {
      text: 'text-4xl',
      height: 'h-[2.5px]',
      sub: 'text-sm tracking-wide',
      gap: 'my-1',
    },
  }[size];

  return (
    <div className={`flex flex-col items-center justify-center select-none ${className}`}>
      {/* "Sonoray" Red Serif Text */}
      <span 
        className={`${sizeClasses.text} text-[#e11d48] font-black`}
        style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
          letterSpacing: '-0.03em',
          lineHeight: '1.1',
        }}
      >
        Sonoray
      </span>
      
      {/* Horizontal Divider Line */}
      <div className={`w-full ${sizeClasses.height} bg-slate-900 ${sizeClasses.gap}`} />
      
      {/* "Trusted ultrasound" Blue Cursive/Italic Text */}
      <span 
        className={`${sizeClasses.sub} text-blue-600 font-bold italic`}
        style={{
          fontFamily: "'Georgia', 'Times New Roman', serif",
        }}
      >
        Trusted ultrasound
      </span>
    </div>
  );
}
