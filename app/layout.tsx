import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "코칭 일지",
  description: "코칭 시간과 고객별 세션을 안전하게 관리하는 대시보드",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
