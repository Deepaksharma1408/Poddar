'use client';

import { useId } from 'react';

export function PoddarCrest({
  size = 42,
  light = true,
}: {
  size?: number;
  light?: boolean;
}) {
  const rawId = useId();
  const uid = rawId.replace(/[^a-zA-Z0-9_-]/g, '');

  const gold = '#c6a76c';
  const goldLight = '#f3e3be';
  const red = '#b8231f';

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className="poddar-crest-svg"
      aria-hidden="true"
    >
      <defs>
        <linearGradient
          id={`flameGrad-${uid}`}
          x1="50"
          y1="18"
          x2="50"
          y2="58"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#f59e0b" />
          <stop offset="45%" stopColor="#ef4444" />
          <stop offset="100%" stopColor="#ad211d" />
        </linearGradient>
        <linearGradient
          id={`goldRim-${uid}`}
          x1="10"
          y1="10"
          x2="90"
          y2="90"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor="#f7e8c6" />
          <stop offset="50%" stopColor="#c6a76c" />
          <stop offset="100%" stopColor="#8c6d32" />
        </linearGradient>
        <radialGradient
          id={`sunGlow-${uid}`}
          cx="50"
          cy="45"
          r="35"
          gradientUnits="userSpaceOnUse"
        >
          <stop offset="0%" stopColor={light ? '#ffffff1c' : '#c6a76c20'} />
          <stop offset="100%" stopColor="#ffffff00" />
        </radialGradient>
      </defs>

      {/* Subtle background ambient halo */}
      <circle cx="50" cy="50" r="48" fill={`url(#sunGlow-${uid})`} />

      {/* Outer decorative ring */}
      <circle cx="50" cy="50" r="46" stroke={`url(#goldRim-${uid})`} strokeWidth="2.4" />
      <circle
        cx="50"
        cy="50"
        r="42.5"
        stroke={light ? '#ffffff30' : '#08529330'}
        strokeWidth="1"
        strokeDasharray="2.5 2"
      />

      {/* Inner ring */}
      <circle cx="50" cy="50" r="35.5" stroke={`url(#goldRim-${uid})`} strokeWidth="1.4" />

      {/* Laurel leaves wreath arc */}
      <g stroke={gold} strokeWidth="1.2" strokeLinecap="round" opacity="0.9">
        {/* Left arc leaves */}
        <path d="M 22 50 C 21 39, 26 29, 36 23" />
        <ellipse cx="21" cy="45" rx="3.2" ry="1.6" transform="rotate(-30 21 45)" fill={gold} />
        <ellipse cx="23" cy="37" rx="3.2" ry="1.6" transform="rotate(-45 23 37)" fill={gold} />
        <ellipse cx="28" cy="30" rx="3.2" ry="1.6" transform="rotate(-60 28 30)" fill={gold} />

        {/* Right arc leaves */}
        <path d="M 78 50 C 79 39, 74 29, 64 23" />
        <ellipse cx="79" cy="45" rx="3.2" ry="1.6" transform="rotate(30 79 45)" fill={gold} />
        <ellipse cx="77" cy="37" rx="3.2" ry="1.6" transform="rotate(45 77 37)" fill={gold} />
        <ellipse cx="72" cy="30" rx="3.2" ry="1.6" transform="rotate(60 72 30)" fill={gold} />
      </g>

      {/* Radiant flame of knowledge */}
      <g transform="translate(0, -2)">
        {/* Outer flame */}
        <path
          d="M 50 17 C 44 26, 39 33, 39 44 C 39 52, 44 57, 50 57 C 56 57, 61 52, 61 44 C 61 33, 56 26, 50 17 Z"
          fill={`url(#flameGrad-${uid})`}
        />
        {/* Inner brilliant core */}
        <path
          d="M 50 24 C 47 30, 45 35, 45 42 C 45 47, 47 51, 50 51 C 53 51, 55 47, 55 42 C 55 35, 53 30, 50 24 Z"
          fill="#fef08a"
          opacity="0.95"
        />
        {/* Spark tip */}
        <circle cx="50" cy="20" r="1.5" fill="#ffffff" />
      </g>

      {/* Flame chalice base */}
      <path d="M 43 56 L 57 56 L 54 62 L 46 62 Z" fill={gold} />
      <rect x="42" y="62" width="16" height="2.2" rx="1" fill={goldLight} />

      {/* Foundation ribbon banner "SINCE 1998" */}
      <g transform="translate(0, 3)">
        {/* Ribbon banner background */}
        <path
          d="M 23 71 L 30 67 L 70 67 L 77 71 L 73 78 L 68 76 L 32 76 L 27 78 Z"
          fill={red}
        />
        {/* Ribbon folded edge shadows */}
        <path d="M 30 67 L 30 76 L 26 71 Z" fill="#6e1411" />
        <path d="M 70 67 L 70 76 L 74 71 Z" fill="#6e1411" />

        {/* Golden text "SINCE 1998" */}
        <text
          x="50"
          y="74.5"
          textAnchor="middle"
          fill="#fef08a"
          fontSize="6.2"
          fontFamily="system-ui, -apple-system, sans-serif"
          fontWeight="bold"
          letterSpacing="0.8px"
        >
          SINCE 1998
        </text>
      </g>
    </svg>
  );
}

export default function PoddarBrandLogo({
  variant = 'light',
  showTagline = true,
  size = 42,
  iconOnly = false,
}: {
  variant?: 'light' | 'dark';
  showTagline?: boolean;
  size?: number;
  iconOnly?: boolean;
}) {
  const isLight = variant === 'light';

  if (iconOnly) {
    return (
      <div
        className={`poddar-logotype ${isLight ? 'theme-light' : 'theme-dark'} poddar-icon-only`}
        title="Poddar Group of Institutions"
      >
        <PoddarCrest size={size} light={isLight} />
      </div>
    );
  }

  return (
    <div className={`poddar-logotype ${isLight ? 'theme-light' : 'theme-dark'}`}>
      <div className="poddar-logotype-lockup">
        <PoddarCrest size={size} light={isLight} />
        <div className="poddar-wordmark">
          <div className="poddar-brand-title">
            <span className="poddar-name">PODDAR</span>
            <span className="poddar-trademark">TM</span>
          </div>
          <div className="poddar-brand-subtitle">GROUP OF INSTITUTIONS</div>
        </div>
      </div>
      {showTagline && (
        <div className="poddar-campus-edition">
          <span className="edition-bullet" />
          <span className="edition-text">CONNECT · COLLEGE EDITION</span>
        </div>
      )}
    </div>
  );
}
