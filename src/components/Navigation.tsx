"use client";

import { AnimatePresence, motion } from "framer-motion";
import { ChevronRight, Menu, Pause, Volume2, X } from "lucide-react";
import { navLinks } from "../data/trang-treo";
import { Eyebrow } from "./Eyebrow";

type NavigationProps = {
  menuOpen: boolean;
  scorePlaying: boolean;
  setMenuOpen: (open: boolean) => void;
  setScorePlaying: (playing: boolean) => void;
};

export function Navigation({ menuOpen, scorePlaying, setMenuOpen, setScorePlaying }: NavigationProps) {
  const go = (id: string) => {
    document.getElementById(id)?.scrollIntoView({ behavior: "smooth" });
    setMenuOpen(false);
  };

  return (
    <>
      <nav className="nav" aria-label="Điều hướng chính">
        <button className="brand" onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} aria-label="Về đầu trang">
          Lành <i>Gift</i>
        </button>
        <div className="nav-title">
          <span className="nav-star">✦</span> Trăng Treo <b /> 2026
        </div>
        <div className="nav-actions">
          <button
            className={`score-toggle ${scorePlaying ? "playing" : ""}`}
            onClick={() => setScorePlaying(!scorePlaying)}
            aria-label="Bật hoặc tắt gợi ý âm thanh"
          >
            {scorePlaying ? <Pause size={14} /> : <Volume2 size={14} />}
            <span>{scorePlaying ? "Nguyệt khúc" : "Âm thanh"}</span>
          </button>
          <button className="menu-button" onClick={() => setMenuOpen(!menuOpen)} aria-label="Mở menu">
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </nav>

      <AnimatePresence>
        {menuOpen && (
          <motion.div
            className="menu"
            initial={{ clipPath: "inset(0 0 100% 0)" }}
            animate={{ clipPath: "inset(0 0 0 0)" }}
            exit={{ clipPath: "inset(0 0 100% 0)" }}
            transition={{ duration: 0.7, ease: [0.72, 0, 0.2, 1] }}
          >
            <div className="menu-pattern" />
            <div className="menu-inner">
              <Eyebrow light>Hành lang Nguyệt điện</Eyebrow>
              <div className="menu-links">
                {navLinks.map(([label, id], index) => (
                  <button key={id} onClick={() => go(id)}>
                    <em>0{index + 1}</em>
                    <span>{label}</span>
                    <ChevronRight size={24} />
                  </button>
                ))}
              </div>
              <p>
                Collection 2026
                <br />
                by Lành Gift
              </p>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
