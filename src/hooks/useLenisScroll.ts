"use client";

import Lenis from "lenis";
import { useEffect } from "react";

export function useLenisScroll() {
  useEffect(() => {
    const lenis = new Lenis({ lerp: 0.075, smoothWheel: true, syncTouch: false });
    let raf = 0;

    const frame = (time: number) => {
      lenis.raf(time);
      raf = requestAnimationFrame(frame);
    };

    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      lenis.destroy();
    };
  }, []);
}
