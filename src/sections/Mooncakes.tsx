"use client";

import Image from "next/image";
import { Plus } from "lucide-react";
import { useState } from "react";
import { Eyebrow } from "../components/Eyebrow";
import { tastes } from "../data/trang-treo";

export function Mooncakes() {
  const [active, setActive] = useState(0);

  return (
    <section className="mooncakes" id="moon-cakes">
      <div className="mooncake-art">
        <Image src="/images/catalogue/mooncake.png" alt="Các vị bánh Trung Thu Trăng Treo" fill sizes="(max-width: 800px) 100vw, 60vw" />
      </div>
      <div className="mooncake-copy story-copy">
        <Eyebrow light>Những nốt hương của trăng</Eyebrow>
        <h2>
          Thủ công
          <br />
          trong từng
          <br />
          <i>chi tiết.</i>
        </h2>
        <p>
          Những chiếc bánh Trung Thu Lành Gift được chế biến thủ công từ nguồn nguyên liệu tươi, được chăm chút để giữ trọn vị ngon
          tinh tế.
        </p>
        <div className="taste-list">
          {tastes.map((taste, index) => (
            <button
              key={taste}
              onMouseEnter={() => setActive(index)}
              onFocus={() => setActive(index)}
              onClick={() => setActive(index)}
              className={active === index ? "active" : ""}
            >
              <i>0{index + 1}</i>
              {taste}
              <Plus size={14} />
            </button>
          ))}
        </div>
      </div>
      <div className="mooncake-orbit">
        <span>{tastes[active]}</span>
      </div>
    </section>
  );
}
