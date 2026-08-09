import { Eyebrow } from "../components/Eyebrow";

export function Symphony() {
  return (
    <section className="symphony" id="symphony">
      <div className="symphony-top">
        <Eyebrow>Giao Hưởng Trăng Tròn</Eyebrow>
        <p>Ba chương / Một đêm hội</p>
      </div>
      <div className="symphony-heading story-copy">
        <span>III</span>
        <h2>
          Một bản nhạc
          <br />
          đã được soạn
          <br />
          <i>cho trăng.</i>
        </h2>
      </div>
      <div className="score-line">
        <svg viewBox="0 0 1200 170" preserveAspectRatio="none">
          <path d="M0 115 C125 115,120 43,243 43 S369 135,488 135 S600 72,713 72 S835 25,956 25 S1080 108,1200 108" />
          <circle cx="243" cy="43" r="7" />
          <circle cx="488" cy="135" r="7" />
          <circle cx="713" cy="72" r="7" />
          <circle cx="956" cy="25" r="7" />
        </svg>
      </div>
      <div className="symphony-notes">
        <p>Một khởi đầu rộn ràng, vui tươi nâng ánh trăng mới.</p>
        <p>Một tĩnh tựa sương đêm, lặng lẽ mà mộng mị.</p>
        <p>Một khúc tấu thưa dần, kéo thêm chút thời gian ở lại với trăng.</p>
      </div>
    </section>
  );
}
