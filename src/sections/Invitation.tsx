import Image from "next/image";
import { ArrowLink } from "../components/ArrowLink";
import { Eyebrow } from "../components/Eyebrow";

export function Invitation() {
  return (
    <section className="invitation" id="invitation">
      <div className="invitation-art">
        <Image src="/images/catalogue/invitation.png" alt="Cành bánh Trung Thu trong ánh trăng xanh" fill sizes="(max-width: 800px) 100vw, 57vw" />
      </div>
      <div className="invitation-wash" />
      <div className="invitation-copy story-copy">
        <Eyebrow light>Lời mời đến Nguyệt điện</Eyebrow>
        <h2>
          Đêm rằm này,
          <br />
          xin mời bạn
          <br />
          <i>lắng nghe.</i>
        </h2>
        <p>
          <span>Trung Thu vốn là ngày hội lung linh dưới trần gian.</span>
          <span>Vậy ở chốn Cung Hằng lưng trời, lẽ nào lại kém phần rộn ràng, trịnh trọng?</span>
        </p>
        <p className="body-copy">
          Lành Gift kính gửi đến bạn một tấm thiệp mời – dự lễ trăng ở nguyệt điện cao xa. Cung ngọc lần này mang đôi phần đặc
          trưng trong văn hoá Việt Nam đương đại, điểm thêm nét kiêu kỳ “màn lan trướng huệ” Á Đông.
        </p>
        <ArrowLink light>Đọc lời mời</ArrowLink>
      </div>
      <span className="invitation-seal">
        十五夜
        <br />
        <small>trung thu</small>
      </span>
    </section>
  );
}
