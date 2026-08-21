import type { Metadata } from "next";
import { Vazirmatn, Noto_Nastaliq_Urdu } from "next/font/google";
import { Navbar } from "@/components/navbar";
import { AnimatedBackground } from "@/components/animated-background";
import "./globals.css";

const vazir = Vazirmatn({
  subsets: ["arabic", "latin"],
  variable: "--font-vazir",
});

// Nastaliq is display type for headings only (classes .font-nastaliq / -lg)
const nastaliq = Noto_Nastaliq_Urdu({
  subsets: ["arabic"],
  weight: ["400", "700"],
  variable: "--font-nastaliq",
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
      <body className={`${vazir.variable} ${nastaliq.variable} antialiased`}>
        <AnimatedBackground />
        <Navbar />
        <main className="mx-auto max-w-6xl px-4 pb-24">{children}</main>
        <footer className="border-t border-white/5 py-8">
          <div className="flex flex-col items-center gap-3 text-muted-foreground text-xs">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src="/brand/GenLayer_Logo_White_Cropped.svg"
              alt="GenLayer"
              className="h-6 opacity-80"
            />
            <p className="flex items-center gap-2">
              گالری جامعه فارسی GenLayer — ساخته شده توسط
              <a
                href="https://x.com/Hellishnum1"
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 text-foreground hover:text-primary transition-colors font-bold"
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src="/brand/hellish.jpg"
                  alt="Hellish"
                  className="w-5 h-5 rounded-full object-cover border border-white/20"
                />
                Hellish
              </a>
            </p>
          </div>
        </footer>
      </body>
    </html>
  );
}
