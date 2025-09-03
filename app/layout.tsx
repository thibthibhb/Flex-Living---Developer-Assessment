import type { ReactNode } from "react";
import { Inter } from 'next/font/google';
import "../styles/globals.css";

const inter = Inter({ subsets: ['latin'], variable: '--font-inter' });

/**
 * Root layout applied to all pages. This includes a simple header
 * and container to center the content and constrain width.
 */
export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={inter.variable}>
      <body>
        {children}
      </body>
    </html>
  );
}