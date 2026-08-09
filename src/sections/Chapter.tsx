import Image from "next/image";
import { ArrowLink } from "../components/ArrowLink";
import { Eyebrow } from "../components/Eyebrow";
import type { Chapter as ChapterData } from "../data/trang-treo";

type ChapterProps = {
  chapter: ChapterData;
};

export function Chapter({ chapter }: ChapterProps) {
  return (
    <section className={`chapter ${chapter.tone}`}>
      <div className="chapter-poster">
        <Image src={chapter.art} alt={`Artwork for ${chapter.title}`} fill sizes="(max-width: 850px) 100vw, 50vw" />
      </div>
      <div className="chapter-overlay" />
      <div className="chapter-inner">
        <div className="chapter-index">
          <span>{chapter.number}</span>
          <b />05
        </div>
        <div className="chapter-intro">
          <Eyebrow light>Chương {chapter.number}</Eyebrow>
          <p>{chapter.concept}</p>
        </div>
        <div className="chapter-product">
          <div className="chapter-photo">
            <Image src={chapter.photo} alt={`Hộp quà ${chapter.title} của Lành Gift`} fill sizes="(max-width: 850px) 76vw, 32vw" />
          </div>
          <span className="chapter-photo-label">
            Lành Gift
            <br />
            <i>Trăng Treo / 2026</i>
          </span>
        </div>
        <div className="chapter-copy story-copy">
          <h2>{chapter.title}</h2>
          <p className="chapter-poem">{chapter.poem}</p>
          <p className="body-copy">{chapter.copy}</p>
          <div className="chapter-flavors">
            {chapter.flavors.map((flavor, index) => (
              <span key={flavor}>
                <i>0{index + 1}</i>
                {flavor}
              </span>
            ))}
          </div>
          <div className="chapter-bottom">
            <strong>{chapter.price}</strong>
            <ArrowLink light>Đặt chương này</ArrowLink>
          </div>
        </div>
      </div>
    </section>
  );
}
