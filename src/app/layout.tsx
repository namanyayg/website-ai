import type { Metadata } from "next";
import { Inter } from "next/font/google";
import Script from "next/script";
import { Toaster } from 'sonner';

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Webfast AI",
  description: "AI-First Indie Hacker Website Generator",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <Script
          src="https://cdn.tailwindcss.com"
          strategy="beforeInteractive"
        />
        <link
          rel="stylesheet"
          href="https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.5.2/css/all.min.css"
        />
      </head>
      <body className={inter.className}>
        <Script id="check-tailwind">
          {`
            if (!window.tailwind) {
              document.body.style.display = 'none';
              window.addEventListener('load', function() {
                if (window.tailwind) {
                  document.body.style.display = '';
                }
              });
            }
          `}
        </Script>
        <Toaster />
        {children}
      </body>
    </html>
  );
}
