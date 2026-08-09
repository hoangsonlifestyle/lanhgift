"use client";

import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { useLayoutEffect } from "react";

export function useStoryAnimations() {
  useLayoutEffect(() => {
    gsap.registerPlugin(ScrollTrigger);

    const ctx = gsap.context(() => {
      gsap.utils.toArray<HTMLElement>(".story-copy").forEach((element) => {
        gsap.fromTo(
          element,
          { y: 48, opacity: 0 },
          {
            y: 0,
            opacity: 1,
            duration: 1.1,
            ease: "power3.out",
            scrollTrigger: { trigger: element, start: "top 82%", once: true },
          },
        );
      });

      gsap.fromTo(
        ".score-line path",
        { strokeDashoffset: 1500 },
        {
          strokeDashoffset: 0,
          ease: "none",
          scrollTrigger: { trigger: ".score-line", start: "top 85%", end: "bottom 38%", scrub: 1 },
        },
      );

      gsap.utils.toArray<HTMLElement>(".chapter-photo").forEach((photo) => {
        gsap.fromTo(
          photo,
          { clipPath: "inset(0 0 100% 0)", y: 40 },
          {
            clipPath: "inset(0 0 0 0)",
            y: 0,
            duration: 1.4,
            ease: "power4.out",
            scrollTrigger: { trigger: photo, start: "top 82%", once: true },
          },
        );
      });
    });

    return () => ctx.revert();
  }, []);
}
