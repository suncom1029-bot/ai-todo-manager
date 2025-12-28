import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ThemeProvider } from "next-themes";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  // 기본 메타 정보
  title: "AI 할일 관리 서비스",
  description: "AI가 도와주는 똑똑한 할 일 관리 서비스",
  keywords: [
    "할일 관리",
    "AI 할일",
    "일정 관리",
    "할 일 관리 앱",
    "AI 기반 할일",
    "스마트 할일 관리",
    "생산성 도구",
  ],
  authors: [{ name: "AI Todo Manager" }],
  creator: "AI Todo Manager",
  publisher: "AI Todo Manager",
  
  // Open Graph (Facebook, LinkedIn 등)
  openGraph: {
    type: "website",
    locale: "ko_KR",
    url: "https://ai-todo-manager.com", // 실제 도메인으로 변경 필요
    siteName: "AI 할일 관리 서비스",
    title: "AI 할일 관리 서비스",
    description: "AI가 도와주는 똑똑한 할 일 관리 서비스",
    images: [
      {
        url: "/og-image.png", // Open Graph 이미지 경로 (추후 추가 필요)
        width: 1200,
        height: 630,
        alt: "AI 할일 관리 서비스",
      },
    ],
  },
  
  // Twitter Card
  twitter: {
    card: "summary_large_image",
    title: "AI 할일 관리 서비스",
    description: "AI가 도와주는 똑똑한 할 일 관리 서비스",
    images: ["/og-image.png"], // Twitter 이미지 경로 (추후 추가 필요)
  },
  
  // 검색엔진 최적화
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-video-preview": -1,
      "max-image-preview": "large",
      "max-snippet": -1,
    },
  },
  
  // 아이콘
  icons: {
    icon: "/favicon.ico",
    apple: "/apple-touch-icon.png",
  },
  
  // 기타
  metadataBase: new URL("https://ai-todo-manager.com"), // 실제 도메인으로 변경 필요
  alternates: {
    canonical: "/",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
        >
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
