"use client";

import '@/app/globals.css';
import { Inter } from 'next/font/google';
import { I18nProvider } from '@/components/I18nProvider';

const inter = Inter({ subsets: ['latin'] });

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="id" className="scroll-smooth">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#000000" />
        
        <link rel="icon" href="/og-image.webp" sizes="any" />
        <link rel="apple-touch-icon" href="/og-image.webp" />
        <link rel="manifest" href="/manifest.json" />
        
        <title>El Shop - Digital Solutions</title>
        <meta name="description" content="High-quality applications and digital solutions" />
        <meta name="keywords" content="el shop, toko online, mini games, tes kepribadian, produk digital" />
        <meta property="og:title" content="El Shop - Website Terbaik untuk Produk dan Mini Games" />
        <meta property="og:description" content="El Shop menyediakan berbagai produk berkualitas dan mini games seru termasuk tes kepribadian." />
        <meta property="og:url" content="https://elshoptech.vercel.app" />
        <meta property="og:site_name" content="El Shop" />
        <meta property="og:image" content="https://elshoptech.vercel.app/og-image.webp" />
        <meta property="og:image:width" content="1200" />
        <meta property="og:image:height" content="630" />
        <meta property="og:locale" content="id_ID" />
        <meta property="og:type" content="website" />
      </head>
      <body className={`${inter.className} antialiased overflow-x-hidden`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
