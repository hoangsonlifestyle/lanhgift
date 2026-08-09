import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "TRĂNG TREO — Lành Gift",
  description:
    "Một hành trình storytelling tương tác cho bộ sưu tập Trung Thu TRĂNG TREO by Lành Gift.",
  keywords: ["Lành Gift", "Trăng Treo", "Trung Thu", "quà tặng doanh nghiệp", "bánh Trung Thu"],
  openGraph: {
    title: "TRĂNG TREO — Lành Gift",
    description: "Lời mời dự lễ trăng tại Nguyệt điện của Lành Gift.",
    type: "website",
  },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="vi">
      <body>{children}</body>
    </html>
  );
}
