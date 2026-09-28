import './globals.css';

export const metadata = {
  title: 'FAM - TIMES',
  description: 'Chơi game bằng thực lực!',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="vi">
      <body>
        <div className="bg-shell" aria-hidden="true">
          <video
            className="site-bg-video"
            autoPlay
            muted
            loop
            playsInline
            poster="/times-bg.png"
          >
            <source src="/fam-times-bg.mp4" type="video/mp4" />
          </video>
        </div>
        {children}
      </body>
    </html>
  );
}
