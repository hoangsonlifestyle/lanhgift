"use client";

import { useState } from "react";
import { useStoryAnimations } from "../animations/useStoryAnimations";
import { Grain } from "../components/Grain";
import { Navigation } from "../components/Navigation";
import { chapters } from "../data/trang-treo";
import { useLenisScroll } from "../hooks/useLenisScroll";
import { Atelier } from "../sections/Atelier";
import { Chapter } from "../sections/Chapter";
import { Closing } from "../sections/Closing";
import { Hero } from "../sections/Hero";
import { Invitation } from "../sections/Invitation";
import { Mooncakes } from "../sections/Mooncakes";
import { Partners } from "../sections/Partners";
import { Symphony } from "../sections/Symphony";

export default function HomePage() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [scorePlaying, setScorePlaying] = useState(false);

  useLenisScroll();
  useStoryAnimations();

  return (
    <main>
      <Grain />
      <Navigation menuOpen={menuOpen} setMenuOpen={setMenuOpen} scorePlaying={scorePlaying} setScorePlaying={setScorePlaying} />
      <Hero />
      <Invitation />
      <Symphony />
      <div id="chapters">
        {chapters.map((chapter) => (
          <Chapter key={chapter.title} chapter={chapter} />
        ))}
      </div>
      <Mooncakes />
      <Atelier />
      <Partners />
      <Closing />
    </main>
  );
}
