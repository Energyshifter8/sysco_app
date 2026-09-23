import type { Metadata } from "next";
import { JetBrains_Mono, Montserrat, Roboto_Condensed } from "next/font/google";
import { Providers } from "./providers";
import "./globals.css";

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains",
  // Mongolian needs cyrillic-ext for Ө/ө and Ү/ү.
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
});

const montserrat = Montserrat({
  variable: "--font-montserrat",
  // Mongolian needs cyrillic-ext for Ө/ө and Ү/ү.
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
});

const robotoCondensed = Roboto_Condensed({
  variable: "--font-condensed",
  // Mongolian needs cyrillic-ext for Ө/ө and Ү/ү.
  subsets: ["latin", "cyrillic", "cyrillic-ext"],
});

export const metadata: Metadata = {
  title: "Sysco&Tech",
  description: "Sysco&Tech оюутны нийгэмлэгийн удирдлагын систем",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="mn"
      className={`${jetbrainsMono.variable} ${montserrat.variable} ${robotoCondensed.variable} h-full antialiased dark`}
    >
      <body className="min-h-full flex flex-col">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
