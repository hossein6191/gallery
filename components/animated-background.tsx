"use client";

import { useEffect, useRef } from "react";

/**
 * Fixed background for the whole site: three brand blobs, two aurora ribbons,
 * a perspective layer floor, rising light beams and drifting star dust.
 * Layers with data-parallax follow the pointer at their own depth.
 */
export function AnimatedBackground() {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const root = ref.current;
    if (!root) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const layers = Array.from(
      root.querySelectorAll<HTMLElement>("[data-parallax]")
    );
    let frame = 0;

    const onMove = (e: MouseEvent) => {
      if (frame) return;
      frame = requestAnimationFrame(() => {
        frame = 0;
        const nx = e.clientX / window.innerWidth - 0.5;
        const ny = e.clientY / window.innerHeight - 0.5;
        for (const el of layers) {
          const d = Number(el.dataset.parallax) || 0;
          el.style.translate = `${(-nx * d).toFixed(1)}px ${(-ny * d).toFixed(1)}px`;
        }
      });
    };

    window.addEventListener("mousemove", onMove, { passive: true });
    return () => {
      window.removeEventListener("mousemove", onMove);
      if (frame) cancelAnimationFrame(frame);
    };
  }, []);

  return (
    <div className="gl-bg" ref={ref} aria-hidden>
      <div className="gl-blob gl-blob-1" data-parallax="14" />
      <div className="gl-blob gl-blob-2" data-parallax="20" />
      <div className="gl-blob gl-blob-3" data-parallax="30" />
      <div className="gl-ribbon gl-ribbon-1" data-parallax="46" />
      <div className="gl-ribbon gl-ribbon-2" data-parallax="60" />
      <div className="gl-grid" />
      <div className="gl-floor">
        <div className="gl-floor-inner" />
      </div>
      <div className="gl-beam gl-beam-1" />
      <div className="gl-beam gl-beam-2" />
      <div className="gl-beam gl-beam-3" />
      <div className="gl-dust" data-parallax="80" />
      <div className="gl-vignette" />
    </div>
  );
}
