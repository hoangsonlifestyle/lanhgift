"use client";

import Image from "next/image";
import { motion } from "framer-motion";
import { Eyebrow } from "../components/Eyebrow";
import { partners } from "../data/trang-treo";

export function Partners() {
  return (
    <section className="partners">
      <div className="partners-art">
        <Image src="/images/catalogue/partners.png" alt="Các đối tác tiêu biểu của Lành Gift" fill sizes="100vw" />
      </div>
      <div className="partners-wash" />
      <div className="partners-content">
        <Eyebrow light>Đối tác tiêu biểu</Eyebrow>
        <h2>
          Cùng nhau
          <br />
          gói trọn mùa
          <br />
          <i>đoàn viên.</i>
        </h2>
        <div>
          {partners.map((partner, index) => (
            <motion.span
              key={partner}
              initial={{ y: 20, opacity: 0 }}
              whileInView={{ y: 0, opacity: 1 }}
              viewport={{ once: true }}
              transition={{ delay: index * 0.06 }}
            >
              {partner}
            </motion.span>
          ))}
        </div>
      </div>
    </section>
  );
}
