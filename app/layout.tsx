import type { Metadata } from "next";
import { Vazirmatn } from "next/font/google";
import { Navbar } from "@/components/navbar";
import "./globals.css";

const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazir",
});

export const metadata: Metadata = {
  title: "گالری فارسی GenLayer",
  description:
    "گالری جامعه فارسی GenLayer — آثار هنری و محتوای متنی اعضا، مسابقه هفتگی و برندگان",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fa" dir="rtl">
      <body className={`${vazir.variable} antialiased`}>
        <div className="page-glow" />
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 pb-24">{children}</main>
        <footer className="border-t border-white/5 py-8 text-center text-muted-foreground text-xs">
          گالری جامعه فارسی GenLayer — ساخته شده توسط اعضای جامعه
        </footer>
      </body>
    </html>
  );
}
