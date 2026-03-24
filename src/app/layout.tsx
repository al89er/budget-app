import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Sidebar from '@/components/layout/sidebar';
import MobileNav from '@/components/layout/MobileNav';
import { Toaster } from 'sonner';
import PreloadProvider from '@/components/PreloadProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'Personal Budget Tracker',
  description: 'Clean personal finance and budget tracker designed to scale.',
  manifest: '/manifest.json',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'PB Tracker',
  },
  formatDetection: {
    telephone: false,
  },
};

export const viewport = {
  themeColor: '#3b82f6',
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.className} min-h-screen flex bg-surface-50 text-surface-900`}>
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {/* Main content area scrolls independently */}
          <div className="flex-1 w-full max-w-7xl mx-auto p-4 pb-20 md:p-8 overflow-y-auto">
            <PreloadProvider>
              {children}
            </PreloadProvider>
          </div>
        </main>
        <MobileNav />
        <Toaster position="top-right" richColors />
      </body>
    </html>
  );
}
