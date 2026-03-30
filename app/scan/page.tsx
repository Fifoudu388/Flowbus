import Link from 'next/link';
import { QrScanner } from '@/components/QrScanner';

export default function ScanPage() {
  return (
    <main className="container stack">
      <Link href="/" className="btn btn-ghost">← Accueil</Link>
      <QrScanner />
    </main>
  );
}
