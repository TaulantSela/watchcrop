"use client";

import { useEffect, useRef } from "react";

/**
 * The looping demo round on the landing page (recorded by scripts/landing-art.mts).
 * Muted + inline so phones autoplay it; paused with controls for people who
 * asked their system for reduced motion.
 */
export function DemoVideo() {
  const ref = useRef<HTMLVideoElement>(null);

  useEffect(() => {
    const video = ref.current;
    if (video && window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      video.pause();
      video.controls = true;
    }
  }, []);

  return (
    <div className="mx-auto w-[260px] shrink-0 rounded-[2.4rem] border border-white/15 bg-black p-2 shadow-2xl shadow-black/60 sm:w-[280px]">
      <video
        ref={ref}
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        poster="/landing/demo-poster.webp"
        width={390}
        height={780}
        aria-label="A sample round: two wrong brands, the right brand, then the model, solved on crop 3"
        className="block h-auto w-full rounded-[2rem]"
      >
        <source src="/landing/demo.webm" type="video/webm" />
        <source src="/landing/demo.mp4" type="video/mp4" />
      </video>
    </div>
  );
}
