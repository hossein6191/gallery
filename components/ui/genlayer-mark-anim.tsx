"use client";

import { useId } from "react";

/**
 * Five animated treatments of the GenLayer Strong Mark. Geometry is the official
 * mark, unaltered; the mark is never rotated, stretched or recoloured outside the
 * brand palette (Brand Guidelines v1.0, misuse rule 6).
 *
 *  strata  — horizontal layers slide through the mark      (nav, small sizes)
 *  prism   — orchid/purple/blue copies split and register  (hero, focal)
 *  halo    — rings emanate outward from a level mark       (around a hero object)
 *  spark   — a light runs the outline of each wing         (empty cards, watermarks)
 *  liquid  — the mark breathes through a displacement field(footer, logotype)
 */
export type MarkVariant = "strata" | "prism" | "halo" | "spark" | "liquid";

const MARK = (
  <>
    <polygon points="44.26 32.35 27.72 67.12 43.29 74.9 0 91.93 44.26 0 44.26 32.35" />
    <polygon points="53.5 32.35 70.04 67.12 54.47 74.9 97.76 91.93 53.5 0 53.5 32.35" />
    <polygon points="48.64 43.78 58.33 62.94 48.64 67.69 39.47 62.92 48.64 43.78" />
  </>
);

export function GenLayerMarkAnim({
  variant = "strata",
  size = 32,
  className = "",
}: {
  variant?: MarkVariant;
  size?: number;
  className?: string;
}) {
  const uid = useId().replace(/:/g, "");
  const grad = `glg-${uid}`;
  const mask = `glm-${uid}`;
  const dot = `gld-${uid}`;
  const liq = `gll-${uid}`;

  const Gradient = (
    <linearGradient id={grad} x1="0" y1="0" x2="97.76" y2="91.93" gradientUnits="userSpaceOnUse">
      <stop offset="0" stopColor="#E37DF7" />
      <stop offset="1" stopColor="#9B6AF6" />
    </linearGradient>
  );

  if (variant === "prism") {
    return (
      <svg viewBox="-8 -8 113.76 107.93" width={size} height={(size * 107.93) / 113.76} className={className} aria-hidden>
        <g style={{ mixBlendMode: "screen", fill: "#E37DF7", animation: "gl-prism-a calc(4.2s * var(--gl-speed, 1)) cubic-bezier(.45,0,.55,1) infinite" }}>{MARK}</g>
        <g style={{ mixBlendMode: "screen", fill: "#9B6AF6", animation: "gl-prism-b calc(4.2s * var(--gl-speed, 1)) cubic-bezier(.45,0,.55,1) infinite" }}>{MARK}</g>
        <g style={{ mixBlendMode: "screen", fill: "#110FFF", animation: "gl-prism-c calc(4.2s * var(--gl-speed, 1)) cubic-bezier(.45,0,.55,1) infinite" }}>{MARK}</g>
      </svg>
    );
  }

  if (variant === "halo") {
    const ring = (delay: string) => ({
      fill: "none" as const,
      stroke: `url(#${grad})`,
      strokeWidth: 3,
      transformOrigin: "70px 70px",
      animation: `gl-halo-ring calc(6s * var(--gl-speed, 1)) cubic-bezier(.25,.7,.3,1) infinite ${delay}`,
    });
    return (
      <svg viewBox="0 0 140 140" width={size} height={size} className={className} aria-hidden>
        <defs>{Gradient}</defs>
        <circle cx="70" cy="70" r="66" style={ring("0s")} />
        <circle cx="70" cy="70" r="66" style={ring("calc(-2s * var(--gl-speed, 1))")} />
        <circle cx="70" cy="70" r="66" style={ring("calc(-4s * var(--gl-speed, 1))")} />
        <g transform="translate(45.9 47.9) scale(.5)" fill={`url(#${grad})`}>{MARK}</g>
      </svg>
    );
  }

  if (variant === "spark") {
    return (
      <svg viewBox="0 0 97.76 91.93" width={size} height={(size * 91.93) / 97.76} className={className} aria-hidden>
        <defs>
          <radialGradient id={dot}>
            <stop offset="0" stopColor="#FFFFFF" />
            <stop offset=".45" stopColor="#E37DF7" />
            <stop offset="1" stopColor="#9B6AF6" stopOpacity="0" />
          </radialGradient>
          {Gradient}
        </defs>
        <g fill={`url(#${grad})`} opacity=".22">{MARK}</g>
        <g fill="none" stroke={`url(#${grad})`} strokeWidth="1.6" opacity=".5">
          <polygon points="44.26 32.35 27.72 67.12 43.29 74.9 0 91.93 44.26 0" />
          <polygon points="53.5 32.35 70.04 67.12 54.47 74.9 97.76 91.93 53.5 0" />
        </g>
        <circle r="5" fill={`url(#${dot})`}>
          <animateMotion dur="1.35s" repeatCount="indefinite" path="M44.26 0 L44.26 32.35 L27.72 67.12 L43.29 74.9 L0 91.93" />
        </circle>
        <circle r="5" fill={`url(#${dot})`}>
          <animateMotion dur="1.35s" repeatCount="indefinite" path="M53.5 0 L53.5 32.35 L70.04 67.12 L54.47 74.9 L97.76 91.93" />
        </circle>
      </svg>
    );
  }

  if (variant === "liquid") {
    return (
      <svg viewBox="-8 -8 113.76 107.93" width={size} height={(size * 107.93) / 113.76} className={className} aria-hidden>
        <defs>
          {Gradient}
          <filter id={liq} x="-25%" y="-25%" width="150%" height="150%">
            <feTurbulence type="fractalNoise" baseFrequency="0.014 0.022" numOctaves="2" seed="4" result="n">
              <animate attributeName="baseFrequency" dur="5.2s" values="0.014 0.022;0.028 0.01;0.014 0.022" repeatCount="indefinite" />
            </feTurbulence>
            <feDisplacementMap in="SourceGraphic" in2="n" scale="6" xChannelSelector="R" yChannelSelector="G" />
          </filter>
        </defs>
        <g filter={`url(#${liq})`} fill={`url(#${grad})`}>{MARK}</g>
      </svg>
    );
  }

  // strata
  const bands = [-30, -12, 6, 24, 42, 60, 78, 96];
  return (
    <svg viewBox="0 0 97.76 91.93" width={size} height={(size * 91.93) / 97.76} className={className} aria-hidden>
      <defs>
        {Gradient}
        <mask id={mask}>
          <g fill="#fff">{MARK}</g>
        </mask>
      </defs>
      <g mask={`url(#${mask})`}>
        <rect x="0" y="0" width="97.76" height="91.93" fill={`url(#${grad})`} />
        <g style={{ animation: "gl-strata calc(1.5s * var(--gl-speed, 1)) linear infinite" }}>
          {bands.map((y) => (
            <rect key={y} x="-4" y={y} width="106" height="7" fill="#07081a" opacity=".6" />
          ))}
        </g>
      </g>
    </svg>
  );
}
