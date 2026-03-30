import Link from 'next/link';
import { StopSearch } from '@/components/StopSearch';

export default function SearchPage() {
  return (
    <main className="container stack">
      <Link href="/" className="btn btn-ghost">← Accueil</Link>
      <StopSearch />
    </main>
  );
}
