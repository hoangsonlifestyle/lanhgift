"use client";

import Image from "next/image";
import { ArrowDown, ArrowUpRight } from "lucide-react";
import { Eyebrow } from "../components/Eyebrow";
import { contactLinks } from "../data/trang-treo";

export function Closing() {
  return (
    <section className="closing">
      <Image src="/images/catalogue/contact.png" alt="Liên hệ mua hàng Lành Gift" fill sizes="100vw" className="closing-bg" />
      <div className="closing-shade" />
      <div className="closing-content">
        <Eyebrow>Trăng lại tròn năm sau</Eyebrow>
        <h2>
          Giữ một chỗ
          <br />
          cho lời <i>tri ân.</i>
        </h2>
        <p>Liên hệ mua hàng</p>
        {contactLinks.map((link) => (
          <a key={link.href} href={link.href} target={link.href.startsWith("http") ? "_blank" : undefined} rel={link.href.startsWith("http") ? "noreferrer" : undefined}>
            {link.label} <ArrowUpRight size={15} />
          </a>
        ))}
      </div>
      <div className="closing-foot">
        <span>© Lành Gift 2026</span>
        <span>Trăng Treo · Bộ sưu tập Trung Thu</span>
        <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}>
          Về đầu trang <ArrowDown size={12} />
        </button>
      </div>
    </section>
  );
}
