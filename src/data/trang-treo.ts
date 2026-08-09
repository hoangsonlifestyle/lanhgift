export const navLinks = [
  ["Lời mời", "invitation"],
  ["Giao hưởng", "symphony"],
  ["Năm chương", "chapters"],
  ["Dành cho doanh nghiệp", "atelier"],
] as const;

export const chapters = [
  {
    number: "01",
    title: "Hoa Kim",
    price: "430.000 VNĐ",
    concept: "Khúc tấu cuối · Rực rỡ còn vương",
    poem: "Trăng thêu bóng thỏ lên rèm nhung, khảm bạc nốt ngân, khung cuối cùng.",
    copy:
      "Khi bản nhạc chạm vào khung cuối, mới chợt giật mình đêm trăng cũng hữu hạn. Khúc tấu thưa dần, nhẹ như cơn gió, kéo thêm chút thời gian ở lại với trăng, với nhạc, với hương của một đêm hội chưa nỡ tàn.",
    flavors: [
      "Ánh Dương Yuzu",
      "Tiramisu",
      "Nam Việt Quất",
      "Lava Hoàng Kim",
      "Chocolate Hershey",
      "Mè Đen Kim Sa",
    ],
    art: "/images/catalogue/hoa-kim.png",
    photo: "/images/products/hoa-kim-real.jpg",
    tone: "ruby",
  },
  {
    number: "02",
    title: "Phồn Hoa",
    price: "270.000 VNĐ",
    concept: "Mộng tràn ý · Mười sáu trăng",
    poem: "Âm tan, sắc ngả, mộng tràn ý. Chợt thấy tay cầm… mười sáu trăng.",
    copy:
      "Gió cứ hiu hiu, trà lặng vào tâm trí. Lúc ấy thanh âm tan thành sương, hương mịn hơn cả nhung, làm lòng người chẳng rõ đâu là thực, đâu là mộng – chỉ còn thấy mình lửng lơ trong một cõi lung linh, thần kỳ.",
    flavors: [
      "Dưa Gang Hạnh Nhân",
      "Đậu Đỏ",
      "Nguyệt Trà Matcha",
      "Khoai Môn",
      "Sen Vàng Liên Hoa",
      "Đậu Xanh",
    ],
    art: "/images/catalogue/phon-hoa.png",
    photo: "/images/products/phon-hoa-real.jpg",
    tone: "amber",
  },
  {
    number: "03",
    title: "Ngọc Cảnh Liên Thu",
    price: "540.000 VNĐ",
    concept: "Tiếng nhạc tươi mát giữa nguyệt điện",
    poem: "Bầy thỏ trắng điệu đà vận áo mã tiên, ôm lấy những nhạc cụ quá khổ.",
    copy:
      "Lúc đêm còn sớm, trăng vẫn neo mình nơi khung cửa mở, ánh sáng thở khẽ chút hương quỳnh còn chưa kịp bung hết lớp vỏ hồng, thì nhạc vang. Thanh âm rộn ràng, tươi mát đến lạ lùng.",
    flavors: ["Thập Cẩm Trứng", "Matcha Dừa Non", "Dẻo Sen", "Mochi Chà Bông", "Khoai Môn", "Trà Xanh"],
    art: "/images/catalogue/ngoc-canh-lien-thu.png",
    photo: "/images/products/ngoc-canh-real.jpg",
    tone: "jade",
  },
  {
    number: "04",
    title: "Sắc Hoa",
    price: "360.000 VNĐ",
    concept: "Một chiếc đèn trời khổng lồ",
    poem: "Trăng cũng biết bày cuộc chơi đèn, lượn ngọt qua vòm cây, ghẹo khẽ đám chim trời.",
    copy:
      "Không cần người châm, chẳng nhờ tay ai dựng, chỉ lặng lẽ buông sợi tơ bạc qua mấy ô kính màu. Thế là thắp lên một chiếc đèn trời khổng lồ giữa nhân gian.",
    flavors: ["Đậu Đỏ", "Cốm", "Khoai Môn Mochi", "Lava Trứng Chảy", "Socola Mochi Chảy", "Đậu Xanh"],
    art: "/images/catalogue/sac-hoa.png",
    photo: "/images/products/sac-hoa-real.jpg",
    tone: "violet",
  },
  {
    number: "05",
    title: "Hồn Việt",
    price: "195.000 VNĐ",
    concept: "Sóng nước ánh màu ngọc",
    poem: "Trăng vừa đặt gót lên đầu ngọn, lấp loáng dáng nghiêng giữa nụ giòn.",
    copy:
      "Hương muốn xé phăng lớp áo đỏ, ôm cơn gió bạc soi bóng trong. Giật mình! Sóng nước ánh màu ngọc trải khắp bờ hồ tiếng sắc-xô.",
    flavors: [
      "Dưa Gang Hạnh Nhân",
      "Đậu Đỏ",
      "Nguyệt Trà Matcha",
      "Khoai Môn",
      "Sen Vàng Liên Hoa",
      "Đậu Xanh",
    ],
    art: "/images/catalogue/hon-viet.png",
    photo: "/images/products/hon-viet-real.jpg",
    tone: "rose",
  },
] as const;

export const tastes = [
  "Hương yuzu",
  "Trà matcha",
  "Dẻo sen",
  "Lava trứng chảy",
  "Mè đen kim sa",
  "Mochi chà bông",
] as const;

export const partners = ["Vingroup", "Vietcombank", "MB", "VietinBank", "CJ Entertainment", "VNPT", "Agribank"] as const;

export const contactLinks = [
  { label: "trungthu@lanhgift.com", href: "mailto:trungthu@lanhgift.com" },
  { label: "facebook.com/lanhgift", href: "https://facebook.com/lanhgift" },
  { label: "Zalo CSKH: 0976723931", href: "tel:0976723931" },
] as const;

export type Chapter = (typeof chapters)[number];
