"use client";

import Image from "next/image";
import { motion, useScroll, useTransform } from "framer-motion";
import { ArrowDown } from "lucide-react";
import { useRef } from "react";
import { Eyebrow } from "../components/Eyebrow";
import { MoonField } from "../components/MoonField";

export function Hero() {
  const heroRef = useRef<HTMLElement>(null);
  const { scrollYProgress } = useScroll({ target: heroRef, offset: ["start start", "end start"] });
  const y = useTransform(scrollYProgress, [0, 1], [0, 120]);
  const scale = useTransform(scrollYProgress, [0, 1], [1, 1.08]);

  return (
    <section className="hero" ref={heroRef}>
      <motion.div className="hero-cover" style={{ scale }}>
        <Image src="/images/catalogue/cover.png" alt="Bộ sưu tập Trăng Treo by Lành Gift" fill priority sizes="100vw" />
      </motion.div>
      <div className="hero-shade" />
      <div className="hero-paper" />
      <MoonField />
      <motion.div className="hero-content" style={{ y }}>
        <Eyebrow light>Mid-autumn collection · 2026</Eyebrow>
        <h1>
          <span>Bộ sưu tập</span>
          TRĂNG
          <br />
          <i>TREO</i>
        </h1>
        <p>
          Giao Hưởng Trăng Tròn
          <br />
          từ Lành Gift
        </p>
      </motion.div>
      <button className="scroll-enter" onClick={() => document.getElementById("invitation")?.scrollIntoView({ behavior: "smooth" })}>
        <span>Mở thiệp mời</span>
        <ArrowDown size={16} />
      </button>
      <span className="hero-count">
        01 <b /> 10
      </span>
    </section>
  );
}
