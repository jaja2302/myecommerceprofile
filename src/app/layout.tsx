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
    <html lang="en" className="scroll-smooth">
      <head>
        <meta charSet="utf-8" />
        <meta name="viewport" content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=0" />
        <meta name="theme-color" content="#000000" />
        <title>El Shop - Digital Solutions</title>
        <meta name="description" content="High-quality applications and digital solutions" />
      </head>
      <body className={`${inter.className} antialiased overflow-x-hidden`}>
        <I18nProvider>{children}</I18nProvider>
      </body>
    </html>
  );
}
