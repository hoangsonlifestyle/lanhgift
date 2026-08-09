import Image from "next/image";
import { ArrowLink } from "../components/ArrowLink";
import { Eyebrow } from "../components/Eyebrow";

export function Atelier() {
  return (
    <section className="atelier" id="atelier">
      <Image src="/images/catalogue/corporate.png" alt="Dịch vụ logo và vận chuyển của Lành Gift" fill sizes="100vw" className="atelier-bg" />
      <div className="atelier-scrim" />
      <div className="atelier-content story-copy">
        <Eyebrow light>Dành cho những lời cảm ơn có tên</Eyebrow>
        <h2>
          Trao đi
          <br />
          một dấu ấn
          <br />
          <i>riêng.</i>
        </h2>
        <p>
          Lành Gift hỗ trợ thiết kế hộp có logo doanh nghiệp, hỗ trợ in logo lên hộp với epoxy, kim loại khắc laser, decal giấy và
          decal chữ nổi.
        </p>
        <div className="atelier-details">
          <span>
            <b>01</b> Thiết kế logo
          </span>
          <span>
            <b>02</b> Phủ khắp toàn quốc
          </span>
          <span>
            <b>03</b> Miễn phí giao từ 50 hộp tại Hà Nội & TP. Hồ Chí Minh cũ
          </span>
        </div>
        <ArrowLink light>Nhận tư vấn quà tặng</ArrowLink>
      </div>
    </section>
  );
}
