import Link from 'next/link';
import { StopRealtimeBoard } from '@/components/StopRealtimeBoard';

export default async function StopPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <main className="container stack">
      <Link href="/" className="btn btn-ghost">← Accueil</Link>
      <StopRealtimeBoard stopId={id} />
    </main>
  );
}
