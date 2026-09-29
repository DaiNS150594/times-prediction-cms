import './globals.css';
import { Open_Sans } from 'next/font/google';

const openSans = Open_Sans({
  subsets: ['latin', 'vietnamese'],
  display: 'swap',
});

export const metadata = {
  title: 'FAM - TIMES',
  description: 'Chơi game bằng thực lực!',
  icons: {
    icon: 'https://ava-grp-talk.zadn.vn/1/6/3/5/2/360/0e3a9f0f1c676cd8ff59e9748119ef78.jpg',
    shortcut: 'https://ava-grp-talk.zadn.vn/1/6/3/5/2/360/0e3a9f0f1c676cd8ff59e9748119ef78.jpg',
    apple: 'https://ava-grp-talk.zadn.vn/1/6/3/5/2/360/0e3a9f0f1c676cd8ff59e9748119ef78.jpg',
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body className={openSans.className}>{children}</body>
    </html>
  );
}
