import './globals.css';
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata = {
  title: 'Dominion Supply Generator',
  description: 'ドミニオンのサプライをランダムに生成・共有',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="ja">
      <body className={inter.className}>
        <div className="bg-gray-100 dark:bg-gray-900 text-gray-800 dark:text-gray-200 min-h-screen">
          <main className="container mx-auto p-4 sm:p-6 lg:p-8">
            {children}
          </main>
          <footer className="text-center p-4 text-gray-500 text-sm">
            Created with Next.js and Supabase
          </footer>
        </div>
      </body>
    </html>
  );
}