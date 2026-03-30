import type { Metadata } from 'next';
import './globals.css';

export const metadata: Metadata = {
  title: 'FlowBus',
  description: 'Suivi temps réel des transports en commun',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr">
      <body>{children}</body>
    </html>
  );
}
